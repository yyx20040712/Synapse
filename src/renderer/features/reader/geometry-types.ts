/**
 * [F-GEOM-01-G1] M0 类型下沉切环——立案骨架（票面载体）。
 *
 * 目标：几何类型单源本件（设计书 §3.3——docs/design/
 * 2026-09-18_f-geom01-unification-and-reader-subdomains.md）：
 * 落 PdfTextItem/PdfTextStyle/PdfTextContent/PdfPageGeometry（现驻
 * PdfPageCanvas.tsx:38-77）+PixelBox（annotation-anchor）+RowBand
 * （annotation-resolve）+COLUMN_GAP_H_FACTOR/COLUMN_GAP_PAGE_RATIO
 * （pdf-item-geometry——常量与类型同居 anchors 语义位）。
 * 红线：零文件移动（目录迁移归 F-GEOM-01-G6）；PdfPageCanvas 保留
 * export type 再导出（受锁测试旧路径 import 零触——M0 无受锁面）；
 * 切断三处 type-only 环+page-items.store/reader-search.store 两
 * store→PdfPageCanvas 边改 import 本件+annotation-anchor 的
 * COLUMN_GAP 值 import 改向本件（anchors 域内最终无环）。
 * 裁决与排程序：设计书 §5.3 切分（G1）+复杂度治理裁决书 §3 梯队三；
 * 排期=docs/handoff/relay.md 第四波子项 G1。
 * 实现者领票时本骨架改写为真实现（验收=unit 全绿+typecheck+verify
 * 全链；变异红证=删 PdfPageCanvas 再导出→旧路径 import 编译红→还原）。
 */
export {}
