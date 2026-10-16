/**
 * [F-VISFB-43 U3] FigureExtractor 编排件单测（pdfjs-free：结构桩注入——op 流/
 * 双注册表/时钟/摘要/编码/发送全注入；生产 pdfjs 接线面=动态 import，真渲染
 * 面归 Node probe+e2e 主控窗）。蓝本=00B 接手单 §一/§三/§四。
 * 覆盖：raster 正例/矢量零提取/装饰三族过滤/双注册表异步落位轮询+超时守卫/
 * 去重（同资产多 draw 单资产·首 draw 页归属）/24 上限截断记 excess/单页失败
 * partial/per-asset 拒收聚合/4MB 守卫降采样重试/编码终超限记失败/逐资产分笔。
 * always-active（不经 guardedDescribe——K3 沿承）。
 */
import { describe, expect, it } from 'vitest'
import { extractDocFigures } from '../../../src/renderer/shared/figures/FigureExtractor'
import type { FigureDocLike, FigurePageLike, ObjsRegistry } from '../../../src/renderer/shared/figures/FigureExtractor'

/** 桩 op 码（与 pdfjs OPS 数值无关——编排件只按注入码透传） */
const OPS_STUB = { save: 11, restore: 12, transform: 13, formBegin: 14, formEnd: 15, paintImageXObject: 16 } as const

interface Harness {
  doc: FigureDocLike
  sent: { digest: string; bytes: Uint8Array; page: number; width: number; height: number }[]
  sendResults: boolean[]
  encodeCalls: { width: number; height: number; scale: number }[]
  clock: { now(): number }
  setObj(id: string, width: number, height: number, kind?: number, fill?: number): void
  setCommon(id: string, width: number, height: number): void
}

interface PageSpec {
  fns: number[]
  args: unknown[][]
  failOperatorList?: boolean
}

function buildDoc(pages: PageSpec[]): Harness {
  const clockMs = { v: 0 }
  const sent: Harness['sent'] = []
  const sendResults: boolean[] = []
  const encodeCalls: Harness['encodeCalls'] = []
  const pageStores: Map<number, { local: Map<string, unknown>; common: Map<string, unknown> }> = new Map()
  const docPages: FigurePageLike[] = pages.map((spec, idx) => {
    const store = { local: new Map<string, unknown>(), common: new Map<string, unknown>() }
    pageStores.set(idx + 1, store)
    const objs: ObjsRegistry = {
      has: (id) => store.local.has(id),
      get: (id) => store.local.get(id)
    }
    const commonObjs: ObjsRegistry = {
      has: (id) => store.common.has(id),
      get: (id) => store.common.get(id)
    }
    return {
      getOperatorList: spec.failOperatorList === true
        ? async () => {
            throw new Error('op 流不可用')
          }
        : async () => ({ fnArray: [...spec.fns], argsArray: spec.args }),
      objs,
      commonObjs
    }
  })
  const doc: FigureDocLike = {
    numPages: docPages.length,
    getPage: async (n) => {
      const page = docPages[n - 1]
      if (page === undefined) throw new Error(`页 ${String(n)} 缺席`)
      return page
    },
    destroy: async () => undefined
  }
  return {
    doc,
    sent,
    sendResults,
    encodeCalls,
    clock: { now: () => clockMs.v },
    setObj(id, width, height, kind = 2, fill = 7) {
      const store = pageStores.get(1)
      store?.local.set(id, { width, height, kind, data: new Uint8ClampedArray(width * height * (kind === 1 ? 1 : 3)).fill(fill) })
    },
    setCommon(id, width, height) {
      const store = pageStores.get(1)
      store?.common.set(id, { width, height, kind: 2, data: new Uint8ClampedArray(width * height * 3).fill(3) })
    }
  }
}

/** 单图页 op 流：transform 拉到 (w×h)pt 后 paint */
function imgOps(objId: string, ctmW: number, ctmH: number): { fns: number[]; args: unknown[][] } {
  return {
    fns: [OPS_STUB.transform, OPS_STUB.paintImageXObject],
    args: [[ctmW, 0, 0, ctmH, 10, 20], [objId]]
  }
}

