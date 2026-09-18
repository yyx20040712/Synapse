# F-GEOM-01-G10 门一隔离审包（对抗式代码审查——M6b view 工具簇迁移·view 域收官步）

> 审查对象=零行为纯迁移声明。你的职责=对抗式证伪：逐 hunk 断言「无行为变更」，
> 独立复算一切计数，拷问一切假设。**只依据本包两件材料**（本简报+
> g10-gate1-diff.patch，同目录），不得采信简报转述而未经你对 patch 亲验的结论。

## ① 工单口径

F-GEOM-01-G10（tickets/registry.ts:301）：目录化 M6b——13 文件 git mv 迁
`src/renderer/features/reader/view/`：ReaderPage/ReaderToolbar/TabBar/
reader-shortcut-handlers/ReaderShortcuts/AnnotationEditor/AnnotationMenu/
useReaderSearch/ReaderSearchBox/reader-search/reader-search.store/
SearchHighlightLayer/PageColumnView（1776 行 wc 实测；13 件对设计书 §3.2
各 −1=无尾换行口径 Σ1789=1776+13，G11 对账债同 G5-G9 惯例）。设计书
§3.1 域序：view→{panels,interact,time,anchors,state} 单向合法；反向边禁。
**本票=view 域收官步：迁毕 reader 根=纯目录容器零文件**。票尾注=
[locked-change][test-refactor]。票面「eslint 四路径分步随迁收官步」系起草
预期——实测四路径已全迁完（:89/:92=M1、:90/:91=M6a），本票 eslint 面
零动作仅核验（主控预裁，侦察档 [4] 段在证）。

## ② 改写面申报（主控侦察定刀 g10-recon.log+实现者执行，行号双侧核对）

- **A 深度修正 33 行**（13 件内部相对 import）：`./anchors/`→`../anchors/` 5 行
  （AnnotationEditor:15/AnnotationMenu:41/ReaderPage:49/ReaderToolbar:42/
  reader-search.store:41）+`./interact/`→1（AnnotationEditor:16）+
  `./state/`→11（PageColumnView:24/ReaderPage:52,53/SearchHighlightLayer:40/
  TabBar:41,42,43/reader-shortcut-handlers:18,19/useReaderSearch:32,33）+
  `./time/`→2（ReaderPage:55,56）+`../../shared/`→`../../../shared/` 7 行
  （ReaderPage:48,59/ReaderShortcuts:46,47,48/reader-search.store:42/
  useReaderSearch:31）+**`./view/X`→`./X` 域内化 7 行**（PageColumnView:25,26,27/
  ReaderPage:50,54,58/reader-search:32）。域内同根零改写 11 行+`@shared/` 别名
  4 行位置无关零改写；33+11=44=13 件相对 import 全量（grep -c 逐件对账）。
- **B src 消费 1 行**：App.tsx:7（`'../features/reader/ReaderPage'`→
  `'.../view/ReaderPage'`）。
- **C view 域中间态边闭合 6 行**（G9 声明的 6 边本批兑现，`../X`→`./X`）：
  view/PageColumn.tsx:32+PagesOverlay.tsx:50+AnnotationPopups.tsx:35,36+
  ReaderPageView.tsx:37,40。
- **D tests 受锁面 21 行/14 物理件**（纯路径改写零用例增删）：import 18 行/13 件+
  **theme.test.ts 字符串面 3 行**（:292 AnnotationMenu/:293 AnnotationEditor/
  :485 TabBar——readFileSync 路径形态，板注预列与侦察双吻合）；vi.mock 路径形态
  零命中（tests 唯一 vi 命中=vi.mocked() 对象操作）；e2e specs 零命中零触碰。
- **E config 零动作**（如①勘正）；**F registry 随迁 8 行系主控收口职责、
  实现者零触碰**（tickets:check 红=恰 8 行=7 旧票 file+G10 自身，预期态）。
- **D' 跨特性=0**：13 件旧路径消费面全仓仅 App.tsx（src/renderer/app——
  app→features 向内合规非跨特性）。

## ③ 验证证据链摘要（实现者产出，主控已抽验物理在档）

