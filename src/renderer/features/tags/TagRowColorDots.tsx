/**
 * [F-UIRES-03 B1→F-DBCAMP-01 DB-4 拆件] TagRowColorDots —— 标签编辑态色点阵
 * （TagDropdownRow 组件 250 行红线拆件；形态零变：TAG_COLOR_PRESETS 8 圆点
 * +「默认」点=null——原 TagColorPopover「恢复默认」行为承接〔F6+N10〕）。
 */
import { TAG_COLOR_PRESETS } from '@shared/constants'

export function TagRowColorDots(props: {
  name: string
  color: string | null
  busy: boolean
  onPick(color: string | null): void
}): JSX.Element {
  const { name, color, busy } = props
  return (
    <div className="lib-dd-dots" role="group" aria-label={`标签颜色：${name}`}>
      {TAG_COLOR_PRESETS.map((c) => (
        <button
          key={c}
          type="button"
          aria-label={`预设颜色 ${c}`}
          aria-pressed={color === c}
          className="lib-dd-sw"
          style={{ background: c }}
          disabled={busy}
          onClick={() => props.onPick(c)}
        />
      ))}
      <button
        type="button"
        aria-label="默认"
        aria-pressed={color === null}
        className="lib-dd-sw lib-dd-sw-def"
        disabled={busy}
        onClick={() => props.onPick(null)}
      />
    </div>
  )
}
