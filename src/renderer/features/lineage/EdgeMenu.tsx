// b3: P7-H
/**
 * [F-LGRAPH-01②U5] EdgeMenu —— 调线右键菜单（mockup §3.6：标题行=目标标识
 * 「线「名」● 命中」/「顶点 #N（方柄）● 命中」+二轮批复④ 按下即高亮配套）。
 *
 * - 线身菜单：命名（行内输入——边级独立改名 P-14）/线形与颜色（实虚×6 色
 *   ——复用 LINE_TYPE_COLORS 色板数据）/重置走线（清 via 回自动）/删除连线。
 * - 顶点菜单：删除顶点（共线直删/真拐点 L 重连——edge-edit 代数）。
 * - 画布空白菜单：添加节点…（edit 态建卡入口——菜单项自裁申报）。
 * - 关闭（Esc/点外部/执行项）即撤高亮=onClose（宿主联动 selected 撤销）。
 */
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { LINE_TYPE_COLORS } from '@shared/models/lineage'
import { MENU_ITEM_STYLE } from '../../shared/ui-constants'

export type EdgeMenuTarget =
  | { kind: 'edge'; edgeId: string; label: string; x: number; y: number; transient?: boolean }
  | { kind: 'vertex'; edgeId: string; idx: number; x: number; y: number }
  | { kind: 'canvas'; x: number; y: number }

/** 菜宽（w-44=176px——钳制右缘用） */
const MENU_W = 176

/** [回炉 R19] 视口钳制（MonthPop clampPopoverPos 先例）：left=clamp(6,cx,vw−w−6)
 *  /top=clamp(6,cy,vh−h−10)，h=实测菜单高 */
function clampMenuPos(cx: number, cy: number, h: number): { left: number; top: number } {
  const left = Math.max(6, Math.min(cx, window.innerWidth - MENU_W - 6))
  const top = Math.max(6, Math.min(cy, window.innerHeight - h - 10))
  return { left, top }
}

