/**
 * [F-BAKRET-01] lineage 种子落库子进程脚本——由 e2e-env.seedLineageGraph 拉起
 * （草稿导入链退役后脉络图种子基建；seed-paper.mjs 同型：独立进程避 Windows
 * 原生模块文件锁，数据经环境变量传入不经 shell，SQL 一律 prepare 预编译+
 * 参数绑定）。
 * 载荷（SEED_LINEAGE_JSON）：{ folders?: [{id,name,position?}], nodes:
 * [{paperId,title,year,month?,slot?,coreIdea?,folderId?,tags?,libraryTags?}],
 * edges: [{from,to,label?,kind?}] }——edges 的 from/to=paperId（脚本按
 * paper_id 解析节点行 id，ORDER BY created_at,rowid 首条）。
 * [A1a] libraryTags=文献库标签种子（tags+paper_tags 两行挂接该节点 paperId
 * ——卡 L1 标签断言面换源；tags[脉络私有域 JSON 列]不再是卡断言源）。
 * INV-88 诚实面：node 落库后其 paper 若 folder_id 为 NULL 则写为节点 folder
 * （镜像 ensurePaperFolder 入图即归档语义）。幽灵边种子（edges 两端 paper 分属
 * 不同文件夹——存量数据模拟）的跨图过滤单测覆盖=tests/unit/services/
 * lineage-assemble.test.ts；本脚本当前无 e2e 幽灵边用例（d1-N6 勘正：头注
 * 原「导出面 INV-77 兜底测试用」高报了本脚本的覆盖面）。
 * 时序契约（d1-N3 勘正：原「须在 app 首次 launch 前调用」与既有用法矛盾
 * ——实际用法=firstHop 建库之后、主 launch 之前；精确契约如下）：须在下一
 * 次（触发 workspaces 物化迁库的）launch 前调用，且其间禁 workspaces 域
 * create/rename/switch 类物化动作（legacy 首启不迁库，二次启动才搬入
 * ——workspace.service 状态机跨格序列②；种子直写 userData 根 synapse.db，
 * 迁库后根库不存在）。
 * fail-fast（d1-N1）：连接即开 foreign_keys=ON（connection.ts DB_PRAGMAS
 * 同源面）——幽灵 folderId/paperId 种子在 INSERT 即报错，优于静默落库。
 * slot 缺省补号（d1-N2）：n.slot 缺省时按 (folderId,year,month) 组内序自动
 * 补号（与 service nextSlotInGroup 归一同构——写入前内存计数组内 max+1，
 * DB 存量组先行读入底数）；显式传值（含 null）照用并回填组内 max。
 */
import { randomUUID } from 'node:crypto'
import Database from 'better-sqlite3'

const db = new Database(process.env.SEED_DB)
db.pragma('foreign_keys = ON')
try {
  const payload = JSON.parse(process.env.SEED_LINEAGE_JSON ?? '{"nodes":[],"edges":[]}')
  const base = Date.parse('2026-01-01T00:00:00.000Z')
  let seq = 0
  const stamp = () => new Date(base + seq * 1000).toISOString()
  const insFolder = db.prepare('INSERT INTO collections (id, name, position) VALUES (?, ?, ?)')
  for (const f of payload.folders ?? []) {
    insFolder.run(f.id, f.name, f.position ?? 0)
  }
  // d1-N2：组内 slot 底数（DB 存量先行读入——多次 seed 增量不撞号）
  const slotMax = new Map()
  const groupKey = (folderId, year, month) => `${folderId}|${year}|${month}`
  for (const row of db
    .prepare(
      'SELECT folder_id, year, month, MAX(slot) AS m FROM lineage_nodes GROUP BY folder_id, year, month'
    )
    .iterate()) {
    slotMax.set(groupKey(row.folder_id, row.year, row.month), row.m ?? 0)
  }
  const insNode = db.prepare(
    `INSERT INTO lineage_nodes (id, paper_id, title, core_idea, year, x, y, tags, month, slot, folder_id, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, NULL, NULL, ?, ?, ?, ?, ?, ?)`
  )
  const assignFolder = db.prepare(
    'UPDATE papers SET folder_id = ? WHERE id = ? AND folder_id IS NULL'
  )
  // [A1a] 文献库标签种子（同名幂等：DO NOTHING+按名回读——tags.repo
  // upsertByName 同型；挂接 OR IGNORE 同型）
  const insTag = db.prepare(
    'INSERT INTO tags (id, name) VALUES (?, ?) ON CONFLICT (name) DO NOTHING'
  )
  const tagIdByName = db.prepare('SELECT id FROM tags WHERE name = ?')
  const attachPaperTag = db.prepare(
    'INSERT OR IGNORE INTO paper_tags (paper_id, tag_id) VALUES (?, ?)'
  )
  for (const n of payload.nodes ?? []) {
    const folderId = n.folderId ?? '__main__'
    const month = n.month ?? null
    const key = groupKey(folderId, n.year ?? null, month)
    // d1-N2：缺省补号（组内 max+1）；显式传值（含 null）照用——两者均回填
    // 组内 max，保证后续缺省节点不与显式值撞号（INV-75 组内唯一同构）
    let slot
    if (n.slot !== undefined) {
      slot = n.slot
    } else {
      slot = (slotMax.get(key) ?? 0) + 1
    }
    if (slot !== null && slot > (slotMax.get(key) ?? 0)) {
      slotMax.set(key, slot)
    }
    const t = stamp()
    insNode.run(
      randomUUID(),
      n.paperId,
      n.title,
      n.coreIdea ?? '',
      n.year ?? null,
      n.tags !== undefined && n.tags.length > 0 ? JSON.stringify(n.tags) : null,
      month,
      slot,
      folderId,
      t,
      t
    )
    assignFolder.run(folderId, n.paperId)
    for (const name of n.libraryTags ?? []) {
      insTag.run(randomUUID(), name)
      const row = tagIdByName.get(name)
      if (row === undefined) {
        throw new Error(`seed-lineage: 标签按名回读失败（${name}）`)
      }
      attachPaperTag.run(n.paperId, row.id)
    }
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
