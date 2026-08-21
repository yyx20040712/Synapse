/**
 * [SR-LIB-06] ImportDropZone —— 导入入口（工单：open / weak）
 *
 * ── 行为层 ──
 * - 两个按钮：「导入 PDF 文件」→ api.import_.fromDialog({})；
 *   「导入文件夹」→ api.import_.fromFolder({})
 * - 拖拽：v1 仅高亮提示"请使用按钮"（webUtils.getPathForFile 需 preload 暴露，v2）
 * - 进行中：订阅 apiEvents.onImportProgress 显示进度（文件名 current/total）
 * - 完成后 toast 汇总（成功 n/重复 m/失败 k）并刷新 library.store
 * - 取消（空结果）静默
 *
 * ── 接口层 ──
 * - export function ImportDropZone(props: { onImported(): void }): JSX.Element
 *
 * ── 架构层 ── / ── 生命周期层 ── / ── 文化层 ──
 * - 路径全部由 main 侧对话框产生，renderer 无路径（安全 §6.3）
 */
export function ImportDropZone(_props: { onImported: () => void }): JSX.Element {
  return (
    <div data-ticket="SR-LIB-06" className="p-6 text-sm" style={{ color: 'var(--text-dim)' }}>
      工单未完成：SR-LIB-06（导入入口）
    </div>
  )
}
