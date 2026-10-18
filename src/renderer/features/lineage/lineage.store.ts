// b3: P7-H
/**
 * lineage.store —— 脉络图数据+读面/会话写面状态单源（store；暂存机制拆件=
 * lineage-write-queue.ts，编辑会话撤销/重做域件拆件=lineage-session-ops.ts
 * 〔F-VISFB-61——beginUnit/restore 纯移动迁出〕，悬浮笔记动作域件拆件=
 * lineage-note-ops.ts〔F-VISFB-62——三操作纯移动迁出〕，本件保留数据态+
 * 读面+方法签名薄壳）。
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
 * 节点删/改（[F-ALIGN-01] 增随手动建点路径退役）/调序/画线/删线/
 * 命名/线形/换端重连（[F-VISFB-66 裁定 3] 旧换父三入口退役后承载）→beginUnit
 * （单元前快照入 undo 栈+redo 清）→乐观应用+入队（不发 IPC）；save()=批量落库
 * （成功 clean+栈基线重置）；undo/redo=快照栈；discardSession=dirty 切图
 * 确认分支弃暂存。拖放类单元（调线/拖拽）由轮 2 接入 beginUnit。
 * [F-VISFB-61] 悬浮笔记三操作（创建/编辑/删除）入同一编辑单元族（快照含
 * floatingNotes——undo/redo/save/reload 全链同构；域删级联=main 侧 DDL）。
 * [A1b] 标签编辑单元随脉络私有标签域退役删除（标签整组写 action 消亡）。
 *
 * 错误契约：load 失败不上抛——失败态驻 store.error（列表型瞬态，消费方
 * 呈现+重试，INV-02 两型分清；动作型 toast 面=write-queue flush 内）。
 */
import { create } from 'zustand'
import { api, unwrap, ApiClientError } from '../../api/client'
import { showToast } from '../../shared/ui/toast-store'
import { MAIN_GRAPH_ID, defaultLineTypeNames } from '@shared/models/lineage'
import type { LineagePaperMetrics } from '@shared/ipc/schemas'
import type {
  FloatingNote,
  LineageAnchor,
  LineageEdge,
  LineageEdgeUpsert,
  LineageNode,
  LineageViaPoint
} from '@shared/models/lineage'
import { createWriteQueue } from './lineage-write-queue'
import { createSessionOps } from './lineage-session-ops'
import { createNoteOps } from './lineage-note-ops'
import { useLineageViewStore } from './lineage-view.store'
import { quitWriteBlocked } from '../../app/quit-closing-gate'
import { markRecoveryClean, notifyRecoveryEditUnit, recoveryBlocked } from './recoveryScheduler'
import { conflictWaitBlocked } from './conflictResolution'
import type { LineageSaveStatus, SessionSnapshot, WriteAction } from './lineage-write-queue'
import type { LineageRecoveryPayload } from '@shared/recovery/schemas'

export type {
  LineageSaveStatus,
  LazyNodePatch,
  LineageNodePatchBody,
  SessionSnapshot
} from './lineage-write-queue'

