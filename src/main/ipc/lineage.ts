/**
 * ipc/lineage —— 脉络图域装配（LG-01：草稿导入+全图读两通道；LG-03：写四通道接线）。
 *
 * 薄分发（SR-IPC-* 同型）：业务在 services/lineage/lineage.service。
 * INV-07：草稿文件路径只出自 main 侧系统对话框（dialogs.pickJsonFile——
 * 本单在 Dialogs 依赖对象上新增，pickPdfFiles 单选同型；corpusSession
 * C-02「ipc 层选、service 收已选路径」同序）。用户取消→CANCELLED 域错误
 * （register 经 toAppError 折叠）；校验失败不是错误——ImportResult 判别
 * 联合原样回传（消费方分支呈现 errors 清单，INV-13 折叠约定）。
 * 写四通道（LG-03）：Req→service 入参的缺省归一（paperId/x/y 省略=null=
 * 主题节点/自动布局；label 省略=''）；树守卫全部在 service（INV-27 守卫
 * 宿主——IPC 零守卫），拒绝经 LineageDomainError（CONFLICT）由 toAppError
 * 结构化透传中文 reason，renderer 按 code 分支（丢弃动作+toast vs 系统型
 * 保留重试）。
 */
import type { ApiHandlers } from '../../shared/ipc/api-surface'
import { DomainError } from '../services/shared/domain-error'
import type { IpcDeps } from './ipc-deps'

/** 域错误载体（shared/domain-error 基类一行继承——F-DEDUP-01 单源；
 *  .CancelledError 子类无必要） */
class LineageIpcError extends DomainError {}

export function createLineageIpc(deps: IpcDeps): ApiHandlers['lineage'] {
  return {
    importDraft: async () => {
      const file = await deps.dialogs.pickJsonFile()
      if (file === null) {
        throw new LineageIpcError('CANCELLED', '已取消选择草稿文件')
      }
      return deps.services.lineage.importFromFile(file)
    },
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
        // service 解析；显式提供=跨图移动，幽灵值 service 拒）
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
        kind: req.kind,
        sub: req.sub // T3-P5：undefined/null 同归一 null=基础默认样式（service 守卫）
      }),
    removeEdge: async (req) => {
      deps.services.lineage.removeEdge(req.id)
      return { ok: true }
    },
    // T3-P5：图级线型整体替换（守卫全在 service——恒四组/id 唯一/被引用 sub
    // 不得消失；Res=校验后回显）
    upsertLineTypes: async (req) => deps.services.lineage.upsertLineTypes(req)
  }
}
