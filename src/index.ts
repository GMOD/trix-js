import { LocalFile, RemoteFile, BlobFile } from 'generic-filehandle';

type anyFile = LocalFile | RemoteFile | BlobFile;

const trixPrefixSize = 5;

// type Trix = {
//   lineFile: LineFile;
//   ixx: TrixIxx; // The position and prefix string
//   ixxSize: number; //
//   ixxAlloc: number;
//   // wordHitHash: Hash;
//   useUdc: boolean;
// };

// Used as a file description object in Trix.c, not sure if this is exactly needed for ts.
type LineFile = {
  filename: string;
  bufsize: number;
  buf: string;
  buffOffsetInFile?: number;
};

type TrixIxx = {
  // Position where prefix first occurs in file.
  pos: number; // Technically should by off_t type (64 vs. 32 bit)

  // Space padded first five letters of what we're indexing.
  prefix: string; // TODO: should be array of char of length trixPrefixSize
};

// Create a new Trix object and return it.
// function trixNew(): Trix {
//   let lf: LineFile = {
//     filename: '',
//     bufsize: 64 * 1024,
//     buf: '',
//   };
//   let ix: TrixIxx = {
//     pos: 0,
//     prefix: '',
//   };
//   let trix: Trix = {
//     lineFile: lf,
//     ixx: ix,
//     ixxSize: 0,
//     ixxAlloc: 8 * 1024,
//     useUdc: false,
//   };
//   return trix;
// }

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
  itemId: string,
  wordIx: number
}

// Search the .ix file for the searchWord.
// Returns list of hit words
export async function trixSearch(
  searchWord: string,
  trix: Trix,
  ixFile: anyFile
) {
  // 1. Check if searchWord is already in hashTable
  // 2. Seek ahead to byte `trix.index` of `ixFile`

  // 3. Loop through each line of `ixFile`
  // const fs = require('fs');
  // const stream = fs.createReadStream(ixFile, { highWaterMark: 1000 });
  // for await(const data of stream) {
  //     // do something with data
  //     console.log(data);
  //     break;
  // }

  // const buf = new Buffer();
  // await ixFile.read();
  // console.log(buf.toString())

  const buf = await ixFile.readFile();
  const lines = buf.toString('utf8').split('\n');
  // console.log(lines);

  let arr: Array<hit> = [];

  for (const line of lines) {
    if (line.length > 0) {
      // 4. Get first word in line and check if it has the same start as searchWord
      if (line.startsWith(searchWord)) {
        arr = parseHitList(line);
        break;
      }
    }
  }

  // TODO: Use buffer with offset to read in from the file.

  // 5. If it does, get the number of leftoverLetters and add searchWord to hash

  // 6. If it does, return the hitList [list of trixHitPos (itemId: string, wordIx: int, leftoverLetters: int)]
  return arr;
}

export function parseHitList(line: string) {
  let arr: Array<hit> = []
  const parts = line.split(' ');
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

/*
Note about safef() function in kent:

One weakness of C in the string handling.  It is very easy using standard C 
library functions like sprintf and strcat to write past the end of the
character array that holds a string.  For this reason instead of sprintf
we use the "safef" function, which takes an additional parameter, the size
of the character array.  So
   char buffer[50];
   sprintf(buf, "My name is %s", name);
becomes
   char buffer[50];
   safef(buf, sizeof(buf), "My name is %s", name);
Instead of just silently overflowing the buffer and crashing cryptically
in many cases if the string is too long, say "Sahar Barjesteh van Waalwijk van Doorn-Khosrovani"
which is actually a real scientists name!


*/
