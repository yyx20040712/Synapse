// b3: P7-H
/**
 * lineage.store —— 脉络图数据+读面/写面状态单源（store；写队列机制拆件=
 * lineage-write-queue.ts[F-LGRAPH-01①U1]，本件保留数据态+读面+方法签名薄壳）。
 *
 * ── 数据单源接缝声明（双向锚定：本行+LineagePage 头注）──
 * lineage/graph 取数=本 store 单点；LineagePage/LineageTimeline/03 编辑层
 * （LineageBoard）/04 侧板（LineageSidePanel）一律经本 store 分发消费——
 * **03/04 禁双取**（不得另行直连 window.api.lineage.graph 建第二取数点）。
 * 数据缓存：nodes/edges 驻 store（视图切换卸载不丢，03/04 消费面免二次取数）。
 *
 * ── 读面状态枚举（门一 N6）──
 * loading/ready/error 三态；stale-guard 请求序号：晚到的旧响应（含旧失败）
 * 丢弃；**写面互锁（LG-03）**：写队列未清空时 graph 落地同样丢弃（写回填面
 * 为准）。写面状态机单源=lineage-write-queue.ts 头注（saveStatus/queue/flush）。
 *
 * 错误契约：load 失败不上抛——失败态驻 store.error（列表型瞬态，消费方
 * 呈现+重试，INV-02 两型分清；动作型 toast 面=write-queue flush 内）。
 */
import { create } from 'zustand'
import { api, unwrap } from '../../api/client'
import { MAIN_GRAPH_ID } from '@shared/models/lineage'
import type { LineagePaperMetrics } from '@shared/ipc/schemas'
import type { LineageEdge, LineageNode, LineTypeGroup } from '@shared/models/lineage'
import { createWriteQueue } from './lineage-write-queue'
import { useLineageViewStore } from './lineage-view.store'
import type { LineageSaveStatus, WriteAction } from './lineage-write-queue'

export type { LineageSaveStatus, LazyNodeUpsert } from './lineage-write-queue'

export type LineageStatus = 'loading' | 'ready' | 'error'

export interface LineageStore {
  nodes: LineageNode[]
  edges: LineageEdge[]
  /** F-LG14 含金量摘要（键=paperId，graph 单读随行；主题节点无键） */
  paperMetrics: Record<string, LineagePaperMetrics>
  /** [F-FOLDER-01] pubNo 表（键=paperId——INV-92 库级派生编号，graph 单读随行） */
  pubNos: Record<string, number>
  /** [T3-P7A] 线型组（graph 单读随行——恒四组；EdgeOverlay sub 覆盖渲染消费） */
  lineTypes: LineTypeGroup[]
  status: LineageStatus
  error: string | null
  /** [F-LGRAPH-01①U4] 当前图作用域：**恒有值**（并集退役——每图只显示自身，
   *  主图 __main__ 兜底不可删）；消费面=load 载荷（恒显式 folderId）+主题节点
   *  当前图（addThemeNode）+导航窗格图/文件夹下拉。IPC/main 侧 folderId 可选性
   *  保留（历史兼容，不收紧 schema）。缺省图=库页文件夹上下文同步（接缝
   *  双向锚定：本头注+library.store 头注——LineagePage 挂载时读
   *  library.store query.folderScope：kind='folder' 用其 folderId，否则主图） */
  folderId: string
  /** 写面保存态三态（≠saved 即脏——退出聚合输入） */
  saveStatus: LineageSaveStatus
  /** 最近一次系统型写失败消息（error 态指示条呈现；成功清空） */
  lastWriteError: string | null
  /** 待发/重发写动作队列（驻 state 供测试与脏态判定；flushing=串行派发中） */
  queue: WriteAction[]
  flushing: boolean
  load(): Promise<void>
  /** [F-LGRAPH-01①U4] 切图（folderId 恒有值——主图兜底）：置态+重取（导航
   *  窗格下拉写路径；不做同值守卫=切图恒重取最新子图，load 有 stale-guard） */
  setFolder(folderId: string): void
  /** 加节点两型：文献型（paperId 绑定+元数据默认）/主题型（阶段分组） */
  addPaperNode(paper: { id: string; title: string; year: number | null }): void
  addThemeNode(title: string): void
  /** 拖拽落点→x/y 覆盖（全字段载荷收口防半更新清字段；x/y 数据面未退役+直测
   *  =非孤儿，主控裁决 e 保留） */
  moveNode(id: string, x: number, y: number): void
  /** [T3-P8] 月组槽位全序重排：按传入序 slot=0..n-1 逐节点透写排队；settle
   *  落定后调用（无乐观写——飞行窗禁写，失败=error+toast+重试） */
  reorderMonthSlots(nodeIds: string[]): void
  /** [T3-P8] 改月：month+year 全字段载荷、slot 键缺省——服务端组变分支
   *  （新组 max+1 落尾部）归一，月组内槽位不在此写 */
  moveNodeMonth(id: string, year: number | null, month: number | null): void
  editCoreIdea(id: string, coreIdea: string): void
  /** F-LG14 标签整组写入（增删 UI 语义化收口；去重单源在 main repo 写边界） */
  setNodeTags(id: string, tags: string[]): void
  linkNodes(from: string, to: string, label?: string): void
  /** 参考边（R2-LG12 用户裁决 A）：综述→文献 kind='ref'——service 双守 */
  linkRefNodes(from: string, to: string): void
  /** 人工补父边（F-LG15 用户裁决**不限条数**）：父→子 kind='manual'——
   *  service 豁免单父/拒环/同端点对与 tree·ref 互斥 */
  linkManualParent(childId: string, parentId: string, label?: string): void
  /** manual 边 label 后编辑（更新语义：id+端点+kind 保持——F-LG15） */
  editManualEdgeLabel(edgeId: string, label: string): void
  /** [T3-P7B] 线型选择器应用：id 全载荷 upsert（from/to/label 读现值——防半
   *  更新清字段；kind+sub 成对置，sub null=回退基础型） */
  applyEdgeLine(edgeId: string, kind: LineageEdge['kind'], sub: string | null): void
  /** [T3-P7B] 新建连线（四 kind 含 inferred；CONFLICT 拒绝型丢弃不卡队列） */
  linkWithLine(from: string, to: string, kind: LineageEdge['kind'], sub: string | null): void
  /** [T3-P7B] 线型组整批写（恒四组强校验在 schema/service；成功 set lineTypes） */
  saveLineTypes(groups: LineTypeGroup[]): void
  /** 改父=删旧边+加新边两调用（N5 语义；无旧边=仅加边） */
  reparentNode(nodeId: string, newParentId: string): void
  removeNode(id: string): void
  removeEdge(id: string): void
  /** error 态重试：重发保留队列（动作在 error+新编辑时自动重试） */
  retrySave(): void
}

