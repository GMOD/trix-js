import { describe, expect, it } from 'vitest'

import { LineBuffer } from '../src/line-buffer.ts'

const bytes = (text: string) => new TextEncoder().encode(text)

function feed(chunks: string[]) {
  const buffer = new LineBuffer()
  const lines: string[] = []
  for (const chunk of chunks) {
    buffer.push(bytes(chunk))
    lines.push(...buffer.takeLines())
  }
  return { lines, rest: buffer.takeRest() }
}

describe('LineBuffer', () => {
  it('yields nothing until a newline arrives', () => {
    const buffer = new LineBuffer()
    buffer.push(bytes('apple a1'))
    expect([...buffer.takeLines()]).toEqual([])
    buffer.push(bytes('\n'))
    expect([...buffer.takeLines()]).toEqual(['apple a1'])
  })

  it('splits a chunk holding several lines', () => {
    expect(feed(['a 1\nb 2\nc 3\n'])).toEqual({
      lines: ['a 1', 'b 2', 'c 3'],
      rest: '',
    })
  })

  it('joins a line split across chunks', () => {
    expect(feed(['app', 'le a1\nzeb', 'ra z1\n'])).toEqual({
      lines: ['apple a1', 'zebra z1'],
      rest: '',
    })
  })

  it('returns a final line with no trailing newline as the rest', () => {
    expect(feed(['apple a1\nzebra z1'])).toEqual({
      lines: ['apple a1'],
      rest: 'zebra z1',
    })
  })

  it('keeps empty lines', () => {
    expect(feed(['a 1\n\nb 2\n'])).toEqual({
      lines: ['a 1', '', 'b 2'],
      rest: '',
    })
  })

  it('tolerates empty chunks', () => {
    expect(feed(['a 1\n', '', 'b 2\n', ''])).toEqual({
      lines: ['a 1', 'b 2'],
      rest: '',
    })
  })

  it('resolves a multibyte char fed one byte at a time', () => {
    const buffer = new LineBuffer()
    const lines: string[] = []
    for (const byte of bytes('€')) {
      buffer.push(new Uint8Array([byte]))
      lines.push(...buffer.takeLines())
    }
    expect(lines).toEqual([])
    expect(buffer.takeRest()).toBe('€')
  })

  it('resolves a multibyte char split across chunks mid-line', () => {
    // 'test' is 4 bytes and U+20AC is 3, so a split at byte 5 cuts the
    // multibyte sequence in half
    const all = bytes('test€value hit\n')
    const buffer = new LineBuffer()
    const lines: string[] = []
    buffer.push(all.subarray(0, 5))
    lines.push(...buffer.takeLines())
    buffer.push(all.subarray(5))
    lines.push(...buffer.takeLines())
    expect(lines).toEqual(['test€value hit'])
    expect(buffer.takeRest()).toBe('')
  })
})
