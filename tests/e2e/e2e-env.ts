/**
 * [SR2-AI-08] e2e 环境基建共用（launch+seedPaperRow+bootstrapMigrations）。
 *
 * Rule of Three 抽取形态：reader-text.spec / corpus-export.spec 各持一份
 * （第 2 次保持重复），本文件为第 3 次出现——按 AGENTS 抽共用；W1C
 * （F-TESTREF-W1C）把各 spec 内联的 launch 5 副本、seedPaperRow 4 份本地
 * 定义与第一跳迁移配方（14 处复制）收敛到本单源。
 */
import { _electron as electron, type ElectronApplication } from '@playwright/test'
import { spawn } from 'node:child_process'
import { join } from 'node:path'

export function launch(userData: string, extraEnv: Record<string, string> = {}): Promise<ElectronApplication> {
  return electron.launch({
    args: ['out/main/index.js'],
    env: { ...process.env, SYNAPSE_USER_DATA: userData, ...extraEnv } as Record<string, string>
  })
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

/** 拉起子进程跑 seed-paper.mjs；退出码非 0 即拒绝 */
function runSeedScript(env: NodeJS.ProcessEnv): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [join(process.cwd(), 'tests', 'e2e', 'seed-paper.mjs')], {
      env,
      stdio: 'inherit'
    })
    child.on('exit', (code) => {
      if (code === 0) {
        resolve()
      } else {
        reject(new Error(`seed-paper.mjs 退出码 ${code ?? 'null'}`))
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
  extra: { year?: number; venue?: string; cited?: number } = {}
): Promise<void> {
  const optionalEnv: Record<string, string> = {}
  if (extra.year !== undefined) optionalEnv.SEED_YEAR = String(extra.year)
  if (extra.venue !== undefined) optionalEnv.SEED_VENUE = extra.venue
  if (extra.cited !== undefined) optionalEnv.SEED_CITED = String(extra.cited)
  await runSeedScript({
    ...process.env,
    SEED_DB: join(userData, 'synapse.db'),
    SEED_FILE_REF: fileRef,
    SEED_SHA: sha,
    SEED_TITLE: title,
    SEED_ID: id,
    ...optionalEnv
  } as NodeJS.ProcessEnv)
}
