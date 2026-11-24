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
import {
  bootstrapMigrations,
  launch,
  liveDbScript,
  seedLineageGraph,
  seedPaperRow,
  switchLineageGraph
} from './e2e-env'

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

/** [F-RECOV-04] available 槽预置（旧副本含一条真实笔记文本——defer/恢复真文本断言面） */
async function presetAvailableSlot(userData: string): Promise<void> {
  await presetSlot(
    userData,
    JSON.stringify({
      type: 'lineage-session',
      schemaVersion: 1,
      token: 'tok-e2e-f4',
      writtenAt: new Date().toISOString(),
      lastWriterSession: 'ghost-session',
      payload: {
        folderId: '__main__',
        graph: {
          nodes: [],
          edges: [],
          lineTypeNames: ['待命名', '待命名', '待命名', '待命名', '待命名', '待命名'],
          floatingNotes: [
            { id: 'fn-old', folderId: '__main__', x: 10, y: 10, content: OLD_NOTE, createdAt: 't', updatedAt: 't' }
          ]
        },
        queue: [],
        draft: null
      }
    })
  )
}

const OLD_NOTE = '旧副本正文丁'

/** [F-RECOV-04 终裁⑤] 放弃不可逆确认的 e2e 步（R2/R4/R5 与新三面共用） */
async function confirmDiscard(win: Page, confirmLabel: string): Promise<void> {
  const dialog = win.getByRole('dialog')
  await expect(dialog).toBeVisible()
  await dialog.getByRole('button', { name: confirmLabel }).click()
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
    // [F-RECOV-04 A4] 放弃先经不可逆确认（终裁⑤）——确认后才 release（交互步适配，
    //  语义面=放弃后条收口+槽删 保持不变）
    await win2.getByTestId('recovery-discard').click()
    await expect(win2.getByRole('dialog')).toContainText('待保存动作')
    await confirmDiscard(win2, '放弃副本')
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
    // [F-RECOV-04 A4] 放弃确认步（语义面保持：槽删）
    await win.getByTestId('recovery-discard').click()
    await confirmDiscard(win, '放弃副本')
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
    // [F-RECOV-04 A4] 放弃确认步（语义面保持：槽删）
    await win.getByTestId('recovery-discard').click()
    await confirmDiscard(win, '放弃副本')
    await expect(win.getByTestId('recovery-bar')).toHaveCount(0, { timeout: 10_000 })
    for (let i = 0; i < 50 && existsSync(join(userData, SLOT)); i += 1) {
      await new Promise((r) => setTimeout(r, 200))
    }
    expect(existsSync(join(userData, SLOT))).toBe(false)
    await app.close()
  })

  // ── [F-RECOV-04] 新增三面（plan §2.4：available defer/新编辑后旧槽仍存在/确认放弃才删除）──

  test('E6 available defer：稍后处理→chip 常驻+开门可编辑+旧槽保留', async () => {
    const userData = await freshDir()
    await presetAvailableSlot(userData)
    const app = await launch(userData)
    const win = await app.firstWindow()
    const bar = win.getByTestId('recovery-bar')
    await expect(bar).toBeVisible({ timeout: 20_000 })
    await expect(win.getByTestId('recovery-defer')).toBeVisible() // available 行 defer 三入口（件一）
    await win.getByTestId('recovery-defer').click()
    // chip 常驻（「当前编辑未受保护」）+查看钮
    const chips = win.getByTestId('recovery-chips')
    await expect(chips).toBeVisible()
    await expect(chips).toContainText('恢复副本待处理，当前编辑未受保护')
    await expect(win.getByTestId('recovery-reopen')).toBeVisible()
    // defer 开门=编辑可行（真实文本——R1 同构：blur 收口后只读行承载真文本）
    await openLineageEdit(win)
    await createNoteTyping(win, '稍后处理新编辑戊')
    await clickBlank(win)
    await expect(win.locator('.tl-note-text')).toHaveText('稍后处理新编辑戊')
    // 旧槽保留（未决策不删——副本文件仍在）
    expect(existsSync(join(userData, SLOT))).toBe(true)
    await app.close()
  })

  test('E7 defer→新编辑→保存→旧槽仍在且未被覆写→重启恢复旧副本真文本', async () => {
    const userData = await freshDir()
    await presetAvailableSlot(userData)
    const app = await launch(userData)
    const win = await app.firstWindow()
    const bar = win.getByTestId('recovery-bar')
    await expect(bar).toBeVisible({ timeout: 20_000 })
    await win.getByTestId('recovery-defer').click()
    await expect(win.getByTestId('recovery-chips')).toContainText('当前编辑未受保护')
    await openLineageEdit(win)
    await createNoteTyping(win, '新编辑戊续写更长正文')
    await win.getByTestId('lineage-save-btn').click()
    await expect(win.getByTestId('lineage-save-btn')).toBeDisabled({ timeout: 10_000 }) // flush clean
    // clean 后旧槽仍在且 token 未变（槽属他者会话 save=pending 不覆写+gate 不 release）
    await win.waitForTimeout(1500)
    expect(existsSync(join(userData, SLOT))).toBe(true)
    const slot = JSON.parse(await readFile(join(userData, SLOT), 'utf-8')) as { token: string }
    expect(slot.token).toBe('tok-e2e-f4')
    await hardKill(userData, app)
    // 重启：未决策旧副本承接确认条——恢复出旧真文本（未被 defer 后新编辑抹掉）
    const app2 = await launch(userData)
    const win2 = await app2.firstWindow()
    await expect(win2.getByTestId('recovery-bar')).toBeVisible({ timeout: 20_000 })
    await expect(win2.getByTestId('recovery-bar')).toContainText('待保存动作 0')
    await win2.getByTestId('recovery-restore').click()
    await expect(win2.locator('.tl-note-text')).toHaveText(OLD_NOTE, { timeout: 10_000 })
    await app2.close()
  })

  test('E8 确认放弃才删除：取消=条与槽保留；确认=槽删', async () => {
    const userData = await freshDir()
    await presetAvailableSlot(userData)
    const app = await launch(userData)
    const win = await app.firstWindow()
    const bar = win.getByTestId('recovery-bar')
    await expect(bar).toBeVisible({ timeout: 20_000 })
    // 放弃→确认框（终裁⑤文案：动作数+保护恢复说明）→取消=零删除
    await win.getByTestId('recovery-discard').click()
    const dialog = win.getByRole('dialog')
    await expect(dialog).toBeVisible()
    await expect(dialog).toContainText('待保存动作 0')
    await expect(dialog).toContainText('放弃后不可恢复')
    await expect(dialog).toContainText('新的编辑将重新受副本保护')
    await dialog.getByRole('button', { name: '取消' }).click()
    await expect(win.getByTestId('recovery-bar')).toBeVisible() // 条保留
    expect(existsSync(join(userData, SLOT))).toBe(true) // 槽未删
    // 再放弃→确认→条收口+槽删
    await win.getByTestId('recovery-discard').click()
    await confirmDiscard(win, '放弃副本')
    await expect(win.getByTestId('recovery-bar')).toHaveCount(0, { timeout: 10_000 })
    for (let i = 0; i < 50 && existsSync(join(userData, SLOT)); i += 1) {
      await new Promise((r) => setTimeout(r, 200))
    }
    expect(existsSync(join(userData, SLOT))).toBe(false)
    await app.close()
  })
})

