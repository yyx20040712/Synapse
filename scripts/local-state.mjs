#!/usr/bin/env node
/**
 * local-state.mjs —— 本机状态导出/导入（设备迁移工具，2026-08-27 方案 C）。
 *
 * 丢失面=git 之外的本机细节（盘点见 docs/DEV-SETUP.md §4）：
 *   ①userData 开发数据三件（synapse.db+files/+settings.json——不含 Cache 族）
 *   ②scripts/audits/*.log 原始红绿日志（md 报告在库，log 是本机证据）
 * 归档=local-state-backup/synapse-local-state-<date>.tar.gz（gitignore），
 * 内含 manifest.json（文件清单——导入后核对）。
 *
 * 用法（node scripts/local-state.mjs <cmd>）：
 *   export [userDataDir]   导出到 local-state-backup/（userDataDir 缺省=
 *                          %APPDATA%/Synapse Remake；e2e 隔离目录不在此列）
 *   import <archive> [--force] [userDataDir]
 *                          导入（应用进程须先关闭——SQLite 文件锁；目标 db
 *                          已存在时须 --force 显式确认覆盖）
 *   list <archive>         只读清单核对
 *
 * 零依赖：复制=node fs.cpSync；打包=系统 tar（Windows 10+/Git Bash/macOS/
 * linux 均自带 bsdtar）。
 */
