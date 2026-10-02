/**
 * [F-WS-02] WorkspacesPage —— 课题管理独立视图页（Rail 课题钮路由至此，
 * 取代退役弹层 WsRailPopover；新建/改名承接自设置页课题管理节
 * WorkspaceSection——同批退役，方案切换=删除旧方案禁并存）。
 *
 * ── 行为层 ──
 * - 卡片列表：每课题一张卡（色标片=WS_DOT_PALETTE 索引轮转[迁自
 *   app/rail-shared 单源]/实名/N 篇）；当前课题卡挂 .on；点卡=switchTo(id,
 *   {dirty}) 既有链路零动（幂等=零 IPC 不空切；dirty>0 必经 store 内
 *   confirm；成功即 reload——ADR-0018；失败=toast 留本页可重试）；
 *   [F-UIRES-02 R4] 双击卡=进入重命名（资源管理器镜像——单击切换两次幂等
 *   无害；「重命名」钮保留）
 * - 新建：名称输入+「创建并切换」（create→switchTo 链——创建即切；dirty
 *   取消时新课题仍出现在清单）；空名/纯空白=no-op 提示；[F-UIRES-02 R3]
 *   Enter=创建并切换（submitCreate 既有校验链）/Esc=清空（常驻输入取消
 *   语义）/isComposing 守卫（shared/inline-keys 键面单源）
 * - 改名：行内编辑（确定→rename IPC+store items 即时改名[侧栏/状态条同源
 *   生效]；取消还原）；[F-UIRES-02 R2] 三键全套——Enter 提交/失焦提交
 *   （过 skipBlur 标记门）/Esc 取消/isComposing 守卫（序 B 补提交经
 *   useComposingCommit）；确定/取消钮 mousedown preventDefault（TagEditor
 *   先例——焦点留 input 防双发）；空名=既有 toast；改名即打破引导态名条件
 * - 引导态窗口（INV-87 三条件成立）：页首引导提示行（课题图标进管理页
 *   引导新建——D2 批语）；卡片仍显实名（管理面=实体管理位，「待选择」仅
 *   rail 标签/状态条显示位）
 * - 失败面：store error 非空→错误行+「重试」（load() 重跑）——弹层退役后
 *   本页=store error 契约唯一壳层兑现点（d1-W1 回炉语义随迁）
 *
 * ── 接口层 ──
 * - export function WorkspacesPage(props: { dirty: boolean })
 *   （dirty 聚合值经 App 组合根注入——禁跨域 store 互引）
 * - export const WS_DOT_PALETTE（课题色标 6 色轮转调色板——迁自
 *   app/rail-shared；弹层退役后单一消费=本页色标片）
 *
 * ── 架构层 ──
 * - 本域 store（workspace.store）+ shared/ui；动作型失败 catch 后 toast
 *   （ApiClientError 中文 message，其余 OP_FAILED 兜底）
 * - 皮肤住 workspace.css（.ws-page 族；theme.test.ts wsCss 读取面）
 *
 * ── 生命周期层 ──
 * - 不做：删除课题（ADR-0018 v1 边界）；跨课题检索；色标持久化（索引轮转=
 *   会话内确定性推导，P5 候选）；页内更多管理功能（用户批语「后面再加」）
 *
 * ── 文化层 ──
 * - 测试：tests/unit/renderer/workspaces-page.test.tsx（always-active）
 *   +tests/e2e/workspaces.spec.ts（真 Chromium 切换链）
 */
import { useEffect, useRef, useState } from 'react'
import { WORKSPACE_NAME_MAX } from '@shared/ipc/schemas'
import { ApiClientError } from '../../api/client'
import { showToast } from '../../shared/ui/Toast'
import { OP_FAILED } from '../../shared/ui-constants'
import { inlineKeyDown } from '../../shared/inline-keys'
import { isGuideState, useWorkspaceStore } from './workspace.store'
import { WorkspaceRenameRow } from './WorkspaceRenameRow'
import './workspace.css'

/** [T3-P2→F-WS-02] 课题色标 6 色轮转调色板（索引 i%6——族源 token 随主题
 *  换肤；迁自 app/rail-shared，弹层退役后单一消费=本页色标片） */
export const WS_DOT_PALETTE: readonly string[] = [
  'var(--accent)',
  'var(--sub2)',
  'var(--signal)',
  'var(--ok)',
  'var(--warn)',
  'var(--faint)'
]

/** 引导态提示文案（D2：课题图标进管理页引导新建——仅三条件成立时渲染） */
const GUIDE_HINT = '尚未选择课题（待选择）——新建一个课题即可开始使用；重命名默认课题也会解除引导'

