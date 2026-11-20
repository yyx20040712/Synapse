// b1: 前端改造第三期 B2 批
/**
 * [B2] useResearchScroll —— 研究面板滚动会话记忆（收账三点+恢复）
 *
 * ── 行为层 ──
 * - 状态载体：TabState.researchScroll（per-tab 分槽 ai/notes——计划 §4 第三期
 *   「右栏状态与迁移」表）；会话内记忆：切页签/切文献标签/离开阅读器再返回
 *   恢复，关标签随删，重开应用归零（无持久化面）
 * - 收账三点（计划明令：**不进 scroll 事件监听**，只读瞬时 scrollTop）：
 *   | 收账点 | 时序理由 |
 *   | 页签点击前（本 hook 返回的 collectScroll） | 切页签即卸载旧面板——事后面板不在 DOM，必须点击时序预读 |
 *   | activeId/tab 变化 layout effect | 读「切换前快照」——[B2 审查回炉 B-1] effect 时点 React 已提交新 DOM（旧 AI 消息列表已卸载，按 prev.tab 在新 DOM 反推落 host 兜底存 0），故快照经 store 订阅在 set 同步时刻（React 未重渲染、旧面板仍挂载）直读旧 scroller 落 ref，effect 只消费快照 |
 *   | 组件卸载 cleanup（layout effect [］） | store 模块单例存活，离开阅读器/收起面板即收账 |
 * - 恢复：目标容器 scrollTop 直写（**INV-34 登记例外**——不经
 *   scrollIntoNearestScroller 也不经 setPage/scrollRequest〔INV-29/INV-118
 *   双源分离〕）；「立即尝试+rAF 重试至命中」（帧上限 RESTORE_MAX_FRAMES
 *   或 |scrollTop−target|<1 即停）——AI 页签内容异步长出，逐帧重解析容器
 *   补设；jsdom 无 rAF 且无布局（首设即中）不进重试循环
 * - 有效滚动容器解析：面板内部自持滚动（ReaderNotesPanel 片段容器/AI
 *   MessageList overflow-y-auto），host .rdr-research-body 本体不溢出——
 *   notes=fragment-list 父容器、ai=ai-message-list，均缺席时回退 host。
 *   收账读值时机：页签点击前/卸载 cleanup=host 现解析直读（旧面板在场/
 *   删除期子树仍完整——React 删除子树时内部结构保持，host 分离后
 *   querySelector 仍可遍历，Chromium 滚动位驻元素不因分离清零）；
 *   activeId/tab 变化=store 订阅快照（见收账三点表——直读会撞新 DOM）
 * - noteHighlight 让位：切换由 noteHighlight 信号驱动时（装配层
 *   ReaderPageView 副作用——notify 提交与切页签提交是两个提交，让位判定经
 *   「到达登记 pendingYieldSeq+用户点击清除」跨提交保持）跳过本次恢复+作废
 *   在途恢复循环——FragmentNotesList 高亮 scrollIntoView(nearest) 后到且应
 *   胜出（用户点标注定位片段，不被旧滚动位拉回）；信号消费后手动切换恢复
 *   能力回归。[B2 审查回炉 B-2] 新信号到达即作废在途循环（同页签无切换
 *   分支也生效——已在 notes 时点标注，在途恢复不得下帧写回旧记忆位）
 *
 * ── 接口层 ──
 * - export function useResearchScroll(props: { hostRef; activeId: string | null;
 *   tab: ResearchTab }): () => void（返回 collectScroll——页签点击收账口）
 *
 * ── 架构层 ── / ── 生命周期层 ── / ── 文化层 ──
 * - 消费方=ResearchAside（唯一）；测试=research-scroll.test（组件面收账/
 *   恢复/单写）+reader-research-assembly.test（让位面）+reader.store.test
 *   （store 面）+e2e research-scroll.spec（真实滚动往返）
 */
import { useEffect, useLayoutEffect, useRef } from 'react'
import type { MutableRefObject } from 'react'
import { useReaderStore } from '../state/reader.store'

export type ResearchTab = 'ai' | 'notes'

