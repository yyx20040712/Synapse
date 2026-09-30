/**
 * [F-BAKRET-01] lineage 种子落库子进程脚本——由 e2e-env.seedLineageGraph 拉起
 * （草稿导入链退役后脉络图种子基建；seed-paper.mjs 同型：独立进程避 Windows
 * 原生模块文件锁，数据经环境变量传入不经 shell，SQL 一律 prepare 预编译+
 * 参数绑定）。
 * 载荷（SEED_LINEAGE_JSON）：{ folders?: [{id,name,position?}], nodes:
 * [{paperId,title,year,month?,slot?,coreIdea?,folderId?}], edges:
 * [{from,to,label?,kind?}] }——edges 的 from/to=paperId（脚本按 paper_id
 * 解析节点行 id，ORDER BY created_at,rowid 首条）。
 * INV-88 诚实面：node 落库后其 paper 若 folder_id 为 NULL 则写为节点 folder
 * （镜像 ensurePaperFolder 入图即归档语义）。幽灵边种子（导出面 INV-77 兜底
 * 测试用）=edges 两端 paper 分属不同文件夹——脚本无守卫直写（存量数据模拟）。
 * 时序契约：须在 app 首次 launch 前调用——app 内 folders.create 等会触发
 * workspaces 物化迁库（ADR-0018 L0→L1，根 synapse.db 移入 workspaces/<id>/），
 * 关窗后根库不存在。
 */
import { randomUUID } from 'node:crypto'
import Database from 'better-sqlite3'

const db = new Database(process.env.SEED_DB)
try {
  const payload = JSON.parse(process.env.SEED_LINEAGE_JSON ?? '{"nodes":[],"edges":[]}')
  const base = Date.parse('2026-01-01T00:00:00.000Z')
  let seq = 0
  const stamp = () => new Date(base + seq * 1000).toISOString()
  const insFolder = db.prepare('INSERT INTO collections (id, name, position) VALUES (?, ?, ?)')
  for (const f of payload.folders ?? []) {
    insFolder.run(f.id, f.name, f.position ?? 0)
  }
  const insNode = db.prepare(
    `INSERT INTO lineage_nodes (id, paper_id, title, core_idea, year, x, y, tags, month, slot, folder_id, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, NULL, NULL, NULL, ?, ?, ?, ?, ?)`
  )
  const assignFolder = db.prepare(
    'UPDATE papers SET folder_id = ? WHERE id = ? AND folder_id IS NULL'
  )
  for (const n of payload.nodes ?? []) {
    const folderId = n.folderId ?? '__main__'
    const t = stamp()
    insNode.run(
      randomUUID(),
      n.paperId,
      n.title,
      n.coreIdea ?? '',
      n.year ?? null,
      n.month ?? null,
      n.slot ?? null,
      folderId,
      t,
      t
    )
    assignFolder.run(folderId, n.paperId)
  }
  const byPaper = db.prepare(
    'SELECT id FROM lineage_nodes WHERE paper_id = ? ORDER BY created_at, rowid LIMIT 1'
  )
  const insEdge = db.prepare(
    `INSERT INTO lineage_edges (id, from_node, to_node, label, kind, sub, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, NULL, ?, ?)`
  )
  for (const e of payload.edges ?? []) {
    const from = byPaper.get(e.from)
    const to = byPaper.get(e.to)
    if (from === undefined || to === undefined) {
      throw new Error(`seed-lineage: 边端点 paper 无节点行（${e.from}→${e.to}）`)
    }
    const t = stamp()
    insEdge.run(randomUUID(), from.id, to.id, e.label ?? '', e.kind ?? 'tree', t, t)
  }
} finally {
  db.close()
}
