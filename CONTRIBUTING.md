# Contributing

## Development

```sh
pnpm install
pnpm test
pnpm build
```

### Test the UCSC TrixSearch - Requires Linux

Clone this repo. To run test searches on a track hub using the UCSC `TrixSearch`, navigate to `tests/testdata/test#` and run `bash test#script.sh` where `#` is the test number. To change search terms, edit `searchterms.txt`.

Wondering what to search for? Open `tests/testdata/test#/input.txt`.

To test your own .gff.gz data, navigate to `/test/rawGenomes`, create a directory with your .gff.gz file in it, and from within that directory run `bash ../../programs/gff3ToInput.sh <.gff3.gz FILE> <OUTPUT NAME>`.

Use `npm version patch/minor/major` to release — it runs lint, tests, and build, then pushes the version tag which triggers the publish workflow.

## Publishing

Releases publish automatically via GitHub Actions using npm trusted publishing (OIDC, no stored token). The workflow requires `--provenance` and `id-token: write` permissions.

This repo is already configured. To set up a new package: `npm trust github <pkg> --file publish.yml --repo GMOD/<repo>` (requires npm >=11.10.0 and 2FA).
