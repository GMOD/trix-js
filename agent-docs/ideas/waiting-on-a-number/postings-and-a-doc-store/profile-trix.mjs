// Profiles a trix index: how much of the .ix is copied records, which tracks
// they come from, and what trix-js reads to answer each query.
//
//   node profile-trix.mjs hg38.ix hg38.ixx [query...]
import fs from 'node:fs'
import readline from 'node:readline'

import { LocalFile } from 'generic-filehandle2'

import Trix from '../../../../src/index.ts'

const [ixPath, ixxPath, ...args] = process.argv.slice(2)
const queries = args.length
  ? args
  : ['nm_000546.6', 'p53', '0546', 'brca1', 'dna', 'kinas', 'ca']

let terms = 0
let postings = 0
let recordBytes = 0
const records = new Map()
const trackBytes = new Map()
const lines = readline.createInterface({
  input: fs.createReadStream(ixPath),
  crlfDelay: Infinity,
})
for await (const line of lines) {
  terms++
  for (const posting of line.split(' ').slice(1)) {
    if (posting) {
      const record = posting.slice(0, posting.lastIndexOf(','))
      const track = record.split('|')[1]
      postings++
      recordBytes += record.length
      records.set(record, record.length)
      trackBytes.set(track, (trackBytes.get(track) ?? 0) + posting.length + 1)
    }
  }
}
const uniqueBytes = [...records.values()].reduce((a, b) => a + b, 0)
const fileBytes = fs.statSync(ixPath).size
const mb = bytes => (bytes / 1e6).toFixed(1)

console.log(`${mb(fileBytes)} MB .ix, ${terms} terms, ${postings} postings`)
console.log(
  `records: ${mb(recordBytes)} MB (${Math.round((100 * recordBytes) / fileBytes)}%), ${records.size} distinct totalling ${mb(uniqueBytes)} MB, so each is stored ${(recordBytes / uniqueBytes).toFixed(1)}x`,
)
for (const [track, bytes] of trackBytes) {
  console.log(`  ${track}: ${mb(bytes)} MB`)
}

class CountingFile extends LocalFile {
  reads = 0
  bytes = 0
  async read(length, position, opts) {
    const data = await super.read(length, position, opts)
    this.reads++
    this.bytes += data.length
    return data
  }
}

for (const query of queries) {
  const ix = new CountingFile(ixPath)
  // the maxResults TrixTextSearchAdapter passes
  const hits = await new Trix(new LocalFile(ixxPath), ix, 1500).search(query)
  console.log(
    `${query.padEnd(12)} reads=${ix.reads} KiB=${Math.round(ix.bytes / 1024)} hits=${hits.length}`,
  )
}
