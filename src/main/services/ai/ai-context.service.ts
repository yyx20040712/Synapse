/**
 * [F-DBCAMP-01 DB-2 U2b-2a] ai-context.service —— 上下文装配引擎（§3.C 三级
 * 结构前两级：L1 骨架常驻+L2 结构摘录；L3 尾段现算=U2b-2b 面批，本件禁触碰）。
 *
 * ── INV-J（落地句，v171 §1-3 预登记面本批兑现）──
 * 前缀注入面⊆epoch 集合 10 物理表（EPOCH_TABLES——papers/collections/tags/
 * paper_tags/notes/annotations/lineage_graph_meta/lineage_nodes/lineage_edges/
 * ai_memory）。一切进入 L1/L2 前缀的数据源必须属该集合：ctx_ver 前进⇒前缀缓存
 * 失效的正确性前提（集合外数据变更不推进 ctx_ver=陈旧缓存）。ai_sessions/
 * ai_messages/ai_tasks/ai_task_audit 不入集合（消息=现算尾段——U2b-2b 面、
 * 任务/审计不进 prompt——020 头注既有结论）。声明处=本头注+docs/invariants.md；
 * 强制=装配源清单对账测试+020 epoch 元测试。
 *
 * ── 行为层 ──
 * - 形态校验前置（沿裁③）：scope∈三值集/global 带 anchorId≠null 拒/paper·
 *   lineage anchorId null 或空串拒——INVALID_REQUEST。
 * - 同步函数（纯读装配——searchMemory 同步语义面先例）。
 * - **字节相等四威胁清单**（同键两次装配 prefix===——缓存正确性前提）：
 *   ①时间/随机——装配路径禁 Date.now/Math.random；②迭代序——一切循环吃
 *   显式排序键（对象数组 sort 无 comparator 禁）；③浮点——估计器整数算术
 *   （ai-estimate）；④locale——禁 toLocaleString/localeCompare/Intl。
 * - L1 三档：paper=锚摘要+记忆索引；global=能力清单（冻结文案）+记忆索引；
 *   lineage=骨架常驻（脉络图头/文献星标序/连线/标签/笔记在档/记忆索引——
 *   08:59 三轮终态）。节点序=is_starred DESC→度数 DESC→(title ASC,id ASC)；
 *   大图护栏 LINEAGE_NODE_GUARD 截断+meta.l1Truncated(node-guard-120)；
 *   截断态连线=仅两端均在保留集（边序 id ASC）；L1 cap 兜底（三档通用，
 *   reason='l1-cap'——与护栏并发时后写覆盖，最终截断面为准）。
 * - L2 三档片系统：片=单行摘录经 truncateToTokens(片cap)；片为原子单位——
 *   合计超 L2_CAP 从排序尾部整片舍弃（不截半片）+meta.l2Dropped（P6：正常
 *   路径数学恒不触发，防御分支经 caps 注入测试）。配额=上限非填充义务
 *   （实际片数=min(配额,锚过滤行数)）。
 * - 排序键三型（INV-129——r1 d1-W2 勘误对账口径）：A 型 (updated_at DESC,
 *   id DESC)=片/索引实际消费 A 型序的源 annotations/ai_memory/notes（notes 片
 *   随 r1 d1-W1 补序；papers/collections=主键单行源无排序面）；B 型 (id ASC)=
 *   B 型 3 表 tags/collections/paper_tags；C 型=(updated_at DESC,key DESC)=
 *   lineage_graph_meta（结构性恒空——P14 键面无锚关联，防御在档）。第四序
 *   （三型外特例）：笔记在档 presence 清单 notesTitlesByFolder=(title ASC,
 *   id ASC)——确定性全序。
 * - meta 纪律：确定性生成——prefix 字节相等=硬断言（===），meta 相等=软断言
 *   （toEqual）。
 *
 * ── 架构层 ──
 * - SQL 全在 ai-context.repo（service 零 SQL）；物理缓存不在本批（Map/LRU/
 *   持久化=未来对话管线批——本件只保证字节相等性）。
 * - caps 注入面=测试专用（整片舍弃/护栏/L1 cap 兜底触发面）；生产=默认常量。
 *
 * ── 文化层 ──
 * - 测试：tests/unit/services/ai-context.service.test.ts（always-active 真库）。
 */
