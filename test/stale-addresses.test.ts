import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'

import { LocalFile } from 'generic-filehandle2'
import { beforeAll, describe, expect, it } from 'vitest'

import Trix from '../src/index.ts'

const ADDRESS_SIZE = 10
const PREFIX_SIZE = 5
const NEWLINE = 10

// terms are multibyte, so a character-counted address drifts further from the
// real byte offset with every record, the way ixixx wrote them before the
// byte-offset fix
const records = Array.from(
  { length: 300 },
  (_, i) => `記述${String(i).padStart(4, '0')} gene${i},1`,
).toSorted()

function address(n: number) {
  return n.toString(16).toUpperCase().padStart(ADDRESS_SIZE, '0')
}

function prefixOf(record: string) {
  return record.split(' ')[0]!.slice(0, PREFIX_SIZE).padEnd(PREFIX_SIZE, ' ')
}

// like makeIxx in ixixx: one entry per prefix, addressing the first record that
// carries it, counting either bytes (correct) or characters (what ixixx wrote
// before the fix)
function makeIxx(inBytes: boolean) {
  const lines: string[] = []
  let pos = 0
  let lastPrefix = ''
  for (const record of records) {
    const prefix = prefixOf(record)
    if (prefix !== lastPrefix) {
      lines.push(`${prefix}${address(pos)}`)
      lastPrefix = prefix
    }
    pos += (inBytes ? Buffer.byteLength(record) : record.length) + 1
  }
  return lines.join('\n') + '\n'
}

const dir = mkdtempSync(path.join(tmpdir(), 'trix-stale-'))
const ixFile = path.join(dir, 'test.ix')
const byteIxx = path.join(dir, 'bytes.ixx')
const charIxx = path.join(dir, 'chars.ixx')

beforeAll(() => {
  writeFileSync(ixFile, records.join('\n') + '\n')
  writeFileSync(byteIxx, makeIxx(true))
  writeFileSync(charIxx, makeIxx(false))
})

function search(ixx: string, term: string) {
  return new Trix(new LocalFile(ixx), new LocalFile(ixFile), 20).search(term)
}

describe('ixx addresses that do not land on a line start', () => {
  it('the char-counted fixture really is misaligned', () => {
    const ix = readFileSync(ixFile)
    const misaligned = readFileSync(charIxx, 'utf8')
      .trim()
      .split('\n')
      .filter(line => {
        const offset = Number.parseInt(line.slice(-ADDRESS_SIZE), 16)
        return !(offset === 0 || ix[offset - 1] === NEWLINE)
      })
    expect(misaligned.length).toBeGreaterThan(0)
  })

  it('finds every term through a byte-addressed ixx', async () => {
    for (const record of records) {
      const term = record.split(' ')[0]!
      expect(await search(byteIxx, term)).toEqual([
        [term, `gene${Number(term.slice(2))}`],
      ])
    }
  })

  it('finds every term through a stale char-addressed ixx', async () => {
    for (const record of records) {
      const term = record.split(' ')[0]!
      expect(await search(charIxx, term)).toEqual([
        [term, `gene${Number(term.slice(2))}`],
      ])
    }
  })
})
