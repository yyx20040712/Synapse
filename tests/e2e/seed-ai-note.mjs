/**
 * [F-UIRES-03 B2 e2e] ai_notes 种子子进程脚本——由 lineage.spec.ts 经
 * e2e-env.seedAiNote 拉起（seed-paper.mjs 同型：Windows 锁定已加载进进程的
 * 原生模块文件，不经 spec 主进程 require；[F-ELE-02] better-sqlite3 13.0.3
 * N-API 单绑定，子进程直接 require 即可）。
 * 数据经环境变量传入（SEED_DB/SEED_ID/SEED_PAPER_ID/SEED_ROLE/SEED_QUESTION/
 * SEED_MODEL/SEED_QUOTE/SEED_PREFIX/SEED_SUFFIX/SEED_PAGE/SEED_CONTENT，
 * 不经 shell）；SQL 一律 prepare 预编译 + 参数绑定。SEED_PAGE 缺省=null
 * （篇级语料——anchor_page 可空）。B2 数据零迁移口径：ai_notes 表留库直读
 * （INV-101 域不变），本脚本=e2e 预置链（替代退役的 08 传感器导入链）。
 */
import Database from 'better-sqlite3'

const db = new Database(process.env.SEED_DB)
try {
  db.prepare(
    `INSERT INTO ai_notes (id, paper_id, annotation_id, role, question, model, quote_text, prefix_text, suffix_text, anchor_page, content_md, created_at, updated_at)
     VALUES (?, ?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z')`
  ).run(
    process.env.SEED_ID,
    process.env.SEED_PAPER_ID,
    process.env.SEED_ROLE,
    process.env.SEED_QUESTION,
    process.env.SEED_MODEL,
    process.env.SEED_QUOTE ?? '',
    process.env.SEED_PREFIX ?? '',
    process.env.SEED_SUFFIX ?? '',
    process.env.SEED_PAGE === undefined ? null : Number(process.env.SEED_PAGE),
    process.env.SEED_CONTENT ?? ''
  )
} finally {
  db.close()
}
