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
 *
 * [B5 设计稿 §3.2/§6.2/§6.3/§11.3/§12 B5-E06/E08——wave C 2026-11-25 断言翻转+新增] 告警迁稳定 Page 外壳后：
 * - 出口呈现验收改「告警=横滚容器兄弟节点（不在工具控件轨道内）+右缘不超壳层+告警出现前后控件轨道
 *   top/height 不变」；原「.lg-toolbar 包错误行」几何比较删除；
 * - E06 三模式参数化：browse/focus 下撤销、重做各被 HISTORY_STALE 拒——告警含 main 真实原因与
 *   方向文案、无保存重试、丢弃出口可见，确认后更旧历史可用（原「点 edit 才见错误行」前提退役）；
 * - E08 C2 对照：history 零写失败（Q0/F0）后 lineagePending 释放、结构写放行；普通写失败（Q1）
 *   仍被 INV-91 队列闸拒；两种情况下告警都在。
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

/** 控件轨道几何快照（[B5 设计稿 §3.2] 告警=滚动容器的兄弟节点——出现前后轨道 top/height 不变） */
interface TrackBox {
  top: number
  height: number
}

interface StaleIds {
  jiaId: string
  yiId: string
  cardJia: Locator
  cardYi: Locator
  /** 告警出现前的控件轨道几何（告警独立性断言的对照基线） */
  trackBefore: TrackBox
}

/**
 * 走到「撤销被拒」态：删甲（更旧项）→删乙（栈顶项）→显式保存（两项落库）→页面外子进程把乙的
 * 节点行恢复进库（分叉：栈顶项 after=null 而实体在场→history-unit 写前指纹核对不符）。
 * [B5 设计稿 §12 B5-E06——wave C 2026-11-25] 拆为两步：本函数走到「栈顶项过期、尚未发撤销」
 * （reachStaleReady），rejectUndo 发撤销并断言被拒——被拒命令可在 edit/browse/focus 任一模式发出。
 *
 * 夹具为什么用「删两个不同节点」而不用「新建悬浮笔记」：右键新建悬浮笔记会产生两条历史项
 * （addFloatingNote 与内容 updateFloatingNote），二者是同一实体；栈顶项过期被丢弃后，栈顶仍是
 * 同一实体的另一条过期项，撤销会再次被拒——「丢弃一次后更旧项可达」不成立（W-C 探针实证：
 * b4b-rework/w-c/logs/probe-rd1-undo-after-drop-run1.log）。删除节点每条编辑恰一条历史项，两个
 * 不同实体互不影响。
 */
async function reachStaleReady(win: Page, userData: string): Promise<StaleIds> {
  await openLineageEdit(win)
  const trackBefore = await trackBox(win) // [B5 §3.2] 告警出现前的控件轨道基线
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
  return { jiaId: jiaId!, yiId: yiId!, cardJia, cardYi, trackBefore }
}

/**
 * 发撤销并断言被拒（CONFLICT/HISTORY_STALE）：告警=方向文案+指引+丢弃出口，无保存重试
 * （[B5 设计稿 §6.3 R4] 告警挂稳定 Page 外壳——调用方所处模式即被拒命令的模式）。
 */
async function rejectUndo(win: Page, yiId: string): Promise<void> {
  // 撤销→被拒（CONFLICT/HISTORY_STALE）：错误行+出口
  // [B5 设计稿 §2.4/§6 C1 断言翻转] history-unit 被拒=history-undo 来源——行文案为方向文案「撤销失败：」
  // 与「历史栈未变化，重按撤销即可重试」指引（原「保存失败：…撤销/重做未执行」通用错误行文案退役）；
  // 丢弃出口断言保留
  await win.getByTestId('lineage-undo').click()
  const errorRow = win.getByTestId('lineage-save-error')
  await expect(errorRow).toBeVisible({ timeout: 10_000 })
  await expect(errorRow).toContainText('撤销失败：节点已被其他操作改变')
  await expect(errorRow).toContainText(`（${yiId}）`)
  await expect(errorRow).toContainText('历史栈未变化，重按撤销即可重试')
  await expect(win.getByTestId('lineage-stale-drop')).toHaveText('丢弃这条过期历史')
  await dismissToasts(win)
  // [B5 §2.4/§6.2] history 来源告警不渲染保存重试（重试入口=重按原方向命令）
  await expect(win.getByTestId('lineage-save-retry')).toHaveCount(0)
}

