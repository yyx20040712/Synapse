# SR2-F-04 门二终审（2026-08-28）+ P7-F 战役收官判定

> 审计人=门二终审子代理（独立只读；唯一可写=本档）。铁律遵守：未跑任何
> npm/test——机器面全部以只读推演+既有 log 证据核验；主控收口将亲验。
> 开工技能清点：verification-before-completion=用（只读推演逐项留证据锚）；
> systematic-debugging/TDD/code-review-excellence=不用（无调试/禁跑测试/
> 工单四清单已给完整审计框架）。输入=票面头注/impl.report/门一审+diff/
> 五份 log/campaign 骨架/registry/ROADMAP/简报。

## ① 处置核对（门一 5N 抽核两条 + 主控处置）

- **N1 抽核（canvas ≤5 偏宽）成立**：独立复算——6 页滚底可见 ⊆{5,6}，
  渲染窗 ±1 → {4,5,6}；若回收窗 ±2 退化到 ±3，稳态 ≈{2..6}=5 仍 ≤5 不红
  （门一算术复现）；「恒 6 不回收」主回归必红（>5）。阈值拦主面、漏退化面，
  定性 N 正确。主控处置=记入战役报告注记（**填账时补——见 ⑤缺口清单**）。
- **N4 抽核（onVisibleChange 生产零消费）成立**：grep src/ 全量——仅
  PageColumn.tsx 自身（prop 声明 :76 + onVisibleRef :84/:87），ReaderPage
  接线已删，无其他生产消费者；锁定测试 page-column.test 仍锚定 → 非孤儿、
  不违死代码红线，后续票可裁。定性正确。
- **N2/N3/N5 知悉**（门一原文复核：N2 口径已在 INV-33 声明+实现者疑虑 1
  申报；N3 <12px 级近似设计内；N5 程序性 scroll 事件径注记——均不拦收口）。
- 主控处置台账与 campaign 骨架现状一致（§6 留位在，未填=主控待办）。

## ② 母本符合度（票面五层抽验：缩放锚/fit/收官七段/INV-01 终审）

- **缩放中心锚**：anchoredScrollTop 数学手算复核（(500+200)/2000=0.35→
  0.35×4000−200=1200；组件例 3×1584+2×12=4776→0.25×4776=1194，jsdom
  clientHeight=0 退化线性恰可精确断言）✓；段⑥ useLayoutEffect 程序修正+
  镜像监听（passive+挂载即读初值+cleanup 成对）✓；不经 wheel/keydown/
  pointerdown 接管链（INV-32 不受扰）✓。
- **fit-width**：分母=onReady 载荷 columnWidth(sizes,1)（混合页宽取最大
  612——锁定用例锚）单源；(clientWidth−24)/basis；一次性 zoom 语义保持
  （无持续 fit 模式）✓。ReaderToolbar 零 props 改=git status 佐证（不在
  改动面）✓；reader.store ZOOM_STEP 沿用（不在 diff）✓。
- **收官七段**：spec 一~七逐段在位（INV-01 三层/键位 PageDown 0.9 屏+
  防抖页码不翻/缩放锚+ctrl+wheel 段迁移 100%→110%/fit ±2px/标注原位
  （色块落所属页盒四边 ±2）/离屏回收 ≤5/进度恢复关 tab flush 重开滚回）；
  **真实文本断言在位**（P1/P3/P6 KNOWN、「当前第 N 页」、zoom-label）——
  非纯几何冒充 ✓。
- **INV-01 终审**：三层计算样式 hidden 断言（:177-179）；invariants.md
  diff 仅增 INV-33 行，INV-01 声明零触碰 ✓。
- **票面偏差豁免核**：纯函数测试宿主由「PageColumn 同宿主」改 geometry
  直引——简报 W3 拆分预案明文授权（「page-column.test 同步 import 调整
  ——受锁扩」）；ReaderPage.tsx 修改=简报 §②.3 明文（fitWidth :129-135
  分母改列宽基准）——自裁 1 的豁免依据属实，非扩票。

## ③ 宪法红线终审

