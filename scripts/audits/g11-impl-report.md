# F-GEOM-01-G11 实现者报告（ops-executor，2026-09-19）

> 票=registry :302 F-GEOM-01-G11（战役收官 11/11）。本票禁 git commit/禁翻
> registry——全部改动留工作树，提交与翻票归主控收口。简报=
> scripts/audits/g11-impl-brief.md（六段）。

## 1. 交付清单（按单元——无 commit 哈希，提交权在主控）

| 单元 | 内容 | 文件 | 状态 |
| --- | --- | --- | --- |
| U1 两探针 | 域分组净删实测+INV-68 锚逐验（写毕即时 locks:generate+apply，锁链 368→370） | scripts/audits/g11-netstat.mjs（152 行）/g11-inv-anchor-check.mjs（80 行） | EXIT=0/EXIT=0 |
| U2 头注扫尾 | PdfPageCanvas.tsx:36-38 陈旧注释重写（grep 实测现行消费面=9 处：8 件 type 再导出+1 件组件本测，全部经 view/ 新径；旧句「十处旧路径零触」已陈旧） | src/renderer/features/reader/view/PdfPageCanvas.tsx（+5/−3 全注释行） | 完成 |
| U3 探针头注 | g10-oneway.mjs 补 oldPathHit 谓词盲区限制说明（门二 P2-2 销项） | scripts/audits/g10-oneway.mjs（+3） | 完成 |
| U4 INV 终册 | 11 处平铺旧径→域前缀现行径+INV-47/58/68 声明处裸名加前缀+新增「路径口径」小节（销 b12 门二 P2-2）+§5.4 相容确认三注记（unlock→改→apply 链） | docs/invariants.md（42 行变更） | 完成 |
| U5 记账报告真身 | 净删/交互点记账+跨族交互点表 5→4+1 逐点锚+验收门记录（e2e 两门留占位归主控）+INV 终册状态+对账债销项段 | docs/reports/2026-09-18_f-geom01-campaign-closeout.md（22 行骨架→正文重写） | 完成 |
| U6 基线重冻结 | 同值冻结 187/1789/5411+check 绿+diff 落档（unlock→baseline→apply 链） | scripts/test-surface.baseline.json（679 行 diff）+g11-baseline-diff.log | EXIT=0 |
| U7 全链验证 | verify 全绿+构建产物名恒等+锚定回归网定向绿 | g11-impl-verify.log/g11-build-hash.log/g11-anchored-net.log | EXIT=0×3 |

## 2. 改动面（git status/diff 实测）

- 修改：docs/invariants.md、docs/reports/2026-09-18_f-geom01-campaign-closeout.md、
  scripts/audits/g10-oneway.mjs、scripts/test-surface.baseline.json、
  src/renderer/features/reader/view/PdfPageCanvas.tsx、locks/manifest.json（锁链同步）；
- 新增：scripts/audits/g11-netstat.mjs、g11-inv-anchor-check.mjs（均诞生即入锁）；
- 证据件：g11-netstat.log（95 行）/g11-inv-anchor-check.log（31）/g11-impl-verify.log
  （3843）/g11-anchored-net.log（273）/g11-baseline-diff.log（32）/g11-build-hash.log
  （13）——.log 被 .gitignore 拦，入库需 add -f（主控收口处置，同 G2~G10 惯例）；
