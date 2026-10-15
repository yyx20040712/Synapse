/**
 * [F-UIRES-04 批 3c] DrKeyVals —— 抽屉键值行拆件（YEAR-MO/VENUE/DOI 三行
 * 行为零变搬移自宿主——批 3c 重排压降宿主行数；idBadge 短号留宿主头区）。
 *
 * ── 行为层 ──
 * - YEAR-MO 值四分支（[F-UIRES-03 B4②] 语义逐字零变）：无脉络=年份单值；
 *   命中=「2023（脉络框：2023-06）」month 补零/month null=仅年段/
 *   lineage.year null=「未定年」+月段省略。
 * - VENUE 空串=「—」；IF 灰字段随期刊名（[F-FOLDER-02·D] 色档与主值分离）；
 *   DOI null=「—」非空=link 色。
 *
 * ── 接口层 ──
 * - export function DrKeyVals(props: { detail: PaperDetail }): JSX.Element（纯展示拆件——.lib-fld 皮肤 DOM 锚不变）
 */
import type { PaperDetail } from '@shared/models/paper'

/** YEAR-MO 值四分支（搬移零变——口径见头注行为层） */
function yearMoText(detail: PaperDetail): string {
  const y = detail.year === null ? '—' : String(detail.year)
  if (detail.lineage === undefined) return y
  const ly = detail.lineage.year === null ? '未定年' : String(detail.lineage.year)
  const mo =
    detail.lineage.year === null || detail.lineage.month === null
      ? ''
      : `-${String(detail.lineage.month).padStart(2, '0')}`
  return `${y}（脉络框：${ly}${mo}）`
}

export function DrKeyVals(props: { detail: PaperDetail }): JSX.Element {
  const { detail } = props
  return (
    <>
      <div className="lib-fld">
        <span className="lib-fld-k">YEAR-MO</span>
        <span className="lib-fld-v">{yearMoText(detail)}</span>
      </div>
      <div className="lib-fld">
        <span className="lib-fld-k">VENUE</span>
        <span className="lib-fld-v">
          {detail.venue === '' ? '—' : detail.venue}
          {/* [F-FOLDER-02·D] IF 灰字随期刊名显示（D1 手动字段——色档与主值分离） */}
          {detail.impactFactor !== null && (
            <span style={{ color: 'var(--text-dim)' }}>{` · IF ${detail.impactFactor}`}</span>
          )}
        </span>
      </div>
      <div className="lib-fld">
        <span className="lib-fld-k">DOI</span>
        <span className={`lib-fld-v${detail.doi !== null ? ' link' : ''}`}>
          {detail.doi ?? '—'}
        </span>
      </div>
    </>
  )
}