import type { AiScope } from '../../db/repos/ai-sessions.repo'
import type { Repos } from '../../db/repos'
import { EPOCH_TABLES } from '../../db/repos/ai-context.repo'
import { estimateTokens, truncateToTokens } from './ai-estimate'
import { AiDomainError, AI_SCOPES } from './ai-sessions.service'
import { AI_MEMORY_CATEGORIES } from './ai-tasks.actions'

/** 片 cap（报告 §3.C——单行摘录截断阈值；校准批可调） */
export const PIECE_TOKEN_CAP = 120

/** L1 骨架 cap（三档——报告预算表初值） */
export const L1_CAP: Record<AiScope, number> = { paper: 800, lineage: 1800, global: 600 }

/** L2 片段合计 cap（三档） */
export const L2_CAP: Record<AiScope, number> = { paper: 2200, lineage: 600, global: 1200 }

/** paper 档 L2 片配额（合计 15——配额=上限非填充义务）。
 *  [r1 k3-N2] note/metadata/folder 三键=预算文档面——片数结构性吸收（单笔记
 *  模型恒 1 片/papers 单行拆 2 片/文件夹恒 1 行），非死键（配额=报告预算表口径） */
export const L2_QUOTA_PAPER: Record<'note' | 'annotation' | 'tag' | 'metadata' | 'folder', number> = {
  note: 5,
  annotation: 4,
  tag: 3,
  metadata: 2,
  folder: 1
}

/** lineage 档 L2 片配额（图元 2 片=恒空源 P14→实际恒 1 片） */
export const L2_QUOTA_LINEAGE: Record<'graphMeta' | 'folder', number> = { graphMeta: 2, folder: 1 }

/** global 档记忆片配额上限（实际=6 类×top-1——P1，上限自然吸收） */
export const L2_QUOTA_GLOBAL_MEMORY = 8

/** 大图护栏（骨架轻化后阈值——08:59 终态） */
export const LINEAGE_NODE_GUARD = 120

// EPOCH_TABLES 定义单源=db 层（表名知识——服务层禁反向定义；本 re-export 供
// 测试同源对账 INV-J）
export { EPOCH_TABLES }

/** global 档能力清单（冻结文案——9 动作+任务派发说明+记忆管理概述；测试断言在场） */
const GLOBAL_CAPABILITY_LINES: readonly string[] = [
  '可用动作（9 项白名单）：memory.create / memory.update / memory.delete / memory.pin / memory.unpin / memory.search / memory.list / message.pin / message.unpin',
  '任务派发：全局会话为助手任务域（不承载研究内容）；操作 paper/lineage 资源须在任务中显式声明目标（scope+anchorId），跨锚任务合法（围栏=档级）。',
  '记忆管理：可创建/更新/删除/置顶/检索/列举记忆（global 档=用户偏好与能力域记忆；三档完全隔离——本会话仅见 global 档）。'
]

export interface AssemblePrefixRequest {
  scope: AiScope
  anchorId: string | null
}

export interface AssembleMeta {
  /** L1 cap 兜底/大图护栏（reason='l1-cap'|'node-guard-120'） */
  l1Truncated?: { section: string; reason: string }
  /** L2 整片舍弃（防御分支——按源聚合计数，舍弃序） */
  l2Dropped?: Array<{ source: string; dropped: number }>
  /** 空片源（graph_meta 恒空/folder 一跳落空/笔记无行——结构性空源标注） */
  emptySources: string[]
}

export interface AssemblePrefixResult {
  cacheKey: string
  prefix: string
  meta: AssembleMeta
}

/** 装配预算（默认=冻结常量；caps 注入=测试触发面） */
export interface ContextCaps {
  pieceTokenCap: number
  l1Cap: Record<AiScope, number>
  l2Cap: Record<AiScope, number>
}

/** caps 覆盖形状（内外皆部分——测试只注入触发面所需档位） */
export type ContextCapsOverride = {
  [K in keyof ContextCaps]?: Partial<ContextCaps[K]>
}

