// b3: P7-H
/**
 * [SR2-LG-01] lineage.repo —— 脉络图数据基座（模型+写面，工单：open / strong；
 * [F-BAKRET-01] 草稿导入链已退役——见下方行为层注记）
 *
 * ── 行为层 ──
 * - 迁移 004_lineage.sql（ADR-0014 §数据模型 DDL 字面）：lineage_nodes
 *   （id/paper_id 可空 CASCADE/title/core_idea/year/x/y 手工位置覆盖
 *   NULL=自动布局——JSON Canvas 模式/created_at/updated_at）+
 *   lineage_edges（id/from_node/to_node CASCADE/label/UNIQUE(from_node,to_node)）
 * - **存储=图 schema（v2 DAG 升级免迁移）；v1 行为=树**（单父+无环）——
 *   树约束是 service 层不变量非 DDL 约束（ADR-0014「树约束=service 层
 *   不变量+单测」），**INV-27 随本单登记**：**守卫宿主=本单 service 写面**
 *   （门一 W1 处置——导入校验与 upsertEdge 运行时守卫同在
 *   lineage.service，LG-03 只接线 IPC 通道不另写守卫）：两写入口同守
 *   （to 已有父拒/成环拒/自环拒——中文 DomainError reason）；布局消费
 *   假设（LG-02 森林）以本不变量为前提
 * - **草稿导入链已退役（[F-BAKRET-01] 用户裁决 2026-09-30——ADR-0022）**：
 *   原设计「main 侧系统对话框选 JSON（INV-07）→zod 校验→幽灵 paperId/
 *   树约束校验→全有或全无替换式导入（清面重灌+清面原语）」
 *   全链删除；备份需求归未来服务端多实体导出。git 历史（548dfda 引入/
 *   95d40c223bd 终态）即完整资产。
 * - repo 方法族（AI-01 同型）：upsertNode/removeNode（级联边
 *   DDL 承担）/upsertEdge/removeEdge/listGraph（nodes+edges 全图单读）
 * - service 写面（本单交付，守卫同上）：upsertNode/upsertEdge（树守卫
 *   运行时二道防线——导入校验外的增量编辑入口）/removeNode/
 *   removeEdge——**IPC 四写通道的 schemas 注册归 LG-03**（消费者
 *   未建窗口），service 方法本单全建全测
 *
 * ── 接口层 ──
 * - export interface LineageRepo { upsertNode(input): LineageNode;
 *     removeNode(id): number; upsertEdge(input): LineageEdge;
 *     removeEdge(id): number; listGraph(): { nodes: LineageNode[];
 *     edges: LineageEdge[] } }（清面原语已随 [F-BAKRET-01] 导入链退役删）
 * - export function createLineageService(deps)（repo+papers 存在性查询
 *   注入）：四写方法（含 upsertEdge 树守卫）+graph()
 * - IPC 面：**新立 lineage 域**（契约测试 10→11 域穷举 [locked-change]——
 *   契约扩展非放宽；ai_sensor 立域 AI-07 同型）：lineage/graph
 *   （voidReq→全图）+写四通道（upsert-node/remove-node/upsert-edge/
 *   remove-edge）**接口预留面在 LG-03 票面**（lineage/import 通道已随
 *   [F-BAKRET-01] 退役删除——通道终态 60）
 * - 交付面：migrations/004_lineage.sql+repos/lineage.repo.ts+services/
 *   lineage/lineage.service.ts（graph+四写方法含
 *   upsertEdge 运行时守卫）+shared/models/lineage.ts（zod 单源）+
 *   ipc/lineage.ts+schemas/api-surface 受锁扩；**受锁新增清单（门一
 *   N4 处置）：migrations/004_lineage.sql（migrations/ 全目录受锁）+
 *   shared/models/lineage.ts（shared/ 全目录受锁）+新测试——三者均
 *   unlock→批内改→generate→apply+[locked-change] 尾注**
 *
 * ── 架构层 ──
 * - 分层：ipc → services → repos → db 单向（禁 service
 *   直写 SQL）；schemas 预编译+参数绑定（禁拼接——迁移 DDL 除 UNIQUE
 *   外无应用侧约束补写）
 * - 依赖：db（迁移执行器既有机制）、papers 只读存在性查询、shared/
 *   models/lineage（zod 单源受锁 [locked-change]）
 *
 * ── 生命周期层 ──
 * - 预留：v2 DAG 升级（存储免迁移——service 层放宽度=LG 组外新裁决）
 * - 不做：lineage FTS（无检索诉求）；draft 含主题节点（v1 纯手工）；
 *   自动引文边（ADR-0012 维持不做——策展边语义 DDL 已辨析）
 *
 * ── 文化层 ──
 * - 错误：写失败原样上抛（消费方 toast INV-02）；
 *   禁静默吞错；库空=graph 空数组（合法态非错误）
 * - upsert 语义：ON CONFLICT(id) DO UPDATE（created_at 首插保留，
 *   updated_at 刷新）；UNIQUE(from_node,to_node) 冲突 DDL 抛错——
 *   应用层中文守卫在 service（repo 保持薄，异常原样上抛）
 * - listGraph 基础序=created_at,rowid 确定性兜底（插入序决胜——id=随机 uuid
 *   不作平局决胜键，uuid 彩票防雷；AI-01 同哲学；业务布局序归 LG-02）
 * - 测试：tests/unit/services/（repo 守卫基线件）[受锁新增]——
 *   repo 方法真库夹具（upsert 往返/级联链/UNIQUE 拒/空图合法）+
 *   **service upsertEdge 运行时守卫三拒绝路径单测（W1 宿主用例）**；
 *   repo 交互真库夹具（AI-01 测试同型）；**新测试 always-active**
 *   （不经 guardedDescribe——ADR-0017 裁决 3）
 * - 新增受锁测试随实现 locks:generate+apply+[locked-change] 尾注
 * - 完成后：删除 STUB → npm run verify 绿 → 人工审查 git diff → 翻 registry
 */
