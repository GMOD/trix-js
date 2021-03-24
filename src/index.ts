import { LocalFile, RemoteFile, BlobFile } from 'generic-filehandle';

type anyFile = LocalFile | RemoteFile | BlobFile;

const trixPrefixSize = 5;

// TODO:
//    > convert searchWord to lowercase
//    > refactor trixSearch()
//    > update to use trixPrefixSize
//    > specify maximum number of results as a class variable
//    > specify minimum number of characters as a class variable?

type ParsedIxx = Map<string, number>;

export default class Trix {
  index: Promise<ParsedIxx>;
  ixFile: anyFile;

  constructor(ixxFile: anyFile, ixFile: anyFile) {
    this.index = this._parseIxx(ixxFile);
    this.ixFile = ixFile;
  }

  // Parses ixx file and returns a ParsedIxx
  async _parseIxx(ixxFile: anyFile): Promise<ParsedIxx> {
    const ixx = new Map();

    // Load the ixxFile into ixxData object
    const buf = await ixxFile.readFile();
    const lines = buf.toString('utf8').split('\n');
    for (const line of lines) {
      if (line.length > 0) {
        // Parse the ixx line
        // Format: 5 characters prefix, 10 characters hex
        const prefix = line.substr(0, 5);
        const posStr = line.substr(5);
        const pos = Number.parseInt(posStr, 16);

        ixx.set(prefix, pos);
      }
    }

    return ixx;
  }

  // Search the .ix file for the searchWord.
  // Returns list of hit words
  async trixSearch(searchWord: string) {
    // 1. Check if searchWord is already in hashTable
    // 2. Seek ahead to byte `this.index` of `ixFile`

    // For each ixx in trix, compare ixx->prefix and word prefix
    // If we get a hit, return the position

    // Get position to seek to in .ix file
    let seekPosStart = 0;
    let seekPosEnd = -1;
    const indexes = await this.index;
    for (let [key, value] of indexes) {
      if (seekPosEnd === -1) {
        if (key > searchWord) {
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

    let bufLength: number;

    if (seekPosEnd < 0) {
      // set buf to length of file in bytes - seekPosStart
      const stat = await this.ixFile.stat();
      bufLength = stat.size - seekPosStart;
    } else {
      bufLength = seekPosEnd - seekPosStart;
    }

    let buf = Buffer.alloc(bufLength);

    await this.ixFile.read(buf, 0, bufLength, seekPosStart);

    let arr: Array<hit> = [];

    let linePtr = 0;

    // Iterate through the entire buffer
    while (linePtr < bufLength) {
      // const lineEndPos = buf.indexOf('\n'.charCodeAt(0));

      let startsWith = true;
      let done = false;

      let i = linePtr;
      let cur = String.fromCharCode(buf[i]);

      // 4. Get first word in line and check if it has the same start as searchWord
      // Iterate through each char of the line in the buffer
      // break out of loop when we hit a \n
      while (cur != '\n') {
        if (i < linePtr + searchWord.length && searchWord[i - linePtr] > cur) {
          startsWith = false;
        } else if (
          i < linePtr + searchWord.length &&
          searchWord[i - linePtr] < cur
        ) {
          if (i < linePtr + 1) done = true;
          // We are alphabetically ahead so we can break out of the loop
          else startsWith = false;
        }
        i++;
        cur = String.fromCharCode(buf[i]);
      }

      if (done) break;

      if (startsWith) {
        const line: string = buf.slice(linePtr, i).toString();

        arr.push.apply(arr, this._parseHitList(line));
      }

      // Limit results to 20.
      if (arr.length >= 20) break;

      linePtr = i + 1;
    }

    // 5. If it does, get the number of leftoverLetters and add searchWord to hash

    // 6. If it does, return the hitList [list of trixHitPos (itemId: string, wordIx: int, leftoverLetters: int)]
    return arr;
  }

  // Takes in a hit string and returns an array of result terms.
  _parseHitList(line: string) {
    let arr: Array<hit> = [];
    const parts = line.split(' ');
    // Each result is of format: "{itemId},{wordIx}"
    // Parse the entire line of these and return
    for (const part of parts) {
      const pair = part.split(',');
      if (pair.length == 2) {
        const itemId: string = pair[0];
        const wordIx: number = Number.parseInt(pair[1]);
        const obj: hit = { itemId: itemId, wordIx: wordIx };
        arr.push(obj);
      } else if (pair.length > 1) {
        throw 'Invalid index file.';
      }
    }
    return arr;
  }
}

type hit = {
  itemId: string;
  wordIx: number;
};

// Returns if the given filePath is a url.
function hasProtocol(urlOrPath: string): boolean {
  return urlOrPath.includes('://');
}
