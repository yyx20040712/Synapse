/**
 * [F-EVCTX-01] test-results/run-* 分 run 产物修剪纯逻辑（独立 helper——
 * playwright globalSetup 薄壳=tests/e2e/global-setup.ts；单测=
 * tests/unit/e2e-output-prune.test.ts。独立件缘由：vitest exclude
 * tests/e2e/** 连带封锁 vite-node 对该目录模块加载，同文件导出不可达）。
 * 保留 mtime 最新 PRUNE_KEEP 个 run-* 目录、余者递归删除——error-context.md
 * 失败指纹多轮保留（立案线「同用例 2 次记失败指纹」取证余量远超）与磁盘
 * 上界两兼。**[RR1-2 口径如实化] 保留 10 目录≈5 轮运行指纹**：单轮 e2e
 * 产两个 run-<stamp> 目录（globalSetup 进程空目录+主测试进程产物目录——
 * stamp=config 顶层每进程求值一次，双 stamp 现象实证在档）；PW_RUN_STAMP
 * 逃生门复跑者自定保号名=两进程同号共目录（单目录既有副用——**每次运行
 * 换新保号名时**目录计数=轮计数口径成立；复用同一保号名的多轮=共目录
 * 覆写形态〔默认覆写语义回归——逃生门本意即自定归集〕）。手算依据：单轮失败产物=error-context.md 数 KB+trace.zip
 * 数百 KB~低 MB；10 目录≈数十 MB 上限可承受；立案线=同用例 2 次，≈5 轮
 * 余量远超取证需求。
 */
import { readdir, rm, stat } from 'node:fs/promises'
import { join } from 'node:path'

/** 保留 run 数（10——头注手算依据） */
export const PRUNE_KEEP = 10

/** dir 下 run-* 目录按 mtime 降序保留前 keep 个、余者递归删除；非 run- 前缀
 *  条目/文件不动；目录不存在/空目录/不足 keep=零删零抛。stat 竞态失败条目
 *  跳过不删（宁留勿误删）；单条目 rm 失败上抛=调用方承接（globalSetup
 *  try/catch——清理故障禁阻塞 e2e） */
export async function pruneRunDirs(dir: string, keep: number): Promise<void> {
  let entries
  try {
    entries = await readdir(dir, { withFileTypes: true })
  } catch {
    return // 目录不存在等=零删零抛
  }
  const withMtime: Array<{ name: string; mtimeMs: number }> = []
  for (const e of entries) {
    if (!e.isDirectory() || !e.name.startsWith('run-')) continue
    try {
      const s = await stat(join(dir, e.name))
      withMtime.push({ name: e.name, mtimeMs: s.mtimeMs })
    } catch {
      // stat 失败（竞态删除等）=跳过该条目（不删——宁留勿误删）
    }
  }
  // mtime 降序；并列=名升序（确定性红线——无随机序）
  withMtime.sort((a, b) => b.mtimeMs - a.mtimeMs || (a.name < b.name ? -1 : 1))
  for (const victim of withMtime.slice(keep)) {
    await rm(join(dir, victim.name), { recursive: true, force: true })
  }
}
