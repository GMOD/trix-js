import type { GenericFilehandle } from 'generic-filehandle2'
import { concatUint8Array } from './util'

const CHUNK_SIZE = 65536

// this is the number of hex characters to use for the address in ixixx, see
// https://github.com/GMOD/ixixx-js/blob/master/src/index.ts#L182
const ADDRESS_SIZE = 10

interface SearchHit {
  hitString: string
  hitInfo: string
}

// https://stackoverflow.com/a/9229821/2129219
function uniqBy<T>(a: T[], key: (elt: T) => string) {
  const seen = new Set()
  return a.filter(item => {
    const k = key(item)
    return seen.has(k) ? false : seen.add(k)
  })
}

function bufferToLines(buffer: Uint8Array) {
  const decoder = new TextDecoder('utf8')
  const text = decoder.decode(buffer)
  return text
    .slice(0, text.lastIndexOf('\n'))
    .split('\n')
    .filter(line => !!line)
}

function processLine(line: string, searchWord: string) {
  const word = line.split(' ')[0]
  const match = word.startsWith(searchWord)
  // We are done scanning if we are lexicographically greater than the search
  // string
  const isDone = word.slice(0, searchWord.length) > searchWord
  return { match, isDone }
}

function transformHits(matchingLines: string[]): SearchHit[] {
  return matchingLines.flatMap(line => {
    const [term, ...parts] = line.split(' ')
    return parts.map(elt => ({
      hitString: term,
      hitInfo: elt.split(',')[0],
    }))
  })
}

function processBuffer(buffer: Uint8Array, searchWord: string) {
  const lines = bufferToLines(buffer)
  const matchingLines: string[] = []
  let isDone = false

  for (const line of lines) {
    const { match, isDone: lineIsDone } = processLine(line, searchWord)
    if (lineIsDone) {
      isDone = true
    }
    if (match) {
      matchingLines.push(line)
    }
  }

  return {
    hits: transformHits(matchingLines),
    isDone,
  }
}

export default class Trix {
  private readonly ixxFile: GenericFilehandle
  private readonly ixFile: GenericFilehandle
  private readonly maxResults: number

  constructor(
    ixxFile: GenericFilehandle,
    ixFile: GenericFilehandle,
    maxResults = 20,
  ) {
    this.ixxFile = ixxFile
    this.ixFile = ixFile
    this.maxResults = maxResults
  }

  async search(searchString: string, opts?: { signal?: AbortSignal }) {
    let resultArr = [] as SearchHit[]
    const searchWords = searchString.split(' ')

    // we only search one word at a time
    const searchWord = searchWords[0].toLowerCase()
    const res = await this._getBuffer(searchWord, opts)
    if (!res) {
      return []
    }

    let { end, buffer } = res
    let done = false
    while (!done) {
      const { hits, isDone } = processBuffer(buffer, searchWord)
      done = isDone

      // Check if we need to fetch more data
      if (resultArr.length + hits.length < this.maxResults && !done) {
        const res2 = await this.ixFile.read(CHUNK_SIZE, end, opts)

        // Early break if empty response
        if (res2.length === 0) {
          resultArr = resultArr.concat(hits)
          break
        }

        buffer = concatUint8Array([buffer, res2])
        end += CHUNK_SIZE
      } else {
        // We have enough results or we're done searching
        resultArr = resultArr.concat(hits)
        break
      }
    }

    return uniqBy(resultArr, elt => elt.hitInfo).slice(0, this.maxResults)
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
