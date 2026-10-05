---
name: postings-and-a-doc-store
description: trix copies each feature's whole record onto every word that finds it, so substring search, description words and ID fragments each multiply the index 3-7x; a doc store behind postings keeps trix's one-read range scan and fits all three in less than today's index. Waiting on a prototype's reads per keystroke.
---

# Postings and a doc store in place of trix's copied records

Proposed 2026-09-24; nothing is built. The proposal waits on one number: what a
prototype reader fetches per keystroke against trix on hg38, since the sizes
given here for the new layout come from a model, not a built file. The work
would span ixixx-js (the builder), trix-js (the reader) and jbrowse-components
(`text-indexing-core` and `TrixTextSearchAdapter`).

## What trix gets right

A trix `.ix` holds one sorted line per lowercased word, carrying every record
that word finds, and its `.ixx` holds a checkpoint (word prefix, byte offset)
about every 64 KiB, fetched once. A search finds the checkpoint at or before the
query and reads forward, so a prefix search and an exact lookup of a long ID
cost the same single range read. On the live hg38 index, `nm_000546.6` and
`brca1` each take one 64 KiB read, and `ca`, which fills the 1500-result cap,
takes three reads and 448 KiB.

The one-read range scan is the part to keep, and the alternative most often
suggested loses it. SQLite FTS5 with the trigram tokenizer, which Node 24's
`node:sqlite` includes, so a builder would need no dependency, does substring and
free-text search over the same features in 148 MB. Over HTTP every page SQLite
reads becomes a range request, most of them dependent on the one before:

| Query            | FTS5, 4 KiB pages   | FTS5, 64 KiB pages | trix                       |
| ---------------- | ------------------- | ------------------ | -------------------------- |
| `"nm_000546.6"`  | 626 reads, 2496 KiB | 67 reads, 4160 KiB | 1 read, 64 KiB             |
| `"p53"`          | 39 reads, 148 KiB   | 26 reads, 1536 KiB | 1 read, word prefixes only |
| `"brca1"`        | 20 reads, 72 KiB    | 12 reads, 640 KiB  | 1 read, 64 KiB             |
| `dna AND repair` | 19 reads, 68 KiB    | 13 reads, 704 KiB  | descriptions not indexed   |

Long IDs are the trigram tokenizer's worst case: it turns `nm_000546.6` into a
phrase of trigrams such as `000` and `_00`, whose doclists span most of RefSeq.
The phrase also needs positions: adding `detail='none'` to the trigram table in
`fts5.mjs` halves the database to 78 MB and makes every query longer than three
characters match nothing. FTS5 does not rank these hits either: the first
two for `p53` are LNCTAM34A and RNA5SP53, and ordering by `bm25` means reading
every match.

## What copying records costs

`gff3Adapter` writes one record per feature, `["loc"|"trackId"|attr…]`
URI-encoded, and ixixx's `TrixInputTransform` copies that record onto every
whitespace-separated word in it. The live
`jbrowse.org/ucsc/hg38/trix/hg38.ix` (186.4 MB, two tracks) is 90% record bytes,
storing each record 2.6 times, and the trackId strings alone take 29 MB. This
repo's D39V fixture, where every gene carries half a dozen locus-tag aliases,
stores each record 5.3 times.

