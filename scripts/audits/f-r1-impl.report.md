# F-R1 实现报告：阅读器双页阅读模式（含 fitWidth 适配）

> 三屋模式第一屋（实现者）交付。票面=`scripts/audits/f-r1-ticket.md`。
> 基线 5140ea719（verify 116 文件 971 用例/locks 195）。本工单后全量
> 117 文件 987 用例（971+新 16）。
> **[回炉 1]** 门一裁决 B:0/W:6/N:3 有条件放行——W1/W3/W4/W5 四点回炉已处置，
> 见 §9 回炉处置段；W2/W6 主控澄清面、N1/N3 备案面未涉实现改动。

## 1. 实现摘要（票面 §0 矩阵逐格对照）

| 消费点 | single | double | 实现位置 |
| --- | --- | --- | --- |
| 页盒排列 | 单列 flex-col 零变 | `layoutRows` 行数组 (1,2)(3,4)…，行盒 `data-page-row={leftNo}` flex items-start gap-3（左顶对齐），末行奇数页右盒不渲染 | PageColumn 渲染分支 + page-column-geometry |
| 列宽 | `columnWidth` 语义零变（单实现复用） | `columnWidthFor(sizes,zoom,'double')`=最宽完整行宽（`rowWidth`=左+右+PAGE_GAP_PX，末行单页不计；全列无完整行退化最宽页） | geometry 新增导出 |
| 总高（INV-33 分母） | `columnTotalHeight` 零变 | `columnTotalHeightFor`=行高和（行高=max(左右页高)）+行 gap×(行数−1)，gap 不随 zoom（与单页盒间距同语义） | geometry 新增导出 |
| onReady basisWidth | 最宽页（scale=1） | 就绪管线 `columnWidthFor(sizes,1,layoutRef.current)`（layoutRef latest-ref——管线 deps [doc,totalPages] 零变）；布局切换走独立轻 effect（prevLayout 对照）重报新口径，不重跑 getPage | PageColumn 段①+新轻 effect |
| 翻页步进 | ±1（缺省 pageStep=1 零变） | ±2（装配面双页传 pageStep=2） | ReaderToolbar ±按钮 + ReaderPage 装配 |
| 页码跳转 | 任意页 | 任意页（scrollRequest→页盒查询，左右盒顶同行滚行顶——零特判） | 既有段⑤零改（双页天然成立） |
| scroll-progress 回写 | 零改 | 零改（[data-page-box] 按页号消费；真机 D 场景实证页码保持） | 零改 |
| 懒渲染/回收 | 零改 | 零改（data-page-box 仍在页盒上；IO effect deps 增 layout——列↔行 DOM 重排后重挂 observe，否则重排后观察死集） | PageColumn 段③（唯一必要补丁：IO deps） |
| 缩放中心锚 | 总高口径 | 总高=布局口径 `columnTotalHeightFor`（hook 数学零改只换分母输入；layout 不入 deps——切布局位置保持走 onReady 恢复链） | PageColumn 段⑥ |
| SelectionLayer/标注/AI/文本层 | per-page | 零改（renderPage(no) 每渲染页一套；PageBox 拆件保 data-page-root 挂载位） | PageBox.tsx |

其余面：TabState 加可选 `pageLayout?: 'single'|'double'`（消费方 ?? 'single' 兜底）；makeLoadingTab 新建显式 `'single'`、error 重试沿 `{...prev}` 继承（与 zoom 完全同型——核 172 行现行继承面后确认）；`setPageLayout`（updateActiveTab 形态）；ReaderToolbar 双页按钮（aria-pressed+选中态 accent 边框，crib 选择模式先例，位于「适应宽度」后版面控制同组）；PagesOverlay 十 props 透传（头注接口层同步）；fitWidth 零改（分母 columnBasis 随 onReady 新口径——真机 B/D 场景数值实证）。

跨格序列 S1~S7：S1/S4/S5/S7 真机 D/C/D/A 场景直证；S2 真机 B 场景（zoom=99%≈(1217−24)/1202 源码复算）；S3 单测③（末行单盒+行宽=左盒宽）+真机 E（真库无奇数页文献走双盒分支，见自裁⑤）；S6 单测⑦（anchoredScrollTop 双页行总高输入断言）。

