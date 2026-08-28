// b3: P7-C
/**
 * [SR2-C-02] corpus.assemble —— corpus md 装配纯函数（工单：done / strong）
 *
 * ⚠ 装配单源条款（计划审查 R12，红线）：本文件是 corpus md 装配的**唯一纯函数源**。
 * P7-G 五件套导出会话工单（ai-module-plan 序列三——manifest/INTERFACE/fulltext/
 * figures 编排层）只能在本文件**延展**（签名增参与 [ai:*] 节装配），禁止在
 * corpus.export.service 或任何别处另写一套 md 装配——两套装配=INV-11
 * 违例。消费侧新增（P7-G 回灌联动组语料）同样只经本函数。
 *
 * ── 行为层 ──
 * - assembleCorpusMd(input)：单篇语料 md 装配（ADR-0011 v1.1 全口径——文档=
 *   docs/adr/0011-md-corpus-interface-contract.md（含文末 v1.1 修订记录六项），
 *   验收细目来源）：
 *   · front-matter（YAML）：schemaVersion: 1 / paperId / title / authors / year /
 *     venue / doi / source / citationKey（复用 bibtex.serializer.makeCitationKey）/
 *     annotationCount / noteCount——**不含 exportedAt**（INV-17：时间戳只进
 *     manifest，per-paper md 字节幂等）；可选含金量字段（ENR-02 兑现，noteCount
 *     后逐行）：citedByCount（PaperDetail 有值则装配——0 是合法值禁 falsy 判空，
 *     undefined/null 省略）+venueTier（venueToTier 查表命中装配，未命中整键
 *     省略——两形可选语义，新增字段必须可选，ADR 演进规则）
 *   · 正文三段序（ADR-0011 §正文结构）：①总评层一节（note 存在时：标题+
 *     contentMd；无 note 省略整节）→ ②片段层：sortByDocumentOrder(annotations)
 *     （C-01 单源序）逐条 `> 引文原文` + `（p.<1 基页码>）` 标注 + 缩进批注
 *     行 `[user] <comment>`（comment 空则省略批注行）→ ③[ai:*] 段：aiNotes
 *     入参按序追加 `[ai:<source>] <内容>` 缩进段——**v1 生产者=测试夹具**
 *     （真实生产者随 P7-G 回灌联动工单落地；本装配位先行使语法成形）
 *   · 页码基准：引文块 p.N 为 1 基显示（存储 0 基——Annotation.page；口径声明
 *     处=本头注，P7-G 的 INTERFACE.md 同口径复述）
 *   · 幂等：同输入逐字节稳定（无时间戳/无随机/序全由比较器与入参序决定）——
 *     即 INV-17「contentSha=文件字节 sha256 幂等基线」的装配层前提（sha 计算
 *     归 P7-G 会话工单，本单 golden 断言两次调用逐字节全等）；空集（无 note
 *     无标注）=仅 front-matter+标题 合法产物
 * - 前缀常量单源：CORPUS_USER_PREFIX='[user]'/corpusAiPrefix(source)——语法
 *   变更=改这里+[locked-change]（schemaVersion 联动评估）
 *
 * ── 接口层 ──
 * - export interface AiNoteEntry { source: string; content: string; page?: number }
 * - export interface CorpusAssembleInput { paper: PaperDetail; note: Note | null;
 *   annotations: Annotation[]; aiNotes?: AiNoteEntry[] }
 * - export function assembleCorpusMd(input: CorpusAssembleInput): string
 * - export const CORPUS_USER_PREFIX / export function corpusAiPrefix(source): string
 *
 * ── 架构层 ──
 * - main services/export_/ 纯函数：零 IO、零 Electron、零出网；import
 *   @shared/annotation-order + bibtex.serializer.makeCitationKey + shared 模型
 * - 消费方：export.service buildCorpus/buildCorpusSet（本单）；P7-G 会话延展
 *
 * ── 生命周期层 ──
 * - 不做：manifest.json/INTERFACE.md/fulltext/figures（P7-G 五件套会话——
 *   INV-18 终局单写+清空重建+单飞协议）；不做增量导出（v1 全量）；不做 md 回写
 *
 * ── 文化层 ──
 * - 测试：tests/unit/services/corpus.assemble.test.ts：golden 逐字节/幂等/结构
 *   断言（无 exportedAt/引文数=标注数/序=C-01 序）+service 与 ipc 通道契约
 */
import { sortByDocumentOrder } from '../../../shared/annotation-order'
import type { AiNote, AiNoteQuestion, AiNoteRole } from '../../../shared/models/ai-note'
import type { Annotation } from '../../../shared/models/annotation'
import type { Note } from '../../../shared/models/note'
import type { PaperDetail } from '../../../shared/models/paper'
import { venueToTier } from '../../../shared/venue-tier'
import { makeCitationKey } from './bibtex.serializer'

export const CORPUS_USER_PREFIX = '[user]'

/** AI 段来源标识（v1 生产者=测试夹具；字符集消毒防前缀语法破坏——deepseek N1） */
export function corpusAiPrefix(source: string): string {
  return `[ai:${source.replace(/[[\]\s:]/g, '-')}]`
}

export interface AiNoteEntry {
  source: string
  content: string
  page?: number
}

/** orderAiNotes 的有序产物（sourceRole/question 供消费方断言与分组展示） */
export interface OrderedAiNoteEntry extends AiNoteEntry {
  sourceRole: AiNoteRole
  question: string
}

