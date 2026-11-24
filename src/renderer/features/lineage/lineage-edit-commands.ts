// b3: P7-H
/**
 * [B4 L1 / 设计稿 §2.5 #3/#4、§5.2] lineage-edit-commands —— 节点/边/色行名十个
 * 编辑入口的接线与同步单元边界（自 lineage.store 迁出；悬浮笔记三入口同型驻
 * lineage-note-ops）。
 *
 * ── 行为层（每入口=前置判定→editUnit（gate→登记→enqueue…→commit））──
 * - 前置判定（节点/边不在图、重复端点对、自环）在开单元**之前**：拒写零副作用
 *   ——不得先清 redo 再拒写（§2.5 #4）。
 * - editUnit 返回 false=gate 拒绝（quit/recovery/conflict 冻结、同会话 saving
 *   编辑锁 INV-94）——调用方放弃写。
 * - 登记序=§5.2 矩阵的 redo 顺序：moveNode=该节点；applyObstacleReroute=月组
 *   全部传入节点（slot 全序）+被清 via 的变化帧边；drawEdge=新边 null→E'；
 *   editManualEdgeLabel/applyEdgeLineStyle/setEdgeVia/reconnectEdge=该边 E→E'；
 *   saveLineTypeNames=当前 folder 六行名；removeNode=先存留边 E→E'、再相关边
 *   E→null、最后 N→null；removeEdge=该边 E→null。
 * - 登记（捕获 before）必须先于该实体的乐观应用——乐观应用随 enqueue 即时发生。
 * - 物化纪律沿承：边动作全载荷物化（A8——via/双锚 null 归一）；[R16] 单源=
 *   lineage-write-actions materializeEdgeInput。
 * - 编辑单元=单次拖放/加点/删点/重置走线/端点重连/画线/删线/命名提交（含
 *   线型行内改名）/线形变更——与撤销栈单元同构（一单元=一撤销步；拖放类
 *   单元由轮 2 调线/拖拽接入，统一入口=editUnit（原 store.beginUnit）；「加点」入口
 *   随手动建点路径退役——节点唯一来源=入库/移动两路，INV-NEW-1）。
 *
 * ── 接口层 ──
 * - export function createEditCommands(deps): EditCommands
 * - export type DrawEdgeResult / ReconnectResult
 *
 * ── 架构层 ──
 * - 纯接线件：get/enqueue/editUnit 结构注入（宿主=lineage.store 装配位）。
 */
import type { LineageEditCommandKind } from '@shared/ipc/lineage-history.schemas'
import type { LineageAnchor, LineageEdge, LineageNode, LineageViaPoint } from '@shared/models/lineage'
import type { WriteAction } from '@shared/recovery/schemas'
import { showToast } from '../../shared/ui/toast-store'
import type { EditUnit } from './lineage-session-ops'
import { frameViaClearEdges, removeNodeWatches } from './lineage-history-commands'
import { materializeEdgeInput } from './lineage-write-actions'

/** [F-VISFB-66 §C.3] 画线建边结果枚举（查重单点=store 层） */
export type DrawEdgeResult = { ok: true; id: string } | { ok: false; reason: 'duplicate' | 'busy' }
/** [F-VISFB-66 §C.3] 换端结果枚举（self-loop/duplicate 由 store 前置判） */
export type ReconnectResult = { ok: true } | { ok: false; reason: 'duplicate' | 'self-loop' | 'busy' }

export interface EditCommandHost {
  nodes: LineageNode[]
  edges: LineageEdge[]
}

export interface EditCommandsDeps {
  get(): EditCommandHost
  enqueue(action: WriteAction): void
  /** 同步编辑单元边界（gate 拒绝返回 false——零副作用） */
  editUnit(command: LineageEditCommandKind, body: (unit: EditUnit) => void): boolean
}

