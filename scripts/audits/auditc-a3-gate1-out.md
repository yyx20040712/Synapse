[routing]: run=20260902044726-8p1b source=kimi-main model=kimi-k3 switches=0 usage=in=0,out=12807 latency=563366ms (by ds-call.mjs 链)

# 门一审查报告：A3 悬置写修票

**裁决：条件 PASS**（0B/3W/8N；实现与票面高度贴合、证据链完整诚实，卡点=.catch 代际守卫零测试锚+两处需主控核验的假设）

---

## A. 母本符合度 —— 符合

- **3.0 态空间表逐格核**：discard 动作体（clearTimer+四元数据 delete+gen 自增+删键）与票面逐字对应（notes.store.ts discardOne）；saving×gen 变=全 no-op 两回调首行守卫在位 ✓。
- **跨格序列锚**：①=用例2（整版落地+save 零调用）✓ ②=用例3（Deferred 未 resolve→discard→resolve→条目 undefined+load 复核）✓ ③=用例4+7（零 timer/零条目/switch+reload 断言面）✓ ④=票面明示「测试不动」，实现未触 closeAll 路径，合规——仅注记（见 N3）。
- **confirmCloseDirty 布尔短路等价性**：逐路径核——clean（`!isTabDirty` 短路不弹窗→allow→no-op discard→true）、dirty 取消（confirm 调用→false→不弃改→false）、dirty 接受（confirm→discard→true）三路与原 if-early-return 结构行为全等；文案逐字未动 ✓。等价性成立。
- **3.1~3.3 逐点**：gen 快照时机（派发处、draft 早退之后）✓；discardAll `[...pendingEdit]` 快照防变异 ✓；tab-dirty 汇合处收口 ✓；workspace.store discardAll 位于 confirm 后/await 前（票面原序）✓；check-quality.mjs 白名单+理由段（票面模板原文）✓。

## B. 宪法红线 —— 零违反

- 白名单新增机器锚定（COMPOSITION_ROOT_ALLOW 一行+头注段），verify quality 步绿证。
- 受锁五件：四测试件均文末追加；notes.store.test.ts 第 1 行 import 增 `describe`——门一指引已豁免 import 段，合规。workspace test import 增补已由自裁 5 申报。
- ≤500 行：最大件 notes.store.ts 279 行 ✓。状态机前置=票面 3.0 在册 ✓。

## C. 代码与测试质量

**[W1] .catch 代际守卫零测试锚——变异存活洞。** notes.store.ts .catch 块首行守卫（diff：`if ((discardGen.get(paperId) ?? 0) !== genAtDispatch) return`）是票面 3.1 明文要求，但全部 7 新用例中序列②只 **resolve**（`resolveSave({ ok: true, ... })`），无一 reject-after-discard 用例。变异「仅摘 .catch 守卫、保留 .then 守卫」→ 全绿：in-flight save→discard→reject→`setDraft(paperId, { saving: false })` 经 draftOf **重建已删条目**——恰是本票要杀的回调复活面。M2 红证（报告原文「摘 .then 回调首行代际守卫」）只覆盖 .then 半面。**修订点：补一个 reject 版序列②用例（一行变异即可验证）。**

**[W2] load in-flight × discard 无守卫——代际守卫结构不对称（报告 §8 已自报，定性如实）。** save 回调有 gen 守卫、load 回调无；报告自述「load 合并路径会重建条目+补存排程」——若属实，discard 后到达的 load 回调可重建条目甚至排程补存，即同族复活面留缝。票面 3.0 态空间表本无此格（票面层遗漏），实现者未擅修=正确处置。可达性**不确定**（本地 IPC 毫秒级+须先编辑才能关 tab，现实窗极窄），但「不可达」未经证明。建议主控裁定：态空间表补格+load 回调同挂 gen 守卫，或明文登记为接受残余。

