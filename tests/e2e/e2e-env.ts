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
import { _electron as electron, expect, type ElectronApplication, type Page } from '@playwright/test'
import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
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

/** [e2e-hang-mitigation / 用户裁决 2026-11-24①] 启动挂起型失败的有界等待上界。健康启动
 *  本机 3–8s 出窗（hang-probe 实证）；30s＝4–10 倍余量，且留足「一次重试＋用例体」在
 *  90s 用例超时内的预算（30+杀+重启~10s+用例体）。CI 慢机由 config 的 retries:1 另行兜底 */
const LAUNCH_BOUND_MS = 30_000

/** 启动挂起签名的可识别错误（[复审 review4 警告1] 重试只认它——其他启动异常清理后直抛，
 *  不给确定性失败借道重试转绿的机会） */
class LaunchHangError extends Error {}

/** 上界竞速：p 先到即透传；到点未决=reject（启动挂起签名——进程在、调试通道在、90s 无窗口） */
function withLaunchBound<T>(p: Promise<T>, what: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new LaunchHangError(`[e2e-env] 启动挂起签名：${what} 超过 ${LAUNCH_BOUND_MS}ms`)), LAUNCH_BOUND_MS)
    p.then(
      (v) => { clearTimeout(timer); resolve(v) },
      (e) => { clearTimeout(timer); reject(e) }
    )
  })
}

export async function launch(userData: string, extraEnv: Record<string, string> = {}): Promise<ElectronApplication> {
  // [e2e-hang-mitigation / 用户裁决 2026-11-24①：立案排查＋夹具缓解] 启动挂起型非确定失败
  // （约 0.5% 单次率、一轮全量约六成概率≥1 例，直接卡提交前门；根因未定、HEAD 可复现——
  // b4b-accept3/controller-log.md §8）。缓解＝launch→firstWindow 各加 30s 有界等待，到界杀
  // 挂起实例（SIGKILL——userData 为一次性测试目录，无优雅保存诉求）后原样重试恰一次；重试
  // 仍挂=抛错走红（不削弱门——确定性失败与重试后仍挂的失败照常红）。重试发生时打
  // LAUNCH-HANG-RETRY 标记（可 grep 计数，入 flake 台账年度对账）。只针对启动签名：用例体
  // 内的失败不重试、不吞。firstWindow 纳入 launch：所有 spec 启动后必取首窗（零例外，grep
  // 实证），提前到夹具层使挂起在进用例体前被截获。
  for (let attempt = 1; attempt <= 2; attempt++) {
    let app: ElectronApplication | null = null
    const launchPromise = electron.launch({
      args: ['out/main/index.js'],
      env: {
        ...process.env,
        SYNAPSE_USER_DATA: userData,
        // [64-e2e-hang] e2e 无人值守 seam 默认开：脏态 close 的 C 确认框在 worker
        // teardown（Playwright 自身 app.close()，无测试代码可挂桩）无人点击即挂
        // （CI run 39141915828 实证）——测 cancel/confirm 真路径的用例单点覆盖退出：
        // launch(userData, { SYNAPSE_E2E_QUIT_AUTOCONFIRM: '0' })（lineage T3 先例）。
        SYNAPSE_E2E_QUIT_AUTOCONFIRM: '1',
        ...extraEnv
      } as Record<string, string>
    })
    try {
      app = await withLaunchBound(launchPromise, 'electron.launch')
      await withLaunchBound(app.firstWindow(), 'firstWindow')
      // [ciatimeout-a2] _electron.launch 自建 BrowserContext 不吃 playwright.config
      // 的 use.actionTimeout（run 37101764841 实证：config 已设 60s 仍报 120 处
      // 30s 默认超时）——context 级显式设默认超时才对 electron 窗口生效
      app.context().setDefaultTimeout(60_000)
      return app
    } catch (e) {
      const proc = app?.process()
      if (proc !== undefined && !proc.killed) proc.kill('SIGKILL')
      // launch 段超时（app===null）时无句柄可杀：该形态本批未观测（观测签名在
      // firstWindow 段），到界即抛错保底不静默；迟到解析的实例在此补杀，防其滞留
      // 持同一 userData 的单实例锁
      if (proc === undefined) void launchPromise.then((late) => { late.process().kill('SIGKILL') }).catch(() => {})
      // [复审 review4 警告1] 重试只认有界等待的挂起签名超时；其他启动异常（确定性失败）
      // 清理后直抛——不给第二次「环境已变而碰巧成功」转绿的机会
      if (attempt === 2 || !(e instanceof LaunchHangError)) throw e
      console.log(`[e2e-env] LAUNCH-HANG-RETRY attempt=1 → 重试一次：${e instanceof Error ? e.message : String(e)}`)
    }
  }
  /* unreachable：循环两轮必 return 或 throw */
  throw new Error('[e2e-env] launch 不可达分支')
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
  /** [F-UIRES-04 批 3b] 论文信息区种子面（papers 既有列 authors_json/abstract
   *  可选 UPDATE——两键均缺省不进 UPDATE 保持既有调用零改动；单键提供时
   *  另一键按缺省覆盖（[]/''）——种子面语义，复用既有行慎用） */
  authors?: string[]
  abstract?: string
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

/**
 * [B4 L2 回炉 W-C] 活库读写助手——测试进程之外的独立子进程打开**运行中应用的当前课题库**
 * （默认课题位 workspaces/default/synapse.db；workspaces 物化迁库前=userData 根 synapse.db）。
 * 形态=kill-folder.mjs / reading-time-replay.spec 读库子进程同型：独立进程经 WAL 与运行中
 * app 共存；[F-ELE-02] v13 N-API 单绑定——子进程直接 require。SQL 与参数经 JSON 规格传入
 * 子进程，子进程内 prepare 预编译+参数绑定（不经 shell）。
 *
 * 用途与纪律：
 * - 回读（get/all）：断言「真实 DB 落库」——e2e 必须断言渲染出的真实文本与必要的 DB 回读。
 * - 页面外写库（run）：**只用于制造「无结构事件的外部变更」这类被测前置**——例如另一实例、
 *   同步或快照导入才会造成的库态变化（已删实体被恢复、悬浮笔记正文被改写、文件夹被删），
 *   应用内不会为此发 folders.changed / lineage.changed。不得用它替代应用内的正常写路径
 *   （应用的写必须经 UI 与 IPC 走通）。
 *
 * @param mode run=执行写语句，回传 better-sqlite3 的 RunResult（含 changes）；get=首行（无行=null）；
 *             all=全部行（数组）
 * @returns 子进程回传的 JSON 结果（resolve 为 unknown——调用方按 SQL 形状断言）
 */
export function liveDbScript(
  userData: string,
  mode: 'run' | 'get' | 'all',
  sql: string,
  params: unknown[] = []
): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const wsDb = join(userData, 'workspaces', 'default', 'synapse.db')
    const child = spawn(
      process.execPath,
      [
        '-e',
        'const D=require("better-sqlite3");const db=D(process.argv[1]);db.pragma("busy_timeout=5000");' +
          'const s=JSON.parse(process.argv[2]);' +
          'try{const st=db.prepare(s.sql);' +
          'const r=s.mode==="run"?st.run(...s.params):s.mode==="get"?st.get(...s.params):st.all(...s.params);' +
          'console.log(JSON.stringify(r===undefined?null:r))}finally{db.close()}',
        existsSync(wsDb) ? wsDb : join(userData, 'synapse.db'),
        JSON.stringify({ mode, sql, params })
      ],
      { stdio: ['ignore', 'pipe', 'inherit'] }
    )
    let out = ''
    child.stdout.on('data', (d) => {
      out += String(d)
    })
    child.on('error', reject)
    child.on('exit', (code) => {
      if (code === 0) {
        resolve(JSON.parse(out) as unknown)
      } else {
        reject(new Error(`活库子进程退出码 ${code ?? 'null'}`))
      }
    })
  })
}

