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
 * [B4 L1 §2.5 #10/§12.3] 三处「CONFLICT 后保存钮 disabled」改新语义：CONFLICT 本次
 * 不定稿（保存钮 failed 可点+行内错误 lineage-save-error 可见——U/redo 保留），
 * 和解完成后二次显式保存才定稿（保存钮回禁用）；冲突处理本体断言保留。
 *
 * 追加用例组（[B4 L1 回炉 R-D1 / 用户裁决 D-1＝甲、适用面补充裁决＝乙]）：
 * - R-D1 过期历史出口：撤销被 history-unit 以 CONFLICT（HISTORY_STALE）拒绝→保存错误行出现
 *   「丢弃这条过期历史」→点击出确认框→确认→更旧项可撤。真实分叉=两条历史项（删两个不同节点）
 *   落库后，页面外子进程直写库把栈顶项对应的已删节点行恢复；断言真实文本+DB 回读。功能链显式
 *   钉在 1024×768（CI runner 档）执行并验收出口钮的呈现（在视口内、可点、横排、错误行不溢出
 *   工具组——[回炉 W-C·R-D1 呈现修复]）；另有一条 1280×800 短例。错误行与确认框在两档视口
 *   各截一张图（落 testInfo.outputPath——视觉岗核验面）。
 */
import { test, expect, type Locator, type Page } from '@playwright/test'
import { createHash } from 'node:crypto'
import { mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { spawn } from 'node:child_process'
import {
  bootstrapMigrations,
  launch,
  liveDbScript,
  seedLineageGraph,
  seedPaperRow,
  switchLineageGraph
} from './e2e-env'

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

// 切图=e2e-env.switchLineageGraph（[W-C] 上提共享）。本 spec 恒 clean 态切——dirty 切图有确认分支
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
    await switchLineageGraph(win, DOOM.id, DOOM.name)
    await createNote(win, '降级改存正文')
    await triggerConflict(win, userData)
    await win.getByTestId('conflict-remap').click()
    await expect(win.getByTestId('conflict-dialog')).toHaveCount(0, { timeout: 5_000 })
    // [B4 L1 §2.5 #10/§12.3] CONFLICT 本次不定稿：队列续走落库后保存钮=failed 可点
    // +行内错误可见（U/redo 保留——原「保存钮回禁用」断言翻转）
    await expect(win.getByTestId('lineage-save-error')).toBeVisible({ timeout: 10_000 })
    await expect(win.getByTestId('lineage-save-btn')).toBeEnabled()
    // 和解完成后二次显式保存才定稿：保存钮回禁用（saved）、错误行消失
    await win.getByTestId('lineage-save-btn').click()
    await expect(win.getByTestId('lineage-save-btn')).toBeDisabled({ timeout: 10_000 })
    await expect(win.getByTestId('lineage-save-error')).toHaveCount(0)
    // [回炉 W8] remap 分支收尾前当前图已矫正主图（不切即见）+救回笔记在
    await expect(win.getByTestId('lineage-nav-graph')).toContainText('主图', { timeout: 5_000 })
    await expect(win.locator('.tl-note-text')).toHaveText('降级改存正文')
    // 显式切主图复核（remap 行落主图——真实文本在）
    await switchLineageGraph(win, '__main__', '主图')
    await expect(win.locator('.tl-note-text')).toHaveText('降级改存正文')
    await app.close()
  })

  test('C2 放弃分支：放弃这条修改→修改不落库（主图/死图均无）+保存收口', async () => {
    const userData = await freshDir()
    const app = await launch(userData)
    const win = await app.firstWindow()
    await openLineageEdit(win)
    await switchLineageGraph(win, DOOM.id, DOOM.name)
    await createNote(win, '被放弃的修改')
    await triggerConflict(win, userData)
    await win.getByTestId('conflict-discard').click()
    await expect(win.getByTestId('conflict-dialog')).toHaveCount(0, { timeout: 5_000 })
    // [B4 L1 §2.5 #10/§12.3] CONFLICT 本次不定稿：failed 可点+行内错误可见→二次显式保存定稿
    await expect(win.getByTestId('lineage-save-error')).toBeVisible({ timeout: 10_000 })
    await expect(win.getByTestId('lineage-save-btn')).toBeEnabled()
    await win.getByTestId('lineage-save-btn').click()
    await expect(win.getByTestId('lineage-save-btn')).toBeDisabled({ timeout: 10_000 })
    await expect(win.getByTestId('lineage-save-error')).toHaveCount(0)
    // 修改不落库：主图无笔记；死图已删（图下拉无死夹）
    await switchLineageGraph(win, '__main__', '主图')
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
    await switchLineageGraph(win, DOOM.id, DOOM.name)
    await createNote(win, '同夹笔记一')
    await createNote(win, '同夹笔记二', false)
    await triggerConflict(win, userData)
    await win.getByTestId('conflict-remap').click()
    await expect(win.getByTestId('conflict-dialog')).toHaveCount(0, { timeout: 5_000 })
    // 一询收束：不再出现第二询（死文件夹级 remap 全覆盖）
    await win.waitForTimeout(800)
    await expect(win.getByTestId('conflict-dialog')).toHaveCount(0)
    // [B4 L1 §2.5 #10/§12.3] CONFLICT 本次不定稿：failed 可点+行内错误可见→二次显式保存定稿
    await expect(win.getByTestId('lineage-save-error')).toBeVisible({ timeout: 10_000 })
    await expect(win.getByTestId('lineage-save-btn')).toBeEnabled()
    await win.getByTestId('lineage-save-btn').click()
    await expect(win.getByTestId('lineage-save-btn')).toBeDisabled({ timeout: 10_000 })
    await expect(win.getByTestId('lineage-save-error')).toHaveCount(0)
    await switchLineageGraph(win, '__main__', '主图')
    await expect(win.locator('.tl-note-text').filter({ hasText: '同夹笔记一' })).toBeVisible()
    await expect(win.locator('.tl-note-text').filter({ hasText: '同夹笔记二' })).toBeVisible()
    await app.close()
  })
})

