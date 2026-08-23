// b3: P7-A
/**
 * [SR2-KEY-01] keymap —— 全局键盘快捷键单例（工单：done / strong）
 *
 * ── 行为层 ──
 * - 单一 document keydown 监听（模块级懒挂载：首个 register 时挂载，最后一个
 *   unregister 时移除——监听与绑定表共存亡）
 * - registerKeymap(id, bindings)/unregisterKeymap(id) 成对契约：重复 id register =
 *   覆盖旧绑定（幂等不叠加）；注销不存在的 id = 无操作（幂等）
 * - editable 避让：事件目标为 input/textarea/contentEditable 时一律不拦截不消费
 *   （原生编辑优先——ctrl+v 语义=编辑框焦点下的原生粘贴透传，本模块不接管编辑场景）
 * - 匹配：ctrlKey/metaKey 归一（Windows ctrl）+ key 大小写不敏感查表；首个命中即止
 *   （Map 插入序确定，多消费方冲突可预期）；命中且 preventDefault 显式 true 才阻断
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
 * - 消费方：ReaderShortcuts；后续 v2 快捷键面统一经此模块
 * - INV-14（输入接缝注册/注销成对，docs/invariants.md）：本模块是锚点——消费方
 *   清理函数与注册同源成对
 *
 * ── 生命周期层 ──
 * - 预留：用户自定义键位（v2 后期另立工单）；不做：全局录键 UI、鼠标手势
 *
 * ── 文化层 ──
 * - 无异步无 IO，无用户可见失败面（纯输入路由，INV-02 不适用——规约记录依据）
 * - 禁止 any；文件 ≤200 行
 */

export interface KeyBinding {
  key: string
  ctrl?: boolean
  shift?: boolean
  preventDefault?: boolean
  handler(ev: KeyboardEvent): void
}

/** 注册表：id → 绑定组（后注册覆盖同 id——幂等不叠加） */
const registry = new Map<string, readonly KeyBinding[]>()
/** 监听与注册表共存亡（INV-14）：null = 空表无监听 */
let listener: ((ev: KeyboardEvent) => void) | null = null

export function isEditableTarget(t: EventTarget | null): boolean {
  if (!(t instanceof HTMLElement)) return false
  if (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA') return true
  // 双轨检测：isContentEditable 覆盖继承的可编辑子树（Chromium）；属性值检测覆盖
  // 声明式标记（不依赖属性同步机制的环境同样可判；"false" 显式禁用不算，空串按
  // HTML 规范视为 true）
  if (t.isContentEditable === true) return true
  const v = t.getAttribute('contenteditable')
  return v === 'true' || v === ''
}

function matches(b: KeyBinding, ev: KeyboardEvent): boolean {
  // 修饰精确匹配：裸键绑定不吃修饰组合（Ctrl+n 不得触发裸 n——防误伤系统快捷键）
  if ((b.ctrl === true) !== (ev.ctrlKey || ev.metaKey)) return false
  if ((b.shift === true) !== ev.shiftKey) return false
  return ev.key.toLowerCase() === b.key.toLowerCase()
}

function onKeydown(ev: KeyboardEvent): void {
  if (isEditableTarget(ev.target)) return
  for (const bindings of registry.values()) {
    for (const b of bindings) {
      if (matches(b, ev)) {
        if (b.preventDefault === true) ev.preventDefault()
        b.handler(ev)
        return
      }
    }
  }
}

export function registerKeymap(id: string, bindings: readonly KeyBinding[]): void {
  registry.set(id, bindings)
  if (listener === null) {
    listener = onKeydown
    document.addEventListener('keydown', listener)
  }
}

export function unregisterKeymap(id: string): void {
  registry.delete(id)
  if (registry.size === 0 && listener !== null) {
    document.removeEventListener('keydown', listener)
    listener = null
  }
}
