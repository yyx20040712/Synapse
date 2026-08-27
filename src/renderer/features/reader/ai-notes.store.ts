// b3: P7-G
/**
 * ai-notes.store —— AI 笔记数据+状态行观测事实单源（store）。
 *
 * ── writeStatusProtocol 失败面幂等自愈声明（门二补充③） ──
 * 请求写 job（requestAiRead）失败后不产生任何本地残留态（不置 busy 锁/不写
 * 半态）——重试幂等由 06 服务保证（同篇 pending 在则返回既有 jobId），UI 无
 * 自建 in-flight 锁，失败后用户可直接重点。
 *
 * ── 数据单源接缝声明 ──
 * ai-notes/list 取数+导入后刷新=本 store 单点；AI-09 渲染层经宿主订阅本
 * store 分发 props 消费——禁 09 双取（接缝双向锚定：本行+AiNotesSection 头注）。
 * notes.store 零触碰（新数据新域，C-03「不新增任何 notes.store 字段」纪律）。
 * LG-04 例外（门一 W4 裁）：脉络侧板（LineageSideAiNotes）per-paper 惰性直连
 * window.api 取数**不经本 store**——lineage 域 import 本 store 即违 quality
 * 跨域互引红线；生命周期不同（选中节点触发 vs 08 面板挂载期轮询）。单约
 * 范围限 reader 域消费方（接缝双向锚定：本行+LineageSidePanel 头注）。
 *
 * 错误契约：loadNotes/loadObserve 失败上抛（unwrap 的 ApiClientError）——
 * loadObserve 由组件按轮询失败计数消费（连续 3 次离线提示，列表型静默）；
 * loadNotes 由组件静默吞（列表瞬态）；requestRead/importAll 失败由组件
 * toast（动作型，INV-02 两型分清）。observe 通道=status+per-paper 三事实
 * 聚合（主控裁决方向 B，2026-08-27——六态状态机判定事实单源）。
 */
import { create } from 'zustand'
import { api, unwrap } from '../../api/client'
import type { AiNote } from '@shared/models/ai-note'
import type { AiNotesImportRes, ObserveRes } from '@shared/ipc/schemas'

export interface AiNotesStore {
  /** ai-notes/list 数据（按 paperId 键控——per-tab 语义驻 store） */
  notesByPaper: Record<string, AiNote[]>
  /** ai-sensor/observe 观测事实（六态判定输入；null=尚无成功观测） */
  observeByPaper: Record<string, ObserveRes | null>
  loadNotes(paperId: string): Promise<void>
  loadObserve(paperId: string): Promise<void>
  requestRead(paperId: string): Promise<void>
  importAll(): Promise<AiNotesImportRes>
}

export const useAiNotesStore = create<AiNotesStore>()((set, get) => {
  // 请求序号 stale-guard（notes.store 同型）：晚到的旧响应（含旧失败）丢弃
  let notesSeq = 0
  let observeSeq = 0

  return {
    notesByPaper: {},
    observeByPaper: {},

    async loadNotes(paperId) {
      const seq = ++notesSeq
      const notes = await unwrap(api.ai_sensor.listByPaper({ paperId }))
      if (seq !== notesSeq) return
      set({ notesByPaper: { ...get().notesByPaper, [paperId]: notes } })
    },

    async loadObserve(paperId) {
      const seq = ++observeSeq
      const res = await unwrap(api.ai_sensor.observe({ paperId }))
      if (seq !== observeSeq) return
      set({ observeByPaper: { ...get().observeByPaper, [paperId]: res } })
    },

    async requestRead(paperId) {
      await unwrap(api.ai_sensor.requestAiRead({ paperId }))
    },

    async importAll() {
      return unwrap(api.ai_sensor.importAll({}))
    }
  }
})
