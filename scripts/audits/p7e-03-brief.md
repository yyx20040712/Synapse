# P7E-03 工单票面——页内高亮搜索（五层规约）

> registry：`P7E-03` / file `src/renderer/features/reader/ReaderToolbar.tsx` / area reader / owner strong / open
> 排程真相源=v31 §2 第 1 项（P7-E 余序首项：页内高亮搜索领头）。
> 开工记录：本票段技能清点延续本段开场（subagent-driven-development/TDD/
> verification-before-completion/systematic-debugging/loop-engineering 已加载；
> 门审外链 gate-call.py 在位）。

## ⓪ 出处（无出处默认不工单化——四链在档）

1. B1 报告 §3（docs/reports/2026-08-23_v2-blueprint-b1.md:47）：
   `ReaderToolbar.tsx:7,163（页内高亮搜索，占位禁用态已放）`。
2. ROADMAP §P7-E 内序第 3 位：「标签生命周期 > 拖拽导入 > 页内高亮搜索 > …」
   （docs/ROADMAP.md:384）。
3. ReaderToolbar.tsx:6-7+212-220：行为层注记「页内高亮搜索 v2——工具栏只放
   占位禁用态并 title 提示」+占位 span（title=「页内高亮搜索 v2 提供」）。
4. ReaderShortcuts.ts:38：「预留：页内高亮搜索快捷键（P7-E）」。

- **价值**：阅读中即时定位术语/公式出现位置——学术阅读高频动作；v1 全文检索
  走库侧 FTS（离当前阅读上下文远），页内搜索补齐「读中查」的最后一块。
- **依赖**：既有 TextLayer（pdfjs 4.10 每文本项恰一 span、按序——本票几何映射
  前提，pdf.mjs TextLayer#appendText 实证）；reader.store scrollRequest 程序
  滚动通道（INV-29 既有面复用）；零新依赖、零 IPC、零迁移。
- **风险**：①文本层异步入 DOM（layer.render() promise）——高亮量测须等
  span 落位（MutationObserver 先例=AnnotationLayer）；②全文档逐页
  getTextContent 是异步逐页循环——必须代际守卫（新查询顶替旧代）+searching
  态可见指示；③跨行匹配的矩形正确性（DOM Range 逐 span 取 clientRects，
  行盒≠字形带——v1 用行盒原样，band 收边不在本票面）。
- **验收**：见 ⑥。

## ① 行为层（态空间表先行——store+异步+用户输入）

### 主控 Design 裁决：索引全文档（文本域）+高亮仅渲染窗口（DOM 域）

- **采**：搜索索引=逐页 `doc.getPage(n).getTextContent()` 文本项拼接（全文档
  覆盖——未渲染页也可计数与跳转）；匹配矩形=渲染窗口内页的 **TextLayer DOM
  span** 上建 Range 取 clientRects（pdfjs 自己排版精确、零 transform 数学，
  item→span 索引 1:1 按 DOM 序）。未渲染页无高亮（匹配计数仍全局）——懒渲染
  架构的诚实投影。
- **否决**（item.transform 手算矩形）：pdf.js 文本矩阵换算易错且与官方层漂移；
  DOM Range 是标注链已验证的语言（annotation-anchor 同源先例）。
- **否决**（只搜渲染窗口页）：连续滚动懒渲染下计数随窗口变——非确定行为，
  拒。

### 纯函数（新文件 reader-search.ts，类型不 import pdfjs-dist——INV-16 白名单外）

```
buildPageText(items): { text: string; map: CharMapEntry[] }   // 拼接 items.str，
  //   hasEOL 项后插 '\n'（防跨行假匹配）；map=每字符 → {itemIndex, offsetInItem}
findInText(pageText, query): { start, end, itemRanges: {itemIndex, s0, s1}[] }[]
  //   大小写不敏感（两侧 toLowerCase）；空串/纯空白查询=空结果（调用方拒）
asSearchDoc(v: unknown): SearchDoc | null    // unknown→结构收窄（ReaderPage 持
  //   pdfDoc 为 unknown——SearchDoc={numPages, getPage(n)→{getTextContent()}}）
toPageRelative(clientRect, rootRect): {x,y,w,h}   // 视口盒→页根相对像素
spansForItems(pageRoot, itemCount): (HTMLSpanElement|null)[] | null
  //   .textLayer span 按序映射；数量不符→null（防御：该页不高亮只计数）
```

