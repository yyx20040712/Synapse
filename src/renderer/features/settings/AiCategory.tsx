/**
 * [前端四期 B2] AiCategory —— 设置页「AI 助手」分类内容。
 *
 * ── 行为层 ──
 * - 既有自持组件原样迁入对应分类，各自保存通道不动：AiAssistantSection（AI
 *   助手会话面板）→ AI 管理（AiManageSection 三 Tab）→ AI 预算
 *   （BudgetSection 受控注入）→ AI 语料导出（CorpusExportSection）→
 *   AI 联动（ZcodeLinkSection）
 * - 节序=E1 断言锚（AI 助手→AI 管理→AI 预算；插入点=AI 语料导出节前）
 *
 * ── 接口层 ──
 * - export function AiCategory(props: {
 *     settings: AppSettings | null; saving: boolean;
 *     onSave(payload: Partial<AppSettings>): Promise<void>
 *   }): JSX.Element
 *
 * ── 架构层 ── / ── 生命周期层 ── / ── 文化层 ──
 * - BudgetSection 受控注入沿承（ai 域件不 import settings 域 store——跨域
 *   props 化；保存载荷由 BudgetSection 组装全量四键，通道=settings.store.save）
 * - 测试：ai-budget/ai-manage-tabs/ai-sessions-panel/corpus-export/
 *   zcode-link（e2e 分类内承载面）+settings-categories.test.tsx（节标在场）
 */
import type { AppSettings } from '@shared/ipc/schemas'
import { BudgetSection } from '../ai/BudgetSection'
import { AiManageSection } from '../ai/manage/AiManageSection'
import { AiAssistantSection } from './AiAssistantSection'
import { CorpusExportSection } from './CorpusExportSection'
import { SettingsSection } from './SettingsSection'
import { ZcodeLinkSection } from './ZcodeLinkSection'

export function AiCategory(props: {
  settings: AppSettings | null
  saving: boolean
  onSave: (payload: Partial<AppSettings>) => Promise<void>
}): JSX.Element {
  return (
    <>
      {/* [F-DBCAMP-01 DB-3 U2] AI 助手壳（AiSessionPanel global 档） */}
      <AiAssistantSection />
      <SettingsSection title="AI 管理">
        {/* [U5] 管理=三 Tab 面板（任务/置顶消息/记忆——AiManageSection 自持） */}
        <AiManageSection />
      </SettingsSection>
      <SettingsSection title="AI 预算">
        {/* [U6] 受控注入：载荷由 BudgetSection 组装（全量四键），通道=settings.store.save */}
        <BudgetSection
          settings={props.settings}
          saving={props.saving}
          onSave={(payload) => props.onSave(payload)}
        />
      </SettingsSection>
      {/* AI-04：AI 语料导出节（自持组件——事件桥/终局 toast 在 App 层） */}
      <CorpusExportSection />
      {/* AI-10：zcode 联动节（自持组件——检测/装技能纯 fs，INV-21 零 spawn） */}
      <ZcodeLinkSection />
    </>
  )
}
