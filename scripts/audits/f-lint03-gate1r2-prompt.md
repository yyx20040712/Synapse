# F-LINT-03 门一补证轮（Kimi 位——针对首轮 B-1/W-1/W-3/W-4）

你是门一对抗审查员（同席位续审轮）。首轮报告结论=「暂缓放行/小回炉补证
——若主控当庭出示 ui-constants.ts 内容与 apply 后全链绿证，本票可转放行」。
本包=补证材料。铁律同首轮：只读本文件；禁 npm/test/git；每条 [B|W|N]+证据
1 行；总输出 ≤2500 字；结尾给**最终统计+放行/回炉裁决**。

## 首轮 B/W 摘录（你的原结论）
- B-1：新单源 ui-constants.ts 全量缺席 diff，值/导出/头注不可独立核验。
- W-1：baseline 受锁闭环未证（未见 apply 后绿态/提交尾注）。
- W-3：SettingsPage/UiScale/WorkspaceSection/WorkspaceSwitcher 四文件
  OP_FAILED 消费上下文未见，不能排除同文案不同语义被并入。
- W-4：「全部改动 diff」口径与新增件冲突。

## 补证一：ui-constants.ts 全文（主控 add -N 失误致 diff 缺席——文件本体如下）

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

## 补证二：四文件 OP_FAILED 消费上下文（grep -B2 -A1 实录）

── SettingsPage.tsx:59 / UiScaleSection.tsx:49 / WorkspaceSection.tsx:52 / WorkspaceSwitcher.tsx:56——
四处完全同构：
`showToast(e instanceof ApiClientError ? e.message : OP_FAILED, 'error')`
（import 均为 `import { OP_FAILED } from '../../shared/ui-constants'`；与首轮
已见的三处 library/reader/settings-zcode 同语义=ApiClientError 兜底文案。）

## 补证三：locks 收口序申明（W-1 闭环路径）

主控收口序（本轮门审通过后执行）：①npm run locks:apply（manifest 同步
baseline 新 sha——因 unlock/lock 集合不对称缺陷需先 chmod +w，实现者已
如实申报）②npm run verify 全链 raw 真值回读（tickets/locks:check 311/lint/
typecheck/test 1562/build）③提交尾注 [locked-change]（含 baseline+
registry+证据件）。apply 后绿证 raw 将随收口提交入库（f-lint03-closeout-
verify.raw.txt）——审计时序=门审毕→apply→verify→提交（门二核对实物）。

## 补证四：值一字不动主控亲核记录

主控抽检（实现者毕后）：ui-constants.ts 三常量值逐字对照 baseline 指纹
（『操作失败』/5000/block w-full…hover:bg-black/5 全串）零差；8 组消费面
旧名残留 grep=0（仅注释历史说明）；lint:dup-constants 8→0；test 1562 零漂移。
W-2（ANNOTATION_BTN_CLASS as btn 别名）主控核：票面预裁名=ANNOTATION_BTN_
CLASS，组件内 as btn=4 处引用少动——单源已成立，收口确认接受（W 级知悉）。

## 工单
对 B-1/W-1/W-3/W-4 逐条降级裁决（补证是否闭合）+新发现（如有）+最终
统计+**放行/回炉终裁**。
