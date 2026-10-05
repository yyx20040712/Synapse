/**
 * [SR2-AI-08] e2e 环境基建共用（launch+seedPaperRow+bootstrapMigrations）。
 *
 * Rule of Three 抽取形态：reader-text.spec / corpus-export.spec 各持一份
 * （第 2 次保持重复），本文件为第 3 次出现——按 AGENTS 抽共用；W1C
 * （F-TESTREF-W1C）把各 spec 内联的 launch 5 副本、seedPaperRow 4 份本地
 * 定义与第一跳迁移配方（14 处复制）收敛到本单源。
 * [F-UIRES-03 B2] seedAiNote+seedAnnotation（seedPaperRow 同型子进程
 * better-sqlite3 INSERT——lineage.spec T4 种子链改 launch 前直写库，
 * 替代退役的 08 传感器导入链）。
 */
import { _electron as electron, type ElectronApplication } from '@playwright/test'
import { spawn } from 'node:child_process'
import { join } from 'node:path'

/** 拉起子进程跑指定种子脚本；退出码非 0 即拒绝 */
function runSeed(script: string, env: NodeJS.ProcessEnv): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [join(process.cwd(), 'tests', 'e2e', script)], {
      env,
      stdio: 'inherit'
    })
    child.on('exit', (code) => {
      if (code === 0) {
        resolve()
      } else {
        reject(new Error(`${script} 退出码 ${code ?? 'null'}`))
      }
    })
    child.on('error', reject)
  })
}

export async function launch(userData: string, extraEnv: Record<string, string> = {}): Promise<ElectronApplication> {
  const app = await electron.launch({
    args: ['out/main/index.js'],
    env: { ...process.env, SYNAPSE_USER_DATA: userData, ...extraEnv } as Record<string, string>
  })
  // [ciatimeout-a2] _electron.launch 自建 BrowserContext 不吃 playwright.config
  // 的 use.actionTimeout（run 37101764841 实证：config 已设 60s 仍报 120 处
  // 30s 默认超时）——context 级显式设默认超时才对 electron 窗口生效
  app.context().setDefaultTimeout(60_000)
  return app
}

/**
 * 第一跳：让应用自己完成建库迁移——launch 开窗等 500ms 再关（不 import
 * src 内部模块，Playwright 不认 ?raw；迁移留给应用自身的启动链）。
 */
export async function bootstrapMigrations(userData: string): Promise<void> {
  const app = await launch(userData)
  await (await app.firstWindow()).waitForTimeout(500)
  await app.close()
}

/**
 * [F-BAKRET-01] lineage 图种子（子进程跑 seed-lineage.mjs——seedPaperRow 同型；
 * 草稿导入链退役后的脉络图种子基建）。payload 经 SEED_LINEAGE_JSON 环境变量
 * 传入；edges 的 from/to=paperId。幽灵边（两端 paper 分属不同文件夹的边）
 * 可直写——导出面 INV-77 过滤兜底的存量数据模拟。
 */
export interface LineageSeedNode {
  paperId: string
  title: string
  year: number | null
  month?: number | null
  slot?: number | null
  folderId?: string
  /** [A1a] 文献库标签种子（tags+paper_tags 两行挂接 paperId——卡 L1 标签断言面；
   *  [A1b F-CONTRACTA-01] 脉络私有域 tags 种子键随标签域退役删除——本键=唯一标签面；
   *  [A3 F-CONTRACTA-01 2026-10-04] coreIdea 种子键随 core_idea 全退役删除） */
  libraryTags?: string[]
}
export interface LineageSeedEdge {
  from: string
  to: string
  label?: string
  kind?: 'tree' | 'inferred' | 'ref' | 'manual'
}
export async function seedLineageGraph(
  userData: string,
  payload: {
    folders?: Array<{ id: string; name: string; position?: number }>
    nodes?: LineageSeedNode[]
    edges?: LineageSeedEdge[]
  }
): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const child = spawn(
      process.execPath,
      [join(process.cwd(), 'tests', 'e2e', 'seed-lineage.mjs')],
      {
        env: {
          ...process.env,
          SEED_DB: join(userData, 'synapse.db'),
          SEED_LINEAGE_JSON: JSON.stringify(payload)
        } as NodeJS.ProcessEnv,
        stdio: 'inherit'
      }
    )
    child.on('exit', (code) => {
      if (code === 0) {
        resolve()
      } else {
        reject(new Error(`seed-lineage.mjs 退出码 ${code ?? 'null'}`))
      }
    })
    child.on('error', reject)
  })
}