import { randomUUID } from 'node:crypto'
import {
  MAIN_GRAPH_ID,
  dedupeLineageTags,
  type LineTypeGroup,
  type LineageEdge,
  type LineageEdgeUpsert,
  type LineageNode,
  type LineageNodeUpsert
} from '../../../shared/models/lineage'
import type { SqliteDb } from '../connection'
import { parseLineTypes, toEdge, toNode, type LineageEdgeRow, type LineageNodeRow } from './lineage.repo.rows'

export interface LineageRepo {
  /** 新建（id 缺省 randomUUID）或更新（created_at 保留，updated_at 刷新）。
   *  [T3-P5] month/slot 列直写（归一在 service）；input.month/slot 缺省=NULL 落库。
   *  [F-FOLDER-01] folder_id 列直写——**写边界兜底单源**：input.folderId 缺省
   *  → MAIN_GRAPH_ID（design-final 修订二：SQLite ADD COLUMN 静态禁 REFERENCES+
   *  非空 DEFAULT，NOT NULL DEFAULT 安全网自 DDL 移此——服务层恒显式，兜底=
   *  安全网；主控追认补强①锚定） */
  upsertNode(input: LineageNodeUpsert): LineageNode
  /** 删节点；关联边由 DDL CASCADE 承担。返回删行数 */
  removeNode(id: string): number
  /** [F-FOLDER-01] 按文献删节点（移出→未归档事务序 W2 第 2 步——paper_id 唯一
   *  由 INV-89 部分唯一索引保证单行）；返回删行数（0=无节点=移出幂等分支） */
  removeNodeByPaperId(paperId: string): number
  /** 新建或更新边；UNIQUE(from,to) 冲突 DDL 抛错（应用层守卫在 service）。
   *  [T3-P5] sub 列直写（input.sub 缺省=NULL=基础型默认样式） */
  upsertEdge(input: LineageEdgeUpsert): LineageEdge
  removeEdge(id: string): number
  /** 全图单读（nodes+edges；created_at,rowid 确定性序——库空=空数组合法态；
   *  排序契约归 service 读面 lineageOrder——repo 不业务排序，主控预裁） */
  listGraph(): { nodes: LineageNode[]; edges: LineageEdge[] }
  /** [T3-P3] paper_id 命中节点只读查（detail 装配——应用层一文献一节点；
   *  paper_id 无唯一约束，命中多条时 created_at,rowid 首条兜底；未命中 null） */
  nodeByPaperId(paperId: string): LineageNode | null
  /** [T3-P3] 节点度数只读查（双端计数——from/to 任一端命中均计一条） */
  edgeCountByNode(nodeId: string): number
  /** [T3-P5] 图级线型配置读（meta KV 'lineTypes' JSON+zod 校验+恒四组按
   *  base 枚举序补齐——空配置=四空组；缺组补空组） */
  getLineTypes(): LineTypeGroup[]
  /** [T3-P5] 图级线型配置整体替换（单通道原子写——守卫在 service；updated_at
   *  应用层刷新 ISO 值，弃 DDL DEFAULT） */
  setLineTypes(groups: LineTypeGroup[]): void
}

