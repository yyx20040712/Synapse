// b3: P7-H
/**
 * [F-UIRES-03 C1→C2·P5→F-ESC-01] useLineageEscapeKey —— 脉络页 Esc 全局
 * 层序键盘接线（delta-W3a 两层→v1.11②全局面层序；LineagePage 拆件——
 * 组件 250 行红线）。单口=view.store escapeStep（paletteFor→anchor→tool
 * 三层）。
 *
 * 层序（设计稿 v1.13 §2 C2+F-ESC-01 扩面）：INPUT/IME 组词（原生优先——
 * 文本框 Esc=改名取消/对话框关闭等自治）＞对话框层（让路探测 document
 * [role=dialog] 在场=no-op——Dialog 自治 document keydown 关闭〔脏确认框
 * 等共享 Dialog 族；注册序=单口（LineagePage 挂载）先于 Dialog 开态注册
 * →让路检查时 Dialog DOM 必在场〕）＞菜单层（让路探测 [role=menu] 在场
 * =no-op——EdgeMenu〔edge/vertex 两态〕+LineageNodeMenu 各自自治 Esc 监听
 * 关闭，探测面覆盖两族〔均挂 role=menu〕；pendingLink 目标选取提示条同族
 * ——非 role=menu（语义非菜单）挂 data-esc-family=menu 可探测标记+自治
 * Esc〔LineageBoardMenu 承载〕；LineTypeMenu 色板无该 role 不误伤）＞
 * 色板/锚/工具三层（escapeStep 承载）。一次 Esc 只关最上层；无面=no-op。
 * 仅 edit 模式（browse/focus 无工具态/色板/锚面）。
 */
import { useEffect } from 'react'
import { useLineageViewStore } from './lineage-view.store'

export function useLineageEscapeKey(): void {
  useEffect(() => {
    const onEsc = (e: KeyboardEvent): void => {
      if (e.key !== 'Escape' || e.isComposing) return
      if (useLineageViewStore.getState().mode !== 'edit') return
      const t = e.target
      if (t instanceof HTMLElement && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) {
        return // 输入焦点内=原生 Esc（改名取消/对话框关闭等优先）
      }
      // 对话框层/菜单层让路（[role=dialog] 与 [role=menu]/提示条标记同句
      // 判定）：该层 DOM 在场→单口 no-op——Dialog/EdgeMenu/LineageNodeMenu/
      // pendingLink 提示条各自自治 Esc 监听关闭（一次 Esc 只关最上层）
      if (document.querySelector('[role="dialog"], [role="menu"], [data-esc-family="menu"]') !== null) return
      const v = useLineageViewStore.getState()
      if (v.paletteFor === null && v.anchor === null && v.tool === 'select') return // 无面可退=no-op
      e.preventDefault()
      v.escapeStep()
    }
    document.addEventListener('keydown', onEsc)
    return () => document.removeEventListener('keydown', onEsc)
  }, [])
}
