/**
 * AUDIT-B B6 取证探针 —— TABS-04 关闭拦截 × SH3 三键 close × 最小化组合。
 *
 * 配方（简报 B6 行）：
 *   1) dirty 注入：经 App 同一上报通道 window.api.system.setQuitDirty
 *      ({dirty:true})（App.tsx:139 同通道——真实 dirty 态需标注保存失败
 *      路径，取证通道注入等效：main 侧 quitDirtyCached 无差别消费，
 *      bootstrap close 守卫读 getQuitDirty() 与来源无关）。
 *   2) 触发 close：window.api.system.windowControl({action:'close'})
 *      （=三键「关闭」钮同一 IPC——TitleBarControls.send('close')）。
 *   3) 断言链：close 被拦截（窗口不销毁）+ 模态在场（父窗 isEnabled
 *      =false——Windows 原生模态禁用父窗）→ 确认框在场期间最小化
 *      （windowControl minimize=任务栏最小化同效 main 侧动作；模态期
 *      renderer 三键被模态挡真点不到——任务栏路径是真实用户路径）→
 *      isMinimized=true + 窗口不销毁 → restore → 模态仍场（isEnabled
 *      仍 false+窗口活）→ 尾声：重复 close 二次仍拦截（防重入面）。
 *   4) 收尾：app.close() 不动（模态挂起）→ process kill 兜底（探针
 *      临时会话，无数据面）。
 *   5) 两条路径（确认放弃/取消）：原生对话框按钮无头不可点=BLOCKED 项
 *      →替代取证=静态链（bootstrap.ts close 守卫+main-window.ts
 *      handleCloseWithQuitGuard+受锁单测 quit-dirty-guard.test.ts 三态）。
 * 产物：scripts/audits/auditb-out/b6.json
 * 用法：node scripts/audits/auditb-b6.js（需先 build）
 */
