// b3: B5 wave C
/**
 * [B5 设计稿 §3.4 侧栏单态与开关迁移/§10.2——wave C 2026-11-25] use-lineage-pane-controls —— 页面组合层的
 * 左右侧栏控制（LineagePageBody 调用一次，同一对象喂工具栏 LineagePaneToggles 与宿主 LineageAsideHost）。
 *
 * ── 行为层 ──
 * - 左栏：唯一状态源=lineage-view.store 的 navCollapsed（[F-LGRAPH-01①U4] P-17）。toggleNav 翻转
 *   navCollapsed，并以「当前 folderId＋当前 navWidth」调 writeNavPrefs 写 per-folder 记忆——只改 Zustand
 *   而丢持久化即 P-17 回归。切图→读该图记忆的读取效应与拖宽写点仍驻 LineageNavPane（原样保留）。
 * - 右栏：useSidebarPane 的同一实例（拖宽/键盘调宽/200–480 clamp/localStorage 持久化全在该 hook）；
 *   宿主不再内部调用——受控注入。收起态不渲染 pane（不占空 rail），展开读回原宽。
 * - 无第二 collapsed 态：本件零自有 state，只回读两处单源。
 *
 * ── 接口层 ── export interface LineagePaneControls；export function useLineagePaneControls():
 *   LineagePaneControls
 *
 * ── 架构层 ── renderer 组合层 hook：只 import 本域 store/prefs；零 IPC；写路径经 store 动作与 prefs 单点。
 */
import { useCallback } from 'react'
import { useLineageStore } from './lineage.store'
import { useLineageViewStore } from './lineage-view.store'
import { writeNavPrefs } from './nav-pane-prefs'
import { useSidebarPane, type SidebarPane } from './use-sidebar-pane'

export interface LineagePaneControls {
  /** 左栏收起态（=lineage-view.store navCollapsed 的回读——无第二份） */
  navCollapsed: boolean
  /** 左栏收起/展开：翻转 navCollapsed 并写当前图的 per-folder 记忆（宽=当前 navWidth） */
  toggleNav(): void
  /** 右栏受控面（useSidebarPane 同一实例——工具栏开关与 LineageAsideHost 共用） */
  sidebar: SidebarPane
}

export function useLineagePaneControls(): LineagePaneControls {
  const navCollapsed = useLineageViewStore((s) => s.navCollapsed)
  const sidebar = useSidebarPane()
  const toggleNav = useCallback((): void => {
    const view = useLineageViewStore.getState()
    const next = !view.navCollapsed
    view.setNavCollapsed(next)
    // 写记忆取动作时刻的活动图与当前宽（闭包不持陈旧值——deps 空，引用跨渲染恒定）
    writeNavPrefs(useLineageStore.getState().folderId, { width: view.navWidth, collapsed: next })
  }, [])
  return { navCollapsed, toggleNav, sidebar }
}
