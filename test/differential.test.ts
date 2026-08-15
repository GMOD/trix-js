import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'

import { LocalFile } from 'generic-filehandle2'
import { describe, expect, it } from 'vitest'

import { compareCodePoints } from '../src/compare-code-points.ts'
import Trix from '../src/index.ts'

const ADDRESS_SIZE = 10

// search reads the ix through checkpoints, chunked reads and an early stop, so
// most of what it does is invisible to a test that only checks a known answer.
// this builds small indexes instead and compares against the answer a scan of
// the whole file gives, over every prefix of every term in them — the queries
// that land on a checkpoint boundary, run past one, or match nothing are then
// all covered without having to be thought of individually

// the corpora have to be reproducible, so no Math.random
function rng(seed: number) {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 4294967296
  }
}

// small alphabets make terms that are prefixes of one another common, which is
// where the checkpoint lookup and the stop condition are easiest to get wrong.
// one alphabet mixes ascii, 2- and 3-byte utf-8 and an astral character, so the
// byte offsets and the sort order both stop being the obvious ones
const ALPHABETS = [
  'abc',
  'abcdefghijklmnopqrstuvwxyz0123456789',
  'aé漢𝟘b',
  'ab',
]

function makeCorpus(seed: number) {
  const r = rng(seed)
  const alpha = ALPHABETS[Math.floor(r() * ALPHABETS.length)]!
  // by code point, so an astral character is picked whole rather than as half a
  // surrogate pair
  const chars = Array.from(alpha)
  const nTerms = 1 + Math.floor(r() * 60)
  const terms = new Set<string>()
  for (let i = 0; i < nTerms; i++) {
    const len = 1 + Math.floor(r() * 6)
    let t = ''
    for (let j = 0; j < len; j++) {
      t += chars[Math.floor(r() * chars.length)]!
    }
    terms.add(t)
  }
  const sorted = [...terms].toSorted(compareCodePoints)
  const lines = sorted.map((t, i) => {
    const n = 1 + Math.floor(r() * 5)
    const recs = Array.from({ length: n }, (_, j) => `r${i}_${j},${j + 1}`)
    return `${t} ${recs.join(' ')}`
  })
  return { lines, sorted, prefixSize: 1 + Math.floor(r() * 5) }
}

// like makeIxx in ixixx: one entry per prefix, space-padded to a fixed width,
// addressing the first record that carries it. the prefix size varies per
// corpus so a query is sometimes shorter than the prefix, sometimes longer, and
// sometimes exactly the padded term
function makeIxx(lines: string[], prefixSize: number) {
  const out: string[] = []
  let pos = 0
  let last = ''
  for (const line of lines) {
    const prefix = line
      .split(' ')[0]!
      .slice(0, prefixSize)
      .padEnd(prefixSize, ' ')
    if (prefix !== last) {
      out.push(
        `${prefix}${pos.toString(16).toUpperCase().padStart(ADDRESS_SIZE, '0')}`,
      )
      last = prefix
    }
    pos += Buffer.byteLength(line) + 1
  }
  return out.join('\n') + '\n'
}

// the answer with no index involved: read every line, keep the records of the
// ones whose term matches, deduplicated and capped the way search documents
function reference(lines: string[], word: string, maxResults: number) {
  const hits = new Map<string, [string, string]>()
  for (const line of lines) {
    const sp = line.indexOf(' ')
    const term = sp === -1 ? line : line.slice(0, sp)
    if (!term.startsWith(word)) {
      continue
    }
    for (const field of line.slice(sp + 1).split(' ')) {
      if (!field) {
        continue
      }
      const rec = field.includes(',')
        ? field.slice(0, field.indexOf(','))
        : field
      if (!hits.has(rec) && hits.size < maxResults) {
        hits.set(rec, [term, rec])
      }
    }
    if (hits.size >= maxResults) {
      break
    }
  }
  return [...hits.values()]
}

describe('search against a brute-force scan of the whole ix', () => {
  it('agrees on random corpora, for every prefix of every term', async () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'trix-fuzz-'))
    for (let seed = 1; seed <= 50; seed++) {
      const { lines, sorted, prefixSize } = makeCorpus(seed)
      const ixPath = path.join(dir, `${seed}.ix`)
      const ixxPath = path.join(dir, `${seed}.ixx`)
      // every third corpus ends without a trailing newline, which is the shape
      // that decides whether the last record is read at all
      writeFileSync(ixPath, lines.join('\n') + (seed % 3 === 0 ? '' : '\n'))
      writeFileSync(ixxPath, makeIxx(lines, prefixSize))

      const queries = new Set<string>()
      for (const t of sorted) {
        // cut on code points, so a query never ends on half a surrogate pair
        const cps = Array.from(t)
        for (let i = 0; i < cps.length; i++) {
          queries.add(cps.slice(0, i + 1).join(''))
        }
      }
      // and one that matches nothing and sorts past everything
      queries.add('zzzz')

      for (const q of queries) {
        for (const maxResults of [1, 3, 20, 1000]) {
          const trix = new Trix(
            new LocalFile(ixxPath),
            new LocalFile(ixPath),
            maxResults,
          )
          const got = await trix.search(q)
          expect({ seed, q, maxResults, got }).toEqual({
            seed,
            q,
            maxResults,
            got: reference(lines, q, maxResults),
          })
        }
      }
    }
  }, 600_000)
})