/** [F-VISFB-66 §C.3] 画线建边结果枚举（查重单点=store 层） */
export type DrawEdgeResult = { ok: true; id: string } | { ok: false; reason: 'duplicate' | 'busy' }
/** [F-VISFB-66 §C.3] 换端结果枚举（self-loop/duplicate 由 store 前置判） */
export type ReconnectResult = { ok: true } | { ok: false; reason: 'duplicate' | 'self-loop' | 'busy' }

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
  /** [F-VISFB-61] 悬浮笔记图域行集（graph 单读随行——folderId 域隔离；
   *  62 号 UI 消费面；会话写走 write-queue 同族〔可等待+undo〕） */
  floatingNotes: FloatingNote[]
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
  /** [F-VISFB-65 回炉 W7] CONFLICT 面收尾重拉持久标志（系统型失败提前退出
   *  不丢——任意后续 flush 成功收尾统一消费一次） */
  needsReload: boolean
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
   *  落定后调用；[②U1] 整组=一编辑单元——一次 undo 整组回退）。
   *  [F-UIRES-03 C3] 改月 store 动作随改月单口裁决退役删除
   *  （INV-107——改月唯一入口=MetaEditDialog 月份字段经 library.updateMeta） */
  reorderMonthSlots(nodeIds: string[]): void
  /** [F-VISFB-66 裁定 1/2] 画线建边（唯一建边径=锚点显式拖拽——点两卡/右键
   *  链退役后 drawEdge 单径）：视觉字段=当前工具线型+label=当前色行名快照
   *  （P-14 继承制）；**双锚必填**（按下锚=fromAnchor/落点锚=toAnchor——
   *  两端锚用户钉定，设计书 §C.3）；查重单点驻本层（结果枚举——duplicate
   *  由调用方 toast「两节点间已存在连线」） */
  drawEdge(
    from: string,
    to: string,
    payload: {
      dashed: boolean
      color: string
      label: string
      fromAnchor: LineageAnchor
      toAnchor: LineageAnchor
    }
  ): DrawEdgeResult
  /** manual 边 label 后编辑（更新语义：id+端点保持——F-LG15） */
  editManualEdgeLabel(edgeId: string, label: string): void
  /** [F-LGRAPH-01②U8] 边视觉线型应用：id 全载荷 upsert（from/to/label/via 读
   *  现值——防半更新清字段[A8 接缝：全载荷含 via]；dashed/color 成对置）。
   *  [F-VISFB-66] 物化纪律扩面（§0.3）：via/双锚随现值物化（未钉定=null 归一
   *  ——repo 全行替换下写 NULL 幂等=F14 终态同现状） */
  applyEdgeLineStyle(edgeId: string, dashed: boolean, color: string): void
  /** [F-LGRAPH-01②U5] 调线写路径：via 全量替换（拖顶点/拖段/加点/删点/重置
   *  走线/自动线物化——§2.3-9 每操作=一编辑单元）。
   *  [F-VISFB-66] 约定迁移（§0.3——W-01r2②）：「via undefined=键缺省=清除」
   *  →显式 **via:null**（清除=显式 null；调用面 use-edge-edit/EdgeMenuHost
   *  随迁）；A8 物化下双锚随现值 null 归一（行为中性：repo 全行替换） */
  setEdgeVia(edgeId: string, via: LineageViaPoint[] | null): void
  /** [F-VISFB-66 裁定 3] 端点重连（换端=清 via 重算自动路径+重钉锚——语义
   *  反转自「via 保留」）：**end 导向签名**（[定点修 R3]——被抓端 end+新
   *  端点对+新锚；固定端不在载荷，store 物化保持现值含未钉定——「清除为
   *  未钉定」无 UI 操作面不在接口表达，null/?? 二义消解）；
   *  A8 物化构造：读现边乐观现值填全字段（label/dashed/color 随现值；被抓
   *  端置新锚、固定端保持现值含 null；via 恒 null 显式清——一编辑单元）。
   *  内部：①from===to→self-loop；②hasPair 排除本边 id→duplicate；③enqueue */
  reconnectEdge(
    edgeId: string,
    next: {
      end: 'from' | 'to'
      from: string
      to: string
      anchor: LineageAnchor
    }
  ): ReconnectResult
  /** [F-LGRAPH-01②U8] 图级色行名整批写（恰 6 校验在 schema/service；成功 set） */
  saveLineTypeNames(names: string[]): void
  removeNode(id: string): void
  removeEdge(id: string): void
  /** [F-VISFB-61] 悬浮笔记创建（当前图域——folderId=store.folderId；乐观
   *  应用+入队，不发 IPC；一单元=一撤销步）；62 号 UI 按 effective-scale
   *  换算内容坐标后传入（store 只存取画布 own 域坐标） */
  addFloatingNote(x: number, y: number, content: string): void
  /** [F-VISFB-61] 编辑（content/x/y patch——全载荷合成防半更新清字段，
   *  A8 同族；同 id 队列合并最后写胜出） */
  updateFloatingNote(id: string, patch: Partial<Pick<FloatingNote, 'content' | 'x' | 'y'>>): void
  /** [F-VISFB-61] 删除（乐观移除+remove 动作入队；幽灵 id 抛） */
  removeFloatingNote(id: string): void
  /** [F-LGRAPH-01②U1] 批量落库（保存钮触发——saving→clean（成功+栈基线
   *  重置）/error（失败+重试））。[F-VISFB-14] 返回可等待 Promise（退出握手
   *  走 save() 正道消费，不旁路队列；flushing 中让位早退=调用方收口后查
   *  saveStatus，INV-141 fulfilled≠已落库） */
  save(): Promise<void>
  /** [F-LGRAPH-01②U1] 撤销/重做（快照栈；saving 锁定 no-op；Ctrl+Z/Y 接线） */
  undo(): void
  redo(): void
  /** [F-LGRAPH-01②U1] 弃暂存（dirty 切图确认分支）：队列+两栈清+回 clean
   *  ——不落库；乐观残值由随后 setFolder→load 库态覆盖 */
  discardSession(): void
  /** error 态重试：重发保留队列（动作在 error+新保存时自动重试） */
  retrySave(): void
  /** [F-VISFB-65] 恢复载入（§6）：置 dirty+两栈清+queue 恢复（重放幂等） */
  applyRecoverySession(payload: LineageRecoveryPayload): void
  /** [F-VISFB-65 回炉 W1] 恢复后派生面合并（paperMetrics/pubNos/tagNames 三面
   *  单独补——恢复载荷不含派生数据；不触碰乐观图三面） */
  applyDerivedFields(derived: {
    paperMetrics: Record<string, LineagePaperMetrics>
    pubNos: Record<string, number>
    tagNames: Record<string, string[]>
  }): void
  /** [F-DBCAMP-01 DB-4 / F-STAR-01 A3] 节点星标切换（三模式均 toggle——P-11
   *  退出条件；乐观本地翻转+失败回滚 toast；星标非图结构面：不入编辑暂存
   *  队列/undo 栈——直写库通道 papers/set-starred）。载荷=调用面节点快照
   *  （卡/侧板 props 节点——与 store 节点面解耦：store 未含该 id 仍可切，
   *  本地补丁按 id 命中面） */
  toggleNodeStar(node: { id: string; paperId: string; isStarred?: boolean }): Promise<void>
}

