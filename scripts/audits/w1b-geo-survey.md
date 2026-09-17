# W1B 几何桩普查（unit 17 文件）


## tests/unit/renderer/lineage-viewport-scale.test.ts（2 处命中/2 窗口）

--- L9-15 ---
9	 * 传入则不自读 gBCR；缺省自读路径既有断言零变）。数字 crib
10	 * f-l2-precheck.json（Electron 真机三档实测）。jsdom 无布局——stub 手法：
11	 * per-instance Object.defineProperty(clientWidth)+原型 spyOn
12	 * (getBoundingClientRect)。fit 消费点（M3 型）jsdom 不可达（effect 在零
13	 * 尺寸下跳过）——由真机探针 f-l2-fix-verify.mjs 场景 A 锁。
14	 */
15	import { afterEach, describe, expect, it, vi } from 'vitest'

--- L23-29 ---
23	function stubMeasured(clientWidth: number, gBCRWidth: number): HTMLElement {
24	  const el = document.createElement('div')
25	  Object.defineProperty(el, 'clientWidth', { get: () => clientWidth, configurable: true })
26	  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue({
27	    x: 0,
28	    y: 0,
29	    top: 0,

## tests/unit/renderer/lineage-viewport-refit.test.tsx（1 处命中/1 窗口）

--- L58-64 ---
58	function stubGBCR(width: number, height: number) {
59	  let w = width
60	  let h = height
61	  const spy = vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (this: Element) {
62	    return { x: 0, y: 0, top: 0, left: 0, right: w, bottom: h, width: w, height: h, toJSON: () => ({}) } as DOMRect
63	  })
64	  return {

## tests/unit/renderer/scroll-converge.test.ts（3 处命中/2 窗口）

--- L6-12 ---
6	 * 覆盖：最近滚动祖先选取（含嵌套两滚动容器取最近）/start 数学（盒顶对齐）/
7	 * center 数学（居中对齐）/顶底夹取/无滚动祖先不动（INV-34 单测锚）/
8	 * 视觉-本地双空间折算（F-R2：gBCR 视觉差值除 z 后进本地 scrollTop）。
9	 * jsdom 无布局：getBoundingClientRect/scrollHeight/clientHeight 全部桩值；
10	 * scrollTop 赋值 jsdom 不做浏览器级夹取——故实现显式夹取（本文件断言锚）。
11	 * 数学正确性在此锚定；消费方（PageColumn 段⑤/anchor-locate flashElement）
12	 * 只断言 (元素, 对齐) 调用形（受锁三文件，P6 口径）；行为终审=e2e。

--- L18-27 ---
18	  scrollIntoNearestScroller
19	} from '../../../src/renderer/features/reader/scroll-converge'
20	
21	/** 桩盒几何：el 的 getBoundingClientRect 固定返回给定矩形（F-R2 回炉 1 起
22	 *  z 来自 computed zoom 桩（stubZoom），height 不再承担量纲角色）。 */
23	function stubRect(el: HTMLElement, top: number, height = 10): void {
24	  vi.spyOn(el, 'getBoundingClientRect').mockReturnValue({
25	    top, right: top + 10, bottom: top + height, left: 0, width: 10, height, x: 0, y: top,
26	    toJSON: () => ({})
27	  } as DOMRect)

## tests/unit/renderer/scroll-progress.test.tsx（2 处命中/1 窗口）

--- L366-376 ---
366	        y: top,
367	        toJSON: () => ({})
368	      }) as DOMRect
369	    vi.spyOn(el, 'getBoundingClientRect').mockReturnValue(rect(0, 100 * z))
370	    for (const c of [0, 200, 400]) {
371	      const box = document.createElement('div')
372	      box.setAttribute('data-page-box', String(c))
373	      vi.spyOn(box, 'getBoundingClientRect').mockReturnValue(rect((c - 110) * z, 100 * z))
374	      el.appendChild(box)
375	    }
376	    document.body.appendChild(el)

## tests/unit/renderer/reader-search-ui.test.tsx（9 处命中/6 窗口）

--- L5-11 ---
5	 * 覆盖：ReaderSearchBox 键位三件（Enter 提交/再按下一处/改词重提交、Shift+Enter
6	 * 上一处、Esc 关闭）+计数展示三态（searching 文案/0 命中文案/序数）+focusSeq
7	 * 聚焦全选+‹›× 三按钮；SearchHighlightLayer done 态按页过滤渲染+active 强调
8	 * 属性+几何样式（Range.getClientRects 桩——clientRects 零长面=渲染存在性与
9	 * px 样式断言，真几何归 e2e）+idle/searching 零渲染+span 数不符跳过；
10	 * ReaderToolbar slot 传/不传两态（缺席=旧占位 span 兜底）。
11	 * 形态 crib selection-mode.test.tsx（store setState 直植/mount/remount）。

--- L39-45 ---
39	  })
40	}
41	
42	/** 视口盒桩（Range.getClientRects 返回元素——toPageRelative 只读 x/y/width/height） */
43	function rect(x: number, y: number, w: number, h: number): DOMRect {
44	  return { x, y, width: w, height: h, top: y, left: x, right: x + w, bottom: y + h, toJSON: () => ({}) } as DOMRect
45	}

