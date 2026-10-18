// b3: P7-H
/**
 * [F-VISFB-65 单元二] GHOST_FOLDER 降级询问 e2e（设计书 §7）。断言一律真实
 * 文本（宪法 e2e 红线）。造态手法：种子 folder（f-doom）+该图内创建笔记
 * （会话队列未收口）→页面外路径删 folder（kill-folder.mjs 子进程直写库
 * ——WAL 共存）→点保存→首条 upsert CONFLICT+GHOST_FOLDER→自绘 alertdialog。
 *
 * 用例组：
 * - C1 主图分支：保存到主图→modal 收→保存收口 clean→切主图断言笔记真文本在；
 * - C2 放弃分支：放弃这条修改→修改不落库（主图/死图均无笔记）+保存收口；
 * - C3 同死文件夹多笔记只一询：两笔记一 modal remap→双双落主图。
 */
import { test, expect, type Page } from '@playwright/test'
import { createHash } from 'node:crypto'
import { mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { spawn } from 'node:child_process'
import { bootstrapMigrations, launch, seedLineageGraph, seedPaperRow } from './e2e-env'

const PAPER = { id: 'e2e-cfl-root', title: '降级询问锚文献', year: 2020 } as const
const DOOM = { id: 'f-doom', name: '死夹甲' } as const

async function seedAll(userData: string): Promise<void> {
  const sha = createHash('sha256').update(`cfl-ghost-${PAPER.id}`).digest('hex')
  const fileRef = `${sha.slice(0, 2)}/${sha.slice(2, 4)}/${sha}.pdf`
  await seedPaperRow(userData, fileRef, sha, PAPER.title, PAPER.id, { year: PAPER.year })
  await seedLineageGraph(userData, {
    folders: [{ id: DOOM.id, name: DOOM.name }],
    nodes: [{ paperId: PAPER.id, title: PAPER.title, year: PAPER.year }],
    edges: []
  })
}

async function freshDir(): Promise<string> {
  const userData = await mkdtemp(join(tmpdir(), 'synapse-cfl65-'))
  await bootstrapMigrations(userData)
  await seedAll(userData)
  return userData
}

/** 页面外路径删 folder（造态：队列未收口期间 folder 消亡） */
function killFolder(userData: string, folderId: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [join(process.cwd(), 'tests', 'e2e', 'kill-folder.mjs')], {
      env: { ...process.env, SEED_DB: join(userData, 'workspaces', 'default', 'synapse.db'), SEED_FOLDER_ID: folderId },
      stdio: 'inherit'
    })
    child.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`kill-folder 退出码 ${code ?? 'null'}`))))
    child.on('error', reject)
  })
}

async function openLineageEdit(win: Page): Promise<void> {
  await expect(win.getByRole('button', { name: '文献库' })).toBeVisible({ timeout: 20_000 })
  await win.getByRole('button', { name: '脉络', exact: true }).click()
  await expect(win.locator('.tl-card[data-node-id]').filter({ hasText: PAPER.title })).toBeVisible({
    timeout: 10_000
  })
  await win.getByTestId('lineage-mode-edit').click()
  await win.getByTestId('lineage-tool-select').click()
}

/** 切图到目标图（clean 态直达——dirty 切图有确认分支，本 spec 恒 clean 态切） */
async function switchGraph(win: Page, folderId: string, name: string): Promise<void> {
  await win.getByTestId('lineage-nav-graph').click()
  const menu = win.getByTestId('lineage-nav-graph-menu')
  await expect(menu).toBeVisible({ timeout: 5_000 })
  await menu.locator(`[data-folder-id="${folderId}"]`, { hasText: name }).click()
  await expect(win.getByTestId('lineage-nav-graph')).toContainText(name, { timeout: 5_000 })
}

/** 右键空白创建笔记并 blur 收口（入队 upsert——folderId=当前图；fromRight=
 * 锚位变化：多笔记场景避让先建笔记的命中面） */
async function createNote(win: Page, text: string, fromRight = true): Promise<void> {
  const content = win.locator('.tl-content')
  const cb = await content.boundingBox()
  if (cb === null) throw new Error('内容层不可见')
  await content.click({ button: 'right', position: { x: fromRight ? cb.width - 60 : 120, y: cb.height - 60 } })
  const menu = win.getByTestId('note-anchor-menu')
  await expect(menu).toBeVisible({ timeout: 5_000 })
  await menu.getByRole('menuitem', { name: '新建悬浮笔记' }).click()
  await win.locator('.tl-note-input').fill(text)
  await content.click({ position: { x: 40, y: 40 } }) // blur 收口
  await expect(win.locator('.tl-note-text').filter({ hasText: text })).toBeVisible({ timeout: 5_000 })
}

