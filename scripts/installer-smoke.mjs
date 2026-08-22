#!/usr/bin/env node
/**
 * [SR-PKG-02] installer-smoke.mjs —— 安装包冒烟：静默装 → 沙箱启动 → 存活断言 → 静默卸载
 * （工单：done / strong）
 *
 * ── 行为层 ──
 * - 对 dist 产物（默认取最新 .exe，--installer <path> 可覆盖）执行：
 *   ① NSIS 静默安装（/S /D=<临时目录>，等安装进程退出）；
 *   ② 以 SYNAPSE_USER_DATA=<临时用户数据目录> 启动已装 exe；
 *   ③ 存活断言：主进程 ≥8s 采样不退出（崩溃/闪退即 FAIL）；
 *   ④ 结束进程树 → 运行卸载器 /S → 断言卸载完整性 = 安装目录内文件清零 +
 *     卸载注册表项已清（HKCU/HKLM，reg query /s /f 子串匹配）+ 卸载器自删
 *     （上游 electron-builder#1298：NSIS 静默卸载末尾 RMDir $INSTDIR 时序性失败
 *     可留空目录壳，属已知无害残留）→ 空目录壳由本脚本代为 rmdir（清不掉才
 *     FAIL）→ 删临时目录；
 *   ⑤ 任一步失败：exit 1 并打印步骤名（--keep 保留现场便于排查）。
 * - 冒烟只验「装得上、起得来、卸得掉」；全链路（导入→阅读→标注→导出）由用户在
 *   干净环境人工验收（ROADMAP Phase 6 验收原文）。
 *
 * ── 接口层 ──
 * - 直接运行（package.json "smoke:installer" 接线）；无导出。
 *
 * ── 架构层 ──
 * - 依赖：SR-PKG-01 的 dist 产物；Windows NSIS 安装器约定（/S、/D=、
 *   Uninstall executable 命名）与 reg query 卸载注册表断言。
 *
 * ── 生命周期层 ──
 * - 预留：--keep；不做：已装应用的功能级 e2e（那是 playwright 层面）。
 *
 * ── 文化层 ──
 * - 错误：步骤级命名报错不吞；所有超时显式常量；禁止占位实现残留。
 */
import { spawn, spawnSync } from 'node:child_process'
import { existsSync, mkdtempSync, readdirSync, rmdirSync, rmSync, statSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ALIVE_WINDOW_MS = 8_000 // 存活断言窗口（≥8s）
const ALIVE_SAMPLE_MS = 2_000 // 采样间隔
const UNINSTALL_WAIT_MS = 30_000 // 卸载完整性轮询上限（超时且目录非空=卸载完整性 FAIL）
const UNINSTALL_POLL_MS = 2_000 // 完整性轮询间隔
const INSTALLER_TIMEOUT_MS = 120_000 // 安装器 spawnSync 上限
const TASKKILL_TIMEOUT_MS = 30_000 // taskkill spawnSync 上限
const UNINSTALLER_TIMEOUT_MS = 30_000 // 卸载器 spawnSync 上限
const REG_TIMEOUT_MS = 15_000 // reg query spawnSync 上限
const REG_UNINSTALL_BASE = 'Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall'
const REG_KEYS = ['io.github.yyx20040712.synapse', 'Synapse Remake'] // appId 与产品名，两个关键字都搜
const APP_EXE = 'Synapse Remake.exe'
const UNINSTALL_EXE = 'Uninstall Synapse Remake.exe'

const keep = process.argv.includes('--keep')
const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)))
let installDir = ''
let dataDir = ''
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const took = (t0) => `${Date.now() - t0}ms`

// 任一步失败：打印步骤名+细节，保留现场，exit 1（规约⑤）
function fail(step, detail) {
  console.error(`[smoke] FAIL @ ${step}：${detail}`)
  console.error(`[smoke] 现场保留：installDir=${installDir || '未创建'} dataDir=${dataDir || '未创建'}`)
  process.exit(1)
}

function isAlive(pid) {
  try {
    process.kill(pid, 0)
    return true
  } catch (e) {
    return e.code === 'EPERM' // EPERM=进程存在但无权限，同样算存活
  }
}

