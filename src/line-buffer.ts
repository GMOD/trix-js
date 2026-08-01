// accumulates chunks of a utf-8 byte stream and hands back whole
// newline-delimited lines. owns the two things a caller would otherwise have to
// get right: the decoder holds trailing incomplete utf-8 bytes back until the
// next chunk completes them, and consumed text is dropped once per chunk instead
// of once per line
export class LineBuffer {
  private decoder = new TextDecoder('utf8')
  private text = ''
  private cursor = 0

  push(bytes: Uint8Array) {
    this.text =
      this.text.slice(this.cursor) +
      this.decoder.decode(bytes, { stream: true })
    this.cursor = 0
  }

  // every line whose terminating newline has already arrived. text after the
  // last newline stays buffered, so a line split across chunks is only yielded
  // once it is complete
  *takeLines() {
    let nl = this.text.indexOf('\n', this.cursor)
    while (nl !== -1) {
      yield this.text.slice(this.cursor, nl)
      this.cursor = nl + 1
      nl = this.text.indexOf('\n', this.cursor)
    }
  }

  // what is left once no more bytes are coming: a final line with no trailing
  // newline, plus any bytes the decoder held back. '' when the stream ended on a
  // newline
  takeRest() {
    const rest = this.text.slice(this.cursor) + this.decoder.decode()
    this.text = ''
    this.cursor = 0
    return rest
  }
}
