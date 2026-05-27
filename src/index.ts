import { dedupe } from './dedupe.ts'

import type { GenericFilehandle } from 'generic-filehandle2'

const CHUNK_SIZE = 65536

// number of hex characters used for the address in ixixx, see
// https://github.com/GMOD/ixixx-js/blob/master/src/index.ts#L182
const ADDRESS_SIZE = 10

export default class Trix {
  // promise (not resolved value) so concurrent callers share one in-flight
  // load, and one caller's signal can't abort another's await
  private indexCache?: Promise<readonly (readonly [string, number])[]>

  constructor(
    public ixxFile: GenericFilehandle,
    public ixFile: GenericFilehandle,
    public maxResults = 20,
  ) {}

  private getIndex() {
    this.indexCache ??= this.ixxFile
      .readFile({ encoding: 'utf8' })
      .then(file =>
        file
          .split('\n')
          .filter(Boolean)
          .map(line => {
            const p = line.length - ADDRESS_SIZE
            return [
              line.slice(0, p),
              Number.parseInt(line.slice(p), 16),
            ] as const
          }),
      )
      .catch((error: unknown) => {
        // clear so the next caller retries instead of getting a stuck rejection
        this.indexCache = undefined
        throw error
      })
    return this.indexCache
  }

  async search(searchString: string, opts?: { signal?: AbortSignal }) {
    const firstWord = searchString.split(/\s+/)[0]
    if (!firstWord) {
      return []
    }
    const searchWord = firstWord.toLowerCase()

    // stream:true lets the decoder hold back trailing incomplete UTF-8 bytes
    // so a multibyte char split across a chunk boundary resolves correctly on
    // the next chunk
    const decoder = new TextDecoder('utf8')
    const initial = await this.getBuffer(searchWord, opts)
    const results: [string, string][] = []
    let buffer = decoder.decode(initial.buffer, { stream: true })
    let end = initial.end
    let atEof = initial.atEof
    let stop = false

    while (!stop && results.length < this.maxResults) {
      const nl = buffer.indexOf('\n')
      if (nl === -1) {
        if (atEof) {
          stop = true
        } else {
          const data = await this.ixFile.read(CHUNK_SIZE, end, opts)
          end += data.length
          buffer += decoder.decode(data, { stream: true })
          // short read (including empty) means we reached EOF — stop without
          // issuing another request from a position past the file's end
          if (data.length < CHUNK_SIZE) {
            atEof = true
          }
        }
      } else {
        const line = buffer.slice(0, nl)
        buffer = buffer.slice(nl + 1)
        stop = this.scanLine(line, searchWord, results)
      }
    }

    return dedupe(results, elt => elt[1])
  }

  // appends matching hits from `line` to `results`; returns true when the
  // caller should stop scanning (term is past the searchable range)
  private scanLine(
    line: string,
    searchWord: string,
    results: [string, string][],
  ) {
    let stop = false
    if (line) {
      const [term = '', ...rest] = line.split(' ')
      if (term.startsWith(searchWord)) {
        for (const part of rest) {
          if (results.length >= this.maxResults) {
            break
          }
          if (part) {
            const commaIdx = part.indexOf(',')
            results.push([
              term,
              commaIdx === -1 ? part : part.slice(0, commaIdx),
            ])
          }
        }
      } else if (term > searchWord) {
        // past the lexicographic range where matches could exist
        stop = true
      }
    }
    return stop
  }

  private async getBuffer(searchWord: string, opts?: { signal?: AbortSignal }) {
    const indexes = await this.getIndex()
    const bestIndex = indexes.findLastIndex(([key]) => key <= searchWord)

    // `start` is always a valid ixx checkpoint (or 0), so the range request is
    // never strictly past EOF. `wantedEnd` may exceed file size — that's a
    // server-clipped over-read, not a strictly-past-EOF request, and is the
    // signal we use to detect EOF below.
    const start = bestIndex === -1 ? 0 : indexes[bestIndex]![1]
    const nextEntryStart = indexes[bestIndex + 1]?.[1]
    const wantedEnd = Math.max(nextEntryStart ?? 0, start + CHUNK_SIZE)
    const length = wantedEnd - start
    const buffer = await this.ixFile.read(length, start, opts)
    return {
      buffer,
      end: start + buffer.length,
      atEof: buffer.length < length,
    }
  }
}
