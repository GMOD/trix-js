import { dedupe } from './dedupe.ts'
import { concatUint8Array } from './util.ts'

import type { GenericFilehandle } from 'generic-filehandle2'

const CHUNK_SIZE = 65536

// this is the number of hex characters to use for the address in ixixx, see
// https://github.com/GMOD/ixixx-js/blob/master/src/index.ts#L182
const ADDRESS_SIZE = 10

export default class Trix {
  constructor(
    public ixxFile: GenericFilehandle,
    public ixFile: GenericFilehandle,
    public maxResults = 20,
  ) {}

  async search(searchString: string, opts?: { signal?: AbortSignal }) {
    let resultArr = [] as [string, string][]
    const searchWords = searchString.split(' ')

    // we only search one word at a time
    const searchWord = searchWords[0].toLowerCase()
    const res = await this._getBuffer(searchWord, opts)
    if (!res) {
      return []
    }

    let { end, buffer } = res
    let done = false
    const decoder = new TextDecoder('utf8')
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    while (!done) {
      let foundSomething = false
      const str = decoder.decode(buffer)

      // slice to lastIndexOf('\n') to make sure we get complete records
      // since the buffer fetch could get halfway into a record
      const lines = str
        .slice(0, str.lastIndexOf('\n'))
        .split('\n')
        .filter(f => !!f)

      const hits2 = [] as string[]
      for (const line of lines) {
        const word = line.split(' ')[0]
        const match = word.startsWith(searchWord)
        if (!foundSomething && match) {
          foundSomething = true
        }

        // we are done scanning if we are lexicographically greater than the
        // search string
        if (word.slice(0, searchWord.length) > searchWord) {
          done = true
        }
        if (match) {
          hits2.push(line)
        }
      }
      const hits = hits2.flatMap(line => {
        const [term, ...parts] = line.split(' ')
        return parts.map(elt => [term, elt.split(',')[0]] as [string, string])
      })

      // if we are not done, and we haven't filled up maxResults with hits yet,
      // then refetch
      if (resultArr.length + hits.length < this.maxResults && !done) {
        const res2 = await this.ixFile.read(CHUNK_SIZE, end, opts)

        // early break if empty response
        if (res2.length === 0) {
          resultArr = resultArr.concat(hits)
          break
        }
        buffer = concatUint8Array([buffer, res2])
        end += CHUNK_SIZE
      }

      // if we have filled up the hits, or we are detected to be done via the
      // filtering, then return
      else if (resultArr.length + hits.length >= this.maxResults || done) {
        resultArr = resultArr.concat(hits)
        break
      }
    }

    // de-duplicate results based on the detail column (resultArr[1])
    return dedupe(resultArr, elt => elt[1]).slice(0, this.maxResults)
  }

  private async getIndex(opts?: { signal?: AbortSignal }) {
    const file = await this.ixxFile.readFile({
      encoding: 'utf8',
      ...opts,
    })
    return file
      .split('\n')
      .filter(f => !!f)
      .map(line => {
        const p = line.length - ADDRESS_SIZE
        const prefix = line.slice(0, p)
        const posStr = line.slice(p)
        const pos = Number.parseInt(posStr, 16)
        return [prefix, pos] as const
      })
  }

  private async _getBuffer(
    searchWord: string,
    opts?: { signal?: AbortSignal },
  ) {
    let start = 0
    let end = 65536
    const indexes = await this.getIndex(opts)
    for (const [key, value] of indexes) {
      const trimmedKey = key.slice(0, searchWord.length)
      if (trimmedKey < searchWord) {
        start = value
        end = value + 65536
      }
    }

    // Return the buffer and its end position in the file.
    const len = end - start
    if (len < 0) {
      return undefined
    }
    const buffer = await this.ixFile.read(len, start, opts)
    return {
      buffer,
      end,
    }
  }
}