- 零触碰（红线自查过）：tests/**、tickets/registry.ts、src 非注释行（src diff
  全部为 `//` 注释行）、scripts/audits/b22-recovery-verify.log（主控暂存件原样）、
  docs/handoff/relay.md（开工前已是 M，本岗零编辑）。

## 3. 探针结果汇总

### g11-netstat.log（域分组净删，EXIT=0）
state 10f +8/−8 净0｜time 4f +5/−5 净0｜anchors 14f +160/−88 净+72（新件
geometry-types.ts +103/−0）｜interact 7f +48/−55 净−7｜panels 8f +21/−21 净0｜
view 27f +71/−112 净−41｜基点根删除 1f −20（geometry-types 骨架）｜合计 71f
+313/−309 净+4（与 git diff --stat 自洽）。wc 现值 70 文件/11,815 行；af946a5324
基线 69 文件/11,791 行（逻辑行数同口径）→Δ+1 文件/+24 行。

### g11-inv-anchor-check.log（INV-68 锚逐验，EXIT=0）
13 锚全 PASS 零漂移零缺失（pdf-item-geometry:366/:506、selection-evaluate:130/
:207/:43/:292/:296、annotation-resolve:209/:237/:277/:302、AnnotationLayer:98、
annotation-band-calibrate:77）——「未漂勿动」兑现（INV-68 行号锚零改动）；
INV-47/58/68 声明处文件现行存在性 13/13。

## 4. 计数实测表（一切落笔前亲测）

| 项 | 简报预期 | 实测 | 判定 |
| --- | --- | --- | --- |
| 净删骨架 | 71 files +313/−309 净+4 | 逐位同 | ✓ |
| af946a5324 基线 | 69 文件/11,860 行 | 69 文件/11,791 行（逻辑行数；11,860=+69 无尾换行口径） | ✓ 双口径并列 |
| INV-68 行号锚 | 漂移输出/缺失停工 | 13 PASS/0 漂移/0 缺失 | ✓ |
| 头注消费面 | 「十处」（旧句） | 9 处（8 type+1 组件本测） | 按实测重写 |
| 指纹门 cur | 187/1789/5411/skip15 | 逐位同 | ✓ 同值冻结 |
| 基线前→后 | 183/1757/5334→187/1789/5411 | 逐位同（diff 875 行=新增契约面） | ✓ |
| verify | 全绿 | EXIT=0（Test Files 170/Tests 1744+locks 370+tickets 206 全绿） | ✓ |
| 构建产物恒等 | index-D3egZtl2.js/index-BfpEygSE.css 同名同尺寸 | 同名同尺寸（1,402,437/59,923 字节+pdf.worker.min-yatZIOMy.mjs 同名；sha256 三件在档 g11-build-hash.log） | ✓ 恒等链第八票 |
| 锚定回归网 | §5.1 清单 17 项 | 18 文件/211 用例 EXIT=0（selection-layer×2=18 实体） | ✓ |
| G2 删行源 | §3.5 ①②③ | +24/−61 净−37（annotation-anchor +1/−26/selection-evaluate +20/−33/anchor-serialize +3/−2） | 删侧兑现 |
| 逐票净账 | — | G1+30/G2−37/G3+11/G4~G10 全净0 | 合计+4 自洽 |
| G3 invariants 落册 | 简报②「+33/−18」 | **+2/−1**（加 reader +26/−15=+28/−16） | ✗ 简报数字未复现→§5-4 |

## 5. 验证证据（命令+退出码+关键输出）

| 命令 | EXIT | 关键输出（log 物理在档） |
| --- | --- | --- |
| node scripts/audits/g11-netstat.mjs | 0 | 净+4 合计自洽+基线对账 Δ+1f/+24 行 |
| node scripts/audits/g11-inv-anchor-check.mjs | 0 | 13 锚 PASS+13 声明处存在 |
| npm run test-surface:stats→baseline→check | 0 | 同值冻结 187/1789/5411+指纹门绿 |
| npm run verify | 0 | 170 files/1744 tests+locks 370+tickets 绿+build 三产物同名 |
| 锚定回归网（npm run test -- 18 文件） | 0 | 18 passed/211 passed |

## 6. 自裁申报清单（一切超简报明示动作/勘正逐条）

1. **探针 v1 判定口径修正**：g11-netstat.mjs 首跑把「D 态非域路径」（c05e2ff8dd
   基点根驻留 geometry-types.ts 骨架的删除条目——迁移本身）误判为异常 EXIT=1；
   v2 收窄：D 态非域路径=「基点根删除」预期组单列并计入合计（否则 +313/−309 无
   法与逐域分组合计自洽），M/A 态非域路径+WC 根驻留维持异常。v2 复跑 EXIT=0。
2. **锁操作周期**：两探针写毕即时 generate+apply（370）；netstat v2 修正走
   unlock→改→apply；g10-oneway 头注与 invariants 终册两步共享一次 unlock 周期
   （同批受锁编辑、批内即时 apply，无跨提交延迟）。
3. **page-items.store 后缀补全**：INV-58 声明处裸名原文无后缀
   （「page-items.store（zustand 单源注册表…）」），加域前缀时补全为
   anchors/page-items.store.ts（域归属=ls 实测 anchors/；票面字面=「加域前缀」，
   后缀补全为指向现行文件的最小必要修正）。
4. **简报数字勘正**：简报②「G3 INV-68 落册段+33/−18」实测不能复现——G3
   invariants=+2/−1、G3 reader=+26/−15（src+docs 合计 +28/−16；src+docs+tests
   +89/−20；全文件 +12587/−23，无口径得出 +33/−18）。closeout 报告 §1.4 按
   实测落笔+勘正申报段（非停工条件类——不涉构建哈希/基线/锚符号）。
5. **g11-baseline-diff.log 重写**：首写时 node require('/tmp/...') 因 Windows
   node 不认 Git Bash POSIX /tmp 路径（shell 隔层坑变体）报错文本污染 log——
   cygpath 通道重取 stats 后整件重写干净版；冻结数据本身零影响（check 终跑
   EXIT=0 权威在档）。
6. **实现序微调**：步骤 6（基线重冻结）先于步骤 5（closeout 报告真身）执行——
   简报③.5 自身要求报告「第 6 步跑完后填实测」，属数据依赖非顺序违约。
7. **票面零动作留档**：test-surface exemptions 2 条 stale（G2 断言面豁免完成
   使命）——票面未授权动豁免清单，处置权留主控收口（check 绿状态下的提示非红）。

## 7. 停工事项

无——四项停工条件（构建哈希破恒等/基线 stats 变化/INV-68 锚符号缺失/verify 红）
全部未触发。

## 8. 回炉 #1 段（门一 FAIL 裁决处置——B1×1/W1×1/N 采纳 2，2026-09-19）

> 门一审档=scripts/audits/g11-gate1-report.md；回炉四件+复验全部留工作树
> （仍禁 commit/registry/relay）。

1. **B1 修复（INV-47 声明处全路径漏刷）**：docs/invariants.md:62
   `src/renderer/features/reader/annotation-anchor.ts` 补 `anchors/` 前缀为
   现行径（受锁件 unlock→改→即时 apply 链）。漏刷机制申明=实现者 Edit 的
   old_string 起点取在「（estimateLinePitch」而未含全路径前缀（同 hunk 只改了
   后两个裸名）+自验 grep 字符类 `[a-z]*` 漏连字符文件名+探针硬编码意图态三重
   叠加——门一 B1 定性成立，修复后册内「11 处已随迁刷新」计数即真（口径小节
   :97 无需改写，按门一裁决）；closeout §4 已补「门一 B1 回炉：第 11 处随本
   回炉补刷，11 处计数全量兑现」落款。
2. **探针补强（B1 处置建议采纳——防同型复发）**：g11-inv-anchor-check.mjs 新增
   [0] 册文扫描段——正则从 docs/invariants.md 文本提取一切 `features/reader/
   <段>` 路径实测（消除 :31-32 硬编码意图态盲区）：段非六域目录且所指文件不
   存在=FAIL；域内路径存在性顺带输出（域内失效不作 FAIL 条件——判定面按门一
   处置建议字面）。重跑输出落 **g11-inv-anchor-check2.log（v1 档
   g11-inv-anchor-check.log 保留未覆盖**——G9 教训③探针版本覆盖=证据灭失）；
   lint 自查 EXIT=0。结果：inv_paths=10（11 处册文引用去重后 10 唯一路径——
   annotation-resolve.ts 两处引用去重）/inv_path_bad=0/13 锚 PASS/13 声明处
   存在，**EXIT=0 全 PASS=INV-47 修复后预期兑现**（若未修复，册文扫描段会以
   `reader/annotation-anchor.ts 段「annotation-anchor.ts」非六域且文件不存在`
   FAIL——同型复发防线在位）。
3. **W1 顺改（头注同源残句）**：PdfPageCanvas.tsx:18-21 从句「本件 type 再
   导出保受锁测试旧路径（ai-annotation-layer.test:25 等——F-GEOM-01-G1 M0
   切环）」按现行事实最小改写为「本件 type 再导出供受锁测试经 view/ 新径消费
   （ai-annotation-layer.test:25 等 8 件——F-GEOM-01-G1 M0 切环，明细见下方
   再导出行注）」——「旧路径」框架消除，文件:行号引用保留，与 :36-40 新句
   口径一致；顺带真源指向补域（geometry-types→anchors/geometry-types）。
4. **N2 口径接缝销项（netstat wc 双侧同域实测）**：现值侧 find reader 树非
   .ts/.tsx/.css 文件=**0**（全树 70=39 ts+30 tsx+1 css）；基线侧 af946a5324
   ls-tree 非代码扩展=**0**（69=38 ts+30 tsx+1 css）——两侧严格同域成立，
   11,815 vs 11,791 的 wc 对账严格同口径（门一 N2「标不确定」销项）。
5. **复验（回炉后全链）**：npm run verify **EXIT=0**（g11-impl-verify2.log
   :3825 物理标记——指纹门 :29 绿+tickets :39+locks 370 :48+Test Files 170/
   Tests 1744 :3784-3785+build 三产物 :3821-3823）；构建产物三件名比对仍恒等
   （g11-build-hash2.log——index-D3egZtl2.js 1,402,437 字节/index-BfpEygSE.css
   59,923/pdf.worker.min-yatZIOMy.mjs 1,375,838，**sha256 三件与回炉前逐位
   相同**：9c3b8b84…/dcace2e7…/1baa1844…——注释级回炉零产物影响，无停工触发）。

### 回炉 #1 自裁申报

- W1 改写顺带把该句真源指向补域（geometry-types→anchors/geometry-types）
  ——超出「仅改定性词」字面，但与 :34 import 行及 :39 再导出行同口径（最小
  必要一致性修正）；
- 探针 [0] 段域内路径存在性以「注记非 FAIL」输出（判定面按门一建议字面收窄，
  域内失效检测留观察不阻断）；
- N3/N4/N5（工作树侧零触碰不可独证/前链 sha 直比档不在包内/历史提交侧不可复算）
  =只读门注记项，非回炉件，无动作。
