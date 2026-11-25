// b3: P7-H
/**
 * [LG-02] LineagePage —— 「脉络」顶层视图宿主（E4）。
 *
 * 行为：挂载经 lineage.store.load() 取数（lineage/graph 单点——接缝
 * 双向锚定：本行+lineage.store 头注；03 编辑层/04 侧板同经 store 消费
 * **禁双取**）。
 * [B5 设计稿 §3/§10.2——wave A 纯拆件 2026-11-25，行为零变] 本件=挂载编排+
 * 快捷键+组合根（侧板跳转三回调的编排体）；三态呈现（门一 N6：
 * loading/error/ready——空图空态在画布内）、选中详情、folders 图名与 pane
 * 组合迁驻 LineagePageBody（注释随代码迁驻该件头注；该件由本件无条件渲染
 * =恒挂载，取数仍只经本件挂载效应——禁双取不变）。
 *
 * ── F-LGRAPH-01①U4 编排重构（顶栏并集切换器退役行 1）──
 * - 缺省图=库页文件夹上下文同步（mockup §3.2：进哪个文件夹开哪张图；
 *   未选=主图——挂载时读 library.store query.folderScope，接缝双向锚定
 *   两 store 头注：lineage.store+library.store）。
 * - 跳转接缝三方头注锚定（回炉 R10 回锚）：本页+LineageSidePanel+open-paper-
 *   bus（阅读器消费侧=open-paper-anchor.ts）——SidePanel/bus 两头注仍指本页，
 *   本页头注随 U4 重写曾失锚，本行恢复三方互指闭环。
 */
import { useEffect } from 'react'
import { MAIN_GRAPH_ID } from '@shared/models/lineage'
import { requestOpenPaper, requestOpenPaperAnchored } from '../../shared/open-paper-bus'
import { requestOpenLibrary } from '../../shared/open-library-bus'
import { useLibraryStore } from '../library/library.store'
import { useLineageStore } from './lineage.store'
import { useLineageViewStore } from './lineage-view.store'
import { gotoLibraryPlan } from './goto-library-plan'
import { LineagePageBody } from './LineagePageBody'
import { useLineageEscapeKey } from './use-lineage-esc'
import { useLineageHistoryShortcuts } from './use-lineage-history-shortcuts'