/** 组合：走到过期就绪→发撤销被拒（edit 态——既有 R-D1 两例的入口） */
async function reachStaleState(win: Page, userData: string): Promise<StaleIds> {
  const state = await reachStaleReady(win, userData)
  await rejectUndo(win, state.yiId)
  return state
}

/**
 * [B5 设计稿 §12 B5-E06] 走到「重做栈顶过期」态：删甲→删乙→显式保存→撤销两次（乙、甲恢复；重做栈=
 * [重删乙（更旧）, 重删甲（栈顶）]）→页面外改甲行 title（history-unit 指纹不含 updatedAt——改
 * title 才构成「before 指纹不符」分叉）。之后发重做=栈顶项被 CONFLICT/HISTORY_STALE 拒。
 */
async function reachStaleRedoReady(win: Page, userData: string): Promise<StaleIds> {
  await openLineageEdit(win)
  const trackBefore = await trackBox(win) // [B5 §3.2] 告警出现前的控件轨道基线
  const cardJia = win.locator('.tl-card[data-node-id]').filter({ hasText: STALE_JIA.title })
  const cardYi = win.locator('.tl-card[data-node-id]').filter({ hasText: STALE_YI.title })
  await expect(cardJia).toBeVisible({ timeout: 10_000 })
  await expect(cardYi).toBeVisible({ timeout: 10_000 })
  const jiaId = await cardJia.getAttribute('data-node-id')
  const yiId = await cardYi.getAttribute('data-node-id')
  expect(jiaId && yiId, '基线节点 id 非空').toBeTruthy()
  await deleteNode(win, cardJia)
  await deleteNode(win, cardYi)
  const saveBtn = win.getByTestId('lineage-save-btn')
  await expect(saveBtn).toBeEnabled({ timeout: 10_000 })
  await saveBtn.click()
  await expect(saveBtn).toBeDisabled({ timeout: 10_000 })
  // 撤销两次：乙、甲依次恢复（真实卡文本）→重做栈两项，栈顶=重删甲
  const undoBtn = win.getByTestId('lineage-undo')
  await undoBtn.click()
  await expect(cardYi).toBeVisible({ timeout: 10_000 })
  await undoBtn.click()
  await expect(cardJia).toBeVisible({ timeout: 10_000 })
  await expect(cardJia).toContainText(STALE_JIA.title)
  await expect(win.getByTestId('lineage-redo')).toBeEnabled()
  // 页面外改甲行 title：重做「删甲」的 before 指纹不符
  await liveDbScript(userData, 'run', 'UPDATE lineage_nodes SET title = ? WHERE id = ?', [`${STALE_JIA.title}（页面外改动）`, jiaId])
  return { jiaId: jiaId!, yiId: yiId!, cardJia, cardYi, trackBefore }
}

/** 发重做并断言被拒：告警=重做方向文案+指引+丢弃出口，无保存重试 */
async function rejectRedo(win: Page, jiaId: string): Promise<void> {
  await win.getByTestId('lineage-redo').click()
  const errorRow = win.getByTestId('lineage-save-error')
  await expect(errorRow).toBeVisible({ timeout: 10_000 })
  await expect(errorRow).toContainText('重做失败：节点已被其他操作改变')
  await expect(errorRow).toContainText(`（${jiaId}）`)
  await expect(errorRow).toContainText('历史栈未变化，重按重做即可重试')
  await expect(errorRow).not.toContainText('保存失败')
  await expect(win.getByTestId('lineage-stale-drop')).toHaveText('丢弃这条过期历史')
  await expect(win.getByTestId('lineage-save-retry')).toHaveCount(0)
  await dismissToasts(win)
}

