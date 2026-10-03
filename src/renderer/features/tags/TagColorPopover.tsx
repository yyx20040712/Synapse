/**
 * [批 tagrows 2026-10-03] TagColorPopover —— 标签下拉行内小色板（行颜色框
 * 点击弹出；TagDropdown 承载，宿主状态 colorEdit）。票面：点击颜色框→行内
 * 小色板弹出（复用既有色板数据 TAG_COLOR_PRESETS）→点色=保存（走既有
 * tags.store setTagColor 通道）；Esc/点外=关闭不改。
 *
 * ── 行为层 ──
 * - 点色=立即保存（预设 8 swatch；「恢复默认」=null 路——INV-86 色身份全编辑
 *   面对等，对话框通道另存）；保存成功经 props.onSaved 上抛（宿主关色板+
 *   handleMutated(null)——id 稳定）。
 * - Esc/点外（透明遮罩）=关闭零写；busy 飞行中禁关（N1 同型——requestClose
 *   守卫）；失败 toast+色板保持开（S6 同型）。
 * - Esc 自有 document 监听（busy 守卫承载）——TagDropdown 面板级 Esc 分流对
 *   本面让位（色板开时面板不吃 Esc，TagRowMenu 先例形态）。
 * - 锚点=颜色框点击坐标，右缘对齐色板（面板居窗右侧，左向展开防溢出），
 *   左缘 8px 下限钳制（窄窗自察）。
 *
 * ── 接口层 ──
 * - export function TagColorPopover(props: { tag: TagWithCount; anchor:
 *     { x: number; y: number }; onClose(): void; onSaved(): void }): JSX.Element
 */
import { useEffect } from 'react'
import { TAG_COLOR_PRESETS } from '@shared/constants'
import { showToast } from '../../shared/ui/Toast'
import { useTagsStore, type TagWithCount } from './tags.store'
import { useBusyGuard } from './TagLifecycle'

const POPOVER_WIDTH = 200

export function TagColorPopover(props: {
  tag: TagWithCount
  anchor: { x: number; y: number }
  onClose(): void
  /** 保存成功上抛（宿主关色板+onMutated 链） */
  onSaved(): void
}): JSX.Element {
  const { tag } = props
  const guard = useBusyGuard()
  const setTagColor = useTagsStore((s) => s.setTagColor)

  // Esc 关闭（busy 守卫——N1 飞行中 no-op）；unmount 成对清理
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') guard.requestClose(props.onClose)
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [guard, props.onClose])

  async function pick(color: string | null): Promise<void> {
    if (!guard.begin()) return
    const r = await setTagColor(tag.id, color)
    if (r.ok) {
      guard.end()
      props.onSaved()
    } else {
      showToast(r.error.message, 'error')
      guard.end()
    }
  }

  return (
    <>
      {/* 透明遮罩：点击任意处关闭零写（busy 飞行中 no-op）；只关色板不关面板 */}
      <div className="lib-dd-pop-veil" onClick={() => guard.requestClose(props.onClose)} />
      <div
        className="lib-dd-pop"
        role="group"
        aria-label={`标签颜色：${tag.name}`}
        style={{
          left: Math.max(8, props.anchor.x - POPOVER_WIDTH - 4),
          top: props.anchor.y + 6
        }}
      >
        {TAG_COLOR_PRESETS.map((c) => (
          <button
            key={c}
            type="button"
            aria-label={`预设颜色 ${c}`}
            className="lib-dd-pop-sw"
            style={{ background: c }}
            disabled={guard.busy}
            onClick={() => void pick(c)}
          />
        ))}
        <button
          type="button"
          aria-label="恢复默认"
          className="lib-dd-pop-reset"
          disabled={guard.busy}
          onClick={() => void pick(null)}
        >
          恢复默认
        </button>
      </div>
    </>
  )
}