## 2. 自裁申报（实现者超票面决定，报主控知悉）

1. **S3 末行渲染选择：右盒不渲染（无占位空盒）**。理由：列宽已按「末行单页不计」口径排除孤页行，末行行宽恒=左盒宽，不存在「右页渲染前后行宽变化」的跳变源；空占位盒徒增无页号的 DOM（IO 查询 NaN 防御路径）。末行随列容器 items-center 居中。视觉验收=真机 E 截图。
2. **拆件结构**：PageBox.tsx 60 行（页盒渲染件，单双页共用；F-ARCH3 零变纪律——函数形态原样迁不加 useCallback/useMemo）；PageColumn.tsx 拆后 250 行（物理行恰红线内；ESLint max-lines skipComments 口径代码行约 190）。为守 250 物理行，头注重组：F-04/05/06 增补段与六段行为层/拆件头注重复的表述收敛为「历史」段（契约语义无损，详述归各拆件头注与行为层六段）。
3. **行内 gap 口径**：行内水平 gap=PAGE_GAP_PX（12px）与行间垂直 gap 同值同语义、不随 zoom 缩放——票面字面「最宽行宽×zoom（行宽=左宽+右宽+行内 gap）」存在 (左+右+gap)×zoom 与 (左+右)×zoom+gap 两读，取后者（与既有 columnTotalHeight 盒间距不乘 zoom 的 INV-33 常量语义同源，单测②b/②d 锁定）。
4. **测试过程三处修正（红证时点声明）**：初版红证（15 红 1 绿=f-r1-red.txt）后修正——a) api client mock 的 unwrap 漏 `await call`（真实 unwrap 收 Promise 内部 await——契约对齐）；b) ⑤ 组 async mount 未 await；c) ④ getPage 计数改为「离屏页恰一次+每次切换增量≤2·renderWindow+1」（canvas 重挂会按页重取，page-column.test「缓存乘法非重取」同口径）。修正后对 HEAD 实现复跑红证：14 红 2 绿（f-r1-red-final.txt；2 绿=③b/⑤c 回归哨，其职责即锁「不动」，基线绿属预期）。
5. **真机 E 场景奇数页不可达**：真实库前 8 篇无奇数页文献（扫描逻辑优先奇数、无则退偶数，log 留证），E 走双盒分支（末行双盒高 793px 无塌陷）；末行单盒面由单测③锁定（5 页夹具：末行 1 盒+行宽=左盒宽+无 data-page-row 外泄漏）。分工已写入探针头注。
6. **真机 A 场景断言前提修正**：初版断言「首行 1+2 真渲染」，真实文献恢复链滚到记忆页（第 20 页）渲染窗口不在首行——改为「存在某行两盒都进渲染窗口」（双页并排真渲染的语义本体，不绑视口位置）。
7. **事故申报（无净损失）**：做「实现回退红证」时备份目录被第二次运行覆盖（cp 备份目录复用），6 个实现文件一度回退到 HEAD——按上下文完整重写恢复，随后全量 987/987 绿+lint/tsc 零错+探针 15/15 复验。后续变异改用「唯一时间戳备份目录+还原后 diff 验证+回绿验证」三保险（本票教训，建议入经验册：**备份目录必须一次性创建且不复用，还原后必须 diff+回绿双验**）。
8. **IO effect deps 增 layout**（票面「懒渲染回收零改」的必要例外）：列↔行切换时 React 卸载重建全部页盒，旧 IO observe 目标失效——不重挂则可见集永不更新（懒渲染死）。语义上是「重挂观察」而非「改回收逻辑」，窗口/回收/页号消费零变（单测③④+真机 D 实证切回后渲染恢复）。

## 3. 红证绿证

