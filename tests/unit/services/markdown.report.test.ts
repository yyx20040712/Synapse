import { expect, it } from 'vitest'
import { buildReadingReport, type ReportData } from '../../../src/main/services/export_/markdown.report'
import type { PaperDetail } from '../../../src/shared/models/paper'
import type { Annotation } from '../../../src/shared/models/annotation'
import { guardedDescribe } from '../../utils/guard'

const paper: PaperDetail = {
  id: 'p-1',
  title: '智慧水务综述',
  authors: ['张三', '李四'],
  year: 2025,
  venue: '水利学报',
  doi: '10.1000/demo',
  tagNames: [],
  collectionNames: [],
  annotationCount: 2,
  noteCount: 1,
  lastReadPage: 3,
  addedAt: '2026-01-01T00:00:00Z',
  abstract: '',
  arxivId: null,
  source: 'local',
  enrichStatus: 'pending',
  fileUrl: 'app-file://p-1',
  fileName: 'demo.pdf',
  updatedAt: '2026-01-01T00:00:00Z',
  tags: [],
  collections: []
}

function ann(page: number, start: number, quote: string, comment = ''): Annotation {
  return {
    id: `a-${page}-${start}`,
    paperId: 'p-1',
    page,
    kind: 'highlight',
    color: 'yellow',
    quoteText: quote,
    prefixText: '',
    suffixText: '',
    startOffset: start,
    endOffset: start + quote.length,
    rects: [],
    comment,
    createdAt: 't',
    updatedAt: 't'
  }
}

guardedDescribe('SR-SVC-08', 'markdown.report —— 读书报告生成（golden）', () => {
  it('结构：标题/元信息/分页高亮/评论缩进/笔记节', () => {
    const data: ReportData = {
      paper,
      annotations: [ann(2, 9, '后一条'), ann(2, 3, '前一条', '重要'), ann(0, 0, '第零页')],
      note: { id: 'n-1', paperId: 'p-1', title: '读后感', contentMd: '值得精读。', createdAt: 't', updatedAt: 't' }
    }
    const md = buildReadingReport(data)
    expect(md).toContain('# 智慧水务综述')
    expect(md).toContain('张三')
    expect(md.indexOf('第零页')).toBeLessThan(md.indexOf('前一条'))
    expect(md).toContain('（p.3）') // page 2 → 第3页
    expect(md).toContain('    重要') // 评论缩进
    expect(md).toContain('## 笔记')
    expect(md).toContain('值得精读。')
    // 生成时间行存在（YYYY-MM-DD HH:mm）
    expect(md).toMatch(/\d{4}-\d{2}-\d{2} \d{2}:\d{2}/)
  })

  it('无笔记省略笔记节；超长高亮截断加 …', () => {
    const long = '长'.repeat(400)
    const md = buildReadingReport({ paper, annotations: [ann(0, 0, long)], note: null })
    expect(md).not.toContain('## 笔记')
    expect(md).toContain('…')
    expect(md).not.toContain(long)
  })

  it('空标注也产出合法骨架', () => {
    const md = buildReadingReport({ paper, annotations: [], note: null })
    expect(md).toContain('# 智慧水务综述')
  })
})
