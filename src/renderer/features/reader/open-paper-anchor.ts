// b3: P7-H
/**
 * open-paper-anchor —— 总线打开请求的消费侧定路由（LG-04 接缝落地）。
 *
 * 接缝双向锚定声明（跨视图锚递达，主控裁决路径 A）：本行+LineageSidePanel 头注
 * +open-paper-bus 头注——OPEN_PAPER_EVENT detail 增可选 anchor/aiNoteId 字段
 * （bus 载荷扩），本模块是阅读器侧唯一消费点。
 * - 带 anchor → locateAnchor（INV-20 单入口：打开/等就绪/三防线/exact 层
 *   data-ai-note-id 闪烁全归它——tab 未开时其内部自 requestOpenPaper 无锚
 *   重发，不回环）；页级/篇级降级提示也归其内部，本消费点不重复 toast。
 * - 无 anchor → reader.store openPaper 既有链路（失败动作型 toast 保持
 *   ReaderPage 原文案，INV-02）。
 *
 * **[LG-06] 脉络跳转接笔记面板信号（缺陷 E2，验收修复役 U3b；注册文件=
 * 本文件——LG-04 的 registry file=LineageSidePanel.tsx，头注链在本文件；
 * 本段=LG-06 链声明，LG-04 头链不动）**。本单改造：anchor 分支 locateAnchor
 * 之前，req.aiNoteId
 * 有值时先发 notifyAiNoteHighlight（复用 AI-09 全套语义：OutlineAside 订阅
 * aiNoteHighlight 持久 state 切 'notes' tab+列表滚动高亮——tab 未开/loading
 * 期间早发不丢失，挂载后效应补切；信号全局单值同 AI-09 既有语义）。
 * 无锚/无 aiNoteId/annotationId 路径零触碰（标注高亮走 noteHighlight 信号，
 * 其生产者链不动——notify 是呈现信号非定位降级，不违 INV-20「禁各写降级」）。
 * 票面=scripts/audits/sr2-lg-06-brief.md。
 */
import { locateAnchor } from './anchor-locate'
import { useReaderStore } from './reader.store'
import { showToast } from '../../shared/ui/toast-store'
import type { OpenPaperRequest } from '../../shared/open-paper-bus'

export function openFromBus(req: OpenPaperRequest): void {
  if (req.anchor !== undefined) {
    // LG-06：面板信号先于定位发（持久 state 非瞬态——早发不丢）
    if (req.aiNoteId !== undefined) useReaderStore.getState().notifyAiNoteHighlight(req.aiNoteId)
    void locateAnchor({ paperId: req.paperId, anchor: req.anchor, aiNoteId: req.aiNoteId })
    return
  }
  useReaderStore
    .getState()
    .openPaper(req.paperId)
    .catch((e: unknown) => {
      showToast(e instanceof Error ? e.message : '打开文献失败', 'error')
    })
}
