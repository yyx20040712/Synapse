/**
 * [前端四期 B2] settings-category —— 设置页五类归并的分类单源与模块级会话态。
 *
 * ── 行为层 ──
 * - 五类 id/顺序/名称逐字=v2 设计稿 settings-nav（通用/外观/阅读与标注/
 *   AI 助手/数据与网络）；title=分类页题（settings-title h2 文案），
 *   description=页题副行（如实文案——v2 稿中未落地的开关项不誊录）
 * - 分类选中=模块级会话态（先例=DrCitation preferredFormat、reader.store
 *   researchOpen）：应用会话内记忆、不写持久化、重开应用回默认「通用」；
 *   卸载重挂经 readSessionCategory 恢复（useState 初始值单读）
 *
 * ── 接口层 ──
 * - export type SettingsCategoryId
 * - export const SETTINGS_CATEGORY_META: Record<SettingsCategoryId, { title; description }>
 * - export function readSessionCategory() / writeSessionCategory(id)
 *
 * ── 架构层 ── / ── 生命周期层 ── / ── 文化层 ──
 * - 纯数据件零依赖（图标驻 SettingsNav——JSX 件）；分类内容组装驻
 *   SettingsPage/各分类组件
 * - 测试：tests/unit/renderer/settings-categories.test.tsx（首例位纪律=
 *   模块态跨用例存续，dr-citation.test 同型注释）
 */

/** 五类 id（顺序=nav 顺序；v2 data-settings 键名） */
export type SettingsCategoryId = 'general' | 'appearance' | 'reading' | 'ai' | 'data'

/** 分类页题+副行（名称逐字；副行=如实文案） */
export const SETTINGS_CATEGORY_META: Record<
  SettingsCategoryId,
  { title: string; description: string }
> = {
  general: {
    title: '通用',
    description: '管理元数据请求标识等基础信息。'
  },
  appearance: {
    title: '外观',
    description: '调整长时间管理文献与阅读 PDF 时的界面亮度与字号密度。'
  },
  reading: {
    title: '阅读与标注',
    description: '阅读进度与标注的保存方式。'
  },
  ai: {
    title: 'AI 助手',
    description: '配置研究助手、预算与语料导出。所有网络请求均由你手动触发。'
  },
  data: {
    title: '数据与网络',
    description: '文献、批注与脉络保存在本机。出网仅用于手动元数据增强与连通诊断。'
  }
}

/** 模块级会话态：应用会话内记忆的分类选中（重开应用回默认「通用」） */
let sessionCategory: SettingsCategoryId = 'general'

export function readSessionCategory(): SettingsCategoryId {
  return sessionCategory
}

export function writeSessionCategory(id: SettingsCategoryId): void {
  sessionCategory = id
}
