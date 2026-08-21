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
