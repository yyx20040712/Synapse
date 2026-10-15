/**
 * [F-BAKRET-01] lineage 种子落库子进程脚本——由 e2e-env.seedLineageGraph 拉起
 * （草稿导入链退役后脉络图种子基建；seed-paper.mjs 同型：独立进程避 Windows
 * 原生模块文件锁，数据经环境变量传入不经 shell，SQL 一律 prepare 预编译+
 * 参数绑定）。
 * 载荷（SEED_LINEAGE_JSON）：{ folders?: [{id,name,position?}], nodes:
 * [{paperId,title,year,month?,slot?,folderId?,libraryTags?,authors?,abstract?}]
 * （[F-ALIGN-01] paperId 必填非空——主题节点形态退役，null 即 fail-fast；
 * [A1b F-CONTRACTA-01] tags 种子键随脉络私有标签域退役删除；
 * [A3 F-CONTRACTA-01 2026-10-04] coreIdea 种子键随 core_idea 全退役删除；
 * [F-UIRES-04 批 3b] authors/abstract=论文信息区种子面——papers 既有列
 * authors_json/abstract 可选 UPDATE，两键均缺省不进 UPDATE），
 * edges: [{from,to,label?,kind?}] }——edges 的 from/to=paperId（脚本按
 * paper_id 解析节点行 id，ORDER BY created_at,rowid 首条）。
 * [A1a] libraryTags=文献库标签种子（tags+paper_tags 两行挂接该节点 paperId
 * ——卡 L1 标签断言面换源；[A1b] 后=唯一标签种子面）。
 * INV-88 诚实面：node 落库后其 paper 若 folder_id 为 NULL 或 __main__（016
 * DEFAULT 承续映射——未显式落夹的缺省家）则写为节点 folder（镜像
 * ensurePaperFolder 入图即归档语义）。幽灵边种子（edges 两端 paper 分属
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
    `INSERT INTO lineage_nodes (id, paper_id, title, year, x, y, month, slot, folder_id, created_at, updated_at)
     VALUES (?, ?, ?, ?, NULL, NULL, ?, ?, ?, ?, ?)`
  )
  // [F-DBCAMP-01 U1·回炉轮2] 016 列级 NOT NULL DEFAULT '__main__' 后种子文献
  // （seed-paper.mjs 列单无 folder_id）生于 __main__ 而非 NULL——原 IS NULL 条件
  // 恒假=种子文献永留主图不落种子夹（门二 P02 三红之②③面）。承接映射=
  // __main__ 承续 012 时代「未归档 NULL」语义（未显式落夹的缺省家）：
  // NULL 或 __main__ 均可被节点归属覆写；显式落非 __main__ 夹的文献维持旧
  // no-op（pre-016 与 post-016 两态下该分支行为逐位相同=99 绿零扰动）
  const assignFolder = db.prepare(
    "UPDATE papers SET folder_id = ? WHERE id = ? AND (folder_id IS NULL OR folder_id = '__main__')"
  )
  // [A1a] 文献库标签种子（同名幂等：DO NOTHING+按名回读——tags.repo
  // upsertByName 同型；挂接 OR IGNORE 同型）。
  // [F-TAGS-02 / F-DBCAMP-01 DB-1 U4] folder_id 域化：两语句均用节点循环内
  // folderId 变量（T11 图夹非主图的种子若落主图必被 019 触发器 ABORT——
  // assignFolder 已同步文献归属，标签随夹=域对齐）
  const insTag = db.prepare(
    'INSERT INTO tags (id, name, folder_id) VALUES (?, ?, ?) ON CONFLICT (folder_id, name) DO NOTHING'
  )
  const tagIdByName = db.prepare('SELECT id FROM tags WHERE folder_id = ? AND name = ?')
  const attachPaperTag = db.prepare(
    'INSERT OR IGNORE INTO paper_tags (paper_id, tag_id) VALUES (?, ?)'
  )
  // [F-UIRES-04 批 3b] 论文信息区种子面：papers 既有列 UPDATE（authors_json
  // JSON 序列化与 001 DDL 注释同源）；两键均缺省不进 UPDATE 保持既有调用
  // 零改动；零命中行 fail-fast（papers 行须先经 seed-paper.mjs 落库）
  const updPaperInfo = db.prepare(
    'UPDATE papers SET authors_json = ?, abstract = ? WHERE id = ?'
  )
  for (const n of payload.nodes ?? []) {
    // [F-ALIGN-01 D2] 主题节点兼容面退役（原 null paperId 静默落库行为废止）：
    // 种子载荷仅文献节点（INV-NEW-1——节点唯一来源=入库/移动
    // 两路，应用层已无主题产生路径），null/缺 paperId 即报错优于静默落库
    if (typeof n.paperId !== 'string' || n.paperId.length === 0) {
      throw new Error('seed-lineage: 主题节点（paperId null）已退役——种子载荷仅文献节点（INV-NEW-1）')
    }
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
    // [A1b] tags 列死置不种（清列归 D 批——应用面读链已不映射）；
    // [A3 F-CONTRACTA-01 2026-10-04] core_idea 种子列随全退役不种（DDL 列死置
    // DEFAULT '' 兜底——清列归 D 批）
    insNode.run(
      randomUUID(),
      n.paperId,
      n.title,
      n.year ?? null,
      month,
      slot,
      folderId,
      t,
      t
    )
    assignFolder.run(folderId, n.paperId)
    for (const name of n.libraryTags ?? []) {
      insTag.run(randomUUID(), name, folderId)
      const row = tagIdByName.get(folderId, name)
      if (row === undefined) {
        throw new Error(`seed-lineage: 标签按名回读失败（${folderId}/${name}）`)
      }
      attachPaperTag.run(n.paperId, row.id)
    }
    if (n.authors !== undefined || n.abstract !== undefined) {
      const r = updPaperInfo.run(
        JSON.stringify(n.authors ?? []),
        n.abstract ?? '',
        n.paperId
      )
      if (r.changes === 0) {
        throw new Error(`seed-lineage: 信息区种子 UPDATE 无命中 papers 行（${n.paperId}）`)
      }
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
