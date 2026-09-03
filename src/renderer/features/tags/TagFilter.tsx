/**
 * [SR-TAG-02] TagFilter —— 标签筛选器（工单：done / weak + P7E-01 + P7E-06）
 *
 * ── 行为层 ──
 * - 多选 chip 列表（数据 tags.store：{id,name,paperCount}）
 * - 选中态变化 → props.onFilterChange(ids)（P7E-06 多选 v2 已兑现——v1 单选
 *   预留注记（TagFilter.tsx:6「多选 v2」）本票落地；AND 交集语义在 SQL 层
 *   （buildFilters 逐标签 EXISTS），空数组=清除全部选中）
 * - 管理面（P7E-01）：chip 右键 → 菜单（重命名/合并到…/删除）→ 三对话框
 *   （TagLifecycle 拆件承载）；变更成功经 onMutated 上抛（FilterBar 注入
 *   library load——跨域互引红线合规路径，白名单既有）
 *
 * ── 接口层 ──
 * - export function TagFilter(props: { selectedTagIds: string[];
 *     onFilterChange(ids: string[]): void;
 *     onMutated?: () => void }): JSX.Element
 *
 * ── 架构层 ──
 * - 数据自取：tags.store（挂载 refresh——行为层的"数据 tags.store"为准，建议/
 *   筛选共享单一数据源）；纯展示交互，自身不发其他请求
 * - 死 id 筛选剔除顺序（S2/S3）：变更涉及消失 id 且∈selectedTagIds 时，先
 *   onFilterChange(剔除后剩余)（setQuery 清 tagIds→library 自动重载；剔除非
 *   全清——其余选中项保持有效过滤，INV-53 多选适配）后 onMutated()
 *   ——顺序反了=死标签 id 查询空列表窗（INV-53）
 *
 * ── 生命周期层 ── / ── 文化层 ──
 * - 空标签库显示引导文案（先在详情侧栏打标签）
 * - 测试：tests/unit/renderer/tag-lifecycle-ui.test.tsx（P7E-01）
 *   +tests/unit/renderer/tag-filter-multi.test.tsx（P7E-06，均 always-active）
 */
import { useEffect, useRef, useState } from 'react'
import { showToast } from '../../shared/ui/Toast'
import { useTagsStore, type TagWithCount } from './tags.store'
import { TagLifecycleMenu } from './TagLifecycleMenu'
import { TagRenameDialog, TagMergeDialog, TagDeleteDialog } from './TagLifecycle'

/** 管理面局部态：右键锚点菜单 / 打开中的对话框（同时刻至多一个） */
interface MenuState {
  tag: TagWithCount
  anchor: { x: number; y: number }
}
interface DialogState {
  kind: 'rename' | 'merge' | 'delete'
  tag: TagWithCount
}

export function TagFilter(props: {
  selectedTagIds: string[]
  onFilterChange: (ids: string[]) => void
  onMutated?: () => void
}): JSX.Element {
  const { selectedTagIds, onFilterChange, onMutated } = props
  const tags = useTagsStore((s) => s.tags)
  const refresh = useTagsStore((s) => s.refresh)
  const listError = useTagsStore((s) => s.error)
  const [menu, setMenu] = useState<MenuState | null>(null)
  const [dialog, setDialog] = useState<DialogState | null>(null)

  useEffect(() => {
    void refresh()
  }, [refresh])
  // 列表型失败经 store.error 暴露，在此 toast（与 TagEditor 同口径）。迁移守卫：
  // 挂载时已残留的旧失败不重播（本次挂载已触发新 refresh），仅"挂载期间
  // null→失败"的转变才 toast——重挂载不再对历史失败刷屏
  const seenError = useRef(listError)
  useEffect(() => {
    if (listError !== seenError.current) {
      seenError.current = listError
      if (listError !== null) {
        showToast(`标签列表刷新失败：${listError}`, 'error')
      }
    }
  }, [listError])

  /**
   * 生命周期变更成功上抛（S2/S3/S4/S5 顺序契约）：disappearedId=null（rename）
   * 或稳定 id（合并目标选中）→筛选不动；消失 id∈selectedTagIds→先
   * onFilterChange(剔除后剩余)（剔除非全清——其余选中项保持；空集→UI 层
   * 收敛 undefined→全列表自然回退），后 onMutated()。
   */
  function handleMutated(disappearedId: string | null): void {
    if (disappearedId !== null && selectedTagIds.includes(disappearedId)) {
      onFilterChange(selectedTagIds.filter((id) => id !== disappearedId))
    }
    onMutated?.()
  }

  if (tags.length === 0) {
    return (
      <span className="text-xs" style={{ color: 'var(--text-dim)' }}>
        暂无标签可筛选（在详情侧栏为文献打标签）
      </span>
    )
  }
  return (
    <div className="flex flex-wrap items-center gap-1" role="group" aria-label="标签筛选">
      {tags.map((t) => {
        const active = selectedTagIds.includes(t.id)
        return (
          <button
            key={t.id}
            type="button"
            aria-pressed={active}
            className="rounded-full border px-2 py-0.5 text-xs"
            style={{
              borderColor: active ? 'var(--accent)' : 'var(--border)',
              background: active ? 'var(--accent-soft)' : 'var(--panel)',
              color: active ? 'var(--accent)' : 'var(--text)'
            }}
            onClick={() =>
              onFilterChange(
                active ? selectedTagIds.filter((id) => id !== t.id) : [...selectedTagIds, t.id]
              )
            }
            onContextMenu={(e) => {
              e.preventDefault()
              setMenu({ tag: t, anchor: { x: e.clientX, y: e.clientY } })
            }}
          >
            {t.name}（{t.paperCount}）
          </button>
        )
      })}

      {menu !== null && (
        <TagLifecycleMenu
          tag={menu.tag}
          canMerge={tags.length > 1}
          anchor={menu.anchor}
          onClose={() => setMenu(null)}
          onRename={(tag) => {
            setDialog({ kind: 'rename', tag })
            setMenu(null)
          }}
          onMerge={(tag) => {
            setDialog({ kind: 'merge', tag })
            setMenu(null)
          }}
          onDelete={(tag) => {
            setDialog({ kind: 'delete', tag })
            setMenu(null)
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
      {dialog?.kind === 'merge' && (
        <TagMergeDialog
          key={dialog.tag.id}
          source={dialog.tag}
          targets={tags.filter((t) => t.id !== dialog.tag.id)}
          onClose={() => setDialog(null)}
          onMutated={handleMutated}
        />
      )}
      {dialog?.kind === 'delete' && (
        <TagDeleteDialog
          key={dialog.tag.id}
          tag={dialog.tag}
          onClose={() => setDialog(null)}
          onMutated={handleMutated}
        />
      )}
    </div>
  )
}
