// b3: P7-H
/**
 * [B4 L1 / 设计稿 §5.4/§11.2] lineage-write-actions —— 普通写动作的乐观应用、
 * lazy 物化与 API 请求映射（自 lineage-write-queue 拆出——queue/flush 留驻原件；
 * 纯数据变换，零 IO）。
 *
 * ── 行为层 ──
 * - applyOptimistic：动作即时投影到本地数据态（A7——本地即时更新；节点变更后
 *   lineageOrder 重排=渲染序单源沿承）。renderer 乐观时戳只写本地显示态、从不
 *   入 DB（§7.5）；会话内新建的边/笔记 createdAt=乐观值，落库后经写回显再锚
 *   （lineage-history-commands reanchorHistory）。
 * - withLocalId：新建类动作本地 uuid 回写（本地乐观 id=落库 id——无临时 id 漂移）。
 * - normalizeEdgeInput：upsert-edge 载荷归一化（undefined≡缺席；null=显式清除）。
 * - materializeEdgeInput：边动作全载荷物化（A8 接缝——via/双锚 null 归一；四消费
 *   面=editManualEdgeLabel/applyEdgeLineStyle/setEdgeVia/reconnectEdge）。A8（
 *     全载荷合成含 via/dashed/color，repo ON CONFLICT 清 via 接缝随全载荷消解）
 * - fullPatchBody/lazyInput：patch-node 执行时点合成（白名单六字段防半更新清字段
 *   ——身份/图归属/时间戳不在白名单，沿用库行）。
 * - lineTypeTypesRequest：[D2 §5.4 签名链第 2 段] upsert-line-type-names 请求的
 *   **单一适配函数**——queue action 的 input 保持 names 数组（RecoveryPayload.queue
 *   不扩字段），IPC 发起时注入 folderId：renderer 发起取会话 folderId；崩溃重放
 *   的 payload.queue 经 applyRecoverySession 载入后 folderId 已=RecoveryPayload.
 *   folderId——两处走同一函数同一读点，禁手写两份注入逻辑。
 *
 * ── 接口层 ──
 * - export function applyOptimistic/withLocalId/normalizeEdgeInput/materializeEdgeInput
 *   /fullPatchBody/lazyInput/lineTypeTypesRequest/upsertEdgeRequest
 *
 * ── 架构层 ──
 * - 纯函数件：只依赖 shared 模型与 recovery WriteAction 类型。
 */
import { LINE_TYPE_COLORS, lineageOrder } from '@shared/models/lineage'
import type { FloatingNote, LineageEdge, LineageEdgeUpsert, LineageNode } from '@shared/models/lineage'
import type { WriteAction } from '@shared/recovery/schemas'
import type { LineageUpsertEdgeReq } from '@shared/ipc/schemas'

/** [F-ALIGN-01] patch-node 白名单载荷面（=IPC lineagePatchNodeReqSchema 去 id
 *  ——id=定位键；paperId/folderId/时间戳不可 patch；核心想法字段已随 [A3
 *  F-CONTRACTA-01 2026-10-04] 核心想法域全退役删除（全文笔记承接语义）；
 *  tags 已随 [A1b F-CONTRACTA-01] 标签域退役删除） */
export type LineageNodePatchBody = Partial<
  Pick<LineageNode, 'title' | 'year' | 'month' | 'slot' | 'x' | 'y'>
>

/** [F-VISFB-65] patch 懒载荷形（WriteAction 判别联合 patch-node 臂——shared
 *  单源迁移后本地别名保持消费面零 churn；语义轴整替〔后到胜出〕注释随迁
 *  shared/recovery/schemas.ts） */
export type LazyNodePatch = Extract<WriteAction, { kind: 'patch-node' }>

/** 乐观图态四面（applyOptimistic 的宿主面） */
export interface OptimisticHost {
  nodes: LineageNode[]
  edges: LineageEdge[]
  floatingNotes: FloatingNote[]
  lineTypeNames: string[]
}

type OptimisticSet = (fn: (s: OptimisticHost) => Partial<OptimisticHost>) => void

