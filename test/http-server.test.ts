import { createServer } from 'node:http'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { RemoteFile } from 'generic-filehandle2'

import Trix from '../src/index.ts'

function createStaticServer(
  port: number,
  cors: boolean,
): ReturnType<typeof createServer> {
  const server = createServer((req, res) => {
    const filePath = join(
      process.cwd(),
      'test/testData/test1',
      req.url === '/' ? 'myTrix.ix' : req.url!,
    )

    try {
      const content = readFileSync(filePath)
      const stat = readFileSync(filePath)

      if (cors) {
        res.setHeader('Access-Control-Allow-Origin', '*')
        res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS')
        res.setHeader(
          'Access-Control-Allow-Headers',
          'Range, Content-Type, If-None-Match',
        )
        res.setHeader('Access-Control-Expose-Headers', 'Content-Length, Content-Range')
      }

      const rangeHeader = req.headers.range
      if (rangeHeader) {
        const match = /bytes=(\d+)-(\d*)?/.exec(rangeHeader)
        if (match) {
          const start = Number.parseInt(match[1], 10)
          const end = match[2] ? Number.parseInt(match[2], 10) : content.length - 1
          const clampedEnd = Math.min(end, content.length - 1)
          const chunk = content.subarray(start, clampedEnd + 1)

          res.writeHead(206, {
            'Content-Type': 'application/octet-stream',
            'Content-Range': `bytes ${start}-${clampedEnd}/${content.length}`,
            'Content-Length': chunk.length,
            'Accept-Ranges': 'bytes',
          })
          res.end(chunk)
          return
        }
      }

      res.writeHead(200, {
        'Content-Type': 'application/octet-stream',
        'Content-Length': content.length,
        'Accept-Ranges': 'bytes',
      })
      res.end(content)
    } catch {
      res.writeHead(404)
      res.end('Not found')
    }
  })

  return server
}

describe('HTTP server tests without CORS', () => {
  let server: ReturnType<typeof createServer>
  const port = 9876

  beforeAll(
    () =>
      new Promise<void>(resolve => {
        server = createStaticServer(port, false)
        server.listen(port, resolve)
      }),
  )

  afterAll(
    () =>
      new Promise<void>(resolve => {
        server.close(() => resolve())
      }),
  )

  it('searches via HTTP without CORS', async () => {
    const trix = new Trix(
      new RemoteFile(`http://localhost:${port}/myTrix.ixx`),
      new RemoteFile(`http://localhost:${port}/myTrix.ix`),
    )
    const results = await trix.search('for')
    expect(results.length).toBeGreaterThan(0)
    expect(results).toMatchSnapshot()
  })

  it('handles search near end of file without reading past EOF', async () => {
    const trix = new Trix(
      new RemoteFile(`http://localhost:${port}/myTrix.ixx`),
      new RemoteFile(`http://localhost:${port}/myTrix.ix`),
    )
    const results = await trix.search('this')
    expect(results).toMatchSnapshot()
  })
})

describe('HTTP server tests with CORS', () => {
  let server: ReturnType<typeof createServer>
  const port = 9877

  beforeAll(
    () =>
      new Promise<void>(resolve => {
        server = createStaticServer(port, true)
        server.listen(port, resolve)
      }),
  )

  afterAll(
    () =>
      new Promise<void>(resolve => {
        server.close(() => resolve())
      }),
  )

  it('searches via HTTP with CORS', async () => {
    const trix = new Trix(
      new RemoteFile(`http://localhost:${port}/myTrix.ixx`),
      new RemoteFile(`http://localhost:${port}/myTrix.ix`),
    )
    const results = await trix.search('for')
    expect(results.length).toBeGreaterThan(0)
    expect(results).toMatchSnapshot()
  })

  it('handles search near end of file without reading past EOF with CORS', async () => {
    const trix = new Trix(
      new RemoteFile(`http://localhost:${port}/myTrix.ixx`),
      new RemoteFile(`http://localhost:${port}/myTrix.ix`),
    )
    const results = await trix.search('this')
    expect(results).toMatchSnapshot()
  })

  it('searches for term at very end of alphabet to test EOF handling', async () => {
    const trix = new Trix(
      new RemoteFile(`http://localhost:${port}/myTrix.ixx`),
      new RemoteFile(`http://localhost:${port}/myTrix.ix`),
    )
    const results = await trix.search('zzz')
    expect(results).toEqual([])
  })
})