/** 退出拦截聚合输入（INV-22 扩面：tab dirty ∪ lineage dirty——App.tsx 组合根单点） */
export function useLineageDirty(): boolean {
  return useLineageStore((s) => s.saveStatus !== 'saved')
}

/** 写前防御：节点不在图中即抛（语义动作侧校验——薄壳共用） */
const mustNode = (nodes: LineageNode[], id: string): LineageNode => {
  const n = nodes.find((x) => x.id === id)
  if (n === undefined) throw new Error(`节点不在图中：${id}`)
  return n
}

export const useLineageStore = create<LineageStore>()((set, get) => {
  // 请求序号 stale-guard：新 load 取代旧 load 后，旧响应（成功/失败）丢弃
  let seq = 0
  const wq = createWriteQueue({ set, get })

  return {
    nodes: [],
    edges: [],
    paperMetrics: {},
    pubNos: {},
    lineTypes: [],
    status: 'loading',
    error: null,
    folderId: MAIN_GRAPH_ID, // [F-LGRAPH-01①U4] 恒有值——主图兜底
    saveStatus: 'saved',
    lastWriteError: null,
    queue: [],
    flushing: false,

    async load() {
      const s = ++seq
      set({ status: 'loading', error: null })
      try {
        // [F-LGRAPH-01①U4] 图作用域载荷恒显式 folderId（并集缺省语义随
        // 顶部并集切换器退役；folderId 恒有值——主图兜底）
        const graph = await unwrap(api.lineage.graph({ folderId: get().folderId }))
        // 旧响应晚到丢弃；写队列未清空同样丢弃（写回填面为准——写读互锁）。
        // 丢弃时回置 ready：写进行中说明有数据面（error 态无 Board 无写），
        // 不回置会卡 loading 至下次挂载
        if (s !== seq || get().flushing || get().queue.length > 0) {
          if (s === seq) set({ status: 'ready' })
          return
        }
        set({
          nodes: graph.nodes,
          edges: graph.edges,
          paperMetrics: graph.paperMetrics ?? {},
          pubNos: graph.pubNos ?? {},
          lineTypes: graph.lineTypes,
          status: 'ready',
          error: null
        })
      } catch (e) {
        if (s !== seq) return
        set({ status: 'error', error: e instanceof Error ? e.message : String(e) })
      }
    },

    setFolder(folderId) {
      // [F-LGRAPH-01①U4] 置态+重取（不做同值守卫=切图恒重取最新子图；load
      // 有 stale-guard，重复重取无害）
      set({ folderId })
      // [F-LGRAPH-01①U5] 切图 focusSet 清空（图域隔离——mockup §2.7：模式
      // 保持 focus 空集合法）。单点驻此（切图入口三处：下拉/S4 回退/库页上下
      // 文同步——view.store 零反向依赖无环）
      useLineageViewStore.getState().clearFocus()
      void get().load()
    },

    addPaperNode(paper) {
      wq.enqueue({
        kind: 'upsert-node',
        input: { paperId: paper.id, title: paper.title, coreIdea: '', year: paper.year, x: null, y: null }
      })
    },

    addThemeNode(title) {
      // 主题节点 folderId=当前图（[F-LGRAPH-01①U4] folderId 恒有值——主图
      // 兜底；文献节点不走此路：INV-88 folder=文献归属）
      wq.enqueue({
        kind: 'upsert-node',
        input: {
          paperId: null,
          title,
          coreIdea: '',
          year: null,
          x: null,
          y: null,
          folderId: get().folderId
        }
      })
    },

    moveNode(id, x, y) {
      mustNode(get().nodes, id)
      wq.enqueue({ kind: 'upsert-node', id, patch: { x, y } })
    },

    reorderMonthSlots(nodeIds) {
      // 月组全序重写：传入序即槽位序（0..n-1 透写）；同实体 lazy 融合
      nodeIds.forEach((id, slot) => {
        mustNode(get().nodes, id)
        wq.enqueue({ kind: 'upsert-node', id, patch: {}, override: { slot } })
      })
    },

    moveNodeMonth(id, year, month) {
      mustNode(get().nodes, id)
      // override={year,month}：合成时 slot 键缺省（服务端组变 max+1——D-I-1）
      wq.enqueue({ kind: 'upsert-node', id, patch: {}, override: { year, month } })
    },

    editCoreIdea(id, coreIdea) {
      mustNode(get().nodes, id)
      wq.enqueue({ kind: 'upsert-node', id, patch: { coreIdea } })
    },

    setNodeTags(id, tags) {
      mustNode(get().nodes, id)
      // 空组=patch 无 tags 键（合成缺省→null 语义，「清空标签」一致）
      wq.enqueue({ kind: 'upsert-node', id, patch: tags.length > 0 ? { tags } : {} })
    },

    linkNodes(from, to, label = '') {
      wq.enqueue({ kind: 'upsert-edge', input: { fromNode: from, toNode: to, label } })
    },

    linkRefNodes(from, to) {
      wq.enqueue({ kind: 'upsert-edge', input: { fromNode: from, toNode: to, label: '', kind: 'ref' } })
    },

    linkManualParent(childId, parentId, label = '') {
      wq.enqueue({
        kind: 'upsert-edge',
        input: { fromNode: parentId, toNode: childId, label, kind: 'manual' }
      })
    },

    editManualEdgeLabel(edgeId, label) {
      const e = get().edges.find((x) => x.id === edgeId)
      if (e === undefined) throw new Error(`边不在图中：${edgeId}`)
      // 更新语义：id 提供端点保持（label 后编辑不换父——F-LG15）
      wq.enqueue({
        kind: 'upsert-edge',
        input: { id: e.id, fromNode: e.fromNode, toNode: e.toNode, label, kind: e.kind }
      })
    },

    applyEdgeLine(edgeId, kind, sub) {
      const e = get().edges.find((x) => x.id === edgeId)
      if (e === undefined) throw new Error(`边不在图中：${edgeId}`)
      // id 全载荷：from/to/label 读现值（防半更新清字段）；kind+sub 成对置
      wq.enqueue({
        kind: 'upsert-edge',
        input: { id: e.id, fromNode: e.fromNode, toNode: e.toNode, label: e.label, kind, sub }
      })
    },

    linkWithLine(from, to, kind, sub) {
      wq.enqueue({ kind: 'upsert-edge', input: { fromNode: from, toNode: to, label: '', kind, sub } })
    },

    saveLineTypes(groups) {
      wq.enqueue({ kind: 'upsert-line-types', input: groups })
    },

    reparentNode(nodeId, newParentId) {
      // N5：删旧边+加新边两调用（UI 单操作）；删成功+加失败=合法中间态+toast 指明
      const old = get().edges.find((e) => e.toNode === nodeId)
      if (old !== undefined) wq.enqueue({ kind: 'remove-edge', id: old.id })
      wq.enqueue({
        kind: 'upsert-edge',
        input: { fromNode: newParentId, toNode: nodeId, label: '' },
        reparent: true
      })
    },

    removeNode(id) {
      wq.enqueue({ kind: 'remove-node', id })
    },

    removeEdge(id) {
      wq.enqueue({ kind: 'remove-edge', id })
    },

    retrySave() {
      void wq.flush()
    }
  }
})
