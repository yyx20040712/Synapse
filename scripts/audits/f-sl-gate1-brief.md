# F-SL 门一对抗深审材料包（Kimi 链）

> 你是门一对抗审查员（Kimi）。工单=F-SL SelectionLayer 幽灵标注修复：reader.store.addAnnotation 从「按当下 activeId 追加」改为「(paperId, a) 按发起身份寻址」（照同文件 undo 范式 :438/:456-459）。病根母本=AUDIT-C C-3 扫描报告 §1.2-c+§五-3。对抗审查四件：票面母本符合度/宪法红线/代码与测试质量/报告诚实性（自裁逐条对 diff）。只报告有证据支撑的问题，每条【B/W/N+file:line 或 diff 摘录】。用中文。

**工作区声明**：仓库工作区并存另一票 F-D4 的未提交改动（import/workspace/schemas/ImportDropZone 等 11 文件+locks manifest）——**不在本票审查范围**。本材料包 diff 已按 F-SL 文件清单隔离（5 文件）；其中 docs/invariants.md 的 diff 含 INV-52 行（F-D4 登记行，随本 diff 带出仅因同文件），审 F-SL 只看 INV-03 行的扩写。

## 主控预裁项（可攻击，推翻需更强依据）

1. 签名改（而非新增方法+保留旧形态）：调用面全库清点=store 定义+ReaderPage 唯一生产接线+两个锁定测试；死代码纪律不留旧单参形态。
2. 接线=ReaderPage 闭包 `onSaved={(a) => addAnnotation(paperId, a)}`——paperId 取渲染帧 active tab（与 SelectionLayer props.paperId 同源同帧），身份捕获在接线层闭包，SelectionLayer props 契约零改（其头注「props 形状不变=挂载位契约零改」保持）。
3. AnnotationLayer 的 updateAnnotation/removeAnnotation 不在本票：map/filter 按 id 匹配写错 tab 天然 no-op（扫描报告在案：无害缺更新，毫秒窗）——只修追加面。
4. e2e 零改：reader-text.spec 划选保存面=单 tab 语境，签名变更对 e2e 透明。
5. locks 237 含 F-D4 门一 brief 生成器脚本（f-d4-gen-gate1-brief.mjs）的机械登记——该脚本=主控产物，产生时间（20:34）晚于 F-D4 实现者 verify（20:30）故其收口时未含；F-SL 实现者开工 locks:check 即红、机械 apply 登记（236→237）并申报，处置权归主控（主控裁定：保留——先例 f-r2e-gen-gate2-brief.mjs 入库入锁）。此为流程如实披露，非本票缺陷。

## 审查清单（六问）

1. 母本符合度：票面行为层三条（per-paperId 寻址不读 activeId/tab 缺席 no-op/接线闭包同帧捕获）逐条对照实现；实现与 undo 范式（reader.store.ts:437-468 既有代码）同构性？
2. 语义边界推演：①activeId 切走后 onSaved 落 A tab 内存——B 零污染+A 切回标注已在，推演成立？②tab 已关 no-op——DB 已落+重开从 DB 读对齐（与 undo :458 注释同语义），有数据丢失面吗？③保存成功但写 no-op 时 SelectionLayer 的 pushUndo/clearTabDirty（按 props.paperId）与新 no-op 语义有无错配？
3. 接线帧同步：ReaderPage 渲染帧 paperId 与 SelectionLayer props.paperId 真同帧吗（同一渲染周期快照）？await 回调执行时闭包 paperId=发起帧值（不受后续重渲影响）——推演？
4. 测试：两新用例真能失败（对照红证据恰 4 红：2 新红+2 既有改参后因实现未动而红）？前置防恒真断言（activeId 确为 p-2/tabs[p-1] 确 undefined）价值？变异 M1（恢复 activeId 寻址→用例①红）锁定面独立？既有两处改参后语义保持（undo-race 测试的并发路径注释仍准确）？
5. 宪法红线：受锁流程（两测试 [locked-change]+locks:unlock/apply）？新 describe always-active（不经 guardedDescribe——K3 纪律）？行数/UTF-8/中文注释？禁新依赖？
6. 接缝：全库 addAnnotation 旧签名引用清零（tsc 保证——typecheck 在 verify 链）？INV-03 扩写格式与既有行文（per-tab 变体段）一致性？头注旧 setter 列表的例外标注准确？

## 证据关键段（全文在库，此为摘录）

### f-sl-verify.raw.txt 尾部（verify 真退出码）

```
(!) E:/class/智慧水务/Synapse_remake/node_modules/pdfjs-dist/build/pdf.mjs is dynamically imported by E:/class/智慧水务/Synapse_remake/src/renderer/features/reader/CorpusExtractor.ts but also statically imported by E:/class/智慧水务/Synapse_remake/src/renderer/features/reader/PdfDocProvider.tsx, E:/class/智慧水务/Synapse_remake/src/renderer/features/reader/PdfPageCanvas.tsx, E:/class/智慧水务/Synapse_remake/src/renderer/features/reader/TextLayer.tsx, dynamic import will not move module into another chunk.
[39m
[1m[33m[plugin:vite:reporter][39m[22m [33m[plugin vite:reporter] 
(!) E:/class/智慧水务/Synapse_remake/node_modules/pdfjs-dist/build/pdf.worker.min.mjs?url is dynamically imported by E:/class/智慧水务/Synapse_remake/src/renderer/features/reader/CorpusExtractor.ts but also statically imported by E:/class/智慧水务/Synapse_remake/src/renderer/features/reader/PdfDocProvider.tsx, dynamic import will not move module into another chunk.
[39m
rendering chunks...
[2m../../out/renderer/[22m[32mindex.html                          [39m[1m[2m    0.88 kB[22m[1m[22m
[2m../../out/renderer/[22m[32massets/pdf.worker.min-yatZIOMy.mjs  [39m[1m[2m1,375.84 kB[22m[1m[22m
[2m../../out/renderer/[22m[35massets/index-BnbUs7aC.css           [39m[1m[2m   44.34 kB[22m[1m[22m
[2m../../out/renderer/[22m[36massets/index-CJ-yhuXp.js            [39m[1m[33m1,308.40 kB[39m[22m
[32m✓ built in 1.63s[39m
exit=0
```

