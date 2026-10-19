// @vitest-environment jsdom
/**
 * [F-VISFB-66 单元三+回炉轮 1] drag-autoscroll 行为锁（§G——曲线/dt 钳/
 * suspend/scroll 监听路/zoom 屏幕基准；R1 未采样闸/R2 监听生命周期真断言/
 * R12 到界真差值+min-max 深带驻留/R27 零高守卫）。always-active。
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  AUTOSCROLL_VMAX,
  __testAutoscrollState,
  autoscrollStep,
  autoscrollStepX,
  startAutoScroll
} from '../../../src/renderer/features/lineage/drag-autoscroll'

/** 容器夹具：clientHeight=600（zone=120px）——rect top/bottom 由用例给 */
const CONTAINER_H = 600

describe('F-VISFB-66·autoscrollStep 速度曲线（§G.3 深度线性+dt 钳+R27 零高守卫）', () => {
  it('中带外=零位移（zone 边界内不滚）', () => {
    const r = autoscrollStep({ clientHeight: CONTAINER_H }, 300, 0, 600, 16)
    expect(r.scrollPx).toBe(0)
    expect(r.depthPx).toBe(0)
  })

  it('深度线性：下半带半深处 v=Vmax/2（600×0.2=120 带内 60px 深）', () => {
    const r = autoscrollStep({ clientHeight: CONTAINER_H }, 480 + 60, 0, 600, 1000)
    // depth=60（bottom zone 起 480）→v=600px/s；dt 钳 50ms→位移=600×0.05=30
    expect(r.scrollPx).toBeCloseTo((AUTOSCROLL_VMAX / 2) * 0.05, 5)
  })

  it('最深封顶=Vmax（depth≥zone 钳 zone）', () => {
    const r = autoscrollStep({ clientHeight: CONTAINER_H }, 600 + 500, 0, 600, 1000)
    expect(r.scrollPx).toBeCloseTo(AUTOSCROLL_VMAX * 0.05, 5) // dt 钳 50ms
  })

  it('浅深度缓入：带内 12px→Vmax×0.1（Word 式）', () => {
    const r = autoscrollStep({ clientHeight: CONTAINER_H }, 480 + 12, 0, 600, 1000)
    expect(r.scrollPx).toBeCloseTo(AUTOSCROLL_VMAX * 0.1 * 0.05, 5) // dt 钳 50ms
  })

  it('上带=负位移（向上滚）+dt 钳 ≤50ms（长帧不跳变）', () => {
    const r = autoscrollStep({ clientHeight: CONTAINER_H }, 30, 0, 600, 1000)
    expect(r.scrollPx).toBeLessThan(0)
    const r2 = autoscrollStep({ clientHeight: CONTAINER_H }, 30, 0, 600, 100)
    // 100ms 输入被钳 50ms：位移=半帧量
    const full = autoscrollStep({ clientHeight: CONTAINER_H }, 30, 0, 600, 50)
    expect(Math.abs(r2.scrollPx)).toBeCloseTo(Math.abs(full.scrollPx), 5)
  })

  it('zoom 屏幕基准（§G.6）：scrollTop 域=屏幕 px——深度按容器屏幕 rect 计（own 换算不在此层）', () => {
    // 容器 rect 在页面内偏移（top=200/bottom=800）：判域随容器非视口（§G.8）
    const r = autoscrollStep({ clientHeight: CONTAINER_H }, 200 + 60, 200, 800, 1000)
    expect(r.scrollPx).toBeLessThan(0) // 上带（200+120=320 界下）
    const mid = autoscrollStep({ clientHeight: CONTAINER_H }, 500, 200, 800, 16)
    expect(mid.scrollPx).toBe(0)
  })

  it('[R27] clientHeight=0→零步进（未布局守卫——zonePx 除零防线；带内光标变异判别位）', () => {
    const r = autoscrollStep({ clientHeight: 0 }, 10, 0, 600, 100)
    expect(r.scrollPx).toBe(0)
    expect(r.zonePx).toBe(0)
    // 判别位：cursor 在 rectTop 之上（带内形态）——守卫删则 0/0=NaN（MRR27 红）
    const r2 = autoscrollStep({ clientHeight: 0 }, -5, 0, 600, 100)
    expect(Number.isFinite(r2.scrollPx), '零高带内=有限零步进（除零防线）').toBe(true)
    expect(r2.scrollPx).toBe(0)
  })
})

