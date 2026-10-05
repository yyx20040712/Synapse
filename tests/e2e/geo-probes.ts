/**
 * [F-UIRES-03 T0] e2e 几何探针 helper 族（设计稿 §8.1.3/8.1.4/8.1.2 单源——
 * F-UIRES-03 设计稿 v1.5 §8 全节）。
 *
 * ── 测量口径单源（单源边界=**三类断言**：位置邻近 expectRectNear/静止稳定
 *    expectRectStable/无瞬跳 assertNoJump 的容差与测量口径——本文件头注为其
 *    唯一定义处；用例侧其他几何断言（包含/命中/跟随类）容差不属本单源，须在
 *    断言消息或注释标依据出处）──
 * - 几何测量值 = Playwright locator.boundingBox()（与 getBoundingClientRect
 *   同源的 CSS px 盒——Chromium 布局管线；设计稿 §2 C2 DoD 原文引「按
 *   devicePixelRatio 取整」，样板①实录 385.2 带小数=取整断言失准，以「同源
 *   CSS px 盒」口径为准）。容差 tol 吸收亚像素与 DPR 残差；≥1px 的偏差即
 *   几何缺陷（INV-96 逆变换族/锚偏离/漂移域）。
 *
 * ── 双模式使用边界（§8.1.3 冻结优先）──
 * - **冻结模式（freezeAnimations）=静态中间态断言默认**：锚点几何/ghost
 *   位置/候选槽几何类断言先冻结再断——document.getAnimations() 统一 pause
 *   于当前进度（WAAPI/CSS transition 同径），确定性高于采样；Playwright
 *   animations:"disabled" 快进终态**不可用于中间态**（快进即丢中间态本体）。
 * - **采样模式（expectRectStable/frameProbe）仅连续性缺陷**：瞬跳/回弹时序
 *   类（需要帧间序列证据的缺陷面）；静止稳定性断言用 expectRectStable。
 *
 * 受锁文件（tests/**——CI sha256 对账）。
 */
import { expect, type Locator, type Page } from '@playwright/test'

/** 四维盒（width/height 可选——只断言提供的维度） */
export interface RectExpect {
  x: number
  y: number
  width?: number
  height?: number
}

/**
 * 几何邻近断言：locator.boundingBox() 与期望各维差 ≤ tol（口径=头注单源）。
 * 元素不可见（boundingBox=null）=响亮红（穷尽非静默——禁把缺位当通过）。
 */
export async function expectRectNear(locator: Locator, expected: RectExpect, tol: number): Promise<void> {
  const box = await locator.boundingBox()
  if (box === null) {
    throw new Error('expectRectNear：元素无布局盒（boundingBox=null——未渲染/不可见），断言输入不存在')
  }
  const dims: Array<['x' | 'y' | 'width' | 'height', number]> = [
    ['x', expected.x],
    ['y', expected.y]
  ]
  if (expected.width !== undefined) dims.push(['width', expected.width])
  if (expected.height !== undefined) dims.push(['height', expected.height])
  for (const [dim, want] of dims) {
    const got = box[dim]
    expect(
      Math.abs(got - want),
      `${dim} 维：实测 ${got} vs 期望 ${want}（容差 ${tol}——gBCR 同源 CSS px 口径）`
    ).toBeLessThanOrEqual(tol)
  }
}

/**
 * 静止稳定性断言：fn 采样 n 次返回值全等（JSON 可比较值——boundingBox/
 * evaluate 产出的 plain object；两次采样间不注入人为延时——静止语义=调用
 * 时点间无变化）。返回首次采样值供后续断言复用。任一次不一致=红（带次序）。
 */
export async function expectRectStable<T>(fn: () => Promise<T>, n: number): Promise<T> {
  if (n < 2) throw new Error('expectRectStable：至少 2 次采样才构成稳定性断言（n=1 静默空转=恒真面）')
  const first = await fn()
  const firstJson = JSON.stringify(first)
  for (let i = 1; i < n; i++) {
    const cur = await fn()
    expect(
      JSON.stringify(cur) === firstJson,
      `静止稳定性破坏：第 ${i + 1}/${n} 次采样与首次不一致（首次=${firstJson} 本次=${JSON.stringify(cur)}）`
    ).toBe(true)
  }
  return first
}

/**
 * 冻结模式：page.evaluate 内 document.getAnimations().forEach(a => a.pause())
 * ——WAAPI/CSSTransition 统一暂停于当前进度。返回 restore 句柄（resume 全部
 * 处于 paused 态的动画——现状页面无其他 pause 源，语义等价；嵌套冻结不适用
 * 本批；断言毕即还原，禁驻留冻结态污染后续用例段）。
 * 使用边界=头注「冻结优先」：静态中间态断言先冻结再断；连续性缺陷走采样。
 */
export async function freezeAnimations(page: Page): Promise<() => Promise<void>> {
  await page.evaluate(() => {
    for (const a of document.getAnimations()) a.pause()
  })
  return async (): Promise<void> => {
    await page.evaluate(() => {
      for (const a of document.getAnimations()) {
        if (a.playState === 'paused') a.play()
      }
    })
  }
}

