/**
 * [F-DBCAMP-01 DB-2 UI U5] MemoryRow —— 记忆行（展示/编辑双形，MemoryTab 拆件）。
 *
 * ── 行为层（设计 §1.4）──
 * - 展示形：置顶钉标「已置顶」+agent 行「代理生成」标+标题+分类+内容；
 *   manual 行三钮（编辑/置顶切换/删除）；agent 行只读无钮（§6 无编辑面）。
 * - 编辑形（editing.id===行 id 时）：分类下拉（值域=当前 scope 档级常量）+
 *   标题+内容+保存/取消；行内错误行内呈现（rowErrors[id]）。
 * - 态机/竞态/错误映射驻 aiMemoryStore（态空间表=该文件头注）；本组件纯
 *   受控消费（含编辑草稿 editing——store 单源，成功清空/失败保留）。
 *
 * ── 接口层 ──
 * - export function MemoryRow(props: { item: AiMemoryListItem }): JSX.Element
 *
 * ── 架构层 ── / ── 生命周期层 ── / ── 文化层 ──
 * - 数据面只经 aiMemoryStore；测试=ai-manage-tabs.test.tsx+e2e E7（随 Tab 面）。
 */
import { AI_MEMORY_CATEGORIES, type AiMemoryListItem } from '@shared/models/ai-domain'
import { useAiMemoryStore } from '../aiMemoryStore'

export function MemoryRow(props: { item: AiMemoryListItem }): JSX.Element {
  const { item: m } = props
  const scope = useAiMemoryStore((s) => s.filters.scope)
  const editing = useAiMemoryStore((s) => s.editing)
  const rowErrors = useAiMemoryStore((s) => s.rowErrors)
  const startEdit = useAiMemoryStore((s) => s.startEdit)
  const setEditDraft = useAiMemoryStore((s) => s.setEditDraft)
  const cancelEdit = useAiMemoryStore((s) => s.cancelEdit)
  const update = useAiMemoryStore((s) => s.update)
  const setPinned = useAiMemoryStore((s) => s.setPinned)
  const remove = useAiMemoryStore((s) => s.remove)
  const updating = useAiMemoryStore((s) => s.updating)
  const isEditing = editing?.id === m.id
  const inputStyle = { borderColor: 'var(--border)', background: 'var(--panel)' }
  const btnStyle = { borderColor: 'var(--border)' }

  return (
    <li
      data-id={m.id}
      data-origin={m.origin}
      className="flex flex-col gap-1 rounded-md border px-2 py-1.5"
      style={{ borderColor: 'var(--border)', background: 'var(--panel)' }}
    >
      {isEditing && editing !== null ? (
        <>
          <div className="flex flex-wrap items-center gap-1.5">
            <select
              aria-label="编辑分类"
              className="syn-input rounded border px-1 py-0.5"
              style={inputStyle}
              value={editing.category}
              onChange={(e) => {
                setEditDraft({ category: e.target.value })
              }}
            >
              {AI_MEMORY_CATEGORIES[scope].map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <input
              aria-label="编辑标题"
              className="syn-input min-w-0 flex-1 rounded border px-1.5 py-0.5"
              style={inputStyle}
              value={editing.title}
              onChange={(e) => {
                setEditDraft({ title: e.target.value })
              }}
            />
          </div>
          <textarea
            aria-label="编辑内容"
            rows={3}
            className="syn-input rounded border px-1.5 py-0.5"
            style={inputStyle}
            value={editing.content}
              onChange={(e) => {
                setEditDraft({ content: e.target.value })
              }}
          />
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              aria-label="保存"
              className="rounded border px-1.5 py-0.5 text-[10px] leading-none"
              // [回炉 R2] 在途置灰（双击双发防重复改——store 防重联动画）
              disabled={updating}
              style={btnStyle}
              onClick={() => {
                update()
              }}
            >
              保存
            </button>
            <button
              type="button"
              aria-label="取消编辑"
              className="rounded border px-1.5 py-0.5 text-[10px] leading-none"
              style={{ ...btnStyle, color: 'var(--text-dim)' }}
              onClick={() => {
                cancelEdit()
              }}
            >
              取消
            </button>
            {rowErrors[m.id] !== undefined && (
              <span role="alert" style={{ color: 'var(--danger)' }}>
                {rowErrors[m.id]}
              </span>
            )}
          </div>
        </>
      ) : (
        <>
          <div className="flex min-w-0 flex-wrap items-center gap-1.5">
            {m.pinned && (
              <span className="text-[10px]" style={{ color: 'var(--accent)' }}>
                已置顶
              </span>
            )}
            {m.origin === 'agent' && (
              <span className="text-[10px]" style={{ color: 'var(--text-dim)' }}>
                代理生成
              </span>
            )}
            <span className="min-w-0 truncate font-medium">{m.title}</span>
            <span className="text-[10px]" style={{ color: 'var(--text-dim)' }}>
              {m.category}
            </span>
          </div>
          <p className="m-0 min-w-0 whitespace-pre-wrap break-words leading-5" style={{ color: 'var(--text-dim)' }}>
            {m.content}
          </p>
          {m.origin === 'manual' && (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                aria-label="编辑"
                className="rounded border px-1.5 py-0.5 text-[10px] leading-none"
                style={btnStyle}
                onClick={() => {
                  startEdit(m)
                }}
              >
                编辑
              </button>
              <button
                type="button"
                aria-label={m.pinned ? '取消置顶' : '置顶'}
                className="rounded border px-1.5 py-0.5 text-[10px] leading-none"
                style={btnStyle}
                onClick={() => {
                  setPinned(m.id, !m.pinned)
                }}
              >
                {m.pinned ? '取消置顶' : '置顶'}
              </button>
              <button
                type="button"
                aria-label="删除"
                className="rounded border px-1.5 py-0.5 text-[10px] leading-none"
                style={{ borderColor: 'var(--border)', color: 'var(--danger)' }}
                onClick={() => {
                  remove(m.id)
                }}
              >
                删除
              </button>
              {rowErrors[m.id] !== undefined && (
                <span role="alert" style={{ color: 'var(--danger)' }}>
                  {rowErrors[m.id]}
                </span>
              )}
            </div>
          )}
        </>
      )}
    </li>
  )
}
