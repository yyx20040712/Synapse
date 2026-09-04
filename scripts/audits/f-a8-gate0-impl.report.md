# F-A8 门 0 前置票实现者报告——verifyQuoteItem+locateQuote 核提取+resolveAnnotationRectsItem 纯域版

> 实现者=子代理（GLM5.3flash 定档；环境无 model 参数=统一档欠账披露——简报头注在案）。
> 主控=GLM5.3；票=scripts/audits/f-a8-gate0-impl-brief.md；设计书=
> docs/design/2026-09-04_f-seam-reanchor-design.md（终裁版）。
> 技能清点（开工纪律）：test-driven-development 用（TDD 先红+变异红证）/
> verification-before-completion 用（verify/test 真退出码落盘）/
> javascript-testing-patterns 用（oracle 双跑三态断言构造）/
> systematic-debugging 用（TS6142 排查+fixture 手算误定位）；其余不用
> （纯函数域+jsdom 单测、票面禁 git 操作、无浏览器/e2e/部署面）。

## 1. 实现摘要

- **locateQuote 核提取（单源非复制）**：anchor-serialize.ts 内把 verifyQuote 的
  「原位校验（matchAt）+indexOf 全出现扫描+prefix(2)+suffix(1) 打分+同级距原
  偏移最近」核提为模块私有 `locateQuote(text, selector): number | null`；
  `verifyQuote(root, selector)` = `locateQuote(fullTextOf(root), selector)`
  ——**行为零变**（受锁 annotation-anchor.test 28 用例全绿对照，消费面零动）。
- **verifyQuoteItem**：驻 anchor-serialize.ts（与 verifyQuote 同件=核单源）。
  items 剔空串逐项 str 拼接（与 buildItemOffsets 偏移表同口径——空串项零宽
  不入拼接，产出逐字节相同）→ locateQuote。偏移口径=页内文本序；口径系统性
  差由 S1 reconcile 守卫拦截（票面原语义，本函数不转换）。
- **resolveAnnotationRectsItem 纯域版**：驻 annotation-resolve.ts（重锚域宿主）。
  entry null→{}（S0 缺席格）；S1 DOM 对账=门 2 接线面（头注明示「本域 entry
  信任=store 写者唯一性——PagesOverlay handlePageRender 回报，写者契约在
  page-items.store 头注」）；逐条 verifyQuoteItem 校正偏移→itemSelectionGeometry
  产 {rects,bands}（归一化数学**直接复用 selection 链管线导出面**，零第二份
  归一化实现——rectsForOffsetRange/bandsFromItems/基线分组/角度门全经它）；
  对账失败/空串引文/他页条目→该条缺席（S3b 纯函数只缺席）；计算异常逐条
  try 缺席（selection 快路径 itemChainFor 同款 try 先例）。
- **AiAnnotationLayer 域零涉及**（门 2 接线票面）✓。

## 2. 文件清单（与票面修改清单逐项对账）

| 文件 | 状态 | 行数 |
|---|---|---|
| src/renderer/features/reader/anchor-serialize.ts | 改（+59）：locateQuote 提取+verifyQuoteItem+头注三层更新 | 234（≤500） |
| src/renderer/features/reader/annotation-resolve.ts | 改（+88）：resolveAnnotationRectsItem+itemViewportOf+头注行为层 | 401（≤500） |
| tests/unit/renderer/anchor-item-verify.test.tsx | 新（252 行，12 用例，always-active describe） | — |
| src/renderer/features/reader/pdf-item-geometry.ts | **零改**（清单 4 备而未用——归一化复用走 itemSelectionGeometry 既有导出面，无需加 export） | — |
| locks/manifest.json | +1 条（新测试路径注册） | — |

## 3. TDD 首红

- 首红形态=**行为红**（票面「行为红优先」路径）：先写测试+函数桩
  （`throw new Error('not implemented: F-A8 gate0 …')`）→
  `npx vitest run tests/unit/renderer/anchor-item-verify.test.ts` =
  **12/12 全红，exit=1**（证据 scripts/audits/f-a8-gate0-firstrun.raw.txt）。
  非编译红（vitest/esbuild 转译不查类型；tsc 关卡在 verify 内闭环）。