### 搜索 store（新文件 reader-search.store.ts，zustand）

```
态：'idle'（面板关）| 'open'（面板开）| 'searching'（在途）| 'done'（有结果集）
字段：query（输入框实时值）/ lastSubmitted / matches / activeIndex(0 基) /
  pageItems: Record<number, items[]>（仅含命中页——高亮映射输入）/ focusSeq
动作：open()（idle→open+focusSeq++）/ close()（任意→idle+全清）/
  submit(doc, q)（trim 空=no-op；generation++ 代际守卫；逐页 await；页失败=
  toast+回 open 保留 query）/ next()/prev()（activeIndex 回卷循环；触发
  翻页滚动——见下）/ reset()（换文档/换 tab 调用）
```

- **代际守卫**（INV-03 同族）：submit 每次自增模块级 generation；每页回传时
  代际不符→作废终止；reset/close 也使代际失效。
- **翻页联动**：next/prev 目标匹配页 ≠ 当前 tab.page 所在可见页时 →
  `reader.store.setPage(page, {scroll:'to'})`（INV-29 既有程序滚动通道——
  页盒顶入视口）；页内高亮层 effect 在 active 匹配节点挂载后
  `scrollIntoView({block:'center'})` 居中（两段式：先页顶后居中，收敛即可）。

### 高亮层（新文件 SearchHighlightLayer.tsx，PagesOverlay.renderPageLayers 内挂）

- props：`{ page: number; pageRoot: HTMLElement | null }`（0 基页——与
  AnnotationLayer 同型挂法）；内部订阅 reader-search.store。
- 渲染：state='done' 且该页有匹配 → 逐匹配逐 itemRange 建 DOM Range →
  clientRects → toPageRelative → 绝对定位 div（`data-testid="search-hl"`；
  active 匹配 `data-active="true"`+强调样式）。pointer-events:none。
- 量测时机：span 异步落位 → 对 .textLayer 容器挂 MutationObserver+
  rAF 合并重算（AnnotationLayer 先例同型）；zoom 变更（重渲链）同径重算。
- 层序：z=PAGE_LAYER_Z.colorBlocks（1——背景板语言：canvas 墨带(z2)恒在其
  上，文字纯黑不被染；DOM 序在 AnnotationLayer 后=叠于标注块之上，搜索为
  瞬态视觉合理）。色=var(--accent-soft) 底+active 用 var(--accent) 描边。

### 搜索框（新文件 ReaderSearchBox.tsx，纯受控）

- props：`{ state, query, lastSubmitted, matchCount, activeIndex, focusSeq,
  onQueryChange, onSubmit(q), onPrev, onNext, onClose }`。
- 键位：Enter → query!==lastSubmitted 或 state!=='done' ? onSubmit : onNext
  （Chrome 式：首次回车=搜索，再回车=下一处）；Shift+Enter=上一处（同规则）；
  Esc=onClose。输入框 onChange → onQueryChange。
- 展示：计数 `${activeIndex+1}/${matchCount}`（0 命中=「0/0」+「无匹配」
  提示文案）；searching 态=计数位转圈文案「搜索中…」；‹ › × 三按钮
  （aria-label 上一个/下一个/关闭搜索）。focusSeq 变化 → input.focus()+
  select()（Ctrl+F 重开聚焦）。

### 接线（ReaderPage/useReaderSearch.ts）

