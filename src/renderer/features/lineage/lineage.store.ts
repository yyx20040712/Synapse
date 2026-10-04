// b3: P7-H
/**
 * lineage.store —— 脉络图数据+读面/会话写面状态单源（store；暂存机制拆件=
 * lineage-write-queue.ts，本件保留数据态+读面+方法签名薄壳）。
 *
 * ── 数据单源接缝声明（双向锚定：本行+LineagePage 头注）──
 * lineage/graph 取数=本 store 单点；LineagePage/LineageTimeline/03 编辑层
 * （LineageBoard）/04 侧板（LineageSidePanel）一律经本 store 分发消费——
 * **03/04 禁双取**（不得另行直连 window.api.lineage.graph 建第二取数点）。
 * 数据缓存：nodes/edges 驻 store（视图切换卸载不丢，03/04 消费面免二次取数）。
 *
 * ── 读面状态枚举（门一 N6）──
 * loading/ready/error 三态；stale-guard 请求序号：晚到的旧响应（含旧失败）
 * 丢弃；**写面互锁（LG-03/[②U1] 会话扩面）**：暂存队列未清空（dirty）或
 * flushing 中 graph 落地同样丢弃（编辑会话暂存为准——跨页返回保留）。
 * 会话态机单源=lineage-write-queue.ts 头注（saveStatus/queue/undoStack/flush）。
 *
 * ── [F-LGRAPH-01②U1] 编辑会话域（A7：脉络页一切写动作统一入暂存）──
 * 节点删/改（[F-ALIGN-01] 增随手动建点路径退役）/改月/调序/标签/画线/删线/
 * 命名/线形/改父→beginUnit（单元前
 * 快照入 undo 栈+redo 清）→乐观应用+入队（不发 IPC）；save()=批量落库
 * （成功 clean+栈基线重置）；undo/redo=快照栈；discardSession=dirty 切图
 * 确认分支弃暂存。拖放类单元（调线/拖拽）由轮 2 接入 beginUnit。
 *
 * 错误契约：load 失败不上抛——失败态驻 store.error（列表型瞬态，消费方
 * 呈现+重试，INV-02 两型分清；动作型 toast 面=write-queue flush 内）。
 */
import { create } from 'zustand'
import { api, unwrap } from '../../api/client'
import { showToast } from '../../shared/ui/toast-store'
import { MAIN_GRAPH_ID, defaultLineTypeNames } from '@shared/models/lineage'
import type { LineagePaperMetrics } from '@shared/ipc/schemas'
import type { LineageEdge, LineageNode, LineageViaPoint } from '@shared/models/lineage'
import { createWriteQueue } from './lineage-write-queue'
import { useLineageViewStore } from './lineage-view.store'
import type { LineageSaveStatus, SessionSnapshot, WriteAction } from './lineage-write-queue'

export type {
  LineageSaveStatus,
  LazyNodePatch,
  LineageNodePatchBody,
  SessionSnapshot
} from './lineage-write-queue'

export type LineageStatus = 'loading' | 'ready' | 'error'

