import { LocalFile, RemoteFile, BlobFile } from 'generic-filehandle';

type anyFile = LocalFile | RemoteFile | BlobFile;

const trixPrefixSize = 5;

type hit = {
  itemId: string;   // The id string.
  wordPos: number;   // The number the searchWord is in the sentence (1 is first, 2 is second word...).
};

// TODO:
//    > Implement reasonable prefix instead of direct match.
//    > specify minimum number of characters as a class variable?
//    > test with RemoteFile:
//      https://hgdownload.soe.ucsc.edu/gbdb/hg38/knownGene.ix
//      https://hgdownload.soe.ucsc.edu/gbdb/hg38/knownGene.ixx

type ParsedIxx = Map<string, number>;

// Define this object with .ixx and .ix files.
// Then use the trixSearch() function to search for a word.
export default class Trix {

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


  index: Promise<ParsedIxx>;
  ixFile: anyFile;
  maxResults: number;


  /**
   * Search trix for the given searchWord. Return up to {this.maxResults} results.
   * This method matches each word's prefix against searchWord. It does not do fuzzy matching.
   *
   * @param searchWord [string]
   * @returns results [Array<hit>]. Each hit contains the itemId [string], and wordPos [number] (which is the word number in the sentence).
   */
  async search(searchWord: string) {
    searchWord = searchWord.toLowerCase();
    
    // 1. Check if searchWord is already in hashTable
    
    // 2. Seek ahead to byte `this.index` of `ixFile`. Load this section of .ix data into the buffer.
    const buf: Buffer = await this._getBuffer(searchWord);

    let arr: Array<hit> = [];
    let linePtr = 0;

    // 3. Iterate through the entire buffer
    while (linePtr < buf.byteLength) {
      let startsWith = true;
      let done = false;
      let i = linePtr;

      // 4. Get first word in the line and check if it has the same prefix as searchWord.

      // Iterate through each char of the line in the buffer.
      // break out of loop when we hit a \n (unicode char 10) or the searchWord does not match the line.
      while (buf[i] != 10) {
        if (startsWith) {
          let cur = String.fromCharCode(buf[i]);
          if (
            i < linePtr + searchWord.length &&
            searchWord[i - linePtr] > cur
          ) {
            startsWith = false;
          } else if (
            i < linePtr + searchWord.length &&
            searchWord[i - linePtr] < cur
          ) {
            if (i < linePtr + 1) {
              done = true;
              break;
            }

            // Else we are alphabetically ahead so we can break out of the loop.
            else startsWith = false;
          }
        }

        i++;
      }

      if (done) break;

      // If the line starts with the searchWord, we have a hit!
      if (startsWith) {

        // Parse the line and add results to arr.
        const line: string = buf.slice(linePtr, i).toString();
        arr.push.apply(arr, this._parseHitList(line));
      }

      // Once we have enough results, stop searching.
      if (arr.length >= this.maxResults) break;

      linePtr = i + 1;
    }

    // 5. If we have a result, get the number of leftoverLetters and add searchWord to hash

    // Sometimes there are more than maxResults if a line has multiple results,
    // so trim to this.maxResults length.
    if (arr.length > this.maxResults) arr.slice(0, this.maxResults);

    // 6. Return the hitList [list of trixHitPos (itemId: string, wordPos: int, leftoverLetters: int)]
    return arr;
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
  private _parseHitList(line: string) {
    let arr: Array<hit> = [];
    const parts = line.split(' ');
    // Each result is of format: "{itemId},{wordPos}"
    // Parse the entire line of these and return
    for (const part of parts) {
      const pair = part.split(',');
      if (pair.length == 2) {
        const itemId: string = pair[0];
        const wordPos: number = Number.parseInt(pair[1]);
        const obj: hit = { itemId: itemId, wordPos: wordPos };
        arr.push(obj);
      } else if (pair.length > 1) {
        throw 'Invalid index file.';
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

        ixx.set(prefix, pos);
      }
    }

    return ixx;
  }
}