function makeDeps(h: Harness, over: Partial<Parameters<typeof extractDocFigures>[1]> = {}) {
  let sendIdx = 0
  return {
    ops: OPS_STUB,
    digest: async (b: Uint8Array) => {
      let acc = 0
      for (let i = 0; i < b.length; i += 1) acc = (acc * 31 + (b[i] ?? 0)) % 0xffffffff
      return `d${String(acc)}x${String(b.length)}`
    },
    encodePng: async (width: number, height: number, _rgba: Uint8ClampedArray, scale: number) => {
      h.encodeCalls.push({ width, height, scale })
      const bytes = new Uint8Array(16)
      bytes[0] = scale * 100
      return bytes
    },
    sendAsset: async (asset: { digest: string; bytes: Uint8Array; page: number; width: number; height: number }) => {
      h.sent.push(asset)
      const ok = h.sendResults[sendIdx] ?? true
      sendIdx += 1
      return ok
    },
    sleep: async (ms: number) => {
      fakeClock.v += ms
    },
    now: () => fakeClock.v,
    pollIntervalMs: 50,
    pollTimeoutMs: 500,
    ...over
  }
}

const fakeClock = { v: 0 }

describe('[F-VISFB-43 U3] FigureExtractor 编排件', () => {
  it('raster 正例：qualifying 图→单资产发送（页/宽高/CTM 透传），摘要=最终 PNG 字节摘要', async () => {
    fakeClock.v = 0
    const spec = imgOps('img_1', 74, 50)
    const h = buildDoc([{ fns: spec.fns, args: spec.args }])
    h.setObj('img_1', 308, 209)
    const deps = makeDeps(h)
    const summary = await extractDocFigures(h.doc, deps)
    expect(summary).toEqual({ stored: 1, excess: 0, failed: 0 })
    expect(h.sent).toHaveLength(1)
    expect(h.sent[0]?.page).toBe(1)
    expect(h.sent[0]?.width).toBe(308)
    expect(h.sent[0]?.height).toBe(209)
    expect(h.sent[0]?.digest.startsWith('d')).toBe(true)
  })

  it('矢量页零提取：op 流无 paintImageXObject→零发送零失败', async () => {
    fakeClock.v = 0
    const h = buildDoc([{ fns: [OPS_STUB.transform, OPS_STUB.restore], args: [[1, 0, 0, 1, 0, 0], []] }])
    const deps = makeDeps(h)
    const summary = await extractDocFigures(h.doc, deps)
    expect(summary).toEqual({ stored: 0, excess: 0, failed: 0 })
    expect(h.sent).toHaveLength(0)
  })

  it('装饰三族过滤：方标/横幅/规则线（00B 实测尺寸）全出局', async () => {
    fakeClock.v = 0
    const h = buildDoc([
      { fns: imgOps('logo', 11, 10).fns.concat(imgOps('banner', 115, 29).fns, imgOps('rule', 132, 11).fns), args: imgOps('logo', 11, 10).args.concat(imgOps('banner', 115, 29).args, imgOps('rule', 132, 11).args) }
    ])
    h.setObj('logo', 46, 40, 1)
    h.setObj('banner', 481, 122)
    h.setObj('rule', 1100, 90, 1)
    const deps = makeDeps(h)
    const summary = await extractDocFigures(h.doc, deps)
    expect(summary).toEqual({ stored: 0, excess: 0, failed: 0 })
    expect(h.encodeCalls).toHaveLength(0)
  })

  it('commonObjs 全局注册表：页内 objs 未命中经 commonObjs 解析成功', async () => {
    fakeClock.v = 0
    const spec = imgOps('g_d4_shared', 100, 80)
    const h = buildDoc([{ fns: spec.fns, args: spec.args }])
    h.setCommon('g_d4_shared', 400, 320)
    const deps = makeDeps(h)
    const summary = await extractDocFigures(h.doc, deps)
    expect(summary.stored).toBe(1)
  })

  it('异步落位轮询：resolve 后未必就绪——前两次 has=false 后落位，轮询捕捉', async () => {
    fakeClock.v = 0
    const spec = imgOps('img_slow', 74, 50)
    const h = buildDoc([{ fns: spec.fns, args: spec.args }])
    let probes = 0
    const page = await h.doc.getPage(1)
    const origHas = page.objs.has.bind(page.objs)
    page.objs = {
      has: (id) => {
        probes += 1
        return probes > 2 && origHas(id)
      },
      get: page.objs.get.bind(page.objs)
    }
    h.setObj('img_slow', 308, 209)
    const deps = makeDeps(h)
    const summary = await extractDocFigures(h.doc, deps)
    expect(summary.stored).toBe(1)
    expect(probes).toBeGreaterThan(2)
  })

  it('轮询超时守卫：永不落位→failed 记项不空整批（timeout 后放行）', async () => {
    fakeClock.v = 0
    const spec = imgOps('img_lost', 74, 50)
    const h = buildDoc([{ fns: spec.fns, args: spec.args }])
    const deps = makeDeps(h)
    const summary = await extractDocFigures(h.doc, deps)
    expect(summary).toEqual({ stored: 0, excess: 0, failed: 1 })
    expect(fakeClock.v).toBeGreaterThanOrEqual(500)
  })

  it('去重：同解码位图跨页两 draw→单资产且归属首 draw 页', async () => {
    fakeClock.v = 0
    const s1 = imgOps('img_a', 74, 50)
    const s2 = imgOps('img_b', 74, 50)
    const h = buildDoc([
      { fns: s1.fns, args: s1.args },
      { fns: s2.fns, args: s2.args }
    ])
    const page1Store = h.doc
    void page1Store
    h.setObj('img_a', 308, 209, 2, 5)
    const page2 = await h.doc.getPage(2)
    page2.objs = {
      has: (id) => id === 'img_b',
      get: () => ({ width: 308, height: 209, kind: 2, data: new Uint8ClampedArray(308 * 209 * 3).fill(5) })
    }
    const deps = makeDeps(h)
    const summary = await extractDocFigures(h.doc, deps)
    expect(summary.stored).toBe(1)
    expect(h.sent[0]?.page).toBe(1)
  })

  it('上限 24 截断记 excess：26 独立资产→stored=24/excess=2（00B 上限语义）', async () => {
    fakeClock.v = 0
    const fns: number[] = []
    const args: unknown[][] = []
    for (let i = 0; i < 26; i += 1) {
      const spec = imgOps(`img_${String(i)}`, 74, 50)
      fns.push(...spec.fns)
      args.push(...spec.args)
    }
    const h = buildDoc([{ fns, args }])
    for (let i = 0; i < 26; i += 1) h.setObj(`img_${String(i)}`, 308 + i, 209, 2, i + 1)
    const deps = makeDeps(h)
    const summary = await extractDocFigures(h.doc, deps)
    expect(summary.stored).toBe(24)
    expect(summary.excess).toBe(2)
    expect(h.sent).toHaveLength(24)
  })

  it('单页失败 partial：page1 op 流抛错→failed=1，page2 照常提取', async () => {
    fakeClock.v = 0
    const good = imgOps('img_ok', 74, 50)
    const h = buildDoc([
      { fns: [], args: [], failOperatorList: true },
      { fns: good.fns, args: good.args }
    ])
    h.setObj('img_ok', 308, 209)
    const page2 = await h.doc.getPage(2)
    page2.objs = { has: (id) => id === 'img_ok', get: () => ({ width: 308, height: 209, kind: 2, data: new Uint8ClampedArray(308 * 209 * 3).fill(9) }) }
    const deps = makeDeps(h)
    const summary = await extractDocFigures(h.doc, deps)
    expect(summary).toEqual({ stored: 1, excess: 0, failed: 1 })
  })

  it('per-asset 拒收聚合：sendAsset=false 记 failed 不空整批（failed≠empty）', async () => {
    fakeClock.v = 0
    const a = imgOps('img_x', 74, 50)
    const b = imgOps('img_y', 80, 60)
    const h = buildDoc([{ fns: a.fns.concat(b.fns), args: a.args.concat(b.args) }])
    h.setObj('img_x', 308, 209, 2, 1)
    h.setObj('img_y', 300, 200, 2, 2)
    h.sendResults = [false, true]
    const deps = makeDeps(h)
    const summary = await extractDocFigures(h.doc, deps)
    expect(summary).toEqual({ stored: 1, excess: 0, failed: 1 })
  })

  it('4MB 守卫降采样重试：scale1 超限→0.6 再编码通过→按降采样后字节发送', async () => {
    fakeClock.v = 0
    const spec = imgOps('img_big', 74, 50)
    const h = buildDoc([{ fns: spec.fns, args: spec.args }])
    h.setObj('img_big', 2400, 1600)
    const deps = makeDeps(h)
    const big = new Uint8Array(4 * 1024 * 1024 + 10)
    deps.encodePng = async (width, height, _rgba, scale) => {
      h.encodeCalls.push({ width, height, scale })
      return scale >= 1 ? big : new Uint8Array(1024)
    }
    const summary = await extractDocFigures(h.doc, deps)
    expect(summary.stored).toBe(1)
    expect(h.encodeCalls.map((c) => c.scale)).toEqual([1, 0.6])
    expect(h.sent[0]?.bytes.byteLength).toBe(1024)
  })

  it('编码终超限记失败：多轮降采样仍超 4MB→failed++ 零发送', async () => {
    fakeClock.v = 0
    const spec = imgOps('img_huge', 74, 50)
    const h = buildDoc([{ fns: spec.fns, args: spec.args }])
    h.setObj('img_huge', 3000, 2000)
    const deps = makeDeps(h)
    deps.encodePng = async (width, height, _rgba, scale) => {
      h.encodeCalls.push({ width, height, scale })
      return new Uint8Array(4 * 1024 * 1024 + 1)
    }
    const summary = await extractDocFigures(h.doc, deps)
    expect(summary).toEqual({ stored: 0, excess: 0, failed: 1 })
    expect(h.sent).toHaveLength(0)
  })

  it('〔裁决部 P1-2〕worker ImageBitmap 传输面（无 kind/data）：bitmapToRgba 注入→转 RGBA 提取（真 worker 优化路径——00B §六差异）', async () => {
    fakeClock.v = 0
    const spec = imgOps('img_bm', 74, 50)
    const h = buildDoc([{ fns: spec.fns, args: spec.args }])
    const page = await h.doc.getPage(1)
    page.objs = {
      has: (id) => id === 'img_bm',
      get: () => ({ width: 400, height: 300 }) as unknown
    }
    const deps = makeDeps(h)
    deps.bitmapToRgba = async () => new Uint8ClampedArray(400 * 300 * 4).fill(9)
    const summary = await extractDocFigures(h.doc, deps)
    expect(summary).toEqual({ stored: 1, excess: 0, failed: 0 })
    expect(h.sent[0]?.width).toBe(400)
    expect(h.encodeCalls[0]?.scale).toBe(1)
  })

  it('〔裁决部 P1-2〕bitmap 面无转换器（deps 未注入）→per-asset 失败记项', async () => {
    fakeClock.v = 0
    const spec = imgOps('img_bm2', 74, 50)
    const h = buildDoc([{ fns: spec.fns, args: spec.args }])
    const page = await h.doc.getPage(1)
    page.objs = {
      has: (id) => id === 'img_bm2',
      get: () => ({ width: 400, height: 300 }) as unknown
    }
    const deps = makeDeps(h)
    const summary = await extractDocFigures(h.doc, deps)
    expect(summary).toEqual({ stored: 0, excess: 0, failed: 1 })
    expect(h.sent).toHaveLength(0)
  })

  it('〔回炉轮1 N-1〕编码/摘要异常 per-asset 聚合：首资产 encodePng 抛→failed=1，后续资产照常提取不中止整篇', async () => {
    fakeClock.v = 0
    const a = imgOps('img_e1', 74, 50)
    const b = imgOps('img_e2', 80, 60)
    const h = buildDoc([{ fns: a.fns.concat(b.fns), args: a.args.concat(b.args) }])
    h.setObj('img_e1', 308, 209, 2, 21)
    h.setObj('img_e2', 300, 210, 2, 22)
    const deps = makeDeps(h)
    let calls = 0
    deps.encodePng = async (width, height, _rgba, scale) => {
      h.encodeCalls.push({ width, height, scale })
      calls += 1
      if (calls === 1) throw new Error('canvas 2d context 获取失败')
      return new Uint8Array(8)
    }
    const summary = await extractDocFigures(h.doc, deps)
    expect(summary).toEqual({ stored: 1, excess: 0, failed: 1 })
  })

  it('逐资产分笔 IPC：3 独立资产→sendAsset 逐笔 3 次（序=op 流序）', async () => {
    fakeClock.v = 0
    const specs = [imgOps('s1', 74, 50), imgOps('s2', 75, 51), imgOps('s3', 76, 52)]
    const h = buildDoc([{ fns: specs.flatMap((s) => s.fns), args: specs.flatMap((s) => s.args) }])
    h.setObj('s1', 308, 209, 2, 11)
    h.setObj('s2', 309, 210, 2, 22)
    h.setObj('s3', 310, 211, 2, 33)
    const deps = makeDeps(h)
    const summary = await extractDocFigures(h.doc, deps)
    expect(summary.stored).toBe(3)
    expect(h.sent.map((s) => s.width)).toEqual([308, 309, 310])
  })
})
