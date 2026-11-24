// b3: P7-H
/**
 * lineage-write-executor —— 脉络编辑动作的单条落库执行与实体回显（[F-LGRAPH-01②U1] 写队列
 * 的执行件：七 kind 的 applyAction；[回炉 W-D2a·T-B05] 自 lineage-write-queue 外移成件：queue
 * 件行数超设计稿预算，按 r-tests/note.md 表四切面拆件——queue 只留融合、drain、chain/flush；
 * 动作体与注释自 queue 逐字迁入，行为零改）。
 *
 * ── 行为层 ──
 * - applyAction(action)：执行一条已出队的 WriteAction——发 IPC，成功后把服务器行回填
 *   图态（回显）并经 onEcho 锚定历史项（lineage-history-commands reanchorHistory）。
 * - 节点缺席（[F-VISFB-65 回炉轮2 Z4]）：重放面节点不在图中=ApiClientError CONFLICT
 *   ——由 queue 的 drain 按拒绝型丢弃（封死重放死循环，见 nodeOf 头注）。
 * - 失败路径不在本件：ApiClientError 原样上抛，由 queue 的 drain 区分系统型（停队头、
 *   error 态）与拒绝型（丢弃继续）。
 * - lazy 载荷（[T3-P8 R3]）：patch-node 执行时点 fullRowInput（最新行）合成——暂存窗内
 *   先行落地的乐观变更自然并入（入队侧的说明见 lineage-write-queue 头注）。
 * - 色行名请求的 folderId 按单一适配函数注入：本链已 remap 主图时取 remap 目标键
 *   （remappedTo——queue 的 drain 收尾捕获；会话 data.folderId 不变）。
 *
 * ── 接口层 ── export interface WriteExecutorDeps；export function createWriteExecutor(deps)
 *
 * ── 架构层 ── 纯执行件：图态读写经 deps 注入（宿主=lineage-write-queue）；对 queue 为
 * type-only import（零环）。
 */
import { api, unwrap, ApiClientError } from '../../api/client'
import { showToast } from '../../shared/ui/toast-store'
import { lineageOrder } from '@shared/models/lineage'
import type { LineageNode } from '@shared/models/lineage'
import type { WriteAction } from '@shared/recovery/schemas'
import {
  lazyInput,
  lineTypeTypesRequest,
  upsertEdgeRequest
} from './lineage-write-actions'
import type { WriteQueueHost } from './lineage-write-queue'
import type { EntityEcho } from './lineage-history-commands'

export interface WriteExecutorDeps {
  set(
    patch:
      | Partial<WriteQueueHost>
      | ((s: WriteQueueHost) => Partial<WriteQueueHost>)
  ): void
  get(): WriteQueueHost
  /** 写回显锚定（queue 宿主的 onEcho——缺省=无历史面） */
  onEcho?(echo: EntityEcho): void
  /** 本链已决出的 ghost remap 目标（null=未 remap——色行名请求的 folderId 取会话现值） */
  remappedTo(): string | null
}

export function createWriteExecutor(deps: WriteExecutorDeps): { applyAction(action: WriteAction): Promise<void> } {
  const { set, get } = deps
  const remappedTo = (): string | null => deps.remappedTo()

  /** [F-VISFB-65 回炉轮2 Z4] 重放面节点缺席=CONFLICT 丢弃语义（旧 plain Error
   *  抛=系统型失败永续重试——封死重放死循环）
   *  [回炉 W-D2a·T-B04] 恢复载荷 [patch A, remove A] 重放：patch 遇 A 缺席——§8 表「节点亡=CONFLICT 丢弃」
   *  同族收口：队首移除+toast+needsReload。用户动作面守卫（lineage-edit-commands mustNode——
   *  原 lineage.store mustNode）保持 throw 语义不变（写前防御——非重放面） */
  const nodeOf = (id: string): LineageNode => {
    const n = get().nodes.find((x) => x.id === id)
    if (n === undefined) throw new ApiClientError('CONFLICT', `节点不在图中：${id}`)
    return n
  }
  const putNode = (saved: LineageNode): void =>
    set((s) => ({
      // 回填后按 lineageOrder 重排（INV-75——store 数组序=渲染序单源）
      nodes: lineageOrder(s.nodes.some((n) => n.id === saved.id) ? s.nodes.map((n) => (n.id === saved.id ? saved : n)) : [...s.nodes, saved])
    }))
  const echo = (e: EntityEcho): void => deps.onEcho?.(e)

  const applyAction = async (action: WriteAction): Promise<void> => {
    if (action.kind === 'patch-node') {
      const saved = await unwrap(api.lineage.patchNode({ id: action.id, ...lazyInput(action, nodeOf(action.id)) }))
      putNode(saved)
      echo({ kind: 'node', id: saved.id, server: saved })
      return
    }
    if (action.kind === 'remove-node') {
      await unwrap(api.lineage.removeNode({ id: action.id }))
      set((s) => ({
        nodes: s.nodes.filter((n) => n.id !== action.id),
        // 级联镜像：两端点任一为该节点的边全清（DDL CASCADE 的 store 面）
        edges: s.edges.filter((e) => e.fromNode !== action.id && e.toNode !== action.id)
      }))
      return
    }
    if (action.kind === 'upsert-edge') {
      const saved = await unwrap(api.lineage.upsertEdge(upsertEdgeRequest(action.input)))
      set((s) => ({ edges: s.edges.some((e) => e.id === saved.id) ? s.edges.map((e) => (e.id === saved.id ? saved : e)) : [...s.edges, saved] }))
      echo({ kind: 'edge', id: saved.id, server: saved })
      // 新建边成功 toast=唯一可见反馈；label 后编辑（id 显式提供）不 toast 防噪；
      // [回炉 R9] 画线动作面（silentSave）抑制——「已画线，保存后生效」暂存
      // 提示已承载，双 toast 合一
      if (action.isNew === true && action.silentSave !== true) showToast('连线已保存', 'success')
      return
    }
    if (action.kind === 'upsert-line-type-names') {
      // 整批替换（Res=归一后回显恰 6 行）——[D2] folderId 由单一适配函数注入（[回炉 W-B1·R-remap] remap 后按目标键——会话 data.folderId 不变）
      const saved = await unwrap(api.lineage.upsertLineTypes(lineTypeTypesRequest(remappedTo() ?? get().folderId, action.input)))
      set({ lineTypeNames: saved })
      echo({ kind: 'line-type-names', names: saved })
      return
    }
    if (action.kind === 'upsert-floating-note') {
      const saved = await unwrap(api.lineage.upsertFloatingNote(action.input))
      set((s) => ({ floatingNotes: s.floatingNotes.some((n) => n.id === saved.id) ? s.floatingNotes.map((n) => (n.id === saved.id ? saved : n)) : [...s.floatingNotes, saved] }))
      echo({ kind: 'floating-note', id: saved.id, server: saved })
      return
    }
    if (action.kind === 'remove-floating-note') {
      await unwrap(api.lineage.removeFloatingNote({ id: action.id }))
      set((s) => ({ floatingNotes: s.floatingNotes.filter((n) => n.id !== action.id) }))
      return
    }
    await unwrap(api.lineage.removeEdge({ id: action.id }))
    set((s) => ({ edges: s.edges.filter((e) => e.id !== action.id) }))
  }

  return { applyAction }
}
