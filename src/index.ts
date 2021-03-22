import { LocalFile, RemoteFile, BlobFile } from 'generic-filehandle';

type anyFile = LocalFile | RemoteFile | BlobFile;

const trixPrefixSize = 5;

type ParsedIxx = Map<string, number>;

export default class Trix {
  index: Promise<ParsedIxx>;

  constructor(file: anyFile) {
    this.index = this._parseIxx(file);
  }

  // Parses ixx file and returns a ParsedIxx
  async _parseIxx(file: anyFile): Promise<ParsedIxx> {
    const ixx = new Map();

    // Load the ixxFile into ixxData object
    const buf = await file.readFile();
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
}

type hit = {
  itemId: string;
  wordIx: number;
};

// TODO: add these as methods to the trix object

// Search the .ix file for the searchWord.
// Returns list of hit words
export async function trixSearch(
  searchWord: string,
  trix: Trix,
  ixFile: anyFile
) {
  // 1. Check if searchWord is already in hashTable
  // 2. Seek ahead to byte `trix.index` of `ixFile`

  // For each ixx in trix, compare ixx->prefix and word prefix
  // If we get a hit, return the position

  // Get position to seek to in .ix file
  let seekPosStart = 0;
  let seekPosEnd = -1;
  const indexes = await trix.index;
  for (let [key, value] of indexes) {
    if (key > searchWord) {
      seekPosEnd = value - 1;
      break;
    }
    seekPosStart = value;
  }

  // console.log(`${seekPosStart} ${seekPosEnd}`);

  // TODO: Use buffer with offset to read in from the file.

  let bufLength: number;

  if (seekPosEnd == -1) {
    // set buf to length of file in bytes - seekPosStart
    const stat = await ixFile.stat();
    bufLength = stat.size;
  } else {
    bufLength = seekPosEnd - seekPosStart;
  }

  let buf = Buffer.alloc(bufLength);

  await ixFile.read(buf, 0, bufLength, seekPosStart);

  // const buf = await ixFile.readFile();
  // const lines = buf.toString('utf8').split('\n');

  // 3. Loop through each line of `ixFile`
  // const fs = require('fs');
  // const stream = fs.createReadStream(ixFile, { highWaterMark: 1000 });
  // for await(const data of stream) {
  //     // do something with data
  //     console.log(data);
  //     break;
  // }

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
      // TODO: subtract linePtr from i
      if (i < linePtr + searchWord.length && searchWord[i - linePtr] > cur) {
        startsWith = false;
      }
      else if (i < linePtr + searchWord.length && searchWord[i - linePtr] < cur) {
        let ls = buf.slice(linePtr, linePtr + 5);
        // console.log(`${cur} - ${ls}`);
        startsWith = false;
        // done = true;  // We are alphabetically ahead so we can break out of the loop
      }
      i++;
      cur = String.fromCharCode(buf[i]);
    }

    if (done) break;

    if (startsWith) {
      const line: string = buf.slice(linePtr, i).toString();
      // console.log(`Here is the line: ${line}`);

      arr.push.apply(arr, parseHitList(line));
    }

    // else if (searchWord < line) {
    //   // console.log(`${searchWord} - ${line}`);
    //   break;
    // }

    // Limit results to 20 for now.
    if (arr.length >= 20) break;

    linePtr = i + 1;
  }

  // 5. If it does, get the number of leftoverLetters and add searchWord to hash

  // 6. If it does, return the hitList [list of trixHitPos (itemId: string, wordIx: int, leftoverLetters: int)]
  return arr;
}

// Takes in a hit string and returns an array of result terms.
export function parseHitList(line: string) {
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

// Returns if the given filePath is a url.
function hasProtocol(urlOrPath: string): boolean {
  return urlOrPath.includes('://');
}

// Open up index.  Load second level index in memory.
async function trixOpen(ixxFile: anyFile) {
  // let trix: Trix = trixNew();
  let trix = new Trix(ixxFile);
}

// Search for each word in the words array.
async function trixSearchCommand(
  ixFile: anyFile,
  ixxFile: anyFile,
  wordCount: number,
  words: Array<string>
) {
  for (let i = 0; i < words.length; i++) words[i] = words[i].toLowerCase();

  await trixOpen(ixxFile);

  return ['ENST00000445051.1', 'ENST00000439876.1'];
}

export const search = async (searchTerm: string) => {
  // if ('development' === process.env.NODE_ENV) {
  //   console.log(`Search test for ${searchTerm}.`);
  // }

  const filePath: string = './test/testData/test2/out.ix';
  // const ixFile: string = './test/testData/test1/myTrix.ix';
  const ixFile = new LocalFile(filePath);
  const ixxFile = new LocalFile(filePath + 'x');
  const wordCount: number = 1;
  const words: Array<string> = ['This', 'tYme'];
  const r = await trixSearchCommand(ixFile, ixxFile, wordCount, words);
  return r;
};
