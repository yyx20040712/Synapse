/**
 * [P7E-04] usePaperDetailActions —— 详情面板动作逻辑 hook
 * （runAction 分发+busy 态+toast 收口自 PaperDetailPanel 迁入——组件 250 红线
 * 拆件，纯逻辑/表现分离；props 面零变，按钮驻面板）
 *
 * ── 行为层 ──
 * - 动作联合：enrich/report/bibtex/corpus/doi（既有）+ bibtex-clip/csv-clip（P7E-04）
 * - busy 门：enrich 独占 enriching；report/bibtex/corpus/两 clip 共享 exporting
 *   （busy 期再触发短路零 invoke——E4）；doi 不占 busy（既有语义零变）
 * - 剪贴板成功 toast 逐字：「已复制 N 条题录到剪贴板」（bibtex）/
 *   「已复制 N 行列表到剪贴板」（csv）；失败统一「复制到剪贴板失败」
 *   （INV-02 动作型——剪贴板路径无对话框即无 CANCELLED 面，构建/写入失败
 *   对用户同呈现为动作失败，E7）
 * - 其余动作错误面零变：ApiClientError.message / 意外异常兜底「操作失败」
 *
 * ── 接口层 ──
 * - export function usePaperDetailActions(detail: PaperDetail | null, onRefresh: () => void):
 *     { enriching: boolean; exporting: boolean; runAction(action: PaperDetailAction): Promise<void> }
 *
 * ── 架构层 ──
 * - 只 import api/client+shared/ui/Toast（域内零跨域引用）
 *
 * ── 生命周期层 ── / ── 文化层 ──
 * - 测试：tests/unit/renderer/paper-detail-clip.test.tsx（E1/E2/E4/E6+拆件回归；
 *   受锁 paper-detail-export.test.tsx 经组件面断言零改全绿=拆件正确性判据）
 */
import { useState } from 'react'
import type { PaperDetail } from '@shared/models/paper'
import { api, unwrap, ApiClientError } from '../../api/client'
import { showToast } from '../../shared/ui/Toast'

/** 意外异常（非 ApiClientError）时的兜底中文消息 */
const ACTION_FAILED = '操作失败'

/** 剪贴板动作失败文案（E6/E7：无 CANCELLED 面，失败统一动作型） */
const CLIP_FAILED = '复制到剪贴板失败'

export type PaperDetailAction =
  | 'enrich'
  | 'report'
  | 'bibtex'
  | 'corpus'
  | 'doi'
  | 'bibtex-clip'
  | 'csv-clip'

export function usePaperDetailActions(
  detail: PaperDetail | null,
  onRefresh: () => void
): {
  enriching: boolean
  exporting: boolean
  runAction: (action: PaperDetailAction) => Promise<void>
} {
  const [enriching, setEnriching] = useState(false)
  const [exporting, setExporting] = useState(false)

  /** 动作型按钮统一收口：busy 门 → invoke → 成功 toast/刷新；错误 toast */
  async function runAction(action: PaperDetailAction): Promise<void> {
    if (detail === null) return
    const isClip = action === 'bibtex-clip' || action === 'csv-clip'
    if (action === 'enrich') {
      if (enriching) return
      setEnriching(true)
    } else if (action !== 'doi') {
      if (exporting) return
      setExporting(true)
    }
    try {
      if (action === 'enrich') {
        const refreshed = await unwrap(api.enrich.fetch({ paperId: detail.id }))
        if (refreshed.enrichStatus === 'failed') {
          showToast('元数据增强失败：上游未响应或无匹配', 'error')
        } else {
          showToast('元数据增强完成', 'success')
        }
        onRefresh()
      } else if (action === 'report') {
        const r = await unwrap(api.export_.report({ paperId: detail.id }))
        showToast(`已导出 ${r.count} 条内容：${r.filePath}`, 'success')
      } else if (action === 'bibtex') {
        const r = await unwrap(api.export_.bibtex({ paperIds: [detail.id] }))
        showToast(`已导出 ${r.count} 条题录：${r.filePath}`, 'success')
      } else if (action === 'corpus') {
        const r = await unwrap(api.export_.corpus({ paperId: detail.id }))
        showToast(`已导出语料 md：${r.filePath}`, 'success')
      } else if (action === 'bibtex-clip') {
        const r = await unwrap(api.export_.clipboard({ format: 'bibtex', paperIds: [detail.id] }))
        showToast(`已复制 ${r.count} 条题录到剪贴板`, 'success')
      } else if (action === 'csv-clip') {
        const r = await unwrap(api.export_.clipboard({ format: 'csv', paperIds: [detail.id] }))
        showToast(`已复制 ${r.count} 行列表到剪贴板`, 'success')
      } else if (detail.doi !== null) {
        await unwrap(api.system.openExternal({ url: `https://doi.org/${detail.doi}` }))
      }
    } catch (e) {
      if (isClip) {
        // 配置缺陷（如剪贴板依赖未装配）与运行失败在控制台可区分（AnnotationLayer
        // 意外异常 console 先例——门一 N1）；用户面仍统一动作型文案（E6/E7）
        console.error('[PaperDetailActions] 剪贴板导出失败', e)
        showToast(CLIP_FAILED, 'error')
      } else {
        showToast(e instanceof ApiClientError ? e.message : ACTION_FAILED, 'error')
      }
    } finally {
      setEnriching(false)
      setExporting(false)
    }
  }

  return { enriching, exporting, runAction }
}
