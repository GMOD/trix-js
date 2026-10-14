## [3.1.0](https://github.com/GMOD/trix-js/compare/v3.0.22...v3.1.0) (2026-10-14)

### Chores

- Keep agent worktrees out of the toolchain's way ([194b3bd](https://github.com/GMOD/trix-js/commit/194b3bd894683ce9e5388162d0732b8896dfd964))

### Documentation

- Trim the readme to install, usage, and api ([679f609](https://github.com/GMOD/trix-js/commit/679f609adca433f854dc479c8ff5b2bdeb369d04))
- Drop contributing steps for tooling removed in 2022 ([c7c345f](https://github.com/GMOD/trix-js/commit/c7c345f768011799771fcec9d5a9f5040b815fd4))
- Correct the release command in CONTRIBUTING, and its voice ([e202273](https://github.com/GMOD/trix-js/commit/e20227303b2e092a3bb0c837caafce94171228e5))
- Describe the release gate CONTRIBUTING actually runs ([dd7b591](https://github.com/GMOD/trix-js/commit/dd7b591166c5da3c44e221d459bf0c1a4b07124c))
- Recommend a byte-range cache, and test what a typeahead reads ([07f7428](https://github.com/GMOD/trix-js/commit/07f74285445b47e7dc90a56b07a8bfe7891a3e53))
- Fix anti-AI writing tropes in README ([5f438e3](https://github.com/GMOD/trix-js/commit/5f438e377ef4ab23d038b54a23c01edb505db4e9))
- Park the postings-and-doc-store search index as an idea ([74992ab](https://github.com/GMOD/trix-js/commit/74992abb4e564274932af4318691a1c3f9852192))

### Other Changes

- Triage agent-docs to the ideas/handoffs convention, add agent-docs/CLAUDE.md ([4e0f289](https://github.com/GMOD/trix-js/commit/4e0f2892c1cda696c817e77e1d21bc4a96ba4786))
- Fix moved paths in the postings idea and add agent-docs/CLAUDE.md ([997f82f](https://github.com/GMOD/trix-js/commit/997f82fe84d17625a0596b9a7b784b2ea1bd539e))
- Rewrite AI-writing tropes in README and agent docs ([9d66753](https://github.com/GMOD/trix-js/commit/9d66753c3f72a0c37a33129ed42d75b71694e858))
- Fold short verdict sentences into their neighbours ([9c57e0a](https://github.com/GMOD/trix-js/commit/9c57e0a3f99087cc063d30850e24d36c4fefa031))
- Restore wording the tropes rewrite changed without a trope ([03f48c9](https://github.com/GMOD/trix-js/commit/03f48c9cb661ce2a59787c55cefa9f7216654439))
- Name the mechanism in the record-copying heading ([0073d33](https://github.com/GMOD/trix-js/commit/0073d339827221496c7128def605e59780ed244b))
- Credit the record copying to jbrowse text-index, not trix ([493be3c](https://github.com/GMOD/trix-js/commit/493be3cfd6b8cb205bd4b45609075b80338cf702))
- State what the trix section keeps in its heading ([4b972ab](https://github.com/GMOD/trix-js/commit/4b972ab2a468dc03aa2ee948ef6d2393ce4a3bba))
- Trim README wordiness ([a9ed68a](https://github.com/GMOD/trix-js/commit/a9ed68a5ae1281dd58d73e59f8310321f99977df))
- Stop scanning as soon as maxResults fills ([7cfe30b](https://github.com/GMOD/trix-js/commit/7cfe30bfb649c8f2ff4590ff5aadacbd83dedbc2))
- Type filehandles with a local interface ([41d6421](https://github.com/GMOD/trix-js/commit/41d6421fd048dfcbd6d986b1967ebee03b1c2f0b))
- Label TrixHit's second element record, as the README does ([b1b428c](https://github.com/GMOD/trix-js/commit/b1b428c6545002a08e62afbb5ebeda977e32de74))

### Tests

- Drop fixtures left behind by the removed UCSC tooling ([657d55f](https://github.com/GMOD/trix-js/commit/657d55fbf8a82517b8a0bb7d49ba38910d48eff3))

## [3.0.22](https://github.com/GMOD/trix-js/compare/v3.0.21...v3.0.22) (2026-08-15)

### Bug Fixes

- A padded ixx prefix sent the scan to the previous checkpoint ([f91af92](https://github.com/GMOD/trix-js/commit/f91af9268715ff39b3554a8329808658179a1985))

### Performance Improvements

- Stop reading a hot line once maxResults is reached ([12e2f7f](https://github.com/GMOD/trix-js/commit/12e2f7fcdf96a736429a43d87aa60c770dab8387))

### Tests

- Build the esm the browser test loads, rather than finding it ([f93a323](https://github.com/GMOD/trix-js/commit/f93a3235bedacb8e2543bfa7e40f87b1ffb48e19))

## [3.0.21](https://github.com/GMOD/trix-js/compare/v3.0.20...v3.0.21) (2026-08-11)

### Chores

- Render only the commit subject, and link the commit ([2a43595](https://github.com/GMOD/trix-js/commit/2a43595610097dc3b60338f545005973689f2722))
- Create a GitHub release for each published tag ([34a4436](https://github.com/GMOD/trix-js/commit/34a4436c59cc3e4ea6b96767451a83b340391f00))
- Enforce type strippability in tsconfig ([1f21488](https://github.com/GMOD/trix-js/commit/1f21488cc4791d3e8537b976bdea47d6fffe52fb))

### Performance Improvements

- A hot term made both the read and the scan quadratic ([c86d2d0](https://github.com/GMOD/trix-js/commit/c86d2d0a4cc1864281c5461f6d74339402be1348))

## [3.0.20](https://github.com/GMOD/trix-js/compare/v3.0.19...v3.0.20) (2026-08-10)

### Chores

- Drop eslint-plugin-unicorn
- Type-check the tests and enforce prettier, as @gmod/bam does
- Let npm publish stop auto-correcting repository.url
- Exempt our own packages from the release quarantine
- Bump pnpm/action-setup to v6.0.10
- Run the test suite as `pnpm test --run`
- Gate preversion on format:check, as CI does
- Converge package.json on the shape its siblings use

### Documentation

- Mark breaking changes in the generated changelog

### Other Changes

- Revert "chore: converge package.json" — the CHANGELOG prettier step ([c8dbc91](https://github.com/GMOD/trix-js/commit/c8dbc91e358a1bd37178f120b264f78c7dd235e8))

## [3.0.19](https://github.com/GMOD/trix-js/compare/v3.0.18...v3.0.19) (2026-08-01)

### Bug Fixes

- Count distinct records against maxResults in search()

### Chores

- Sha-pin actions, take pnpm version from packageManager, node 24
- Pin pnpm via the `packageManager` field, so local pnpm and CI agree
- Share one eslint-plugin-unicorn opt-out list across the repos
- Drop redundant @typescript-eslint/{eslint-plugin,parser}
- Turn off unicorn/prefer-early-return across the repos
- Add git-cliff for changelog generation

### Documentation

- Backfill CHANGELOG.md for v2.0.7 through v3.0.18

### Refactoring

- Name the ixx checkpoint fields, drop redundant scanning state

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
