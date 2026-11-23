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
 * - [B4-A R2 §10.1] 灰点=tab.unfinalized（U 轴单源——「未定稿」非「未落库」；
 *   idle-flush 落库后灰点仍在，显式保存清）；旧 annoDirty||notesPending 双源
 *   灰点语义退役
 * - 点击 tab 体 = activateTab(id)（换 tab 暂停非卸载——TABS-01 语义）
 * - 空态：无 tab（order 空）时整栏不渲染
 * - 键盘可达：容器 role="tablist"，tab 项 role="tab" + roving tabindex
 *   （ArrowLeft/Right 在项间循环移动焦点——TabBar 组件主语管理；焦点内按键
 *   属 DOM 语义非全局快捷键，不经 keymap）
 * - [B4-A R2 §10.2] 关闭二选/失败 Dialog 宿主=CloseTabDialogHost（自本件拆出）
 *
 * ── 接口层 ──
 * - export function TabBar(): JSX.Element | null（空态返回 null）
 *   （数据自取 store；无 props——装配点是 ReaderPage 返回根 div 顶部）
 *
 * ── 架构层 ──
 * - renderer features/reader 域内组件；只 import reader.store/reader-close-tab；
 *   接缝：ReaderPage.tsx 顶部装配
 *
 * ── 生命周期层 ──
 * - 预留：tab 拖拽排序（P8+）；不做：多行 tab 折叠（单行滚动即可）
 *
 * ── 文化层 ──
 * - 无异步无 IO（全部数据来自 store）——错误反馈面不适用，规约记录依据
 * - 测试：tests/unit/renderer/tab-bar.test.tsx（受锁）：渲染序=order、
 *   激活高亮、点击 activate、关闭叉 closeTab、loading/error 态呈现、空态隐藏、
 *   role="tablist"/"tab" 语义、roving 键盘（左右+循环）
 * - [T3-P4] tab 条=.rdr-tabbar；active=.rdr-tab-active；灰点=.rdr-dirty-dot；
 *   关闭叉=.rdr-tab-close；role/aria/tabIndex/.truncate 结构零变（tab-bar.test
 *   断言面）
 */
import { useState } from 'react'
import type { KeyboardEvent as ReactKeyboardEvent } from 'react'
import { ICON_X } from '../../../shared/icons'
import { useReaderStore } from '../state/reader.store'
import { switchTabFlushFirst } from '../state/tab-dirty'
import { requestCloseTab } from '../state/reader-close-tab'
import { CloseTabDialogHost } from './CloseTabDialogHost'
import type { TabState } from '../state/reader.store'

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
  const closeTab = useReaderStore((s) => s.closeTab)
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

  /** 关闭命令（关闭叉/Delete 键两位）：requestCloseTab 二选/失败状态机收口——
   *  true 才执行 closeTab（清史接缝在 store）。关闭流程在途期间的重复请求拿到的
   *  是同一 promise（§2.5 #24），多个等待方同获 true——tab 仍在才收口，store 接缝
   *  只执行一次 */
  const runClose = (id: string): void => {
    void requestCloseTab(id)
      .then((allow) => {
        if (allow && useReaderStore.getState().tabs[id] !== undefined) closeTab(id)
      })
      .catch(() => undefined)
  }

  return (
    <div
      role="tablist"
      aria-label="打开的文献"
      // [T3-P4] tab 条皮肤=.rdr-tabbar；overflow-x 单行滚动（单行滚动即可）
      className="rdr-tabbar shrink-0 overflow-x-auto"
      onKeyDown={onKeyDown}
    >
      {order.map((id) => {
        const tab = tabs[id]
        if (tab === undefined) return null
        const active = id === activeId
        const title = tabTitle(tab)
        // [B4-A R2 §10.1] 灰点=未定稿轴（idle-flush 落库不清；显式保存清）
        const unfinalized = tab.unfinalized === true
        return (
          <div
            key={id}
            role="tab"
            aria-selected={active}
            tabIndex={id === rovingId ? 0 : -1}
            data-tab-id={id}
            className={`rdr-tab min-w-0 shrink-0 cursor-pointer${active ? ' rdr-tab-active' : ''}`}
            style={{ color: tab.status === 'error' ? 'var(--danger)' : undefined }}
            onClick={() => switchTabFlushFirst(id)}
            onFocus={() => setFocusedId(id)}
            onKeyDown={(ev) => {
              // 键盘激活（div[role=tab] 无内建行为）：Enter/Space 等价点击 tab 体；
              // Delete 关闭（关闭叉已退出 Tab 序——纯键盘用户的关闭替代路径）。
              // 激活两径经 switchTabFlushFirst（离场篇 flush-first 立存）；关闭经
              // requestCloseTab（[B4-A R2] closing 状态机——二选/失败 Dialog）
              if (ev.key === 'Enter' || ev.key === ' ') {
                ev.preventDefault()
                switchTabFlushFirst(id)
              } else if (ev.key === 'Delete') {
                ev.preventDefault()
                runClose(id)
              }
            }}
          >
            {unfinalized && (
              <span
                title="未标记为已保存"
                aria-label="未标记为已保存"
                data-testid="tab-dirty-dot"
                // [T3-P4] 6px 圆灰点（.rdr-dirty-dot）
                className="rdr-dirty-dot"
              />
            )}
            <span className="truncate">{title}</span>
            <button
              type="button"
              aria-label={`关闭 ${title}`}
              title={`关闭 ${title}`}
              tabIndex={-1}
              // [T3-P4] 关闭叉语汇住皮肤类；[F-UIRES-02 批 B] ✕ 字符→ICON_X
              className="rdr-tab-close syn-icon-btn ml-1 shrink-0 leading-none"
              onClick={(ev) => {
                ev.stopPropagation()
                runClose(id)
              }}
            >
              {ICON_X}
            </button>
          </div>
        )
      })}
      {/* [B4-A R2 §10.2] 关闭二选/失败 Dialog 宿主（fixed 定位——随本栏挂载，
          关闭中的 tab 恒在 order 内故空态 null 不吞对话框） */}
      <CloseTabDialogHost />
    </div>
  )
}
