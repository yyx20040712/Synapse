/**
 * [F-DBCAMP-01 DB-2 UI U6] budget-form —— 预算节表单纯逻辑件（字段序/投影/
 * 校验三则/文案常量；BudgetSection 拆件——250 行组件红线，渲染与逻辑分家）。
 *
 * ── 行为层 ──
 * - 字段序（§1.5：每档 5+agent 2=17 输入）与 aria-label 命名单源。
 * - project：AiBudgets→表单字符串投影（水合/恢复默认共用）。
 * - validate：整数≥0（负数/清空/非整数）+档内 l1+l2Cap+tail≤cap+agent
 *   perShot≤perRound——越界归 errors 不静默 clamp；文案与 shared refine
 *   message 同字面（ai-domain.ts 镜像互锚——zod 层终审，renderer 即时）。
 *
 * ── 接口层 ──
 * - export const TIER_FIELDS/TIERS/AGENT_FIELDS/validate/project/formEquals
 *
 * ── 架构层 ── / ── 生命周期层 ── / ── 文化层 ──
 * - 纯函数零依赖（零 React/IPC）——测试经 BudgetSection 组件面覆盖
 *  （tests/unit/renderer/budget-section.test.tsx）。
 */
import { AI_BUDGET_DEFAULTS, type AiBudgets } from '@shared/models/ai-domain'

/** 档级字段序（§1.5：上限/L1 cap/L2 片数/L2 cap/尾段——渲染与校验单源） */
export const TIER_FIELDS = [
  { key: 'cap', label: '上限' },
  { key: 'l1', label: 'L1 上限' },
  { key: 'l2Slices', label: 'L2 片数' },
  { key: 'l2Cap', label: 'L2 上限' },
  { key: 'tail', label: '尾段' }
] as const
export type TierKey = (typeof TIER_FIELDS)[number]['key']

export const TIERS = [
  { key: 'paper', label: '文献档' },
  { key: 'lineage', label: '脉络档' },
  { key: 'global', label: '全局档' }
] as const
export type TierScope = (typeof TIERS)[number]['key']

export const AGENT_FIELDS = [
  { key: 'perShot', label: '单发预算' },
  { key: 'perRound', label: '轮合计预算' }
] as const

/** 表单形状（扁平字符串 17 键——`tier.cap` / `agent.perShot`） */
export type BudgetForm = Record<string, string>

/** 校验文案（与 shared refine message 同字面——互锚不 import 提取） */
export const TIER_ERR = '预算档内合计超上限'
export const AGENT_ERR = '单次拉取预算不得超过单轮预算'
export const INT_ERR = '需为非负整数'

export function tierKey(s: TierScope, f: TierKey): string {
  return `${s}.${f}`
}

/** 预算对象→表单投影（水合/恢复默认共用——字符串化单源） */
export function project(b: AiBudgets): BudgetForm {
  const form: BudgetForm = {}
  for (const t of TIERS) {
    for (const f of TIER_FIELDS) {
      form[tierKey(t.key, f.key)] = String(b[t.key][f.key])
    }
  }
  form['agent.perShot'] = String(b.agent.perShot)
  form['agent.perRound'] = String(b.agent.perRound)
  return form
}

/** §9 默认投影（恢复默认/未载入兜底共用——冻结件禁直传，parse 取独立副本） */
export function defaultsForm(): BudgetForm {
  return project(AI_BUDGET_DEFAULTS)
}

/** 全表校验：整数三则+档内合计+agent 单发≤轮合计（不静默 clamp） */
export function validate(form: BudgetForm): {
  values: AiBudgets | null
  fieldErrors: Record<string, string>
  tierErrs: Partial<Record<TierScope, string>>
  agentErr: string | null
} {
  const fieldErrors: Record<string, string> = {}
  const tierErrs: Partial<Record<TierScope, string>> = {}
  let agentErr: string | null = null
  const num = (key: string): number | null => {
    const v = form[key] ?? ''
    if (!/^\d+$/.test(v)) {
      fieldErrors[key] = INT_ERR
      return null
    }
    return Number(v)
  }
  const values: AiBudgets = {
    paper: { cap: 0, l1: 0, l2Slices: 0, l2Cap: 0, tail: 0 },
    lineage: { cap: 0, l1: 0, l2Slices: 0, l2Cap: 0, tail: 0 },
    global: { cap: 0, l1: 0, l2Slices: 0, l2Cap: 0, tail: 0 },
    agent: { perShot: 0, perRound: 0 }
  }
  for (const t of TIERS) {
    for (const f of TIER_FIELDS) {
      const n = num(tierKey(t.key, f.key))
      if (n !== null) values[t.key][f.key] = n
    }
  }
  values.agent.perShot = num('agent.perShot') ?? 0
  values.agent.perRound = num('agent.perRound') ?? 0
  if (Object.keys(fieldErrors).length > 0) return { values: null, fieldErrors, tierErrs, agentErr }
  for (const t of TIERS) {
    const v = values[t.key]
    if (v.l1 + v.l2Cap + v.tail > v.cap) tierErrs[t.key] = TIER_ERR
  }
  if (values.agent.perShot > values.agent.perRound) agentErr = AGENT_ERR
  const legal = Object.keys(tierErrs).length === 0 && agentErr === null
  return { values: legal ? values : null, fieldErrors, tierErrs, agentErr }
}

/** 逐键相等（clean/dirty 判据——表单 vs 水合快照） */
export function formEquals(a: BudgetForm, b: BudgetForm): boolean {
  return Object.keys(a).every((k) => a[k] === b[k])
}
