[routing]: run=20260902050059-evwf source=deepseek model=deepseek-v4-flash switches=0 usage=in=11206,out=31053 latency=310173ms (by ds-call.mjs 链)

# 门二终审意见（A3 悬置写修票）

复核范围严格限于本包（主控三条件处置 + 门一报告 + 实现 diff + 实现者报告 + W1 证据尾摘）。未作仓库访问。

---

## 一、主控处置复核

| 主控处置 | 门二复核结论 |
|---|---|
| W1 补 .catch 守卫 reject 用例 | **已销项**。green2=20 passed / exit=0 与 mutation=1 failed / 19 passed 互相印证，且失败用例恰为序列②-reject。变异“仅摘 .catch 守卫”能让该用例红，说明锚点有效，W1 补测成立。 |
| W3 clean 直达=no-op | **基本成立，但调用点证据差一环**。代码摘录显示 `useTabDirtyAggregate()` 扫 `tabIds` 且含 `notes.store` pending，clean 直通 → `discardAll` 为 no-op 的推理可以接受。但摘录变量名是 `quitDirty`，包内未直接展示 workspace `switchTo` 的注入点传的是同一 dirty 集合；我倾向接受主控结论，但留给 N-A 登记。 |
| W2 load × discard | **按“接受残余”处置可接受，但代码级证明链不闭合**。门一放行条件本来就是“修票或明文登记接受残余”二选一，主控选择登记。但“pendingEdit 已清 → load 必走整版落地 → 复活不可能”的核心前提，**包内 diff 不含 load 函数体，无法独立复算**，见门二-W-2。 |
| N7 switch 失败丢稿窗 | **维持票面原序，不阻断**。与主控一致：弃改前已有 confirm 明示丢弃，两害取轻可以接受。残余面另见 N-B。 |

---

## 二、终审工单

### B（阻断）— 0

未发现可确证的阻断级实现偏差或宪法红线直接违反。

---

### W（放行前须销项 / 或给出机制性说明）— 2

---

#### 门二-W-1：W1 补锚后的锁态与全量数字未闭合

- A3 终态曾做过 `locks:apply` + `verify`，且全量测试为 **1091**。
- 主控随后又向受锁测试文件 `notes.store.test.ts` 追加序列②-reject。包内只有该单文件 green2（20 passed）和 mutation 输出，**没有补跑 `locks:apply` / `npm run verify` 的证据**，也没有 **1092 全量数字**的直接证据。
- 主控自己写的是“全量数字收口时主控亲验”，这意味着 W1 后锁一致性目前未闭合。

【销项条件】收口前补跑一次含 locks/typecheck/full-unit 的 `npm run verify`（预期 1092+EXIT=0），或将锁机制“不覆盖测试文件内容哈希”的机制说明写入工单。

---

#### 门二-W-2：W2 “复活不可能”的证明链依赖包外 load 实现，尚未在票面内闭合

- 主控结论：“load 回调到达后因 pendingEdit 已清必走整版落地（服务器基线）……复活不可能”。
- 但实现者报告 §8 自述：“discard 发生在 load in-flight 期间时，load 合并路径会重建条目+补存排程”。
- 两条陈述是否冲突，取决于 load 实现何时读 `pendingEdit`：如果 load 在回调内读当前 `pendingEdit`，主控对；如果 load 在发起时快照、或无条件重建条目，则门一的“同族复活面”并没有被代码排除。
- 本包给出的 notes.store diff 只含 saveSoon/discard 改动，**没有 load 函数体**。因此该前提“不确定”。

【销项条件】收口时随 INV-45 文档面落下：给出 `notes.store.ts` 中 load 实现的分支摘录/行号，明确“当前 pendingEdit 已清 → 走整版落地、不触发 saveSoon”的分支成立；若做不到，需将该残余明确写得比当前更保守。

---

### N（注记/备查）— 4

---

#### N-A：W3 核验缺 switchTo 调用点直接证据

主控引用 `App.tsx:112-114` 的是 `quitDirty = tabDirty || lineageDirty`。包内未展示 `useWorkspaceStore.switchTo(id, { dirty: quitDirty })` 的调用点。虽然该变量极可能同时也是工作区切换的 dirty 输入，但严格说 W3 销项差最后一行证据。**不确定，倾向可销**。

---

#### N-B：dirty=false 但存在隐藏 pending 时，switch 失败会“无确认丢稿”

- 主控已承认：`closeAll` 后残留草稿不在开 tab 集 → 聚合 dirty 不可见 → 切课题不弹确认即 discardAll。
- 若 switch IPC 本身失败（不 reload），pre-A3 的同一窗口内内存草稿原本可能存活；A3 的 `discardAllPendingEdits()` 在 `await api.switch()` 前已无条件清空。
- 主控定性“非新增丢失面”在 switch 成功时成立（reload 会蒸发内存）；但在 **switch 失败**路径上，它比 pre-A3 多了一个“未确认但已丢稿”的静默副作用。N7 已覆盖 dirty=true 的确认窗，未覆盖 dirty=false+隐藏 pending 的失败窗。

---

#### N-C：`discardGen` 只增不删

`discardOne` 删除了 `pendingEdit / touchedFields / lastEditedAt / editSeq`，但 `discardGen.set(...)` 后没有删除键。长会话、大量文献反复开闭后，Map 会持续增长。

这不是功能性缺陷：该 gen 键在“旧回调仍可能迟到”的时间窗内必须保留，否则会回到 0 导致守卫失效；且单键成本极低。仅作备查，不要求改。

---

#### N-D：成本账口径不一致

- 实现者：GLM5.3，6.18M tok / 85 tools / 1011s。
- 门一原始路由：`kimi-main usage=in=0, out=12807`；主控汇总却写 `in≈36k`。
- 因门一报告本身另说“in 口径含全包”，两者未必矛盾，但账本未归一。
- 门二（deepseek）本次按量计，不计入实现成本。

---

## 三、机器面与规则面核对

- A3 报告算术：`1081 + F-R3 新增 = 1084`；`1084 + 7 = 1091`，自洽。
- W1 单文件证据：原本 19 tests → 追加后 20 tests；若全量收口应为 **1092** unit tests。包内无 1092 直接证据，见门二-W-1。
- 实现 diff 与票面态空间表可核部分：discardOne 清 timer + 四元数据 delete + gen 自增 + 删键；saveSoon 首行双回调守卫；`[...pendingEdit]` 快照；confirmCloseDirty 两路汇合；workspace discardAll 位于 confirm 后/await 前——均与门一描述逐项对应，未发现偏差。
- 宪法红线：白名单机器锚在 A3 终态有 verify/quality 绿证；受锁五件 A3 期均为文末追加或已申报 import 行；“≤500 行”未见越界。
- W1 后锁态未闭合，见门二-W-1。

---

## 统计

**B=0 / W=2 / N=4**

---

## 总评

**条件 PASS。**

实现与票面贴合度高，主控对 W1、W3、N7 的处置基本合理，W2 按“接受残余”处理也符合门一放行条件。但在最终签 PASS 前仍有两个可销项缺口：

1. W1 补锚后的锁态/全量 verify 证据未闭合（门二-W-1）；
2. W2 “load 整版落地”的代码前提未在包内证明，且 INV-45 文档落账尚未发生（门二-W-2）。

以上两条均为收口时可销项，不构成对当前实现代码面的阻断。