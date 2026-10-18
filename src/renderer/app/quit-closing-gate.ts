/**
 * [F-VISFB-64] quit-closing-gate —— 退出握手 closing 冻结门（α 修法：模块级
 * 同步单例布尔，禁 React state——设计稿 §④）。quit 帧到达即置位：④查态后至
 * destroy/abort 间用户写一律拒绝（clean 回执因果新鲜性）；flush 内部收口动作
 * 经 runQuitInternal origin 豁免防自锁。挂点=四写源族（notes.store/tab-dirty/
 * lineage.store/lineage-note-draft/annotation 族——回炉 W1/W2 扩）；治理条款
 * =INV-22（新增 quit dirty 写面须先登记 flush 收口并挂本门）。
 */
let closing = false
let internalDepth = 0

/** 置位/复位（bridge：收帧置位；abort/按脏收口/5000ms 有界复位解除） */
export function setQuitClosing(value: boolean): void {
  closing = value
}

/** 用户写闸：closing 且非豁免域=true（写源入口在 enqueue/store 变更/句柄修改之前同步检查） */
export function quitWriteBlocked(): boolean {
  return closing && internalDepth === 0
}

/** flush 内部收口豁免域=**同步域**（[回炉 B1] 收窄）：fn 现值执行期间放行——
 *  不跨 await/settle（async 链首个 await 后即域外：flush 在途窗用户写被拒）；
 *  跨 await 收口链须在命中闸点的同步调用处就地包裹（fireLineageNoteCommit
 *  同步链形），或经收口核心路径（notes dispatchSaveNow 形）绕开用户入口闸。 */
export function runQuitInternal<T>(fn: () => T): T {
  internalDepth += 1
  try {
    return fn()
  } finally {
    internalDepth -= 1
  }
}
