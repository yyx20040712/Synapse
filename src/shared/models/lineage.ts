/**
 * 脉络图（lineage）模型 —— lineage_nodes/lineage_edges 表与 draft 导入协议的
 * 跨进程单源契约（LG-01 交付面，已锁定）。
 *
 * 两套 schema 分开命名（主控裁决 3）：
 * - draft*（snake_case 文件面）：lineage JSON 草稿导入协议（ADR-0014 §裁决——
 *   梳理智能体产物经文件协议导入，ADR-0015 同精神）。v1 draft 仅文献节点
 *   （纯主题节点=应用内手工创建，LG-03，不进 draft 协议）。行级中文错误消息
 *   （required_error/invalid_type_error）=zod 层校验面单源。
 * - 应用面（camelCase）：DB 行 schema（lineageNode/lineageEdge）与 upsert 输入面
 *   （id 缺省=新建 randomUUID；提供=更新，created_at 首插保留）。
 * 接缝锚定（INV-11）：DDL 真相=迁移 004（UNIQUE(from_node,to_node) 收口）；
 * 树单父约束（无多父/无环/无自环）不在 DDL——service 层不变量 INV-27，
 * 守卫宿主=services/lineage/lineage.service（导入校验+upsertEdge 运行时双口）。
 */
import { z } from 'zod'

// ── 排序契约与呈现编号（T3-P5 唯一纯函数——读面/导出/C5 三处消费禁双实现）──

/**
 * lineageOrder(nodes)：脉络全序排序键（INV-75；design-final §4）=
 * `year IS NULL, year ASC, month IS NULL, month ASC, slot IS NULL,
 * slot ASC, created_at ASC, id ASC`（null 组末+行序 tiebreak 兜底——
 * 防御面：service 新写恒赋 slot、迁移回填后存量行有序，null/slot 平局
 * 只在库外手改数据时出现）。
 * 单源消费三处（W-5 禁双实现）：lineage.service graph 读面（消费方不得
 * 重排）、lineage.json 导出装配（export_/lineage.assemble）、library.service
 * C5 join（catalogNo map）。纯函数：不改输入、返回新数组。
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

/**
 * lineageCatalogNos(nodes)：呈现时确定性编号（INV-76；design-final §6）——
 * 按 lineageOrder 全序计算 1..N，不落库不作业务主键；同图状态同序列。
 * 单源消费：lineage.json 导出（catalog_no）+library.service C5（list 挂键/
 * detail 短号）——两处经本函数与 lineageOrder 同序，禁各自 indexOf 重算。
 */
export function lineageCatalogNos(nodes: readonly LineageNode[]): Map<string, number> {
  const m = new Map<string, number>()
  lineageOrder(nodes).forEach((n, i) => m.set(n.id, i + 1))
  return m
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

// ── draft 导入协议（snake_case 文件面，ADR-0014 字面） ─────────────

export const lineageDraftNodeSchema = z
  .object({
    paper_id: z
      .string({ required_error: 'paper_id 缺失', invalid_type_error: 'paper_id 应为字符串' })
      .min(1, 'paper_id 不能为空'),
    title: z
      .string({ required_error: 'title 缺失', invalid_type_error: 'title 应为字符串' })
      .min(1, 'title 不能为空'),
    year: z
      .number({ required_error: 'year 缺失', invalid_type_error: 'year 应为数字' })
      .int('year 应为整数')
      .nullable(),
    core_idea: z.string({
      required_error: 'core_idea 缺失',
      invalid_type_error: 'core_idea 应为字符串'
    }),
    /** F-LG14 可选标签（口径=草稿带为主，导入即有；缺省省略=旧版草稿零破坏
     *  ——ADR-0014 修订记录 v1.1：v1 加可选字段=向后兼容）。元素=非空字符串
     *  （空串标签无语义拒收）；同节点同名标签去重=repo 写边界单源
     *  dedupeLineageTags（本文件导出）。 */
    tags: z
      .array(
        z.string({ invalid_type_error: '标签应为字符串' }).min(1, '标签不能为空字符串'),
        { invalid_type_error: 'tags 应为数组' }
      )
      .optional(),
    /** [T3-P5] 导入协议 v1.2 仅新增 month（缺省=null 未定月——design-final
     *  §1/D-P5-8：其余字段 optional 化=越权契约放松，弃）。标题/核心思想必填
     *  面零动。 */
    month: z
      .number({ invalid_type_error: 'month 应为数字' })
      .int('month 应为整数')
      .min(1, 'month 应在 1..12')
      .max(12, 'month 应在 1..12')
      .nullable()
      .optional()
  })
  .strict()
export type LineageDraftNode = z.infer<typeof lineageDraftNodeSchema>

export const lineageDraftEdgeSchema = z
  .object({
    from_paper_id: z
      .string({
        required_error: 'from_paper_id 缺失',
        invalid_type_error: 'from_paper_id 应为字符串'
      })
      .min(1, 'from_paper_id 不能为空'),
    to_paper_id: z
      .string({
        required_error: 'to_paper_id 缺失',
        invalid_type_error: 'to_paper_id 应为字符串'
      })
      .min(1, 'to_paper_id 不能为空'),
    label: z.string({ required_error: 'label 缺失', invalid_type_error: 'label 应为字符串' })
  })
  .strict()
export type LineageDraftEdge = z.infer<typeof lineageDraftEdgeSchema>

export const lineageDraftSchema = z
  .object({
    nodes: z.array(lineageDraftNodeSchema, {
      required_error: 'nodes 缺失',
      invalid_type_error: 'nodes 应为数组'
    }),
    edges: z.array(lineageDraftEdgeSchema, {
      required_error: 'edges 缺失',
      invalid_type_error: 'edges 应为数组'
    })
  })
  .strict()
export type LineageDraft = z.infer<typeof lineageDraftSchema>

// ── 应用面（camelCase——DB 行与写入口输入） ────────────────────────

export const lineageNodeSchema = z
  .object({
    id: z.string().min(1),
    /** 可空=纯主题节点（阶段分组，LG-03 手工创建） */
    paperId: z.string().min(1).nullable(),
    title: z.string().min(1),
    coreIdea: z.string(),
    year: z.number().int().nullable(),
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
    createdAt: z.string(),
    updatedAt: z.string()
  })
  .strict()
export type LineageEdge = z.infer<typeof lineageEdgeSchema>

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
    { message: '线型配置必须恰含 tree/inferred/ref/manual 四组各一（空组含空 subs 列表）' }
  )
export type LineTypeGroups = z.infer<typeof lineTypeGroupsSchema>

/** upsert 输入面：id 缺省=新建（repo 生成 uuid）；提供=更新（created_at 保留）。
 *  边 kind 可选缺省 'tree'（R2-LG12——service 写路径显式填默认，不赖 DB DEFAULT）。
 *  [T3-P5] month/slot/sub 可选（缺省语义=undefined——归一/守卫在 service：
 *  month=input.month ?? null（全量语义同 tags/x/y 清空惯例）；slot 缺省走
 *  D-I-1 归一（新建=max+1/同组更新保留/跨组落组末）；sub 缺省=null 基础型） */
export const lineageNodeUpsertSchema = lineageNodeSchema
  .omit({ createdAt: true, updatedAt: true })
  .extend({
    id: z.string().min(1).optional(),
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
