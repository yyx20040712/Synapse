/**
 * [F-WS-02] WorkspacesPage —— 课题管理独立视图页（Rail 课题钮路由至此，
 * 取代退役弹层 WsRailPopover；[B4-A R2 §11.1] 拆件：列表=WorkspaceList、
 * 新建行=WorkspaceCreateRow——本件留页面骨架+切换/新建/改名编排）。
 *
 * ── 行为层 ──
 * - 列表/新建/改名经拆件呈现（纯受控）；点卡/创建即切走 switchTo(id,
 *   {dirty, prepare, onConfirmed})——[B4-A R2 §2.5 #38] prepare=App 注入的全量
 *   flush+清史编排（flush 失败留本页可重试，不 discard）；成功即 reload
 * - 改名：行内编辑（确定→rename IPC+store items 即时改名；取消还原）；空名
 *   =既有 toast
 * - 引导态窗口（INV-87 三条件成立）：页首引导提示行；卡片仍显实名
 * - 失败面：store error 非空→错误行+「重试」（load() 重跑）
 *
 * ── 接口层 ──
 * - export function WorkspacesPage(props: { dirty: boolean; prepare?():
 *     Promise<boolean>; onSwitched?: () => void | Promise<void> })
 *   （dirty/prepare 由 App 组合根注入——禁跨域 store 互引；[F-VISFB-65]
 *   onSwitched=确认+全量 flush 通过后的恢复副本 release 回调）
 *
 * ── 架构层 ──
 * - 本域 store（workspace.store）+ shared/ui；动作型失败 catch 后 toast
 * - 皮肤住 workspace.css（.ws-page 族；theme.test.ts wsCss 读取面）
 *
 * ── 生命周期层 ──
 * - 不做：删除课题（ADR-0018 v1 边界）；跨课题检索；色标持久化
 *
 * ── 文化层 ──
 * - 测试：tests/unit/renderer/workspaces-page.test.tsx（always-active）
 *   +tests/e2e/workspaces.spec.ts（真 Chromium 切换链）
 */
import { useEffect, useRef, useState } from 'react'
import { ApiClientError } from '../../api/client'
import { showToast } from '../../shared/ui/Toast'
import { RetryButton } from '../../shared/ui/RetryButton'
import { OP_FAILED } from '../../shared/ui-constants'
import { isGuideState, useWorkspaceStore } from './workspace.store'
import { WorkspaceList } from './WorkspaceList'
import { WorkspaceCreateRow } from './WorkspaceCreateRow'
import './workspace.css'

// [B4-A R2 §11.1 拆件] WS_DOT_PALETTE 单源迁驻 WorkspaceList.tsx——此处再导出
// 保持既有 import 面（workspaces-page.test 锚）零迁移
export { WS_DOT_PALETTE } from './WorkspaceList'

/** 引导态提示文案（D2：课题图标进管理页引导新建——仅三条件成立时渲染） */
const GUIDE_HINT = '尚未选择课题（待选择）——新建一个课题即可开始使用；重命名默认课题也会解除引导'

export function WorkspacesPage(props: {
  dirty: boolean
  /** [B4-A R2 §2.5 #38] 全量 flush+清史编排（App 注入 workspace-switch） */
  prepare?: () => Promise<boolean>
  onSwitched?: () => void | Promise<void>
}): JSX.Element {
  const items = useWorkspaceStore((s) => s.items)
  const currentId = useWorkspaceStore((s) => s.currentId)
  const error = useWorkspaceStore((s) => s.error)
  const load = useWorkspaceStore((s) => s.load)
  const create = useWorkspaceStore((s) => s.create)
  const rename = useWorkspaceStore((s) => s.rename)
  const switchTo = useWorkspaceStore((s) => s.switchTo)
  const [newName, setNewName] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)

  /** [F-UIRES-02 R2] 进入重命名会话（「重命名」钮与 R4 双击共用口） */
  function openRename(w: { id: string; name: string }): void {
    setEditingId(w.id)
    setDraft(w.name)
  }

  // [W2 小挂账] 挂载重拉一次（仅非引导态）：导入后计数会话内陈旧——专职管理页
  // 使陈旧性升格为主数据面可见，挂载沿自愈（成本一次 IPC）
  const guide = isGuideState({ items, currentId })
  const mountPulledRef = useRef(false)
  useEffect(() => {
    if (mountPulledRef.current) return
    mountPulledRef.current = true
    if (!guide) void load()
  }, [guide, load])

  /** 点卡切换（幂等=当前课题直返零 IPC；失败=toast 留本页） */
  async function pick(id: string): Promise<void> {
    if (id === currentId) return
    if (busy) return
    setBusy(true)
    try {
      // 成功即 reload（store 内触发）；取消/flush 失败留在本页可换选或重试。
      // [F-VISFB-65 回炉 R3] onConfirmed 前移（confirm+flush 过→api.switch 前
      // release）；[B4-A R2] prepare=全量 flush 编排（失败 false 留旧课题）
      await switchTo(id, { dirty: props.dirty, prepare: props.prepare, onConfirmed: props.onSwitched })
    } catch (e) {
      showToast(e instanceof ApiClientError ? e.message : OP_FAILED, 'error')
    } finally {
      setBusy(false)
    }
  }

  /** 新建=创建即切（IO dirty 确认在 store.switchTo 内；取消时清单已刷新可见） */
  async function submitCreate(): Promise<void> {
    const trimmed = newName.trim()
    if (trimmed === '') {
      showToast('请输入课题名称', 'info')
      return
    }
    if (busy) return
    setBusy(true)
    try {
      const id = await create(trimmed)
      await switchTo(id, { dirty: props.dirty, prepare: props.prepare, onConfirmed: props.onSwitched })
      setNewName('')
    } catch (e) {
      showToast(e instanceof ApiClientError ? e.message : OP_FAILED, 'error')
    } finally {
      setBusy(false)
    }
  }

  /** 行内改名（value=子件 DOM 定案值；成功后 store items 即时改名） */
  async function submitRename(id: string, value: string): Promise<void> {
    const trimmed = value.trim()
    if (trimmed === '') {
      showToast('课题名称不能为空', 'info')
      return
    }
    if (busy) return
    setBusy(true)
    try {
      await rename(id, trimmed)
      setEditingId(null)
    } catch (e) {
      showToast(e instanceof ApiClientError ? e.message : OP_FAILED, 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="ws-page">
      <h2>课题管理</h2>
      {/* [B4-A R2 §2.5 #38] 弃改语义退役——切换前先保存全部修改（失败留旧课题） */}
      <p className="ws-sub">每个课题拥有独立的文献库与发展脉络；切换即整体切换，切换前将先保存全部修改。</p>
      {guide && <p className="ws-guide">{GUIDE_HINT}</p>}
      {error !== null ? (
        // 失败面：store error 契约的壳层兑现点
        <div className="ws-error" role="alert">
          <span>课题列表加载失败：{error}</span>
          <RetryButton className="ws-retry" onClick={() => void load()} />
        </div>
      ) : (
        <WorkspaceList
          items={items}
          currentId={currentId}
          editingId={editingId}
          draft={draft}
          onDraftChange={setDraft}
          onPick={(id) => void pick(id)}
          onOpenRename={openRename}
          onSubmitRename={(id, value) => void submitRename(id, value)}
          onCancelRename={() => setEditingId(null)}
        />
      )}
      <WorkspaceCreateRow
        name={newName}
        onNameChange={setNewName}
        onSubmit={() => void submitCreate()}
        onClear={() => setNewName('')}
      />
    </div>
  )
}
