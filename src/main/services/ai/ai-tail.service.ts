/**
 * [F-DBCAMP-01 DB-2 U2b-2b] ai-tail.service —— L3 尾段现算装配（§3.a P1-P6；
 * §3.C 三级结构第三级：L1 骨架常驻+L2 结构摘录=ai-context.service 前两级）。
 *
 * ── INV-131（L3 现算纪律——锚定面本件头注） ──
 * 尾段四腿（消息窗/召回/文献展开/代理结果）恒现算：不入 cacheKey、不进前缀缓存、
 * 不受 epoch 管辖（ai_sessions/ai_messages 不入 epoch 集合——INV-J 互锁；与
 * ai-context.service INV-J 段互锁指针双向锚定）。强制=行为锁测试两断言：
 * ①cacheKey 零耦合（写 ai_messages 后 prefix cacheKey 不变）②前缀字节相等
 * （写 ai_messages 后 prefix===）——tests/unit/services/ai-tail.service.test.ts
 * T20/T21。
 *
 * ── INV-130（agent 回写信封契约——识别面本件，产出面 ai-tasks.handlers） ──
 * 读动作回写信封=JSON 对象 action∈{'memory.search','memory.list'}。识别谓词
 * isAgentEnvelope **单源在本件导出**（ai-tasks.service 拉取预算闸复用——禁两处
 * 复制）；改信封形状须识别面（本件）与产出面（handlers）双侧同批+行为锁测试
 * 双侧红证。〔自裁申报：简报 §3.a P5「件内私有」与 §3.d「谓词单源禁两处复制」
 * 并置冲突，取后者——导出单源优先，测试仍经行为断言（T5/T15）。〕
 *
 * ── 行为层 ──
 * - 形态（P1）：scope/anchorId 从 session 行读（getSessionById——不收外部
 *   scope/anchor）；幽灵会话→NOT_FOUND「会话不存在」（与 ai-sessions.service
 *   既有文案逐字对齐）；currentMessage 非 string→INVALID_REQUEST（形态先于
 *   存在性——裁③）。同步纯读。
 * - 四腿装入序（P2）：消息窗→召回→文献展开→代理结果；段间 '\n' join（空腿
 *   不占位——过滤空串后 join，防双空行〔自裁申报〕）。
 *   消息窗：listMessages(id ASC)→P5 分桶对话/代理。对话行新到旧贪心至 window
 *   cap（整条装得下→整条；否则 truncateToTokens(剩余) 截该条并停）；输出时间
 *   正序（旧→新）；渲染 `[user] 内容`/`[assistant] 内容`。
 *   召回：currentMessage.trim() 经 routeQueryByCodePoints（§3.c 单源）→empty=
 *   零 SQL；like/match=searchByLike/searchByMatch（**隔离谓词**——scope+anchor
 *   传会话行值，非并集）；topK=MEMORY_SEARCH_TOP_K；渲染
 *   `[记忆召回:{category}] {title}|{truncateToTokens(content,PIECE_TOKEN_CAP)}`
 *   ——120 片 cap 从 ai-context.service import（单源）。
 *   文献展开（仅 lineage）：同一 trim 后 q 与同一 route 值→ai-search.repo
 *   top-5→块 `[文献展开] {title}（{year ?? '-'}）|摘要 {abstract}|笔记
 *   {note 或「无」}`，单篇 truncateToTokens(块,LITERATURE_PAPER_CAP)；腿内贪心
 *   至 literature cap。
 *   代理结果：代理行新到旧装入至 agent cap（整条/边界截断），渲染原样 content。
 * - 腿 cap 和=总 cap（P3）：paper 500+300+0+200=1000/lineage 400+300+300+200=
 *   1200/global 500+300+0+200=1000——结构性无全局截断。caps 注入=测试触发面
 *   （生产=默认常量）。
 * - lineage 600 池=召回 300+文献 300（P4 预裁定档）。
 * - 确定性：禁 Date/random/localeCompare/Intl（字节相等四威胁全域）；序全显式
 *   （新到旧=数组倒扫，正序输出=倒扫结果再反转）；同输入两次 tail===(硬断言)。
 * - meta（P6）：{scope,recallRoute,recallRows,literatureHits?(仅 lineage),
 *   windowLoaded,windowTruncated,agentLoaded,legsTruncated(按装入序)}——
 *   loaded=装入行数（含边界截断行）；legsTruncated 仅记**腿级**边界（单篇
 *   250 片截断≠腿截断〔自裁申报〕）。
 *
 * ── 架构层 ──
 * - SQL 全在 repo（本件零 SQL——pattern/ftsQuery 构造复用 escapeLike/
 *   escapeFtsQuery 单源）；L3 现算不缓存（INV-131——物理缓存归未来对话
 *   管线批）。
 *
 * ── 文化层 ──
 * - 测试：tests/unit/services/ai-tail.service.test.ts（always-active 真库）。
 */
