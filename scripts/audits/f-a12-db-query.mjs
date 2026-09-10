// F-A12 落库对照查询（探针 run 后补查——temp 拷贝库两 workspace 的 synapse.db）
import { createRequire } from 'node:module'
const req = createRequire('E:/class/智慧水务/Synapse_remake/package.json')
const Database = req('better-sqlite3')
const base = 'C:/Users/ADMINI~1/AppData/Local/Temp/synapse-a12verify-sPGnxG/workspaces'
for (const ws of ['default', 'ws-059434f6']) {
  const db = new Database(`${base}/${ws}/synapse.db`, { readonly: true })
  const papers = db.prepare("SELECT id, title FROM papers WHERE title LIKE '%water%' COLLATE NOCASE").all()
  console.log('WS', ws, 'PAPERS', JSON.stringify(papers.map((p) => ({ id: p.id.slice(0, 8), t: p.title.slice(0, 50) }))))
  for (const p of papers) {
    const rows = db.prepare(
      "SELECT kind, end_offset, suffix_text, substr(quote_text, -42) AS quote_tail, created_at FROM annotations WHERE paper_id = ? ORDER BY created_at DESC, rowid DESC LIMIT 4"
    ).all(p.id)
    for (const r of rows) console.log('ROW', JSON.stringify(r))
  }
  db.close()
}
console.log('QUERY_DONE')
