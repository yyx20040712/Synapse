/**
 * [R1-WS2] WorkspaceSwitcher —— 侧栏课题切换器（App.tsx nav 顶部挂载）。
 *
 * ── 行为层 ──
 * - 常态：当前课题名 + ▾（aria-label「切换课题」）
 * - 展开：课题列表（当前项「（当前）」标记）+「新建课题…」（内嵌输入——创建即切）
 *   +「管理课题」（onManage 回调——App 跳设置页）
 * - 切换/新建走 workspace.store.switchTo/create；dirty 聚合值经 props 注入
 *   （App 编排——组件不引 reader/lineage 域 store）；dirty 确认与 reload
 *   均在 store 内（行为面单一实现点）
 * - 列表失败内联呈现（store 头注「错误写 error 供内联展示」契约的兑现点，
 *   回炉 W1）+「重试」复用 load——持续展示型不 toast
 *
 * ── 接口层 ──
 * - export function WorkspaceSwitcher(props: { dirty: boolean; onManage(): void })
 *
 * ── 架构层 ──
 * - 只 import 本域 store 与 shared/ui；错误 toast（动作型失败上抛在此 catch）
 *
 * ── 生命周期层 ──
 * - 不做：点外关闭（v1 轻量面——再点切换钮或选择后自合）；切换动画（P5）
 *
 * ── 文化层 ──
 * - 测试：tests/unit/renderer/workspace-switcher.test.tsx（always-active）
 * - 视觉：R3-TH1 已上墨青侧栏——本组件随侧栏底色做夜色适配（rgba 白+
 *   金 hairline+夜面变量，主控预裁①；testid/文案/交互零改）
 */
import { useState } from 'react'
import { ApiClientError } from '../../api/client'
import { showToast } from '../../shared/ui/Toast'
import { useWorkspaceStore, selectCurrentName } from './workspace.store'

const OP_FAILED = '操作失败'

export function WorkspaceSwitcher(props: { dirty: boolean; onManage: () => void }): JSX.Element {
  const items = useWorkspaceStore((s) => s.items)
  const currentId = useWorkspaceStore((s) => s.currentId)
  const error = useWorkspaceStore((s) => s.error)
  const load = useWorkspaceStore((s) => s.load)
  const switchTo = useWorkspaceStore((s) => s.switchTo)
  const create = useWorkspaceStore((s) => s.create)
  const [open, setOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)

  async function pick(id: string): Promise<void> {
    if (busy) return
    setBusy(true)
    try {
      await switchTo(id, { dirty: props.dirty })
      // 切换成功即 reload（store 内触发），此处仅取消/幂等路径需要合上
      setOpen(false)
    } catch (e) {
      showToast(e instanceof ApiClientError ? e.message : OP_FAILED, 'error')
    } finally {
      setBusy(false)
    }
  }

  async function submitCreate(): Promise<void> {
    const trimmed = name.trim()
    if (trimmed === '') {
      showToast('请输入课题名称', 'info')
      return
    }
    if (busy) return
    setBusy(true)
    try {
      const id = await create(trimmed)
      await switchTo(id, { dirty: props.dirty })
      // 成功路径页面即将 reload；dirty 取消则留在展开态（清单已含新课题）
    } catch (e) {
      showToast(e instanceof ApiClientError ? e.message : OP_FAILED, 'error')
    } finally {
      setBusy(false)
    }
  }

  // R3-TH1 夜色适配（主控预裁①）：常态钮=rgba 白微底+金 hairline（mockup .ws 同款）；
  // 展开面板=夜面色块浮层；输入/取消=夜面字段——文字全部亮色系
  const triggerStyle = { borderColor: 'rgba(201,168,106,.25)', background: 'rgba(255,255,255,.05)', color: '#efe9da' }
  const panelStyle = { borderColor: 'rgba(201,168,106,.25)', background: 'var(--node-face)', color: 'var(--text-on-night)' }
  const fieldStyle = { borderColor: 'rgba(151,160,187,.45)', background: 'rgba(23,30,51,.45)', color: '#e9e6db' }

  return (
    <div className="flex flex-col gap-1">
      <button
        aria-label="切换课题"
        aria-expanded={open}
        className="rounded px-3 py-2 text-left text-sm"
        style={triggerStyle}
        onClick={() => {
          setOpen((v) => !v)
          setCreating(false)
        }}
      >
        {selectCurrentName({ items, currentId }) || '课题'} ▾
      </button>
      {/* 列表失败内联呈现（store 头注契约：错误写 error 供内联展示——回炉 W1
          兑现；持续展示型不 toast，重试语义复用 load（下次成功即清除）） */}
      {error !== null && (
        <div
          className="flex items-center gap-1 px-2 text-xs"
          style={{ color: 'var(--danger)' }}
          aria-label="课题列表错误"
        >
          <span className="min-w-0 flex-1 truncate">{error}</span>
          <button className="underline" onClick={() => void load()}>
            重试
          </button>
        </div>
      )}
      {open && (
        <div className="flex flex-col gap-1 rounded p-1" style={panelStyle}>
          {items.map((w) => (
            <button
              key={w.id}
              className="rounded px-2 py-1.5 text-left text-xs"
              style={
                w.id === currentId
                  ? { background: 'rgba(255,255,255,.08)', color: '#f3eddd' }
                  : undefined
              }
              onClick={() => void pick(w.id)}
            >
              {w.name}
              {w.id === currentId ? '（当前）' : ''}
            </button>
          ))}
          {creating ? (
            <div className="flex flex-col gap-1">
                <input
                aria-label="新课题名称"
                className="rounded border px-2 py-1 text-xs"
                style={fieldStyle}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              <div className="flex gap-1">
                <button
                  className="rounded px-2 py-1 text-xs text-white"
                  style={{ background: 'var(--accent)' }}
                  onClick={() => void submitCreate()}
                >
                  创建
                </button>
                <button
                  className="rounded px-2 py-1 text-xs"
                  style={fieldStyle}
                  onClick={() => {
                    setCreating(false)
                    setName('')
                  }}
                >
                  取消
                </button>
              </div>
            </div>
          ) : (
            <button
              className="rounded px-2 py-1.5 text-left text-xs"
              onClick={() => setCreating(true)}
            >
              新建课题…
            </button>
          )}
          <button
            className="rounded px-2 py-1.5 text-left text-xs"
            onClick={() => {
              setOpen(false)
              setCreating(false)
              props.onManage()
            }}
          >
            管理课题
          </button>
        </div>
      )}
    </div>
  )
}
