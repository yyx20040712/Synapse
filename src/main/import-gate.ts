/**
 * import 并发计数 gate（F-D4 A 面，INV-52）。
 *
 * 原形态=bootstrap 顶层闭包计数（F-D4 brief「接口层」原案）；C-3 N 级知晓项
 * 「并发双 import 计数中间态（2→1→0）无测试锚」转正拆模块——闭包不可单测，
 * 语义需锚定。计数语义与原闭包逐位一致（行为零变）：
 * - enter/exit 成对（import 会话起止各调一次；域错误上抛路径也在 try/finally 内）
 * - 计数 >0 = import in-flight——并发双 import 首个完成时 2→1，仍 in-flight
 *   （不误释 workspace 变更三入口互斥）；全部完成 1→0 才放行
 * - 非配对 exit（计数转负）=接线 bug 信号：静默释放互斥（门一 N-1 备案）——
 *   与原闭包语义逐位一致故不加下界守卫（行为零变承诺内），配对由调用方
 *   try/finally 结构保证，改守卫需独立票裁决
 * - in-flight 判定=main 侧计数单源，renderer busy 不参与（两进程面各自独立）
 */
export interface ImportGate {
  enter(): void
  exit(): void
  /** workspace 变更三入口（create/rename/switch）互斥判定源 */
  inFlight(): boolean
}

export function createImportGate(): ImportGate {
  let count = 0
  return {
    enter: () => {
      count += 1
    },
    exit: () => {
      count -= 1
    },
    inFlight: () => count > 0
  }
}
