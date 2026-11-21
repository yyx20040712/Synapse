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

/**
 * 正文下带不透明底色的单页变体：先绘 RGB(248,248,248) 全页矩形，再绘已知文本。
 * 保留真实文本层，用于验证 PDF 自绘背景不会遮住其上的标注与搜索高亮。
 */
export function createOpaqueBackgroundPdf(text = PDF_KNOWN_TEXT): Uint8Array {
  const stream = `q 0.972549 0.972549 0.972549 rg 0 0 612 792 re f Q\nBT /F1 18 Tf 72 720 Td (${esc(text)}) Tj ET`
  const streamBytes = new TextEncoder().encode(stream).length
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>',
    `<< /Length ${streamBytes} >>\nstream\n${stream}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    `<< /Title (${esc(text)}) /Producer (synapse-test-factory) >>`
  ]
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
/** [F-SELBLK-01] 块分割样本哨兵（页眉/页脚=页级 fullSpan；caption=左栏段块净空） */
export const PDF_TWOCOL_HEADER = 'TWOCOL TEST RUNNING HEAD'
export const PDF_TWOCOL_FOOTER = 'TWOCOL TEST PAGE FOOT'
export const PDF_TWOCOL_CAPTION = 'LCOL CAPTION SAMPLE'
/** 中缝几何单源（栏检测断言=中缝净空带 [left,right]，中线 mid——pt，用户空间） */
export const PDF_TWOCOL_GUTTER = { left: 294, right: 318, mid: 306 } as const

/** 粗估 Helvetica 文本宽度（0.5×字号×字符数——fixture 只求水平居中近似，
 *  真实宽度由 pdfjs 量测；居中目的是让页眉/页脚 x 包络跨页级中缝） */
function approxTextWidth(text: string, size: number): number {
  return text.length * size * 0.5
}

/** 单行文本内容流片段（基线 y、字号 size、左缘 x；esc 防括号/反斜杠） */
function textLine(text: string, size: number, x: number, y: number): string {
  return `BT /F1 ${size} Tf ${x} ${y} Td (${esc(text)}) Tj ET`
}

/**
 * 双栏变体（0C：全宽标题+左右栏哨兵行——选区票双栏几何的 gating fixture）。
 * 几何口径：612×792 页；全宽标题带基线 y=740（栏体之上）；左栏 x=54..294、
 * 右栏 x=318..558（各宽 240pt），中缝 294..318=24pt 净空（结构上零文本交叉
 * ——栏检测断言的单源依据）；正文 Helvetica 10、行距 16，两栏各 11 行
 * （哨兵+ROW 01-10，行基线 700..540）。文本坐标=PDF 用户空间 y-up
 * （getTextContent item.transform[4]/[5]）；e2e 消费经 viewport 换算。
 * 对象布局同 createTinyPdf（1=Catalog 2=Pages 3=Page 4=Contents 5=Font）。
 *
 * [F-SELBLK-01] 块分割样本扩展（沿设计稿 §6）：
 * - 页眉 `TWOCOL TEST RUNNING HEAD` font 8 基线 764 水平居中（x 包络跨页级
 *   中缝 → 页级 fullSpan）；
 * - 左栏 caption `LCOL CAPTION SAMPLE` font 8 基线 588 x=54；左栏 ROW 07-10
 *   基线 560/544/528/512（避让 caption——段前净空+字号簇双信号）；
 * - 页脚 `TWOCOL TEST PAGE FOOT` font 8 基线 60 水平居中（页级 fullSpan）。
 * 页面尺寸/标题/两栏哨兵行坐标不动（既有 e2e 几何断言零改）。
 */
export function createTwoColumnPdf(): Uint8Array {
  const centeredX = (text: string, size: number): number => (612 - approxTextWidth(text, size)) / 2
  const rows: string[] = [
    textLine(PDF_TWOCOL_TITLE, 18, 72, 740),
    textLine(PDF_TWOCOL_HEADER, 8, centeredX(PDF_TWOCOL_HEADER, 8), 764),
    textLine(PDF_TWOCOL_FOOTER, 8, centeredX(PDF_TWOCOL_FOOTER, 8), 60)
  ]
  const rowLine = (prefix: string, n: number, y: number): string =>
    textLine(`${prefix} ROW ${String(n).padStart(2, '0')}`, 10, prefix === 'LCOL' ? 54 : 318, y)
  // 左栏：哨兵+ROW 01-06（基线 684..604）→ caption（font 8 基线 588）→ ROW
  // 07-10 下移避让（基线 560/544/528/512）——段前 8pt/段后 18pt 双净空+字号簇变
  rows.push(textLine(PDF_TWOCOL_LEFT, 10, 54, 700))
  for (let i = 1; i <= 6; i += 1) rows.push(rowLine('LCOL', i, 700 - i * 16))
  rows.push(textLine(PDF_TWOCOL_CAPTION, 8, 54, 588))
  for (let i = 7; i <= 10; i += 1) rows.push(rowLine('LCOL', i, 560 - (i - 7) * 16))
  // 右栏：哨兵+ROW 01-10（基线 700..540，行距 16 间隙 6 不分裂）
  rows.push(textLine(PDF_TWOCOL_RIGHT, 10, 318, 700))
  for (let i = 1; i <= 10; i += 1) rows.push(rowLine('RCOL', i, 700 - i * 16))
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

// ── [B1-U1 A1–A5] 选区正确性战役合成配方（2026-11-21；探针 b1-probe 真实页
//    形态的合成等价物——真实整篇 PDF 不入库，几何契约由单测断言锚定）──

/** A2 双栏窄缝页：缝带单源（pt，用户空间——左栏文本右缘至右栏恒起 x）。
 *  左栏行文本（60 字符）实测宽 ≈206–245pt（右缘 ≤300）→ 行内缝 = 318−右缘
 *  ≥18pt > 断段阈值 max(1.5×行高8, 2%×612)=12.24pt——当前 mergeRects 无缝
 *  感知必并（红证据）、修复后单源断段必裂（绿）的判别几何。右栏恒起 x=318
 *  （同 0C fixture）。实测真 pdfjs 对本 fixture 不在栏间插空白补位项（相邻
 *  项不同基线不合并——12 项=12 个 Tj 原样）。 */
export const PDF_GAPCOL_GUTTER = { right: 318, rows: 6 } as const
/** A2 哨兵（行前缀——DOM/项序断言用） */
export const PDF_GAPCOL_LEFT = 'LGAP SENTINEL HEAD'
export const PDF_GAPCOL_RIGHT = 'RGAP SENTINEL HEAD'

/** A2 左栏行文本（60 字符：哨兵行前缀大写较宽 ≈245pt、正文行 ≈206pt——
 *  右缘 [260,300] 恒 <318−断段阈值 12.24，行内缝 [18,58]pt 恒 > 断段阈值） */
function gapcolLeftRow(n: number): string {
  const body = 'cross column merge gutter probe line filler text unit '
  return `${n === 0 ? PDF_GAPCOL_LEFT : 'lgap row'} ${String(n).padStart(2, '0')} ${body}`.slice(0, 60)
}

/**
 * A2 双栏窄缝页（同视觉行左右栏+可测缝——跨栏行 x 并集判别 fixture）。
 * 612×792 单页：6 个视觉行（基线 700..640、行距 12、字号 8），每行=左栏
 * 长行（x=54..≤294）+右栏短行（x=318..）——每行左右项基线相同（同一
 * 基线分组行），缝带 [左栏右缘,318] ≥24pt。DOM/项序=列序（左列 6 行先、
 * 右列 6 行后——真实双栏 PDF 的内容流形态）。对象布局同 createTinyPdf。
 */
export function createTwoColumnGapPdf(): Uint8Array {
  const rows: string[] = []
  for (let i = 0; i < PDF_GAPCOL_GUTTER.rows; i += 1) {
    rows.push(textLine(gapcolLeftRow(i), 8, 54, 700 - i * 12))
  }
  rows.push(textLine(PDF_GAPCOL_RIGHT, 8, 318, 700))
  for (let i = 1; i < PDF_GAPCOL_GUTTER.rows; i += 1) {
    rows.push(textLine(`rgap row ${String(i).padStart(2, '0')}`, 8, 318, 700 - i * 12))
  }
  const stream = rows.join('\n')
  const streamBytes = new TextEncoder().encode(stream).length
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>',
    `<< /Length ${streamBytes} >>\nstream\n${stream}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    `<< /Title (GAPCOL TEST DOC) /Producer (synapse-test-factory) >>`
  ]
  return assemblePdf(objects)
}

