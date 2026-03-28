import { dedupe } from './dedupe.ts'
import { concatUint8Array } from './util.ts'

import type { GenericFilehandle } from 'generic-filehandle2'

const CHUNK_SIZE = 65536

// this is the number of hex characters to use for the address in ixixx, see
// https://github.com/GMOD/ixixx-js/blob/master/src/index.ts#L182
const ADDRESS_SIZE = 10

export default class Trix {
  private decoder = new TextDecoder('utf8')
  private indexCache?: readonly (readonly [string, number])[]
  private ixFileSize?: number

  constructor(
    public ixxFile: GenericFilehandle,
    public ixFile: GenericFilehandle,
    public maxResults = 20,
  ) {}

  private async getIxFileSize(opts?: { signal?: AbortSignal }) {
    if (this.ixFileSize !== undefined) {
      return this.ixFileSize
    }
    try {
      // @ts-expect-error - stat is not in the filehandle interface but may exist at runtime
      const stat = await this.ixFile.stat(opts)
      this.ixFileSize = stat.size
      return this.ixFileSize
    } catch {
      return undefined
    }
  }

  async search(searchString: string, opts?: { signal?: AbortSignal }) {
    const searchWords = searchString.split(/\s+/)
    const firstWord = searchWords[0]

    // validate that we have a non-empty search term
    if (!firstWord) {
      return []
    }

    const searchWord = firstWord.toLowerCase()
    const res = await this.getBuffer(searchWord, opts)

    let { end, buffer } = res
    const { fileSize } = res
    let resultArr = [] as [string, string][]
    let done = false

    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    while (!done) {
      const str = this.decoder.decode(buffer, { stream: true })

      // slice to lastIndexOf('\n') to make sure we get complete records
      // since the buffer fetch could get halfway into a record
      const lastNewline = str.lastIndexOf('\n')
      if (lastNewline === -1) {
        // if no newline, we need more data unless we're at EOF
        if (fileSize !== undefined && end >= fileSize) {
          done = true
        }
      } else {
        const lines = str.slice(0, lastNewline).split('\n').filter(Boolean)

        for (const line of lines) {
          const word = line.split(' ')[0]!

          if (word.startsWith(searchWord)) {
            const [term, ...parts] = line.split(' ')
            const hits = parts
              .filter(Boolean)
              .map(elt => [term, elt.split(',')[0]] as [string, string])
            resultArr = resultArr.concat(hits)
          } else if (word > searchWord) {
            // we are done scanning if we are lexicographically greater than
            // the search string
            done = true
            break
          }
        }
      }

      // if we are done or have filled up maxResults, break
      if (done || resultArr.length >= this.maxResults) {
        break
      }

      // avoid reading past end of file
      if (fileSize !== undefined && end >= fileSize) {
        break
      }

      // fetch more data, clamping to file size if known
      let bytesToRead = CHUNK_SIZE
      if (fileSize !== undefined) {
        bytesToRead = Math.min(CHUNK_SIZE, fileSize - end)
      }

      if (bytesToRead <= 0) {
        break
      }

      const res2 = await this.ixFile.read(bytesToRead, end, opts)
      if (res2.length === 0) {
        break
      }
      buffer = concatUint8Array([buffer, res2])
      end += res2.length
    }

    // de-duplicate results based on the detail column (resultArr[1])
    return dedupe(resultArr, elt => elt[1]).slice(0, this.maxResults)
  }

  private async getIndex(opts?: { signal?: AbortSignal }) {
    if (this.indexCache) {
      return this.indexCache
    }
    const file = await this.ixxFile.readFile({
      encoding: 'utf8',
      ...opts,
    })
    const result = file
      .split('\n')
      .filter(Boolean)
      .map(line => {
        const p = line.length - ADDRESS_SIZE
        const prefix = line.slice(0, p)
        const posStr = line.slice(p)
        const pos = Number.parseInt(posStr, 16)
        return [prefix, pos] as const
      })
    this.indexCache = result
    return result
  }

  private async getBuffer(searchWord: string, opts?: { signal?: AbortSignal }) {
    const indexes = await this.getIndex(opts)

    // Binary search for the largest key <= searchWord
    let low = 0
    let high = indexes.length - 1
    let bestIndex = -1

    while (low <= high) {
      const mid = Math.floor((low + high) / 2)
      if (indexes[mid]![0] <= searchWord) {
        bestIndex = mid
        low = mid + 1
      } else {
        high = mid - 1
      }
    }

    let start = 0
    let end = CHUNK_SIZE

    if (bestIndex !== -1) {
      start = indexes[bestIndex]![1]
      // The end should be the start of the NEXT index entry to cover the full range
      // where the word could exist. If it's the last index, read until EOF or start+CHUNK_SIZE.
      if (bestIndex + 1 < indexes.length) {
        end = indexes[bestIndex + 1]![1]
      } else {
        const fileSize = await this.getIxFileSize(opts)
        end = fileSize ?? start + CHUNK_SIZE
      }
    }

    // Ensure we read at least one CHUNK_SIZE to handle cases where index entries are very close
    // or to ensure we have enough data to start with.
    if (end - start < CHUNK_SIZE) {
      const fileSize = await this.getIxFileSize(opts)
      end =
        fileSize === undefined
          ? start + CHUNK_SIZE
          : Math.min(start + CHUNK_SIZE, fileSize)
    }

    const buffer = await this.ixFile.read(end - start, start, opts)
    return { buffer, end, fileSize: await this.getIxFileSize(opts) }
  }
}
