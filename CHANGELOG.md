# v3.0.18

- Fix incorrect or missing results for search terms outside the Basic
  Multilingual Plane, caused by comparing UTF-16 code units instead of UTF-8
  byte order
- Fix missed results when the index was built by older `ixixx` tooling that
  wrote character-count addresses instead of byte offsets, landing checkpoints
  mid-record
- Mark the package as side-effect free

# v3.0.17

- Export a `TrixHit` type for the tuples returned by `search()`
- Fix leading whitespace in the search string being treated as an empty query
- Fix the final record being dropped when the index file doesn't end with a
  trailing newline
- Correct the README: `search()` only uses the first word of the query

# v3.0.16

- Stop depending on `ixFile.stat()` to bound reads; detect end-of-file from
  short reads instead, fixing searches that silently returned no results when
  `stat()` reported an inaccurate size (e.g. behind CORS)

# v3.0.15

- No functional changes (publish workflow maintenance)

# v3.0.14

- No functional changes (merged CI and publish workflows)

# v3.0.13

- Fix multibyte UTF-8 characters spanning a chunk boundary being corrupted
  during search
- Cache the index and file size as shared promises so concurrent searches
  reuse one in-flight load
- Drop the `@jbrowse/quick-lru` dependency

# v3.0.12

- Simplify `package.json` exports and build output, dropping the redundant
  `module` field
- Switch from `eslint-plugin-import` to `eslint-plugin-import-x`

# v3.0.11

- Switch the build to `nodenext` module/moduleResolution
- Add npm trusted publishing (provenance) to the release workflow
- Move to pnpm and TypeScript 6

# v3.0.10

- Fix a potential out-of-range read near the end of the index file when the
  file size was unknown or stale (#23)

# v3.0.9

- Add a `main` field pointing at the ESM build, for tools that don't resolve
  `exports`

# v3.0.8

- Fix the ESM build output (compile with `--module nodenext --moduleResolution
  nodenext`)

# v3.0.7

- Fix `types` resolution by declaring `types` per-condition inside `exports`
  instead of a single package-level field

# v3.0.6

- Switch the package to `"type": "module"`; restructure `exports` for
  separate ESM/CJS entry points

# v3.0.5

- Cache the parsed ixx index across searches instead of re-reading it on
  every call
- Add dedupe and edge-case test coverage

# v3.0.4

- Dependency bumps and internal tooling updates

# v3.0.3

- Add a `dedupe()` helper and de-duplicate results based on the detail column
- Add a postbuild step to mark `dist/` as CommonJS

# v3.0.2

- Fix trix not returning all values after the `generic-filehandle2`
  conversion (#20)
- Update docs to use `generic-filehandle2`

# v3.0.1

- Re-publish v3.0.0 to npm

# v3.0.0

- Breaking: switch to `generic-filehandle2`; reads and results now use
  `Uint8Array` instead of Node `Buffer`

# v2.0.9

- Re-add an explicit `buffer` import, for browser bundle compatibility

# v2.0.8

- Revert the buffer import added in v2.0.7 (it increased bundle size)

# v2.0.7

- Add an explicit `buffer` import for browser bundle compatibility
- Internal refactors and dependency bumps

# v2.0.6

- Re-publish v2.0.5 to npm

# v2.0.5

- Improve prefix searches

# v2.0.4

- Fixes the ability to search for the first word in an index

# v2.0.3

- Better support adjustable prefix sizes by basing the prefix as the remainder
  of the line length - hex address size

# v2.0.2

- Publish src directory for better source maps

# v2.0.1

- Redeploy to npm with preversion script added

# v2.0.0

- Fix issue with infinite loop
- Add abortsignal support
- Only query first word when string with multiple words is entered

# v1.0.0

- Change result format from just the "result" string returned to be "term,result"

# v0.2.1

- Fix error when identifiers contain commas

# v0.2.0

- Improve performance of fetches with sequential chunk parsing

# v0.1.1

- Initial release
