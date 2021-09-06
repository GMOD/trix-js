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
    let resultArr: Array<[string, string]> = [];

    let searchWords = searchString.split(' ');

    // Loop for each word in searchWords.  If there are more than one
    // searchWords, use resultSet and only take the matching terms that are
    // also in initialSet.  Otherwise, just iterate once and add words to
    // resultArr.
    for (let w = 0; w < searchWords.length; w++) {
      let searchWord = searchWords[w];
      searchWord = searchWord.toLowerCase();

      // 1. Seek ahead to byte `this.index` of `ixFile`. Load this section of
      // .ix data into the buffer.
      let bufData = await this._getBuffer(searchWord);

      const hits = bufData.buf
        .toString()
        .split('\n')
        .filter((f) => !!f)
        .filter((line) => {
          return line.startsWith(searchString);
        })
        .map((line) => {
          const [term, ...parts] = line.split(' ');
          return parts.map((elt) => [term, elt.split(',')[0]]);
        })
        .flat() as [string, string][];
      resultArr = resultArr.concat(hits);
      if (resultArr.length >= this.maxResults) {
        break;
      }
    }

    return [...resultArr].slice(0, this.maxResults);
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
   * Parses ixx file and constructs a map of {word: ixFileLocation}
   *
   * @param ixxFile [anyFile] second level index that is produced by ixIxx.
   * @returns a ParsedIxx map.
   */
  private async _parseIxx(ixxFile: GenericFilehandle) {
    const file = (await ixxFile.readFile('utf8')) as string;
    return new Map(
      file
        .split('\n')
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
