# F-GEOM-01-G9 实现者报告（M6a view 渲染簇 14 件目录化迁移——零行为纯迁移）

> 实现者=ops-executor 绑定（GLM5.3flash $max）｜批=batch 21｜六段结构镜像 g9-impl-brief.md
> 技能清点（开工纪律）：ai-dev-org=不用（绑定岗直接执行六段简报，简报即唯一任务真相源）；
> verification-before-completion=用（七关卡+哈希恒等+单向核验）；systematic-debugging=备用
> （探针缺陷 v1→v2 修正即按其纪律处置）；test-driven-development=不用（零行为纯迁移票，
> 简报明示 TDD 面以基线锚+双变异红证+构建哈希恒等机制兑现）；git-advanced-workflows=不用
> （禁 commit/branch/tag，仅 git mv）。

## ① 任务与边界（执行对照）

- 14 件 git mv 迁 `src/renderer/features/reader/view/`（目录新建）——**已完成**，
  `git status` 14 对 R 标记（g9-gitmv-status.log：14 行 R，GREP_EXIT=0）。
- 零行为变更：仅路径改写，无任何逻辑/断言/用例增删改语义（改写脚本逐处断言恰 1 次命中）。
- 禁 git commit/branch/tag（未做任何提交）；禁触 tickets/registry.ts 与 docs/handoff/relay.md
  （零触碰——diff 中 relay.md 46 行变化为开场主控遗留 M，见 ⑥-5）。
- M6b 域件（PageColumnView/SearchHighlightLayer/AnnotationEditor/AnnotationMenu/TabBar/
  ReaderToolbar）本体未动，仅作为 `../X` 消费目标。

## ② 改写面实测计数（脚本断言+diff --stat 双口径对账）

| 面 | 简报口径 | 实测 | 证据 |
| --- | --- | --- | --- |
| A 深度修正 | 44 行 | **44 行**（PageColumn 2+PageBox 1+PagesOverlay 3+PdfPageCanvas 4+TextLayer 1+usePageColumnScroll 1+scroll-progress 4+AnnotationLayer 7+AiAnnotationLayer 8+AnnotationPopups 6+ReaderPageView 7） | g9-rewrite-a.log（TOTAL_A_EDITS=44，每 oldStr 断言恰 1 次命中+残留零断言，A_EXIT=0） |
| B src 消费 | 7 行/3 件 | **7 行**（reader-search 1+PageColumnView 3+ReaderPage 3） | g9-rewrite-b.log（TOTAL_B_EDITS=7，B_EXIT=0） |
| C tests 受锁 | 30 行/16 件 | **30 行/16 件**（模块说明符整串替换，覆盖 import from 与 vi.mock 两形态；vi.mock 5 行=reader-page-open-race:38+pages-overlay:55/80/87/94） | g9-rewrite-ce.log（TOTAL_C_EDITS=30，CE_EXIT=0） |
| D 跨特性 | 0 | **0**（侦察全仓零命中，实现面未新增） | g9-recon.log |
| E config | 2 行 | **2 行**（eslint.config.js:90 PdfPageCanvas/:91 TextLayer→…/reader/view/…；:89/:92 已迁态未动） | g9-rewrite-ce.log（TOTAL_E_EDITS=2） |
| G 字符串 | 0 | **0**（未做任何动作） | — |

- A 面子类对账：`../state/` 18+`../anchors/` 14+`../panels/` 1+`../interact/` 1+
  `../../../api|shared` 4+reader 根驻留 `../X` 6 = 44 ✓ 与简报 ② 逐子类吻合。
- 行号漂移：**零漂移**——recon OUT-EDGES 行号与迁移后 grep 实测完全一致（迁移不改行内位置）；
  PdfPageCanvas.tsx:39 `export type … from './anchors/geometry-types'` 属简报 14 行 anchors 面内
  （recon OUT-EDGES geometry-types×2 已含），非额外引用面。
- 纯 rename 3 件（零内容变化不入 diff --stat）：text-layer.css/page-column-geometry.ts/
  usePageLazyWindow.ts——域内互引零改写的自然结果。
- diff --stat 全表对账：33 文件 162 ins+106 del=268 变化行 = G9 面 166（A 88+B 14+C 60+E 4）
  +主控遗留 102（relay.md 46+manifest 56）✓ 零蔓延。

## ③ 验证证据（七关卡+中探针+双变异红证+哈希恒等+单向核验，全部真退出码物理落档）

### 七关卡单跑（各 EXIT=log 内物理标记）

