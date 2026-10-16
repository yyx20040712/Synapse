/**
 * 测试基建：最小 PDF 工厂（受锁文件）。
 * 生成只含一页、Helvetica 单行文本的合法 PDF（无需外部依赖）。
 * 文本内容约定：SMART WATER TEST DOC（e2e reader-text 断言用同一字符串）。
 * 〔F-VISFB-43 裁决部 P1-2〕+二进制流装配面（PdfObject={header,stream}——
 * image XObject 原始字节嵌入）+createRasterFigurePdf（raster 图表 e2e fixture）。
 */

/** 二进制流对象（image XObject 等——header=对象字典，stream=原始字节） */
export interface PdfBinaryObject {
  header: string
  stream: Uint8Array
}

/** 工厂对象元（纯字符串对象沿用 string 形态——既有调用零改动） */
export type PdfObject = string | PdfBinaryObject
export const PDF_KNOWN_TEXT = 'SMART WATER TEST DOC'

export function createTinyPdf(text = PDF_KNOWN_TEXT): Uint8Array {
  const objects = buildPdfObjects(text)
  return assemblePdf(objects)
}

function esc(s: string): string {
  return s.replaceAll('\\', '\\\\').replaceAll('(', '\\(').replaceAll(')', '\\)')
}

function buildPdfObjects(text: string): string[] {
  const stream = `BT /F1 18 Tf 72 720 Td (${esc(text)}) Tj ET`
  // /Length 是字节数：中文等非 ASCII 场景下必须按 UTF-8 字节计（按字符计会错位）
  const streamBytes = new TextEncoder().encode(stream).length
  return [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>',
    `<< /Length ${streamBytes} >>\nstream\n${stream}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    `<< /Title (${esc(text)}) /Producer (synapse-test-factory) >>`
  ]
}

function assemblePdf(objects: PdfObject[]): Uint8Array {
  // xref 偏移一律按 UTF-8 字节累计（字符数在含中文时不等于字节数）
  const enc = new TextEncoder()
  const parts: Uint8Array[] = []
  let byteLen = 0
  const push = (s: string | Uint8Array): void => {
    const b = typeof s === 'string' ? enc.encode(s) : s
    parts.push(b)
    byteLen += b.length
  }
  push('%PDF-1.4\n')
  const offsets: number[] = []
  objects.forEach((body, i) => {
    offsets.push(byteLen)
    if (typeof body === 'string') {
      push(`${i + 1} 0 obj\n${body}\nendobj\n`)
    } else {
      // 二进制流对象：stream 关键字后单换行（PDF 规范——流数据起讫按字节计）
      push(`${i + 1} 0 obj\n${body.header}\nstream\n`)
      push(body.stream)
      push('\nendstream\nendobj\n')
    }
  })
  const xrefStart = byteLen
  push(`xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`)
  for (const off of offsets) {
    push(`${String(off).padStart(10, '0')} 00000 n \n`)
  }
  push(`trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`)
  const out = new Uint8Array(byteLen)
  let cursor = 0
  for (const part of parts) {
    out.set(part, cursor)
    cursor += part.length
  }
  return out
}

/**
 * 多页变体（AI-02：CorpusExtractor 多页提取测试——页序/逐页回传断言用）。
 * 每页单行文本 `P<n> <text>`（页序可断言）。对象布局：1=Catalog 2=Pages
 * 3..p+2=Page  p+3..2p+2=Contents  2p+3=Font（数组序=id 序）。
 */
export function createMultiPagePdf(pages: number, text = PDF_KNOWN_TEXT): Uint8Array {
  const kids: string[] = []
  for (let n = 1; n <= pages; n += 1) kids.push(`${2 + n} 0 R`)
  const objects: string[] = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    `<< /Type /Pages /Kids [${kids.join(' ')}] /Count ${pages} >>`
  ]
  for (let n = 1; n <= pages; n += 1) {
    objects.push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 ${2 * pages + 3} 0 R >> >> /Contents ${pages + 2 + n} 0 R >>`
    )
  }
  for (let n = 1; n <= pages; n += 1) {
    const stream = `BT /F1 18 Tf 72 ${720 - (n - 1) * 24} Td (P${n} ${esc(text)}) Tj ET`
    const streamBytes = new TextEncoder().encode(stream).length
    objects.push(`<< /Length ${streamBytes} >>
stream
${stream}
endstream`)
  }
  objects.push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>')
  return assemblePdf(objects)
}

/** 多行已知文本（F-A1 e2e 多行划选——每行 ASCII 单 run 可 getByText 单节点命中） */
export const PDF_MULTILINE_TEXT = [
  'MULTILINE ALPHA ROW',
  'MULTILINE BETA ROW',
  'MULTILINE GAMMA ROW'
] as const