--- L114-123 ---
114	    cb(0)
115	    return 0
116	  })
117	  // Range 几何桩：jsdom 无 getClientRects 实现（定义注入）；真布局归 e2e——
118	  // jsdom 只断渲染存在性与 px 样式映射
119	  origClientRects = Object.getOwnPropertyDescriptor(Range.prototype, 'getClientRects')
120	  Object.defineProperty(Range.prototype, 'getClientRects', {
121	    value: vi.fn((): DOMRectList => [rect(110, 60, 40, 12)] as unknown as DOMRectList),
122	    configurable: true
123	  })

--- L138-146 ---
138	  vi.restoreAllMocks()
139	  // 门一 N4：defineProperty 桩按原 descriptor 显式还原（原无实现=删属性）
140	  if (origClientRects === undefined) {
141	    delete (Range.prototype as { getClientRects?: unknown }).getClientRects
142	  } else {
143	    Object.defineProperty(Range.prototype, 'getClientRects', origClientRects)
144	  }
145	  if (origScrollIntoView === undefined) {
146	    delete (Element.prototype as { scrollIntoView?: unknown }).scrollIntoView

--- L307-313 ---
307	    plantDone(0)
308	    const pageRoot = makePageRoot(['SMART WATER', 'x'])
309	    // 页根盒偏移桩：视口盒(110,60)−根盒(100,50)=页内相对(10,10)
310	    vi.spyOn(pageRoot.querySelector('.textLayer')!, 'getBoundingClientRect').mockReturnValue(rect(100, 50, 612, 792))
311	    mount(<SearchHighlightLayer page={0} pageRoot={pageRoot} />)
312	    const hls = host!.querySelectorAll<HTMLElement>('[data-testid="search-hl"]')
313	    expect(hls).toHaveLength(1)

--- L391-397 ---
391	    expect(hlBefore.style.left).toBe('110px')
392	    expect(hlBefore.style.width).toBe('40px')
393	    // 重排后的新视口几何（clientRects 桩换返回值）
394	    const rectsMock = (Range.prototype as unknown as { getClientRects: ReturnType<typeof vi.fn> }).getClientRects
395	    rectsMock.mockImplementation((): DOMRectList => [rect(220, 120, 80, 20)] as unknown as DOMRectList)
396	    // zoom 重渲模拟：TextLayer effect 的 container.replaceChildren()+span 重挂同型
397	    const layer = pageRoot.querySelector('.textLayer')!

[helper] L43: function rect(x: number, y: number, w: number, h: number): DOMRect {

## tests/unit/renderer/pages-overlay.test.tsx（2 处命中/2 窗口）

--- L18-24 ---
18	 *   等 prop 值，层自身行为各有测试锁；真挂会拖入 pdfjs-dist 渲染链+api/client
19	 *   顶层 window.api 赋值+双 store（reader-page-open-race 申报的 jsdom 桩面同源）。
20	 * jsdom 手工造 [data-page-root]+canvas[data-pdf-canvas] DOM 片段供
21	 * handlePageRender 量测（getBoundingClientRect 实例级覆写——jsdom 无布局）。
22	 * always-active（ADR-0017 裁决 3——新测试不经 guardedDescribe）。
23	 */
24	import { act } from 'react'

--- L114-120 ---
114	  pageRoot.setAttribute('data-page-root', String(no))
115	  const canvas = document.createElement('canvas')
116	  canvas.setAttribute('data-pdf-canvas', 'true')
117	  canvas.getBoundingClientRect = (): DOMRect =>
118	    ({ x: 0, y: 0, top: 0, left: 0, right: w, bottom: h, width: w, height: h, toJSON: () => ({}) }) as DOMRect
119	  pageRoot.appendChild(canvas)
120	  manualHost!.appendChild(pageRoot)

## tests/unit/renderer/ai-annotation-layer.test.tsx（1 处命中/1 窗口）

--- L272-278 ---
272	    boxes.set(pageRoot, { x: 0, y: 0, width: 600, height: 800 })
273	    boxes.set(textLayer, { x: 0, y: 0, width: 600, height: 800 })
274	    boxes.set(span, { x: 30, y: 200, width: 300, height: 16 })
275	    vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (this: Element) {
276	      const r = boxes.get(this)
277	      return { x: r?.x ?? 0, y: r?.y ?? 0, width: r?.width ?? 0, height: r?.height ?? 0 } as DOMRect
278	    })

## tests/unit/renderer/anchor-blank-snap.test.ts（2 处命中/1 窗口）

--- L13-21 ---
13	
14	interface Box { top: number; bottom: number; left: number; right: number }
15	
16	/** 给元素打量测桩（真浏览器 getBoundingClientRect 的 jsdom 替身） */
17	function rectOf(el: HTMLElement, b: Box): void {
18	  el.getBoundingClientRect = () =>
19	    ({ x: b.left, y: b.top, top: b.top, bottom: b.bottom, left: b.left, right: b.right, width: b.right - b.left, height: b.bottom - b.top, toJSON: () => ({}) }) as DOMRect
20	}
21	

[helper] L17: function rectOf(el: HTMLElement, b: Box): void {

## tests/unit/renderer/release-affinity.test.ts（2 处命中/1 窗口）

--- L14-22 ---
14	
15	interface Box { top: number; bottom: number; left: number; right: number }
16	
17	/** 给元素打量测桩（真浏览器 getBoundingClientRect 的 jsdom 替身——F-A10 同款） */
18	function rectOf(el: HTMLElement, b: Box): void {
19	  el.getBoundingClientRect = () =>
20	    ({ x: b.left, y: b.top, top: b.top, bottom: b.bottom, left: b.left, right: b.right, width: b.right - b.left, height: b.bottom - b.top, toJSON: () => ({}) }) as DOMRect
21	}
22	

[helper] L18: function rectOf(el: HTMLElement, b: Box): void {

## tests/unit/renderer/annotation-layer.test.tsx（1 处命中/1 窗口）

--- L133-139 ---
133	    boxes.set(page, { x: 0, y: 0, width: 600, height: 800 })
134	    boxes.set(textLayer, { x: 0, y: 0, width: 600, height: 800 })
135	    boxes.set(span, { x: 30, y: 200, width: 300, height: 16 })
136	    vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (this: Element) {
137	      const r = boxes.get(this)
138	      return { x: r?.x ?? 0, y: r?.y ?? 0, width: r?.width ?? 0, height: r?.height ?? 0 } as DOMRect
139	    })

[helper] L25: function rect(x: number, y: number, w: number, h: number): AnnotationRect {

## tests/unit/renderer/band-calibration.test.tsx（4 处命中/2 窗口）

--- L155-166 ---
155	  usePageItemsStore.getState().clear()
156	  useReaderStore.setState(createReaderStoreInitialState())
157	  ;(globalThis as unknown as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true
158	  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (this: Element) {
159	    const r = rects.get(this)
160	    return { x: r?.x ?? 0, y: r?.y ?? 0, width: r?.width ?? 0, height: r?.height ?? 0 } as DOMRect
161	  })
162	  origRangeGBCR = Range.prototype.getBoundingClientRect as () => DOMRect
163	  Range.prototype.getBoundingClientRect = () => ({ ...rangeRect }) as DOMRect
164	  window.getSelection()?.removeAllRanges()
165	})
166	

--- L171-177 ---
171	  root = null
172	  host?.remove()
173	  host = null
174	  if (origRangeGBCR !== undefined) Range.prototype.getBoundingClientRect = origRangeGBCR
175	  document.body.innerHTML = ''
176	  vi.restoreAllMocks()
177	  vi.useRealTimers()

## tests/unit/renderer/selection-evaluate.test.tsx（4 处命中/2 窗口）

--- L144-155 ---
144	  usePageItemsStore.getState().clear()
145	  useReaderStore.setState(createReaderStoreInitialState())
146	  ;(globalThis as unknown as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true
147	  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (this: Element) {
148	    const r = rects.get(this)
149	    return { x: r?.x ?? 0, y: r?.y ?? 0, width: r?.width ?? 0, height: r?.height ?? 0 } as DOMRect
150	  })
151	  origRangeGBCR = Range.prototype.getBoundingClientRect as () => DOMRect
152	  Range.prototype.getBoundingClientRect = () => ({ ...rangeRect }) as DOMRect
153	  window.getSelection()?.removeAllRanges()
154	})
155	

