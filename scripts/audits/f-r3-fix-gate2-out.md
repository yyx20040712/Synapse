[routing]: run=20260902044656-8114 source=deepseek model=deepseek-v4-flash switches=0 usage=in=11990,out=32766 latency=300408ms (by ds-call.mjs 链)

## 终审结论（门二独立复算）

**总评：PASS（条件性附记）**  
修票本体与票面逐字符合，代码面无阻断级缺陷；但包内红证数据的“退出码”表现自相矛盾，且 `await task.destroy()` 的顺序语义无变异锚，建议补证据措辞说明或后续单登记后再收口。

判级沿用门一体例：B=该项通过、结论成立；W=警告，需补证或持续观察；N=包内不可核实/只作备案。

---

## 逐条复算

### ① 处置核对 —— W

**门一 W1 的核心缺口已基本补上，但证据链有一处自我矛盾，另遗留一个未覆盖的变异面：**

- diff 中 `settleLoadTask` 实现与票面契约一致：
  ```ts
  try {
    return await task.promise
  } catch (err) {
    await task.destroy().catch(() => undefined)
    throw err
  }
  ```
  失败路径 destroy 恰一次、原错误同引用重抛，成功路径不 destroy，代码面可确认。

- 新补变异 A/B 的文本输出证明断言本身可以红：
  - 变异 A（包装重抛）→ `2 failed | 11 passed (13)`；
  - 变异 B（destroy 双调）→ `2 failed | 11 passed (13)`。
  这确实验证了 `rejects.toBe(boom)` 与 `destroyCalls === 1` 具备变异检测力。

**但两份补证文件尾都写了 `exit=0`，与“2 failed”冲突。**  
若红证定义是“测试进程失败、退出码非零”，则该证据不能独立自洽；若是因为包装脚本 `|| true`/管道吞码导致，需在档案中说明，否则后续无法区分“真的红”还是“输出红了但进程绿了”。  
这是证据规范问题，不是产品代码问题，故 W。

**另有一个门一与主控均未覆盖的测试盲区：**  
现有测试锚住了“destroy 被调用”“destroy 恰一次”，但没有锚住“**等 destroy 结束后才重抛**”。  
若把实现从

```ts
await task.destroy().catch(() => undefined)
throw err
```

改回不 `await` 的

```ts
task.destroy().catch(() => undefined)
throw err
```

现有三个新用例仍会全绿：`destroyCalls` 在同步段已 `+1`，原错误引用不变，destroy 拒绝也被吞并。  
本修法等待 destroy 完成的意义正是“清理结束后才进入错误上报/状态重置”，该顺序语义目前无突变保护。此项可登记为 W，不阻断当前实现。

**门一 W2 处置——包内可核部分成立：**

- `f-r3-upstream-check.md` 已补入，包内可见的版本×修复矩阵与门一转述一致：
  - 4.10.38 `onFailure` 首语句 `ensureNotTerminated()` 无守卫；
  - v5.5.207 引入 `if (terminated) return;`；
  - 6.3.289 增加 destroy claim/`_setupCapability`；
  - master 仍存在 `pdfManagerReady` 悬尾。
- “消噪上限 vs 跨 major 回归成本”的主控补论证在包内逻辑自洽，已将“零噪不可达”从主证据降为补充论据，结论可维持。
- 但 raw.githubusercontent 实际内容、6/6 健康记录、INV-30/INV-16/TextLayer/30 条 e2e 回归明细均不在本包内，我只能确认“档案内部一致”，不能独立复核外部事实。

**门一 E3 的 runExtraction finally 可达性：**  
包内只有主控文字结论，无 `runExtraction` 函数体摘录或对应测试锚，无法独立复算。标记 N，不视为伪造，也不作为代码缺陷没收口。

---

### ② 母本符合度 —— B

- diff 中新增 `PdfjsLoadTaskLike` + `settleLoadTask`，并接线到 `loadPdfDocument`：
  ```ts
  const task = getDocument(url)
  return settleLoadTask(task) as unknown as Promise<PdfjsDocumentLike>
  ```
  成功路径行为不变，失败路径 destroy 后原样重抛，符合票面“失败终接”目标。
- 头注状态机表由单行证伪格拆分为“加载失败”与“提取异常”两行；跨格序列②同步改为“destroy 两面不阻断”，与代码语义一致。
- “不做”清单已遵守：未见对 `runExtraction`、事件防御分支、`PdfDocProvider`、序列化、e2e 的任何触碰。
- 新增导出均在接口层/测试面注释中自裁登记，无未申报改动。

---

### ③ 宪法红线终审 —— B

- 受锁测试件 diff 仅两块：
  - import 区（追加 `describe`/`settleLoadTask`、import 尾逗号调整）；
  - 文末追加“always-active” `describe`。
  既有用例主体零触碰，可在 diff 中逐行核验。
- 源码现 311 行 <500；无新依赖；分层无污染。
- TDD 链证据：
  - 首红：`3 failed | 1081 passed`，`exit=1`；
  - 绿：`1084 passed`，`exit=0`；
  - verify：`exit=0`。
- 首红时的 2 个 Unhandled Rejection 已由实现者主动解释且绿后消失，诚实性成立。
- 原始 `f-r3-fix-mutation.raw.txt` 尾摘是还原后复跑绿段而非红段，报告已注明“追加段”，不算伪造；但包内确实看不到原始 2 failed 行。  
  若把证据文件完整保留要求作为收口标准，这一项与 ① 的 `exit=0` 问题合并为同一个“红证规范”警告，不单独阻断。

---

### ④ 机器面核对 —— N

- 当前单数字对账可复算：
  - 红/绿/verify 均落到 `1084`；
  - 与“基线 1081 + 新 3 = 1084”一致。
- “A3 同场 +7 = 1091”“locks 233 两连”“manifest 哈希 4 行变更”均来自报告/主控陈述，包内没有可独立核验的完整日志或 manifest 前后 hashes。标记 N，不否定，但不可独立复算。
- verify 尾摘显示 `exit=0`，可作为总开关结论，但不能还原 lock 检查的具体 233 计数过程。

---

### ⑤ 成本账本行 —— N

- 实现者 token/工具数/耗时（1.94M tok / 38 tools / 761s）无原始工具账本入包；
- 门一 65s/0 switches 与提示头一致；
- 本项无代码证据可审，仅能确认无成本账异常声明可供推翻。  
  N，不影响代码面结论。

---

## 最终统计

**逐条判级：**

| 条目 | 判级 |
|---|---|
| ① 处置核对 | W |
| ② 母本符合度 | B |
| ③ 宪法红线终审 | B |
| ④ 机器面核对 | N |
| ⑤ 成本账本行 | N |

**统计：B=2，W=1，N=2**

**总评：PASS（条件性附记）