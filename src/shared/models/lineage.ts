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
 * 树单父约束（无多父/无环/无自环）不在 DDL——service 层不变量 INV-27，
 * 守卫宿主=services/lineage/lineage.service（upsertEdge 运行时口）。
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

// ── 综述题名判定（单一真相源，R2-LG12 §2 上移）────────────────────

/** 综述关键词（小写比对——大小写不敏感；决3 v1 关键词启发） */
export const SURVEY_KEYWORDS = ['综述', 'survey', 'review', '概述', '评述'] as const

/**
 * isSurveyTitle(title)：综述题名关键词启发（子串命中任一关键词即综述）。
 * 单源消费=service ref 边守卫（R2-LG12「from 必须是综述节点」）+renderer
 * lineage-classify re-export（classify/布局/渲染面零改动）——R2-LG11 出度
 * 修正教训=约束公式单源；误判人工修正通道=后续 D2 式字段增强票（不在 v1）。
 */
export function isSurveyTitle(title: string): boolean {
  const lower = title.toLowerCase()
  return SURVEY_KEYWORDS.some((kw) => lower.includes(kw))
}

// ── 应用面（camelCase——DB 行与写入口输入） ────────────────────────

export const lineageNodeSchema = z
  .object({
    id: z.string().min(1),
    /** 可空=纯主题节点（阶段分组，LG-03 手工创建） */
    paperId: z.string().min(1).nullable(),
    title: z.string().min(1),
    coreIdea: z.string(),
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
    /** F-LG14 节点标签（迁移 007 JSON 数组 TEXT 列；null=无标签不渲染）。
     *  optional 语义=输入面缺省同 null（整行 upsert 全量语义下「省略 tags」=
     *  清空标签——paperId/x/y 反向清空同款；类型面兼容存量夹具/旧调用点） */
    tags: z.array(z.string()).nullable().optional(),
    createdAt: z.string(),
    updatedAt: z.string()
  })
  .strict()
export type LineageNode = z.infer<typeof lineageNodeSchema>

/** 同节点同名标签去重（F-LG14 主控裁决 7）：首见序保留（Set 插入序）。
 *  单源消费=lineage.repo.upsertNode 写边界（service upsert/导入/detach 全
 *  走 repo 单点——DB 恒无重复标签；渲染/面板面按到达序展示） */
export function dedupeLineageTags(tags: readonly string[]): string[] {
  return [...new Set(tags)]
}

/** 边基础型（R2-LG12 用户裁决 A+F-LG15+T3-P5 四值）：tree=树边（单父不变量
 *  INV-27 原语义）/inferred=推断边（T3-P5 先行枚举——同 tree 守卫：单父+拒环；
 *  P5 无产生入口（P7 编辑器+后置 AI 域为入口），枚举+守卫先行防退化）/
 *  ref=参考边（综述节点→文献——service 层豁免单父、仍拒环、同端点对与 tree
 *  互斥；INV-27 修订版守卫宿主仍=service 写面）/manual=人工补父边（F-LG15
 *  用户裁决**不限条数**——service 豁免单父、仍拒环（环检测图=全部边含
 *  inferred）、同端点对与 tree/ref 互斥；draft 导入协议不收——edge schema
 *  无 kind 字段=tree 语义，manual 仅应用内手工创建） */
export const lineageEdgeKindSchema = z.enum(['tree', 'inferred', 'ref', 'manual'])
export type LineageEdgeKind = z.infer<typeof lineageEdgeKindSchema>

/** lineTypes 组基础型枚举序（恒四组排序键——graph 读面/导出按此序；T3-P5） */
export const LINE_TYPE_BASE_ORDER = ['tree', 'inferred', 'ref', 'manual'] as const

