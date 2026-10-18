// b3: P7-H
/**
 * [F-VISFB-65 单元一] 恢复副本 e2e（WPS 式丢稿防御——设计书 §6/§11）。
 * 落盘信号=测试进程轮询槽文件存在+token 两轮稳定；SIGKILL 后清 Singleton*
 * 残留同 userData 二次 launch（e2e-env launch/QUIT_AUTOCONFIRM 口径）。
 * 断言一律真实文本（宪法 e2e 红线）。
 *
 * 用例组：
 * - R1 编辑→副本落盘（token 稳定）→SIGKILL→二次 launch→确认条→恢复→
 *   真实文本在+dirty→再保存成功→槽删（INV-157/161/163）；
 * - R2 放弃分支→条收口+槽删；
 * - R3 draft-only（只打字不收口→硬杀→重启→恢复→编辑器重现正文——§5）；
 * - R4 死文件夹（槽载荷 folderId 预删）→恢复禁用（不呈现恢复钮）+放弃可点；
 * - R5 invalid 槽预置（损坏体）→「无法读取的副本」+放弃删（INV-160）。
 */
import { test, expect, type Page, type ElectronApplication } from '@playwright/test'
import { createHash } from 'node:crypto'
import { existsSync } from 'node:fs'
import { mkdir, mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { bootstrapMigrations, launch, seedLineageGraph, seedPaperRow } from './e2e-env'

const PAPER = { id: 'e2e-rec-root', title: '恢复锚文献', year: 2020 } as const
/** 槽文件（e2e 种子配方=legacy 布局首启迁移 → 工作区 id=default） */
const SLOT = join('recovery', 'default', 'lineage-session.json')

async function seedAll(userData: string): Promise<void> {
  const sha = createHash('sha256').update(`rec-ghost-${PAPER.id}`).digest('hex')
  const fileRef = `${sha.slice(0, 2)}/${sha.slice(2, 4)}/${sha}.pdf`
  await seedPaperRow(userData, fileRef, sha, PAPER.title, PAPER.id, { year: PAPER.year })
  await seedLineageGraph(userData, {
    nodes: [{ paperId: PAPER.id, title: PAPER.title, year: PAPER.year, libraryTags: ['恢复标签'] }],
    edges: []
  })
}

async function freshDir(): Promise<string> {
  const userData = await mkdtemp(join(tmpdir(), 'synapse-rec65-'))
  await bootstrapMigrations(userData)
  await seedAll(userData)
  return userData
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

/** 右键空白创建笔记并输入文本（不 blur——收口交调用面；lineage-notes 同型） */
async function createNoteTyping(win: Page, text: string): Promise<void> {
  const content = win.locator('.tl-content')
  const cb = await content.boundingBox()
  if (cb === null) throw new Error('内容层不可见')
  await content.click({ button: 'right', position: { x: cb.width - 60, y: cb.height - 60 } })
  const menu = win.getByTestId('note-anchor-menu')
  await expect(menu).toBeVisible({ timeout: 5_000 })
  await menu.getByRole('menuitem', { name: '新建悬浮笔记' }).click()
  await win.locator('.tl-note-input').fill(text)
}

async function clickBlank(win: Page): Promise<void> {
  const content = win.locator('.tl-content')
  const cb = await content.boundingBox()
  if (cb === null) throw new Error('内容层不可见')
  await content.click({ position: { x: 40, y: 40 } })
}

/** 槽文件 token 两轮稳定（落盘信号——设计书 e2e 口径）。[回炉 R1] 基线
 *  mustDifferFrom=判别段用：两次读相等**且**异于基线才算稳（下一写在途的
 *  0/200ms 双读旧 token 误判「稳定」封死——CI 慢机 flake 源同封） */
async function waitSlotStable(userData: string, mustDifferFrom?: string): Promise<string> {
  const slotPath = join(userData, SLOT)
  let lastToken = ''
  for (let i = 0; i < 100; i += 1) {
    if (existsSync(slotPath)) {
      try {
        const env = JSON.parse(await readFile(slotPath, 'utf-8')) as { token: string }
        if (env.token !== '' && env.token === lastToken && env.token !== mustDifferFrom) {
          return env.token
        }
        lastToken = env.token
      } catch {
        // 写中窗（tmp→rename 间不可见；读到半文=下轮重读）
      }
    }
    await new Promise((r) => setTimeout(r, 200))
  }
  throw new Error('恢复槽未在 20s 内稳定落盘')
}

/** SIGKILL 硬杀+清单例锁残留（同 userData 二次 launch 前提） */
async function hardKill(userData: string, app: ElectronApplication): Promise<void> {
  app.process().kill('SIGKILL')
  await app.close().catch(() => undefined)
  for (const name of await readdir(userData)) {
    if (name.startsWith('Singleton')) await rm(join(userData, name), { force: true })
  }
}

/** 手工预置槽文件（死文件夹/invalid 用例的前置面） */
async function presetSlot(userData: string, body: string): Promise<void> {
  const slotPath = join(userData, SLOT)
  await mkdir(dirname(slotPath), { recursive: true })
  await rm(slotPath, { force: true })
  await writeFile(slotPath, body, 'utf-8')
}

test.describe('恢复副本 e2e（F-VISFB-65 单元一）', () => {
  test('R1 编辑→SIGKILL→二次启动确认条→恢复→真文本+dirty→保存→槽删', async () => {
    const userData = await freshDir()
    const app = await launch(userData)
    const win = await app.firstWindow()
    await openLineageEdit(win)
    await createNoteTyping(win, '恢复正文甲')
    await clickBlank(win)
    await expect(win.locator('.tl-note-text')).toHaveText('恢复正文甲')
    await waitSlotStable(userData) // 副本落盘（token 稳定）
    await hardKill(userData, app)
    // 同 userData 二次 launch：确认条+确认条文案
    const app2 = await launch(userData)
    const win2 = await app2.firstWindow()
    const bar = win2.getByTestId('recovery-bar')
    await expect(bar).toBeVisible({ timeout: 20_000 })
    await expect(bar).toContainText('脉络图暂存会话')
    await expect(bar).toContainText('待保存动作')
    // [回炉 R2] 条在场时主内容行有实际高度（四行网格——内容不被压 26px 行）
    const rowBox = await win2.locator('.app-content-row').boundingBox()
    expect(rowBox).not.toBeNull()
    expect(rowBox!.height).toBeGreaterThan(100)
    // 恢复→路由进脉络页→真实文本在+dirty（保存钮使能）
    await win2.getByTestId('recovery-restore').click()
    await expect(win2.locator('.tl-note-text')).toHaveText('恢复正文甲', { timeout: 10_000 })
    await expect(win2.getByTestId('lineage-mode-edit')).toBeVisible({ timeout: 10_000 })
    // 恢复路由进脉络页=缺省 browse（P-1）——保存钮驻编辑模式，先切编辑态
    await win2.getByTestId('lineage-mode-edit').click()
    await expect(win2.getByTestId('lineage-save-btn')).toBeEnabled({ timeout: 10_000 })
    // [回炉 W1] 派生面随恢复拉取：卡标签真文本在（载荷不含派生——graph 派生补）
    await expect(win2.locator('.tl-card[data-node-id]').filter({ hasText: '恢复标签' })).toBeVisible({ timeout: 10_000 })
    // 再保存成功→clean→release→槽删
    await win2.getByTestId('lineage-save-btn').click()
    await expect(win2.getByTestId('lineage-save-btn')).toBeDisabled({ timeout: 10_000 })
    await expect(win2.getByTestId('recovery-bar')).toHaveCount(0)
    for (let i = 0; i < 50 && existsSync(join(userData, SLOT)); i += 1) {
      await new Promise((r) => setTimeout(r, 200))
    }
    expect(existsSync(join(userData, SLOT))).toBe(false)
    await app2.close()
  })

  test('R2 放弃分支：条收口+槽删+内容不恢复', async () => {
    const userData = await freshDir()
    const app = await launch(userData)
    const win = await app.firstWindow()
    await openLineageEdit(win)
    await createNoteTyping(win, '放弃正文乙')
    await clickBlank(win)
    await waitSlotStable(userData)
    await hardKill(userData, app)
    const app2 = await launch(userData)
    const win2 = await app2.firstWindow()
    const bar = win2.getByTestId('recovery-bar')
    await expect(bar).toBeVisible({ timeout: 20_000 })
    await win2.getByTestId('recovery-discard').click()
    await expect(win2.getByTestId('recovery-bar')).toHaveCount(0, { timeout: 10_000 })
    for (let i = 0; i < 50 && existsSync(join(userData, SLOT)); i += 1) {
      await new Promise((r) => setTimeout(r, 200))
    }
    expect(existsSync(join(userData, SLOT))).toBe(false)
    // 内容不恢复：进脉络页无笔记（库态干净）
    await win2.getByRole('button', { name: '脉络', exact: true }).click()
    await expect(win2.locator('.tl-card[data-node-id]').filter({ hasText: PAPER.title })).toBeVisible({
      timeout: 10_000
    })
    await expect(win2.locator('.tl-note')).toHaveCount(0)
    await app2.close()
  })

  test('R3 draft-only：只打字不收口→硬杀→重启→恢复→编辑器重现正文', async () => {
    const userData = await freshDir()
    const app = await launch(userData)
    const win = await app.firstWindow()
    await openLineageEdit(win)
    await createNoteTyping(win, '未收口草稿丙')
    const token1 = await waitSlotStable(userData) // 草稿内容变更=触发面（300ms 合流）
    // [回炉 R1 判别段]：首落定后等 >400ms（出 300ms 窗）再打字——token 须再变
    // （首绿靠 fill 落窗内=恒真风险封死；CI 慢机 flake 源同封）
    await win.waitForTimeout(500)
    await win.locator('.tl-note-input').fill('未收口草稿丙续写更长正文')
    const token2 = await waitSlotStable(userData, token1) // 基线判别：须 ≠ token1
    expect(token2).not.toBe(token1)
    await hardKill(userData, app)
    const app2 = await launch(userData)
    const win2 = await app2.firstWindow()
    await expect(win2.getByTestId('recovery-bar')).toBeVisible({ timeout: 20_000 })
    await win2.getByTestId('recovery-restore').click()
    // 再水化：编辑器重现正文（textarea 值=草稿——§5 drafting 崩溃语义）；
    // 编辑器渲染=交互门内（edit+select——恢复路由缺省 browse，切态后显）
    await win2.getByTestId('lineage-mode-edit').click()
    await win2.getByTestId('lineage-tool-select').click()
    const input = win2.locator('.tl-note-input')
    await expect(input).toBeVisible({ timeout: 10_000 })
    await expect(input).toHaveValue('未收口草稿丙续写更长正文')
    await app2.close()
  })

  test('R4 死文件夹：载荷 folderId 不在→恢复禁用（无恢复钮）+放弃可点+槽删', async () => {
    const userData = await freshDir()
    await presetSlot(
      userData,
      JSON.stringify({
        type: 'lineage-session',
        schemaVersion: 1,
        token: 'tok-dead-folder',
        writtenAt: new Date().toISOString(),
        lastWriterSession: 'ghost-session',
        payload: {
          folderId: 'f-gone',
          graph: { nodes: [], edges: [], lineTypeNames: ['待命名', '待命名', '待命名', '待命名', '待命名', '待命名'], floatingNotes: [] },
          queue: [],
          draft: null
        }
      })
    )
    const app = await launch(userData)
    const win = await app.firstWindow()
    const bar = win.getByTestId('recovery-bar')
    await expect(bar).toBeVisible({ timeout: 20_000 })
    await expect(bar).toContainText('待保存动作')
    // 死文件夹=恢复校验后呈现（§6：read→folder 不在→恢复禁用换行）
    await win.getByTestId('recovery-restore').click()
    await expect(bar).toContainText('原文件夹已删除，副本无法恢复', { timeout: 10_000 })
    await expect(win.getByTestId('recovery-restore')).toHaveCount(0)
    await expect(win.getByTestId('recovery-defer')).toBeVisible()
    await win.getByTestId('recovery-discard').click()
    await expect(win.getByTestId('recovery-bar')).toHaveCount(0, { timeout: 10_000 })
    for (let i = 0; i < 50 && existsSync(join(userData, SLOT)); i += 1) {
      await new Promise((r) => setTimeout(r, 200))
    }
    expect(existsSync(join(userData, SLOT))).toBe(false)
    await app.close()
  })

  test('R5 invalid 槽预置：无法读取的副本+放弃删（保留不自动删负锚在前置）', async () => {
    const userData = await freshDir()
    await presetSlot(userData, '{corrupt-body-not-json')
    const app = await launch(userData)
    const win = await app.firstWindow()
    const bar = win.getByTestId('recovery-bar')
    await expect(bar).toBeVisible({ timeout: 20_000 })
    await expect(bar).toContainText('无法读取的副本')
    await expect(win.getByTestId('recovery-restore')).toHaveCount(0)
    await win.getByTestId('recovery-discard').click()
    await expect(win.getByTestId('recovery-bar')).toHaveCount(0, { timeout: 10_000 })
    for (let i = 0; i < 50 && existsSync(join(userData, SLOT)); i += 1) {
      await new Promise((r) => setTimeout(r, 200))
    }
    expect(existsSync(join(userData, SLOT))).toBe(false)
    await app.close()
  })
})
