/**
 * [F-VISFB-65 单元二] 死文件夹造态子进程脚本（seed-*.mjs 同型：独立进程
 * 直写库——WAL+busy_timeout 下与运行中 app 共存；经页面外路径删 folder，
 * 构造「队列未收口期间 folder 被删」的 GHOST_FOLDER 场景）。
 * 载荷（环境变量）：SEED_DB=库路径；SEED_FOLDER_ID=待删 collections 行 id。
 * foreign_keys=ON：lineage_nodes/floating_notes 级联随删（DDL 承担）；
 * fail-fast：行不在（changes=0）即非零退出（造态缺陷早暴露）。
 */
import Database from 'better-sqlite3'

const db = new Database(process.env.SEED_DB)
db.pragma('foreign_keys = ON')
db.pragma('busy_timeout = 5000')
try {
  const info = db.prepare('DELETE FROM collections WHERE id = ?').run(process.env.SEED_FOLDER_ID)
  if (info.changes === 0) {
    console.error(`kill-folder: 目标行不存在：${process.env.SEED_FOLDER_ID}`)
    process.exit(1)
  }
} finally {
  db.close()
}
