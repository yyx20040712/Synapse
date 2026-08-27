// b3: P7-B
/**
 * [SR2-TABS-02] TabBar —— 阅读器多标签栏（工单：open / strong）
 *
 * ── 行为层 ──
 * - 消费 useReaderStore：order（排列序）/ activeId / tabs（每 tab 的
 *   fileName/title/status）——纯展示+回调上交，不持有本地状态
 * - 每个 tab 项：标题（title 优先——file_ref 为内容寻址哈希名不可读，2026-08-27
 *   用户视检缺陷②；fileName 去扩展名兜底，超长截断省略）、激活态高亮、
 *   loading 态 spinner、error 态红字、关闭叉（closeTab）
 * - 点击 tab 体 = activateTab(id)（换 tab 暂停非卸载——TABS-01 语义）
 * - 空态：无 tab（order 空）时整栏不渲染
 * - 键盘可达：容器 role="tablist"，tab 项 role="tab" + roving tabindex
 *   （ArrowLeft/Right 在项间循环移动焦点——TabBar 组件主语管理；焦点内按键
 *   属 DOM 语义非全局快捷键，不经 keymap）
 *
 * ── 接口层 ──
 * - export function TabBar(): JSX.Element | null（空态返回 null）
 *   （数据自取 store；无 props——装配点是 ReaderPage 返回根 div 顶部，
 *   TABS-01 选择器同族）
 *
 * ── 架构层 ──
 * - renderer features/reader 域内组件；只 import reader.store；
 *   接缝：ReaderPage.tsx 顶部装配（本工单改动面）
 * - 灰点位（tab 项上的圆点标记）与关闭脏 tab 确认框属 TABS-03——本单
 *   关闭即关（无确认），dirty 信号接入后升级
 *
 * ── 生命周期层 ──
 * - 预留：tab 拖拽排序（P8+）；不做：多行 tab 折叠（单行滚动即可）
 *
 * ── 文化层 ──
 * - 无异步无 IO（全部数据来自 store）——错误反馈面不适用，规约记录依据
 * - 测试：tests/unit/renderer/tab-bar.test.tsx（受锁）：渲染序=order、
 *   激活高亮、点击 activate、关闭叉 closeTab、loading/error 态呈现、空态隐藏、
 *   role="tablist"/"tab" 语义、roving 键盘（左右+循环）
 */
import { useState } from 'react'
import type { KeyboardEvent as ReactKeyboardEvent } from 'react'
import { useReaderStore } from './reader.store'
import { confirmCloseDirty, isTabDirty, useNotesDrafts } from './tab-dirty'
import type { TabState } from './reader.store'

/** tab 项标题：title 优先（文献名——缺陷②）；空 title 兜底 fileName 去扩展名
 *  （防御位）；loading/error 态的占位文案 */
function tabTitle(tab: TabState): string {
  if (tab.status === 'loading') return '加载中…'
  if (tab.status === 'error') return '打开失败'
  return tab.title !== '' ? tab.title : tab.fileName.replace(/\.pdf$/i, '')
}

export function TabBar(): JSX.Element | null {
  const order = useReaderStore((s) => s.order)
  const activeId = useReaderStore((s) => s.activeId)
  const tabs = useReaderStore((s) => s.tabs)
  const activateTab = useReaderStore((s) => s.activateTab)
  const closeTab = useReaderStore((s) => s.closeTab)
  // notes 面灰点信号（TABS-03）：per-paper pending 镜像（字典订阅——dirty
  // 写频极低，细粒度化按 Rule of Three 缓议）
  const notesByPaper = useNotesDrafts()
  // roving 焦点位：焦点所在项 tabIndex=0（未聚焦时=激活项）；Arrow 移动后随焦点走
  const [focusedId, setFocusedId] = useState<string | null>(null)

  if (order.length === 0) {
    return null
  }
  // 焦点残留守卫：focusedId 指向已关闭 tab（鼠标点叉场景）时回退激活项——
  // roving 不变量「tablist 内恰一项 tabIndex=0」不得因此全 -1 退出 Tab 序；
  // 末位兜底 order[0]：防御 store 异常态（order 非空而 activeId 失配/null）
  const effectiveFocused = focusedId !== null && order.includes(focusedId) ? focusedId : null
  const rovingId = effectiveFocused ?? activeId ?? order[0] ?? null

  /** roving 键盘导航：ArrowLeft/Right 循环移动焦点（DOM 语义，不经 keymap） */
  const onKeyDown = (ev: ReactKeyboardEvent<HTMLDivElement>): void => {
    if (ev.key !== 'ArrowRight' && ev.key !== 'ArrowLeft') return
    ev.preventDefault()
    const items = [...ev.currentTarget.querySelectorAll<HTMLElement>('[role="tab"]')]
    const idx = items.indexOf(document.activeElement as HTMLElement)
    if (idx === -1) return
    const delta = ev.key === 'ArrowRight' ? 1 : -1
    const next = items[(idx + delta + items.length) % items.length]
    next?.focus()
  }

  return (
    <div
      role="tablist"
      aria-label="打开的文献"
      className="flex h-8 shrink-0 items-stretch gap-px overflow-x-auto border-b"
      style={{ borderColor: 'var(--border)' }}
      onKeyDown={onKeyDown}
    >
      {order.map((id) => {
        const tab = tabs[id]
        if (tab === undefined) return null
        const active = id === activeId
        const title = tabTitle(tab)
        // 两写面灰点（TABS-03）：annotations 失败残留 ∥ notes 未落库
        const dirty = isTabDirty(id, {
          annoDirty: tab.dirty,
          notesPending: notesByPaper[id] ?? false
        })
        return (
          <div
            key={id}
            role="tab"
            aria-selected={active}
            tabIndex={id === rovingId ? 0 : -1}
            data-tab-id={id}
            className="flex min-w-0 max-w-48 shrink-0 cursor-pointer items-center gap-1 border-r px-2 text-xs"
            style={{
              borderColor: 'var(--border)',
              background: active ? 'var(--accent-soft)' : 'transparent',
              color: tab.status === 'error' ? 'var(--danger)' : 'var(--text)'
            }}
            onClick={() => activateTab(id)}
            onFocus={() => setFocusedId(id)}
            onKeyDown={(ev) => {
              // 键盘激活（div[role=tab] 无内建行为）：Enter/Space 等价点击 tab 体；
              // Delete 关闭（关闭叉已退出 Tab 序——纯键盘用户的关闭替代路径）。
              // 两者均经 confirmCloseDirty 守门（dirty tab 二次确认）
              if (ev.key === 'Enter' || ev.key === ' ') {
                ev.preventDefault()
                activateTab(id)
              } else if (ev.key === 'Delete') {
                ev.preventDefault()
                if (confirmCloseDirty(id)) closeTab(id)
              }
            }}
          >
            {dirty && (
              <span
                title="有未保存修改"
                aria-label="有未保存修改"
                data-testid="tab-dirty-dot"
                className="shrink-0 text-[10px] leading-none"
                style={{ color: 'var(--warning, orange)' }}
              >
                ●
              </span>
            )}
            <span className="truncate">{title}</span>
            <button
              type="button"
              aria-label={`关闭 ${title}`}
              tabIndex={-1}
              className="ml-1 shrink-0 rounded px-1 text-xs leading-none hover:bg-black/10"
              style={{ color: 'var(--text-dim)' }}
              onClick={(ev) => {
                ev.stopPropagation()
                if (confirmCloseDirty(id)) closeTab(id)
              }}
            >
              ✕
            </button>
          </div>
        )
      })}
    </div>
  )
}
