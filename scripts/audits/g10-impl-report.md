# F-GEOM-01-G10 实现报告（M6b view 工具/搜索/标注 UI 簇 13 件目录化迁移——收官步）

> 实现者=ops-executor（GLM5.3flash $max 绑定）｜批=batch 22｜基线锚=g10-verify-baseline.log
> （G10_BASELINE_VERIFY_EXIT=0，开工树一致核验通过：HEAD=71311691ee G9 收口提交，主控面
> relay.md/manifest.json 在档改动+3 未跟踪探针件，与简报③.1 预期一致）。

## 开工纪律：技能清点（宪法会话开工条款）

- test-driven-development：**用**——③段协议全链（中探针红+M1/M2 双变异红证+八关卡全绿面）。
- verification-before-completion：**用**——⑥交付+EXIT 变量法物理落档+计数落笔前 wc/grep 实测。
- systematic-debugging：备而不用——全程零非预期红；探针 v1 谓词过宽自诊自修属工具对齐（见自裁③）。
- subagent-driven-development：**不用**——本岗即被派发实现者，禁派子代理（单一调用者铁律）。
- git-workflow-and-versioning：**不用**——本票禁 commit/branch/tag，git 面=mv+status/diff 取证。
- Node 全程 `"/c/Program Files/Volta/npm.exe"`（项目锁 24.20.0），探针跑 `"/c/Program Files/Volta/node.exe"`。

## ① 交付清单（A-F 段逐项对账，行号全部落刀前实测复核）

### 迁移面（git mv 13 对，g10-gitmv-status.log）

13 文件 `src/renderer/features/reader/` → `reader/view/`：R 标记 13 对
（12 RM+1 R——ReaderSearchBox.tsx 纯 R 零内容变化，其唯一相对 import
`./reader-search.store` 系同根零改写，与简报预期一致）。wc 合计 1776 行=简报口径。
`git diff --cached --stat`：13 files changed, 0 insertions, 0 deletions（rename 无内容差）。

### A 段深度修正（恰 33 行，行号实测全吻合零漂移）

| 改写形 | 行数 | 行号（全部实测=g10-recon.log [1]） |
| --- | --- | --- |
| `./anchors/`→`../anchors/` | 5 | AnnotationEditor:15、AnnotationMenu:41、ReaderPage:49、ReaderToolbar:42、reader-search.store:41 |
| `./interact/`→`../interact/` | 1 | AnnotationEditor:16 |
| `./state/`→`../state/` | 11 | PageColumnView:24、ReaderPage:52/:53、SearchHighlightLayer:40、TabBar:41/:42/:43、reader-shortcut-handlers:18/:19、useReaderSearch:32/:33 |
| `./time/`→`../time/` | 2 | ReaderPage:55/:56 |
| `../../shared/`→`../../../shared/` | 7 | ReaderPage:48/:59、ReaderShortcuts:46/:47/:48、reader-search.store:42、useReaderSearch:31 |
| `./view/X`→`./X` 域内化 | 7 | PageColumnView:25/:26/:27、ReaderPage:50/:54/:58、reader-search:32 |

合计 5+1+11+2+7+7=**33** ✓。域内同根零改写=物理 **11** 行（简报标签「10 行」系笔误，见自裁②），
33+11=44=13 件相对 import 全量（grep -c 逐件实测对账）。另有 4 行 `@shared/` 别名 import
（AnnotationEditor:14、AnnotationMenu:40、ReaderToolbar:40/:41）——tsconfig 根映射位置无关，零改写。

### B 段 src 消费面（1 行）

App.tsx:7 `'../features/reader/ReaderPage'`→`'../features/reader/view/ReaderPage'` ✓。

### C 段 view 域中间态边闭合（6 行，G9 声明 6 边本批兑现）

view/PageColumn.tsx:32(PageColumnView)、view/PagesOverlay.tsx:50(SearchHighlightLayer)、
view/AnnotationPopups.tsx:35/:36(AnnotationEditor+AnnotationMenu)、view/ReaderPageView.tsx:37/:40
(TabBar+ReaderToolbar)——`../X`→`./X` 全部落刀 ✓。

### D 段 tests 受锁面（21 行/14 物理件，g10-rewrite-d.log）

- import 18 行/13 件（`features/reader/X`→`features/reader/view/X`）+theme.test.ts 字符串 3 行
  （:292 AnnotationMenu.tsx/:293 AnnotationEditor.tsx/:485 TabBar.tsx，readFileSync 形态）。
- 受锁纪律：逐件 `locks:unlock`→sed 改写→`locks:apply` **即时重锁**（14 轮，unlock/sed/apply
  退出码全 0）；每件四元组对账 pre=exp/postold=0/postnew=exp/numstat=exp+exp 全 OK。
