/**
 * [F-DBCAMP-01 DB-2 UI U5] PinsTab —— 管理面板置顶消息 Tab（跨会话置顶面）。
 *
 * ── 行为层（设计 §1.4）──
 * - 数据=ai-messages/list-pinned 三档各一发（req={scope}——anchorId 缺省=
 *   不过滤该档全部置顶，W-2a 三值语义）；三档（paper/lineage/global）分组
 *   列出，行=消息文本+服务端锚标题 anchorTitle（null→'—'）。
 * - 态空间：entry ∈ {loading, ready(groups), error}；groups=三档行袋。
 *   迁移：挂载/刷新→loading→三回包全达→ready|error（任一失败→error）；
 *   卸载→序号自增（晚到回包失格）。
 * - 取消置顶：setPinned({messageId, pinned:false})→行消失；错误映射沿 §1.4
 *   （NOT_FOUND→行消失+刷新；INVALID_REQUEST/网络→行内通用错误——无
 *   CONFLICT 分支）。空态「暂无置顶消息」（三档全空时）。
 *
 * ── 接口层 ──
 * - export function PinsTab(): JSX.Element
 *
 * ── 架构层 ── / ── 生命周期层 ── / ── 文化层 ──
 * - 组件本地态（管理面无独立 store——设计 §4.2 三 store 职责面外）；数据面
 *   只经 ai-messages/list-pinned+set-pinned；测试=ai-manage-tabs.test.tsx
 *   +e2e E3（ai-manage-tabs.spec.ts）。
 */
import { useEffect, useRef, useState } from 'react'
import { api, unwrap, ApiClientError } from '../../../api/client'
import { GENERIC_ERROR } from '../ui-texts'
import type { AiScope, PinnedMessageItem } from '@shared/models/ai-domain'

/** 三档组序与组标（paper→文献/lineage→脉络/global→全局——全局档首现标签） */
const SCOPE_GROUPS: Array<{ scope: AiScope; label: string }> = [
  { scope: 'paper', label: '文献' },
  { scope: 'lineage', label: '脉络' },
  { scope: 'global', label: '全局' }
]

type Groups = Record<AiScope, PinnedMessageItem[]>

interface PinsEntry {
  status: 'loading' | 'ready' | 'error'
  groups: Groups
}

const EMPTY_GROUPS: Groups = { paper: [], lineage: [], global: [] }

export function PinsTab(): JSX.Element {
  const [entry, setEntry] = useState<PinsEntry>({ status: 'loading', groups: EMPTY_GROUPS })
  // 刷新触发（NOT_FOUND 取消映射→三档重拉）
  const [reload, setReload] = useState(0)
  const [rowErrors, setRowErrors] = useState<Record<number, string>>({})
  // 请求序号（stale-guard：刷新/卸载自增——晚到回包失格）
  const seqRef = useRef(0)

  useEffect(() => {
    const seq = seqRef.current + 1
    seqRef.current = seq
    setRowErrors({})
    setEntry({ status: 'loading', groups: EMPTY_GROUPS })
    const groups: Groups = { paper: [], lineage: [], global: [] }
    let pending = SCOPE_GROUPS.length
    let failed = false
    const settleOne = (): void => {
      pending -= 1
      if (pending === 0) {
        setEntry(failed ? { status: 'error', groups: EMPTY_GROUPS } : { status: 'ready', groups: { ...groups } })
      }
    }
    for (const { scope } of SCOPE_GROUPS) {
      unwrap(api.ai_messages.listPinned({ scope }))
        .then((res) => {
          if (seqRef.current !== seq) return
          groups[scope] = res.items
          settleOne()
        })
        .catch(() => {
          if (seqRef.current !== seq) return
          failed = true
          settleOne()
        })
    }
    return () => {
      seqRef.current += 1
    }
  }, [reload])

  function unpin(item: PinnedMessageItem, scope: AiScope): void {
    const seq = seqRef.current
    const dropRow = (): void => {
      setEntry((cur) =>
        cur.status === 'ready'
          ? { ...cur, groups: { ...cur.groups, [scope]: cur.groups[scope].filter((m) => m.id !== item.id) } }
          : cur
      )
    }
    unwrap(api.ai_messages.setPinned({ messageId: item.id, pinned: false }))
      .then(() => {
        if (seqRef.current !== seq) return
        dropRow()
      })
      .catch((e: unknown) => {
        if (seqRef.current !== seq) return
        const code = e instanceof ApiClientError ? e.code : ''
        if (code === 'NOT_FOUND') {
          // 消息已不存在（会话级联等）→行消失+刷新拉新事实（§1.4）
          dropRow()
          setReload((r) => r + 1)
          return
        }
        setRowErrors((cur) => ({ ...cur, [item.id]: GENERIC_ERROR }))
      })
  }

  const allEmpty =
    entry.status === 'ready' && SCOPE_GROUPS.every(({ scope }) => entry.groups[scope].length === 0)

  return (
    <div data-testid="ai-manage-pins" className="flex flex-col gap-2 text-xs">
      {entry.status === 'loading' ? (
        <div style={{ color: 'var(--text-dim)' }}>正在加载置顶消息…</div>
      ) : entry.status === 'error' ? (
        <div role="alert" style={{ color: 'var(--danger)' }}>
          {GENERIC_ERROR}
        </div>
      ) : allEmpty ? (
        <div style={{ color: 'var(--text-dim)' }}>暂无置顶消息</div>
      ) : (
        SCOPE_GROUPS.filter(({ scope }) => entry.groups[scope].length > 0).map(({ scope, label }) => (
          <div key={scope} className="flex flex-col gap-1">
            <h4 className="m-0 text-[11px] font-medium" style={{ color: 'var(--text-dim)' }}>
              {label}
            </h4>
            {entry.groups[scope].map((m) => (
              <div
                key={m.id}
                data-id={m.id}
                className="flex flex-col gap-0.5 rounded-md border px-2 py-1.5"
                style={{ borderColor: 'var(--border)', background: 'var(--panel)' }}
              >
                <div className="flex min-w-0 items-center justify-between gap-2">
                  <span className="min-w-0 truncate" style={{ color: 'var(--text-dim)' }}>
                    {m.anchorTitle ?? '—'}
                  </span>
                  <button
                    type="button"
                    aria-label="取消置顶"
                    className="shrink-0 rounded border px-1.5 py-0.5 text-[10px] leading-none"
                    style={{ borderColor: 'var(--border)', color: 'var(--danger)' }}
                    onClick={() => {
                      unpin(m, scope)
                    }}
                  >
                    取消置顶
                  </button>
                </div>
                <p className="m-0 min-w-0 whitespace-pre-wrap break-words leading-5">{m.content}</p>
                {rowErrors[m.id] !== undefined && (
                  <span role="alert" className="text-[10px]" style={{ color: 'var(--danger)' }}>
                    {rowErrors[m.id]}
                  </span>
                )}
              </div>
            ))}
          </div>
        ))
      )}
    </div>
  )
}
