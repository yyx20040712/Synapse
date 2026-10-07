// b3: P7-H
/**
 * open-paper-anchor —— 总线打开请求的消费侧定路由（LG-04 接缝落地）。
 *
 * 接缝双向锚定声明（跨视图锚递达，主控裁决路径 A）：本行+LineageSidePanel 头注
 * +open-paper-bus 头注——OPEN_PAPER_EVENT detail 增可选 anchor 字段（bus 载荷
 * 扩），本模块是阅读器侧唯一消费点。
 * - 带 anchor → locateAnchor（INV-20 单入口：打开/等就绪/三防线/exact 层
 *   data-annotation-id 闪烁全归它——tab 未开时其内部自 requestOpenPaper 无锚
 *   重发，不回环）；页级/篇级降级提示也归其内部，本消费点不重复 toast。
 * - 无 anchor → reader.store openPaper 既有链路（失败动作型 toast 保持
 *   ReaderPage 原文案，INV-02）。
 *
 * **[F-UIRES-03 B2] AI 条目标识分支随 AI 双击链退役删除**（侧板跳转源=片段条目
 * 双击——LG-06 时代的「接 AI 面板信号先发高亮通知」前置步随
 * 阅读器左栏 AI 区整删消亡，INV-105；本消费点回归纯定路由——带锚即定位，
 * 无面板信号副作用）。无锚/annotationId 路径零触碰（标注高亮走 noteHighlight
 * 信号，其生产者链不动——notify 是呈现信号非定位降级，不违 INV-20
 * 「禁各写降级」）。
 * **[F-LOCATE-01] anchor.annotationId 透传**：片段锚载荷在场时透传至
 * locateAnchor 的 target 顶层字段（exact 层 flashAnnotation 滚动目标锚——
 * 元素级停驻恢复；缺席则 exact 只完成页级停驻，路径零变迁）。顶层
 * annotationId=唯一消费口径（anchor 内同值字段=载荷形状非消费位——
 * locateAnchor 只读 target.annotationId）。
 */
import { locateAnchor } from './anchor-locate'
import { useReaderStore } from '../state/reader.store'
import { showToast } from '../../../shared/ui/toast-store'
import type { OpenPaperRequest } from '../../../shared/open-paper-bus'

export function openFromBus(req: OpenPaperRequest): void {
  if (req.anchor !== undefined) {
    void locateAnchor({ paperId: req.paperId, anchor: req.anchor, annotationId: req.anchor.annotationId })
    return
  }
  useReaderStore
    .getState()
    .openPaper(req.paperId)
    .catch((e: unknown) => {
      showToast(e instanceof Error ? e.message : '打开文献失败', 'error')
    })
}
