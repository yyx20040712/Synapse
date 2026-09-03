/**
 * [P7E-03] reader-search.store —— 页内搜索会话 store（zustand；态空间 S1~S12
 * 票面 §① 表）。
 *
 * ── 行为层 ──
 * - 态机：'idle'（面板关）| 'open'（面板开）| 'searching'（在途）| 'done'
 *   （有结果集）。事件×态：
 *   | 事件 | idle | open | searching | done |
 *   | open()（Ctrl+F） | →open+focusSeq++ | focusSeq++ | focusSeq++（态不变） | focusSeq++（态不变——S12 不重搜） |
 *   | submit 有效 | — | →searching | →searching（新代顶替旧代） | →searching |
 *   | submit 空/纯空白 | no-op | no-op（S2） | no-op | no-op |
 *   | submit 页提取失败 | — | 停 open+toast（S10，query 保留） | 同左 | 同左 |
 *   | next()/prev() | no-op | no-op（无结果集） | no-op | activeIndex 回卷循环+翻页回调 |
 *   | close()/reset() | no-op（幂等清） | →idle 全清 | →idle 全清+代际失效 | →idle 全清+代际失效 |
 * - 代际守卫（INV-03 同族）：闭包内 generation 每次 submit/close/reset 自增；
 *   逐页回传时代际不符→作废终止（不写任何状态）——迟到旧代不得覆盖新代。
 * - submit 同步置态：searching 在首个 await 前落账（零 await 前置——搜索指示
 *   即刻可见）；索引=全文档逐页 getTextContent（未渲染页也计数——Design 裁决）。
 * - 翻页联动经注入回调（store 间零 import——registerPageTurner 注册口，装配面
 *   useReaderSearch 接线 reader.store.setPage(page,{scroll:'to'})，可测性=
 *   CorpusExtractor deps 注入同型）。
 * - pageItems 仅含命中页（高亮映射输入——span 数校验基准）。
 *
 * ── 接口层 ──
 * - export const useReaderSearchStore；createReaderSearchInitialState 复位面
 *
 * ── 架构层 ──
 * - 不 import reader.store（翻页联动经注册回调）；showToast 消费 toast-store
 *   （.ts 模块面——reader.store 同款）
 *
 * ── 生命周期层 ──
 * - INV-55：页内搜索会话生命周期挂 reader 视图文档身份——换文档/换 tab 由
 *   装配面 hook 的 fileUrl 键效应调 reset()（本 store 不自知文档身份）
 *
 * ── 文化层 ──
 * - tests/unit/renderer/reader-search.store.test.ts（S1~S12 store 侧锚）
 */
import { create } from 'zustand'
import { asSearchDoc, buildPageText, findInText, toTextItems } from './reader-search'
import type { SearchItemRange } from './reader-search'
import type { PdfTextItem } from './PdfPageCanvas'
import { showToast } from '../../shared/ui/toast-store'

export type ReaderSearchStateName = 'idle' | 'open' | 'searching' | 'done'

/** 单命中（页 0 基+按 item 归组区间集） */
export interface SearchMatch {
  page: number
  itemRanges: SearchItemRange[]
}

/** 翻页联动回调（装配面注入：目标页≠当前可见页时 setPage 程序滚动） */
export type PageTurner = (page: number) => void

/** active 居中记账（门一 W2：跨层实例/跨重挂——同 matches 引用+同 activeIndex
 *  只居中一次；多页多实例共享单条=恰好正确语义：仅 active 页实例滚动） */
export interface CenteredMark {
  m: SearchMatch[]
  i: number
}

export interface ReaderSearchStore {
  state: ReaderSearchStateName
  query: string
  lastSubmitted: string
  matches: SearchMatch[]
  activeIndex: number
  pageItems: Record<number, PdfTextItem[]>
  focusSeq: number
  /** INV-55 会话身份记账（门一 W1）：bindDoc 写入——重挂不丢（实例级 ref 漏洞修） */
  sessionFileUrl: string
  /** 居中记账（门一 W2；新结果集/新 activeIndex 重新具备资格） */
  lastCentered: CenteredMark | null
  pageTurner: PageTurner | null
  registerPageTurner(f: PageTurner | null): void
  /** 会话身份绑定（装配面 fileUrl 键效应调用）：变化→代际失效+全清+记录；
   *  不变=no-op（同文档重挂不清——身份未变） */
  bindDoc(fileUrl: string): void
  open(): void
  close(): void
  setQuery(q: string): void
  submit(doc: unknown, q: string): Promise<void>
  next(): void
  prev(): void
  reset(): void
}

