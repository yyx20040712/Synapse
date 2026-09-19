/**
 * [SR-RDR-04 e2e] 种子落库子进程脚本——由 reader-text.spec.ts 拉起。
 * 独立进程的原因：Windows 锁定已加载进进程的原生模块文件——不经 spec 主进程
 * require（与 e2e-env.ts seedPaperRow 注释同口径）。[F-ELE-02] better-sqlite3
 * 13.0.3 起 N-API 单绑定跨 Node/Electron ABI 通用，子进程（process.execPath=
 * Node 24）直接 require 即可；v12 时代的 node/electron 双绑定互切面（spec 侧
 * finally 还原 EBUSY、build/Release 残留 node 绑定毒化 electron.launch）已随
 * abi-cache 机制退役消失（F-ELE-03 勘误本头注残留句）。
 * 数据经环境变量传入（SEED_DB/SEED_FILE_REF/SEED_SHA/SEED_TITLE，不经 shell）；
 * SQL 一律 prepare 预编译 + 参数绑定。SEED_ID 可选（多篇种子场景——P7-B 三序列；
 * 缺省 'e2e-seed-paper' 保持既有单篇调用零改动）。
 */
import Database from 'better-sqlite3'

const db = new Database(process.env.SEED_DB)
try {
  db.prepare(
    'INSERT INTO papers (id, file_ref, sha256, title, added_at, updated_at)' +
      " VALUES (?, ?, ?, ?, '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z')"
  ).run(
    process.env.SEED_ID ?? 'e2e-seed-paper',
    process.env.SEED_FILE_REF,
    process.env.SEED_SHA,
    process.env.SEED_TITLE
  )
} finally {
  db.close()
}
