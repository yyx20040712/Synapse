# F-GEOM-01-G10 门一对抗式审查报告（ops-gate1-k2）——主控逐字归档件

> 岗=ops-gate1-k2（kimi k3 $max，zipoo 源——用户指令 2026-09-18 起 k1 封顶 k2 承载）。
> 审查方法：仅依据简报+patch 两件。patch 全文 522 行逐行过手；全部 61 对 `−`/`+`
> 逐对比对；A/B/C/D 计数独立复算；hunk 头 `@@[ -，m +，m ]` 行数对称性逐件核验；
> import 组内顺序对齐核验；出边增量与简报③探针计数交叉对账。

## 一、⑤审查要求逐项结论

### 1. 逐 hunk 零行为断言——成立（61/61 对全绿）

patch 共 61 个 `+` 行（src 40 + tests 21），与 61 个 `−` 行逐对对齐，全部恰为
路径前缀/深度变化（`./`↔`../`↔`./view/`↔`../../`↔`../../../`↔`reader/`↔
`reader/view/`），**零逻辑/断言/命名/注释/空白夹带**。重点核验：

- ReaderPage.tsx（patch :118-143）10 行改写分三组，组内 `−`/`+` 顺序 1:1 对齐，
  无重排；`./useReaderSearch`(:128)、`./reader-shortcut-handlers`(:139) 作上下文
  原样保留——两目标均随迁，零改写正确。
- PageColumnView.tsx(:83-94) 4 行：`./state/`→`../state/` + `./view/X`→`./X` ×3，
  语义目标恒等（迁入 view/ 后 `../state`=原 `./state`，`./PdfPageCanvas`=原
  `./view/PdfPageCanvas`）。
- ReaderSearchBox.tsx(:164-167) similarity 100% rename，零内容变化。
- 全部 32 件 hunk 头 old/new 行数对称（如 RP `@@ -45,18 +45,18`、TB
  `@@ -38,9 +38,9`、theme `@@ -289,8 +289,8`），零行数增减。
- 13 件 rename 全部以 similarity 94%-100% 检出，无 delete+create 假迁移。

### 2. 计数独立复算——A33/B1/C6/D21 全闭合；44 闭合见 W1

- **A=33**：逐件复算 AE2+AM1+PCV4+RP10+RS3+RT1+SHL1+TB3+rss2+rs1+rsh2+URS3+RSB0=33；
  逐类复算 anchors 5（patch :25,:43,:123,:199,:251）+interact 1（:26）+state 11
  （:87,:129,:130,:215,:231-233,:285-286,:304-305）+time 2（:132-133）+shared 7
  （:122,:141,:179-181,:252,:303）+view 内化 7（:88-90,:124,:131,:140,:269）=33，
  与简报②逐类逐件双吻合。
- **B=1**：App.tsx :9→10。
- **C=6**：PageColumn:71 + PagesOverlay:106 + AnnotationPopups:56-57 +
  ReaderPageView:155,159，`../X`→`./X` 形态齐整。
- **D=21/14 件**：import 18 行/13 件（1+1+2+1+1+1+4+2+1+1+1+1+1）+theme.test
  字符串 3 行/1 件。
- 总数交叉：33+1+6+21=61=patch `+` 行实测总数✓；32 文件=13 rename+5 原地
  （App/AP/PC/PO/RPV）+14 tests✓。
- **44=33+11**：33 亲验闭合；「同根零改写 11 行」patch 上下文仅可见 10 行
  （RP:128,139/SHL:213,214/rss:249,250/rsh:289,290/URS:309,310），第 11 行不在
  任何 hunk 窗口内——见 W1。`@shared/` 别名 4 行全可见（:24,:42,:197-198）✓。
- 简报③出边增量交叉验证（强证据）：anchors+5/state+11/interact+1/time+2/up+7
  与 A 段逐类行数精确吻合；intra+24=7（view 内化）+11（同根随迁）+6（C 闭合）
  数学闭合——探针计数与 patch 物理一致。

### 3. 字符串面覆盖——成立

theme.test.ts 3 行在包内（patch :506-509 AnnotationMenu/AnnotationEditor、
:517-518 TabBar），恰为 `view/` 前缀纯插入，readFileSync 路径形态；上下文
`reader/interact/SelectionToolbar.tsx`(:510)、shared/ui Dialog/Toast、lineage
三件零触碰（非迁移面原样正确）。patch 全部上下文行无新旧路径不一致残留；
tests 面既有 `reader/view/PageColumn`（:360,:370）、`reader/state/reader.store`
（:351 等）均未被误伤。

### 4. 收官核验口径——patch 可见面成立，全局面见 W2b

patch 内全部 view 域文件（4 原地件+13 迁入件改写后形态）的 `from '../` 仅存：
`../state/`（AP:55,60/PC:69/PO:108/RPV:157,162 等）、`../anchors/`、
`../interact/`（RPV:161）、`../panels/`（RPV:153）、`../time/`、
`../../../shared/`、`../../../api/`（AP:53）——均为 §3.1 合法子域上溯/越域；
`../<根件>` 直指形态在可见面**零命中**。C 段 6 行闭合与 G9 声明边数一致。

