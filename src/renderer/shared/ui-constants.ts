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

/** 剪贴板动作失败文案（[B3] DrCitation 与 usePaperDetailActions 同值收敛——
 *  quality 同值双常量门；库域动作型：无 CANCELLED 面，失败统一动作型） */
export const CLIP_FAILED = '复制到剪贴板失败'
/** 门控轮询周期（组件挂载期间——INV-14 成对清理） */
export const STATUS_POLL_MS = 5000
/** fixed 右键菜单菜单项类名（block 全宽行式菜单项——hover 浮起） */
export const MENU_ITEM_STYLE = 'block w-full rounded px-3 py-1.5 text-left text-xs hover:bg-black/5'
/**
 * [T3-P2] 主题名标签单一真相源（自 SettingsPage 提取——设置页下拉同源；键类型=
 * schemas AppSettings['theme'] 派生[门一 d1-N7 回炉：手写字面量非结构性单源——
 * schema 枚举变更时 tsc 兜底切断]）。[B1 暗色退役]两主题；文案=v2 设计稿设置
 * 卡片标题原文（正常模式/护眼模式）。[B5 C 2026-11-25] 状态条「主题：{名}」
 * 消费面随状态条整删退役（用户裁决——设计稿外）；现消费方=ThemeChoices。
 */
/**
 * [B4 L2 §8.4 末行] 多图未落库诚实 chip 文案（recovery 呈现件与决策文案件共用——
 * 单槽一次只保护一张图的限制外显；其余会话依靠 1.5s/切换/退出 flush）
 */
export const RECOVERY_UNPROTECTED_CHIP_TEXT = '多图有未落库修改：崩溃副本仅保护其中一张图，其余依赖自动落库'
/**
 * [回炉 W-B3·R-D1 / 用户裁决 D-1＝甲、适用面补充裁决＝乙] 过期历史出口文案（LineageStaleHistoryDrop——
 * 保存错误行内的动作钮与确认框）：撤销/重做被 history-unit 以 CONFLICT 拒绝后，栈顶这条历史项永久
 * 不可达（后进先出，其下更旧的历史都撤不到）。丢弃只从内存的撤销/重做历史里移除栈顶这一条，须
 * 用户点击并确认（不静默自动跳过），不写数据库
 */
export const LINEAGE_STALE_DROP_ACTION = '丢弃这条过期历史'
/** 确认框标题 */
export const LINEAGE_STALE_DROP_TITLE = '丢弃这条过期历史？'
/** 确认钮文案（确认才移除；取消／关闭／Escape＝不丢弃） */
export const LINEAGE_STALE_DROP_CONFIRM = '丢弃'
/** 确认框说明行（首行＝main 返回的具体拒因消息，原文显示） */
export const LINEAGE_STALE_DROP_NOTE = '只从内存的撤销/重做历史里移除栈顶这一条，不写数据库；移除后更早的历史可以继续撤销/重做。'

export const THEME_LABEL: Record<AppSettings['theme'], string> = {
  light: '正常模式',
  sepia: '护眼模式'
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
