// b3: P7-H
/**
 * [LG-03] lineage-import —— 导入草稿入口动作（Board 工具栏消费，组件行数
 * 拆分预案落点）。
 *
 * 行为（回炉 1 轮主控裁决①——LG-01 票面条款兑现）：confirm「导入将替换
 * 现有脉络图」（覆盖式语义人工修订保护——window.confirm 在 .ts 模块的
 * 先例=tab-dirty.ts confirmCloseDirty）→lineage/import（main 侧 dialog
 * 选 JSON，INV-07）→成功计数 toast（nodeCount/edgeCount）+store 重取刷新；
 * 校验失败=errors 汇总计数+首条明细 toast（INV-02 动作型——逐条多 toast
 * 被同文案去重吞且刷屏，完整清单 v2 候选，形态自裁已申报）；CANCELLED
 * （main 侧文件选择取消）=info 轻量反馈无其他动作（「取消=无操作」——
 * LibraryPage 导出「取消也可见反馈」先例族）。
 */
import { api, unwrap, ApiClientError } from '../../api/client'
import { showToast } from '../../shared/ui/toast-store'
import { useLineageStore } from './lineage.store'

export function importLineageDraft(): void {
  if (!window.confirm('导入将替换现有脉络图')) return
  unwrap(api.lineage.importDraft({}))
    .then((res) => {
      if (res.ok) {
        showToast(`已导入脉络图：${res.nodeCount} 个节点，${res.edgeCount} 条连线`, 'success')
        void useLineageStore.getState().load()
        return
      }
      const first = res.errors[0]
      showToast(
        `草稿校验失败（共 ${res.errors.length} 处）：${first?.path ?? ''} ${first?.reason ?? ''}`,
        'error'
      )
    })
    .catch((e: unknown) => {
      if (e instanceof ApiClientError && e.code === 'CANCELLED') {
        showToast('已取消导入', 'info')
        return
      }
      showToast(e instanceof ApiClientError ? e.message : '导入草稿失败', 'error')
    })
}
