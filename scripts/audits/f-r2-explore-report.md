# F-R2 排查报告 —— ui-scale≠1 时阅读器程序滚动落点漂移（160-450px）根因排查（只读）

> 排查人：U1 只读排查子代理（2026-09-02）。方法=systematic-debugging 四阶段（Phase1 组件边界取证→Phase2 模式对比→Phase3 假设排序；Phase4 留实现者）。
> 铁律遵守：本报告为唯一仓库写产物；未跑任何 npm/test/electron；未动 git。
>
> 开工技能清点：systematic-debugging=用（四阶段方法纪律）；test-driven-development / verification-before-completion=不用（只读排查，红测与验证归实现者 Phase4）；browser-use/webapp-testing 类=不用（禁启动浏览器/Electron，真机探针归主控）；其余领域技能与本票技术面无关。

---

## ① 现象与证据档索引

**现象（台账 F-R2 原文口径）**：ui-scale≠1（用户 large 档=1.25）时，阅读器「反向 zoom 豁免」与「程序滚动差值法」交互导致程序滚动落点漂移 **160-450px**；**单页模式同样复现**（非 F-R1 引入，存量缺陷）；ui-scale=1 不漂移（天然 A/B 对照面）。

| 证据档 | 内容 | 关键数值 |
| --- | --- | --- |
| `scripts/audits/f-r1-dbg.mjs` | ui-scale=1.25 实况探针（用户 settings.json 原样复制）：fill(1)/fill(4)/下一页 三跳场景 + GEOM 全景（`contentTop = g.top − gs.top + sc.scrollTop` 混合口径，:39-51） | 期望值按 ui-scale=1 语义预写：fill(4)→页4顶 12+3×805=2427；下一页(4→5)→3232（:85-88）。**漂移数值出自该运行控制台输出（未落盘）**；`dbg-geom.png` 为落点截图 |
| `scripts/audits/f-r1-verify.json` | **ui-scale=1 对照组**（`f-r1-verify.mjs:50-70` 预写**删除 uiScale 字段**——头注明言「ui-scale≠1 下程序滚动落点存在既有漂移…F-R1 全链零改——非本票缺陷，报主控备案」） | 20 页 PDF、盒 595×793、视觉间距恒 805（=793+12 gap）。D_single 场景：跳页4 后 st=2427.2、box4 g.top=114.1875；由 pre 场景反推 scRect.top=114.387、contentTop(box1)=12.0 → **落点收敛误差 −0.2px（delta 法在 Z=1 精确收敛）** |
| `scripts/audits/f-v2-out/diag-raw.txt` | ui-scale=1.25 结构链实测（`f-v2-diag.mjs:96-116` 目标元素上溯 body 逐层 clientW/offsetW/gBCRW/computed zoom） | `[data-page-column]` zoom=**0.8**（clientW=offsetW=gBCRW=1482）；「relative」包装 zoom=1（clientW **1193** vs gBCRW **1491.8**=×1.25）；scroller `.overflow-auto.p-3` zoom=1（clientW 1217 vs gBCRW 1537）；`.app-content-row` zoom=**1.25**（clientW 1642 vs gBCRW 2052）；根容器 zoom=1 |
| `scripts/audits/f-l2-precheck.mjs` | lineage 侧同型污染前置实测范式：三档（1/1.1/1.25）×「clientWidth 本地 vs gBCR 视觉」量测口径 | 本票真机探针直接复用（见⑦） |
| `scripts/audits/f-r1-verify.mjs:50-54` | F-R1 作者对漂移的原始备案（猜测「与 CSS zoom 豁免区/浏览器 scroll-anchoring 交互相关」——本报告证据将其收窄为坐标空间单位混用，scroll-anchoring 降为低置信假设 H4） | — |

**dbg-geom.png**：单页模式、ui-scale=1.25 下 fill(4) 落点截图（页4 顶被推出/未对齐的几何形态；png 为辅证，数值链以 json+机制推演为准）。

---

## ② 程序滚动全链调用图（入口→差值计算→落点，file:line）

