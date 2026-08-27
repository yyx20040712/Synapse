// b3: P7-H
/**
 * lineage.store —— 脉络图数据+读面状态单源（store）。
 *
 * ── 数据单源接缝声明（双向锚定：本行+LineagePage 头注）──
 * lineage/graph 取数=本 store 单点；LineagePage/LineageCanvas/03 编辑层
 * （LineageBoard）/04 侧板（LineageSidePanel）一律经本 store 分发消费——
 * **03/04 禁双取**（不得另行直连 window.api.lineage.graph 建第二取数点；
 * 04 的 ai_notes/list、notes/get 属不同数据域不在本约）。数据缓存：nodes/
 * edges 驻 store（视图切换卸载不丢，03/04 消费面免二次取数）。
 *
 * ── 读面状态枚举（门一 N6）──
 * loading/ready/error 三态；无用户输入写面（状态机前置纪律不适用——票面
 * N6 结论维持；pan/zoom=视口瞬态不入本 store）。stale-guard 请求序号
 * （notes.store/ai-notes.store 同型）：晚到的旧响应（含旧失败）丢弃。
 *
 * 错误契约：load 失败不上抛——失败态驻 store.error（列表型瞬态，消费方
 * 呈现+重试，INV-02 两型分清；动作型 toast 面=03 写通道）。
 */
import { create } from 'zustand'
import { api, unwrap } from '../../api/client'
import type { LineageEdge, LineageNode } from '@shared/models/lineage'

export type LineageStatus = 'loading' | 'ready' | 'error'

export interface LineageStore {
  nodes: LineageNode[]
  edges: LineageEdge[]
  status: LineageStatus
  error: string | null
  load(): Promise<void>
}

export const useLineageStore = create<LineageStore>()((set) => {
  // 请求序号 stale-guard：新 load 取代旧 load 后，旧响应（成功/失败）丢弃
  let seq = 0

  return {
    nodes: [],
    edges: [],
    status: 'loading',
    error: null,

    async load() {
      const s = ++seq
      set({ status: 'loading', error: null })
      try {
        const graph = await unwrap(api.lineage.graph({}))
        if (s !== seq) return
        set({ nodes: graph.nodes, edges: graph.edges, status: 'ready', error: null })
      } catch (e) {
        if (s !== seq) return
        set({ status: 'error', error: e instanceof Error ? e.message : String(e) })
      }
    }
  }
})
