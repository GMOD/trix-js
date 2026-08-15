![Build Status](https://img.shields.io/github/actions/workflow/status/GMOD/trix-js/publish.yml?branch=main)

# trix-js

Read UCSC Trix indexes in pure JavaScript

## Install

```bash
npm install @gmod/trix
```

## Usage

```js
import Trix from '@gmod/trix'
import { RemoteFile } from 'generic-filehandle2'

// generic-filehandle2 also has LocalFile for files on disk
const trix = new Trix(
  new RemoteFile('https://hgdownload.soe.ucsc.edu/gbdb/hg38/knownGene.ixx'),
  new RemoteFile('https://hgdownload.soe.ucsc.edu/gbdb/hg38/knownGene.ix'),
)

const results = await trix.search('oca')
// => [[term, record], ...]
```

## API

### `new Trix(ixxFile, ixFile, maxResults?)`

- `ixxFile` - filehandle for the `.ixx` file
- `ixFile` - filehandle for the `.ix` file
- `maxResults` - most results a search returns, default 20. Also settable
  afterwards as `trix.maxResults`

### `trix.search(searchString, opts?)`

Prefix-searches the index and resolves to `[term, record][]`, where `term` is
the indexed word that matched and `record` is the key it points to. Records are
deduplicated, so two terms hitting the same record yield one result.

- `searchString` - the query; only its first whitespace-separated word is used
- `opts.signal` - an `AbortSignal` to cancel the underlying reads

## Reference

See the [UCSC trix documentation](https://genome.ucsc.edu/goldenPath/help/trix.html)
for the concepts, and [ixixx-js](https://github.com/GMOD/ixixx-js) for a
JavaScript implementation of the `ixIxx` command that builds these indexes.

See [CONTRIBUTING.md](CONTRIBUTING.md) for development and release steps.