// 步骤⓪ 定位安装包：--installer <path> 可覆盖，缺省取 dist/ 最新 *-setup.exe
function locateInstaller() {
  const t0 = Date.now()
  const i = process.argv.indexOf('--installer')
  let p = ''
  if (i !== -1) {
    if (process.argv[i + 1] === undefined) fail('定位安装包', '--installer 缺路径参数')
    p = resolve(process.argv[i + 1])
  } else {
    const distDir = join(repoRoot, 'dist')
    const setups = existsSync(distDir) ? readdirSync(distDir).filter((n) => n.endsWith('-setup.exe')) : []
    if (setups.length === 0) fail('定位安装包', 'dist/ 无 *-setup.exe——先 npm run dist 产出安装包')
    setups.sort((a, b) => statSync(join(distDir, b)).mtimeMs - statSync(join(distDir, a)).mtimeMs)
    p = join(distDir, setups[0])
  }
  if (!existsSync(p)) fail('定位安装包', `不存在：${p}`)
  console.log(`[定位安装包] ${took(t0)} 找到 ${p}`)
  return p
}

// 步骤① NSIS 静默安装：/D= 必须是末位单 argv 且路径无空格（NSIS 固有语法）
function silentInstall(installer) {
  console.log('[安装] 开始')
  const t0 = Date.now()
  installDir = mkdtempSync(join(tmpdir(), 'synapse-smoke-install-'))
  dataDir = mkdtempSync(join(tmpdir(), 'synapse-smoke-data-'))
  if (/\s/.test(installDir)) fail('安装', `路径含空格，/D= 不接受：${installDir}`)
  const r = spawnSync(installer, ['/S', `/D=${installDir}`], { stdio: 'ignore', timeout: INSTALLER_TIMEOUT_MS })
  if (r.signal === 'SIGTERM') fail('安装', `外部命令超时：安装器 >${INSTALLER_TIMEOUT_MS}ms 未退出`)
  if (r.error) fail('安装', `无法启动安装器：${r.error.message}`)
  if (r.status !== 0) fail('安装', `安装器退出码 ${r.status}`)
  if (!existsSync(join(installDir, APP_EXE))) fail('安装', `安装目录无 ${APP_EXE}`)
  console.log(`[安装] ${took(t0)} exit=0，${APP_EXE} 在位`)
}

// 步骤② 沙箱启动：SYNAPSE_USER_DATA 指向临时目录，不污染真实用户数据
function launchApp() {
  console.log('[启动] 开始')
  const t0 = Date.now()
  const child = spawn(join(installDir, APP_EXE), [], { detached: false, env: { ...process.env, SYNAPSE_USER_DATA: dataDir }, stdio: 'ignore' })
  if (child.pid === undefined) fail('启动', 'spawn 未返回 pid（可执行文件缺失或权限不足）')
  child.on('error', (e) => console.error(`[启动] error 事件（进程异常，将由存活断言判 FAIL）：${e.message}`))
  console.log(`[启动] ${took(t0)} pid=${child.pid}（userData=${dataDir}）`)
  return child.pid
}

// 步骤③ 存活断言：ALIVE_WINDOW_MS 内每 ALIVE_SAMPLE_MS 采样，期间退出即 FAIL
async function assertAlive(pid) {
  console.log('[存活断言] 开始')
  const t0 = Date.now()
  for (let el = 0; el < ALIVE_WINDOW_MS; el += ALIVE_SAMPLE_MS) {
    await sleep(ALIVE_SAMPLE_MS)
    if (!isAlive(pid)) fail('存活断言', `启动后 ${el + ALIVE_SAMPLE_MS}ms 进程已退出（pid=${pid}）`)
    console.log(`[存活断言] ${el + ALIVE_SAMPLE_MS}ms 仍存活（pid=${pid}）`)
  }
  console.log(`[存活断言] ${took(t0)} PASS：${ALIVE_WINDOW_MS}ms 全程存活`)
}