- 红证（初版测试 vs 未实现）：15 红 1 绿 → `scripts/audits/f-r1-red.txt`
- 红证（最终版测试 vs HEAD 实现，cp 备份回退法）：14 红 2 绿（③b/⑤c=回归哨基线绿） → `scripts/audits/f-r1-red-final.txt`
- 绿证（新测试+受影响回归三件）：50/50（reader-double-page 16+selection-mode 8+page-column 20+pages-overlay 6；门二终审实测订正——原稿 9/19 失实，总数 50 恒对） → `scripts/audits/f-r1-green.txt`
- 全量：`npm run test` 117 文件 987/987（基线 971+新 16）
- `npm run lint` 零错；`npm run typecheck`（node+web 两 tsconfig）零错；`npm run build` 绿
- 行数自查：PageColumn **251→250**（收口主控机械修复：头注同句折行合并省 1 行——quality 关卡拦 251 超标，报告原稿写 250 又差 1，W1 同型第三现如实披露）/ PageBox 60 / geometry 172 / reader.store 470 / ReaderToolbar 223；**新测试 529 行（`wc -l` 实测，回炉 1 W3 断言 +11 行后的终值）——tests 目录受 eslint `max-lines: 'off'` 豁免（eslint.config.js 对 `tests/**/*.ts` 关闭该规则，500 行红线不适用于测试文件，合规；首版报告写「500 内 ✓」失实，W1 修正；回炉 1 又误写 518，r2 再修正为 529）**

## 4. 变异红证（cp 备份法；唯一时间戳目录+还原 diff 空+回绿）

| 变异 | 手法 | 红面 | 还原 |
| --- | --- | --- | --- |
| M1 摘 layoutRows 行派生 | 函数体头部 `return []` | 9 红（③/④/④b/⑥/⑦/②ab 等） | diff 空 ✓ |
| M2 columnWidthFor 双页分支改单页口径 | `layout!=='double' || true` | 4 红（②c/④/④b/⑥） | diff 空 ✓ |
| M3 摘 onReady 重报轻 effect | effect 体改 `return` | 1 红（④ 恰中） | diff 空 ✓ |
| M4 摘 pageStep | `const pageStep = 1 as const` | 1 红（⑤b 恰中） | diff 空 ✓ |
| M5 摘 setPageLayout | 实现体 no-op | 2 红（①a/①b；①c 不红=正确——①c 锁 makeLoadingTab 显式值，与 setPageLayout 正交） | diff 空 ✓ |
| [回炉1] W3 末行右盒改渲染空盒 | 右缺席分支渲染占位 div | 2 红（③ 新断言+⑦） | diff 空 ✓ |

末次回绿 16/16 ✓。证据：`scripts/audits/f-r1-mut-M{1..5}.txt`。

## 5. 真机取证摘录（f-r1-verify.mjs，真实库副本 20 页真 PDF；17/17 PASS——回炉 1 后全列口径+滚动位锚环境）

```
PASS pre/ready — 单页就绪 20 盒/20 页,无行盒（100%）
PASS A/row-count — 行数 10=ceil(20/2)
PASS A/pair-row-rendered — 行(17)两页并排真渲染 data-page-root 同含 [17,18]
PASS A/row-width-formula — 行盒宽 1202.0 ≈ 左(595.0)+右(595.0)+gap(12)
PASS B/zoom-double-basis — zoom=133%≈(clientWidth1625−24)/行宽1202=133.2%（columnWidthFor 源码复算——[W4] 全列 sizes 口径）
PASS B/row-fits-viewport — 行宽 1596.0 ≤ 内容区 1601+2（两页并排恰入视口——S2）
PASS C/page-step-2 — 页码 1→3（+2 翻面步进，S4）
PASS C/row2-tops-aligned — 目标行(3)两盒顶对齐(Δtop=0.00px)且已滚离首行
PASS D/rows-cleared / D/position-kept — 页码保持 3→4（S1 恢复链滚回当前页）
PASS D/rows-restored / D/basis-rebased — 单页 269% → 双页 133%（S5 basis 重报不残留）
PASS D/page-still-kept — 往返后页码 4→4
PASS D/scroll-position-kept — [W5] 同源锚 816.8px → 816.8px（|Δ|=0——S1 切布局不丢位置）
PASS D/roots-bounded — [W5] 再读 roots 7 页 ≤ 可见×(2·recycleWindow+1)=10（过渡态窗口叠加，读数落 JSON）
PASS E/last-row-single — 末行(19)盒数 2=期望2，盒高 793px>10（无塌陷——S3；奇数单盒面归单测③+W3 DOM 锁，真库前 8 篇无奇数页文献）
PASS F/no-pageerror — 页面错误 0 条
```

产物：`scripts/audits/f-r1-out/`（A-double.png / B-fitwidth-double.png / E-odd.png / f-r1-verify.json 57KB 全场景 dump）。
真机 Electron 短暂开窗取证属项目 LOOP 惯例（主控指令预先声明）。

