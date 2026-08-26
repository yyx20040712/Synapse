// b3: P7-G
/**
 * [SR2-AI-06] tools/ai-sensor companion —— 伴随进程文件协议会话壳（工单：open / strong）
 *
 * ── 行为层 ──
 * - W06-3 整合形态：queue 之上的会话壳——消费 planSession/markDone 既有幂等，
 *   不改 queue.mjs 语义；新增四步序（拾取→心跳→产物落盘→移除 job），每步
 *   刷新 status.json 心跳（heartbeatAt=now，原子重写整文件——未给字段保留）
 * - **INV-26 协议红线：移除 pending job 以 corpus-ai/<paperId>.json 产物落盘
 *   成功为前提**——任何失败路径（草稿损坏/校验拒绝/写盘失败）job 一律保留，
 *   应用观测坍缩回 pending（「等待 zcode」），失败细节经 status.state 自述
 * - 拾取：pending job 按 requestedAt 升序取首个「paperId ∈ 语料 manifest」者
 *   （不在 manifest=不可读不消费，job 保留并 stderr 报告；manifest 不存在=
 *   不激活——queue 唯一激活判据同源）；无 job=空转退出 exit 0
 * - 产物落盘：草稿 JSON（一个或多个文件，各为行式锚定段数组）拼接→规范化
 *   校验（8 字段行形状，与 ai_notes 同形 N2 粒度；role/question 枚举镜像
 *   AI-01 zod 边界；零段拒绝）→原子写协议根 corpus-ai/<paperId>.json
 * - 移除 job 后 markDone 语料进度（paperId ∈ manifest 时；outputs 记产物
 *   绝对路径——产物落协议根，非语料目录相对路径）；无 pending job 也可交付
 *   （queue 驱动全库三读流复用同一交付面）
 *
 * ── 接口层 ──
 * - CLI：`node companion.mjs <语料目录> <协议目录>`（拾取）/
 *   `--beat [状态自述] [角色]`（心跳）/
 *   `--deliver <paperId> <草稿.json...>`（产物落盘+移除 job）
 * - export：normalizeSegments（纯函数）/listPendingJobs/pickNext/deliver/
 *   writeStatusProtocol（类型面=邻接 companion.d.mts）
 *
 * ── 架构层 ──
 * - 零 npm 依赖零出网（AI-05 红线延续——模型调用=zcode 会话内建模能力）；
 *   不 import 应用 src；不写应用 DB 与语料目录 manifest/corpus/fulltext/figures
 * - 协议目录四成员（应用 userData/ai-sensor）：pending/ status.json corpus-ai/
 *   archive/（archive 移入归 07 导入器）；协议根/子目录首写 mkdir recursive 幂等
 *
 * ── 生命周期层 ──
 * - 预留：kind 枚举扩展（v1 单值 'three-read'——与 ai-sensor.service 同步）
 * - 不做：新鲜度判定（判活单源在应用侧 service，工具只刷心跳）；自动拉起
 *
 * ── 文化层 ──
 * - 损坏文件不静默：草稿/产物写盘错误 stderr+exit 1；pending job 文件损坏
 *   =stderr 逐个报告但不阻塞其余 job（job 保留，处置归人）
 * - 测试：tests/unit/tools/companion.test.ts（CLI 探针四步序+INV-26 failed
 *   路径 job 保留——AI-05 门二探针法同型）
 */
