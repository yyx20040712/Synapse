/**
 * [F-ANCHFIX-01 批 1c] anchor-occupancy —— 锚占用态模块级外部存储
 * （INV-120：armed 态锚显示域=可吸附判定域〔CardAnchorDots 12 dot≡
 * anchors.ts Side×SLOT_FRACTIONS〕；占用标记单源=routeAll anchorMarks/
 * EdgeOverlay data-anchors 透出）。
 *
 * 态空间声明：{∅ 初态（Map 空）, Map 已发布}——写入=EdgeOverlay run() rAF
 * 单写者 wholesale（setPaths 后同步 publish，全图一次置换，无增量写、无
 * 用户输入直写）；读=per-card selector（getOcc(nodeId)——CardAnchorDots
 * useSyncExternalStore getSnapshot）。
 *
 * getSnapshot 缓存纪律（React 18 稳定引用——违反即 useSyncExternalStore
 * 无限循环红）：publish 时未变化的卡沿用旧 Set 引用；缺席卡恒返回同一
 * undefined；内容全等（逐键相同）重复 publish 不通知订阅者。
 *
 * 边界（已知申报）：EdgeOverlay 卸载不清场——锚层与连线层同树同亡
 * （.tl-content 子树），无悬挂消费面；测量冻结期（.tl-measure）run 早退
 * 条款随 [F-SLOTGRID-01 U1] 瀑布退役删除——run 无冻结分支。
 */
/** 占用键（t/b/l/r×0/1/2——anchors.ts anchorId 字母表镜像；显示域≡判定域） */
export type AnchorSlotKey = 't0' | 't1' | 't2' | 'b0' | 'b1' | 'b2' | 'l0' | 'l1' | 'l2' | 'r0' | 'r1' | 'r2'

/** 消费面结构类型（RoutedPath 子集——仅 anchorMarks 观测字段） */
export interface OccupancySource {
  anchorMarks?: string
}

type OccMap = Map<string, ReadonlySet<AnchorSlotKey>>

/** 12 占用键全称域（防御解析——域外 token 跳过） */
const VALID_KEYS: ReadonlySet<string> = new Set([
  't0', 't1', 't2',
  'b0', 'b1', 'b2',
  'l0', 'l1', 'l2',
  'r0', 'r1', 'r2'
])

let current: OccMap = new Map()
const listeners = new Set<() => void>()

/** 订阅（useSyncExternalStore subscribe 形——返回退订函数） */
export function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

/** 全图置换发布（rAF 单写者调用；未变卡沿用旧 Set 引用，内容全等零通知） */
export function publish(paths: readonly OccupancySource[]): void {
  const next = new Map<string, Set<AnchorSlotKey>>()
  for (const p of paths) {
    if (p.anchorMarks === undefined || p.anchorMarks === '') continue
    for (const tok of p.anchorMarks.split(',')) {
      const i = tok.lastIndexOf(':')
      if (i <= 0 || i === tok.length - 1) continue
      const nodeId = tok.slice(0, i)
      const key = tok.slice(i + 1)
      if (!VALID_KEYS.has(key)) continue
      const set = next.get(nodeId) ?? new Set<AnchorSlotKey>()
      set.add(key as AnchorSlotKey)
      next.set(nodeId, set)
    }
  }
  let changed = current.size !== next.size
  const merged: OccMap = new Map()
  for (const [id, set] of next) {
    const prev = current.get(id)
    if (prev !== undefined && prev.size === set.size && [...set].every((k) => prev.has(k))) {
      merged.set(id, prev)
    } else {
      merged.set(id, set)
      changed = true
    }
  }
  if (!changed) return
  current = merged
  for (const l of listeners) l()
}

/** per-card 占用集读取（getSnapshot——稳定引用纪律见头注；缺席恒 undefined） */
export function getOcc(nodeId: string): ReadonlySet<AnchorSlotKey> | undefined {
  return current.get(nodeId)
}
