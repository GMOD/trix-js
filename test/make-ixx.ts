import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'

import { afterAll } from 'vitest'

const ADDRESS_SIZE = 10

function address(n: number) {
  return n.toString(16).toUpperCase().padStart(ADDRESS_SIZE, '0')
}

// like makeIxx in ixixx: one entry per prefix, space-padded to a fixed width,
// addressing the first line that carries it
export function makeIxx(
  lines: string[],
  prefixSize = 5,
  measure = (line: string) => Buffer.byteLength(line),
) {
  const out: string[] = []
  let pos = 0
  let last = ''
  for (const line of lines) {
    const prefix = line
      .split(' ')[0]!
      .slice(0, prefixSize)
      .padEnd(prefixSize, ' ')
    if (prefix !== last) {
      out.push(`${prefix}${address(pos)}`)
      last = prefix
    }
    pos += measure(line) + 1
  }
  return out.join('\n') + '\n'
}

export function tempDir() {
  const dir = mkdtempSync(path.join(tmpdir(), 'trix-'))
  afterAll(() => {
    rmSync(dir, { recursive: true, force: true })
  })
  return dir
}
