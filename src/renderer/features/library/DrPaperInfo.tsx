/**
 * [F-VISFB-43 U7] DrPaperInfo —— 文献库抽屉论文元数据区连接件（换源版：
 * 图表清单=figures.list IPC 单发拉取——零轮询零提取调用；取数面=库域 detail
 * props 直注入，零 paperInfoStore 订阅〔E 裁决 library 域零新增取数面〕沿承）。
 * - 挂载/detail.id 变更→figures.list 单发拉取（导入驱动提取的消费面不触发
 *   ——断网/无提取不现场渲染）；失败/缺席=strip 省略静默（派生面子件）；
 *   cancelled 守卫防换篇迟到帧。
 * - 〔回炉轮1 W-4〕换篇陈旧帧治=snapshot+render 期派生重置（旧件 useLayoutEffect
 *   「paint 前归位」纪律的换源形态）：state 携 {id,figures}，figures 仅当
 *   snap.id===detail.id 才下传——id 变更 commit 帧即零 strip（新 paperId 拼
 *   旧 figureId 的破图帧结构性不可达），不待被动 effect 复位。
 * - 渲染 PaperInfoSection（key=detail.id 换篇重挂载——摘要展开态跨篇复位，
 *   3b r2 R-帧修② 同款）。
 * - [INV-139 改写素材] 旧「M2 单消费在场互斥」前提随提取面退役消解（无状态
 *   清单读者无会话驻留——SidePaperInfo.tsx 头注互指）。
 */
import { useEffect, useState } from 'react'
import { api } from '../../api/client'
import type { FigureItem } from '@shared/ipc/schemas'
import type { PaperDetail } from '@shared/models/paper'
import { PaperInfoSection } from '../../shared/PaperInfoSection'

interface FiguresSnap {
  id: string
  figures: readonly FigureItem[]
}

export function DrPaperInfo(props: { detail: PaperDetail }): JSX.Element {
  const { detail } = props
  const [snap, setSnap] = useState<FiguresSnap | null>(null)
  // 图表清单单发拉取（换篇 id 变更即重拉；失败=不落 snap——strip 省略）
  useEffect(() => {
    let cancelled = false
    void api.figures.list({ paperId: detail.id }).then(
      (r) => {
        if (!cancelled && r.ok) setSnap({ id: detail.id, figures: r.data.figures })
      },
      () => undefined
    )
    return () => {
      cancelled = true
    }
  }, [detail.id])
  const figures = snap !== null && snap.id === detail.id ? snap.figures : undefined
  return <PaperInfoSection data={detail} figures={figures} key={detail.id} />
}
