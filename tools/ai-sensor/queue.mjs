// b3: P7-G
/**
 * [SR2-AI-05] tools/ai-sensor queue —— zcode 工具骨架（工单：done / strong）
 *
 * ── 行为层 ──
 * - 纯函数核心（测试主面）：diffQueue（manifest ↔ progress diff → 未建档队列；
 *   已 done 篇不重跑=断点续跑，重导后新篇入队/旧 done 保持=幂等，progress
 *   中不在 manifest 的条目=staleIds 报告不参与队列）+applyDone（篇级产物落盘
 *   后才置 done——调用方负责先落盘再标记；重复调用 outputs 覆盖不重复条目；
 *   纯函数不 mutate 入参）+freshProgress（空进度种子，全篇 pending）
 * - IO 骨架（与纯函数分离）：planSession（读 manifest+progress→队列计划；
 *   manifest 不存在=不激活——唯一激活判据 ADR-0011 v1.1「manifest 存在=导出
 *   完整就绪」）+markDone（progress.json 原子更新 tmp+rename——应用侧
 *   manifest 终局单写同型）；CLI：`node queue.mjs <dir>` 打印队列 /
 *   `--done <paperId> <outputs...>` 标记完成
 * - **断点续跑语义边界**：仅指工具内部三读队列（zcode 会话中断后 done 篇不
 *   重跑）；导出会话中断=无 manifest=工具不激活，应用侧重跑=清空重建全量
 *   （INV-18——两层断点互不相干）
 * - progress.json schema：{ schemaVersion, items: [{ paperId, status:
 *   'pending'|'done', outputs: string[]（篇级产物相对路径）}] }
 *
 * ── 接口层 ──
 * - export function diffQueue(manifest, progress): QueuePlan
 * - export function applyDone(progress, paperId, outputs): ProgressState
 * - export function freshProgress(manifest): ProgressState
 * - export async function planSession(dir) / markDone(dir, paperId, outputs)
 * - 类型面=邻接 queue.d.mts（ts 测试消费；.mjs 本体零依赖纯 JS）
 *
 * ── 架构层 ──
 * - tools/ai-sensor/ 随应用仓库版本管理；不 import 应用 src（边界铁律：
 *   应用侧零 LLM 出网 D2b；DB 只读导出目录——禁写应用 DB，真相源单向）；
 *   零 npm 依赖（node 内置模块；模型调用=zcode 会话内建模能力，工具只编排
 *   不直连 API——零出网面）；eslint 覆盖（`eslint .` 全仓 glob 实证含本目录）
 *
 * ── 生命周期层 ──
 * - 预留：三读/梳理管线本体=提示词工程实验循环（prompts/ 迭代，不工单化）
 * - 不做：安装包/发布物；config.json 入库（gitignore）；应用内 UI
 *
 * ── 文化层 ──
 * - 测试：tests/unit/tools/queue.test.ts（已锁定——vitest 宿主 R11，弃
 *   node:test 防两套测试基建；diff/幂等/断点续跑/纯函数不 mutate/种子五面）
 * - CLI 错误=stderr+exit 1（zcode 会话内可见，不静默）
 */