| 关卡 | EXIT | 关键输出 | 证据件 |
| --- | --- | --- | --- |
| lint（eslint .） | **0** | 无输出=零告警 | g9-gate-lint.log |
| typecheck（node+web 双 tsconfig） | **0** | 双段绿 | g9-gate-typecheck.log |
| test（vitest run） | **0** | **Test Files 170 passed (170) / Tests 1744 passed (1744)**=基线 170/1744 恒等 | g9-gate-test.log |
| build（electron-vite） | **0** | 产物=index-**D3egZtl2.js 1,392.72 kB**+index-**BfpEygSE.css 52.49 kB**——与基线同名同尺寸，哈希恒等链第五票（G5-G9） | g9-gate-build.log |
| quality:check 单跑 | **0** | 无占位/无乱码/无跨域/无同值双常量新增；dup-constants warn 2 组=存量不卡 CI | g9-gate-quality.log |
| tickets:check | **1=预期红** | 12 条「工单指向的文件不存在」registry 旧径 file 锚+4 条镜像面（view/ 新路径引用 done 工单占位文案）——**归主控收口**（G8 同型 F 面 registry 随迁职责），如实记录勿修 | g9-gate-tickets.log |
| locks:check | **0** | manifest 363 条一致（359 基线+主控 g9-recon.mjs+本票 4 探针） | g9-locks-final.log |

### 中探针（C 面未改时点 typecheck，义务 3）

- EXIT=2（预期）；**56 错全在 tests 面**（行首 `^tests/`=56、`^src/`=0——src 面 0 错），
  uniq 分类 15 件：page-column 17/reader-double-page 10/scroll-progress 7/pdf-page-canvas 5/
  text-layer·selection-mode·pages-overlay·band-calibration·annotation-layer·ai-annotation-layer
  各 2/其余 6 件各 1。
- 15/16 而非 16：reader-page-open-race.test.tsx:38 仅 vi.mock 面——tsc 不解析 vi.mock 字符串
  （已知盲区，G8 门一 N1 同源），该通道由 M2 运行时红证闭合。证据=g9-midprobe-typecheck.log。

### 变异红证 M1（src 面，cp 备份法）

链：cp 备份→ReaderPage.tsx:58 `'./view/ReaderPageView'`→`'./ReaderPageView'`→typecheck
**TS2307 Cannot find module './ReaderPageView' EXIT=2**→cp 还原→diff 空（M1_RESTORE_DIFF_EXIT=0）
→typecheck 复绿（M1_RESTORE_TYPECHECK_EXIT=0）→备份副本即删（mutation backup 禁驻留）。
证据=g9-m1-mutation.log（全程未用 git checkout）。

### 变异红证 M2（tests 面，受锁面 unlock→变异→还原→apply）

链：locks:unlock→cp 备份→page-column.test.tsx:23 回退 view 路径→vitest 单文件
**Failed to resolve import "../../../src/renderer/features/reader/PageColumn"（vite:import-analysis
模块解析红）EXIT=1**→cp 还原→diff 空（M2_RESTORE_DIFF_EXIT=0）→locks:apply 复锁
（M2_RELOCK_EXIT=0）→复绿 1 passed（M2_RESTORE_TEST_EXIT=0）→备份即删。
证据=g9-m2-mutation.log。

### 单向核验探针（义务 7，g9-one-way.mjs）

- view 出边计数：**anchors=14+state=18+panels=1+interact=1+time=0**（域序铁律单向边全量）+
  intra=26（域内互引）+readerRoot=6（M6b 驻留）+upCross=4（api/client 2+shared/ui 2）——
  相对出边净计数 70=44 改写+26 域内互引全对账。
- 反向边（{state,anchors,interact,panels,time}→view）：**0**。
- 旧径残留五通道（旧径 import/点径/别名/动态 import/vi.mock，全部限定 14 件名+view 负向前瞻）：
  **全 0**。
- registry 旧径 12 处=主控收口面（与 tickets:check 红 12 条一致），单独计数不入五通道结论。
- ONE_WAY_RESULT=PASS，ONEWAY_EXIT=0。证据=g9-one-way.log。

### 受锁面操作纪律（义务 8）

- C+E 批次：unlock（g9-locks-ce.log）→改写→generate+apply（g9-locks-apply-ce.log）。
- 自产探针 4 件（g9-rewrite-a/b/ce/one-way.mjs）每件诞生即 generate+apply 同批次登记
  （g9-locks-gen1/gen2/apply-ce/final.log 链）。
