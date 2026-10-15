/**
 * [F-UIRES-04 批 3a] paperInfoStore —— 论文信息区取数机 M1（zustand 微
 * store；设计书 §4.3+§4.11-M1。态=idle/loading/ready/error×六事件）。
 * - 接受判据（B1）：RESOLVE/REJECT 恒写缓存；view 落定仅当 pId===currentPId
 *   且 seq===activeSeq（S1 乱序弃 UI/S7 回绑令牌）。
 * - SELECT：HIT 同步 ready 零 IPC（S8）／在飞复用+回绑（S7）／error 维持（S9）／miss 新发；RETRY 仅 error 态（S2 单 in-flight）。
 * - INVALIDATE 本批零派发（挂 F-TAGS-02 域化启用）：loading 中到达→落定写穿校验（旧值弃置，选中滚动新 seq 重取 S6）；完成态=逐出重取。
 *   UNMOUNT=模块级免疫（S4 缓存驻留）；CANCEL/TIMEOUT 不引入（scope 界）。
 * - LRU 容量 20 篇仅逐完成态（S10；evictLruCompleted 单源=M2 同款——§4.8）。
 * - 驻 renderer/shared（§4.4 两域→shared 允许；消费面=脉络域 3b 集成）；
 *   取数=api.library.detail（零 schema 变更）。测试件=S1-S9+LRU（受锁）。
 */
import { create } from 'zustand'
import { api, unwrap } from '../api/client'
import type { PaperDetail } from '@shared/models/paper'

/** LRU 容量（篇）——M1/M2 同款（§4.8 末段） */
export const PAPER_INFO_LRU_CAP = 20

/** 缓存条目（缺条目=idle；stale=INVALIDATE 写穿标记仅 loading 条目；在飞共享=SELECT 按 status==='loading' 判定〔S5/S7〕——§4.3 promise? 不落=无消费方死声明，3b 实装再加回〔回炉 B〕 */
export interface PaperInfoEntry { status: 'loading' | 'ready' | 'error'; data?: PaperDetail; error?: string; seq: number; stale?: boolean }

/** 选中投影（UI 消费面——接受判据 gated；idle=未选中/已卸载） */
export interface PaperInfoView { status: 'idle' | 'loading' | 'ready' | 'error'; data?: PaperDetail; error?: string }

export interface PaperInfoStore {
  entries: Map<string, PaperInfoEntry>; currentPId: string | null; activeSeq: number; view: PaperInfoView
  select(pId: string): void; retry(pId: string): void; unmount(): void; invalidate(pId: string): void
}

/** LRU 淘汰单源（M1/M2 同款：仅完成态可逐、选中/在飞永不逐；就地变更） */
export function evictLruCompleted(cache: Map<string, { status: string }>, cap: number, currentPId: string | null): void {
  for (const key of cache.keys()) {
    if (cache.size <= cap) break
    const e = cache.get(key)
    if (e === undefined || key === currentPId || e.status === 'loading' || e.status === 'extracting') continue
    cache.delete(key)
  }
}

let seqCounter = 0

export const usePaperInfoStore = create<PaperInfoStore>()((set, get) => {
  /** Map 变更单点：克隆→变更→LRU→set */
  const commit = (mutate: (m: Map<string, PaperInfoEntry>) => void): void => {
    const next = new Map(get().entries)
    mutate(next)
    evictLruCompleted(next, PAPER_INFO_LRU_CAP, get().currentPId)
    set({ entries: next })
  }

  /** RESOLVE/REJECT 落定单点（单 in-flight/pId 结构性成立——S2 承载） */
  const settle = (pId: string, seq: number, r: { data?: PaperDetail; error?: string }): void => {
    const cur = get().entries.get(pId)
    if (cur !== undefined && cur.stale === true) {
      // 写穿校验（S6）：旧值弃置（零陈旧 HIT）；选中滚动新 seq 重取
      commit((m) => { m.delete(pId) })
      if (get().currentPId === pId) set({ activeSeq: fetchInfo(pId), view: { status: 'loading' } })
      return
    }
    const ok = r.error === undefined
    const v: PaperInfoView = ok ? { status: 'ready', data: r.data } : { status: 'error', error: r.error }
    commit((m) => { m.delete(pId); m.set(pId, ok ? { status: 'ready', data: r.data, seq } : { status: 'error', error: r.error, seq }) })
    if (get().currentPId === pId && get().activeSeq === seq) set({ view: v }) // 接受判据（B1）
  }

  /** 取数单点（select miss/retry/invalidate 重取共用；seq=闭包令牌） */
  const fetchInfo = (pId: string): number => {
    seqCounter += 1
    const seq = seqCounter
    unwrap(api.library.detail({ paperId: pId })).then(
      (data) => settle(pId, seq, { data }),
      (e: unknown) => settle(pId, seq, { error: e instanceof Error ? e.message : String(e) })
    )
    commit((m) => { m.delete(pId); m.set(pId, { status: 'loading', seq }) })
    return seq
  }

  return {
    entries: new Map(), currentPId: null, activeSeq: 0, view: { status: 'idle' },
    select(pId) {
      const cur = get().entries.get(pId)
      if (cur !== undefined && cur.status !== 'loading') {
        // 完成态 HIT 同步 ready（S8）／error 维持（S9）；LRU recency 刷新
        commit((m) => { const e = m.get(pId); m.delete(pId); if (e !== undefined) m.set(pId, e) })
        set({ currentPId: pId, view: cur.status === 'ready' ? { status: 'ready', data: cur.data } : { status: 'error', error: cur.error } })
        return
      }
      const seq = cur === undefined ? fetchInfo(pId) : cur.seq // miss 新发／在飞复用+回绑（S7）
      set({ currentPId: pId, activeSeq: seq, view: { status: 'loading' } })
    },
    retry(pId) {
      if (get().entries.get(pId)?.status !== 'error') return // RETRY 仅 error 态（S2）
      const seq = fetchInfo(pId)
      if (get().currentPId === pId) set({ activeSeq: seq, view: { status: 'loading' } })
    },
    // 模块级免疫（S4）：currentPId 置 null=晚到落定不进 view；缓存驻留重挂 HIT
    unmount() { set({ currentPId: null, view: { status: 'idle' } }) },
    invalidate(pId) {
      const cur = get().entries.get(pId)
      if (cur === undefined) return
      if (cur.status === 'loading') {
        commit((m) => { const e = m.get(pId); if (e !== undefined) m.set(pId, { ...e, stale: true }) })
        return
      }
      commit((m) => { m.delete(pId) }) // 完成态=逐出（零陈旧 HIT）
      if (get().currentPId === pId) set({ activeSeq: fetchInfo(pId), view: { status: 'loading' } })
    }
  }
})
