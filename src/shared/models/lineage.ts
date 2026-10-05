/**
 * 脉络图（lineage）模型 —— lineage_nodes/lineage_edges 表的跨进程单源契约
 * （LG-01 交付面，已锁定）。
 *
 * schema 命名（主控裁决 3，[F-BAKRET-01] draft 面退役后仅存应用面）：
 * - 应用面（camelCase）：DB 行 schema（lineageNode/lineageEdge）与 upsert 输入面
 *   （id 缺省=新建 randomUUID；提供=更新，created_at 首插保留）。
 * - draft*（snake_case 文件面）草稿导入协议已随导入链退役删除（2026-09-30，
 *   ADR-0022——备份域归未来服务端多实体导出；lineage.json 导出面=assemble
 *   golden 锁定，与 draft 协议无共享 schema）。
 * 接缝锚定（INV-11）：DDL 真相=迁移 004（UNIQUE(from_node,to_node) 收口）；
 * 环约束（无环/无自环）不在 DDL——service 层守卫，宿主=services/lineage/
 * lineage.service（upsertEdge 运行时口）。
 * [F-LGRAPH-01②U8] kind 四值体系（tree/inferred/ref/manual）退役→manual
 * 单基型+边内联视觉字段（dashed/color——A3 仲裁）：kind/sub schema 字段删；
 * DB kind 列保留恒 'manual'、sub 列死置（读面不映射）——DDL 最小化免迁移；
 * 视觉列=迁移 014（dashed INTEGER/color TEXT NOT NULL DEFAULT）。综述题名
 * 判定（isSurveyTitle）随 ref 边体系全链退役（mockup §3.8 行 6）。
 */
import { z } from 'zod'

// ── 排序契约与呈现编号（T3-P5 唯一纯函数——读面/导出/C5 三处消费禁双实现）──

/**
 * [F-FOLDER-01] 节点→pubNo 视图 map（键=节点 id；值=该文献库级编号——主题节点
 * 无文献键=0 不呈现编号语义）。消费=LineageTimeline（TimelineYears 单次传入）。
 */
export function nodePubNoMap(
  nodes: readonly LineageNode[],
  pubNos: Readonly<Record<string, number>>
): Map<string, number> {
  return new Map(nodes.map((n) => [n.id, n.paperId !== null ? (pubNos[n.paperId] ?? 0) : 0]))
}

/**
 * [F-FOLDER-01] 主图文件夹 id 锚（迁移 012 字面量 '__main__'——存量单图承载；
 * repo 写边界兜底默认与服务层显式值共用单源；design-final 修订二：NOT NULL
 * DEFAULT 安全网自 DDL 移至 repo 写边界，见 lineage.repo upsertNode）。
 */
export const MAIN_GRAPH_ID = '__main__'

/**
 * lineageOrder(nodes)：脉络全序排序键（INV-75；design-final §4）=
 * `year IS NULL, year ASC, month IS NULL, month ASC, slot IS NULL,
 * slot ASC, created_at ASC, id ASC`（null 组末+行序 tiebreak 兜底——
 * 防御面：service 新写恒赋 slot、迁移回填后存量行有序，null/slot 平局
 * 只在库外手改数据时出现）。
 * 单源消费三处（W-5 禁双实现）：lineage.service graph 读面（消费方不得
 * 重排）、lineage.json 导出装配（export_/lineage.assemble）、
 * lineage.store 写回填（T3-P8 消费面）。纯函数：不改输入、返回新数组。
 * [F-FOLDER-01] 编号职责移交：原 catalogNo 呈现编号（lineageCatalogNos）
 * 已随 pubNo 库级派生（INV-92）退役删除——图内节点号与库号同源=pubNo。
 */
