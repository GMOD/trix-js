import { dedupe } from './dedupe.ts'

import type { GenericFilehandle } from 'generic-filehandle2'

const CHUNK_SIZE = 65536

// number of hex characters used for the address in ixixx, see
// https://github.com/GMOD/ixixx-js/blob/master/src/index.ts#L182
const ADDRESS_SIZE = 10

export default class Trix {
  // promises (not resolved values) so concurrent callers share one in-flight
  // load, and one caller's signal can't abort another's await
  private indexCache?: Promise<readonly (readonly [string, number])[]>
  private ixFileSize?: Promise<number | undefined>

  constructor(
    public ixxFile: GenericFilehandle,
    public ixFile: GenericFilehandle,
    public maxResults = 20,
  ) {}

  private getIxFileSize() {
    this.ixFileSize ??= this.ixFile
      .stat()
      .then(s => s.size)
      .catch(() => undefined)
    return this.ixFileSize
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
    const { fileSize } = initial
    const results: [string, string][] = []
    let buffer = decoder.decode(initial.buffer, { stream: true })
    let end = initial.end
    let stop = false

    while (!stop && results.length < this.maxResults) {
      const nl = buffer.indexOf('\n')
      if (nl === -1) {
        const remaining =
          fileSize === undefined
            ? CHUNK_SIZE
            : Math.min(CHUNK_SIZE, fileSize - end)
        const next =
          remaining > 0
            ? await this.ixFile.read(remaining, end, opts)
            : undefined
        if (next && next.length > 0) {
          end += next.length
          buffer += decoder.decode(next, { stream: true })
        } else {
          stop = true
        }
      } else {
        const line = buffer.slice(0, nl)
        buffer = buffer.slice(nl + 1)
        if (line) {
          const parts = line.split(' ')
          const term = parts[0]!
          if (term.startsWith(searchWord)) {
            for (
              let i = 1;
              i < parts.length && results.length < this.maxResults;
              i++
            ) {
              const part = parts[i]!
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
      }
    }

    return dedupe(results, elt => elt[1]).slice(0, this.maxResults)
  }

  private async getBuffer(searchWord: string, opts?: { signal?: AbortSignal }) {
    const [indexes, fileSize] = await Promise.all([
      this.getIndex(),
      this.getIxFileSize(),
    ])
    const bestIndex = indexes.findLastIndex(([key]) => key <= searchWord)

    const start = bestIndex === -1 ? 0 : indexes[bestIndex]![1]
    const nextEntryStart = indexes[bestIndex + 1]?.[1]
    const wantedEnd = Math.max(nextEntryStart ?? 0, start + CHUNK_SIZE)
    const targetEnd =
      fileSize === undefined ? wantedEnd : Math.min(wantedEnd, fileSize)
    const buffer = await this.ixFile.read(targetEnd - start, start, opts)
    return { buffer, end: start + buffer.length, fileSize }
  }
}
