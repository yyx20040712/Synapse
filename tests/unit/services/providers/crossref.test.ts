import { expect, it, vi } from 'vitest'
import { createCrossrefProvider } from '../../../../src/main/services/enrich/providers/crossref'
import { HttpFetchError } from '../../../../src/main/http/http-client'
import { guardedDescribe } from '../../../utils/guard'

function fakeFetchJson(body: unknown, status = 200) {
  return vi.fn(async (_url: string, _schema?: unknown) => new Response(JSON.stringify(body), { status }))
}

const crossrefWork = {
  status: 'ok',
  message: {
    title: ['Deep learning for water demand forecasting'],
    author: [
      { family: 'Wang', given: 'Li' },
      { given: 'Tom' }
    ],
    issued: { 'date-parts': [[2024, 3]] },
    'container-title': ['Water Research'],
    DOI: '10.1016/j.watres.2024.01.001',
    abstract: '<jats:p>Forecasting matters.</jats:p>'
  }
}

guardedDescribe('SR-NET-01', 'crossref provider —— byDoi/byTitle', () => {
  it('byDoi：映射字段（family+given 拼接、年份取 issued、JATS 剥离）', async () => {
    const fetchJson = fakeFetchJson(crossrefWork)
    const p = createCrossrefProvider({ fetchJson })
    const work = await p.byDoi('10.1016/j.watres.2024.01.001')
    expect(work?.title).toBe('Deep learning for water demand forecasting')
    expect(work?.authors).toEqual(['Wang, Li', 'Tom'])
    expect(work?.year).toBe(2024)
    expect(work?.venue).toBe('Water Research')
    expect(work?.doi).toBe('10.1016/j.watres.2024.01.001')
    expect(work?.abstract).toBe('Forecasting matters.')
    expect(fetchJson).toHaveBeenCalledOnce()
    expect((fetchJson.mock.calls[0]?.[0] as string)).toContain(
      'https://api.crossref.org/works/10.1016%2Fj.watres.2024.01.001'
    )
  })

  it('byDoi 404 → null（不是异常）', async () => {
    const p = createCrossrefProvider({
      fetchJson: async () => {
        throw new HttpFetchError('UPSTREAM_ERROR', '上游返回 HTTP 404', 404)
      }
    })
    await expect(p.byDoi('10.1/nope')).resolves.toBeNull()
  })

  it('byTitle：取首个结果且标题相似才采用', async () => {
    const fetchJson = fakeFetchJson({
      status: 'ok',
      message: { items: [{ ...crossrefWork.message, score: 99 }] }
    })
    const p = createCrossrefProvider({ fetchJson })
    const work = await p.byTitle('Deep learning for water demand forecasting')
    expect(work?.doi).toContain('10.1016')
    expect(fetchJson.mock.calls[0]?.[0]).toMatch(/query\.bibliographic=/)
  })

  it('byTitle：结果标题与查询不相似 → null', async () => {
    const fetchJson = fakeFetchJson({
      status: 'ok',
      message: { items: [{ ...crossrefWork.message, title: ['完全不相关的标题'] }] }
    })
    const p = createCrossrefProvider({ fetchJson })
    await expect(p.byTitle('water demand forecasting')).resolves.toBeNull()
  })
})
