# F-L1-C 门一补审发现

> 审查基线：本审严格以「实现 diff」加「实现者报告」为材料。**先声明一项基线失真**，它影响后续所有结论的可验证性，列为 B1。

## B（阻断 / 基线失真）

### B1 审查基线失真：呈现的 diff 与实现者报告的回炉后状态不一致

实现者报告第八节明确声称已合入回炉 1（R1/R2）：

> dy 阶梯 ±5lh→**±10lh**（20 档，±123.5）；dx 阶梯加第三档 **±(w/2+16)×2**（满宽标签 ±166）
> ⑧行为断言随扩容同步：原断言恰 4lh 必红，改锁 −166+同 y
> R2 wheel 改主动滚动：`scrollTop = max(0, min(scrollTop+deltaY, scrollHeight-clientHeight))` + `e.preventDefault()` + `e.stopPropagation()`

但呈现的 diff 中：

- `edge-label-layout.ts` 仍为 `for (let i = 0; i <= 5 && slot === null; i++)`，即 dy 域仍为 ±5lh；
- `dxs` 仍只有 `[0, -(hw + 16), hw + 16]`，没有第三档 ±166；
- `edge-label-layout.test.ts` ②仍断言 `toBeLessThanOrEqual(5 * LH + 1e-9)`；
- `lineage-canvas.test.tsx` ⑧仍断言 `fos[1]! - fos[0]!` 恰为 `4 * 12.35`——按回炉报告该断言应已改为 `−166+同 y`；
- `LineageEdges.tsx` 的 wheel 处理仍只有 `stopPropagation()`，没有报告中的主动 `scrollTop` + `preventDefault`。

**含义**：若合入代码就是这份 diff，则 R1/R2 全部未落，验收记录失真；若合入代码已含回炉，则本审查所依据的 diff 不是最终产物。两种情况下门一都无法对「已合入实现」给出可信结论。**这是过程阻断，不是对具体代码行为的判定。** 若回炉代码确实已合入，请以最终合入版本重新提供 diff。

---

## W（警告）

### W1 「best effort」回退在密集图会静默违反用户保证①

`edge-label-layout.ts`：

```ts
const finalSlot = slot ?? { x: it.anchor.x, y: it.anchor.y }
```

当 33 个候选位全部被占时，标签被放回锚点。锚点是边线中点，经常位于节点卡下方或贴近节点；而节点卡在 `LineageCanvas` 中渲染于 `LineageEdges` **之后**（SVG 后绘制者在上），因此回退标签会被节点卡覆盖：既不可见，也无法悬停滚动。票面虽以头注声明「极端密集图仍有重叠可能」，但用户原话是「**保证**布局时脉络标签不重叠遮挡」。该实现把「保证」降级为「尽力」，且**没有运行时告警或测量手段**去发现回退发生了。R1 扩容后包络更大，但回退分支仍存在且没有可见信号。

### W2 碰撞盒只建模估宽文本，FO/div 交互盒恒 130×37.05——悬停区可能互相重叠

`estimateLabelWidth('说明')` 约 23，碰撞盒半宽约 13.5；但渲染出的 div 是：

```tsx
<foreignObject width={EDGE_LABEL_MAX_W} height={EDGE_LABEL_H} ...>
```

CSS `.lineage-edge-label` 为 `width:100%; height:100%; pointer-events:auto`。放置器只保证「估宽文本盒」分离，不保证两个 130px 交互盒分离。因此两个短标签视觉文字不重叠，但它们的 HTML div 可能大面积重叠。`wheel` 委托用 `closest('.lineage-edge-label')` 判定，会选中最上层的那个 div，另一个标签的滚动交互区被吞掉。视觉保证不破，但**交互保证②在短标签密集处可能错乱**。

### W3 auto-fit 包围盒只含估宽文本盒，不含 FO 恒宽 130

`LineageCanvas.tsx`：

```ts
labelBoxes 的 hw = estimateLabelWidth(e.label) / 2, hh = 18.5
```

票面意图是「被推出的标签不可消失在 fit 视野外」。但 `estimateLabelWidth` 对短标签远小于 130，而实际渲染盒是 130×37.05。若估宽偏差使文本边缘超出该盒，fit 视野会先于文本裁切。例如 60 个 latin 字符估宽被钳到 130，fit 盒半宽 65，接近 FO 半宽 65，尚可；但短标签 fit 盒远窄于 FO，而 FO 的透明区又恰好是白晕 text-shadow 的视觉边界，观感上标签可能贴近视野边缘。建议 fit 盒取 `{ hw: EDGE_LABEL_MAX_W/2, hh: EDGE_LABEL_H/2 }` 或 `max(估宽, FO宽)`。

### W4 `padding: 2px` 使 3 行文本不被完整包含——「max-height 3 行」实际约 2.7 行

`.lineage-edge-label`：

```css
box-sizing: border-box;
height: 100%;
padding: 2px;
max-height: 37.05px;
```

