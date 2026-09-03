# P7E-03 门一第 2 轮回炉定点复核包（最后一轮）

## 0. 任务
你（门一 Kimi）R1 复核判 PASS_WITH_WARNINGS 但新扫出 2W+3N。主控裁决第 2 轮（最后一轮）：W1-新（Enter 未 trim 比较死循环）+W2-新（IME 组合态未守卫）修；N2-新（注释诚实化）修；N1-新证伪不修（keymap.ts matches() 实为 `(b.ctrl===true)!==(ev.ctrlKey||ev.metaKey)`——文档级同收 metaKey，门一读了绑定声明未读匹配器；win32 单平台）；N3-新记档不修（全量绿=无受锁锚定面）。
定点复核：①两 W+一 N2 是否 ADDRESSED（对 §1 delta diff）；②新破坏扫描（改动面=ReaderSearchBox onKeydown 首行守卫+Enter 比较 trim+reader-search 注释+ui 测试 3 新用例）；③终裁。
基线：140 文件/1219 用例全绿（R2 后全量+分链 exit=0；定向 e2e 复跑 PASS）。

## 1. R2 delta diff（三文件——box/纯函数/测试）
```diff
diff --git a/src/renderer/features/reader/ReaderSearchBox.tsx b/src/renderer/features/reader/ReaderSearchBox.tsx
new file mode 100644
index 0000000000..d312a54387
--- /dev/null
+++ b/src/renderer/features/reader/ReaderSearchBox.tsx
@@ -0,0 +1,125 @@
+/**
+ * [P7E-03] ReaderSearchBox —— 页内搜索框（纯受控组件；props 全量注入，
+ * store 订阅在装配面 useReaderSearch）。
+ *
+ * ── 行为层 ──
+ * - 键位（票面 §①）：Enter → query.trim()!==lastSubmitted 或 state!=='done' ?
+ *   onSubmit(query) : onNext()（Chrome 式：首次回车=搜索，再回车=下一处；
+ *   [门一 R2-W1] 比较用 trim 后口径——store 侧 lastSubmitted 已 trim，未 trim
+ *   的 query 含首尾空白时会恒走 onSubmit 死循环重提交）；Shift+Enter=上一处
+ *   （同规则）；Esc=onClose；[门一 R2-W2] IME 组合态守卫（首行
+ *   isComposing——中文拼音 Enter 确认候选词/Esc 取消候选词不进搜索语义，
+ *   Enter/Esc 全守）。输入框内 Ctrl+F=本地重聚焦+全选（keymap 层 editable
+ *   避让使 document 级 Ctrl+F 不达——S12 的「面板已开再按」在焦点已驻
+ *   输入框时的等价路径，preventDefault 阻原生 find）。
+ * - 展示：计数 `${activeIndex+1}/${matchCount}`（0 命中=「0/0」+「无匹配」）；
+ *   searching 态=计数位「搜索中…」；‹ › × 三按钮（aria-label 上一个/下一个/
+ *   关闭搜索）。focusSeq 变化 → input.focus()+select()（Ctrl+F 重开聚焦全选）。
+ * - idle 态自隐（受控组件返回 null——装配面恒挂，面板开合由 state 驱动）。
+ *
+ * ── 接口层 ──
+ * - export function ReaderSearchBox(props: { state: ReaderSearchStateName;
+ *   query; lastSubmitted; matchCount; activeIndex; focusSeq;
+ *   onQueryChange(q); onSubmit(q); onPrev(); onNext(); onClose }):
+ *   JSX.Element | null
+ *
+ * ── 架构层 ── / ── 生命周期层 ── / ── 文化层 ──
+ * - 纯受控零 store 依赖（可测性）；tests/unit/renderer/reader-search-ui.test.tsx
+ */
+import { useEffect, useRef } from 'react'
+import type { KeyboardEvent } from 'react'
+import type { ReaderSearchStateName } from './reader-search.store'
+
+export function ReaderSearchBox(props: {
+  state: ReaderSearchStateName
+  query: string
+  lastSubmitted: string
+  matchCount: number
+  activeIndex: number
+  focusSeq: number
+  onQueryChange(q: string): void
+  onSubmit(q: string): void
+  onPrev(): void
+  onNext(): void
+  onClose(): void
+}): JSX.Element | null {
+  const { state, query, lastSubmitted, matchCount, activeIndex, focusSeq, onQueryChange, onSubmit, onPrev, onNext, onClose } = props
+  const inputRef = useRef<HTMLInputElement>(null)
+
+  // focusSeq 变化（open()/Ctrl+F 再按）→ 聚焦+全选（S1/S12）
+  useEffect(() => {
+    inputRef.current?.focus()
+    inputRef.current?.select()
+  }, [focusSeq])
+
+  if (state === 'idle') return null
+
+  const onKeydown = (e: KeyboardEvent<HTMLInputElement>): void => {
+    // [门一 R2-W2] IME 组合态守卫：拼音 Enter 确认候选/Esc 取消候选——不进搜索语义
+    if (e.nativeEvent.isComposing) return
+    if (e.key === 'Escape') {
+      e.preventDefault()
+      onClose()
+      return
+    }
+    // 面板内 Ctrl+F：keymap 层 editable 避让不达——本地等价（重聚焦+全选）
+    if (e.key.toLowerCase() === 'f' && (e.ctrlKey || e.metaKey)) {
+      e.preventDefault()
+      inputRef.current?.select()
+      return
+    }
+    if (e.key === 'Enter') {
+      e.preventDefault()
+      // [门一 R2-W1] trim 口径一致：store 侧 lastSubmitted 已 trim（未 trim 比较
+      // 会让含首尾空白的查询在 done 后每次 Enter 恒重提交）
+      if (query.trim() !== lastSubmitted || state !== 'done') {
+        onSubmit(query)
+        return
+      }
+      if (e.shiftKey) {
+        onPrev()
+        return
+      }
+      onNext()
+    }
+  }
+
+  const countText = state === 'searching' ? '搜索中…' : matchCount === 0 ? '0/0' : `${activeIndex + 1}/${matchCount}`
+  const btn = 'syn-btn-ghost rounded border px-1.5 py-0.5 text-xs'
+
+  return (
+    <div
+      data-testid="reader-search-box"
+      className="ml-auto flex items-center gap-1 rounded border px-2 py-0.5"
+      style={{ borderColor: 'var(--border)' }}
+    >
+      <input
+        ref={inputRef}
+        data-testid="reader-search-input"
+        className="w-32 rounded px-1 text-xs outline-none"
+        style={{ borderColor: 'var(--border)', background: 'var(--panel)', color: 'var(--text)' }}
+        aria-label="页内搜索"
+        value={query}
+        onChange={(e) => onQueryChange(e.target.value)}
+        onKeyDown={onKeydown}
+      />
+      <span data-testid="reader-search-count" className="rdr-num text-xs" style={{ color: 'var(--text-dim)' }}>
+        {countText}
+      </span>
+      {state === 'done' && matchCount === 0 ? (
+        <span className="text-xs" style={{ color: 'var(--text-dim)' }}>
+          无匹配
+        </span>
+      ) : null}
+      <button type="button" className={btn} aria-label="上一个" onClick={onPrev}>
+        ‹
+      </button>
+      <button type="button" className={btn} aria-label="下一个" onClick={onNext}>
+        ›
+      </button>
+      <button type="button" className={btn} aria-label="关闭搜索" onClick={onClose}>
+        ×
+      </button>
+    </div>
+  )
+}
diff --git a/src/renderer/features/reader/reader-search.ts b/src/renderer/features/reader/reader-search.ts
new file mode 100644
index 0000000000..d741151b42
--- /dev/null
+++ b/src/renderer/features/reader/reader-search.ts
@@ -0,0 +1,162 @@
+/**
+ * [P7E-03] reader-search —— 页内高亮搜索纯函数域（文本域索引+DOM 域几何映射）。
+ *
+ * ── 行为层 ──
+ * - Design 裁决（票面 §①）：搜索索引=逐页 getTextContent 文本项拼接（全文档
+ *   覆盖——未渲染页也可计数与跳转）；匹配矩形=渲染窗口内页的 TextLayer DOM
+ *   span 上建 Range 取 clientRects（pdfjs 自己排版精确，item→span 索引 1:1
+ *   按 DOM 序——pdfjs 4.10 每文本项恰一 span，TextLayer#appendText 实证）。
+ * - buildPageText：拼接 items.str；hasEOL 项后插 '\n'（防跨行假匹配——
+ *   findInText 拒含 '\n' 的段）；map=逐字符 → {itemIndex, offsetInItem}，
+ *   换行位为哨兵 {itemIndex:-1, offsetInItem:-1}（map 与 text 同长，text
+ *   下标可直接查 map；哨兵永不入 itemRanges——含 '\n' 的段已被拒）。
+ *   [门一 N2/R2-N2] 索引文本=逐项安全降小写（保长者才用降值）；非保长项
+ *   （İ→i̇ 双码元类）在查询侧恒降小写下永不命中——非保长语料不可搜，已知
+ *   边界（不加回退匹配逻辑——成本不值）。
+ * - findInText：大小写不敏感（[门一 N2] 只降 query——索引侧已安全降值）；
+ *   多命中不重叠推进（Chrome 同款）；空串/纯空白查询=空结果（调用方拒的
+ *   双保险）。
+ * - asSearchDoc：unknown→结构收窄（ReaderPage 持 pdfDoc 为 unknown）。
+ * - toPageRelative：视口盒−根盒=页内相对像素（高亮块绝对定位输入）。
+ * - spansForItems：.textLayer span 按序映射；数量不符→null（防御：该页
+ *   不高亮只计数——pdfjs 4.10 契约破坏时的降级路径）。
+ *
+ * ── 接口层 ──
+ * - PdfTextItem 类型消费循「类型再导出单源」惯例（import type 自
+ *   PdfPageCanvas——INV-16 白名单外禁 pdfjs-dist 直 import）。
+ *
+ * ── 架构层 ── / ── 生命周期层 ── / ── 文化层 ──
+ * - 零 DOM 副作用纯函数（spansForItems 只读查询）；已知边界（票面 §④）：
+ *   跨行匹配=行盒原样、RTL/竖排按 ltr、whitespace 不归一。
+ */
+import type { PdfTextItem } from './PdfPageCanvas'
+
+/** 字符映射项：text 下标 → 所属文本项与项内偏移；-1/-1=换行哨兵 */
+export interface CharMapEntry {
+  itemIndex: number
+  offsetInItem: number
+}
+
+/** 页文本模型：拼接文本+逐字符映射（map 与 text 同长） */
+export interface PageText {
+  text: string
+  map: CharMapEntry[]
+}
+
+/** 单命中：文本域区间+按 item 归组的区间集（DOM Range 构建输入） */
+export interface SearchItemRange {
+  itemIndex: number
+  s0: number
+  s1: number
+}
+
+export interface SearchHit {
+  start: number
+  end: number
+  itemRanges: SearchItemRange[]
+}
+
+/** 结构收窄后的搜索文档（numPages 正整数+getPage 函数） */
+export interface SearchDoc {
+  numPages: number
+  getPage(n: number): Promise<{ getTextContent(): Promise<{ items: unknown }> }>
+}
+
+/** 拼接页文本：hasEOL 项后插 '\n'，map 逐字符登记（换行位哨兵 -1/-1）。
+ *  [门一 N2] 索引文本=逐项安全降小写（toLowerCase 保长者才用降值——保长则
+ *  map 偏移对原文 DOM span 同样有效）；非保长项（İ→i̇ 双码元类）用原 str，
+ *  该类项在查询侧恒降小写下永不命中——非保长语料不可搜，已知边界
+ *  （findInText 只降 query；如此防降小写非保长展开造成的 map/DOM 偏移
+ *  错位，不加回退匹配逻辑——成本不值）。 */
+export function buildPageText(items: readonly PdfTextItem[]): PageText {
+  let text = ''
+  const map: CharMapEntry[] = []
+  for (let itemIndex = 0; itemIndex < items.length; itemIndex += 1) {
+    const it = items[itemIndex]
+    if (it === undefined) continue
+    const lowered = it.str.toLowerCase()
+    const indexed = lowered.length === it.str.length ? lowered : it.str
+    for (let k = 0; k < indexed.length; k += 1) {
+      map.push({ itemIndex, offsetInItem: k })
+    }
+    text += indexed
+    if (it.hasEOL) {
+      text += '\n'
+      map.push({ itemIndex: -1, offsetInItem: -1 })
+    }
+  }
+  return { text, map }
+}
+
+/** text 区间 [s,e) → 按 item 归组的区间集（哨兵跳过；连续同项字符合并） */
+function rangesFromMap(map: readonly CharMapEntry[], s: number, e: number): SearchItemRange[] {
+  const out: SearchItemRange[] = []
+  for (let i = s; i < e; i += 1) {
+    const entry = map[i]
+    if (entry === undefined) continue
+    const { itemIndex, offsetInItem } = entry
+    if (itemIndex < 0) continue
+    const last = out[out.length - 1]
+    if (last !== undefined && last.itemIndex === itemIndex && last.s1 === offsetInItem) {
+      last.s1 = offsetInItem + 1
+    } else {
+      out.push({ itemIndex, s0: offsetInItem, s1: offsetInItem + 1 })
+    }
+  }
+  return out
+}
+
+/** 页内查找：大小写不敏感（[门一 N2] 只降 query——索引侧已安全降值）；
+ *  多命中不重叠推进；跨 '\n' 不命中；空/纯空白=空结果 */
+export function findInText(page: PageText, query: string): SearchHit[] {
+  const q = query.toLowerCase()
+  if (q.trim() === '') return []
+  const hay = page.text
+  const hits: SearchHit[] = []
+  let from = 0
+  for (;;) {
+    const idx = hay.indexOf(q, from)
+    if (idx < 0) break
+    from = idx + q.length
+    if (page.text.slice(idx, idx + q.length).includes('\n')) continue
+    hits.push({ start: idx, end: idx + q.length, itemRanges: rangesFromMap(page.map, idx, idx + q.length) })
+  }
+  return hits
+}
+
+/** unknown→SearchDoc 结构收窄（ReaderPage 持 pdfDoc 为 unknown；不符=null） */
+export function asSearchDoc(v: unknown): SearchDoc | null {
+  if (typeof v !== 'object' || v === null) return null
+  const w = v as { numPages?: unknown; getPage?: unknown }
+  if (typeof w.numPages !== 'number' || !Number.isInteger(w.numPages) || w.numPages <= 0) return null
+  if (typeof w.getPage !== 'function') return null
+  return v as SearchDoc
+}
+
+/** raw items → PdfTextItem[]：过滤无 str 的结构项（PdfPageCanvas 同款防御——
+ *  includeMarkedContent 默认关闭，此处兜底防结构项混入破坏 item→span 映射） */
+export function toTextItems(raw: unknown): PdfTextItem[] {
+  if (!Array.isArray(raw)) return []
+  return raw.filter((it): it is PdfTextItem => typeof (it as { str?: unknown })?.str === 'string')
+}
+
+/** 视口盒→根盒相对像素（高亮块绝对定位输入；w/h 原样透传） */
+export function toPageRelative(clientRect: DOMRect, rootRect: DOMRect): { x: number; y: number; w: number; h: number } {
+  return {
+    x: clientRect.x - rootRect.x,
+    y: clientRect.y - rootRect.y,
+    w: clientRect.width,
+    h: clientRect.height
+  }
+}
+
+/** .textLayer span 按序映射：数量与 itemCount 一致→span 数组；不符→null
+ *  （防御：该页不高亮只计数——items 与 TextLayer span 严格同序同数是 pdfjs
+ *  4.10 契约，破坏即降级） */
+export function spansForItems(pageRoot: HTMLElement, itemCount: number): (HTMLSpanElement | null)[] | null {
+  const textLayer = pageRoot.querySelector('.textLayer')
+  if (textLayer === null) return null
+  const spans = Array.from(textLayer.querySelectorAll('span'))
+  if (spans.length !== itemCount) return null
+  return spans as HTMLSpanElement[]
+}
diff --git a/tests/unit/renderer/reader-search-ui.test.tsx b/tests/unit/renderer/reader-search-ui.test.tsx
new file mode 100644
index 0000000000..c431a54b27
--- /dev/null
+++ b/tests/unit/renderer/reader-search-ui.test.tsx
@@ -0,0 +1,450 @@
+// @vitest-environment jsdom
+/**
+ * [P7E-03] 页内高亮搜索 —— UI 面（锁定合约，always-active）。
+ *
+ * 覆盖：ReaderSearchBox 键位三件（Enter 提交/再按下一处/改词重提交、Shift+Enter
+ * 上一处、Esc 关闭）+计数展示三态（searching 文案/0 命中文案/序数）+focusSeq
+ * 聚焦全选+‹›× 三按钮；SearchHighlightLayer done 态按页过滤渲染+active 强调
+ * 属性+几何样式（Range.getClientRects 桩——clientRects 零长面=渲染存在性与
+ * px 样式断言，真几何归 e2e）+idle/searching 零渲染+span 数不符跳过；
+ * ReaderToolbar slot 传/不传两态（缺席=旧占位 span 兜底）。
+ * 形态 crib selection-mode.test.tsx（store setState 直植/mount/remount）。
+ */
+import { act } from 'react'
+import { createRoot, type Root } from 'react-dom/client'
+import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
+import { ReaderSearchBox } from '../../../src/renderer/features/reader/ReaderSearchBox'
+import { SearchHighlightLayer } from '../../../src/renderer/features/reader/SearchHighlightLayer'
+import { ReaderToolbar } from '../../../src/renderer/features/reader/ReaderToolbar'
+import {
+  createReaderSearchInitialState,
+  useReaderSearchStore
+} from '../../../src/renderer/features/reader/reader-search.store'
+
+let root: Root | null = null
+let host: HTMLDivElement | null = null
+
+function mount(node: JSX.Element): void {
+  host = document.createElement('div')
+  document.body.appendChild(host)
+  root = createRoot(host)
+  act(() => {
+    root?.render(node)
+  })
+}
+
+function remount(node: JSX.Element): void {
+  act(() => {
+    root?.render(node)
+  })
+}
+
+/** 视口盒桩（Range.getClientRects 返回元素——toPageRelative 只读 x/y/width/height） */
+function rect(x: number, y: number, w: number, h: number): DOMRect {
+  return { x, y, width: w, height: h, top: y, left: x, right: x + w, bottom: y + h, toJSON: () => ({}) } as DOMRect
+}
+
+/** 页根桩：.textLayer 内按序 spans（SearchHighlightLayer 量测输入） */
+function makeSpans(spanTexts: string[]): HTMLSpanElement[] {
+  return spanTexts.map((t) => {
+    const s = document.createElement('span')
+    s.textContent = t
+    return s
+  })
+}
+
+function makePageRoot(spanTexts: string[]): HTMLDivElement {
+  const root = document.createElement('div')
+  const layer = document.createElement('div')
+  layer.className = 'textLayer'
+  for (const s of makeSpans(spanTexts)) layer.appendChild(s)
+  root.appendChild(layer)
+  return root
+}
+
+function searchBoxInput(): HTMLInputElement {
+  const el = host!.querySelector<HTMLInputElement>('[data-testid="reader-search-input"]')
+  expect(el).not.toBeNull()
+  return el!
+}
+
+function pressKey(el: HTMLElement, key: string, opts?: { shift?: boolean; ctrl?: boolean; composing?: boolean }): void {
+  act(() => {
+    const ev = new KeyboardEvent('keydown', {
+      key,
+      bubbles: true,
+      cancelable: true,
+      shiftKey: opts?.shift === true,
+      ctrlKey: opts?.ctrl === true
+    })
+    // IME 组合态：jsdom 构造器 init 不保证透传 isComposing——实例级 defineProperty
+    // 桩路径等价实现（门一 W2-新 裁定注明的备选形态），React nativeEvent 直读该实例
+    if (opts?.composing === true) {
+      Object.defineProperty(ev, 'isComposing', { value: true })
+    }
+    el.dispatchEvent(ev)
+  })
+}
+
+function boxProps(over: Partial<Parameters<typeof ReaderSearchBox>[0]>): Parameters<typeof ReaderSearchBox>[0] {
+  return {
+    state: 'open',
+    query: '',
+    lastSubmitted: '',
+    matchCount: 0,
+    activeIndex: 0,
+    focusSeq: 1,
+    onQueryChange: () => undefined,
+    onSubmit: () => undefined,
+    onPrev: () => undefined,
+    onNext: () => undefined,
+    onClose: () => undefined,
+    ...over
+  }
+}
+
+/** defineProperty 桩的原 descriptor（门一 N4：afterEach 显式还原不裸留） */
+let origClientRects: PropertyDescriptor | undefined
+let origScrollIntoView: PropertyDescriptor | undefined
+
+beforeEach(() => {
+  ;(globalThis as unknown as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true
+  // rAF 同步化（jsdom 假帧——量测 effect 即时收敛）
+  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback): number => {
+    cb(0)
+    return 0
+  })
+  // Range 几何桩：jsdom 无 getClientRects 实现（定义注入）；真布局归 e2e——
+  // jsdom 只断渲染存在性与 px 样式映射
+  origClientRects = Object.getOwnPropertyDescriptor(Range.prototype, 'getClientRects')
+  Object.defineProperty(Range.prototype, 'getClientRects', {
+    value: vi.fn((): DOMRectList => [rect(110, 60, 40, 12)] as unknown as DOMRectList),
+    configurable: true
+  })
+  // scrollIntoView jsdom 无实现——active 居中路径的可观测桩
+  origScrollIntoView = Object.getOwnPropertyDescriptor(Element.prototype, 'scrollIntoView')
+  Object.defineProperty(Element.prototype, 'scrollIntoView', { value: vi.fn(), configurable: true })
+  useReaderSearchStore.setState(createReaderSearchInitialState())
+})
+
+afterEach(() => {
+  act(() => {
+    root?.unmount()
+  })
+  root = null
+  host?.remove()
+  host = null
+  vi.unstubAllGlobals()
+  vi.restoreAllMocks()
+  // 门一 N4：defineProperty 桩按原 descriptor 显式还原（原无实现=删属性）
+  if (origClientRects === undefined) {
+    delete (Range.prototype as { getClientRects?: unknown }).getClientRects
+  } else {
+    Object.defineProperty(Range.prototype, 'getClientRects', origClientRects)
+  }
+  if (origScrollIntoView === undefined) {
+    delete (Element.prototype as { scrollIntoView?: unknown }).scrollIntoView
+  } else {
+    Object.defineProperty(Element.prototype, 'scrollIntoView', origScrollIntoView)
+  }
+  useReaderSearchStore.setState(createReaderSearchInitialState())
+})
+
+describe('P7E-03 ReaderSearchBox —— 键位与展示', () => {
+  it('Enter 提交：query≠lastSubmitted（或未 done）→ onSubmit(query)，不触发 onNext', () => {
+    const onSubmit = vi.fn()
+    const onNext = vi.fn()
+    mount(<ReaderSearchBox {...boxProps({ state: 'open', query: 'smart', lastSubmitted: '', onSubmit, onNext })} />)
+    pressKey(searchBoxInput(), 'Enter')
+    expect(onSubmit).toHaveBeenCalledTimes(1)
+    expect(onSubmit).toHaveBeenCalledWith('smart')
+    expect(onNext).not.toHaveBeenCalled()
+  })
+
+  it('Enter 再按=下一处：done+query===lastSubmitted → onNext（不 onSubmit）', () => {
+    const onSubmit = vi.fn()
+    const onNext = vi.fn()
+    mount(<ReaderSearchBox {...boxProps({ state: 'done', query: 'smart', lastSubmitted: 'smart', matchCount: 3, onSubmit, onNext })} />)
+    pressKey(searchBoxInput(), 'Enter')
+    expect(onNext).toHaveBeenCalledTimes(1)
+    expect(onSubmit).not.toHaveBeenCalled()
+  })
+
+  it('Enter 改词后=重新提交新查询（done+query≠lastSubmitted → onSubmit）', () => {
+    const onSubmit = vi.fn()
+    const onNext = vi.fn()
+    mount(<ReaderSearchBox {...boxProps({ state: 'done', query: 'water', lastSubmitted: 'smart', matchCount: 3, onSubmit, onNext })} />)
+    pressKey(searchBoxInput(), 'Enter')
+    expect(onSubmit).toHaveBeenCalledTimes(1)
+    expect(onSubmit).toHaveBeenCalledWith('water')
+    expect(onNext).not.toHaveBeenCalled()
+  })
+
+  it('R2-W1 尾空白查询：提交（store 侧已 trim）后 done 再 Enter=onNext（trim 口径一致——旧实现死循环重提交）', () => {
+    const onSubmit = vi.fn()
+    const onNext = vi.fn()
+    mount(<ReaderSearchBox {...boxProps({ state: 'done', query: 'smart ', lastSubmitted: 'smart', matchCount: 3, onSubmit, onNext })} />)
+    pressKey(searchBoxInput(), 'Enter')
+    expect(onNext).toHaveBeenCalledTimes(1)
+    expect(onSubmit).not.toHaveBeenCalled()
+  })
+
+  it('R2-W2 IME 组合态 Enter：零提交零下一处（nativeEvent.isComposing 守卫——拼音确认候选词不进搜索语义）', () => {
+    const onSubmit = vi.fn()
+    const onNext = vi.fn()
+    mount(<ReaderSearchBox {...boxProps({ state: 'done', query: '智慧', lastSubmitted: '智慧', matchCount: 3, onSubmit, onNext })} />)
+    pressKey(searchBoxInput(), 'Enter', { composing: true })
+    expect(onSubmit).not.toHaveBeenCalled()
+    expect(onNext).not.toHaveBeenCalled()
+  })
+
+  it('R2-W2 IME 组合态 Esc：不关面板（同守卫——取消候选词≠关闭搜索）', () => {
+    const onClose = vi.fn()
+    mount(<ReaderSearchBox {...boxProps({ state: 'done', query: '智慧', lastSubmitted: '智慧', matchCount: 3, onClose })} />)
+    pressKey(searchBoxInput(), 'Escape', { composing: true })
+    expect(onClose).not.toHaveBeenCalled()
+  })
+
+  it('Shift+Enter=上一处（同规则：done+同查询 → onPrev；改词则仍提交）', () => {
+    const onSubmit = vi.fn()
+    const onPrev = vi.fn()
+    mount(<ReaderSearchBox {...boxProps({ state: 'done', query: 'smart', lastSubmitted: 'smart', matchCount: 3, onSubmit, onPrev })} />)
+    pressKey(searchBoxInput(), 'Enter', { shift: true })
+    expect(onPrev).toHaveBeenCalledTimes(1)
+    expect(onSubmit).not.toHaveBeenCalled()
+  })
+
+  it('Esc → onClose', () => {
+    const onClose = vi.fn()
+    mount(<ReaderSearchBox {...boxProps({ onClose })} />)
+    pressKey(searchBoxInput(), 'Escape')
+    expect(onClose).toHaveBeenCalledTimes(1)
+  })
+
+  it('searching 态：计数位显示「搜索中…」', () => {
+    mount(<ReaderSearchBox {...boxProps({ state: 'searching', query: 'smart' })} />)
+    expect(host!.querySelector('[data-testid="reader-search-count"]')!.textContent).toBe('搜索中…')
+  })
+
+  it('done 0 命中：计数「0/0」+「无匹配」提示', () => {
+    mount(<ReaderSearchBox {...boxProps({ state: 'done', query: 'zzz', lastSubmitted: 'zzz', matchCount: 0 })} />)
+    expect(host!.querySelector('[data-testid="reader-search-count"]')!.textContent).toBe('0/0')
+    expect(host!.textContent).toContain('无匹配')
+  })
+
+  it('done 命中集：计数 `${activeIndex+1}/${matchCount}`（activeIndex 0 基）', () => {
+    mount(<ReaderSearchBox {...boxProps({ state: 'done', query: 'smart', lastSubmitted: 'smart', matchCount: 3, activeIndex: 1 })} />)
+    expect(host!.querySelector('[data-testid="reader-search-count"]')!.textContent).toBe('2/3')
+  })
+
+  it('focusSeq 变化 → input.focus()+select()（全选 query）', () => {
+    mount(<ReaderSearchBox {...boxProps({ state: 'open', query: 'smart', focusSeq: 1 })} />)
+    const input = searchBoxInput()
+    expect(document.activeElement).toBe(input)
+    remount(<ReaderSearchBox {...boxProps({ state: 'open', query: 'smartwater', focusSeq: 2 })} />)
+    expect(document.activeElement).toBe(input)
+    expect(input.selectionStart).toBe(0)
+    expect(input.selectionEnd).toBe('smartwater'.length)
+  })
+
+  it('‹ › × 三按钮：aria-label 到位+点击分别调 onPrev/onNext/onClose', () => {
+    const onPrev = vi.fn()
+    const onNext = vi.fn()
+    const onClose = vi.fn()
+    mount(<ReaderSearchBox {...boxProps({ state: 'done', matchCount: 2, onPrev, onNext, onClose })} />)
+    const byLabel = (label: string): HTMLButtonElement => {
+      const b = host!.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`)
+      expect(b).not.toBeNull()
+      return b!
+    }
+    act(() => {
+      byLabel('上一个').click()
+    })
+    expect(onPrev).toHaveBeenCalledTimes(1)
+    act(() => {
+      byLabel('下一个').click()
+    })
+    expect(onNext).toHaveBeenCalledTimes(1)
+    act(() => {
+      byLabel('关闭搜索').click()
+    })
+    expect(onClose).toHaveBeenCalledTimes(1)
+  })
+
+  it('idle → 零渲染（面板关；受控组件自隐）', () => {
+    mount(<ReaderSearchBox {...boxProps({ state: 'idle' })} />)
+    expect(host!.querySelector('[data-testid="reader-search-box"]')).toBeNull()
+  })
+})
+
+describe('P7E-03 SearchHighlightLayer —— 渲染面', () => {
+  /** 植入 done 态：两页命中（页 0/页 1 各一）+pageItems 两页 */
+  function plantDone(activeIndex: number): void {
+    useReaderSearchStore.setState({
+      state: 'done',
+      query: 'smart',
+      lastSubmitted: 'smart',
+      matches: [
+        { page: 0, itemRanges: [{ itemIndex: 0, s0: 0, s1: 5 }] },
+        { page: 1, itemRanges: [{ itemIndex: 1, s0: 2, s1: 7 }] }
+      ],
+      activeIndex,
+      pageItems: {
+        0: [
+          { str: 'SMART WATER', hasEOL: false, dir: 'ltr', width: 1, height: 1, transform: [], fontName: 'F1' },
+          { str: 'x', hasEOL: false, dir: 'ltr', width: 1, height: 1, transform: [], fontName: 'F1' }
+        ],
+        1: [
+          { str: 'a', hasEOL: false, dir: 'ltr', width: 1, height: 1, transform: [], fontName: 'F1' },
+          { str: 'b SMART c', hasEOL: false, dir: 'ltr', width: 1, height: 1, transform: [], fontName: 'F1' }
+        ]
+      },
+      focusSeq: 1
+    })
+  }
+
+  it('done 态按页过滤渲染：本页匹配产 hl 块+px 几何（toPageRelative 数学）+active 强调', () => {
+    plantDone(0)
+    const pageRoot = makePageRoot(['SMART WATER', 'x'])
+    // 页根盒偏移桩：视口盒(110,60)−根盒(100,50)=页内相对(10,10)
+    vi.spyOn(pageRoot.querySelector('.textLayer')!, 'getBoundingClientRect').mockReturnValue(rect(100, 50, 612, 792))
+    mount(<SearchHighlightLayer page={0} pageRoot={pageRoot} />)
+    const hls = host!.querySelectorAll<HTMLElement>('[data-testid="search-hl"]')
+    expect(hls).toHaveLength(1)
+    expect(hls[0]!.style.left).toBe('10px')
+    expect(hls[0]!.style.top).toBe('10px')
+    expect(hls[0]!.style.width).toBe('40px')
+    expect(hls[0]!.style.height).toBe('12px')
+    // S3：首匹配 active——data-active 强调属性+accent 描边+层序/穿透
+    expect(hls[0]!.getAttribute('data-active')).toBe('true')
+    expect(hls[0]!.style.outline).toContain('var(--accent)')
+    const layer = host!.querySelector<HTMLElement>('[data-testid="search-highlight-layer"]')!
+    expect(layer.style.zIndex).toBe('1')
+    expect(layer.style.pointerEvents).toBe('none')
+    expect(hls[0]!.style.backgroundColor).toBe('var(--accent-soft)')
+  })
+
+  it('active 匹配切换：activeIndex=1 时本页（页 0）块非 active；居中滚动只滚 active 块', () => {
+    plantDone(0)
+    const pageRoot = makePageRoot(['SMART WATER', 'x'])
+    mount(<SearchHighlightLayer page={0} pageRoot={pageRoot} />)
+    const hl = host!.querySelector<HTMLElement>('[data-testid="search-hl"]')!
+    expect(hl.getAttribute('data-active')).toBe('true')
+    const scrollIntoView = Element.prototype.scrollIntoView as ReturnType<typeof vi.fn>
+    // 切 active 到页 1：本页块转非 active（强调跟 activeIndex 走）
+    act(() => {
+      useReaderSearchStore.setState({ activeIndex: 1 })
+    })
+    const hlAfter = host!.querySelector<HTMLElement>('[data-testid="search-hl"]')!
+    expect(hlAfter.getAttribute('data-active')).toBe('false')
+    expect(hlAfter.style.outline).toBe('')
+    expect(scrollIntoView).toHaveBeenCalledTimes(1)
+  })
+
+  it('idle/searching 态零渲染', () => {
+    plantDone(0)
+    const pageRoot = makePageRoot(['SMART WATER', 'x'])
+    mount(<SearchHighlightLayer page={0} pageRoot={pageRoot} />)
+    expect(host!.querySelectorAll('[data-testid="search-hl"]').length).toBeGreaterThan(0)
+    act(() => {
+      useReaderSearchStore.setState({ state: 'searching' })
+    })
+    expect(host!.querySelectorAll('[data-testid="search-hl"]')).toHaveLength(0)
+    act(() => {
+      useReaderSearchStore.setState({ state: 'idle' })
+    })
+    expect(host!.querySelectorAll('[data-testid="search-hl"]')).toHaveLength(0)
+  })
+
+  it('span 数不符（items 3 vs spans 2）→ 该页跳过高亮（防御：只计数不渲染）', () => {
+    useReaderSearchStore.setState({
+      state: 'done',
+      query: 'smart',
+      lastSubmitted: 'smart',
+      matches: [{ page: 0, itemRanges: [{ itemIndex: 2, s0: 0, s1: 5 }] }],
+      activeIndex: 0,
+      pageItems: {
+        0: [
+          { str: 'a', hasEOL: false, dir: 'ltr', width: 1, height: 1, transform: [], fontName: 'F1' },
+          { str: 'b', hasEOL: false, dir: 'ltr', width: 1, height: 1, transform: [], fontName: 'F1' },
+          { str: 'c', hasEOL: false, dir: 'ltr', width: 1, height: 1, transform: [], fontName: 'F1' }
+        ]
+      },
+      focusSeq: 1
+    })
+    mount(<SearchHighlightLayer page={0} pageRoot={makePageRoot(['a', 'b'])} />)
+    expect(host!.querySelectorAll('[data-testid="search-hl"]')).toHaveLength(0)
+  })
+
+  it('匹配在别页：本页层零渲染（按页过滤）', () => {
+    plantDone(0)
+    mount(<SearchHighlightLayer page={2} pageRoot={makePageRoot(['别的页'])} />)
+    expect(host!.querySelectorAll('[data-testid="search-hl"]')).toHaveLength(0)
+  })
+
+  it('S11 文本层重渲（zoom 重排同型：replaceChildren+重挂 span）→MutationObserver+rAF 重算：块仍在+几何随新 clientRects 更新', async () => {
+    plantDone(0)
+    const pageRoot = makePageRoot(['SMART WATER', 'x'])
+    mount(<SearchHighlightLayer page={0} pageRoot={pageRoot} />)
+    const hlBefore = host!.querySelector<HTMLElement>('[data-testid="search-hl"]')!
+    expect(hlBefore).not.toBeNull()
+    expect(hlBefore.style.left).toBe('110px')
+    expect(hlBefore.style.width).toBe('40px')
+    // 重排后的新视口几何（clientRects 桩换返回值）
+    const rectsMock = (Range.prototype as unknown as { getClientRects: ReturnType<typeof vi.fn> }).getClientRects
+    rectsMock.mockImplementation((): DOMRectList => [rect(220, 120, 80, 20)] as unknown as DOMRectList)
+    // zoom 重渲模拟：TextLayer effect 的 container.replaceChildren()+span 重挂同型
+    const layer = pageRoot.querySelector('.textLayer')!
+    await act(async () => {
+      layer.replaceChildren(...makeSpans(['SMART WATER', 'x']))
+      await Promise.resolve()
+    })
+    const hlAfter = host!.querySelector<HTMLElement>('[data-testid="search-hl"]')!
+    expect(hlAfter).not.toBeNull()
+    expect(hlAfter.style.left).toBe('220px')
+    expect(hlAfter.style.top).toBe('120px')
+    expect(hlAfter.style.width).toBe('80px')
+    expect(hlAfter.style.height).toBe('20px')
+  })
+
+  it('W2 居中记账入 store：层卸载重挂+同 matches 同 activeIndex → scrollIntoView 不再触发（跨实例生效）', () => {
+    plantDone(0)
+    const pageRoot = makePageRoot(['SMART WATER', 'x'])
+    mount(<SearchHighlightLayer page={0} pageRoot={pageRoot} />)
+    const scrollIntoView = Element.prototype.scrollIntoView as ReturnType<typeof vi.fn>
+    expect(scrollIntoView).toHaveBeenCalledTimes(1)
+    // 卸载重挂（懒渲染窗口换出换入——层实例重建，实例级记账会归零复活）
+    act(() => {
+      root?.unmount()
+    })
+    host!.remove()
+    mount(<SearchHighlightLayer page={0} pageRoot={pageRoot} />)
+    expect(host!.querySelectorAll('[data-testid="search-hl"]')).toHaveLength(1)
+    expect(scrollIntoView).toHaveBeenCalledTimes(1)
+  })
+})
+
+describe('P7E-03 ReaderToolbar —— searchBox slot', () => {
+  function toolbarProps(): Parameters<typeof ReaderToolbar>[0] {
+    return {
+      page: 0,
+      totalPages: 10,
+      zoom: 1,
+      color: 'yellow',
+      onNavigate: () => undefined,
+      onZoom: () => undefined,
+      onColor: () => undefined
+    }
+  }
+
+  it('不传 searchBox：旧占位 span 兜底（受锁测试夹具路径零破坏）', () => {
+    mount(<ReaderToolbar {...toolbarProps()} />)
+    expect(host!.textContent).toContain('全库检索请回文献库')
+  })
+
+  it('传 searchBox：渲染 slot 内容+占位缺席（生产装配面恒传）', () => {
+    mount(<ReaderToolbar {...toolbarProps()} searchBox={<b data-testid="slot-probe">搜索面板</b>} />)
+    expect(host!.querySelector('[data-testid="slot-probe"]')).not.toBeNull()
+    expect(host!.textContent).not.toContain('全库检索请回文献库')
+  })
+})
```

## 2. 实现者 R2 处置自报（报告 §11）
```markdown
## 11 门一回炉第 2 轮（最后一轮——门一复核 PWW 放行后新扫 2W，主控裁决三改两记档）