export function applyOptimistic(set: OptimisticSet, action: WriteAction): void {
  if (action.kind === 'patch-node') {
    // lazy 更新：patch 应用+override 语义轴（slot 透写）
    set((s) => ({
      nodes: lineageOrder(
        s.nodes.map((n): LineageNode => {
          if (n.id !== action.id) return n
          const patched: LineageNode = { ...n, ...action.patch }
          if (action.override === undefined) return { ...patched, updatedAt: new Date().toISOString() }
          return { ...patched, slot: action.override.slot, updatedAt: new Date().toISOString() }
        })
      )
    }))
    return
  }
  if (action.kind === 'remove-node') {
    set((s) => ({
      nodes: s.nodes.filter((n) => n.id !== action.id),
      // 级联镜像：两端点任一为该节点的边全清（DDL CASCADE 的会话面）
      edges: s.edges.filter((e) => e.fromNode !== action.id && e.toNode !== action.id)
    }))
    return
  }
  if (action.kind === 'upsert-edge') {
    const now = new Date().toISOString()
    const id = action.input.id ?? crypto.randomUUID()
    const next: LineageEdge = {
      id,
      fromNode: action.input.fromNode,
      toNode: action.input.toNode,
      label: action.input.label,
      dashed: action.input.dashed === true,
      color: action.input.color ?? LINE_TYPE_COLORS[0], // [R21] 常量单源（色板首色）
      // [F-VISFB-66] via 三态：值=入乐观行；null/缺席=未携（自动路由——读模型
      // undefined 语义，与 repo NULL 归一同终态）
      ...(action.input.via != null && action.input.via.length > 0 ? { via: action.input.via } : {}),
      // [F-VISFB-66] 锚乐观面：值=钉定入乐观行；null/缺席=未钉定（读模型
      // undefined 语义——repo 全行替换下 null 落 NULL 幂等）
      ...(action.input.fromAnchor != null ? { fromAnchor: action.input.fromAnchor } : {}),
      ...(action.input.toAnchor != null ? { toAnchor: action.input.toAnchor } : {}),
      createdAt: now,
      updatedAt: now
    }
    set((s) => ({
      edges: s.edges.some((e) => e.id === id)
        ? s.edges.map((e) => (e.id === id ? { ...next, createdAt: e.createdAt } : e))
        : [...s.edges, next]
    }))
    return
  }
  if (action.kind === 'remove-edge') {
    set((s) => ({ edges: s.edges.filter((e) => e.id !== action.id) }))
    return
  }
  if (action.kind === 'upsert-floating-note') {
    const now = new Date().toISOString()
    const id = action.input.id ?? crypto.randomUUID()
    const next: FloatingNote = {
      id,
      folderId: action.input.folderId,
      x: action.input.x,
      y: action.input.y,
      content: action.input.content,
      createdAt: now,
      updatedAt: now
    }
    set((s) => ({
      floatingNotes: s.floatingNotes.some((n) => n.id === id)
        ? s.floatingNotes.map((n) => (n.id === id ? { ...next, createdAt: n.createdAt } : n))
        : [...s.floatingNotes, next]
    }))
    return
  }
  if (action.kind === 'remove-floating-note') {
    set((s) => ({ floatingNotes: s.floatingNotes.filter((n) => n.id !== action.id) }))
    return
  }
  set(() => ({ lineTypeNames: [...action.input] }))
}

/** 新建类动作本地 uuid 回写（A7 乐观一致性：本地乐观 id=落库 id）。
 *  （repo 采纳 provided id）——无临时 id 漂移、服务器回显按同 id 覆盖；
 *  isNew 标记=新建 toast 判据（id 补齐后 undefined 判据失效）。
 *  [F-ALIGN-01] 节点新建形态随旧节点写通道退役删除——本面现仅笔记新建 */
export function withLocalId(a: WriteAction): WriteAction {
  // [回炉 R20] upsert-edge 补 id 分支已不可达删除（enqueue id 必填 throw
  // 前置——store 边动作构造层恒携本地 uuid；防御纵深二道位消失，throw=唯一闸）
  // [F-VISFB-61] 笔记新建：本地乐观 id=落库 id（无临时 id 漂移）；isNew 仅
  // 标记（无 toast 面——62 号 UI 承载反馈）
  if (a.kind === 'upsert-floating-note' && a.input.id === undefined) {
    return { ...a, input: { ...a.input, id: crypto.randomUUID() }, isNew: true }
  }
  return a
}