/**
 * 多行变体（F-A1：标注矩形归并 e2e——单页 3 行，跨行划选的承载 fixture）。
 * 几何口径（2026-08-30 双轮实测勘误，t4 探针在档：Td 18 并簇 1 块/Td 20
 * 与 Td 24 并簇行为相同——均不跨行并簇，钳制后行间距同=H 相切）：跨行
 * Range 行盒高 H≈34.1px（归一化 0.0323，1056px
 * 页高）；Td 24=32px 行间距<H → 原始 -2.1px 负重叠（T4 态——归并器行间钳制
 * 真实触发：归并后行间距恰=H 相切，savedRects y 间隔 0.0324≈h+0.0001）；
 * mergeLineRects 并簇阈 0.25×H≈8.5px，2.1px 余量充足。历史勘误：原头注
 * 「行盒高 25.6px/-1.6px 负间隙」数值口径错——25.6 是另一计量（span/选区
 * 框），Range 行盒实为 34.1；deepseek 补审 W1 沿用 25.6 推出「正间隙/T4
 * 虚假」结论随之翻案（T4 锚成立）。禁区：Td≤19.2（行距 ≤25.6px，重叠
 * ≥8.5 阈；Td 18 实测并簇 1 块）触发跨行并簇——INV-40 同族。Chromium 跨 absolute span 的
 * Range 实测产「每行盒+边界零宽幽灵+行内 h 双计量同位块」——与真实 PDF
 * 缺陷族同构。
 * 对象布局同 createTinyPdf（1=Catalog 2=Pages 3=Page 4=Contents 5=Font）。
 */
export function createMultiLinePdf(lines: readonly string[] = PDF_MULTILINE_TEXT): Uint8Array {
  const parts = lines.map(
    (line, i) => `BT /F1 18 Tf 72 ${720 - i * 24} Td (${esc(line)}) Tj ET`
  )
  const stream = parts.join('\n')
  // /Length 是字节数（与 buildPdfObjects 同口径按 UTF-8 字节计）
  const streamBytes = new TextEncoder().encode(stream).length
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>',
    `<< /Length ${streamBytes} >>\nstream\n${stream}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    `<< /Title (${esc(lines[0] ?? '')}) /Producer (synapse-test-factory) >>`
  ]
  return assemblePdf(objects)
}

/** 组合页已知文本（F-A6-d e2e 旋转×CropBox 小票——reader-text 断言用同一字符串） */
export const PDF_ROTATED_CROP_TEXT = 'ROTATED CROP TEST DOC'

/**
 * 旋转×CropBox 组合页变体（F-A6-d 收口票：/Rotate 90 + /CropBox [36 36 540 720]
 * ——T1 页旋转×T9 非零原点双病理叠加）。b1 门一 N3 已知边界兑现：单测各半边
 * 独立锚（text-layer.test 旋转态/CropBox 态分列用例），组合面由本 fixture 的
 * e2e 小票收口（scripts/audits/f-a6-forensic-verdict.md §10 已知边界段）。
 * 行基线 y=640：CropBox 顶缘 720 内侧 80pt——避开「基线贴顶缘致字形 ascent
 * 越出裁剪盒」的检出口径差伪迹（§10 s2crop outside 1/8 归因段）；x=72 为
 * 左缘 36 内侧 36pt。对象布局同 createTinyPdf（1=Catalog 2=Pages 3=Page
 * 4=Contents 5=Font）。
 */
export function createRotatedCropPdf(text = PDF_ROTATED_CROP_TEXT): Uint8Array {
  const stream = `BT /F1 18 Tf 72 640 Td (${esc(text)}) Tj ET`
  // /Length 是字节数（与 buildPdfObjects 同口径按 UTF-8 字节计）
  const streamBytes = new TextEncoder().encode(stream).length
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /CropBox [36 36 540 720] /Rotate 90 /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>',
    `<< /Length ${streamBytes} >>\nstream\n${stream}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    `<< /Title (${esc(text)}) /Producer (synapse-test-factory) >>`
  ]
  return assemblePdf(objects)
}

/** 双栏 fixture 哨兵（0C——52 指针授权/53 闪烁收口票的 gating 前置） */
export const PDF_TWOCOL_TITLE = 'TWOCOL TEST DOC TITLE'
export const PDF_TWOCOL_LEFT = 'LCOL SENTINEL ALPHA'
export const PDF_TWOCOL_RIGHT = 'RCOL SENTINEL OMEGA'
/** 中缝几何单源（栏检测断言=中缝净空带 [left,right]，中线 mid——pt，用户空间） */
export const PDF_TWOCOL_GUTTER = { left: 294, right: 318, mid: 306 } as const

