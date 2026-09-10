# F-LINT-04-T4PRE 门二终审报告（实证二审——异构统一档）

- 审查时点：2026-09-10，工作树=本票未提交面（HEAD=485549e641 同门一时点）
- 审查方式：只读实证（diff 亲读/六件机器面亲跑/check-tickets 规则逐条推演/门一 4N 逐项对终态复核），未改任何文件（本报告除外）、未跑 git 写、未跑 locks 命令
- 结论：**PASS 无条件——0 B / 0 W / 4 N（门一 4N 全数维持，无新增注记）**

## 清单 1：门一 4N 处置核对 —— [N] 全数维持、无漏处置

| 门一注记 | 终态实物复核（门二亲验） | 处置判定 |
| --- | --- | --- |
| N1 grep 字面 2 行 vs 代码口径 1 处 | 亲测同结论：`grep -rn "var(--warning" src/` 命中 TabBar.tsx:139（代码引用恰 1 处）+ theme.css:37（注释复述旧形态 `var(--warning,`）——代码口径成立，探针注释剥离不受扰 | 注记级不阻断，维持 |
| N2 T4 上线前 --warning 无测试锁 | 票面已注记（theme.test.ts 防漂移锁不加，T4 C-4c 上线后 R−D 锚反向护体）——决策在案；窗口风险五层缓解见门一审项 5，T4 为同战役紧邻票 | 注记级不阻断，维持 |
| N3 探针 VAR_DEF 不剥注释理论假绿口子 | 亲验现状：`grep -E "^\s*/\*.*--[a-z-]+:" theme.css` 零命中——`--xxx:` 起头注释形态现状空集，盲区不触发；加固建议归 T4 迁驻时 | 注记级不阻断，维持 |
| N4 manifest 工作副本 CRLF | git 提示 next touch 归一 LF——locks:generate 产物特性，.gitattributes 提交时自动归一，非本票引入 | 注记级不阻断，维持 |

## 清单 2：母本符合度 —— [B]

`git diff` 实测 4 文件，按性质二分与票面口径自洽：

| 文件 | 变更 | 性质 |
| --- | --- | --- |
| src/renderer/shared/theme.css | +3（2 行注释+1 行 `--warning: #ffa500;`） | 实现面（票内） |
| src/renderer/features/reader/TabBar.tsx | 1 行改（:139 `var(--warning, orange)` → `var(--warning)`） | 实现面（票内） |
| tickets/registry.ts | +1（立案行，status:'open'） | 流程配套（立案义务） |
| locks/manifest.json | generatedAt 刷新+探针 f-t4pre-rdw.mjs 条目 +4 | 流程配套（宪法「自产 scripts 即时 locks:generate+apply」义务） |

- 票面「非受锁 2 文件小批」与实现面恰 2 文件口径成立（registry/manifest 为流程义务配套，门一同口径）。
- 落位核验：theme.css :root 内 `--danger`(:35)/`--ok`(:36)/新注释(:37-38)/`--warning`(:39) 相邻——「状态色族（--danger/--ok 侧）」成立；diff hunk 行号与票面引用 TabBar.tsx:139 一致（hunk @@ -136,7 +136,7 @@ 第 4 行=139）。
- `--warning` 定义全仓恰 1 处（`grep -rEn "^\s*--warning\s*:" src/` 仅 theme.css:39）——零双定义。
- 死代码即删：orange 关键字代码面清零（残留仅注释叙述文字，合法）。

## 清单 3：宪法红线 —— [B]

- 无 TODO/FIXME/placeholder：两实现文件 grep 零命中（exit=1）。
- 无乱码：diff 中文注释可读（「警示状态色——TabBar dirty dot 事实色转正…」）；quality:check 乱码段亲跑通过。
- UTF-8：file 命令两文件均「UTF-8 text」权威判定。
- 无新依赖：diff 无 package.json/lockfile 触碰（4 文件全列于上，无 [dep-change] 面）。
- diff 范围：4 文件全部可归票（实现 2+流程 2），零蔓延；注释格式与文件既有 `/* [票号] 描述 */` 风格一致。

## 清单 4：机器面亲跑 —— [B] 六件全绿

1. **探针**：`node scripts/audits/f-t4pre-rdw.mjs` → `R=94 D=110 W=2`、`R−D−W=∅`、`EXIT=0` ✓（与门一 after.raw 数字自洽）。
2. **var(--warning 引用**：代码引用恰 1 处（TabBar.tsx:139）+注释 1 处（theme.css:37，清单①口径=N1 代码口径）✓。
3. **ffa500**：`grep -rn "ffa500" src/` 恰 theme.css:39 定义 1 处——零其他消费源（较清单预期「定义+注释」更净：注释未含 ffa500 字样，合规）✓。
4. **三段机器面**：`npm run quality:check` exit=0（含「无同值双常量新增」=C-4 ② 守卫实跑通过+无乱码+无占位三段）/ `npm run lint` exit=0 / `npm run typecheck` exit=0（node/web 双工程）——均亲跑真退出码 ✓。verify 全链采信主控 raw（f-t4pre-verify.raw.txt 在档，门一亲 cat：链头与 CI 同口径、162 文件/1579 用例、exit=0）。
5. **翻 done 推演**（check-tickets.mjs 规则逐条）：规则 0 白名单（F-LINT-04-T4PRE 匹配 `F(-[A-Z0-9]+)+`）过；规则 1 文件存在过；规则 2 `ticketRefRe=/SR2?-[A-Z]+-\d+/` 仅扫 SR 系——F 系注释引用合法且 theme.css（.css）不入 .ts/.tsx 扫描面、TabBar.tsx 零工单号引用（grep exit=1）过；规则 3 CSS 无 NotImplementedError/unimplementedObject 过；规则 4 F 系+done 不触发过；规则 4b 无 data-ticket/无 *_STUB 过——**翻 done 后 check-tickets 不红** ✓。

## 清单 5：成本账本

- 门二（本审）：工具调用 9 次（三批并行）；token 无代理侧精确读数，按宪法禁自估纪律不落估算值，以主控调度器侧回执读数为准。
- 门一（GLM 同源降级）：214,665 tok / 10 调用 / 264s（票面给定）。
- 主控自为实现：不单列（票面给定，F-SNAP-01 先例路径）。

## 总评

**PASS 无条件**。0 B / 0 W / 4 N（门一 4N 全数维持+门二零新增）。实现面恰两文件 3 行级零蔓延；token 落位/值/fallback 移除/行号全符票面；六件机器面亲跑全绿（探针 ∅+exit=0、代码引用恰 1 处、ffa500 恰定义 1 处、quality+lint+typecheck 三段真退出码 0）；翻 done 推演 check-tickets 六规则全过；宪法红线五面零触碰。收口义务（主控）：raw 三件+探针+门一/门二报告随收口提交显式列入库、registry 翻 done、提交尾注（非受锁小批无需 [locked-change]）。
