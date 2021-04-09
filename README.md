# trix-js
Read UCSC Trix indexes in pure JavaScript

## Usage

```js
const { LocalFile } = require('generic-filehandle');
const ixxFile = new LocalFile('out.ixx');
const ixFile = new LocalFile('out.ix');

const Trix = require('src/index');
const trix = new Trix['default'](ixxFile, ixFile);

async function doStuff() {
  const results = await trix.search('oca');
  console.log(results);
}

```

## Documentation
### Trix constructor
The Trix class constructor accepts arguments:
- `ixxFile` - a LocalFile, RemoteFile, or BlobFile object output from ixIxx
- `ixFile` - a LocalFile, RemoteFile, or BlobFile object output from ixIxx
- `maxResults = 20` - an optional number specifying the maximum number of results to return on `trix.search()`


### Trix search
**Search the index files for a term and find its keys**<br>
In the case of searching with multiple words, `trix.search()` finds the intersection of the result sets.<br>
The Trix search function accepts argument:
- `searchString` - a string of space-separated words for what to search the index file and find keys for<br>
  
The Trix search function returns: <br>
- `Promise<string[]>` - a promised array of strings where each string is an itemId result
  


## Examples

```js
const { LocalFile, RemoteFile, BlobFile } = require('generic-filehandle');
const ixxFile = new LocalFile('out.ixx');
const ixFile = new LocalFile('out.ix');

const Trix = require('src/index');

// limit maxResults to 5
const trix = new Trix['default'](ixxFile, ixFile, 5);

async function doStuff() {
  const results1 = await trix.search('herc');
  console.log(results1);

  // increase maxResults to 30
  trix.maxResults = 30;

  const results2 = await trix.search('linc');
  console.log(results2);
}

doStuff();
```
<br><br>















## Development


### Test trix-js
First, clone this repo and install npm packages. <br>
Then, run `npm test`. <br>

### Test the USCS TrixSearch - Requires Linux
First, clone this repo.
To run test searches on a track hub using the USCS `TrixSearch`, navigate to `tests/testdata/test#` and run `bash test#script.sh` where # is the test number.
To change search terms, edit `searchterms.txt`.

**Wondering what to search for?**<br>
Open up `tests/testdata/test#/input.txt`.


**How to test my own .gff.gz data?**<br>
Navigate to `/test/rawGenomes` and create a directory with your .gff.gz file in it. From within that directory, run `bash ../../programs/gff3ToInput.sh <.gff3.gz FILE> <OUTPUT NAME>`.

