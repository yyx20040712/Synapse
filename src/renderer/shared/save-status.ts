/**
 * save-status —— 笔记保存状态推导（纯函数，显示诚实性契约的单一推导点）。
 *
 * 自 NotesPanel.tsx 原样迁移（C-03 下沉 renderer/shared——一切 feature 可
 * 消费；库侧 NotesPanel 改 re-export 保编译，C-06 随面板删除）。
 * 语义：deriveSaveStatus 四态优先级 保存中 > 保存失败 > 未保存 > 已保存；
 * detectSaveFailed 周期终点帧按 savedAt 是否推进裁决（INV-04：失败不推进
 * savedAt）；非终点帧返回 null（不动失败态——savedAt 前进来源含合并落地）。
 * 锁定测试：tests/unit/renderer/notes-panel-status.test.ts（经 NotesPanel
 * re-export 兼容零改动——动态 import 路径不变；断言语义原样锁定）。
 */

/** 保存状态指示四态（未保存来自 store 的 pending 镜像——合并落地窗口/防抖窗口内切回不得误显"已保存"） */
export type SaveStatus = '保存中…' | '保存失败' | '未保存' | '已保存'

/** 保存状态推导（单一推导点，纯函数锁定）：优先级 保存中 > 保存失败 > 未保存 > 已保存。
 *  saving=周期在飞；saveFailed=周期结束而 savedAt 未推进（INV-04 消费）；
 *  pending=草稿含未落库编辑（store pendingEdit 镜像） */
export function deriveSaveStatus(saving: boolean, saveFailed: boolean, pending: boolean): SaveStatus {
  if (saving) return '保存中…'
  if (saveFailed) return '保存失败'
  if (pending) return '未保存'
  return '已保存'
}

/** 周期结束失败判定（单一判定点，纯函数锁定）：saving true→false 的终点帧按
 *  savedAt 是否推进裁决（INV-04：失败不推进 savedAt）；非终点帧返回 null
 *  （不动失败态——savedAt 前进来源含合并落地，不能证明本面板周期成功） */
export function detectSaveFailed(
  prevSaving: boolean,
  saving: boolean,
  prevSavedAt: string | null,
  savedAt: string | null
): boolean | null {
  if (!prevSaving || saving) return null
  return prevSavedAt === savedAt
}
