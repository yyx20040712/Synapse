## 门一补审（第二轮）结论

### 一、上一轮 B1 已消解

最终合入版 diff 已包含 R1/R2，B1 可以关闭：

- **R1 已落**：`edge-label-layout.ts:80` 的偏移序为  
  `dxs = [0, -(hw+16), hw+16, -(hw+16)*2, (hw+16)*2]`；`edge-label-layout.ts:82` 为 `i <= 10`，即 dy 域确实扩到 ±10lh；测试 `②b/③b/⑤/⑧` 也按新包络断言。
- **R2 已落**：`LineageEdges.tsx` 的 wheel 委托含  
  `e.stopPropagation(); e.preventDefault(); label.scrollTop = clamp(...)`；测试 ⑨ 断言 `scrollTop` 由 0→240→340，且未截断标签不吞 zoom。

---

### 二、上一轮 W1~W5/N1~N5 在最终代码上的复核

#### W1：成立，回退分支仍是“静默 best effort”

证据：`edge-label-layout.ts:94`

```ts
const finalSlot = slot ?? { x: it.anchor.x, y: it.anchor.y }
```

`edge-label-layout.ts:96` 仍把回退槽位写入 `placed`，测试 ⑤ 也明确锁定了“节点盒铺满整个包络时回 anchor”的行为。R1 只是把回退概率降低，没有消除“用户保证①”在极端密集图下的字面缺口；且发生回退时没有任何运行时告警或测量手段。

#### W2：成立，且是回炉后仍最值得关注的一条

证据：

- `edge-label-layout.ts:75-77`：碰撞盒宽 = `estimateLabelWidth(label)+GAP`，高 = `EDGE_LABEL_H+GAP`；
- 但 `LineageEdges.tsx` 渲染的 `foreignObject` 恒为 `EDGE_LABEL_MAX_W × EDGE_LABEL_H`，即 130×37.05；
- `.lineage-edge-label` 的交互盒按前轮证据是 `width:100%; height:100%; pointer-events:auto`。

因此两个短标签的估宽文本盒可以分离，但 130px 宽的 FO/div 交互盒仍可大面积重叠。wheel 委托用 `closest('.lineage-edge-label')` 只会命中顶层 div，下层标签的滚动语义被吞。**第三档 dx 只保证估宽盒分离，不保证 FO 交互盒分离。**

#### W3：成立，但影响弱于原报告

证据：`LineageCanvas.tsx` 的 `labelBoxes` 仍写成

```ts
hw: estimateLabelWidth(e.label) / 2,
hh: 18.5
```

未使用 `EDGE_LABEL_MAX_W / 2`，也未加 `GAP`。对满宽标签估宽被钳到 130，与 FO 半宽一致；对短标签 fit 盒会小于 FO 盒，理论上 FO 透明区/白晕边缘可能被视口裁到。文本主体在估宽准确时仍大概率在 fit 盒内，所以保留为弱 W。

#### W4：成立，但依赖 theme.css 现状

最终 diff 中没有出现 `theme.css` 的改动。若 `theme.css` 中 `.lineage-edge-label` 仍是 `box-sizing:border-box; padding:2px; height:100%; max-height:37.05px; overflow:hidden`，则 3 行行高合计 37.05px，内容区只有 33.05px，第三行底部会被裁约 4px。该条是否最终成立取决于 theme.css 基线内容，明确标注为“依赖基线，待核验”。

#### W5：基本消解，残余降为 N

最终测试 ⑨ 已锁定主动 `scrollTop` 累计滚动与“未截断不吞 zoom”，上一轮“没有验证 scrollTop 是否被推进”的缺口已补。残余问题仅是 jsdom 无法提供真实布局，`scrollHeight/clientHeight` 仍由 `Object.defineProperty` 注入，真实浏览器下 `scrollHeight>clientHeight+1` 的判定和 FO 内 wheel 命中仍依赖 CSS（见 W0）。

---

### 三、回炉新增面攻击

#### 3.1 `±10lh 20 档 dy`

- 代码实际是 `dy=0 + 10 个正档 + 10 个负档`，即 21 个 dy 候选位置；票面若按“两个方向各 10 档”理解则一致，若按“总共 20 档”则差 1 个零档。不构成行为问题，记录。
- 包络变大后，标签可以离锚点最远达 `±123.5 + 半盒高` 或 `dx ±166 + 半盒宽`，确实能移出 100 高节点盒；测试 ②b/③b/⑧ 锁住了该新行为。

#### 3.2 第三档 dx

- `edge-label-layout.ts:80` 的 `-(hw+16)*2` / `+(hw+16)*2` 对满宽标签正好给出 ±166，与测试 ⑧ 的 `-166` 一致。
- 但它只对“估宽碰撞盒”成立；对 FO/交互盒恒 130 宽的短标签，第三档并不保证交互盒分离。这一点已并入 W2。

#### 3.3 主动 `scrollTop` 钳制滚动

- 钳制逻辑本身正确：`Math.max(0, Math.min(scrollTop+deltaY, scrollHeight-clientHeight))` 能防止越界。
- **新发现边界**：handler 只要进入 `scrollHeight > clientHeight + 1` 分支就无条件 `stopPropagation` + `preventDefault`，不判断 `deltaY` 方向是否还有可滚动余量。例如标签滚动到顶部后继续向上滚、或滚到底部后继续向下滚，仍然吞掉 zoom/页面滚动。建议按可达余量放行，或至少作为交互边界记录。
- 另外未处理 `WheelEvent.deltaMode`；若出现 line/page 模式，`deltaY` 直接加到 `scrollTop` 的语义会偏差。

#### 3.4 `preventDefault`

- 调用位置在截断分支内，语义强于单纯 `stopPropagation`，且 `g` 根原生监听器位于 svg zoom 祖先监听器冒泡链上游，时序上可以阻断。
- jsdom 测试未断言 `defaultPrevented`，真机行为仍依赖 `.lineage-edge-label` 的 CSS/pinter-events 是否命中，见下。

---

### 四、最终 B/W/N 结论

#### B

- **B1 已消解**，无新增可确证 B。

#### W0（核验项，若坐实则升 B）

最终合入版 diff **没有包含 `theme.css` 的任何改动**，但：

- `LineageEdges.tsx` 新增依赖 `className="lineage-edge-label"`；
- 测试 ⑩ 直接读取 `theme.css` 断言 `.lineage-edge-label` 的 `overflow-wrap/max-height/overflow` 与 `:hover` 段 `overflow-y:auto`。

如果该 class 在基线 `theme.css` 中已存在（前