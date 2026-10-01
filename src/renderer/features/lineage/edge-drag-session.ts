/**
 * [F-LGRAPH-01②U5] edge-drag-session —— 调线拖拽会话基建（use-edge-edit 拆件
 * ——文件 ≤500 行红线，回炉轮 2 机械拆分零行为变）。
 *
 * document 级 move/up 会话（指针离画布仍跟随）：pointerup=落定提交路；
 * pointercancel/blur=中断 abort 路（[RR2] pointercancel 接 abort——§2.5 定案
 * 中断=不成立不入撤销栈；useDrawLine 先例同型，card-drag 落槽先例=卡域专用
 * 不沿）。返回 cleanup（会话外强制拆除用）。
 */
export function runDocDragSession(handlers: {
  onMove(ev: PointerEvent | MouseEvent): void
  onUp(): void
  onAbort(): void
}): () => void {
  const move = (ev: PointerEvent | MouseEvent): void => handlers.onMove(ev)
  const up = (): void => {
    cleanup()
    handlers.onUp()
  }
  const abort = (): void => {
    cleanup()
    handlers.onAbort()
  }
  const cleanup = (): void => {
    document.removeEventListener('pointermove', move)
    document.removeEventListener('pointerup', up)
    document.removeEventListener('pointercancel', abort)
    window.removeEventListener('blur', abort)
  }
  document.addEventListener('pointermove', move)
  document.addEventListener('pointerup', up)
  document.addEventListener('pointercancel', abort)
  window.addEventListener('blur', abort)
  return cleanup
}
