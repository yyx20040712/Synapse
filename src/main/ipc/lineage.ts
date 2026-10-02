/**
 * ipc/lineage —— 脉络图域装配（LG-01：全图读通道；LG-03：写四通道接线）。
 *
 * 薄分发（SR-IPC-* 同型）：业务在 services/lineage/lineage.service。
 * [F-BAKRET-01] 草稿导入通道（lineage/import+main 侧 JSON 对话框）随导入链
 * 退役删除（用户裁决 2026-09-30——ADR-0022）。
 * 写四通道（LG-03）：Req→service 入参的缺省归一（paperId/x/y 省略=null=
 * 主题节点/自动布局；label 省略=''）；树守卫全部在 service（INV-27 守卫
 * 宿主——IPC 零守卫），拒绝经 LineageDomainError（CONFLICT）由 toAppError
 * 结构化透传中文 reason，renderer 按 code 分支（丢弃动作+toast vs 系统型
 * 保留重试）。
 */
import type { ApiHandlers } from '../../shared/ipc/api-surface'
import type { IpcDeps } from './ipc-deps'

export function createLineageIpc(deps: IpcDeps): ApiHandlers['lineage'] {
  return {
    graph: async (req) => deps.services.lineage.graph(req.folderId),
    upsertNode: async (req) =>
      deps.services.lineage.upsertNode({
        id: req.id,
        paperId: req.paperId ?? null,
        title: req.title,
        coreIdea: req.coreIdea,
        year: req.year,
        x: req.x ?? null,
        y: req.y ?? null,
        tags: req.tags ?? null, // F-LG14：缺省归一 null=清空（paperId/x/y 同款）
        // T3-P5：month/slot 原样透传（undefined=归一语义键——service 区分
        // undefined=归一与 null=透写清面，IPC 层不做 ?? 折叠）；
        // [F-FOLDER-01] folderId 原样透传（undefined=保持现图/新建落主图——
        // service 解析）。[F-LGCLN-01] 语义收窄：folderId=仅主题节点新建落图
        // 值（当前图）；更新场景被忽略（禁搬图）；文献节点≠归属仍 CONFLICT
        // ——INV-88；幽灵 folderId 仅新建面拒（更新场景校验对象=existing
        // 现图恒真，异值静默忽略——门一 d1-N4 口径注记）
        month: req.month,
        slot: req.slot,
        folderId: req.folderId
      }),
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