/** 切换模式（工具栏三模式钮——[B5 §3.1] 三态常驻）并断言选中态 */
async function switchMode(win: Page, button: 'lineage-mode-browse' | 'lineage-mode-focus'): Promise<void> {
  await win.getByTestId(button).click()
  await expect(win.getByTestId(button)).toHaveAttribute('aria-pressed', 'true')
}

/** E06 公共段：丢弃出口确认（只移栈顶一项——告警与出口随之消失） */
async function dropStaleConfirm(win: Page): Promise<void> {
  const dialog = win.getByRole('dialog')
  await win.getByTestId('lineage-stale-drop').click()
  await expect(dialog).toBeVisible()
  await expect(dialog).toContainText('丢弃这条过期历史？')
  await expect(dialog).toContainText('不写数据库')
  await dialog.getByRole('button', { name: '丢弃', exact: true }).click()
  await expect(dialog).toHaveCount(0)
  await expect(win.getByTestId('lineage-save-error')).toHaveCount(0)
  await expect(win.getByTestId('lineage-stale-drop')).toHaveCount(0)
}

/**
 * 出口钮呈现验收（[B5 设计稿 §3.2/§6.2/§11.3「lineage-conflict：窄视口改『告警独立、控件轨道不增高』；旧
 * .lg-toolbar 包错误行的几何比较删除」——wave C 2026-11-25 断言翻转；原 [回炉 W-C·R-D1 呈现修复]
 * 缘由：长消息把工具组挤爆，出口钮一字一行竖排高 122px，1024×768 下整行溢出到侧板之下不可点）：
 * 出口钮在视口内；按钮中心命中自身或其子节点（未被压住）；横排（高度<40px）；告警=横滚容器的
 * 兄弟节点（不在 .lg-toolbar-scroll 内——不占工具控件轨道）且右缘不超壳层右缘；告警出现前后
 * 控件轨道 top/height 不变（告警只影响自己的告警区高度）。
 */
async function trackBox(win: Page): Promise<TrackBox> {
  const b = (await win.locator('.lg-toolbar').boundingBox())!
  return { top: b.y, height: b.height }
}

async function expectDropButtonPresented(win: Page, trackBefore: TrackBox): Promise<void> {
  const dropBtn = win.getByTestId('lineage-stale-drop')
  await expect(dropBtn).toBeInViewport()
  await expect(dropBtn).toHaveText('丢弃这条过期历史')
  expect(await hitSelf(dropBtn), '出口钮可点：按钮中心 elementFromPoint 命中自身或其子节点').toBe(true)
  const dropBox = await dropBtn.boundingBox()
  expect(dropBox).not.toBeNull()
  expect(dropBox!.height, '出口钮横排可读（高度<40px）').toBeLessThan(40)
  const geo = await win.evaluate(() => {
    const alert = document.querySelector('.lg-save-error')
    const shell = document.querySelector('.lg-toolbar-shell')
    const scroll = document.querySelector('.lg-toolbar-scroll')
    const track = document.querySelector('.lg-toolbar')
    if (alert === null || shell === null || scroll === null || track === null) return null
    const a = alert.getBoundingClientRect()
    const s = shell.getBoundingClientRect()
    const t = track.getBoundingClientRect()
    return {
      alertInScroll: scroll.contains(alert),
      alertInShell: shell.contains(alert),
      alertRight: a.x + a.width,
      shellRight: s.x + s.width,
      trackTop: t.y,
      trackHeight: t.height
    }
  })
  if (geo === null) throw new Error('.lg-save-error/.lg-toolbar-shell/.lg-toolbar-scroll/.lg-toolbar 缺席')
  expect(geo.alertInScroll, '告警不得落在工具栏滚动容器内（不占工具控件轨道）').toBe(false)
  expect(geo.alertInShell, '告警与滚动容器同父=稳定外壳').toBe(true)
  expect(geo.alertRight, '告警右缘不超过壳层右缘').toBeLessThanOrEqual(geo.shellRight + 0.5)
  expect(Math.abs(geo.trackTop - trackBefore.top), '告警出现前后控件轨道 top 不变').toBeLessThanOrEqual(0.5)
  expect(Math.abs(geo.trackHeight - trackBefore.height), '告警出现前后控件轨道 height 不变（不增高）').toBeLessThanOrEqual(0.5)
}