export function createLineageRepo(db: SqliteDb): LineageRepo {
  const upsertNodeStmt = db.prepare(
    `INSERT INTO lineage_nodes (id, paper_id, title, core_idea, year, x, y, tags, month, slot, folder_id, created_at, updated_at)
     VALUES (@id, @paperId, @title, @coreIdea, @year, @x, @y, @tags, @month, @slot, @folderId, @now, @now)
     ON CONFLICT(id) DO UPDATE SET
       paper_id = excluded.paper_id, title = excluded.title, core_idea = excluded.core_idea,
       year = excluded.year, x = excluded.x, y = excluded.y, tags = excluded.tags,
       month = excluded.month, slot = excluded.slot, folder_id = excluded.folder_id,
       updated_at = excluded.updated_at`
  )
  const upsertEdgeStmt = db.prepare(
    `INSERT INTO lineage_edges (id, from_node, to_node, label, kind, sub, via, created_at, updated_at)
     VALUES (@id, @fromNode, @toNode, @label, @kind, @sub, @via, @now, @now)
     ON CONFLICT(id) DO UPDATE SET
       from_node = excluded.from_node, to_node = excluded.to_node,
       label = excluded.label, kind = excluded.kind, sub = excluded.sub,
       via = excluded.via, updated_at = excluded.updated_at`
  )
  const nodeByIdStmt = db.prepare(`SELECT * FROM lineage_nodes WHERE id = ?`)
  const edgeByIdStmt = db.prepare(`SELECT * FROM lineage_edges WHERE id = ?`)
  const removeNodeStmt = db.prepare(`DELETE FROM lineage_nodes WHERE id = ?`)
  const removeNodeByPaperStmt = db.prepare(`DELETE FROM lineage_nodes WHERE paper_id = ?`)
  const removeEdgeStmt = db.prepare(`DELETE FROM lineage_edges WHERE id = ?`)
  const listNodesStmt = db.prepare(`SELECT * FROM lineage_nodes ORDER BY created_at, rowid`)
  const listEdgesStmt = db.prepare(`SELECT * FROM lineage_edges ORDER BY created_at, rowid`)
  // [T3-P3] detail 装配只读对（预编译单语句——值全参数绑定）
  const nodeByPaperIdStmt = db.prepare(
    `SELECT * FROM lineage_nodes WHERE paper_id = ? ORDER BY created_at, rowid LIMIT 1`
  )
  const edgeCountByNodeStmt = db.prepare(
    `SELECT COUNT(*) AS n FROM lineage_edges WHERE from_node = ? OR to_node = ?`
  )
  // [T3-P5] 图级线型配置 KV（010 迁移表——seed 空数组串）
  const getMetaStmt = db.prepare(`SELECT value FROM lineage_graph_meta WHERE key = ?`)
  const setLineTypesStmt = db.prepare(
    `INSERT INTO lineage_graph_meta (key, value, updated_at)
     VALUES ('lineTypes', @value, @now)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`
  )

  return {
    upsertNode(input: LineageNodeUpsert): LineageNode {
      const id = input.id ?? randomUUID()
      const now = new Date().toISOString()
      upsertNodeStmt.run({
        id,
        paperId: input.paperId,
        title: input.title,
        coreIdea: input.coreIdea,
        year: input.year,
        x: input.x,
        y: input.y,
        // F-LG14 写边界单点：null/缺省=NULL（清空语义）；数组=去重后 JSON 落库
        // （dedupe 单源 shared/models——service upsert/导入/应用内增删全经此口）
        tags: input.tags == null ? null : JSON.stringify(dedupeLineageTags(input.tags)),
        // T3-P5：缺省=NULL 落库（归一/守卫在 service——repo 薄）
        month: input.month ?? null,
        slot: input.slot ?? null,
        // F-FOLDER-01 写边界兜底（修订二——安全网自 NOT NULL DEFAULT 移此）：
        // 缺省=主图；service 恒显式（更新语义的「保持现图」解析在 service）
        folderId: input.folderId ?? MAIN_GRAPH_ID,
        now
      })
      return toNode(nodeByIdStmt.get(id) as LineageNodeRow)
    },

    removeNode(id: string): number {
      return removeNodeStmt.run(id).changes
    },

    removeNodeByPaperId(paperId: string): number {
      return removeNodeByPaperStmt.run(paperId).changes
    },

    upsertEdge(input: LineageEdgeUpsert): LineageEdge {
      const id = input.id ?? randomUUID()
      const now = new Date().toISOString()
      upsertEdgeStmt.run({
        id,
        fromNode: input.fromNode,
        toNode: input.toNode,
        label: input.label,
        kind: input.kind ?? 'tree',
        sub: input.sub ?? null,
        // [F-LINEAGE-02] 序列化口径 N-1：undefined/空数组→NULL（缺省=自动路由
        // 不产出 []——diff/脏检测零噪声）；不变量校验在 service 写面（repo 薄）
        via: input.via != null && input.via.length > 0 ? JSON.stringify(input.via) : null,
        now
      })
      return toEdge(edgeByIdStmt.get(id) as LineageEdgeRow)
    },

    removeEdge(id: string): number {
      return removeEdgeStmt.run(id).changes
    },

    listGraph(): { nodes: LineageNode[]; edges: LineageEdge[] } {
      return {
        nodes: (listNodesStmt.all() as LineageNodeRow[]).map(toNode),
        edges: (listEdgesStmt.all() as LineageEdgeRow[]).map(toEdge)
      }
    },

    nodeByPaperId(paperId: string): LineageNode | null {
      const r = nodeByPaperIdStmt.get(paperId) as LineageNodeRow | undefined
      return r === undefined ? null : toNode(r)
    },

    edgeCountByNode(nodeId: string): number {
      const r = edgeCountByNodeStmt.get(nodeId, nodeId) as { n: number }
      return r.n
    },

    getLineTypes(): LineTypeGroup[] {
      const row = getMetaStmt.get('lineTypes') as { value: string } | undefined
      // 恒四组补齐在 parseLineTypes（rows 件单源——zod 校验+base 枚举序缺组补空）
      return parseLineTypes(row === undefined ? '[]' : row.value)
    },

    setLineTypes(groups: LineTypeGroup[]): void {
      setLineTypesStmt.run({ value: JSON.stringify(groups), now: new Date().toISOString() })
    }
  }
}
