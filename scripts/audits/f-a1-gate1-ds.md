# F-A1 门一补审报告（对抗式，第二双保险）

审查范围：mergeRects 算法实现、挂 A/挂 B 两路径、三测试文件、pdf-factory fixture、e2e 装配用例。以下问题按证据强度排列；未能从 diff 直接验证的均标明「不确定」。

---

## B 级：未发现

未发现可定性为「规约偏差 / 行为破坏 / 数据丢失风险」的阻断项。实现与票面算法六步逐字对应，预裁项 1~6 均忠实落地。

---

## W 级（警告）

### W1. fixture 头注数值推演存疑，「T4 负间隙锚」强度待取证核对
**文件**：`tests/utils/pdf-factory.ts:103-106`

头注称「行距 24pt（取证 2026-08-30：……行盒高 25.6px>行距 24 → 相邻行盒 -1.6px 级负间隙（T4 态——归并器行间钳制的装配级锚）」。

24pt 按 96/72 换算 = 32px，大于行盒高 25.6px，应为 **+6.4px 正间隙**，而非「-1.6px 负间隙」。实现者报告第四节也说「归并后渲染域正间隙 ~5px」——这本身与「fixture 产生负间隙」矛盾。若实际为负间隙，渲染域正间隙从何而来（钳制后应为 0 或亚像素）？若实际为正间隙，则 e2e 的「行块两两垂直不相交」断言**在钳制未触发时也恒真**，T4 装配级锚缺席。

该矛盾可能源于实现者把 `Td` 的 24（pt）误当 px 参与推演。取证底账 `scripts/audits/f-a1-e2e-forensic.raw.txt` 未附于本次 diff，无法核实原始 clientRects 的间隙符号。**需主控对照底账确认**：若底账显示行间 y 差为负（下行顶 < 上行底），则 W1 不成立；若为正，则 e2e 对 T4 的锚定是虚假的，应补一个真实负间隙 fixture 或在用例中显式构造负间隙断言条件。

---

### W2. `lowerMedian` 对非有限值行为未定义，NaN 可能经归一化链进入渲染
**文件**：`src/renderer/features/reader/annotation-merge.ts:55-58`

```ts
function lowerMedian(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b)
  return sorted[Math.floor((sorted.length - 1) / 2)]!
}
```

若输入 rect 含 NaN（存量脏数据/JSON 边界），sort 比较器 NaN 参与返回 0（视为相等），排序结果未定义，`lowerMedian` 可能返回 NaN。随后 `y = c - h/2` 得 NaN，钳制比较 `merged[i].y < prevBottom` 为 false 不纠正，最终渲染 `style.top = 'NaN%'` 浏览器忽略该样式——**静默视觉缺失**，不抛错。IPC 序列化通常把 NaN 变 null，若 zod strict 在 IPC 层拦截则表现为读取标注整体失败（白屏或 ErrorBoundary，取决于现有异常处理，不在本 diff 内）。本条为边界脆弱点，不要求修复，但建议在 `mergeRects` 入口对非有限值做一次防御过滤（与 INV-C 同类思路）。

---

### W3. 挂 A 返回空数组的调用方判空语义未能在 diff 内直接验证
**文件**：`src/renderer/features/reader/annotation-anchor.ts:325-340`

`rectsBetweenPoints` 从「pixels 为空返回 `[zeroRect()]`」改为「pixels 为空经 `mergeRects([])` 返回 `[]`」。票面预裁项 6 声称「调用方既有 `rects.length > 0` 判空语义兜住」，但 diff 未显示 `selectionToAnchor` / `findRangeAtOffset` 对该返回值的具体消费代码。**不确定**：若某调用方假设返回数组恒非空（如直接取 `rects[0]`），空数组会致 undefined 访问。实现者报告称「SelectionLayer 落库/渲染链实证不破」，但单测/e2e 是否覆盖「pixels 为空→空数组」路径未见明确用例。建议收口时人工核验两处调用方判断逻辑。

---

### W4. `mergeRects` 不按 page 隔离聚类，混页脏数据可被错误合并
**文件**：`src/renderer/features/reader/annotation-merge.ts:84-92`（聚类循环仅比中心 y/x/y）

行内归并的 `page: Math.min(...)` 只是「防御」取值，聚类阶段完全忽略 page 字段。若某个 annotation 的 rects 数组混入不同 page 的矩形（存量脏数据违反「rects 恒同页」约束），中心 y 接近时会被并入同一行。挂 A 路径 `page: 0` 硬编码无此风险；挂 B 路径依赖 annotation 层已按页过滤（`pageAnnotations`），但 rects 内部混页不受该过滤约束。低概率，但「防御仅取 min」是已知的假设性收口，建议头注明示「输入需满足单页约束，否则结果未定义」。

---

