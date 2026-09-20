# F-RDR-01 选区闪烁修复——设计定稿（主控终裁）

> 三段链全记录：Kimi 拟定 v1（kimi-main，in1703/out5202）→ deepseek 审核 B5/W8/N5
> **返工**（f-rdr01-review-ds.md）→ 主控实勘四事实+逐条裁定 → Kimi v2（in1592/out9069，
> f-rdr01-design-kimi-v2.md）→ deepseek 二轮复审 B2/W9/N2 **返工**（f-rdr01-review2-ds.md
> ——二轮 B 级经主控复核系口径/顺序问题非结构缺陷，按 D8 终裁职权处置）→
> **本文=终裁定稿**（v2 全文有效+下述终裁修正 12 条）。设计链归档三件仓外
> scripts-audits/f-rdr01-{design-kimi,review-ds,design-kimi-v2,review2-ds,prompt*}.md。

## 终裁修正（在 v2 之上，实施票以此为准）

1. **插桩顺序（二轮 B1 终裁）**：selection-evaluate.ts visual 分支内 **B 守卫在前、A 吸附在后**：
   ```ts
   // visual 分支（函数级锚=实勘具名回填）
   if (shouldSkipVisual()) return          // B：S5 冗余重绘直接丢弃（TTL 窗=S4 帧保持期）
   const aSnap = snapVisualBoundary(sel.anchorNode, sel.anchorOffset, 'anchor')  // A
   const fSnap = snapVisualBoundary(sel.focusNode, sel.focusOffset, 'focus')
   const effAnchor = aSnap ?? { node: sel.anchorNode, offset: sel.anchorOffset }  // 空守卫 fallback
   const effFocus = fSnap ?? { node: sel.focusNode, offset: sel.focusOffset }
   // …以下原几何计算，改用 eff 边界
   ```
   TTL 窗内 A 不执行=设计意图（窗=S4 正确帧保持期，无需重算）。
2. **计数口径（二轮 B2 终裁）**：z-* 探针属 probe project **不进默认门**（F-TESTREF-W2
   拆分口径）——真口径=**e2e 默认门 42 不变**；probe project 用例 3→4；vitest +6
   （A 三态 3+B TTL 2+mousedown 清 1，另加主路径用例见修正 11 共 +7）；指纹门
   +1 文件+8 用例。baseline 重冻结随实现票（增减=上述枚举，无豁免申请）。
3. **prevFocus 快照删除（二轮 W2 终裁）**：免缓存方案下恒等判定无消费方——
   mark 无条件调用（恒等写回时 S4 full 亦画正确帧，mark 无害）。SelectionLayer
   mouseup 接线简化为：写回后、`evaluate.full(true)` 前调 `markAffinityShortcutFlushed()`。
4. **具名插入点（二轮 W1）**：实现票首动作=实勘 selection-evaluate.ts visual 分支
   函数名并回填本定稿（锚点冻结——后续行号漂移以函数名+本定稿为据）。
   **〔实施回填 2026-09-20：visual 分支=selection-evaluate.ts `visual()` 函数
   （createEvaluate 工厂内闭包，实施时 :217 起）；B 守卫=函数体首行，A 吸附=
   四道守卫后 :249-253——门二 C2 补件〕**
5. **探针末帧断言（二轮 W3）**：e2e 探针除「相邻帧无 y 减序对（容差 1px）」外加
   **末帧 y==S4 吸附行尾 y±1px** 绝对断言（证「弹回」方向）。
6. **基准链（二轮 W4）**：基准采样改 **mouseup→selectionchange→visual 真链**（探针
   内完成拖选后 mouseup，夹取 visual 分支 performance.now）；冷缓存场景（首次
   探测未命中）纳入采样。mousemove 采样弃。
7. **适配层操作集（二轮 W5）**：白名单=类型转换/解构/参数重排/空值合并；**禁止**
   任何行尾几何计算或 DOM 位置比较。违反=第二套行尾语义即违规红。
8. **TTL 测试口径（二轮 W7）**：99/100/101 三点+performance.now stub（vi.spyOn 或
   注入时钟）；探针帧数下限 10 帧维持+headless 节流容差说明（有效帧不足=重跑
   上限 3 次后 skip 记档，不假绿）。
9. **W9 残留裁定**：TTL 窗内键盘/程序化改选区停留过期帧 ≤100ms=**可接受残留**
   （拖选交互场景键盘改选罕见+错帧有界）；S5 迟到观测=探针记录 selectionchange
   到达延迟，若实测 >100ms 则调常量（R1 校准条款，仅改常量不动结构）。
10. **闭合并账（二轮 W8）**：一轮 B1→v2 §4.2 免缓存+本文修正 1；B2→v2 §4.1.6+
    本文修正 7；B3→v2 §①实勘；B4→v2 §⑤+本文 M3；B5→v2 §4.2+本文修正 3/4；
    W1-W8→v2 对照表+本文修正 4-8；N1-N5→v2 §⑥+本文修正 2/11；二轮 B1/B2→本文
    修正 1/2；二轮 W1-W9→本文修正 3-9；二轮 N1/N2→本文修正 11/12。
11. **主路径用例（二轮 N1）**：单测加「textLayer 内+未越末行+探测非空→不吸附
    走原边界」（守卫假路径回归锁）。
12. **导出面约束（二轮 N2）**：markerAt/isBlankMarker 导出注释=「仅供 visual 吸附
    通道消费；锚定序列化侧继续走 snapBlankBoundary 门面，勿直引」（防 API 泛化）。

## v2 有效面（未修正部分照 v2 执行——全文见 f-rdr01-design-kimi-v2.md）

A 路径（anchor-blank-snap.ts：导出修饰+snapVisualBoundary[守卫 closest('.textLayer')/
空守卫 fallback/末行吸附复用 rowEndOf]）；B 路径（selection-evaluate.ts module-level
三函数 mark/shouldSkip/clear+TTL=100ms）；释放=TTL 到期+mousedown 清；SelectionLayer
接线（mouseup mark 于 full 前/mousedown clear）；受锁影响（src 三件零 sha 面；
新探针件入锁+指纹门 [test-refactor]+baseline 重冻结）；实施五步+单链提交
[locked-change]+[test-refactor] 双尾注+回滚=revert 单提交（弃特性开关）。

## 硬红线（承袭不变）

text-layer.css 禁改；SELECTION_DEBOUNCE_MS=200 禁动；::selection transparent 勿动；
锚定序列化语义不破（锚定回归网 18 物理件全绿为验收底线）；分层单向
interact→anchors/state。

## 验收基线（终态）

e2e 默认门 42 不变全绿+probe 4 用例+vitest +7+锚定回归网全绿+快路径守卫 P95≤1ms
（真链基准）+探针 y 序列无减序对+末帧吸附断言+净行为=空白区下拖全程无先下后上回跳。