describe('F-VISFB-66·会话机制（R1 未采样闸/R2 监听生命周期/R12 到界真差值）', () => {
  let container: HTMLElement
  let frames: number[]
  /** scrollTop 可写域模型（min 0/max maxTop——浏览器 clamp 行为镜像，R12 断言面） */
  let top: number
  const MAX_TOP = 500

  const makeContainer = (): void => {
    container = document.createElement('div')
    Object.defineProperty(container, 'clientHeight', { value: CONTAINER_H, configurable: true })
    Object.defineProperty(container, 'getBoundingClientRect', {
      value: () => ({ top: 0, bottom: 600, left: 0, right: 800, width: 800, height: 600, x: 0, y: 0, toJSON: () => ({}) }) as DOMRect,
      configurable: true
    })
    top = 0
    Object.defineProperty(container, 'scrollTop', {
      get: () => top,
      set: (v: number) => {
        top = Math.max(0, Math.min(MAX_TOP, v)) // 浏览器 clamp 镜像
      },
      configurable: true
    })
    frames = []
  }

  const makeSession = (
    cursor: { x: number; y: number } | null
  ): Parameters<typeof startAutoScroll>[0] => ({
    container,
    getCursorClient: () => (cursor === null ? null : { clientX: cursor.x, clientY: cursor.y }),
    onScrollFrame: () => frames.push(container.scrollTop)
  })

  beforeEach(makeContainer)
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('[R12] 纯 tick 推进：scrolled=真差值+onScrollFrame 观测施加后值（帧序②→③）', () => {
    const h = startAutoScroll(makeSession({ x: 100, y: 590 }), { managed: false })
    const { scrolled } = h.tick(100)
    expect(scrolled).toBe(true)
    expect(container.scrollTop).toBeGreaterThan(0)
    expect(frames.length).toBeGreaterThan(0)
    expect(frames[0]!).toBe(container.scrollTop) // 帧序：onScrollFrame 观测=施加后值
    h.stop()
  })

  it('[R12] 到界停泵（max 边界深带驻留）：scrollTop 钳 max 后真差值=0→scrolled false+零 onScrollFrame', () => {
    const h = startAutoScroll(makeSession({ x: 100, y: 590 }), { managed: false })
    // 深带驻留至到界
    for (let i = 0; i < 40 && container.scrollTop < MAX_TOP; i++) h.tick(50)
    expect(container.scrollTop).toBe(MAX_TOP) // 已到界
    frames.length = 0
    const r = h.tick(100) // 深带驻留但到界——真差值=0
    expect(r.scrolled).toBe(false)
    expect(frames).toHaveLength(0)
    h.stop()
  })

  it('[R12] min 边界（scrollTop=0 上带驻留）：不能为负——真差值=0→scrolled false', () => {
    expect(container.scrollTop).toBe(0)
    const h = startAutoScroll(makeSession({ x: 100, y: 30 }), { managed: false })
    frames.length = 0
    const r = h.tick(100)
    expect(r.scrolled).toBe(false) // 0 为底——向上无可滚
    expect(frames).toHaveLength(0)
    h.stop()
  })

  it('[R12 修正] 中带 cursor=scrolled false（原「到界停泵」构造无效——中带零位移面）', () => {
    const h = startAutoScroll(makeSession({ x: 100, y: 300 }), { managed: false })
    const { scrolled } = h.tick(100)
    expect(scrolled).toBe(false)
    expect(frames).toHaveLength(0)
    h.stop()
  })

  it('[R1] 未采样闸：getCursorClient=null（首个有效指针采样前）→tick 不施滚不调 onScrollFrame', () => {
    // 判别位前置：scrollTop 置中位——假光标 (0,0) 形态〔变异以默认值代替 null〕
    // 落上带会实滚（moved true→红）；正确闸形态恒 false 零帧
    top = 250
    const h = startAutoScroll(makeSession(null), { managed: false })
    const r1 = h.tick(100)
    const r2 = h.tick(100)
    expect(r1.scrolled).toBe(false)
    expect(r2.scrolled).toBe(false)
    expect(container.scrollTop).toBe(250) // 不动（闸面）
    expect(frames).toHaveLength(0) // 零 move 保持数帧——闸面直证（note/edge 会话同闸共用）
    h.stop()
  })

  it('suspend 阀（blur→true/focus→false）：suspended 期 tick 零滚零算；stop 幂等', () => {
    const h = startAutoScroll(makeSession({ x: 100, y: 590 }), { managed: false })
    window.dispatchEvent(new Event('blur'))
    expect(__testAutoscrollState.suspended).toBe(true)
    const before = container.scrollTop
    const r = h.tick(100)
    expect(r.scrolled).toBe(false)
    expect(container.scrollTop).toBe(before)
    window.dispatchEvent(new Event('focus'))
    expect(__testAutoscrollState.suspended).toBe(false)
    const r2 = h.tick(100)
    expect(r2.scrolled).toBe(true)
    h.stop()
    h.stop() // 幂等（句柄级 stopped 位——二次 stop 不负计数）
    expect(__testAutoscrollState.activeSessions).toBe(0)
    expect(__testAutoscrollState.listenerCount()).toBe(0)
  })

  it('[定点修 B1] 泄漏真断言：stop 后 removeEventListener 对 FRAME_EVENT 实调+容器直派零回调（真实 DOM 监听摘除直证）', () => {
    const removeSpy = vi.spyOn(container, 'removeEventListener')
    const h = startAutoScroll(makeSession({ x: 100, y: 590 }), { managed: false })
    expect(__testAutoscrollState.containerListenerCount()).toBe(1)
    h.stop()
    expect(__testAutoscrollState.containerListenerCount()).toBe(0)
    expect(__testAutoscrollState.listenerCount()).toBe(0)
    // 判别位①：removeEventListener 实调（旧形只删 Map——恒不达即红）
    const frameRemoves = removeSpy.mock.calls.filter(([t]) => t === 'synapse-autoscroll-frame')
    expect(frameRemoves).toHaveLength(1)
    // 判别位②：容器直派 FRAME_EVENT →零回调
    frames.length = 0
    container.dispatchEvent(new CustomEvent('synapse-autoscroll-frame'))
    expect(frames).toHaveLength(0)
    removeSpy.mockRestore()
  })

  it('[定点修 B1] 多轮会话监听配平：A 起→A 停→B 起→B 停——addEventListener/removeEventListener 对 FRAME_EVENT 恒配平（旧形只增不减=累积即红）', () => {
    const addSpy = vi.spyOn(container, 'addEventListener')
    const removeSpy = vi.spyOn(container, 'removeEventListener')
    const hA = startAutoScroll(makeSession({ x: 100, y: 590 }), { managed: false })
    hA.stop()
    const hB = startAutoScroll(makeSession({ x: 100, y: 590 }), { managed: false })
    expect(__testAutoscrollState.containerListenerCount()).toBe(1) // 在籍恒 1（不随轮次增长）
    hB.stop()
    const adds = addSpy.mock.calls.filter(([t]) => t === 'synapse-autoscroll-frame').length
    const removes = removeSpy.mock.calls.filter(([t]) => t === 'synapse-autoscroll-frame').length
    expect(adds).toBe(2)
    expect(removes).toBe(2) // 配平（旧形 removes=0）
    frames.length = 0
    container.dispatchEvent(new CustomEvent('synapse-autoscroll-frame'))
    expect(frames).toHaveLength(0)
    addSpy.mockRestore()
    removeSpy.mockRestore()
  })

  it('[S1] 同容器双会话独立数组+扇出：A/B 并存帧事件双达（每会话回调各自登记——旧单 listener 形只达 A 即红）', () => {
    const framesA: number[] = []
    const framesB: number[] = []
    const hA = startAutoScroll(
      { container, getCursorClient: () => ({ clientX: 100, clientY: 590 }), onScrollFrame: () => framesA.push(container.scrollTop) },
      { managed: false }
    )
    const hB = startAutoScroll(
      { container, getCursorClient: () => ({ clientX: 100, clientY: 590 }), onScrollFrame: () => framesB.push(container.scrollTop) },
      { managed: false }
    )
    window.dispatchEvent(new Event('scroll', { bubbles: true }))
    expect(framesA.length).toBeGreaterThan(0) // A 达
    expect(framesB.length).toBeGreaterThan(0) // B 达（扇出——判别位）
    hA.stop()
    hB.stop()
  })

  it('[S1] 序一 A 先停：A 零增长+B 增长（framesA/framesB 独立数组——非共写）', () => {
    const framesA: number[] = []
    const framesB: number[] = []
    const hA = startAutoScroll(
      { container, getCursorClient: () => ({ clientX: 100, clientY: 590 }), onScrollFrame: () => framesA.push(container.scrollTop) },
      { managed: false }
    )
    const hB = startAutoScroll(
      { container, getCursorClient: () => ({ clientX: 100, clientY: 590 }), onScrollFrame: () => framesB.push(container.scrollTop) },
      { managed: false }
    )
    hA.stop()
    framesA.length = 0
    framesB.length = 0
    window.dispatchEvent(new Event('scroll', { bubbles: true }))
    expect(framesA).toHaveLength(0) // A 已停——零增长
    expect(framesB.length).toBeGreaterThan(0) // B 在场——增长
    hB.stop()
  })

  it('[S1] 序二 B 先停：B 零增长+A 增长（两次序覆盖）', () => {
    const framesA: number[] = []
    const framesB: number[] = []
    const hA = startAutoScroll(
      { container, getCursorClient: () => ({ clientX: 100, clientY: 590 }), onScrollFrame: () => framesA.push(container.scrollTop) },
      { managed: false }
    )
    const hB = startAutoScroll(
      { container, getCursorClient: () => ({ clientX: 100, clientY: 590 }), onScrollFrame: () => framesB.push(container.scrollTop) },
      { managed: false }
    )
    hB.stop()
    framesA.length = 0
    framesB.length = 0
    window.dispatchEvent(new Event('scroll', { bubbles: true }))
    expect(framesB).toHaveLength(0) // B 已停——零增长
    expect(framesA.length).toBeGreaterThan(0) // A 在场——增长
    hA.stop()
  })

  it('[R2] 同容器双会话顺序复用：A 停→B 起——A 回调不残留（B 帧不触发 A 的 onScrollFrame）', () => {
    const framesA: number[] = []
    const hA = startAutoScroll(
      { container, getCursorClient: () => ({ clientX: 100, clientY: 590 }), onScrollFrame: () => framesA.push(container.scrollTop) },
      { managed: false }
    )
    hA.stop()
    const hB = startAutoScroll(makeSession({ x: 100, y: 590 }), { managed: false })
    framesA.length = 0
    window.dispatchEvent(new Event('scroll', { bubbles: true }))
    expect(framesA).toHaveLength(0) // A 已停——零回调
    expect(frames.length).toBeGreaterThan(0) // B 在场——回调达
    hB.stop()
  })

  it('[R2] 双 stop 不拆他会话监听：A/B 同容器并存——A.stop 后 B 回调仍活', () => {
    const hA = startAutoScroll(makeSession({ x: 100, y: 590 }), { managed: false })
    const hB = startAutoScroll(makeSession({ x: 100, y: 590 }), { managed: false })
    expect(__testAutoscrollState.containerListenerCount()).toBe(1) // 同容器共享一条
    expect(__testAutoscrollState.activeSessions).toBe(2)
    hA.stop()
    hA.stop() // 双 stop
    expect(__testAutoscrollState.activeSessions).toBe(1) // B 不受拆
    expect(__testAutoscrollState.containerListenerCount()).toBe(1)
    frames.length = 0
    window.dispatchEvent(new Event('scroll', { bubbles: true }))
    expect(frames.length).toBeGreaterThan(0) // B 的回调仍活
    hB.stop()
    expect(__testAutoscrollState.containerListenerCount()).toBe(0) // 末会话释放摘除
  })

  it('容器 scroll 事件路（W-06r2）：外部滚动（滚轮）→onScrollFrame 幂等触发', () => {
    const h = startAutoScroll(makeSession({ x: 100, y: 590 }), { managed: false })
    expect(frames).toHaveLength(0)
    window.dispatchEvent(new Event('scroll', { bubbles: true }))
    expect(frames.length).toBeGreaterThanOrEqual(1)
    h.stop()
  })
})

