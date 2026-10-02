/**
 * [F-UIRES-01 批 A U3] TagDropdown —— 标签筛选下拉（TagFilter chip 形态全件
 * 退役的承接件，设计稿 §3.3/R6；mockup .tagbtn/.tagmenu 逐值）。全 props 签名
 * 承接 TagFilter：selectedTagIds/onFilterChange/onMutated/onColorMapChange
 * （注入链 FilterBar→LibraryPage 不变）。
 *
 * ── 行为层 ──
 * - 钮=「标签 ▾」：idle 灰；有选集 accent+「×N」mono 计数；点击开/关面板
 * - 面板 240px：头（标签筛选+已选 N）/列表（一行一勾选 role=menuitemcheckbox
 *   aria-checked+色点+mono 计数；8 行滚动+底部渐隐）/脚（共 N 标签+右键提示+
 *   「清空已选」——过渡期计数避开「域」字，全局集事实）
 * - toggle 即时生效（现行 P7E-06 语义零变——面板保持开）
 * - P7X-01 上界守卫：添加方向且选中数 ≥ TAG_FILTER_MAX → 零变更+info toast
 * - 行右键=改名+颜色两入口（P-11 用户终裁；merge/delete UI 入口随批退役
 *   ——IPC 通道与 main 面零触碰）：TagRenameDialog/TagColorDialog 承载
 * - 关闭触发=Esc/外点（.lib-dd-veil 遮罩）/钮二次点；Esc 层级=最上层
 *   弹层先关（行菜单先于面板——单 document 监听按开态分流）
 * - 死 id 顺序契约（INV-53）：变更涉及消失 id 且∈selectedTagIds 时先
 *   onFilterChange(剔除后剩余) 后 onMutated()
 * - [F-TAGS-01] 色映射通道：tags 变化即重建 name→color Map 上抛（回调须稳定
 *   引用——R2 d1'-N5）
 * - 空标签库：面板内引导文案（先在详情侧栏打标签——现行语义形态适配件）
 *
 * ── 接口层 ──
 * - export function TagDropdown(props: { selectedTagIds: string[];
 *     onFilterChange(ids: string[]): void; onMutated?: () => void;
 *     onColorMapChange?: (map: ReadonlyMap<string, string | null>) => void })
 *
 * ── 架构层 ──
 * - 数据自取 tags.store（挂载 refresh——单一数据源）；对话框拆件在
 *   TagLifecycle.tsx/TagColorDialog.tsx（保留件）
 *
 * ── 生命周期层 ── / ── 文化层 ──
 * - 测试：tests/unit/renderer/tag-dropdown.test.tsx + tag-lifecycle-ui.test.tsx
 *   + tag-color-dialog.test.tsx（均 always-active）
 */
import { useEffect, useRef, useState } from 'react'
import { TAG_FILTER_MAX } from '@shared/models/paper'
import { showToast } from '../../shared/ui/Toast'
import { useTagsStore, type TagWithCount } from './tags.store'
import { TagRowMenu } from './TagRowMenu'
import { TagRenameDialog } from './TagLifecycle'
import { TagColorDialog } from './TagColorDialog'
import type { MutatedPayload } from './TagLifecycle'

interface RowMenuState {
  tag: TagWithCount
  anchor: { x: number; y: number }
}

interface DialogState {
  kind: 'rename' | 'color'
  tag: TagWithCount
}