```
【跳页主链】（单双页同链——单页复现的结构原因）
页码输入 fill+Enter / 工具栏「下一页/上一页」/ OutlinePanel 目录 / 恢复链 scrollToPage
  → reader.store.ts:350 setPage(page)          （:359 0基夹取；:362-364 默认 scroll:'to'
                                                 → bump scrollRequest={paperId,page,seq}，INV-29 双源信号）
  → PageColumn.tsx:179-184 段⑤ effect          （:181 clampPageToColumn；:182 querySelector
                                                 `[data-page-box="${no}"]`——占位盒恒在，测量面就绪）
  → scroll-converge.ts:41-51 scrollIntoNearestScroller(box,'start')
      :44  elRect = el.getBoundingClientRect()        ← 【视觉 px（根坐标，含祖先 zoom×1.25）】
      :45  scRect = scroller.getBoundingClientRect()  ← 【视觉 px】
      :48  raw = scroller.scrollTop + (elRect.top − scRect.top)   ← 【scrollTop=本地 px + 视觉差值 —— 单位混用点★】
      :50  scroller.scrollTop = clamp(raw, 0, scrollHeight − clientHeight)  ← 【clamp 分母=本地 px，与写入口径一致】

【锚点定位链】（N1 片段跳转 exact 层）
anchor-locate.ts:247 locateAnchor → :279 setPage(anchorPage)（走上面主链到页盒顶）
  → :287/:288 flashAnnotation/flashAiNote → :239-245 flashElement
  → scroll-converge.ts:242 scrollIntoNearestScroller(el,'center')   ← 同一 ★ 点（:49 center 算式同样混单位）

【缩放锚链】（zoom 变化：工具栏±10%/适应宽度/100% 按钮）
PageColumn.tsx:186-196 段⑥镜像（scroll 事件被动写 liveScrollTop=el.scrollTop ← 本地 px）
  → :200-215 useLayoutEffect（zoom prop 变化）
  → :209-214 el.scrollTop = anchoredScrollTop(liveScrollTop, el.clientHeight,       ← 本地 px
        columnTotalHeightFor(sizes, from, layout), columnTotalHeightFor(sizes, zoom, layout))  ← 列内 px（未折算）
  → page-column-geometry.ts:53-58 anchoredScrollTop（(st+vh/2)/总高 比值法，:57 顶底夹取）

【进度回写/恢复/到达判定链】（不直接写 scrollTop，但决定「目标页」与「到达」判断）
scroll-progress.ts:123-129 centerPage = nearestPage(vp.scrollTop + vp.clientHeight/2, boxes)
    :281   vp = { scrollTop: el.scrollTop（本地）, clientHeight: el.clientHeight（本地） }——两值同空间 ✓
    :283-291 getPageBoxes: top = r.top − base.top + el.scrollTop   ← 【gBCR 视觉差值 + 本地 scrollTop —— 混合空间★2】
  消费：:183-186 restoring 到达判定（cur===target）；:193 回写账本；:225/:293 恢复 scrollToPage

【键盘滚动链】（对照：单位自洽，无漂移）
ReaderShortcuts → ReaderPage.tsx:90-93 scrollByRatio: el.scrollBy({top: clientHeight×ratio})（本地×本地 ✓）
```

**同一 scroller 的三个坐标空间**（f-v2 链实测）：
- **视觉 px**（gBCR）：内容间距 805/页（与 ui-scale=1 完全相同——反向豁免 E×Z=0.8×1.25=1 使 PDF 视觉恒 1）；
- **滚动/布局本地 px**（scrollTop/scrollHeight/clientHeight/offsetWidth）：内容间距 805×0.8=**644**/页；clientHeight=889 本地（视觉 1111）；
- **列内布局 px**（columnTotalHeightFor 语义）：间距 805——与视觉数值相同但属另一空间（scrollHeight 空间=列内×0.8）。

---

## ③ uiScale 链路（设置→DOM 注入→阅读区反向豁免的确切实现行）