- 总账：14 件 21 ins+21 del=恰 21 枚举行 ✓（git diff --numstat 实测）。
- e2e specs 零命中零触碰 ✓；vi.mock 零增删（g10-oneway.log ch_viMock=0）✓。

### E 段 config 面：零动作 ✓

eslint.config.js 四路径 :89-:92 已全在位（:90/:91=M6a G9 迁 view/、:89/:92=M1 G4 迁 state/），
仅核验未触碰（简报①勘正吻合）。check-quality 白名单零命中；scripts/audits 历史证据件命中
（g9-rewrite-a/b.mjs 13 行）零动作（G7/G8 先例）。

### F 段 registry 随迁：实现者零触碰（主控收口职责）✓

tickets:check 红=**恰 8 行**：SR-RDR-04/SR-RDR-07/SR2-KEY-02/SR2-ANNO-01/SR2-TABS-02/P7E-03/
F-A11 七旧票 file 行+F-GEOM-01-G10 自身——与简报 F 段「7 旧票+G10 自身共 8 行」精确吻合。

## ② 验证证据（全部真退出码+EXIT 变量法物理落档）

### 中探针（g10-midprobe.log）

`MIDPROBE_TYPECHECK_EXIT=2`（预期红）；**18 错=恰 D 段 18 行 import**（13 件 tests 文件错误数
逐件 1:1：annotation-editor-ux 1/annotation-menu 1/r3-rdr-set-visual 2/reader-double-page 1/
reader-page-open-race 1/reader-search-text 1/reader-search-ui 4/reader-search-wiring 2/
reader-search.store 1/reader-shortcuts 1/selection-mode 1/tab-bar 1/tab-dirty 1）；
**src 面 0 错**（行首 `^src/` 命中 0）。时点=A+B+C 毕、D 未改（解读见自裁①）。

### 八关卡单跑（g10-impl-verify.log，G9 同款口径）

| 关卡 | EXIT | 关键输出 |
| --- | --- | --- |
| quality:check | **0** | 无占位/无乱码/无跨域 |
| test-surface:check | **0** | 契约面零破坏 |
| tickets:check | **1=预期红** | 恰 8 行（归主控收口，F 段） |
| locks:check | **0** | manifest 一致 |
| lint | **0** | 零告警 |
| typecheck | **0** | node+web 双段绿 |
| test | **0** | **Test Files 170 passed (170) / Tests 1744 passed (1744)**=基线恒等 |
| build | **0** | 产物同名同尺寸（见下） |

### 变异红证 M1（src 面，g10-mutation1.log+g10-mutation1-restore.log）

App.tsx:7 回退旧径→typecheck **TS2307 Cannot find module '../features/reader/ReaderPage'
@App.tsx(7,28) EXIT=2**→cp 备份法还原（全程未用 git checkout）→diff 空
（M1_RESTORE_DIFF_EXIT=0）→typecheck 复绿（M1_RESTORE_TYPECHECK_EXIT=0）→
M1_RESTORE_EXIT=0→备份副本即删。

### 变异红证 M2（tests 面，g10-mutation2.log+g10-mutation2-restore.log）

unlock→cp 备份→tab-bar.test.tsx:14 回退旧径→vitest 单文件 **Failed to resolve import
"../../../src/renderer/features/reader/TabBar"（vite:import-analysis）EXIT=1**→cp 还原
diff 空（M2_RESTORE_DIFF_EXIT=0）→locks:apply 即时复锁（M2_RELOCK_APPLY_EXIT=0）→
vitest **12/12 复绿**（M2_RESTORE_TEST_EXIT=0）→M2_RESTORE_EXIT=0→备份副本即删。
（注：两 log 含 vitest Windows GBK 控制台字节，grep 需 -a；证据物理在档。）

### 构建产物哈希恒等（g10-build-hash.log，迁移前后双点+sha256 强化）

| 产物 | PRE=POST sha256 |
| --- | --- |
| index-D3egZtl2.js（1,392.72 kB） | 9c3b8b84…4ca3f2a |
| index-BfpEygSE.css（52.49 kB） | dcace2e7…068a97d |
| pdf.worker.min-yatZIOMy.mjs（1,375.84 kB） | 1baa1844…ad84be36 |

三产物同名同尺寸**同 sha256**（内容寻址命名+哈希双保险）——零行为迁移 bundle 层证明成立，
**G5-G10 恒等链第六票**。

### §3.1 单向核验（g10-oneway.mjs+g10-oneway.log）

- reader 根驻留文件=**0**（根=纯目录容器，收官核验成立）；
- view 出边=`{anchors:19, state:29, panels:1, interact:2, time:2}` intra_view=50 up_cross=11；
  与 G9 终态交叉对账（增量逐项=本票 A/C 段）：anchors 14+5、state 18+11、interact 1+1、
  time 0+2、intra 26+24（A 段 7 域内化+11 同根+C 段 6）、up_cross 4+7（shared 上跨）——全吻合；
