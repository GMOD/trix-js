import { spawnSync } from 'node:child_process'
import { readFileSync, statSync } from 'node:fs'
import { createServer } from 'node:http'
import path from 'node:path'

import puppeteer from 'puppeteer'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import type { IncomingMessage, Server, ServerResponse } from 'node:http'
import type { Browser, ConsoleMessage, Page } from 'puppeteer'

// this is the one test that runs the built esm/ rather than src/, since what it
// checks is that the published entry point works in a browser. so it has to
// build it: preversion runs the tests before the build, so left to find esm/ on
// disk it reads whatever the last build put there — the previous release's
// code, which passes and says nothing about the one being cut
function buildEsm() {
  const { error, status, stderr } = spawnSync(
    'npx',
    ['tsc', '--outDir', 'esm'],
    { cwd: process.cwd(), encoding: 'utf8' },
  )
  if (error) {
    throw error
  }
  if (status !== 0) {
    throw new Error(`building esm/ failed: ${stderr}`)
  }
}

// the page's globals are installed at runtime by the bootstrap script below, so
// they have to be described here rather than inferred
interface PageGlobals {
  Trix: new (
    ixxFile: object,
    ixFile: object,
  ) => { search: (query: string) => Promise<[string, string][]> }
  RemoteFile: new (url: string) => object
}

// let the OS pick the port, so a test run can't collide with whatever else on
// the machine happens to be listening
async function listenOnFreePort(server: Server) {
  await new Promise<void>(resolve => {
    server.listen(0, resolve)
  })
  const address = server.address()
  if (typeof address !== 'object' || address === null) {
    throw new Error(`expected a TCP address, got ${String(address)}`)
  }
  return address.port
}

function close(server: Server) {
  return new Promise<void>(resolve => {
    server.close(() => {
      resolve()
    })
  })
}

function createStaticServer(cors: boolean): Server {
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

    const filePath = path.join(
      process.cwd(),
      'test/testData/test1',
      req.url === '/' ? 'myTrix.ix' : (req.url ?? '/'),
    )

    try {
      const content = readFileSync(filePath)

      const rangeHeader = req.headers.range
      if (rangeHeader) {
        const [, startText, endText] =
          /bytes=(\d+)-(\d*)/.exec(rangeHeader) ?? []
        if (startText) {
          const start = Number.parseInt(startText, 10)
          const end = endText
            ? Number.parseInt(endText, 10)
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

function appHandler(req: IncomingMessage, res: ServerResponse) {
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

  const filePath = path.join(process.cwd(), req.url ?? '/')
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

// runs a search in the page against one of the static servers
function searchInPage(page: Page, port: number, query: string) {
  return page.evaluate(
    async (port, query) => {
      const { Trix, RemoteFile } = globalThis as unknown as PageGlobals
      const trix = new Trix(
        new RemoteFile(`http://localhost:${port}/myTrix.ixx`),
        new RemoteFile(`http://localhost:${port}/myTrix.ix`),
      )
      return await trix.search(query)
    },
    port,
    query,
  )
}

describe('Browser tests with Puppeteer', () => {
  let browser: Browser | undefined
  let page: Page
  let corsServer: Server
  let noCorsServer: Server
  let appServer: Server
  let corsPort: number
  let noCorsPort: number

  beforeAll(async () => {
    buildEsm()
    corsServer = createStaticServer(true)
    noCorsServer = createStaticServer(false)
    appServer = createServer(appHandler)

    corsPort = await listenOnFreePort(corsServer)
    noCorsPort = await listenOnFreePort(noCorsServer)
    const appPort = await listenOnFreePort(appServer)

    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    })
    page = await browser.newPage()

    const errors: string[] = []
    page.on('pageerror', err => {
      errors.push(err instanceof Error ? err.message : String(err))
    })
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text())
      }
    })

    await page.goto(`http://localhost:${appPort}/`)

    try {
      await page.waitForFunction('window.ready === true', { timeout: 10000 })
    } catch (error) {
      const html = await page.content()
      console.error('Page errors:', errors)
      console.error('Page HTML:', html)
      throw error
    }
  }, 30000)

  afterAll(async () => {
    // browser is undefined if beforeAll failed; closing it would mask that error
    await browser?.close()
    await Promise.all([
      close(corsServer),
      close(noCorsServer),
      close(appServer),
    ])
  })

  it('searches via HTTP with CORS enabled server', async () => {
    const results = await searchInPage(page, corsPort, 'for')

    expect(results.length).toBeGreaterThan(0)
    expect(results).toMatchSnapshot()
  })

  it('fails to search via HTTP without CORS (browser enforces CORS)', async () => {
    const consoleMessages: string[] = []
    const consoleHandler = (msg: ConsoleMessage) => {
      consoleMessages.push(msg.text())
    }
    page.on('console', consoleHandler)

    const result = await page.evaluate(async (port: number) => {
      const { Trix, RemoteFile } = globalThis as unknown as PageGlobals
      const trix = new Trix(
        new RemoteFile(`http://localhost:${port}/myTrix.ixx`),
        new RemoteFile(`http://localhost:${port}/myTrix.ix`),
      )
      try {
        await trix.search('for')
        return { success: true, error: undefined }
      } catch (error: unknown) {
        return { success: false, error: String(error) }
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
    expect(await searchInPage(page, corsPort, 'this')).toMatchSnapshot()
  })

  it('returns empty for non-existent search term', async () => {
    expect(await searchInPage(page, corsPort, 'zzz')).toEqual([])
  })
})
