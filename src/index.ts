import type { GenericFilehandle } from 'generic-filehandle';

const trixPrefixSize = 5;

// Define this object with .ixx and .ix files.
// Then use the trixSearch() function to search for a word.
export default class Trix {
  private index: Promise<Map<string, number>>;
  private ixFile: GenericFilehandle;
  maxResults: number;

  /**
   * @param ixxFile [anyFile] the second-level trix index file produced by ixIxx.
   * @param ixFile [anyFile] the first-level trix index file produced by ixIxx.
   * @param maxResults [number] the maximum number of results to return. Default is set to 20.
   */
  constructor(
    ixxFile: GenericFilehandle,
    ixFile: GenericFilehandle,
    maxResults: number = 20
  ) {
    this.index = this._parseIxx(ixxFile);
    this.ixFile = ixFile;
    this.maxResults = maxResults;
  }

  /**
   * Search trix for the given searchWord(s). Return up to {this.maxResults} results.
   * This method matches each index prefix against each searchWord. It does not do fuzzy matching.
   *
   * @param searchString [string] term(s) separated by spaces to search for id(s).
   * @returns results [Array<string>] where each string is a corresponding itemId.
   */
  async search(searchString: string) {
    // If there is one search word, store results in resultArr.
    let resultArr: Array<string> = [];

    // If there are multiple words, store results in initialSet.
    // firstWord indicates we are iterating the first time.
    let firstWord: boolean = true;
    let initialSet = new Set<string>();

    let searchWords = searchString.split(' ');

    // Loop for each word in searchWords.
    // If there are more than one searchWords, use resultSet and only take the matching terms
    // that are also in initialSet.
    // Otherwise, just iterate once and add words to resultArr.
    for (let w = 0; w < searchWords.length; w++) {
      let searchWord = searchWords[w];
      searchWord = searchWord.toLowerCase();

      // 1. Seek ahead to byte `this.index` of `ixFile`. Load this section of .ix data into the buffer.
      let bufData = await this._getBuffer(searchWord);
      let buf: Buffer = bufData.buf;
      let bufPos = bufData.bufEndPos;
      let resultSet = new Set<string>();
      let linePtr = 0;
      let numValues = 0;

      // 2. Iterate through the entire buffer
      while (linePtr < buf.byteLength) {
        let startsWith = true;
        let done = false;
        let i = linePtr;

        // 3. Check if the first word in the current line has the same prefix as searchWord.

        // Iterate through each char of the line in the buffer.
        // break out of loop when we hit a \n (unicode char 10) or the searchWord does not match the line.
        while (buf[i] != 10) {
          if (i >= buf.byteLength) {
            // In this case, we ran out of our current buffer, but could still find more matches.
            // Load another chunk in to buf and repeat.
            let tempBufData = await this._getNextChunk(bufPos);
            if (tempBufData) {
              buf = tempBufData.buf;
              bufPos = tempBufData.bufEndPos;
              i = 0;
              linePtr = 0;
            } else {
              // If tempBufData is null, we reached the end of the file, so we are done.
              done = true;
              break;
            }
          }

          if (startsWith) {
            let cur = String.fromCharCode(buf[i]);

            if (
              i < linePtr + searchWord.length &&
              searchWord[i - linePtr] > cur
            ) {
              // searchWord[i] > cur, so keep looping.
              startsWith = false;
            } else if (
              i < linePtr + searchWord.length &&
              searchWord[i - linePtr] < cur
            ) {
              // searchWord[i] < cur, so we lexicographically will not find any more results.
              startsWith = false;
              done = true;
              break;
            } else {
              // This condition indicates we found a match.
              if (buf[i] === 44) {
                // We found a ',' so increment numValues by one.
                numValues++;

                // If we're searching for one word and we have enough results, break out at the next space.
                if (numValues >= this.maxResults && searchWords.length === 1) {
                  while (buf[i] != 32) i++;

                  break;
                }
              }
            }
          }

          i++;
        }

        if (done) break;

        // If the line starts with the searchWord, we have a hit!
        if (startsWith) {
          // Parse the line and add results to arr.
          const line: string = buf.slice(linePtr, i).toString();
          let arr = this._parseHitString(line);

          if (searchWords.length === 1) {
            // Only a single search word so add results to array.
            resultArr = resultArr.concat(arr);
            // Once we have enough results, stop searching.
            if (resultArr.length >= this.maxResults) break;
          } else {
            // Handle multiple words using sets.
            for (let hit of arr) {
              hit = hit.toLowerCase();

              if (firstWord) {
                resultSet.add(hit);
              } else {
                if (initialSet.has(hit)) {
                  resultSet.add(hit);

                  // If it is on the last iteration of words, break after we reach maxResults
                  if (
                    w === searchWords.length - 1 &&
                    resultSet.size >= this.maxResults
                  )
                    break;
                }
              }
            }
          }
        }

        linePtr = i + 1;
      }

      initialSet = resultSet;
      firstWord = false;

      // If there aren't any results, stop looping, because an intersection with an empty set is an empty set.
      if (resultArr.length === 0 && initialSet.size === 0) return [];
    }

    // 4. Return the hitList [list of string]
    if (searchWords.length === 1) {
      return resultArr;
    }

    // Else we need to return our set converted to an array
    resultArr = Array.from(initialSet);
    if (resultArr.length > this.maxResults)
      return resultArr.slice(0, this.maxResults);

    return resultArr;
  }

