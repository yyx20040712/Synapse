/**
 * [SR-TAG-01] TagEditor —— 标签编辑器（工单：done / weak + F-TAGS-01 三路提交）
 *
 * ── 行为层 ──
 * - 展示某文献已有标签（chip，点 × 移除 → api.tags.detach）；chip 着色
 *   =tags.store 同 id 行 color（INV-86 三面之二；store 陈旧/未含=默认态）
 * - [F-TAGS-01] 三路提交（R4 状态/迁移表——tests/unit/renderer/tag-editor.test.tsx
 *   矩阵全格在档）：
 *   ①Enter：input 空白→no-op；busy→no-op；e.nativeEvent.isComposing→no-op
 *     （IME 组词确认回车——AnnotationEditor 注释范式随迁）；否则 createAndAttach
 *   ②blur：busy→no-op；组词中（compositionStart/End 维护 ref）→no-op
 *     （组词中文本非最终文本）；空白→no-op；否则 createAndAttach
 *   ③「添加」按钮（aria-label="添加标签"，busy 禁用；组词期点击不提交
 *     ——三路同守卫）；建议按钮同款——onMouseDown preventDefault（阻焦点
 *     转移=不触发 blur，click 单路提交——双提交确定性解）
 * - 回炉 R1/R2 硬化（全量语义单源=INV-85①-⑥，含页码面不对称与同类面守卫）：
 *   组词失焦序 B 由 compositionend 补提交（名取 DOM 值）；attachExisting
 *   成败均清空；×/「添加」/建议按钮 mousedown preventDefault；blur 组词
 *   拒绝分支复位 ref
 * - createAndAttach 三路共用（幂等/busy/toast 零复制）；失败 input 保留
 *   （blur/再 Enter/按钮=显式重试路径——语义入 INV-85）
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
 * - api 失败统一 toast；busy 期间禁输入防重复提交（busy ref 同步镜像
 *   ——blur/Enter 在同批事件窗内也只放行一次，TagLifecycle useBusyGuard 同型）
 */
import { useEffect, useRef, useState } from 'react'
import { api, unwrap, ApiClientError } from '../../api/client'
import { showToast } from '../../shared/ui/Toast'
import { tagColorStyle } from '../../shared/ui-constants'
import { useTagsStore, TAG_OP_FAILED } from './tags.store'