日期：2026-09-03（同日）。逐条处置（编号循主控 R2 裁决）：

### 【W1-新-修】Enter 判定 trim 口径一致
- 缺陷：`query !== lastSubmitted` 用未 trim 的 query 对已 trim 的 lastSubmitted——查询含首尾空白（'smart '）时 done 后每次 Enter 恒走 onSubmit（死循环重提交，永不进下一处）。
- 修：ReaderSearchBox onKeydown Enter 分支比较改 `query.trim() !== lastSubmitted`（头注同步）。
- 先红：新用例「提交 'smart '（尾空白）→done→再 Enter=onNext 而非 onSubmit」对旧实现红（onSubmit 1 次≠期望 onNext）——`p7e-03-red/round2-raw.txt` 三红之一。

### 【W2-新-修】IME 组合态守卫
- 缺陷：中文拼音输入法 Enter 确认候选词→直触发提交/下一处；Esc 取消候选→关面板。中文查询=本应用主路径。
- 修：onKeydown 首行 `if (e.nativeEvent.isComposing) return`（Enter/Esc 全守；头注同步）。
- 先红：两新用例（组合态 Enter→onSubmit/onNext 零调用；组合态 Esc→onClose 零调用）对旧实现红（各被调 1 次）。**桩路径注明**：jsdom 构造器 init 不保证透传 isComposing——pressKey 改实例级 `Object.defineProperty(ev, 'isComposing', { value: true })` 等价实现（React nativeEvent 直读该实例，裁决注明的备选形态落档于 round2 红绿证据）。