import { escapeFtsQuery } from '../../db/fts'
import type { AiScope } from '../../db/repos/ai-sessions.repo'
import type { Repos } from '../../db/repos'
import { estimateTokens, truncateToTokens } from './ai-estimate'
import { PIECE_TOKEN_CAP } from './ai-context.service'
import { escapeLike, MEMORY_SEARCH_TOP_K, routeQueryByCodePoints } from './ai-memory-search.service'
import { AiDomainError } from './ai-sessions.service'

/** 尾段四腿预算（§3.a——腿 cap 和=总 cap：paper/global 1000、lineage 1200） */
export const TAIL_LEGS: {
  window: Record<AiScope, number>
  recall: number
  literature: number
  agent: number
} = {
  window: { paper: 500, lineage: 400, global: 500 },
  recall: 300,
  literature: 300,
  agent: 200
}

/** 文献展开 top-K（repo SQL LIMIT 5 的服务层单源——镜像注记见 ai-search.repo 头注） */
export const LITERATURE_TOP_K = 5

/** 单篇文献块 cap（§3.a——P12 校准批复核余量） */
export const LITERATURE_PAPER_CAP = 250

export interface AssembleTailRequest {
  sessionId: number
  currentMessage: string
}

export interface TailMeta {
  scope: AiScope
  recallRoute: 'empty' | 'like' | 'match'
  recallRows: number
  /** 仅 lineage 档在场（paper/global 缺席） */
  literatureHits?: number
  windowLoaded: number
  windowTruncated: boolean
  agentLoaded: number
  /** 腿级边界截断标记（按装入序：window/recall/literature/agent） */
  legsTruncated: string[]
}

export interface AssembleTailResult {
  tail: string
  meta: TailMeta
}

/** 尾段预算（默认=冻结常量；caps 注入=测试触发面） */
export interface TailCaps {
  window: Record<AiScope, number>
  recall: number
  literature: number
  agent: number
}

/** caps 覆盖形状（内外皆部分——沿 ai-context.service ContextCapsOverride 形制；
 *  〔r1 R-N7〕显式形——映射型 Partial 对 number 键无语义（Partial<number>≡number
 *  的歧义面），逐键写明） */
export interface TailCapsOverride {
  window?: Partial<Record<AiScope, number>>
  recall?: number
  literature?: number
  agent?: number
}

export interface AiTailService {
  assembleTail(req: AssembleTailRequest): AssembleTailResult
}

/** INV-130 agent 回写信封动作封闭集（产出面=ai-tasks.handlers 读动作两键） */
export const AGENT_ENVELOPE_ACTIONS: readonly string[] = ['memory.search', 'memory.list']

/**
 * INV-130 agent 回写信封识别谓词（单源导出——ai-tasks.service 拉取预算闸复用，
 * 禁两处复制）：assistant 行 ∧ JSON.parse 得对象（非数组非 null） ∧ action 为
 * string ∧ action∈AGENT_ENVELOPE_ACTIONS。
 */
export function isAgentEnvelope(content: string): boolean {
  let parsed: unknown
  try {
    parsed = JSON.parse(content)
  } catch {
    return false
  }
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) return false
  const action = (parsed as { action?: unknown }).action
  return typeof action === 'string' && AGENT_ENVELOPE_ACTIONS.includes(action)
}

/** 腿内贪心装入结果 */
interface LegFill {
  lines: string[]
  loaded: number
  truncated: boolean
}

/**
 * 腿内贪心（units 按装入序）：整条装得下→整条；否则 truncateToTokens(剩余) 截
 * 该条并停（剩余=0 → 该条起全弃）。truncated=未全量整条装入（边界截断或有弃行）。
 */
function greedyFill(units: string[], cap: number): LegFill {
  const lines: string[] = []
  let used = 0
  for (let i = 0; i < units.length; i++) {
    const unit = units[i]!
    const t = estimateTokens(unit)
    const remaining = cap - used
    if (t <= remaining) {
      lines.push(unit)
      used += t
      continue
    }
    if (remaining > 0) lines.push(truncateToTokens(unit, remaining))
    return { lines, loaded: lines.length, truncated: true }
  }
  return { lines, loaded: lines.length, truncated: false }
}

