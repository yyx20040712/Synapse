// b3: B5 wave C
/**
 * [B5 设计稿 §2.3/§3.1/§4.2/§10.2——wave C 2026-11-25] LineageZoomControls —— 工具栏缩放组
 * （缩放 − / 百分比复位 / +）。
 *
 * ── 行为层 ──
 * - 直读 view.store 的 zoom/zoomStep/resetZoom（缩放机制本体=timeline-zoom-hook：ctrl+滚轮、
 *   transform scale、spacer——零改）。
 * - 百分比复位钮：testid=zoom-badge（原右下角缩放角标件迁入工具栏，滚动补偿随删）；文本=纯 `N%`
 *   （原「N% ▾」）；点击=复位 100%；100% 处仍可点击（等效 no-op）。
 * - 减/加钮：testid=lineage-zoom-out／lineage-zoom-in；步进 10%；到 50%／200% 禁用。
 * - 可用性（§2.3）：三模式同一判据——图 ready 可用，graph loading/error 禁用三钮。
 *
 * ── 接口层 ── export function LineageZoomControls(): JSX.Element
 *
 * ── 架构层 ── 直连 view.store（工具态同型——LineageModeBar）+lineage.store 图状态单值订阅；零 props。
 */
import { ICON_PLUS } from '../../shared/icons'
import { useLineageStore } from './lineage.store'
import { useLineageViewStore } from './lineage-view.store'

/** 百分比复位钮悬停提示（沿承原角标 title——受锁锚） */
const RESET_TITLE = '复位缩放到 100%'
/** 步进域的百分比边界（lineage-view.store zoomStep 钳 5–20 档=50%–200%）——与百分比文本同口径判边界 */
const PERCENT_MIN = 50
const PERCENT_MAX = 200

/** 减号图标（与 ICON_PLUS 同规格：24×24 描边简笔画——icons.tsx 无减号常量，本件自持、不扩共享词表） */
function MinusIcon(): JSX.Element {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M5 12h14" />
    </svg>
  )
}

export function LineageZoomControls(): JSX.Element {
  const zoom = useLineageViewStore((s) => s.zoom)
  const zoomStep = useLineageViewStore((s) => s.zoomStep)
  const resetZoom = useLineageViewStore((s) => s.resetZoom)
  const graphReady = useLineageStore((s) => s.status === 'ready')
  const percent = Math.round(zoom * 100)
  return (
    <span className="lg-zoom" data-testid="lineage-zoom">
      <button
        type="button"
        className="lg-btn ghost syn-icon-btn"
        data-testid="lineage-zoom-out"
        disabled={!graphReady || percent <= PERCENT_MIN}
        title="缩小"
        aria-label="缩小"
        onClick={() => zoomStep(-1)}
      >
        <MinusIcon />
        <span className="sr-only">缩小</span>
      </button>
      <button
        type="button"
        className="lg-btn ghost lg-zoom-percent"
        data-testid="zoom-badge"
        disabled={!graphReady}
        title={RESET_TITLE}
        aria-label={RESET_TITLE}
        onClick={resetZoom}
      >
        {`${percent}%`}
      </button>
      <button
        type="button"
        className="lg-btn ghost syn-icon-btn"
        data-testid="lineage-zoom-in"
        disabled={!graphReady || percent >= PERCENT_MAX}
        title="放大"
        aria-label="放大"
        onClick={() => zoomStep(1)}
      >
        {ICON_PLUS}
        <span className="sr-only">放大</span>
      </button>
    </span>
  )
}
