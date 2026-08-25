// b3: P7-A
/**
 * [SR2-KEY-02] ReaderShortcuts —— 阅读器快捷键与滚轮缩放（工单：done / strong）
 *
 * ── 行为层 ──
 * - useReaderShortcuts(actions)：React hook，挂载时经 keymap 注册、卸载时成对注销
 *   （INV-14 首个消费实例：清理函数与注册同源）
 * - ctrl+c：当前有非 editable 目标的文本选区（window.selection）→
 *   navigator.clipboard.writeText（本地 API 不出网）并接管默认行为；无选区不写入；
 *   editable 目标由 keymap 避让（原生复制/粘贴透传）
 * - 翻页键位映射表：PageUp/PageDown、ArrowLeft/ArrowRight → prevPage/nextPage
 *   （表驱动注册——P7-F 连续滚动时键位语义迁移只改本表）
 * - ctrl+z：撤销标注操作栈（actions.undo——reader.store.undo 动作面）；editable
 *   焦点由 keymap 避让走 textarea 原生 undo（UNDO-01：本栈不接管编辑场景）
 * - ctrl+滚轮缩放：document wheel 监听（本模块统一持有，成对注销，passive:false
 *   以允许 preventDefault 阻止 Chromium 页面缩放）；ctrlKey 时 preventDefault 并调
 *   actions.zoomStep(±1)（deltaY<0=上滚放大）；无 ctrl 透传
 * - ctrl+v：不注册——keymap 的 editable 避让保证编辑框原生粘贴透传（规约记录：
 *   「不实现」即正确实现）
 * - 剪贴板写入失败（拒权/不可用）：动作型失败 toast（INV-02）——hook 即消费边界
 *
 * ── 接口层 ──
 * - export interface ReaderShortcutActions { prevPage(): void; nextPage(): void;
 *     zoomStep(dir: 1 | -1): void }
 * - export function useReaderShortcuts(actions: ReaderShortcutActions): void
 *
 * ── 架构层 ──
 * - 消费 src/renderer/shared/keymap；动作经参数注入（reader.store 的调用由消费方
 *   ReaderPage 组装：zoomStep 以 ReaderToolbar 导出的 ZOOM_STEP 单源计算，
 *   禁止复制第二份）；本模块不 import store——可测性
 * - 接缝声明：ReaderPage.tsx（Phase 3 阅读器组合根）装配本 hook 属本工单改动面
 *
 * ── 生命周期层 ──
 * - 预留：页内高亮搜索快捷键（P7-E）；不做：鼠标手势
 *
 * ── 文化层 ──
 * - 剪贴板失败 toast 即动作型反馈；禁止静默吞错；禁止 any；文件 ≤200 行
 */
import { useEffect } from 'react'
import { registerKeymap, unregisterKeymap } from '../../shared/keymap'
import { showToast } from '../../shared/ui/Toast'
import type { KeyBinding } from '../../shared/keymap'

/** 本 hook 在 keymap 的注册 id（唯一来源，卸载成对注销） */
const KEYMAP_ID = 'reader-shortcuts'

/** 翻页键位映射表（P7-F 连续滚动时语义迁移的唯二落点之一） */
const PAGE_KEYS: ReadonlyArray<{ key: string; dir: 'prev' | 'next' }> = [
  { key: 'PageDown', dir: 'next' },
  { key: 'ArrowRight', dir: 'next' },
  { key: 'PageUp', dir: 'prev' },
  { key: 'ArrowLeft', dir: 'prev' }
]

/** 复制当前非编辑选区；无选区不动作；clipboard 不可用（同步抛错）或写入拒绝
 *  均为动作型失败 toast（INV-02——hook 即消费边界） */
function copySelection(): void {
  const sel = window.getSelection()
  const text = sel === null ? '' : sel.toString()
  if (text === '') return
  try {
    void navigator.clipboard.writeText(text).catch(() => {
      showToast('复制到剪贴板失败')
    })
  } catch {
    showToast('复制到剪贴板失败')
  }
}

export interface ReaderShortcutActions {
  prevPage(): void
  nextPage(): void
  zoomStep(dir: 1 | -1): void
  undo(): void
}

export function useReaderShortcuts(actions: ReaderShortcutActions): void {
  const { prevPage, nextPage, zoomStep, undo } = actions
  useEffect(() => {
    const bindings: readonly KeyBinding[] = [
      { key: 'c', ctrl: true, preventDefault: true, handler: copySelection },
      { key: 'z', ctrl: true, preventDefault: true, handler: undo },
      // 翻页键 preventDefault：阻断可滚动视口的原生滚动，防「滚动+翻页」双移动
      ...PAGE_KEYS.map(
        (p): KeyBinding => ({
          key: p.key,
          preventDefault: true,
          handler: () => (p.dir === 'prev' ? prevPage() : nextPage())
        })
      )
    ]
    registerKeymap(KEYMAP_ID, bindings)

    const onWheel = (ev: WheelEvent): void => {
      if (!ev.ctrlKey) return
      // 阻断 Chromium 页面缩放（对 ctrl+wheel 手势本身仍阻断，包括 deltaY=0）
      ev.preventDefault()
      if (ev.deltaY === 0) return
      zoomStep(ev.deltaY < 0 ? 1 : -1)
    }
    // passive:false——Chromium 对 document 级 wheel 默认 passive，必须显式关闭才能 preventDefault
    document.addEventListener('wheel', onWheel, { passive: false })

    return () => {
      unregisterKeymap(KEYMAP_ID)
      document.removeEventListener('wheel', onWheel)
    }
  }, [prevPage, nextPage, zoomStep, undo])
}
