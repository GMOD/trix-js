import type { GenericFilehandle } from 'generic-filehandle'

const trixPrefixSize = 5

// Define this object with .ixx and .ix files.
// Then use the trixSearch() function to search for a word.
export default class Trix {
  private index: Promise<Map<string, number>>
  private ixFile: GenericFilehandle
  maxResults: number

  /**
   * @param ixxFile [anyFile] the second-level trix index file produced by ixIxx.
   * @param ixFile [anyFile] the first-level trix index file produced by ixIxx.
   * @param maxResults [number] the maximum number of results to return. Default is set to 20.
   */
  constructor(
    ixxFile: GenericFilehandle,
    ixFile: GenericFilehandle,
    maxResults = 20,
  ) {
    console.log('t1')
    this.index = this._parseIxx(ixxFile)
    this.ixFile = ixFile
    this.maxResults = maxResults
  }

  /**
   * Search trix for the given searchWord(s). Return up to {this.maxResults} results.
   * This method matches each index prefix against each searchWord. It does not do fuzzy matching.
   *
   * @param searchString [string] term(s) separated by spaces to search for id(s).
   * @returns results [Array<string>] where each string is a corresponding itemId.
   */
  async search(searchString: string) {
    // If there is one search word, store results in resultArr.
    let resultArr: Array<string[]> = []

    const searchWords = searchString.split(' ')

    // Loop for each word in searchWords.  If there are more than one
    // searchWords, use resultSet and only take the matching terms that are
    // also in initialSet.  Otherwise, just iterate once and add words to
    // resultArr.
    for (let w = 0; w < searchWords.length; w++) {
      let searchWord = searchWords[w].toLowerCase()
      let done = false
      let { buffer, seekPosEnd } = await this._getBuffer(searchWord)
      console.log({ buffer: buffer.toString() })

      while (!done) {
        let foundSomething = false
        const lines = buffer
          .toString()
          .split('\n')
          .filter(f => !!f)

        const hits = lines
          .filter(line => {
            const word = line.split(' ')[0]
            const match = word.startsWith(searchString)
            console.log({ word, match })
            if (!foundSomething && match) {
              foundSomething = true
            } else if (foundSomething && !match) {
              done = true
            } else if (word > searchString) {
              done = true
            }
            return match
          })
          .map(line => {
            const [term, ...parts] = line.split(' ')
            return parts.map(elt => [term, elt.split(',')[0]])
          })
          .flat() as [string, string][]

        resultArr = resultArr.concat(hits)

        if (resultArr.length >= this.maxResults || done) {
          break
        } else {
          const len = 65536
          const res = await this.ixFile.read(
            Buffer.alloc(len),
            0,
            len,
            seekPosEnd,
          )
          buffer = Buffer.concat([buffer, res.buffer])
        }
      }
    }

    return [...resultArr].slice(0, this.maxResults)
  }

  // Private Methods:

  /**
   * Seek ahead to the correct position in the .ix file,
   * then load that chunk of .ix into a buffer.
   *
   * @param searchWord [string]
   * @returns a Buffer holding the sections we want to search.
   */
  private async _getBuffer(searchWord: string) {
    // Get position to seek to in .ix file from indexes.
    let seekPosStart = 0
    let seekPosEnd = -1
    const indexes = await this.index
    for (let [key, value] of indexes) {
      let trimmedKey = key.slice(0, searchWord.length)
      console.log({
        key,
        value,
        trimmedKey,
        searchWord,
        r: trimmedKey > searchWord,
      })
      if (trimmedKey >= searchWord) {
        // We reached the end pos in the file.
        break
      } else {
        seekPosStart = value
        seekPosEnd = value + 65536
      }
    }

    console.log({ seekPosStart, seekPosEnd })

    // Return the buffer and its end position in the file.
    const len = seekPosEnd - seekPosStart
    const res = await this.ixFile.read(Buffer.alloc(len), 0, len, seekPosStart)
    return {
      ...res,
      seekPosEnd,
    }
  }

  /**
   * Parses ixx file and constructs a map of {word: ixFileLocation}
   *
   * @param ixxFile [anyFile] second level index that is produced by ixIxx.
   * @returns a ParsedIxx map.
   */
  private async _parseIxx(ixxFile: GenericFilehandle) {
    const file = (await ixxFile.readFile('utf8')) as string
    return new Map(
      file
        .split('\n')
        .filter(f => !!f)
        .map(line => {
          const prefix = line.substr(0, trixPrefixSize)
          const posStr = line.substr(trixPrefixSize)
          const pos = Number.parseInt(posStr, 16)
          return [prefix, pos]
        }),
    )
  }
}