describe('F-LINEUI-01·autoscrollStepX 横轴速度曲线（autoscrollStep 横轴镜像——左/右带线性/带间零/零宽守卫/dt 钳/方向符号）', () => {
  /** 容器夹具：clientWidth=800（zone=160px）——rect left/right 由用例给 */
  const CONTAINER_W = 800

  it('带间（中带）=零位移（zone 边界内不滚）', () => {
    const r = autoscrollStepX({ clientWidth: CONTAINER_W }, 400, 0, 800, 16)
    expect(r.scrollPx).toBe(0)
    expect(r.depthPx).toBe(0)
  })

  it('右带深度线性：右带半深处 v=Vmax/2（800×0.2=160 带内 80px 深）', () => {
    const r = autoscrollStepX({ clientWidth: CONTAINER_W }, 640 + 80, 0, 800, 1000)
    // depth=80（right zone 起 640）→v=600px/s；dt 钳 50ms→位移=600×0.05=30
    expect(r.scrollPx).toBeCloseTo((AUTOSCROLL_VMAX / 2) * 0.05, 5)
  })

  it('左带=负位移（向左滚——scrollLeft 减）+深度线性镜像', () => {
    const r = autoscrollStepX({ clientWidth: CONTAINER_W }, 160 - 80, 0, 800, 1000)
    expect(r.scrollPx).toBeLessThan(0)
    expect(r.scrollPx).toBeCloseTo(-(AUTOSCROLL_VMAX / 2) * 0.05, 5)
  })

  it('最深封顶=Vmax（depth≥zone 钳 zone）', () => {
    const r = autoscrollStepX({ clientWidth: CONTAINER_W }, 800 + 500, 0, 800, 1000)
    expect(r.scrollPx).toBeCloseTo(AUTOSCROLL_VMAX * 0.05, 5) // dt 钳 50ms
  })

  it('dt 钳 ≤50ms（长帧不跳变）', () => {
    const r100 = autoscrollStepX({ clientWidth: CONTAINER_W }, 780, 0, 800, 100)
    const r50 = autoscrollStepX({ clientWidth: CONTAINER_W }, 780, 0, 800, 50)
    expect(Math.abs(r100.scrollPx)).toBeCloseTo(Math.abs(r50.scrollPx), 5)
  })

  it('[守卫] clientWidth=0→零步进（未布局守卫——zonePx 除零防线；带内变异光标位：守卫删则 0/0=NaN）', () => {
    const r = autoscrollStepX({ clientWidth: 0 }, 400, 0, 800, 100)
    expect(r.scrollPx).toBe(0)
    expect(r.zonePx).toBe(0)
    // 判别位：cursor 在 rectLeft 之左（带内形态）——守卫删则 0/0=NaN 即红
    const r2 = autoscrollStepX({ clientWidth: 0 }, -5, 0, 800, 100)
    expect(Number.isFinite(r2.scrollPx), '零宽带内=有限零步进（除零防线）').toBe(true)
    expect(r2.scrollPx).toBe(0)
  })
})