// 卸载完整性轮询：文件清零且卸载器自删 → PASS（空壳则代 rmdir）；超时非空 → FAIL
async function assertUninstalled() {
  const deadline = Date.now() + UNINSTALL_WAIT_MS
  for (;;) {
    await sleep(UNINSTALL_POLL_MS)
    let entries
    try {
      entries = readdirSync(installDir)
    } catch (e) {
      if (e.code === 'ENOENT' || e.code === 'ENOTDIR') return // 目录整体消失：最干净路径
      if (Date.now() >= deadline) fail('清理', `安装目录不可读（${e.code}）：${installDir}`)
      continue // 瞬时占用（杀软扫描等）下轮再看，30s 上限兜底
    }
    if (entries.length === 0) {
      // TOCTOU 容错：readdir 见空到 rmdir 之间，目录可能被外部移除（ENOENT=已清理）或瞬时占用（重试）
      try {
        rmdirSync(installDir)
        console.log('[清理] 上游 #1298 空目录残留已代清理')
        return
      } catch (e) {
        if (e.code === 'ENOENT') {
          console.log('[清理] 空目录壳已被外部移除，视为已清理')
          return
        }
        if (Date.now() >= deadline) fail('清理', `空目录壳代清理失败（上游 #1298 残留清不掉，${e.code}）：${installDir}`)
        continue // EPERM/EBUSY 瞬时占用，下轮 readdir 先行（目录不在则走整体消失），30s 上限兜底
      }
    }
    if (Date.now() >= deadline) {
      fail('清理', `卸载后 ${UNINSTALL_WAIT_MS}ms 安装目录仍非空（剩 ${entries.length} 项：${entries.slice(0, 5).join('、')}）：${installDir}`)
    }
  }
}

// 强断言：HKCU/HKLM 的 Uninstall 树无本应用残留（reg query /s /f；退出码三分：
// 0=命中残留 FAIL，1=未找到=干净 PASS，≥2 或 error=查询本身失败 FAIL，不许静默当干净）
function assertRegistryClean() {
  for (const hive of ['HKCU', 'HKLM']) {
    for (const kw of REG_KEYS) {
      const r = spawnSync('reg', ['query', `${hive}\\${REG_UNINSTALL_BASE}`, '/s', '/f', kw], { stdio: 'pipe', encoding: 'utf-8', timeout: REG_TIMEOUT_MS })
      if (r.signal === 'SIGTERM') fail('清理', `外部命令超时：reg query >${REG_TIMEOUT_MS}ms 未退出（${hive} /f "${kw}"）`)
      if (r.error) fail('清理', `reg query 失败：${r.error.message}（${hive} /f "${kw}"）`)
      if (r.status !== 0 && r.status !== 1) fail('清理', `reg query 异常退出码 ${r.status}（不许静默当干净）：${hive} /f "${kw}" stderr：${(r.stderr ?? '').trim().slice(0, 120)}`)
      if (r.status === 0) fail('清理', `卸载注册表残留：${hive} 下命中 "${kw}"`)
    }
  }
  console.log(`[清理] 卸载注册表断言 PASS（HKCU/HKLM 无 ${REG_KEYS.join(' / ')} 残留）`)
}

// 步骤④ 清理：杀进程树 → 静默卸载 → 完整性断言（文件清零+注册表已清+卸载器自删）→ 删临时目录
async function cleanup(pid) {
  console.log('[清理] 开始')
  const t0 = Date.now()
  const kill = spawnSync('taskkill', ['/PID', String(pid), '/T', '/F'], { stdio: 'ignore', timeout: TASKKILL_TIMEOUT_MS })
  if (kill.signal === 'SIGTERM') fail('清理', `外部命令超时：taskkill >${TASKKILL_TIMEOUT_MS}ms 未退出`)
  if (kill.error || kill.status !== 0) fail('清理', `taskkill 失败：${kill.error?.message ?? `退出码 ${kill.status}`}`)
  const uninstaller = join(installDir, UNINSTALL_EXE)
  if (!existsSync(uninstaller)) fail('清理', `无卸载器：${uninstaller}`)
  // NSIS 卸载器自复制到临时目录异步续跑，真实卸载成效以完整性断言为准；启动层失败即报
  const u = spawnSync(uninstaller, ['/S'], { stdio: 'ignore', timeout: UNINSTALLER_TIMEOUT_MS })
  if (u.signal === 'SIGTERM') fail('清理', `外部命令超时：卸载器 >${UNINSTALLER_TIMEOUT_MS}ms 未退出`)
  if (u.error) fail('清理', `无法启动卸载器：${u.error.message}`)
  if (u.status !== 0) fail('清理', `卸载器启动即失败（exit ${u.status}）`)
  await assertUninstalled()
  assertRegistryClean()
  if (keep) {
    console.log(`[清理] ${took(t0)} --keep 保留现场：installDir=${installDir} dataDir=${dataDir}`)
    return
  }
  rmSync(dataDir, { recursive: true, force: true })
  console.log(`[清理] ${took(t0)} 进程树已杀、卸载完整性 PASS、临时目录已删`)
}

const installer = locateInstaller()
silentInstall(installer)
const appPid = launchApp()
await assertAlive(appPid)
await cleanup(appPid)
console.log('[smoke] PASS：装得上、起得来、卸得掉')
