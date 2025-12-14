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

  constructor(
    public ixxFile: GenericFilehandle,
    public ixFile: GenericFilehandle,
    public maxResults = 20,
  ) {}

  async search(searchString: string, opts?: { signal?: AbortSignal }) {
    let resultArr = [] as [string, string][]
    const searchWords = searchString.split(' ')
    const firstWord = searchWords[0]

    // validate that we have a non-empty search term
    if (firstWord) {
      const searchWord = firstWord.toLowerCase()
      const res = await this.getBuffer(searchWord, opts)

      if (res) {
        let { end, buffer } = res
        let done = false
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        while (!done) {
          const str = this.decoder.decode(buffer)

          // slice to lastIndexOf('\n') to make sure we get complete records
          // since the buffer fetch could get halfway into a record
          const lines = str
            .slice(0, str.lastIndexOf('\n'))
            .split('\n')
            .filter(f => f)

          const hits2 = [] as string[]
          for (const line of lines) {
            const word = line.split(' ')[0]

            if (word.startsWith(searchWord)) {
              hits2.push(line)
            } else if (word > searchWord) {
              // we are done scanning if we are lexicographically greater than
              // the search string
              done = true
            }
          }
          const hits = hits2.flatMap(line => {
            const [term, ...parts] = line.split(' ')
            return parts
              .filter(elt => elt)
              .map(elt => [term, elt.split(',')[0]] as [string, string])
          })

          resultArr = resultArr.concat(hits)

          // if we are done or have filled up maxResults, break
          if (done || resultArr.length >= this.maxResults) {
            break
          }

          // fetch more data
          const res2 = await this.ixFile.read(CHUNK_SIZE, end, opts)
          if (res2.length === 0) {
            break
          }
          buffer = concatUint8Array([buffer, res2])
          end += CHUNK_SIZE
        }
      }
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
      .filter(f => f)
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
    let start = 0
    let end = CHUNK_SIZE
    const indexes = await this.getIndex(opts)
    for (const [key, value] of indexes) {
      const trimmedKey = key.slice(0, searchWord.length)
      if (trimmedKey < searchWord) {
        start = value
        end = value + CHUNK_SIZE
      }
    }

    const buffer = await this.ixFile.read(end - start, start, opts)
    return { buffer, end }
  }
}
