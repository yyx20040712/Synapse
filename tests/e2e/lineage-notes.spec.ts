// b3: P7-H
/**
 * [F-VISFB-63] 悬浮笔记冒烟 e2e（62 号裁决部 ⑤-1 采纳——新 UI 零真浏览器面：
 * effectiveScale 真实换算/柄 hit-area/皮肤渲染由本 spec 承载）。断言一律
 * 真实文本（宪法 e2e 红线）。
 * [S6] 分工申报：uiScale=1 档（small 默认）使 sEff≡z——u 因子由 timeline-zoom
 * 单测承载（clientToOwnPt 两因子单源面，本 spec 不重复）；皮肤渲染锚=N1
 * computed-style（.tl-note 面板底非透明=token 生效证据）。
 *
 * 用例组：
 * - N1 创建→编辑→blur 收口→真文本→保存→reload 持久（右键空白 .tl-content
 *   空白处〔目标不在 .tl-card/.tl-edge-hit(s)/.tl-note 上〕→菜单「新建悬浮
 *   笔记」→textarea 输入→点空白 blur 收口→.tl-note-text 显真文本）；
 * - N2 书签柄拖动位移→保存→reload 位置持久（boundingBox+mouse 三段——
 *   先 scrollIntoView，F-CIFLK-01 CI 窄视口先例）；
 * - N3 draft 视图切换收口链（编辑不 blur→rail 切走再切回→.tl-note-text=
 *   草稿内容→保存→reload 持久）→笔记右键「删除笔记」→消失→保存→reload
 *   后无。
 * - [回炉 W-B4·R1] N4 输入法合成期不落库：CDP Input.imeSetComposition 驱动真实
 *   合成（与 IME 同一 Chromium 输入路径）——合成中停留 >1.5s 后库内正文未变，
 *   提交合成后再等 1.5s 落终值（活库回读=e2e-env.liveDbScript）。
 * - [B5-E13／F-KEEPOPN-01] N5/N6 真机探针组（设计稿 §8.3、§12 B5-E13；INV-190 机检）：页内
 *   MutationObserver 逐提交采样＋焦点事件表，探针先于创建安装。N5＝自身 idle 提交的 saving 窗内
 *   textarea 是同一 DOM 节点、未被移除、全程聚焦，续写不丢，真实正文落库；N6＝R3 负对照——
 *   其他写（创建写自身）触发的 saving 窗编辑器照旧让位卸载、落定后回挂。
 * 种子=e2e-env.seedLineageGraph（单节点锚）+seedPaperRow 幽灵行；
 * mode=lineage-mode-edit+tool=lineage-tool-select（lineage.spec.ts:207 先例）。
 */