// ── [B4 L1 回炉 R-D1] 过期历史出口（用户裁决 D-1＝甲、适用面补充裁决＝乙）──

/** R-D1 的两篇「被删节点」文献：甲=更旧历史项的实体、乙=栈顶历史项的实体（两个不同实体） */
const STALE_JIA = { id: 'e2e-cfl-stale-jia', title: '过期历史甲文献', year: 2021 } as const
const STALE_YI = { id: 'e2e-cfl-stale-yi', title: '过期历史乙文献', year: 2022 } as const
/** 功能链视口：CI runner 原生档（显式钉定——不依赖运行环境的默认视口）与本地默认档 */
const NARROW = { width: 1024, height: 768 }
const WIDE = { width: 1280, height: 800 }

/** 可点性：按钮中心的 elementFromPoint 须命中按钮自身或其子节点（被侧板/浮层压住=假） */
function hitSelf(loc: Locator): Promise<boolean> {
  return loc.evaluate((el) => {
    const r = el.getBoundingClientRect()
    const at = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2)
    return at !== null && (at === el || el.contains(at))
  })
}

/** 右键节点菜单删除节点（卡消失） */
async function deleteNode(win: Page, card: Locator): Promise<void> {
  await card.click({ button: 'right' })
  await expect(win.getByTestId('lineage-node-menu')).toBeVisible()
  await win.getByTestId('lineage-node-menu').getByRole('menuitem', { name: '删除节点' }).click()
  await expect(card).toHaveCount(0, { timeout: 5_000 })
}

/** 关掉在场的通知卡（toast 卡=role alert 且 pointer-events-auto；错误行自身也是 role alert） */
async function dismissToasts(win: Page): Promise<void> {
  const closeBtn = win.getByRole('button', { name: '关闭通知' })
  for (let i = 0; i < 4 && (await closeBtn.count()) > 0; i += 1) {
    await closeBtn.first().click()
  }
  await expect(closeBtn).toHaveCount(0)
}