## 4. 实现后绿+回归

- 新件+受锁基准双跑：anchor-item-verify.test.tsx（12）+
  annotation-anchor.test.ts（28）= **40/40 绿 exit=0**
  （f-a8-gate0-greenrun.raw.txt / f-a8-gate0-tsxrun2.raw.txt）——
  verifyQuote 行为零变面（受锁消费面）全绿。
- 全量 `npm run test`：**1341/1341 绿 exit=0**
  （f-a8-gate0-fulltest.raw.txt；基线 1329+12 新增吻合）。

## 5. 变异红证（cp 备份法，禁 git checkout——diff 空确认还原）

最终实现态三红证（首轮 V1/V2/V3 亦在案 f-a8-gate0-mutV*.raw.txt，实现变更
后于最终态重做）：

| 变异 | 内容 | 结果 | 证据 |
|---|---|---|---|
| V1 | locateQuote 打分权重翻转（prefix1+suffix2） | 1 红（权重 2>1 用例）exit=1 | f-a8-gate0-mut2-V1.raw.txt |
| V2 | verifyQuoteItem 剔空串拼接破坏（filter 改剔首项） | 7 红 exit=1 | f-a8-gate0-mut2-V2.raw.txt |
| V3 | resolveAnnotationRectsItem 校正偏移丢弃（start: at→a.startOffset） | 1 红（漂移用例）exit=1 | f-a8-gate0-mut2-V3.raw.txt |

每轮 cp 备份→变异→跑红→cp 还原→diff 空（restore-ok 回显在案）；还原后
复跑 12/12 绿（f-a8-gate0-postmut-restore.raw.txt）。

## 6. verify 真退出码+基线核对

`npm run verify`（quality+tickets+locks+lint+typecheck+test+build 全链）=
**exit=0**（f-a8-gate0-verify.raw.txt）。

| 指标 | 基线 | 实测 | 差 |
|---|---|---|---|
| 测试文件 | 154 | 155 | +1（票面预期 +1~2 ✓） |
| 用例 | 1329 | 1341 | +12 |
| locks | 277 | 278 | +1（新测试路径） |

- grep TODO/FIXME/placeholder=零匹配（exit=1）；UTF-8 中文可读（verify 的
  quality mojibake 关卡绿）；`git diff --stat` 范围=2 src+1 manifest+1 新
  测试，无蔓延。

## 7. locks 实录

1. 初次：新件诞生即 `locks:generate`（278 条）→`locks:apply`（278 只读）
   exit=0。
2. TS6142 修复后测试改扩展名 .ts→.tsx：`locks:generate`（重扫，条目路径
   更新为 .tsx）→`locks:apply` exit=0；`node scripts/check-locks.mjs`=
   「278 个受锁文件与 manifest 一致」exit=0。
3. src 两个改动文件均**非受锁**（manifest 无条目，动手前 grep 确认）——
   无 unlock 需要。
4. manifest 出现 CRLF→LF 提示（locks 工具 PowerShell 写出的既有形态；
   locks:check 绿；.gitattributes 强制 LF 由 git 归一——既有工具行为非本票
   引入）。

## 8. 自裁申报（超票面/近票面决定全列）

1. **verifyQuoteItem 拼接实现偏离票面字面**：票面「buildItemOffsets(items)
   .spans 拼页全文」→ 实现为模块内自持「map str→filter 空串→join」。
   产出与 spans 拼接**逐字节等价**（空串项 join 零贡献；oracle「空串项
   穿插」用例锁定）。理由（阻断性）：anchor-serialize 经受锁
   annotation-anchor.test.ts（.ts）可达 tsconfig.node 程序（include
   tests 目录 .ts 文件、无 jsx 选项），import pdf-item-geometry（其 type
   import PdfPageCanvas.tsx）即触发 TS6142 → verify 红。Rule of Three
   第 2 次保持重复（与 pdf-item-geometry.itemsTextOf 同式）合规；头注
   架构层在案（第 3 处出现时上抽共享件并届时一并解配置缺陷）。
