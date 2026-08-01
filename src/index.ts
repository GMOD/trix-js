import { compareCodePoints } from './compare-code-points.ts'
import { LineBuffer } from './line-buffer.ts'

import type { GenericFilehandle } from 'generic-filehandle2'

// one search hit: the indexed word that matched and the record it points to
export type TrixHit = [term: string, result: string]

interface ReadOpts {
  signal?: AbortSignal
}

// an ixx entry: a term prefix and the byte address of the first ix record
// carrying it
interface Checkpoint {
  prefix: string
  address: number
}

const CHUNK_SIZE = 65536

// number of hex characters used for the address in ixixx, see
// https://github.com/GMOD/ixixx-js/blob/master/src/index.ts#L182
const ADDRESS_SIZE = 10

// an ixx line is a fixed-width term prefix followed by the hex address
function parseIxxLine(line: string): Checkpoint {
  const addressAt = line.length - ADDRESS_SIZE
  return {
    prefix: line.slice(0, addressAt),
    address: Number.parseInt(line.slice(addressAt), 16),
  }
}

// the fields after an ix record's term are `record,hitCount`; the count is unused
function recordOf(field: string) {
  const comma = field.indexOf(',')
  return comma === -1 ? field : field.slice(0, comma)
}

export default class Trix {
  // promise (not resolved value) so concurrent callers share one in-flight
  // load, and one caller's signal can't abort another's await
  private indexCache?: Promise<Checkpoint[]>

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
      .then(file => file.split('\n').filter(Boolean).map(parseIxxLine))
      .catch((error: unknown) => {
        // clear so the next caller retries instead of getting a stuck rejection
        this.indexCache = undefined
        throw error
      })
    return this.indexCache
  }

  async search(searchString: string, opts?: ReadOpts) {
    // only the first word is searched; undefined when the query is all whitespace
    const firstWord = /\S+/.exec(searchString)?.[0]
    // keyed by record so several terms pointing at the same record collapse
    // before they count against maxResults; insertion order keeps the first
    // term that matched each record
    const hits = new Map<string, TrixHit>()
    if (firstWord) {
      const searchWord = firstWord.toLowerCase()
      const { start, firstLength } = await this.getReadRange(searchWord)
      for await (const line of this.readRecords(start, firstLength, opts)) {
        const pastRange = this.scanLine(line, searchWord, hits)
        if (pastRange || hits.size >= this.maxResults) {
          break
        }
      }
    }
    return [...hits.values()]
  }

  // yields whole ix records from the checkpoint at byte `start`. the read
  // begins one byte earlier, so the first line is either empty (`start` really
  // is a line start) or the tail of the record `start` fell inside, and is
  // dropped either way. ixixx before the byte-offset fix wrote character counts
  // as addresses, which land mid-record once the ix contains multibyte text,
  // and a partial record can look lexicographically past the search term and
  // end the scan before it begins
  private async *readRecords(
    start: number,
    firstLength: number,
    opts?: ReadOpts,
  ) {
    const probed = start > 0
    const probe = probed ? 1 : 0
    const lines = this.readLines(start - probe, firstLength + probe, opts)
    if (probed) {
      // the extra byte makes this first line either empty or a record tail,
      // never a record the search needs
      await lines.next()
    }
    yield* lines
  }

  // yields newline-delimited lines of the ix file starting at byte `start`,
  // owning the chunked reads and EOF detection so the search loop only deals in
  // whole lines
  private async *readLines(
    start: number,
    firstLength: number,
    opts?: ReadOpts,
  ) {
    const buffer = new LineBuffer()
    let pos = start
    let length = firstLength
    let eof = false

    while (!eof) {
      const data = await this.ixFile.read(length, pos, opts)
      pos += data.length
      // a short read (including empty) means EOF — stop before issuing another
      // request from a position past the file's end
      eof = data.length < length
      length = CHUNK_SIZE
      buffer.push(data)
      yield* buffer.takeLines()
    }

    const lastLine = buffer.takeRest()
    if (lastLine) {
      yield lastLine
    }
  }

  // adds hits from `line` for records not already found; returns true when the
  // caller should stop scanning (term is past the searchable range)
  private scanLine(
    line: string,
    searchWord: string,
    hits: Map<string, TrixHit>,
  ) {
    let stop = false
    const [term = '', ...rest] = line.split(' ')
    if (term.startsWith(searchWord)) {
      for (const part of rest) {
        if (hits.size >= this.maxResults) {
          break
        }
        if (part) {
          const record = recordOf(part)
          if (!hits.has(record)) {
            hits.set(record, [term, record])
          }
        }
      }
    } else if (compareCodePoints(term, searchWord) > 0) {
      // past the range where matches could exist. the comparison follows the
      // ix's utf-8 byte order, not javascript's utf-16 order, so an astral
      // term does not look past a 0xE000-0xFFFF search word and stop early
      stop = true
    }
    return stop
  }

  // resolves the ixx checkpoint at/just-before `searchWord` into the byte range
  // to start reading the ix from. `start` is always a valid checkpoint (or 0),
  // so the first read is never strictly past EOF; `firstLength` reaches at least
  // the next checkpoint so the whole candidate block usually arrives in one read
  private async getReadRange(searchWord: string) {
    const checkpoints = await this.getIndex()
    // -1 when the word sorts before every checkpoint, and checkpoints[-1] is
    // undefined, so both fall back to the start of the file
    const at = checkpoints.findLastIndex(
      ({ prefix }) => compareCodePoints(prefix, searchWord) <= 0,
    )
    const start = checkpoints[at]?.address ?? 0
    const nextStart = checkpoints[at + 1]?.address ?? start
    const firstLength = Math.max(nextStart - start, CHUNK_SIZE)
    return { start, firstLength }
  }
}
