// b3: P7-A
/**
 * [SR2-KEY-02] ReaderShortcuts —— 阅读器快捷键与滚轮缩放（工单：open / strong）
 *
 * ── 行为层 ──
 * - useReaderShortcuts(actions)：React hook，挂载时经 keymap 注册、卸载时成对注销
 *   （INV-14 首个消费实例：清理函数与注册同源）
 * - ctrl+c：当前有非 editable 目标的文本选区（window.selection）→
 *   navigator.clipboard.writeText（本地 API 不出网）；无选区或 editable → 不拦截
 *   原生行为
 * - 翻页键位映射表：PageUp/PageDown、ArrowLeft/ArrowRight（与 ReaderToolbar 导航
 *   动作同源 actions.prevPage/nextPage）；表驱动注册（P7-F 连续滚动时键位语义
 *   迁移只改本表——ROADMAP P7-F 验收条款的落点）
 * - ctrl+滚轮缩放：document wheel 监听（本模块统一持有，成对注销）；ctrlKey 时
 *   preventDefault（阻止 Chromium 页面缩放）并调 actions.zoomStep(±1)；步进常量
 *   单源决断：ZOOM_STEP 现为 ReaderToolbar.tsx:27 模块内常量，本工单将其 export
 *   （ReaderToolbar.tsx 列入本工单改动面），禁止复制第二份
 * - 本 hook 的全部监听在自身 useEffect 清理函数内统一注销（INV-14 成对），消费方
 *   不得自行补丁注销
 * - ctrl+v：不注册——keymap 的 editable 避让保证编辑框原生粘贴透传（规约记录：
 *   「不实现」即正确实现）
 *
 * ── 接口层 ──
 * - export interface ReaderShortcutActions { prevPage(): void; nextPage(): void;
 *     zoomStep(dir: 1 | -1): void }
 * - export function useReaderShortcuts(actions: ReaderShortcutActions): void
 *
 * ── 架构层 ──
 * - 消费 src/renderer/shared/keymap（keymap 模块先行）；动作经参数注入
 *   （reader.store 的调用由消费方 ReaderPage 组装，本模块不 import store——可测性）
 * - 接缝声明：ReaderPage.tsx（Phase 3 阅读器组合根）装配本 hook 属本工单改动面
 *
 * ── 生命周期层 ──
 * - 预留：页内高亮搜索快捷键（P7-E）；不做：鼠标手势
 *
 * ── 文化层 ──
 * - 剪贴板写入失败（拒权/不可用）：动作型失败上抛由消费方 catch 后 toast（INV-02
 *   两型之「动作型」）；禁止静默吞错
 * - 禁止 any；文件 ≤200 行
 * - 完成后：删除占位实现 → npm run verify 绿 → 人工审查 git diff → 翻 registry 状态
 */

/** 工单骨架标记（实现单元替换为真实实现） */
export const READER_SHORTCUTS_STUB = 'SR2-KEY-02'
