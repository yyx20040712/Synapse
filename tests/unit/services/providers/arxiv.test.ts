import { expect, it, vi } from 'vitest'
import { createArxivProvider } from '../../../../src/main/services/enrich/providers/arxiv'
import { guardedDescribe } from '../../../utils/guard'

const atomXml = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>ArXiv Query</title>
  <entry>
    <id>http://arxiv.org/abs/2401.12345v2</id>
    <title>Graph Neural Networks for Pipe Network &amp; Leakage</title>
    <summary>
      We study leakage detection in water pipe networks.
    </summary>
    <published>2024-01-20T00:00:00Z</published>
    <author><name>San Zhang</name></author>
    <author><name>Si Li</name></author>
  </entry>
</feed>`

guardedDescribe('SR-NET-03', 'arxiv provider —— Atom 解析', () => {
  it('解析 entry：标题/作者列表/年份/摘要（XML 反转义+空白规整）', async () => {
    const fetchText = vi.fn(async (_url: string) => atomXml)
    const p = createArxivProvider({ fetchText })
    const work = await p.byId('2401.12345')
    expect(work?.title).toBe('Graph Neural Networks for Pipe Network & Leakage')
    expect(work?.authors).toEqual(['San Zhang', 'Si Li'])
    expect(work?.year).toBe(2024)
    expect(work?.abstract).toBe('We study leakage detection in water pipe networks.')
    expect(work?.arxivId).toBe('2401.12345')
    expect(fetchText.mock.calls[0]?.[0]).toContain('https://export.arxiv.org/api/query?id_list=')
  })

  it('无 entry（不存在）→ null', async () => {
    const p = createArxivProvider({
      fetchText: async () => `<?xml version="1.0"?><feed xmlns="http://www.w3.org/2005/Atom"></feed>`
    })
    await expect(p.byId('0000.00000')).resolves.toBeNull()
  })
})
