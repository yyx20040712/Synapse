// b3: P7-A
/**
 * [SR2-ANNO-01] AnnotationMenu —— 标注点击四选项菜单（工单：done / strong）
 *
 * ── 行为层 ──
 * - 纯展示组件：四选项「复制引文 / 删除 / 添加笔记 / 取消」，数据与副作用全在
 *   AnnotationLayer（对齐 AnnotationEditor 先例：props 回调上交，busy 期间按钮禁点）
 * - 定位：命中矩形左下沿贴靠+页根边界夹取（对齐 AnnotationEditor 定位先例：
 *   left=min(x*100,55)%，top=calc((y+h)*100% + 6px)）
 * - 状态机（宿主 AnnotationLayer 持有）：
 *   | 态 | 事件 | 迁移 |
 *   | --- | --- | --- |
 *   | closed | 点击标注矩形 | open(annotation)（同时收起既有弹层——不残留双弹层） |
 *   | open | 复制/取消 | closed（复制失败 toast 仍 closed——动作型 INV-02） |
 *   | open | 添加笔记 | editor(annotation)（AnnotationEditor 经菜单触发） |
 *   | open | 删除（busy） | closed（confirm 确认后 repo 删除；P7-B undo 落地前为即删——
 *     repo 层删除语义由 tests/unit/db/repos/annotations.repo.test.ts:67 锁定；菜单级删除
 *     的 UI 结论由组件用例+手动验证覆盖，规约显式声明此双层覆盖） |
 *   | editor | 保存/删除/取消 | closed |
 *   跨格序列守卫：open→editor→保存期间再点他条标注=切目标（不残留双弹层）
 *
 * ── 接口层 ──
 * - export function AnnotationMenu(props: { annotation: Annotation;
 *     rect: AnnotationRect; busy: boolean; onCopy(): void; onDelete(): void;
 *     onAddNote(): void; onCancel(): void }): JSX.Element
 *
 * ── 架构层 ──
 * - 接缝：AnnotationLayer.tsx（Phase 4 标注渲染层）为本工单改动面——点击标注
 *   由「直开 AnnotationEditor」改为先开本菜单；AnnotationEditor 本身不改
 * - 不 import store；不持网络/IPC
 *
 * ── 生命周期层 ──
 * - 预留：菜单项扩展（改色/复制页码）随 P7-E 评估；不做：右键上下文菜单（本次仅
 *   左键点击流）
 *
 * ── 文化层 ──
 * - 错误反馈两型（INV-02）：复制/删除失败=动作型 toast（宿主执行）；无列表型面
 * - 禁止 any；组件 ≤250 行
 */
import type { Annotation, AnnotationRect } from '@shared/models/annotation'

const btn = 'rounded border px-2 py-0.5 text-xs disabled:opacity-50'

export function AnnotationMenu(props: {
  annotation: Annotation
  rect: AnnotationRect
  busy: boolean
  onCopy(): void
  onDelete(): void
  onAddNote(): void
  onCancel(): void
}): JSX.Element {
  // annotation 不在组件内消费：为规约接口面（宿主闭包与回调消费），预留引文预览扩展
  const { rect, busy, onCopy, onDelete, onAddNote, onCancel } = props
  return (
    <div
      data-testid="annotation-menu"
      className="absolute z-20 flex gap-1 rounded border p-1 text-xs"
      style={{
        // 左沿贴命中矩形并夹取，避免右侧溢出页根（对齐 AnnotationEditor 先例）
        left: `${Math.min(rect.x * 100, 55)}%`,
        top: `calc(${(rect.y + rect.h) * 100}% + 6px)`,
        background: 'var(--panel)',
        borderColor: 'var(--border)',
        color: 'var(--text)'
      }}
    >
      <button type="button" className={btn} disabled={busy} onClick={onCopy}>
        复制引文
      </button>
      <button type="button" className={btn} disabled={busy} onClick={onDelete}>
        删除
      </button>
      <button type="button" className={btn} disabled={busy} onClick={onAddNote}>
        添加笔记
      </button>
      <button type="button" className={btn} disabled={busy} onClick={onCancel}>
        取消
      </button>
    </div>
  )
}
