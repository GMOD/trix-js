import fs from 'node:fs'
import readline from 'node:readline'
import zlib from 'node:zlib'

// the indexingFeatureTypesToExclude on hg38-ncbiRefSeqGff in
// https://jbrowse.org/ucsc/hg38/config.json
const excludedTypes = new Set([
  'CDS',
  'exon',
  'region',
  'match',
  'cDNA_match',
  'biological_region',
  'enhancer',
  'silencer',
  'promoter',
  'protein_binding_site',
  'transcriptional_cis_regulatory_region',
  'nucleotide_motif',
])

function decode(value) {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

// the features `jbrowse text-index --attributes Name,ID,gene_synonym` indexes
export async function* features(gffGz) {
  const lines = readline.createInterface({
    input: fs.createReadStream(gffGz).pipe(zlib.createGunzip()),
    crlfDelay: Infinity,
  })
  for await (const line of lines) {
    if (!line || line.startsWith('#')) {
      continue
    }
    const [seq, , type, start, end, , , , col9] = line.split('\t')
    if (col9 === undefined || excludedTypes.has(type)) {
      continue
    }
    const attrs = {}
    for (const pair of col9.split(';')) {
      const eq = pair.indexOf('=')
      if (eq > 0) {
        attrs[pair.slice(0, eq)] = decode(pair.slice(eq + 1)).trim()
      }
    }
    if (attrs.Name || attrs.ID || attrs.gene_synonym) {
      yield { loc: `${seq}:${start}..${end}`, type, attrs }
    }
  }
}
