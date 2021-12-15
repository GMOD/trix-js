import type { GenericFilehandle } from 'generic-filehandle'

const TRIX_PREFIX_SIZE = 5

const CHUNK_SIZE = 65536

// Define this object with .ixx and .ix files.
// Then use the trixSearch() function to search for a word.
export default class Trix {
  private ixFile: GenericFilehandle
  private ixxFile: GenericFilehandle
  maxResults: number

  constructor(
    ixxFile: GenericFilehandle,
    ixFile: GenericFilehandle,
    maxResults = 20,
  ) {
    this.ixFile = ixFile
    this.ixxFile = ixxFile
    this.maxResults = maxResults
  }

  async search(searchString: string, opts?: { signal?: AbortSignal }) {
    let resultArr = [] as string[][]
    const searchWords = searchString.split(' ')

    // we only search one word at a time
    const searchWord = searchWords[0].toLowerCase()
    const res = await this._getBuffer(searchWord, opts)
    if (!res) {
      return []
    }

    let { seekPosEnd, buffer } = res
    let done = false
    while (!done) {
      let foundSomething = false
      const str = buffer.toString()

      // slice to lastIndexOf('\n') to make sure we get complete records
      // since the buffer fetch could get halfway into a record
      const lines = str
        .slice(0, str.lastIndexOf('\n'))
        .split('\n')
        .filter(f => !!f)

      const hits = lines
        .filter(line => {
          const word = line.split(' ')[0]
          const match = word.startsWith(searchString)
          if (!foundSomething && match) {
            foundSomething = true
          }

          //we are done scanning if we are lexicographically greater than the
          //search string
          if (word > searchString) {
            done = true
          }
          return match
        })
        .map(line => {
          const [term, ...parts] = line.split(' ')
          return parts.map(elt => [term, elt.split(',')[0]])
        })
        .flat() as [string, string][]

      // if we are not done, and we haven't filled up maxResults with hits yet,
      // then refetch
      if (resultArr.length + hits.length < this.maxResults && !done) {
        const res = await this.ixFile.read(
          Buffer.alloc(CHUNK_SIZE),
          0,
          CHUNK_SIZE,
          seekPosEnd,
          opts,
        )

        //early break if empty response
        if (!res.bytesRead) {
          resultArr = resultArr.concat(hits)
          break
        }
        buffer = Buffer.concat([buffer, res.buffer])
        seekPosEnd += CHUNK_SIZE
      }

      // if we have filled up the hits, or we are detected to be done via the
      // filtering, then return
      else if (resultArr.length + hits.length >= this.maxResults || done) {
        resultArr = resultArr.concat(hits)
        break
      }
    }

    return [...resultArr].slice(0, this.maxResults)
  }

  private getIndex(opts?: { signal?: AbortSignal }) {
    return this._parseIxx(this.ixxFile, opts)
  }

  private async _getBuffer(
    searchWord: string,
    opts?: { signal?: AbortSignal },
  ) {
    let seekPosStart = 0
    let seekPosEnd = -1
    const indexes = await this.getIndex(opts)
    for (const [key, value] of indexes) {
      const trimmedKey = key.slice(0, searchWord.length)
      if (trimmedKey >= searchWord) {
        break
      } else {
        seekPosStart = value
        seekPosEnd = value + 65536
      }
    }

    // Return the buffer and its end position in the file.
    const len = seekPosEnd - seekPosStart
    if (len < 0) {
      return undefined
    }
    const res = await this.ixFile.read(
      Buffer.alloc(len),
      0,
      len,
      seekPosStart,
      opts,
    )
    return {
      ...res,
      seekPosEnd,
    }
  }

  private async _parseIxx(
    ixxFile: GenericFilehandle,
    opts?: { signal?: AbortSignal },
  ) {
    const file = (await ixxFile.readFile({
      encoding: 'utf8',
      ...opts,
    })) as string
    return new Map(
      file
        .split('\n')
        .filter(f => !!f)
        .map(line => {
          const prefix = line.slice(0, TRIX_PREFIX_SIZE)
          const posStr = line.slice(TRIX_PREFIX_SIZE)
          const pos = Number.parseInt(posStr, 16)
          return [prefix, pos]
        }),
    )
  }
}