- 新 hook `useReaderSearch(pdfDoc: unknown, fileUrl: string): ReactNode`：
  ①fileUrl 变化 → searchStore.reset()（换文档清面板——INV-55 面）；②注册
  keymap id 'reader-search'（ctrl+f，preventDefault——经共享 keymap 注册/
  注销成对 INV-14，**不经 ReaderShortcuts**——其受锁测试面零改）→
  searchStore.open()；③订阅 store 产 `<ReaderSearchBox>` 节点返回。
- ReaderToolbar.tsx：占位 span 兑现删除 → 可选 slot prop `searchBox?:
  ReactNode`（缺席=旧占位 span 兜底——纯减集改向无，生产装配面恒传）；
  头注 :6-7 v2 注记修订。ReaderPage 渲染 toolbar 时传 slot。
- ReaderShortcuts.ts:38 预留注记兑现修订（纯注释——快捷键实际落 keymap
  'reader-search'，注记指明落点）。

### 态空间跨格序列表（S1~S12——验收=逐格测试锚）

| # | 序列 | 期望 |
|---|---|---|
| S1 | idle→Ctrl+F→open | 面板开、输入框聚焦、零匹配零高亮（未搜） |
| S2 | open→Enter（空/纯空白查询） | no-op：零搜索零代际变化（submit 早退） |
| S3 | open→submit 有效查询 | open→searching→done：计数 n/1、首匹配 active、当前页高亮块渲染 |
| S4 | done→Enter/‹›下一处 | active+1；末位→回卷 1；目标页不在视口→setPage 程序滚动+居中 |
| S5 | done→Shift+Enter/上一处 | active−1；首位→回卷末位 |
| S6 | done→Esc/× | →idle：面板关+高亮清+query 清 |
| S7 | searching→再 submit 新查询 | 代际守卫：旧代页回传作废，新代独占，计数=新查询口径 |
| S8 | searching/done→换 tab/换文档 | reset→idle（fileUrl 键效应；INV-55） |
| S9 | submit 无命中 | done(0)：计数「0/0」+「无匹配」，零高亮块 |
| S10 | 逐页提取中某页 getTextContent 失败 | error toast+回 open（query 保留），零崩溃、代际终止 |
| S11 | done→zoom 变更 | 计数不变；高亮随文本层重渲重算（MutationObserver 路径）保持可见 |
| S12 | done→Ctrl+F 再按 | 面板已开：focusSeq++→重新聚焦+全选 query，不重搜 |

## ② 接口层

新四文件+hook 的导出面见上；**零 IPC/零 schema/零 shared 改动**（纯 renderer
特性内闭环）；PdfTextItem/PdfTextContent 类型消费循「类型再导出单源」惯例
（`import type ... from './PdfPageCanvas'`——非 pdfjs-dist 直 import，INV-16）。

## ③ 架构层

- 分层不动（renderer 特性内新增）；reader-search.store 不 import reader.store
  （翻页联动经注入回调——hook 装配面接线，可测性=CorpusExtractor deps 注入同型）。
- **INV-55 新登记**（docs/invariants.md，收口时主控统一改）：页内搜索会话
  生命周期挂 reader 视图文档身份（fileUrl 变更/换 tab 即 reset 全清）；在途
  搜索代际守卫（新查询/reset 顶替旧代，迟到页回传作废）；搜索索引全文档、
  高亮视觉仅渲染窗口页（懒渲染架构的确定性投影——计数与窗口无关）。
- ReaderToolbar 可选 slot=既有可选 props 先例形态（onFitWidth 同款缺席语义）。

## ④ 生命周期层

- ReaderToolbar.tsx:6-7+212-220 与 ReaderShortcuts.ts:38 两处 v2 预留注记兑现
  修订。
- 已知边界（票面外不修只记）：①跨行匹配高亮=行盒原样（band 收边是标注链
  F-A4 面的后续同化项）；②RTL/竖排文本不支持（pdfjs dir 非 ltr 项按 ltr
  处理——学术 PDF 主流场景）；③whitespace 不归一（query 含连续空格按字面
  匹配）；④done 态下高亮层对「匹配在 span 内偏移」依赖 items 与 TextLayer
  span 严格同序同数（pdfjs 4.10 契约，防御不符=该页跳过高亮只计数）。

