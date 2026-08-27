/**
 * ipc/lineage —— 脉络图域装配（LG-01：草稿导入+全图读两通道）。
 *
 * 薄分发（SR-IPC-* 同型）：业务在 services/lineage/lineage.service。
 * INV-07：草稿文件路径只出自 main 侧系统对话框（dialogs.pickJsonFile——
 * 本单在 Dialogs 依赖对象上新增，pickPdfFiles 单选同型；corpusSession
 * C-02「ipc 层选、service 收已选路径」同序）。用户取消→CANCELLED 域错误
 * （register 经 toAppError 折叠）；校验失败不是错误——ImportResult 判别
 * 联合原样回传（消费方分支呈现 errors 清单，INV-13 折叠约定）。
 * 写四通道接线归 LG-03（service 四写方法已建全测）。
 */
import type { AppErrorCode } from '../../shared/app-error'
import type { ApiHandlers } from '../../shared/ipc/api-surface'
import type { IpcDeps } from './index'

/** 域错误载体（export_.ts ExportIpcError 同型——.CancelledError 子类无必要） */
class LineageIpcError extends Error {
  readonly code: AppErrorCode

  constructor(code: AppErrorCode, message: string) {
    super(message)
    this.name = 'LineageIpcError'
    this.code = code
  }
}

export function createLineageIpc(deps: IpcDeps): ApiHandlers['lineage'] {
  return {
    importDraft: async () => {
      const file = await deps.dialogs.pickJsonFile()
      if (file === null) {
        throw new LineageIpcError('CANCELLED', '已取消选择草稿文件')
      }
      return deps.services.lineage.importFromFile(file)
    },
    graph: async () => deps.services.lineage.graph()
  }
}
