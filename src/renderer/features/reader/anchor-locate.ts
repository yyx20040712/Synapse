// b3: P7-C
/**
 * [SR2-C-05] anchor-locate —— N1 锚点定位服务（工单：done / strong）
 *
 * ⚠ INV-20 单入口（N2 裁决「三层防线升格验收条款」+N1/N3 共享）：一切跳转
 * 消费方（本单=阅读器片段列表 N1；未来=P7-G AI 面板/LG 脉络侧板 N3）共用
 * locateAnchor，**禁各写降级**。
 *
 * ── 行为层 ──
 * - locateAnchor(target)（骨架 §1 契约形状）：三层防线
 *   ①exact：目标 tab 已开且 ready → setPage(anchorPage) → 等文本层就绪
 *   （.textLayer 存在且 verifyQuote 可判——rAF 频率轮询，LOCATE_TEXT_READY_
 *   TIMEOUT_MS=3000 超时按 page 层降级：已在该页、仅无法精确验证）→
 *   verifyQuote（annotation-anchor 唯一 DOM 遍历点纪律）成功 → 滚动
 *   [data-annotation-id] 元素居中+闪烁（locate-flash 类，样式模块级单次注入）
 *   → 'exact'
 *   ②page：verifyQuote 失败 → 停留该页+toast「锚定失效，已定位到所在页」→'page'
 *   ③paper：target.anchor=null（篇级）或 quoteText 空 → setPage(0) 开篇→'paper'
 * - 跨视图：tab 未开/loading/error → requestOpenPaper（open-paper-bus.ts:17）
 *   → 轮询 tabs[id].status（POLL_MS=50）：ready→继续 ①；error→作废 resolve
 *   'paper' 无提示（打开失败已由 ReaderPage toast——不重复提示，S7）；
 *   超时 LOCATE_OPEN_TIMEOUT_MS=8s→'paper'+toast「打开文献超时…」（S6）
 * - 定位状态机（宪法状态机前置；实现形态）：
 *   | 态 | 事件 | 迁移 |
 *   | --- | --- | --- |
 *   | idle | locate，tab ready | verifying（S1 同页免等直验） |
 *   | idle | locate，tab 未开/loading/error | opening |
 *   | opening | status→ready | activating → verifying |
 *   | opening | status→error | resolved(paper) 无提示 |
 *   | opening | 超时 8s | resolved(paper)+toast |
 *   | activating | activateTab（同步） | verifying（定位=用户要看见） |
 *   | verifying | verifyQuote 成功 | resolved(exact)——滚动+闪烁 |
 *   | verifying | verifyQuote 失败/3s 超时 | resolved(page)——停留+提示 |
 *   | verifying | anchor=null/quote 空 | resolved(paper) |
 *   | 任意非终态 | 序号过期（后到 locate） | resolved(paper) 无副作用 |
 * - 并发裁决（序号守卫，INV-03 同族）：locate 调用自增 locateSeq；每个迁移步
 *   （activateTab/setPage/滚动/闪烁/提示）执行前校验序号仍最新，过期即静默
 *   作废副作用——**后到胜=旧请求的副作用被守卫截断**（S8）
 *
 * ── 接口层 ──
 * - export interface LocateTarget { paperId: string; anchor: {
 *     quoteText: string; prefixText: string; suffixText: string;
 *     anchorPage?: number; startOffset?: number } | null }
 * - export type LocateResult = 'exact' | 'page' | 'paper'
 * - export async function locateAnchor(target: LocateTarget): Promise<LocateResult>
 * - export const LOCATE_OPEN_TIMEOUT_MS = 8000
 *
 * ── 架构层 ──
 * - reader 域模块（不 import 组件；消费 annotation-anchor.verifyQuote/
 *   open-paper-bus/reader.store/toast-store——.ts 消费方走 toast-store 惯例）
 * - F-aware 接缝：setPage/activateTab 组合=「滚动到页 P 的锚 R」的 v1 实现；
 *   P7-F 连续滚动后仅换本文件滚动步实现，locateAnchor 签名与消费方不动
 *
 * ── 生命周期层 ──
 * - 不做：定位动画队列/跨 tab 批量定位；P7-H 脉络侧板（N3）经本入口复用
 *
 * ── 文化层 ──
 * - 测试：tests/unit/renderer/anchor-locate.test.ts：S1~S8 跨格序列+三防线+
 *   序号守卫（真 DOM verifyQuote+真 store+fake timers）
 * - INV-20 随本单翻已锚定（服务单测级；消费方级随后续工单补）
 */
