# SR2-F-05 门一对抗深审档（程序滚动单容器收敛——缺陷 A：TabBar 被顶出视口）

> 审计人：三屋模式门一对抗深审孙代理（2026-08-28）。只读审计；唯一可写=本档。
> 禁跑 npm/test/构建——全部结论基于 diff 包+仓库现势静态推演。
> 输入：scripts/audits/sr2-f-05-gate1.diff（1080 行 14 文件）/ sr2-f-05-brief.md /
> sr2-f-05-impl.report.md（证据日志内嵌于报告 §4~§7，无外部日志路径引用）。
>
> **开工技能清点**：用 code-review-excellence（对抗审查主工具）、
> javascript-testing-patterns + e2e-testing-patterns（断言自洽/假阳性评估）、
> verification-before-completion（收口静态自查；禁跑 verify 故仅静态面）。
> 不用 systematic-debugging（禁跑运行时，根因推演替代）/test-driven-development
> （本席不写实现，只审 TDD 证据）/subagent-driven-development（无派发权）。
> 配置自查：只读席位，diff 包预生成，git 零操作。

---

## 〇、最高优先级：实现者自判独立复核（自裁申报 #1）

实现者判定：票面预写断言锚「main.scrollTop===0+tablist visible」经 e2e 探针实证为
假阳性（main 恒 0 无溢出），真泄漏面=document scrollingElement（winY 70→130），
改锚=scrollingElement+main 双零+barTop≥0+rootOverflow hidden 四断言；自判
「取证细节符合化而非裁决推翻」。逐问独立复核：

**A. 泄漏面判定——成立。** 静态推演链闭合：
- `src/renderer/shared/theme.css:22-31`——html/body/#root `overflow: hidden` 在位
  （注释明示「文档永不滚」桌面不变量）。CSSOM 事实：overflow:hidden 只裁剪+禁用户
  滚动，**不阻止程序滚动**（scrollTop 赋值与 scrollIntoView 均可滚 hidden 容器与
  viewport）——探针「html overflow:hidden 仍被程序滚 winY 70→130」与标准语义自洽。
- `src/renderer/app/App.tsx:109` main overflow-auto 在位，但 e2e 窄视口（480x500）
  下 ReaderPage `h-full` 使 main 内容高度=main 视口高 → main scrollHeight=
  clientHeight=500（探针实测）→ main.scrollTop 恒 0 ——票面预写锚恒真、不红，
  假阳性定性正确。
- 修法对症性：nearestScrollAncestor（scroll-converge.ts:23-31）命中阅读器滚动容器
  （ReaderPage.tsx:204 mainContent overflow-auto）即返回——viewport 与 main 均不在
  命中面，两泄漏路径同封；防御纵深（root overflow-hidden 两分支 :175/:227）另立。

**B. 改后断言锚是否完整锁住票面 §2A 验收判据（「任何滚页/跳转/缩放操作后
TabBar 恒可见」）——成立且严格强于票面预写。** 四断言+toBeVisible 为票面两断言的
超集：docTop===0 直锁真泄漏面（reader-scroll.spec.ts:324）；mainTop===0 保留票面
字面（:325）；barTop≥0 直锁「TabBar 恒可见」的几何面（:326，探针预修复态 barTop
-129.6 必红）；rootOverflow==='hidden' 锁防御纵深（:327）。假阳性残余评估见 C-4
（N3：barBottom 底部盲区不可达、flash 链 e2e 缺位有单测消费形拦截兜底）。

**C. 是否动摇票面根因叙述——不动摇。** 机制级根因（scrollIntoView 滚所有可滚祖先
+存在可滚溢出面）不变；泄漏面从「main 溢出」细化为「viewport 为主（真机 main 路径
不可证伪但同封）」。票面 §0 叙述属主控文档不必回改；INV-34 登记文本已按实录措辞
（invariants.md:48 含「实测泄漏面含 overflow:hidden 的 document viewport 与 main」）。
**裁定：N——符合化判定核准，非裁决推翻。** P4 字面微调已在自裁 #1 内申报。

---

## 一、工单 A：母本符合度（diff vs 票面五层规约+主控预裁 P1~P7）

