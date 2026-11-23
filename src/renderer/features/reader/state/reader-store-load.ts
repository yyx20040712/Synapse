/**
 * [B4-A R1 §11.1] reader-store-load —— openPaper 加载机（自 reader.store 拆出
 * 2026-11-23——§11.1 拆件：store 薄壳；加载与 tab 生命周期先拆，行为零变=
 * 重构保真锚，reader.store.test.ts 全量零改即绿）。
 *
 * ── 行为层（自 reader.store.openPaper 原样迁驻——语句零改）──
 * - tab 载入状态机：absent（新建）/error（重试）→ loading → ready/error；
 *   ready/loading 幂等激活；loading 重入尾随在途加载（吞 rejection——失败
 *   toast 由首调方报告，不双弹）。
 * - 竞态守卫（INV-03 per-tab 化）：loadSeq 总序号+tabLoadSeq 每_tab 最新发起
 *   序号——迟到响应三规则（①tab 已关丢弃 ②seq 过期丢弃 ③最新写入）判定输入。
 * - inflightOpen：loading 重入句柄（重入方 await 同一加载完成信号）。
 * - forget/forgetAll：closeOne/closeAll 的装载账清理接缝（Map 条目随 tab 消亡）。
 *
 * ── 接口层 ──
 * - export function createReaderLoad(set, get): { openPaper; forget; forgetAll }
 *
 * ── 架构层 ──
 * - 只 import api/client 与 tab-state；set/get 由宿主 store 注入（zustand 薄壳
 *   分层——本件不持 store 实例，禁循环依赖）。
 */
import { api, unwrap } from '../../../api/client'
import { makeLoadingTab, type TabState } from './tab-state'

/** 装载面消费的 store 切片（宿主 store 的子集——薄壳注入零耦合） */
interface LoadStoreSlice {
  tabs: Record<string, TabState>
  order: string[]
  activeId: string | null
}

type StoreSet = (partial: Partial<LoadStoreSlice> | ((s: LoadStoreSlice) => Partial<LoadStoreSlice>)) => void
type StoreGet = () => LoadStoreSlice

export function createReaderLoad(set: StoreSet, get: StoreGet): {
  openPaper(id: string): Promise<void>
  /** closeOne 装载账清理（tabLoadSeq/inflightOpen 条目随 tab 消亡） */
  forget(id: string): void
  /** closeAll 装载账清理 */
  forgetAll(): void
} {
  // 加载总序号：每次 openPaper 发起自增；tabLoadSeq 记录每 tab 最新发起的序号
  // （迟到响应三规则的判定输入）；inflightOpen 让 loading 态重入尾随在途加载
  // （不提前 resolve——重入方 await 到的是同一加载的完成信号，失败由首调方报告）
  let loadSeq = 0
  const tabLoadSeq = new Map<string, number>()
  const inflightOpen = new Map<string, Promise<void>>()

  /** 本次响应是否仍是该 tab 的最新加载（规则①②判定：tab 已关或已被新一轮顶替即过期） */
  const isCurrentLoad = (paperId: string, seq: number): boolean => {
    return get().tabs[paperId] !== undefined && tabLoadSeq.get(paperId) === seq
  }

  async function openPaper(id: string): Promise<void> {
    const existing = get().tabs[id]
    if (existing !== undefined && (existing.status === 'ready' || existing.status === 'loading')) {
      set({ activeId: id })
      // loading 重入：尾随在途加载（吞 rejection——失败 toast 由首调方报告，不双弹）
      const inflight = inflightOpen.get(id)
      if (existing.status === 'loading' && inflight !== undefined) {
        await inflight.catch(() => undefined)
      }
      return
    }
    // absent（新建）或 error（重试）→ loading
    const seq = ++loadSeq
    tabLoadSeq.set(id, seq)
    set((s) => ({
      tabs: { ...s.tabs, [id]: makeLoadingTab(id, existing) },
      order: s.order.includes(id) ? s.order : [...s.order, id],
      activeId: id
    }))
    let load: Promise<void> | null = null
    const p = (async (): Promise<void> => {
      try {
        const d = await unwrap(api.reader.open({ paperId: id }))
        if (!isCurrentLoad(id, seq)) return
        const anns = await unwrap(api.reader.listAnnotations({ paperId: id }))
        if (!isCurrentLoad(id, seq)) return
        set((s) => ({
          tabs: {
            ...s.tabs,
            [id]: {
              ...(s.tabs[id] ?? makeLoadingTab(id, undefined)),
              fileUrl: d.fileUrl,
              fileName: d.fileName,
              title: d.title,
              page: d.lastReadPage,
              annotations: anns,
              status: 'ready'
            }
          }
        }))
      } catch (e) {
        if (!isCurrentLoad(id, seq)) return
        // 最新加载的失败才可见（旧一轮失败已被重试顶替，静默）；tab 置 error
        // 占位（tab 栏可显示，重入即重试），错误仍上抛消费方 toast
        set((s) => ({
          tabs: s.tabs[id] === undefined ? s.tabs : { ...s.tabs, [id]: { ...s.tabs[id]!, status: 'error' } }
        }))
        throw e
      } finally {
        // 身份校验：仅当 Map 记录仍是本加载才删（closeTab 后立即重开同 id 时，
        // Map 里已是新加载的记录，旧 finally 不得误删）
        if (load !== null && inflightOpen.get(id) === load) {
          inflightOpen.delete(id)
        }
      }
    })()
    load = p
    inflightOpen.set(id, load)
    return load
  }

  return {
    openPaper,
    forget(id) {
      tabLoadSeq.delete(id)
      inflightOpen.delete(id)
    },
    forgetAll() {
      tabLoadSeq.clear()
      inflightOpen.clear()
    }
  }
}