--- L160-166 ---
160	  root = null
161	  host?.remove()
162	  host = null
163	  if (origRangeGBCR !== undefined) Range.prototype.getBoundingClientRect = origRangeGBCR
164	  document.body.innerHTML = ''
165	  vi.restoreAllMocks()
166	  vi.useRealTimers()

## tests/unit/renderer/selection-item-chain.test.tsx（4 处命中/2 窗口）

--- L112-123 ---
112	  useReaderStore.setState(createReaderStoreInitialState())
113	  warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
114	  ;(globalThis as unknown as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true
115	  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (this: Element) {
116	    const r = rects.get(this)
117	    return { x: r?.x ?? 0, y: r?.y ?? 0, width: r?.width ?? 0, height: r?.height ?? 0 } as DOMRect
118	  })
119	  origRangeGBCR = Range.prototype.getBoundingClientRect as () => DOMRect
120	  Range.prototype.getBoundingClientRect = () => ({ ...rangeRect }) as DOMRect
121	  window.getSelection()?.removeAllRanges()
122	})
123	

--- L128-134 ---
128	  root = null
129	  host?.remove()
130	  host = null
131	  if (origRangeGBCR !== undefined) Range.prototype.getBoundingClientRect = origRangeGBCR
132	  document.body.innerHTML = ''
133	  vi.restoreAllMocks()
134	  vi.useRealTimers()