export function lineageOrder(nodes: readonly LineageNode[]): LineageNode[] {
  const nullLast = (v: number | null, o: number | null): number => {
    if (v === null && o === null) return 0
    if (v === null) return 1
    if (o === null) return -1
    return v - o
  }
  return [...nodes].sort((a, b) => {
    let d = nullLast(a.year, b.year)
    if (d !== 0) return d
    d = nullLast(a.month, b.month)
    if (d !== 0) return d
    d = nullLast(a.slot, b.slot)
    if (d !== 0) return d
    if (a.createdAt !== b.createdAt) return a.createdAt < b.createdAt ? -1 : 1
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0
  })
}

// ── 色行名体系（[F-LGRAPH-01②U8] manual 单基型+视觉线型——A3 仲裁）────

/**
 * [F-LGRAPH-01②U8] 线色板：6 色固定行（P-5 蓝/橙/绿/紫/灰/洋红，不可增行）。
 * hex 值=用户数据面（lineage_graph_meta 色行名配置与边 color 持久值的固定
 * 候选集——非组件 chrome 色）。前四色沿旧 PALETTE（蓝/橙/绿/紫），灰/洋红
 * 随 6 色定案新定值。消费方=renderer 工具组线型列表+repo 视觉列缺省。
 * [F-UIRES-03 C1] 首色蓝换深蓝 #1e3a8a（呈裁①用户亲裁——区分选中卡边框蓝
 * --accent；存量边单值迁移挂 015——migrations/015_lineage_edge_blue_recolor.sql）。
 */
export const LINE_TYPE_COLORS = ['#1e3a8a', '#c07a2a', '#0f8a6d', '#8a4fbf', '#8a8f98', '#c2447f'] as const

/**
 * [F-UIRES-03 C1] 线色 per-kind 双值（实/虚线各自独立当前色——INV-108
 * 「线色双值」：per-kind 独立互不影响；shared 单源〔N2〕，四消费面=
 * lineage-view.store/useDrawLine/LineageToolbar/LineageTimeline）。
 */
export interface LineTypeColorPair {
  solid: string
  dashed: string
}

/** [F-LGRAPH-01②U8] 未命名色行缺省名（mockup §3.3——「待命名」） */
export const LINE_TYPE_DEFAULT_NAME = '待命名'

/** [F-LGRAPH-01②U8] 色行数=色板长度（恰 6 行校验键——schema/service/repo 三面共用） */
export const LINE_TYPE_ROWS = LINE_TYPE_COLORS.length

/** [F-LGRAPH-01②U8] 缺省色行名（6×「待命名」——repo 读面容错降级值同源） */
export function defaultLineTypeNames(): string[] {
  return Array.from({ length: LINE_TYPE_ROWS }, () => LINE_TYPE_DEFAULT_NAME)
}

/**
 * [F-LGRAPH-01②U8] 色行名配置 schema（图级 lineage_graph_meta KV
 * 'lineTypeNames' JSON 承载——恰 6 行；空名归一「待命名」在 service 写面）。
 * 替代退役的 lineTypeGroupsSchema 恒四组校验（四组体系随 kind 四值退役）。
 */
export const lineTypeNamesSchema = z.array(z.string()).length(LINE_TYPE_ROWS)
export type LineTypeNames = z.infer<typeof lineTypeNamesSchema>

// ── 应用面（camelCase——DB 行与写入口输入） ────────────────────────

/** [A1b F-CONTRACTA-01 2026-10-04] 标签唯一源=文献库域（tags+paper_tags 表）：
 *  脉络节点不持有私有标签——本 schema 无 tags 字段即「标签唯一源」不变量锚
 *  （DB tags 列死置待 D 批清列，读面不映射/写面无该列）；
 *  [A3 F-CONTRACTA-01 2026-10-04] 核心想法域全退役——本 schema 无该字段
 *  （「核心想法」语义由全文笔记 notes.contentMd 承接；DB 同名列 NOT NULL
 *  DEFAULT '' 死置，清列归 D 批零迁移——tags 先例同型）。 */