export interface EditCommands {
  /** 拖拽落点→x/y 覆盖（全字段载荷收口防半更新清字段；x/y 数据面未退役+直测
   *  =非孤儿，主控裁决 e 保留）。[F-ALIGN-01] 加节点两型 store 动作随手动
   *  建点路径退役删除——节点唯一来源=入库/移动两路（INV-NEW-1） */
  moveNode(id: string, x: number, y: number): void
  /** [F-LANEGRID-01 B3 §6.4] 障碍突变复合单元（拖放 settle 落位——card-drag-
   *  session settle 流单口）：单 beginUnit 内月组槽位全序透写（slot=0..n-1）
   *  +变化帧 manual 边 via 批清除——**一次拖放=一撤销单元**（多载荷一步回退）。
   *  清除域=端点卡落在该月组的边（裁决⑥ 月域语义：月内边+直连边；穿框边/
   *  集外月保留 via）。undo/redo=历史恢复不清 via（恢复的前布局=via 有效
   *  布局）；仅用户障碍突变（拖放 settle/删卡）经本族清除。旧
   *  reorderMonthSlots 拖放单口随本动作并入（编辑口 setEdgeVia 沿承不变） */
  /** [B4 L2 §9.3] 上条注释的现行宿主：落位写入口=store.reorderMonthSlots（拖拽激活时捕获
   *  身份→lane.settleEdit→本动作）；「单 beginUnit」=现 editUnit */
  applyObstacleReroute(nodeIds: string[]): void
  /** [F-VISFB-66 裁定 1/2] 画线建边（唯一建边径=锚点显式拖拽——点两卡/右键
   *  链退役后 drawEdge 单径）：视觉字段=当前工具线型+label=当前色行名快照
   *  （P-14 继承制）；**双锚必填**（按下锚=fromAnchor/落点锚=toAnchor——
   *  两端锚用户钉定，设计书 §C.3）；查重单点驻本层（结果枚举——duplicate
   *  由调用方 toast「两节点间已存在连线」） */
  drawEdge(
    from: string,
    to: string,
    payload: { dashed: boolean; color: string; label: string; fromAnchor: LineageAnchor; toAnchor: LineageAnchor }
  ): DrawEdgeResult
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
    next: { end: 'from' | 'to'; from: string; to: string; anchor: LineageAnchor }
  ): ReconnectResult
  saveLineTypeNames(names: string[]): void
  removeNode(id: string): void
  removeEdge(id: string): void
}

/** 写前防御：节点不在图中即抛（语义动作侧校验——薄壳共用） */
const mustNode = (nodes: LineageNode[], id: string): LineageNode => {
  const n = nodes.find((x) => x.id === id)
  if (n === undefined) throw new Error(`节点不在图中：${id}`)
  return n
}

const mustEdge = (edges: LineageEdge[], id: string): LineageEdge => {
  const e = edges.find((x) => x.id === id)
  if (e === undefined) throw new Error(`边不在图中：${id}`)
  return e
}

/** [F-VISFB-66] 同端点对无向查重（查重单点——useDrawLine/reconnect 共用） */
const hasPair = (edges: LineageEdge[], from: string, to: string): boolean =>
  edges.some((e) => (e.fromNode === from && e.toNode === to) || (e.fromNode === to && e.toNode === from))

