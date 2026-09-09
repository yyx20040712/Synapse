/**
 * [F-LINT-03] ui-constants —— 跨域 UI 字面量常量单一出处（B-1 收敛落点）。
 *
 * 收敛前形态=同值常量散布 4 域 7 文件（ACTION_FAILED×3+OP_FAILED×4 双名同文案
 * 『操作失败』）+轮询周期两文件+菜单项类名串跨域两文件——B-1 baseline 棘轮 8 组
 * 真命中之三，2026-09-10 全收敛（值零变，仅声明收敛+引用名统一）。
 *
 * 消费清单：
 * - OP_FAILED：usePaperDetailActions / AiNotesStatus / ZcodeLinkSection /
 *   SettingsPage / UiScaleSection / WorkspaceSection / WorkspaceSwitcher
 *   （意外异常[非 ApiClientError]时的兜底中文消息——toast error 载体；
 *   ACTION_FAILED 旧名退役，统一 OP_FAILED）
 * - STATUS_POLL_MS：AiNotesStatus / ZcodeLinkSection（5s 门控轮询周期
 *   ——组件挂载期间，卸载清 interval，INV-14 成对）
 * - MENU_ITEM_STYLE：LineageNodeMenu / TagLifecycleMenu（fixed 右键菜单
 *   菜单项类名串——两处同型菜单项；原 ITEM_STYLE 旧名退役）
 *
 * 同域单源不驻本件：TAG_OP_FAILED（tags.store）/ COLUMN_GAP_*（pdf-item-
 * geometry）/ ANNOTATION_BTN_CLASS（annotation-style）——域内语义常量驻域件。
 */
/** 意外异常（非 ApiClientError）时的兜底中文消息 */
export const OP_FAILED = '操作失败'
/** 门控轮询周期（组件挂载期间——INV-14 成对清理） */
export const STATUS_POLL_MS = 5000
/** fixed 右键菜单菜单项类名（block 全宽行式菜单项——hover 浮起） */
export const MENU_ITEM_STYLE = 'block w-full rounded px-3 py-1.5 text-left text-xs hover:bg-black/5'