/** A3 公式页哨兵（上下标/正文片段——项形态断言用同一字符串） */
export const PDF_FORMULA_HEAD = 'R(t)='
export const PDF_FORMULA_SUP = 'n'
export const PDF_FORMULA_TAIL = 'k+1'
export const PDF_FORMULA_SUB = 'i'
/** 公式行基线（pt，用户空间 y-up）；上下标基线偏移 ±3pt（真实页 5.18px vs
 *  7.97px 字号分离+独立基线的合成等价物） */
export const PDF_FORMULA_BASELINE = { y: 700, supDy: 3, subDy: -3, bodySize: 8, scriptSize: 5 } as const

/**
 * A3 公式页（上下标独立基线+行内大空隙+缝内空白项——碎片形态 fixture）。
 * 612×792 单页：公式行（基线 700）= 正文片段 `R(t)=`（fs8 x=72）+ 上标 `n`
 * （fs5 x=94 基线 703）+ 空白项 `  `（fs8 x=110——行内空隙内的纯空白项）+
 * 正文片段 `k+1`（fs8 x=140）+ 下标 `i`（fs5 x=158 基线 697）；片段间行内
 * 空隙 ≥8pt（真实页 caret 落容器槽位的行内大空隙形态）。下方 4 行正文
 * （基线 660..600、fs8 x=54——槽位重定向「偏移区间爆炸」的目标行族）。
 * 对象布局同 createTinyPdf。
 */
