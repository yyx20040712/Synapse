/**
 * [SR-TAG-01] TagEditor —— 标签编辑器（工单：done / weak）
 *
 * ── 行为层 ──
 * - 展示某文献已有标签（chip，点 × 移除 → api.tags.detach）
 * - 输入回车新建并挂接（api.tags.upsert + attach）；已挂接的同名标签提示已存在
 * - 下拉建议：tags.store 里已有标签（前缀匹配前 5 个，排除已挂接）
 *
 * ── 接口层 ──
 * - export function TagEditor(props: { paperId: string;
 *     tags: Array<{ id: string; name: string }>; onChanged: () => void }): JSX.Element
 *
 * ── 架构层 ──
 * - 挂接/移除成功后经 onChanged() 让父组件（PaperDetailPanel）重读详情；
 *   建议数据自取 tags.store（挂载时 refresh，与 TagFilter 共享单一数据源）
 *
 * ── 生命周期层 ── / ── 文化层 ──
 * - api 失败统一 toast；busy 期间禁输入防重复提交
 */
import { useEffect, useRef, useState } from 'react'
import { api, unwrap, ApiClientError } from '../../api/client'
import { showToast } from '../../shared/ui/Toast'
import { useTagsStore } from './tags.store'

/** 意外异常（非 ApiClientError）时的兜底中文消息 */
const TAG_OP_FAILED = '标签操作失败'

export function TagEditor(props: {
  paperId: string
  tags: Array<{ id: string; name: string }>
  onChanged: () => void
}): JSX.Element {
  const { paperId, tags, onChanged } = props
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const allTags = useTagsStore((s) => s.tags)
  const refreshTags = useTagsStore((s) => s.refresh)
  const listError = useTagsStore((s) => s.error)

  // 建议数据源：挂载即拉；列表型失败经 store.error 暴露，在此 toast（建议区退空可用）。
  // 迁移守卫：挂载时已残留的旧失败不重播（本次挂载已触发新 refresh，结果以新为准），
  // 仅"挂载期间 null→失败"的转变才 toast
  useEffect(() => {
    void refreshTags()
  }, [refreshTags])
  const seenError = useRef(listError)
  useEffect(() => {
    if (listError !== seenError.current) {
      seenError.current = listError
      if (listError !== null) {
        showToast(`标签列表刷新失败：${listError}`, 'error')
      }
    }
  }, [listError])

  /** 挂接已有标签（建议点击路径） */
  async function attachExisting(tagId: string): Promise<void> {
    if (busy) return
    setBusy(true)
    try {
      await unwrap(api.tags.attach({ paperId, tagId }))
      onChanged()
    } catch (e) {
      showToast(e instanceof ApiClientError ? e.message : TAG_OP_FAILED, 'error')
    } finally {
      setBusy(false)
    }
  }

  /** 回车：新建（或复用同名）并挂接 */
  async function createAndAttach(): Promise<void> {
    const name = input.trim()
    if (name === '' || busy) return
    if (tags.some((t) => t.name === name)) {
      showToast(`标签「${name}」已挂接`, 'info')
      setInput('')
      return
    }
    setBusy(true)
    try {
      const tag = await unwrap(api.tags.upsert({ name }))
      await unwrap(api.tags.attach({ paperId, tagId: tag.id }))
      setInput('')
      onChanged()
    } catch (e) {
      showToast(e instanceof ApiClientError ? e.message : TAG_OP_FAILED, 'error')
    } finally {
      setBusy(false)
    }
  }

  /** ×：移除挂接（不动标签本身——删除标签 v2） */
  async function removeTag(tagId: string): Promise<void> {
    if (busy) return
    setBusy(true)
    try {
      await unwrap(api.tags.detach({ paperId, tagId }))
      onChanged()
    } catch (e) {
      showToast(e instanceof ApiClientError ? e.message : TAG_OP_FAILED, 'error')
    } finally {
      setBusy(false)
    }
  }

  const attachedIds = new Set(tags.map((t) => t.id))
  const suggestions = allTags
    .filter((t) => !attachedIds.has(t.id) && t.name.startsWith(input.trim()) && input.trim() !== '')
    .slice(0, 5)

  return (
    <div className="flex flex-col gap-1">
      <div className="flex flex-wrap items-center gap-1" aria-label="已挂接标签">
        {tags.length === 0 && (
          <span className="text-xs" style={{ color: 'var(--text-dim)' }}>
            暂无标签
          </span>
        )}
        {tags.map((t) => (
          <span
            key={t.id}
            className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs"
            style={{ borderColor: 'var(--border)', background: 'var(--accent-soft)' }}
          >
            {t.name}
            <button
              type="button"
              aria-label={`移除标签 ${t.name}`}
              disabled={busy}
              style={{ color: 'var(--text-dim)' }}
              onClick={() => void removeTag(t.id)}
            >
              ×
            </button>
          </span>
        ))}
      </div>
      <input
        aria-label="新增标签"
        className="rounded border px-2 py-1 text-xs disabled:opacity-50"
        style={{ borderColor: 'var(--border)', background: 'var(--panel)' }}
        value={input}
        disabled={busy}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') void createAndAttach()
        }}
      />
      {suggestions.length > 0 && (
        <div className="flex flex-wrap gap-1" aria-label="标签建议">
          {suggestions.map((t) => (
            <button
              key={t.id}
              type="button"
              className="rounded border px-2 py-0.5 text-xs disabled:opacity-50"
              style={{ borderColor: 'var(--border)' }}
              disabled={busy}
              onClick={() => void attachExisting(t.id)}
            >
              {t.name}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
