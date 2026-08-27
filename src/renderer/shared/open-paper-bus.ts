/**
 * "打开文献"跨页事件总线（infra，无工单；随阅读器页面组装接线）。
 *
 * 链路：PaperList 双击 → library.store.openPaper → requestOpenPaper（记录最近请求
 * + window 广播）→ App 监听切到阅读器 tab → ReaderPage 挂载时 takePendingOpenPaper
 * 补读最近请求（事件派发时 ReaderPage 尚未挂载，收不到广播——闩锁补这一跳），
 * 之后的重复打开由已挂载的 ReaderPage 直接监听事件。
 * 用 window CustomEvent 而非 store 互引：library 与 reader 是两个 feature 域，
 * 跨域只允许经本模块（check-quality 强制 features 不互引）。
 *
 * LG-04 载荷扩（主控裁决路径 A——锚递达=bus 载荷可选字段，非 reader.store 信号）：
 * 脉络侧板双击 AI 笔记条目→requestOpenPaperAnchored（anchor 三元组+aiNoteId 携带
 * ——anchorPage 已 0 基，侧板构造时转换）；消费侧定路由=open-paper-anchor.ts
 * （接缝双向锚定：本行+该文件头注）。requestOpenPaper 保持单字段语义（既有调用方
 * library/anchor-locate 零改动——locateAnchor 内部重发不带锚，防事件环）。
 */
export const OPEN_PAPER_EVENT = 'synapse:open-paper'

/** 锚载荷（quote 三元组+0 基页码——与 anchor-locate 的 LocateAnchor 形状一致，消费侧零转换） */
export interface OpenPaperAnchor {
  quoteText: string
  prefixText: string
  suffixText: string
  anchorPage?: number
}

/** 打开请求（闩锁/事件 detail 单一形状；anchor/aiNoteId 缺省=仅开篇） */
export interface OpenPaperRequest {
  paperId: string
  anchor?: OpenPaperAnchor
  aiNoteId?: string
}

/** 最近一次未消费的打开请求（闩锁）；挂载即取走，取走后置空 */
let lastRequest: OpenPaperRequest | null = null

export function requestOpenPaper(paperId: string): void {
  requestOpenPaperAnchored({ paperId })
}

/** 带锚打开（LG-04 侧板跳转链——阅读器侧消费定位经 INV-20 单入口） */
export function requestOpenPaperAnchored(req: OpenPaperRequest): void {
  lastRequest = req
  window.dispatchEvent(new CustomEvent(OPEN_PAPER_EVENT, { detail: req }))
}

/** ReaderPage 挂载时取走最近一次请求；无请求或已消费返回 null */
export function takePendingOpenPaper(): OpenPaperRequest | null {
  const req = lastRequest
  lastRequest = null
  return req
}