import { verifyQuote } from './annotation-anchor'
import { useReaderStore } from './reader.store'
import { requestOpenPaper } from '../../shared/open-paper-bus'
import { showToast } from '../../shared/ui/toast-store'
import type { Annotation } from '@shared/models/annotation'

export interface LocateAnchor extends Pick<Annotation, 'quoteText' | 'prefixText' | 'suffixText'> {
  anchorPage?: number
  /** 页内文本偏移提示（verifyQuote 重定位起点；缺省 0——prefix/suffix 兜底） */
  startOffset?: number
}

export interface LocateTarget {
  paperId: string
  anchor: LocateAnchor | null
  /** exact 层滚动目标锚（AnnotationLayer rect 的 data-annotation-id）——
   *  消费方持完整标注对象时随锚传递；缺省则 exact 只完成页级停驻 */
  annotationId?: string
}

export type LocateResult = 'exact' | 'page' | 'paper'

export const LOCATE_OPEN_TIMEOUT_MS = 8000
/** 文本层就绪等待上限（超时按 page 层降级——已在该页仅无法精确验证） */
const LOCATE_TEXT_READY_TIMEOUT_MS = 3000
/** opening/轮询步进间隔 */
const POLL_MS = 50
/** 闪烁类驻留时长（动画一轮后摘除——类常驻会污染后续视觉判断） */
const FLASH_MS = 1200

/** 并发序号（INV-03 同族守卫：后到胜——旧请求副作用截断） */
let locateSeq = 0

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms))

/** 闪烁样式单次注入（模块级幂等；jsdom/生产同路径） */
let flashStyleReady = false
function ensureFlashStyle(): void {
  if (flashStyleReady || document.getElementById('locate-flash-style') !== null) {
    flashStyleReady = true
    return
  }
  const style = document.createElement('style')
  style.id = 'locate-flash-style'
  style.textContent =
    '@keyframes locate-flash{0%,100%{filter:brightness(1)}50%{filter:brightness(1.8)}}' +
    '.locate-flash{animation:locate-flash 0.6s ease-in-out 2}'
  document.head.appendChild(style)
  flashStyleReady = true
}

type OpenOutcome = 'ready' | 'open-error' | 'closed' | 'stale' | 'timeout'

/** opening：requestOpenPaper 后轮询 tab 状态（ready 继续/error 与 closed
 *  （见过又消失=S6 被关）作废/8s 超时降级）。loading 态不重发打开事件
 *  （在途加载已有 ReaderPage 接管——重复派发=重启加载的用户可见窗口，N4） */
async function waitOpen(paperId: string, seq: number): Promise<OpenOutcome> {
  const existing = useReaderStore.getState().tabs[paperId]
  if (existing === undefined || existing.status === 'error') {
    requestOpenPaper(paperId)
  }
  // 已知窄窗（deepseek W2，头注存档——INV-22 push 竞态窄窗同型）：requestOpenPaper
  // 发出即不可撤回，并发定位多篇时旧请求可能多打开一个 tab；open-paper-bus 对
  // ready tab 幂等激活，多余 tab 由用户关闭——序号守卫保证旧请求后续副作用截断
  let seen = false
  const deadline = Date.now() + LOCATE_OPEN_TIMEOUT_MS
  while (Date.now() < deadline) {
    await sleep(POLL_MS)
    if (locateSeq !== seq) return 'stale'
    const tab = useReaderStore.getState().tabs[paperId]
    if (tab !== undefined) seen = true
    else if (seen) return 'closed' // S6：打开途中被关——作废无提示
    if (tab?.status === 'ready') return 'ready'
    if (tab?.status === 'error') return 'open-error'
  }
  return 'timeout'
}