| 项 | 裁决 | 证据 |
| --- | --- | --- |
| P1① ReaderPage 两分支 overflow-hidden | 落 | ReaderPage.tsx:175（空态）/ :227（主分支）均在位；e2e :327+M4 变异红证闭环 |
| P1② scroll-converge.ts 新建+两处替换 | 落 | scroll-converge.ts:41-51；PageColumn.tsx:175（'start'）；anchor-locate.ts:242（'center'） |
| P1③ ReaderToolbar 根 shrink-0 | 落 | ReaderToolbar.tsx:66（flex-wrap 保留 ✓） |
| P2 最近滚动祖先法（非 ref 直滚） | 落 | 祖先链静态核实：页盒→PageColumn root（mx-auto flex，无 overflow，PageColumn.tsx:217-221）→PdfDocProvider 无包裹 div（PdfDocProvider.tsx:97 直 render children）→selectionMount 盒（relative，ReaderPage.tsx:211）→mainContent（overflow-auto，:204）=首个滚动祖先，语义等价前提成立 |
| P3 flash 语义（aside 兜底/无祖先不滚） | 落 | scroll-converge.test.ts:1065-1079 aside 消费形 it；:1015-1022 无祖先不动 it |
| P4 INV-34 登记 | 落 | invariants.md:48 表尾续号 33→34 无撞号；四列格式与 INV-29~33 同构；文本含防御纵深与豁免面声明 |
| P5 e2e 独立 test+自守卫+DEPS 不动 | 落 | reader-scroll.spec.ts:283 test.skip(!isTicketDone('SR2-F-05'))；:48-49 DEPS 原样 |
| P6 三单测模块 mock 改写+e2e | 落 | anchor-locate.test 六断言（S1/S3/S5/S10/S12a/S12b）+ai-annotation-layer 两断言+page-column 两 it，全改 scrollerMock 调用形 |
| P7 locks 流程 | 落 | manifest 143（node 静态核 files.length=143，含 scroll-converge.test.ts ✓）；申报即时 apply 无跨提交延迟 |
| 接口层「签名零触碰」 | 落 | PageColumn props 块（:64-82）零改；LocateAnchor/LocateTarget/locateAnchor（anchor-locate.ts:94-109/:247）与 F-02 冻结面一致；flashElement Element→HTMLElement 为票面接口层预裁项（票面 :100-102 明示），已申报 |
| 行为层数学 | 落 | scroll-converge.ts:46-50 与票面公式逐字对齐；「浏览器自动夹取」→显式夹取=自裁 #2（jsdom 可锚，申报 ✓，浏览器内幂等成立） |
| 生命周期层不做清单 | 落 | App.tsx:109 overflow-auto 原样；PaperList.tsx:56/FragmentNotesList.tsx:41/AiNoteGroupList.tsx:38 三处 block:'nearest' 原样（票面豁免面）；aside 未动 |
| 文化层 TDD 顺序 | 落 | e2e 首红（spec 备份法）→单测首红（import 不可解析红——新模块首红合法形态）→实现→729/729→M1~M4 变异→全量 verify exit=0 |

**A 项裁决：N（无偏离项；全部符合）。**

## 二、工单 B：宪法红线

- 分层单向：scroll-converge.ts 零 import（纯 DOM 工具）✓；renderer 未引入
  Node/Electron API ✓。
