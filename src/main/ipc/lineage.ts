/**
 * ipc/lineage —— 脉络图域装配（LG-01：全图读通道；LG-03：写四通道接线）。
 *
 * 薄分发（SR-IPC-* 同型）：业务在 services/lineage/lineage.service。
 * [F-BAKRET-01] 草稿导入通道（lineage/import+main 侧 JSON 对话框）随导入链
 * 退役删除（用户裁决 2026-09-30——ADR-0022）。
 * [F-ALIGN-01 D1] 旧节点写通道（整行 upsert 形态）退役→patch-node（脉络手动建点路径
 * 全退役——新建/主题分支随消亡，IPC 零归一面：载荷=编辑 patch 原样透传，
 * 合并/归一/幽灵 id 拒全部在 service）；树守卫全部在 service（INV-27 守卫
 * 宿主——IPC 零守卫），拒绝经 LineageDomainError（CONFLICT）由 toAppError
 * 结构化透传中文 reason，renderer 按 code 分支（丢弃动作+toast vs 系统型
 * 保留重试）。
 */
import type { ApiHandlers } from '../../shared/ipc/api-surface'
import type { IpcDeps } from './ipc-deps'

export function createLineageIpc(deps: IpcDeps): ApiHandlers['lineage'] {
  return {
    graph: async (req) => deps.services.lineage.graph(req.folderId),
    // [F-ALIGN-01] id=定位键；patch=白名单七字段原样透传（[A1b] tags 已随
    // 标签域退役删除；未携带键不折叠——service 合并语义：未携带字段保留，
    // null=清除）
    patchNode: async (req) => {
      const { id, ...patch } = req
      return deps.services.lineage.patchNode(id, patch)
    },
    removeNode: async (req) => {
      deps.services.lineage.removeNode(req.id)
      return { ok: true }
    },
    upsertEdge: async (req) =>
      deps.services.lineage.upsertEdge({
        id: req.id, // F-LG15 label 后编辑（更新语义——缺省 undefined=新建）
        fromNode: req.from,
        toNode: req.to,
        label: req.label ?? '',
        dashed: req.dashed, // [F-LGRAPH-01②U8] 视觉线型内联（缺省归一在 repo）
        color: req.color,
        via: req.via // [F-LINEAGE-02] 手动调线路点透传（不变量校验在 service）
      }),
    removeEdge: async (req) => {
      deps.services.lineage.removeEdge(req.id)
      return { ok: true }
    },
    // [F-LGRAPH-01②U8] 图级色行名整批替换（恰 6 校验 schema 面单源——
    // 通道名沿承 upsert-line-types，载荷重整为 names 数组；Res=归一后回显）
    upsertLineTypes: async (req) => deps.services.lineage.upsertLineTypeNames(req)
  }
}
