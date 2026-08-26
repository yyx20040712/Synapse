/**
 * [AI-04] useExportCorpusEvents —— App 层导出事件桥（工单：done / strong）
 *
 * ── 行为层 ──
 * - App 根挂载一次（挂载点=App.tsx，与 Settings/Reader 挂载态零耦合——导出中
 *   导航离开设置页流不中断，票面 R14）
 * - apiEvents.onExportCorpus 双型分发：progress→corpus-export.store.applyProgress；
 *   extract-request→CorpusExtractor.handleEvent（生产组装=createCorpusExtractor(
 *   {loadDocument: loadPdfDocument, sendItem: window.api.export_.corpusItem})——
 *   AI-02 交付的组装点；complete/error 载荷不是事件（renderer→main 常规 invoke，
 *   提取器内部消费））
 * - 终局 toast（INV-02——设置节卸载后反馈不丢）：订阅 store busy true→false
 *   变化沿——error 非空=error 档 toast（折叠码中文 message 直达，EXPORT_BUSY/
 *   CANCELLED 同型）；否则 success/info 档（fileCount+errorCount 部分成功可见）
 * - INV-14 成对清理：事件订阅+store 订阅的注销与挂载同源（卸载各调 off）
 *
 * ── 接口层 ──
 * - export function useExportCorpusEvents(): void（App 根调用）
 *
 * ── 架构层 ──
 * - settings 域 hook；依赖 api/client（api+apiEvents）+reader 域 CorpusExtractor
 *   （跨域引用=check-quality 组合根白名单受控例外——本 hook 是 AI-02 票面指定
 *   的提取管线生产组装点，tab-dirty 同型先例）+toast-store 消费惯例
 *
 * ── 生命周期层 ── / ── 文化层 ──
 * - 不做：取消 UI（v1 极简）；提取器防御分支归 AI-02 模块自身
 * - 测试：tests/unit/renderer/corpus-export.test.tsx（已锁定，模块桩）
 */
import { useEffect } from 'react'
import { api, apiEvents } from '../../api/client'
import { showToast } from '../../shared/ui/Toast'
import { createCorpusExtractor, loadPdfDocument } from '../reader/CorpusExtractor'
import { useCorpusExportStore } from './corpus-export.store'

export function useExportCorpusEvents(): void {
  useEffect(() => {
    const extractor = createCorpusExtractor({
      loadDocument: loadPdfDocument,
      // 通道 Res={ok:true}（trueAck）→ SendItem 契约 Result<void> 的形状映射
      sendItem: async (item) => {
        const r = await api.export_.corpusItem(item)
        return r.ok ? { ok: true as const, data: undefined } : r
      }
    })
    const offEvents = apiEvents.onExportCorpus((e) => {
      if (e.type === 'extract-request') {
        extractor.handleEvent(e)
      } else {
        useCorpusExportStore.getState().applyProgress(e)
      }
    })
    // 终局 toast：busy true→false 变化沿（会话终局无论成败恰好一条沿）
    const offStore = useCorpusExportStore.subscribe((s, prev) => {
      if (!prev.busy || s.busy) return
      if (s.error !== null) {
        showToast(s.error, 'error')
        return
      }
      if (s.fileCount !== null) {
        const fail = s.errorCount > 0 ? `（${s.errorCount} 篇失败）` : ''
        showToast(`语料导出完成：${s.fileCount} 篇${fail}`, s.errorCount > 0 ? 'info' : 'success')
      }
    })
    return () => {
      offEvents()
      offStore()
    }
  }, [])
}