export interface LineageStore {
  nodes: LineageNode[]
  edges: LineageEdge[]
  /** F-LG14 含金量摘要（键=paperId，graph 单读随行；主题节点无键） */
  paperMetrics: Record<string, LineagePaperMetrics>
  /** [F-FOLDER-01] pubNo 表（键=paperId——INV-92 库级派生编号，graph 单读随行） */
  pubNos: Record<string, number>
  /** [A1a] 文献库标签名组表（键=paperId，值=名序标签名——graph 单读随行；
   *  卡标签行数据源[换源]；主题节点/无标签文献无键） */
  tagNames: Record<string, string[]>
  /** [F-LGRAPH-01②U8] 图级色行名（恰 6 行——graph 单读随行；工具组线型列表消费） */
  lineTypeNames: string[]
  status: LineageStatus
  error: string | null
  /** [F-LGRAPH-01①U4] 当前图作用域：**恒有值**（并集退役——每图只显示自身，
   *  主图 __main__ 兜底不可删）；消费面=load 载荷（恒显式 folderId）+导航窗格
   *  图/文件夹下拉。[F-ALIGN-01] 主题节点当前图消费面随主题建点动作退役
   *  删除。IPC/main 侧 folderId 可选性保留（历史兼容，不收紧 schema）。缺省图
   *  =库页文件夹上下文同步（接缝双向锚定：本头注+library.store 头注
   *  ——LineagePage 挂载时读 library.store query.folderScope：kind='folder'
   *  用其 folderId，否则主图；[②U1] 会话 dirty 时挂载同步跳过=暂存图保留，申报） */
  folderId: string
  /** [F-LGRAPH-01②U1] 会话保存态四态（clean=库一致基线/dirty=暂存未落库/
   *  saving=批量落库中/error=保存失败——≠clean 即脏：退出拦截聚合输入） */
  saveStatus: LineageSaveStatus
  /** 最近一次系统型写失败消息（行内错误呈现；成功清空） */
  lastWriteError: string | null
  /** 暂存动作队列（驻 state 供测试与脏态判定；flushing=save 串行派发中） */
  queue: WriteAction[]
  flushing: boolean
  /** [F-LGRAPH-01②U1] 会话快照栈（每编辑单元前图态——undo/redo 载荷） */
  undoStack: SessionSnapshot[]
  redoStack: SessionSnapshot[]
  load(): Promise<void>
  /** [F-LGRAPH-01①U4] 切图（folderId 恒有值——主图兜底）：置态+重取（导航
   *  窗格下拉写路径；不做同值守卫=切图恒重取最新子图，load 有 stale-guard）。
   *  dirty 切图两分支（确认=discardSession 后切/取消=留守）在 NavGraphPicker
   *  编排层承载 */
  setFolder(folderId: string): void
  /** 拖拽落点→x/y 覆盖（全字段载荷收口防半更新清字段；x/y 数据面未退役+直测
   *  =非孤儿，主控裁决 e 保留）。[F-ALIGN-01] 加节点两型 store 动作随手动
   *  建点路径退役删除——节点唯一来源=入库/移动两路（INV-NEW-1） */
  moveNode(id: string, x: number, y: number): void
  /** [T3-P8] 月组槽位全序重排：按传入序 slot=0..n-1 逐节点透写排队（settle
   *  落定后调用；[②U1] 整组=一编辑单元——一次 undo 整组回退） */
  reorderMonthSlots(nodeIds: string[]): void
  /** [T3-P8] 改月：month+year 全字段载荷、slot 键缺省——服务端组变分支
   *  （新组 max+1 落尾部）归一，月组内槽位不在此写 */
  moveNodeMonth(id: string, year: number | null, month: number | null): void
  editCoreIdea(id: string, coreIdea: string): void
  /** F-LG14 标签整组写入（增删 UI 语义化收口；去重单源在 main repo 写边界） */
  setNodeTags(id: string, tags: string[]): void
  linkNodes(from: string, to: string, label?: string): void
  /** [F-LGRAPH-01②U3] 画线建边（拖拽锚点流——§2.4）：kind=manual+视觉字段=
   *  当前工具线型（dashed/color）+label=当前色行名快照（P-14 继承制） */
  drawEdge(from: string, to: string, style: { dashed: boolean; color: string; label: string }): void
  /** 人工补父边（F-LG15 用户裁决**不限条数**）：父→子——service 拒环/同端点对 */
  linkManualParent(childId: string, parentId: string, label?: string): void
  /** manual 边 label 后编辑（更新语义：id+端点保持——F-LG15） */
  editManualEdgeLabel(edgeId: string, label: string): void
  /** [F-LGRAPH-01②U8] 边视觉线型应用：id 全载荷 upsert（from/to/label/via 读
   *  现值——防半更新清字段[A8 接缝：全载荷含 via]；dashed/color 成对置） */
  applyEdgeLineStyle(edgeId: string, dashed: boolean, color: string): void
  /** [F-LGRAPH-01②U5] 调线写路径：via 全量替换（拖顶点/拖段/加点/删点/重置
   *  走线/自动线物化——via undefined=回自动路由；§2.3-9 每操作=一编辑单元） */
  setEdgeVia(edgeId: string, via: LineageViaPoint[] | undefined): void
  /** [F-LGRAPH-01②U5] 端点重连：via 保留+fromNode/toNode 换端（同卡换锚走
   *  setEdgeVia——锚位随 via 首点承载，申报）；查重/环守卫沿 service 保存面 */
  reconnectEdge(edgeId: string, fromNode: string, toNode: string, via: LineageViaPoint[] | undefined): void
  /** [F-LGRAPH-01②U8] 图级色行名整批写（恰 6 校验在 schema/service；成功 set） */
  saveLineTypeNames(names: string[]): void
  /** 改父=删旧边+加新边两调用（N5 语义；无旧边=仅加边）——[②U1] 两动作同
   *  一编辑单元（一次 undo 整体回退） */
  reparentNode(nodeId: string, newParentId: string): void
  removeNode(id: string): void
  removeEdge(id: string): void
  /** [F-LGRAPH-01②U1] 批量落库（保存钮触发——saving→clean（成功+栈基线
   *  重置）/error（失败+重试）） */
  save(): void
  /** [F-LGRAPH-01②U1] 撤销/重做（快照栈；saving 锁定 no-op；Ctrl+Z/Y 接线） */
  undo(): void
  redo(): void
  /** [F-LGRAPH-01②U1] 弃暂存（dirty 切图确认分支）：队列+两栈清+回 clean
   *  ——不落库；乐观残值由随后 setFolder→load 库态覆盖 */
  discardSession(): void
  /** error 态重试：重发保留队列（动作在 error+新保存时自动重试） */
  retrySave(): void
}