export function createEditCommands(deps: EditCommandsDeps): EditCommands {
  const { get, enqueue, editUnit } = deps

  return {
    moveNode(id, x, y) {
      mustNode(get().nodes, id)
      editUnit('moveNode', (u) => {
        u.watchNode(id)
        enqueue({ kind: 'patch-node', id, patch: { x, y } })
      })
    },

    applyObstacleReroute(nodeIds) {
      // [F-LANEGRID-01 B3] 拖放 settle 复合单元：槽位全序透写+变化帧 manual 边
      // via 批清除——单单元（一次拖放=一撤销步）；全部在场先判（拒写零副作用）
      for (const id of nodeIds) mustNode(get().nodes, id)
      const frame = new Set(nodeIds)
      const viaEdges = (): LineageEdge[] => frameViaClearEdges(get().edges, frame)
      const viaEdgeIds = viaEdges().map((e) => e.id)
      editUnit('applyObstacleReroute', (u) => {
        for (const id of nodeIds) u.watchNode(id)
        for (const id of viaEdgeIds) u.watchEdge(id)
        nodeIds.forEach((id, slot) => enqueue({ kind: 'patch-node', id, patch: {}, override: { slot } }))
        for (const e of viaEdges()) enqueue({ kind: 'upsert-edge', input: materializeEdgeInput(e, { via: null }) })
      })
    },

    drawEdge(from, to, payload) {
      // 查重单点（§C.3——service UNIQUE 兜底）；[R6] saving/gate=busy（非假成功）
      if (hasPair(get().edges, from, to)) return { ok: false, reason: 'duplicate' }
      let id = ''
      const opened = editUnit('drawEdge', (u) => {
        id = crypto.randomUUID()
        u.watchEdge(id)
        // [R9] silentSave=双 toast 合一；[R23] 构造层物化（id/双锚必填+via:null）
        enqueue({
          kind: 'upsert-edge',
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
      })
      if (!opened) return { ok: false, reason: 'busy' }
      showToast('已画线，保存后生效', 'success') // 建边成功反馈（沿承现行 toast 面——文案如实：暂存未落库）
      return { ok: true, id }
    },

    editManualEdgeLabel(edgeId, label) {
      const e = mustEdge(get().edges, edgeId)
      // 更新语义：id 提供端点保持（label 后编辑不换父——F-LG15）；全载荷含
      // 视觉字段+via（A8 接缝：缺省合成不回清）；[F-VISFB-66] 物化扩面：
      // via/双锚随现值 null 归一（未钉定=null 幂等落库）
      editUnit('editManualEdgeLabel', (u) => {
        u.watchEdge(edgeId)
        enqueue({ kind: 'upsert-edge', input: materializeEdgeInput(e, { label }) })
      })
    },

    applyEdgeLineStyle(edgeId, dashed, color) {
      const e = mustEdge(get().edges, edgeId)
      // id 全载荷：from/to/label/via 读现值（防半更新清字段——A8 含 via）；
      // dashed/color 成对置；[F-VISFB-66] 物化扩面同 editManualEdgeLabel
      editUnit('applyEdgeLineStyle', (u) => {
        u.watchEdge(edgeId)
        enqueue({ kind: 'upsert-edge', input: materializeEdgeInput(e, { dashed, color }) })
      })
    },

    setEdgeVia(edgeId, via) {
      const e = mustEdge(get().edges, edgeId)
      // id 全载荷（A8：from/to/label/视觉字段读现值——防半更新清字段）；
      // [F-VISFB-66] via=显式 null 清除（约定迁移——null/null 归一恒透传）
      editUnit('setEdgeVia', (u) => {
        u.watchEdge(edgeId)
        enqueue({ kind: 'upsert-edge', input: materializeEdgeInput(e, { via }) })
      })
    },

    reconnectEdge(edgeId, next) {
      const e = mustEdge(get().edges, edgeId)
      // ①自环判（UI 对端卡格静默前置——store 兜底）；②同对查重（排除本边——
      // F14）；③[R6] saving/gate=busy（非假成功）；④[R3] end-导向 A8 物化（被抓端新锚/
      // 另端现值含钉定——null/?? 二义消除；via 恒 null 清=换端重算，裁定 3）
      if (next.from === next.to) return { ok: false, reason: 'self-loop' }
      const dup = get().edges.some(
        (x) => x.id !== edgeId && ((x.fromNode === next.from && x.toNode === next.to) || (x.fromNode === next.to && x.fromNode === next.from))
      )
      if (dup) return { ok: false, reason: 'duplicate' }
      const grabbed: { fromAnchor?: LineageAnchor } | { toAnchor?: LineageAnchor } =
        next.end === 'from' ? { fromAnchor: next.anchor } : { toAnchor: next.anchor }
      const opened = editUnit('reconnectEdge', (u) => {
        u.watchEdge(edgeId)
        enqueue({ kind: 'upsert-edge', input: materializeEdgeInput(e, { fromNode: next.from, toNode: next.to, via: null, ...grabbed }) })
      })
      return opened ? { ok: true } : { ok: false, reason: 'busy' }
    },

    saveLineTypeNames(names) {
      // [B4 L1 D2 §5.4] 属当前 folder 会话：历史项绑定会话 folderId；IPC 请求的
      // folderId 由写路径单一适配函数注入（lineage-write-actions）
      editUnit('saveLineTypeNames', (u) => {
        u.watchLineTypeNames()
        enqueue({ kind: 'upsert-line-type-names', input: names })
      })
    },

    removeNode(id) {
      // [F-LANEGRID-01 B3 §6.4] 删卡=用户障碍突变：同帧（年月组）存留卡的
      // manual 边 via 并入同一撤销单元清除（触亡边先经乐观级联移除——无载荷
      // 可清）；异帧/穿框边保留 via
      const n = get().nodes.find((x) => x.id === id)
      // [F-LANEGRID-01 B3 §6.4] 登记序=§5.2 #9：存留边 via→相关边→节点（undo
      // 逆序写即=节点先恢复→相关边按原数组序→存留边原 via）
      const frame = new Set(
        n === undefined ? [] : get().nodes.filter((x) => x.year === n.year && x.month === n.month && x.id !== id).map((x) => x.id)
      )
      editUnit('removeNode', (u) => {
        for (const w of removeNodeWatches(get().nodes, get().edges, id)) {
          if (w.kind === 'edge') u.watchEdge(w.id)
          else if (w.kind === 'node') u.watchNode(w.id)
        }
        enqueue({ kind: 'remove-node', id }) // 乐观级联移除相关边（DDL CASCADE 镜像）
        for (const e of frameViaClearEdges(get().edges, frame)) {
          enqueue({ kind: 'upsert-edge', input: materializeEdgeInput(e, { via: null }) }) // 同帧存留卡 manual 边 via 清除
        }
      })
    },

    removeEdge(id) {
      editUnit('removeEdge', (u) => {
        u.watchEdge(id)
        enqueue({ kind: 'remove-edge', id })
      })
    }
  }
}