## ⑤ 文化层（测试规约——TDD 红→绿→变异红证）

新测试全 always-active：

| 文件 | 覆盖 |
|---|---|
| tests/unit/renderer/reader-search-text.test.ts | 纯函数面：buildPageText 拼接+hasEOL 插行+字符映射；findInText 大小写不敏感/多命中/CJK 跨 item 命中/跨 '\n' 不命中/空结果；toPageRelative 数学；spansForItems 数量符/不符两径 |
| tests/unit/renderer/reader-search.store.test.ts | S2/S3/S4/S5/S7/S8/S9/S10 全序列（doc 桩注入逐页文本+失败注入；代际守卫=旧代页回传后断言 matches 为新代口径）|
| tests/unit/renderer/reader-search-ui.test.tsx | ReaderSearchBox：键位三件（Enter 提交/再按下一处、Shift+Enter、Esc）+计数展示+searching 文案+0 命中文案+focusSeq 聚焦；SearchHighlightLayer：done 态按页过滤渲染+active 强调属性+idle/searching 零渲染+span 数不符跳过（jsdom 建 span 链——clientRects 零长面=渲染存在性断言，几何归 e2e）；ReaderToolbar slot：传/不传两态 |
| tests/e2e/reader-search.spec.ts | 装配级全链（fixture=createMultiPagePdf(3)，每页一行 `P<n> SMART WATER TEST DOC`）：打开文献→Ctrl+F→输入小写 `smart water`→Enter→页 1 高亮块可见+计数 1/3→Enter（下一处）→P2 文本入视口+计数 2/3+页 2 高亮可见→Esc→高亮清零+面板关。 crib reader-text.spec seedAndLaunch 配方 |

- **变异红证 ≥5 组**（先证命中再断红，cp 备份法还原——禁 git checkout）：
  M1=findInText 删 toLowerCase 归一（大小写用例红）；M2=store 删代际守卫
  （S7 旧代作废断言红）；M3=ReaderSearchBox Enter 分支删 lastSubmitted 比较
  （再按=下一处用例红）；M4=SearchHighlightLayer 删 active 匹配过滤（S3 active
  强调断言红）；M5=ReaderToolbar slot 删（slot 渲染断言红——占位回归）。
- 先红纪律：每测试文件先红（缺失模块天然红）落盘 scripts/audits/p7e-03-red/；
  证据日志统一 `.raw.txt` 后缀；首红须全量套跑口径或申报降档。
- **锁序纪律（v31 §3）**：新测试文件诞生即 `locks:generate`+`locks:apply`
  **先于** verify（预期 251→255：+3 unit+1 e2e spec）。
- 受锁面：仅新测试文件四件（tests/ 自动锁面）；无既有受锁文件改动。

## ⑥ 验收

- `npm run verify` 全绿（基线 135 文件 1163 用例滚动，新增数实测申报）。
- e2e 全量（35+1 新 spec）全绿。
- 门一 Kimi 外链+门二 deepseek 异构终审（材料含新文件全文+diff 包）。
- grep 无 TODO/FIXME/placeholder；中文 UTF-8 验证。
- INV-55 登记+两处预留注记修订+registry P7E-03 翻 done（收口主控单写）。
- 提交尾注：新测试入锁 [locked-change]。

## ⑦ 派发与成本申报

- 三屋：实现者=子代理（环境 Agent 工具面无 model 参数——账本记「环境限制
  统一档」欠账披露，§4.5 环境降级披露条款）；门一=Kimi K3（gate-call.py）；
  门二=deepseek（同链瘦身+32k 档纪律）。
- 实现者禁 git/registry/locks；禁新增依赖；超票面决定停下申报（BLOCKED）。
- 主控亲验 verify 真退出码+变异红证抽查+diff 范围核对。
