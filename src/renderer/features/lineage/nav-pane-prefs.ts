// b3: P7-H
/**
 * [F-LGRAPH-01①U4] nav-pane-prefs —— 导航窗格 P-17 记忆（renderer localStorage
 * 单键 JSON map——主控裁决：单用户本地应用无同步需求，不为 UI 临时态扩 DB
 * 迁移面）。键 `synapse:lineage:nav-pane`，值 {[folderId]:{width,collapsed}}
 * ——写时钳 160–320（越界回落边界值）；读失败（脏数据/无键）=缺省 208 展开。
 */
import { NAV_WIDTH_DEFAULT, NAV_WIDTH_MAX, NAV_WIDTH_MIN } from './lineage-view.store'

const NAV_PREFS_KEY = 'synapse:lineage:nav-pane'

export interface NavPanePrefs {
  width: number
  collapsed: boolean
}

const clampWidth = (w: number): number => Math.min(NAV_WIDTH_MAX, Math.max(NAV_WIDTH_MIN, w))

export const defaultNavPrefs = (): NavPanePrefs => ({ width: NAV_WIDTH_DEFAULT, collapsed: false })

/** 读该图记忆（无键/脏数据=缺省——不抛不断） */
export function readNavPrefs(folderId: string): NavPanePrefs {
  try {
    const raw = localStorage.getItem(NAV_PREFS_KEY)
    if (raw === null) return defaultNavPrefs()
    const map = JSON.parse(raw) as Record<string, Partial<NavPanePrefs>>
    const p = map[folderId]
    if (p === undefined || typeof p.width !== 'number' || typeof p.collapsed !== 'boolean') {
      return defaultNavPrefs()
    }
    return { width: clampWidth(p.width), collapsed: p.collapsed }
  } catch {
    return defaultNavPrefs()
  }
}

/** 写该图记忆（写时钳 160–320） */
export function writeNavPrefs(folderId: string, prefs: NavPanePrefs): void {
  try {
    const raw = localStorage.getItem(NAV_PREFS_KEY)
    const map = raw !== null ? (JSON.parse(raw) as Record<string, NavPanePrefs>) : {}
    map[folderId] = { width: clampWidth(prefs.width), collapsed: prefs.collapsed }
    localStorage.setItem(NAV_PREFS_KEY, JSON.stringify(map))
  } catch {
    // localStorage 不可用（隐私模式/配额）——记忆面降级，不抛不断
  }
}