/** 退出拦截聚合输入（INV-22 扩面：tab dirty ∪ lineage dirty ∪ noteDraft——
 *  [F-VISFB-63] 第三源=悬浮笔记编辑草稿〔lineage-note-draft 单源〕；App.tsx
 *  组合根单点；[②U1] clean=库一致基线（saved 概念反转），≠clean 即脏） */
export function useLineageDirty(): boolean {
  return useLineageStore((s) => s.saveStatus !== 'clean')
}

/** [R16] 边动作物化单源：e 全载荷基座（via/双锚 null 归一）+patch 覆盖
 *  （四消费面=editManualEdgeLabel/applyEdgeLineStyle/setEdgeVia/reconnectEdge）。 */
function materializeEdgeInput(
  e: LineageEdge,
  patch: Partial<Pick<LineageEdgeUpsert, 'fromNode' | 'toNode' | 'label' | 'dashed' | 'color' | 'via' | 'fromAnchor' | 'toAnchor'>>
): LineageEdgeUpsert {
  return {
    id: e.id,
    fromNode: patch.fromNode ?? e.fromNode,
    toNode: patch.toNode ?? e.toNode,
    label: patch.label ?? e.label,
    dashed: patch.dashed ?? e.dashed,
    color: patch.color ?? e.color,
    via: patch.via !== undefined ? patch.via : e.via ?? null,
    fromAnchor: patch.fromAnchor !== undefined ? patch.fromAnchor : e.fromAnchor ?? null,
    toAnchor: patch.toAnchor !== undefined ? patch.toAnchor : e.toAnchor ?? null
  }
}

/** [F-VISFB-66] 同端点对无向查重（查重单点驻 store——useDrawLine/reconnect
 *  共用；service UNIQUE 保存面兜底） */