// ── [B4 L2 / 设计稿 §6.3、§8.1/§8.4、§2.5 #39、§12.3] 恢复与多图会话：A2 新增三链 ──

/** 链 1：崩溃前已落库的历史项（删节点）与仍在队列的待写笔记 */
const REPLAY_NOTE = '恢复只重放队列的笔记正文'
const REPLAY_GONE = { id: 'e2e-rec-gone', title: '已落库删除文献', year: 2021 } as const
/** 链 2：甲图=owner（笔记写失败）、乙图=非 owner（删节点照常落库） */
const OWN_A = { id: 'f-own-a', name: '甲图', paperId: 'e2e-own-a', title: '甲图锚文献', year: 2021 } as const
const OWN_B = { id: 'f-own-b', name: '乙图', paperId: 'e2e-own-b', title: '乙图锚文献', year: 2022 } as const
const OWN_B_GONE = { paperId: 'e2e-own-b-gone', title: '乙图被删文献', year: 2022 } as const
const OWN_NOTE_A = '甲图未落库的笔记正文'
/** 链 3：替换确认前经落定步入库的新笔记（不在副本内——已落库修改保留在数据库） */
const SETTLE_NOTE = '落定步入库的新笔记正文'
/** 链 3 补：落不了库的笔记（写通道抛错——恢复停在落定步） */
const BLOCK_NOTE = '落不了库的笔记正文'

