# F-GEOM-01-G1 门一审档简报

> 审对象：M0 类型下沉切环（零行为变更重构票，F-GEOM-01 战役 1/11）
> 票面：tickets/registry.ts id='F-GEOM-01-G1'（行 292 附近）
> 设计书：docs/design/2026-09-18_f-geom01-unification-and-reader-subdomains.md §3.3/§5.3
> 实现者简报：scripts/audits/g1-impl-brief.md｜实现者报告：scripts/audits/g1-impl-report.md
> 审包：scripts/audits/g1-gate1-diff.patch（7 文件 +140/-110，全量 diff 无删节）
> 主控=GLM5.3 max（本会话）；实现者=ops-executor 绑定（GLM5.3flash $max）——与审位异构

## 声称（对抗审查靶面）

1. **改动面恰 7 文件**全在 src/renderer/features/reader/：geometry-types.ts（骨架→真身，
   四类型+PixelBox+RowBand+两常量逐字含注释迁入）、PdfPageCanvas/annotation-anchor/
   annotation-resolve（删定义+import 改向+`export type` 再导出）、pdf-item-geometry
   （三 type import 合并改向+常量删除改 import）、page-items.store/reader-search.store
   （type import 改向）。tests/** 零触；零文件移动；零新依赖；零 git 写。
2. **三环切断**：pig↔annotation-anchor（PixelBox type 边+COLUMN_GAP 值边双向消除）、
   pig↔annotation-resolve（RowBand type 边消除）、pig↔PdfPageCanvas（PdfTextItem/
   PdfTextStyle type 边消除——PdfPageCanvas→pig 的 clampScale 值边保留为合法单向）。
   两 store→PdfPageCanvas type 边消除（改 import geometry-types）。
3. **再导出=受锁测试零触机制**：PdfPageCanvas 再导出四类型（ai-annotation-layer.test:25/
   pdf-item-geometry.test:18/band-calibration.test:35 等旧路径）；annotation-anchor 再导出
   PixelBox（anchor-item-verify.test:30）；annotation-resolve 再导出 RowBand
   （band-calibration.test:32 `import { matchBand, type RowBand }`）。
4. **DoD**：typecheck EXIT=0；unit 170 文件/1745 用例全绿（基线零漂移）；lint EXIT=0；
   变异红证两条闭环——主证删 PdfPageCanvas 再导出→typecheck EXIT=2（TS2305×6+
   TS2459×27，含受锁测试宿主）→cp 还原 diff 空→复绿；副证删 PixelBox 再导出→
   TS2724×4（含 anchor-item-verify.test:30）→还原→复绿。raw 五件在
   scripts/audits/g1-*.log（.gitignore *.log 拦——收口 git add -f，batch 8 教训③先例）。
5. **实现者自裁 4 项**：①vitest 首跑 sqlite-abi 前置缺失红（环境前置，按 package.json
   test script 既有口径补 use node 后全绿，首跑红指纹留档报告§二1）；②变异错误码族
   TS2305/TS2459/TS2724 vs 票面预期 TS2305（同族同语义=成员缺失编译红）；③头注
   `*/` 注释缺陷一次当场自愈（终态零残留）；④证据 .log 与 .gitignore 冲突留主控裁量。

## 审查要点（对抗拷问面）

A. 搬迁保真：四类型/PixelBox/RowBand/两常量是否逐字迁移（含值 1.5/0.02 与字段全集）？
   有无借搬迁夹带语义变更（字段增删/可选性变化/注释篡改）？
B. 环切断主张真实性：pig 对 annotation-anchor/annotation-resolve/PdfPageCanvas 三向是否
   确已零 import（含 type）？annotation-anchor 对 pig 是否确已零边？两 store 对
   PdfPageCanvas 是否确已零边？geometry-types 自身是否零 import（置底）？
C. 再导出充分性：受锁测试旧路径（grep tests/ 全量核对 PixelBox/RowBand/PdfTextItem/
   PdfTextStyle/PdfTextContent/PdfPageGeometry 的 from 路径）是否全部经再导出覆盖？
   src 消费面（TextLayer:34 等）是否零改仍编译过？
D. 头注随迁义务：stale 句是否全数改准（pig:40-41/anchor:27+38/Canvas:18/page-items:29）？
   有无新引入的注释谎言？
E. 红线：tests/** 零触？零文件移动？无顺手改向（不改面清单=简报§二末段）？
F. 变异红证有效性：主/副证红是否真宿主于再导出删除（非无关红）？还原 diff 空有无在档？
G. 自裁项①的定性：sqlite-abi 前置=环境面非改动面缺陷——认可否？

## 产出要求

报告=对靶面逐项裁决（B blocker/W warning/N note 分级+证据行号）+终判
（PASS/PASS_WITH_WARNINGS/FAIL）。尾栏 `FINDINGS: B=<n>/W=<n>/N=<n>/VERDICT=<...>`。
