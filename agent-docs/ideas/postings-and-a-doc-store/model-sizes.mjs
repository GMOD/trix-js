// Sizes one GFF as trix, which copies the whole record onto every word, and
// as a doc store plus postings, which stores each record once. The postings
// sizes are modeled (front-coded dictionary, delta-varint doc ids), not built.
//
//   node --max-old-space-size=8000 model-sizes.mjs hg38.gff.gz
import zlib from 'node:zlib'

import { features } from './gff.mjs'

const trackId = 'hg38-ncbiRefSeqGff'
const stopWords = new Set(
  'a an and the of to in for on with by at or from is as be variant transcript protein like family member containing domain'.split(
    ' ',
  ),
)

const words = text =>
  text
    .toLowerCase()
    .split(/[\s,;()[\]/]+/)
    .filter(Boolean)
const fragments = word =>
  [...word.split(/[-_.:|]+/), word.replace(/\.\d+$/, '')].filter(
    part => part && part !== word,
  )
// a prefix search over every suffix of three or more characters is a
// substring search
const suffixes = symbol =>
  Array.from({ length: Math.max(0, symbol.length - 3) }, (_, i) =>
    symbol.slice(i + 1),
  )

// the record gff3Adapter writes and ixixx copies onto each word, plus the
// ",N " the ix appends to it
const trixPosting = (loc, attrs) =>
  `["${encodeURIComponent(loc)}"|"${trackId}"|${attrs.map(a => `"${encodeURIComponent(a)}"`).join('|')}]`
    .length + 3

const trix = { ids: 0, freeText: 0, fragments: 0, suffixes: 0 }
const postings = { words: new Map(), fragments: new Map(), suffixes: new Map() }
const symbols = new Set()
const docs = []

function post(map, term, doc) {
  let list = map.get(term)
  if (!list) {
    list = []
    map.set(term, list)
  }
  if (list.at(-1) !== doc) {
    list.push(doc)
  }
}

for await (const { loc, type, attrs } of features(process.argv[2])) {
  const ids = ['Name', 'ID', 'gene_synonym']
    .map(k => attrs[k]?.replaceAll(',', ' '))
    .filter(Boolean)
  const freeText = ['description', 'product']
    .map(k => attrs[k]?.replaceAll(',', ' '))
    .filter(Boolean)
  const featureSymbols = new Set(
    [attrs.Name, ...(attrs.gene_synonym?.split(',') ?? [])]
      .filter(Boolean)
      .map(s => s.toLowerCase()),
  )

  const idWords = new Set(ids.flatMap(v => v.toLowerCase().split(/\s+/)))
  const freeWords = freeText.flatMap(v => v.toLowerCase().split(/\s+/))
  const withFragments = new Set([
    ...idWords,
    ...[...idWords].flatMap(fragments),
  ])
  const suffixCount = [...featureSymbols].reduce(
    (n, s) => n + suffixes(s).length,
    0,
  )
  trix.ids += idWords.size * trixPosting(loc, ids)
  trix.freeText +=
    new Set([...idWords, ...freeWords]).size *
    trixPosting(loc, [...ids, ...freeText])
  trix.fragments += withFragments.size * trixPosting(loc, ids)
  trix.suffixes += (withFragments.size + suffixCount) * trixPosting(loc, ids)

  const doc = docs.length
  docs.push(
    JSON.stringify([
      loc,
      0,
      type,
      attrs.Name ?? '',
      attrs.ID ?? '',
      attrs.gene_synonym ?? '',
      attrs.description ?? attrs.product ?? '',
      attrs.Dbxref ?? '',
    ]),
  )
  const identifiers = new Set([...ids, attrs.Dbxref ?? ''].flatMap(words))
  for (const word of identifiers) {
    post(postings.words, word, doc)
    for (const part of fragments(word)) {
      post(postings.fragments, part, doc)
    }
  }
  for (const word of new Set(freeText.flatMap(words))) {
    if (!stopWords.has(word)) {
      post(postings.words, word, doc)
    }
  }
  for (const symbol of featureSymbols) {
    symbols.add(symbol)
    for (const suffix of suffixes(symbol)) {
      post(postings.suffixes, suffix, doc)
    }
  }
}

const varint = n => (n < 1 << 7 ? 1 : n < 1 << 14 ? 2 : n < 1 << 21 ? 3 : 4)
const mb = bytes => (bytes / 1e6).toFixed(1)

function modeled(map) {
  let dictionary = 0
  let postingBytes = 0
  let count = 0
  let previous = ''
  for (const term of [...map.keys()].sort()) {
    let shared = 0
    while (shared < term.length && term[shared] === previous[shared]) {
      shared++
    }
    // the unshared tail, its two lengths, and a postings offset
    dictionary += term.length - shared + 2 + 3
    previous = term
    let last = 0
    for (const doc of map.get(term)) {
      // the doc id delta and a field byte
      postingBytes += varint(doc - last) + 1
      last = doc
      count++
    }
  }
  return `${map.size} terms, ${count} postings: dictionary ${mb(dictionary)} MB, postings ${mb(postingBytes)} MB`
}

let docBytes = 0
let docGzip = 0
for (let i = 0; i < docs.length; i += 500) {
  const block = docs.slice(i, i + 500).join('\n')
  docBytes += block.length + 1
  docGzip += zlib.gzipSync(block).length
}
const symbolList = [...symbols].join('\n')

console.log(`${docs.length} features`)
console.log('trix')
console.log(`  Name/ID/gene_synonym             ${mb(trix.ids)} MB`)
console.log(`  + description/product words     ${mb(trix.freeText)} MB`)
console.log(`  + id fragments                   ${mb(trix.fragments)} MB`)
console.log(`  + id fragments, symbol suffixes  ${mb(trix.suffixes)} MB`)
console.log('doc store plus postings')
console.log(
  `  doc store                        ${mb(docBytes)} MB raw, ${mb(docGzip)} MB gzipped in 500-doc blocks`,
)
console.log(`  ids, Dbxref, free-text words     ${modeled(postings.words)}`)
console.log(`  id fragments                     ${modeled(postings.fragments)}`)
console.log(`  symbol suffixes                  ${modeled(postings.suffixes)}`)
console.log(
  `symbol dictionary                  ${symbols.size} entries, ${mb(symbolList.length)} MB raw, ${(zlib.gzipSync(symbolList).length / 1e6).toFixed(2)} MB gzipped`,
)