/** 触发询问：删 folder→点保存→alertdialog 在场 */
async function triggerConflict(win: Page, userData: string): Promise<void> {
  await killFolder(userData, DOOM.id)
  await expect(win.getByTestId('lineage-save-btn')).toBeEnabled({ timeout: 10_000 })
  await win.getByTestId('lineage-save-btn').click()
  const dlg = win.getByTestId('conflict-dialog')
  await expect(dlg).toBeVisible({ timeout: 10_000 })
  await expect(dlg).toContainText('原文件夹已删除')
}

test.describe('GHOST_FOLDER 降级询问 e2e（F-VISFB-65 单元二）', () => {
  test('C1 主图分支：保存到主图→保存收口→切主图笔记真文本在', async () => {
    const userData = await freshDir()
    const app = await launch(userData)
    const win = await app.firstWindow()
    await openLineageEdit(win)
    await switchGraph(win, DOOM.id, DOOM.name)
    await createNote(win, '降级改存正文')
    await triggerConflict(win, userData)
    await win.getByTestId('conflict-remap').click()
    await expect(win.getByTestId('conflict-dialog')).toHaveCount(0, { timeout: 5_000 })
    // 队列续走收口：clean（保存钮回禁用）+会话保存态复原
    await expect(win.getByTestId('lineage-save-btn')).toBeDisabled({ timeout: 10_000 })
    // [回炉 W8] remap 分支收尾前当前图已矫正主图（不切即见）+救回笔记在
    await expect(win.getByTestId('lineage-nav-graph')).toContainText('主图', { timeout: 5_000 })
    await expect(win.locator('.tl-note-text')).toHaveText('降级改存正文')
    // 显式切主图复核（remap 行落主图——真实文本在）
    await switchGraph(win, '__main__', '主图')
    await expect(win.locator('.tl-note-text')).toHaveText('降级改存正文')
    await app.close()
  })

  test('C2 放弃分支：放弃这条修改→修改不落库（主图/死图均无）+保存收口', async () => {
    const userData = await freshDir()
    const app = await launch(userData)
    const win = await app.firstWindow()
    await openLineageEdit(win)
    await switchGraph(win, DOOM.id, DOOM.name)
    await createNote(win, '被放弃的修改')
    await triggerConflict(win, userData)
    await win.getByTestId('conflict-discard').click()
    await expect(win.getByTestId('conflict-dialog')).toHaveCount(0, { timeout: 5_000 })
    await expect(win.getByTestId('lineage-save-btn')).toBeDisabled({ timeout: 10_000 })
    // 修改不落库：主图无笔记；死图已删（图下拉无死夹）
    await switchGraph(win, '__main__', '主图')
    await expect(win.locator('.tl-note')).toHaveCount(0)
    await win.getByTestId('lineage-nav-graph').click()
    const menu = win.getByTestId('lineage-nav-graph-menu')
    await expect(menu).toBeVisible({ timeout: 5_000 })
    await expect(menu.locator(`[data-folder-id="${DOOM.id}"]`)).toHaveCount(0)
    await win.keyboard.press('Escape')
    await app.close()
  })

  test('C3 同死文件夹多笔记只一询：两笔记一 modal remap→双双落主图', async () => {
    const userData = await freshDir()
    const app = await launch(userData)
    const win = await app.firstWindow()
    await openLineageEdit(win)
    await switchGraph(win, DOOM.id, DOOM.name)
    await createNote(win, '同夹笔记一')
    await createNote(win, '同夹笔记二', false)
    await triggerConflict(win, userData)
    await win.getByTestId('conflict-remap').click()
    await expect(win.getByTestId('conflict-dialog')).toHaveCount(0, { timeout: 5_000 })
    // 一询收束：不再出现第二询（死文件夹级 remap 全覆盖）
    await win.waitForTimeout(800)
    await expect(win.getByTestId('conflict-dialog')).toHaveCount(0)
    await expect(win.getByTestId('lineage-save-btn')).toBeDisabled({ timeout: 10_000 })
    await switchGraph(win, '__main__', '主图')
    await expect(win.locator('.tl-note-text').filter({ hasText: '同夹笔记一' })).toBeVisible()
    await expect(win.locator('.tl-note-text').filter({ hasText: '同夹笔记二' })).toBeVisible()
    await app.close()
  })
})
