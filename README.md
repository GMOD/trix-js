![Build Status](https://img.shields.io/github/actions/workflow/status/GMOD/trix-js/push.yml?branch=main)

# trix-js

Read UCSC Trix indexes in pure JavaScript

## Usage

```js
import Trix from '@gmod/trix'
import { RemoteFile } from 'generic-filehandle2'

// We use generic-filehandle2 here to demonstrate searching files on remote servers.
const ixxFile = new RemoteFile(
  'https://hgdownload.soe.ucsc.edu/gbdb/hg38/knownGene.ixx',
)
const ixFile = new RemoteFile(
  'https://hgdownload.soe.ucsc.edu/gbdb/hg38/knownGene.ix',
)

const trix = new Trix(ixxFile, ixFile)

async function doStuff() {
  const results = await trix.search('oca')
  console.log(results)
}
doStuff()
```

## Documentation

### Trix constructor

The Trix class constructor accepts arguments:

- `ixxFile` - a filehandle object for the trix .ixx file
- `ixFile` - a filehandle object for the trix .ix file
- `maxResults = 20` - an optional number specifying the maximum number of results to return on `trix.search()`

### Trix search

Searches the index files for a term and returns its keys. When searching with multiple words, `trix.search()` finds the intersection of the result sets.

The Trix search function accepts arguments:

- `searchString` - a string of space-separated words to search the index file for

The Trix search function returns:

- `Promise<[string, string][]>` - an array of `[term, result]` pairs where `term` is the left column in the trix and `result` is the matching key

## Examples

```js
import { LocalFile } from 'generic-filehandle2'
import Trix from '@gmod/trix'

const ixxFile = new LocalFile('out.ixx')
const ixFile = new LocalFile('out.ix')

// limit maxResults to 5
const trix = new Trix(ixxFile, ixFile, 5)

async function doStuff() {
  const results1 = await trix.search('herc')
  console.log(results1)

  // increase maxResults to 30
  trix.maxResults = 30

  const results2 = await trix.search('linc')
  console.log(results2)
}

doStuff()
```

## Development

### Test trix-js

Clone this repo, install npm packages, then run `npm test`.

### Test the UCSC TrixSearch - Requires Linux

Clone this repo. To run test searches on a track hub using the UCSC `TrixSearch`, navigate to `tests/testdata/test#` and run `bash test#script.sh` where `#` is the test number. To change search terms, edit `searchterms.txt`.

Wondering what to search for? Open `tests/testdata/test#/input.txt`.

To test your own .gff.gz data, navigate to `/test/rawGenomes`, create a directory with your .gff.gz file in it, and from within that directory run `bash ../../programs/gff3ToInput.sh <.gff3.gz FILE> <OUTPUT NAME>`.

## Reference

See the [UCSC trix documentation](https://genome.ucsc.edu/goldenPath/help/trix.html) for basic concepts of trix and [ixixx-js](https://github.com/GMOD/ixixx-js) for a JavaScript implementation of the ixIxx command.
