/**
 * import 并发计数 gate（F-D4 A 面，INV-52；[F-IMPORTGATE-01] kind 化扩容）。
 *
 * 原形态=bootstrap 顶层闭包计数（F-D4 brief「接口层」原案）；C-3 N 级知晓项
 * 「并发双 import 计数中间态（2→1→0）无测试锚」转正拆模块——闭包不可单测，
 * 语义需锚定。import kind 计数语义与原闭包逐位一致（行为零变）：
 * - enter/exit 成对（import 会话起止各调一次；域错误上抛路径也在 try/finally 内）
 * - 计数 >0 = import in-flight——并发双 import 首个完成时 2→1，仍 in-flight
 *   （不误释 workspace 变更三入口互斥）；全部完成 1→0 才放行
 * - 非配对 exit（计数转负）=接线 bug 信号：静默释放互斥（门一 N-1 备案）——
 *   与原闭包语义逐位一致故不加下界守卫（行为零变承诺内），配对由调用方
 *   try/finally 结构保证，改守卫需独立票裁决
 * - in-flight 判定=main 侧计数单源，renderer busy 不参与（两进程面各自独立）
 *
 * [F-IMPORTGATE-01 INV-133 TOCTOU 边界清偿] kind 化扩容（import/delete 分计数）：
 * - delete 链（papers/folders delete）enter('delete') 持同一 gate——import
 *   in-flight 拒两 delete 入口、delete in-flight 拒 import.service 两入口
 *   （双侧 BUSY、无排队，见 INV-133）
 * - 分计理由：单计数下 delete 入口检查会误拒并发双 delete（违反票面
 *   「无 import 并发时 delete 行为与现状逐位一致」硬条款）、import 入口检查
 *   会误拒并发双 import（破坏本模块 2→1→0 锁定锚语义）；分计后两 kind 各自
 *   内部并发不变，仅跨 kind 互斥（delete 不建行=互删无 TOCTOU 危害面）
 * - inFlight()=两 kind 计数合计 >0（workspace 三入口判定源——delete 持有期
 *   连带拒 workspace 变更=票面 D-3 明示正向预期）
 * - enter/exit 缺省 kind='import'（import.service 既有调用零 diff）；非配对
 *   exit 按 kind 转负静默（同上无下界守卫口径）
 */
export type ImportGateKind = 'import' | 'delete'

export interface ImportGate {
  enter(kind?: ImportGateKind): void
  exit(kind?: ImportGateKind): void
  /** workspace 变更三入口（create/rename/switch）互斥判定源（任一 kind 持有即真） */
  inFlight(): boolean
  /** [F-IMPORTGATE-01] import kind in-flight（两 delete 入口拒绝判定源） */
  importInFlight(): boolean
  /** [F-IMPORTGATE-01] delete kind in-flight（import.service 入口拒绝判定源） */
  deleteInFlight(): boolean
}

export function createImportGate(): ImportGate {
  const counts: Record<ImportGateKind, number> = { import: 0, delete: 0 }
  return {
    enter: (kind: ImportGateKind = 'import') => {
      counts[kind] += 1
    },
    exit: (kind: ImportGateKind = 'import') => {
      counts[kind] -= 1
    },
    inFlight: () => counts.import > 0 || counts.delete > 0,
    importInFlight: () => counts.import > 0,
    deleteInFlight: () => counts.delete > 0
  }
}
