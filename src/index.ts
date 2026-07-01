import { dedupe } from './dedupe.ts'

import type { GenericFilehandle } from 'generic-filehandle2'

// one search hit: the indexed word that matched and the record it points to
export type TrixHit = [term: string, result: string]

const CHUNK_SIZE = 65536

// number of hex characters used for the address in ixixx, see
// https://github.com/GMOD/ixixx-js/blob/master/src/index.ts#L182
const ADDRESS_SIZE = 10

export default class Trix {
  // promise (not resolved value) so concurrent callers share one in-flight
  // load, and one caller's signal can't abort another's await
  private indexCache?: Promise<readonly (readonly [string, number])[]>

  public ixxFile: GenericFilehandle
  public ixFile: GenericFilehandle
  public maxResults: number

  constructor(
    ixxFile: GenericFilehandle,
    ixFile: GenericFilehandle,
    maxResults = 20,
  ) {
    this.ixxFile = ixxFile
    this.ixFile = ixFile
    this.maxResults = maxResults
  }

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
    const firstWord = searchString.trim().split(/\s+/)[0]
    const results: TrixHit[] = []
    if (firstWord) {
      const searchWord = firstWord.toLowerCase()
      const { start, firstLength } = await this.getReadRange(searchWord)
      for await (const line of this.readLines(start, firstLength, opts)) {
        const pastRange = this.scanLine(line, searchWord, results)
        if (pastRange || results.length >= this.maxResults) {
          break
        }
      }
    }
    return dedupe(results, elt => elt[1])
  }

  // yields newline-delimited lines of the ix file starting at byte `start`,
  // owning all the chunked reads, UTF-8 stream decoding, and EOF detection so
  // the search loop only deals in whole lines
  private async *readLines(
    start: number,
    firstLength: number,
    opts?: { signal?: AbortSignal },
  ) {
    // stream:true lets the decoder hold back trailing incomplete UTF-8 bytes so
    // a multibyte char split across a chunk boundary resolves on the next chunk
    const decoder = new TextDecoder('utf8')
    let pos = start
    let length = firstLength
    let buffer = ''
    let eof = false
    let done = false

    while (!done) {
      const nl = buffer.indexOf('\n')
      if (nl !== -1) {
        yield buffer.slice(0, nl)
        buffer = buffer.slice(nl + 1)
      } else if (eof) {
        // flush any bytes the decoder held back, then emit a final record that
        // had no trailing newline
        buffer += decoder.decode()
        if (buffer) {
          yield buffer
        }
        done = true
      } else {
        const data = await this.ixFile.read(length, pos, opts)
        pos += data.length
        buffer += decoder.decode(data, { stream: true })
        // a short read (including empty) means EOF — stop before issuing
        // another request from a position past the file's end
        eof = data.length < length
        length = CHUNK_SIZE
      }
    }
  }

  // appends matching hits from `line` to `results`; returns true when the
  // caller should stop scanning (term is past the searchable range)
  private scanLine(
    line: string,
    searchWord: string,
    results: TrixHit[],
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

  // resolves the ixx checkpoint at/just-before `searchWord` into the byte range
  // to start reading the ix from. `start` is always a valid checkpoint (or 0),
  // so the first read is never strictly past EOF; `firstLength` reaches at least
  // the next checkpoint so the whole candidate block usually arrives in one read
  private async getReadRange(searchWord: string) {
    const indexes = await this.getIndex()
    const bestIndex = indexes.findLastIndex(([key]) => key <= searchWord)
    const start = bestIndex === -1 ? 0 : indexes[bestIndex]![1]
    const nextEntryStart = indexes[bestIndex + 1]?.[1]
    const firstLength = Math.max(nextEntryStart ?? 0, start + CHUNK_SIZE) - start
    return { start, firstLength }
  }
}