/**
 * 种子：freshDir（主图根节点）之外再种甲、乙两篇文献与节点——三个年份各一组，删除互不挤占槽位。
 */
async function seedStaleNodes(userData: string): Promise<void> {
  for (const p of [STALE_JIA, STALE_YI]) {
    const sha = createHash('sha256').update(`cfl-stale-${p.id}`).digest('hex')
    const fileRef = `${sha.slice(0, 2)}/${sha.slice(2, 4)}/${sha}.pdf`
    await seedPaperRow(userData, fileRef, sha, p.title, p.id, { year: p.year })
  }
  await seedLineageGraph(userData, {
    nodes: [
      { paperId: STALE_JIA.id, title: STALE_JIA.title, year: STALE_JIA.year },
      { paperId: STALE_YI.id, title: STALE_YI.title, year: STALE_YI.year }
    ]
  })
}

interface StaleIds {
  jiaId: string
  yiId: string
  cardJia: Locator
  cardYi: Locator
}

/**
 * 走到「撤销被拒」态：删甲（更旧项）→删乙（栈顶项）→显式保存（两项落库）→页面外子进程把乙的
 * 节点行恢复进库（分叉：栈顶项 after=null 而实体在场→history-unit 写前指纹核对不符）→撤销。
 *
 * 夹具为什么用「删两个不同节点」而不用「新建悬浮笔记」：右键新建悬浮笔记会产生两条历史项
 * （addFloatingNote 与内容 updateFloatingNote），二者是同一实体；栈顶项过期被丢弃后，栈顶仍是
 * 同一实体的另一条过期项，撤销会再次被拒——「丢弃一次后更旧项可达」不成立（W-C 探针实证：
 * b4b-rework/w-c/logs/probe-rd1-undo-after-drop-run1.log）。删除节点每条编辑恰一条历史项，两个
 * 不同实体互不影响。
 */
async function reachStaleState(win: Page, userData: string): Promise<StaleIds> {
  await openLineageEdit(win)
  const cardJia = win.locator('.tl-card[data-node-id]').filter({ hasText: STALE_JIA.title })
  const cardYi = win.locator('.tl-card[data-node-id]').filter({ hasText: STALE_YI.title })
  await expect(cardJia).toBeVisible({ timeout: 10_000 })
  await expect(cardYi).toBeVisible({ timeout: 10_000 })
  const jiaId = await cardJia.getAttribute('data-node-id')
  const yiId = await cardYi.getAttribute('data-node-id')
  expect(jiaId && yiId, '基线节点 id 非空').toBeTruthy()
  // 乙的整行（页面外恢复用——恢复成逐列相同的行，仅 updated_at 取恢复时刻）
  const yiRow = (await liveDbScript(userData, 'get', 'SELECT * FROM lineage_nodes WHERE id = ?', [yiId])) as Record<
    string,
    unknown
  >
  await deleteNode(win, cardJia)
  await deleteNode(win, cardYi)
  const saveBtn = win.getByTestId('lineage-save-btn')
  await expect(saveBtn).toBeEnabled({ timeout: 10_000 })
  await saveBtn.click()
  await expect(saveBtn).toBeDisabled({ timeout: 10_000 })
  await expect(win.getByTestId('lineage-undo')).toBeEnabled()
  await expect(win.getByTestId('lineage-redo')).toBeDisabled()
  // DB 回读：两节点均已删（历史项落库后才分叉）
  expect(await liveDbScript(userData, 'all', 'SELECT id FROM lineage_nodes WHERE id IN (?, ?) ORDER BY id', [jiaId, yiId])).toEqual(
    []
  )
  // 页面外恢复乙的节点行
  await liveDbScript(
    userData,
    'run',
    'INSERT INTO lineage_nodes (id, paper_id, title, core_idea, year, x, y, created_at, updated_at, tags, month, slot, folder_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [
      yiRow.id,
      yiRow.paper_id,
      yiRow.title,
      yiRow.core_idea,
      yiRow.year,
      yiRow.x,
      yiRow.y,
      yiRow.created_at,
      new Date().toISOString(),
      yiRow.tags,
      yiRow.month,
      yiRow.slot,
      yiRow.folder_id
    ]
  )
  // 撤销→被拒（CONFLICT/HISTORY_STALE）：错误行+出口
  await win.getByTestId('lineage-undo').click()
  const errorRow = win.getByTestId('lineage-save-error')
  await expect(errorRow).toBeVisible({ timeout: 10_000 })
  await expect(errorRow).toContainText('保存失败：节点已被其他操作改变')
  await expect(errorRow).toContainText(`（${yiId}）`)
  await expect(errorRow).toContainText('撤销/重做未执行')
  await expect(win.getByTestId('lineage-stale-drop')).toHaveText('丢弃这条过期历史')
  await dismissToasts(win)
  return { jiaId: jiaId!, yiId: yiId!, cardJia, cardYi }
}

