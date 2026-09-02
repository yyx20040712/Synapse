[routing]: run=20260902133138-6krx source=kimi-main model=kimi-k3 switches=0 usage=in=13307,out=8662 latency=268016ms (by ds-call.mjs 链)

# F-SV 门一对抗深审结论

**统计：B:0 / W:2 / N:3（+存疑 2）——总评：实现本体经竞窗推演与变异红证交叉验证未发现代码级缺陷；两处 W 均为证据链/报告诚实性缺口，不涉行为正确性。**

---

## 一、竞窗推演（审查清单 Q1，未发现缺陷——给出推演记录）

对 null 哨兵形态的四个边界逐步推演：

1. **save₁ settle 与 save₂ 起跑之间**：链清理在 `finally` 同步块内（diff store `if (inflight === 0) { saveChain = null; set({ saving: false }) }`）。save₂ 排队时 inflight=2，save₁ 的 finally 只减到 1，**不清链不复位**——无竞窗。
2. **微任务交错窗**：run settle 后，链续体（`run.then(noop,noop)`，attach 于 save() 调用时刻）先于 `await run` 续体执行。若有第三方 microtask 在此窗内同步调入 save₃：inflight 仍 ≥1（finally 未跑）、saveChain 非 null → save₃ 正确排队，inflight=2，随后 finally 链式递减归零才清链。**清链条件（inflight===0）与排队存在性严格互斥**，未找到"孤儿链"或"链被误清后直发乱序"路径。
3. **同步连发（pSave1=save(); pSave2=save()）**：save₁ 的 run 至少隔一个 microtask 才 settle，save₂ 同步进入时链必非 null → 必排队。用例①的 `flush()` 后 `toHaveBeenCalledTimes(1)` 锁的正是此形状，M1 变异（删链直发）同断言红（m1 raw `2 failed`，指纹=RED 的 called 2 times）——断言可真失败，非恒真。
4. **flush(10) 充分性**：链深 2 时，resolveSet1 → 链续体 1 tick → save₂ `.then(()=>doSave)` 1 tick → doSave 同步段即调 set，约 2-3 tick；10 轮冗余充足，且注释已申明"轮数冗余无副作用"。

## 二、W 级（证据链/报告诚实性）

**W1 — RED 实录含未申报的第 4 个异常信号「Errors 1 error」。**
f-sv-red.raw.txt 尾部：`Tests 3 failed | 1103 passed` 之外另有 **`Errors 1 error`**，堆栈为 `Object.save settings.store.ts:69:24` ← `settings.store.test.ts:174:40`，vitest 注记"The latest test that might've caused the error is 'saving 连续…'"。实现报告 §三 RED 节只逐条归因三个 failed（①② called 2 times、③ expected 3 to be 5），**对这个 unhandled error 只字未提**。按报告自述的 RED 失败点（①②在首个计数断言即中止、resolveSet/rejectSet 均未被触达），三个失败用例均不应产生未处理 rejection——该 error 的来源从材料包无法重构。**存疑待实现者解释**；若是 pSave 悬挂 Promise 的跨用例泄漏或桩耗尽（mockImplementationOnce×2 后返回 undefined→`unwrap(undefined)`  Throw），需确认其不污染 RED 红证的"正确红"定性。

**W2 — verify 首跑 typecheck 红（exit=2）原始输出被最终 verify 覆盖，未留档。**
报告 §四自述"该失败原始输出被最终 verify 覆盖（证据文件名固定四件），指纹已在此逐字记录"。但同一实现者为 GREEN r1 中间态专门留了 `f-sv-green-r1-fail.raw.txt`——**同类中间失败、处置不一致**。verify 首红的 exit=2 与 TS2741×5 现仅有报告文字转述，无法独立核验。属自定的"过程取证留档"惯例的自我偏离，定 W（轻）。

## 三、N 级

