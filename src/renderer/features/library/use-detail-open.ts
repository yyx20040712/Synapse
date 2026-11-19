/**
 * [v2 第二期 2026-11-19] use-detail-open —— 文献库详情抽屉收起/展开状态机
 * （计划 docs/design/2026-11-19_frontend-rework-plan.md §4 第二期状态表）。
 *
 * ── 行为层 ──（状态枚举与迁移的完整清单——测试为本头注逐条锁）
 * - 载体=library.store.detailOpen（boolean|null——null=本会话未定）：
 *   会话内存态，不落 settings/localStorage/DB（重启回 null）
 * - 挂载（LibraryPage 按视图条件挂载——每次进入重跑）且 null 时依视口定
 *   默认一次：window.innerWidth ≤1320 → 收起；>1320 → 展开。写入=会话
 *   定值（此后 resize 不再重新推导——不挂 resize 监听，天然不覆盖）
 * - toggle()=切换并记录；close()=显式收起（详情头「收起详情」钮语义）
 * - 卸载零清理：值驻 store，切视图往返/切分类/切文献不重置
 *
 * ── 接口层 ──
 * - export function useDetailOpen(): { open: boolean; toggle(): void; close(): void }
 *
 * ── 架构层 ──
 * - 库域 hook（直连本域 store——FolderNav/use-lib-pane-widths 同型）；
 *   默认视口阈 1320=v2 稿 @media 断点，常量驻本件=库域唯一定义点
 *
 * ── 生命周期层 ── / ── 文化层 ──
 * - 测试：tests/unit/renderer/library-detail-collapse.test.tsx（规则 1-4 逐条）
 */
import { useLibraryStore } from './library.store'

/** 响应式默认阈（视口 CSS px ≤ 此值=首进默认收起——v2 稿 @media 1320 断点） */
export const DETAIL_NARROW_MAX_WIDTH = 1320

export interface DetailOpenControl {
  open: boolean
  toggle(): void
  close(): void
}

function defaultByViewport(): boolean {
  return window.innerWidth > DETAIL_NARROW_MAX_WIDTH
}

export function useDetailOpen(): DetailOpenControl {
  const raw = useLibraryStore((s) => s.detailOpen)
  const setDetailOpen = useLibraryStore((s) => s.setDetailOpen)
  // 挂载沿默认推导（null 仅会话首挂出现；render 期直写+本帧按同判据取值
  // ——无错误态闪帧；StrictMode 双渲染幂等）
  if (raw === null) setDetailOpen(defaultByViewport())
  const open = raw === null ? defaultByViewport() : raw
  return {
    open,
    toggle: () => setDetailOpen(!open),
    close: () => setDetailOpen(false)
  }
}