test.describe('过期历史出口 e2e（B4 L1 回炉 R-D1）', () => {
  test('R-D1（1024×768）撤销被拒（HISTORY_STALE）→出口钮可见可点→确认框→确认→更旧项可撤（真实文本+DB 回读）', async ({}, testInfo) => {
    const userData = await freshDir()
    await seedStaleNodes(userData)
    const app = await launch(userData)
    const win = await app.firstWindow()
    // 视口显式钉 1024×768（CI runner 档）：出口在该宽度下必须可见可点——不依赖运行环境默认视口
    await win.setViewportSize(NARROW)
    const { jiaId, yiId, cardJia, cardYi, trackBefore } = await reachStaleState(win, userData)
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
    await expectDropButtonPresented(win, trackBefore)
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
    await expect(errorRow).toContainText('历史栈未变化，重按撤销即可重试') // [B5 C1 断言翻转] 方向文案＋指引（原「撤销/重做未执行」）
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
    const { trackBefore } = await reachStaleState(win, userData)
    await expectDropButtonPresented(win, trackBefore)
    await win.screenshot({ path: testInfo.outputPath('stale-drop-error-row-1280x800.png') })
    const dialog = win.getByRole('dialog')
    await win.getByTestId('lineage-stale-drop').click()
    await expect(dialog).toBeVisible()
    await expect(dialog).toContainText('丢弃这条过期历史？')
    await expect(dialog).toBeInViewport()
    await win.screenshot({ path: testInfo.outputPath('stale-drop-confirm-1280x800.png') })
    await app.close()
  })

  // ── [B5 设计稿 §12 B5-E06——wave C 2026-11-25] 三模式参数化（R4：告警与丢弃出口三模式可达）──
  for (const [mode, button] of [
    ['browse', 'lineage-mode-browse'],
    ['focus', 'lineage-mode-focus']
  ] as const) {
    test(`B5-E06 ${mode} 模式：撤销与重做各被 HISTORY_STALE 拒→方向文案+无保存重试+丢弃出口→确认后更旧历史可用（1024×768）`, async ({}, testInfo) => {
      // ── 撤销方向 ──
      const undoDir = await freshDir()
      await seedStaleNodes(undoDir)
      const app = await launch(undoDir)
      const win = await app.firstWindow()
      await win.setViewportSize(NARROW)
      const undoState = await reachStaleReady(win, undoDir)
      await switchMode(win, button) // 被拒命令在目标模式发出（原「点 edit 才见错误行」前提退役）
      await rejectUndo(win, undoState.yiId)
      await expect(win.getByTestId('lineage-save-error')).not.toContainText('保存失败')
      await expectDropButtonPresented(win, undoState.trackBefore)
      await expect(undoState.cardJia).toHaveCount(0) // 被拒的撤销未执行（甲未恢复）
      await expect(win.getByTestId('lineage-redo')).toBeDisabled()
      await win.screenshot({ path: testInfo.outputPath(`b5-e06-undo-rejected-${mode}-1024x768.png`) })
      await dropStaleConfirm(win)
      // 更旧项可达：撤销（删节点甲）→甲原卡恢复；模式未被切换
      await win.getByTestId('lineage-undo').click()
      await expect(undoState.cardJia).toBeVisible({ timeout: 10_000 })
      await expect(undoState.cardJia).toContainText(STALE_JIA.title)
      await expect(win.getByTestId(button)).toHaveAttribute('aria-pressed', 'true')
      await expect(win.getByTestId('lineage-save-error')).toHaveCount(0)
      await app.close()

      // ── 重做方向 ──
      const redoDir = await freshDir()
      await seedStaleNodes(redoDir)
      const app2 = await launch(redoDir)
      const win2 = await app2.firstWindow()
      await win2.setViewportSize(NARROW)
      const redoState = await reachStaleRedoReady(win2, redoDir)
      await switchMode(win2, button)
      await rejectRedo(win2, redoState.jiaId)
      await expectDropButtonPresented(win2, redoState.trackBefore)
      await expect(redoState.cardJia).toBeVisible() // 被拒的重做未执行（甲未删）
      await win2.screenshot({ path: testInfo.outputPath(`b5-e06-redo-rejected-${mode}-1024x768.png`) })
      await dropStaleConfirm(win2)
      // 更旧项可达：重做（重删乙）→乙原卡消失；DB 回读=乙已删、甲仍在
      await win2.getByTestId('lineage-redo').click()
      await expect(redoState.cardYi).toHaveCount(0, { timeout: 10_000 })
      expect(
        await liveDbScript(redoDir, 'all', 'SELECT id FROM lineage_nodes WHERE id IN (?, ?) ORDER BY id', [redoState.jiaId, redoState.yiId])
      ).toEqual([{ id: redoState.jiaId }])
      await app2.close()
    })
  }

  // ── [B5 设计稿 §12 B5-E08 / §7 C2=B] history 零写失败释放 lineagePending；普通写失败（Q1）仍拒 ──
  test('B5-E08 C2 对照：history 零写失败（Q0/F0）→lineagePending 释放、结构写放行；普通写失败（Q1）→结构写仍拒；告警两种情况都在', async () => {
    const userData = await freshDir()
    await seedStaleNodes(userData)
    const app = await launch(userData)
    const win = await app.firstWindow()
    await win.setViewportSize(WIDE)
    // 撤销被拒=history-undo 来源：Q0/F0（ioUnsettled=false）——告警在、保存重试不在
    await reachStaleState(win, userData)
    const errorRow = win.getByTestId('lineage-save-error')
    await expect(errorRow).toContainText('撤销失败：')
    await expect(win.getByTestId('lineage-save-retry')).toHaveCount(0)
    await dismissToasts(win)
    /** 结构写探针：folders.create 走 INV-91 队列闸（lineagePending 缓存由 App 聚合经 setQuitDirty 上报） */
    const createFolder = (name: string): Promise<string> =>
      win.evaluate(async (n) => {
        const r = (await window.api.folders.create({ name: n })) as { ok: boolean; error?: { message: string } }
        return r.ok ? 'ok' : `rejected: ${r.error?.message ?? ''}`
      }, name)
    // Q0/F0 history error 不单独互斥结构写（B5-D01=C2 选 B）
    await expect.poll(() => createFolder('结构写探针甲'), { timeout: 10_000 }).toBe('ok')
    await expect(errorRow).toBeVisible() // 放行后告警仍在
    // 负对照：普通写失败（写失败队首保留→Q1）——悬浮笔记写通道抛错
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
    await win.getByTestId('lineage-mode-edit').click()
    await win.getByTestId('lineage-tool-select').click()
    await createNote(win, '写失败探针笔记')
    await expect(errorRow).toContainText('保存失败：') // 最近一次失败=save 来源
    await expect(win.getByTestId('lineage-save-retry')).toBeVisible() // save 来源有保存重试
    await dismissToasts(win)
    await expect.poll(() => createFolder('结构写探针乙'), { timeout: 10_000 }).toContain('脉络图编辑保存中')
    await expect(errorRow).toBeVisible() // 拒绝态下告警仍在
    // 回读：甲夹已建、乙夹未建（真实应用读面）
    const names = await win.evaluate(async () => {
      const r = (await window.api.folders.list({})) as { ok: boolean; data: Array<{ name: string }> }
      return r.data.map((f) => f.name)
    })
    expect(names).toContain('结构写探针甲')
    expect(names).not.toContain('结构写探针乙')
    await app.close()
  })
})