/**
 * [B4 L2 回炉 W-C] 脉络页图下拉切图（[B4 L2 §2.5 #32/§8.1] flush-first 挂起切换——
 * 离场会话的未落定写由 setFolder 取消 timer→快照请求→flush-first 承接，不弹弃改框）。
 * 步序=点开下拉（`lineage-nav-graph`）→点目标图行（`data-folder-id`，图名=文件夹名单一真相源）
 * →等按钮图名变成目标图名（活动会话已投影）。
 *
 * 适用前提：脉络页已挂载且目标图在活夹清单内（清单由下拉打开时重拉——[回炉 W-C·E4]）；
 * 图下拉驻左侧导航窗格（不在时间线滚动容器内）——1024×768 窄视口下无需滚动锚定；
 * 三模式（browse/edit/focus）均可达；导入进行中（import busy）按钮禁用，此时不可用。
 *
 * @param folderId 目标图（文件夹 id；主图=`__main__`）
 * @param name    目标图名（行文本与按钮图名的断言锚）
 */
export async function switchLineageGraph(win: Page, folderId: string, name: string): Promise<void> {
  await win.getByTestId('lineage-nav-graph').click()
  const menu = win.getByTestId('lineage-nav-graph-menu')
  await expect(menu).toBeVisible({ timeout: 5_000 })
  await menu.locator(`[data-folder-id="${folderId}"]`, { hasText: name }).click()
  await expect(win.getByTestId('lineage-nav-graph')).toContainText(name, { timeout: 5_000 })
}