### f-sl-red.raw.txt 尾部（首红，全量套跑口径，恰 4 红）

```
    [90m510| [39m  })
    [90m511| [39m})

[31m[2m⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[3/4]⎯[22m[39m

[31m[1m[7m FAIL [27m[22m[39m tests/unit/renderer/reader-store-undo-race.test.ts[2m > [22mF-ARCH2 undo 并发编辑不覆盖（回归锁）[2m > [22mrunUndo 挂起窗口内的 addAnnotation 在 undo 落地后保留（remove 型）
[31m[1mAssertionError[22m: expected false to be true // Object.is equality[39m

[32m- Expected[39m
[31m+ Received[39m

[32m- true[39m
[31m+ false[39m

[36m [2m❯[22m tests/unit/renderer/reader-store-undo-race.test.ts:[2m76:46[22m[39m
    [90m 74| [39m    [90m// 撤销的 a-1 移除 + 并发的 a-2 保留——两者同时成立[39m
    [90m 75| [39m    [34mexpect[39m(list[33m.[39m[34msome[39m((x) [33m=>[39m x[33m.[39mid [33m===[39m [32m'a-1'[39m))[33m.[39m[34mtoBe[39m([35mfalse[39m)
    [90m 76| [39m    [34mexpect[39m(list[33m.[39m[34msome[39m((x) [33m=>[39m x[33m.[39mid [33m===[39m [32m'a-2'[39m))[33m.[39m[34mtoBe[39m([35mtrue[39m)
    [90m   | [39m                                             [31m^[39m
    [90m 77| [39m  })
    [90m 78| [39m})

[31m[2m⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[4/4]⎯[22m[39m

[2m Test Files [22m [1m[31m2 failed[39m[22m[2m | [22m[1m[32m125 passed[39m[22m[90m (127)[39m
[2m      Tests [22m [1m[31m4 failed[39m[22m[2m | [22m[1m[32m1099 passed[39m[22m[90m (1103)[39m
[2m   Start at [22m 20:40:06
[2m   Duration [22m 27.03s[2m (transform 11.47s, setup 0ms, collect 46.58s, tests 13.75s, environment 288.44s, prepare 71.04s)[22m

exit=1
```

### f-sl-mutation-m1.raw.txt 尾部（变异红证：恢复 activeId 寻址→用例①红）

```
[31m+     "updatedAt": "t",[39m
[31m+   },[39m
[31m+ ][39m

[36m [2m❯[22m tests/unit/renderer/reader.store.test.ts:[2m509:40[22m[39m
    [90m507| [39m    [34mexpect[39m(s[33m.[39mtabs[[32m'p-1'[39m])[33m.[39m[34mtoBeUndefined[39m()
    [90m508| [39m    [34mexpect[39m(s[33m.[39mactiveId)[33m.[39m[34mtoBe[39m([32m'p-2'[39m)
    [90m509| [39m    [34mexpect[39m(s[33m.[39mtabs[[32m'p-2'[39m][33m?.[39mannotations)[33m.[39m[34mtoEqual[39m([])
    [90m   | [39m                                       [31m^[39m
    [90m510| [39m  })
    [90m511| [39m})

[31m[2m⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[2/2]⎯[22m[39m

[2m Test Files [22m [1m[31m1 failed[39m[22m[2m | [22m[1m[32m126 passed[39m[22m[90m (127)[39m
[2m      Tests [22m [1m[31m2 failed[39m[22m[2m | [22m[1m[32m1101 passed[39m[22m[90m (1103)[39m
[2m   Start at [22m 20:42:04
[2m   Duration [22m 29.31s[2m (transform 13.60s, setup 0ms, collect 53.73s, tests 14.72s, environment 315.58s, prepare 74.20s)[22m

exit=1
```

## 票面全文

# F-SL 修票票面 —— SelectionLayer 幽灵标注（addAnnotation 按 paperId 寻址）

> 来源=AUDIT-C C-3 扫描报告 §1.2-c+§五-3（scripts/audits/audit-c-scan.md，对抗审核在档）。
> 四波场第二票（与 F-D4 无接缝——本票只动 reader 域 renderer 面）。
> 病根=SelectionLayer.save 的 await 窗口内切 tab，onSaved 接线按**当下 activeId**
> 追加——A 文献的标注进 B 的 tab.annotations（幽灵标注，内存态；DB 落 A 行正确）。

## 〇、病根证据

- SelectionLayer.tsx:211-212：`await unwrap(api.reader.saveAnnotation({ paperId, ... }))`
  （paperId=props=发起时身份，DB 写正确）→ `onSaved(saved)`；
- ReaderPage.tsx:70+188：`onSaved={addAnnotation}`（store action，无参数化身份）；
- reader.store.ts:390-392：addAnnotation 经 updateActiveTab（:220-226）按**当下
  activeId** 追加——await 窗（本地毫秒级）内切 tab→错 tab 追加。
- 同文件正确范式（照抄对象）=reader.undo：reader.store.ts:438（activeId 在 await 前
  捕获）+:456-459（await 后 `tabs[paperId]` 存在核对，tab 被关→不追写，注释在案）。
- AnnotationLayer 的 update/remove 不在本票：map/filter 按 id 匹配写错 tab 天然
  no-op（扫描报告 §1.2-c 在案：无害缺更新，毫秒窗）——**本票只修追加面**。

## 一、行为层

- `addAnnotation` 签名改：`addAnnotation(paperId: string, a: Annotation): void`。
- 实现照 undo 范式：`tabs[paperId]` 缺席（tab 已关）→**no-op**（DB 已落，重开 tab
  从 DB 读对齐——与 undo :458 关 tab 路径同语义）；存在→按 paperId 追加（不读
  activeId）。