export const lineageEdgeSchema = z
  .object({
    id: z.string().min(1),
    fromNode: z.string().min(1),
    toNode: z.string().min(1),
    /** 逻辑线说明 */
    label: z.string(),
    kind: lineageEdgeKindSchema,
    /** [T3-P5] 子线型 id（lineTypes 引用）；null=基础型默认样式（样式层，
     *  不参与结构守卫——引用完整性守卫在 service 写面） */
    sub: z.string().nullable(),
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

/** [T3-P5] 子线型（图级样式配置——lineage_graph_meta KV JSON 承载） */
export const lineTypeSubSchema = z
  .object({
    /** 图内唯一（跨组全图唯一——upsertLineTypes 整批校验） */
    id: z.string().min(1),
    name: z.string().min(1),
    color: z.string(),
    /** 空串=实线 */
    dash: z.string(),
    w: z.number().positive()
  })
  .strict()
export type LineTypeSub = z.infer<typeof lineTypeSubSchema>

/** [T3-P5] 基础型线型组（base+子线型列表；恒四组各一——LINE_TYPE_BASE_ORDER） */
export const lineTypeGroupSchema = z
  .object({
    base: lineageEdgeKindSchema,
    subs: z.array(lineTypeSubSchema)
  })
  .strict()
export type LineTypeGroup = z.infer<typeof lineTypeGroupSchema>

/** 恒四组拒绝文案单源（F-CONSOL-02/k1-N2）：schema refine 与 write-guards reason 双侧消费，禁两处字面量 */
export const LINE_TYPE_GROUPS_REQUIRED_REASON = '线型配置必须恰含 tree/inferred/ref/manual 四组各一（空组含空 subs 列表）'

/** [T3-P5] upsertLineTypes 请求面强校验：恒四组（base 集合恰=四枚举值各一
 *  ——主控预裁 D-I-4；空组含 subs:[] 合法）。子线型 id 全图唯一与被引用
 *  sub 不得消失=service 写面守卫（运行时图状态相关，非 schema 面） */
export const lineTypeGroupsSchema = z
  .array(lineTypeGroupSchema)
  .refine(
    (groups) => {
      const bases = groups.map((g) => g.base)
      return (
        bases.length === LINE_TYPE_BASE_ORDER.length &&
        LINE_TYPE_BASE_ORDER.every((b) => bases.includes(b))
      )
    },
    { message: LINE_TYPE_GROUPS_REQUIRED_REASON }
  )
export type LineTypeGroups = z.infer<typeof lineTypeGroupsSchema>

/** upsert 输入面：id 缺省=新建（repo 生成 uuid）；提供=更新（created_at 保留）。
 *  边 kind 可选缺省 'tree'（R2-LG12——service 写路径显式填默认，不赖 DB DEFAULT）。
 *  [T3-P5] month/slot/sub 可选（缺省语义=undefined——归一/守卫在 service：
 *  month=input.month ?? null（全量语义同 tags/x/y 反向清空惯例）；slot 缺省走
 *  D-I-1 归一（新建=max+1/同组更新保留/跨组落组末）；sub 缺省=null 基础型）。
 *  [F-FOLDER-01] folderId 可选：undefined=新建落主图（repo 写边界兜底）/
 *  更新保持现图（service 解析既有值——W3：图归属变更不重排 slot 当 year/month
 *  不变）；显式提供（含跨图移动）经 service 存在性校验后透写【该显式跨图
 *  语义已随下段 LGCLN 收窄退役——历史句保留备溯】。
 *  [F-LGCLN-01 2026-09-30] 语义收窄（显式跨图路径退役——用户裁决「选图时对
 *  论文卡片已失焦，交互上不可构成=冗余逻辑删掉」）：folderId=**仅主题节点
 *  新建落图值**（当前图，幽灵值 service 拒）；更新场景被忽略（existing 在场
 *  恒现图——禁搬图）；文献节点显式值仅=归属合法（≠归属仍 CONFLICT——INV-88
 *  主句不动，节点跨图唯一合法路径=papers.moveFolder 文献随迁）。 */
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
    kind: lineageEdgeKindSchema.optional(),
    sub: z.string().nullable().optional()
  })
  .strict()
export type LineageEdgeUpsert = z.infer<typeof lineageEdgeUpsertSchema>