import { test, expect, type Page } from '@playwright/test'
import { createHash } from 'node:crypto'
import { mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { bootstrapMigrations, launch, seedLineageGraph, seedPaperRow, liveDbScript } from './e2e-env'

const PAPER = { id: 'e2e-nt-root', title: '笔记锚文献', year: 2020 } as const

/** 种子：单节点锚（幽灵文献行+图节点直写——launch 前子进程落库） */
async function seedAll(userData: string): Promise<void> {
  const sha = createHash('sha256').update(`nt-ghost-${PAPER.id}`).digest('hex')
  const fileRef = `${sha.slice(0, 2)}/${sha.slice(2, 4)}/${sha}.pdf`
  await seedPaperRow(userData, fileRef, sha, PAPER.title, PAPER.id, { year: PAPER.year })
  await seedLineageGraph(userData, {
    nodes: [{ paperId: PAPER.id, title: PAPER.title, year: PAPER.year }],
    edges: []
  })
}

/** reload 后回脉络视图并等锚节点在场（lineage.spec reloadToLineage 同型） */
async function reloadToLineage(win: Page): Promise<void> {
  await win.reload()
  await expect(win.getByRole('button', { name: '文献库' })).toBeVisible({ timeout: 20_000 })
  await win.getByRole('button', { name: '脉络', exact: true }).click()
  await expect(win.locator('.tl-card[data-node-id]').filter({ hasText: PAPER.title })).toBeVisible({
    timeout: 10_000
  })
}

/** 独立数据目录+建库迁移+种子（每用例隔离） */
async function freshDir(): Promise<string> {
  const userData = await mkdtemp(join(tmpdir(), 'synapse-nt63-'))
  await bootstrapMigrations(userData)
  await seedAll(userData)
  return userData
}

/** 进脉络编辑态（edit 模式+select 工具——笔记交互门） */
async function enterEditSelect(win: Page): Promise<void> {
  await expect(win.locator('.tl-card[data-node-id]').filter({ hasText: PAPER.title })).toBeVisible({
    timeout: 10_000
  })
  await win.getByTestId('lineage-mode-edit').click()
  await win.getByTestId('lineage-tool-select').click()
}

/** 右键空白创建笔记（创建即编辑态——textarea 聚焦；不输入） */
async function createNote(win: Page): Promise<void> {
  const content = win.locator('.tl-content')
  const cb = await content.boundingBox()
  if (cb === null) throw new Error('内容层不可见')
  await content.click({ button: 'right', position: { x: cb.width - 60, y: cb.height - 60 } })
  const menu = win.getByTestId('note-anchor-menu')
  await expect(menu).toBeVisible({ timeout: 5_000 })
  await menu.getByRole('menuitem', { name: '新建悬浮笔记' }).click()
}

/** 右键空白创建笔记并输入文本（不 blur——收口交调用面） */
async function createNoteTyping(win: Page, text: string): Promise<void> {
  await createNote(win)
  await win.locator('.tl-note-input').fill(text)
}

/** 点空白（左键）触发 textarea blur 收口 */
async function clickBlank(win: Page): Promise<void> {
  const content = win.locator('.tl-content')
  const cb = await content.boundingBox()
  if (cb === null) throw new Error('内容层不可见')
  await content.click({ position: { x: 40, y: 40 } })
}

/** [B5-E13／F-KEEPOPN-01] 真机探针的一行＝一次 DOM 提交之后的采样 */
interface NoteProbeCommit {
  /** performance.now()（ms）——该提交的 MutationObserver 回调时刻 */
  t: number
  /** 提交后 saving spinner 在场 */
  on: boolean
  /** saving 沿：本提交使 spinner 出现＝'on'、消失＝'off'（saving 窗的起止提交）；其余 null */
  edge: 'on' | 'off' | null
  /** 提交后在场编辑器的挂载序号（0＝无编辑器） */
  m: number
  /** 提交后 document.activeElement＝在场编辑器 */
  f: boolean
  /** 本提交内编辑器节点的卸载／挂载次数 */
  rem: number
  add: number
}

/** 探针状态（页内 window.__e13NoteProbe.state——JSON 可序列化，断言与失败诊断共用） */
interface NoteProbeState {
  commits: NoteProbeCommit[]
  /** textarea 的 blur／focus 事件（时刻＋发出事件的节点序号） */
  focus: Array<{ t: number; k: 'blur' | 'focus'; m: number }>
  /** 正文写入时刻（与输入事件同一段脚本——自身 idle 提交段的起点）；null＝尚未输入 */
  typedAt: number | null
  /** 正文写入时在场编辑器的挂载序号 */
  typedMount: number
}

/**
 * [B5-E13／F-KEEPOPN-01，设计稿 §8.3] 页内探针：每个 DOM 提交后记一行采样，另记 textarea 焦点事件。
 * - saving 的观测锚＝保存钮内的 spinner（LineageSaveButton 在 saving 态渲染；判据 inflight 在场与
 *   LineageFloatingNotes 的 saving 同源）。spinner 的挂与卸各是一次 DOM 提交，MutationObserver 在
 *   提交后采样——窗再短也留痕，不以固定 sleep 或轮询猜窗。
 * - 一行＝一次提交之后的状态，不跨来源比时间戳：R3 让位时 blur、卸载、spinner 出现同属一次提交，
 *   事件先后取决于采样方式；「提交后编辑器是否在场、是否聚焦」才是可直接判读的事实。
 * - 编辑器节点身份＝挂载序号，同时写成测试属性 data-e13-mount（输入前已在节点上）。
 * - 焦点流失只有两条路：textarea 收到 blur，或节点被移除。两条都在表里，所以「零 blur＋零卸载＋
 *   saving 在场的每个提交后都聚焦」等价于「saving 窗内全程同一节点聚焦」。
 * 须先于创建笔记安装：创建写自身的落库窗（N6 的 R3 面）也在表里。
 */
function installNoteProbeInPage(): void {
  type ProbeApi = { state: NoteProbeState; type(ta: HTMLTextAreaElement, text: string): boolean }
  const g = window as unknown as { __e13NoteProbe?: ProbeApi }
  const isEditor = (n: Node): n is HTMLTextAreaElement =>
    n instanceof HTMLTextAreaElement && n.classList.contains('tl-note-input')
  const spinnerOn = (): boolean => document.querySelector('[data-testid="lineage-save-btn"] .spinner') !== null
  if (document.querySelector('[data-testid="lineage-save-btn"]') === null) {
    throw new Error('保存钮不在场——探针没有 saving 观测锚')
  }
  const state: NoteProbeState = { commits: [], focus: [], typedAt: null, typedMount: 0 }
  let saving = spinnerOn()
  let mount = 0
  let cur: HTMLTextAreaElement | null = null
  let gone = false // 当前编辑器节点已离树
  const present = (): boolean => cur !== null && !gone
  const take = (ta: HTMLTextAreaElement): void => {
    cur = ta
    gone = false
    mount += 1
    const id = mount
    ta.setAttribute('data-e13-mount', String(id)) // 测试属性：节点身份在 DOM 可见
    for (const k of ['blur', 'focus'] as const) {
      ta.addEventListener(k, () => state.focus.push({ t: performance.now(), k, m: id }))
    }
  }
  new MutationObserver((records) => {
    let rem = 0
    let add = 0
    for (const r of records) {
      for (const n of r.removedNodes) {
        if (present() && (n === cur || (n instanceof Element && n.contains(cur)))) {
          gone = true
          rem += 1
        }
      }
      for (const n of r.addedNodes) {
        // 两种挂载形态：既有笔记内 textarea↔正文互换（直接挂载）；创建时随整段 .tl-note 子树插入（随祖先挂载）
        if (isEditor(n)) {
          take(n)
          add += 1
        } else if (n instanceof Element) {
          for (const ta of n.querySelectorAll<HTMLTextAreaElement>('textarea.tl-note-input')) {
            take(ta)
            add += 1
          }
        }
      }
    }
    if (cur !== null && !gone && !cur.isConnected) {
      gone = true // 随祖先整段卸载（记录里没有直接移除项）
      rem += 1
    }
    const on = spinnerOn()
    const edge = on === saving ? null : on ? 'on' : 'off'
    saving = on
    state.commits.push({
      t: performance.now(),
      on,
      edge,
      m: present() ? mount : 0,
      f: present() && document.activeElement === cur,
      rem,
      add
    })
  }).observe(document.body, { childList: true, subtree: true })
  g.__e13NoteProbe = {
    state,
    type(ta, text) {
      // 前置守卫：目标＝在场编辑器且持有焦点（N5 断言的是「聚焦中的编辑器跨自身 saving 窗不失焦」）
      if (!present() || ta !== cur || document.activeElement !== ta) return false
      const setValue = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set
      if (setValue === undefined) throw new Error('textarea value setter 缺席')
      state.typedAt = performance.now()
      state.typedMount = mount
      setValue.call(ta, text) // 原生 value setter＋input 事件＝React onChange 消费面
      ta.dispatchEvent(new Event('input', { bubbles: true }))
      return true
    }
  }
}

const installNoteProbe = (win: Page): Promise<void> => win.evaluate(installNoteProbeInPage)

/** 探针表快照 */
const probeState = (win: Page): Promise<NoteProbeState> =>
  win.evaluate(() => {
    const probe = (window as unknown as { __e13NoteProbe?: { state: NoteProbeState } }).__e13NoteProbe
    if (probe === undefined) throw new Error('探针未安装')
    return probe.state
  })

/**
 * 程序化输入正文（写入时刻记入探针——其后的 saving 窗都属自身 idle 提交段）。
 * false＝目标不是在场且聚焦的编辑器，未写入。
 */
const typeInEditor = (win: Page, text: string): Promise<boolean> =>
  win.locator('textarea.tl-note-input').evaluate((el, value) => {
    const probe = (window as unknown as { __e13NoteProbe?: { type(ta: HTMLTextAreaElement, text: string): boolean } }).__e13NoteProbe
    if (probe === undefined) throw new Error('探针未安装')
    return probe.type(el as HTMLTextAreaElement, value)
  }, text)

/**
 * 真实点击聚焦编辑器后输入。慢机上创建写可能先于输入落库：它的 saving 窗按 R3 让位重挂编辑器（焦点
 * 随之丢失），点击与输入之间撞上这一窗时输入落空——重点一次即落在回挂节点上，此后再无在途计时器。
 */
async function focusAndType(win: Page, text: string): Promise<void> {
  for (let attempt = 1; attempt <= 3; attempt++) {
    await win.locator('textarea.tl-note-input').click()
    if (await typeInEditor(win, text)) return
  }
  throw new Error('编辑器三次点击聚焦后输入仍落空')
}

/** 在场编辑器现状：挂载序号（测试属性）＋是否持有焦点 */
const editorLive = (win: Page): Promise<{ mount: string | null; focused: boolean } | null> =>
  win.evaluate(() => {
    const ta = document.querySelector('textarea.tl-note-input')
    return ta === null ? null : { mount: ta.getAttribute('data-e13-mount'), focused: document.activeElement === ta }
  })

/** typedAt 起（含）的提交行＝自身 idle 提交段（尚未输入＝空段） */
const ownCommits = (s: NoteProbeState): NoteProbeCommit[] =>
  s.commits.filter((c) => c.t >= (s.typedAt ?? Number.POSITIVE_INFINITY))

/**
 * 自身 saving 窗判据（N5）：已闭合的窗≥closedWindows；段内每个提交后在场编辑器都是输入时的那个
 * textarea 节点，saving 在场的每个提交后它都聚焦；全程零卸载、零重挂、零 blur；现状＝同一节点在场
 * 且聚焦。失败消息带完整探针表。
 */
async function expectEditorHeld(win: Page, closedWindows: number): Promise<void> {
  const closed = async (): Promise<number> => ownCommits(await probeState(win)).filter((c) => c.edge === 'off').length
  await expect.poll(closed, { timeout: 10_000 }).toBeGreaterThanOrEqual(closedWindows)
  const s = await probeState(win)
  const own = ownCommits(s)
  const table = JSON.stringify(s)
  expect(
    own.filter((c) => c.edge === 'on').length,
    `观察到自身 idle 提交的 saving 窗（spinner 出现）≥${closedWindows}——探针表 ${table}`
  ).toBeGreaterThanOrEqual(closedWindows)
  expect(
    own.reduce((sum, c) => sum + c.rem, 0),
    `saving 窗内 textarea 未被移除（同一 DOM 节点）——探针表 ${table}`
  ).toBe(0)
  expect(own.reduce((sum, c) => sum + c.add, 0), `无卸载后重挂——探针表 ${table}`).toBe(0)
  for (const c of own) {
    expect(c.m, `提交后在场编辑器＝输入时节点（t=${c.t}）——探针表 ${table}`).toBe(s.typedMount)
  }
  for (const c of own.filter((x) => x.on)) {
    expect(c.f, `saving 在场的提交后焦点在编辑器（t=${c.t}）——探针表 ${table}`).toBe(true)
  }
  expect(
    s.focus.filter((e) => e.k === 'blur' && e.t >= (s.typedAt ?? 0)),
    `不失焦（自身 idle 提交段零 blur 事件）——探针表 ${table}`
  ).toHaveLength(0)
  const live = await editorLive(win)
  expect(live, `现状：同一节点在场且聚焦——探针表 ${table}`).toEqual({ mount: String(s.typedMount), focused: true })
}

/**
 * 首个 saving 窗的 R3 判据摘要（N6）。窗＝开启提交到闭合提交（含两端）：
 * 窗前最后一个提交后编辑器在场且聚焦→开启提交把它卸载（让位与 saving 同一次提交）→窗闭合→
 * 其后在场的是新挂载的节点。
 */
interface FirstWindowVerdict {
  focusedBeforeWindow: boolean
  editorBeforeWindow: number
  /** 开启提交内卸载的编辑器节点数／提交后在场的编辑器序号（0＝无） */
  removedAtOpen: number
  editorAtOpen: number
  removedInWindow: number
  windowClosed: boolean
  /** 窗闭合及其后第一个有编辑器在场的提交里的挂载序号（0＝始终无编辑器） */
  remountMount: number
}
function firstWindowVerdict(s: NoteProbeState): FirstWindowVerdict | null {
  const open = s.commits.findIndex((c) => c.edge === 'on')
  const openRow = s.commits[open]
  if (open < 0 || openRow === undefined) return null
  const before = s.commits[open - 1]
  const close = s.commits.findIndex((c, i) => i > open && c.edge === 'off')
  const inWindow = s.commits.slice(open, close < 0 ? undefined : close + 1)
  const remount = close < 0 ? undefined : s.commits.slice(close).find((c) => c.m > 0)
  return {
    // 聚焦效应在创建提交的被动效应里执行：先于探针回调则记在 before.f，晚于则落焦点事件表——两处取或
    focusedBeforeWindow:
      before !== undefined &&
      (before.f || s.focus.some((e) => e.k === 'focus' && e.t >= before.t && e.t < openRow.t)),
    editorBeforeWindow: before?.m ?? 0,
    removedAtOpen: openRow.rem,
    editorAtOpen: openRow.m,
    removedInWindow: inWindow.reduce((sum, c) => sum + c.rem, 0),
    windowClosed: close >= 0,
    remountMount: remount?.m ?? 0
  }
}

test.describe('悬浮笔记冒烟 e2e（F-VISFB-63——创建/拖动/删除全链真浏览器）', () => {
  test('N1 右键空白创建→输入真文本→blur 收口→保存→reload 仍在', async () => {
    const userData = await freshDir()
    const app = await launch(userData)
    const win = await app.firstWindow()
    await expect(win.getByRole('button', { name: '文献库' })).toBeVisible({ timeout: 20_000 })
    await win.getByRole('button', { name: '脉络', exact: true }).click()
    await enterEditSelect(win)
    await createNoteTyping(win, '悬浮笔记正文甲')
    await clickBlank(win)
    await expect(win.locator('.tl-note-text')).toHaveText('悬浮笔记正文甲')
    // [S6] 皮肤渲染锚：.tl-note 面板底 token 生效（computed 非透明）
    const noteBg = await win.locator('.tl-note').evaluate((el) => getComputedStyle(el).backgroundColor)
    expect(noteBg).not.toBe('rgba(0, 0, 0, 0)')
    await expect(win.getByTestId('lineage-save-btn')).toBeEnabled({ timeout: 10_000 })
    await win.getByTestId('lineage-save-btn').click()
    await expect(win.getByTestId('lineage-save-btn')).toBeDisabled({ timeout: 10_000 })
    await reloadToLineage(win)
    await expect(win.locator('.tl-note-text')).toHaveText('悬浮笔记正文甲')
    await app.close()
  })

  test('N2 书签柄拖动位移（非 1 缩放真实换算）→保存→reload 位置持久', async () => {
    const userData = await freshDir()
    const app = await launch(userData)
    const win = await app.firstWindow()
    await expect(win.getByRole('button', { name: '文献库' })).toBeVisible({ timeout: 20_000 })
    await win.getByRole('button', { name: '脉络', exact: true }).click()
    await enterEditSelect(win)
    await createNoteTyping(win, '拖动笔记正文')
    await clickBlank(win)
    const note = win.locator('.tl-note')
    const before = await note.evaluate((el) => ({ left: el.style.left, top: el.style.top }))
    // [R2] ctrl+滚轮缩放三档（步 10%：1.0→1.3——deltaY<0=zoom in，zoom-hook :42）
    const timeline = win.locator('.timeline')
    const tb = await timeline.boundingBox()
    if (tb === null) throw new Error('滚动容器不可见')
    await win.mouse.move(tb.x + 40, tb.y + 40)
    await win.keyboard.down('Control')
    await win.mouse.wheel(0, -100)
    await win.mouse.wheel(0, -100)
    await win.mouse.wheel(0, -100)
    await win.keyboard.up('Control')
    // 实测有效缩放（rect.width/offsetWidth=z×uiScale——runtime 无需拆分两因子）
    const sEff = await win.locator('.tl-content').evaluate((el) => {
      const rect = el.getBoundingClientRect()
      return rect.width / (el as HTMLElement).offsetWidth
    })
    expect(sEff).toBeGreaterThan(1.05)
    const grip = win.locator('.tl-note-grip')
    // F-CIFLK-01 CI 窄视口先例：缩放后再锚定（几何随 z 变——scrollIntoView 于终态）
    await grip.evaluate((el) => el.scrollIntoView({ block: 'center' }))
    const gb = await grip.boundingBox()
    if (gb === null) throw new Error('书签柄不可见')
    // 向左上拖（创建点钳在右下角——右下方向会被内容域钳回同值=零位移）
    await win.mouse.move(gb.x + gb.width / 2, gb.y + gb.height / 2)
    await win.mouse.down()
    await win.mouse.move(gb.x + gb.width / 2 - 60, gb.y + gb.height / 2 - 40, { steps: 6 })
    await win.mouse.up()
    const after = await note.evaluate((el) => ({ left: el.style.left, top: el.style.top }))
    // own 域位移=clientΔ/s_eff（clientToOwnPt 单源换算——漏除/错乘必红）
    const dLeft = Number.parseFloat(after.left) - Number.parseFloat(before.left)
    const dTop = Number.parseFloat(after.top) - Number.parseFloat(before.top)
    expect(Math.abs(dLeft - -60 / sEff)).toBeLessThan(3)
    expect(Math.abs(dTop - -40 / sEff)).toBeLessThan(3)
    await expect(win.getByTestId('lineage-save-btn')).toBeEnabled({ timeout: 10_000 })
    await win.getByTestId('lineage-save-btn').click()
    await expect(win.getByTestId('lineage-save-btn')).toBeDisabled({ timeout: 10_000 })
    await reloadToLineage(win)
    const persisted = await win.locator('.tl-note').evaluate((el) => ({ left: el.style.left, top: el.style.top }))
    expect(persisted).toEqual(after)
    await expect(win.locator('.tl-note-text')).toHaveText('拖动笔记正文')
    await app.close()
  })

  test('N3 编辑不 blur 切换往返草稿保留→右键删除→保存→reload 后无', async () => {
    const userData = await freshDir()
    const app = await launch(userData)
    const win = await app.firstWindow()
    await expect(win.getByRole('button', { name: '文献库' })).toBeVisible({ timeout: 20_000 })
    await win.getByRole('button', { name: '脉络', exact: true }).click()
    await enterEditSelect(win)
    await createNoteTyping(win, '切换收口草稿')
    // 编辑不 blur：rail 切走再切回（F-VISFB-63 fire-first/blur 两径收敛——草稿不丢；
    // 进页缺省 browse〔resetForMount P-1〕——回切后经产品路径再进 edit 态保存）
    await win.getByRole('button', { name: '文献库' }).click()
    await win.getByRole('button', { name: '脉络', exact: true }).click()
    await expect(win.locator('.tl-note-text')).toHaveText('切换收口草稿')
    await win.getByTestId('lineage-mode-edit').click()
    await win.getByTestId('lineage-tool-select').click()
    await expect(win.getByTestId('lineage-save-btn')).toBeEnabled({ timeout: 10_000 })
    await win.getByTestId('lineage-save-btn').click()
    await expect(win.getByTestId('lineage-save-btn')).toBeDisabled({ timeout: 10_000 })
    await reloadToLineage(win)
    await expect(win.locator('.tl-note-text')).toHaveText('切换收口草稿')
    // 删除链：回编辑态→笔记右键「删除笔记」→消失→保存→reload 后无
    await enterEditSelect(win)
    await win.locator('.tl-note').click({ button: 'right' })
    const menu = win.getByTestId('note-anchor-menu')
    await expect(menu).toBeVisible({ timeout: 5_000 })
    await menu.getByRole('menuitem', { name: '删除笔记' }).click()
    await expect(win.locator('.tl-note')).toHaveCount(0)
    await expect(win.getByTestId('lineage-save-btn')).toBeEnabled({ timeout: 10_000 })
    await win.getByTestId('lineage-save-btn').click()
    await expect(win.getByTestId('lineage-save-btn')).toBeDisabled({ timeout: 10_000 })
    await reloadToLineage(win)
    await expect(win.locator('.tl-note')).toHaveCount(0)
    await app.close()
  })

  test('N4 输入法合成期不落库：合成中停留 >1.5s 库内正文未变；提交合成后 1.5s 落终值', async () => {
    const userData = await freshDir()
    const app = await launch(userData)
    const win = await app.firstWindow()
    await expect(win.getByRole('button', { name: '文献库' })).toBeVisible({ timeout: 20_000 })
    await win.getByRole('button', { name: '脉络', exact: true }).click()
    await enterEditSelect(win)
    await createNoteTyping(win, 'base') // 创建即编辑态（不 blur）
    const noteContent = (): Promise<unknown> => liveDbScript(userData, 'get', 'SELECT content FROM floating_notes')
    await expect.poll(noteContent, { timeout: 10_000 }).toEqual({ content: 'base' }) // 前提：普通输入经 idle 提交落库
    // 回焦编辑器、光标移到末尾（真实点击——textarea 的 pointerdown 止于自身，mousedown 默认聚焦）
    const ta = win.locator('.tl-note-input')
    await ta.click()
    await win.keyboard.press('End')
    // 合成由 CDP 驱动（事件序 compositionstart→compositionupdate→input[isComposing=true]→…→compositionend）
    const cdp = await app.context().newCDPSession(win)
    await cdp.send('Input.imeSetComposition', { text: 'ni', selectionStart: 2, selectionEnd: 2 })
    await expect(ta).toHaveValue('baseni') // 片段显示在编辑器
    await win.waitForTimeout(2_600) // 合成中停留——跨过 idle 到期点
    expect(await noteContent(), '合成中不落库：片段不写库').toEqual({ content: 'base' })
    await expect(ta).toHaveValue('baseni') // 合成未被提交动作打断
    await cdp.send('Input.insertText', { text: '你好' }) // 提交合成
    await expect(ta).toHaveValue('base你好')
    await expect.poll(noteContent, { timeout: 10_000 }).toEqual({ content: 'base你好' }) // 提交后重新计时 1.5s 落终值
    await app.close()
  })
})

test.describe('F-KEEPOPN-01 真机闭环（B5-E13——idle 提交 saving 窗的编辑器 DOM 与焦点）', () => {
  const HEAD = '停顿前的正文'
  const TAIL = '续写正文'

  test('N5 自身 idle 提交的 saving 窗：textarea 同一 DOM 节点未被移除、全程聚焦；续写不丢；真实正文落库', async () => {
    const userData = await freshDir()
    const app = await launch(userData)
    const win = await app.firstWindow()
    await expect(win.getByRole('button', { name: '文献库' })).toBeVisible({ timeout: 20_000 })
    await win.getByRole('button', { name: '脉络', exact: true }).click()
    await enterEditSelect(win)
    await installNoteProbe(win)
    await createNote(win)
    const noteContent = (): Promise<unknown> => liveDbScript(userData, 'get', 'SELECT content FROM floating_notes')
    await focusAndType(win, HEAD) // 真实点击聚焦→输入（输入时编辑器在场且聚焦由页内守卫保证）
    await expect.poll(noteContent, { timeout: 10_000 }).toEqual({ content: HEAD }) // idle 到期提交→真实落库
    await expectEditorHeld(win, 1) // 第一段自身 saving 窗：编辑器不让位
    await win.keyboard.insertText(TAIL) // 续写走真实输入事件——焦点仍在编辑器才进得去
    await expect.poll(noteContent, { timeout: 10_000 }).toEqual({ content: HEAD + TAIL })
    await expectEditorHeld(win, 2) // 第二段：续写后的提交窗同样不让位
    await clickBlank(win) // blur 收口（正文已落库——零写单元）
    await expect(win.locator('.tl-note-text')).toHaveText(HEAD + TAIL)
    await expect(win.getByTestId('lineage-save-btn')).toBeEnabled({ timeout: 10_000 })
    await win.getByTestId('lineage-save-btn').click()
    await expect(win.getByTestId('lineage-save-btn')).toBeDisabled({ timeout: 10_000 })
    await reloadToLineage(win)
    await expect(win.locator('.tl-note-text')).toHaveText(HEAD + TAIL)
    await app.close()
  })

  test('N6 R3 负对照：其他写（创建写自身）触发的 saving 窗——编辑器照旧让位卸载、落定后回挂；回挂后真实正文落库', async () => {
    // 真机 UI 可达的「其他写」窗＝创建写自身的落库链（草稿空＝无自身 idle 提交）：草稿非空时 idle 到期恒先做
    // 自身提交（同一信号起链＝自身窗），Ctrl+S／撤销重做／鼠标交互都先收口编辑器。草稿非空的让位面（卸载后
    // 草稿保留）由 jsdom 合约测试承载（lineage-note-keepopen-commit-batch／lineage-note-idle-commit 的 R3 例）
    const userData = await freshDir()
    const app = await launch(userData)
    const win = await app.firstWindow()
    await expect(win.getByRole('button', { name: '文献库' })).toBeVisible({ timeout: 20_000 })
    await win.getByRole('button', { name: '脉络', exact: true }).click()
    await enterEditSelect(win)
    await installNoteProbe(win)
    await createNote(win) // 不输入：编辑会话已开，在途的只有创建写
    const noteContent = (): Promise<unknown> => liveDbScript(userData, 'get', 'SELECT content FROM floating_notes')
    await expect.poll(noteContent, { timeout: 10_000 }).toEqual({ content: '' }) // 创建写经 idle 落库
    const closedWindows = async (): Promise<number> =>
      (await probeState(win)).commits.filter((c) => c.edge === 'off').length
    await expect.poll(closedWindows, { timeout: 10_000 }).toBeGreaterThanOrEqual(1)
    const s = await probeState(win)
    const table = JSON.stringify(s)
    expect(firstWindowVerdict(s), `R3：其他写的 saving 窗卸载 textarea，落定后回挂新节点——探针表 ${table}`).toEqual({
      focusedBeforeWindow: true,
      editorBeforeWindow: 1,
      removedAtOpen: 1,
      editorAtOpen: 0,
      removedInWindow: 1,
      windowClosed: true,
      remountMount: 2
    })
    expect((await editorLive(win))?.mount, `回挂的编辑器在场——探针表 ${table}`).toBe('2')
    await win.locator('textarea.tl-note-input').click() // 回挂后的编辑器可用
    await win.keyboard.insertText('回挂后续写正文')
    await clickBlank(win)
    await expect(win.locator('.tl-note-text')).toHaveText('回挂后续写正文')
    await expect.poll(noteContent, { timeout: 10_000 }).toEqual({ content: '回挂后续写正文' })
    await app.close()
  })
})
