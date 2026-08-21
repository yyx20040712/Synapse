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
