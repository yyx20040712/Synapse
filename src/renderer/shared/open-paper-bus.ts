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
 * 脉络侧板双击片段条目→requestOpenPaperAnchored（[F-UIRES-03 B2] 片段跳转语义
 * ——anchor 三元组携带，anchorPage=Annotation.page 0 基直传；AI 条目双击链已
 * 退役）；消费侧定路由=open-paper-anchor.ts（接缝双向锚定：本行+该文件头注）。
 * requestOpenPaper 保持单字段语义（既有调用方
 * library/anchor-locate 零改动——locateAnchor 内部重发不带锚，防事件环）。
 * [F-LOCATE-01] anchor 增可选 annotationId——片段跳转元素级停驻恢复（exact 层
 * flashAnnotation 滚动目标锚，构造单点=LineageSidePanel.handleFragmentDblClick）。
 */
export const OPEN_PAPER_EVENT = 'synapse:open-paper'

/** 锚载荷（quote 三元组+0 基页码——与 anchor-locate 的 LocateAnchor 形状一致，消费侧零转换；
 *  annotationId=exact 层滚动目标锚（Annotation.id——缺席则 exact 只完成页级停驻）） */
export interface OpenPaperAnchor {
  quoteText: string
  prefixText: string
  suffixText: string
  anchorPage?: number
  /** [F-LOCATE-01] 片段跳转视觉停驻恢复（消费侧 openFromBus 透传至 locateAnchor target 顶层） */
  annotationId?: string
}

/** 打开请求（闩锁/事件 detail 单一形状；anchor 缺省=仅开篇） */
export interface OpenPaperRequest {
  paperId: string
  anchor?: OpenPaperAnchor
}

/** 最近一次未消费的打开请求（闩锁）；挂载即取走，取走后置空 */
let lastRequest: OpenPaperRequest | null = null

export function requestOpenPaper(paperId: string): void {
  requestOpenPaperAnchored({ paperId })
}

/** 带锚打开（LG-04 侧板跳转链——片段双击语义；阅读器侧消费定位经 INV-20 单入口） */
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