const ROLE_ORDER: Record<AiNoteRole, number> = {
  'first-read': 0,
  'second-read': 1,
  adjudicate: 2
}

function questionOrder(q: AiNoteQuestion): number {
  return q === 'divergence' ? 99 : Number(q.replace('Q', ''))
}

/**
 * ai_notes 行 → 装配条目（AI-03 延展，R12 单源内）：排序=role（一读→二读→
 * 裁决）→question（Q1..Q7，divergence 殿后）→createdAt→id（repo 基础序同键
 * 兜底）；content 组装=`question: 内容`（question 标记入段——INTERFACE.md 声明）。
 */
export function orderAiNotes(notes: readonly AiNote[]): OrderedAiNoteEntry[] {
  return [...notes]
    .sort((a, b) => {
      const roleDelta = ROLE_ORDER[a.role] - ROLE_ORDER[b.role]
      if (roleDelta !== 0) return roleDelta
      const qDelta = questionOrder(a.question) - questionOrder(b.question)
      if (qDelta !== 0) return qDelta
      return a.createdAt === b.createdAt ? (a.id < b.id ? -1 : 1) : a.createdAt < b.createdAt ? -1 : 1
    })
    .map((n) => ({
      source: n.model,
      content: `${n.question}: ${n.contentMd}`,
      page: n.anchorPage ?? undefined,
      sourceRole: n.role,
      question: n.question
    }))
}

export interface CorpusAssembleInput {
  paper: PaperDetail
  note: Note | null
  annotations: Annotation[]
  /** v1 生产者=测试夹具（真实生产者随 P7-G 回灌落地——头注单源条款） */
  aiNotes?: AiNoteEntry[]
}

/** YAML 单引号标量：内部单引号翻倍；CR/LF 归一为空格（单行标量——换行会
 *  破坏 front-matter 行结构，元数据换行无信息量，deepseek B1 裁决采纳；
 *  流指示符 , [ ] { } 在引号标量内不特殊——YAML 规范豁免，仅裸标量受限） */
function yamlStr(s: string): string {
  return `'${s.replace(/\r?\n/g, ' ').replaceAll("'", "''")}'`
}

/** front-matter 行组（schemaVersion 恒裸数字；year/doi 可 null；ENR-02 两可选
 *  含金量字段在 noteCount 后——有值形/缺省形两形，citedByFetchedAt 只进 manifest
 *  per-paper 条目，不进 md（INV-17 字节幂等不破坏——DB 缓存快照同库确定） */
function frontMatter(paper: PaperDetail, annotationCount: number): string[] {
  const key = makeCitationKey(paper.title, paper.year, paper.authors[0] ?? 'anon')
  const rows = [
    '---',
    'schemaVersion: 1',
    `paperId: ${yamlStr(paper.id)}`,
    `title: ${yamlStr(paper.title)}`,
    `authors: [${paper.authors.map(yamlStr).join(', ')}]`,
    `year: ${paper.year === null ? 'null' : paper.year}`,
    `venue: ${yamlStr(paper.venue)}`,
    `doi: ${paper.doi === null ? 'null' : yamlStr(paper.doi)}`,
    `source: ${yamlStr(paper.source)}`,
    `citationKey: ${yamlStr(key)}`,
    `annotationCount: ${annotationCount}`,
    `noteCount: ${paper.noteCount}`
  ]
  // 0 是合法缓存值（ENR-01 判空铁律）：undefined/null 才省略，禁 falsy
  if (paper.citedByCount !== undefined && paper.citedByCount !== null) {
    rows.push(`citedByCount: ${paper.citedByCount}`)
  }
  const tier = venueToTier(paper.venue)
  if (tier !== null) {
    rows.push(`venueTier: ${yamlStr(tier)}`)
  }
  rows.push('---')
  return rows
}

/** 引文行组：多行引文逐行补 `> ` 前缀（块引用续行不靠 lazy continuation——
 *  空行即断开，deepseek r2 W1）；页码标注附末行 */
function quoteLines(a: Annotation): string[] {
  const rows = a.quoteText.split(/\r?\n/).map((l) => `> ${l}`)
  rows[rows.length - 1] = `${rows[rows.length - 1]}（p.${a.page + 1}）`
  return rows
}

/** 缩进行组：多行内容逐行补 4 空格缩进（换行裸出会打断缩进段结构——同 W1） */
function indentLines(text: string): string[] {
  return text.split(/\r?\n/).map((l) => `    ${l}`)
}

export function assembleCorpusMd(input: CorpusAssembleInput): string {
  const { paper, note } = input
  const lines: string[] = [...frontMatter(paper, input.annotations.length), `# ${paper.title}`, '']

  if (note !== null) {
    lines.push('## 总评', '')
    if (note.title !== '') {
      lines.push(`**${note.title}**`, '')
    }
    lines.push(note.contentMd, '')
  }

  const aiNotes = input.aiNotes ?? []
  if (input.annotations.length > 0 || aiNotes.length > 0) {
    lines.push('## 片段', '')
    for (const a of sortByDocumentOrder(input.annotations)) {
      lines.push(...quoteLines(a), '')
      if (a.comment !== '') {
        lines.push(...indentLines(`${CORPUS_USER_PREFIX} ${a.comment}`), '')
      }
    }
    for (const ai of aiNotes) {
      const pageTag = ai.page === undefined ? '' : `（p.${ai.page + 1}）`
      lines.push(...indentLines(`${corpusAiPrefix(ai.source)} ${ai.content}${pageTag}`), '')
    }
  }

  return `${lines.join('\n')}\n`
}