/**
 * 出口钮呈现验收（[回炉 W-C·R-D1 呈现修复]——修复前：长消息把工具组挤爆，出口钮一字一行竖排
 * 高 122px，1024×768 下整行溢出工具组右缘、落在侧板之下不可点）：在视口内；按钮中心命中自身
 * 或其子节点（未被压住）；横排（高度<40px）；错误行整体落在工具组盒子内（右缘不超工具组右缘）。
 */
async function expectDropButtonPresented(win: Page): Promise<void> {
  const errorRow = win.getByTestId('lineage-save-error')
  const dropBtn = win.getByTestId('lineage-stale-drop')
  await expect(dropBtn).toBeInViewport()
  await expect(dropBtn).toHaveText('丢弃这条过期历史')
  expect(await hitSelf(dropBtn), '出口钮可点：按钮中心 elementFromPoint 命中自身或其子节点').toBe(true)
  const dropBox = await dropBtn.boundingBox()
  expect(dropBox).not.toBeNull()
  expect(dropBox!.height, '出口钮横排可读（高度<40px）').toBeLessThan(40)
  const [toolbarBox, errorBox] = await Promise.all([win.locator('.lg-toolbar').boundingBox(), errorRow.boundingBox()])
  expect(toolbarBox).not.toBeNull()
  expect(errorBox).not.toBeNull()
  expect(errorBox!.x + errorBox!.width, '错误行右缘不超过工具组右缘').toBeLessThanOrEqual(
    toolbarBox!.x + toolbarBox!.width + 0.5
  )
}