export function createReaderSearchInitialState() {
  return {
    state: 'idle' as ReaderSearchStateName,
    query: '',
    lastSubmitted: '',
    matches: [] as SearchMatch[],
    activeIndex: 0,
    pageItems: {} as Record<number, PdfTextItem[]>,
    focusSeq: 0,
    sessionFileUrl: '',
    lastCentered: null as CenteredMark | null,
    pageTurner: null as PageTurner | null
  }
}

export const useReaderSearchStore = create<ReaderSearchStore>()((set, get) => {
  // 代际计数（INV-03 同族）：submit 每次自增；close/reset 使在途代失效
  let readerSearchGeneration = 0

  /** 搜索字段全清（pageTurner 注册/会话身份不随清空——装配面成对管理） */
  const blank = (): Pick<ReaderSearchStore, 'state' | 'query' | 'lastSubmitted' | 'matches' | 'activeIndex' | 'pageItems' | 'lastCentered'> => ({
    state: 'idle',
    query: '',
    lastSubmitted: '',
    matches: [],
    activeIndex: 0,
    pageItems: {},
    lastCentered: null
  })

  const stepActive = (dir: 1 | -1): void => {
    const { matches, activeIndex, pageTurner } = get()
    if (matches.length === 0) return
    const idx = (activeIndex + dir + matches.length) % matches.length
    set({ activeIndex: idx })
    const target = matches[idx]
    if (target !== undefined) pageTurner?.(target.page)
  }

  return {
    ...createReaderSearchInitialState(),

    registerPageTurner(f) {
      set({ pageTurner: f })
    },

    bindDoc(fileUrl) {
      const s = get()
      if (s.sessionFileUrl === fileUrl) return
      readerSearchGeneration += 1
      set({ ...blank(), sessionFileUrl: fileUrl })
    },

    open() {
      const s = get()
      set({
        state: s.state === 'idle' ? 'open' : s.state,
        focusSeq: s.focusSeq + 1
      })
    },

    close() {
      readerSearchGeneration += 1
      set(blank())
    },

    setQuery(q) {
      set({ query: q })
    },

    async submit(doc, q) {
      const trimmed = q.trim()
      if (trimmed === '') return
      const d = asSearchDoc(doc)
      if (d === null) return
      const gen = ++readerSearchGeneration
      // 同步置态（⑤b 零 await 前置）：searching 即刻可见（新代开搜即清居中记账）
      set({ state: 'searching', lastSubmitted: trimmed, matches: [], activeIndex: 0, pageItems: {}, lastCentered: null })
      const found: SearchMatch[] = []
      const hitItems: Record<number, PdfTextItem[]> = {}
      try {
        for (let n = 1; n <= d.numPages; n += 1) {
          const page = await d.getPage(n)
          const tc = await page.getTextContent()
          if (readerSearchGeneration !== gen) return
          const items = toTextItems(tc.items)
          const hits = findInText(buildPageText(items), trimmed)
          if (hits.length === 0) continue
          found.push(...hits.map((h) => ({ page: n - 1, itemRanges: h.itemRanges })))
          hitItems[n - 1] = items
        }
      } catch {
        if (readerSearchGeneration !== gen) return
        showToast('页内搜索失败：部分页面文本无法读取', 'error')
        set({ state: 'open', matches: [], activeIndex: 0, pageItems: {}, lastCentered: null })
        return
      }
      if (readerSearchGeneration !== gen) return
      set({ state: 'done', matches: found, activeIndex: 0, pageItems: hitItems, lastCentered: null })
    },

    next() {
      stepActive(1)
    },

    prev() {
      stepActive(-1)
    },

    reset() {
      readerSearchGeneration += 1
      set(blank())
    }
  }
})
