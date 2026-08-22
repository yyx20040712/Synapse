/**
 * [SR-RDR-04 e2e] 种子落库子进程脚本——由 reader-text.spec.ts 拉起。
 * 独立进程的原因：Windows 锁定已加载进进程的原生模块文件，测试主进程内加载
 * better-sqlite3（node ABI 绑定）会让 spec 侧 finally 的绑定还原 EBUSY、
 * build/Release 残留 node 绑定毒化后续 electron.launch——详见 spec 头注释。
 * 数据经环境变量传入（SEED_DB/SEED_FILE_REF/SEED_SHA/SEED_TITLE，不经 shell）；
 * SQL 一律 prepare 预编译 + 参数绑定。
 */
import Database from 'better-sqlite3'

const db = new Database(process.env.SEED_DB)
try {
  db.prepare(
    'INSERT INTO papers (id, file_ref, sha256, title, added_at, updated_at)' +
      " VALUES ('e2e-seed-paper', ?, ?, ?, '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z')"
  ).run(process.env.SEED_FILE_REF, process.env.SEED_SHA, process.env.SEED_TITLE)
} finally {
  db.close()
}
