// b3: P7-H
/**
 * [SR2-LG-01] lineage.repo —— 脉络图数据基座（模型+草稿导入，工单：open / strong）
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
 * - **草稿导入（lineage JSON，ADR-0015 文件协议同精神）**：经 main 侧
 *   系统对话框选取 JSON（INV-07——dialog 在 ipc 层，corpusSession C-02
 *   同型）→zod 校验（shared/models/lineage.ts 新建单源：draft 节点=
 *   paper_id/title/year/core_idea；边=from_paper_id/to_paper_id/label；
 *   **v1 draft 仅文献节点**——纯主题节点=应用内手工创建（LG-03），不进
 *   draft 协议）→幽灵 paperId 拦截（papers 表存在性——AI-07 导入器同型）
 * →树约束校验（多父/环/自环→errors 清单）→**全有或全无**：校验任一
 *   失败→库不动+行级 errors 返回；全过→替换式导入（清面重灌——草稿
 *   迭代=整批替换语义，manifest 清空重建 AI-03 同族；人工修订保护=
 *   renderer 确认对话框「导入将替换现有脉络图」）
 * - repo 方法族（AI-01 六方法同型）：upsertNode/removeNode（级联边
 *   DDL 承担）/upsertEdge/removeEdge/listGraph（nodes+edges 全图单读）
 *   +clearGraph（替换式导入清面原语——AI-01 deleteByPaper 对应物，
 *   自裁申报：票面接口清单五方法+清面原语=六方法族）
 * - service 写面（本单交付，守卫同上）：upsertNode/upsertEdge（树守卫
 *   运行时二道防线——导入校验外的增量编辑入口）/removeNode/
 *   removeEdge——**IPC 四写通道的 schemas 注册归 LG-03**（消费者
 *   未建窗口），service 方法本单全建全测
 * - Result 形状：importDraft → { nodeCount, edgeCount } | errors:
 *   { path: string; reason: string }[]（中文 reason 含字段路径）
 *
 * ── 接口层 ──
 * - export interface LineageRepo { upsertNode(input): LineageNode;
 *     removeNode(id): number; upsertEdge(input): LineageEdge;
 *     removeEdge(id): number; listGraph(): { nodes: LineageNode[];
 *     edges: LineageEdge[] }; clearGraph(): void }
 * - export function createLineageService(deps)（repo+papers 存在性查询
 *   注入）：importDraft(raw: unknown) → ImportResult（校验纯函数
 *   validateDraft 单独导出可测——zod+幽灵+树三段）+四写方法（含
 *   upsertEdge 树守卫）+graph()
 * - IPC 面：**新立 lineage 域**（契约测试 10→11 域穷举 [locked-change]——
 *   契约扩展非放宽；ai_sensor 立域 AI-07 同型）：lineage/import（dialog
 *   驱动，Res=ImportResult）+lineage/graph（voidReq→全图）两通道；写
 *   四通道（upsert-node/remove-node/upsert-edge/remove-edge）**接口
 *   预留面在 LG-03 票面**（本单只立读+导入——消费者未建窗口）
 * - 交付面：migrations/004_lineage.sql+repos/lineage.repo.ts+services/
 *   lineage/lineage.service.ts（importDraft+graph+树校验+四写方法含
 *   upsertEdge 运行时守卫）+shared/models/lineage.ts（zod 单源）+
 *   ipc/lineage.ts+schemas/api-surface 受锁扩；**受锁新增清单（门一
 *   N4 处置）：migrations/004_lineage.sql（migrations/ 全目录受锁）+
 *   shared/models/lineage.ts（shared/ 全目录受锁）+新测试——三者均
 *   unlock→批内改→generate→apply+[locked-change] 尾注**
 *
 * ── 架构层 ──
 * - 分层：ipc → services → repos → db 单向（dialog 在 ipc 层；禁 service
 *   直写 SQL）；schemas 预编译+参数绑定（禁拼接——迁移 DDL 除 UNIQUE
 *   外无应用侧约束补写）
 * - 依赖：db（迁移执行器既有机制）、papers 只读存在性查询、shared/
 *   models/lineage（zod 单源受锁 [locked-change]）
 *
 * ── 生命周期层 ──
 * - 预留：v2 DAG 升级（存储免迁移——service 层放宽度=LG 组外新裁决）；
 *   merge 式导入（v2 候选——v1 替换式+确认对话框已闭环）
 * - 不做：lineage FTS（无检索诉求）；draft 含主题节点（v1 纯手工）；
 *   自动引文边（ADR-0012 维持不做——策展边语义 DDL 已辨析）
 *
 * ── 文化层 ──
 * - 错误：校验失败三段 errors 清单（zod 行级/幽灵篇级/树结构图级——
 *   path 前缀区分）；导入 IO 失败动作型上抛（消费方 toast INV-02）；
 *   禁静默吞错；库空=graph 空数组（合法态非错误）
 * - upsert 语义：ON CONFLICT(id) DO UPDATE（created_at 首插保留，
 *   updated_at 刷新）；UNIQUE(from_node,to_node) 冲突 DDL 抛错——
 *   应用层中文守卫在 service（repo 保持薄，异常原样上抛）
 * - listGraph 基础序=created_at,rowid 确定性兜底（插入序决胜——id=随机 uuid
 *   不作平局决胜键，uuid 彩票防雷；AI-01 同哲学；业务布局序归 LG-02）
 * - 测试：tests/unit/services/lineage-import.test.ts [受锁新增]——
 *   draft 合法全过替换重灌/幽灵 paperId 拦截/多父边拒绝/成环拒绝/
 *   自环拒绝/zod 非法字段行级 reason/空 draft=空图合法/重复边
 *   UNIQUE 收口中文 reason/树校验纯函数性质（同输入同输出）；
 *   **service upsertEdge 运行时守卫三拒绝路径单测（W1 宿主用例）**；
 *   repo 交互真库夹具（AI-01 测试同型）；**新测试 always-active**
 *   （不经 guardedDescribe——ADR-0017 裁决 3）
 * - 新增受锁测试随实现 locks:generate+apply+[locked-change] 尾注
 * - 完成后：删除 STUB → npm run verify 绿 → 人工审查 git diff → 翻 registry
 */
