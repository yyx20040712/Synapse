/**
 * [F-FOLDER-02·S2] import-busy.store —— 导入会话 busy 全局信号。
 *
 * ── 行为层 ──
 * - 单布尔态：ImportDropZone 的 runImport 入口置 true / finally 置 false
 *  （唯一写入方）；消费方=FolderNav 左栏导航（[F-UIRES-01]）与脉络页图切换器
 *  （[F-LGRAPH-01①U4] NavGraphPicker）——busy 期禁切文件夹/图（S2：导入进行中切换会被拒）
 *
 * ── 架构层 ──
 * - 驻 renderer/shared（非某 feature）：写入方在 library 域、消费方跨 library/
 *   lineage 两页——下放 shared 依赖下沉合法面（check-quality 跨域互引红线的
 *  合规避让：两 feature 均只 import shared，互不引用）
 * - 不承载导入结果/进度（那是 ImportDropZone 局部态+apiEvents.onImportProgress
 *  既有通道）——本件只有「是否禁切」这一位信号
 */
import { create } from 'zustand'

export interface ImportBusyStore {
  busy: boolean
  setBusy(busy: boolean): void
}

export const useImportBusyStore = create<ImportBusyStore>()((set) => ({
  busy: false,
  setBusy: (busy) => set({ busy })
}))
