/**
 * [F-TESTREF-W4] e2e 稳态几何采样共享助手（INV-51 口径单源）。
 *
 * 从 reader-text.spec 内联版下沉（F-R2e 修的已验证配方，2026-09-18 随 W4
 * 收官票收敛）：新几何断言一律经本助手取值，禁各写裸 boundingBox 竞速。
 * 头注为原内联版头注的删节改写（配方代码逐字迁驻）——W-G1 备案 3.45px
 * 同族嫌疑（归属未定死）等排查细节留档 f-r2e-investigation.md §4。
 *
 * 稳态原子测量：标注块相对页面 canvas 的归一几何（x/y/w/h）。两源瞬态均能
 * 造成恰 y 轴假红（排查档 scripts/audits/f-r2e-investigation.md）：①重锚双态
 * ——AnnotationLayer 先渲染存量行盒几何（fallback），resolve 完成后跳 band
 * 收边几何（MutationObserver 实测 y 差 4.44px、正常负载窗 ~8ms）；②两次独立
 * boundingBox 调用之间的滚动落帧（注入实验 dy=Δ 线性实证）。故先双采样稳定门
 * 跨过双态瞬态，再以单 evaluate 同帧取 rect/canvas 两盒——同帧差值对滚动平移
 * 不变。断言语义=稳态「原位」（初渲染瞬态位不属断言面——内部时序非缺陷）；
 * 可见性守卫保留（零盒=display:none 形态视为未就绪，穷尽即红——门一 W-4）；
 * 穷尽未收敛=fail loudly（静默返回末值会把假红面留给瞬态——门一 B-1）。相对
 * canvas 归一消窗口几何漂移（窗口状态恢复取整差）；时长代价两程各 ≤3s
 * （门一 N-3 备案）。z-r2e-probe.spec 的 rectStableGate 刻意保持内联（探针
 * 取证语义：失败消息带末次样本——W4 票内自裁，非疏漏）。
 */
import { expect, type Page } from '@playwright/test'

export interface StableRel {
  x: number
  y: number
  w: number
  h: number
}

export async function stableRel(win: Page): Promise<StableRel> {
  const measure = (): Promise<StableRel | null> =>
    win.evaluate(() => {
      const r = document.querySelector('[data-testid="annotation-rect"]')?.getBoundingClientRect()
      const c = document.querySelector('canvas[data-pdf-canvas]')?.getBoundingClientRect()
      if (r === undefined || c === undefined) return null
      // 可见性守卫：零盒（display:none/未渲染形态）=未就绪，不当稳定值（W-4）
      if (r.width <= 0 || r.height <= 0 || c.width <= 0 || c.height <= 0) return null
      return { x: r.x - c.x, y: r.y - c.y, w: r.width, h: r.height }
    })
  // 前置观察窗（400ms＞双态基线窗 8ms×50）——双采样一致不能区分「跳变已结束」
  // 与「跳变未开始」，前置窗给 fallback→resolved 留余量（门二 W-A 加固一）
  await win.waitForTimeout(400)
  let prev = await measure()
  let streak = 0
  for (let i = 0; i < 25; i++) {
    await win.waitForTimeout(120)
    const cur = await measure()
    if (
      cur !== null && prev !== null &&
      Math.abs(cur.x - prev.x) < 0.1 && Math.abs(cur.y - prev.y) < 0.1 &&
      Math.abs(cur.w - prev.w) < 0.1 && Math.abs(cur.h - prev.h) < 0.1
    ) {
      // 连续 3 采样点（2 对相邻一致≈360ms 平台）才返回——双点一致即返回会在
      // fallback 平台提前收敛（resolve 推迟则假红通道仍开）（门二 W-A 加固二）
      streak += 1
      if (streak >= 2) {
        return cur
      }
    } else {
      streak = 0
    }
    prev = cur
  }
  expect(prev, '标注块 3s 内未出现（元素缺失或恒不可见）').not.toBeNull()
  // B-1：非收敛必须红——穷尽静默返回末值=断言输入不可靠且恰在负载态位形触发
  expect(false, '标注块几何 25 轮（3s）采样未收敛——双态瞬态/漂移超预算，断言输入不可靠').toBe(true)
  throw new Error('unreachable')
}