export function LineagePage(): JSX.Element {
  useEffect(() => {
    // [F-LGRAPH-01②A1 兑现] 挂载恒走模式态 reset（P-1「进页缺省」直读——二次
    // 进页=再进页缺省：mode='browse'+focusSet 清空+工具态归位；与下行数据
    // 暂存保留[P-2]正交——view 态 reset≠数据 discard，两者不互斥）
    useLineageViewStore.getState().resetForMount()
    // 缺省图=库页文件夹上下文同步（进哪个文件夹开哪张图；未选=主图）——
    // [B4 L2] setFolder=flush-first 挂起切换（每图 U/历史/focusSet 驻留，§2.5
    // #32）；图名兜底=主图（folders 未落定期）。
    const scope = useLibraryStore.getState().query.folderScope
    const target = scope?.kind === 'folder' ? scope.folderId : MAIN_GRAPH_ID
    const current = useLineageStore.getState()
    // [B2 D5→B4 L2 §8.3] 同图=既有会话不双取：ready+needsReload=0 时零 graph IPC——渲染走
    // 会话驻留数据（P-2），不论图是否为空（[回炉 W-B2·R-W2] 「ready 空图挂载重取」例外退役：
    // 只有悬浮笔记的图也是 ready 会话；后台失效由 #41 置 needsReload 承接）。其余（loading/
    // error/needsReload）=经 setFolder（registry 裁决：复用在途读/单飞和解/重载）。
    // [回炉 W-B2c] 恢复待令会话（restoredAwaitingCommand——恢复载入后本会话写链尚无任务起步）虽
    // needsReload=1 同样零 graph IPC：恢复图的和解时点=首次命令入链（§2.5 #10a/#39），页面挂载/返回
    // 不做自动和解。R-W2 删除「非 clean 早退」后，挂载效应对它调 setFolder→单飞和解，库态覆盖恢复图
    // （e2e recovery.spec E7 非确定失败的根因）。显式同图重选（setFolder 同值）不经本效应，仍和解。
    if (current.folderId === target && current.status === 'ready' && (!current.needsReload || current.restoredAwaitingCommand)) return
    // 目标≠当前：[F-LGRAPH-01②U1] 原按「会话 dirty 跳过同步=暂存图保留」处理——[回炉 W-B2·R-W2]
    // 按 flush-first 语义迁移（§2.5 #32、§8.1、§8.3「离场 flush-first」）：离场会话的未落定写由
    // setFolder 取消 timer→快照请求→flush-first 承接，跨页返回的暂存图不丢，不以 IO 状态阻切。
    useLineageStore.getState().setFolder(target)
  }, [])

  // [B4 L1 §10.3] Ctrl+Z/Y/Shift+Z（撤销/重做）+Ctrl+S（显式保存）三模式统一生效（拆件内含 editable 分层）
  useLineageHistoryShortcuts()

  // [F-UIRES-03 C1] Esc 分层退出键盘接线（delta-W3a——拆件 use-lineage-esc）
  useLineageEscapeKey()

  /** 侧板跳转上抛→总线发送（payload 构造在 SidePanel，本页只转发归一；B2 AI 载荷
   *  字段退役——片段双击=唯一链；[F-LOCATE-01] anchor.annotationId 随 spread 透传） */
  const handleJumpToPaper = (payload: {
    paperId: string
    anchor?: { quoteText: string; prefixText: string; suffixText: string; anchorPage: number | null; annotationId?: string }
  }): void => {
    requestOpenPaperAnchored({
      paperId: payload.paperId,
      anchor:
        payload.anchor === undefined
          ? undefined
          : { ...payload.anchor, anchorPage: payload.anchor.anchorPage ?? undefined }
    })
  }

  /** [F-UIRES-03 C3·v1.7→B5①] 「去文献库」钮编排（先置数后广播——FolderNav→
   *  lineage 同序先例；B5① 两钮自卡面迁 SidePanel 头部操作行——回调体零改动）：
   *  分支计划=gotoLibraryPlan 单源（[RR1-A] 抽件——分支单测面；__main__ 哨兵=
   *  MAIN_GRAPH_ID 常量单源）——所在文件夹过滤+选中该文（__main__ 未归夹→
   *  folderScope 置 undefined 全库降级；paperId=null 主题节点不置选中）→
   *  requestOpenLibrary 切视图。跨域写接缝锚=library.store 头注 */
  const handleCardGotoLibrary = (paperId: string | null, folderId: string): void => {
    const plan = gotoLibraryPlan(paperId, folderId)
    const lib = useLibraryStore.getState()
    lib.setQuery({ folderScope: plan.folderScope })
    if (plan.paperId !== null) useLibraryStore.getState().selectPaper(plan.paperId)
    requestOpenLibrary()
  }

  /** [F-UIRES-03 C3·v1.7→B5①] 「去阅读器」钮编排（requestOpenPaper 单字段
   *  开篇语义——B2 已分流锚定态 requestOpenPaperAnchored，钮不带锚；B5① 自
   *  卡面迁 SidePanel 头部操作行——回调体零改动） */
  const handleCardGotoReader = (paperId: string): void => {
    requestOpenPaper(paperId)
  }

  // [B5 wave A 纯拆件] 三态主体/选中详情/folders 图名/pane 组合=LineagePageBody
  // （恒挂载——本地态生命周期同页面）；侧板回调经 props 透传，编排体留本页
  // （跳转接缝三方头注锚定不随迁）。星标=非撤销维度直写（乐观翻转+失败回滚——lineage.store）
  return (
    <LineagePageBody
      onJumpToPaper={handleJumpToPaper}
      onGotoLibrary={handleCardGotoLibrary}
      onGotoReader={handleCardGotoReader}
      onToggleStar={(node) => void useLineageStore.getState().toggleNodeStar(node)}
    />
  )
}