describe('F-LINEUI-01·horizontal 门控（缺省 false 零变+X 独立施滚+横轴 R12+按轴守卫）', () => {
  let container: HTMLElement
  let framesX: number[]
  /** scrollLeft/scrollTop 可写域模型（min 0/max 各 500——浏览器 clamp 行为镜像） */
  let top: number
  let left: number
  const MAX_TOP = 500
  const MAX_LEFT = 500

  /** rect 恒满幅（top/bottom=0..600，left/right=0..800）——按轴守卫用例仅靠
   *  clientHeight/clientWidth mock 分轴，坐标判域不受影响 */
  const makeContainer = (h: number, w: number): void => {
    container = document.createElement('div')
    Object.defineProperty(container, 'clientHeight', { value: h, configurable: true })
    Object.defineProperty(container, 'clientWidth', { value: w, configurable: true })
    Object.defineProperty(container, 'getBoundingClientRect', {
      value: () => ({ top: 0, bottom: 600, left: 0, right: 800, width: 800, height: 600, x: 0, y: 0, toJSON: () => ({}) }) as DOMRect,
      configurable: true
    })
    top = 0
    left = 0
    Object.defineProperty(container, 'scrollTop', {
      get: () => top,
      set: (v: number) => {
        top = Math.max(0, Math.min(MAX_TOP, v))
      },
      configurable: true
    })
    Object.defineProperty(container, 'scrollLeft', {
      get: () => left,
      set: (v: number) => {
        left = Math.max(0, Math.min(MAX_LEFT, v))
      },
      configurable: true
    })
    framesX = []
  }

  const makeSession = (
    cursor: { x: number; y: number } | null,
    opts?: { managed?: boolean; horizontal?: boolean }
  ): ReturnType<typeof startAutoScroll> =>
    startAutoScroll(
      {
        container,
        getCursorClient: () => (cursor === null ? null : { clientX: cursor.x, clientY: cursor.y }),
        onScrollFrame: () => framesX.push(container.scrollLeft)
      },
      opts
    )

  beforeEach(() => makeContainer(600, 800))
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('[缺省 false] horizontal 未传+初始 scrollLeft 非零+横带内光标→step 后 scrollLeft 不动（空转也绿的无判别形态禁用）', () => {
    makeContainer(600, 800)
    left = 200 // 判别 fixture：非零——X 恒算的实现会推进即红
    const h = makeSession({ x: 780, y: 300 }) // x=右带内（640 界外）/y=中带
    const r = h.tick(100)
    expect(r.scrolled).toBe(false) // y 中带零位移+X 未启用
    expect(container.scrollLeft).toBe(200) // 不动（门控面直证）
    expect(framesX).toHaveLength(0)
    h.stop()
  })

  it('[horizontal:true] X-only 真差：光标仅横带（纵带外）→scrolled=true+onScrollFrame 被调（横轴独立施滚触发帧协议）', () => {
    const h = makeSession({ x: 780, y: 300 }, { managed: false, horizontal: true })
    const r = h.tick(100)
    expect(r.scrolled).toBe(true)
    expect(container.scrollLeft).toBeGreaterThan(0)
    expect(container.scrollTop).toBe(0) // y 中带——纯横轴面
    expect(framesX.length).toBeGreaterThan(0)
    expect(framesX[0]!).toBe(container.scrollLeft) // 帧序：onScrollFrame 观测=施加后值
    h.stop()
  })

  it('[R12·横] scrollLeft=0 左带驻留：不能为负——真差=0→scrolled false+零 onScrollFrame', () => {
    expect(container.scrollLeft).toBe(0)
    const h = makeSession({ x: 30, y: 300 }, { managed: false, horizontal: true })
    const r = h.tick(100)
    expect(r.scrolled).toBe(false) // 0 为底——向左无可滚
    expect(framesX).toHaveLength(0)
    h.stop()
  })

  it('[R12·横] scrollLeft=max 右带驻留：钳 max 后真差=0→scrolled false+零 onScrollFrame', () => {
    left = MAX_LEFT
    const h = makeSession({ x: 780, y: 300 }, { managed: false, horizontal: true })
    const r = h.tick(100) // 深带驻留但到界——真差值=0
    expect(r.scrolled).toBe(false)
    expect(container.scrollLeft).toBe(MAX_LEFT)
    expect(framesX).toHaveLength(0)
    h.stop()
  })

  it('[左向真差] horizontal:true+左带光标+初始 scrollLeft>0→scrollLeft 减小（「仅加不减」实现在此红——d1-W3：LU-01 左回段有被原生边缘滚动掩盖风险，左向判别力由本例承载）', () => {
    left = 300
    const h = makeSession({ x: 30, y: 300 }, { managed: false, horizontal: true })
    const r = h.tick(100)
    expect(r.scrolled).toBe(true)
    expect(container.scrollLeft).toBeLessThan(300) // 左带=scrollLeft 减（负向施滚）
    expect(framesX.length).toBeGreaterThan(0) // 左向真差同样触发帧协议
    h.stop()
  })

  it('[N-5 按轴守卫] clientHeight=0+clientWidth>0+horizontal+右带→scrollLeft 推进（旧外层 clientHeight 守卫的实现在此红）', () => {
    makeContainer(0, 800) // 零高但横可滚——Y 分支守卫、X 分支照算
    const h = makeSession({ x: 780, y: 590 }, { managed: false, horizontal: true })
    const r = h.tick(100)
    expect(r.scrolled).toBe(true)
    expect(container.scrollLeft).toBeGreaterThan(0) // 横轴推进（守卫拆轴判别锁）
    expect(container.scrollTop).toBe(0) // 零高无 Y 可施
    h.stop()
  })

  it('[N-5 按轴守卫·镜像] clientWidth=0+clientHeight>0+纵带→scrollTop 推进+scrollLeft 不动（非零初值判别）', () => {
    makeContainer(600, 0)
    left = 120 // 判别初值：X 误施即红
    const h = makeSession({ x: 780, y: 590 }, { managed: false, horizontal: true })
    const r = h.tick(100)
    expect(r.scrolled).toBe(true)
    expect(container.scrollTop).toBeGreaterThan(0) // 纵轴照算（零宽不挡 Y）
    expect(container.scrollLeft).toBe(120) // 零宽守卫——X 不施
    h.stop()
  })
})