function hasPair(from: string, to: string): boolean {
  const edges = useLineageStore.getState().edges
  return edges.some(
    (e) => (e.fromNode === from && e.toNode === to) || (e.fromNode === to && e.toNode === from)
  )
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
  // [F-VISFB-61 拆件] 编辑会话撤销/重做域件（beginUnit/restore 纯移动自本件
  // ——lineage-session-ops.ts 单源；解构注入调用面名字零 churn）。
  // [F-VISFB-64] closing gate 挂点：lineage 用户操作在 write-queue.enqueue 前
  // 经 beginUnit 统一入口冻结（undo 逆写=用户动作同闸——设计 §④ 写源表）；
  // quit 收口 ②.5 fireLineageNoteCommit 经 runQuitInternal 豁免域放行
  const { beginUnit, restore } = createSessionOps({ set, get })
  // [F-VISFB-65] recovery 门（quitWriteBlocked 同型——ws-entry 屏障 frozen 期
  // 拒编辑，§6；未装配恒放行——单测/旧路径兼容）；[F-VISFB-65 单元二]
  // conflictWaitBlocked=modal 挂起期门（§7——flushing 守卫外的显式第二道位）
  const beginUnitGated = (): boolean =>
    quitWriteBlocked() || recoveryBlocked() || conflictWaitBlocked() ? false : beginUnit()
  // [F-VISFB-62 拆件] 悬浮笔记动作域件（三操作纯移动自本件——
  // lineage-note-ops.ts 单源；解构注入调用面名字零 churn）
  const { addFloatingNote, updateFloatingNote, removeFloatingNote } = createNoteOps({ get, beginUnit: beginUnitGated, enqueue: wq.enqueue })

  return {
    nodes: [],
    edges: [],
    paperMetrics: {},
    pubNos: {},
    tagNames: {},
    lineTypeNames: defaultLineTypeNames(),
    floatingNotes: [],
    status: 'loading',
    error: null,
    folderId: MAIN_GRAPH_ID, // [F-LGRAPH-01①U4] 恒有值——主图兜底
    saveStatus: 'clean',
    lastWriteError: null,
    queue: [],
    flushing: false,
    needsReload: false,
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
          // [F-VISFB-61] 悬浮笔记随 graph 单读（?? []=旧桩装配兼容面）
          floatingNotes: graph.floatingNotes ?? [],
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
      if (!beginUnitGated()) return
      wq.enqueue({ kind: 'patch-node', id, patch: { x, y } })
    },

    reorderMonthSlots(nodeIds) {
      // 月组全序重写：传入序即槽位序（0..n-1 透写）；同实体 lazy 融合
      // [②U1] 整组=一编辑单元（一次 undo 整组回退）
      if (!beginUnitGated()) return
      nodeIds.forEach((id, slot) => {
        mustNode(get().nodes, id)
        wq.enqueue({ kind: 'patch-node', id, patch: {}, override: { slot } })
      })
    },

    drawEdge(from, to, payload) {
      // 查重单点（§C.3——service UNIQUE 兜底）；[R6] saving=busy（非假成功）
      if (hasPair(from, to)) return { ok: false, reason: 'duplicate' }
      if (!beginUnitGated()) return { ok: false, reason: 'busy' }
      const id = crypto.randomUUID()
      wq.enqueue({
        kind: 'upsert-edge',
        // [R9] silentSave=双 toast 合一；[R23] 构造层物化（id/双锚必填+via:null）
        input: {
          id,
          fromNode: from,
          toNode: to,
          label: payload.label,
          dashed: payload.dashed,
          color: payload.color,
          via: null,
          fromAnchor: payload.fromAnchor,
          toAnchor: payload.toAnchor
        },
        silentSave: true,
        isNew: true
      })
      showToast('已画线，保存后生效', 'success') // 建边成功反馈（沿承现行 toast 面——文案如实：暂存未落库）
      return { ok: true, id }
    },

    editManualEdgeLabel(edgeId, label) {
      const e = get().edges.find((x) => x.id === edgeId)
      if (e === undefined) throw new Error(`边不在图中：${edgeId}`)
      // 更新语义：id 提供端点保持（label 后编辑不换父——F-LG15）；全载荷含
      // 视觉字段+via（A8 接缝：缺省合成不回清）；[F-VISFB-66] 物化扩面：
      // via/双锚随现值 null 归一（未钉定=null 幂等落库）
      if (!beginUnitGated()) return
      wq.enqueue({ kind: 'upsert-edge', input: materializeEdgeInput(e, { label }) })
    },

    applyEdgeLineStyle(edgeId, dashed, color) {
      const e = get().edges.find((x) => x.id === edgeId)
      if (e === undefined) throw new Error(`边不在图中：${edgeId}`)
      // id 全载荷：from/to/label/via 读现值（防半更新清字段——A8 含 via）；
      // dashed/color 成对置；[F-VISFB-66] 物化扩面同 editManualEdgeLabel
      if (!beginUnitGated()) return
      wq.enqueue({ kind: 'upsert-edge', input: materializeEdgeInput(e, { dashed, color }) })
    },

    setEdgeVia(edgeId, via) {
      const e = get().edges.find((x) => x.id === edgeId)
      if (e === undefined) throw new Error(`边不在图中：${edgeId}`)
      // id 全载荷（A8：from/to/label/视觉字段读现值——防半更新清字段）；
      // [F-VISFB-66] via=显式 null 清除（约定迁移——null/null 归一恒透传）
      if (!beginUnitGated()) return
      wq.enqueue({ kind: 'upsert-edge', input: materializeEdgeInput(e, { via }) })
    },

    reconnectEdge(edgeId, next) {
      const e = get().edges.find((x) => x.id === edgeId)
      if (e === undefined) throw new Error(`边不在图中：${edgeId}`)
      // ①自环判（UI 对端卡格静默前置——store 兜底）；②同对查重（排除本边——
      // F14）；③[R6] saving=busy；④[R3] end-导向 A8 物化（被抓端新锚/另端现
      // 值含钉定——null/?? 二义消除；via 恒 null 清=换端重算，裁定 3）
      if (next.from === next.to) return { ok: false, reason: 'self-loop' }
      const dup = get().edges.some(
        (x) =>
          x.id !== edgeId &&
          ((x.fromNode === next.from && x.toNode === next.to) ||
            (x.fromNode === next.to && x.toNode === next.from))
      )
      if (dup) return { ok: false, reason: 'duplicate' }
      if (!beginUnitGated()) return { ok: false, reason: 'busy' }
      const grabbed: { fromAnchor?: LineageAnchor } | { toAnchor?: LineageAnchor } =
        next.end === 'from' ? { fromAnchor: next.anchor } : { toAnchor: next.anchor }
      wq.enqueue({
        kind: 'upsert-edge',
        input: materializeEdgeInput(e, {
          fromNode: next.from,
          toNode: next.to,
          via: null,
          ...grabbed
        })
      })
      return { ok: true }
    },

    saveLineTypeNames(names) {
      if (!beginUnitGated()) return
      wq.enqueue({ kind: 'upsert-line-type-names', input: names })
    },

    removeNode(id) {
      if (!beginUnitGated()) return
      wq.enqueue({ kind: 'remove-node', id })
    },

    removeEdge(id) {
      if (!beginUnitGated()) return
      wq.enqueue({ kind: 'remove-edge', id })
    },

    // [F-VISFB-62 拆件] 悬浮笔记三动作=note-ops 域件注入（实现迁
    // lineage-note-ops.ts——纯移动零语义改，调用面名字零 churn）
    addFloatingNote,
    updateFloatingNote,
    removeFloatingNote,

    // [F-VISFB-14] 可等待面：await wq.flush()（保存钮 fire-and-forget 调用零变；
    // 退出握手 await 收口后查 saveStatus——error/saving 均按脏呈现）
    async save(): Promise<void> {
      await wq.flush()
    },

    undo() {
      const s = get()
      // [F-VISFB-64] closing gate：undo 逆写=用户动作，入队前冻结（设计 §④）；
      // [F-VISFB-65] recovery 门同闸（屏障 frozen 期拒绝）
      if (quitWriteBlocked() || recoveryBlocked() || s.flushing || s.undoStack.length === 0) return
      restore(s.undoStack[s.undoStack.length - 1]!, 'redo')
      // [F-VISFB-65] undo 回基线（queue 空→clean）=clean 四源之一→release；
      // [回炉 R4] 仍 dirty（部分撤销）→通知调度器收敛副本（撤销动作出副本）
      if (get().saveStatus === 'clean') markRecoveryClean('clean')
      else notifyRecoveryEditUnit()
    },

    redo() {
      const s = get()
      if (quitWriteBlocked() || recoveryBlocked() || s.flushing || s.redoStack.length === 0) return
      restore(s.redoStack[s.redoStack.length - 1]!, 'undo')
      // [F-VISFB-65] redo 回基线同族（快照对称面——会话回基线即弃副本）；
      // [回炉 R4] dirty 复来（回基线 release 后 redo）→副本须重建
      if (get().saveStatus === 'clean') markRecoveryClean('clean')
      else notifyRecoveryEditUnit()
    },

    discardSession() {
      // [F-VISFB-65 回炉轮2 Z8] 弃会话同时清重拉标志（会话已弃——上轮 CONFLICT
      // 残留标志不再属于任何待收口面）
      set({ queue: [], undoStack: [], redoStack: [], saveStatus: 'clean', lastWriteError: null, needsReload: false })
      // [F-VISFB-65] clean 四源之一：dirty 切图弃置→release(discard)
      markRecoveryClean('discard')
    },

    /** [F-VISFB-65 回炉 W1] 派生面合并（恢复流程 onRestored 后单独拉 graph 派生
     *  字段注入——卡编号/标签/侧板指标不空不串域；失败容错=缺省，下次 load 自愈） */
    applyDerivedFields(derived) {
      set({
        paperMetrics: derived.paperMetrics,
        pubNos: derived.pubNos,
        tagNames: derived.tagNames
      })
    },

    /**
     * [F-VISFB-65] 恢复载入（§6：read→folder 校验过→载入）：置 dirty+两栈清
     * +queue 恢复（重放幂等=§8 表契约）；复用 dirty 挂载同步跳过语义
     * （load 互锁——本件 load() 内 queue>0/flushing 丢弃既有面）防路由 load
     * 覆盖恢复态。视图域隔离随切图同型（focus 清+工具复位）。
     */
    applyRecoverySession(payload: LineageRecoveryPayload): void {
      set({
        folderId: payload.folderId,
        nodes: payload.graph.nodes,
        edges: payload.graph.edges,
        lineTypeNames: payload.graph.lineTypeNames,
        floatingNotes: payload.graph.floatingNotes,
        queue: payload.queue,
        saveStatus: 'dirty',
        lastWriteError: null,
        undoStack: [],
        redoStack: [],
        status: 'ready',
        error: null
      })
      useLineageViewStore.getState().clearFocus()
      useLineageViewStore.getState().resetTool()
    },

    retrySave() {
      void wq.flush()
    },

    // [F-DBCAMP-01 DB-4 / F-STAR-01 A3] 星标切换：乐观本地翻转（节点数组不可变
    // 更新——undo 快照持旧引用零回溯污染）→api 直写；失败回滚+toast。非编辑
    // 暂存面：不 beginUnit/不入队（星标=元数据写非图结构写——保存态零耦合）
    async toggleNodeStar(target) {
      const next = target.isStarred !== true
      const prev = target.isStarred
      set({
        nodes: get().nodes.map((n) => (n.id === target.id ? { ...n, isStarred: next } : n))
      })
      try {
        await unwrap(api.papers.setStarred({ paperId: target.paperId, starred: next }))
      } catch (e) {
        set({
          nodes: get().nodes.map((n) =>
            n.id === target.id ? { ...n, isStarred: prev } : n
          )
        })
        showToast(e instanceof ApiClientError ? e.message : '星标操作失败', 'error')
      }
    }
  }
})