```
src/shared/ipc/schemas.ts:390-393   UI_SCALE = { small: 1, medium: 1.1, large: 1.25 }（数值单源）
src/renderer/app/App.tsx:127        uiScale = useSettingsStore(s => s.settings?.uiScale ?? 'small')
src/renderer/app/App.tsx:135        document.documentElement.style.setProperty('--ui-scale', String(UI_SCALE[uiScale]))
src/renderer/shared/theme.css:131-136
   .app-content-row   { zoom: var(--ui-scale, 1); }          ← 界面缩放挂载行（nav+main 整行，header 行外豁免）
   [data-page-column] { zoom: calc(1 / var(--ui-scale, 1)); } ← ★反向 zoom 豁免（PDF 视觉恒 1；R2-SET1）
```

DOM 层级（f-v2 链 + ReaderPage.tsx:170-192）：

```
app-content-row(zoom 1.25) > main(zoom 1) > … > .overflow-auto.p-3【滚动容器，zoom 1】
  > div.relative【稳定包装盒，zoom 1】 > PdfDocProvider > PageColumn[data-page-column](zoom 0.8)
      > PageBox[data-page-box](595×793 布局) / data-page-row(双页行)
```

关键推论：**zoom 挂载点在滚动容器之上、豁免点在滚动容器之内容**。因此滚动容器的 scrollTop/scrollHeight/clientHeight 处于「本地空间」（列内×0.8），而 gBCR 处于「视觉空间」（本地×1.25）——两空间比值恒 Z=1.25（等价 1/E）。`ReaderPage.tsx:146-151` fitWidth 已实证认知该比值并显式推导（`gBCR.width/offsetWidth`），但滚动链三处消费点（②中标 ★/★2）未做同样折算。

---

## ④ 漂移机制推演（数值级）

**Chromium（Electron 42）legacy zoom 语义**（f-v2 链+reader-scroll e2e+F-L2 前置共同实证）：祖先 zoom=Z 的子树内——gBCR=视觉 px=本地 px×Z；scrollTop/scrollHeight/clientHeight/offsetWidth=本地 px（读 写同空间；F-L2 Q1 同结论的 lineage 侧先例）。

**H1 机制（scrollIntoNearestScroller 差值法单位混用）**：

设跳页前滚动位 s（本地），目标盒顶内容坐标 C（本地）。目标盒的视觉差值：
`δv = elRect.top − scRect.top = (C − s)×Z`。