  // Private Methods:

  /**
   * Seek ahead to the correct position in the .ix file,
   * then load that chunk of .ix into a buffer.
   *
   * @param searchWord [string]
   * @returns a Buffer holding the sections we want to search.
   */
  private async _getBuffer(searchWord: string) {
    // Get position to seek to in .ix file from indexes.
    let seekPosStart = 0;
    let seekPosEnd = -1;
    const indexes = await this.index;
    for (let [key, value] of indexes) {
      let trimmedKey = key.slice(0, searchWord.length);
      if (seekPosEnd === -1) {
        if (trimmedKey >= searchWord) {
          // We reached the end pos in the file.
          seekPosEnd = value - 1;
          break;
        } else {
          seekPosStart = value;
        }
      }
    }

    // Return the buffer and its end position in the file.
    return this._createBuffer(seekPosStart, seekPosEnd);
  }

  /**
   * Given the end position of the last buffer,
   * load the next chunk  of .ix data into a buffer and return it.
   *
   * @param seekPosStart [number] where to start loading data into the new buffer.
   * @returns a Buffer holding the chunk we want to search.
   */
  private async _getNextChunk(seekPosStart: number) {
    if (seekPosStart == -1) return null;

    let seekPosEnd = -1;
    // Get the next position of the end of buffer.
    const indexes = await this.index;
    for (let [key, value] of indexes) {
      if (value <= seekPosStart + 1) continue;

      seekPosEnd = value;
      break;
    }

    seekPosStart--;

    // Return the buffer and its end position in the file.
    return this._createBuffer(seekPosStart, seekPosEnd);
  }

  /**
   * Create and return a buffer given the start and end position
   * of what to load from the .ix file.
   *
   * @param seekPosStart [number] byte the buffer should start reading from file.
   * @param seekPosEnd [number] byte the buffer should stop reading from file.
   * @returns a Buffer holding the chunk of data.
   */
  private async _createBuffer(seekPosStart: number, seekPosEnd: number) {
    // Set bufLength to seekPosEnd or the end of the file.
    let bufLength: number;
    if (seekPosEnd < 0) {
      const stat = await this.ixFile.stat();
      bufLength = stat.size - seekPosStart;
    } else {
      bufLength = seekPosEnd - seekPosStart;
    }

    let buf = Buffer.alloc(bufLength);
    await this.ixFile.read(buf, 0, bufLength, seekPosStart);

    // Return the buffer and its end position in the file.
    return { buf: buf, bufEndPos: seekPosEnd };
  }

  /**
   * Takes in a hit string and returns an array of result terms.
   *
   * @param line [string] The line of .ix that is a hit.
   * @returns results [Array<hit>]. Each hit contains the itemId [string], and wordPos [number].
   */
  private _parseHitString(line: string) {
    let arr: Array<string> = [];
    const [term, ...parts] = line.split(' '); // skip term
    // Each result is of format: "{itemId},{wordPos}"
    // Parse the entire line of these and return
    for (const part of parts) {
      const pair = part.split(',');
      if (pair.length === 2) {
        const itemId: string = pair[0];
        const wordPos: number = Number.parseInt(pair[1]);
        if (typeof wordPos !== 'number' || isNaN(wordPos))
          throw new Error(
            `Error in ix index format at term ${itemId} for word ${parts[0]}`
          );

        arr.push(`${term},${itemId}`);
      } else if (pair.length > 1) {
        throw new Error(`Error in ix index format at word ${parts[0]}`);
      }
    }
    return arr;
  }

  /**
   * Parses ixx file and constructs a map of {word: ixFileLocation}
   *
   * @param ixxFile [anyFile] second level index that is produced by ixIxx.
   * @returns a ParsedIxx map.
   */
  private async _parseIxx(ixxFile: GenericFilehandle) {
    const file = (await ixxFile.readFile('utf8')) as string;
    const lines = file.split('\n');
    return new Map(
      lines
        .filter((f) => !!f)
        .map((line) => {
          const prefix = line.substr(0, trixPrefixSize);
          const posStr = line.substr(trixPrefixSize);
          const pos = Number.parseInt(posStr, 16);
          return [prefix, pos];
        })
    );
  }
}