### W5. `W_MIN=1/612` 的严格大于比较在标准页宽下滤除 1px 实体块
**文件**：`src/renderer/features/reader/annotation-merge.ts:63` 与 `72`

`kept = rects.filter((r) => r.w > W_MIN)` 对 `w === W_MIN` 的块（页宽恰 612pt 时 1px 宽的矩形）滤除。票面「`w <= W_MIN` 不入集合」字面如此，但「1px 宽」在语义上不是零宽幽灵，是窄但可见的高亮。若某存量 rect 恰为 1px 宽（612pt 页），渲染读时会消失。影响极微小，但严格说这是「近似 1px」在标准页宽下的边界丢失。可接受工程取舍，但值得在头注明确写作「**≤** 1px@612pt 视为零宽」，而非「近似 1px」。

---

### W6. 组件测试断言与 F-11 rectStyle 收边数值耦合
**文件**：`tests/unit/renderer/annotation-layer.test.tsx:90-94`

```ts
expect(inlinePct(rects[0]!, 'left')).toBeCloseTo(10, 6)
expect(inlinePct(rects[0]!, 'width')).toBeCloseTo(45, 6)
```

该断言假设 rectStyle 的左右收边不改变 left/width 百分比。若未来 F-11 收边调整（如左右也收边、或顶底收边比例变化影响 `top` 计算），这两个断言会红，且红因非归并器问题。当前有约束力（实测通过），但属于「跨特性耦合的脆断言」，建议在测试头注注明该耦合依赖。

---

### W7. 「中心距恰等于容差」的浮点边界无测试锁定
**文件**：`tests/unit/renderer/annotation-merge.test.ts`（⑧a/⑧b）

⑧a 中心距 0.03 vs 容差 0.0095，⑧b 中心距 0.019 vs 容差 0.01，均有显著余量。实现用 `dist <= Math.min(...)/2`（含等于），若未来有人误改为 `<`，现有测试全部照绿。建议补一条 `dist === 容差` 的边界用例（如 `hNew=0.02, hRow=0.03, 中心距=0.01`），锁定「等于即并入」语义。

---

### W8. `annotation-anchor.ts` 475 行距 500 红线仅 25 行余量
**文件**：`src/renderer/features/reader/annotation-anchor.ts`（全局）

实现后仍 475 行，票面「近 500 红线」属实。后续任何需求若再触碰该文件（加逻辑/头注），都可能越线。不算违规，但属于已逼近红线的维护性风险，建议主控在 INV-40 登记时注明「该文件已近上限，后续改动优先考虑拆模块」。

---

## N 级（注意）

1. **挂 B 对 resolved 已归并数据仍全量重排序**（`AnnotationLayer.tsx:191`）：每个标注每帧都 filter/sort/聚类，即使输入已是单块行。n≤~30 无感，但若未来标注数增长可考虑「已归并输入快速路径」。纯优化建议，不阻塞。
2. **`lowerMedian` 每次入簇重复排序**（`annotation-merge.ts:97-99`）：一行 k 个成员累计 O(k² log k)，k 为个位数实际无感。可维护性提示。

---

## 不确定项（无法从 diff/原样确认，需主控或底账核对）

1. **W1 的 fixture 行间隙符号**：取决于 `f-a1-e2e-forensic.raw.txt` 原始 clientRects 的 y 差值；若无底账，我按代码推演认为「24pt=32px>25.6px 应为正间隙」，与头注「-1.6px 负间隙」矛盾。
2. **W3 的挂 A 空数组调用方**：diff 不含 `selectionToAnchor`/`findRangeAtOffset` 的判空代码。
3. **IPC 层 zod strict 对脏数据（NaN/null/w:0）的验证强度**：diff 不含 IPC handler，渲染层拿到的是否已过 schema 验证未知。

---

## 已查安全面清单

1. **幂等性成立**：对满足 INV-A~D 的输出（行间钳制恰好接触）重聚类时，两行中心距=(h1+h2)/2，容差=min(h1,h2)/2，正高度下恒不满足并簇条件——闭环验证通过，测试⑦佐证。
2. **双挂口径真同源**：resolved 走 `findRangeAtOffset → rectsBetweenPoints`（挂 A），挂 B 对其再归并幂等；存量 a.rects 由同一 `mergeRects` 兜底，无第二套归并逻辑。
3. **排序确定性可靠**：(中心y,x,y) 全序键 + ES2019 起 Array.sort 稳定，输入乱序不改变输出；测试⑨有实际约束力。
4. **测试无恒真断言**：各数值断言（x 并集 0.156、h 下中位 0.008、钳制后 y=0.202、渲染 left 10%/width 45%）均依赖具体归并结果，有血有肉。
5. **性能与异常传播可控**：mergeRects 纯函数零 DOM/React 依赖，O(n log n) 小 n，渲染热路径无感；输入含 NaN 不抛错但可能静默失效（已列 W2），无白屏级异常扩散。