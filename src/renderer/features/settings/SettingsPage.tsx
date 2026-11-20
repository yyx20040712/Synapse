/**
 * [SR-SET-01→前端四期 B2] SettingsPage —— 设置页（左侧五类导航+右侧当前分类）。
 *
 * ── 行为层 ──
 * - 五类归并（v2 settings-nav 顺序与名称逐字）：通用=联系邮箱；外观=主题两卡
 *   +界面缩放+宽屏只读说明行；阅读与标注=空态说明（不新增字段）；AI 助手=
 *   会话/管理/预算/语料导出/zcode 联动；数据与网络=白名单披露+诊断+同步密钥
 * - 分类选中=模块级会话态（settings-category.ts——会话内记忆、不持久化、
 *   重开应用回默认「通用」）
 * - 保存走 settings.store.save 全量载荷（set 通道 Req=完整 appSettingsSchema）；
 *   「通用」与「外观」两处保存按钮同一 runSave 链（email 校验+uiScale/aiBudgets
 *   兜底原样）；水合一次规则（hydratedRef 防抹草稿）保留
 *
 * ── 接口层 ──
 * - export function SettingsPage(): JSX.Element
 *
 * ── 架构层 ── / ── 生命周期层 ── / ── 文化层 ──
 * - 保存链与 email/theme 状态驻本件（两分类共享同一链）；分类内容拆件
 *   （组件 250 行上限——五类平铺装不下）；旧单列平铺结构已随方案切换删除
 * - 皮肤=settings.css（.syn-settings 作用域——v2 settings-page/settings-nav/
 *   setting-group 形态；旧分节卡+菱形分隔（DiamondRule）随 B2 方案切换删除，
 *   组件与 .lib-rule* 样式同批退役）
 * - 测试：settings-categories.test.tsx（五类面）+settings-page-enter.test.tsx
 *   （Enter 保存链——默认通用分类承载）
 */
import { useEffect, useRef, useState } from 'react'
import './settings.css'
import { ApiClientError } from '../../api/client'
import { showToast } from '../../shared/ui/Toast'
import { OP_FAILED } from '../../shared/ui-constants'
import { useSettingsStore } from './settings.store'
import { AiCategory } from './AiCategory'
import { AppearanceCategory } from './AppearanceCategory'
import { DataCategory } from './DataCategory'
import { GeneralCategory } from './GeneralCategory'
import { ReadingCategory } from './ReadingCategory'
import {
  readSessionCategory,
  writeSessionCategory,
  SETTINGS_CATEGORY_META,
  type SettingsCategoryId
} from './settings-category'
import { SettingsNav } from './SettingsNav'
import type { AppSettings } from '@shared/ipc/schemas'
import { AI_BUDGET_DEFAULTS, aiBudgetsSchema } from '@shared/models/ai-domain'

const SAVE_OK = '设置已保存'

/** [F-WS-02] workspaceSection 注入面随课题管理节退役删除（新管理面=
 *  workspaces 视图页 WorkspacesPage——App 直注 dirty；设置页回到零 props） */
export function SettingsPage(): JSX.Element {
  const settings = useSettingsStore((s) => s.settings)
  const saving = useSettingsStore((s) => s.saving)
  const load = useSettingsStore((s) => s.load)
  const save = useSettingsStore((s) => s.save)

  const [email, setEmail] = useState('')
  const [theme, setTheme] = useState<AppSettings['theme']>('light')
  // 分类选中：初始值单读模块会话态（卸载重挂恢复；新会话默认「通用」）
  const [category, setCategory] = useState<SettingsCategoryId>(readSessionCategory())

  // 载入后同步进表单（settings 到达晚于首帧）
  useEffect(() => {
    load().catch((e: unknown) => {
      showToast(e instanceof ApiClientError ? e.message : OP_FAILED, 'error')
    })
  }, [load])
  // 水合一次：settings 首次到达同步进表单；此后 store 更新（如 R2-SET1 点档
  // 保存成功）不再回填——防抹掉未保存草稿（门一 W1：改邮箱未保存时点缩放档，
  // store 替换触发回填即丢草稿）
  const hydratedRef = useRef(false)
  useEffect(() => {
    if (!hydratedRef.current && settings !== null) {
      hydratedRef.current = true
      setEmail(settings.contactEmail)
      setTheme(settings.theme)
    }
  }, [settings])

  function pickCategory(next: SettingsCategoryId): void {
    writeSessionCategory(next)
    setCategory(next)
  }

  function runSave(): void {
    if (saving) {
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      showToast('邮箱格式不正确', 'info')
      return
    }
    // uiScale/aiBudgets 随行全量携带：set 通道 Req=完整 appSettingsSchema
    // （register strict 校验+整体落盘），漏带会被 zod default 静默填默认——
    // uiScale 抹档位（INV-39）+aiBudgets 抹已存预算（同因接缝，U6 实修扩面）。
    // 档位/预算真值直读 store（F-G7 同口径）；未载入兜底=单源默认（aiBudgets
    // 经 schema parse 取独立可变副本——AI_BUDGET_DEFAULTS 冻结件禁直传改写面）
    save({
      contactEmail: email,
      theme,
      uiScale: settings?.uiScale ?? 'small',
      aiBudgets: settings?.aiBudgets ?? aiBudgetsSchema.parse(AI_BUDGET_DEFAULTS)
    })
      .then(() => showToast(SAVE_OK, 'success'))
      .catch((e: unknown) => {
        showToast(e instanceof ApiClientError ? e.message : OP_FAILED, 'error')
      })
  }

  const meta = SETTINGS_CATEGORY_META[category]

  return (
    // syn-settings 作用域（B2 五类归并）：左 nav 竖排全高+右内容区自身滚动
    // （settings-content overflow——文档本身不滚）；皮肤单源=settings.css
    <div className="syn-settings">
      <SettingsNav active={category} onPick={pickCategory} />
      <div className="settings-content">
        <div className="settings-inner">
          <header className="settings-title">
            <h2>{meta.title}</h2>
            <p>{meta.description}</p>
          </header>
          {category === 'general' && (
            <GeneralCategory
              email={email}
              onEmailChange={setEmail}
              saving={saving}
              onSave={runSave}
            />
          )}
          {category === 'appearance' && (
            <AppearanceCategory
              theme={theme}
              onThemePick={setTheme}
              saving={saving}
              onSave={runSave}
            />
          )}
          {category === 'reading' && <ReadingCategory />}
          {category === 'ai' && (
            <AiCategory settings={settings} saving={saving} onSave={(payload) => save(payload)} />
          )}
          {category === 'data' && <DataCategory />}
        </div>
      </div>
    </div>
  )
}
