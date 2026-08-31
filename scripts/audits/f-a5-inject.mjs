/**
 * F-A5 探针 AI 段注入器（ESM 主脚本——由 electron.exe 直接运行；主进程
 * evaluate 无 require/import 通道的替代路径）。better-sqlite3（CJS）经
 * createRequire 解析（electron-ABI 绑定在 Electron 主进程内天然可用）。
 * 参数=JSON 文件路径（argv[2]）：{ userDataDir, titleLike, rows:[{question,
 * quote,page}] }。只写探针副本库——真实库零触碰。
 */
import { app } from 'electron'
import { createRequire } from 'node:module'
import { readFileSync, readdirSync, existsSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
const require = createRequire(import.meta.url)
const Database = require('better-sqlite3')

const spec = JSON.parse(readFileSync(process.argv[2], 'utf8'))
const resultPath = process.argv[3] ?? null

app.whenReady().then(() => {
  try {
    let dbPath = null
    for (const ws of readdirSync(join(spec.userDataDir, 'workspaces'))) {
      const p = join(spec.userDataDir, 'workspaces', ws, 'synapse.db')
      if (existsSync(p)) {
        const db = new Database(p, { readonly: true })
        const hit = db.prepare('SELECT id FROM papers WHERE title LIKE ?').all(`%${spec.titleLike}%`)
        db.close()
        if (hit.length > 0) {
          dbPath = p
          break
        }
      }
    }
    if (dbPath === null) throw new Error('target db not found')
    const db = new Database(dbPath)
    const paper = db.prepare('SELECT id FROM papers WHERE title LIKE ?').get(`%${spec.titleLike}%`)
    const ins = db.prepare(
      "INSERT INTO ai_notes (id, paper_id, annotation_id, role, question, model, quote_text, prefix_text, suffix_text, anchor_page, content_md, created_at, updated_at) VALUES (?, ?, NULL, 'first-read', ?, 'f-a5-probe', ?, '', '', ?, ?, '2026-08-31T00:00:00Z', '2026-08-31T00:00:00Z')"
    )
    for (const r of spec.rows) {
      ins.run(crypto.randomUUID(), paper.id, r.question, r.quote, r.page, 'F-A5 探针段：' + r.quote.slice(0, 20))
    }
    db.close()
    const out = JSON.stringify({ injected: spec.rows.length, db: dbPath })
    if (resultPath !== null) writeFileSync(resultPath, out)
    console.log(out)
  } catch (e) {
    console.error('INJECT-ERR', String(e))
    process.exit(1)
  } finally {
    app.quit()
  }
})