/** [F-VISFB-66] upsert-edge 载荷归一化（undefined≡缺席——设计书 §D.4-3）：
 *  via/fromAnchor/toAnchor/dashed/color 的 undefined 键一律剥除（缺省与
 *  undefined 在队列载荷内等价——合并整替与 flush 载荷拼装面零 undefined
 *  残留；null=显式清除意图保留透传） */
export function normalizeEdgeInput(input: LineageEdgeUpsert): LineageEdgeUpsert {
  return {
    id: input.id,
    fromNode: input.fromNode,
    toNode: input.toNode,
    label: input.label,
    ...(input.dashed !== undefined ? { dashed: input.dashed } : {}),
    ...(input.color !== undefined ? { color: input.color } : {}),
    ...(input.via !== undefined ? { via: input.via } : {}),
    ...(input.fromAnchor !== undefined ? { fromAnchor: input.fromAnchor } : {}),
    ...(input.toAnchor !== undefined ? { toAnchor: input.toAnchor } : {})
  }
}

/** [R16] 边动作物化单源：e 全载荷基座（via/双锚 null 归一）+patch 覆盖 */
export function materializeEdgeInput(
  e: LineageEdge,
  patch: Partial<
    Pick<LineageEdgeUpsert, 'fromNode' | 'toNode' | 'label' | 'dashed' | 'color' | 'via' | 'fromAnchor' | 'toAnchor'>
  >
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

/** 既有节点→patch-node 全字段载荷（白名单六字段防半更新清字段——A8 全载荷
 *  合成语义等价迁移：服务端 {...existing, ...patch} 合并，本地行全字段随发
 *  =整行面等价；身份/图归属/时间戳不在白名单——沿用库行。
 *  [A1b] tags 恒发行随标签域退役删除（原「恒发 tags:null 防清空失效」面
 *  随字段消亡——k1-W1 先例注记留档）；[A3 F-CONTRACTA-01] 核心想法恒发行
 *  随核心想法域全退役删除（同型先例） */
export function fullPatchBody(n: LineageNode): LineageNodePatchBody {
  return { title: n.title, year: n.year, month: n.month, slot: n.slot, x: n.x, y: n.y }
}

/** [R3] lazy 载荷执行时点合成：fullPatchBody(现行)+patch 覆盖+override（slot 透写） */
export function lazyInput(a: LazyNodePatch, current: LineageNode): LineageNodePatchBody {
  const patched: LineageNodePatchBody = { ...fullPatchBody(current), ...a.patch }
  return a.override === undefined ? patched : { ...patched, slot: a.override.slot }
}

/** [D2 §5.4] upsert-line-type-names 请求适配（单一注入点——见头注） */
export function lineTypeTypesRequest(folderId: string, names: string[]): { folderId: string; names: string[] } {
  return { folderId, names }
}

/** upsert-edge → lineage/upsert-edge 请求载荷（缺省键不进载荷——repo 归一） */
export function upsertEdgeRequest(input: LineageEdgeUpsert): LineageUpsertEdgeReq {
  return {
    from: input.fromNode,
    to: input.toNode,
    label: input.label,
    // [F-LGRAPH-01②U8] 视觉线型内联透传（缺省键不进载荷——repo 归一）
    ...(input.dashed !== undefined ? { dashed: input.dashed } : {}),
    ...(input.color !== undefined ? { color: input.color } : {}),
    ...(input.via !== undefined ? { via: input.via } : {}),
    ...(input.fromAnchor !== undefined ? { fromAnchor: input.fromAnchor } : {}),
    ...(input.toAnchor !== undefined ? { toAnchor: input.toAnchor } : {}),
    // label 后编辑：id 提供经 IPC 更新（缺省键不进载荷）
    ...(input.id !== undefined ? { id: input.id } : {})
  }
}
