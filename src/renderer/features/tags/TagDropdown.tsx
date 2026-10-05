/**
 * [F-UIRES-01 批 A U3→批 tagrows→F-UIRES-03 B1 2026-10-05] TagDropdown ——
 * 标签筛选下拉（B1 批改版；样式=tag-dropdown.css）。注入链 FilterBar→
 * LibraryPage 不变；数据自取 tags.store（挂载 refresh——单一数据源）。
 *
 * ── 行为层 ──
 * - 钮=「标签 ▾」：idle 灰；有选集 accent+「×N」mono 计数；点击开/关面板
 * - 面板 240px：头（[全选框三态+「全选」]…[「删除」danger 钮（零勾选禁用）]
 *   ——「已选 N」随 B1 退役）/列表（行拆件 TagDropdownRow：chip 常态+「编辑」
 *   钮唯一编辑入口；max-height 320px 滚动）/脚（「清空已选」——说明行退役）
 * - 勾选集=筛选集（勾选即筛选语义不变）；全选框 toggle 全部标签筛选选中
 *   （超 TAG_FILTER_MAX 钳前 N+info toast——P7X-01 沿全选路径保持）
 * - 删除链（B1 新增）：拆件 TagDeleteConfirm（确认窗列名+逐个 delete+
 *   INV-53 顺序+S6 失败保持开——见该件头注）
 * - toggle 即时生效（P7E-06 语义零变——面板保持开）；关闭触发=Esc/外点/
 *   钮二次点；Esc 层级=确认窗（Dialog 底座自有监听）→行编辑态→面板
 * - 死 id 顺序契约（INV-53）：消失 id∈selectedTagIds 时先 onFilterChange
 *   (剔除后剩余) 后 onMutated()
 * - [F-TAGS-01] 色映射通道：tags 变化即重建 name→color Map 上抛（回调须
 *   稳定引用）；空标签库=面板内引导文案
 *
 * ── 接口层 ──
 * - export function TagDropdown(props: { selectedTagIds: string[];
 *     onFilterChange(ids: string[]): void; onMutated?: () => void;
 *     onColorMapChange?: (map: ReadonlyMap<string, string | null>) => void })
 *
 * ── 测试 ──
 * - tests/unit/renderer/tag-dropdown（面板/全选/编辑钮链）/ tag-dropdown-delete
 *   （删除链+INV-53 顺序——[RR1] 拆件）/ tag-dropdown-row / tag-name-maxlength
 */