2. **verifyQuoteItem 参数类型=结构最小面** `ReadonlyArray<{ str: string }>`
   而非 PdfTextItem[]（PdfTextItem[] 结构兼容传入，annotation-resolve 传
   entry.text.items 零断言）：同 TS6142 理由——不 import PdfPageCanvas
   类型链。依赖倒置式最小消费面声明，非类型复写（头注申报）。
3. **测试文件扩展名 .tsx**（票面示例名 anchor-item-verify.test.ts）：
   .ts 进 node 程序、自身 import PdfPageCanvas/pdf-item-geometry/
   page-items.store（type 链触 .tsx）即 TS6142。域内先例=
   pdf-item-geometry.test.tsx（同因选 .tsx）。内容零 JSX。
4. **resolveAnnotationRectsItem 返回类型**=域内既有
   `Record<string, ResolvedAnnotation>`（票面写 ResolvedRects——域内无此
   名，按现 resolveAnnotationRects 同返回形态对齐，语义同构）。签名按
   票面位置参数 `(entry, annotations, page)`。
5. **viewport scale 自 entry.box 反推**（box.w÷view 跨度；rotate 90/270
   宽高互换）而非「getState() 现读 zoom」：纯函数域无 paperId/zoom 可读
   （票面签名无此参）。数学等价性：box=PdfPageCanvas 以 clampScale(zoom)
   渲染的 canvas CSS 盒回报（PagesOverlay 写者契约）→ 反推值=夹取后真值；
   scale/base 自洽约除 → 归一化缩放不变且**消**取整差（比快路径
   [精确 scale+取整 base] 离散差更小）——selection 快路径同款数学的纯域
   等价物，同族精度带内。页级守卫：scale 非有限/≤0→整体 {}（畸形 box
   防线，票面未明说，S0 同判据面）。
6. **fixture 手算误修正过程**（如实记录）：首轮 3 红=测试期望值错误非实现
   缺陷——权重用例偏移误写 11（正确 8）；行为用例 quote 未真跨 item 边界
   （'段正文' 单 item 内 1 块 vs 直调 2 块）。修正 fixture（quote 改
   '段中段正文' 4..9 跨 item1/item2）后 40/40 绿。首红（桩 throw）在前、
   此 3 红在其后——非首红形态篡改。
7. **删减面**：pdf-item-geometry.ts 零改（清单 4 未动用）；无其他删减。

## 9. 疑虑（供主控/门审裁量）

1. **tsconfig.node.json 无 jsx 但 include tests 目录 .ts 文件**（测试经相对
   import 跟随解析 renderer 源码）=潜在配置债：未来任何 .ts 测试触 .tsx
   链都会 TS6142。本票踩破后以「结构最小面+自持拼接+.tsx 测试」绕行，
   未修配置（受锁+超修改清单）。建议后续单独立票（[locked-change] 一行
   `"jsx": "react-jsx"` 或收紧 include）。
2. oracle 未单列「同分双出现取距原偏移最近」分支用例（构造夹逼 fixture
   较绕；该分支为 verifyQuote 既有行为+受锁消费面不动，oracle 双跑一致
   传递覆盖）。可后续补强。
3. 类型环声明：pdf-item-geometry→annotation-resolve（RowBand，既有
   type-only）+annotation-resolve→anchor-serialize（值）+本轮 anchor-
   serialize 不再依赖 pdf-item-geometry（自裁 1 的副作用=环彻底消失）。
4. 提交纪律归主控：本轮含 locks manifest 变更，提交须 [locked-change]
   尾注；staging 显式列文件（scripts/audits 下历场未跟踪残留多，勿扫入）。

## 10. 成本账本

实现者子代理：GLM5.3flash 档（环境无 model 参数=统一档欠账披露）；会话约
09:15–09:45（30 分钟），含 TS6142 排查一轮+fixture 手算误修正一轮+最终态
变异红证重做一轮。证据文件 14 份（*.raw.txt）随本报告存档。

