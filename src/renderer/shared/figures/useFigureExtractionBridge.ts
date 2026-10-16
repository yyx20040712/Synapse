/**
 * [F-VISFB-43] useFigureExtractionBridge —— App 根图表提取桥（pending jobs 的
 * 提取触发单点：挂载沿〔启动残单重驱——崩溃恢复/快照恢复重提幂等〕+
 * importProgress done 事件沿〔导入批完成即建单后的驱动沿〕）。
 *
 * ── 行为层（主控六条件①串行化前提的 renderer 半边）──
 * - 逐篇 await 串行（for-await 循环——队列深度 1/篇，跨篇按 pending 返回序
 *   =导入建单 rowid 序）；running 门+queued 补跑=事件沿在提取中到达不丢
 *   （提取毕即补查一轮）。
 * - 单篇流程：begin（null=非 pending/无单→跳过）→loadFigureDocument（自建
 *   pdfjs 句柄——不共享 reader 句柄，CorpusExtractor 同型）毕 destroy→
 *   extractDocFigures（逐资产分笔 sendAsset=figures.store IPC）→complete
 *   （excess/failed 落账）。
 * - 失败面：文档加载/提取/complete 任一环失败→尝试 complete({failed:1}) 补账
 *   （成功=job failed 落账；token 已死=代际守卫拒——弃单留 pending 待下次
 *   挂载沿重驱，幂等）；store 硬拒（Result err=会话死）经 sendAsset throw
 *   中止提取走同补账径。
 * - 禁 page.render/零轮询（静态负锚——figure-negative-anchors.test.ts）。
 *
 * ── 架构层 ── App 组合根单点挂载（与视图路由零耦合——Reader/Library 均不涉）；
 * 提取编排件经注入面消费（本件不 import pdfjs-dist——白名单外零 pdfjs 接触）。
 * ── 文化层 ── 测试：tests/unit/renderer/figure-bridge.test.tsx（FigureExtractor
 * 模块级 mock——jsdom 零 pdfjs/零真 IPC）。
 */
import { useEffect } from 'react'
import { api, apiEvents } from '../../api/client'
import {
  extractDocFigures,
  loadFigureDocument,
  loadFigureOpCodes,
  makeProductionDeps
} from './FigureExtractor'

/** 单篇提取（begin 已毕——token 在手）；任何失败→complete 补账后弃单 */
async function extractOne(paperId: string, token: string): Promise<void> {
  let doc: Awaited<ReturnType<typeof loadFigureDocument>> | null = null
  try {
    doc = await loadFigureDocument(paperId)
    const ops = await loadFigureOpCodes()
    const deps = makeProductionDeps({
      ops,
      sendAsset: async (asset) => {
        const r = await api.figures.store({ token, ...asset })
        if (!r.ok) throw new Error(r.error.message)
        return r.data.stored
      },
      log: (message) => {
        console.warn(`[figures] ${paperId} ${message}`)
      }
    })
    const summary = await extractDocFigures(doc, deps)
    console.info(
      `[figures] 提取完成：${paperId} stored=${String(summary.stored)} excess=${String(summary.excess)} failed=${String(summary.failed)}`
    )
    const done = await api.figures.complete({ token, excess: summary.excess, failed: summary.failed })
    if (!done.ok) throw new Error(done.error.message)
  } catch (e) {
    console.warn('[figures] 提取失败（补账 failed）：', paperId, e)
    try {
      await api.figures.complete({ token, excess: 0, failed: 1 })
    } catch {
      // token 已死（代际守卫拒）——弃单留 pending，下次挂载沿重驱
    }
  } finally {
    await doc?.destroy().catch(() => undefined)
  }
}

export function useFigureExtractionBridge(): void {
  useEffect(() => {
    let running = false
    let queued = false
    // 〔回炉轮2 条件⒈⒜〕卸载代际守卫：cleanup 置位后 finally 补跑前+循环
    // 逐篇间均检查——卸载后零驱动（跨格「running 中 done 置 queued→unmount→
    // 首轮 finally 仍补跑」路径封死；off() 只断事件源不断在飞轮）
    let disposed = false
    const runOnce = async (): Promise<void> => {
      if (running) {
        queued = true
        return
      }
      running = true
      try {
        const pending = await api.figures.pending({})
        if (!pending.ok) return
        for (const job of pending.data.jobs) {
          if (disposed) return
          const begin = await api.figures.begin({ paperId: job.paperId })
          if (!begin.ok || begin.data === null) continue
          await extractOne(job.paperId, begin.data.token)
        }
      } catch (e) {
        // 驱动轮硬错误（api 面异常等）——弃轮静默（下次事件沿/挂载沿重试），
        // 禁 unhandled rejection（App 级挂载链零扰）
        console.warn('[figures] 提取驱动轮失败：', e)
      } finally {
        running = false
        if (queued && !disposed) {
          queued = false
          void runOnce()
        }
      }
    }
    const off = apiEvents.onImportProgress((e) => {
      if (e.phase === 'done' && !disposed) void runOnce()
    })
    void runOnce()
    return () => {
      disposed = true
      off()
    }
  }, [])
}