## 6. 成本

- 工具调用约 55 次（含 1 次事故恢复重写）；墙钟约 08:05–08:30 本地（约 25 分钟净工具时，不含模型思考）；token 未单独计量（子代理上下文约 60% 用于必读文件+重写恢复）。
- 主要消耗：真机探针三轮迭代（短文献禁用→奇数优先扫描→断言前提修正）；事故恢复重写 6 文件。

## 7. git status --short 全贴（diff 自查；**[门一 r2] 重拍回炉后终态**——A=主控/门流程已暂存，M/?? 如下）

```
 A scripts/audits/f-r1-impl.report.md
 A scripts/audits/f-r1-out/A-double.png
 A scripts/audits/f-r1-out/B-fitwidth-double.png
 A scripts/audits/f-r1-out/E-odd.png
 A scripts/audits/f-r1-out/f-r1-verify.json
 A scripts/audits/f-r1-ticket.md
 A scripts/audits/f-r1-verify.mjs
 A src/renderer/features/reader/PageBox.tsx
 M src/renderer/features/reader/PageColumn.tsx
 M src/renderer/features/reader/PagesOverlay.tsx
 M src/renderer/features/reader/ReaderPage.tsx
 M src/renderer/features/reader/ReaderToolbar.tsx
 M src/renderer/features/reader/page-column-geometry.ts
 M src/renderer/features/reader/reader.store.ts
 M src/renderer/features/workspaces/workspace.css   ← 进场即有的他人未提交改动，非本工单面（未触碰）
 A tests/unit/renderer/reader-double-page.test.tsx
?? scripts/audits/f-r1-dbg.mjs            ← [W7-②] 一次性诊断脚本（§9 头注声明性质）
?? scripts/audits/f-r1-gate1-brief.md     ← 门一流转件（主控/门侧产物）
?? scripts/audits/f-r1-gate1-ds.raw.txt   ← 同上
?? scripts/audits/f-r1-gate1-r2-brief.md  ← 同上
?? scripts/audits/f-r1-gate1-r2-ds.raw.txt ← 同上
?? scripts/audits/f-r1-gen-r2-brief.mjs   ← 同上
?? scripts/audits/f-r1-green.txt
?? scripts/audits/f-r1-mut-M1.txt ~ M5.txt
?? scripts/audits/f-r1-mut-W3.txt         ← [W3] 变异红证（正式证据件，建议随票）
?? scripts/audits/f-r1-out/dbg-geom.png   ← [W7-②] 诊断截图（随 dbg 脚本定夺）
?? scripts/audits/f-r1-red-final.txt
?? scripts/audits/f-r1-red.txt
（另有进场即在的 f-l4-*.raw.txt/f1-out/* 未跟踪残留——前票产物，未触碰）
```

diff --stat：reader 域 6 文件 +224/−86（PageColumn 含头注重组）；范围=票面「只改 reader 域五文件+geometry+新 PageBox」+新测试+新探针+证据产物，无范围蔓延。

## 8. 未尽事项（归主控收口面）

- locks:generate/apply（新测试+探针扫入 195→197）与 [locked-change] 提交——实现者禁 locks/git/registry（三屋分工），留主控。
- e2e 双页覆盖不入本票（票面备案）；台账 F-R1 段归主控。
- grep 自查：三个禁令标记词（待办/缺陷标记/占位语英文原词）在新增源码/测试/探针面零匹配；中文全部 UTF-8 可读（探针 JSON/log 直证）。

## 9. [回炉 1] 门一四点处置（W1/W3/W4/W5）

> **[门一 r2 补记]** §7 git status 已重拍为回炉后终态快照（含本段新增证据件）。
> **`scripts/audits/f-r1-dbg.mjs` 性质声明（W7-②）**：一次性诊断脚本（W5 回炉中定位程序滚动落点漂移时写的三连实验+单页对照，含 `f-r1-out/dbg-geom.png` 截图证据），**非探针、非交付功能面、不在任何 CI/verify 链上**——一次取证用，是否随票提交由主控收口定（不提交则证据数字以本报告 §9-1 与 JSON 为准）。同批 `f-r1-mut-W3.txt`（W3 变异红证）为正式证据件，建议随票。