export function EdgeMenu(props: {
  target: EdgeMenuTarget
  /** 线形现值（行指示） */
  dashed: boolean
  color: string
  onRename(label: string): void
  onLineStyle(dashed: boolean, color: string): void
  onReset(): void
  onDelete(): void
  onDeleteVertex(): void
  onAddNode(): void
  onClose(): void
}): JSX.Element {
  const [renaming, setRenaming] = useState(false)
  const [draft, setDraft] = useState(props.target.kind === 'edge' ? props.target.label : '')
  const rootRef = useRef<HTMLDivElement | null>(null)
  // [回炉 R12] IME 守卫（INV-85 全域必备）：组词期 Enter/确定不提交
  const composingRef = useRef(false)
  const renameInputRef = useRef<HTMLInputElement | null>(null)
  // [回炉 R19] 视口钳制：首帧按锚点直落（h=0 估）→ layout 后按实测高复钳
  const [pos, setPos] = useState<{ left: number; top: number }>(() => clampMenuPos(props.target.x, props.target.y, 0))
  useLayoutEffect(() => {
    const h = rootRef.current?.offsetHeight ?? 0
    setPos(clampMenuPos(props.target.x, props.target.y, h))
  }, [props.target.x, props.target.y])

  // Esc 关闭+点外部关闭（菜单轻量面——与节点菜单同族）
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') props.onClose()
    }
    const onDoc = (e: MouseEvent): void => {
      if (rootRef.current !== null && e.target instanceof Node && rootRef.current.contains(e.target)) return
      props.onClose()
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('click', onDoc)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('click', onDoc)
    }
  }, [props])

  const act = (fn: () => void): void => {
    props.onClose()
    fn()
  }
  const t = props.target
  const title =
    t.kind === 'edge'
      ? `线「${t.label}」● 命中`
      : t.kind === 'vertex'
        ? `顶点 #${t.idx + 1}（方柄）● 命中`
        : '画布 ● 空白'

  return (
    <div
      data-testid="edge-menu"
      role="menu"
      aria-label="调线菜单"
      ref={rootRef}
      className="fixed z-(--z-pop) w-44 rounded border py-1 shadow-lg"
      style={{ left: pos.left, top: pos.top, background: 'var(--panel)', borderColor: 'var(--border)' }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="px-3 py-1 text-[10px] tracking-wide" style={{ color: 'var(--faint)' }} data-testid="edge-menu-title">
        {title}
      </div>
      {t.kind === 'edge' && (
        <>
          {renaming ? (
            <div className="flex items-center gap-1 px-2 py-1">
              <input
                data-testid="edge-rename-input"
                className="min-w-0 flex-1 rounded border px-1 text-xs"
                style={{ borderColor: 'var(--accent)' }}
                value={draft}
                autoFocus
                ref={renameInputRef}
                onChange={(e) => setDraft(e.target.value)}
                onCompositionStart={() => {
                  composingRef.current = true
                }}
                onCompositionEnd={() => {
                  composingRef.current = false
                  // 序 B 补提交（组词被失焦打断——INV-85⑥ 同型）：定案文本取
                  // DOM 当前值；聚焦态常规组词确认不自动提交
                  if (document.activeElement !== renameInputRef.current) {
                    act(() => props.onRename((renameInputRef.current?.value ?? draft).trim()))
                  }
                }}
                onKeyDown={(e) => {
                  // IME 组词确认回车不提交（nativeEvent.isComposing）
                  if (e.nativeEvent.isComposing) return
                  if (e.key === 'Enter') act(() => props.onRename(draft.trim()))
                  if (e.key === 'Escape') props.onClose()
                }}
              />
              <button
                type="button"
                className="text-xs"
                style={{ color: 'var(--accent)' }}
                // [RR9] INV-85④ 范式（TagEditor/LineTypeMenu 镜像）：mousedown
                // preventDefault 拒点击夺焦——防组词期 blur 触发 compositionend
                // 补提交与 click 守卫的双提交竞逐（click 单路提交）
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  if (composingRef.current) return // 组词期不提交（与 Enter/blur 同守卫）
                  act(() => props.onRename(draft.trim()))
                }}
              >
                确定
              </button>
            </div>
          ) : (
            <button type="button" role="menuitem" className={MENU_ITEM_STYLE} style={{ color: 'var(--text)' }} onClick={() => setRenaming(true)}>
              命名
            </button>
          )}
          {/* 线形与颜色：实/虚两行×6 色板（当前值描边指示——复用工具组色板数据） */}
          <div className="px-3 py-1 text-[10px]" style={{ color: 'var(--faint)' }}>
            线形与颜色
          </div>
          {[false, true].map((dashedRow) => (
            <div className="flex items-center gap-1.5 px-3 py-0.5" key={String(dashedRow)}>
              <span className="w-6 text-[10px]" style={{ color: 'var(--text-dim)' }}>
                {dashedRow ? '虚线' : '实线'}
              </span>
              {LINE_TYPE_COLORS.map((c) => {
                const on = props.dashed === dashedRow && props.color === c
                return (
                  <button
                    type="button"
                    key={c}
                    aria-label={`${dashedRow ? '虚线' : '实线'} ${c}`}
                    className="edge-color-dot"
                    style={{
                      background: c,
                      width: on ? 13 : 10,
                      height: on ? 13 : 10,
                      borderRadius: 3,
                      border: on ? '1.5px solid var(--accent)' : '1px solid var(--line)'
                    }}
                    onClick={() => act(() => props.onLineStyle(dashedRow, c))}
                  />
                )
              })}
            </div>
          ))}
          <button type="button" role="menuitem" className={MENU_ITEM_STYLE} style={{ color: 'var(--text)' }} onClick={() => act(props.onReset)}>
            重置走线
          </button>
          <button type="button" role="menuitem" className={MENU_ITEM_STYLE} style={{ color: 'var(--danger)' }} onClick={() => act(props.onDelete)}>
            删除连线
          </button>
        </>
      )}
      {t.kind === 'vertex' && (
        <button
          type="button"
          role="menuitem"
          className={MENU_ITEM_STYLE}
          style={{ color: 'var(--danger)' }}
          onClick={() => act(props.onDeleteVertex)}
        >
          删除顶点
        </button>
      )}
      {t.kind === 'canvas' && (
        <button type="button" role="menuitem" className={MENU_ITEM_STYLE} style={{ color: 'var(--text)' }} onClick={() => act(props.onAddNode)}>
          添加节点…
        </button>
      )}
    </div>
  )
}
