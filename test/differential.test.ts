import { writeFileSync } from 'node:fs'
import path from 'node:path'

import { LocalFile } from 'generic-filehandle2'
import { describe, expect, it } from 'vitest'

import { compareCodePoints } from '../src/compare-code-points.ts'
import Trix from '../src/index.ts'
import { makeIxx, tempDir } from './make-ixx.ts'

// matches src/index.ts
const WORD_LIMIT = 200

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
  // records drawn from a shared pool, so terms share records and words of a
  // query overlap; the occasional term with many records cuts a word off
  const lines = sorted.map(t => {
    const n = r() < 0.1 ? 150 + Math.floor(r() * 150) : 1 + Math.floor(r() * 5)
    const recs = Array.from(
      { length: n },
      (_, j) => `r${Math.floor(r() * 1000)},${j + 1}`,
    )
    return `${t} ${recs.join(' ')}`
  })
  return { lines, sorted, prefixSize: 1 + Math.floor(r() * 5) }
}

// the answer with no index involved: every record each word finds, in ix
// order. the words found whole narrow the answer and the smallest seeds it; a
// word that reaches the limit is cut off and rules nothing out, and when every
// word is, the first answers alone
function recordsOf(lines: string[], word: string) {
  const hits = new Map<string, [string, string]>()
  for (const line of lines) {
    const [term = '', ...fields] = line.split(' ')
    if (term.startsWith(word)) {
      for (const field of fields.filter(Boolean)) {
        const rec = field.split(',')[0]!
        if (!hits.has(rec)) {
          hits.set(rec, [term, rec])
        }
      }
    }
  }
  return [...hits.values()]
}

function reference(lines: string[], query: string, maxResults: number) {
  const words = [...new Set(query.split(' '))]
  const limit = words.length > 1 ? Math.max(maxResults, WORD_LIMIT) : maxResults
  const found = words.map(word => recordsOf(lines, word))
  const [seed = found[0]!, ...narrowing] = found
    .filter(hits => hits.length < limit)
    .toSorted((a, b) => a.length - b.length)
  return seed
    .filter(([, rec]) =>
      narrowing.every(hits => hits.some(([, r]) => r === rec)),
    )
    .slice(0, maxResults)
}

describe('search against a brute-force scan of the whole ix', () => {
  const dir = tempDir()

  it('agrees on random corpora, for every prefix of every term and pairs of them', async () => {
    for (let seed = 1; seed <= 50; seed++) {
      const r = rng(seed + 1000)
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
      const words = [...queries]
      const pick = () => words[Math.floor(r() * words.length)]!
      for (let i = 0; i < 40; i++) {
        queries.add(`${pick()} ${pick()}`)
      }
      for (let i = 0; i < 10; i++) {
        queries.add(`${pick()} ${pick()} ${pick()}`)
      }

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
