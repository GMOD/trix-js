import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'

import { LocalFile } from 'generic-filehandle2'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import Trix from '../src/index.ts'

describe('ix file without a trailing newline', () => {
  let dir: string

  beforeAll(() => {
    dir = mkdtempSync(path.join(tmpdir(), 'trix-no-nl-'))
    // last record has no trailing '\n'
    writeFileSync(path.join(dir, 'test.ix'), 'apple a1\nzebra z1')
    writeFileSync(path.join(dir, 'test.ixx'), 'apple0000000000\n')
  })

  afterAll(() => {
    rmSync(dir, { recursive: true, force: true })
  })

  it('still returns the final record', async () => {
    const trix = new Trix(
      new LocalFile(path.join(dir, 'test.ixx')),
      new LocalFile(path.join(dir, 'test.ix')),
    )
    expect(await trix.search('zebra')).toEqual([['zebra', 'z1']])
  })
})
