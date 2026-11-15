import { writeFileSync } from 'node:fs'
import path from 'node:path'

import { LocalFile } from 'generic-filehandle2'
import { beforeAll, describe, expect, it } from 'vitest'

import Trix from '../src/index.ts'
import { makeIxx, tempDir } from './make-ixx.ts'

const records = (prefix: string, count: number) =>
  Array.from({ length: count }, (_, i) => `${prefix}${i}`)

const terms: [string, string[]][] = [
  ['alpha', records('r', 300)],
  ['beta', records('q', 300)],
  ['mid', records('r', 50)],
  ['rare', ['x1']],
  ['wide', records('r', 150)],
]

const dir = tempDir()
const ixFile = path.join(dir, 'multi.ix')
const ixxFile = path.join(dir, 'multi.ixx')

beforeAll(() => {
  const lines = terms.map(
    ([term, recs]) => `${term} ${recs.map(r => `${r},1`).join(' ')}`,
  )
  writeFileSync(ixFile, lines.join('\n') + '\n')
  writeFileSync(ixxFile, makeIxx(lines))
})

async function search(query: string, maxResults?: number) {
  const hits = await new Trix(
    new LocalFile(ixxFile),
    new LocalFile(ixFile),
    maxResults,
  ).search(query)
  return hits.map(([, record]) => record)
}

describe('a word of a multi-word query', () => {
  it('rules records out when it has more records than maxResults', async () => {
    expect(await search('rare mid')).toEqual([])
  })

  it('rules nothing out past 200 records', async () => {
    expect(await search('rare alpha')).toEqual(['x1'])
  })

  it('answers with at most maxResults records', async () => {
    expect(await search('mid wide')).toEqual(records('r', 20))
  })

  it('falls back to the first word when every word passes 200 records', async () => {
    expect(await search('beta alpha')).toEqual(records('q', 20))
    expect(await search('alpha beta')).toEqual(records('r', 20))
  })

  it('reads past 200 records when maxResults asks for more', async () => {
    expect(await search('alpha beta', 250)).toEqual(records('r', 250))
  })
})
