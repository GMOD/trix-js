import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'

import { LocalFile } from 'generic-filehandle2'
import { beforeAll, describe, expect, it } from 'vitest'

import Trix from '../src/index.ts'

const ADDRESS_SIZE = 10
const PREFIX_SIZE = 5

// terms spanning the range where utf-8 byte order and utf-16 order disagree:
// the astral terms sort last in the ix, but their surrogates compare below the
// 0xFF20 and 0xFFFF terms in javascript
const records = [
  'apple gene1,1',
  '＠fullwidth gene2,1',
  '￿thing gene3,1',
  '🍎apple gene4,1',
  '🎉party gene5,1',
]

const dir = mkdtempSync(path.join(tmpdir(), 'trix-astral-'))
const ixFile = path.join(dir, 'test.ix')
const ixxFile = path.join(dir, 'test.ixx')

beforeAll(() => {
  writeFileSync(ixFile, records.join('\n') + '\n')

  const lines: string[] = []
  let pos = 0
  for (const record of records) {
    const word = record.split(' ')[0]!
    const prefix = word.slice(0, PREFIX_SIZE).padEnd(PREFIX_SIZE, ' ')
    lines.push(
      `${prefix}${pos.toString(16).toUpperCase().padStart(ADDRESS_SIZE, '0')}`,
    )
    pos += Buffer.byteLength(record) + 1
  }
  writeFileSync(ixxFile, lines.join('\n') + '\n')
})

describe('astral characters in a byte-sorted ix', () => {
  it('the fixture is in utf-8 byte order, as sort -k1,1 under LC_ALL=C emits', () => {
    const byBytes = records.toSorted((a, b) =>
      Buffer.compare(Buffer.from(a, 'utf8'), Buffer.from(b, 'utf8')),
    )
    expect(records).toEqual(byBytes)
  })

  it('finds every term, including ones behind an astral/bmp order flip', async () => {
    const trix = new Trix(new LocalFile(ixxFile), new LocalFile(ixFile))
    for (const record of records) {
      const [term, hit] = record.split(' ') as [string, string]
      expect(await trix.search(term)).toEqual([[term, hit.split(',')[0]]])
    }
  })
})
