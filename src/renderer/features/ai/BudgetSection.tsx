/**
 * [F-DBCAMP-01 DB-2 UI U6] BudgetSection —— 设置页「AI 预算」节内容
 * （设计 §1.5/§4.1：17 输入+校验三则+保存/恢复默认；节标与节壳=SettingsPage
 * 「AI 预算」节——E1 断言锚零改，本件只填内容）。字段序/校验/投影纯逻辑
 * =budget-form.ts 拆件（250 行组件红线）。
 *
 * ── 态空间表（状态机前置——先于实现定型）──
 * 态 = clean | dirty | invalid | saving | saved
 *   clean（初值=store 投影；settings 未载入=AI_BUDGET_DEFAULTS 投影）
 *     --输入变化且全表合法且≠水合快照--> dirty
 *     --输入变化且全表合法且=水合快照--> clean（改回原值）
 *   clean|dirty --输入变化且任一非法（负数/清空/非整数/档内合计超限/agent
 *     单发超轮）--> invalid
 *   invalid --输入修回合法--> dirty
 *   dirty --保存点击--> saving --成功--> saved --2s--> clean
 *   saving --失败--> dirty（toast 错误；表单保留可重试——沿域内先例）
 *   任意表单态 --恢复默认点击--> 表单=AI_BUDGET_DEFAULTS 投影，按「≠水合
 *     快照」重算态（用户改过→dirty 可保存；本就=默认→clean 无变更零保存）
 *   saved --期间输入再变--> dirty（2s 定时器作废）
 * 不变量：
 *   - 表单字符串化单源（输入框 value 恒 string；保存前才组装数字载荷）；
 *     越界行内红字+保存禁用**不静默 clamp**（§1.5 逐字）。
 *   - settings 未载入（null）→保存禁用（保存载荷=完整 AppSettings 全键，
 *     contactEmail/theme/uiScale 无源不组载荷——INV-39 同因，见 SettingsPage
 *     runSave 接缝注；aiBudgets 侧表呈默认投影仅为展示）。
 *
 * ── 接口层 ──
 * - export function BudgetSection(props: { settings: AppSettings | null;
 *     saving: boolean; onSave(payload): Promise<void> }): JSX.Element
 * - 受控件：settings 现值/在途/保存动作经 props 注入（宿主=SettingsPage 组合
 *   根——ai 域件不 import settings 域 store，跨域接缝 props 化零白名单扩条）
 *
 * ── 架构层 ── / ── 生命周期层 ── / ── 文化层 ──
 * - 只 import shared 常量+域内 UI 件+budget-form 纯逻辑件；零 IPC 自取
 *   （保存载荷组装在本件、通道经宿主 onSave=settings.store.save 全量携带）
 * - 测试：tests/unit/renderer/budget-section.test.tsx；e2e E4=ai-budget.spec.ts
 */
import { useEffect, useRef, useState } from 'react'
import { AI_BUDGET_DEFAULTS, type AiBudgets } from '@shared/models/ai-domain'
import type { AppSettings } from '@shared/ipc/schemas'
import { ApiClientError } from '../../api/client'
import { Button } from '../../shared/ui/Button'
import { showToast } from '../../shared/ui/Toast'
import { OP_FAILED } from '../../shared/ui-constants'
import {
  AGENT_FIELDS,
  TIERS,
  TIER_FIELDS,
  defaultsForm,
  formEquals,
  project,
  tierKey,
  validate,
  type BudgetForm
} from './budget-form'

const SAVED_TEXT = '已保存'

type BudgetStatus = 'clean' | 'dirty' | 'invalid' | 'saving' | 'saved'