export function createAiTailService(deps: { repos: Repos; caps?: TailCapsOverride }): AiTailService {
  const { aiSessions, aiMemory, aiSearch } = deps.repos
  const caps: TailCaps = {
    window: { ...TAIL_LEGS.window, ...deps.caps?.window },
    recall: deps.caps?.recall ?? TAIL_LEGS.recall,
    literature: deps.caps?.literature ?? TAIL_LEGS.literature,
    agent: deps.caps?.agent ?? TAIL_LEGS.agent
  }

  return {
    assembleTail(req) {
      // 形态先于存在性（裁③）
      if (typeof req.currentMessage !== 'string') {
        throw new AiDomainError('INVALID_REQUEST', '当前消息必须为字符串')
      }
      const session = aiSessions.getSessionById(req.sessionId)
      if (session === null) {
        throw new AiDomainError('NOT_FOUND', '会话不存在')
      }
      const scope = session.scope
      const anchorId = session.anchorId
      const legsTruncated: string[] = []

      // ── 腿一：消息窗（P5 分桶→对话桶新到旧贪心→正序输出） ──
      const messages = aiSessions.listMessages(req.sessionId)
      const convLines: string[] = []
      const agentUnits: string[] = []
      for (const m of messages) {
        if (m.role === 'assistant' && isAgentEnvelope(m.content)) agentUnits.push(m.content)
        else convLines.push(`[${m.role}] ${m.content}`)
      }
      // 新到旧装入（倒扫），输出正序（反转）
      const newestFirst: string[] = []
      for (let i = convLines.length - 1; i >= 0; i--) newestFirst.push(convLines[i]!)
      const windowFill = greedyFill(newestFirst, caps.window[scope])
      const windowOut = [...windowFill.lines].reverse()
      if (windowFill.truncated) legsTruncated.push('window')

      // ── 腿二：召回（隔离谓词——scope+anchor 传会话行值） ──
      const q = req.currentMessage.trim()
      const route = routeQueryByCodePoints(q)
      let recallRows = 0
      let recallUnits: string[] = []
      if (route === 'like') {
        const rows = aiMemory.searchByLike(scope, anchorId, `%${escapeLike(q)}%`, MEMORY_SEARCH_TOP_K)
        recallRows = rows.length
        recallUnits = rows.map(
          (r) => `[记忆召回:${r.category}] ${r.title}|${truncateToTokens(r.content, PIECE_TOKEN_CAP)}`
        )
      } else if (route === 'match') {
        const rows = aiMemory.searchByMatch(scope, anchorId, escapeFtsQuery(q), MEMORY_SEARCH_TOP_K)
        recallRows = rows.length
        recallUnits = rows.map(
          (r) => `[记忆召回:${r.category}] ${r.title}|${truncateToTokens(r.content, PIECE_TOKEN_CAP)}`
        )
      }
      const recallFill = greedyFill(recallUnits, caps.recall)
      if (recallFill.truncated) legsTruncated.push('recall')

      // ── 腿三：文献展开（仅 lineage——600 池=召回 300+文献 300） ──
      // [r1 R-B1] match 路传 escapeFtsQuery 裸短语——papers 腿列过滤前缀
      // `{title abstract}:`（authors 列排除）由 repo 在绑定值侧承载（两腿异构
      // 前缀不可在单一 q 上统一加）；notes 腿裸 MATCH=检索域全列。
      let literatureHits: number | undefined
      let literatureUnits: string[] = []
      if (scope === 'lineage') {
        if (route === 'like') {
          const hits = aiSearch.searchLiterature(anchorId!, `%${escapeLike(q)}%`, 'like')
          literatureHits = hits.length
          literatureUnits = hits.map(toLiteratureBlock)
        } else if (route === 'match') {
          const hits = aiSearch.searchLiterature(anchorId!, escapeFtsQuery(q), 'match')
          literatureHits = hits.length
          literatureUnits = hits.map(toLiteratureBlock)
        } else {
          literatureHits = 0
        }
      }
      const literatureFill = greedyFill(literatureUnits, caps.literature)
      if (literatureFill.truncated) legsTruncated.push('literature')

      // ── 腿四：代理结果（新到旧装入，原样 content） ──
      const agentNewestFirst: string[] = []
      for (let i = agentUnits.length - 1; i >= 0; i--) agentNewestFirst.push(agentUnits[i]!)
      const agentFill = greedyFill(agentNewestFirst, caps.agent)
      if (agentFill.truncated) legsTruncated.push('agent')

      // 段间 '\n' join（空腿不占位）
      const tail = [windowOut, recallFill.lines, literatureFill.lines, agentFill.lines]
        .map((lines) => lines.join('\n'))
        .filter((s) => s !== '')
        .join('\n')

      const meta: TailMeta = {
        scope,
        recallRoute: route,
        recallRows,
        windowLoaded: windowFill.loaded,
        windowTruncated: windowFill.truncated,
        agentLoaded: agentFill.loaded,
        legsTruncated
      }
      // [r1 R-W2] literatureHits 真缺席：条件赋值——非 lineage 档键不在场
      // （'literatureHits' in meta === false；undefined 值键=in true 的假缺席）
      if (scope === 'lineage') meta.literatureHits = literatureHits
      return { tail, meta }
    }
  }
}

/** 文献块渲染（§3.a：单篇 truncateToTokens(块,250)——片级截断不入 legsTruncated） */
function toLiteratureBlock(h: {
  title: string
  year: number | null
  abstract: string
  noteContentMd: string | null
}): string {
  const note = h.noteContentMd === null ? '无' : h.noteContentMd
  return truncateToTokens(
    `[文献展开] ${h.title}（${h.year ?? '-'}）|摘要 ${h.abstract}|笔记 ${note}`,
    LITERATURE_PAPER_CAP
  )
}
