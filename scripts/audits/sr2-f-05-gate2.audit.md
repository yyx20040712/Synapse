# SR2-F-05 门二终审档（程序滚动单容器收敛——缺陷 A：TabBar 被顶出视口）

> 审计人：三屋模式门二终审孙代理（2026-08-28）。只读审计；唯一可写=本档。
> 禁跑 npm/test/构建/git 写/tickets 触碰——全部结论基于 diff 包+仓库现势静态推演。
> 输入：sr2-f-05-brief.md / sr2-f-05-impl.report.md / sr2-f-05-gate1.audit.md /
> sr2-f-05-gate1.diff（1080 行 14 文件）+ 仓库源文件抽读。
>
> **开工技能清点**：用 code-review-excellence（终审主工具）、
> verification-before-completion（落档前静态自查；禁跑 verify 故仅静态面）。
> 不用 javascript/e2e-testing-patterns（门一已做断言对抗评估，本席复核其结论
> 而非重做）/systematic-debugging（禁跑运行时）/TDD（本席不写实现）/
> subagent-driven-development（无派发权）。配置自查：只读席位，模型/思考等级
> 由主控侧配置，本席无派发面。

---

## 终审裁决：**PASS**（B=0 / W=3 / 新发现 1 条 W 级卫生项，无阻断）

---

## ① 处置核对（门一全 findings + 主控裁决 vs 终态实物——「说了没改」与「裁了没记」双查）

| 项 | 门一裁决 | 主控处置 | 终态实物核对 | 结论 |
| --- | --- | --- | --- | --- |
| W1 anchor-locate.test.ts:19/:24 重复注册 toast-store vi.mock | W（冗余残留未申报） | 不回炉，记战役报告（卫生级） | 实测 :19/:24 两行字面相同仍在位（vitest 同路径后注册覆盖、工厂相同=行为无差）。裁决=不改，实物=未改，无「说了没改」矛盾 | 一致 |
| W2 报告申报 e2e spec「272→341 行」 | W（实测 344） | 不回炉，记战役报告 | wc -l 复测=344 确认；纯报告口径无实物面 | 一致 |
| N1~N10（门一裁决清单 1~10 行：改锚核准/母本符合/红线/变异恰中性/接缝/机制未深究/e2e 残余盲区/差值法边界/12it 未对号/P4 字面微调） | 全 N（观察记录，无行动面） | 无需处置 | 门一档 §六 完整在案；本席逐条复核无一要求改动终态——无「说了没改」面 | 一致 |
| lint 防线（no-restricted-properties 禁 scrollIntoView） | 门一附议留主控裁量 | 立项入遗留池 | 非本票面；**遗留池登记=主控收口待办**（列入放行条件 §7） | 待收口记账 |
| 战役报告记 W1/W2 | —— | 主控职责 | 非本席可验面（无独立信源）；列入放行条件 | 待收口记账 |

**① 结论：处置一致。** 实现者无「说了没改」（W1 裁决即保留、实物即保留）；主控侧
「裁了没记」两项（战役报告/遗留池）属收口动作，列入放行条件清单。

## ② 母本符合度（票面五层规约 vs diff 逐节——本席独立重核，非沿用门一）

- **行为层**：scroll-converge.ts:41-50 数学与票面公式逐字对齐（start=
  scrollTop+(elRect.top−scRect.top)；center=+(h/2)−(clientH/2)）；显式夹取
  =自裁 #2（jsdom 可锚+浏览器幂等，申报 ✓）。六行迁移表修复后列全部落地：
  差值法单容器（两处替换）/main 与更外层不动（最近祖先命中 mainContent 即返
  ——祖先链本席静态复走：页盒→PageColumn root（:217-221 mx-auto flex 无
  overflow）→PdfDocProvider（:97 `return props.children(doc)` 直 render 无
  包裹 div）→selectionMount（ReaderPage:211 relative）→mainContent（:205
  overflow-auto）=首个滚动祖先，P2 语义等价前提独立成立）/aside 兜底与无祖先
  不滚（单测 :1015-1022/:1065-1079 双 it 锚）/ReaderPage 根 overflow-hidden
  两分支（:175/:227）。跨格序列：差值法不经 INV-32 接管链、setPage 'to'
  信号链零改（diff 未触 scroll-progress/reader.store）。
- **接口层**：`ScrollAlign`/`scrollIntoNearestScroller(el, align)` 签名与票面
  一致；`nearestScrollAncestor` 导出=票面 :97 预许可项+报告申报 ✓。
  PageColumn props 块零改 ✓；LocateAnchor/LocateTarget/locateAnchor 零触碰
  ✓（diff 仅动 flashTarget 查询泛型+flashElement Element→HTMLElement+
  滚动行——均在票面 :100-102 预裁内）；ReaderPage 仅两处根 className ✓；
  ReaderToolbar 仅根 className 加 shrink-0（:66，flex-wrap 保留）✓。
