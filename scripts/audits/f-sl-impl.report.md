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
