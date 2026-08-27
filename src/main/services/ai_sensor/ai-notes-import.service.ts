// b3: P7-G
/**
 * [SR2-AI-07] ai-notes-import.service —— 回灌导入器（corpus-ai 产物 →
 * ai_notes 写入+读通道，工单：open / strong）
 *
 * ── 行为层 ──
 * - E2 回灌=文件导入器（ADR-0015 §2）：目录扫描（协议根 corpus-ai/——AI-06
 *   交付的产物区）→ 逐篇解析校验（zod）→ 经 ai_notes.repo 写 DB（**写入只经
 *   应用 IPC+repo，工具永不写 DB**——D3 语义保持）；导入后产物移 archive/
 *   （ADR §2 字面）
 * - **幂等=archive 账本机制**：archive/<paperId>.json 存在且 sha256==源文件 →
 *   跳过（skipped）；存在但 sha 不同 → 清面重灌（deleteByPaper+整套重插
 *   ——AI-01 幂等原语）；无 archive → 首次导入
 * - **账本前提登记（门一 W07-1 处置，两条机器事实）**：①paperId 不复用
 *   （导入服务以 randomUUID 生成不循环——import.service.ts 现实现）；②
 *   paper 删→CASCADE 清 ai_notes（003 迁移）后 archive 残留无害（扫描只看
 *   corpus-ai/ 活动区不读 archive）。前提破坏场景=未来引入 paperId 复用
 *   或「保 archive 清 DB」操作面——出现时任一即须重估账本机制
 * - 产物行格式（ADR §1 字面契约）：corpus-ai/<paperId>.json=行式锚定段数组，
 *   行={ role, question, model, quote_text, prefix_text, suffix_text,
 *   anchor_page, content_md }（snake_case 文件面）→ 映射 AiNoteInput
 *   （camelCase zod 面；annotationId=null——自持锚定三元组与 annotations
 *   零耦合，D3；id/createdAt/updatedAt 由 repo 生成）
 * - 校验面：role 枚举真相=迁移 003 DDL CHECK（zod 为镜像消费）；question=
 *   **zod=应用边界校验单源**；aiNoteInputSchema 逐行校验；paperId 幽灵拦截
 *   （不在 papers 表→该篇失败）；行级失败→该篇失败入 errors[]（部分成功语义）
 * - 「v1 无生产者」声明解除时点=本单：ai_notes.repo.ts 头注声明行随本单修订
 *   （生产者=本导入器）
 * - Result 形状：{ imported: string[]; skipped: string[]; errors:
 *   { paperId: string; reason: string }[] }（部分成功三桶——消费方 08 按钮
 *   toast 汇总呈现）
 *
 * ── 接口层 ──
 * - export interface AiNotesImportService { importAll(); listByPaper(paperId) }
 * - IPC 面：ai-notes/import + ai-notes/list 两通道，域归属=新立 ai_sensor 域
 *   （2026-08-27 用户裁决，ADR-0017）
 * - 交付面：ipc/ai_sensor.ts（域装配，四通道委托）+services/index.ts 装配
 *   +ai_notes.repo.ts 头注声明行修订
 *
 * ── 架构层 ──
 * - 分层：ipc → services → repos → db（单向；service 持 repo+协议根路径，
 *   禁 service 直写 SQL）；fs 面仅协议根（corpus-ai 读+archive 移动，
 *   rename 保原子——Windows rename 不覆盖已存在目标，先 rm 再 rename）
 * - 依赖：ai_notes.repo（insert/deleteByPaper/listByPaper）、
 *   shared/models/ai-note（zod 单源）、node:crypto（sha256 零依赖）
 *
 * ── 生命周期层 ──
 * - 预留：分篇选择性导入（v1 全量扫描——目录级幂等使全量重跑无害）；
 *   FTS 入 ai_notes（P7-E 候选，维持 AI-01 不做）
 * - 不做：工具侧任何 DB 直写；divergence/七问枚举扩展（冻结 v1）；
 *   annotationId 回链（自持锚定=D3 彻底化，渲染重锚归 AI-09）
 *
 * ── 文化层 ──
 * - 错误：篇级失败入 errors[] 不中断整批（部分成功）；目录不存在→空结果
 *   （首次无产物=合法态非错误）；文件损坏→该篇 error（中文 reason 含路径）；
 *   禁静默吞错。**失败篇产物留在 corpus-ai 不移 archive**（移走即永久掩盖
 *   损坏面——下次导入可重试修复）；skipped 路径源文件一并归档（活动区清空）
 * - 测试：tests/unit/services/ai-notes-import.test.ts [受锁新增]——幂等三
 *   路径/行级 zod 拒非法 role/question/幽灵 paperId 拦截/损坏 JSON/目录不
 *   存在空结果/二跑全 skipped/Result 三桶形状；repo 交互以真库夹具
 *   （AI-01 测试同型）；always-active（ADR-0017 裁决 3）
 */
