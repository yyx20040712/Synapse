/**
 * 窗口位置记忆（SR-INFRA-10，已完成）。
 *
 * 职责：把窗口 bounds 持久化到 userData（JSON）；启动时恢复并夹取到
 * 可用屏幕范围内。纯函数 clampBounds 单测覆盖。
 */
import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

export interface WindowBounds {
  x?: number
  y?: number
  width: number
  height: number
}

export const DEFAULT_BOUNDS: WindowBounds = { width: 1280, height: 800 }

export interface ScreenArea {
  width: number
  height: number
}

/** 把 bounds 夹取进屏幕（防窗口跑出可视区——多显示器拔掉后常见） */
export function clampBounds(bounds: WindowBounds, screen: ScreenArea): WindowBounds {
  const width = Math.max(640, Math.min(bounds.width, screen.width))
  const height = Math.max(480, Math.min(bounds.height, screen.height))
  const x =
    bounds.x === undefined ? undefined : Math.max(0, Math.min(bounds.x, screen.width - width))
  const y =
    bounds.y === undefined ? undefined : Math.max(0, Math.min(bounds.y, screen.height - height))
  return { x, y, width, height }
}

export async function loadBounds(userDataDir: string): Promise<WindowBounds> {
  try {
    const raw = await readFile(join(userDataDir, 'window-state.json'), 'utf-8')
    const parsed = JSON.parse(raw) as Partial<WindowBounds>
    if (typeof parsed.width === 'number' && typeof parsed.height === 'number') {
      return { x: parsed.x, y: parsed.y, width: parsed.width, height: parsed.height }
    }
  } catch {
    // 首次启动或损坏：回退默认
  }
  return { ...DEFAULT_BOUNDS }
}

export async function saveBounds(userDataDir: string, bounds: WindowBounds): Promise<void> {
  try {
    await writeFile(join(userDataDir, 'window-state.json'), JSON.stringify(bounds), 'utf-8')
  } catch {
    // 持久化失败不阻断退出
  }
}