/** rAF 重试帧上限（≈2s@60fps）：AI 页签重挂载经 IPC 异步长出消息列表
 *  （实测 10 帧〔~160ms〕窗口不足——返回阅读器时 open+listMessages 链路
 *  晚于帧窗到达，恢复循环在容器出现前耗尽；120 帧覆盖重载延迟且仍有界） */
const RESTORE_MAX_FRAMES = 120

/** 有效滚动容器解析（面板内部自持滚动——host 本体不溢出，见头注） */
function resolveScroller(host: HTMLElement, tab: ResearchTab): HTMLElement {
  if (tab === 'notes') {
    const list = host.querySelector('[data-testid="fragment-list"]')
    if (list?.parentElement instanceof HTMLElement) return list.parentElement
  } else {
    const list = host.querySelector('[data-testid="ai-message-list"]')
    if (list instanceof HTMLElement) return list
  }
  return host
}

/** 恢复：立即尝试+rAF 逐帧重试（重解析容器——AI 异步内容）至命中/帧上限；
 *  token 自增作废旧循环（新恢复/让位/卸载） */
function applyRestore(host: HTMLElement, tab: ResearchTab, target: number, tokenRef: MutableRefObject<number>): void {
  const token = ++tokenRef.current
  const attempt = (frame: number): void => {
    if (tokenRef.current !== token || frame > RESTORE_MAX_FRAMES) return
    const scroller = resolveScroller(host, tab)
    scroller.scrollTop = target
    if (Math.abs(scroller.scrollTop - target) < 1) return // 命中即停
    if (typeof requestAnimationFrame !== 'function') return // jsdom：无布局首设即中
    requestAnimationFrame(() => attempt(frame + 1))
  }
  attempt(0)
}

