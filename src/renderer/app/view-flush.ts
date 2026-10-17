/**
 * [F-VISFB-15 ①面3] 视图路由离场 flush —— 离场 'reader' 的挂载编辑器草稿立存。
 *
 * 挂载编辑器恒属 ACTIVE tab（AnnotationLayer 只随活动篇渲染）——视图路由离场
 * 'reader'（Rail 点击/跨页事件桥两入口，经 App.changeView 单点收口）时
 * fire-first 消费 allDraftFlushHandles() 全量句柄：un-attempted dirty
 * （<800ms 防抖窗内值——INV-141④「未尝试 dirty 不入表」锚面）随 ReaderPage
 * 卸载无恢复面的丢值由 flush 预防（非入表——锚不动）；不阻路由（零新增用户
 * 可见等待）；失败承接=句柄 failed→卸载注册承接重挂载重试（12 号机制）+写
 * 路径 markTabDirty 观测面（fireAllDraftFlushes 单源）。
 * 挂点位=视图**状态变更点**（非 ReaderPage 卸载 cleanup——switchTo 课题切换
 * =reload 弃改面〔INV-50 显式弃改，票面裁零触碰〕，卸载 cleanup 会把 flush
 * 误覆盖到该面）。
 */
import type { ViewId } from './Rail'
import { fireAllDraftFlushes } from '../features/reader/interact/annotation-draft-registry'

/** 视图切换包装：离场 'reader' 先立存再落 view 状态（App 组合根单点消费） */
export function switchViewWithFlush(from: ViewId, to: ViewId, setView: (v: ViewId) => void): void {
  if (from === 'reader' && to !== 'reader') {
    fireAllDraftFlushes()
  }
  setView(to)
}
