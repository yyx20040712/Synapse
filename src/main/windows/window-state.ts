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
  /** 可见区原点（F-LIBUI-01：任务栏在左/上时 workArea.x/y≠0——缺省 0 兼容
   *  只传宽高的旧调用面；bootstrap 以 screen.workArea 全形接线） */
  x?: number
  y?: number
  width: number
  height: number
}

/** 把 bounds 夹取进屏幕（防窗口跑出可视区——多显示器拔掉后常见）。
 *  [F-LIBUI-01 ⑦] 原点感知：area 带原点时 x/y 下限取原点（任务栏在左/上时
 *  可见区不从 0 起——纯 0 下限会漏钳）；bootstrap 启动恢复接本函数对
 *  workArea 全维（x/y+宽高）钳制，根治窗口底边沉入任务栏（x/y 原样透传） */
export function clampBounds(bounds: WindowBounds, screen: ScreenArea): WindowBounds {
  const width = Math.max(640, Math.min(bounds.width, screen.width))
  const height = Math.max(480, Math.min(bounds.height, screen.height))
  const ox = screen.x ?? 0
  const oy = screen.y ?? 0
  const x =
    bounds.x === undefined ? undefined : Math.max(ox, Math.min(bounds.x, ox + screen.width - width))
  const y =
    bounds.y === undefined ? undefined : Math.max(oy, Math.min(bounds.y, oy + screen.height - height))
  return { x, y, width, height }
}

export async function loadBounds(userDataDir: string): Promise<WindowBounds> {
  try {
    const raw = await readFile(join(userDataDir, 'window-state.json'), 'utf-8')
    const parsed = JSON.parse(raw) as Partial<WindowBounds>
    if (typeof parsed.width === 'number' && typeof parsed.height === 'number') {
      return {
        x: typeof parsed.x === 'number' ? parsed.x : undefined,
        y: typeof parsed.y === 'number' ? parsed.y : undefined,
        width: parsed.width,
        height: parsed.height
      }
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

/** 关窗持久化的 bounds 来源最小形状（结构化类型：测试免依赖 electron 真体） */
export interface BoundsProvider {
  getBounds(): { x: number; y: number; width: number; height: number }
  getNormalBounds(): { x: number; y: number; width: number; height: number }
}

/**
 * F-G3：关窗持久化取 normal 态 bounds。maximized 态下 getBounds() 是最大化
 * 尺寸，落盘会让下次启动恢复成「大窗非最大化」；getNormalBounds() 在
 * maximized 下返回还原态几何，常态下与 getBounds() 等值（行为零变）。
 */
export function boundsToPersist(win: BoundsProvider): WindowBounds {
  const b = win.getNormalBounds()
  return { x: b.x, y: b.y, width: b.width, height: b.height }
}