interface SlotEnvelope {
  token: string
  payload: { folderId: string; graph: unknown; queue: unknown[]; draft: unknown }
}

async function readSlot(userData: string): Promise<SlotEnvelope> {
  return JSON.parse(await readFile(join(userData, SLOT), 'utf-8')) as SlotEnvelope
}

/** 幽灵文献行（脉络卡用——不开阅读器；seedPaperRow 同型） */
async function seedGhost(userData: string, id: string, title: string, year: number): Promise<void> {
  const sha = createHash('sha256').update(`rec-l2-${id}`).digest('hex')
  const fileRef = `${sha.slice(0, 2)}/${sha.slice(2, 4)}/${sha}.pdf`
  await seedPaperRow(userData, fileRef, sha, title, id, { year })
}

/** 节点菜单删除（卡消失）——返回被删节点 id */
async function deleteCard(win: Page, title: string): Promise<string> {
  const card = win.locator('.tl-card[data-node-id]').filter({ hasText: title })
  await expect(card).toBeVisible({ timeout: 10_000 })
  const id = await card.getAttribute('data-node-id')
  expect(id, '基线节点 id 非空').toBeTruthy()
  await card.click({ button: 'right' })
  await expect(win.getByTestId('lineage-node-menu')).toBeVisible()
  await win.getByTestId('lineage-node-menu').getByRole('menuitem', { name: '删除节点' }).click()
  await expect(card).toHaveCount(0, { timeout: 5_000 })
  return id!
}

/**
 * 写失败注入（确定性驱动）：main 侧把悬浮笔记写通道 lineage/upsert-floating-note 重注册为抛错
 * （lineage.spec T3「写通道 patch 抛错」同型）——该通道的写落不了库、保留在队列可重试；其余
 * 写通道（如删节点）照常。
 */
async function failFloatingNoteWrites(app: ElectronApplication): Promise<void> {
  await app.evaluate((electronMod) => {
    const ipcMain = (
      electronMod as unknown as {
        ipcMain: { removeHandler(channel: string): void; handle(channel: string, handler: () => Promise<never>): void }
      }
    ).ipcMain
    ipcMain.removeHandler('lineage/upsert-floating-note')
    ipcMain.handle('lineage/upsert-floating-note', async () => {
      throw new Error('模拟写库失败（e2e 桩）')
    })
  })
}