/**
 * zoom 档位探针（§8.1.2——INV-96 逆变换族 e2e 面）：
 * 1. 把画布 zoom 设到 scale 档（步进 0.1、域 [0.5,2.0]）。设置机制=**Ctrl+
 *    滚轮步进**（timeline-zoom-hook：deltaY<0=+0.1，badge 角标非下拉=单动作
 *    复位钮——机制探查申报见票简报）；
 * 2. 等 .tl-content transform 稳定（badge 文本=目标百分比+computed transform
 *    =期望矩阵/复位 none——几何读数前提）；
 * 3. 执行 probeFn（用例断言体——在目标档位几何稳定态下运行）；
 * 4. 毕后复位 1.0（badge 单动作点击=resetZoom）并等稳定（同 2 口径）。
 */
export async function zoomProbe(page: Page, scale: number, probeFn: () => Promise<void>): Promise<void> {
  const steps10 = Math.round(scale * 10)
  if (Math.abs(scale * 10 - steps10) > 1e-9 || steps10 < 5 || steps10 > 20) {
    throw new Error(`zoomProbe：非法档位 ${scale}（步进 0.1、域 [0.5,2.0]）`)
  }
  const badge = page.getByTestId('zoom-badge')
  const badgeText = async (): Promise<string> => ((await badge.textContent()) ?? '').trim()
  const transform = async (): Promise<string> =>
    page.evaluate(() => {
      const ct = document.querySelector('.tl-content')
      return ct === null ? '' : getComputedStyle(ct).transform
    })
  const waitStable = async (percent: number, matrix: string): Promise<void> => {
    await expect
      .poll(badgeText, { timeout: 5_000 })
      .toBe(`${percent}% ▾`)
    await expect.poll(transform, { timeout: 5_000 }).toBe(matrix)
  }
  // 当前档读取（badge 文本=Math.round(z*100)——store 单源派生面）
  const cur = Number.parseInt(await badgeText(), 10)
  if (Number.isNaN(cur)) throw new Error(`zoomProbe：zoom-badge 文本不可解析（"${await badgeText()}"）`)
  const steps = steps10 - Math.round(cur / 10)
  if (steps !== 0) {
    const tlBox = await page.getByTestId('lineage-timeline').boundingBox()
    if (tlBox === null) throw new Error('zoomProbe：画布不可见')
    await page.mouse.move(tlBox.x + tlBox.width / 2, tlBox.y + tlBox.height / 3)
    await page.keyboard.down('Control')
    for (let i = 0; i < Math.abs(steps); i++) {
      await page.mouse.wheel(0, steps > 0 ? -120 : 120)
    }
    await page.keyboard.up('Control')
  }
  const zNum = steps10 / 10
  // z=1 档=contentStyle 空对象（transform none——100% 基线无扰动语义）；z≠1
  // 档=内联 scale(z) 的 computed 形 matrix(z,0,0,z,0,0)
  await waitStable(steps10 * 10, zNum === 1 ? 'none' : `matrix(${zNum}, 0, 0, ${zNum}, 0, 0)`)
  try {
    await probeFn()
  } finally {
    // 复位（badge 单动作点击=resetZoom→1.0——contentStyle 空对象=transform none）
    await badge.click()
    await waitStable(100, 'none')
  }
}

/**
 * 帧采样探针（§8.1.4——「清场瞬跳」类连续性缺陷可机检）：evaluate 内 rAF
 * 循环 n 帧采样元素 getBoundingClientRect 位置序列（x/y——gBCR 同源 CSS px
 * 口径同头注）。一次性仓外探针模式退役的沉淀件。
 */
export async function frameProbe(
  page: Page,
  locator: Locator,
  n: number
): Promise<Array<{ x: number; y: number }>> {
  if (n < 2) throw new Error('frameProbe：至少 2 帧才构成序列')
  const handle = await locator.elementHandle()
  if (handle === null) throw new Error('frameProbe：元素不存在（elementHandle=null）')
  try {
    return await page.evaluate(
      ({ el, frames }) =>
        new Promise<Array<{ x: number; y: number }>>((resolve) => {
          const seq: Array<{ x: number; y: number }> = []
          const tick = (): void => {
            const r = el.getBoundingClientRect()
            seq.push({ x: r.x, y: r.y })
            if (seq.length >= frames) resolve(seq)
            else requestAnimationFrame(tick)
          }
          requestAnimationFrame(tick)
        }),
      { el: handle, frames: n }
    )
  } finally {
    await handle.dispose()
  }
}

/**
 * 无瞬跳断言：帧序列相邻帧位移（欧氏距离）≤ maxStep。封「清场瞬跳」类
 * （settle/飞行/清场期元素位置跳变——采样模式专属，与冻结模式互斥使用）。
 */
export function assertNoJump(seq: Array<{ x: number; y: number }>, maxStep: number): void {
  expect(seq.length, 'assertNoJump：序列至少 2 帧').toBeGreaterThanOrEqual(2)
  for (let i = 1; i < seq.length; i++) {
    const d = Math.hypot(seq[i]!.x - seq[i - 1]!.x, seq[i]!.y - seq[i - 1]!.y)
    expect(
      d,
      `第 ${i}→${i + 1} 帧位移 ${d.toFixed(2)}px 超容差 ${maxStep}px（瞬跳面——settle/清场期连续性破坏）`
    ).toBeLessThanOrEqual(maxStep)
  }
}
