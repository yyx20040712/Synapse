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

/** 边类型（R2-LG12 用户裁决 A+F-LG15 用户小需求）：tree=树边（单父不变量
 *  INV-27 原语义）/ref=参考边（综述节点→文献——service 层豁免单父、仍拒环、
 *  同端点对与 tree 互斥；INV-27 修订版守卫宿主仍=service 写面）/manual=人工
 *  补父边（F-LG15 用户裁决**不限条数**——service 豁免单父、仍拒环（环检测
 *  图=tree+ref+manual 全部边）、同端点对与 tree/ref 互斥；draft 导入协议
 *  不收——edge schema 无 kind 字段=tree 语义，manual 仅应用内手工创建） */
export const lineageEdgeKindSchema = z.enum(['tree', 'ref', 'manual'])
export type LineageEdgeKind = z.infer<typeof lineageEdgeKindSchema>

export const lineageEdgeSchema = z
  .object({
    id: z.string().min(1),
    fromNode: z.string().min(1),
    toNode: z.string().min(1),
    /** 逻辑线说明 */
    label: z.string(),
    kind: lineageEdgeKindSchema,
    createdAt: z.string(),
    updatedAt: z.string()
  })
  .strict()
export type LineageEdge = z.infer<typeof lineageEdgeSchema>

/** upsert 输入面：id 缺省=新建（repo 生成 uuid）；提供=更新（created_at 保留）。
 *  边 kind 可选缺省 'tree'（R2-LG12——service 写路径显式填默认，不赖 DB DEFAULT） */
export const lineageNodeUpsertSchema = lineageNodeSchema
  .omit({ createdAt: true, updatedAt: true })
  .extend({ id: z.string().min(1).optional() })
  .strict()
export type LineageNodeUpsert = z.infer<typeof lineageNodeUpsertSchema>

export const lineageEdgeUpsertSchema = lineageEdgeSchema
  .omit({ createdAt: true, updatedAt: true })
  .extend({ id: z.string().min(1).optional(), kind: lineageEdgeKindSchema.optional() })
  .strict()
export type LineageEdgeUpsert = z.infer<typeof lineageEdgeUpsertSchema>