export function useResearchScroll(props: {
  hostRef: MutableRefObject<HTMLDivElement | null>
  activeId: string | null
  tab: ResearchTab
}): () => void {
  const { hostRef, activeId, tab } = props
  const saveResearchScroll = useReaderStore((s) => s.saveResearchScroll)
  // noteHighlight 订阅（到达检测——notify 提交与装配层切页签提交是两个提交，
  // 让位判定须跨提交保持「未消费」态）
  const noteHighlight = useReaderStore((s) => s.noteHighlight)
  /** 上一渲染定位快照（activeId/tab 变化收账的旧目标；null=首渲染=挂载恢复） */
  const prevRef = useRef<{ activeId: string | null; tab: ResearchTab } | null>(null)
  /** 点击路径已收账标记（effect 收账让位——不双写） */
  const skipNextCollectRef = useRef(false)
  /** noteHighlight 上次见到的对象（到达=新对象） */
  const lastNhRef = useRef<{ seq: number } | null>(null)
  /** 到达未消费的 noteHighlight seq（让位判定输入；用户点击路径清除） */
  const pendingYieldSeqRef = useRef<number | null>(null)
  /** 在途恢复循环令牌 */
  const restoreTokenRef = useRef(0)
  /** [B-1] 切换前快照（store.set 同步时刻直读旧 scroller——旧面板仍挂载） */
  const snapshotRef = useRef<{ activeId: string; tab: ResearchTab; scrollTop: number } | null>(null)

  // noteHighlight 到达登记（声明序先于切换 effect——同提交双变更时先登记
  // 后判定）；信号常驻不重复登记（同对象重渲染零扰动）。[B-2 审查回炉 B-2]
  // 新信号到达即作废在途恢复循环（同页签无 changed 分支也生效——高亮滚动
  // 后到且应胜出，在途帧不得下帧写回旧记忆位）
  useLayoutEffect(() => {
    if (noteHighlight !== null && noteHighlight.seq !== lastNhRef.current?.seq) {
      pendingYieldSeqRef.current = noteHighlight.seq
      restoreTokenRef.current += 1
    }
    lastNhRef.current = noteHighlight
  }, [noteHighlight])

  // [B-1] 切换前快照订阅：activeId/active 页签变化的 store.set 同步时刻
  //（React 未重渲染——旧面板仍挂载）直读旧 scroller 瞬时 scrollTop 落 ref；
  // effect 收账只消费快照（直读会撞已提交的新 DOM——旧 AI 列表已卸载）
  useEffect(() => {
    const tabOf = (s: { activeId: string | null; tabs: Record<string, { researchTab?: 'ai' | 'notes' }> }): 'ai' | 'notes' | null =>
      s.activeId !== null ? s.tabs[s.activeId]?.researchTab ?? 'ai' : null
    return useReaderStore.subscribe((state, prev) => {
      const prevTab = tabOf(prev)
      if (prev.activeId === state.activeId && prevTab === tabOf(state)) return
      if (prev.activeId === null || prevTab === null) return
      const host = hostRef.current
      if (host === null) return
      snapshotRef.current = { activeId: prev.activeId, tab: prevTab, scrollTop: resolveScroller(host, prevTab).scrollTop }
    })
  }, [])

  /** 页签点击收账口（切换前预读旧面板瞬时 scrollTop——事后已卸载不可读；
   *  用户手势驱动=清除未消费信号〔让位仅属信号驱动的切换〕） */
  const collectScroll = (): void => {
    pendingYieldSeqRef.current = null
    if (activeId === null) return
    const host = hostRef.current
    if (host === null) return
    saveResearchScroll(activeId, tab, resolveScroller(host, tab).scrollTop)
    skipNextCollectRef.current = true
  }

  // 切换收账+恢复（每渲染跑：变更检测内收——prev 快照比对）
  useLayoutEffect(() => {
    const prev = prevRef.current
    const changed = prev === null || prev.activeId !== activeId || prev.tab !== tab
    if (changed) {
      const host = hostRef.current
      if (host !== null) {
        // ① 收账（activeId/页签变化路径；页签点击路径已收账→不双写）——
        // [B-1] 快照优先（store.set 同步时刻旧面板直读值）；快照缺席兜底
        // 现解析（防御位——notes 同型容器跨文献保留时可读）
        if (!skipNextCollectRef.current && prev !== null && prev.activeId !== null) {
          const snap = snapshotRef.current
          const scrollTop =
            snap !== null && snap.activeId === prev.activeId && snap.tab === prev.tab
              ? snap.scrollTop
              : resolveScroller(host, prev.tab).scrollTop
          saveResearchScroll(prev.activeId, prev.tab, scrollTop)
        }
        // ② 恢复（让位：noteHighlight 驱动的切换跳过+作废在途循环——高亮
        // scrollIntoView 后到且应胜出；消费后手动切换恢复能力回归）
        const nh = useReaderStore.getState().noteHighlight
        const drivenByHighlight =
          pendingYieldSeqRef.current !== null && nh !== null && nh.seq === pendingYieldSeqRef.current
        if (drivenByHighlight) {
          pendingYieldSeqRef.current = null
          restoreTokenRef.current += 1
        } else if (activeId !== null) {
          const target = useReaderStore.getState().tabs[activeId]?.researchScroll?.[tab] ?? 0
          applyRestore(host, tab, target, restoreTokenRef)
        }
      }
    }
    prevRef.current = { activeId, tab }
    // [W-1] skip 标记每渲染收尾无条件清除（收账判断之后——点击路径本渲染
    // 消费；重复点击当前页签等无变更渲染不得遗留，否则后续真实切换被跳过漏存）
    skipNextCollectRef.current = false
  })

  // 卸载收账（layout effect cleanup：host 为 mount 期捕获的稳定节点；滚动位
  // 驻元素分离不清零；store 模块单例存活承接——离开阅读器/收起面板两形态）
  useLayoutEffect(() => {
    const host = hostRef.current
    return () => {
      restoreTokenRef.current += 1 // 作废在途恢复循环
      const snapshot = prevRef.current
      if (snapshot === null || snapshot.activeId === null || host === null) return
      useReaderStore.getState().saveResearchScroll(
        snapshot.activeId,
        snapshot.tab,
        resolveScroller(host, snapshot.tab).scrollTop
      )
    }
  }, [])

  return collectScroll
}
