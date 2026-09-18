/**
 * [F-GEOM-01-G1] geometry-types —— reader 几何类型/常量单一真相源（M0 类型
 * 下沉切环；设计书 §3.3——docs/design/
 * 2026-09-18_f-geom01-unification-and-reader-subdomains.md）。
 *
 * ── 行为层 ──
 * - 纯类型/常量载体：零运行时逻辑、零依赖（依赖图置底件）。
 *
 * ── 接口层 ──
 * - export interface PdfTextItem/PdfTextStyle/PdfTextContent/PdfPageGeometry/
 *   PixelBox/RowBand + export const COLUMN_GAP_H_FACTOR/COLUMN_GAP_PAGE_RATIO
 *   （常量与类型同居 anchors 语义位）。
 *
 * ── 架构层 ──
 * - anchors 语义位（设计书 §3.3）：被 pdf-item-geometry/annotation-anchor/
 *   annotation-resolve/PdfPageCanvas/page-items.store/reader-search.store
 *   消费；自身零 import 置底——切断三处 type-only 环（pig↔Canvas/anchor/
 *   resolve）+两 store→PdfPageCanvas type 边（G1 票面主目标）。
 *
 * ── 生命周期层 ──
 * - 零文件移动红线：目录迁移归 F-GEOM-01-G6/M3（届时本件随迁 anchors/）。
 *
 * ── 文化层 ──
 * - 消费面经旧路径再导出锚定（受锁测试零触）：pdf-item-geometry.test:18/
 *   band-calibration.test:32,35/anchor-item-verify.test:30/ai-annotation-
 *   layer.test:25。
 */

/**
 * 对外文本项类型：pdfjs TextItem 的结构子集（str/几何/变换，含行尾标记）。
 * 主入口未再导出 TextItem 类型，且边界上本文件应自持契约——消费方不 import pdfjs-dist
 */
export interface PdfTextItem {
  str: string
  dir: string
  width: number
  height: number
  transform: number[]
  fontName: string
  hasEOL: boolean
}

/**
 * 字体样式（pdfjs TextStyle 结构子集）：TextLayer 排版（ascent/descent）与
 * 文本朝向（vertical）计算必需，按 items 里的 fontName 索引
 */
export interface PdfTextStyle {
  fontFamily: string
  ascent: number
  descent: number
  vertical: boolean
}

/**
 * 页文本内容：TextLayer 生成可选中文本层的完整输入。styles 缺省会令其按
 * fontName 的样式查找拿到 undefined 而崩——集成期实证，不再是可省字段
 */
export interface PdfTextContent {
  items: PdfTextItem[]
  styles: Record<string, PdfTextStyle>
  lang: string | null
}

/**
 * 页几何通道（F-A6-b1 T1/T9 前置修复）：rotate=pdf.js page.rotate（/Rotate 值）；
 * view=pdf.js page.view（CropBox∩MediaBox，[x0,y0,x1,y1] PDF 用户空间）——
 * TextLayer duckViewport 的 rotation/rawDims 真值来源（与 canvas 渲染的
 * getViewport 同源，二者不再各执一词）。userUnit≠1 的页 view 未乘 userUnit
 * （官方 PageViewport.rawDims getter 会乘）——已知边界：真实库全档 userUnit=1
 * （f-a6-forensic-verdict §1），触发后另行扩展
 */
export interface PdfPageGeometry {
  rotate: number
  view: [number, number, number, number]
}

/** 像素矩形/基准盒（origin 为视口坐标，尺寸已做 ≥1 下限防除零） */
export interface PixelBox {
  x: number
  y: number
  w: number
  h: number
}

/** 行簇字形带（归一化域；center=带中心——渲染块匹配键；x0/x1=行簇 span
 *  实际端点——F-A5 a 面自绘块水平界夹取源，缺省=该带无端点量测；
 *  calTop/calBottom [F-A9]=渲染时刻 textLayer span 盒实测校准值（方案 A
 *  ——annotation-band-calibrate 注入；缺省=无校准材料回退派生值） */
export interface RowBand {
  top: number
  bottom: number
  center: number
  x0?: number
  x1?: number
  calTop?: number
  calBottom?: number
}

/** 簇内 x 大间隙断段阈值（[F-LINT-03] reader 几何单源真源驻本件——
 *  annotation-anchor/pdf-item-geometry 消费改 import；值域契约由两处
 *  测试锚定不变） */
export const COLUMN_GAP_H_FACTOR = 1.5
export const COLUMN_GAP_PAGE_RATIO = 0.02
