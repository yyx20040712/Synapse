# F-GEOM-01-G1 票面归档（F-GOV-01）

- id: F-GEOM-01-G1
- file: src/renderer/features/reader/anchors/geometry-types.ts
- area: reader
- owner: strong
- status: done

## summary 原文

M0 类型下沉切环（设计书 §3.3/§3.4；1/11）：新件=本 file（立案骨架，实现者领票时改写真身）落 PdfTextItem/PdfTextStyle/PdfTextContent/PdfPageGeometry（现驻 PdfPageCanvas.tsx:38-77）+PixelBox（annotation-anchor）+RowBand（annotation-resolve）+COLUMN_GAP_H_FACTOR/COLUMN_GAP_PAGE_RATIO（pdf-item-geometry——常量与类型同居 anchors 语义位）；PdfPageCanvas 保留 export type 再导出（受锁测试旧路径 import 零触——M0 无受锁面）；切断三处 type-only 环（pdf-item-geometry↔annotation-anchor/annotation-resolve/PdfPageCanvas）+两 store→PdfPageCanvas 边（page-items.store:37/reader-search.store:41 改 import 本件）+annotation-anchor 的 COLUMN_GAP 值 import 改向本件（anchors 域内最终无环）；红线=零文件移动（目录迁移归 G6）；验收=unit 全绿+typecheck+verify 全链（变异红证=删 PdfPageCanvas 再导出→旧路径 import type 在 tsc 关卡编译红——tsconfig.web.json include 含 tests/**/*.tsx 覆盖受锁测试→还原）【done 2026-09-18 batch 13：7 文件 +140/-110；三环+两 store 边切断终态全域核验；变异红证主证 TS2305×5+TS2459×27=32 错误行+副证 TS2724×3 双闭环；门一 PW B0W1N3（W1 计数勘误销）/门二 GO P0=0P1=0N=6；e2e 不跑=设计书 §3.4 M0 行口径（零运行时值变），父级 e2e 验收归 G11】

> 归档于 F-GOV-01（2026-09-28）；registry 主表已瘦身为结论句+本件指针