export interface AiContextService {
  assemblePrefix(req: AssemblePrefixRequest): AssemblePrefixResult
}

/** 码点序比较（禁 localeCompare——字节相等威胁④；短字典序=确定性全序） */
function cmpStr(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0
}

/** authors_json 解析（防御：非数组/损坏 JSON→空清单——装配不炸） */
function parseAuthors(json: string): string[] {
  try {
    const parsed: unknown = JSON.parse(json)
    if (!Array.isArray(parsed)) return []
    return parsed.filter((a): a is string => typeof a === 'string')
  } catch {
    return []
  }
}

interface Piece {
  source: string
  text: string
}

export function createAiContextService(deps: {
  repos: Repos
  caps?: ContextCapsOverride
}): AiContextService {
  const { aiContext } = deps.repos
  const caps: ContextCaps = {
    pieceTokenCap: deps.caps?.pieceTokenCap ?? PIECE_TOKEN_CAP,
    l1Cap: { ...L1_CAP, ...deps.caps?.l1Cap },
    l2Cap: { ...L2_CAP, ...deps.caps?.l2Cap }
  }

  /** 记忆标题索引行（L1 三档共用——分类定义序冻结；无记忆=单行占位） */
  function memoryIndexLines(scope: AiScope, anchorId: string | null): string[] {
    const entries = aiContext.memoryCategoryIndex(scope, anchorId)
    if (entries.length === 0) return ['（暂无记忆）']
    const defOrder = AI_MEMORY_CATEGORIES[scope]
    const ordered = [...entries].sort(
      (a, b) => defOrder.indexOf(a.category) - defOrder.indexOf(b.category)
    )
    return ordered.map(
      (e) =>
        `- ${e.category}×${e.count} ` +
        `置顶[${e.pinnedTop3.map((t) => t.title).join('|')}] ` +
        `最近[${e.recent3.map((t) => t.title).join('|')}]`
    )
  }

  /** L1 paper 档：锚摘要+记忆索引 */
  function buildL1Paper(anchorId: string, meta: AssembleMeta): string {
    const p = aiContext.paperOverview(anchorId)
    let head: string
    if (p === null) {
      head = '【文献档案】（未知锚）'
      meta.emptySources.push('paper')
    } else {
      const authors = parseAuthors(p.authorsJson)
      const authorsText =
        authors.length > 3 ? `${authors.slice(0, 3).join('，')}等` : authors.join('，')
      head = `【文献档案】${p.title}（${p.year ?? '-'}|${p.venue}）作者：${authorsText}`
    }
    return [head, '【记忆索引】', ...memoryIndexLines('paper', anchorId)].join('\n')
  }

  /** L1 global 档：能力清单+记忆索引（scope='global' 本档隔离） */
  function buildL1Global(): string {
    return [
      '【能力清单】',
      ...GLOBAL_CAPABILITY_LINES,
      '【记忆索引】',
      ...memoryIndexLines('global', null)
    ].join('\n')
  }

  /** L1 lineage 档：骨架常驻（节点序/护栏/连线过滤——08:59 三轮终态） */
  function buildL1Lineage(anchorId: string, meta: AssembleMeta): string {
    const anchorName = aiContext.collectionName(anchorId) ?? '（未知锚）'
    const graph = aiContext.lineageGraphByFolder(anchorId)
    const starred = aiContext.starredIdsInFolder(anchorId)
    // 度数=全边集双端计数（护栏前全集——度数语义不随截断漂移）
    const degree = new Map<string, number>()
    for (const e of graph.edges) {
      degree.set(e.fromNode, (degree.get(e.fromNode) ?? 0) + 1)
      degree.set(e.toNode, (degree.get(e.toNode) ?? 0) + 1)
    }
    const ordered = [...graph.nodes].sort((a, b) => {
      const sa = a.paperId !== null && starred.has(a.paperId) ? 1 : 0
      const sb = b.paperId !== null && starred.has(b.paperId) ? 1 : 0
      if (sa !== sb) return sb - sa
      const da = degree.get(a.id) ?? 0
      const db = degree.get(b.id) ?? 0
      if (da !== db) return db - da
      return cmpStr(a.title, b.title) || cmpStr(a.id, b.id)
    })
    const truncated = ordered.length > LINEAGE_NODE_GUARD
    const nodes = truncated ? ordered.slice(0, LINEAGE_NODE_GUARD) : ordered
    if (truncated) {
      meta.l1Truncated = { section: '文献', reason: `node-guard-${LINEAGE_NODE_GUARD}` }
    }
    const lines = [
      `【脉络图】${anchorName}（${graph.nodes.length} 节点${
        truncated ? `，已截断至 ${LINEAGE_NODE_GUARD}——护栏` : ''
      }）`
    ]
    const byId = new Map(nodes.map((n) => [n.id, n]))
    for (const n of nodes) {
      const star = n.paperId !== null && starred.has(n.paperId) ? '★' : ''
      lines.push(`【文献】${star}${n.title}（${n.year ?? '-'}）`)
    }
    const keptIds = new Set(nodes.map((n) => n.id))
    const edges = graph.edges
      .filter((e) => keptIds.has(e.fromNode) && keptIds.has(e.toNode))
      .sort((a, b) => cmpStr(a.id, b.id))
    for (const e of edges) {
      const from = byId.get(e.fromNode)
      const to = byId.get(e.toNode)
      if (from === undefined || to === undefined) continue
      lines.push(`【连线】${from.title} → ${to.title}〔${e.label}〕`)
    }
    const tagNames = aiContext.tagNamesByFolder(anchorId)
    lines.push(`【标签】${tagNames.length > 0 ? tagNames.join('、') : '（无）'}`)
    const noteTitles = aiContext.notesTitlesByFolder(anchorId)
    lines.push(`【笔记在档】${noteTitles.length > 0 ? noteTitles.join('、') : '（无）'}`)
    lines.push('【记忆索引】', ...memoryIndexLines('lineage', anchorId))
    return lines.join('\n')
  }

  /** L2 paper 档：15 片配额（元数据 2/笔记 ≤1/标注 4/标签 3/文件夹 1） */
  function buildL2Paper(anchorId: string, meta: AssembleMeta): Piece[] {
    const pieces: Piece[] = []
    const piece = (source: string, raw: string): void => {
      pieces.push({ source, text: truncateToTokens(raw, caps.pieceTokenCap) })
    }
    const p = aiContext.paperOverview(anchorId)
    if (p === null) {
      meta.emptySources.push('paper')
    } else {
      // 元数据 A/B 两片（papers 单行拆）
      piece('metadata', `[发表] ${p.year ?? '-'}|${p.venue}|doi:${p.doi ?? '-'}|arxiv:${p.arxivId ?? '-'}`)
      piece('metadata', `[摘要] ${p.abstract}`)
    }
    const note = aiContext.notesOf(anchorId)
    if (note !== null) {
      // P13：notes 单笔记模型（repo upsert per paper 恒 1 行）——配额 5 自然吸收
      piece('note', `[笔记] |${note.contentMd}`)
    } else {
      meta.emptySources.push('note')
    }
    for (const a of aiContext.annotationsForContext(anchorId, L2_QUOTA_PAPER.annotation)) {
      const body = a.quoteText !== '' ? a.quoteText : a.comment
      piece('annotation', `[标注] p${a.page}${a.kind}|${body}`)
    }
    for (const name of aiContext.tagNamesForContext(anchorId, L2_QUOTA_PAPER.tag)) {
      piece('tag', `[标签] ${name}`)
    }
    const folder = aiContext.folderNameOf(anchorId)
    if (folder !== null) {
      piece('folder', `[文件夹] ${folder}`)
    } else {
      // 016 后 NOT NULL+FK 结构性不触达——防御分支
      meta.emptySources.push('folder')
    }
    return pieces
  }

  /** L2 lineage 档：图元 2 片=恒空源（P14）+文件夹 1 片 → 实际恒 1 片 */
  function buildL2Lineage(anchorId: string, meta: AssembleMeta): Piece[] {
    meta.emptySources.push('graph_meta')
    const name = aiContext.collectionName(anchorId)
    if (name === null) {
      meta.emptySources.push('folder')
      return []
    }
    return [{ source: 'folder', text: truncateToTokens(`[文件夹] ${name}`, caps.pieceTokenCap) }]
  }

  /** L2 global 档：类定义序迭代，每类 top-1 一片（类空不占位——P1） */
  function buildL2Global(): Piece[] {
    const defOrder = AI_MEMORY_CATEGORIES.global
    const top1 = aiContext
      .memoryTop1ByCategory('global', null)
      .sort((a, b) => defOrder.indexOf(a.category) - defOrder.indexOf(b.category))
      .slice(0, L2_QUOTA_GLOBAL_MEMORY)
    return top1.map((row) => ({
      source: 'memory',
      text: truncateToTokens(`[记忆:${row.category}] ${row.title}|${row.content}`, caps.pieceTokenCap)
    }))
  }

  return {
    assemblePrefix(req) {
      // 形态校验前置（沿裁③：形态先于一切读面）
      if (!AI_SCOPES.includes(req.scope)) {
        throw new AiDomainError('INVALID_REQUEST', '非法上下文范围（仅 paper/lineage/global）')
      }
      if (req.scope === 'global' && req.anchorId !== null) {
        throw new AiDomainError('INVALID_REQUEST', '全局上下文不接受锚')
      }
      if (req.scope !== 'global' && (req.anchorId === null || req.anchorId === '')) {
        throw new AiDomainError('INVALID_REQUEST', '该上下文范围必须指定锚')
      }
      const anchorId = req.anchorId
      const ctxVer = aiContext.getEpochVector()
      // [r1 k3-N4] 键前提登记：anchorId 字符集不含 '|'（id 生成面=uuid/DOI 派生/
      // '__main__'——含 '|' 则 '|' 分隔键歧义=未声明假设（防御面=锚存在性闸上游
      // 生成面零 '|' 输出，本层不重复校验）
      const cacheKey = `${req.scope}|${anchorId ?? ''}|${ctxVer}`
      const meta: AssembleMeta = { emptySources: [] }

      // ── L1（三档骨架）──
      let l1: string
      let l2Pieces: Piece[]
      if (req.scope === 'paper') {
        l1 = buildL1Paper(anchorId!, meta)
        l2Pieces = buildL2Paper(anchorId!, meta)
      } else if (req.scope === 'lineage') {
        l1 = buildL1Lineage(anchorId!, meta)
        l2Pieces = buildL2Lineage(anchorId!, meta)
      } else {
        l1 = buildL1Global()
        l2Pieces = buildL2Global()
      }
      // L1 cap 兜底（三档通用；与护栏并发时后写覆盖——最终截断面为准）
      if (estimateTokens(l1) > caps.l1Cap[req.scope]) {
        l1 = truncateToTokens(l1, caps.l1Cap[req.scope])
        meta.l1Truncated = { section: 'L1', reason: 'l1-cap' }
      }

      // ── L2 合计预算（超 cap 从尾部整片舍弃——不截半片；防御分支）──
      // [r1 d1-N4] 口径注：合计=片和（不含 join '\n'——每枚分隔符 ≤1 other 权
      // 0.25 tok，逐片 ceil 后整串 join 的增量经总串再 ceil 最多溢出 ~3 tok——
      // cap 语义按片和口径冻结（舍入余量内，不追平）
      let total = l2Pieces.reduce((s, p) => s + estimateTokens(p.text), 0)
      const kept = [...l2Pieces]
      const dropped = new Map<string, number>()
      while (total > caps.l2Cap[req.scope] && kept.length > 0) {
        const tail = kept.pop()!
        total -= estimateTokens(tail.text)
        dropped.set(tail.source, (dropped.get(tail.source) ?? 0) + 1)
      }
      if (dropped.size > 0) {
        meta.l2Dropped = [...dropped.entries()].map(([source, n]) => ({ source, dropped: n }))
      }

      const prefix = [l1, ...kept.map((p) => p.text)].join('\n')
      // [r1 k3-W1+d1-N1] 空片源去重收口：L1/L2 幽灵锚分支可重复 push 同源
      // （如 paper 幽灵的 'paper' 双记）——Set 收口保 meta 确定性形状（恰一次）
      meta.emptySources = [...new Set(meta.emptySources)]
      return { cacheKey, prefix, meta }
    }
  }
}
