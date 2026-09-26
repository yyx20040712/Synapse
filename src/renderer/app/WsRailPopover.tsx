/**
 * [T3-P2] WsRailPopover —— 课题选择弹层（A10：rail 课题项触发的 250px 弹层）。
 *
 * ── 行为层 ──
 * - 开：rail 课题项点击（开合态在 Rail 自持，本件=open 时渲染）
 * - 关：外点（mousedown 落在 .ws-pop/.rail-ws 之外——触发钮自吞防
 *   「关了又开」竞窗）+Escape；点选成功切换后随 reload 收口
 * - 列表：workspace.store items+currentId——色点=索引 i%6 六色 token 轮转
 *   （与 rail 课题色点同一调色板：当前课题行 i=其索引）；当前项挂 .on；
 *   篇数=paperCount（main 侧逐课题库 COUNT——schemas workspaceItemSchema）
 * - 点选=switchTo(id,{dirty})：dirty 聚合值经 Rail props 注入（App 编排）；
 *   **dirty>0 必经现有确认流**（store 内 window.confirm——拦截即不切零副作用，
 *   取消/幂等路径**留在展开态**——旧顶栏切换器语义继承，门一 k1-N1 回炉项）；
 *   成功即 reload（ADR-0018）——色点/短名/状态条课题名 reload 后自新，
 *   本件不做任何就地状态伪装；动作失败=toast+留展开态
 * - 失败面（门一 d1-W1 回炉项）：store.error 非空时渲染错误行+「重试」
 *   （load() 重跑）——顶栏切换器退役后弹层=store error 契约唯一壳层兑现点
 * - 定位：createPortal(document.body)——**脱离 .app-content-row zoom 行**
 *   （门一 k1-W1/d1-W2 回炉项：fixed 元素在 zoom 祖先内坐标被缩，125% 档
 *   弹层漂移压轨）；left=calc(rail 72px×--ui-scale+6px 间隙)、top=58px
 *   （topbar 38px 行外恒高+20px 间隙）——三档缩放下紧贴轨右缘；z=var(--z-pop)
 *
 * ── 接口层 ──
 * - export function WsRailPopover(props: { dirty: boolean; onClose(): void })
 *
 * ── 架构层 ──
 * - app/ 组合根件：workspace.store+shared/ui；皮肤住 workspace.css（.ws-pop 族
 *   ——ws 域皮肤驻 ws 域 CSS 件，theme.test wsCss 读取面同构）；portal 目标
 *   document.body=DOM 挂载位迁移非渲染域迁移（React 树仍在本件）
 *
 * ── 生命周期层 ──
 * - 不做：新建/重命名/管理课题（设置页 WorkspaceSection 面）；课题色标持久化
 *   （索引轮转=会话内确定性推导，P5 候选）
 *
 * ── 文化层 ──
 * - 值单源=mockup L287-313/L740-764 逐值誊录；测试=app-shell.test 弹层 describe
 *   （开合/.on/dirty 拦截留展开/reload 联动/错误行重试）+e2e shell-rail.spec
 *   （真 Chromium：含触发钮 mousedown 自吞净关一次锁）
 */
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { railOpFailedToast, WS_DOT_PALETTE } from './rail-shared'
import { useWorkspaceStore } from '../features/workspaces/workspace.store'
import '../features/workspaces/workspace.css'

export function WsRailPopover(props: { dirty: boolean; onClose: () => void }): JSX.Element {
  const items = useWorkspaceStore((s) => s.items)
  const currentId = useWorkspaceStore((s) => s.currentId)
  const error = useWorkspaceStore((s) => s.error)
  const load = useWorkspaceStore((s) => s.load)
  const switchTo = useWorkspaceStore((s) => s.switchTo)
  const [busy, setBusy] = useState(false)
  const onClose = props.onClose

  // 关闭通道①外点②Escape（挂载期 document 级监听，卸载同源清理——INV-14 成对；
  // deps 锚 onClose 单值——门一 k1-N6：[props] 每渲染新引用致监听无谓重挂）
  useEffect(() => {
    const onDown = (ev: MouseEvent): void => {
      const t = ev.target
      if (!(t instanceof Element)) return
      // 触发钮（.rail-ws）自吞：其 onClick 走 toggle——外点关后 click 又开会
      // 产生「关了又开」竞窗（mousedown 先于 click 派发）
      if (t.closest('.ws-pop') !== null || t.closest('.rail-ws') !== null) return
      onClose()
    }
    const onKey = (ev: KeyboardEvent): void => {
      if (ev.key === 'Escape') onClose()
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [onClose])

  async function pick(id: string): Promise<void> {
    // 幂等收口（d1-N-a 回炉核点）：点选当前课题=确认语义，直接合上零 IPC
    // （switchTo 对同 id 返回 false——与 dirty 取消的 false 不可区分，故在
    // 本层显式分流：幂等=合上，取消/失败=留展开）
    if (id === currentId) {
      onClose()
      return
    }
    if (busy) return
    setBusy(true)
    try {
      const switched = await switchTo(id, { dirty: props.dirty })
      // 取消/幂等（switched=false）=留在展开态（旧切换器语义继承）；成功路径
      // 页面即将 reload（store 内触发），onClose 仅为兜底收口
      if (switched) onClose()
    } catch (e) {
      railOpFailedToast(e)
    } finally {
      setBusy(false)
    }
  }

  return createPortal(
    <div className="ws-pop" role="dialog" aria-label="选择课题">
      <h4>选 择 课 题</h4>
      {error !== null ? (
        // 失败面：store error 契约的壳层兑现点（d1-W1——顶栏切换器退役后唯一）
        <div className="ws-error">
          <span>课题列表加载失败：{error}</span>
          <button type="button" className="ws-retry" onClick={() => void load()}>
            重试
          </button>
        </div>
      ) : (
        items.map((w, i) => (
          <button
            type="button"
            key={w.id}
            className={`ws-item${w.id === currentId ? ' on' : ''}`}
            onClick={() => void pick(w.id)}
          >
            <span
              className="dot"
              style={{ background: WS_DOT_PALETTE[i % WS_DOT_PALETTE.length] }}
              aria-hidden="true"
            />
            <span className="nm">{w.name}</span>
            <span className="ct">{w.paperCount} 篇</span>
          </button>
        ))
      )}
      <div className="foot-note">选中后侧栏图标与文字随之变化 · 课题间数据完全隔离</div>
    </div>,
    document.body
  )
}
