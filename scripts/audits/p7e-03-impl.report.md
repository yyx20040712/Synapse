# P7E-03 实现报告（页内高亮搜索——三屋第一屋·实现者子代理）

日期：2026-09-03 ｜ 实现者环境：GLM 统一档（Agent 工具面无 model 参数——环境限制欠账披露）｜ Node 24.20.0（开工 `node -v` 亲验）

## 0 技能清点（开工纪律——先于任何动手）

| 技能 | 用/不用 | 理由 |
|---|---|---|
| test-driven-development | 用 | 票面 ④ TDD 红→绿→变异红证 |
| javascript-testing-patterns | 用 | jsdom 组件测试形态参考（mock/act/rAF 桩） |
| e2e-testing-patterns | 用 | 新 e2e spec crib seedAndLaunch 配方 |
| verification-before-completion | 用 | 收口前分链真退出码自检 |
| systematic-debugging | 用（实战） | e2e 假红两轮差分排查（见 §7 环境事件） |
| frontend-ui-engineering | 不用 | 视觉细节已由票面定案（色变量/层序/百分比语言），无自由设计面 |
| subagent-driven-development | 不用 | 本会话即实现者屋本体，非派发面 |
| loop-defenses / loop-engineering | 不用 | 单票实现任务，无循环派发面 |
| 其余（git 工作流/部署/数据库等） | 不用 | 禁 git；纯 renderer 特性票 |

## 1 实现摘要

按票面五层规约落地页内高亮搜索，Design 裁决（主控定案）严格执行：

- **索引全文档（文本域）**：`reader-search.store.submit` 逐页 `getTextContent` 拼接索引（未渲染页也计数）；代际守卫=闭包 `readerSearchGeneration`（submit 自增/页回传核验/close+reset 失效）——INV-03 同族；searching 同步置态（首个 await 前落账，S3/⑤b）。
- **高亮仅渲染窗口（DOM 域）**：`SearchHighlightLayer`（PagesOverlay.renderPageLayers 内挂，DOM 序在 AnnotationLayer 后）对 `.textLayer` span 建 DOM Range 取 clientRects→`toPageRelative`→px 绝对定位；MutationObserver+rAF 合并重算（AnnotationLayer 先例同型，zoom 重渲链同径）；坐标参考=textLayer 盒（=canvas 盒=本层 inset-0 容器盒，三盒同源零漂移）。
- **纯函数域** `reader-search.ts`：buildPageText（hasEOL 插 '\n'+字符映射，换行哨兵 -1/-1）/findInText（toLowerCase 两侧+不重叠推进+跨 '\n' 拒）/asSearchDoc（unknown→结构收窄）/toTextItems（'str' 过滤，PdfPageCanvas 同款防御）/toPageRelative/spansForItems（数量不符→null 降级）。类型消费循 INV-16：`import type { PdfTextItem } from './PdfPageCanvas'`。
- **态空间 S1~S12**：store 事件×态表实现于 reader-search.store.ts 头注+代码；逐格锚见测试（S1/S2/S3/S4/S5/S6/S7/S8/S9/S10/S12 store 面+UI 面+e2e 链）。
- **装配**：`useReaderSearch(pdfDoc, fileUrl)`（.tsx）——①fileUrl 键效应 reset（INV-55，变化才清；身份不变不搅）；②keymap id `'reader-search'`（ctrl+f preventDefault，注册/注销成对 INV-14，**不改 ReaderShortcuts 绑定表**）；③翻页联动经 registerPageTurner 注入（store 间零 import；目标页≠tab.page→setPage(page,{scroll:'to'}) INV-29）；④订阅 store 产 `<ReaderSearchBox>` 受控节点。
- **ReaderToolbar**：可选 slot prop `searchBox?: ReactNode`（缺席=旧占位 span 兜底——onFitWidth 同款可选先例；受锁夹具直植 props 零破坏）；头注 v2 注记修订。**ReaderShortcuts.ts:38** 预留注记兑现修订（纯注释）。**ReaderPage**：hook 调用+toolbar 传 slot+头注一行。
- **两段式滚动**：第一段 pageTurner→setPage 页盒顶入视口；第二段高亮层 active 块 `scrollIntoView({block:'center'})`（scrolledMark 记账：同 matches+同 activeIndex 只滚一次，新结果集/新 activeIndex 重获资格）。