FO/div 总高 37.05，三行文本高 `3 × 9.5 × 1.3 = 37.05`，但 padding 上下各 2px 后内容区只有 33.05px，第三行可见约 10px，底部被 `overflow:hidden` 裁掉约 4px。虽然滚动能补看，但票面「max-height 3 行」的字面语义打了折扣。若想要「3 行完整可见」，应把 padding 改为横向只留 4px（`padding: 0 2px`），或把 FO 恒高改为 37.05 + 4。

### W5 节流/合并：jsdom 测试⑨依赖 `Object.defineProperty` 改 `scrollHeight`，真机行为未被组件级锁定

测试⑨用 `Object.defineProperty` 把截断态硬编码成 `scrollHeight=999`，然后断言 wheel 后 transform 不变。这只验证了「stopPropagation 被调用」这一条路径，**没有验证真实布局下 `scrollHeight>clientHeight+1` 判定与 `:hover` 滚动可视性**。票面已把真机取证推给主控，但若回炉后的主动滚动代码存在，它连 `scrollTop` 是否被推进都没有在 jsdom 断言（回炉报告称有，但 diff 未显示）。这条属于 B1 的延伸。

---

## N（注意 / 脆弱点）

### N1 `scrollHeight > clientHeight + 1` 的 1px 魔数

`LineageEdges.tsx` wheel 委托：

```ts
if (label !== null && label.scrollHeight > label.clientHeight + 1) e.stopPropagation()
```

规格原样写死 1px。语义上这是防亚像素误差，但若标签恰好截断 1px，用户滚动无法查看最后 1px；且不同浏览器/缩放下 `scrollHeight - clientHeight` 的亚像素表现不同。建议改为 `>= 1` 或声明该容差来自哪个浏览器取证。

### N2 dx 偏移与票面表达式差 2px

票面：`dx ∈ 0,−(w/2+16),+(w/2+16)`。
实现：

```ts
const hw = (estimateLabelWidth(it.label) + GAP) / 2
const dxs = [0, -(hw + 16), hw + 16]
```

即实际是 `-(w/2 + 18)` / `+(w/2 + 18)`。这不是问题，但与票面字面不一致，若后续有人按票面数值校准会困惑。

### N3 估宽启发式对非 CJK/非 Latin 字符粗糙

`estimateLabelWidth` 对所有 `>0x2E80` 码点计 9.5px，其余计 4.75px。零宽连接符（U+200D，<0x2E80）被计 4.75px；全角空格、组合音标等也按整宽计。票面已声明这是「0.5em 近似、由 gap 吸收」，故仅记为 N。

### N4 字体渲染与宽度估算的字体族不一致

`estimateLabelWidth` 假设 CJK 9.5px、Latin 4.75px，但 CSS `font-style: italic` 会改变字形度量，`text-shadow` 白晕四向 2px 实际也向外扩 2px 视觉边框。碰撞盒没有为 `text-shadow` 留白，极端情况下两个标签视觉上被白晕边缘「贴住」。影响极小，记录在案。

### N5 测试读取 CSS 用 `process.cwd()`

`lineage-canvas.test.tsx`：

```ts
readFileSync(join(process.cwd(), 'src/renderer/shared/theme.css'), 'utf8')
```

依赖 vitest 运行目录为仓库根。若 CI 从子目录或 monorepo 根启动，可能读错路径。建议用 `import.meta.url` 相对定位。

---

## 已查安全面（≤5）

1. **wheel 时序设计**：`LineageEdges` g 根原生监听器位于 svg zoom 监听器的冒泡链上游，`stopPropagation()` 能可靠阻断 svg zoom；React 合成 wheel 委托在 root 容器，时序更晚，不存在「合成先于原生」的竞态（除非未来有人给 svg 加 capture 监听器）。
2. **空 label 与钩子延续**：`e.label === ''` 不渲染 FO；`data-edge-label`、`data-edge-id`、`title` 全文 tooltip 均保留，受锁断言形态无关。
3. **放置器确定性**：偏移序（dy 11 档 × dx 3 档）严格确定；`hits` 用严格 `<`，恰好接触判分离；节点盒外扩 6 通过半宽半高加 `NODE_PAD` 实现，四向均等。
4. **fitViewport 向后兼容**：第 5 参缺省为模块级常量 `EMPTY_LABEL_BOXES`，引用稳定，不会因 `?? []` 新引用触发 effect 无限循环；`labelBoxes` 参与 min/max 时 `yMin`/`yMax` 逻辑与既有节点路径一致。
5. **单委托性能与生命周期**：g 根一条原生 wheel listener 覆盖全部标签，`useEffect` 依赖 `[]` 成对清理（INV-14 模式），无逐标签绑定，内存与事件成本可接受。

---

**结论**：除 B1 基线失真外，未发现可确证的 B 级行为破坏；W1–W5 指向「两硬性保证」在边界情形下的兑现缺口，建议主控在收口时逐一给出裁决或后续补强。其中 W2/W3/W4 均有明确代码证据，优先处理。