export function WorkspacesPage(props: { dirty: boolean }): JSX.Element {
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

  /** [F-UIRES-02 R2] 进入重命名会话（「重命名」钮与 R4 双击共用口；skipBlur/
   *  组词守卫 ref 住 WorkspaceRenameRow——挂载即新会话自清零） */
  function openRename(w: { id: string; name: string }): void {
    setEditingId(w.id)
    setDraft(w.name)
  }

  // [W2 小挂账] 挂载重拉一次（仅非引导态）：导入后计数会话内陈旧——专职管理页
  // 使陈旧性升格为主数据面可见，挂载沿自愈（成本一次 IPC）。引导态窗口豁免=
  // 导入沿重拉已归 App 组合根 W1 桥（职责分界免双重拉）；窗口外 reload/计数
  // 刷新语义归 F-UIRES-01 票面；失败走 store error 既有契约=本页错误行+重试
  const guide = isGuideState({ items, currentId })
  const mountPulledRef = useRef(false)
  useEffect(() => {
    if (mountPulledRef.current) return
    mountPulledRef.current = true
    if (!guide) void load()
  }, [guide, load])

  /** 点卡切换（幂等=当前课题直返零 IPC——确认语义不空切；失败=toast 留本页） */
  async function pick(id: string): Promise<void> {
    if (id === currentId) return
    if (busy) return
    setBusy(true)
    try {
      await switchTo(id, { dirty: props.dirty })
      // 成功即 reload（store 内触发）；取消/失败留在本页可换选或重试
    } catch (e) {
      showToast(e instanceof ApiClientError ? e.message : OP_FAILED, 'error')
    } finally {
      setBusy(false)
    }
  }

  /** 新建=创建即切（dirty 确认在 store.switchTo 内；取消时清单已刷新可见） */
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
      await switchTo(id, { dirty: props.dirty })
      setNewName('')
    } catch (e) {
      showToast(e instanceof ApiClientError ? e.message : OP_FAILED, 'error')
    } finally {
      setBusy(false)
    }
  }

  /** 行内改名（value=子件 DOM 定案值——序 B 下 state 滞后由取值方承载；
   *  成功后 store items 即时改名——侧栏/状态条同源生效） */
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
      <p className="ws-sub">每个课题拥有独立的文献库与发展脉络；切换即整体切换，未保存的修改会被丢弃。</p>
      {guide && <p className="ws-guide">{GUIDE_HINT}</p>}
      {error !== null ? (
        // 失败面：store error 契约的壳层兑现点（弹层退役后唯一——d1-W1 语义随迁）
        <div className="ws-error" role="alert">
          <span>课题列表加载失败：{error}</span>
          <button type="button" className="ws-retry" onClick={() => void load()}>
            重试
          </button>
        </div>
      ) : (
        <ul className="ws-list" aria-label="课题列表">
          {items.map((w, i) => (
            <li key={w.id}>
              {editingId === w.id ? (
                // [F-UIRES-02 R2] 行内编辑行拆件（组件 250 行红线）：三键+
                // 组词守卫+按钮 mousedown preventDefault 规约在拆件头注
                <WorkspaceRenameRow
                  draft={draft}
                  onDraftChange={setDraft}
                  onSubmit={(value) => void submitRename(w.id, value)}
                  onCancel={() => setEditingId(null)}
                />
              ) : (
                <div className="ws-row">
                  <button
                    type="button"
                    className={`ws-card${w.id === currentId ? ' on' : ''}`}
                    onClick={() => void pick(w.id)}
                    // [F-UIRES-02 R4] 双击=进入重命名（单击切换语义不动——两次单击幂等）
                    onDoubleClick={() => openRename(w)}
                  >
                    <span
                      className="chip"
                      style={{ background: WS_DOT_PALETTE[i % WS_DOT_PALETTE.length] }}
                      aria-hidden="true"
                    />
                    <span className="nm">{w.name}</span>
                    <span className="ct">{w.paperCount} 篇</span>
                  </button>
                  <button type="button" className="ws-rename" onClick={() => openRename(w)}>
                    重命名
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
      <div className="ws-new-row">
        <input
          aria-label="新课题名称"
          maxLength={WORKSPACE_NAME_MAX}
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          // [F-UIRES-02 R3] Enter=创建并切换（submitCreate 既有校验链）；
          // Esc=清空（常驻输入取消语义=清空非卸载，无失焦提交面无 skip 语义）
          onKeyDown={(e) =>
            inlineKeyDown(
              e,
              () => void submitCreate(),
              () => setNewName(''),
              () => undefined
            )
          }
        />
        <button type="button" className="ws-create" onClick={() => void submitCreate()}>
          创建并切换
        </button>
      </div>
    </div>
  )
}