**N1 — INV-03 先例列未同步（主控预裁 5，diff 证实）。**
diff invariants.md 行：声明列已加「同通道写全序（2026-09-02 F-SV…第三变体）」、锚定列已加「F-SV 同通道写全序三用例」，但**先例列（第三列）原文未动**——仍止于「reader 写方向双先例（undo 与 addAnnotation…F-SL）」。声明列自称"与 undo 身份寻址/addAnnotation 按身份寻址并列"，先例列却无 settings save 链的席位，列间自相矛盾。同意主控收口判断：**必须补齐一行**（先例列加「settings save 链式全序（F-SV）」），成本一行、消除表内不一致，否则下一张票读先例列会漏掉第三变体的实现锚。

**N2 — 链深 ≥3 无测试覆盖。**
三用例均为深度 2（save₁+save₂）。三连点（save₃ 排在 save₂ 之后）的"尾尾相接"路径仅靠推演覆盖。深度 2 已证机制（排队+链不断+门控），边际价值低，申报即可，不要求补。

**N3 — 用例②未断言 save₂ 的载荷参数。**
用例①有 `toHaveBeenNthCalledWith(2, { contactEmail: 'two@x.y' })`，用例②仅有 `toHaveBeenCalledTimes(2)`，save₂ 载荷由终态断言（`settings?.contactEmail === 'two@x.y'`）隐含覆盖。非缺陷，对称性瑕疵。

## 四、存疑（无法从材料包判定）

- **存疑1**：store 总行数报告报 119，审查清单预填"138？"——从 diff hunk（`@@ -47,6 +57,28` / `@@ -61,17 +93,21`，原文件约 78 行+净增 40）反推 ≈118-119，报告值自洽，清单预填值无依据；测试 215 行与 hunk（118+98-1=215）精确吻合。两边均 ≤500，达标。
- **存疑2**：W1 的 unhandled error 若被解释为 RED 期既有锁定用例的既有噪声，需给出基线（RED 前全量跑）含同类 error 的证据；材料包内无此基线。

## 五、正面核验记录（防"只报坏不报好"失真）

- 票面 §一 四格逐格：排队全序（用例①+M1）✓ / 链不断（用例②，`run.then(noop,noop)` 双吞+`await run` 原样上抛，错误契约动作型保持）✓ / 单 save 直发零变（null 哨兵+既有 1103 锁定用例全绿=验收线，自裁①成立且为票面验收线优先的合法取舍）✓ / save 期间 load 零变（load 路径 diff 零触）✓。
- 语义保持：settingsSeq 抬升+`set({settings:saved})` 原样搬入 doSave，仍在**成功落地后**才抬升（失败不抬升，INV-03 版本计数语义零变）。
- 宪法红线：测试新 describe 不经 guardedDescribe（always-active，头注在案）✓；受锁两文件走 unlock→apply×2、manifest diff 仅 timestamp+2 哈希（与"locks=238 无新路径"自述吻合）✓；无 package.json 改动=禁新依赖 ✓；中文注释/UTF-8 ✓；verify exit=0 真退出码在档 ✓；变异还原=文件备份法+cmp ✓。
- M2 变异（`>=0` 去门控→用例③独红，`1 failed | 1105 passed`）证明用例③锁的就是归零门控，三用例各有变异/红证托底，无恒真断言。
- 接缝：SettingsPage 零改，`await run` 的 reject 仍由各调用点 catch→toast（INV-02 保持）；saving 连续帧使 UI 第一道门的禁点窗随队列延长——与票面"第二道门兜底"设计意图一致，报告 §七-3 已如实申报。

---

**放行判定：放行。** 附带两项收口义务（不构成回炉）：①N1——INV-03 先例列补「settings save 链式全序（F-SV）」一行，与锚定列对齐；②W1——实现者须书面解释 RED 实录中「Errors 1 error」的来源（堆栈 test:174→store:69），确认非红证污染；W2 记为流程教训（中间失败 verify 一律留档，与 green-r1-fail 先例一致），不要求补做。