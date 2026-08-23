// b3: P7-A
/**
 * [SR2-UIK-01] SplitPane —— 可拖拽分隔条容器（工单：open / strong）
 *
 * ── 行为层 ──
 * - 两栏布局容器：主侧栏宽度受控拖拽（px，min/max 约束夹取），拖拽手柄为显式
 *   分隔条元素（aria role="separator" + keyboard 可调：ArrowLeft/Right ±8px——
 *   可访问性与鼠标等价）
 * - 持久化：宽度写 localStorage 键 'synapse:splitpane:<paneId>'（前缀对齐
 *   src/renderer/shared/open-paper-bus.ts:12 的 'synapse:open-paper' 命名先例）；
 *   载入时越界值（min/max 外）回退默认宽
 * - 拖拽会话：pointerdown 开始→pointermove 连续更新（受控 state）→pointerup/
 *   pointercancel 结束；会话期间 document.body user-select:none + cursor:col-resize，
 *   结束还原（清理成对——INV-14 同族：监听与样式副作用同源清理）
 * - 状态机（拖拽会话）：
 *   | 态 | 事件 | 迁移 |
 *   | --- | --- | --- |
 *   | idle | pointerdown(手柄) | dragging（body 副作用应用） |
 *   | dragging | pointermove | dragging（宽度=夹取(clamp(startW+Δ))） |
 *   | dragging | pointerup/cancel | idle（副作用还原+宽度持久化） |
 *   跨格序列守卫：dragging 中卸载组件→副作用必须还原（不得泄漏 body 样式/监听）
 *
 * ── 接口层 ──
 * - export function SplitPane(props: { paneId: string; side: 'left' | 'right';
 *     defaultWidth: number; min: number; max: number; collapsible?: boolean;
 *     children: { pane: ReactNode; main: ReactNode } }): JSX.Element
 *
 * ── 架构层 ──
 * - shared/ui 通用件：不 import store/features；localStorage 直用（renderer 本地
 *   UI 偏好，非跨进程数据——不经 settings DB，规约记录依据）
 * - 接缝声明：ReaderPage.tsx（Phase 3 阅读器组合根）左右侧栏换用本组件属本工单
 *   改动面（现有折叠态语义保留）
 *
 * ── 生命周期层 ──
 * - 预留：三栏嵌套（P7-C 笔记栏并列时复用）；不做：垂直分隔（本次仅水平）
 *
 * ── 文化层 ──
 * - 无异步失败面（localStorage 配额异常按回退默认宽处理——静默回退为设计行为，
 *   规约记录依据，非吞错）
 * - 禁止 any；组件 ≤250 行
 * - 完成后：删除占位实现 → npm run verify 绿 → 人工审查 git diff → 翻 registry 状态
 */
export function SplitPane(): JSX.Element {
  return <div data-ticket="SR2-UIK-01" />
}