export function TagEditor(props: {
  paperId: string
  tags: Array<{ id: string; name: string }>
  onChanged: () => void
}): JSX.Element {
  const { paperId, tags, onChanged } = props
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  // busy/composing 的同步镜像（ref）：blur 与 Enter 可能落在同一批事件窗，
  // state 尚未重渲染——ref 保证互斥守卫同步生效（S8 双击同型）
  const busyRef = useRef(false)
  const composingRef = useRef(false)
  const inputRef = useRef<HTMLInputElement | null>(null)
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

  /** 挂接已有标签（建议点击路径）；成败均清空 input——检索前缀非载荷，
   * 残留会被 blur 路误建独立标签（k1-B1/d1'-W2；语义分立见 INV-85⑤） */
  async function attachExisting(tagId: string): Promise<void> {
    if (busyRef.current) return
    busyRef.current = true
    setBusy(true)
    try {
      await unwrap(api.tags.attach({ paperId, tagId }))
      onChanged()
    } catch (e) {
      showToast(e instanceof ApiClientError ? e.message : TAG_OP_FAILED, 'error')
    } finally {
      setInput('')
      busyRef.current = false
      setBusy(false)
    }
  }

  /** 三路共用：新建（或复用同名）并挂接；失败 input 保留=显式重试路径。
   *  名值取 DOM 当前值（序 B 下 state 滞后于定案文本——d1'-W1/INV-85⑥） */
  async function createAndAttach(): Promise<void> {
    const name = (inputRef.current?.value ?? input).trim()
    if (name === '' || busyRef.current) return
    if (tags.some((t) => t.name === name)) {
      showToast(`标签「${name}」已挂接`, 'info')
      setInput('')
      return
    }
    busyRef.current = true
    setBusy(true)
    try {
      const tag = await unwrap(api.tags.upsert({ name }))
      await unwrap(api.tags.attach({ paperId, tagId: tag.id }))
      setInput('')
      onChanged()
    } catch (e) {
      showToast(e instanceof ApiClientError ? e.message : TAG_OP_FAILED, 'error')
    } finally {
      busyRef.current = false
      setBusy(false)
    }
  }

  /** ×：移除挂接（不动标签本身——标签删除走 TagFilter 管理面，P7E-01 已实现） */
  async function removeTag(tagId: string): Promise<void> {
    if (busyRef.current) return
    busyRef.current = true
    setBusy(true)
    try {
      await unwrap(api.tags.detach({ paperId, tagId }))
      onChanged()
    } catch (e) {
      showToast(e instanceof ApiClientError ? e.message : TAG_OP_FAILED, 'error')
    } finally {
      busyRef.current = false
      setBusy(false)
    }
  }

  const attachedIds = new Set(tags.map((t) => t.id))
  const suggestions = allTags
    .filter((t) => !attachedIds.has(t.id) && t.name.startsWith(input.trim()) && input.trim() !== '')
    .slice(0, 5)
  // chip 着色查表：store 同 id 行的 color（INV-86 三面同源；store 未含=null 默认）
  const colorById = new Map(allTags.map((t) => [t.id, t.color]))

  return (
    <div className="flex flex-col gap-1">
      <div className="flex flex-wrap items-center gap-1" aria-label="已挂接标签">
        {tags.length === 0 && (
          <span className="text-xs" style={{ color: 'var(--text-dim)' }}>
            暂无标签
          </span>
        )}
        {tags.map((t) => {
          const colorStyle = tagColorStyle(colorById.get(t.id) ?? null)
          return (
            <span
              key={t.id}
              className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs"
              style={colorStyle ?? { borderColor: 'var(--border)', background: 'var(--accent-soft)' }}
            >
              {t.name}
              <button
                type="button"
                aria-label={`移除标签 ${t.name}`}
                disabled={busy}
                style={{ color: 'var(--text-dim)' }}
                // mousedown 阻焦点转移：残留文本点 × 的同手势竞逐解（d1'-W3/INV-85④）
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => void removeTag(t.id)}
              >
                ×
              </button>
            </span>
          )
        })}
      </div>
      <div className="flex items-center gap-1">
        <input
          ref={inputRef}
          aria-label="新增标签"
          className="rounded border px-2 py-1 text-xs disabled:opacity-50"
          style={{ borderColor: 'var(--border)', background: 'var(--panel)' }}
          value={input}
          disabled={busy}
          onChange={(e) => setInput(e.target.value)}
          onCompositionStart={() => {
            composingRef.current = true
          }}
          onCompositionEnd={() => {
            composingRef.current = false
            // 序 B（组词被失焦打断：blur 先被拒→compositionend 后到）补提交
            // 定案文本；未失焦的常规组词确认不在此提交（d1-W1/INV-85⑥）
            if (document.activeElement !== inputRef.current) {
              void createAndAttach()
            }
          }}
          onKeyDown={(e) => {
            // IME 组词确认回车不提交（React onKeyDown 的 e.key 组词期=Process/
            // 原键，需以 nativeEvent.isComposing 判定——AnnotationEditor 范式）
            if (e.nativeEvent.isComposing) return
            if (e.key === 'Enter') void createAndAttach()
          }}
          onBlur={() => {
            // 失焦提交：busy/组词中不提交；组词拒绝分支复位 ref
            // （compositionend 漏发防悬空哑化——k1'-N2/INV-85⑥）
            if (composingRef.current) {
              composingRef.current = false
              return
            }
            if (busyRef.current) return
            void createAndAttach()
          }}
        />
        <button
          type="button"
          aria-label="添加标签"
          className="rounded border px-2 py-1 text-xs disabled:opacity-50"
          style={{ borderColor: 'var(--border)' }}
          disabled={busy}
          // mousedown 阻焦点转移：不触发输入框 blur——click 单路提交（三路互斥
          // 确定性解；建议按钮同款）；组词期点击不提交（与 Enter/blur 同守卫）
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            if (composingRef.current) return
            void createAndAttach()
          }}
        >
          添加
        </button>
      </div>
      {suggestions.length > 0 && (
        <div className="flex flex-wrap gap-1" aria-label="标签建议">
          {suggestions.map((t) => (
            <button
              key={t.id}
              type="button"
              className="rounded border px-2 py-0.5 text-xs disabled:opacity-50"
              style={{ borderColor: 'var(--border)' }}
              disabled={busy}
              onMouseDown={(e) => e.preventDefault()}
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