- **W3（③ 末行 DOM 面锁力）**：③ 追加末行专项断言——`[data-page-row="5"]` 行内 `[data-page-box]` 恰 1 个（盒号 5）+行盒 `children.length===1`（无空占位盒/无外泄漏）+唯一盒宽 700px（=末页原始宽×zoom；jsdom 无布局，「行盒宽度==左盒宽」的可达形式=唯一盒+无兄弟+盒宽断言，真布局归探针 E）。**变异红证**：临时变异「末行右盒改渲染占位空盒」→③ 红（2 红：③+⑦）→还原 diff 空→回绿 16/16 → `scripts/audits/f-r1-mut-W3.txt`。
- **W4（探针 B 全列口径）**：B 期望值改从 DOM 采集**全部页盒** sizes（占位盒全列在 DOM）→ `columnWidthFor(sizes,1,'double')` 取最宽完整行——不再只取首两页。复验 PASS（zoom=133%≈(1625−24)/1202=133.2%，全列 20 页均 595 宽时与首两页口径同值，口径面已锁）。
- **W5（探针 D 滚动位+roots）**：
  - **滚动位同源锚 PASS**：设计=「双页态/同 zoom(100%)/当前页行顶」双端取值（页码输入跳当前页=程序归位到盒顶）——往返前 816.8px → 往返后归位 816.8px（|Δ|=0）。声明：直配对「滚中部起点 vs 往返后」会因「中部滚动位置≠盒顶归位」的恢复链语义天然不等，故取同源锚（门一预案内自裁）。
  - **roots 膨胀**：按门一「逐项不变不强求」处理——实测 800ms 内 IO/渲染窗口存在**过渡态**（zoom 归一+归位滚动的通知波次叠加，[2,3,4,5]→[1..7] 中心不变），逐项断言会踩过渡期假红；改锁既有不变量**渲染集 ≤ 可见×(2·recycleWindow+1)=10**（page-column.test「渲染集上界」组件级锚同款）PASS（7≤10）；两次读数落 JSON 备查。
- **W1（报告失实）**：§3 行数自查已修正为真实行数+tests 目录 `max-lines: 'off'` 豁免口径（回炉 1 记 518，r2 核出 W3 +11 行后终值 **529**，全文统一为 529）。
- **回炉中新发现（既有面备案，建议主控另立工单，均非 F-R1 引入——涉事链路 F-R1 零改）**：
  1. **ui-scale≠1 下程序滚动落点漂移**：真库 settings uiScale='large'（1.25）时阅读区 `[data-page-column]{zoom:calc(1/var(--ui-scale))}` 豁免机制（theme.css）与 scroll-converge 差值法/浏览器 scroll-anchoring 交互，程序滚（页码跳转/翻页）落点存在 ~160-450px 漂移且不稳定——**单页模式同样复现**（f-r1-dbg.mjs 三连实验+单页对照：单页 fill 落点精确 2430/2427 但「下一页」偏 452；双页 fill 偏 201）——诊断脚本与数据存 `scripts/audits/f-r1-dbg.mjs`+`f-r1-out/dbg-geom.png`。**探针处置**=freshUserData 预写删除 uiScale（--ui-scale 缺省 fallback=1，zoom 交互退场），在干净坐标系锁本票双页行为（首轮探针的 C/D 断言在 ui-scale≠1 下因相对断言宽容而通过，绝对落点当时未锁）。
  2. **pdfjs stream pump 竞态 pageerror**：扫描式连开 8 篇文献（openPaper→加载流 abort）触发 `TypeError: Cannot read properties of null (reading 'read')`（pdf.mjs `_reader.read()`，PdfDocProvider 加载流销毁竞态）——直开单篇无错；探针已去扫描（真库前 8 篇无奇数页文献，扫描本就必退第一篇），F 场景复验 0 错。
- **探针自身修正（回炉过程申报）**：D 归位 fill 页码双重 +1（dump.page 已是 1 基显示值）已修；误删 evaluate 行即修复并双跑复验 17/17。
- **回炉后回归**：新测试+四件套 50/50、typecheck 0 错、lint 0 错（含探针/诊断脚本未用变量清理）、探针 17/17（两轮复跑稳定）。M1~M5 未重做（实现零变），W3 变异红证补做如上。
