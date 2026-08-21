import { expect, it, vi } from 'vitest'
import { createOpenalexProvider } from '../../../../src/main/services/enrich/providers/openalex'
import { guardedDescribe } from '../../../utils/guard'

const openalexResponse = {
  results: [
    {
      id: 'https://openalex.org/W1',
      display_name: 'Urban water management review',
      publication_year: 2023,
      authorships: [{ author: { display_name: 'Chen Wei' } }, { author: { display_name: 'A. Kumar' } }],
      primary_location: { source: { display_name: 'Journal of Hydrology' } },
      doi: 'https://doi.org/10.1000/xyz',
      abstract_inverted_index: {
        water: [0, 5],
        management: [1],
        in: [2],
        cities: [3],
        matters: [4]
      },
      ids: { openalex: 'https://openalex.org/W1' }
    }
  ]
}

guardedDescribe('SR-NET-02', 'openalex provider —— byTitle 与倒排索引还原', () => {
  it('倒排索引按位置还原正文；doi 去前缀；作者/期刊映射', async () => {
    const fetchJson = vi.fn(async (_url: string, _schema?: unknown) => openalexResponse)
    const p = createOpenalexProvider({ fetchJson })
    const work = await p.byTitle('Urban water management review')
    expect(work?.abstract).toBe('water management in cities water matters')
    expect(work?.doi).toBe('10.1000/xyz')
    expect(work?.authors).toEqual(['Chen Wei', 'A. Kumar'])
    expect(work?.venue).toBe('Journal of Hydrology')
    expect(work?.year).toBe(2023)
    expect(work?.arxivId).toBeNull()
    expect(fetchJson.mock.calls[0]?.[0]).toContain('https://api.openalex.org/works?search=')
  })

  it('空结果 → null', async () => {
    const p = createOpenalexProvider({ fetchJson: async () => ({ results: [] }) })
    await expect(p.byTitle('不存在的标题')).resolves.toBeNull()
  })

  it('标题不相似 → null', async () => {
    const p = createOpenalexProvider({ fetchJson: async () => openalexResponse })
    await expect(p.byTitle('完全无关的查询词')).resolves.toBeNull()
  })
})
