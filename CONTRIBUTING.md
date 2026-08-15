# Contributing

## Development

```sh
pnpm install
pnpm test
pnpm build
```

The suite runs against pre-built trix fixtures in `test/testData/`; each
`test#/` directory keeps the `input.txt` those indexes were built from, which is
the place to look for terms worth searching. Building new fixtures needs UCSC's
`ixIxx` — see [ixixx-js](https://github.com/GMOD/ixixx-js) for a JavaScript
implementation.

## Releasing

`pnpm version patch/minor/major` runs lint, format, types, tests and build,
regenerates CHANGELOG.md with git-cliff, then pushes the version tag, which
triggers the publish workflow.

Releases publish via GitHub Actions using npm trusted publishing (OIDC, no
stored token), which attaches provenance given `id-token: write`. This repo is
already configured; to set up a new package, run
`npm trust github <pkg> --file publish.yml --repo GMOD/<repo>` (needs npm
`>=11.10.0` and 2FA).

Once npm publish succeeds, the `release` job creates the GitHub release for the
tag, taking its notes from that version's CHANGELOG.md section — which
`scripts/release-notes.sh` extracts, so run that with a version to preview what
a release will say.