- **架构层**：scroll-converge.ts 零 import 纯 DOM 件 ✓；INV-34 登记
  invariants.md:48（表尾 33→34 无撞号，四列与 INV-29~33 同构）✓；INV-29
  锚定方式列同步新口径（:43，接缝归责）✓；INV-31/32/33 行未动 ✓；三文件
  头注按 F 系列惯例增补 ✓。
- **生命周期层**：负面清单三项全守住——App.tsx:109 `overflow-auto` 原样 ✓；
  PaperList:56/FragmentNotesList:41/AiNoteGroupList:38 三处 block:'nearest'
  原样（src 运行时 scrollIntoView 残留恰=此豁免面三处，reader 滚动链零残留）✓；
  aside 滚动条未动 ✓。
- **文化层**：scroll-converge.test.ts always-active（裸 describe 不经
  guardedDescribe，K3 结构性在位）六用例 ✓；受锁 4 文件改写=票面 P6 清单
  逐一吻合（模块 mock 消费形断言）✓；e2e test 要素齐（6 页 PDF/480×500
  窄视口/getByLabel('跳转到页') 跳第 4 页/PageDown/两轮断言）；断言锚经
  自裁 #1 符合化——本席独立复核：CSSOM overflow:hidden 不阻程序滚动为标准
  语义，探针数据（winY 70→130/main 恒 0/barTop −129.6）与静态布局推演自洽，
  **改锚=票面取证细节符合化非裁决推翻，门一核准本席维持**。
- **P1①②③/P2/P3/P4/P5/P6/P7 逐项落**；超票面决定全部在自裁 #1~#8 内，
  无未申报行为性决定。

**② 结论：符合（零偏离）。**

## ③ 宪法红线终审

- **分层单向** ✓：纯 renderer DOM 面，零跨层；scroll-converge 零依赖。
- **安全禁令** ✓：无 eval/newFunction/unsafe-eval/出网/SQL 面；renderer 无
  Node/Electron API、无绝对路径引入。
- **max-lines**：ESLint 500（skipBlankLines/skipComments，eslint.config.js:29-32）
  + tests 豁免（:186-191）✓；quality 组件 .tsx ≤250 **物理行**
  （check-quality.mjs:103）——实算：**PageColumn 245 / ReaderPage 249（贴线
  1 行余量未破）/ ReaderToolbar 171 全过**；anchor-locate.ts 293（.ts 非组件，
  ESLint 500 内合法）；scroll-converge.ts 51 ✓。
- **UTF-8** ✓：全部改动文件中文静态可读，无 mojibake。
- **受锁流程（manifest 142→143 一致性静态核对）**：manifest files.length=143
  ✓；含 tests/unit/renderer/scroll-converge.test.ts ✓；sha 口径=check-locks.mjs:60
  原字节 sha256——本席对工作树两文件独立验算：scroll-converge.test.ts=
  1b1d0beb…004c **MATCH**、reader-scroll.spec.ts=b8e52a82…22cc **MATCH**（等价
  预演 check-locks 对账通过）；即时 apply 申报、generatedAt 2026-08-28T10:46Z
  单调更新，无跨提交延迟迹象。
- **TDD 证据链四档** ✓：首红留存（e2e docTop 断言 :321 红+单测 import 不可解析
  红——新模块首红合法形态）/绿（94 文件 729 用例+e2e 2 passed）/变异恰中
  （M1 top→bottom 期望 480 变异 490 红、M2 去 −clientH/2 center 640→840+
  aside 320→470 两 it 红、M3 取最外 4 failed 恰中性——「无祖先」与 aside 两
  it 不红本席独立复演吻合、M4 删 overflow-hidden→rootOverflow 红——全覆盖
  票面 ≥3 变异面）/还原（cp 备份法留痕声明+**终态硬锚**：工作树 sha 与
  manifest 双 MATCH、scroll-converge.ts/ReaderPage.tsx diff 全文干净——变异
  残留在终态被物理排除）。
- **新测试 always-active** ✓。
- **测试锁定合约** ✓：受锁改动面=4 测试文件+manifest，与票面 P6 申报逐一
  吻合，无未申报受锁文件。

**③ 结论：红线全过。**

## ④ 机器面核对（报告数字 vs 仓库实况——静态可数性）

