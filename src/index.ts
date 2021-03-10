
function trixSearch(ixFile: string, wordCount: number, words: Array<string>) {

  console.log(`Recieved ${ixFile} ${wordCount} ${words}`);  

  return ["ENST00000445051.1", "ENST00000439876.1"];
}







export const search = (searchTerm: string) => {
  if ('development' === process.env.NODE_ENV) {
    console.log(`Search test for ${searchTerm}.`);
  }
  const ixFile: string = "../test/testData/test1/myTrix.ix";
  const wordCount: number = 1;
  const words: Array<string> = ["this"];
  const r = trixSearch(ixFile, wordCount, words);
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