# F-GEOM-01-G11 门一审包（隔离审计——ops-gate1-k2 承载，2026-09-19 batch 23）

> 审计对象=工作树未提交改动（HEAD=62ef3802ad 之上）。diff 全量=
> `scripts/audits/g11-gate1-diff.patch`（6 文件，1688 行——relay.md 调度面
> 与暂存件 b22-recovery-verify.log 非票面已剔）。你只有 Read 工具：包内
> 断言的一切文件路径可直接读仓库现行态取证；.patch 文件本身为逐 hunk
> 审计基准。ORG-12：勿要求仓库访问信息，产出预算=结论表+分项证据。

## 票面

F-GEOM-01-G11 战役收官票（registry :302，[locked-change]）五义务：头注
扫尾+净删/交互点记账报告+验收门全跑（e2e 归主控收口序）+INV 终册+指纹门
基线重冻结；母票 F-GEOM-01 随本票翻 done（翻票=主控收口，不在本审面）。
实现者=ops-executor（GLM5.3flash $max），报告=scripts/audits/g11-impl-report.md。

## 改动面（六文件）

| 文件 | ±行 | 内容 |
| --- | --- | --- |
| src/renderer/features/reader/view/PdfPageCanvas.tsx | +5/−3 | G1 期陈旧头注重写（注释级——旧句「受锁测试旧路径零触十处」替换为现行 9 处消费面实测清单） |
| docs/invariants.md | 42 行 | ①11 处 features/reader/<平铺>→域前缀；②INV-47/58/68 声明处裸名加前缀；③新「路径口径」小节（:93-99）；④§5.4 相容确认三注记 |
| docs/reports/2026-09-18_f-geom01-campaign-closeout.md | +138/−14 | 骨架→记账报告真身（净删双口径+构成分析+交互点表+验收门+对账债销项；e2e 段留占位归主控） |
| scripts/audits/g10-oneway.mjs | +3 | 探针头注补谓词盲区限制说明（G10 门二 P2-2 销项） |
| scripts/test-surface.baseline.json | 679 行 | 基线重冻结 183/1757/5334→187/1789/5411 |
| locks/manifest.json | 16 行 | 新探针两件入锁（368→370）+invariants/oneway/baseline 重锁 |

新增未跟踪件（不入 patch，可直读）：scripts/audits/g11-netstat.mjs（152 行）、
g11-inv-anchor-check.mjs（80 行）、g11-impl-brief.md、g11-impl-report.md、
g11-*.log（netstat/inv-anchor-check/impl-verify/build-hash/anchored-net/
baseline-diff 五证据 log）。

## 待审断言（逐项成立性+越表动作扫描）

A. **零行为断言**：src 改动=纯注释行（PdfPageCanvas ±行全 `//`）——构建产物
   三件同名同尺寸恒等（g11-build-hash.log：index-D3egZtl2.js 1,402,437 字节
   +index-BfpEygSE.css 59,923 字节+pdf.worker.min-yatZIOMy.mjs）——与 G2~G10
   恒等链第七票基线逐字节同（e2e flake 因果排除承重前提）。
B. **INV 刷新正确性**：11 处域前缀映射逐处对（域归属可用 `ls
   src/renderer/features/reader/<域>/` 直读核）；INV-68 行号锚 13 处现行
   文件逐行含符号（g11-inv-anchor-check.log 全 PASS——可抽核 3+ 处）；
   「路径口径」小节与 b12 门二 P2-2 悬置项销项语义对合。
C. **记账报告数字**：域分组表（71 files/+313/−309/净+4）与逐票表（Σ+428/
   −424=+4）自洽且与 `git diff --numstat c05e2ff8dd..62ef3802ad -- src/
   renderer/features/reader` 可复算（你无 Bash——以 g11-netstat.log 输出+
   .mjs 源码逻辑审；主控已独立跑 git diff --stat 复核=71 files +313/−309）；
   wc 双口径：70 文件/11,815 行 vs af946a5324 基线 69 文件/11,791 行=
   Δ+1f/+24 行；设计书 11,860=+69 无尾换行口径差机制（抽验=G10 13 件
   1776 vs 设计书 1789 恰+13 复现在 §5.1）。
D. **基线重冻结**：同值冻结 187/1789/5411/skip15（cur=冻结值逐位一致——
   零测试面变更票的预期态）；test-surface:check 绿；exemptions 2 条 stale
   零动作（处置权留主控——审其「不扩豁免」是否成立）。
E. **报告诚实性**：净+4 vs 预测−20~−80 构成分析逐项可核（G2 删 61 兑现
   预测 50~60；增侧五项=geometry-types 超预测+43/G2 增 24/G3 增 26/G1
   其余+37/迁移票等量交换）；简报数字勘正申报（「G3 +33/−18 未能复现」
   按实测落笔）是否如实。
F. **红线**：tests/**、tickets/registry.ts、src 非注释行、relay.md、
   b22-recovery-verify.log 零触碰（patch 面+git status 双核）。
G. **自裁清单七条**（g11-impl-report.md §6）：探针 v1→v2 判定收窄/共享
   unlock 周期/INV-58 page-items.store 后缀补全/简报数字勘正/log 重写/
   步骤 6 先于 5/exemptions 处置留主控——逐条裁「成立/越权」。
H. **头注重写内容真伪**：PdfPageCanvas 新注释 9 处消费面清单
   （text-layer:41/pdf-item-geometry:18/anchor-item-verify:33/annotation-
   layer:21/ai-annotation-layer:25/pages-overlay:30/band-calibration:35/
   reader-search-text:21+pdf-page-canvas.test:23）——抽核 ≥3 处现行
   tests 文件该行确为对本件的 import。

## 审计基线数字（供对账）

- verify：g11-impl-verify.log EXIT=0（Test Files 170/Tests 1744/locks 370/
  tickets 206 票全绿——open 10 未翻票态）。
- 锚定回归网：18 文件/211 用例绿（g11-anchored-net.log）。
- e2e 默认门+一键全跑：主控收口序跑（不在本审面；结果回填报告 §3 占位）。

## 产出

PASS / PASS_WITH_WARNINGS / FAIL + B/W/N 分级清单（B=阻断/W=警告需处置/
N=注记）+逐项证据行号。报告落 scripts/audits/g11-gate1-report.md 由主控
代为归档（你无写通道——最终答复中给全文即可）。
