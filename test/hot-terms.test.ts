import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'

import { LocalFile } from 'generic-filehandle2'
import { beforeAll, describe, expect, it } from 'vitest'

import Trix from '../src/index.ts'

const ADDRESS_SIZE = 10
const PREFIX_SIZE = 5

// a term shared by every feature: one ix line carrying 50k records, several MB
// long, of which a search wants the first twenty
const HOT_RECORDS = 50_000

const lines = [
  `alpha rec0,1 rec1,2`,
  // no records at all, which ixixx cannot emit but a hand-built ix can
  `beta`,
  // the separator is a run of spaces rather than exactly one
  `delta  recA,1   recB,2 `,
  `hot${Array.from({ length: HOT_RECORDS }, (_, i) => ` h${i},${i + 1}`).join('')}`,
  `zebra recZ,1`,
]

const dir = mkdtempSync(path.join(tmpdir(), 'trix-hot-'))
const ixFile = path.join(dir, 'hot.ix')
const ixxFile = path.join(dir, 'hot.ixx')

beforeAll(() => {
  writeFileSync(ixFile, lines.join('\n') + '\n')
  // one checkpoint per line, the way makeIxx would if every line opened a bin
  let pos = 0
  const ixx = lines.map(line => {
    const prefix = line
      .split(' ')[0]!
      .slice(0, PREFIX_SIZE)
      .padEnd(PREFIX_SIZE, ' ')
    const entry = `${prefix}${pos.toString(16).toUpperCase().padStart(ADDRESS_SIZE, '0')}`
    pos += Buffer.byteLength(line) + 1
    return entry
  })
  writeFileSync(ixxFile, ixx.join('\n') + '\n')
})

function search(term: string, maxResults = 20) {
  return new Trix(
    new LocalFile(ixxFile),
    new LocalFile(ixFile),
    maxResults,
  ).search(term)
}

describe('a term carrying very many records', () => {
  it('returns maxResults from the front of the list', async () => {
    expect(await search('hot')).toEqual(
      Array.from({ length: 20 }, (_, i) => ['hot', `h${i}`]),
    )
  })

  it('honours a maxResults larger than one chunk of records', async () => {
    expect(await search('hot', 5000)).toHaveLength(5000)
  })

  it('takes every record when maxResults exceeds the list', async () => {
    expect(await search('hot', HOT_RECORDS + 10)).toHaveLength(HOT_RECORDS)
  })

  it('finds a term sorting after the long line', async () => {
    expect(await search('zebra')).toEqual([['zebra', 'recZ']])
  })

  it('stops without hits for a term sorting after everything', async () => {
    expect(await search('zzz')).toEqual([])
  })
})

describe('record fields', () => {
  it('reads a line whose records are separated by runs of spaces', async () => {
    expect(await search('delta')).toEqual([
      ['delta', 'recA'],
      ['delta', 'recB'],
    ])
  })

  it('yields nothing for a term with no records', async () => {
    expect(await search('beta')).toEqual([])
  })

  it('still matches the term either side of an empty one', async () => {
    expect(await search('alpha')).toEqual([
      ['alpha', 'rec0'],
      ['alpha', 'rec1'],
    ])
  })
})