- ReaderPage.tsx:188 接线改 `onSaved={(a) => addAnnotation(paperId, a)}`（paperId=
  渲染时 active tab 的 paperId——与 SelectionLayer props.paperId 同源同帧）。
- SelectionLayer props 契约**零改**（头注「props 形状不变=挂载位契约零改」保持；
  onSaved: (a: Annotation) => void 不动——身份捕获在接线层闭包）。
- 语义边界：activeId 切走后 onSaved 落 A tab 内存（B 不受污染，A 切回标注已在）；
  undo 栈/clearTabDirty 仍按 props.paperId（SelectionLayer.tsx:214/:216 既有，正确
  不动）。

## 二、接口层

- reader.store.ts：addAnnotation 新签名（接口声明 :154+实现 :390 同步改）。
- ReaderPage.tsx：选择器 :70 不变（action 引用恒定），接线 :188 改闭包传参。

## 三、架构层

- 只动 reader 域两文件+受锁测试；不触 SelectionLayer/AnnotationLayer/shared。
- 死代码纪律：旧单参形态不留（调用面全数迁移——ReaderPage 唯一生产调用点）。

## 四、生命周期层（测试锚——TDD 红→绿先行）

1. **reader.store.test.ts（受锁，[locked-change]）**：
   - :91/:114 既有调用改双参（语义不变）；
   - 新用例①「activeId=B 时 addAnnotation('p-A', ann) 写 A 的 tab，B 的
     annotations 不变」（开两 tab 后切 B 再写 A）；
   - 新用例②「paperId 的 tab 已关→no-op 不炸且其余 tab 不受影响」。
2. **reader-store-undo-race.test.ts（受锁，[locked-change]）**：:65/:70 改双参
   （注释「SelectionLayer→addAnnotation 路径」保留——路径含义=经 ReaderPage 接线）。
3. ReaderPage 接线面：grep tests/ 确认是否有断言 onSaved 接线的既有测试，有则同步
   （预期无——SelectionLayer 测试用 onSaved 桩，不感知 store 签名）。
4. e2e 零改（reader-text.spec 划选保存面=单 tab 语境，签名变更对 e2e 透明）。

## 五、文化层

- reader.store.ts 头注 :49 旧 setter 列表注释同步（addAnnotation 标注 per-paper 寻址）；
  实现 :390 处加一行边界注释（照 undo :458 口径）。
- docs/invariants.md：**INV-03 扩写**（写方向同族条款——「写方向守卫=await 前捕获
  身份+await 后按身份寻址，tab 缺席 no-op；undo（:438/:456）与 addAnnotation（本票）
  双先例」）。扩写格式照 INV-03 既有 per-tab 变体段。
- 禁新依赖；UTF-8；中文注释。

## 六、纪律与证据契约（三屋）

- TDD：先红（新用例①②）→实现→绿；断言级变异红证≥1（建议：addAnnotation 恢复
  按 activeId 寻址→用例①红）。
- `npm run test` 禁裸 npx vitest；首红全量套跑口径。
- 证据落盘 `.raw.txt`（scripts/audits/）：f-sl-red / f-sl-green / f-sl-mutation-*；
  verify 真退出码 `echo exit=$? >>`。
- 受锁测试改动走 locks:unlock→改→locks:apply（无新受锁路径则不 generate）。
- 基线：以 F-D4 收口后的用例数/locks 数为准（如 F-D4 先行）——如实报实测值。
- 禁 git add/commit/push；禁翻 tickets/registry；卡点=BLOCKED 停手。
- 报告全文落 scripts/audits/f-sl-impl.report.md；回复五行内。
- 必读序：AGENTS.md→本票面→audit-c-scan.md §1.2-c→reader.store.ts:437-468（undo
  范式）→ReaderPage.tsx:58-70+186-190（接线）→tests/unit/renderer/reader.store.test.ts
  :83-120 与 reader-store-undo-race.test.ts 全文。


## 实现报告全文（含自裁申报）

# F-SL 实现报告 —— SelectionLayer 幽灵标注（addAnnotation 按 paperId 寻址）

> 实现者=GLM5.3flash 实现位（三屋，2026-09-02）。票面=scripts/audits/f-sl-brief.md（五层规约全项落实）。
> 结论：**完成**。verify 真退出码=0（127 文件 / 1103 用例全绿）。一处超票面事项见「六、自裁申报」（F-D4 残留致开工前 locks:check 基线红，已取证、未代修）。

## 一、实现摘要

病根：SelectionLayer.save 的 await 窗口内切 tab，onSaved→addAnnotation 经 updateActiveTab 按**当下 activeId** 追加——A 文献标注进 B 的 tab.annotations（幽灵标注，内存态；DB 落 A 行正确）。修复照 undo 范式（reader.store.ts:438 捕获身份 / :456-459 按身份寻址+缺席 no-op）：

- **reader.store.ts**：`addAnnotation(paperId: string, a: Annotation)` 签名双参化（接口 :154+实现同步）；实现不读 activeId，按 `tabs[paperId]` 寻址；tab 缺席（已关）→ no-op（DB 已落，重开自 DB 读对齐——与 undo :458 关 tab 路径同语义，边界注释在案）。头注 :49 旧 setter 列表同步（addAnnotation 移出 active-tab 组，标注 per-paper 寻址+病根引用）。
- **ReaderPage.tsx**：:188 接线改 `onSaved={(a) => addAnnotation(paperId, a)}`——paperId=渲染帧 active tab 的 paperId，与 SelectionLayer props.paperId 同源同帧（身份捕获在接线层闭包）。选择器 :70 不变（action 引用恒定）。SelectionLayer props 契约零改（`onSaved: (a: Annotation) => void` 不动）。
- 语义边界核验：activeId 切走后 onSaved 落 A tab 内存（B 不受污染，A 切回标注已在）=用例①锁定；tab 已关 no-op=用例②锁定。undo 栈/clearTabDirty 仍按 props.paperId（SelectionLayer.tsx:214/:216 既有，未触碰）。

