import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'

import { LocalFile } from 'generic-filehandle2'
import { beforeAll, describe, expect, it } from 'vitest'

import Trix from '../src/index.ts'

// matches src/index.ts
const CHUNK_SIZE = 65536
const ADDRESS_SIZE = 10
const PREFIX_SIZE = 5

// counts what the search actually pulls off disk, which is the point of these
// tests: over http every one of these is a range request
class CountingFile extends LocalFile {
  bytes = 0
  reads = 0

  override async read(length: number, position = 0) {
    const data = await super.read(length, position)
    this.bytes += data.length
    this.reads++
    return data
  }
}

// 10 bytes each, so no read boundary lands between two of them
const HOT_RECORDS = Array.from(
  { length: 20_000 },
  (_, i) => `r${String(i).padStart(6, '0')},1`,
)

const lines = [
  'aaa a1,1',
  `hot ${HOT_RECORDS.join(' ')}`,
  // a term exactly as long as an ixx prefix field is padded out in the ixx
  'zzzzz z1,1',
]

const dir = mkdtempSync(path.join(tmpdir(), 'trix-amp-'))
const ixFile = path.join(dir, 'amp.ix')
const ixxFile = path.join(dir, 'amp.ixx')

beforeAll(() => {
  writeFileSync(ixFile, lines.join('\n') + '\n')
  let pos = 0
  let lastPrefix = ''
  const ixx: string[] = []
  for (const line of lines) {
    const prefix = line
      .split(' ')[0]!
      .slice(0, PREFIX_SIZE)
      .padEnd(PREFIX_SIZE, ' ')
    if (prefix !== lastPrefix) {
      ixx.push(
        `${prefix}${pos.toString(16).toUpperCase().padStart(ADDRESS_SIZE, '0')}`,
      )
      lastPrefix = prefix
    }
    pos += Buffer.byteLength(line) + 1
  }
  writeFileSync(ixxFile, ixx.join('\n') + '\n')
})

function search(term: string, maxResults = 20) {
  const ix = new CountingFile(ixFile)
  return {
    ix,
    results: new Trix(new LocalFile(ixxFile), ix, maxResults).search(term),
  }
}

describe('what a search reads', () => {
  it('takes twenty records off a hot line without reading the line', async () => {
    const { ix, results } = search('hot')
    expect(await results).toHaveLength(20)
    expect(ix.reads).toBe(1)
    expect(ix.bytes).toBeLessThanOrEqual(CHUNK_SIZE)
  })

  it('crosses a hot line in a handful of reads, not one per chunk', async () => {
    const hotLength = Buffer.byteLength(lines[1]!)
    expect(hotLength).toBeGreaterThan(CHUNK_SIZE * 3)
    // reached through the checkpoint for 'hot', so the whole line is skipped
    const { ix, results } = search('hotter')
    expect(await results).toEqual([])
    expect(ix.reads).toBeLessThan(hotLength / CHUNK_SIZE)
  })

  it('starts at the checkpoint whose padded prefix is the term itself', async () => {
    const { ix, results } = search('zzzzz')
    expect(await results).toEqual([['zzzzz', 'z1']])
    // the checkpoint before it opens the hot line, so falling back to it would
    // read the whole thing
    expect(ix.bytes).toBeLessThan(100)
  })

  it('reads every record of a hot line when asked for them all', async () => {
    const { results } = search('hot', HOT_RECORDS.length)
    expect((await results).map(([, record]) => record)).toEqual(
      HOT_RECORDS.map(record => record.slice(0, -2)),
    )
  })
})
