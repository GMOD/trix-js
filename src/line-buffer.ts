// accumulates chunks of a utf-8 byte stream and hands back whole
// newline-delimited lines. owns the two things a caller would otherwise have to
// get right: the decoder holds trailing incomplete utf-8 bytes back until the
// next chunk completes them, and a line longer than a chunk is joined once
// rather than recopied and rescanned on every chunk that extends it
export class LineBuffer {
  private decoder = new TextDecoder('utf8')
  // pieces of a line whose newline has not arrived yet. none of them contains
  // one, so only `text` is ever searched
  private held: string[] = []
  // the most recent chunk's text, and how far into it lines have been taken
  private text = ''
  private cursor = 0

  push(bytes: Uint8Array) {
    if (this.cursor < this.text.length) {
      this.held.push(this.text.slice(this.cursor))
    }
    this.text = this.decoder.decode(bytes, { stream: true })
    this.cursor = 0
  }

  // every line whose terminating newline has already arrived. text after the
  // last newline stays buffered, so a line split across chunks is only yielded
  // once it is complete
  *takeLines() {
    let nl = this.text.indexOf('\n', this.cursor)
    while (nl !== -1) {
      const piece = this.text.slice(this.cursor, nl)
      this.cursor = nl + 1
      yield this.join(piece)
      nl = this.text.indexOf('\n', this.cursor)
    }
  }

  // what is left once no more bytes are coming: a final line with no trailing
  // newline, plus any bytes the decoder held back. '' when the stream ended on a
  // newline
  takeRest() {
    // the flush goes last: it is whatever incomplete sequence trailed the input
    const rest = this.join(this.text.slice(this.cursor) + this.decoder.decode())
    this.text = ''
    this.cursor = 0
    return rest
  }

  private join(piece: string) {
    if (this.held.length === 0) {
      return piece
    }
    this.held.push(piece)
    const line = this.held.join('')
    this.held = []
    return line
  }
}
