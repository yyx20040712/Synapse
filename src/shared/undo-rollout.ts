/**
 * 统一撤销历史的启动灰度档。档位只能沿下列顺序前进；解析结果由 main 固定，
 * renderer 不再读环境变量。
 */
export type UndoRollout =
  | 'off'
  | 'reader'
  | 'lineage'
  | 'library-basic'
  | 'library-composite'
  | 'all'

export const UNDO_ROLLOUT_ORDER: readonly UndoRollout[] = [
  'off',
  'reader',
  'lineage',
  'library-basic',
  'library-composite',
  'all'
]

/** 第一批生产上限。启用更高档必须在后续批次单独验收。 */
export const DELIVERED_UNDO_ROLLOUT: UndoRollout = 'off'

export interface UndoRolloutResolution {
  rollout: UndoRollout
  diagnostic: string | null
}

function rankOf(value: UndoRollout): number {
  return UNDO_ROLLOUT_ORDER.indexOf(value)
}

/**
 * 缺省返回 off。非空未知值和超过 max 的合法值都回退 max 并携带诊断；
 * 诊断是否打印由启动装配点决定。
 */
export function parseUndoRollout(
  value: string | undefined,
  max: UndoRollout = DELIVERED_UNDO_ROLLOUT
): UndoRolloutResolution {
  if (value === undefined) return { rollout: max, diagnostic: null }
  const requested = UNDO_ROLLOUT_ORDER.find((rollout) => rollout === value)
  if (requested === undefined) {
    return { rollout: 'off', diagnostic: 'SYNAPSE_UNDO_ROLLOUT 非法，回退 off' }
  }
  if (rankOf(requested) > rankOf(max)) {
    return { rollout: max, diagnostic: `SYNAPSE_UNDO_ROLLOUT=${requested} 超出本版上限 ${max}，回退 ${max}` }
  }
  return { rollout: requested, diagnostic: null }
}

/** renderer 单次读取 query；字段名与 main 侧 MainWindowLoad 装配一致。 */
export function resolveStartupUndoRollout(search: string): UndoRolloutResolution {
  return parseUndoRollout(new URLSearchParams(search).get('undoRollout') ?? undefined)
}