- 基线锚 G10_BASELINE_VERIFY_EXIT=0（open 11/指纹门 187·1789·5411·skip15 零漂移/
  Test Files 170/build 绿）。
- 中探针 EXIT=2 恰 18 错全 tests 面（13 件 1:1），src 面 0 错。
- 八关卡：七绿+tickets 预期红；**Test Files 170/Tests 1744=基线恒等**。
- 变异红证 M1（App.tsx:7 回退→TS2307 EXIT=2→cp 还原 diff 空→复绿）+M2
  （tab-bar.test.tsx:14 回退→vite 模块解析红 EXIT=1→还原→复锁→12/12 复绿）
  ——全程 cp 备份法零 git checkout，restore EXIT 变量法物理落档。
- 构建产物哈希恒等：index-D3egZtl2.js 1,392.72kB+index-BfpEygSE.css 52.49kB+
  pdf.worker 三产物 PRE=POST 同名同尺寸同 sha256（G5-G10 恒等链第六票）。
- §3.1 单向核验（实现者 g10-oneway.mjs v2）：reader 根驻留 0+反向边（五子域
  →view）0+view 域 `../X` 直指根件形态 0（中间态边清零=门一 N3 收官重扫义务
  兑现）+旧径五通道（旧径/点径/别名/动态 import/vi.mock）全 0；出边
  {anchors:19,state:29,panels:1,interact:2,time:2}/intra 50/up 11 与 G9 终态
  增量逐项吻合（A/C 段增量：anchors+5/state+11/interact+1/time+2/intra+24/
  up+7）。
- 锁链：探针即时 generate+apply（manifest 366→367）；D 段 14 件逐件 unlock→
  改→apply 即时重锁；M2 还原即复锁。

## ④ 实现者自裁申报（4 项——请对抗拷问）

1. 中探针时点=「A+B+C 毕、D 未改」（简报字面「B/D 未改」与其预期「src 面 0 错」
   互斥——App.tsx 属 src；按预期语义+G9 先例执行，实证 EXIT=2+18 错全 tests+
   src 0 错与预期吻合）。
2. 简报②段标签「同根零改写 10 行」系算术笔误——枚举与物理均 11 行，以枚举为准
   （勘误留痕不回改简报，G6 N2 惯例）。
3. 探针 g10-oneway.mjs v1 谓词过宽（误报 19 处合法路径）→v2 收敛票面定义；
   **v1 FAIL 输出留档**（兼红能力实证——G9 W1 教训「探针版本覆盖=证据灭失」
   的反面合规），v2 PASS。
4. D 段改写工具=sed -E 13 名单精确模式（G9 .mjs 先例的变体）；逐件四元组对账
   （pre=exp/postold=0/postnew=exp/numstat=exp+exp）全 OK 才进次件。

## ⑤ 审查要求（对抗式——逐项证伪）

1. **逐 hunk 零行为断言**：patch 中每个 `+` 行与对应 `−` 行 diff 是否恰为
   路径前缀/深度变化（`./`↔`../`↔`./view/`），有无任何夹带（逻辑/断言/命名/
   注释/空白）？
2. **计数独立复算**：A 33（5+1+11+2+7+7）/B 1/C 6/D 21（18+3）行数与 patch
   hunk 数学是否一致？44=33+11 相对 import 全量闭合？tests 21 行是否恰枚举
   14 件？
3. **字符串面覆盖**：theme.test 三行改写是否在 patch 内且恰为 view/ 前缀插入？
   patch 外是否有漏改面（你只见 patch——凡你发现 patch 内出现的新旧路径
   不一致处即标红）？
4. **收官核验口径拷问**：C 段 6 行闭合后，patch 内 view 域文件是否仍有
   `from '../`直指 reader 根件形态（非 ../state/ 等子域合法上溯）？
5. **自裁 4 项逐项裁**：是否成立/是否构成验证面放松？
6. 产出：PASS / PASS_WITH_WARNINGS / FAIL + 逐项编号（B 阻断/W 警告/N 注记），
   中文，直接输出报告全文（主控将逐字归档）。
