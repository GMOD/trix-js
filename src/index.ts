import { LocalFile, RemoteFile, BlobFile } from 'generic-filehandle';

type anyFile = LocalFile | RemoteFile | BlobFile;

type ParsedIxx = Map<string, number>;

type hit = {
  itemId: string;   // The id string.
  wordPos: number;   // Where the searchWord is in the sentence (1 is first, 2 is the second word...).
};


const trixPrefixSize = 5;

// TODO:
//    > Implement reasonable prefix to filter results?
//    > specify minimum number of characters as a class variable?
//    > test with RemoteFile:
//      https://hgdownload.soe.ucsc.edu/gbdb/hg38/knownGene.ix
//      

// Define this object with .ixx and .ix files.
// Then use the trixSearch() function to search for a word.
export default class Trix {

  index: Promise<ParsedIxx>;
  ixFile: anyFile;
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
   * @param searchWord [string] term to search for its id(s).
   * @returns results [Array<hit>]. Each hit contains the itemId [string], and wordPos [number] (which is the word number in the sentence).
   */
  async search(searchWord: string) {
    searchWord = searchWord.toLowerCase();
        
    // 1. Seek ahead to byte `this.index` of `ixFile`. Load this section of .ix data into the buffer.
    const buf: Buffer = await this._getBuffer(searchWord);

    let resultArr: Array<hit> = [];
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
          if (i < linePtr + searchWord.length &&
              searchWord[i - linePtr] > cur) {
            // searchWord[i] > cur, so keep looping.
            startsWith = false;

          } 
          else if (i < linePtr + searchWord.length &&
                  searchWord[i - linePtr] < cur) {
            // searchWord[i] < cur, so we lexicographically will not find any more results.
            startsWith = false;
            done = true;
            break;        
          }
          else {
            // this condition indicates we found a match.
            if (buf[i] === 44) {
              // we found a ',' so increment numValues by one.
              numValues++;
              if (numValues >= this.maxResults) {
                while (buf[i] != 32)
                  i++;

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
        resultArr.push.apply(resultArr, this._parseHitString(line));
      }

      // Once we have enough results, stop searching.
      if (resultArr.length >= this.maxResults) break;

      linePtr = i + 1;
    }

    // 4. Return the hitList [list of trixHitPos (itemId: string, wordPos: int]
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
    let arr: Array<hit> = [];
    const parts = line.split(' ');
    // Each result is of format: "{itemId},{wordPos}"
    // Parse the entire line of these and return
    for (const part of parts) {
      const pair = part.split(',');
      if (pair.length == 2) {
        const itemId: string = pair[0];
        const wordPos: number = Number.parseInt(pair[1]);
        if (typeof wordPos !== "number" || isNaN(wordPos))
          throw `Error in ix index format at term ${itemId} for word ${parts[0]}`;

        const obj: hit = { itemId: itemId, wordPos: wordPos };
        arr.push(obj);
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
        if (typeof pos !== "number" || isNaN(pos))
          throw `Error in ixx index format at word ${prefix}`;

        ixx.set(prefix, pos);
      }
    }

    return ixx;
  }
}