export const lineageNodeSchema = z
  .object({
    id: z.string().min(1),
    /** 可空=纯主题节点（阶段分组，LG-03 手工创建） */
    paperId: z.string().min(1).nullable(),
    title: z.string().min(1),
    year: z.number().int().nullable(),
    /** [F-FOLDER-01] 节点图归属（=文件夹 id，1:1 绑定——迁移 012 列；
     *  读面恒非空：repo 写边界兜底 '__main__'+迁移回填封闭） */
    folderId: z.string().min(1),
    /** 手工位置覆盖（JSON Canvas 模式）；null=自动布局（LG-02 消费） */
    x: z.number().nullable(),
    y: z.number().nullable(),
    /** [T3-P5] 未定月框：null=年框未细分月（迁移 010 列+CHECK 1..12） */
    month: z.number().int().min(1).max(12).nullable(),
    /** [T3-P5] 月内序承载（D-P5-10 实现层列——无用户序号语义；P8 槽位重排
     *  =slot 值重排）。null=防御面兜底（service 新写恒赋值；迁移回填后存量行有序） */
    slot: z.number().int().min(0).nullable(),
    createdAt: z.string(),
    updatedAt: z.string()
  })
  .strict()
export type LineageNode = z.infer<typeof lineageNodeSchema>

/**
 * [F-LGRAPH-01②U8] 边视觉线型内联（A3 仲裁——sub 引用制退役）：dashed=虚线
 * 布尔+color=hex 色（值域=LINE_TYPE_COLORS 色板，落库无 CHECK——应用面写
 * 路径经工具组色板单源）；label=逻辑线说明（P-14：新画边继承当前线型名快照
 * ，线型改名不回传已画边）。kind 四值体系（tree/inferred/ref/manual）退役
 * ——DB kind 列保留恒 'manual'（A3：DDL 最小化，应用层收敛）。
 */
export const lineageEdgeSchema = z
  .object({
    id: z.string().min(1),
    fromNode: z.string().min(1),
    toNode: z.string().min(1),
    /** 逻辑线说明 */
    label: z.string(),
    /** 虚线=true（视觉线型内联——A3） */
    dashed: z.boolean(),
    /** 线色 hex（视觉线型内联——A3；缺省归一=色板首色深蓝 [F-UIRES-03 C1]） */
    color: z.string(),
    /** [F-LINEAGE-02] 手动调线中间路点（内容坐标，有序——design-final §2.1）。
     *  缺省=省略字段（undefined）**不产出 []**（N-1：空数组与缺省同义=自动
     *  路由，diff/脏检测零噪声）；端点不进 via（④=schema 形状面：点仅 x/y
     *  数值，fromNode/toNode 承载端点卡）；不变量 ①②③校验单源=
     *  validateLineageVia（service 写面调用，违者 INVALID_REQUEST） */
    via: z.array(z.object({ x: z.number(), y: z.number() })).optional(),
    createdAt: z.string(),
    updatedAt: z.string()
  })
  .strict()
export type LineageEdge = z.infer<typeof lineageEdgeSchema>

/** [F-LINEAGE-02] via 路点形状（schema 内联同形——toEdge 读面/编辑器写面共用） */
export interface LineageViaPoint {
  x: number
  y: number
}

/**
 * [F-LINEAGE-02 ①a] via 序列化校验纯函数（design-final §2.1 不变量 ①②③——
 * service upsertEdge 写面调用，违者 INVALID_REQUEST）：
 * - ① 相邻段轴对齐（via 链内相邻路点 x 或 y 相等——整条折线含端点锚的恒
 *   正交由编辑代数保证（§2.3 L 重建），序列化时点可检面=via 链内部）；
 * - ② 无重合点（相邻路点距 ≥1px，含边界）；
 * - ③ via.length≥1 才构成 manual-override（=0/缺省即自动路由——空数组过检，
 *   归一为缺省语义在 repo 写边界：NULL 落库）。
 * 返回 null=过检；字符串=中文拒绝 reason。
 */
