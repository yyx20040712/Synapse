## 门一审查结论

**总体**:未发现 [B] 级阻断问题。六件迁移在 diff 层面逐行等价,消费方改向完整,两份并存红线在 diff 层面无残留。主要风险集中在 **M1 原案不可达诊断的可独立验证性不足**,以及若干头注/纪律声明在拆件后的准确性问题。

---

### [W] M1 原案不可达诊断的独立可信度不足;M1' 替代未覆盖原意图的 root.contains 防线

**证据**:
- 实现报告第四节:`"反向 range 经 jsdom Selection.addRange 被规范化为 collapsed(start/end 两边界均落入 root 内),变异体在 isCollapsed 首道防线即返回 null——root.contains 检查在 jsdom 用例中结构性不可达"`。
- diff 中受锁测试仅改动 import 块,用例体零改,因此不能从 diff 看到「选区跨出 root→null」用例的具体构造;报告也未附 jsdom 版本/最小复现脚本。
- 按 DOM 规范,`Selection.addRange` 并不负责将反向 Range 折叠为 collapsed;若测试构造的 Range 两侧点均在 root 外,`root.contains` 仍应可达。我**不能确认** jsdom 存在报告所述的"规范化为 collapsed"行为,因此该诊断的成立性存疑。

**独立评估**:
- M1'（`start = leadLen` → `leadLen + 1`）红 2 个 selectionToAnchor 用例,能证明这两个用例咬住 serialize 新源,达成 M1 的"防假绿"主要意图——这部分成立。
- 但 M1' **没有触达** root.contains 分支,因此无法替代原 M1 对「选区跨出 root→null」用例覆盖的验证。无论诊断是否成立,存量缺口客观存在:现有单测对该防线的实际执行路径没有红证。
- 处置建议:将 root.contains 的真浏览器反向选区覆盖记为独立工单(实现者已申明),并建议主控复核 `f-arch4-impl-m1-diagnosis.raw.txt` 与测试用例原文后再认定"结构性不可达"。

---

### [N] annotation-anchor.ts 头注"SelectionLayer/AnnotationLayer 只调用它"在拆件后不严格成立

**证据**:diff 中 annotation-anchor.ts 头注改写后保留:
```
 * - 全项目唯一操作 DOM 文本遍历的地方；SelectionLayer/AnnotationLayer 只调用它。
```
同时 SelectionLayer.tsx 的 import 已改为 `from './anchor-serialize'`。

SelectionLayer 现在**不再直接 import annotation-anchor**,而是通过 serialize 间接调用。该短句按字面读会误导读者认为 SelectionLayer 直接依赖 anchor。虽然后文补充了"anchor-serialize 消费此面",但建议将短句改为"SelectionLayer/AnnotationLayer 只经 anchor-serialize 调用它",避免 arch-scan/人工误读。

---

### [N] serialize 内 probeTextLength 直接创建 Range 并 toString,与"唯一 DOM 文本遍历点"纪律的边界未定义

**证据**:anchor-serialize.ts 内:
```ts
const probe = document.createRange()
probe.selectNodeContents(root)
...
return probe.toString().length
```
这是迁移原样,非本票新引入。但拆件后"全项目唯一操作 DOM 文本遍历的地方"从单文件扩展为两文件,serialize 也通过 `Range.toString` 读取了 DOM 文本内容。建议在 serialize 头注补一句明确边界,例如"文本枚举唯一发生在 annotation-anchor;本模块仅借 Range 做长度探测",以避免未来被 arch-scan 或人工误判为违反纪律。

---

### [N] AnnotationLayer.tsx 头注未同步的风险无法从 diff 排除

**证据**:diff 中 AnnotationLayer.tsx 仅显示 import 改动:
```
-import { findRangeAtOffset, verifyQuote } from './annotation-anchor'
+import { verifyQuote } from './anchor-serialize'
+import { findRangeAtOffset } from './annotation-anchor'
```
头注部分未出现在 diff 上下文中,无法确认其头注是否含有 `annotation-anchor.verifyQuote` 之类的旧引用。实现报告只枚举了三处消费方头注(SelectionLayer / anchor-locate / AiAnnotationLayer),未说明 AnnotationLayer 为何不需要同步。**不确定项**:需要查看 AnnotationLayer.tsx 完整文件确认;若其头注有旧引用,则为遗漏。

---

### [N] 受锁测试「选区跨出 root→null」用例名不副实(既有局限)

**证据**:实现报告 M1 诊断指出该用例实际由 `isCollapsed` 兜住,`root.contains` 未执行。若诊断成立,则该用例的测试意图(跨出 root)从未真正覆盖,属于存量测试盲区。本票未引入,但 M1 原案红证失败暴露了它,不应静默关闭。

---

## 已查安全面

- **六件迁移逐行等价**:serialize 中 verifyQuote / matchAt / SelectionAnchor / CONTEXT_CHARS / selectionToAnchor / probeTextLength 与 anchor 删除块逐字一致,未见等价改写(未改调 findRangeAtOffset)。
- **消费方改向完整**:SelectionLayer / anchor-locate / AiAnnotationLayer / AnnotationLayer / 受锁测试均按票面改向;typecheck exit=0 可证明无其他文件继续依赖旧导出。
- **导出扩面无多余**:serialize import 的五个原语函数全部被实际调用;NodeSpan / DomPoint / PixelBox 三类型为这些函数签名的公共面,无手写等价类型。
- **两份并存红线**:diff 中 anchor 删除块包含六件完整定义,serialize 恰含六件;anchor 头注无六符号名残留。
- **依赖单向成立**:anchor-serialize→annotation-anchor→annotation-merge,零环,无新增依赖,INV-40/annotation-merge 未触碰。