## 11. 回炉一轮补记（2026-09-04，门一 Kimi K3 PWW 裁决）

主控处置：回炉一轮 4 项（W1/W2/W3/N1）+W4 追认补记；N2 主控源码裁决排除
（viewportTransformFor:98 自行同式归一化——传原始 rotate 一致，零改动）。

- **W1 tie-break 用例（毕）**：oracle 补 3 用例——同分 tie-break 正反双
  向（双锚全空 score 同 3、距原偏移一近一远 → 取近者；正向近=第一处
  出现 expect 1/反向近=第二处出现 expect 5）+打分序锁定（2 分远位 dist10
  胜 1 分近位 dist0 → score 优先于距离）。新用例对现行码**直接绿**
  （tie-break 分支=locateQuote 迁移零变既有行为）——属「补防线」非「修
  缺陷」，绿为预期，如实申报；变异红证补：tie-break 翻转
  （`dist < bestDist`→`dist > bestDist`）→ W1 正反双用例红（2 failed，
  exit=1；打分序用例不红=score 分层独立锁），cp 备份法 diff 空还原
  （f-a8-gate0-rework1-mut-tiebreak.raw.txt 在档）。
- **W2 机械对账测试（毕）**：新 describe「verifyQuoteItem 偏移口径与
  buildItemOffsets.spans 机械对账」——items 含空串穿插（5 项 3 非空），
  断言 spans 表结构（3 条/首 start=0/相邻衔接/total=末 end）+对每非空项
  verifyQuoteItem({quote:该 str, prefix:'', suffix:'', start:spans[i].start})
  ===spans[i].start（原位命中 ⇔ 偏移表↔拼接文本全表一致——原人工核读
  机器锁定）。测试文件 .tsx import buildItemOffsets 走 web 程序先例无碍
  （主控裁定口径）。对现行码直接绿（同补防线预期）。
- **W3 措辞降级（毕）**：annotation-resolve.ts 头注+itemViewportOf 注两处
  「约除消取整差」→「水平轴（宽）scale/base 严格约除消取整差；垂直轴依赖
  box 宽高比≈view 跨度比，有界 ~1px 级相对残差=同族精度带内[门一 W3
  口径]」。**本报告 §8 自裁 5 同步勘误**：原文「归一化缩放不变且消取整差
  （比快路径离散差更小）」为过度声明——垂直轴 box 宽高比与 view 跨度比
  独立取整，y 归一化存在有界 ~1px 级相对残差（同族精度带内），水平轴
  严格约除成立。以本节口径为准。
- **N1 DOM 触达面还原（毕）**：verifyQuote 首行加
  `if (selector.quote.length === 0) return null`（提取薄壳化后 fullTextOf
  在空 quote 短路前提前求值=触达面扩张 vs 旧码；前置守卫还原旧序——空
  引文不触 DOM，行为零变；locateQuote 内同检查保留=verifyQuoteItem 路径
  防线，头注在案）。N1 无行为断言可红（还原触达面非行为修复），红证载体
  =上列 W1/W2 变异红证。
- **W4 追认补记（报告自裁清单补一行）**：§8 增补——「裁决③字面管线
  （rectsForOffsetRange+bandsFromItems 直调）替换为 itemSelectionGeometry
  整管线——主控追认（裁决③后半句『直接复用导出面,禁第二份归一化实现』
  的兑现形态）」。
- **受锁流程**：anchor-item-verify.test.tsx 改动走 unlock（exit=0）→改→
  apply（exit=0，278 一致）。
- **verify**：`npm run verify` exit=0 落盘
  f-a8-gate0-rework1-verify.raw.txt——155 文件/1345 用例（1341+4 新增）/
  locks 278。git diff 范围=2 src+manifest（+6 净行 vs 首轮，无蔓延）；
  anchor-serialize 239/annotation-resolve 403/测试 315 行（≤500/测试不限）。

证据文件（本轮）：f-a8-gate0-rework1-unlock/locksapply/run/mut-tiebreak/
verify.raw.txt（5 份）。