import { execFileSync } from 'node:child_process'
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { argv, env, exit } from 'node:process'
import { join, resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const backupDir = join(root, 'local-state-backup')

function fail(msg) {
  console.error(`[local-state] ${msg}`)
  exit(1)
}

function defaultUserData() {
  const appData = env.APPDATA ?? env.XDG_CONFIG_HOME ?? ''
  if (!appData) fail('无法定位 userData：缺 APPDATA/XDG_CONFIG_HOME——手动传目录参数')
  return join(appData, 'Synapse Remake')
}

function mustExist(p, what) {
  if (!existsSync(p)) fail(`${what} 不存在：${p}`)
}

function runTar(args, cwd) {
  try {
    execFileSync('tar', args, { stdio: 'inherit', ...(cwd ? { cwd } : {}) })
  } catch {
    fail('tar 调用失败——Windows 10+/Git Bash/macOS/linux 自带 bsdtar；确认 PATH')
  }
}

function stamp() {
  const d = new Date()
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${d.getDate()}-${p(d.getHours())}${p(d.getMinutes())}`
}

/** userData 三件+audits 日志 → 归档条目（rel 用正斜杠——tar 内路径跨平台） */
function collect(ud) {
  const triplet = [
    { src: join(ud, 'synapse.db'), rel: 'user-data/synapse.db' },
    { src: join(ud, 'settings.json'), rel: 'user-data/settings.json' },
    { src: join(ud, 'files'), rel: 'user-data/files' }
  ]
  for (const t of triplet) mustExist(t.src, `userData 三件之「${t.rel}」`)
  const audits = join(root, 'scripts', 'audits')
  const logs = existsSync(audits)
    ? readdirSync(audits)
        .filter((n) => n.endsWith('.log'))
        .map((n) => ({ src: join(audits, n), rel: `audits-logs/${n}` }))
    : []
  if (logs.length === 0) console.warn('[local-state] 注意：audits 目录无 .log（可能已归档过或被清理）')
  return [...triplet, ...logs]
}

function cmdExport() {
  const ud = argv[3] ? resolve(argv[3]) : defaultUserData()
  mustExist(ud, 'userData 目录')
  const entries = collect(ud)

  const staging = join(backupDir, `.staging-${stamp()}`)
  mkdirSync(staging, { recursive: true })
  const manifest = []
  for (const e of entries) {
    const dest = join(staging, ...e.rel.split('/'))
    mkdirSync(resolve(dest, '..'), { recursive: true })
    cpSync(e.src, dest, { recursive: true })
    manifest.push({ rel: e.rel, kind: statSync(e.src).isDirectory() ? 'dir' : 'file' })
  }
  writeFileSync(
    join(staging, 'manifest.json'),
    JSON.stringify(
      {
        exportedAt: new Date().toISOString(),
        machine: env.COMPUTERNAME ?? env.HOSTNAME ?? 'unknown',
        note: '导入前关闭应用进程（SQLite 文件锁）；导入=node scripts/local-state.mjs import <archive>',
        entries: manifest
      },
      null,
      2
    ),
    'utf8'
  )

  mkdirSync(backupDir, { recursive: true })
  const archive = join(backupDir, `synapse-local-state-${stamp()}.tar.gz`)
  // cwd=staging 相对调 tar：规避 Windows 下中文绝对路径经 argv 传递的编码问题
  runTar(['-czf', '../' + `synapse-local-state-${stamp()}.tar.gz`, '.'], staging)
  rmSync(staging, { recursive: true, force: true })
  console.log(`[local-state] 导出完成：${archive}`)
  console.log(`[local-state] 含 userData 三件 + ${manifest.length - 3} 个日志；清单=归档内 manifest.json`)
  console.log('[local-state] 迁移动作：把该文件拷至新设备仓库根，跑 import。')
}

/** 「E:\中文」路径 → 相对仓库根的正斜杠路径：规避 GNU tar 把盘符冒号当远程主机 */
function toRelPosix(abs) {
  const a = resolve(abs).split('\\').join('/')
  const r = root.split('\\').join('/')
  if (a.startsWith(r + '/')) return a.slice(r.length + 1)
  return a
}

function cmdList(archive) {
  mustExist(archive, '归档')
  runTar(['-tzf', toRelPosix(archive)], root)
}

function cmdImport(archive) {
  mustExist(archive, '归档')
  const udArgIdx = argv.findIndex((a, i) => i > 3 && !a.startsWith('--'))
  const ud = udArgIdx > 0 ? resolve(argv[udArgIdx]) : defaultUserData()

  const tmp = join(backupDir, `.import-${stamp()}`)
  mkdirSync(tmp, { recursive: true })
  runTar(['-xzf', toRelPosix(archive), '-C', tmp.split('\\').join('/')], root)
  mustExist(join(tmp, 'manifest.json'), '归档 manifest（非本工具产物？）')

  // 覆盖守卫：目标 db 已存在且未 --force → 拒绝（防误覆盖新机新数据）
  if (existsSync(join(ud, 'synapse.db')) && !argv.includes('--force')) {
    console.error(`[local-state] 目标已存在 ${join(ud, 'synapse.db')}——确认覆盖请加 --force 重跑（新机已有数据会被替换）`)
    exit(1)
  }
  for (const rel of ['user-data/synapse.db', 'user-data/settings.json', 'user-data/files']) {
    const src = join(tmp, ...rel.split('/'))
    if (!existsSync(src)) continue
    const dest = join(ud, rel.slice('user-data/'.length))
    mkdirSync(resolve(dest, '..'), { recursive: true })
    cpSync(src, dest, { recursive: true })
  }
  const logsSrc = join(tmp, 'audits-logs')
  if (existsSync(logsSrc)) {
    const dest = join(root, 'scripts', 'audits', 'logs-restored')
    cpSync(logsSrc, dest, { recursive: true })
    console.log(`[local-state] 日志恢复至 ${dest}（不直接混入 audits/——核对后自行并入或留存）`)
  }
  rmSync(tmp, { recursive: true, force: true })
  console.log(`[local-state] 导入完成：userData→${ud}`)
  console.log('[local-state] 核对：npm run verify 基线 + 启动应用看文献库。')
}

const cmd = argv[2]
if (cmd === 'export') cmdExport()
else if (cmd === 'import') {
  if (!argv[3]) fail('用法：import <archive> [--force] [userDataDir]')
  cmdImport(resolve(argv[3]))
} else if (cmd === 'list') {
  if (!argv[3]) fail('用法：list <archive>')
  cmdList(resolve(argv[3]))
}
else {
  console.log('用法：node scripts/local-state.mjs export [userDataDir] | import <archive> [--force] [userDataDir] | list <archive>')
  exit(cmd ? 1 : 0)
}