import { useEffect, useRef, useState } from 'react'
import { TAG_FILTER_MAX } from '@shared/models/paper'
import { showToast } from '../../shared/ui/Toast'
import { useTagsStore, type TagWithCount } from './tags.store'
import { TagDropdownRow } from './TagDropdownRow'
import { TagDeleteConfirm } from './TagDeleteConfirm'
import { type MutatedPayload } from './TagLifecycle'
import './tag-dropdown.css'

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
  // 行编辑态宿主记账（行间互斥——同时刻至多一行编辑）
  const [editingId, setEditingId] = useState<string | null>(null)
  // 删除确认窗：待删 id 清单（null=关；窗体清单随 store 链式 refresh 自愈）
  const [confirming, setConfirming] = useState<string[] | null>(null)

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

  // Esc 层级（单监听分流）：删除确认窗开→让位 Dialog 底座自有监听（busy 守卫
  // 承载）；行编辑态开→先退编辑态；否则关面板（unmount 成对清理）
  useEffect(() => {
    if (!open) return
    const onKeyDown = (e: KeyboardEvent): void => {
      if (e.key !== 'Escape') return
      if (confirming !== null) return
      if (editingId !== null) {
        setEditingId(null)
        return
      }
      setOpen(false)
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open, editingId, confirming])

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

  const checkedTags = tags.filter((t) => selectedTagIds.includes(t.id))
  const hasChecked = checkedTags.length > 0
  const selectAllState: 'false' | 'true' | 'mixed' = !hasChecked
    ? 'false'
    : checkedTags.length === tags.length
      ? 'true'
      : 'mixed'

  function toggleAll(): void {
    const ids = tags.map((t) => t.id)
    // 全选态点击=清空（[RR1-W2] 含钳制满选：>TAG_FILTER_MAX 标签下 20/21 为
    // 恒 mixed、true 不可达——钳制满选点击若再走钳制分支=同载荷+重复 toast
    // 的死局；清空使控件恒有前进路径：false→钳 N 全选/mixed 未满→补满/
    // mixed 钳制满→清空/true→清空）
    if (checkedTags.length === tags.length || checkedTags.length >= TAG_FILTER_MAX) {
      onFilterChange([])
      return
    }
    // 全选路径上界守卫（P7X-01 语义保持）：超上限钳前 N+info toast
    if (ids.length > TAG_FILTER_MAX) {
      showToast(`最多同时筛选 ${TAG_FILTER_MAX} 个标签`, 'info')
      onFilterChange(ids.slice(0, TAG_FILTER_MAX))
      return
    }
    onFilterChange(ids)
  }

  function closePanel(): void {
    setEditingId(null)
    setOpen(false)
  }

  // 确认窗清单=待删 id ∩ 现存 tags（store 链式 refresh 后已删者自愈消失）
  const deleteTargets = confirming === null ? [] : tags.filter((t) => confirming.includes(t.id))

  return (
    <span className="lib-dd">
      <button
        type="button"
        className={`lib-dd-btn${hasChecked ? ' lib-dd-btn-on' : ''}`}
        aria-haspopup="true"
        aria-expanded={open}
        onClick={() => {
          if (open) {
            closePanel()
          } else {
            setOpen(true)
          }
        }}
      >
        标签
        <svg aria-hidden="true" viewBox="0 0 24 24">
          <path d={open ? 'M6 15l6-6 6 6' : 'M6 9l6 6 6-6'} />
        </svg>
        {hasChecked && <span className="lib-dd-btn-n">{`×${checkedTags.length}`}</span>}
      </button>
      {open && (
        <>
          <div className="lib-dd-veil" onClick={closePanel} />
          <div className="lib-dd-panel" role="group" aria-label="标签筛选面板">
            <div className="lib-dd-head">
              <span className="lib-dd-head-l">
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={selectAllState}
                  aria-label="全选"
                  className="lib-dd-cb"
                  disabled={tags.length === 0}
                  onClick={toggleAll}
                />
                <span className="lib-dd-head-t">全选</span>
              </span>
              <button
                type="button"
                className="lib-dd-del"
                aria-label="删除已选标签"
                disabled={!hasChecked}
                onClick={() => setConfirming(checkedTags.map((t) => t.id))}
              >
                删除
              </button>
            </div>
            {tags.length === 0 ? (
              <div className="lib-dd-empty">暂无标签可筛选（在详情侧栏为文献打标签）</div>
            ) : (
              <div className="lib-dd-list">
                {tags.map((t) => (
                  <TagDropdownRow
                    key={t.id}
                    tag={t}
                    checked={selectedTagIds.includes(t.id)}
                    editing={editingId === t.id}
                    onToggle={() => toggleTag(t)}
                    onStartEdit={() => setEditingId(t.id)}
                    onEndEdit={() => {
                      if (editingId === t.id) setEditingId(null)
                    }}
                    onMutated={() => handleMutated(null)}
                  />
                ))}
                <div className="lib-dd-fade" aria-hidden="true" />
              </div>
            )}
            <div className="lib-dd-foot">
              <button type="button" className="lib-dd-clr" onClick={() => onFilterChange([])}>
                清空已选
              </button>
            </div>
          </div>
        </>
      )}

      {confirming !== null && (
        <TagDeleteConfirm
          targets={deleteTargets}
          selectedTagIds={selectedTagIds}
          onFilterChange={onFilterChange}
          onMutated={onMutated}
          onClose={() => setConfirming(null)}
        />
      )}
    </span>
  )
}
