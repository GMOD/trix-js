import { compareCodePoints } from './compare-code-points.ts'

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

// what the token about to be read means: a line opens with its term, the rest
// of the line is that term's records, and a line whose term did not match is
// skipped without looking at the records at all
type Expect = 'term' | 'record' | 'skip'

// reads start at CHUNK_SIZE and double up to the cap. a search that stops early
// — the usual one, since maxResults is small — pays only the first read, while
// one that has to cross a term carrying megabytes of records still gets past it
// in a handful of round trips rather than hundreds
const CHUNK_SIZE = 65536
const MAX_CHUNK_SIZE = 4 * 1024 * 1024

// number of hex characters used for the address in ixixx, see
// https://github.com/GMOD/ixixx-js/blob/master/src/index.ts#L182
const ADDRESS_SIZE = 10

// an ixx line is a fixed-width term prefix followed by the hex address. ixixx
// right-pads the prefix when the term it came from was shorter than the field,
// and a term never holds a space, so trimming recovers the term itself. left
// padded it sorts below every search word that extends it — `brca1` followed by
// 35 spaces reads as less than `brca1` — and the checkpoint is passed over in
// favour of the one before it, putting the scan at the start of the previous bin
function parseIxxLine(line: string): Checkpoint {
  const addressAt = line.length - ADDRESS_SIZE
  return {
    prefix: line.slice(0, addressAt).trimEnd(),
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
      await this.scan(firstWord.toLowerCase(), hits, opts)
    }
    return [...hits.values()]
  }

  // walks the ix from the checkpoint for `searchWord`, filling `hits` until it
  // holds maxResults or the terms sort past the word. the ix is whitespace
  // delimited — a newline opens a term, spaces separate the records it carries
  // — so the scan reads one token at a time and never holds more than one. an
  // ix has one line per term, so a term shared by 200k features is a single
  // 16mb line: a search wanting twenty records off the front of it stops after
  // the first read instead of assembling the whole line first
  private async scan(
    searchWord: string,
    hits: Map<string, TrixHit>,
    opts?: ReadOpts,
  ) {
    const start = await this.getStart(searchWord)
    // read one byte early, so what precedes the first newline is either nothing
    // or the tail of the record `start` fell inside, and skip it either way.
    // ixixx before the byte-offset fix wrote character counts as addresses,
    // which land mid-record once the ix contains multibyte text, and a partial
    // record can look lexicographically past the search term and end the scan
    // before it begins
    const probed = start > 0
    const decoder = new TextDecoder('utf8')
    let pos = start - (probed ? 1 : 0)
    let length = CHUNK_SIZE
    let expect: Expect = probed ? 'skip' : 'term'
    let term = ''
    // the token straddling the end of the last chunk, never more than one
    let carry = ''
    let eof = false

    while (!eof) {
      const data = await this.ixFile.read(length, pos, opts)
      pos += data.length
      // a short read (including empty) means EOF — stop before issuing another
      // request from a position past the file's end
      eof = data.length < length
      length = Math.min(length * 2, MAX_CHUNK_SIZE)
      // the appended newline lets a final record with no trailing one be read
      // like any other; on a file that does end in a newline it just opens an
      // empty line, which the scan passes over
      const text =
        carry +
        decoder.decode(data, { stream: true }) +
        (eof ? decoder.decode() + '\n' : '')
      carry = ''

      let at = 0
      // looked up once per line rather than once per token, so a line carrying
      // 200k records is scanned linearly rather than quadratically
      let lineEnd = text.indexOf('\n')

      while (at < text.length) {
        if (expect === 'skip') {
          if (lineEnd === -1) {
            break
          }
          at = lineEnd + 1
          lineEnd = text.indexOf('\n', at)
          expect = 'term'
          continue
        }
        // the token runs to the next space, or to the end of the line if that
        // comes first
        const space = text.indexOf(' ', at)
        const end =
          space === -1 || (lineEnd !== -1 && lineEnd < space) ? lineEnd : space
        if (end === -1) {
          carry = text.slice(at)
          break
        }
        const token = text.slice(at, end)
        const lineEnded = end === lineEnd
        at = end + 1
        if (lineEnded) {
          lineEnd = text.indexOf('\n', at)
        }

        if (expect === 'term') {
          if (token.startsWith(searchWord)) {
            term = token
            expect = 'record'
          } else if (compareCodePoints(token, searchWord) > 0) {
            // past the range where matches could exist. the comparison follows
            // the ix's utf-8 byte order, not javascript's utf-16 order, so an
            // astral term does not look past a 0xE000-0xFFFF search word and
            // stop early
            return
          } else {
            expect = 'skip'
          }
        } else if (token) {
          if (hits.size >= this.maxResults) {
            return
          }
          const record = recordOf(token)
          if (!hits.has(record)) {
            hits.set(record, [term, record])
          }
        }
        if (lineEnded) {
          expect = 'term'
        }
      }
    }
  }

  // the address of the ixx checkpoint at or just before `searchWord`, which is
  // where the first record that could match lives. always a record start (or
  // 0), so the first read is never strictly past EOF
  private async getStart(searchWord: string) {
    const checkpoints = await this.getIndex()
    // -1 when the word sorts before every checkpoint, and checkpoints[-1] is
    // undefined, so both fall back to the start of the file
    const at = checkpoints.findLastIndex(
      ({ prefix }) => compareCodePoints(prefix, searchWord) <= 0,
    )
    return checkpoints[at]?.address ?? 0
  }
}
