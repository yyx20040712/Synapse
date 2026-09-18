// b3: P7-F
/**
 * [F-SPLIT-01] usePageLazyWindow —— 懒渲染窗口 hook（自 PageColumn 拆出
 * 2026-09-05；迁移 PageColumn 头注段③职责段，语句零改纯搬运）。
 *
 * ── 行为层（原 PageColumn 段③）──
 * - 段③懒渲染窗口：视口±1 页真渲染（canvas+覆盖层经 renderPage）；离屏>2 页
 *   销毁；IntersectionObserver 占位盒驱动（INV-30：canvas 生命周期=渲染窗口
 *   绑定）。IO deps [pageSizes, layout]（F-R1 增 layout——列↔行 DOM 重排后
 *   重挂）零变。
 * - 可见集上抛（升序；SelectionLayer 锚定页挂载位等消费）——onVisibleChange
 *   latest-ref（父层内联函数不触发 effect 重跑）随迁本件。
 * - 段③调度：渲染窗口并入+离屏回收（空可见=顶部引导窗口，不跑回收）。
 * - 布局态（原 PageColumn 状态机行的每页子机）：每页 empty→rendering→
 *   rendered→recycling→empty；跨格：快速滚动（rendering 中滚出窗口→cancel→
 *   recycling）；zoom 变化（缓存×新 zoom 重算→窗口重评估）。
 * - F-ARCH3 零变纪律保持：不加 useCallback/useMemo。
 *
 * ── 接口层 ──
 * - export function usePageLazyWindow(rootRef, pageSizes, layout, totalPages,
 *   renderWindow, recycleWindow, onVisibleChange): { visible, rendered }
 *   （rootRef=宿主列根——段⑤程序滚动同用同一 ref；宿主 JSX 行渲染消费
 *   rendered；visible 为窗口调度内部态随值返回）
 */
import { useEffect, useRef, useState } from 'react'
import type { RefObject } from 'react'
import { recycledPages, windowPages, type PageBoxSize, type PageLayout } from './page-column-geometry'

/** 段③懒渲染窗口：visible/rendered 状态对+IO 占位盒驱动+回收调度（自
 *  PageColumn 拆出——onVisibleChange latest-ref 随迁，语句零改） */
export function usePageLazyWindow(
  rootRef: RefObject<HTMLDivElement | null>,
  pageSizes: PageBoxSize[] | null,
  layout: PageLayout,
  totalPages: number,
  renderWindow: number,
  recycleWindow: number,
  onVisibleChange: ((visiblePages: number[]) => void) | undefined
): { visible: Set<number>; rendered: Set<number> } {
  // 回调 latest-ref：父层内联函数不触发 effect 重跑（onVisibleChange 面）
  const onVisibleRef = useRef(onVisibleChange)
  onVisibleRef.current = onVisibleChange
  const [visible, setVisible] = useState<Set<number>>(() => new Set())
  const [rendered, setRendered] = useState<Set<number>>(() => new Set())

  // 段③IO：占位盒驱动可见集（就绪后挂载；F-R1 deps 增 layout——列↔行 DOM 重排后重挂）
  useEffect(() => {
    if (pageSizes === null) return
    const io = new IntersectionObserver((entries) => {
      setVisible((prev) => {
        const next = new Set(prev)
        for (const e of entries) {
          const no = Number((e.target as HTMLElement).dataset.pageBox)
          if (Number.isNaN(no)) continue
          if (e.isIntersecting) next.add(no)
          else next.delete(no)
        }
        const same = next.size === prev.size && [...next].every((n) => prev.has(n))
        return same ? prev : next
      })
    })
    for (const el of rootRef.current?.querySelectorAll<HTMLElement>('[data-page-box]') ?? []) {
      io.observe(el)
    }
    return () => io.disconnect()
  }, [pageSizes, layout])

  // 可见集上抛（升序；SelectionLayer 锚定页挂载位等消费）
  useEffect(() => {
    onVisibleRef.current?.([...visible].sort((a, b) => a - b))
  }, [visible])

  // 段③调度：渲染窗口并入+离屏回收（空可见=顶部引导窗口，不跑回收）
  useEffect(() => {
    setRendered((prev) => {
      const want = windowPages(visible, totalPages, renderWindow)
      if (visible.size === 0) return new Set(want)
      return recycledPages(new Set([...prev, ...want]), visible, recycleWindow)
    })
  }, [visible, totalPages, renderWindow, recycleWindow])

  return { visible, rendered }
}