| 报告数字 | 本席静态实算 | 结论 |
| --- | --- | --- |
| 单测 94 文件 | tests/ 下 *.test.{ts,tsx} 逐文件可数=94（unit 88+contracts 3+security 3；基线 93+1） | **闭合** |
| 729 用例（723+6） | 宽松口径 `\b(it\|test)\(` 全 tests 计数=**729 精确一致**；scroll-converge.test 恰 6 it；it.each=0 无展开歧义 | **闭合** |
| locks 143 | manifest files.length=143；新测试入锁；双 sha MATCH | **闭合** |
| e2e 22+1 skip（守卫态） | 全套件 test( 总数=23（smoke 4+corpus 1+zcode 1+ai-notes 2+lineage 4+reader-text 9+reader-scroll 2）；DEPS=['SR2-F-01'~'04'] 不动（:48）；F-05 独立自守卫 test.skip(!isTicketDone('SR2-F-05'))（:283）；registry 现状 SR2-F-05 未建=未 done→skip 成立；其余 22 无 skip 守卫且全 done（基线 22 passed+0 skip） | **闭合** |
| 翻 done 后 23+0 推演 | 独立验算：建单 status:'done'→isTicketDone true→F-05 test 激活→23 passed+0 skip，无其他 skip 源 | **成立** |
| registry 未建单现状 | registry 110 工单**全 done**、SR2-F-05 不存在 ✓；F-01~04 done（DEPS 前提成立） | **闭合** |
| 收口建单 file=scroll-converge.ts 衔接 | 该文件 :1 `// b3: P7-F` 头在位（check-tickets 规则 6 过关前提）；**建单时序静态推演**：check-tickets.mjs:77-91 tests/ 分支只查占位桩后 continue——spec/test 头注 SR2-F-05 全称建单前后均不触发；src 全域 SR2-F-05 全称=0（简写规避实测确认）→建单前后 tickets:check 均可绿；门一「全称回写反而触发 :100-101 红、简写恒安全」推演本席复核成立 | **衔接闭合** |
| F-06 衔接 | sr2-f-06-brief.md:7「依赖 SR2-F-05 收口后开工（PageColumn.tsx 排他）」+:43-44 基数推演以本票 23+0 为前提 | **一致** |

**④ 结论：机器面全闭合。**

## ⑤ 成本账本行（档内复核引用）

- 实现者子代理：10,381,735 tok / 120 工具调用 / 25.4 min（主控从派发回执汇出）。
- 门一子代理：1,299,861 tok / 28 工具调用 / 6.8 min（主控从派发回执汇出）。
- 复核：与派发指令所给数值逐字一致；实现报告 §9「token/时长由主控侧台账记录
  （会话无法自计）」与主控汇出无矛盾。引用无误。

## 新破坏扫描（相对门一的新发现）

- **W3（新，卫生级）**：实现报告 §1 申报 scroll-converge.ts「**63 行**」，
  终态实测 **51 行**（diff hunk `@@ -0,0 +1,51 @@`、wc -l=51；门一 §二 亦实测
  51 却未对照报告数字记 W——门一 D 项漏抓）。与 W2（341 vs 344）同属报告
  精确性瑕疵簇；无任何关卡影响（≤500 远未触）、无实物歪曲（代码本身干净）。
  处置建议：随 W1/W2 一并记战役报告，不回炉。
- 其余无新破坏：工作树=diff 包 14 文件一一对应（git status/diff --stat 逐项
  吻合）；未跟踪面（sr2-f-06-brief.md 等 5 个 brief+gate1 产物）均为主控
  并行派发与门一产出，**非实现者残留**、不入本票提交范围；改动文件
  TODO/FIXME/placeholder 零命中；无 mojibake；无 src 工单号全称违规引用。

## 收口放行条件清单（主控收口须完成项）

1. **registry 建单** SR2-F-05（110→111）：`status: 'done'`，`file:
   'src/renderer/features/reader/scroll-converge.ts'`（:1 b3 头在位）；建单
   时序=先建单再跑 verify（已静态推演建单前后 tickets:check 均绿、规则 6
   过关）。
2. **locks:check 亲验**：manifest 143 对账（本席已双 sha 静态预演通过，主控
   跑 `npm run locks:check` 确认 exit=0 即可）。
3. **verify 亲验真退出码=0**（quality+tickets+locks+lint+typecheck+test
   94/729+build 全链，echo exit=$? 落盘）。
4. **e2e 全量**：翻 done 后 23 passed + 0 skip（推演已独立验算，亲跑确认）。
5. **提交范围**：显式列 14 文件（scroll-converge.ts/scroll-converge.test.ts/
   brief/report 已 staged，其余 10 个 M 文件需补 stage）+ 审计档系列
   （brief/report/gate1.audit/gate1.diff/gate2.audit 由主控裁量并入）；commit
   带 `[locked-change]` 尾注（受锁 4 测试文件+manifest 变更）；不混入
   sr2-f-06 等并行票面文件；提交即时无跨提交延迟（locks 已同步）。
6. **战役报告**记：W1/W2/W3 三条卫生级+成本账本三行（实现者/门一/门二）+
   lint 防线遗留池登记（no-restricted-properties 禁 scrollIntoView——门一
   附议+实现者疑虑 #1）；toBeVisible 存量盲区观察项随记（疑虑 #2）。
7. **头注保持简写形态**（[F-05 增补]/[F-05]）：不回写全称——回写将触发
   check-tickets :100-101 红（登记 file≠引用文件），简写=恒安全解。

## 统计

- **B=0 / W=3（W1/W2 沿门一+主控裁决、W3 本席新记）/ 新破坏 0（阻断级）**
- **总评：PASS——放行收口**，按上述七条放行条件执行。
