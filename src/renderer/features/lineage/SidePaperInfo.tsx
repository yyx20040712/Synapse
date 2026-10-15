/**
 * [F-UIRES-04 批 3b] SidePaperInfo —— 侧板论文信息区连接件（§4.11 M1×M2
 * 解耦字面：宿主统一扇出点，M1 不代理 M2；宿主零 hooks——两机生命周期归本件）。
 * - M1（paperInfoStore）：mount/paperId 变更→select(paperId)；卸载→
 *   unmount()+unmountPaperImages()（两机统一 UNMOUNT 扇出）。
 * - M2：M1 ready 且 data.id===paperId（防切换帧陈旧 view 错配）才扇出
 *   selectPaperImages——触发=信息区可见（§4.8）；[C2-①] 禁挂阅读器文档
 *   就绪链（本批无阅读器面改动）。
 * - M2 反应性=轮询 hook（250ms getPaperImages 快照入本地 state；settle 完成
 *   态〔ready/partial〕即停；**error 态续轮=I8 重试反应性通道**——INV-B 禁
 *   回调 props 所迫：信息区组件内直调 retryPaperImages 拉起的 error→
 *   extracting 转移无被动感知面；M2 订阅面升级后续票回收）；卸载/paperId
 *   变更即停。[C2-②] entry undefined→strip 省略（非 error 面）。
 * - 渲染分派：loading→骨架行；error→「信息加载失败」+M1 重试钮（直调
 *   store.retry——按钮属连接件非信息区，INV-B 不涉；console 细节随 error
 *   §4.11 文案口径）；ready→PaperInfoSection——陈旧帧 S3 零残留=layout
 *   effect paint 前归位（entry/select 同步链）+key 换篇重挂载（摘要展开
 *   态跨篇不复位——expanded 随重挂载复位）。
 * - [INV-139] 与库域 DrPaperInfo（文献库抽屉连接件——DrPaperInfo.tsx 头注
 *   互指）不同页互斥挂载：同刻至多一连接件在场扇出 M2（unmountPaperImages
 *   全局单点+currentPId 单值语义安全）；同窗并存需求出现时先升级 F-M2SUB-01
 *   订阅面（禁先破互斥）。
 */
import { useEffect, useLayoutEffect, useState } from 'react'
import { getPaperImages, selectPaperImages, unmountPaperImages, type PaperImageEntry } from '../../shared/PaperImageExtractor'
import { usePaperInfoStore } from '../../shared/paperInfoStore'
import { PaperInfoSection } from '../../shared/PaperInfoSection'
import { RetryButton } from '../../shared/ui/RetryButton'

export function SidePaperInfo(props: { paperId: string }): JSX.Element | null {
  const { paperId } = props
  const view = usePaperInfoStore((s) => s.view)
  const [entry, setEntry] = useState<PaperImageEntry | undefined>(undefined)
  const m1Ready = view.status === 'ready' && view.data?.id === paperId
  const fileUrl = m1Ready && view.data !== undefined ? view.data.fileUrl : undefined
  // M1 生命周期扇出（select/unmount——模块级 store getState 直调，渲染面只读 view；
  //   layout effect=paint 前同步归位〔双源互证陈旧帧治·r2 R-帧修①〕；cleanup 语义不变）
  useLayoutEffect(() => {
    usePaperInfoStore.getState().select(paperId)
    return () => {
      usePaperInfoStore.getState().unmount()
      unmountPaperImages()
    }
  }, [paperId])
  // M1 error 细节随 console（UI 短文案——§4.11 文案口径）
  useEffect(() => {
    if (view.status === 'error') console.error('[SidePaperInfo] 论文信息加载失败：', view.error)
  }, [view])
  // M2 扇出（M1 ready 后——触发=信息区可见；data.id 校验防陈旧错配；
  //   layout effect=entry 与 M1 ready commit 同帧归位·r2 R-帧修①）
  useLayoutEffect(() => {
    if (fileUrl === undefined) return
    selectPaperImages(paperId, fileUrl)
    setEntry(getPaperImages(paperId))
  }, [paperId, fileUrl])
  // M2 反应性轮询（settle 完成态停；error 续轮=重试转移覆盖）
  useEffect(() => {
    if (fileUrl === undefined) return
    if (entry !== undefined && (entry.status === 'ready' || entry.status === 'partial')) return
    const pId = paperId
    const timer = setInterval(() => {
      const snap = getPaperImages(pId)
      if (snap !== undefined) setEntry((prev) => (prev === snap ? prev : snap))
    }, 250)
    return () => {
      clearInterval(timer)
    }
  }, [paperId, fileUrl, entry])
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
  return <PaperInfoSection data={view.data} images={entry} key={view.data.id} />
}
