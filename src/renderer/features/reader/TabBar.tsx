// b3: P7-B
/**
 * [SR2-TABS-02] TabBar —— 阅读器多标签栏（工单：open / strong）
 *
 * ── 行为层 ──
 * - 消费 useReaderStore：order（排列序）/ activeId / tabs（每 tab 的
 *   fileName/status）——纯展示+回调上交，不持有本地状态
 * - 每个 tab 项：标题（fileName 去扩展名，超长截断省略）、激活态高亮、
 *   loading 态 spinner、error 态红字、关闭叉（closeTab）
 * - 点击 tab 体 = activateTab(id)（换 tab 暂停非卸载——TABS-01 语义）
 * - 空态：无 tab（order 空）时整栏不渲染
 * - 键盘可达：容器 role="tablist"，tab 项 role="tab" + roving tabindex
 *   （ArrowLeft/Right 在项间移动焦点——TabBar 组件主语管理；焦点内按键属
 *   DOM 语义非全局快捷键，不经 keymap）
 *
 * ── 接口层 ──
 * - export function TabBar(): JSX.Element（数据自取 store；无 props——
 *   装配点是 ReaderPage.tsx:151 返回根 div 顶部，TABS-01 选择器同族）
 *
 * ── 架构层 ──
 * - renderer features/reader 域内组件；只 import reader.store 与 shared/ui；
 *   接缝：ReaderPage.tsx 顶部装配（本工单改动面）
 * - 灰点位（tab 项上的圆点标记）与关闭脏 tab 确认框属 SR2-TABS-03——本单
 *   关闭即关（无确认），dirty 信号接入后升级
 *
 * ── 生命周期层 ──
 * - 预留：tab 拖拽排序（P8+）；不做：多行 tab 折叠（单行滚动即可）
 *
 * ── 文化层 ──
 * - 无异步无 IO（全部数据来自 store）——错误反馈面不适用，规约记录依据
 * - 测试：tests/unit/renderer/tab-bar.test.tsx（新建，受锁）：渲染序=order、
 *   激活高亮、点击 activate、关闭叉 closeTab、loading/error 态呈现、空态隐藏、
 *   role="tablist"/"tab" 语义
 */
import type { JSX } from 'react'

export function TabBar(): JSX.Element {
  return <div data-ticket="SR2-TABS-02">TabBar 骨架（SR2-TABS-02 待实现）</div>
}
