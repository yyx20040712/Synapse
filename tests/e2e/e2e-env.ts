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
import { copyFile, readdir, readFile, writeFile } from 'node:fs/promises'
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
 * 种子落库（better-sqlite3 双 ABI 处理——reader-text.spec 头注存档同型）：
 * 备份 electron 绑定→子进程用 node ABI 落库→finally 还原（Windows 文件锁
 * 决定必须子进程）。
 */
export async function seedPaperRow(
  userData: string,
  fileRef: string,
  sha: string,
  title: string,
  id = 'e2e-seed-paper'
): Promise<void> {
  const pkgDir = join(process.cwd(), 'node_modules', 'better-sqlite3')
  const releaseBinding = join(pkgDir, 'build', 'Release', 'better_sqlite3.node')
  const cacheDir = join(pkgDir, 'abi-cache')
  const wanted = `node-v${process.versions.modules}`
  const dirs = (await readdir(cacheDir)).filter((d) => d.startsWith('node-v'))
  const pick = dirs.includes(wanted) ? wanted : (dirs.sort().at(-1) ?? '')
  if (!pick) throw new Error('abi-cache 缺 node 绑定——先跑 npm ci（postinstall 会 setup）')
  const electronBinding = await readFile(releaseBinding)
  await copyFile(join(cacheDir, pick, 'better_sqlite3.node'), releaseBinding)
  try {
    await runSeedScript({
      ...process.env,
      SEED_DB: join(userData, 'synapse.db'),
      SEED_FILE_REF: fileRef,
      SEED_SHA: sha,
      SEED_TITLE: title,
      SEED_ID: id
    } as NodeJS.ProcessEnv)
  } finally {
    await writeFile(releaseBinding, electronBinding)
  }
}
