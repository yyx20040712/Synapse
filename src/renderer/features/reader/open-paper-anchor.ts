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
 */
import { locateAnchor } from './anchor-locate'
import { useReaderStore } from './reader.store'
import { showToast } from '../../shared/ui/toast-store'
import type { OpenPaperRequest } from '../../shared/open-paper-bus'

export function openFromBus(req: OpenPaperRequest): void {
  if (req.anchor !== undefined) {
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