type VerifyOutcome = 'exact' | 'page' | 'stale'

/** verifying：等文本层可判后 verifyQuote（anchor-anchor 唯一 DOM 遍历点；
 *  DOM 异常按验证失败继续轮询（deepseek N2）；目标 tab 消失即作废（S6） */
async function verifyWhenReady(anchor: LocateAnchor, paperId: string, seq: number): Promise<VerifyOutcome> {
  const deadline = Date.now() + LOCATE_TEXT_READY_TIMEOUT_MS
  while (Date.now() < deadline) {
    if (locateSeq !== seq) return 'stale'
    if (useReaderStore.getState().tabs[paperId] === undefined) return 'stale'
    const textLayer = document.querySelector('.textLayer') as HTMLElement | null
    if (textLayer !== null) {
      let at: number | null = null
      try {
        at = verifyQuote(textLayer, {
          prefix: anchor.prefixText,
          quote: anchor.quoteText,
          suffix: anchor.suffixText,
          start: anchor.startOffset ?? 0
        })
      } catch {
        at = null // DOM 结构异常=验证失败（轮询继续，最终按 page 层降级）
      }
      if (at !== null) return 'exact'
    }
    await sleep(POLL_MS)
  }
  return 'page'
}

/** exact 副作用：滚动目标元素居中+闪烁（AnnotationLayer data-annotation-id 锚；
 *  属性值转义防选择器注入——deepseek W1） */
function flashAnnotation(annotationId: string): void {
  const el = document.querySelector(
    `[data-annotation-id="${annotationId.replace(/(["\\])/g, '\\$1')}"]`
  )
  if (el === null) return
  ensureFlashStyle()
  el.scrollIntoView({ block: 'center' })
  el.classList.add('locate-flash')
  setTimeout(() => el.classList.remove('locate-flash'), FLASH_MS)
}

export async function locateAnchor(target: LocateTarget): Promise<LocateResult> {
  const seq = ++locateSeq

  // ③paper 层：篇级（anchor=null）开篇；无引文（quoteText<2 无验证意义）但
  // anchorPage 已知时仍跳该页（防「跳回第 0 页」边界回归——deepseek r2 W2）。
  // 仅 ready 态直接操作（loading/error/absent 只负责打开，不与加载流冲突——N1）
  if (target.anchor === null || target.anchor.quoteText.length < 2) {
    const tab = useReaderStore.getState().tabs[target.paperId]
    if (tab !== undefined && tab.status === 'ready') {
      useReaderStore.getState().activateTab(target.paperId)
      useReaderStore.getState().setPage(target.anchor?.anchorPage ?? 0)
    } else {
      // 未开/加载中/失败：只负责（重）打开（landing 态由打开流决定）
      requestOpenPaper(target.paperId)
    }
    return 'paper'
  }

  const anchor = target.anchor
  const tab = useReaderStore.getState().tabs[target.paperId]
  if (tab === undefined || tab.status !== 'ready') {
    const opened = await waitOpen(target.paperId, seq)
    if (opened === 'open-error' || opened === 'closed' || opened === 'stale') return 'paper'
    if (opened === 'timeout') {
      if (locateSeq === seq) showToast('打开文献超时，已停在当前视图', 'info')
      return 'paper'
    }
  }
  if (locateSeq !== seq) return 'paper'

  // activating + 页设置（S1 同页：setPage 幂等；S2 跨页：触发渲染管线）
  useReaderStore.getState().activateTab(target.paperId)
  useReaderStore.getState().setPage(anchor.anchorPage ?? 0)

  const verdict = await verifyWhenReady(anchor, target.paperId, seq)
  if (verdict === 'stale') return 'paper'
  if (verdict === 'exact') {
    if (locateSeq !== seq) return 'paper'
    // S6：verifying 中 tab 被关——不追写已删 TabState/不滚动
    if (useReaderStore.getState().tabs[target.paperId] === undefined) return 'paper'
    if (target.annotationId !== undefined) flashAnnotation(target.annotationId)
    return 'exact'
  }
  if (locateSeq === seq) showToast('锚定失效，已定位到所在页', 'info')
  return 'page'
}
