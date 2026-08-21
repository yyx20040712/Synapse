import { expect, it } from 'vitest'
import { extractPdfMeta } from '../../../src/main/services/import_/pdf-meta.extract'
import { createTinyPdf } from '../../utils/pdf-factory'
import { guardedDescribe } from '../../utils/guard'

guardedDescribe('SR-SVC-04', 'pdf-meta.extract —— 真实 PDF 抽取', () => {
  it('从 Info 字典读标题；从首页文本抽 DOI', async () => {
    const text = 'DOI: 10.1234/test.567 关于智慧水务的研究 SMART WATER TEST'
    const bytes = createTinyPdf(text)
    const meta = await extractPdfMeta(bytes)
    expect(meta.title).toBe(text) // 工厂把文本同时写进 Info Title
    expect(meta.doi).toBe('10.1234/test.567')
  })

  it('arXiv id 识别（arXiv:2401.12345 形态）', async () => {
    const bytes = createTinyPdf('preprint arXiv:2401.12345v2 something')
    const meta = await extractPdfMeta(bytes)
    expect(meta.arxivId).toBe('2401.12345')
  })

  it('arXiv 裸 ID（无标注形态，前邻空格）', async () => {
    const bytes = createTinyPdf('see 2401.12345 for details')
    const meta = await extractPdfMeta(bytes)
    expect(meta.arxivId).toBe('2401.12345')
  })

  it('arXiv 裸 ID 不得咬 DOI 尾段：含 10.1234/2023.01234 的文本只出 doi 不出 arxivId', async () => {
    const bytes = createTinyPdf('DOI: 10.1234/2023.01234 water systems')
    const meta = await extractPdfMeta(bytes)
    expect(meta.doi).toBe('10.1234/2023.01234')
    expect(meta.arxivId).toBe(null)
  })

  it('Info 标题含未转义平衡括号（PDF 规范合法形态）：完整解析不放弃候选', async () => {
    // 工厂会转义括号，此形态必须手搓最小 PDF（魔数 + Info 字典 + 特征邻键）
    const pdf = new TextEncoder().encode(
      '%PDF-1.4\n<< /Title (A Review of Deep Learning (2020)) /Producer (synapse-test) >>\n%%EOF'
    )
    const meta = await extractPdfMeta(pdf)
    expect(meta.title).toBe('A Review of Deep Learning (2020)')
  })

  it('坏 PDF：不抛，返回全默认值', async () => {
    const meta = await extractPdfMeta(new Uint8Array([1, 2, 3]))
    expect(meta).toEqual({ title: '', authors: [], year: null, doi: null, arxivId: null })
  })

  it('年份识别（19xx/20xx 独立词）', async () => {
    const bytes = createTinyPdf('published in 2023 by journal')
    const meta = await extractPdfMeta(bytes)
    expect(meta.year).toBe(2023)
  })
})