import { createHash } from 'node:crypto'
import { mkdir, readdir, readFile, rename, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { aiNoteInputSchema, type AiNote } from '../../../shared/models/ai-note'
import type { AiNotesRepo } from '../../db/repos/ai_notes.repo'

export interface AiNotesImportResult {
  imported: string[]
  skipped: string[]
  errors: { paperId: string; reason: string }[]
}

export interface AiNotesImportService {
  importAll(): Promise<AiNotesImportResult>
  listByPaper(paperId: string): Promise<AiNote[]>
}

export interface AiNotesImportDeps {
  /** 协议根（=userData/ai-sensor——bootstrap 解析注入，与 ai-sensor.service 同根） */
  rootDir: string
  repo: Pick<AiNotesRepo, 'insert' | 'deleteByPaper' | 'listByPaper'>
  /** papers 表存在性查证（幽灵 paperId 拦截——装配层接 repos.papers.findById） */
  paperExists: (paperId: string) => boolean
}

/** 产物文件行形状（ADR-0015 §1 字面，snake_case 文件面） */
interface ProductRow {
  role: unknown
  question: unknown
  model: unknown
  quote_text: unknown
  prefix_text: unknown
  suffix_text: unknown
  anchor_page: unknown
  content_md: unknown
}

/** Node fs ENOENT 判定（unknown 收窄，不吞其他错误——AI-06 同型） */
function isENOENT(e: unknown): boolean {
  return (
    typeof e === 'object' && e !== null && 'code' in e && (e as { code?: unknown }).code === 'ENOENT'
  )
}

function sha256Of(text: string): string {
  return createHash('sha256').update(text, 'utf8').digest('hex')
}

export function createAiNotesImportService(deps: AiNotesImportDeps): AiNotesImportService {
  const corpusAiDir = join(deps.rootDir, 'corpus-ai')
  const archiveDir = join(deps.rootDir, 'archive')

  /** 逐行解析校验（snake→camel 映射+annotationId 固定 null——自持锚定，D3） */
  function parseRows(rows: unknown[], paperId: string, path: string): ReturnType<typeof aiNoteInputSchema.parse>[] {
    return rows.map((row, i) => {
      if (row === null || typeof row !== 'object' || Array.isArray(row)) {
        throw new Error(`第 ${i + 1} 行非对象：${path}`)
      }
      const r = row as ProductRow
      const parsed = aiNoteInputSchema.safeParse({
        paperId,
        annotationId: null,
        role: r.role,
        question: r.question,
        model: r.model,
        quoteText: r.quote_text,
        prefixText: r.prefix_text,
        suffixText: r.suffix_text,
        anchorPage: r.anchor_page,
        contentMd: r.content_md
      })
      if (!parsed.success) {
        const issues = parsed.error.issues
          .slice(0, 3)
          .map((iss) => `${iss.path.join('.')}: ${iss.message}`)
          .join('；')
        throw new Error(`第 ${i + 1} 行校验失败（${issues}）：${path}`)
      }
      return parsed.data
    })
  }

  /** 单篇导入（成功/跳过→返回 true；失败→errors 落条目返回 false） */
  async function importOne(
    name: string,
    errors: { paperId: string; reason: string }[]
  ): Promise<'imported' | 'skipped' | 'failed'> {
    const paperId = name.slice(0, -5)
    const src = join(corpusAiDir, name)
    const dest = join(archiveDir, name)
    try {
      const text = await readFile(src, 'utf8')
      // archive 账本：同 sha→skipped（源一并归档，活动区清空）
      let archivedText: string | null = null
      try {
        archivedText = await readFile(dest, 'utf8')
      } catch (e) {
        if (!isENOENT(e)) throw e
      }
      if (archivedText !== null && sha256Of(archivedText) === sha256Of(text)) {
        await rm(dest, { force: true })
        await mkdir(archiveDir, { recursive: true })
        await rename(src, dest)
        return 'skipped'
      }
      if (!deps.paperExists(paperId)) {
        errors.push({ paperId, reason: `文献不存在（幽灵 paperId）：${src}` })
        return 'failed'
      }
      let raw: unknown
      try {
        raw = JSON.parse(text)
      } catch (e) {
        errors.push({
          paperId,
          reason: `产物 JSON 损坏：${src}（${e instanceof Error ? e.message : String(e)}）`
        })
        return 'failed'
      }
      if (!Array.isArray(raw)) {
        errors.push({ paperId, reason: `产物应为行式锚定段数组，实际非数组：${src}` })
        return 'failed'
      }
      const inputs = parseRows(raw, paperId, src)
      // 幂等重灌原语：异 sha 先清面再整套重插（AI-01）
      deps.repo.deleteByPaper(paperId)
      for (const input of inputs) deps.repo.insert(input)
      await mkdir(archiveDir, { recursive: true })
      await rm(dest, { force: true }) // Windows rename 不覆盖已存在目标
      await rename(src, dest)
      return 'imported'
    } catch (e) {
      errors.push({
        paperId,
        reason: `导入失败：${src}（${e instanceof Error ? e.message : String(e)}）`
      })
      return 'failed'
    }
  }

  return {
    async importAll() {
      const result: AiNotesImportResult = { imported: [], skipped: [], errors: [] }
      let names: string[]
      try {
        names = await readdir(corpusAiDir)
      } catch (e) {
        if (isENOENT(e)) return result // 首次无产物=合法态非错误
        throw e
      }
      for (const name of names.sort()) {
        if (!name.endsWith('.json') || name.endsWith('.tmp')) continue
        const outcome = await importOne(name, result.errors)
        if (outcome === 'imported') result.imported.push(name.slice(0, -5))
        else if (outcome === 'skipped') result.skipped.push(name.slice(0, -5))
      }
      return result
    },

    async listByPaper(paperId) {
      return deps.repo.listByPaper(paperId)
    }
  }
}
