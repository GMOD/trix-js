import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'

import { LocalFile } from 'generic-filehandle2'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import Trix from '../src/index.ts'

// matches CHUNK_SIZE in src/index.ts
const CHUNK_SIZE = 65536

describe('UTF-8 multibyte char straddling a chunk boundary', () => {
  let dir: string

  beforeAll(() => {
    dir = mkdtempSync(path.join(tmpdir(), 'trix-utf8-'))

    // construct an ix file so the 3-byte UTF-8 sequence for € (E2 82 AC) has
    // its first byte at offset CHUNK_SIZE-1 and its remaining bytes in the
    // next read.
    //
    //   bytes 0..(CHUNK_SIZE-6)  padding line ending in '\n'
    //   bytes (CHUNK_SIZE-5)..(CHUNK_SIZE-2)  "test" (4 ASCII bytes)
    //   byte  CHUNK_SIZE-1       0xE2  (€ byte 1) -- end of first read
    //   byte  CHUNK_SIZE         0x82  (€ byte 2) -- start of second read
    //   byte  CHUNK_SIZE+1       0xAC  (€ byte 3)
    //   "value hit_value\n"      remaining bytes
    const padBody = `a ${' '.repeat(CHUNK_SIZE - 9)}x`
    if (padBody.length + 1 !== CHUNK_SIZE - 5) {
      throw new Error(`pad sizing off: ${padBody.length}`)
    }
    const content = `${padBody}\ntest€value hit_value\n`
    writeFileSync(path.join(dir, 'test.ix'), content)

    // ixx format: <term><10-char hex address>\n
    // one entry pointing at offset 0 is enough for the binary search
    writeFileSync(path.join(dir, 'test.ixx'), 'a0000000000\n')
  })

  afterAll(() => {
    rmSync(dir, { recursive: true, force: true })
  })

  it('finds the term containing € whose bytes span the chunk boundary', async () => {
    const trix = new Trix(
      new LocalFile(path.join(dir, 'test.ixx')),
      new LocalFile(path.join(dir, 'test.ix')),
    )
    const result = await trix.search('test€value')
    expect(result).toEqual([['test€value', 'hit_value']])
  })
})