- 安全禁令：无 eval/newFunction/出网/SQL 面 ✓（纯 renderer DOM 改动）。
- 行数：ESLint max-lines 500 skipBlankLines/skipComments（eslint.config.js:29-32），
  且 tests/** 豁免（:185-190 override）——page-column.test 527 物理行合法；src 侧
  PageColumn 245/ReaderPage 249（组件 ≤250 贴线未破，与申报「终态 249 行」吻合）/
  anchor-locate 293/scroll-converge 51 ✓。
- UTF-8：全部改动文件中文静态可读，无 mojibake ✓。
- 新测试 always-active：scroll-converge.test 裸 describe，不经 guardedDescribe ✓
  （K3 威胁结构性在位）。
- TODO/FIXME/placeholder：改动面 grep 零命中 ✓。
- 测试锁定合约（多改一处未申报=B）：受锁改动面=reader-scroll.spec/
  ai-annotation-layer.test/anchor-locate.test/page-column.test 四文件+manifest——
  与票面 P6 申报清单**逐一吻合，无未申报受锁文件** ✓。

**B 项裁决：N。** 附 W1（见四、W1：anchor-locate.test 文件内部冗余行，非额外受锁
文件）。

## 三、工单 C：代码与测试质量

- **scroll-converge 数学正确性**：start=scrollTop+(elRect.top−scRect.top)——滚动
  赋值后 scRect（border box）不动、elRect 随内容位移，对齐目标推导正确；center
  同构；显式夹取 Math.min(Math.max(raw,0),Math.max(0,sh−ch)) 对 sh<ch 退化安全
  （上界 0）。最近祖先遍历自 parentElement 起（自身可滚不算——测试 :1007-1009 锚）；
  'overlay' 现代归一为 auto、'clip' 不可滚正确不入选。
- **zIndex/position 对 getBoundingClientRect 推演**（指令指定）：无 transform 环境
  下差值法成立——当前 zoom=页盒尺寸重算（PageColumn.tsx:230）非 CSS transform，
  无缩放偏差；scrollIntoView 对齐参照=scrollport（padding box 顶）而差值法=
  border box 顶，border≠0 时有 borderWidth 级偏差——mainContent 无 border，
  等价成立（N4 记边界）。fixed 定位目标无滚动祖先语义——locate 目标皆常规流
  元素，不触发。
- **PageColumn 段⑤挂起-补滚语义保持**：两 it 改写后断言形保持——早于就绪到达→
  scrollerMock not called（page-column.test :326）→就绪后补滚 called with
  (box6,'start')（:333）；显式 null 守卫两行（PageColumn.tsx:174-175）与原可选链
  语义同构（自裁 #7 ✓）。
- **flashElement 收窄 Element→HTMLElement 安全性**：两调用入口
  flashTarget（anchor-locate.ts:234）/flashAiNote（:224）均 querySelector
  <HTMLElement> 泛型，收窄后无 Element 来源残存 ✓。
- **e2e 断言自洽（假阳性残余）**：四断言+tablist toBeVisible；toBeVisible 对出
  视口 bbox 仍算 visible 的语义边界已由 barTop bbox 断言补强（探针 barTop -129.6
  必红）；tablist 缺失时 barTop=-9999 哨兵红；scrollingElement 缺失时 docTop=-1
  红（保守）。首红证据（docTop 断言红 1 failed/1 passed，F-04 收官 test 不受扰）
  与泄漏面自洽。残余盲区见 N3。
- **变异红证恰中性核对**（日志 it 名+数学复算）：M1（top→bottom）start it 期望
  480、变异 490→红 ✓ it 名与 scroll-converge.test 实名一致；M2（去 −clientH/2）
  center it 640→840 红+aside it 320→470 红=两 it ✓；M3（取最外不提前返回）——
  复演：祖先选取 it 红+start/center/夹取三 it 因 inner 不动红=4 failed，「无祖先」
  it（裸 target 仍 null）与 aside it（单滚动容器无差）不红——**与报告「4 failed」
  精确吻合，恰中性成立**；M4 build+守卫禁用跑 e2e rootOverflow 红 ✓。票面要求
  ≥3 变异（start/center/最近祖先/overflow-hidden）全覆盖 ✓。显式夹取分支无专项
  变异（票面未要求；「顶底夹取」it 直断言夹取值，测试在位）。
- **回归面（polyfill 删除影响）**：page-column.test/anchor-locate.test 删除
  Element.prototype.scrollIntoView 桩后，两文件其余 it 无 scrollIntoView 依赖
  （src 运行时残留仅豁免面三处、各自测试文件自挂桩）；实现者 729/729 全绿佐证。
  指令所称「既有 12 it」未能对号（anchor-locate.test 13 it/ai-annotation-layer
  7 it/page-column.test 20 it/reader-text.spec 9 test 均非 12——N7 记）。

**C 项裁决：N。**

## 四、工单 D：报告诚实性

自裁八条逐条对 diff：#1 改锚（✓ 见〇）、#2 显式夹取（✓ :50）、#3 头注简写
（✓ 见五-E 推演）、#4 INV-29 同步（✓ invariants.md:43 锚定方式列新口径）、
#5 头注压缩（✓ ReaderPage 249 行，行为层/接口层间空注释线被 F-05 行取代——
结构微损已申报）、#6 探针取证（✓ diff 14 文件=申报 12+brief/report，无探针残留）、
#7 查询拆行（✓ :174-175）、#8 getByLabel（✓ ReaderToolbar.tsx:83 aria-label
「跳转到页」既有）。「250 行中途红」「tsc 类型缺陷中途红」终态已解决：249 行 ✓、
reader-scroll.spec.ts:319 'missing' 哨兵 ✓。无漏报的**行为性**超票面决定。

**D 项裁决：W2**——报告 §1 申报 e2e spec「272→341 行」，实际 344 行（wc -l；diff
hunk +274,71 推算同）。数字口径不准（票面预计 ~330，ESLint tests 豁免无关卡影响），
属报告精确性瑕疵非实质歪曲。另 W1（anchor-locate.test 冗余未申报，见下）。

## 五、工单 E：接缝与后续单

- **INV-34 表行格式**：invariants.md:48 四列（声明/声明处/强制方式/锚定状态）与
  INV-29~33 同构 ✓；锚定方式含单测六用例+受锁三文件消费形+e2e 双链——与实际
  防线一一对应。
- **INV-29 头注接缝同步**：invariants.md:43 锚定方式列旧机制名
  「scrollIntoView block:'start'」→「scrollIntoNearestScroller(页盒,'start')」——
  接缝归责履行 ✓（改动模块 A 时同步了相邻册内声明）。
- **PageColumn/anchor-locate/ReaderPage 头注增补格式**：[F-05 增补] 与既有
  [F-04 增补]（PageColumn.tsx:4）同构 ✓；scroll-converge.ts 头注含缺陷叙述+
  INV-34 声明处+消费方+测试锚，F 系列惯例齐 ✓。
- **U2（SR2-F-06 页盒样式）影响扫描**：F-06 票面明示「依赖 SR2-F-05 收口后开工
  （同域 PageColumn.tsx 排他）」（sr2-f-06-brief.md:7）；F-06 改页盒 div
  background/boxShadow 与 F-05 段⑤滚动/头注无冲突面；F-06 P3 e2e 基数推演
  「SR2-F-05 的 test 先一步激活后基数=23」与本票收口时序衔接一致 ✓；PageColumn
  245 行余量对 F-06 两属性增补充足。
- **头注工单号简写衔接风险**（自裁 #3）：check-tickets.mjs:72 规则 2 正则
  /SR2?-[A-Z]+-\d+/——`[F-05 增补]` 不匹配：(a) 建单前不触发「引用了不存在的
  工单号」；(b) 翻 done 后也不触发「引用已完成工单的占位」（该规约只查全称）；
  (c) 反向风险：若收口后把 PageColumn/anchor-locate 头注回写全称 SR2-F-05，
  F-05 翻 done 时 PageColumn.tsx ≠登记文件即红——**简写形态是恒安全解，全称回写
  反而引入关卡风险，实现者「无需回改」判断正确**。收口建单注意：SR2-F-05 登记
  file 应=src/renderer/features/reader/scroll-converge.ts（其 :1 已有 `// b3: P7-F`
  裁决指针头，check-tickets 规则 6 过关前提在位）。
- **「既有 12 it」**：见 C 项——无文件恰为 12 it，回归面影响扫描以实质完成
  （polyfill 删除无残留依赖+全绿佐证）。

**E 项裁决：N。**

---

## 六、裁决清单

| # | 级 | 条目 | 证据 |
| --- | --- | --- | --- |
| 1 | N | 实现者自判（改锚=符合化非推翻）核准：泄漏面判定成立、改锚严格强于票面、根因叙述机制级不变 | theme.css:22-31；App.tsx:109；reader-scroll.spec.ts:309-329；探针 winY 70→130/barTop -129.6 |
| 2 | N | 母本符合度 P1~P7+五层规约全落，签名零触碰核实 | 见 §一 表 |
| 3 | N | 宪法红线全过（分层/locks 143/安全/行数/UTF-8/always-active/受锁面=票面申报清单） | eslint.config.js:29-32/:185-190；locks/manifest.json（files=143 含新测试） |
| 4 | N | 代码与测试质量：数学/边界/变异恰中性（M3 四 failed 复演精确吻合）/段⑤语义保持/收窄安全 | scroll-converge.ts:41-51；page-column.test:326/:333；§三 |
| 5 | N | 接缝：INV-34 格式/INV-29 同步/F-06 排他与基数衔接/头注简写恒安全（收口登记 scroll-converge.ts+b3: P7-F） | invariants.md:43/:48；sr2-f-06-brief.md:7/:43-44；check-tickets.mjs:72/:100-103 |
| 6 | N | html.scrollHeight 膨胀机制未定位（实现者疑虑 #1 诚实申报）——程序触发面已清零，建议后续 lint 防线（no-restricted-properties）留主控裁量 | src 运行时 scrollIntoView 残留=豁免面三处（PaperList.tsx:56 等） |
| 7 | N | e2e 残余盲区（不可达或已有兜底）：barBottom 底部盲区（需 viewport 负滚动，不可达）；flash 'center' 链 e2e 缺位（单测消费形断言可拦改回 scrollIntoView 的回归——scrollerMock 不被调即红）；「缩放后 TabBar 恒可见」未进 e2e（段⑥ :192-207 静态同构=单容器 scrollTop 赋值，不在泄漏面） | reader-scroll.spec.ts:322-329；anchor-locate.test/ai-annotation-layer.test scrollerMock 断言 |
| 8 | N | 差值法语义边界存档：对齐参照 border box 顶 vs scrollIntoView 的 padding box 顶（border≠0 时有偏差，mainContent 无 border 等价）；transform 容器下数学需重推导（当前 zoom=尺寸重算非 transform） | scroll-converge.ts:48；PageColumn.tsx:230 |
| 9 | N | 「既有 12 it」未对号（13/7/20/9 均非 12）——回归面影响以实质扫描完成：删 polyfill 无残留依赖 | §三 |
| 10 | N | P4 字面微调（main→双滚动面实录措辞）+ INV-34 文本同步=自裁 #1 已申报，非私改 | invariants.md:48；报告 §8.1 |
| 11 | W | **W1：anchor-locate.test.ts:19/:24 重复注册 toast-store vi.mock**——重构插入 scrollerMock 时新增一行 toast-store mock 而未删原行；vitest 同路径后注册覆盖（工厂相同）行为无差、verify 全绿佐证，但属冗余残留且未在自裁申报中列出 | anchor-locate.test.ts:19-24 |
| 12 | W | **W2：报告行数申报不实（小口径）**——§1 申报 e2e spec「272→341 行」，wc -l 实测 344（diff hunk +274,71 推算同值）；无任何关卡影响（tests 豁免 max-lines），属报告精确性瑕疵 | reader-scroll.spec.ts（344 行）；报告 §1 |

## 七、统计与总评

- **统计：B=0 / W=2 / N=10。**
- **总评：可进门二。** 无阻断项：根因修法对症（viewport/main 双泄漏面同封）、
  断言锚经独立复核完整锁定 §2A 验收判据且强于票面预写、受锁改动面与票面申报
  清单逐一吻合、变异红证 M1~M4 经数学复演恰中性、接缝（INV-29 同步/F-06 排他/
  头注简写）全部衔接。两条 W 均为报告/测试文件内部卫生级（冗余 mock 行+行数申报
  口径），不构成行为或合规风险，建议门二或收口时顺手处置 W1（删
  anchor-locate.test.ts:24 重复行需 [locked-change]+locks 流程——若不动则留档
  亦可）。
- 留主控裁量项：(a) 收口建单 SR2-F-05 登记 file=src/renderer/features/reader/
  scroll-converge.ts；(b) lint 级 scrollIntoView 防线（no-restricted-properties）
  是否立项（实现者疑虑 #1 建议，本席附议——存量三处 block:'nearest' 豁免面可经
  options 过滤）；(c) W1 处置时机。
