/**
 * [F-SPLIT-01] reader-shortcut-handlers —— 阅读器快捷键装配 hook（自
 * ReaderPage 拆出 2026-09-05；F-03 迁移块——useMemo 工厂与 useReaderShortcuts
 * 接线语句零改纯搬运，deps [] 零变；useMemo 系原件随迁非新增——F-ARCH3
 * 「不加 useCallback/useMemo」纪律口径一致）。
 *
 * ── 行为层 ──
 * - 快捷键装配（F-03 迁移：翻页键=容器滚动步（四键一屏−一行重叠+空格满屏，
 *   SCROLL_STEP_RATIO 单源）；zoomStep/undo 经 ref/getState 取最新——
 *   恒定身份；keydown 接线零改）
 *
 * ── 接口层 ──
 * - export function useReaderShortcutHandlers(scrollAreaRef): void
 *   （scrollAreaRef=滚动容器 ref——宿主 spProg 同一 ref）
 */
import { useMemo } from 'react'
import type { RefObject } from 'react'
import { useReaderStore } from '../state/reader.store'
import { readActiveTab } from '../state/useActiveTab'
import { useReaderShortcuts, SCROLL_STEP_RATIO } from './ReaderShortcuts'
import { ZOOM_STEP, round2 } from './ReaderToolbar'

export function useReaderShortcutHandlers(scrollAreaRef: RefObject<HTMLDivElement | null>): void {
  useReaderShortcuts(
    useMemo(() => {
      const scrollByRatio = (ratio: number): void => {
        const el = scrollAreaRef.current
        if (el !== null) el.scrollBy({ top: Math.round(el.clientHeight * ratio) })
      }
      return {
        prevPage: () => scrollByRatio(-SCROLL_STEP_RATIO),
        nextPage: () => scrollByRatio(SCROLL_STEP_RATIO),
        spaceScroll: () => scrollByRatio(1),
        zoomStep: (dir: 1 | -1) => {
          const t = readActiveTab()
          if (t !== undefined) useReaderStore.getState().setZoom(round2(t.zoom + dir * ZOOM_STEP))
        },
        undo: () => void useReaderStore.getState().undo()
      }
    }, [])
  )
}