### 5. 自裁 4 项逐项裁

1. **成立**（N1）。中探针「恰 18 错全 tests 面」与 D 段 18 import 行恰 1:1——
   theme.test 3 字符串行为 readFileSync 形态，tsc 型探针（EXIT=2）不命中，计数
   自洽；且该 18 错数反向佐证「src 消费面仅 App.tsx」（若有第二 src 消费者，
   错数必溢 18）。终验为全量 verify，无验证面放松。
2. **成立**（N2）。现行简报②段已为「11 行」，自裁所述「10 行」字面不在包内
   版本——勘误已落或针对他版，方向正确；可见面=10 的闭合缺口移交 W1。
3. **成立**（N3）。v1 FAIL 留档符合 G9 W1「证据灭失」反面合规；但 v2 谓词
   正确性本身包外不可亲验（探针脚本不在包），并入 W2b。
4. **成立且获包内内证**（N4）。reader-double-page.test:360 既有
   `reader/view/PageColumn` 未被改写为 `view/view`（粗粒度 sed 必伤此行）、
   r3-rdr-set-visual:351 `reader/state/` 与 theme:510 `reader/interact/` 原样
   ——13 名单精确匹配实证。

## 二、发现清单

**B（阻断）：0**

**W1（警告）**：「域内同根零改写 11 行=44-33」闭合中第 11 行包内不可见。patch
上下文仅出示 10 行（枚举见 §一.2）；ReaderSearchBox.tsx 为 100% similarity
rename 无 hunk 展示，各件 import 块亦可能超出 ±3 行上下文窗（如 SHL 第 37 行
以上区段）。33 行改写本身已逐行亲验闭合，故仅计数簿记级风险，但属计数类声明
未经门一亲验——建议主控归档 `grep -c` 逐件实测输出销项。

**W2（警告）**：三项包外断言依赖，patch 无法出示反证亦无法亲验，建议收口时
以实测输出归档销项——(a) e2e specs 旧径零命中（verify 八关口径=quality+tickets
+locks+lint+typecheck+test+build 不含 e2e，构建哈希恒等只能证 bundle 内容一致，
不能证 e2e 文本面无旧径残留）；(b) 「reader 根驻留 0+反向边 0+旧径五通道全 0」
系 g10-oneway.mjs v2 输出，探针脚本与原始输出不在包内，且自裁 3 证实 v1 谓词
曾过宽——谓词定义敏感性有前科；(c) 「1776 行 wc/Σ1789」计数 diff 不含全文件，
不可复算。三项均低风险（(a) 由中探针 src-0 错+终验绿间接支撑，(b) 由出边增量
交叉吻合间接支撑），但按「不采信未经亲验转述」原则不记入已验。

**N1**：自裁 1 所述简报字面「B/D 未改」不在包内简报版本（:51 已为「src 面
0 错」表述）——该互斥陈述针对的版本不可考，实体处置（按预期语义+G9 先例）
合理，注记存查。
**N2**：自裁 2 笔误勘误方向正确，现行简报②段（:31-32）已印「11 行」；物理
闭合缺口在 W1 跟踪，不重复计。
**N3**：自裁 3 的 v1 留档+v2 收敛为流程加分项（G9 W1 教训反面合规）。
**N4**：自裁 4 精确模式获 patch 内证（见 §一.5.4），sed 工具面可信。
**N5**：F（registry 8 行）与 E（eslint 零动作）属主控收口/预裁面——registry.ts
不在 32 件 diff 内✓与「实现者零触碰」一致；tickets 预期红属票面声明态，收口
翻状态后复绿为主控职责，本门不裁。

## 三、统计与总评

- 逐 hunk：61/61 对零行为变更亲验通过；32/32 文件 hunk 头行数对称；13/13
  rename 检出。
- 计数：A33/B1/C6/D21/61 总行/32 文件/出边增量七项——全部独立复算闭合；
  44 闭合差 1 行不可见（W1）。
- B=0 / W=2 / N=5。
- 总评：迁移刀法干净，计数数学与探针交叉验证严密，自裁申报全部成立且两项获
  包内内证；两处警告均为隔离包固有盲区（不可见行+包外断言），非实现缺陷，
  移交主控以实测归档销项。**裁定 PASS_WITH_WARNINGS**——不阻断收口，W1/W2
  销项材料建议随收口提交一并入库。

隔离墙合规声明：本次审查仅 Read 指定的两件包内材料，未读取包外任何文件，
未执行任何命令。

（主控处置段——门一后追加：W1 已销项=g10-w1w2-closure.log 逐件计数
2+1+4+12+1+3+1+3+3+4+1+4+5=44 ✓+第 11 行物理定位 ReaderSearchBox:31
`./reader-search.store`（100% rename 无 hunk=门一盲区根因）；W2a 已销项=同 log
e2e 全目录旧径扫描零命中；W2b=g10-oneway.mjs+g10-oneway.log 已在 scripts/audits/
随收口入库+门二亲扫补偿；W2c=wc 1776 主控侦察段亲测在案（本简报①段引证）。）