export function createFormulaPagePdf(): Uint8Array {
  const { y, supDy, subDy, bodySize, scriptSize } = PDF_FORMULA_BASELINE
  const rows: string[] = [
    textLine(PDF_FORMULA_HEAD, bodySize, 72, y),
    textLine(PDF_FORMULA_SUP, scriptSize, 94, y + supDy),
    textLine('  ', bodySize, 110, y),
    textLine(PDF_FORMULA_TAIL, bodySize, 140, y),
    textLine(PDF_FORMULA_SUB, scriptSize, 158, y + subDy)
  ]
  for (let i = 0; i < 4; i += 1) {
    rows.push(textLine(`FORMULA BODY LINE ${String(i).padStart(2, '0')}`, bodySize, 54, 660 - i * 20))
  }
  const stream = rows.join('\n')
  const streamBytes = new TextEncoder().encode(stream).length
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>',
    `<< /Length ${streamBytes} >>\nstream\n${stream}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    `<< /Title (FORMULA PAGE TEST DOC) /Producer (synapse-test-factory) >>`
  ]
  return assemblePdf(objects)
}

/** A5 角标页哨兵（行首上标 a–c 与机构正文行——微缝几何断言用） */
export const PDF_AFFIL_SUPS = ['a', 'b', 'c'] as const
/** 角标几何单源：上标 fs5 x=54、正文 fs8 x=58.5（缝 ≈1.5pt——真实页 1.5px
 *  微缝的合成等价物：上标列与正文列被检测为缝带=该点不授权的设计语义） */
export const PDF_AFFIL_GEOM = { supX: 54, bodyX: 58.5, supSize: 5, bodySize: 8, rows: 3, pitch: 16, baseY: 700 } as const

/**
 * A5 角标页（行首上标 a–c+机构正文列微缝——角标独立块/微缝 fixture）。
 * 612×792 单页：3 个视觉行（基线 700/684/668），每行=行首上标单字
 * （fs5 x=54）+机构正文行（fs8 x=58.5，缝 ≈1.5pt）。DOM/项序=行序（上标
 * 项在正文项之前——阅读序=流序）。对象布局同 createTinyPdf。
 */
export function createSuperscriptAffilPdf(): Uint8Array {
  const rows: string[] = []
  for (let i = 0; i < PDF_AFFIL_GEOM.rows; i += 1) {
    const y = PDF_AFFIL_GEOM.baseY - i * PDF_AFFIL_GEOM.pitch
    rows.push(textLine(PDF_AFFIL_SUPS[i]!, PDF_AFFIL_GEOM.supSize, PDF_AFFIL_GEOM.supX, y))
    rows.push(textLine(`AFFILIATION LINE ${String(i).padStart(2, '0')} DEPT`, PDF_AFFIL_GEOM.bodySize, PDF_AFFIL_GEOM.bodyX, y))
  }
  const stream = rows.join('\n')
  const streamBytes = new TextEncoder().encode(stream).length
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>',
    `<< /Length ${streamBytes} >>\nstream\n${stream}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    `<< /Title (AFFIL SUPERSCRIPT TEST DOC) /Producer (synapse-test-factory) >>`
  ]
  return assemblePdf(objects)
}

// ── [B1-U3 单元 5/6] 绘制链缺陷配方（2026-11-21；探针 b1-probe2 定谳形态的
//    合成等价物——红测试见 selection-b1-u3-*.test.ts，规格=设计稿单元 5/6）──

/** R1 公式链行几何单源：正文 fs8/碎片 fs6.5、行距 pitch 16pt；链行碎片 vProj
 *  台阶 3pt ≤ tol=max(2,0.5×6.5)=3.25（vTail 传递链并行形态——当前树把两行
 *  正文链成一行），链行左右段 x 缝 46.4pt > 断段阈值 1.5×行联合盒高 ≈38.7pt
 *  （行内断段→两段带垂直域交叠=双绘判别几何）。 */