test.describe('过期历史出口 e2e（B4 L1 回炉 R-D1）', () => {
  test('R-D1（1024×768）撤销被拒（HISTORY_STALE）→出口钮可见可点→确认框→确认→更旧项可撤（真实文本+DB 回读）', async ({}, testInfo) => {
    const userData = await freshDir()
    await seedStaleNodes(userData)
    const app = await launch(userData)
    const win = await app.firstWindow()
    // 视口显式钉 1024×768（CI runner 档）：出口在该宽度下必须可见可点——不依赖运行环境默认视口
    await win.setViewportSize(NARROW)
    const { jiaId, yiId, cardJia, cardYi } = await reachStaleState(win, userData)
    const undoBtn = win.getByTestId('lineage-undo')
    const redoBtn = win.getByTestId('lineage-redo')
    const errorRow = win.getByTestId('lineage-save-error')
    const dropBtn = win.getByTestId('lineage-stale-drop')
    const dialog = win.getByRole('dialog')

    // 两栈不动：栈顶项仍在（撤销可点、重做仍空）；被拒的撤销未执行（两卡均未恢复）
    await expect(undoBtn).toBeEnabled()
    await expect(redoBtn).toBeDisabled()
    await expect(cardJia).toHaveCount(0)
    await expect(cardYi).toHaveCount(0)
    await expectDropButtonPresented(win)
    await win.screenshot({ path: testInfo.outputPath('stale-drop-error-row-1024x768.png') })

    // 点击出口只开确认框（不丢弃）；未确认（取消）零变化
    await dropBtn.click()
    await expect(dialog).toBeVisible()
    await expect(dialog).toContainText('丢弃这条过期历史？')
    await expect(dialog).toContainText('节点已被其他操作改变')
    await expect(dialog).toContainText('只从内存的撤销/重做历史里移除栈顶这一条，不写数据库')
    await expect(dialog).toBeInViewport()
    await win.screenshot({ path: testInfo.outputPath('stale-drop-confirm-1024x768.png') })
    await dialog.getByRole('button', { name: '取消', exact: true }).click()
    await expect(dialog).toHaveCount(0)
    await expect(dropBtn).toBeVisible() // 取消=零变化：过期标记与出口仍在

    // 再次撤销仍被拒：本次命令先和解（needsReload——页面外恢复的乙卡取回到视图=命令已起步的
    // 确定信号），随后同一栈顶项再被拒——甲未恢复、出口仍在（成功会移栈并清标记，出口随之消失）
    await undoBtn.click()
    await expect(cardYi).toBeVisible({ timeout: 10_000 })
    await expect(cardYi).toContainText(STALE_YI.title)
    await expect(errorRow).toBeVisible({ timeout: 10_000 })
    await expect(errorRow).toContainText('撤销/重做未执行')
    await expect(dropBtn).toBeVisible()
    await expect(cardJia).toHaveCount(0)
    await expect(undoBtn).toBeEnabled()
    await dismissToasts(win)

    // 确认丢弃：只移除栈顶过期项——错误行消失；丢弃≠撤销（甲仍未恢复、乙仍在）
    await dropBtn.click()
    await expect(dialog).toBeVisible()
    await dialog.getByRole('button', { name: '丢弃', exact: true }).click()
    await expect(dialog).toHaveCount(0)
    await expect(errorRow).toHaveCount(0)
    await expect(dropBtn).toHaveCount(0)
    await expect(cardJia).toHaveCount(0)
    await expect(cardYi).toBeVisible()
    // 更旧项可达：撤销（删节点甲）→原卡片真实文本+原节点 id 恢复
    await undoBtn.click()
    await expect(cardJia).toBeVisible({ timeout: 10_000 })
    await expect(cardJia).toContainText(STALE_JIA.title)
    expect(await cardJia.getAttribute('data-node-id'), '撤销恢复原节点 id').toBe(jiaId)
    expect(await cardYi.getAttribute('data-node-id'), '乙=页面外恢复的原行').toBe(yiId)
    await expect(errorRow).toHaveCount(0)
    await expect(redoBtn).toBeEnabled()
    await app.close()

    // DB 回读：甲按原 id 恢复且只删过一次；乙=页面外恢复的行在场（被拒的撤销零写——未再删一次）
    expect(await liveDbScript(userData, 'all', 'SELECT id FROM lineage_nodes WHERE id IN (?, ?) ORDER BY id', [jiaId, yiId])).toEqual(
      [jiaId, yiId].sort().map((id) => ({ id }))
    )
    const dels = await liveDbScript(
      userData,
      'all',
      'SELECT id, COUNT(*) AS c FROM deletion_events WHERE entity = ? AND id IN (?, ?) GROUP BY id ORDER BY id',
      ['lineage_nodes', jiaId, yiId]
    )
    expect(dels).toEqual([jiaId, yiId].sort().map((id) => ({ id, c: 1 })))
  })

  test('R-D1（1280×800）撤销被拒后出口钮在视口内且横排（错误行与确认框截图）', async ({}, testInfo) => {
    const userData = await freshDir()
    await seedStaleNodes(userData)
    const app = await launch(userData)
    const win = await app.firstWindow()
    await win.setViewportSize(WIDE)
    await reachStaleState(win, userData)
    await expectDropButtonPresented(win)
    await win.screenshot({ path: testInfo.outputPath('stale-drop-error-row-1280x800.png') })
    const dialog = win.getByRole('dialog')
    await win.getByTestId('lineage-stale-drop').click()
    await expect(dialog).toBeVisible()
    await expect(dialog).toContainText('丢弃这条过期历史？')
    await expect(dialog).toBeInViewport()
    await win.screenshot({ path: testInfo.outputPath('stale-drop-confirm-1280x800.png') })
    await app.close()
  })
})
