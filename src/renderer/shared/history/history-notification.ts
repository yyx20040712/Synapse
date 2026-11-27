/**
 * 单次发布边界。begin 后实际 mutation 标脏；end 时只发布一次。
 */
export interface HistoryNotifier {
  subscribe(listener: () => void): () => void
  notify(): void
  begin(): void
  end(): void
  clear(): void
}

export function createHistoryNotifier(): HistoryNotifier {
  const listeners = new Set<() => void>()
  let depth = 0
  let changed = false

  return {
    subscribe(listener) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    notify() {
      if (depth > 0) {
        changed = true
        return
      }
      for (const listener of [...listeners]) listener()
    },
    begin() {
      depth += 1
    },
    end() {
      depth -= 1
      if (depth === 0 && changed) {
        changed = false
        this.notify()
      }
    },
    clear() {
      listeners.clear()
    }
  }
}