## 2 文件清单（新增 9 / 修改 4）

新增（src 五件）：
- `src/renderer/features/reader/reader-search.ts`（151 行，纯函数域）
- `src/renderer/features/reader/reader-search.store.ts`（178 行，zustand store）
- `src/renderer/features/reader/ReaderSearchBox.tsx`（117 行，纯受控搜索框）
- `src/renderer/features/reader/SearchHighlightLayer.tsx（156 行，高亮层）`
- `src/renderer/features/reader/useReaderSearch.tsx`（106 行，装配 hook）

修改（票面声明改动面内）：
- `src/renderer/features/reader/ReaderToolbar.tsx`（+31/−14：slot prop+占位兜底+头注修订）
- `src/renderer/features/reader/PagesOverlay.tsx`（+6/−1：renderPageLayers 挂高亮层+注释）
- `src/renderer/features/reader/ReaderShortcuts.ts`（+4/−1：预留注记兑现修订，纯注释）
- `src/renderer/features/reader/ReaderPage.tsx`（+11/−1：hook 装配+slot 传参+头注一行）

新增（tests 四件）：`tests/unit/renderer/reader-search-text.test.tsx`（136 行）、`tests/unit/renderer/reader-search.store.test.tsx`（233 行）、`tests/unit/renderer/reader-search-ui.test.tsx`（353 行）、`tests/e2e/reader-search.spec.ts`（154 行）。