- **正确修正量（本地）**：`Δ* = C − s = δv/Z = δv×0.8`；
- **代码实加（scroll-converge.ts:48）**：`Δ = δv`（把视觉差值当本地 px 直接加）；
- **落点误差**：`(Δ − Δ*)×Z = δv×(1 − 1/Z)×Z = δv×(Z−1) = **0.25×δv 视觉 px**（过冲，方向=向下跳时目标被顶出滚动容器顶之上）。

**量级对账（1.25 档，视觉页距 805px）**：

| 跳前视觉距离 δv | 落点漂移 0.25×δv | 对应场景 |
| --- | --- | --- |
| ≈644（0.8 页） | ≈161px | 短距跳/恢复链微调 |
| ≈805（1 页） | ≈201px | 「下一页」单页步进 |
| ≈1610（2 页） | ≈402px | 双页翻面/隔页跳 |
| ≈1800（2.2 页） | ≈450px | 票面上界 |

**与票面 160-450px 完全同量级**（δv∈[640,1800] 即典型 0.8~2.2 页跳距；fill(4)-from-页1 的 δv≈2415 会给 ~604px，是否到达取决于起始位与 clamp 夹取）。**单页复现**：段⑤/flashElement 对单双页同一实现，无布局特判 ✓。**ui-scale=1 不漂移**：Z=1 时 δv 即本地差值，公式退化为精确——verify JSON 实测收敛误差 0.2px ✓（天然 A/B 闭合）。

**「反向豁免」在交互中的确切角色**：E=0.8 保证视觉几何与 ui-scale=1 **逐像素相同**（间距仍 805、canvas 612×792 原生清晰），于是 (a) dbg 期望式「12+3×805」在视觉/数值上「看似成立」，漂移被掩蔽为「scrollTop 读数接近期望但画面错位」；(b) 滚动坐标空间间距缩为 644——**豁免没有引入漂移本身，它把「视觉=本地」的隐含假设破坏掉**（单位比 Z），并让漂移以「数值对、画面错」的隐蔽形态呈现。

**H2 机制（getPageBoxes 混合空间 → 页码回写/恢复目标/到达判定偏页）**：`top = r.top − base.top（视觉） + scrollTop（本地）`：盒顶被按 1.25 倍膨胀后与 `scrollTop + clientHeight/2`（全本地）比较；视口上部内容（off 小）近似正确、越靠下膨胀越多（0.25×off），外加 clientHeight 本地 889 vs 真实视觉中心 1111（中心估计整体偏高 ~111px）。真中心落在页边界 ±(0.25×off+111)px 带内时 nearestPage 报错 ±1 页 → 回写页码错、恢复链 scrollToPage(错页) 再经 H1 落点 → **整页级（805px）漂移事件**，构成 450px 上界外的长尾。

**H3 机制（anchoredScrollTop 总高分母空间错配）**：段⑥ 传参 `columnTotalHeightFor`=列内 px（16048），但分子 `liveScrollTop+clientHeight/2` 在本地滚动空间（真总高=16048×0.8+24=12862）。比值比分母膨胀 ×1.25 → 每次 zoom 变化（±10%/适应宽度/归一）后新 scrollTop 系统性过冲 ~25%（中部滚动位时数百 px）。佐证：f-v2 diag「适应宽度后」pageBox.y 从 −279.2 跳到 −889.6（大位移）；verify 的 D/scroll-position-kept |Δ|≤2 断言仅在 ui-scale=1 成立（空间重合）。

---

## ⑤ 根因假设排序

| 序 | 假设 | 机制 | 探针可证伪判据 | 置信度 |
| --- | --- | --- | --- | --- |
| **H1** | **scroll-converge.ts:48-49 把 gBCR 视觉差值 1:1 加进本地 px scrollTop（「1 gBCR px=1 scrollTop px」隐含假设仅 Z=1 成立）——程序滚动漂移 160-450px 的主产生器** | ④节推演：过冲=0.25×δv | 真机 1.25 档：跳页前后取 {s_before, δv, s_after}，若 `s_after−s_before ≈ δv`（而非 δv/1.25）且落点偏移 ≈ −0.25δv → 成立；若 `s_after−s_before ≈ δv/1.25` 且落点仍漂 → 证伪（转 H2/H3/H5） | **~85%** |
| H2 | scroll-progress.ts:283-291 getPageBoxes 视觉+本地混合空间 → nearestPage ±1 页误判（回写/恢复/到达判定污染，整页级漂移长尾） | ④节推演 | 1.25 档把真视口中心置于页边界 ±50px，比较 pageInput 显示页 vs gBCR 真中心页；错 ≥1 例 → 成立 | ~70% |
| H3 | PageColumn.tsx:209-214 段⑥ anchoredScrollTop 总高用列内 px（未 ×0.8 折算到滚动本地空间）→ zoom 变化锚定过冲 ~25% | ④节推演 | 1.25 档 st 置中部，100%→110%→100% 往返，|st_drift| 对比 1 档基线（应 ~0）显著非零 → 成立 | ~60% |
| H4 | 浏览器 scroll-anchoring 干扰（F-R1 作者原猜测） | 占位盒↔canvas 等高替换，锚定调整理论≈0 | 探针置 `scroller.style.overflowAnchor='none'` 后复测 H1 判据，漂移不变 → 排除 | ~15% |
| H5 | scrollTop 读写不对称（读视觉/写本地） | 会产生随绝对滚动位增长的千 px 级漂移，与 160-450 量级不符 | 语义探针（⑦-1）直接判定 | ~10% |

注：H1/H2/H3 同根（三处消费点共享「视觉=本地」过期假设），非互斥——主票面数值（160-450px 连续谱）由 H1 主导，H2/H3 提供整页级/zoom 链长尾。

---

## ⑥ 修复方向建议（排在根因证据之后；最终方案归主控/实现者裁决）

**方案 B（算术折算，最小改动面）**——在三处消费点把视觉量折算到本地空间，折算因子复用 fitWidth 已有推导式（`ReaderPage.tsx:149` 先例：`z = scroller.getBoundingClientRect().height / scroller.clientHeight`，guard 除零，Z=1 时恒 1=零行为变）：

1. `scroll-converge.ts:48-49`：`raw = scrollTop + (elRect.top − scRect.top)/z`（center 分支的 clientHeight 项本就本地，不动）；:50 clamp 保持本地口径 ✓；
2. `scroll-progress.ts:289`：`top = (r.top − base.top)/z + el.scrollTop`（height 同除，保 nearestPage 距离同空间）；或改 offsetTop 链量测；
3. `PageColumn.tsx:209-214`：总高分母改滚动本地空间（`scroller.scrollHeight` 或 `columnTotalHeightFor×E`）。
   - 风险：三点分散、每点一个折算因子来源；受锁测试面见下。

**方案 A（结构归一：豁免上提一行）**——把反向豁免从 `[data-page-column]` 上提到**滚动容器**（`.overflow-auto` 挂 `zoom:calc(1/var(--ui-scale))`，theme.css 一处改类目标）：此时滚动容器内容（列+盒）的「视觉=本地×(0.8×1.25)=本地×1」——**三个坐标空间在阅读区内部重新合一**，H1/H2/H3 同根消除，滚动链零代码改动。
- 连带必改：`ReaderPage.tsx:146-151` fitWidth 的 uiScale 推导在 scroller 上取比值将变 1 → 需回退为朴素 `(clientWidth−24)/basis`（F-V2 修复的对称回退，否则两侧空白 ~148px 回归）；`selection-geometry` 的 localScale 口径需复核（SelectionLayer 挂载盒在豁免层内/外的参照系变化）；滚动条渲染/宽度在自 zoom 容器上的表现需真机核验。
- 风险：影响面比 B 大（F-V2/F-A4 两既有修复交互），但消除的是假设本身而非三处症状。

**涉受锁测试清单（[locked-change] 流程预警）**：
- `tests/unit/renderer/scroll-converge.test.ts`（start/center 数学——需增 z≠1 桩例；现行绿=逃逸面：jsdom 桩值全同一单位空间，见⑦-5）；
- `tests/unit/renderer/scroll-progress.test.ts`（centerPage/getPageBoxes 注入桩——单位混入需新例）；
- `tests/unit/renderer/page-column.test.ts`（段⑥ anchoredScrollTop 精确断言——INV-33 口径）；
- `tests/unit/renderer/reader-double-page.test.ts`（锚总高口径用例）；
- `tests/e2e/reader-scroll.spec.ts`（F-05 收敛链——默认 profile uiScale=small=1，两方案下行为均应不变=回归护栏）。
- 不变量册：INV-34 实现语义不变（仍=最近祖先+夹取，仅量纲修正）；INV-33「间隙口径由 columnTotalHeight 承载」若走 B-3 或 A 需补空间口径附注；INV-45 fitWidth 分母面与方案 A 有交互（F-V2 附注）。

**建议**：先真机探针（⑦）锁 H1 判据与 scrollTop 读写语义，再定 A/B；若 H1 判据坐实且 H2/H3 同现，优先评估方案 A（一处 CSS 消三缺陷，代价是复核两个连带面）。

---

## ⑦ 探针建议（主控下一步真机取证）

复用 `f-l2-precheck.mjs` 三档范式 + `f-v2-diag.mjs` 结构链口径，新建 `scripts/audits/f-r2-probe.mjs`（真实库副本、保留 uiScale 实况，对照档用 `documentElement.style.setProperty('--ui-scale','1')` 切换，禁改用户 settings.json）：

1. **语义探针（H5/H1 前置）**：1.25 档下 `st0=scrollTop` → `scrollTop += 100` → 读回 Δst 与固定内容节点 gBCR 位移 Δvis。Δst=100 且 Δvis=125 → 写读皆本地、视觉×1.25（H1 模型成立）；Δst=100 且 Δvis=100 → 读写皆视觉（H1 证伪，重启假设）。
2. **落点探针（H1 主判据）**：三档 × {fill(1), fill(4), 下一页, locate exact}，每跳记录 `{s_before, δv=目标盒 elRect.top−scRect.top, s_after, 落点视觉偏移}`。判据：`s_after−s_before ≈ δv`（实加视觉量）且偏移 ≈ −(Z−1)×δv；1 档对照应 ≈0（复现 verify 的 0.2px）。
3. **页码判定探针（H2）**：1.25 档以 1px 步进扫页边界 ±150px 的 scrollTop，记录 pageInput 显示页 vs gBCR 真中心页，统计误判带宽度。
4. **zoom 锚探针（H3）**：1.25 档 st 置文档中部，100%→110%→100% 往返三_cycle，|st_drift| 对 1 档基线；另测适应宽度单击前后目标行顶视觉偏移。
5. **逃逸面闭环（为何现有测试全绿）**：`scroll-converge.test.ts` 头注自认「jsdom 无布局：gBCR/scrollHeight/clientHeight 全部桩值」——桩值同一单位空间，z 因子永不可红；`scroll-progress.test.ts` deps 全注入；e2e/`f-r1-verify` 跑在 uiScale 缺省=1。**红测落点建议**：scroll-converge 增「视觉/本地=1.25 桩」用例（先红后修，Phase4 实现者执）。

---

### 附：本报告证据链文件清单（绝对路径）

- E:\class\智慧水务\Synapse_remake\scripts\audits\f-r1-dbg.mjs（:39-51 GEOM 口径、:78-88 场景与期望值）
- E:\class\智慧水务\Synapse_remake\scripts\audits\f-r1-out\f-r1-verify.json（ui-scale=1 对照组全场景 dump）
- E:\class\智慧水务\Synapse_remake\scripts\audits\f-r1-out\dbg-geom.png（1.25 档落点截图）
- E:\class\智慧水务\Synapse_remake\scripts\audits\f-r1-verify.mjs（:50-70 uiScale 删除=对照组设计+存量漂移备案原文）
- E:\class\智慧水务\Synapse_remake\scripts\audits\f-v2-diag.mjs + f-v2-out\diag-raw.txt（结构链 zoom 1.25/0.8 实测）
- E:\class\智慧水务\Synapse_remake\scripts\audits\f-l2-precheck.mjs（三档×量测口径范式）
- E:\class\智慧水务\Synapse_remake\src\renderer\features\reader\scroll-converge.ts（:44-50 ★主嫌疑算式）
- E:\class\智慧水务\Synapse_remake\src\renderer\features\reader\PageColumn.tsx（:179-184 段⑤、:186-196 镜像、:200-215 段⑥）
- E:\class\智慧水务\Synapse_remake\src\renderer\features\reader\scroll-progress.ts（:123-129 centerPage、:277-302 装配）
- E:\class\智慧水务\Synapse_remake\src\renderer\features\reader\anchor-locate.ts（:239-245 flashElement）
- E:\class\智慧水务\Synapse_remake\src\renderer\features\reader\page-column-geometry.ts（:53-58 anchoredScrollTop）
- E:\class\智慧水务\Synapse_remake\src\renderer\features\reader\reader.store.ts（:350-368 setPage）
- E:\class\智慧水务\Synapse_remake\src\renderer\features\reader\ReaderPage.tsx（:90-93、:146-151、:170-192）
- E:\class\智慧水务\Synapse_remake\src\renderer\app\App.tsx（:127、:135）+ src\renderer\shared\theme.css（:131-136）
- E:\class\智慧水务\Synapse_remake\src\shared\ipc\schemas.ts（:390-393）
- E:\class\智慧水务\Synapse_remake\docs\invariants.md（INV-33/34/45 行）
