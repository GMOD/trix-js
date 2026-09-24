// SQLite FTS5 over the same features: trigram (substring) matching over the
// identifier fields, word and prefix matching over descriptions.
//
//   node fts5.mjs build hg38.gff.gz hg38.db [pageSize]
//   node fts5.mjs query hg38.db ids '"p53"'
//
// query brackets the search with MARK/END writes to stderr so fts5-reads.sh
// can count the reads between them
import fs from 'node:fs'
import { DatabaseSync } from 'node:sqlite'

import { features } from './gff.mjs'

const [command, ...args] = process.argv.slice(2)

if (command === 'build') {
  const [gffGz, out, pageSize = '4096'] = args
  fs.rmSync(out, { force: true })
  const db = new DatabaseSync(out)
  db.exec(`
    pragma page_size=${Number(pageSize)};
    pragma journal_mode=off;
    create table docs(id integer primary key, loc, type, name, fid, syn, descr, dbxref);
    create virtual table ids using fts5(name, fid, syn, dbxref, content='docs', content_rowid='id', tokenize='trigram');
    create virtual table words using fts5(descr, content='docs', content_rowid='id', prefix='2 3', detail='none');
  `)
  const insert = db.prepare(
    'insert into docs(loc, type, name, fid, syn, descr, dbxref) values (?, ?, ?, ?, ?, ?, ?)',
  )
  db.exec('begin')
  for await (const { loc, type, attrs } of features(gffGz)) {
    insert.run(
      loc,
      type,
      attrs.Name ?? '',
      attrs.ID ?? '',
      attrs.gene_synonym ?? '',
      attrs.description ?? attrs.product ?? '',
      attrs.Dbxref ?? '',
    )
  }
  db.exec(`
    commit;
    insert into ids(ids) values('rebuild');
    insert into words(words) values('rebuild');
    insert into ids(ids) values('optimize');
    insert into words(words) values('optimize');
    vacuum;
  `)
  db.close()
  console.log(`${out}: ${(fs.statSync(out).size / 1e6).toFixed(1)} MB`)
} else if (command === 'query') {
  const [file, table, match] = args
  if (table !== 'ids' && table !== 'words') {
    throw new Error(`no fts5 table ${table}`)
  }
  const db = new DatabaseSync(file, { readOnly: true })
  db.prepare('select count(*) from sqlite_schema').get()
  fs.writeSync(2, 'MARK\n')
  const rows = db
    .prepare(
      `select d.name, d.type from ${table} join docs d on d.id = ${table}.rowid where ${table} match ? limit 20`,
    )
    .all(match)
  fs.writeSync(2, 'END\n')
  console.log(
    `${rows.length} rows: ${rows
      .slice(0, 3)
      .map(r => `${r.name}/${r.type}`)
      .join(' ')}`,
  )
} else {
  throw new Error(`unknown command ${command}`)
}