- **受锁 manifest 142**：条目计数 grep=142 ✓；三个受锁文件当前 sha256 实算
  =manifest（reader-scroll 0af8fedb…/reader-text 1016906…/page-column.test
  f9d6a5d1…）✓——文件与 manifest 同步（locks 已 apply 只读态）。新文件
  page-column-geometry.ts 在 src/renderer 非受锁路径，无需入锁 ✓。
- **page-column.test 扩同步**：sha 已随 +4 用例重算（上列哈希一致）✓；
  测试改动均在票面/简报授权面（import 迁移+4 新 it），无断言放宽。
- **行数**：PageColumn 237 / ReaderPage 249（组件 ≤250 ✓）/geometry 100 /
  spec 272；page-column.test 518——eslint max-lines=500 含
  skipBlankLines+skipComments 且 tests/** 显式 'off'（eslint.config.js:187-
  189 实读），verify lint 绿佐证 ✓。
- **INV-33**：登记单处（grep=1）、无 INV-34 撞号、编号 32→33 延续 ✓；
  声明（比值保持+间隙口径+程序修正不经接管链+fit 分母单源）与实现一致。
- **TDD 链**：首红（f04-red-unit.log：模块解析失败 1 文件红——新建模块的
  collection 级红，证测试先于模块存在）→绿 20/20（16+4）→M1（纯函数 it+
  组件 it 双红）/M2（组件装配 it）/M3（列宽基准 it）it 名全录+还原 diff 空；
  e2e M3'（:209 中心页保持恰中）/M4（:221 列宽 ±2 恰中）+spec sha=
  0af8fedb…（与 manifest 同值——双佐证）✓。M4 撞锁 PermissionError
  如实申报并解锁重做全程 ✓。

## ④ 机器面（723=719+4；翻 done 推演）

- **723=719+4 精确**：f04-impl-verify.log=Test Files 93 passed / Tests 723
  passed（基线 93 文件 719+page-column 净增 4 it；无新测试文件故文件数
  不变）；log 尾 build 链走完=verify 全链执行完毕（exit 0 由 impl.report
  声明+主控将亲验）。工单统计行=「共 110 个；open 1」✓。
- **src 全号引用**：grep src/ ——SR2-F-04 全号**零残留**（仅 F-04 短式：
  PdfPageCanvas/ReaderPage/PageColumn/geometry 四文件头注）✓；
  SR2-F-01/02/03 全号各仅在本单注册文件（PageColumn/anchor-locate/
  scroll-progress——check-tickets 规则 2 自引用豁免）✓。spec 内全号=
  DEPS 数组+头注=注册文件合法（tests/ 只查占位桩调用，无）✓。
- **check-tickets 六规则翻 done 推演**：规则 1 文件存在 ✓/规则 2 上 ✓/
  规则 3 spec 无 NotImplementedError ✓/规则 4 N/A（.ts 非 .tsx）/规则 4b
  无 data-ticket 与 *_STUB 工单号初值 ✓/规则 5 无 guardedDescribe ✓/
  规则 6 头区 "// b3: P7-F"（:1）+ROADMAP 已裁决集含 "### P7-F：" ✓——
  六规则全绿。
- **locks 142 数理**：138→139（工单化 reader-scroll 入锁）→140（F-01
  page-column.test）→141（F-02 selection-layer）→142（F-03 scroll-
  progress）→F-04 =142 不变（三 sha 重算零新增路径）✓。
- **e2e 终态 22+0 推演**：registry 翻 done → isTicketDone('SR2-F-04')=
  true → DEPS pending=[] → test.skip(false) → 22 测全跑。双侧独立证据：
  final log（守卫原样）=21 passed+1 skipped（唯一 skip=收官链 :104）；
  active log（spec 备份法临解守卫）=22 passed（1.1m）exit 0——推演已实证
  兑现 ✓。质量禁词 grep 改动面零命中 ✓；工作树 7 改+5 新=impl.report 清单
  逐一对齐，dev-launch.cmd/dist_new 前置残留未触碰 ✓。

## ⑤ 战役收官判定（本单特有）

- **四票提交链完整**：62d84bb（工单化）→f20c2fd（F-01）→31b3a07（F-02）
  →aba9da0（F-03）→F-04（工作树待主控收口提交）——git log 逐一核实；
  每票一提交+registry 随收口翻状态（F-01/02/03 done 在册、F-04 open 待翻）
  ✓；依赖链 F-01→02→03→04 无回溯改约、F-aware 冻结面两票零触碰（anchor-
  locate/ReaderToolbar 不在任一 diff）✓。
- **ROADMAP P7-F 验收四项终对照**（ROADMAP.md:203）：
  1. 离屏回收断言 → page-column.test 渲染集上界+快速滚动回收（锁定）+
     e2e 收官链 canvas ≤5 ✓
  2. 进度回写/恢复 e2e → F-03 批 3（reader-text :349）+收官链第七段双锚 ✓
  3. 既有标注重开原位全量兼容 → reader-text :163/:455/:487 全程绿+收官链
     第五段抽验 ✓
  4. 键位语义迁移纳入 keymap 锁定用例 → reader-shortcuts.test.tsx
     （PAGE_KEYS/SCROLL_STEP_RATIO 实存核实）+e2e PageDown 0.9 屏 ✓
  四项全锚定；用户走查（战役最终验收人）已在 §2 留位——归用户，不拦机器收官。
- **收官报告骨架完整性——主控要补的缺口清单**：
  1. §1 F-04 行提交哈希（现为「（本提交——主控收口）」，提交后回填）；
  2. §3 F-04 双门战绩行（门一 0B/0W/5N PASS+门二本档结论+回炉 0）；
  3. §5 工单化成本行+F-04 成本行（实现者/门一/门二 token+时长——账本数据
     归主控，brief §③.6 分工）+战役累计（55.2M+F-04 小计）；
  4. §6 门一审注记：N1（canvas 阈值收紧建议 ≤4）/N4（onVisibleChange
     后续票裁剪）——即主控台账「填账时补」两笔；
  5. （可后补）§7 随手验清单主控亲验数字回填。头部终态基线段已完整且与
  证据一致（93/723、22+0、locks 142、open 0 推演）。
- **成本账本汇总核对**：F-01 22.66M/94min（21.27+0.74+0.65）✓、F-02
  12.84M/46.6min（11.48+0.63+0.73）✓、F-03 14.81M/78min（13.20+0.81+
  0.80）✓——三行与各票提交信息账本逐字一致；累计链 27.5→40.4（+12.84）→
  55.2（+14.81）算术闭合 ✓（≈ 口径，工单化 ≈4.8M 含主控直做已隐入 27.5）。
  F-04 行空缺=主控待填，非错账。

## 门二新 Findings（0 B / 0 W / 2 N）

- N-A（报告记账小误，不拦）：impl.report 行数口径整体 +1（reader-text
  620→613 记为，git 实测 619→612；净 −7 与 diff 一致）；「首红=F-03 同型
  collection 级」表述不确——F-03 首红 26 为断言级（其提交记录），F-04 本身
  collection 级红对新建模块成立、且 M1-M4 补足断言级红——证据有效，措辞误记。
- N-B（注记陈旧，无 CI 面）：anchor-locate.ts:5 / scroll-progress.ts:3 头注
  仍书「工单：open」（两单已 done）；F-04 顺手把 PageColumn.tsx 刷成 done——
  同类注记三文件两陈旧一新鲜。check-tickets 不查注记状态（verify 绿证），
  建议后续票统一刷新（防人工读态误导）。

## 总评

**PASS——SR2-F-04 实现单元终审通过，P7-F 战役收官判定成立**。

- 单元：母本符合（含两处简报授权偏差核）、宪法红线全守（locks 同步/行数/
  INV-33/TDD 链含 it 名）、机器面精确（723=719+4、六规则推演绿、e2e 22+0
  双侧实证、locks 142 数理闭合、src 全号零残留）。
- 战役：四票提交链完整、验收四项全锚定、成本账本三票闭合（F-04 行+骨架
  四缺口=主控收口动作清单，含台账 N1/N4 注记）；收官判定唯余主控亲验
  verify/e2e 真退出码+翻 registry+提交+回填报告。
- 门二 2N 均为记账/注记级，不回炉、不拦收口。