## 二、文件清单（改动面=票面 5 文件，无删减）

| 文件 | 改动 | 行数 |
|---|---|---|
| src/renderer/features/reader/reader.store.ts | 接口/实现/头注（如上） | 483（≤500） |
| src/renderer/features/reader/ReaderPage.tsx | :188 接线闭包+注释 | 228（≤250） |
| tests/unit/renderer/reader.store.test.ts [locked] | :91/:114 双参迁移；新 always-active 组两用例 | 511（tests 豁免 max-lines） |
| tests/unit/renderer/reader-store-undo-race.test.ts [locked] | :65/:70 双参迁移（:68 注释原文保留） | 78 |
| docs/invariants.md [locked] | INV-03 扩写（写方向同族条款，格式照 per-tab 变体段；先例/锁定列同步） | 74 |

git diff --stat（我 5 文件）：`5 files changed, 70 insertions(+), 13 deletions(-)`（invariants.md 计数含 F-D4 既有未提交行，我的 INV-03 改动=单行替换）。F-D4 的 11 文件零触碰（git status 佐证）。新测试 always-active（F-SL 组独立 describe，不经 guardedDescribe——照 F-ARCH1 先例）。

## 三、TDD 证据（全量套口径 `npm run test`，禁裸 npx vitest）

- **红**（f-sl-red.raw.txt，`exit=1`）：`Tests 4 failed | 1099 passed (1103)`；`Test Files 2 failed | 125 passed (127)`。红集恰=预期签名失配面：新用例①②＋两处既有调用迁移（"setPage 边界夹取…addAnnotation 追加"组＋undo-race F-ARCH2）；:114 组（无 tab no-op）红相下仍绿（无 tab 本就 no-op，语义不变）。F-D4 面全绿（基线佐证）。
- **绿**（f-sl-green.raw.txt，`exit=0`）：`Test Files 127 passed (127)`、`Tests 1103 passed (1103)`＝基线 1101+新 2，与派发单预期 1103±吻合（实测 1103）。
- **变异红证 M1**（f-sl-mutation-m1.raw.txt，`exit=1`）：addAnnotation 临时恢复按 activeId 寻址（updateActiveTab 旧形态）→**恰新用例①②红**（断言级命中：①A tab 无标注/B 被污染，②已关 tab no-op 破坏），余 1101 全绿。还原用文件备份法（cp 备份→变异→测→cp 还原→`diff` 空，全程无 git checkout——未提交实现保护），变异标记 grep 无踪。

## 四、verify（f-sl-verify.raw.txt，`exit=0`）

quality+ tickets+ locks+ lint+ typecheck+ test+ build 全链绿；测试段=127 文件/1103 用例。TODO/FIXME/placeholder grep：我 5 文件零命中（todo-grep-exit=1）；中文 UTF-8（quality mojibake 关卡绿）。

## 五、locks 实录（f-sl-locks-apply.raw.txt）

改前自检：`locks:check` **红 exit=1**（开工前既有，根因见自裁申报 #1，与我的改动无关）→ `locks:unlock`（237 文件）→ 改 2 受锁测试 → INV-03 扩写 → `locks:apply`（exit=0，237 条）→ `locks:check` **绿 exit=0**。无新受锁路径（未 generate）。manifest 对账：vs F-D4 收口态（236）=我的 3 受锁文件哈希变化＋**1 新条目（F-D4 残留，见申报）**→237；vs HEAD 另含 F-D4 既有未提交面（import-dropzone.test.tsx 等，非我）。verify 运行期间未动任何受锁面（apply 先于 verify 完成）。

## 六、自裁申报

1. **开工前 locks:check 基线红（F-D4 残留，未代修，取证在案）**：`scripts/audits/f-d4-gen-gate1-brief.mjs`（F-D4 门一材料生成器）未登记而落受锁 pattern。时间线：F-D4 verify 绿 20:30（f-d4-verify.raw.txt exit=0）→ 报告 20:32 → 门一材料生成 20:34（残留诞生，**晚于其 verify**）；唯一性：全仓唯一未登记 .mjs（f-a4/f-a5 同型脚本惯例均登记）。我的处置：不删不改该文件（F-D4 面+可能仍在门一流中使用）→ 推进本票 → locks:apply 机械登记之（236→237，check 转绿的唯一路径）。**处置权归主控**：甲=删残留+重新 apply 回 236（我的哈希不受影响）；乙=保留 237 随 [locked-change] 提交。若判我应停手为 BLOCKED，本票实现+证据已全，仅此一处非我面偏差。
2. 其余零超票面：无票面外文件触碰、无依赖变更、无断言放宽（既有断言仅随签名双参化迁移，语义原文保留）、无删减面。

## 七、疑虑

- 无阻塞疑虑。备查两点：① ReaderPage onSaved 闭包每渲染新引用——SelectionLayer 无 React.memo（props 契约零改），无重渲染失效面；② 变异期 `void paperId` 占位仅为可运行性保留，已随备份还原消失（grep 无踪）。


## diff 全文（按 F-SL 文件清单隔离，5 文件）

### --stat

```
 docs/invariants.md                                 |  3 +-
 src/renderer/features/reader/ReaderPage.tsx        |  6 ++-
 src/renderer/features/reader/reader.store.ts       | 25 +++++++++---
 tests/unit/renderer/reader-store-undo-race.test.ts |  4 +-
 tests/unit/renderer/reader.store.test.ts           | 45 +++++++++++++++++++++-
 5 files changed, 70 insertions(+), 13 deletions(-)

```

