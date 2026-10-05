/**
 * [F-UIRES-03 B2 e2e] annotations 种子子进程脚本——由 lineage.spec.ts 经
 * e2e-env.seedAnnotation 拉起（seed-paper.mjs 同型：Windows 文件锁决定不经
 * 主进程 require；[F-ELE-02] better-sqlite3 13.0.3 N-API 单绑定）。
 * 数据经环境变量传入（SEED_DB/SEED_ID/SEED_PAPER_ID/SEED_PAGE/SEED_KIND/
 * SEED_COLOR/SEED_QUOTE/SEED_PREFIX/SEED_SUFFIX/SEED_START/SEED_END/SEED_COMMENT，
 * 不经 shell）；SQL 一律 prepare 预编译 + 参数绑定。
 * page=0 基存储（INV-24 口径）；rects_json 置 '[]'（侧板片段节+锚定位消费
 * quote 三元组，不消费 rects——B2 断言面零依赖）；sort_key=「页码:序号」
 * 1 基显示形态（sortKeyOf 同式——派生列口径随表 DDL 缺省语义）。
 */
import Database from 'better-sqlite3'

const db = new Database(process.env.SEED_DB)
try {
  const page = Number(process.env.SEED_PAGE ?? 0)
  const start = Number(process.env.SEED_START ?? 0)
  db.prepare(
    `INSERT INTO annotations (id, paper_id, page, kind, color, quote_text, prefix_text, suffix_text, start_offset, end_offset, rects_json, sort_key, comment, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '[]', ?, ?, '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z')`
  ).run(
    process.env.SEED_ID,
    process.env.SEED_PAPER_ID,
    page,
    process.env.SEED_KIND,
    process.env.SEED_COLOR ?? 'yellow',
    process.env.SEED_QUOTE ?? '',
    process.env.SEED_PREFIX ?? '',
    process.env.SEED_SUFFIX ?? '',
    start,
    Number(process.env.SEED_END ?? start + 1),
    `${page + 1}:${start}`,
    process.env.SEED_COMMENT ?? ''
  )
} finally {
  db.close()
}