- 用例 5 真锚「不误伤」：discard 后重编辑链，savedAt 推进+pending 清除断言——若 gen 快照机制有误（闭包陈旧/未重取），savedAt 不推进即红 ✓。
- discard 幂等：用例 6 clean 直通（无条目）不抛 ✓；gen 单调自增无害 ✓。
- 接缝论证（守门内 vs closeOne）成立：tab-dirty→reader.store import 已在，reader.store 接 notes.store 犯白名单、接 tab-dirty 成环——两路封死论证自洽，守门单点收口=正解 ✓。
- e2e「已保存」载入锚有效且失败方向安全：内存回填 bug→pending=true→「未保存」→锚超时红；DB 复活 bug→值=输入→toHaveValue('') 红。无双 bug 假绿路径 ✓。
- 自裁 1（getTimerCount）解释成立：diff 上下文可见 timer 回调 `if (draft === undefined) return` 早退——M1 下条目已删、残留 timer 派发不出，票面字面断言「save 未被调」确实不红。加强后 M1 红证在档（m1 raw：2 failed=用例1+序列③，与 clearTimer 缺失影响面一致）✓。

## D. 报告诚实性 —— 诚实

- 自裁 1~6 逐条对 diff 全部坐实（#1/#2/#3/#5 直接可见；#4 typecheck 首红→修桩→绿与 verify EXIT=0 终态一致；#6 触碰面与 8 件 diff 吻合，F-R3 同场文件切割声明合理）。
- 基线算术自洽：1081+F-R3 新增=实测 1084，+7=1091 ✓。变异红证计数与变异影响面逐一吻合（m2=1 failed、m3=1/10、m4=1/9）。
- 疑虑 2 项定性如实：W2 未粉饰为「已修复」；e2e 时序敏感声明了失败指纹且失败方向=红（非静默假绿）✓。

## E. 接缝与后续单

**[W3] switchTo「clean 直达=no-op」依赖未证明的假设。** 票面 3.3「dirty=false 时无 pending」——workspace.store.ts 的 discardAll 在 confirm 门后**无条件**执行。若 App 注入的 dirty 聚合不含 notes pending 信号（SWITCH_DIRTY_TEXT 文案仅提「标注/脉络」），则 notes 悬置稿存在+dirty=false→无确认→discardAll **静默弃稿**。本包内无法核验 App 聚合面（零仓库访问），**不确定**——需主控核验聚合含 notes 脏信号，否则 clean 直达路径是未确认丢稿口。

- main 归属核验声明：与票面 ②7（notes.service.ts:46-51 findById→NOT_FOUND）行号语义一致，「git diff 0 行亲验」可查；本包外无法独立核验，信任级接受 [N9]。

**[N 级注记]**
- N1：discardAll 仅遍历 pendingEdit——「有 timer 无 pending」假想态会漏清（当前 edit→saveSoon 链不可达此态；票面口径即 pendingEdit 快照，实现合规；更稳为并集遍历，留主控）。
- N2：tab-dirty 头注「一切 tab 关闭路径必经本守门」与序列④（closeAll 无确认不 discard=必经不成立）有表述张力——括号已限缩「TabBar 双点」，且系票面 3.2 原文，文档级。
- N3：序列④零测试锚=票面明示「测试不动」，合规注记。
- N4：INV-35④ 兑现的 invariants.md 修档（及 INV-45 登记面）票面未排、报告未提——主控收口勿漏，防代码-档案漂移。
- N5：全量 e2e 未跑（verify 流程无 e2e 步，仅定向 1 passed）——新 test 独立种子+app.close，交叉感染面低；票面④「全量 verify」已兑现（EXIT=0），全量 e2e 归主控收口，风险可接受。
- N6：getTimerCount 全局计数——当前零背景 timer 成立（绿证）；未来 store 引入背景 timer 则假红，失败方向安全。
- N7：switch IPC 失败窗——discardAll 在 await 前，unwrap 抛错则稿已弃+未切换+未 reload=静默丢稿。**票面 3.0③ 即此序，实现合规**；更优序=switch 成功后/reload 前 discard（失败后草稿存活），建议主控裁定是否修票面。
- N8：组合序列「in-flight(gen0)→discard→re-edit→redispatch(gen1)→旧回调迟到」未单测——用例 3+5 分锚两端，gen 比较逻辑覆盖性高。

---

**统计：0B / 3W / 8N（共 11 条）**

**总评：条件 PASS。** 实现面零偏差、纪律面零红线、报告诚实度满分档。放行条件二：①补 .catch 代际守卫的 reject-after-discard 用例（W1，低成本，变异可验）；②主控核验 W3 的 App dirty 聚合假设与 W2 的 load×discard 格处置（修票或明文登记接受残余二选一）。N 级随档备查。