```diff
diff --git a/docs/invariants.md b/docs/invariants.md
index 507380ea8..cc6c4349f 100644
--- a/docs/invariants.md
+++ b/docs/invariants.md
@@ -14,7 +14,7 @@
 | --- | --- | --- | --- | --- |
 | INV-01 | 文档永不滚：所有滚动只发生在应用内 overflow 容器（main / 阅读器滚动区） | theme.css html/body/#root overflow:hidden | e2e 计算样式断言（reader-text.spec 三层 overflow 必须全 hidden） | 已锚定（2026-08-23 UBS；取证注记：内容度量可合法超出被裁剪，几何断言形状不可用——锁的是声明形状，见 95c3f3f） |
 | INV-02 | 用户触发的动作失败必须可见（toast / 内联红条），禁止静默吞错 | AGENTS 文化层；U1（内联红条）/U6（store.error+watch）两个修复模式 | 人审 + 工单模板条款（规约锚定；模板=scripts/new-ticket.ps1 文化层） | **部分**（lint 化不可行有实证：blanket 空 catch 禁令误伤三处合法尽力而为——ipc/settings.ts:52/reader.store.ts:90/import.service.ts:171，见 b774d5c；规约化已落 new-ticket.ps1 文化层） |
-| INV-03 | 一切含异步 load 的 store 必须有请求序号 stale-guard（旧响应/旧失败不得覆盖新状态；跨通道乱序面见 settings 版本计数变体；异步 hook 同族见 useAsync 请求令牌——被取代调用的迟到 settle 一律丢弃，loading 只由最新请求熄灭；**per-tab 变体（2026-08-24 SR2-TABS-01）：多 tab 并发加载下守卫粒度=tab 级——迟到响应三规则：①tab 已关→丢弃 ②tab 被新一轮加载顶替→丢弃 ③tab 存在且最新→写入该 tab 自身（不得覆盖展示中的其他 tab），换 tab 不失忆**） | library/notes/tags/reader 四 store 先例（闭包 loadSeq）+ settings 版本计数（仅成功落地抬升）+ useAsync runSeq + reader.store per-tab（loadSeq 总序+tabLoadSeq 字典） | 五 store 单测锁定（notes/tags/library 既有 + reader/settings 2026-08-23 UBS 补；reader 2026-08-24 SR2-TABS-01 重锚为 per-tab 18 用例）+ useAsync.test 三面锁定（迟到旧失败/迟到旧成功/loading 误熄） | 已锚定 |
+| INV-03 | 一切含异步 load 的 store 必须有请求序号 stale-guard（旧响应/旧失败不得覆盖新状态；跨通道乱序面见 settings 版本计数变体；异步 hook 同族见 useAsync 请求令牌——被取代调用的迟到 settle 一律丢弃，loading 只由最新请求熄灭；**per-tab 变体（2026-08-24 SR2-TABS-01）：多 tab 并发加载下守卫粒度=tab 级——迟到响应三规则：①tab 已关→丢弃 ②tab 被新一轮加载顶替→丢弃 ③tab 存在且最新→写入该 tab 自身（不得覆盖展示中的其他 tab），换 tab 不失忆**；**写方向同族（2026-09-02 F-SL）：写回动作必须发起前捕获身份+落笔时按身份寻址——目标 tab 缺席（已关）→ no-op（DB 已落，重开自 DB 读对齐）；双先例=reader undo（activeId 捕获+tabs[paperId] 核对后追写）与 addAnnotation（签名 (paperId,a) per-paperId 寻址——SelectionLayer 保存 await 窗内切 tab 幽灵标注修复）**） | library/notes/tags/reader 四 store 先例（闭包 loadSeq）+ settings 版本计数（仅成功落地抬升）+ useAsync runSeq + reader.store per-tab（loadSeq 总序+tabLoadSeq 字典）+ reader 写方向双先例（undo 与 addAnnotation 按捕获身份寻址，F-SL） | 五 store 单测锁定（notes/tags/library 既有 + reader/settings 2026-08-23 UBS 补；reader 2026-08-24 SR2-TABS-01 重锚为 per-tab 18 用例）+ useAsync.test 三面锁定（迟到旧失败/迟到旧成功/loading 误熄）+ F-SL 写方向两用例（activeId 切走仍写发起 tab/目标 tab 已关 no-op，always-active） | 已锚定 |
 | INV-04 | 保存失败不推进 savedAt（失败 = 未保存态延续，下次编辑自然重试） | notes.store 错误契约 | notes.store.test 锁定 | 已锚定 |
 | INV-05 | 标注矩形两路径同口径：划选保存与重开重锚走同一 mergeLineRects 几何 | annotation-anchor.ts rectsBetweenPoints 单点收口 | 单测 + e2e 计数断言 | 已锚定 |
 | INV-06 | e2e「看见」类断言必须含计算样式（颜色/opacity/blend）——几何可见 ≠ 视觉可见（教训 D1/L7 两度兑现） | reader-text.spec 先例（highlight/underline/note 三链） | e2e | 已锚定（2026-08-23 UBS 补 underline 2px 实条+底边贴合+宽度、note ≥8px 色块两链，三 kind 全覆盖） |
@@ -64,6 +64,7 @@
 | INV-49 | pdfjs 文档生命周期销毁序（F-R3，2026-09-02 AUDIT-C C-1 修票）：①**worker-per-task 事实**——每个未传 worker 的 loadingTask 自带专属 PDFWorker，destroy=唯一终止口；应用面两个创建点句柄必须在册：PdfDocProvider（task 常量+cleanup destroy——既有）与 CorpusExtractor loadPdfDocument（**失败也释放**——settleLoadTask：失败路径 destroy 恰一次且自身拒绝吞并、**await settle 后**重抛原错误；成功路径零 destroy，doc.destroy 归 runExtraction finally——P6 泄漏面已闭）；②**destroy 竞态窗=接受残余**——destroy 落流加载窗内时 pdfjs 4.10.38 worker 泵产生 worker 世界 unhandled rejection（`Error: Worker was terminated`，经 CDP 汇入 pageerror 仪表通道），定性=devtools-only 噪声非破坏型（用户路径零影响，6/6 健康在档）；**不升级裁决**：v5.5.207 已修主逃逸点（onFailure 终接守卫）但同族悬尾（pdfManagerReady 链）master 仍在+destroy() 族硬化（claim 拒绝+_setupCapability）仅 6.3.289 起——任一档位不承诺零同族噪声，跨 major 回归面（INV-30/INV-16/P1 形状/e2e 全量重验）不换 devtools-only 收益（档案=scripts/audits/f-r3-upstream-check.md，逐 tag 可复现）；**升级再评估触发条件**=上游悬尾族全消时连同 destroy() 族硬化一并重评；③监控锚=主进程 console-message level1「getTextContent - ignoring errors…Worker task was terminated」代理计数（F-R3 探针 r7 实证可收）——仅监控不设阈 | PdfDocProvider.tsx 文档生命周期 effect+CorpusExtractor.ts settleLoadTask 与头注状态机表+scripts/audits/f-r3-investigation.md（排查闭环）+f-r3-upstream-check.md（上游查证档案）（F-R3，2026-09-02 登记） | 单测（corpus-extractor.test settleLoadTask 四径：成功不调 destroy/失败 destroy 恰一次/destroy 自身拒绝吞并不覆盖原错误/重抛在 destroy settle 之后——主控补变异 A/B/C 红证在档）——噪声本体无应用面机器断言（库内缺陷接受残余，监控=主进程代理计数备案） | 部分（泄漏面已锚单测级；噪声面=显式接受残余+监控备案） |
 | INV-50 | 弃改=完整弃改（A3，2026-09-02 AUDIT-C C-3 扫描 §1.2-a 修票）：用户显式弃改确认后 notes 悬置面全闭三件套——①**discard API**（notes.store discardPendingEdit/discardAllPendingEdits：清防抖 timer+pendingEdit/touchedFields/lastEditedAt/editSeq 四元数据+条目删除，全幂等）；②**in-flight 代际守卫**（saveSoon 派发快照 discardGen，.then/.catch 回调首行代际已变=全 no-op——防回调经 draftOf 重建已删条目/复活 pending 镜像）；③**接线两点**（tab-dirty confirmCloseDirty 守门内=弃改收口点，**一切 tab 关闭路径必经本守门**——TabBar 双点两位在案；workspace.store switchTo 确认后/await invoke 前=切课题收口，跨域受控例外=check-quality COMPOSITION_ROOT_ALLOW 白名单机器锚）。语义边界：closeAll（App 切视图）非弃改不触发（autosave-first 草稿存活+timer 继续跑）；App dirty 聚合含 notes pending（useTabDirtyAggregate 扫开 tab 键集——clean 直达=no-op 成立）；已接受残余=in-flight save 已派发毫秒窗（DB 落地不可回收；跨课题面由 main 归属校验兜——notes.service papers.findById→NOT_FOUND 显式先行，FK 为第二层）+load 回调 discard 后到达重建条目=服务器基线非弃改内容（复活不可能：pendingEdit 已清必走整版落地） | notes.store.ts discard 族（头注四跨格序列）+tab-dirty.ts confirmCloseDirty（弃改收口点头注）+workspace.store.ts switchTo（A3，2026-09-02 登记） | 单测（notes.store.test discard 族七用例+reject 版序列②——变异 M1~M4+「仅摘 .catch 守卫」变异红证在档）+e2e（reader-text.spec「A3 复活面端到端」：防抖窗内关脏 tab 确认弃改→重开=基线，「已保存」载入锚防假绿）+tab-dirty/workspace.store 接线用例 | 已锚定（单测+e2e 级 A3 本单） |
 | INV-51 | e2e 几何断言的稳态采样口径（F-R2e，2026-09-02 三波场）：跨程几何一致断言（「重开仍在原位」类）的输入必须为**稳态几何**——①标注块几何存在双态瞬态（AnnotationLayer 挂载先渲染存量行盒 fallback→resolve 完成跳 band 收边；实测 y 差 4.44px/h 差 4.97px/正常负载窗 ~8ms——AnnotationLayer.tsx:209 双态表达式）；②两次独立测量调用（boundingBox×2）之间的滚动落帧使 rel 恰偏 Δ（注入实验 dy=Δ 线性，平移不变性只在单帧成立）。故几何断言采样=双采样稳定门（非收敛 fail loudly）+零盒可见性守卫（display:none 形态=未就绪）+单 evaluate 同帧取 rect/canvas 两盒（同帧差值对滚动平移不变）；历史 3.45px 归属未定死（排查档 §4 三候选），修法对三候选全免疫为条件命题——新几何断言一律按本口径写 | reader-text.spec.ts stableRel（头注）+scripts/audits/f-r2e-investigation.md+tests/e2e/z-r2e-probe.spec.ts 双记录器（复现判别留驻）（F-R2e，2026-09-02 登记） | e2e「划选高亮后重开仍在原位」四断言（稳态原子测量）——注入实验红绿双向实证在档（修前路径+注入=dy=3.2 红/同帧测量注入下稳定） | 已锚定（e2e 级本单） |
+| INV-52 | import 会话身份两合一（F-D4，2026-09-02 AUDIT-C D4 修票；范式=corpus-export INV-18 同族）：①**互斥 gate**——import.service importFiles/importFolder 每次调用入口 gate.enter()、finally gate.exit()（尽力而为与域错误抛出路径都必经 finally）；gate=bootstrap 顶层一次创建的闭包计数器（容器 assemble 闭包之外——每层 service 重建但 gate 同一对象，switch 后 in-flight 计数仍跨层有效）；workspace.service create/rename/switch 三入口在 busy 检查旁查 importInFlight()（计数>0）→CONFLICT「导入进行中，请稍后再试」，**先于 closeCurrent/materializeLegacy（拒时零库副作用）**；in-flight 判定=main 侧计数单源，renderer busy 不参与（两进程面各自独立）；拒绝=用户稍后重试（低频窗=大文件夹导入分钟级）②**进度事件 sessionId**——ImportProgressEvent 增 sessionId（min(1)）；每次 importFiles/importFolder 调用入口 randomUUID() 一次，该次调用内全部进度事件（含 scanning/done）同 id；ImportDropZone 订阅回调三滤：busyRef=false 忽略（终局后迟到事件不写 state）+sessionRef 首事件锚定+异身份忽略（runImport 入口重置）——残余窗=新会话 start 后首事件前（旧事件须跨越终局+用户点击两层，理论窗，照 corpus-export.store 注释同口径） | import.service.ts（gate+sessionId 头注）/workspace.service.ts（互斥三入口+跨格序列⑥头注）/bootstrap.ts（gate 顶层创建）/ImportDropZone.tsx（三滤+残余窗头注）/schemas.ts（sessionId 契约）（F-D4，2026-09-02 登记） | 单测（import.service.test F-D4 describe 三用例：全程同 id+两次调用不同/gate 计数 failed 折叠路径/域错误路径 finally exit——变异 M1「exit 挪出 finally」红证在档；workspace.test「import in-flight 时三入口 CONFLICT 中文+closeCalls/assembledDirs 零库副作用」；import-dropzone.test.tsx 四用例：订阅成对退订/本会话写/异身份滤——变异 M2「删异身份过滤」红证在档/idle 不写不锚定） | 已锚定（单测级 F-D4 本单） |
 
 ## 维护规则
 
diff --git a/src/renderer/features/reader/ReaderPage.tsx b/src/renderer/features/reader/ReaderPage.tsx
index cbf533ab0..8a30cee6b 100644
--- a/src/renderer/features/reader/ReaderPage.tsx
+++ b/src/renderer/features/reader/ReaderPage.tsx
@@ -184,8 +184,10 @@ export function ReaderPage(): JSX.Element {
               onReady={handleColumnReady} onError={handlePdfError} />
           )}
         </PdfDocProvider>
-        {/* page=弃用位（F-02 动态锚定）；挂载盒=稳定包装盒（N4） */}
-        <SelectionLayer pageRoot={selectionMount} paperId={paperId} page={0} onSaved={addAnnotation} />
+        {/* page=弃用位（F-02 动态锚定）；挂载盒=稳定包装盒（N4）；F-SL：onSaved
+            闭包捕获渲染帧 paperId（与 SelectionLayer props.paperId 同源同帧），
+            store 按其寻址——保存 await 窗内切 tab 不生幽灵标注 */}
+        <SelectionLayer pageRoot={selectionMount} paperId={paperId} page={0} onSaved={(a) => addAnnotation(paperId, a)} />
       </div>
       <p className="sr-only">{`共 ${totalPages} 页，当前第 ${page + 1} 页，标注 ${annotations.length} 条`}</p>
     </div>
diff --git a/src/renderer/features/reader/reader.store.ts b/src/renderer/features/reader/reader.store.ts
index 97b5b630d..0c3d42a52 100644
--- a/src/renderer/features/reader/reader.store.ts
+++ b/src/renderer/features/reader/reader.store.ts
@@ -46,9 +46,12 @@
  *   | setSelectionMode(m) | active tab 写入 m；activeId=null no-op |
  *   | closeOne(id) | 随 tab 删除；重开同 id=全新 tab=false |
  *   | close()（closeAll） | 整体复位（初始态工厂） |
- * - 旧 setter（setPage/setZoom/setTotalPages/setColor/addAnnotation/
- *   updateAnnotation/removeAnnotation/setSelectionMode）作用于 active tab；
- *   activeId=null 时 no-op
+ * - 旧 setter（setPage/setZoom/setTotalPages/setColor/updateAnnotation/
+ *   removeAnnotation/setSelectionMode）作用于 active tab；activeId=null 时
+ *   no-op。例外 addAnnotation=per-paperId 寻址（F-SL/INV-03 写方向同族）：
+ *   签名 (paperId, a) 不读 activeId——SelectionLayer 保存 await 窗内切 tab
+ *   不得把 A 的标注写进 B 的 tab（幽灵标注，AUDIT-C §1.2-c）；tab 缺席（已
+ *   关）no-op（DB 已落，重开自 DB 读对齐——undo 同语义）
  * - setPage 第三参（F-01/INV-29 双源机制）：opts?:{scroll?:'to'|'none'} 默认
  *   'to'——程序跳页语义，bump scrollRequest={paperId,page,seq} 信号（消费者=
  *   ReaderPage→PageColumn.scrollToPage 单口程序滚动到盒顶）；'none'=滚动位置
@@ -151,7 +154,11 @@ export interface ReaderStore {
   /** 页布局写 active tab（F-R1）：toggle 语义在装配面 ReaderPage（工具栏纯
    *  受控只上抛）；activeId=null no-op（updateActiveTab 兜底） */
   setPageLayout(layout: 'single' | 'double'): void
-  addAnnotation(a: Annotation): void
+  /** 标注追加（F-SL，INV-03 写方向同族）：per-paperId 寻址不读 activeId——
+   *  发起身份由调用方捕获（ReaderPage 接线闭包传渲染帧 paperId，与
+   *  SelectionLayer props.paperId 同源同帧）；tab 已关 → no-op（DB 已落，
+   *  重开自 DB 读对齐——undo 关 tab 路径同语义） */
+  addAnnotation(paperId: string, a: Annotation): void
   updateAnnotation(a: Annotation): void
   removeAnnotation(id: string): void
   /** annotations 面灰点信号（TABS-03）：保存失败置位/重试成功清除（参数化
@@ -387,8 +394,14 @@ export const useReaderStore = create<ReaderStore>()((set, get) => {
       updateActiveTab((tab) => ({ ...tab, pageLayout: layout }))
     },
 
-    addAnnotation(a) {
-      updateActiveTab((tab) => ({ ...tab, annotations: [...tab.annotations, a] }))
+    addAnnotation(paperId, a) {
+      // F-SL（INV-03 写方向同族）：per-paperId 寻址不读 activeId——SelectionLayer
+      // 保存 await 窗内切 tab 时按发起身份落账（幽灵标注守卫）；tab 已关 →
+      // no-op（DB 已落，重开自 DB 读对齐——与 undo 关 tab 路径同语义）
+      const { tabs } = get()
+      const tab = tabs[paperId]
+      if (tab === undefined) return
+      set({ tabs: { ...tabs, [paperId]: { ...tab, annotations: [...tab.annotations, a] } } })
     },
 
     updateAnnotation(a) {
diff --git a/tests/unit/renderer/reader-store-undo-race.test.ts b/tests/unit/renderer/reader-store-undo-race.test.ts
index 6b05f2459..ae7be94ee 100644
--- a/tests/unit/renderer/reader-store-undo-race.test.ts
+++ b/tests/unit/renderer/reader-store-undo-race.test.ts
@@ -62,12 +62,12 @@ describe('F-ARCH2 undo 并发编辑不覆盖（回归锁）', () => {
     await useStore.getState().openPaper('p-1')
     // 造真实撤销对象：a-1 先入列表（门一 W-2——否则移除断言恒真），再压 create 型
     // 撤销条目（撤销动作=删除该标注）
-    useStore.getState().addAnnotation(annBase)
+    useStore.getState().addAnnotation('p-1', annBase)
     undoMod.pushUndo('p-1', { kind: 'create', annotation: annBase })
     const pUndo = useStore.getState().undo()
     // undo 挂起中：用户并发保存了一条新标注（SelectionLayer→addAnnotation 路径）
     const concurrent: Annotation = { ...annBase, id: 'a-2', quoteText: 'concurrent' }
-    useStore.getState().addAnnotation(concurrent)
+    useStore.getState().addAnnotation('p-1', concurrent)
     resolveDelete({ ok: true, data: undefined })
     await pUndo
     const list = useStore.getState().tabs['p-1']?.annotations ?? []
diff --git a/tests/unit/renderer/reader.store.test.ts b/tests/unit/renderer/reader.store.test.ts
index e2e13e2a2..4f2ebb0a6 100644
--- a/tests/unit/renderer/reader.store.test.ts
+++ b/tests/unit/renderer/reader.store.test.ts
@@ -88,7 +88,7 @@ guardedDescribe('SR2-TABS-01', 'reader.store —— per-tab 多文献状态（ta
     expect(useStore.getState().tabs['p-1']?.page).toBe(9)
     useStore.getState().setPage(-3)
     expect(useStore.getState().tabs['p-1']?.page).toBe(0)
-    useStore.getState().addAnnotation(ann)
+    useStore.getState().addAnnotation('p-1', ann)
     expect(useStore.getState().tabs['p-1']?.annotations).toHaveLength(1)
     useStore.getState().removeAnnotation('a-1')
     expect(useStore.getState().tabs['p-1']?.annotations).toHaveLength(0)
@@ -111,7 +111,7 @@ guardedDescribe('SR2-TABS-01', 'reader.store —— per-tab 多文献状态（ta
     useStore.getState().setZoom(2)
     useStore.getState().setTotalPages(9)
     useStore.getState().setColor('green')
-    useStore.getState().addAnnotation(ann)
+    useStore.getState().addAnnotation('p-1', ann)
     expect(useStore.getState().tabs).toEqual({})
     expect(useStore.getState().activeId).toBeNull()
   })
@@ -468,3 +468,44 @@ describe('F-ARCH1 closeTab 瞬态信号清理', () => {
     expect(useStore.getState().noteHighlight).toMatchObject({ annotationId: 'a-9' })
   })
 })
+
+// ── F-SL（2026-09-02 幽灵标注修票，always-active——不经 guardedDescribe）──
+//    病根（AUDIT-C §1.2-c）：SelectionLayer.save 的 await 窗口内切 tab，
+//    onSaved→addAnnotation 若按当下 activeId 寻址，A 文献的标注会被追加进
+//    B 的 tab.annotations（幽灵标注，内存态；DB 落 A 行正确）。修复=
+//    addAnnotation(paperId, a) 按发起身份寻址（照 undo 范式：ReaderPage 接线
+//    闭包捕获渲染帧的 paperId；tab 缺席（已关）→ no-op，重开自 DB 读对齐）。 ──
+describe('F-SL addAnnotation per-paper 寻址（幽灵标注守卫）', () => {
+  beforeEach(() => {
+    vi.clearAllMocks()
+    vi.unstubAllGlobals()
+  })
+
+  it('用例①：activeId=B 时 addAnnotation("p-1", ann) 写 A 的 tab，B 的 annotations 不变', async () => {
+    const useStore = await loadStore({ reader: { open: openOk, listAnnotations: listAnnotationsOk } })
+    await openReady(useStore, 'p-1')
+    await openReady(useStore, 'p-2')
+    useStore.getState().activateTab('p-2')
+    // 前置防恒真：确认当前激活确为 B（模拟保存 await 窗内 activeId 切走）
+    expect(useStore.getState().activeId).toBe('p-2')
+    useStore.getState().addAnnotation('p-1', ann)
+    const s = useStore.getState()
+    expect(s.activeId).toBe('p-2')
+    expect(s.tabs['p-1']?.annotations).toEqual([ann])
+    expect(s.tabs['p-2']?.annotations).toEqual([])
+  })
+
+  it('用例②：paperId 的 tab 已关 → no-op 不炸，其余 tab 不受影响', async () => {
+    const useStore = await loadStore({ reader: { open: openOk, listAnnotations: listAnnotationsOk } })
+    await openReady(useStore, 'p-1')
+    await openReady(useStore, 'p-2')
+    useStore.getState().closeTab('p-1')
+    // 前置防恒真：p-1 tab 确已缺席（迟到追加的目标态）
+    expect(useStore.getState().tabs['p-1']).toBeUndefined()
+    useStore.getState().addAnnotation('p-1', ann)
+    const s = useStore.getState()
+    expect(s.tabs['p-1']).toBeUndefined()
+    expect(s.activeId).toBe('p-2')
+    expect(s.tabs['p-2']?.annotations).toEqual([])
+  })
+})

```

## 输出纪律（必读）

先统计行「B:N/W:N/N:N+总评一句」；逐条展开引证据（文件/行/摘录）；末行放行判定（放行/回炉+回炉点）；200 行内；你看不见仓库——结论只能来自本材料包；不确定写存疑。