- 反向边（五子域→view）=**0**；
- view 域 `../X` 直指根件形态=**0**（中间态边清零，门一 N3 收官重扫义务兑现）；
- 旧径残留五通道=**0/0/0/0/0**（scan_files=422，src+tests 全文）。

### 锁链（g10-locks-oneway.log）

探针写完即时 `locks:generate`+`apply`（同批次动作，G4 教训①）——manifest 366→**367** 条
（含 g10-oneway.mjs）+locks:check=0；D 段 14 件逐件即时重锁；M2 还原后即时复锁；
探针 v2 修正后同批再 apply。

## ③ 自裁申报（4 项，其余零偏差）

1. **中探针时点解读偏差**：简报③.2 字面「A+C 段改写完、B/D 段未改时点」与其同句预期
   「src 面 0 错；此时 src 已自洽」互斥——App.tsx:7（B 段，src 文件，tsconfig.web.json
   覆盖内）未改时必产 src 面 TS2307。按简报预期语义+G9 同款先例（G9 报告「C 面未改时点」
   =src 面完整后跑、56 错全 tests 面）执行=**A+B+C 毕、D 未改时点**。实证结果与简报预期
   逐字吻合（EXIT=2+18 错全 tests 面+src 0 错）。
2. **简报②段标签笔误勘正**（G6 N2 惯例：勘误留痕不回改简报）：「域内同根零改写 10 行」
   标签下枚举实为 **11 行**（ReaderPage:51/:57+ReaderSearchBox:31+SearchHighlightLayer:38/:39+
   reader-search.store:39/:40+reader-shortcut-handlers:20/:21+useReaderSearch:34/:35
   =2+1+2+2+2+2=11）；物理实测 11 行与枚举吻合，标签系算术笔误，以枚举与物理为准。
   33（改写）+11（零改写）=44=相对 import 全量闭合。
3. **探针 g10-oneway.mjs v1→v2 谓词修正**：v1 动态 import/vi.mock 两通道谓词过宽（匹配任何
   含 reader 字样的 import(/vi.mock——命中 19 处 state/view/anchors **合法**路径，G9 前遗留
   合法 mock 面），偏离简报「旧径残留」通道定义（对象=13 件旧根径形态）。v2 收敛为 13 件
   旧径形态+view 域 `./view/` 嵌套形态；v1 FAIL 输出留档（兼作探针红能力实证），v2 PASS。
   修正系自产工具对齐票面定义，非验证面放松（五通道逐通道独立扫描保留）。
4. **D 段改写工具=sed（-E 精确 13 名单模式）**：G9 用 .mjs 改写脚本先例；逐件四元组对账
   （pre=exp/postold=0/postnew=exp/numstat=exp+exp）全 OK 才进次件，替代 21 次 Edit 调用，
   改写语义等价（纯路径前缀插入 `view/`）。

**行号偏差=零**：A 33/B 1/C 6/D 21 行全部实测吻合侦察档（落刀前逐行 grep 复核）。

## 证据件清单（scripts/audits/，EXIT 标记物理在档已逐一审计）

- 主控侧（开工在档）：g10-impl-brief.md、g10-recon.{mjs,log}、g10-verify-baseline.log
- 实现者侧（13 件）：g10-gitmv-status.log、g10-midprobe.log、g10-rewrite-d.log、
  g10-impl-verify.log、g10-mutation1.log、g10-mutation1-restore.log、g10-mutation2.log、
  g10-mutation2-restore.log、g10-build-hash.log、g10-locks-oneway.log、g10-oneway.mjs、
  g10-oneway.log、g10-final-status.log、本报告（g10-impl-report.md）

## 终态自查（g10-final-status.log）

- `git status` 改动面=13 rename 对+App.tsx+view 域 4 件（C 段）+tests 14 件+主控面 2 件
  （relay.md/manifest.json）+未跟踪 4（主控 3 件+g10-oneway.mjs）——与简报⑥预期一致
  （dist 产物不入库）；mutation backup 副本零驻留（M1/M2 还原毕即删）。
- `git diff --stat`：33 文件 92 ins+80 del——实现者面=src 40 行×2+tests 21 行×2=122 半行，
  余 50 半行=主控 relay.md/manifest.json 面，零范围蔓延。
- `git diff --cached --stat`：13 files changed 0/0（rename 纯迁移）。

MODEL-SELF: model-field:account:bigmodel-individual-coding-plan/GLM-5.3$max
LEDGER-CLAIM: role=ops-executor executor=model-field:account:bigmodel-individual-coding-plan/GLM-5.3$max units=1 outcome=done