/**
 * 种子落库（子进程跑 seed-paper.mjs——Windows 文件锁决定不经主进程 require）。
 * [F-ELE-02] better-sqlite3 13.0.3 起 N-API 单绑定跨 Node/Electron ABI 通用，
 * v12 时代的 abi-cache 换绑段已删除（子进程直接 require 即可）。
 * [T3-P3] extra 可选列（year/venue/cited——密度列表断言面[五列=F-LIBUI-01 ④ 档次列退役]；缺省零改动）。
 */
export async function seedPaperRow(
  userData: string,
  fileRef: string,
  sha: string,
  title: string,
  id = 'e2e-seed-paper',
  extra: { year?: number; venue?: string; cited?: number; impact?: number } = {}
): Promise<void> {
  const optionalEnv: Record<string, string> = {}
  if (extra.year !== undefined) optionalEnv.SEED_YEAR = String(extra.year)
  if (extra.venue !== undefined) optionalEnv.SEED_VENUE = extra.venue
  if (extra.cited !== undefined) optionalEnv.SEED_CITED = String(extra.cited)
  if (extra.impact !== undefined) optionalEnv.SEED_IMPACT = String(extra.impact)
  await runSeed('seed-paper.mjs', {
    ...process.env,
    SEED_DB: join(userData, 'synapse.db'),
    SEED_FILE_REF: fileRef,
    SEED_SHA: sha,
    SEED_TITLE: title,
    SEED_ID: id,
    ...optionalEnv
  } as NodeJS.ProcessEnv)
}

/**
 * [F-UIRES-03 B2] ai_notes 种子（seedPaperRow 同型子进程 INSERT——launch 前
 * 直写库；role/question 值域=迁移 003 DDL CHECK/zod 单源镜像）。annotationId
 * 恒 null（篇级/自持锚定段——D3 解耦口径）。
 */
export interface AiNoteSeedRow {
  id: string
  paperId: string
  role: 'first-read' | 'second-read' | 'adjudicate'
  question: 'Q1' | 'Q2' | 'Q3' | 'Q4' | 'Q5' | 'Q6' | 'Q7' | 'divergence'
  model: string
  quoteText: string
  prefixText: string
  suffixText: string
  /** 1 基辅助页码（AiNote.anchorPage 口径）；null=篇级 */
  anchorPage: number | null
  contentMd: string
}
export async function seedAiNote(userData: string, row: AiNoteSeedRow): Promise<void> {
  await runSeed('seed-ai-note.mjs', {
    ...process.env,
    SEED_DB: join(userData, 'synapse.db'),
    SEED_ID: row.id,
    SEED_PAPER_ID: row.paperId,
    SEED_ROLE: row.role,
    SEED_QUESTION: row.question,
    SEED_MODEL: row.model,
    SEED_QUOTE: row.quoteText,
    SEED_PREFIX: row.prefixText,
    SEED_SUFFIX: row.suffixText,
    ...(row.anchorPage !== null ? { SEED_PAGE: String(row.anchorPage) } : {}),
    SEED_CONTENT: row.contentMd
  } as NodeJS.ProcessEnv)
}

/**
 * [F-UIRES-03 B2] annotations 种子（seedPaperRow 同型子进程 INSERT）。page=
 * 0 基存储（INV-24）；rects_json='[]'（B2 侧板/锚定位断言面不消费 rects）。
 */
export interface AnnotationSeedRow {
  id: string
  paperId: string
  page: number
  kind: 'highlight' | 'underline' | 'note'
  color: 'yellow' | 'green' | 'blue' | 'red' | 'purple'
  quoteText: string
  prefixText: string
  suffixText: string
  startOffset: number
  endOffset: number
  comment: string
}
export async function seedAnnotation(userData: string, row: AnnotationSeedRow): Promise<void> {
  await runSeed('seed-annotation.mjs', {
    ...process.env,
    SEED_DB: join(userData, 'synapse.db'),
    SEED_ID: row.id,
    SEED_PAPER_ID: row.paperId,
    SEED_PAGE: String(row.page),
    SEED_KIND: row.kind,
    SEED_COLOR: row.color,
    SEED_QUOTE: row.quoteText,
    SEED_PREFIX: row.prefixText,
    SEED_SUFFIX: row.suffixText,
    SEED_START: String(row.startOffset),
    SEED_END: String(row.endOffset),
    SEED_COMMENT: row.comment
  } as NodeJS.ProcessEnv)
}