## tests/unit/renderer/selection-layer-fa12.test.tsx（6 处命中/4 窗口）

--- L24-32 ---
24	
25	interface Box { top: number; bottom: number; left: number; right: number }
26	
27	/** 打量测桩（真浏览器 getBoundingClientRect 的 jsdom 替身——直挂元素自有属性） */
28	function rectOf(el: HTMLElement, b: Box): void {
29	  el.getBoundingClientRect = () =>
30	    ({ x: b.left, y: b.top, top: b.top, bottom: b.bottom, left: b.left, right: b.right, width: b.right - b.left, height: b.bottom - b.top, toJSON: () => ({}) }) as DOMRect
31	}
32	

--- L65-71 ---
65	
66	let root: Root | null = null
67	let host: HTMLDivElement | null = null
68	/** jsdom Range 无 getBoundingClientRect 原生实现（受锁 selection-layer.test
69	 *  同款桩因）：零盒桩→evaluateCore 零宽盒守卫早退（接线断言面=selection 终态，
70	 *  evaluate 深链不在本件断言面） */
71	let origRangeGBCR: (() => DOMRect) | undefined

--- L83-90 ---
83	  vi.clearAllMocks()
84	  ;(globalThis as unknown as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true
85	  window.getSelection()?.removeAllRanges()
86	  origRangeGBCR = Range.prototype.getBoundingClientRect as (() => DOMRect) | undefined
87	  Range.prototype.getBoundingClientRect = () => ({ x: 0, y: 0, top: 0, bottom: 0, left: 0, right: 0, width: 0, height: 0, toJSON: () => ({}) }) as DOMRect
88	})
89	
90	afterEach(() => {

--- L94-100 ---
94	  root = null
95	  host?.remove()
96	  host = null
97	  if (origRangeGBCR !== undefined) Range.prototype.getBoundingClientRect = origRangeGBCR
98	  document.body.innerHTML = ''
99	  window.getSelection()?.removeAllRanges()
100	})

