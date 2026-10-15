/**
 * [F-UIRES-04 批 3c] DrPaperInfo —— 文献库抽屉论文元数据区连接件
 * （SidePaperInfo 同型第 2 例——Rule of Three 保持重复不抽 hook；取数面=
 * 库域 detail props 直注入，**零 paperInfoStore 订阅**——E 裁决 library 域
 * 零新增取数面，M1 链归宿主既有 useAsync+P7E-05 stale 守卫）。
 * - M2 扇出：mount/detail.id/fileUrl 变更→selectPaperImages(detail.id, detail.fileUrl)
 *   （useLayoutEffect——paint 前归位沿 3b 帧修先例）；卸载/换页 cleanup→
 *   unmountPaperImages()。两连接件（脉络侧板/库抽屉）不同页互斥挂载=M2 单
 *   currentPId 语义安全（unmountPaperImages 全局单点，同刻仅一连接件在场）
 *   〔INV-139——与 SidePaperInfo.tsx 头注互指〕。
 * - M2 反应性=250ms getPaperImages 快照轮询（settle 完成态〔ready/partial〕
 *   停；error 续轮=I8 重试反应性通道——SidePaperInfo 同型；M2 订阅面升级挂
 *   F-M2SUB-01 回收）。
 * - 渲染 PaperInfoSection（key=detail.id 换篇重挂载——摘要展开态跨篇复位，
 *   3b r2 R-帧修② 同款）。
 */
import { useEffect, useLayoutEffect, useState } from 'react'
import type { PaperDetail } from '@shared/models/paper'
import {
  getPaperImages,
  selectPaperImages,
  unmountPaperImages,
  type PaperImageEntry
} from '../../shared/PaperImageExtractor'
import { PaperInfoSection } from '../../shared/PaperInfoSection'

export function DrPaperInfo(props: { detail: PaperDetail }): JSX.Element {
  const { detail } = props
  const [entry, setEntry] = useState<PaperImageEntry | undefined>(undefined)
  // M2 扇出+换篇/卸载 cleanup（layout effect=entry 与 detail commit 同帧归位——
  //   换篇陈旧 entry 零 paint）
  useLayoutEffect(() => {
    selectPaperImages(detail.id, detail.fileUrl)
    setEntry(getPaperImages(detail.id))
    return () => {
      unmountPaperImages()
    }
  }, [detail.id, detail.fileUrl])
  // M2 反应性轮询（settle 完成态停；error 续轮=重试转移覆盖）
  useEffect(() => {
    if (entry !== undefined && (entry.status === 'ready' || entry.status === 'partial')) return
    const pId = detail.id
    const timer = setInterval(() => {
      const snap = getPaperImages(pId)
      if (snap !== undefined) setEntry((prev) => (prev === snap ? prev : snap))
    }, 250)
    return () => {
      clearInterval(timer)
    }
  }, [detail.id, entry])
  return <PaperInfoSection data={detail} images={entry} key={detail.id} />
}