- M2 变异的受锁操作走 unlock→改→还原→apply（g9-m2-mutation.log 内四标记齐全）。

## ④ 证据面清单（scripts/audits/，.log 类收口需 add -f，归主控）

- 关卡：g9-gate-{lint,typecheck,test,build,quality,tickets}.log
- 迁移：g9-gitmv-status.log；改写：g9-rewrite-{a,b,ce}.{mjs,log}；单向：g9-one-way.{mjs,log}
- 探针纪律：g9-locks-{ce,gen1,gen2,apply-ce,final}.log；红证：g9-m{1,2}-mutation.log
- 中探针：g9-midprobe-typecheck.log；本报告+简报：g9-impl-{report,brief}.md
- （主控侧件：g9-recon.{mjs,log}、g9-verify-baseline.log、g9-impl-brief.md）

## ⑤ 计数对账（落笔前脚本实测口径）

- 迁移对数=14（R 标记 14 行 grep 实测）；件数 14/行数 2212（简报 wc 口径，纯迁移未增删行——
  12 件内容修改 88 变化行=44 行改写×2，3 件零变化）。
- 改写面：A 44+B 7+C 30+D 0+E 2+G 0=**83 行**，物理件=14 迁移+3 src+16 tests+1 eslint=34 ✓
  简报 ⑤ 合计口径吻合（relay 板归主控）。
- 测试基线 170/1744 恒等；构建产物双文件哈希恒等（D3egZtl2/BfpEygSE，G5-G9 链第五票）。
- 锁 manifest 359→363（+主控 recon+本票 4 探针），locks:check 绿。

## ⑥ 超票面自裁申报

1. **g9-gitmv-status.log 首采失效补正**：git status `-- <相对路径>` 在 reader 子目录 cwd 下
   失效（输出空+warning），从仓库根重取补正——纯证据采集操作，实现面零影响。
2. **g9-one-way.mjs v1 两处探针缺陷当场修正**：①win32 反斜杠路径 startsWith 不匹配致出边
   全 0 假象；②动态 import 通道未限定 14 件名，误捕 tests 对 state/ 域 4 条合法动态 import
   （annotation-undo×2+reader.store×2）。v1 输出 FAIL EXIT=1，v2 修正后 PASS——**探针缺陷非
   实现缺陷**（tests 与 state 域件均零触碰）；v1 输出被 v2 重定向覆盖未单独留档，本条即其
   完整记录。
3. **external=2 探针分类噪声澄清**：v2 首跑 external=2 系 `.textLayer` className 字符串被
   说明符正则误捕（AnnotationLayer/AiAnnotationLayer 各 1，非 import）——补 EXT_SPEC 明细
   输出定位后确认相对出边净计数 70 全对账，探针终版 PASS。
4. **M2 日志 grep 首查无回显**：vitest 输出 ANSI 色码致 grep 视作二进制跳过，`grep -a` 补查
   四标记齐全（教训：日志 grep 常备 -a）。
5. **开场工作树非净态申报**：`M docs/handoff/relay.md`+`M locks/manifest.json`+未跟踪
   g9-impl-brief.md/g9-recon.mjs 为主控派发遗留——relay 零触碰（diff 中 46 行=遗留原样）；
   manifest 变化=主控 recon 登记+本票 4 次合法锁操作叠加，属受锁面操作必然产物。
6. **tickets:check 4 条镜像面红**（view/ 新路径引用 done 工单占位文案）：简报仅预告「registry
   旧径」红，此 4 条为同一 registry 锚未随迁的镜像输出，同归主控 F 面收口，未做任何处理。
7. **中探针 15/16 件说明**（非 16/16）：reader-page-open-race 仅 vi.mock 面=tsc 盲区（③ 已述），
   由 M2 运行时红证补闭合，未额外加跑任何超简报关卡。

## 更正段（主控追记——门二 P1-1 处置，2026-09-19）

- :53「manifest 363 条一致（359 基线…）」与 :112「锁 manifest 359→363」两处锁数
  失实，系把中间态（apply-ce 后 363）当终态、把 359（迁移前存量）当基线所致。
  **正确口径**：基线=360（含主控 g9-recon.mjs，g9-verify-baseline.log:87）→
  gen1 361→gen2 362→apply-ce 363→final **364 条一致**（g9-locks-final.log:7/:15/:24
  三处+manifest 亲数）——门二 P1-1 独立复推在档（g9-gate2-report.md ②-4）。
  本段为更正留痕，上文两处原文不回改（勘误留痕惯例）。