[helper] L28: function rectOf(el: HTMLElement, b: Box): void {

## tests/unit/renderer/selection-paint.test.tsx（8 处命中/3 窗口）

--- L16-22 ---
16	 * - c 面：定位差值÷有效 zoom（clientWidth/gBCR.width 归一）+滚动容器
17	 *   可视区夹取+选区近顶下翻转。
18	 * 形态 crib selection-layer.test.tsx（jsdom 指令/api mock/rects 桩表/
19	 * getClientRects 桩——多行夹具经 Range.getClientRects 注入）。
20	 */
21	import { act } from 'react'
22	import { createRoot, type Root } from 'react-dom/client'

--- L107-120 ---
107	  rangeRect = { x: 10, y: 900, width: 200, height: 20 }
108	  onSaved = vi.fn()
109	  ;(globalThis as unknown as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true
110	  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (this: Element) {
111	    const r = rects.get(this)
112	    return { x: r?.x ?? 0, y: r?.y ?? 0, width: r?.width ?? 0, height: r?.height ?? 0 } as DOMRect
113	  })
114	  origRangeGBCR = Range.prototype.getBoundingClientRect as () => DOMRect
115	  Range.prototype.getBoundingClientRect = () => ({ ...rangeRect }) as DOMRect
116	  origRangeGCR = Range.prototype.getClientRects as () => DOMRectList
117	  Range.prototype.getClientRects = (() => clientRects.map((r) => ({ ...r, toJSON: () => r }))) as unknown as () => DOMRectList
118	  window.getSelection()?.removeAllRanges()
119	})
120	

--- L125-132 ---
125	  root = null
126	  host?.remove()
127	  host = null
128	  if (origRangeGBCR !== undefined) Range.prototype.getBoundingClientRect = origRangeGBCR
129	  if (origRangeGCR !== undefined) Range.prototype.getClientRects = origRangeGCR
130	  document.body.innerHTML = ''
131	  vi.restoreAllMocks()
132	  vi.useRealTimers()

## tests/unit/renderer/selection-layer.test.tsx（4 处命中/2 窗口）

--- L103-114 ---
103	  rangeRect = { x: 10, y: 900, width: 200, height: 20 }
104	  onSaved = vi.fn()
105	  ;(globalThis as unknown as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true
106	  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (this: Element) {
107	    const r = rects.get(this)
108	    return { x: r?.x ?? 0, y: r?.y ?? 0, width: r?.width ?? 0, height: r?.height ?? 0 } as DOMRect
109	  })
110	  origRangeGBCR = Range.prototype.getBoundingClientRect as () => DOMRect
111	  Range.prototype.getBoundingClientRect = () => ({ ...rangeRect }) as DOMRect
112	  window.getSelection()?.removeAllRanges()
113	})
114	

--- L119-125 ---
119	  root = null
120	  host?.remove()
121	  host = null
122	  if (origRangeGBCR !== undefined) Range.prototype.getBoundingClientRect = origRangeGBCR
123	  document.body.innerHTML = ''
124	  vi.restoreAllMocks()
125	  vi.useRealTimers()

## tests/unit/renderer/lineage-canvas.test.tsx（2 处命中/1 窗口）

--- L83-92 ---
83	  return m ? { tx: Number(m[1]), ty: Number(m[2]), k: Number(m[3]) } : null
84	}
85	
86	/** 桩量测（jsdom 无布局）：Element.prototype.getBoundingClientRect 固定返回
87	 *  视口盒（selection-layer.test 同族——app 级 mock 配方先例） */
88	function stubViewportRect(width: number, height: number) {
89	  return vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (this: Element) {
90	    return { x: 0, y: 0, top: 0, left: 0, right: width, bottom: height, width, height, toJSON: () => ({}) } as DOMRect
91	  })
92	}