/** 退出拦截聚合输入（INV-22 扩面：tab dirty ∪ lineage dirty——App.tsx 组合根单点；
 *  [②U1] clean=库一致基线（saved 概念反转），≠clean 即脏） */
export function useLineageDirty(): boolean {
  return useLineageStore((s) => s.saveStatus !== 'clean')
}

/** 写前防御：节点不在图中即抛（语义动作侧校验——薄壳共用） */
const mustNode = (nodes: LineageNode[], id: string): LineageNode => {
  const n = nodes.find((x) => x.id === id)
  if (n === undefined) throw new Error(`节点不在图中：${id}`)
  return n
}

/** [回炉 R20] 撤销栈深度上限（INV-23 先例=50——超深丢最旧快照） */
const UNDO_STACK_MAX = 50

export const useLineageStore = create<LineageStore>()((set, get) => {
  // 请求序号 stale-guard：新 load 取代旧 load 后，旧响应（成功/失败）丢弃
  let seq = 0
  const wq = createWriteQueue({ set, get })

  /** [F-LGRAPH-01②U1] 编辑单元入口：单元前图态快照入 undo 栈+redo 栈清
   *  （一单元=一撤销步——与 mockup §2.2 编辑单元定义同构）；
   *  [回炉 R20] 栈深截断 50（INV-23 先例——超深丢最旧快照）；
   *  [回炉 R5] saving（flushing）域拒绝（与 undo/redo 闸同型——INV-94
   *  「saving 态锁定 undo/redo/编辑」实现对齐）：返回 false=调用方放弃写 */
  const beginUnit = (): boolean => {
    const s = get()
    if (s.flushing) return false
    const undoStack = [
      ...s.undoStack,
      { nodes: s.nodes, edges: s.edges, lineTypeNames: s.lineTypeNames, queue: s.queue }
    ]
    if (undoStack.length > UNDO_STACK_MAX) undoStack.splice(0, undoStack.length - UNDO_STACK_MAX)
    set({ undoStack, redoStack: [] })
    return true
  }

  /** 快照恢复（undo/redo 共用——saveStatus 按恢复后队列派生：空=clean） */
  const restore = (snap: SessionSnapshot, pushTo: 'undo' | 'redo'): void => {
    const s = get()
    const cur: SessionSnapshot = {
      nodes: s.nodes,
      edges: s.edges,
      lineTypeNames: s.lineTypeNames,
      queue: s.queue
    }
    if (pushTo === 'redo') {
      set({
        ...snap,
        undoStack: s.undoStack.slice(0, -1),
        redoStack: [...s.redoStack, cur],
        saveStatus: snap.queue.length > 0 ? 'dirty' : 'clean'
      })
      return
    }
    set({
      ...snap,
      undoStack: [...s.undoStack, cur],
      redoStack: s.redoStack.slice(0, -1),
      saveStatus: snap.queue.length > 0 ? 'dirty' : 'clean'
    })
  }

  return {
    nodes: [],
    edges: [],
    paperMetrics: {},
    pubNos: {},
    tagNames: {},
    lineTypeNames: defaultLineTypeNames(),
    status: 'loading',
    error: null,
    folderId: MAIN_GRAPH_ID, // [F-LGRAPH-01①U4] 恒有值——主图兜底
    saveStatus: 'clean',
    lastWriteError: null,
    queue: [],
    flushing: false,
    undoStack: [],
    redoStack: [],

    async load() {
      const s = ++seq
      set({ status: 'loading', error: null })
      try {
        // [F-LGRAPH-01①U4] 图作用域载荷恒显式 folderId（并集缺省语义随
        // 顶部并集切换器退役；folderId 恒有值——主图兜底）
        const graph = await unwrap(api.lineage.graph({ folderId: get().folderId }))
        // 旧响应晚到丢弃；暂存队列未清空（dirty 会话）或 flushing 中同样
        // 丢弃（编辑会话暂存为准——写读互锁 [②U1] 扩面：跨页返回保留暂存）。
        // 丢弃时回置 ready：dirty 会话说明有数据面，不回置会卡 loading
        if (s !== seq || get().flushing || get().queue.length > 0) {
          if (s === seq) set({ status: 'ready' })
          return
        }
        set({
          nodes: graph.nodes,
          edges: graph.edges,
          paperMetrics: graph.paperMetrics ?? {},
          pubNos: graph.pubNos ?? {},
          tagNames: graph.tagNames ?? {},
          lineTypeNames: graph.lineTypeNames,
          status: 'ready',
          error: null,
          // 库态新基线：自库态起栈（Word 式——mockup §2.2「再进入=自库态起栈」）
          undoStack: [],
          redoStack: []
        })
      } catch (e) {
        if (s !== seq) return
        set({ status: 'error', error: e instanceof Error ? e.message : String(e) })
      }
    },

    setFolder(folderId) {
      // [RRB4] flushing 守卫（RR14 UI 闸的 store 级绝对化——S4 回退径/同 tick
      // 竞逐残余缝：在飞写窗口切图与「不落库/在飞写落库」承诺互斥，单点拒绝）
      if (get().flushing) return
      // [F-LGRAPH-01①U4] 置态+重取（不做同值守卫=切图恒重取最新子图；load
      // 有 stale-guard，重复重取无害）
      set({ folderId })
      // [F-LGRAPH-01①U5] 切图 focusSet 清空（图域隔离——mockup §2.7：模式
      // 保持 focus 空集合法）。单点驻此（切图入口：下拉/S4 回退/库页上下
      // 文同步——view.store 零反向依赖无环）
      useLineageViewStore.getState().clearFocus()
      // [F-LGRAPH-01②U2] 切图=画线工具中止（armed 持久域=页面内——mockup §2.4）
      useLineageViewStore.getState().resetTool()
      void get().load()
    },

    moveNode(id, x, y) {
      mustNode(get().nodes, id)
      if (!beginUnit()) return
      wq.enqueue({ kind: 'patch-node', id, patch: { x, y } })
    },

    reorderMonthSlots(nodeIds) {
      // 月组全序重写：传入序即槽位序（0..n-1 透写）；同实体 lazy 融合
      // [②U1] 整组=一编辑单元（一次 undo 整组回退）
      if (!beginUnit()) return
      nodeIds.forEach((id, slot) => {
        mustNode(get().nodes, id)
        wq.enqueue({ kind: 'patch-node', id, patch: {}, override: { slot } })
      })
    },

    moveNodeMonth(id, year, month) {
      mustNode(get().nodes, id)
      // override={year,month}：合成时 slot 键缺省（服务端组变 max+1——D-I-1）
      if (!beginUnit()) return
      wq.enqueue({ kind: 'patch-node', id, patch: {}, override: { year, month } })
    },

    editCoreIdea(id, coreIdea) {
      mustNode(get().nodes, id)
      if (!beginUnit()) return
      wq.enqueue({ kind: 'patch-node', id, patch: { coreIdea } })
    },

    setNodeTags(id, tags) {
      mustNode(get().nodes, id)
      // [RR3/d1-ΔN2 措辞精确化] 空组=patch 本身无 tags 键；清空由
      // fullPatchBody 全量件恒携 tags:null 承载（服务端合并收 null=清空
      // ——patch 面缺键不再承载清空语义）。
      // tags 面=A1b 退役面，本句随 A1b 消亡
      if (!beginUnit()) return
      wq.enqueue({ kind: 'patch-node', id, patch: tags.length > 0 ? { tags } : {} })
    },

    linkNodes(from, to, label = '') {
      if (!beginUnit()) return
      wq.enqueue({ kind: 'upsert-edge', input: { fromNode: from, toNode: to, label } })
    },

    drawEdge(from, to, style) {
      if (!beginUnit()) return
      wq.enqueue({
        kind: 'upsert-edge',
        // [回炉 R9] silentSave=flush 成功 toast 抑制（暂存提示已承载——双 toast 合一）
        input: { fromNode: from, toNode: to, label: style.label, dashed: style.dashed, color: style.color },
        silentSave: true
      })
      showToast('已画线，保存后生效', 'success') // 建边成功反馈（沿承现行 toast 面——文案如实：暂存未落库）
    },

    linkManualParent(childId, parentId, label = '') {
      if (!beginUnit()) return
      wq.enqueue({
        kind: 'upsert-edge',
        input: { fromNode: parentId, toNode: childId, label }
      })
    },

    editManualEdgeLabel(edgeId, label) {
      const e = get().edges.find((x) => x.id === edgeId)
      if (e === undefined) throw new Error(`边不在图中：${edgeId}`)
      // 更新语义：id 提供端点保持（label 后编辑不换父——F-LG15）；全载荷含
      // 视觉字段+via（A8 接缝：缺省合成不回清）
      if (!beginUnit()) return
      wq.enqueue({
        kind: 'upsert-edge',
        input: {
          id: e.id,
          fromNode: e.fromNode,
          toNode: e.toNode,
          label,
          dashed: e.dashed,
          color: e.color,
          ...(e.via !== undefined ? { via: e.via } : {})
        }
      })
    },

    applyEdgeLineStyle(edgeId, dashed, color) {
      const e = get().edges.find((x) => x.id === edgeId)
      if (e === undefined) throw new Error(`边不在图中：${edgeId}`)
      // id 全载荷：from/to/label/via 读现值（防半更新清字段——A8 含 via）；
      // dashed/color 成对置
      if (!beginUnit()) return
      wq.enqueue({
        kind: 'upsert-edge',
        input: {
          id: e.id,
          fromNode: e.fromNode,
          toNode: e.toNode,
          label: e.label,
          dashed,
          color,
          ...(e.via !== undefined ? { via: e.via } : {})
        }
      })
    },

    setEdgeVia(edgeId, via) {
      const e = get().edges.find((x) => x.id === edgeId)
      if (e === undefined) throw new Error(`边不在图中：${edgeId}`)
      // id 全载荷（A8：from/to/label/视觉字段读现值——防半更新清字段）；
      // via undefined=键缺省（N-1：不产出 []——自动路由语义）
      if (!beginUnit()) return
      wq.enqueue({
        kind: 'upsert-edge',
        input: {
          id: e.id,
          fromNode: e.fromNode,
          toNode: e.toNode,
          label: e.label,
          dashed: e.dashed,
          color: e.color,
          ...(via !== undefined ? { via } : {})
        }
      })
    },

    reconnectEdge(edgeId, fromNode, toNode, via) {
      const e = get().edges.find((x) => x.id === edgeId)
      if (e === undefined) throw new Error(`边不在图中：${edgeId}`)
      // 同端点对查重（UI 预检——自身除外；service UNIQUE 保存面兜底）
      const dup = get().edges.some(
        (x) =>
          x.id !== edgeId &&
          ((x.fromNode === fromNode && x.toNode === toNode) ||
            (x.fromNode === toNode && x.toNode === fromNode))
      )
      if (dup) {
        showToast('两节点间已存在连线', 'error')
        return
      }
      if (!beginUnit()) return
      wq.enqueue({
        kind: 'upsert-edge',
        input: {
          id: e.id,
          fromNode,
          toNode,
          label: e.label,
          dashed: e.dashed,
          color: e.color,
          ...(via !== undefined ? { via } : {})
        }
      })
    },

    saveLineTypeNames(names) {
      if (!beginUnit()) return
      wq.enqueue({ kind: 'upsert-line-type-names', input: names })
    },

    reparentNode(nodeId, newParentId) {
      // N5：删旧边+加新边两调用（UI 单操作）；删成功+加失败=合法中间态+toast 指明
      if (!beginUnit()) return
      const old = get().edges.find((e) => e.toNode === nodeId)
      if (old !== undefined) wq.enqueue({ kind: 'remove-edge', id: old.id })
      wq.enqueue({
        kind: 'upsert-edge',
        input: { fromNode: newParentId, toNode: nodeId, label: '' },
        reparent: true
      })
    },

    removeNode(id) {
      if (!beginUnit()) return
      wq.enqueue({ kind: 'remove-node', id })
    },

    removeEdge(id) {
      if (!beginUnit()) return
      wq.enqueue({ kind: 'remove-edge', id })
    },

    save() {
      void wq.flush()
    },

    undo() {
      const s = get()
      if (s.flushing || s.undoStack.length === 0) return
      restore(s.undoStack[s.undoStack.length - 1]!, 'redo')
    },

    redo() {
      const s = get()
      if (s.flushing || s.redoStack.length === 0) return
      restore(s.redoStack[s.redoStack.length - 1]!, 'undo')
    },

    discardSession() {
      set({ queue: [], undoStack: [], redoStack: [], saveStatus: 'clean', lastWriteError: null })
    },

    retrySave() {
      void wq.flush()
    }
  }
})
