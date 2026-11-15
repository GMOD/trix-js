import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'

import { LocalFile } from 'generic-filehandle2'
import { beforeAll, describe, expect, it } from 'vitest'

import Trix from '../src/index.ts'
import { makeIxx, tempDir } from './make-ixx.ts'

const ADDRESS_SIZE = 10
const NEWLINE = 10

// terms are multibyte, so a character-counted address drifts further from the
// real byte offset with every record, the way ixixx wrote them before the
// byte-offset fix
const records = Array.from(
  { length: 300 },
  (_, i) => `記述${String(i).padStart(4, '0')} gene${i},1`,
).toSorted()

const dir = tempDir()
const ixFile = path.join(dir, 'test.ix')
const byteIxx = path.join(dir, 'bytes.ixx')
const charIxx = path.join(dir, 'chars.ixx')

beforeAll(() => {
  writeFileSync(ixFile, records.join('\n') + '\n')
  writeFileSync(byteIxx, makeIxx(records))
  // counting characters, as ixixx did before the byte-offset fix
  writeFileSync(
    charIxx,
    makeIxx(records, 5, record => record.length),
  )
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
