// F-UIRES-03 C3·RR1-A
/**
 * gotoLibraryPlan —— 「去文献库」编排计划（LineagePage 消费单源——分支
 * 单测面导出纯函数；[RR1-A] __main__ 哨兵判=MAIN_GRAPH_ID 常量单源）。
 *
 * 分支语义（C3 自裁申报项 3 的机器锁）：
 * - folderId=MAIN_GRAPH_ID（文献未归夹）→ folderScope=undefined（清夹过滤
 *   =全库视图降级语义——setQuery Partial 合并键覆盖非保留旧值）；
 * - 真夹 → folderScope={kind:'folder',folderId} 精确过滤；
 * - paperId 透传（null=主题节点——Page 侧不置选中）。
 * 消费序（Page）：plan→setQuery（先置数）→selectPaper→requestOpenLibrary
 * （后广播——open-lineage-bus 同序先例）。
 */
import { MAIN_GRAPH_ID } from '@shared/models/lineage'

export interface GotoLibraryPlan {
  folderScope: { kind: 'folder'; folderId: string } | undefined
  paperId: string | null
}

export function gotoLibraryPlan(paperId: string | null, folderId: string): GotoLibraryPlan {
  return {
    folderScope: folderId === MAIN_GRAPH_ID ? undefined : { kind: 'folder', folderId },
    paperId
  }
}