test.describe('恢复副本 e2e（B4 L2 回炉 A2 新增三链）', () => {
  /**
   * 链 1 [§6.3]：恢复只重放 RecoveryPayload.queue——崩溃前已落库的历史项（删节点后显式保存）不回滚、
   * 不再执行；内存史不随副本走（恢复后撤销/重做均空）；队列里的待写笔记恰落一次。
   */
  test('A2 链1：恢复只重放 RecoveryPayload.queue——已落库的删除不回滚、撤销/重做清空、待写笔记恰落一次', async () => {
    const userData = await freshDir()
    await seedGhost(userData, REPLAY_GONE.id, REPLAY_GONE.title, REPLAY_GONE.year)
    await seedLineageGraph(userData, { nodes: [{ paperId: REPLAY_GONE.id, title: REPLAY_GONE.title, year: REPLAY_GONE.year }] })
    const app = await launch(userData)
    const win = await app.firstWindow()
    await openLineageEdit(win)
    const saveBtn = win.getByTestId('lineage-save-btn')
    // ① 已落库历史：删节点→显式保存（撤销栈一项；库内节点已删）
    const goneId = await deleteCard(win, REPLAY_GONE.title)
    await expect(saveBtn).toBeEnabled({ timeout: 10_000 })
    await saveBtn.click()
    await expect(saveBtn).toBeDisabled({ timeout: 10_000 })
    await expect(win.getByTestId('lineage-undo')).toBeEnabled()
    expect(await liveDbScript(userData, 'get', 'SELECT COUNT(*) AS c FROM lineage_nodes WHERE id = ?', [goneId])).toEqual({
      c: 0
    })
    // ② 待写：新建悬浮笔记入队（1.5s 空闲窗内硬杀——副本携 queue）
    const tokenBefore = existsSync(join(userData, SLOT)) ? (await readSlot(userData)).token : undefined
    await createNoteTyping(win, REPLAY_NOTE)
    await clickBlank(win)
    await expect(win.locator('.tl-note-text')).toHaveText(REPLAY_NOTE)
    await waitSlotStable(userData, tokenBefore)
    const slot = await readSlot(userData)
    expect(slot.payload.folderId).toBe('__main__')
    expect(slot.payload.queue.length).toBeGreaterThanOrEqual(1)
    // 副本不携内存史（§6.3）：载荷键集恰为 folderId/graph/queue/draft
    expect(Object.keys(slot.payload).sort()).toEqual(['draft', 'folderId', 'graph', 'queue'])
    expect(await liveDbScript(userData, 'get', 'SELECT COUNT(*) AS c FROM floating_notes WHERE folder_id = ?', ['__main__'])).toEqual(
      { c: 0 }
    )
    await hardKill(userData, app)
    // ③ 二次启动：确认条携待保存动作→恢复
    const app2 = await launch(userData)
    const win2 = await app2.firstWindow()
    const saveBtn2 = win2.getByTestId('lineage-save-btn')
    const goneCard2 = win2.locator('.tl-card[data-node-id]').filter({ hasText: REPLAY_GONE.title })
    await expect(win2.getByTestId('recovery-bar')).toContainText('待保存动作', { timeout: 20_000 })
    await win2.getByTestId('recovery-restore').click()
    await expect(win2.locator('.tl-note-text')).toHaveText(REPLAY_NOTE, { timeout: 10_000 })
    await expect(goneCard2).toHaveCount(0) // 已落库的删除不被副本回滚
    await win2.getByTestId('lineage-mode-edit').click()
    await expect(saveBtn2).toBeEnabled({ timeout: 10_000 }) // 队列里的待写笔记仍在
    await expect(win2.getByTestId('lineage-undo')).toBeDisabled() // 内存史不随副本走
    await expect(win2.getByTestId('lineage-redo')).toBeDisabled()
    await saveBtn2.click()
    await expect(saveBtn2).toBeDisabled({ timeout: 10_000 })
    await expect(win2.locator('.tl-note-text')).toHaveText(REPLAY_NOTE)
    await expect(goneCard2).toHaveCount(0)
    for (let i = 0; i < 50 && existsSync(join(userData, SLOT)); i += 1) {
      await new Promise((r) => setTimeout(r, 200))
    }
    expect(existsSync(join(userData, SLOT))).toBe(false)
    await app2.close()
    // ④ DB 回读：节点仍已删且只删过一次（历史项未再执行）；笔记恰一行
    expect(await liveDbScript(userData, 'get', 'SELECT COUNT(*) AS c FROM lineage_nodes WHERE id = ?', [goneId])).toEqual({
      c: 0
    })
    expect(
      await liveDbScript(userData, 'get', 'SELECT COUNT(*) AS c FROM deletion_events WHERE entity = ? AND id = ?', [
        'lineage_nodes',
        goneId
      ])
    ).toEqual({ c: 1 })
    expect(await liveDbScript(userData, 'all', 'SELECT content FROM floating_notes WHERE folder_id = ?', ['__main__'])).toEqual([
      { content: REPLAY_NOTE }
    ])
  })

  /**
   * 链 2 [§8.1/§8.2「B｜A error｜…｜owner=A」行/§8.4「folder 离场失败」]：A（owner）的写落不了库→
   * owner 留 A；B 的编辑不覆盖唯一副本槽（槽内仍是 A 的载荷）；A 的错误与 B 的编辑分开呈现。
   * 写失败=main 侧把悬浮笔记写通道重注册为抛错（lineage.spec T3 同型——真实应用内确定性驱动）；
   * B 的编辑走未打桩的删节点通道，照常落库。
   */
  test('A2 链2：A owner 未 flush 成功时 B 不覆槽——副本仍是 A 的载荷；A 错误与 B 编辑分开呈现', async () => {
    const userData = await freshDir()
    for (const p of [OWN_A, OWN_B, OWN_B_GONE]) await seedGhost(userData, p.paperId, p.title, p.year)
    await seedLineageGraph(userData, {
      folders: [
        { id: OWN_A.id, name: OWN_A.name },
        { id: OWN_B.id, name: OWN_B.name }
      ],
      nodes: [
        { paperId: OWN_A.paperId, title: OWN_A.title, year: OWN_A.year, folderId: OWN_A.id },
        { paperId: OWN_B.paperId, title: OWN_B.title, year: OWN_B.year, folderId: OWN_B.id },
        { paperId: OWN_B_GONE.paperId, title: OWN_B_GONE.title, year: OWN_B_GONE.year, folderId: OWN_B.id }
      ]
    })
    const app = await launch(userData)
    const win = await app.firstWindow()
    await failFloatingNoteWrites(app)
    await openLineageEdit(win)
    const errorRow = win.getByTestId('lineage-save-error')
    const chip = win.getByTestId('recovery-unprotected-chip')
    // 甲图（A）：新建笔记→认领并写副本（owner=A）→idle flush 撞桩→错误可见（写保留）
    await switchLineageGraph(win, OWN_A.id, OWN_A.name)
    await createNoteTyping(win, OWN_NOTE_A)
    await clickBlank(win)
    await expect(win.locator('.tl-note-text')).toHaveText(OWN_NOTE_A)
    await waitSlotStable(userData)
    const slotA = await readSlot(userData)
    expect(slotA.payload.folderId).toBe(OWN_A.id)
    await expect(errorRow).toBeVisible({ timeout: 10_000 })
    await expect(errorRow).toContainText('模拟写库失败（e2e 桩）')
    // 切到乙图（A 离场 flush-first 再次失败——owner 留 A）；乙图删节点（未打桩通道）
    await switchLineageGraph(win, OWN_B.id, OWN_B.name)
    await expect(errorRow).toHaveCount(0)
    const bGoneId = await deleteCard(win, OWN_B_GONE.title)
    // 乙图此刻有未落库写且不是 owner：未受保护 chip（§8.4 末行——单槽只保护一张图）
    await expect(chip).toBeVisible()
    await expect(chip).toHaveText('多图有未落库修改：崩溃副本仅保护其中一张图，其余依赖自动落库')
    // 留出错误覆槽的窗口后回读槽文件：仍是 A 的载荷（B 不覆槽）
    await win.waitForTimeout(1_500)
    const slotAfter = await readSlot(userData)
    expect(slotAfter.payload.folderId).toBe(OWN_A.id)
    expect(JSON.stringify(slotAfter.payload)).not.toContain(bGoneId)
    expect(JSON.stringify(slotAfter.payload)).toContain(OWN_NOTE_A)
    // A 的错误与 B 的编辑分开呈现：回甲图——A 的未落库笔记与错误行都在；乙图无错误行
    await switchLineageGraph(win, OWN_A.id, OWN_A.name)
    await expect(win.locator('.tl-note-text')).toHaveText(OWN_NOTE_A)
    await expect(errorRow).toBeVisible()
    await switchLineageGraph(win, OWN_B.id, OWN_B.name)
    await expect(errorRow).toHaveCount(0)
    await expect(win.locator('.tl-card[data-node-id]').filter({ hasText: OWN_B_GONE.title })).toHaveCount(0)
    await app.close()
    // DB 回读：A 的笔记没落库（失败写保留在内存）；B 的删节点已落库
    expect(await liveDbScript(userData, 'get', 'SELECT COUNT(*) AS c FROM floating_notes WHERE folder_id = ?', [OWN_A.id])).toEqual(
      { c: 0 }
    )
    expect(await liveDbScript(userData, 'get', 'SELECT COUNT(*) AS c FROM lineage_nodes WHERE id = ?', [bGoneId])).toEqual({
      c: 0
    })
  })

  /**
   * 链 3 [§6.3 替换守卫/§2.5 #39；目标会话=活动会话]：副本稍后处理后在同一张图上继续编辑——
   * 有未落定写（打开的笔记草稿）时恢复须**先落定**再单次替换确认（「已保存当前 N 项修改」）；
   * 仅剩历史（IO clean）时恢复须替换确认，未确认不替换；确认后载入副本、该会话的撤销/重做历史清空；
   * 落定步已入库的修改保留在数据库。
   */
  test('A2 链3：带未落定写/历史的会话先落定并替换确认——未确认不替换；确认后载入副本且历史清空', async () => {
    const userData = await freshDir()
    await presetAvailableSlot(userData)
    const app = await launch(userData)
    const win = await app.firstWindow()
    await expect(win.getByTestId('recovery-bar')).toBeVisible({ timeout: 20_000 })
    await win.getByTestId('recovery-defer').click() // 稍后处理→开门可编辑
    await expect(win.getByTestId('recovery-chips')).toContainText('当前编辑未受保护')
    await openLineageEdit(win)
    const noteText = win.locator('.tl-note-text')
    const dialog = win.getByRole('dialog')
    // 未落定写：新建笔记且不收口（打开的草稿）
    await createNoteTyping(win, SETTLE_NOTE)
    const input = win.locator('.tl-note-input')
    await expect(input).toHaveValue(SETTLE_NOTE)
    // 重开确认条：编辑器随冻结收起并把草稿提交入队（W-C 探针实证：重开即见 .tl-note-text、库内尚无行）
    // ——该写在 1.5s 空闲节拍内仍是队列里的未落定写。紧接着点恢复（同一节拍窗内）：恢复须先落定
    // （把队列落库）再单次替换确认。节拍窗=设计常量（1.5s idle-flush），不为测试放宽；两下点击
    // 之间零多余等待。
    await win.getByTestId('recovery-reopen').click()
    await expect(win.getByTestId('recovery-bar')).toBeVisible()
    expect(await liveDbScript(userData, 'get', 'SELECT COUNT(*) AS c FROM floating_notes WHERE folder_id = ?', ['__main__'])).toEqual(
      { c: 0 }
    )
    await win.getByTestId('recovery-restore').click()
    await expect(dialog).toBeVisible()
    await expect(dialog).toContainText('恢复副本并替换当前图？')
    await expect(dialog).toContainText('已保存当前')
    await expect(dialog).toContainText('当前图的撤销/重做历史与未保存标记将被清除，这次替换无法撤销。')
    // 落定步已入库（确认之前）——库内恰一行
    expect(await liveDbScript(userData, 'all', 'SELECT content FROM floating_notes WHERE folder_id = ?', ['__main__'])).toEqual([
      { content: SETTLE_NOTE }
    ])
    await dialog.getByRole('button', { name: '取消', exact: true }).click()
    await expect(dialog).toHaveCount(0)
    await expect(win.getByTestId('recovery-bar')).toBeVisible() // 取消=不载入，条保留可重试
    await expect(noteText).toHaveText(SETTLE_NOTE) // 当前图未被替换
    // 此时无未落定写、只剩历史：恢复须替换确认（不预先落定——无「已保存」行）
    await win.getByTestId('recovery-restore').click()
    await expect(dialog).toBeVisible()
    await expect(dialog).toContainText('用副本替换当前图？')
    await expect(dialog).not.toContainText('已保存当前')
    await dialog.getByRole('button', { name: '取消', exact: true }).click()
    await expect(dialog).toHaveCount(0)
    await expect(noteText).toHaveText(SETTLE_NOTE)
    await expect(win.getByTestId('recovery-bar')).toBeVisible()
    // 确认替换：载入副本（旧副本正文在）；确认条与 chip 收口
    await win.getByTestId('recovery-restore').click()
    await expect(dialog).toContainText('用副本替换当前图？')
    await dialog.getByRole('button', { name: '替换并恢复', exact: true }).click()
    await expect(noteText).toHaveText(OLD_NOTE, { timeout: 10_000 })
    await expect(win.getByTestId('recovery-bar')).toHaveCount(0)
    await expect(win.getByTestId('recovery-chips')).toHaveCount(0)
    // 该会话的撤销/重做历史随替换清除（#39）
    await win.getByTestId('lineage-mode-edit').click()
    await expect(win.getByTestId('lineage-undo')).toBeDisabled()
    await expect(win.getByTestId('lineage-redo')).toBeDisabled()
    // 显式保存（首次命令：先和解）：落定步已入库的修改保留在数据库——新笔记随权威图回来，卡片在
    const saveBtn = win.getByTestId('lineage-save-btn')
    await expect(saveBtn).toBeEnabled({ timeout: 10_000 })
    await saveBtn.click()
    await expect(saveBtn).toBeDisabled({ timeout: 10_000 })
    await expect(win.locator('.tl-card[data-node-id]').filter({ hasText: PAPER.title })).toBeVisible({ timeout: 10_000 })
    await expect(noteText).toHaveText(SETTLE_NOTE)
    await app.close()
    expect(await liveDbScript(userData, 'all', 'SELECT content FROM floating_notes WHERE folder_id = ?', ['__main__'])).toEqual([
      { content: SETTLE_NOTE }
    ])
  })

  /**
   * 链 3 补充（落定步的失败分支）：有未落定写且落不了库时，恢复停在落定步——不弹确认、不替换，
   * 确认条保留可重试；当前图与库态不变。写失败=悬浮笔记写通道抛错（确定性驱动，见
   * failFloatingNoteWrites）。
   */
  test('A2 链3补：落定不了的会话——恢复停在落定步，不弹确认、不替换', async () => {
    const userData = await freshDir()
    await presetAvailableSlot(userData)
    const app = await launch(userData)
    const win = await app.firstWindow()
    await expect(win.getByTestId('recovery-bar')).toBeVisible({ timeout: 20_000 })
    await win.getByTestId('recovery-defer').click()
    await expect(win.getByTestId('recovery-chips')).toContainText('当前编辑未受保护')
    await failFloatingNoteWrites(app)
    await openLineageEdit(win)
    const noteText = win.locator('.tl-note-text')
    const dialog = win.getByRole('dialog')
    const restoreBtn = win.getByTestId('recovery-restore')
    const bar = win.getByTestId('recovery-bar')
    // 未落定写：笔记入队后 idle flush 撞桩——写保留在队列（落不了库）
    await createNoteTyping(win, BLOCK_NOTE)
    await clickBlank(win)
    await expect(noteText).toHaveText(BLOCK_NOTE)
    const errorRow = win.getByTestId('lineage-save-error')
    await expect(errorRow).toBeVisible({ timeout: 10_000 })
    await expect(errorRow).toContainText('模拟写库失败（e2e 桩）')
    await win.getByTestId('recovery-reopen').click()
    await expect(bar).toBeVisible()
    await restoreBtn.click()
    // 落定步失败：留出窗口后——无确认框、确认条仍在且可重试、当前图未被替换、库内无该笔记
    await win.waitForTimeout(1_000)
    await expect(dialog).toHaveCount(0)
    await expect(bar).toBeVisible()
    await expect(restoreBtn).toBeEnabled()
    await expect(noteText).toHaveText(BLOCK_NOTE)
    expect(await liveDbScript(userData, 'get', 'SELECT COUNT(*) AS c FROM floating_notes WHERE folder_id = ?', ['__main__'])).toEqual(
      { c: 0 }
    )
    await app.close()
  })
})