export function BudgetSection(props: {
  settings: AppSettings | null
  saving: boolean
  /** 保存通道（宿主注入 settings.store.save——全量四键载荷由本件组装） */
  onSave(payload: {
    contactEmail: string
    theme: AppSettings['theme']
    uiScale: AppSettings['uiScale']
    aiBudgets: AiBudgets
  }): Promise<void>
}): JSX.Element {
  const { settings, saving } = props
  const save = props.onSave

  const [form, setForm] = useState<BudgetForm>(defaultsForm)
  /** 水合快照（settings 首达进表单后定格——此后 store 替换不回填防抹草稿） */
  const hydratedRef = useRef<BudgetForm | null>(null)
  const [status, setStatus] = useState<BudgetStatus>('clean')
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (hydratedRef.current === null && settings !== null) {
      // aiBudgets 缺键容错：真实链路 settings.get 经 main zod parse 必含该键；
      // 异常回包（mock 桩形/旧快照）缺键回退默认投影防崩渲染
      const raw = settings.aiBudgets as AiBudgets | undefined
      hydratedRef.current = project(raw ?? AI_BUDGET_DEFAULTS)
      setForm(hydratedRef.current)
    }
  }, [settings])

  useEffect(
    () => () => {
      if (timerRef.current !== null) clearTimeout(timerRef.current)
    },
    []
  )

  const { values, fieldErrors, tierErrs, agentErr } = validate(form)
  const invalid =
    status !== 'saving' &&
    (Object.keys(fieldErrors).length > 0 ||
      Object.keys(tierErrs).length > 0 ||
      agentErr !== null)

  function clearSavedTimer(): void {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }

  function recalcStatus(next: BudgetForm): void {
    const v = validate(next)
    if (Object.keys(v.fieldErrors).length > 0 || Object.keys(v.tierErrs).length > 0 || v.agentErr !== null) {
      setStatus('invalid')
      return
    }
    const snap = hydratedRef.current
    setStatus(snap !== null && formEquals(next, snap) ? 'clean' : 'dirty')
  }

  function updateField(key: string, raw: string): void {
    clearSavedTimer()
    const next = { ...form, [key]: raw }
    setForm(next)
    recalcStatus(next)
  }

  function resetDefaults(): void {
    clearSavedTimer()
    const next = defaultsForm()
    setForm(next)
    recalcStatus(next)
  }

  const canSave = status === 'dirty' && !invalid && !saving && settings !== null && values !== null

  async function runSave(): Promise<void> {
    if (!canSave || settings === null || values === null) return
    setStatus('saving')
    try {
      await save({
        contactEmail: settings.contactEmail,
        theme: settings.theme,
        uiScale: settings.uiScale,
        aiBudgets: values
      })
      hydratedRef.current = project(values)
      setStatus('saved')
      timerRef.current = setTimeout(() => {
        timerRef.current = null
        setStatus('clean')
      }, 2000)
    } catch (e: unknown) {
      setStatus('dirty')
      showToast(e instanceof ApiClientError ? e.message : OP_FAILED, 'error')
    }
  }

  const inputStyle = { borderColor: 'var(--border)', background: 'var(--panel)' }

  function fieldRow(label: string, key: string): JSX.Element {
    const err = fieldErrors[key]
    return (
      <label key={key} className="flex items-center gap-2">
        <span className="w-20 text-xs" style={{ color: 'var(--text-dim)' }}>
          {label}
        </span>
        <input
          aria-label={label}
          className="syn-input w-24 rounded border px-2 py-1 text-xs"
          style={err !== undefined ? { ...inputStyle, borderColor: 'var(--danger)' } : inputStyle}
          inputMode="numeric"
          disabled={status === 'saving'}
          value={form[key] ?? ''}
          onChange={(e) => updateField(key, e.target.value)}
        />
        {err !== undefined && (
          <span className="text-xs" style={{ color: 'var(--danger)' }}>
            {err}
          </span>
        )}
      </label>
    )
  }

  function tierBlock(t: (typeof TIERS)[number]): JSX.Element {
    const tierErr = tierErrs[t.key] ?? null
    return (
      <div key={t.key} className="flex flex-col gap-1">
        <span className="text-xs font-medium">{t.label}</span>
        {TIER_FIELDS.map((f) => fieldRow(`${t.label} ${f.label}`, tierKey(t.key, f.key)))}
        {tierErr !== null && (
          <span className="text-xs" style={{ color: 'var(--danger)' }}>
            {tierErr}
          </span>
        )}
      </div>
    )
  }

  return (
    <div data-testid="ai-budget-section" className="flex flex-col gap-3 text-sm">
      {TIERS.map(tierBlock)}
      <div className="flex flex-col gap-1">
        <span className="text-xs font-medium">代理拉取</span>
        {AGENT_FIELDS.map((f) => fieldRow(`代理 ${f.label}`, `agent.${f.key}`))}
        {agentErr !== null && (
          <span className="text-xs" style={{ color: 'var(--danger)' }}>
            {agentErr}
          </span>
        )}
      </div>
      <div className="flex items-center gap-2">
        <Button variant="primary" size="sm" disabled={!canSave} onClick={() => void runSave()}>
          保存预算
        </Button>
        <Button variant="ghost" size="sm" disabled={status === 'saving'} onClick={resetDefaults}>
          恢复默认
        </Button>
        {status === 'saved' && (
          <span className="text-xs" style={{ color: 'var(--ok)' }}>
            {SAVED_TEXT}
          </span>
        )}
        <span className="text-xs" style={{ color: 'var(--text-dim)' }}>
          于下次对话生效
        </span>
      </div>
    </div>
  )
}