import { randomUUID } from 'node:crypto'
import type { LineageEdge, LineageEdgeUpsert, LineageNode, LineageNodeUpsert } from '../../../shared/models/lineage'
import type { SqliteDb } from '../connection'

export interface LineageRepo {
  /** 新建（id 缺省 randomUUID）或更新（created_at 保留，updated_at 刷新） */
  upsertNode(input: LineageNodeUpsert): LineageNode
  /** 删节点；关联边由 DDL CASCADE 承担。返回删行数 */
  removeNode(id: string): number
  /** 新建或更新边；UNIQUE(from,to) 冲突 DDL 抛错（应用层守卫在 service） */
  upsertEdge(input: LineageEdgeUpsert): LineageEdge
  removeEdge(id: string): number
  /** 全图单读（nodes+edges；created_at,rowid 确定性序——库空=空数组合法态） */
  listGraph(): { nodes: LineageNode[]; edges: LineageEdge[] }
  /** 替换式导入清面原语（先清边后清节点——导入器整批重灌，AI-01 deleteByPaper 对应物） */
  clearGraph(): void
}

/** lineage_nodes 表行形状（列名原样，蛇形） */
interface LineageNodeRow {
  id: string
  paper_id: string | null
  title: string
  core_idea: string
  year: number | null
  x: number | null
  y: number | null
  created_at: string
  updated_at: string
}

/** lineage_edges 表行形状（列名原样，蛇形） */
interface LineageEdgeRow {
  id: string
  from_node: string
  to_node: string
  label: string
  created_at: string
  updated_at: string
}

function toNode(row: LineageNodeRow): LineageNode {
  return {
    id: row.id,
    paperId: row.paper_id,
    title: row.title,
    coreIdea: row.core_idea,
    year: row.year,
    x: row.x,
    y: row.y,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

function toEdge(row: LineageEdgeRow): LineageEdge {
  return {
    id: row.id,
    fromNode: row.from_node,
    toNode: row.to_node,
    label: row.label,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

export function createLineageRepo(db: SqliteDb): LineageRepo {
  const upsertNodeStmt = db.prepare(
    `INSERT INTO lineage_nodes (id, paper_id, title, core_idea, year, x, y, created_at, updated_at)
     VALUES (@id, @paperId, @title, @coreIdea, @year, @x, @y, @now, @now)
     ON CONFLICT(id) DO UPDATE SET
       paper_id = excluded.paper_id, title = excluded.title, core_idea = excluded.core_idea,
       year = excluded.year, x = excluded.x, y = excluded.y, updated_at = excluded.updated_at`
  )
  const upsertEdgeStmt = db.prepare(
    `INSERT INTO lineage_edges (id, from_node, to_node, label, created_at, updated_at)
     VALUES (@id, @fromNode, @toNode, @label, @now, @now)
     ON CONFLICT(id) DO UPDATE SET
       from_node = excluded.from_node, to_node = excluded.to_node,
       label = excluded.label, updated_at = excluded.updated_at`
  )
  const nodeByIdStmt = db.prepare(`SELECT * FROM lineage_nodes WHERE id = ?`)
  const edgeByIdStmt = db.prepare(`SELECT * FROM lineage_edges WHERE id = ?`)
  const removeNodeStmt = db.prepare(`DELETE FROM lineage_nodes WHERE id = ?`)
  const removeEdgeStmt = db.prepare(`DELETE FROM lineage_edges WHERE id = ?`)
  const listNodesStmt = db.prepare(`SELECT * FROM lineage_nodes ORDER BY created_at, rowid`)
  const listEdgesStmt = db.prepare(`SELECT * FROM lineage_edges ORDER BY created_at, rowid`)
  const clearEdgesStmt = db.prepare(`DELETE FROM lineage_edges`)
  const clearNodesStmt = db.prepare(`DELETE FROM lineage_nodes`)

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
        now
      })
      return toNode(nodeByIdStmt.get(id) as LineageNodeRow)
    },

    removeNode(id: string): number {
      return removeNodeStmt.run(id).changes
    },

    upsertEdge(input: LineageEdgeUpsert): LineageEdge {
      const id = input.id ?? randomUUID()
      const now = new Date().toISOString()
      upsertEdgeStmt.run({
        id,
        fromNode: input.fromNode,
        toNode: input.toNode,
        label: input.label,
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

    clearGraph(): void {
      clearEdgesStmt.run() // 先清边（显式序；节点删除虽会级联，清面语义自持）
      clearNodesStmt.run()
    }
  }
}
