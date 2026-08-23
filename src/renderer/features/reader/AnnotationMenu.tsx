// b3: P7-A
/**
 * [SR2-ANNO-01] AnnotationMenu —— 标注点击四选项菜单（工单：open / strong）
 *
 * ── 行为层 ──
 * - 纯展示组件：四选项「复制引文 / 删除 / 添加笔记 / 取消」，数据与副作用全在
 *   AnnotationLayer（对齐 AnnotationEditor 先例：props 回调上交，busy 期间按钮禁点）
 * - 定位：命中矩形左下沿贴靠+页根边界夹取（对齐 AnnotationEditor.tsx:36-39 先例）
 * - 复制引文：navigator.clipboard.writeText(annotation.quoteText)（本地 API）；
 *   失败 toast（动作型，INV-02）
 * - 状态机（菜单本地态，宿主 AnnotationLayer 持有）：
 *   | 态 | 事件 | 迁移 |
 *   | --- | --- | --- |
 *   | closed | 点击标注矩形 | open(annotation) |
 *   | open | 复制/取消 | closed（复制异步完成后 closed；失败 toast 仍 closed） |
 *   | open | 添加笔记/编辑 | editor(annotation)（AnnotationEditor 经菜单触发） |
 *   | open | 删除（busy） | closed（删除完成；P7-B undo 落地前为即删——repo 层
 *     删除语义由 tests/unit/db/repos/annotations.repo.test.ts:67 锁定；菜单级删除
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
 * - 接缝声明：AnnotationLayer.tsx（Phase 4 标注渲染层）为本工单改动面——点击标注
 *   由「直开 AnnotationEditor（现 AnnotationLayer.tsx:186）」改为先开本菜单；
 *   AnnotationEditor 本身不改
 * - 不 import store；不持网络/IPC
 *
 * ── 生命周期层 ──
 * - 预留：菜单项扩展（改色/复制页码）随 P7-E 评估；不做：右键上下文菜单（本次仅
 *   左键点击流）
 *
 * ── 文化层 ──
 * - 错误反馈两型（INV-02）：复制/删除失败=动作型 toast；无列表型面
 * - 禁止 any；组件 ≤250 行
 * - 完成后：删除占位实现 → npm run verify 绿 → 人工审查 git diff → 翻 registry 状态
 */
export function AnnotationMenu(): JSX.Element {
  return <div data-ticket="SR2-ANNO-01" />
}
