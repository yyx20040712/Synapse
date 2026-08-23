// b3: P7-A
/**
 * [SR2-KEY-01] keymap —— 全局键盘快捷键单例（工单：open / strong）
 *
 * ── 行为层 ──
 * - 单一 document keydown 监听（模块级懒挂载：首个 register 时挂载，最后一个
 *   unregister 时移除——监听与绑定表共存亡）
 * - registerKeymap(id, bindings)/unregisterKeymap(id) 成对契约：重复 id register =
 *   覆盖旧绑定（幂等不叠加）；注销不存在的 id = 无操作（幂等）
 * - editable 避让：事件目标为 input/textarea/contentEditable 时一律不拦截不消费
 *   （原生编辑优先——ctrl+v 语义=编辑框焦点下的原生粘贴透传，本模块不接管编辑场景）
 * - 匹配：ctrlKey/metaKey 归一（Windows ctrl）+ key 归一查表；命中且 preventDefault
 *   为真则 preventDefault 后调用 handler；未命中透传
 * - 状态机（注册表）：
 *   | 态 | 事件 | 迁移 |
 *   | --- | --- | --- |
 *   | 空表（无监听） | register(id) | 活跃（监听挂载，表含 id） |
 *   | 活跃 | register(同 id) | 活跃（覆盖，表大小不变） |
 *   | 活跃 | unregister(id) | 活跃或空表（最后一个注销→移除监听） |
 *   跨格序列守卫：register→unregister→register 同 id 不得残留旧绑定或双监听
 *
 * ── 接口层 ──
 * - export interface KeyBinding { key: string; ctrl?: boolean; shift?: boolean;
 *     preventDefault?: boolean（缺省 false——需阻断默认行为的键位显式声明）;
 *     handler(ev: KeyboardEvent): void }
 * - export function registerKeymap(id: string, bindings: readonly KeyBinding[]): void
 * - export function unregisterKeymap(id: string): void
 * - export function isEditableTarget(t: EventTarget | null): boolean
 *
 * ── 架构层 ──
 * - renderer 共享基建：无 Electron/Node API、无 window.api 调用、不 import 组件
 * - 消费方：ReaderShortcuts（SR2-KEY-02）；后续 v2 快捷键面统一经此模块
 * - 新不变量预登记（实现时入 docs/invariants.md，编号 INV-14）：快捷键注册/注销
 *   必须成对（消费方 useEffect 清理函数与注册同源），keymap 接缝唯一
 *
 * ── 生命周期层 ──
 * - 预留：用户自定义键位（v2 后期另立工单）；不做：全局录键 UI、鼠标手势
 *
 * ── 文化层 ──
 * - 无异步无 IO，无用户可见失败面（纯输入路由，INV-02 不适用——规约记录依据）
 * - 禁止 any；文件 ≤200 行
 * - 完成后：删除占位实现 → npm run verify 绿 → 人工审查 git diff → 翻 registry 状态
 */

/** 工单骨架标记（实现单元替换为真实实现） */
export const KEYMAP_STUB = 'SR2-KEY-01'
