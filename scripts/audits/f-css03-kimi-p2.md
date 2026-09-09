[routing]: run=20260909232022-7pf5 source=kimi-main model=kimi-k3 switches=0 usage=in=4999,out=3903 latency=193500ms (by ds-call.mjs 链)

## F-CSS-03 补审·片二（测试断言面）裁决

**[N] ①12 改点逐条对照——无断言弱化**
全部改点为「载体字面替换」：toBe→toBe、toContain→toContain、正则骨架（`\.lib-card\s*\{[^}]*` / `\.syn-btn-primary...`）原样保留，仅 rgba/hex 字面换 var() 载体；值面锚移交 theme.test TOKENS 正锚（新增条目计数=48，与票面「48 新 token+2 既有消费」口径相符，亲数 8+4+1+1+3+6+2+8+2+2+1+2+2+1+1+1+3=48）。
证据：theme.test.ts L114-167 新增 48 行；library-cards L210 `inset 0 1px 0 var\(--panel-a90\)` ↔ TOKENS `['--panel-a90','rgba(255, 255, 255, 0.9)']`。

**[N] ②2 变异锚随迁正确**
优先级翻转变异后该边 stroke 载体即 `var(--edge-inferred)`，新 `not.toBe('var(--edge-inferred)')` 仍红证有效；TOKENS 值面 `#8a94a6` 有正锚。
证据：lineage-canvas-visual.test.tsx L236-238；lineage-manual-edit.test.tsx L189-190。

**[W] ②-补 变异锚保护域窄化（低危）**
新锚只红「token 载体世界的翻转」；若回归以旧字面 `#8a94a6` 呈现则锚静默通过。lineage-canvas-visual 有同域正锚（L201 toBe var 载体）兜底；lineage-manual-edit 本 diff 内未见同域正锚——不确定其上下文是否另有正向断言，若无则该面漏检旧字面回归。
证据：lineage-manual-edit.test.tsx L190 `expect(p?.getAttribute('stroke')).not.toBe('var(--edge-inferred)')`。

**[W] ③ jsdom var() 序列化假设——版本敏感耦合**
`el.style.background='var(--panel)'` 经 cssstyle 序列化原样保留依赖 cssstyle≥2.3 的 var() 直通行为；`getAttribute('style')` toContain var 串同理。注释自述 jsdom 实证+locks 311 已锁，残留风险低，但该假设与 jsdom/cssstyle 升级耦合，未来升级可能批量红。
证据：lineage-side-panel.test.tsx L320-323「var() 载体在 jsdom style 序列化原样保留，无 CSSOM rgb 归一」；pdf-page-canvas L128-130。

**[W] ③-补 SVG presentation attribute 携 var() 的跨引擎可渲染性——不确定**
`fill="var(--panel)"` / `stroke="var(--edge-inferred)"` 写在 SVG 属性上：jsdom 只存串不验证渲染；Firefox 历史上不支持 presentation attribute 内 var()。像素差分八态 0 带说明目标截图管线无差，但跨引擎（尤其 file:// 直开/其他浏览器）渲染有效性本测试面无防线。不确定目标宿主是否 Chromium-only。
证据：lineage-canvas-visual.test.tsx L100 `expect(core?.getAttribute('fill')).toBe('var(--panel)')`。

**[N] ④ transparent 等价改写**
`rgba(255,255,255,0)`→`transparent`：alpha=0 渲染零差，pdf.js background 参数接受 CSS color keyword；断言在 mock 调用面，行为等值。无问题。
证据：pdf-page-canvas.test.tsx L85-86。

**[N] ⑤ 标题/注释随迁**
R5「.45→a45」、LG11「#8a94a6→--edge-inferred」、侧板「--panel-a92/--border」等描述性改名与断言载体一致，无文断言错位。

---

**统计**：B=0｜W=3（变异锚窄化/jsdom 版本耦合/SVG var 跨引擎不确定）｜N=4
**总评**：12 改点全为等价载体替换、变异锚随迁方向正确且值面锚独立成锁，无放松证据；3 项 W 均为环境/回归面残留风险而非本轮实现缺陷，其中 lineage-manual-edit 是否另有同域正向锚建议主控一眼确认。