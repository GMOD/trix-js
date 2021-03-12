// Specify number of bits
const off_t: number = 64;
const trixPrefixSize = 5;

type Trix = {
  lineFile: LineFile;
  ixx: TrixIxx;
  ixxSize: number;
  ixxAlloc: number;
  // wordHitHash: Hash;
  useUdc: boolean;
}

type LineFile = {

}

type TrixIxx = {
  pos: number;  // Technically should by off_t type (64 vs. 32 bit)
  prefix: string; // TODO: should be array of char of length trixPrefixSize
}

// type Hash = {}



function trixNew(): Trix {
  let lf: LineFile = {}
  let ix: TrixIxx = {
    pos: 0,
    prefix: ""
  }
  let trix: Trix = {
    lineFile: lf,
    ixx: ix,
    ixxSize: 0,
    ixxAlloc: 0,
    useUdc: false
  }
  return trix;
}



function openTrix() {
  let trix: Trix = trixNew();
}




function trixSearchCommand(ixFile: string, wordCount: number, words: Array<string>) {

  // TODO: Start the Trix Search
  for (let i=0; i<words.length; i++)
    words[i] = words[i].toLowerCase();

  console.log(`${ixFile} ${wordCount} ${words}`);


  return ["ENST00000445051.1", "ENST00000439876.1"];
}

export const search = (searchTerm: string) => {
  if ('development' === process.env.NODE_ENV) {
    console.log(`Search test for ${searchTerm}.`);
  }
  const ixFile: string = "../test/testData/test1/myTrix.ix";
  const wordCount: number = 1;
  const words: Array<string> = ["This", "tYme"];
  const r = trixSearchCommand(ixFile, wordCount, words);
  return r;
};





/*

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