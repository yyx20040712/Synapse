[routing]: run=20260909233511-6kta source=kimi-main model=kimi-k3 switches=0 usage=in=1375,out=2907 latency=93109ms (by ds-call.mjs 链)

# F-LINT-03 门一终轮裁决（补证复核）

## 一、逐条降级裁决

### B-1 → **闭合（降 N）**
补证一给出 ui-constants.ts 全文，三常量导出/值/头注现可独立核验：
`export const OP_FAILED = '操作失败'` / `STATUS_POLL_MS = 5000` / `MENU_ITEM_STYLE = 'block w-full rounded px-3 py-1.5 text-left text-xs hover:bg-black/5'`。
内部自洽性核查通过：
- 头注消费清单 OP_FAILED×7 文件，与首轮所见「ACTION_FAILED×3+OP_FAILED×4 双名同文案」总数 7 精确吻合（3 旧名+4 新名→统一后 7 消费点）；
- `5000` 与头注「5s 门控轮询」一致；MENU_ITEM_STYLE 全串与头注描述一致。
**残留声明**：文件本体与仓库实物之间无 sha/哈希锚定，「此即实际落盘件」仍为主控陈述——但既有门二收口核对实物兜底，B-1 不再构成阻断。

### W-3 → **闭合**
补证二四文件消费上下文完全同构：
`showToast(e instanceof ApiClientError ? e.message : OP_FAILED, 'error')`（SettingsPage:59 / UiScaleSection:49 / WorkspaceSection:52 / WorkspaceSwitcher:56）。
与首轮已见三处（library/reader/settings-zcode）同语义=ApiClientError 兜底文案，「同文案不同语义被并入」之疑排除。四处均出现在 `e instanceof ApiClientError` 三元分支内，语义唯一，合并正当。

### W-1 → **降级为条件 N（未完全闭合）**
补证三给出的是**收口序申明**而非绿证实物：「门审毕→apply→verify→提交」，apply 后绿态 raw（f-lint03-closeout-verify.raw.txt）此刻仍不存在。原 W-1 要求的「apply 后绿态/提交尾注」**当庭依旧缺席**。
但：该时序本身符合 locks 设计（门审先于 baseline 棘轮更新，否则等于先锁后审），缺陷申报（unlock/lock 集合不对称需 chmod +w）如实。**裁决：不阻断放行，转为门二核对项**——门二必须核 raw 实物含 tickets/locks:check 311 + test 1562 全绿 + [locked-change] 尾注，缺一即回炉。另注：chmod +w 手工步骤为单点失败源，raw 中应见其执行痕迹。

### W-4 → **闭合（降 N）**
主控承认 `add -N` 失误并以补证一补全新增件本体，「全部改动 diff」口径冲突的根源已消除。**残留要求**：收口提交中 ui-constants.ts 须以正常 add 入库（非 intent-to-add 残留），门二核 git 状态确认。

## 二、新发现

**[N-1] 口径微张力——「8 组」两处用法不一。** 头注：「8 组真命中之三……全收敛」（本票收敛 3 组：OP_FAILED/轮询/菜单类名；TAG_OP_FAILED、COLUMN_GAP_*、ANNOTATION_BTN_CLASS 明言驻域件不动）。补证四：「lint:dup-constants 8→0」。若仅 3 组收敛，dup-constants 何以 8→0？合理解释=其余 5 组本为域内单源误报/已自洽，棘轮计数随规则重校归零——**逻辑可通但无 raw 支撑**，归收口绿证核对项，不独立阻断。

**[N-2] import 相对深度同构可疑（不确定）。** 补证二称四文件 import 均为 `'../../shared/ui-constants'`——四文件跨 settings/workspace 不同域，目录深度全同方可成立；若有任一文件嵌套更深（如 sections/ 子层），应为 `'../../../shared'`。grep 实录口径未含文件全路径，无法核验。**不确定，标记**：typecheck/build 在收口 raw 中必然捕获此类错误，故风险外溢可控。

**[N-3] W-2 收口接受 ANNOTATION_BTN_CLASS as btn 别名。** 单源已成立、别名仅为组件内短名，4 处引用少动——同意主控判断，维持 W 级知悉，不升级。

## 三、最终统计

| 条目 | 首轮 | 终轮 |
|---|---|---|
| B-1 | 阻断 | **闭合** |
| W-1 | 警告 | **条件 N**（转门二核 raw） |
| W-3 | 警告 | **闭合** |
| W-4 | 警告 | **闭合** |
| W-2 | 警告 | 维持知悉 |
| N-1/N-2 | — | 新增知悉×2，均挂收口 raw |

阻断项 0；警告残留 0（全部降级）；条件项 1（W-1→门二）；知悉 3。

## 四、终裁：**放行（附条件）**

B-1/W-3/W-4 补证充分闭合，无任何条目持阻断级证据。放行以门二强制核对以下为生效条件：
1. `f-lint03-closeout-verify.raw.txt` 实物——locks:apply 后 locks:check 311 / lint / typecheck / test 1562 / build 全绿 raw；
2. 提交尾注 `[locked-change]`（baseline+registry+证据件）；
3. ui-constants.ts 以正常 add 入库、旧名 grep=0、chmod +w 执行痕迹。

任一缺失→回炉。首轮「暂缓放行」之条件已满足至门一可证范围，余量移交门二实物核对。