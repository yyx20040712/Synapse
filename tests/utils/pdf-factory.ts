/**
 * 测试基建：最小 PDF 工厂（受锁文件）。
 * 生成只含一页、Helvetica 单行文本的合法 PDF（无需外部依赖）。
 * 文本内容约定：SMART WATER TEST DOC（e2e reader-text 断言用同一字符串）。
 */
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

function assemblePdf(objects: string[]): Uint8Array {
  // xref 偏移一律按 UTF-8 字节累计（字符数在含中文时不等于字节数）
  const enc = new TextEncoder()
  const parts: Uint8Array[] = []
  let byteLen = 0
  const push = (s: string): void => {
    const b = enc.encode(s)
    parts.push(b)
    byteLen += b.length
  }
  push('%PDF-1.4\n')
  const offsets: number[] = []
  objects.forEach((body, i) => {
    offsets.push(byteLen)
    push(`${i + 1} 0 obj\n${body}\nendobj\n`)
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
