/**
 * [F-LINT-03] ui-constants —— 跨域 UI 字面量常量单一出处（B-1 收敛落点）。
 *
 * 收敛前形态=同值常量散布 4 域 7 文件（ACTION_FAILED×3+OP_FAILED×4 双名同文案
 * 『操作失败』）+轮询周期两文件+菜单项类名串跨域两文件——B-1 baseline 棘轮 8 组
 * 真命中之三，2026-09-10 全收敛（值零变，仅声明收敛+引用名统一）。
 *
 * 消费清单：
 * - OP_FAILED：usePaperDetailActions / ZcodeLinkSection /
 *   SettingsPage / UiScaleSection / WorkspacesPage（[F-WS-02] WorkspaceSection
 *   与 rail-shared 两消费面随课题管理面迁移/弹层退役删除；
 *   [F-UIRES-03 B2] AI 状态行组件消费面随阅读器 AI 区整删退役）
 *   （意外异常[非 ApiClientError]时的兜底中文消息——toast error 载体；
 *   ACTION_FAILED 旧名退役，统一 OP_FAILED）
 * - STATUS_POLL_MS：ZcodeLinkSection（5s 门控轮询周期
 *   ——组件挂载期间，卸载清 interval，INV-14 成对；
 *   [F-UIRES-03 B2] AI 状态行组件消费面随阅读器 AI 区整删退役）
 * - MENU_ITEM_STYLE：LineageNodeMenu / FolderMenu（fixed 右键菜单
 *   菜单项类名串——两处同型菜单项；原 ITEM_STYLE 旧名退役；TagDropdown
 *   行菜单已随 TagRowMenu 退役[F-UIRES-03 B1]）
 *
 * 同域单源不驻本件：TAG_OP_FAILED（tags.store）/ COLUMN_GAP_*（pdf-item-
 * geometry）/ ANNOTATION_BTN_CLASS（annotation-style）——域内语义常量驻域件。
 */
import type { AppSettings } from '@shared/ipc/schemas'

/** 意外异常（非 ApiClientError）时的兜底中文消息 */
export const OP_FAILED = '操作失败'
/** 门控轮询周期（组件挂载期间——INV-14 成对清理） */
export const STATUS_POLL_MS = 5000
/** fixed 右键菜单菜单项类名（block 全宽行式菜单项——hover 浮起） */
export const MENU_ITEM_STYLE = 'block w-full rounded px-3 py-1.5 text-left text-xs hover:bg-black/5'
/**
 * [T3-P2] 主题名标签单一真相源（自 SettingsPage 提取——状态条「主题：{名}」
 * 与设置页下拉同源；键类型=schemas AppSettings['theme'] 派生[门一 d1-N7 回炉：
 * 手写三值字面量非结构性单源——schema 枚举变更时 tsc 兜底切断]）
 */
export const THEME_LABEL: Record<AppSettings['theme'], string> = {
  light: '白天 · 精密仪表',
  dark: '夜间 · 深灰',
  sepia: '护眼 · 牛皮纸'
}

/**
 * [F-TAGS-01] 标签着色单源（INV-86：TagEditor chip / PaperRow 徽标——
 * 通用面同源消费，禁各面自写 hex 拼接。下拉行椭圆 chip 面=TagDropdownRow
 * 域内 tagChipStyle 分立双源[F-UIRES-03 B1 裁定]——B1 票面 18% 底+同色
 * 深阶文字形态公式，与本函数 22/66 底本不同形态分立合法，INV-86 在档）。
 * color 非空 → 背景 hex+22 / 边框 1px solid hex+66（8 位 hex alpha 后缀，
 * 零 color-mix 依赖）；null → undefined（消费面保持现状默认——accent-soft
 * 或类皮肤零变）。数据域用户身份色（非主题 token，见 shared/constants
 * TAG_COLOR_PRESETS 注），INV-11 不适用。
 */
export function tagColorStyle(
  color: string | null
): { background: string; border: string } | undefined {
  if (color === null) return undefined
  return { background: `${color}22`, border: `1px solid ${color}66` }
}