export function validateLineageVia(via: readonly LineageViaPoint[]): string | null {
  for (const p of via) {
    // [回炉 R6/k1-N5] 有限数钳：Infinity/NaN 轴对齐恒真/距离恒假——单独拦
    if (!Number.isFinite(p.x) || !Number.isFinite(p.y)) {
      return `via 路点坐标必须为有限数（(${String(p.x)},${String(p.y)})——k1-N5 畸形 d 防线）`
    }
  }
  for (let i = 1; i < via.length; i++) {
    const a = via[i - 1]!
    const b = via[i]!
    if (a.x !== b.x && a.y !== b.y) {
      return `via 折线必须横平竖直（第 ${i} 段斜向：(${a.x},${a.y})→(${b.x},${b.y})——正交不变量 ①）`
    }
    const dx = b.x - a.x
    const dy = b.y - a.y
    if (dx * dx + dy * dy < 1) {
      return `via 相邻路点距离不足 1px（第 ${i} 对：(${a.x},${a.y})→(${b.x},${b.y})——无重合点不变量 ②）`
    }
  }
  return null
}

/** upsert 输入面：id 缺省=新建（repo 生成 uuid）；提供=更新（created_at 保留）。
 *  [F-LGRAPH-01②U8] 边 kind 字段退役（manual 单基型——repo 写边界恒 'manual'）；dashed/color 可选缺省归一在 repo（false/色板首色）。
 *  [F-ALIGN-01 D1 2026-10-04] 用途收窄：本类型=**repo 写面输入**（repo.upsertNode
 *  签名/write-guards normalizeMonthSlot 入参/import 挂接建节点与 moveFolder
 *  自动建/随迁的 repo 直调路径专用——内部建节点路径，不经 IPC）。IPC 契约面
 *  已随旧节点写通道退役删除（2026-10-04 对齐批 D1；现通道=patch-node，载荷=既有节点
 *  编辑 patch——见 ipc/schemas lineagePatchNodeReqSchema；新建形态对 IPC 面
 *  结构性不可表达，INV-NEW-1）。
 *  [T3-P5] month/slot/sub 可选（缺省语义=undefined——归一/守卫在 service：
 *  month=input.month ?? null（全量语义同 x/y 反向清空惯例）；slot 缺省走
 *  D-I-1 归一（新建=max+1/同组更新保留/跨组落组末）；sub 缺省=null 基础型）。
 *  [F-FOLDER-01] folderId 可选：undefined=新建落主图（repo 写边界兜底）/
 *  更新保持现图（service 解析既有值——W3：图归属变更不重排 slot 当 year/month
 *  不变）；显式提供（含跨图移动）经 service 存在性校验后透写【该显式跨图
 *  语义已随下段 LGCLN 收窄退役——历史句保留备溯】。
 *  [F-LGCLN-01 2026-09-30] 语义收窄（显式跨图路径退役——用户裁决「选图时对
 *  论文卡片已失焦，交互上不可构成=冗余逻辑删掉」）：folderId 显式值唯一合法
 *  消费=moveFolder 随迁路径（恒显式携 slot 主权值——normalizeMonthSlot 透传）；
 *  [F-ALIGN-01] 主题节点新建落图值语义随主题节点应用层退役消亡（节点唯一
 *  来源=入库/移动两路——INV-NEW-1）。 */
export const lineageNodeUpsertSchema = lineageNodeSchema
  .omit({ createdAt: true, updatedAt: true })
  .extend({
    id: z.string().min(1).optional(),
    folderId: z.string().min(1).optional(),
    month: z.number().int().min(1).max(12).nullable().optional(),
    slot: z.number().int().min(0).nullable().optional()
  })
  .strict()
export type LineageNodeUpsert = z.infer<typeof lineageNodeUpsertSchema>

export const lineageEdgeUpsertSchema = lineageEdgeSchema
  .omit({ createdAt: true, updatedAt: true })
  .extend({
    id: z.string().min(1).optional(),
    /** [F-LGRAPH-01②U8] dashed/color 可选（缺省=false/色板首色——repo 写边界
     *  归一；编辑器全载荷合成[流会话动作]恒显式携值） */
    dashed: z.boolean().optional(),
    color: z.string().optional()
  })
  .strict()
export type LineageEdgeUpsert = z.infer<typeof lineageEdgeUpsertSchema>
