/**
 * "打开文献"跨页事件总线（infra，无工单；随阅读器页面组装接线）。
 *
 * 链路：PaperList 双击 → library.store.openPaper → requestOpenPaper（记录最近请求
 * + window 广播）→ App 监听切到阅读器 tab → ReaderPage 挂载时 takePendingOpenPaper
 * 补读最近请求（事件派发时 ReaderPage 尚未挂载，收不到广播——闩锁补这一跳），
 * 之后的重复打开由已挂载的 ReaderPage 直接监听事件。
 *
 * 用 window CustomEvent 而非 store 互引：library 与 reader 是两个 feature 域，
 * 跨域只允许经本模块（check-quality 强制 features 不互引）。
 */
export const OPEN_PAPER_EVENT = 'synapse:open-paper'

/** 最近一次未消费的打开请求（闩锁）；挂载即取走，取走后置空 */
let lastRequest: string | null = null

export function requestOpenPaper(paperId: string): void {
  lastRequest = paperId
  window.dispatchEvent(new CustomEvent(OPEN_PAPER_EVENT, { detail: { paperId } }))
}

/** ReaderPage 挂载时取走最近一次请求；无请求或已消费返回 null */
export function takePendingOpenPaper(): string | null {
  const id = lastRequest
  lastRequest = null
  return id
}
