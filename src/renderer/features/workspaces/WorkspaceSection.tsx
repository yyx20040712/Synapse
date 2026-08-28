/**
 * [R1-WS2] WorkspaceSection —— 设置页课题管理节（SettingsPage 挂载，票面 P3）。
 *
 * ── 行为层 ──
 * - 列表：每课题一行（当前课题带「当前」标记）
 * - 重命名：inline 编辑（「重命名」→ 输入框+确定/取消；成功后侧栏同源生效）
 * - 新建：名称输入+「创建并切换」（创建即切——dirty 确认在 store.switchTo 内）
 * - 删除不做（ADR-0018 v1 边界）
 *
 * ── 接口层 ──
 * - export function WorkspaceSection(props: { dirty: boolean })
 *   （dirty 聚合值经 SettingsPage 可选 prop 由 App 注入——组件不引 reader/
 *   lineage 域 store）
 *
 * ── 架构层 ──
 * - 本域 store（workspace.store）+ shared/ui；动作型失败 catch 后 toast
 *
 * ── 生命周期层 ── / ── 文化层 ──
 * - 自持组件（SettingsPage 行数防线，CorpusExportSection 先例）
 */
import { useState } from 'react'
import { ApiClientError } from '../../api/client'
import { showToast } from '../../shared/ui/Toast'
import { useWorkspaceStore } from './workspace.store'

const OP_FAILED = '操作失败'

export function WorkspaceSection(props: { dirty: boolean }): JSX.Element {
  const items = useWorkspaceStore((s) => s.items)
  const currentId = useWorkspaceStore((s) => s.currentId)
  const rename = useWorkspaceStore((s) => s.rename)
  const create = useWorkspaceStore((s) => s.create)
  const switchTo = useWorkspaceStore((s) => s.switchTo)
  const [newName, setNewName] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)

  async function submitCreate(): Promise<void> {
    const trimmed = newName.trim()
    if (trimmed === '') {
      showToast('请输入课题名称', 'info')
      return
    }
    if (busy) return
    setBusy(true)
    try {
      const id = await create(trimmed)
      await switchTo(id, { dirty: props.dirty })
      setNewName('')
      // 成功即 reload（store 内）；dirty 取消时清单已刷新可见新课题
    } catch (e) {
      showToast(e instanceof ApiClientError ? e.message : OP_FAILED, 'error')
    } finally {
      setBusy(false)
    }
  }

  async function submitRename(id: string): Promise<void> {
    const trimmed = draft.trim()
    if (trimmed === '') {
      showToast('课题名称不能为空', 'info')
      return
    }
    if (busy) return
    setBusy(true)
    try {
      await rename(id, trimmed)
      setEditingId(null)
    } catch (e) {
      showToast(e instanceof ApiClientError ? e.message : OP_FAILED, 'error')
    } finally {
      setBusy(false)
    }
  }

  const inputStyle = { borderColor: 'var(--border)', background: 'var(--panel)' }

  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-sm font-medium">课题管理</h2>
      <p className="text-xs leading-5" style={{ color: 'var(--text-dim)' }}>
        每个课题拥有独立的文献库与发展脉络；切换即整体切换，未保存的修改会被丢弃。
      </p>
      <ul className="flex flex-col gap-1" aria-label="课题列表">
        {items.map((w) => (
          <li key={w.id} className="flex items-center gap-2">
            {editingId === w.id ? (
              <>
                <input
                  aria-label="课题名称"
                  className="min-w-0 flex-1 rounded border px-2 py-1 text-xs"
                  style={inputStyle}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                />
                <button
                  className="rounded px-2 py-1 text-xs text-white"
                  style={{ background: 'var(--accent)' }}
                  onClick={() => void submitRename(w.id)}
                >
                  确定
                </button>
                <button
                  className="rounded px-2 py-1 text-xs"
                  style={inputStyle}
                  onClick={() => setEditingId(null)}
                >
                  取消
                </button>
              </>
            ) : (
              <>
                <span className="min-w-0 flex-1 truncate text-xs">
                  {w.name}
                  {w.id === currentId ? '（当前）' : ''}
                </span>
                <button
                  className="rounded px-2 py-1 text-xs"
                  style={inputStyle}
                  onClick={() => {
                    setEditingId(w.id)
                    setDraft(w.name)
                  }}
                >
                  重命名
                </button>
              </>
            )}
          </li>
        ))}
      </ul>
      <div className="flex items-center gap-2">
        <input
          aria-label="新课题名称"
          className="min-w-0 flex-1 rounded border px-2 py-1 text-xs"
          style={inputStyle}
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
        />
        <button
          className="rounded px-2 py-1 text-xs text-white"
          style={{ background: 'var(--accent)' }}
          onClick={() => void submitCreate()}
        >
          创建并切换
        </button>
      </div>
    </section>
  )
}