import { readFile, rename, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { join, resolve } from 'node:path'

export const PROGRESS_SCHEMA_VERSION = 1
const PROGRESS_FILE = 'progress.json'

/** 空进度种子（全篇 pending——首跑或 progress.json 缺失时） */
export function freshProgress(manifest) {
  return {
    schemaVersion: PROGRESS_SCHEMA_VERSION,
    items: manifest.papers.map((p) => ({ paperId: p.paperId, status: 'pending', outputs: [] }))
  }
}

/** 篇终局翻转（纯函数：不 mutate 入参；已 done 篇=outputs 覆盖不重复条目） */
export function applyDone(progress, paperId, outputs) {
  const exists = progress.items.some((i) => i.paperId === paperId)
  const items = exists
    ? progress.items.map((i) => (i.paperId === paperId ? { ...i, status: 'done', outputs } : i))
    : [...progress.items, { paperId, status: 'done', outputs }]
  return { schemaVersion: PROGRESS_SCHEMA_VERSION, items }
}

/** manifest ↔ progress diff：pending=manifest 序内未 done 篇（消费指针
 *  file/title/fulltext/figures）；staleIds=progress 已不在 manifest 的条目 */
export function diffQueue(manifest, progress) {
  const statusByPaper = new Map(progress.items.map((i) => [i.paperId, i.status]))
  const pending = []
  let doneCount = 0
  for (const p of manifest.papers) {
    if (statusByPaper.get(p.paperId) === 'done') {
      doneCount += 1
      continue
    }
    pending.push({
      paperId: p.paperId,
      file: p.file,
      title: p.title,
      fulltext: `fulltext/${p.paperId}.txt`,
      figures: p.figures
    })
  }
  const manifestIds = new Set(manifest.papers.map((p) => p.paperId))
  const staleIds = progress.items
    .filter((i) => !manifestIds.has(i.paperId))
    .map((i) => i.paperId)
  return { pending, doneCount, totalCount: manifest.papers.length, staleIds }
}

// ── IO 骨架（读导出目录——真相源单向：只读 manifest，只写 progress.json） ──

/** 读 JSON：ENOENT=返回 fallback（首跑/缺失语义）；损坏或读失败=上抛不静默
 *  （门一 W1——progress.json 损坏时静默重置会让全库三读成果无声丢失） */
async function readJson(path, fallback) {
  try {
    return JSON.parse(await readFile(path, 'utf8'))
  } catch (e) {
    if (e instanceof Error && e.code === 'ENOENT') return fallback
    throw new Error(`读取/解析失败：${path}（${e instanceof Error ? e.message : String(e)}）——文件损坏？`)
  }
}

/** progress.json 原子更新（tmp+rename——应用侧 manifest 终局单写同型） */
async function writeProgressAtomic(dir, progress) {
  const tmp = join(dir, `${PROGRESS_FILE}.tmp`)
  await writeFile(tmp, `${JSON.stringify(progress, null, 2)}\n`, 'utf8')
  await rename(tmp, join(dir, PROGRESS_FILE))
}

/** 读 manifest：ENOENT=undefined（未导出语义）；存在但形态不对（null/非对象/
 *  缺 papers）=上抛——门二 N-新1：undefined 哨兵天然免疫 JSON null 碰撞
 *  （JSON.parse 永不返回 undefined），null 内容不再静默走「不存在」分支 */
async function loadManifest(dir) {
  const manifest = await readJson(join(dir, 'manifest.json'), undefined)
  if (
    manifest !== undefined &&
    (manifest === null || typeof manifest !== 'object' || !Array.isArray(manifest.papers))
  ) {
    throw new Error('manifest.json 存在但形态不对（null/非对象/缺 papers 数组）——非导出产物或已损坏')
  }
  return manifest
}

/** 读入+版本守门（门一 N2：schemaVersion 只写不读=有版本位无版本门——
 *  未知版本静默按 v1 处理是未声明假设；形态不对同报——progress 是工具私有
 *  可再生文件，报错引导手动删除后全量重读，不静默重置） */
async function loadProgress(dir, manifest) {
  const progress = await readJson(join(dir, PROGRESS_FILE), undefined)
  if (progress === undefined) return freshProgress(manifest)
  if (
    progress === null ||
    typeof progress !== 'object' ||
    progress.schemaVersion !== PROGRESS_SCHEMA_VERSION
  ) {
    throw new Error(
      `progress.json 形态/版本不对（期望 schemaVersion=${PROGRESS_SCHEMA_VERSION}）` +
        '——删除该文件后重跑=全量重读（进度文件为工具私有可再生状态）'
    )
  }
  return progress
}

/** 会话计划：manifest 不存在=不激活（唯一激活判据——中断导出无 manifest） */
export async function planSession(dir) {
  const manifest = await loadManifest(dir)
  if (manifest === undefined) {
    return {
      active: false,
      reason: 'manifest.json 不存在——导出未完成或目录不对（manifest 存在=导出完整就绪，ADR-0011 v1.1）'
    }
  }
  const progress = await loadProgress(dir, manifest)
  return { active: true, manifest, progress, plan: diffQueue(manifest, progress) }
}

/** 标记一篇完成（先落盘产物再调用——outputs=篇级产物相对路径清单） */
export async function markDone(dir, paperId, outputs) {
  const manifest = await loadManifest(dir)
  if (manifest === undefined) throw new Error('manifest.json 不存在——无法标记完成')
  // 门一 N3a：paperId 必须∈manifest（打错 ID 的幽灵条目当场拒绝，不再事后
  // 经 staleIds 间接可见）
  if (!manifest.papers.some((p) => p.paperId === paperId)) {
    throw new Error(`paperId 不在 manifest：${paperId}`)
  }
  // 门一 N3c：零 outputs 拒绝（「篇级产物落盘后才置 done」不靠调用方纪律）
  if (outputs.length === 0) throw new Error('--done 至少给一个产物相对路径')
  const progress = await loadProgress(dir, manifest)
  const next = applyDone(progress, paperId, outputs)
  await writeProgressAtomic(dir, next)
  return next
}

// ── CLI（zcode 会话内消费：打队列/标完成） ──

async function main() {
  const [dir, flag, paperId, ...outputs] = process.argv.slice(2)
  if (dir === undefined || dir === '' || (flag !== undefined && flag !== '--done')) {
    console.error('用法：node queue.mjs <导出目录> [--done <paperId> <产物相对路径...>]')
    process.exit(1)
  }
  if (flag === '--done') {
    if (paperId === undefined) {
      console.error('--done 需要 paperId')
      process.exit(1)
    }
    await markDone(dir, paperId, outputs)
    console.log(`已标记完成：${paperId}`)
    return
  }
  const session = await planSession(dir)
  if (!session.active) {
    console.error(session.reason)
    process.exit(1)
  }
  const { plan } = session
  console.log(`队列：${plan.pending.length} 篇待读 / ${plan.doneCount}/${plan.totalCount} 已完成`)
  for (const p of plan.pending) {
    console.log(`- ${p.paperId}  ${p.title}  (${p.file} + ${p.fulltext})`)
  }
  if (plan.staleIds.length > 0) {
    console.log(`stale（manifest 已不含，可忽略）：${plan.staleIds.join(', ')}`)
  }
}

const invokedAsScript =
  process.argv[1] !== undefined && fileURLToPath(import.meta.url) === resolve(process.argv[1])
if (invokedAsScript) {
  try {
    await main()
  } catch (e) {
    // 损坏/版本不匹配等 IO 异常兜底：可见+非零退出（W1——不静默）
    console.error(e instanceof Error ? e.message : String(e))
    process.exit(1)
  }
}