import { _electron as electron } from '@playwright/test'
import { mkdir, rm } from 'node:fs/promises'
import { existsSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'

const ROOT = process.cwd()
const OUT = join(ROOT, 'scripts', 'audits', 'auditb-out')
const R = { meta: { script: 'auditb-b6.js', date: new Date().toISOString() }, steps: {} }
const log = (...a) => console.log(`[b6 ${new Date().toISOString().slice(11, 19)}]`, ...a)
let app = null

async function main() {
  if (!existsSync(join(ROOT, 'out', 'main', 'index.js'))) throw new Error('先 build')
  await mkdir(OUT, { recursive: true })
  const userData = join(tmpdir(), 'synapse-auditb-b6')
  await rm(userData, { recursive: true, force: true })
  app = await electron.launch({ args: ['out/main/index.js'], env: { ...process.env, SYNAPSE_USER_DATA: userData } })
  const win = await app.firstWindow()
  await win.setDefaultTimeout(30_000)
  await win.getByRole('button', { name: '文献库' }).waitFor()

  // 0) 基线：窗口态
  R.steps.baseline = await app.evaluate(({ BrowserWindow }) => {
    const w = BrowserWindow.getAllWindows()[0]
    return { visible: w.isVisible(), minimized: w.isMinimized(), enabled: w.isEnabled(), destroyed: w.isDestroyed(), maximized: w.isMaximized() }
  })
  log('基线', JSON.stringify(R.steps.baseline))

  // 1) dirty 注入（App.tsx:139 同通道）
  R.steps.dirtyInject = await win.evaluate(async () => {
    const r = await window.api.system.setQuitDirty({ dirty: true })
    return { ok: r.ok }
  })
  await win.waitForTimeout(300)

  // 2) 触发 close（三键「关闭」同 IPC）→ 等模态起
  R.steps.closeInvoke = await win.evaluate(async () => {
    const r = await window.api.system.windowControl({ action: 'close' })
    return { ok: r.ok, maximized: r.ok ? r.data.maximized : null }
  })
  await win.waitForTimeout(1200)
  R.steps.duringDialog = await app.evaluate(({ BrowserWindow }) => {
    const w = BrowserWindow.getAllWindows()[0]
    return { visible: w.isVisible(), minimized: w.isMinimized(), enabled: w.isEnabled(), destroyed: w.isDestroyed() }
  })
  log('close 后（模态期）', JSON.stringify(R.steps.duringDialog))

  // 3) 确认框在场期间最小化（任务栏路径同效 main 侧动作）
  R.steps.minimizeInvoke = await win.evaluate(async () => {
    const r = await window.api.system.windowControl({ action: 'minimize' })
    return { ok: r.ok }
  })
  await win.waitForTimeout(800)
  R.steps.atMinimized = await app.evaluate(({ BrowserWindow }) => {
    const w = BrowserWindow.getAllWindows()[0]
    return { visible: w.isVisible(), minimized: w.isMinimized(), enabled: w.isEnabled(), destroyed: w.isDestroyed() }
  })
  log('最小化后', JSON.stringify(R.steps.atMinimized))

  // 4) 恢复窗口 → 模态仍场断言
  await app.evaluate(({ BrowserWindow }) => {
    BrowserWindow.getAllWindows()[0].restore()
  })
  await win.waitForTimeout(800)
  R.steps.afterRestore = await app.evaluate(({ BrowserWindow }) => {
    const w = BrowserWindow.getAllWindows()[0]
    return { visible: w.isVisible(), minimized: w.isMinimized(), enabled: w.isEnabled(), destroyed: w.isDestroyed() }
  })
  log('restore 后', JSON.stringify(R.steps.afterRestore))

  // 5) 模态仍场时重复 close（防重入面——模态期二次 close 应被吞/仍拦截）
  R.steps.secondCloseInvoke = await win.evaluate(async () => {
    const r = await window.api.system.windowControl({ action: 'close' })
    return { ok: r.ok }
  })
  await win.waitForTimeout(800)
  R.steps.afterSecondClose = await app.evaluate(({ BrowserWindow }) => {
    const w = BrowserWindow.getAllWindows()[0]
    return { visible: w.isVisible(), minimized: w.isMinimized(), enabled: w.isEnabled(), destroyed: w.isDestroyed() }
  })
  log('二次 close 后', JSON.stringify(R.steps.afterSecondClose))

  // 6) renderer 活性（模态期 IPC 面=数据不丢的技术面：renderer 进程活着）
  R.steps.rendererAlive = await win.evaluate(`document.querySelectorAll('.lib-card').length`)
  log('renderer 活性（lib-card 数）', R.steps.rendererAlive)

  R.summary = {
    closePrevented: R.steps.duringDialog.destroyed === false && R.steps.duringDialog.visible === true,
    dialogPresenceSignal: { enabledDuringDialog: R.steps.duringDialog.enabled, enabledBaseline: R.steps.baseline.enabled },
    minimizeDuringDialog: { minimized: R.steps.atMinimized.minimized, destroyed: R.steps.atMinimized.destroyed, visible: R.steps.atMinimized.visible },
    dialogKeptAfterRestore: { enabled: R.steps.afterRestore.enabled, destroyed: R.steps.afterRestore.destroyed, visible: R.steps.afterRestore.visible },
    secondCloseStillPrevented: R.steps.afterSecondClose.destroyed === false && R.steps.afterSecondClose.visible === true,
    rendererAliveDuringModal: typeof R.steps.rendererAlive === 'number'
  }
  writeFileSync(join(OUT, 'b6.json'), JSON.stringify(R, null, 2))
  log('summary', JSON.stringify(R.summary))

  // 收尾：模态挂起下 app.close 会再走 close→dirty 守卫→再拦截→死等（实测
  // 挂起）——模态场一律 taskkill 树杀（仅杀主进程会留 GPU/renderer 孤儿，
  // Windows 实测；探针临时会话无数据面，JSON 已在杀前落盘）
  writeFileSync(join(OUT, 'b6.json'), JSON.stringify(R, null, 2))
  const pid = app.process()?.pid
  if (pid !== undefined) {
    spawnSync('taskkill', ['/F', '/T', '/PID', String(pid)], { stdio: 'ignore' })
  }
  app = null
}

await main().catch(async (e) => {
  R.error = String(e)
  try { writeFileSync(join(OUT, 'b6.json'), JSON.stringify(R, null, 2)) } catch { /* 原始错误优先 */ }
  console.error('[b6] FAIL', e)
  const pid = app?.process()?.pid
  if (pid !== undefined) {
    try { spawnSync('taskkill', ['/F', '/T', '/PID', String(pid)], { stdio: 'ignore' }) } catch { /* 已死 */ }
  }
  process.exit(1)
})
