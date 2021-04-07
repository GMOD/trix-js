import { LocalFile, RemoteFile, BlobFile } from 'generic-filehandle';

type anyFile = LocalFile | RemoteFile | BlobFile;

type ParsedIxx = Map<string, number>;

const trixPrefixSize = 5;

// TODO:
//    > test handling multiple words as a search query
//    > Implement reasonable prefix to filter results?
//    > specify minimum number of characters as a class variable?
//

// Define this object with .ixx and .ix files.
// Then use the trixSearch() function to search for a word.
export default class Trix {
  private index: Promise<ParsedIxx>;
  private ixFile: anyFile;
  maxResults: number;

  /**
   * @param ixxFile [anyFile] the second-level trix index file produced by ixIxx.
   * @param ixFile [anyFile] the first-level trix index file produced by ixIxx.
   * @param maxResults [number] the maximum number of results to return. Default is set to 20.
   */
  constructor(ixxFile: anyFile, ixFile: anyFile, maxResults: number = 20) {
    this.index = this._parseIxx(ixxFile);
    this.ixFile = ixFile;
    this.maxResults = maxResults;
  }

  
  /**
   * Search trix for the given searchWord. Return up to {this.maxResults} results.
   * This method matches each word's prefix against searchWord. It does not do fuzzy matching.
   *
   * @param searchString [string] term(s) separated by spaces to search for id(s).
   * @returns results [Array<string>] where each string is an itemId.
   */
  async search(searchString: string) {
    let resultArr: Array<string> = [];

    let firstWord: boolean = true;
    let initialSet = new Set<string>();

    let searchWords = searchString.split(' ');

    // Loop for each word in searchWords.
    // If there are more than one searchWords, use resultSet and only take the matching terms
    // that are also in initialSet. 
    // Otherwise, just iterate once and add words to resultArr.
    for (let word of searchWords) {
      let searchWord = word;

      searchWord = searchWord.toLowerCase();

      // 1. Seek ahead to byte `this.index` of `ixFile`. Load this section of .ix data into the buffer.
      const buf: Buffer = await this._getBuffer(searchWord);

      let resultSet = new Set<string>();
      let linePtr = 0;
      let numValues = 0;

      // 2. Iterate through the entire buffer
      while (linePtr < buf.byteLength) {
        let startsWith = true;
        let done = false;
        let i = linePtr;

        // 3. Check if the first word in the line has the same prefix as searchWord.

        // Iterate through each char of the line in the buffer.
        // break out of loop when we hit a \n (unicode char 10) or the searchWord does not match the line.
        while (buf[i] != 10) {
          if (i >= buf.byteLength) {
            done = true;
            break;
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
              // this condition indicates we found a match.
              if (buf[i] === 44) {
                // we found a ',' so increment numValues by one.
                numValues++;

                if (numValues >= this.maxResults) {
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
          // debugger;
          const line: string = buf.slice(linePtr, i).toString();
          let arr = this._parseHitString(line);

          if (searchWords.length === 1) {
            // Only a single word so add to array
            resultArr = resultArr.concat(arr);
            // Once we have enough results, stop searching.
            if (resultArr.length >= this.maxResults) break;
            
          }
          else {
            // Handle multiple words
            for (let hit of arr) {
              if (firstWord) {
                resultSet.add(hit);
              }
              else {
                if (initialSet.has(hit)) {
                  resultSet.add(hit);
                }
              }
            } 
          }
        }

        linePtr = i + 1;
      }

      initialSet = resultSet;
      firstWord = false;
    }
    
    // 4. Return the hitList [list of string]
    if (searchWords.length === 1) {
      return resultArr;
    }

    // We need to return our set converted to an array
    resultArr = Array.from(initialSet);
    if (resultArr.length > this.maxResults)
      return resultArr.slice(0, this.maxResults)

    return resultArr;
  }


  // Private Methods:

  /**
   * Seek ahead in the .ix file, and load the next two sections of .ix into a buffer.
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
      if (seekPosEnd === -1) {
        if (key > searchWord) {
          // Here we want to loop two more times, updating seekPosEnd, then break.
          seekPosEnd = -2;
        } else {
          seekPosStart = value;
        }
      } else if (seekPosEnd === -2) {
        seekPosEnd = -3;
      } else if (seekPosEnd === -3) {
        seekPosEnd = value - 1;
      }
    }

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

    return buf;
  }

  /**
   * Takes in a hit string and returns an array of result terms.
   *
   * @param line [string] The line of .ix that is a hit.
   * @returns results [Array<hit>]. Each hit contains the itemId [string], and wordPos [number].
   */
  private _parseHitString(line: string) {
    let arr: Array<string> = [];
    const parts = line.split(' ');
    // Each result is of format: "{itemId},{wordPos}"
    // Parse the entire line of these and return
    for (const part of parts) {
      const pair = part.split(',');
      if (pair.length === 2) {
        const itemId: string = pair[0];
        const wordPos: number = Number.parseInt(pair[1]);
        if (typeof wordPos !== 'number' || isNaN(wordPos))
          throw `Error in ix index format at term ${itemId} for word ${parts[0]}`;

        arr.push(itemId);
      } else if (pair.length > 1) {
        throw `Error in ix index format at word ${parts[0]}`;
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
  private async _parseIxx(ixxFile: anyFile): Promise<ParsedIxx> {
    const ixx = new Map();

    // Load the ixxFile into ixxData object
    const buf = await ixxFile.readFile();
    const lines = buf.toString('utf8').split('\n');
    for (const line of lines) {
      if (line.length > 0) {
        // Parse the ixx line
        // Format: 5 characters prefix, 10 characters hex
        const prefix = line.substr(0, trixPrefixSize);
        const posStr = line.substr(trixPrefixSize);
        const pos = Number.parseInt(posStr, 16);
        if (typeof pos !== 'number' || isNaN(pos))
          throw `Error in ixx index format at word ${prefix}`;

        ixx.set(prefix, pos);
      }
    }

    return ixx;
  }
}