**删减面 diff 自查**：`git status/diff --stat` 亲验——我的改动=上述 4 改 9 增；`tickets/registry.ts` 的脏行（git diff 单行=P7E-03 open 条目）为**主控派单时写入的既有脏态，我未触碰**（禁令遵守）；scripts/audits/ 下其余未跟踪件均为他场残留（auditc-*/f-*/night1-* 等），我仅新增 p7e-03-* 证据件。未动 tests/ 既有文件、src/shared/**、locks/、docs/invariants.md。

## 3 先红证据（TDD）

`scripts/audits/p7e-03-red/reader-search-all.raw.txt`：**全量套跑口径**（`npm run test`），3 新文件因缺失模块天然红（Failed to resolve import），既有 136 文件/1163 用例全绿，exit=1——基线锚定同时取证。

## 4 绿证据+用例数实测（脚本实测，非印象）

`scripts/audits/p7e-03-green/reader-search-all.raw.txt`：**139 文件/1207 用例全绿，exit=0**。
- 逐文件实测：reader-search-text.test.tsx=11、reader-search.store.test.tsx=15、reader-search-ui.test.tsx=18 → 新增 44。
- **基线勘误申报**：主控口径 135 文件，`find tests src -name "*.test.ts*" | grep -v e2e | wc -l` 实测既有=136（用例 1163 吻合）——136+3=139 文件、1163+44=1207 用例。
- e2e：新 spec 定向跑 `scripts/audits/p7e-03-e2e-targeted.raw.txt`（1 passed，exit=0）——全量 35+1=36 归主控 verify。

## 5 变异红证五组（cp 备份法；禁 git checkout 遵守）

| # | 变异点 | 红证（定向测 exit=1） | 证据 |
|---|---|---|---|
| M1 | findInText 删两侧 toLowerCase | 「大小写不敏感」用例红（expected [] to have length 2） | p7e-03-mut-m1.raw.txt |
| M2 | store 删代际守卫（submit 内三处检查全删） | S7 红（旧代覆盖：matches 2≠3） | p7e-03-mut-m2.raw.txt |
| M3 | ReaderSearchBox Enter 分支删 lastSubmitted 比较 | 「改词后=重新提交」红（onSubmit 0 次） | p7e-03-mut-m3.raw.txt |
| M4 | SearchHighlightLayer active 判定恒 false | 「active 强调」两用例红（data-active 'false'≠'true'） | p7e-03-mut-m4.raw.txt |
| M5 | ReaderToolbar slot 消费删（null ?? 恒渲染占位） | 「传 searchBox」红（slot 探针 null） | p7e-03-mut-m5.raw.txt |

各组均：cp 备份→变异→定向测（真退出码）→cp 还原→diff 确认空。**M5 作废重做两轮在档**（第 1 轮 `{false ?? (}` 连带杀兜底非「占位回归」语义；第 2 轮括号不平衡文件级崩；第 3 轮 `null ?? (` 结构平衡忠实——raw 内有全记载）。复原后三文件 44 用例复跑绿。

## 6 分链自检真退出码（禁 verify 全链——locks 归主控）

`scripts/audits/p7e-03-selfcheck.raw.txt`：

| 链 | exit | 备注 |
|---|---|---|
| npm run quality:check | 0 | 终态复跑（含 e2e spec 终版）；无占位/乱码/跨域 |
| npm run tickets:check | 0 | 119 票注册表一致 |
| npm run lint | 0 | 首跑红 1（e2e spec 未用 Page 导入）已修 |
| npm run typecheck | 0 | node+web 双项目 |
| npm run test（全量） | 0 | 139 文件/1207 用例 |
| npm run build | 0 | out/ 产出完整 |
| npx playwright test tests/e2e/reader-search.spec.ts | 0 | 1 passed（终版 spec） |

## 7 超票面自裁申报（逐项）

1. **测试文件扩展名 .ts→.tsx**（票面 ⑤ 表写 reader-search-text.test.ts / reader-search.store.test.ts，落盘 .tsx）：tsconfig 双项目划分所迫——`tests/**/*.ts` 归 tsconfig.node.json（无 `--jsx`），.ts 测试传递引入 PdfPageCanvas.tsx（PdfTextItem 类型单源）即 TS6142 红四发。改 .tsx 归 web 项目（jsx: react-jsx）后零错。内容零变，票面文件名后缀机械修正。
2. **ReaderSearchBox 输入框内 Ctrl+F 本地等价路径**：keymap 层 editable 避让使焦点驻输入框时 document 级 Ctrl+F 不达——S12「面板已开再按」在该焦点位由组件本地 onKeyDown（preventDefault+select）等价兑现；非输入框焦点位仍走 keymap→open()（focusSeq++ 路径，store 测试 S12 锚定）。两路合围 S12 语义。
3. **e2e `test.setTimeout(120_000)`**：两跳 Electron 启动+建库迁移实测 51.9s 贴 60s 默认线（机器抖动越界实锤一次）；z-wg1-probe.spec.ts:219 同款先例。
4. **submit 后首匹配若在本页也居中**：scrolledMark 机制对新结果集+activeIndex 变更一律给居中资格——票面 S3 未禁、§① 翻页联动「active 匹配节点挂载后居中」语义自然覆盖（Chrome find 同款）。
5. **store 增 setQuery 动作**：票面动作列表未列但 props `onQueryChange` 必需（query=输入框实时值的写入口）——字段已声明，动作为其最小闭包。
6. **换行哨兵形态自裁**：buildPageText 的 '\n' 位映射 `{itemIndex:-1, offsetInItem:-1}`（票面只定「map=每字符→{itemIndex,offsetInItem}」未定哨兵）——map 与 text 同长保下标直查，纯函数测试锁定。
7. **e2e Esc 后复验 P2 可见**：一行保序断言（清零不清视口），微小增强。
8. **背景色用 backgroundColor 长属性**（非 background 简写）：jsdom 内联样式不展开简写（断言红实证）+e2e 计算样式断言同受益。

## 8 疑虑（供主控/门审）

1. **【环境事件·已立案排查】e2e 假红两轮**：run2 60s 超时硬杀 worker 恰落在 seedPaperRow 换绑窗口（copyFile node→spawn→finally 还原），还原未执行→build/Release 残留 node-v137 绑定→此后一切 Electron 首跳即崩（`firstWindow: Target page closed`，md5 实锤=1fe2bbe…=node 绑定）。差分佐证：既有受锁 spec reader-text 同点位同指纹失败（环境面非票面）。处置=`sqlite-abi.mjs use electron` 恢复+120s 预算+终版取证绿。**遗留隐患**：seedPaperRow 换绑窗口无硬杀防护，受锁 spec 共享（修复需 [locked-change]，非本票面）——建议主控记档。
2. **build 后 e2e 首跑冷启动方差**：同机实测 51.9s～>120s（疑 Defender 扫描新产物），热身后 1.8s。主控 verify（build→e2e 全量）时既有 35 用例无预算护体，冷启动方差存在——本票 spec 已设 120s，其余属既有面。
3. **基线数字勘误**：主控口径 135 文件 vs 实测 136（§4）——交接书滚动时请以实测为准。
4. **useReaderSearch 全 store 订阅**：搜索期间 ReaderPage 随每次击键重渲染（层 props 未变不重渲 canvas，reconciliation 便宜）——票面未要求 selector 细分，未做（记优化空间）。
5. **收口归主控**：INV-55 登记（docs/invariants.md）、locks:generate+apply（预期 251→255：+3 unit+1 e2e spec）、registry P7E-03 翻 done、[locked-change] 尾注。

## 9 结论

DONE：票面五层全兑现；TDD 红→绿→五组变异红证在档；分链自检全 exit=0；超票面决定 8 项逐条申报（无删减面——4 改 9 增全在票面声明面内）；环境级假红已排查定性并留档。

---

## 10 门一回炉第 1 轮（Kimi FAIL 1B/3W/5N → 主控裁决七修两记档）

日期：2026-09-03（同日）。逐条处置（编号循门一裁决）：

### 【B1-修】S11 zoom 重渲重算——补 jsdom 锚+M6 变异红证代偿
- 新用例「S11 文本层重渲（zoom 重排同型：replaceChildren+重挂 span）→MutationObserver+rAF 重算」：done 态挂载后对 `.textLayer` 做 replaceChildren+重挂（TextLayer effect 同型），clientRects 桩换新返回值（110,60,40,12→220,120,80,20），断言 hl 块仍在+px 样式随新几何更新（left/width/top/height 四断言）。行为本在（先红不适用——覆盖缺口，主控明示），故按裁决补 **M6 变异红证**：摘 `observer.observe(...)` 挂载→S11 精确红（expected '110px' to be '220px'），cp 备份法还原 diff 空。证据：`scripts/audits/p7e-03-mut-m6.raw.txt`。

### 【W1-修】INV-55 重挂漏洞——会话身份记账入 store
- reader-search.store 增 `sessionFileUrl: string` + 动作 `bindDoc(fileUrl)`：变化→代际失效+blank 全清+记录新值；不变=no-op。useReaderSearch 的 fileUrl 键效应改调 bindDoc（实例级 prevFileUrl ref 删除——重挂首跑 null 跳过的漏洞面随之消失；头注明示「同 fileUrl 重挂不清=身份未变」）。
- 先红：store 两用例（bindDoc 变化/同值）对旧实现红（bindDoc 不是函数=运行时行为红，vitest esbuild 不查类型——裁决允许的「编译红或行为红」后者落档）；重挂场景由 W3 接线测试①覆盖（对旧实现红：expected 'done' to be 'idle'——重挂漏洞实证）。

### 【W2-修】scrolledMark 劫持用户滚动——居中记账提升 store
- reader-search.store 增 `lastCentered: { m: SearchMatch[]; i: number } | null`（blank/submit 三处 set 均清——新结果集/新代重获资格）；SearchHighlightLayer 居中 effect 改读/写 store（matches 数组身份+activeIndex 比对，滚动前 setState 登记），实例级 scrolledMark ref 删除。跨层实例+跨重挂生效；多页多实例共享单条记账=恰好正确语义（仅 active 页实例滚动，头注明示）；zoom 后 active 不重居中=接受（注释在档）。
- 先红：新用例「层卸载重挂+同 matches 同 activeIndex→scrollIntoView 不再触发」对旧实现红（实例 ref 归零复活→二次滚动）。

### 【W3-修】useReaderSearch 零单测——新文件接线面三测
- 新增 `tests/unit/renderer/reader-search-wiring.test.tsx`（181 行）：①fileUrl 变化（含卸载重挂）→reset 生效+同 fileUrl 重挂不重置（W1 漏洞面同锚）；②keymap 'reader-search' 注册（document ctrl+f 派发→open()）+卸载成对注销（注销后派发 focusSeq 不动——INV-14）；③pageTurner：目标页≠tab.page→reader.store.setPage 落账+scrollRequest bump（{paperId,page,seq} 直断言）、相等→不调（scrollRequest 保持 null）。reader.store setState 直植先例（selection-mode 同法）；②③为既有行为覆盖（绿），①对旧实现红。
- 小修一处：it() 标题内嵌单引号致 esbuild 转译失败（`{scroll:'to'}`）——标题改双引号包裹后红面方落档（首轮 wiring 文件级红为此转译错，补充定向红在 round1-raw.txt 尾部）。

### 【N2-修】toLowerCase 非保长映射错位——逐项安全降小写
- buildPageText：逐项 `it.str.toLowerCase()` 保长（长度相等）才用降值入索引（保长则 map 偏移对原文 DOM span 同样有效）；非保长项（İ→i̇ 双码元类）用原 str——该项退化大小写敏感（头注+本段补记票面 §④ 边界）。findInText 相应只降 query（hay=page.text 原样，索引侧已安全降值）。
- 先红三用例：①buildPageText 基础用例期望随行为更新（'ABC\nD'→'abc\nd'——保长项降值入索引）；②N2 非保长项（前提自证 `raw.toLowerCase().length !== raw.length`+原 str 入索引+降值串不命中——旧实现双降产错位假命中故红）；③N2 混合项共存（保长降值+非保长原 str）。
- 连带：findInText 用例标题/头注措辞更新（「两侧 toLowerCase」→「查询侧降小写——索引侧已安全降值」）。

### 【N3-修】S2 用例补强
- S2 改用 `vi.fn` getPage 桩，补 `expect(getPage).not.toHaveBeenCalled()`（零搜索=页面零取数直锚）。附带修复：原夹具笔误 `pageOf(['SMART'])`（数组作单参——typecheck 关卡拦下）→ `pageOf('SMART')`。

### 【N4-修】defineProperty 桩显式还原
- reader-search-ui.test.tsx：beforeEach 保存原 descriptor（getClientRects/scrollIntoView），afterEach 按 descriptor 回填（原无实现=delete 属性），不再裸留。

### 【DISPOSE-记档不修】
- N1（e2e 硬编码 accent-soft 解析值）：循仓库锁值先例文化（F-06 同款），theme 调值走 locked-change 联动；canvas 底色不透明化遮挡径=已知缺口不入本票。
- N5（全 store 订阅重渲染）：v1 接受（原 §8 疑虑 4 已自报）。

### 回炉轮证据与数字（脚本实测）
- 先红：`scripts/audits/p7e-03-red/round1-raw.txt`——全量口径 6 测试级红（store W1×2+text N2×3+ui W2×1）+wiring 文件级（转译笔误修复后补充定向红：①红 expected 'done' to be 'idle'），既有 1207 用例零回归。
- 转绿：`scripts/audits/p7e-03-green/round1-raw.txt`——**140 文件/1216 用例全绿，exit=0**（+1 文件=wiring；+9 用例=text 2+store 2+ui 2+wiring 3；与主控预期 139→140 一致）。wiring 测试的 React act 警告经 plantSearchDone 包 act 清零（重跑终版在档）。
- 变异红证：`scripts/audits/p7e-03-mut-m6.raw.txt`（cp 备份法，还原 diff 空）。
- 分链自检：`scripts/audits/p7e-03-selfcheck-round1.raw.txt`——quality/tickets/lint/typecheck（S2 夹具笔误修复后复跑 exit=0+store 定向 17/17）/test 全量/build 各 exit=0。
- 定向 e2e：`scripts/audits/p7e-03-e2e-targeted.raw.txt`——R1 后复跑 1 passed（1.9s），exit=0。
- 改后行数：reader-search.ts 158 / reader-search.store.ts 202 / SearchHighlightLayer.tsx 159 / useReaderSearch.tsx 104 / wiring 测试 181（均远低于 500/组件 250 红线；grep 无 TODO/FIXME/placeholder——quality 关卡过）。
- 收口仍归主控：locks 预期 255→256（+1 wiring 测试）、INV-55/W2 记账语义可并入登记行、registry 翻 done。

---

## 11 门一回炉第 2 轮（最后一轮——门一复核 PWW 放行后新扫 2W，主控裁决三改两记档）

日期：2026-09-03（同日）。逐条处置（编号循主控 R2 裁决）：

### 【W1-新-修】Enter 判定 trim 口径一致
- 缺陷：`query !== lastSubmitted` 用未 trim 的 query 对已 trim 的 lastSubmitted——查询含首尾空白（'smart '）时 done 后每次 Enter 恒走 onSubmit（死循环重提交，永不进下一处）。
- 修：ReaderSearchBox onKeydown Enter 分支比较改 `query.trim() !== lastSubmitted`（头注同步）。
- 先红：新用例「提交 'smart '（尾空白）→done→再 Enter=onNext 而非 onSubmit」对旧实现红（onSubmit 1 次≠期望 onNext）——`p7e-03-red/round2-raw.txt` 三红之一。

### 【W2-新-修】IME 组合态守卫
- 缺陷：中文拼音输入法 Enter 确认候选词→直触发提交/下一处；Esc 取消候选→关面板。中文查询=本应用主路径。
- 修：onKeydown 首行 `if (e.nativeEvent.isComposing) return`（Enter/Esc 全守；头注同步）。
- 先红：两新用例（组合态 Enter→onSubmit/onNext 零调用；组合态 Esc→onClose 零调用）对旧实现红（各被调 1 次）。**桩路径注明**：jsdom 构造器 init 不保证透传 isComposing——pressKey 改实例级 `Object.defineProperty(ev, 'isComposing', { value: true })` 等价实现（React nativeEvent 直读该实例，裁决注明的备选形态落档于 round2 红绿证据）。

### 【N2-新-修】非保长项注释诚实化（纯注释，无测试面）
- 勘正口径：原措辞「该项退化大小写敏感」不准确——findInText 查询侧恒 toLowerCase，原 str 入索引的项含大写字符时连精确大小写查询也永不命中（查 'İX' 降为 'i̇x' 对不上索引 'İX'），即**该类项整体不可搜**。
- 修：reader-search.ts 头注 bullet+buildPageText jsdoc 措辞改「该类项在查询侧恒降小写下永不命中——非保长语料不可搜，已知边界（不加回退匹配逻辑——成本不值）」；测试文件同措辞注释一并对齐（注释面）。零行为改动。

### 【DISPOSE-记档不修】
- N1-新（keymap 只绑 ctrl vs 面板内 ctrl||meta 口径不一）：**证伪**——keymap.ts matches() 实现是 `(b.ctrl===true) !== (ev.ctrlKey||ev.metaKey)`，文档级同样接受 metaKey（门一读了绑定声明没读匹配器）；且本应用 win32 单平台。零动作。
- N3-新（占位 title 文案改）：全量 1216 绿=无受锁锚定面，title 非锁面。零动作。

### R2 证据与数字（脚本实测）
- 定向红：`scripts/audits/p7e-03-red/round2-raw.txt`——3 红（W1-新 1+W2-新 2），exit=1。
- 定向绿：`scripts/audits/p7e-03-green/round2-raw.txt`——23/23，exit=0（ui 文件 20→23）。
- 全量：`scripts/audits/p7e-03-selfcheck-round2.raw.txt`——**140 文件/1219 用例全绿**（+3 实测=R2 三新用例；文件数不变循主控预期），exit=0；quality/tickets/lint/typecheck/build 各 exit=0。
- 定向 e2e（保险锚，R2 源改动后）：`scripts/audits/p7e-03-e2e-targeted.raw.txt`——1 passed（1.8s），exit=0。
- 收口仍归主控：locks 预期 255→256、registry 翻 done、INV-55（含 R1 bindDoc/lastCentered 记账语义）登记。
