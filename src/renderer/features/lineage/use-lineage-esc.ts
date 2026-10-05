// b3: P7-H
/**
 * [F-UIRES-03 C1] useLineageEscapeKey —— 脉络页 Esc 分层退出键盘接线
 * （delta-W3a；LineagePage 拆件——组件 250 行红线）。单口=view.store
 * escapeStep：paletteFor≠null 只关板；paletteFor=null 时=退画线（→select）。
 * 输入焦点内不拦=文本框原生 Esc 优先（色板行内改名取消=LineTypeMenu 自治，
 * Ctrl+Z 面同守卫——LineagePage 既有先例）；仅 edit 模式（browse/focus 无
 * 工具态/色板面）。
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
      const v = useLineageViewStore.getState()
      if (v.paletteFor === null && v.tool === 'select') return // 无面可退=no-op
      e.preventDefault()
      v.escapeStep()
    }
    document.addEventListener('keydown', onEsc)
    return () => document.removeEventListener('keydown', onEsc)
  }, [])
}