### 【N2-新-修】非保长项注释诚实化（纯注释，无测试面）
- 勘正口径：原措辞「该项退化大小写敏感」不准确——findInText 查询侧恒 toLowerCase，原 str 入索引的项含大写字符时连精确大小写查询也永不命中（查 'İX' 降为 'i̇x' 对不上索引 'İX'），即**该类项整体不可搜**。
- 修：reader-search.ts 头注 bullet+buildPageText jsdoc 措辞改「该类项在查询侧恒降小写下永不命中——非保长语料不可搜，已知边界（不加回退匹配逻辑——成本不值）」；测试文件同措辞注释一并对齐（注释面）。零行为改动。

### 【DISPOSE-记档不修】
- N1-新（keymap 只绑 ctrl vs 面板内 ctrl||meta 口径不一）：**证伪**——keymap.ts matches() 实现是 `(b.ctrl===true) !== (ev.ctrlKey||ev.metaKey)`，文档级同样接受 metaKey（门一读了绑定声明没读匹配器）；且本应用 win32 单平台。零动作。
- N3-新（占位 title 文案改）：全量 1216 绿=无受锁锚定面，title 非锁面。零动作。

### R2 证据与数字（脚本实测）
- 定向红：`scripts/audits/p7e-03-red/round2-raw.txt`——3 红（W1-新 1+W2-新 2），exit=1。
- 定向绿：`scripts/audits/p7e-03-green/round2-raw.txt`——23/23，exit=0（ui 文件 20→23）。
- 全量：`scripts/audits/p7e-03-selfcheck-round2.raw.txt`——**140 文件/1219 用例全绿**（+3 实测=R2 三新用例；文件数不变循主控预期），exit=0；quality/tickets/lint/typecheck/build 各 exit=0。
- 定向 e2e（保险锚，R2 源改动后）：`scripts/audits/p7e-03-e2e-targeted.raw.txt`——1 passed（1.8s），exit=0。
- 收口仍归主控：locks 预期 255→256、registry 翻 done、INV-55（含 R1 bindDoc/lastCentered 记账语义）登记。
```

## 3. R2 证据摘录
- 定向红（3 红）：
[31m[2m⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[3/3]⎯[22m[39m

[2m Test Files [22m [1m[31m1 failed[39m[22m[90m (1)[39m
[2m      Tests [22m [1m[31m3 failed[39m[22m[2m | [22m[1m[32m20 passed[39m[22m[90m (23)[39m
[2m   Start at [22m 13:22:17
[2m   Duration [22m 1.36s[2m (transform 64ms, setup 0ms, collect 197ms, tests 64ms, environment 596ms, prepare 166ms)[22m

exit=1
- 定向绿（23/23）+全量（140/1219）：
[2m   Start at [22m 13:22:54
[2m   Duration [22m 1.32s[2m (transform 65ms, setup 0ms, collect 184ms, tests 60ms, environment 587ms, prepare 171ms)[22m

exit=0
[2m Test Files [22m [1m[32m140 passed[39m[22m[90m (140)[39m
[2m      Tests [22m [1m[32m1219 passed[39m[22m[90m (1219)[39m
$ npm run quality:check
exit=0