import { mkdir, readFile, readdir, rename, rm, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { markDone, planSession } from './queue.mjs'

/** 行形状 8 字段（ADR-0015 §1 字面；键序=规范化输出键序） */
const SEGMENT_FIELDS = [
  'role',
  'question',
  'model',
  'quote_text',
  'prefix_text',
  'suffix_text',
  'anchor_page',
  'content_md'
]
/** role 枚举镜像（真相=迁移 003 DDL CHECK / AI-01 zod——工具侧不 import 应用 src） */
const ROLES = ['first-read', 'second-read', 'adjudicate']
/** question 枚举镜像（七问 v1 冻结+divergence——同上） */
const QUESTIONS = ['Q1', 'Q2', 'Q3', 'Q4', 'Q5', 'Q6', 'Q7', 'divergence']
/** paperId 安全字符（应用侧 safeId 同型——CLI 参数防路径穿越） */
const SAFE_ID = /^[A-Za-z0-9_-]+$/

function nowIso() {
  return new Date().toISOString()
}

/** 草稿行规范化校验（纯函数）：形状/枚举/类型全查+键序规范化；零信息量段拒绝 */
export function normalizeSegments(rows) {
  if (!Array.isArray(rows)) {
    throw new Error(`草稿必须是行式锚定段数组（得到 ${Array.isArray(rows) ? 'array' : typeof rows}）`)
  }
  return rows.map((row, i) => {
    const where = `第 ${i + 1} 段`
    if (row === null || typeof row !== 'object' || Array.isArray(row)) {
      throw new Error(`${where}：不是对象`)
    }
    for (const k of SEGMENT_FIELDS) {
      if (!Object.hasOwn(row, k)) throw new Error(`${where}：缺字段 ${k}`)
    }
    for (const k of Object.keys(row)) {
      if (!SEGMENT_FIELDS.includes(k)) throw new Error(`${where}：未知字段 ${k}`)
    }
    if (!ROLES.includes(row.role)) {
      throw new Error(`${where}：role 必须是 ${ROLES.join('|')} 之一，得到 ${JSON.stringify(row.role)}`)
    }
    if (!QUESTIONS.includes(row.question)) {
      throw new Error(`${where}：question 必须是 Q1..Q7|divergence 之一，得到 ${JSON.stringify(row.question)}`)
    }
    if (typeof row.model !== 'string' || row.model === '') {
      throw new Error(`${where}：model 必须是非空字符串`)
    }
    for (const k of ['quote_text', 'prefix_text', 'suffix_text']) {
      if (typeof row[k] !== 'string') throw new Error(`${where}：${k} 必须是字符串（篇级回答允许空串）`)
    }
    if (row.anchor_page !== null && (!Number.isInteger(row.anchor_page) || row.anchor_page < 1)) {
      throw new Error(`${where}：anchor_page 必须是 >=1 的整数或 null（篇级回答）`)
    }
    if (typeof row.content_md !== 'string' || row.content_md.trim() === '') {
      throw new Error(`${where}：content_md 必须是非空白字符串`)
    }
    return {
      role: row.role,
      question: row.question,
      model: row.model,
      quote_text: row.quote_text,
      prefix_text: row.prefix_text,
      suffix_text: row.suffix_text,
      anchor_page: row.anchor_page,
      content_md: row.content_md
    }
  })
}

/** 原子写（tmp+rename；父目录首写 mkdir recursive 幂等 N06-6） */
async function writeAtomic(path, content) {
  const tmp = `${path}.tmp`
  await mkdir(dirname(path), { recursive: true })
  await writeFile(tmp, content, 'utf8')
  await rename(tmp, path)
}

/** 读 JSON（三态分离：ENOENT=fallback；损坏=上抛含路径不静默——queue.mjs readJson 同型） */
async function readJson(path, fallback) {
  try {
    return JSON.parse(await readFile(path, 'utf8'))
  } catch (e) {
    if (e instanceof Error && e.code === 'ENOENT') return fallback
    throw new Error(`读取/解析失败：${path}（${e instanceof Error ? e.message : String(e)}）——文件损坏？`)
  }
}

/** status.json 心跳（原子重写整文件；patch 未给字段保留；每步刷新 heartbeatAt） */
export async function writeStatusProtocol(protocolDir, patch = {}) {
  const path = join(protocolDir, 'status.json')
  const base = await readJson(path, { state: '', currentPaper: null, role: null })
  const stamp = nowIso()
  const next = {
    state: patch.state !== undefined ? patch.state : String(base.state ?? ''),
    currentPaper:
      patch.currentPaper !== undefined ? patch.currentPaper : base.currentPaper ?? null,
    role: patch.role !== undefined ? patch.role : base.role ?? null,
    updatedAt: stamp,
    heartbeatAt: stamp
  }
  await writeAtomic(path, `${JSON.stringify(next, null, 2)}\n`)
  return next
}

/** 扫描 pending job（requestedAt 升序；损坏文件报告不静默，job 保留） */
export async function listPendingJobs(protocolDir) {
  const dir = join(protocolDir, 'pending')
  let names = []
  try {
    names = await readdir(dir)
  } catch (e) {
    if (!(e instanceof Error && e.code === 'ENOENT')) throw e
    return { jobs: [], corrupt: [] }
  }
  const jobs = []
  const corrupt = []
  for (const name of names) {
    if (!name.endsWith('.json')) continue
    const file = join(dir, name)
    const raw = await readJson(file, undefined)
    if (
      raw === undefined ||
      raw === null ||
      typeof raw !== 'object' ||
      Array.isArray(raw) ||
      typeof raw.paperId !== 'string' ||
      raw.paperId === '' ||
      typeof raw.kind !== 'string' ||
      typeof raw.requestedAt !== 'string'
    ) {
      corrupt.push({ file, message: '期望 { paperId, kind, requestedAt }' })
      continue
    }
    jobs.push({ jobId: name.slice(0, -5), paperId: raw.paperId, kind: raw.kind, requestedAt: raw.requestedAt, file })
  }
  jobs.sort((a, b) => (a.requestedAt < b.requestedAt ? -1 : a.requestedAt > b.requestedAt ? 1 : a.file < b.file ? -1 : 1))
  return { jobs, corrupt }
}

/**
 * 拾取：首个可读 job（paperId ∈ 语料 manifest）。
 * kind≠'three-read' 的 job 不消费（v1 单值——报告为 unactionable，job 保留）。
 */
export async function pickNext(corpusDir, protocolDir) {
  const { jobs, corrupt } = await listPendingJobs(protocolDir)
  if (jobs.length === 0) return { kind: 'empty', corrupt }
  const session = await planSession(corpusDir)
  if (!session.active) {
    return { kind: 'blocked', reason: session.reason, jobs, corrupt }
  }
  const inManifest = (id) => session.manifest.papers.some((p) => p.paperId === id)
  const job = jobs.find((j) => j.kind === 'three-read' && inManifest(j.paperId))
  if (job === undefined) {
    return { kind: 'unactionable', jobs, corrupt }
  }
  const paper = session.manifest.papers.find((p) => p.paperId === job.paperId)
  const unactionable = jobs
    .filter((j) => j !== job && (j.kind !== 'three-read' || !inManifest(j.paperId)))
    .map((j) => `${j.paperId}${j.kind !== 'three-read' ? `（kind=${j.kind}）` : ''}`)
  return {
    kind: 'job',
    job,
    paper: {
      paperId: paper.paperId,
      title: paper.title,
      file: paper.file,
      fulltext: `fulltext/${paper.paperId}.txt`,
      figures: paper.figures
    },
    unactionable,
    corrupt
  }
}

/**
 * 产物落盘+移除 job（顺序=INV-26 红线：①规范化校验②原子写 corpus-ai③移除
 * pending job④markDone 语料进度⑤刷心跳——任何失败路径 job 保留）
 */
export async function deliver(corpusDir, protocolDir, paperId, draftPaths) {
  if (!SAFE_ID.test(paperId)) {
    throw new Error(`paperId 含非法字符（仅允许字母数字、下划线、连字符）：${paperId}`)
  }
  if (draftPaths.length === 0) throw new Error('--deliver 至少给一个草稿 JSON 路径')
  const rows = []
  for (const p of draftPaths) {
    const raw = await readJson(resolve(p), undefined)
    if (raw === undefined) throw new Error(`草稿不存在：${resolve(p)}`)
    if (!Array.isArray(raw)) throw new Error(`草稿必须是行式锚定段数组：${resolve(p)}`)
    rows.push(...raw)
  }
  const segments = normalizeSegments(rows)
  if (segments.length === 0) throw new Error('草稿为空——拒绝交付零段产物（至少一段）')

  const productPath = join(protocolDir, 'corpus-ai', `${paperId}.json`)
  await writeAtomic(productPath, `${JSON.stringify(segments, null, 2)}\n`)

  // 产物落盘成功后才动 job（INV-26：移除 job 以产物落盘为前提）
  const { jobs } = await listPendingJobs(protocolDir)
  const removedJobs = []
  for (const j of jobs.filter((x) => x.paperId === paperId)) {
    await rm(j.file)
    removedJobs.push(j.jobId)
  }

  let queueMarked = false
  const session = await planSession(corpusDir)
  if (session.active && session.manifest.papers.some((p) => p.paperId === paperId)) {
    // outputs=产物绝对路径（产物落协议根，非语料目录内——绝对路径免歧义）
    await markDone(corpusDir, paperId, [resolve(productPath)])
    queueMarked = true
  }
  await writeStatusProtocol(protocolDir, { state: `已交付：${paperId}`, currentPaper: paperId })
  return { productPath, removedJobs, queueMarked }
}

// ── CLI（zcode 会话内消费；stderr+exit 1 不静默） ──

const USAGE = [
  '用法：',
  '  node companion.mjs <语料目录> <协议目录>                                   拾取下一个 pending job（写心跳）',
  '  node companion.mjs <语料目录> <协议目录> --beat [状态自述] [角色]           刷新心跳（可选更新 state/role）',
  '  node companion.mjs <语料目录> <协议目录> --deliver <paperId> <草稿.json...>  产物规范化落盘+移除 job'
].join('\n')

function reportCorrupt(corrupt) {
  for (const c of corrupt) {
    console.error(`警告：pending job 文件损坏（${c.message}）：${c.file}——job 保留，处置归人`)
  }
}

async function pickupMain(corpusDir, protocolDir) {
  const r = await pickNext(corpusDir, protocolDir)
  reportCorrupt(r.corrupt)
  if (r.kind === 'empty') {
    console.log('无 pending job（应用侧暂无 AI 读文献请求；全库三读流可先用 queue.mjs 列队列）')
    return
  }
  if (r.kind === 'blocked') {
    console.error(`pending job ${r.jobs.length} 个，但语料目录不可激活：${r.reason}——回应用「设置 → AI 语料导出」重跑`)
    process.exit(1)
  }
  if (r.kind === 'unactionable') {
    const ids = r.jobs.map((j) => `${j.paperId}${j.kind !== 'three-read' ? `（kind=${j.kind}）` : ''}`).join('、')
    console.error(`pending job ${r.jobs.length} 个均不在语料 manifest（需回应用重新导出语料）：${ids}`)
    process.exit(1)
  }
  await writeStatusProtocol(protocolDir, {
    state: `已拾取：等待三读（${r.job.paperId}）`,
    currentPaper: r.job.paperId,
    role: null
  })
  console.log(`job：${r.job.jobId}  paperId=${r.job.paperId}  kind=${r.job.kind}  requestedAt=${r.job.requestedAt}`)
  console.log(`篇名：${r.paper.title}`)
  console.log(`语料：${r.paper.file} + ${r.paper.fulltext}` + (r.paper.figures.length > 0 ? ` + ${r.paper.figures.length} 图` : ''))
  if (r.unactionable.length > 0) {
    console.error(`警告：其余 job 暂不可读（不在 manifest/kind 未支持），已跳过：${r.unactionable.join('、')}`)
  }
}

async function main() {
  const [corpusDir, protocolDir, flag, ...rest] = process.argv.slice(2)
  if (corpusDir === undefined || corpusDir === '' || protocolDir === undefined || protocolDir === '') {
    console.error(USAGE)
    process.exit(1)
  }
  if (flag === undefined) {
    await pickupMain(corpusDir, protocolDir)
    return
  }
  if (flag === '--beat') {
    const [state, role] = rest
    const next = await writeStatusProtocol(protocolDir, { state, role })
    console.log(`心跳已刷新：${next.heartbeatAt}${state !== undefined ? `（state=${state}）` : ''}${role !== undefined ? `（role=${role}）` : ''}`)
    return
  }
  if (flag === '--deliver') {
    const [paperId, ...drafts] = rest
    if (paperId === undefined || drafts.length === 0) {
      console.error(USAGE)
      process.exit(1)
    }
    const r = await deliver(corpusDir, protocolDir, paperId, drafts)
    console.log(`已交付：${r.productPath}（移除 job ${r.removedJobs.join('、') || '无'}；queue 置 done=${r.queueMarked}）`)
    return
  }
  console.error(USAGE)
  process.exit(1)
}

const invokedAsScript =
  process.argv[1] !== undefined && fileURLToPath(import.meta.url) === resolve(process.argv[1])
if (invokedAsScript) {
  try {
    await main()
  } catch (e) {
    console.error(e instanceof Error ? e.message : String(e))
    process.exit(1)
  }
}