export function TagDropdown(props: {
  selectedTagIds: string[]
  onFilterChange: (ids: string[]) => void
  onMutated?: () => void
  /** name→color 映射上抛（PaperRow 徽标着色数据通道——回调须稳定引用） */
  onColorMapChange?: (map: ReadonlyMap<string, string | null>) => void
}): JSX.Element {
  const { selectedTagIds, onFilterChange, onMutated, onColorMapChange } = props
  const tags = useTagsStore((s) => s.tags)
  const refresh = useTagsStore((s) => s.refresh)
  const listError = useTagsStore((s) => s.error)
  const [open, setOpen] = useState(false)
  const [rowMenu, setRowMenu] = useState<RowMenuState | null>(null)
  const [dialog, setDialog] = useState<DialogState | null>(null)

  useEffect(() => {
    void refresh()
  }, [refresh])
  // 列表型失败 toast（挂载期间 null→失败转变才播——TagFilter 同口径承接）
  const seenError = useRef(listError)
  useEffect(() => {
    if (listError !== seenError.current) {
      seenError.current = listError
      if (listError !== null) {
        showToast(`标签列表刷新失败：${listError}`, 'error')
      }
    }
  }, [listError])

  // 色映射上抛（tags 变化即重建——tags.name UNIQUE 名字键良定义）
  useEffect(() => {
    onColorMapChange?.(new Map(tags.map((t) => [t.name, t.color])))
  }, [tags, onColorMapChange])

  // Esc 层级（单监听分流）：行菜单开→先关行菜单；否则关面板（unmount 成对清理）
  useEffect(() => {
    if (!open) return
    const onKeyDown = (e: KeyboardEvent): void => {
      if (e.key !== 'Escape') return
      if (rowMenu !== null) {
        setRowMenu(null)
        return
      }
      setOpen(false)
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open, rowMenu])

  /** 生命周期变更成功上抛（INV-53 顺序：先剔死 id 后 onMutated） */
  const handleMutated: MutatedPayload = (disappearedId) => {
    if (disappearedId !== null && selectedTagIds.includes(disappearedId)) {
      onFilterChange(selectedTagIds.filter((id) => id !== disappearedId))
    }
    onMutated?.()
  }

  function toggleTag(t: TagWithCount): void {
    const active = selectedTagIds.includes(t.id)
    // P7X-01 添加向上界守卫（移除方向永不设限）
    if (!active && selectedTagIds.length >= TAG_FILTER_MAX) {
      showToast(`最多同时筛选 ${TAG_FILTER_MAX} 个标签`, 'info')
      return
    }
    onFilterChange(
      active ? selectedTagIds.filter((id) => id !== t.id) : [...selectedTagIds, t.id]
    )
  }

  const hasSelection = selectedTagIds.length > 0

  return (
    <span className="lib-dd">
      <button
        type="button"
        className={`lib-dd-btn${hasSelection ? ' lib-dd-btn-on' : ''}`}
        aria-haspopup="true"
        aria-expanded={open}
        onClick={() => {
          if (open) {
            setRowMenu(null)
            setOpen(false)
          } else {
            setOpen(true)
          }
        }}
      >
        标签
        <svg aria-hidden="true" viewBox="0 0 24 24">
          <path d={open ? 'M6 15l6-6 6 6' : 'M6 9l6 6 6-6'} />
        </svg>
        {hasSelection && <span className="lib-dd-btn-n">{`×${selectedTagIds.length}`}</span>}
      </button>
      {open && (
        <>
          <div className="lib-dd-veil" onClick={() => setOpen(false)} />
          <div className="lib-dd-panel" role="menu" aria-label="标签筛选面板">
            <div className="lib-dd-head">
              <span>标签筛选</span>
              <span className="lib-dd-sel">{`已选 ${selectedTagIds.length}`}</span>
            </div>
            {tags.length === 0 ? (
              <div className="lib-dd-empty">暂无标签可筛选（在详情侧栏为文献打标签）</div>
            ) : (
              <div className="lib-dd-list">
                {tags.map((t) => {
                  const on = selectedTagIds.includes(t.id)
                  return (
                    <button
                      key={t.id}
                      type="button"
                      role="menuitemcheckbox"
                      aria-checked={on}
                      className={`lib-dd-row${on ? ' on' : ''}`}
                      onClick={() => toggleTag(t)}
                      onContextMenu={(e) => {
                        e.preventDefault()
                        setRowMenu({ tag: t, anchor: { x: e.clientX, y: e.clientY } })
                      }}
                    >
                      <span className="lib-dd-cb" aria-hidden="true" />
                      <span
                        className="lib-dd-dot"
                        style={t.color !== null ? { background: t.color } : undefined}
                      />
                      <span className="lib-dd-nm">{t.name}</span>
                      <span className="lib-dd-ct">{t.paperCount}</span>
                    </button>
                  )
                })}
                <div className="lib-dd-fade" aria-hidden="true" />
              </div>
            )}
            <div className="lib-dd-foot">
              <span>{`共 ${tags.length} 标签 · 右键行改名/颜色`}</span>
              <button type="button" className="lib-dd-clr" onClick={() => onFilterChange([])}>
                清空已选
              </button>
            </div>
          </div>
        </>
      )}

      {rowMenu !== null && (
        <TagRowMenu
          tag={rowMenu.tag}
          anchor={rowMenu.anchor}
          onClose={() => setRowMenu(null)}
          onRename={(tag) => {
            setDialog({ kind: 'rename', tag })
            setRowMenu(null)
          }}
          onColor={(tag) => {
            setDialog({ kind: 'color', tag })
            setRowMenu(null)
          }}
        />
      )}

      {dialog?.kind === 'rename' && (
        <TagRenameDialog
          key={dialog.tag.id}
          tag={dialog.tag}
          onClose={() => setDialog(null)}
          onMutated={handleMutated}
        />
      )}
      {dialog?.kind === 'color' && (
        <TagColorDialog
          key={dialog.tag.id}
          tag={dialog.tag}
          onClose={() => setDialog(null)}
          onMutated={handleMutated}
        />
      )}
    </span>
  )
}
