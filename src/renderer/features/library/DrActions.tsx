/**
 * [T3-P3] DrActions —— 规格表抽屉动作区（PaperDetailPanel 250 行红线拆件）。
 *
 * ── 行为层 ──
 * - 九动作全保、按钮文本零改（受锁 paper-detail-export/clip/cited/notes-off
 *   断言面）：「去阅读器写笔记」=primary（accent 底白字——F-LIBUI-01 ⑥ 起
 *   首行跨两列，经 open-paper-bus 切阅读器），其余八钮=ghost 语汇（line 描边
 *   dim 字 8px 圆角）；DOI 钮仅在有 DOI 时在场（既有条件渲染不变）
 * - busy 门语义沿 hook（usePaperDetailActions）：enrich 独占 enriching、
 *   三导出（报告/BibTeX/语料 md）+两复制共享 exporting——组件面只挂 disabled
 *
 * ── 接口层 ──
 * - export function DrActions(props: { detail: PaperDetail; enriching: boolean;
 *     exporting: boolean; onEdit(): void;
 *     runAction(action: PaperDetailAction): void }): JSX.Element
 *
 * ── 架构层 ── / ── 生命周期层 ── / ── 文化层 ──
 * - 纯表现（动作逻辑全驻 hook）；皮肤=library.css .lib-dr-btn 族（mockup .btn；
 *   布局=.lib-dr-actions 两列 grid——F-LIBUI-01 ⑥，primary 首行跨两列）
 */
import type { PaperDetail } from '@shared/models/paper'
import type { PaperDetailAction } from './usePaperDetailActions'
import { requestOpenPaper } from '../../shared/open-paper-bus'

/** 已增强且非失败的文献不再提供增强入口（重试请走 failed 态） */
export function enrichStatusDone(status: PaperDetail['enrichStatus']): boolean {
  return status === 'done' || status === 'manual'
}

export function DrActions(props: {
  detail: PaperDetail
  enriching: boolean
  exporting: boolean
  onEdit: () => void
  runAction: (action: PaperDetailAction) => void
}): JSX.Element {
  const { detail, enriching, exporting } = props
  return (
    <div className="lib-dr-actions">
      <button
        type="button"
        className="lib-dr-btn lib-dr-btn-primary"
        onClick={() => requestOpenPaper(detail.id)}
      >
        去阅读器写笔记
      </button>
      <button type="button" className="lib-dr-btn lib-dr-btn-ghost" onClick={props.onEdit}>
        编辑元数据
      </button>
      <button
        type="button"
        className="lib-dr-btn lib-dr-btn-ghost"
        disabled={enriching || enrichStatusDone(detail.enrichStatus)}
        onClick={() => props.runAction('enrich')}
      >
        {enriching ? '增强中…' : '增强元数据'}
      </button>
      <button
        type="button"
        className="lib-dr-btn lib-dr-btn-ghost"
        disabled={exporting}
        onClick={() => props.runAction('report')}
      >
        导出读书报告
      </button>
      <button
        type="button"
        className="lib-dr-btn lib-dr-btn-ghost"
        disabled={exporting}
        onClick={() => props.runAction('bibtex')}
      >
        导出 BibTeX
      </button>
      <button
        type="button"
        className="lib-dr-btn lib-dr-btn-ghost"
        disabled={exporting}
        onClick={() => props.runAction('bibtex-clip')}
      >
        复制 BibTeX
      </button>
      <button
        type="button"
        className="lib-dr-btn lib-dr-btn-ghost"
        disabled={exporting}
        onClick={() => props.runAction('csv-clip')}
      >
        复制 CSV
      </button>
      <button
        type="button"
        className="lib-dr-btn lib-dr-btn-ghost"
        disabled={exporting}
        onClick={() => props.runAction('corpus')}
      >
        导出语料 md
      </button>
      {detail.doi !== null && (
        <button
          type="button"
          className="lib-dr-btn lib-dr-btn-ghost"
          onClick={() => props.runAction('doi')}
        >
          打开 DOI 页
        </button>
      )}
    </div>
  )
}
