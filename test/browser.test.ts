import { createServer, IncomingMessage, ServerResponse } from 'node:http'
import { readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import puppeteer, { Browser, Page } from 'puppeteer'

function createStaticServer(
  port: number,
  cors: boolean,
): ReturnType<typeof createServer> {
  const handler = (req: IncomingMessage, res: ServerResponse) => {
    if (cors) {
      res.setHeader('Access-Control-Allow-Origin', '*')
      res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS')
      res.setHeader(
        'Access-Control-Allow-Headers',
        'Range, Content-Type, If-None-Match',
      )
      res.setHeader(
        'Access-Control-Expose-Headers',
        'Content-Length, Content-Range',
      )
    }

    if (req.method === 'OPTIONS') {
      res.writeHead(204)
      res.end()
      return
    }

    const filePath = join(
      process.cwd(),
      'test/testData/test1',
      req.url === '/' ? 'myTrix.ix' : req.url!,
    )

    try {
      const content = readFileSync(filePath)

      const rangeHeader = req.headers.range
      if (rangeHeader) {
        const match = /bytes=(\d+)-(\d*)?/.exec(rangeHeader)
        if (match) {
          const start = Number.parseInt(match[1], 10)
          const end = match[2]
            ? Number.parseInt(match[2], 10)
            : content.length - 1
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
  }

  return createServer(handler)
}

function createAppServer(port: number): ReturnType<typeof createServer> {
  const handler = (req: IncomingMessage, res: ServerResponse) => {
    res.setHeader('Access-Control-Allow-Origin', '*')

    if (req.url === '/') {
      res.writeHead(200, { 'Content-Type': 'text/html' })
      res.end(`<!DOCTYPE html>
<html>
<head>
  <script type="importmap">
  {
    "imports": {
      "generic-filehandle2": "/node_modules/generic-filehandle2/esm/browser.js"
    }
  }
  </script>
</head>
<body>
  <script type="module">
    import Trix from '/esm/index.js';
    import { RemoteFile } from 'generic-filehandle2';
    window.Trix = Trix;
    window.RemoteFile = RemoteFile;
    window.ready = true;
  </script>
</body>
</html>`)
      return
    }

    const filePath = join(process.cwd(), req.url!)
    try {
      const stat = statSync(filePath)
      if (stat.isFile()) {
        const content = readFileSync(filePath)
        const ext = filePath.split('.').pop()
        const contentType =
          ext === 'js' ? 'application/javascript' : 'application/octet-stream'
        res.writeHead(200, {
          'Content-Type': contentType,
          'Content-Length': content.length,
        })
        res.end(content)
        return
      }
    } catch {
      // fall through to 404
    }
    res.writeHead(404)
    res.end('Not found')
  }

  return createServer(handler)
}

describe('Browser tests with Puppeteer', () => {
  let browser: Browser
  let page: Page
  let corsServer: ReturnType<typeof createServer>
  let noCorsServer: ReturnType<typeof createServer>
  let appServer: ReturnType<typeof createServer>
  const corsPort = 9877
  const noCorsPort = 9876
  const appPort = 9875

  beforeAll(async () => {
    corsServer = createStaticServer(corsPort, true)
    noCorsServer = createStaticServer(noCorsPort, false)
    appServer = createAppServer(appPort)

    await Promise.all([
      new Promise<void>(resolve => corsServer.listen(corsPort, resolve)),
      new Promise<void>(resolve => noCorsServer.listen(noCorsPort, resolve)),
      new Promise<void>(resolve => appServer.listen(appPort, resolve)),
    ])

    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    })
    page = await browser.newPage()

    await page.goto(`http://localhost:${appPort}/`)
    await page.waitForFunction('window.ready === true')
  })

  afterAll(async () => {
    await browser?.close()
    await Promise.all([
      new Promise<void>(resolve => corsServer.close(() => resolve())),
      new Promise<void>(resolve => noCorsServer.close(() => resolve())),
      new Promise<void>(resolve => appServer.close(() => resolve())),
    ])
  })

  it('searches via HTTP with CORS enabled server', async () => {
    const results = await page.evaluate(async (port: number) => {
      const trix = new (window as any).Trix(
        new (window as any).RemoteFile(`http://localhost:${port}/myTrix.ixx`),
        new (window as any).RemoteFile(`http://localhost:${port}/myTrix.ix`),
      )
      return trix.search('for')
    }, corsPort)

    expect(results.length).toBeGreaterThan(0)
    expect(results).toMatchSnapshot()
  })

  it('fails to search via HTTP without CORS (browser enforces CORS)', async () => {
    const consoleMessages: string[] = []
    const consoleHandler = (msg: any) => {
      consoleMessages.push(msg.text())
    }
    page.on('console', consoleHandler)

    const result = await page.evaluate(async (port: number) => {
      const trix = new (window as any).Trix(
        new (window as any).RemoteFile(`http://localhost:${port}/myTrix.ixx`),
        new (window as any).RemoteFile(`http://localhost:${port}/myTrix.ix`),
      )
      try {
        await trix.search('for')
        return { success: true, error: null, errorName: null }
      } catch (e: any) {
        return {
          success: false,
          error: String(e),
          errorName: e?.name || null,
        }
      }
    }, noCorsPort)

    page.off('console', consoleHandler)

    expect(result.success).toBe(false)
    expect(result.error).toMatch(/Failed to fetch|CORS|Cross-Origin|Network/i)

    const hasCorsError = consoleMessages.some(
      msg =>
        msg.includes('CORS') ||
        msg.includes('Cross-Origin') ||
        msg.includes('Access-Control-Allow-Origin'),
    )
    expect(hasCorsError).toBe(true)
  })

  it('handles EOF correctly with CORS enabled server', async () => {
    const results = await page.evaluate(async (port: number) => {
      const trix = new (window as any).Trix(
        new (window as any).RemoteFile(`http://localhost:${port}/myTrix.ixx`),
        new (window as any).RemoteFile(`http://localhost:${port}/myTrix.ix`),
      )
      return trix.search('this')
    }, corsPort)

    expect(results).toMatchSnapshot()
  })

  it('returns empty for non-existent search term', async () => {
    const results = await page.evaluate(async (port: number) => {
      const trix = new (window as any).Trix(
        new (window as any).RemoteFile(`http://localhost:${port}/myTrix.ixx`),
        new (window as any).RemoteFile(`http://localhost:${port}/myTrix.ix`),
      )
      return trix.search('zzz')
    }, corsPort)

    expect(results).toEqual([])
  })
})