/**
 * 双栏变体（0C：全宽标题+左右栏哨兵行——选区票双栏几何的 gating fixture）。
 * 几何口径：612×792 页；全宽标题带基线 y=740（栏体之上）；左栏 x=54..294、
 * 右栏 x=318..558（各宽 240pt），中缝 294..318=24pt 净空（结构上零文本交叉
 * ——栏检测断言的单源依据）；正文 Helvetica 10、行距 16，两栏各 11 行
 * （哨兵+ROW 01-10，行基线 700..540）。文本坐标=PDF 用户空间 y-up
 * （getTextContent item.transform[4]/[5]）；e2e 消费经 viewport 换算。
 * 对象布局同 createTinyPdf（1=Catalog 2=Pages 3=Page 4=Contents 5=Font）。
 */
export function createTwoColumnPdf(): Uint8Array {
  const rows: string[] = [`BT /F1 18 Tf 72 740 Td (${esc(PDF_TWOCOL_TITLE)}) Tj ET`]
  const column = (prefix: string, sentinel: string, x: number): string[] =>
    [sentinel, ...Array.from({ length: 10 }, (_, i) => `${prefix} ROW ${String(i + 1).padStart(2, '0')}`)].map(
      (line, i) => `BT /F1 10 Tf ${x} ${700 - i * 16} Td (${esc(line)}) Tj ET`
    )
  rows.push(...column('LCOL', PDF_TWOCOL_LEFT, 54))
  rows.push(...column('RCOL', PDF_TWOCOL_RIGHT, 318))
  const stream = rows.join('\n')
  // /Length 是字节数（与 buildPdfObjects 同口径按 UTF-8 字节计）
  const streamBytes = new TextEncoder().encode(stream).length
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>',
    `<< /Length ${streamBytes} >>\nstream\n${stream}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    `<< /Title (${esc(PDF_TWOCOL_TITLE)}) /Producer (synapse-test-factory) >>`
  ]
  return assemblePdf(objects)
}

/** [F-VISFB-43 裁决部 P1-2] raster 图表 fixture 哨兵（e2e 断言用同一字符串） */
export const PDF_RASTER_TITLE = 'RASTER FIGURE E2E DOC'
/** 内嵌图像几何单源：400×300px DeviceRGB 绘制在 300×225pt——提取三阈值全过
 *  （pxArea=120000≥60000/pxMinEdge=300≥96/ctmArea=67500≥3600——00B 阈值面） */
export const PDF_RASTER_FIGURE = { widthPx: 400, heightPx: 300, widthPt: 300, heightPt: 225 } as const

/**
 * raster 图表变体（F-VISFB-43 裁决部 P1-2：导入→提取→naturalWidth>0 正向
 * e2e 的 gating fixture）。单页 612×792：内嵌一枚未压缩 DeviceRGB image
 * XObject（400×300，8bpc，横向红梯度×纵向绿梯度——位图内容非平凡），
 * 内容流 `q 300 0 0 225 100 100 cm /Im0 Do Q`（绘制几何=PDF_RASTER_FIGURE）。
 * 对象布局：1=Catalog 2=Pages 3=Page 4=Contents 5=Image 6=Info（数组序=id 序）。
 * kind 断言依据：无 SMask 的 DeviceRGB 经 pdf.js 解码=RGB_24BPP（figure-decode
 * kind2 面）；三阈值由 figure-ctm isQualifyingFigure 判入（400×300/300×225pt）。
 */
export function createRasterFigurePdf(): Uint8Array {
  const { widthPx: w, heightPx: h } = PDF_RASTER_FIGURE
  const rgb = new Uint8Array(w * h * 3)
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      const o = (y * w + x) * 3
      rgb[o] = Math.round((x * 255) / (w - 1))
      rgb[o + 1] = Math.round((y * 255) / (h - 1))
      rgb[o + 2] = 160
    }
  }
  const enc = new TextEncoder()
  const content = enc.encode(`q\n${String(PDF_RASTER_FIGURE.widthPt)} 0 0 ${String(PDF_RASTER_FIGURE.heightPt)} 100 100 cm\n/Im0 Do\nQ`)
  const objects: PdfObject[] = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /XObject << /Im0 5 0 R >> >> /Contents 4 0 R >>',
    { header: `<< /Length ${String(content.length)} >>`, stream: content },
    {
      header: `<< /Type /XObject /Subtype /Image /Width ${String(w)} /Height ${String(h)} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Length ${String(rgb.length)} >>`,
      stream: rgb
    },
    `<< /Title (${PDF_RASTER_TITLE}) /Producer (synapse-test-factory) >>`
  ]
  return assemblePdf(objects)
}
