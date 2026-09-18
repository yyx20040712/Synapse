// b3: P7-F
/**
 * [F-SPLIT-01] usePageColumnScroll —— 页列滚动接线 hook 件（自 PageColumn
 * 拆出 2026-09-05；迁移 PageColumn 头注段⑤程序滚动+段⑥滚动镜像职责段——
 * 段⑥缩放锚本体（anchoredScrollTop 程序修正 useLayoutEffect）禁动留守
 * PageColumn，本件只搬其滚动位置镜像数据源与段⑤程序滚动，语句零改纯搬运）。
 *
 * ── 行为层 ──
 * - 段⑤程序滚动（INV-29 单口）：夹取→页盒顶对齐视口顶（F-05 单容器收敛
 *   INV-34）；未就绪挂起、就绪补滚（双页左右页盒顶同行——滚行顶零特判）。
 *   deps [scrollRequest, pageSizes, totalPages] 零变。
 * - 段⑥滚动位置镜像：容器 scroll 事件被动监听（挂载即读初值——恢复链程序
 *   滚动亦派发事件）；镜像值写入宿主 liveScrollTop ref（缩放锚消费——语义
 *   同拆前，程序/用户滚动皆覆盖）。deps [scrollContainerRef] 零变。
 *
 * ── 接口层 ──
 * - export function usePageScrollRequest(scrollRequest, pageSizes, totalPages,
 *   rootRef): void / useScrollTopMirror(scrollContainerRef, liveScrollTop): void
 * - PageScrollRequest 接口（原驻 PageColumn）随段⑤迁入本件；PageColumn 再
 *   导出维持 PagesOverlay/ReaderPage 既有 import 路径（单实现双出口——
 *   nearestPage 再导出先例）。
 */
import { useEffect } from 'react'
import type { MutableRefObject, RefObject } from 'react'
import { clampPageToColumn, type PageBoxSize } from './page-column-geometry'
import { scrollIntoNearestScroller } from '../state/scroll-converge'

/** 程序滚动请求（reader.store scrollRequest 的形状——INV-29 单口消费面） */
export interface PageScrollRequest {
  paperId: string
  page: number
  seq: number
}

/** 段⑤程序滚动（INV-29 单口）：夹取→页盒顶对齐视口顶；未就绪挂起、就绪补滚 */
export function usePageScrollRequest(
  scrollRequest: PageScrollRequest | null | undefined,
  pageSizes: PageBoxSize[] | null,
  totalPages: number,
  rootRef: RefObject<HTMLDivElement | null>
): void {
  useEffect(() => {
    if (pageSizes === null || scrollRequest === null || scrollRequest === undefined) return
    const no = clampPageToColumn(scrollRequest.page + 1, totalPages)
    const box = rootRef.current?.querySelector<HTMLElement>(`[data-page-box="${no}"]`) ?? null
    if (box !== null) scrollIntoNearestScroller(box, 'start')
  }, [scrollRequest, pageSizes, totalPages])
}

/** 段⑥滚动位置镜像：容器 scroll 事件被动监听（挂载即读初值——恢复链程序
 *  滚动亦派发事件）；写入宿主 liveScrollTop ref 供缩放锚消费 */
export function useScrollTopMirror(
  scrollContainerRef: RefObject<HTMLDivElement | null> | undefined,
  liveScrollTop: MutableRefObject<number>
): void {
  useEffect(() => {
    const el = scrollContainerRef?.current ?? null
    if (el === null) return
    const mirror = (): void => {
      liveScrollTop.current = el.scrollTop
    }
    mirror()
    el.addEventListener('scroll', mirror, { passive: true })
    return () => el.removeEventListener('scroll', mirror)
  }, [scrollContainerRef])
}
