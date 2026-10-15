/**
 * [F-DBCAMP-01 DB-2 UI U5] MemoryTab —— 管理面板记忆 Tab（scope 级列表+CRUD）。
 *
 * ── 行为层（设计 §1.4）──
 * - scope 切换（paper/lineage/global）+分类过滤（值域=shared 档级常量
 *   AI_MEMORY_CATEGORIES[scope]，''=全部分类——切档重置驻 store）+置顶过滤
 *   +搜索框（提交制——检索模式 query 在席由 store 路由，UI 保证与分类/置顶
 *   互不共发，W-1）。
 * - 新建仅 global 档开放（新呈裁-1：paper/lineage 档表单置灰+提示
 *   「暂不支持在本面板为该档新建」）；label 无输入面（W-3 契约可选）。
 * - 列表三态：正在加载记忆…/暂无记忆/错误行（role=alert）；行渲染拆件
 *   MemoryRow（250 行防线——编辑/置顶/删除/agent 只读面驻彼）。
 * - 态机/竞态/错误映射全驻 aiMemoryStore（态空间表=该文件头注——本组件纯
 *   消费+表单受控渲染）。
 *
 * ── 接口层 ──
 * - export function MemoryTab(): JSX.Element
 *
 * ── 架构层 ── / ── 生命周期层 ── / ── 文化层 ──
 * - 数据面只经 aiMemoryStore（组件禁直连 api）；挂载 load/卸载 unload；
 *   测试=ai-memory-store.test（态机轴）+ai-manage-tabs.test.tsx（渲染面）
 *   +e2e E7（ai-manage-tabs.spec.ts）。
 */
import { useEffect, useState } from 'react'
import { AI_MEMORY_CATEGORIES } from '@shared/models/ai-domain'
import { useAiMemoryStore } from '../aiMemoryStore'
import { GENERIC_ERROR } from '../ui-texts'
import { MemoryRow } from './MemoryRow'

const SCOPE_OPTIONS = [
  { value: 'paper', label: '文献' },
  { value: 'lineage', label: '脉络' },
  { value: 'global', label: '全局' }
] as const

export function MemoryTab(): JSX.Element {
  const filters = useAiMemoryStore((s) => s.filters)
  const entry = useAiMemoryStore((s) => s.panels[filters.scope])
  const formError = useAiMemoryStore((s) => s.formError)
  const draft = useAiMemoryStore((s) => s.draft)
  const load = useAiMemoryStore((s) => s.load)
  const unload = useAiMemoryStore((s) => s.unload)
  const setScope = useAiMemoryStore((s) => s.setScope)
  const setCategory = useAiMemoryStore((s) => s.setCategory)
  const setPinnedOnly = useAiMemoryStore((s) => s.setPinnedOnly)
  const setQuery = useAiMemoryStore((s) => s.setQuery)
  const setDraft = useAiMemoryStore((s) => s.setDraft)
  const create = useAiMemoryStore((s) => s.create)
  // 搜索框草稿（提交才进 store——检索模式路由面）
  const [searchDraft, setSearchDraft] = useState('')

  useEffect(() => {
    load()
    return () => {
      unload()
    }
  }, [load, unload])

  const canCreate = filters.scope === 'global'
  const creating = useAiMemoryStore((s) => s.creating)
  const inputStyle = { borderColor: 'var(--border)', background: 'var(--panel)' }

  return (
    <div data-testid="ai-manage-memory" className="flex flex-col gap-2 text-xs">
      {/* 过滤行：档位/分类/仅看置顶/搜索 */}
      <div className="flex flex-wrap items-center gap-2">
        <select
          aria-label="记忆档位"
          className="syn-input rounded border px-1 py-0.5"
          style={inputStyle}
          value={filters.scope}
          onChange={(e) => {
            setScope(e.target.value as typeof filters.scope)
          }}
        >
          {SCOPE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <select
          aria-label="记忆分类"
          className="syn-input rounded border px-1 py-0.5"
          style={inputStyle}
          value={filters.category}
          onChange={(e) => {
            setCategory(e.target.value)
          }}
        >
          <option value="">全部分类</option>
          {AI_MEMORY_CATEGORIES[filters.scope].map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-1" style={{ color: 'var(--text-dim)' }}>
          <input
            aria-label="仅看置顶"
            type="checkbox"
            checked={filters.pinnedOnly}
            onChange={(e) => {
              setPinnedOnly(e.target.checked)
            }}
          />
          仅看置顶
        </label>
        <form
          className="flex items-center gap-1"
          onSubmit={(e) => {
            e.preventDefault()
            setQuery(searchDraft)
          }}
        >
          <input
            aria-label="记忆搜索"
            className="syn-input w-36 rounded border px-1.5 py-0.5"
            style={inputStyle}
            value={searchDraft}
            onChange={(e) => {
              setSearchDraft(e.target.value)
            }}
          />
          {/* [F-SETSTYLE-01 批 3d] btn-std 标准文字钮（视觉形态迁 CSS） */}
          <button type="submit" className="btn-std">
            搜索
          </button>
        </form>
      </div>
      {/* 新建表单（仅 global 档开放——新呈裁-1；值域=global 档冻结类目） */}
      <div className="flex flex-col gap-1.5 rounded-md border p-2" style={{ borderColor: 'var(--border)' }}>
        <div className="flex flex-wrap items-center gap-1.5">
          <select
            aria-label="新建分类"
            className="syn-input rounded border px-1 py-0.5"
            style={inputStyle}
            disabled={!canCreate}
            value={draft.category}
            onChange={(e) => {
              setDraft({ category: e.target.value })
            }}
          >
            {AI_MEMORY_CATEGORIES.global.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <input
            aria-label="新建标题"
            className="syn-input min-w-0 flex-1 rounded border px-1.5 py-0.5"
            style={inputStyle}
            disabled={!canCreate}
            value={draft.title}
            onChange={(e) => {
              setDraft({ title: e.target.value })
            }}
          />
        </div>
        <textarea
          aria-label="新建内容"
          rows={2}
          className="syn-input rounded border px-1.5 py-0.5"
          style={inputStyle}
          disabled={!canCreate}
          value={draft.content}
          onChange={(e) => {
            setDraft({ content: e.target.value })
          }}
        />
        <div className="flex items-center gap-2">
          {/* [F-SETSTYLE-01 批 3d] btn-std 标准文字钮（视觉形态迁 CSS） */}
          <button
            type="button"
            aria-label="新建记忆"
            className="btn-std"
            // [回炉 R2] 在途置灰（双击双发防重复行——store 防重联动画）
            disabled={!canCreate || creating}
            onClick={() => {
              create()
            }}
          >
            新建
          </button>
          {!canCreate && <span style={{ color: 'var(--text-dim)' }}>暂不支持在本面板为该档新建</span>}
          {formError !== null && (
            <span role="alert" style={{ color: 'var(--danger)' }}>
              {formError}
            </span>
          )}
        </div>
      </div>
      {/* 列表三态（行渲染驻 MemoryRow——展示/编辑双形+行内错误） */}
      {entry === undefined || entry.status === 'loading' ? (
        <div style={{ color: 'var(--text-dim)' }}>正在加载记忆…</div>
      ) : entry.status === 'error' ? (
        <div role="alert" style={{ color: 'var(--danger)' }}>
          {GENERIC_ERROR}
        </div>
      ) : entry.items.length === 0 ? (
        <div style={{ color: 'var(--text-dim)' }}>暂无记忆</div>
      ) : (
        <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
          {entry.items.map((m) => (
            <MemoryRow key={m.id} item={m} />
          ))}
        </ul>
      )}
    </div>
  )
}