export const PDF_CHAIN_GEOM = { bodySize: 8, scriptSize: 6.5, pitch: 16 } as const
export const PDF_CHAIN_BODY = 'state reward'
export const PDF_CHAIN_BODY2 = 'each control'

/**
 * R1 公式碎片链行页（探针 G5f 链行形态合成等价）。612×792 单页：
 * 链行区（基线 y_pdf 700/684，行距 16）= 左段（正文 `state reward` fs8@72+
 * 碎片 k/t/s fs6.5@124/132/140，vProj 89/92/95/98）+右段（碎片 j/i/u fs6.5@
 * 200/208/216，vProj 101/104/107+正文 `each control` fs8@214，vProj 108）
 * ——vProj 排序后相邻差全 ≤3.25=tol，groupByBaseline vTail 传递链把两行正文
 * 链成一行（vSpread 19>行距 16）；行内 x 缝 46.4pt 断成两段，两段带垂直域
 * [83.8,99.3]/[95.8,109.6] 交叠 3.5px=双绘形态。下方 2 行正文（基线 668/652
 * ——邻行对照，vProj 124/140 与链行差 16>tol 不并）。对象布局同 createTinyPdf。
 */
export function createFormulaChainPdf(): Uint8Array {
  const { bodySize: b, scriptSize: s } = PDF_CHAIN_GEOM
  // 流序=左段 4 项 → 邻行正文（基线 668——跨行项隔断 pdfjs 行内补位，防其
  // 以空白项桥接左右段 x 缝）→ 右段 4 项 → 末行正文。
  const rows = [
    textLine(PDF_CHAIN_BODY, b, 72, 700),
    textLine('k', s, 124, 703),
    textLine('t', s, 132, 697),
    textLine('s', s, 140, 694),
    textLine('Boundary inflow', b, 72, 668),
    textLine('j', s, 200, 691),
    textLine('i', s, 208, 688),
    textLine('u', s, 216, 685),
    textLine(PDF_CHAIN_BODY2, b, 224, 688),
    textLine('runoff volume', b, 72, 652)
  ]
  const stream = rows.join('\n')
  const streamBytes = new TextEncoder().encode(stream).length
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>',
    `<< /Length ${streamBytes} >>\nstream\n${stream}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    `<< /Title (FORMULA CHAIN TEST DOC) /Producer (synapse-test-factory) >>`
  ]
  return assemblePdf(objects)
}

/** R2 机构上标拆行几何单源：上标 fs5 抬升 3pt（vProj 差 3>tol=max(2,0.5×5)=
 *  2.5——被选项全小字时容差漂移拆行形态①）+上标/正文 x 缝 ≈1.7pt（mergeRects
 *  centerY 再并材料）。 */
export const PDF_AFFIL_SPLIT_GEOM = { supSize: 5, bodySize: 8, supRaise: 3, supX: 54, bodyX: 58.5, rows: 3, pitch: 16, baseY: 700 } as const

/**
 * R2 机构上标拆行页（探针 A5a 形态①合成等价——上标基线抬升版角标页）。
 * 612×792 单页：3 个视觉行（基线 700/684/668），每行=行首上标单字（fs5@54，
 * 基线抬升 +3pt）+机构正文行（fs8@58.5，同视觉行）。上标与正文 vProj 差 3pt
 * > tol 2.5（被选项 fontH 下中位=5 时）→ groupByBaseline 拆行；两块 centerY
 * 距 ≤ 容差 → mergeRects 再并=宽而矮杂交 rect → matchBand 吸上标窄带+
 * clampedHorizontal 压缩=正文零覆盖。DOM/项序=行序（上标项在正文项前）。
 * 对象布局同 createTinyPdf。
 */
export function createSuperscriptSplitPdf(): Uint8Array {
  const { supSize, bodySize, supRaise, supX, bodyX, rows, pitch, baseY } = PDF_AFFIL_SPLIT_GEOM
  const lines: string[] = []
  for (let i = 0; i < rows; i += 1) {
    const y = baseY - i * pitch
    lines.push(textLine(['a', 'b', 'c'][i]!, supSize, supX, y + supRaise))
    lines.push(textLine(`AFFILIATION SPLIT LINE ${String(i).padStart(2, '0')} DEPT`, bodySize, bodyX, y))
  }
  const stream = lines.join('\n')
  const streamBytes = new TextEncoder().encode(stream).length
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>',
    `<< /Length ${streamBytes} >>\nstream\n${stream}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    `<< /Title (AFFIL SPLIT TEST DOC) /Producer (synapse-test-factory) >>`
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