Each word added to a trix index costs a whole record, so every search people ask
for multiplies the file. Modeled over the RefSeq GFF behind that index (274,695
features after the hub's exclude list), whose first row matches that track's
63.8 MB share of the live file:

| Trix, indexing                                                 | Size     |
| -------------------------------------------------------------- | -------- |
| Name, ID, gene_synonym (today)                                 | 63.8 MB  |
| + description and product words                                | 374.7 MB |
| + ID fragments (`gene-TP53`→`tp53`, `NM_000546.6`→`nm_000546`) | 196.1 MB |
| + ID fragments and symbol suffixes (`p53`→TP53)                | 458.9 MB |

Record copying is why the hg38 hub indexes no descriptions, why `kinas` finds
nothing, and why
[#3352](https://github.com/GMOD/jbrowse-components/issues/3352) (`p53` should
find TP53 and Trp53) is still open.

## The other gaps

- **Ranking.** Hits come back in alphabetical word order and are cut at the
  adapter's `maxResults` of 1500 before anything ranks them; `ca` prefixes 9,147
  records. The record carries no feature type, so nothing can rank a gene above
  its transcripts, and uFuzzy in `TextSearchManager.sortResults` reorders only
  the hits it is handed
  ([#2334](https://github.com/GMOD/jbrowse-components/issues/2334)).
- **Multi-word queries.** trix-js searches only the first word, and
  `TrixTextSearchAdapter` keeps the hits whose attributes contain every word as
  a substring. A second word cannot reach a record the first word's cap cut off.
- **A flat `.ixx`, fetched whole.** At hg38's density of a line per 68 KB, a
  dbSNP-scale `.ix` of 50 GB means about 23 MB of `.ixx` before the first
  result. The fixed-width prefixes also need `optimizePrefixSize`'s heuristic
  and a `--prefixSize` escape hatch.
- **Whole-assembly rebuilds.** jb2hubs' `ucsc2jbrowse/textIndex.sh` indexes both
  of an assembly's tracks in one pass, because `--tracks` replaces the aggregate
  index rather than adding to it
  ([#2313](https://github.com/GMOD/jbrowse-components/issues/2313)).

## The proposal

Keep the sorted range scan and stop copying records.

1. **A doc store holding each record once**, in gzipped blocks of about 500, with
   doc ids assigned in static rank order: genes, then transcripts, then the
   rest. Genes then cluster in the first blocks, which is where most top hits
   live and what a range cache keeps. Track ids become a table in the header
   rather than a string in every record.
2. **A sorted term dictionary pointing at postings** of delta-varint doc ids,
   each tagged with the field it came from (name, ID, synonym, Dbxref,
   description). Short lists sit inline in the dictionary block.
3. **The terms copying made unaffordable:** ID fragments split at punctuation,
   unversioned IDs, and stop-word-filtered description and product words.
4. **Checkpoints keyed by each block's full first term**, as in an SSTable, so
   no prefix width needs tuning. A second level keeps the eagerly fetched part
   small at dbSNP scale.
5. **A symbol dictionary for substrings and typos.** Every Name and
   gene_synonym in hg38 comes to 312,368 entries and 1.18 MB gzipped. The client
   fetches it when the search box first takes focus, runs uFuzzy over it (already
   a dependency) and resolves the chosen symbol through the term dictionary. The
   same code can index a GFF a user opens on the web, where no CLI runs
   ([#4409](https://github.com/GMOD/jbrowse-components/issues/4409)). Suffix
   terms in the dictionary are the alternative: 20.6 MB for hg38, with no typo
   tolerance.
6. **Ranking by match kind, then field, then doc rank**: exact before prefix
   before fragment before substring, and name before ID before description.
   Multi-word queries intersect postings, treating the last word as a prefix,
   and rank-ordered doc ids let the intersection stop at the first page of hits.
7. **One index per track, searched together**, which `TextSearchManager` already
   does across adapters. Adding a track adds an index; merging indexes is an
   optimization rather than a rebuild.

Modeled on the same GFF, now also indexing ID fragments, description words and
Dbxref:

| Part                              | Size                                |
| --------------------------------- | ----------------------------------- |
| Doc store                         | 7.4 MB gzipped (51.6 MB raw)        |
| IDs, Dbxref and description words | 7.1 MB dictionary, 7.4 MB postings  |
| ID fragments                      | 6.0 MB dictionary, 8.5 MB postings  |
| Symbol suffixes (optional, see 5) | 11.4 MB dictionary, 9.2 MB postings |

The new layout totals 36.4 MB without suffixes and 57.0 MB with them, against
63.8 MB for today's trix index of the same track without any of it and 374.7 MB
for trix with description words alone. It pays with a second dependent read
(dictionary block, then doc-store blocks) whenever those blocks are not already
cached.

## What decides it

A prototype builder and reader over the same GFF, counting reads and KiB per
keystroke through `@gmod/range-cache-filehandle` for a typed query set (`tp53`
one character at a time, `nm_000546.6`, `dna repair`, `kinase`), against trix.
The model assumes front coding it never builds, so the prototype's file sizes
are the second number. Build it if the new layout stays within one extra round
trip of trix on the typeahead path.

## Smaller steps inside the trix format

Each of these stands alone, but none makes description words or fragments
affordable, since fragments alone triple a trix index.

- ixixx writes each checkpoint's full term instead of a fixed-width prefix.
  trix-js already trims the padding; whether UCSC's C reader accepts the result
  is untested.
- Records carry a track index, resolved through the `_meta.json` the CLI already
  writes (the 29 MB above), and the feature type, so the adapter can rank genes
  first.
- trix-js searches every query word and intersects the records, as UCSC's
  `trixSearch` does.
- A text search adapter over bigBed extraIndex. bbi-js has `searchExtraIndex`
  and nothing in jbrowse calls it, so jb2hubs' UCSC bigBeds that carry a
  `searchIndex` would get exact-name lookup at any scale with no build step.

## Considered and not proposed

- **tantivy, with Quickwit's hotcache**: real fuzzy and prefix search over an
  FST, but megabytes of wasm and no range-request reader to start from.
- **Pagefind**: shards its index into many small files by term prefix and
  expects web pages; fifty thousand genomes' worth of shards on S3 is the wrong
  shape.
- **An in-memory index of everything** (MiniSearch, FlexSearch): all of hg38 is
  too much to download, and the symbol dictionary in 5 is the part that fits.

## Reproducing the numbers

Measured 2026-09-24 with Node 24.21.0 and its bundled SQLite 3.53.4. The scripts
sit in [postings-and-a-doc-store/](postings-and-a-doc-store/); download the data
outside the repo and point them at it:

```sh
d=<path to agent-docs/ideas/waiting-on-a-number/postings-and-a-doc-store>
curl -O https://jbrowse.org/ucsc/hg38/hg38.gff.gz   # 113,917,951 bytes, modified 2026-06-26
curl -O https://jbrowse.org/ucsc/hg38/trix/hg38.ix  # 186,356,176 bytes, modified 2026-09-07
curl -O https://jbrowse.org/ucsc/hg38/trix/hg38.ixx
node $d/profile-trix.mjs hg38.ix hg38.ixx
node $d/profile-trix.mjs $d/../../../../test/testData/D39V_annotation_coding_features_sorted.gff.ix{,x} spv_05
node --max-old-space-size=8000 $d/model-sizes.mjs hg38.gff.gz
node $d/fts5.mjs build hg38.gff.gz hg38-4k.db 4096 && $d/fts5-reads.sh hg38-4k.db
node $d/fts5.mjs build hg38.gff.gz hg38-64k.db 65536 && $d/fts5-reads.sh hg38-64k.db
```

`profile-trix.mjs` imports trix-js from `src/`, so it needs `pnpm install` at
the repo root, and `fts5-reads.sh` counts reads with `strace`, so it needs
Linux.
