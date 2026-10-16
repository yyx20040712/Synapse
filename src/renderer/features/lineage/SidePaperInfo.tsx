/**
 * [F-VISFB-43 U7] SidePaperInfo —— 侧板论文信息区连接件（换源版：图表清单=
 * figures.list IPC 单发拉取——**零轮询零提取调用**；[F-UIRES-04 批 3b] M1
 * paperInfoStore 面沿承：宿主统一扇出点，M1 不代理图表面；宿主零 hooks——
 * 两机生命周期归本件）。
 * - M1（paperInfoStore）：mount/paperId 变更→select(paperId)；卸载→unmount()
 *   （旧 M2 unmountPaperImages 扇出随 PaperImageExtractor 退役删除）。
 * - 图表面：mount/paperId 变更→figures.list 单发拉取（挂载即取——提取管线
 *   为导入驱动后台任务，消费面不触发〔断网/无提取不现场渲染〕）；失败/缺席
 *   静默省略 strip（派生面子件不挡主件——M1 error 面独立呈现）；cancelled
 *   守卫防换篇陈旧帧。
 * - 渲染分派：loading→骨架行；error→「信息加载失败」+M1 重试钮（按钮属连接
 *   件非信息区，INV-136 不涉）；ready→PaperInfoSection——key 换篇重挂载
 *   （摘要展开态跨篇复位）。
 * - [INV-139 改写素材] 旧「M2 单消费在场互斥」前提随提取面退役消解：两连接
 *   件（本件/库域 DrPaperInfo）均为无状态清单读者（单发 IPC 无会话驻留），
 *   同窗并存无互斥义务——主控回写 INV-139 行。
 */
import { useEffect, useLayoutEffect, useState } from 'react'
import { api } from '../../api/client'
import type { FigureItem } from '@shared/ipc/schemas'
import { usePaperInfoStore } from '../../shared/paperInfoStore'
import { PaperInfoSection } from '../../shared/PaperInfoSection'
import { RetryButton } from '../../shared/ui/RetryButton'

export function SidePaperInfo(props: { paperId: string }): JSX.Element | null {
  const { paperId } = props
  const view = usePaperInfoStore((s) => s.view)
  const [snap, setSnap] = useState<{ id: string; figures: readonly FigureItem[] } | null>(null)
  const figures = snap !== null && snap.id === paperId ? snap.figures : undefined
  const m1Ready = view.status === 'ready' && view.data?.id === paperId
  // M1 生命周期扇出（select/unmount——模块级 store getState 直调，渲染面只读 view；
  //   layout effect=paint 前同步归位〔双源互证陈旧帧治·r2 R-帧修①〕；cleanup 语义不变）
  useLayoutEffect(() => {
    usePaperInfoStore.getState().select(paperId)
    return () => {
      usePaperInfoStore.getState().unmount()
    }
  }, [paperId])
  // M1 error 细节随 console（UI 短文案——§4.11 文案口径）
  useEffect(() => {
    if (view.status === 'error') console.error('[SidePaperInfo] 论文信息加载失败：', view.error)
  }, [view])
  // [F-VISFB-43] 图表清单单发拉取（零轮询零提取调用；失败=不落 snap——strip 省略静默）。
  // 〔回炉轮1 W-4〕换篇陈旧帧治=snapshot+render 期派生重置（DrPaperInfo 同型）：
  // figures 仅当 snap.id===paperId 才下传——paperId 变更 commit 帧即零 strip
  useEffect(() => {
    let cancelled = false
    void api.figures.list({ paperId }).then(
      (r) => {
        if (!cancelled && r.ok) setSnap({ id: paperId, figures: r.data.figures })
      },
      () => undefined
    )
    return () => {
      cancelled = true
    }
  }, [paperId])
  if (view.status === 'loading') {
    return (
      <p className="m-0" data-testid="paper-info-loading" style={{ color: 'var(--text-dim)' }}>
        论文信息加载中…
      </p>
    )
  }
  if (view.status === 'error') {
    return (
      <div
        role="alert"
        data-testid="paper-info-error"
        className="flex items-center gap-2 rounded border px-2 py-1"
        style={{ borderColor: 'var(--danger)', color: 'var(--danger)' }}
      >
        <span>信息加载失败</span>
        <RetryButton
          dataAction="retry"
          onClick={() => {
            usePaperInfoStore.getState().retry(paperId)
          }}
        />
      </div>
    )
  }
  if (!m1Ready || view.data === undefined) return null
  return <PaperInfoSection data={view.data} figures={figures} key={view.data.id} />
}
