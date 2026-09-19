/**
 * reading-time-outbox-store —— P7X-02 outbox 持久面：localStorage 适配器
 * （拆自 reading-time-outbox.ts：队列态机与持久适配=两职责两文件，宪法
 * 「出现第二职责就拆文件」+新模块 ≤300 行票面配套）。
 * CO-1：每条目独立 key+元信息 key（禁整表 JSON 重写——单条目写放大最小且
 * 损坏隔离）；损坏条目丢弃+WARN+自清（key 移除防每次启动重复告警）。
 * 纯注入（OutboxStorageLike——单测 mock/装配真 window.localStorage）。
 * [F-TIME-02] 向后兼容：存量条目可能携带旧时长载荷 seconds 字段——形状校验
 * 只核必备键不拒多余键（非 strict），读回对象多出的 seconds 被消费面忽略
 * （dispatch 只取 paperId/page），条目一经 update/remove 即自然淘汰。
 */
import type { OutboxEntry, OutboxStore } from './reading-time-outbox'

/** localStorage 形状（注入面） */
export interface OutboxStorageLike {
  readonly length: number
  key(index: number): string | null
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

export const OUTBOX_ENTRY_KEY_PREFIX = 'synapse.outbox.entry.'
export const OUTBOX_META_KEY = 'synapse.outbox.meta'
const OUTBOX_STATES: ReadonlyArray<OutboxEntry['state']> = ['pending', 'in-flight', 'dead-letter']

/** 条目形状校验（损坏=丢字段/坏 JSON/态名非法——一律按 corrupt 处理；
 * 多余键（F-TIME-02 前旧条目的 seconds）非损坏=向后兼容忽略） */
const isEntry = (x: Partial<OutboxEntry>): x is OutboxEntry => {
  return (
    typeof x.id === 'string' &&
    typeof x.paperId === 'string' &&
    typeof x.seq === 'number' &&
    typeof x.attempts === 'number' &&
    typeof x.state === 'string' &&
    OUTBOX_STATES.includes(x.state as OutboxEntry['state'])
  )
}

export function createLocalStorageOutboxStore(
  ls: OutboxStorageLike,
  hooks: { onCorrupt?(message: string): void } = {}
): OutboxStore {
  const ensureMeta = (): void => {
    if (ls.getItem(OUTBOX_META_KEY) !== null) return
    try {
      ls.setItem(OUTBOX_META_KEY, '{"v":1}')
    } catch {
      // 配额等异常上抛由 outbox 退化面接手
    }
  }
  return {
    loadAll(): OutboxEntry[] {
      const out: OutboxEntry[] = []
      const bad: string[] = []
      for (let i = 0; i < ls.length; i++) {
        const k = ls.key(i)
        if (k === null || !k.startsWith(OUTBOX_ENTRY_KEY_PREFIX)) continue
        const raw = ls.getItem(k)
        if (raw === null) continue
        try {
          const parsed = JSON.parse(raw) as Partial<OutboxEntry>
          if (!isEntry(parsed)) throw new Error('entry shape mismatch')
          out.push({ ...parsed })
        } catch {
          bad.push(k)
        }
      }
      for (const k of bad) {
        try {
          ls.removeItem(k)
        } catch {
          // 自清尽力而为
        }
        hooks.onCorrupt?.(`离线进度缓存条目损坏已清除（${k}）`)
      }
      return out
    },
    put(e) {
      ensureMeta()
      ls.setItem(OUTBOX_ENTRY_KEY_PREFIX + e.id, JSON.stringify(e))
    },
    update(e) {
      ls.setItem(OUTBOX_ENTRY_KEY_PREFIX + e.id, JSON.stringify(e))
    },
    remove(id) {
      ls.removeItem(OUTBOX_ENTRY_KEY_PREFIX + id)
    }
  }
}
