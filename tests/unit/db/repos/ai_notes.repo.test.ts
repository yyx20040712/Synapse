import { beforeEach, expect, it } from 'vitest'
import { createAiNotesRepo } from '../../../../src/main/db/repos/ai_notes.repo'
import type { SqliteDb } from '../../../../src/main/db/connection'
import { createTestDb } from '../../../utils/fixtures'
import { guardedDescribe } from '../../../utils/guard'

guardedDescribe('SR2-AI-01', 'ai_notes.repo —— AI 语料数据基座（一行一锚定段×一问）', () => {
  let db: SqliteDb
  let repo: ReturnType<typeof createAiNotesRepo>

  const seedPaper = (id: string): void => {
    db.prepare(
      'INSERT INTO papers (id, file_ref, sha256, added_at, updated_at) VALUES (?,?,?,?,?)'
    ).run(id, 'a.pdf', `s-${id}`, 't', 't')
  }

  const seedAnnotation = (id: string, paperId: string): void => {
    db.prepare(
      `INSERT INTO annotations (id, paper_id, page, rects_json, quote_text, prefix_text, suffix_text,
         start_offset, end_offset, kind, color, comment, sort_key, created_at, updated_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
    ).run(id, paperId, 0, '[]', 'q', 'p', 's', 0, 1, 'highlight', 'yellow', '', '0:0', 't', 't')
  }

  beforeEach(() => {
    db = createTestDb()
    seedPaper('p-1')
    repo = createAiNotesRepo(db)
  })

  it('insert+listByPaper：全字段往返（驼峰↔蛇形映射；段级条目带 annotationId）', () => {
    seedAnnotation('a-1', 'p-1')
    const inserted = repo.insert({
      paperId: 'p-1',
      annotationId: 'a-1',
      role: 'first-read',
      question: 'Q1',
      model: 'deepseek-v3',
      quoteText: '引文',
      prefixText: '前',
      suffixText: '后',
      anchorPage: 3,
      contentMd: '回答内容'
    })
    expect(inserted.id).toBeTruthy()
    const list = repo.listByPaper('p-1')
    expect(list).toHaveLength(1)
    expect(list[0]!).toMatchObject({
      paperId: 'p-1',
      annotationId: 'a-1',
      role: 'first-read',
      question: 'Q1',
      model: 'deepseek-v3',
      quoteText: '引文',
      prefixText: '前',
      suffixText: '后',
      anchorPage: 3,
      contentMd: '回答内容'
    })
  })

  it('篇级语料（annotationId=null/anchorPage=null）与 divergence question 往返', () => {
    repo.insert({
      paperId: 'p-1',
      annotationId: null,
      role: 'adjudicate',
      question: 'divergence',
      model: 'glm-5.3',
      quoteText: '',
      prefixText: '',
      suffixText: '',
      anchorPage: null,
      contentMd: '分歧报告'
    })
    const list = repo.listByPaper('p-1')
    expect(list[0]?.annotationId).toBeNull()
    expect(list[0]?.anchorPage).toBeNull()
    expect(list[0]?.question).toBe('divergence')
  })

  it('listByRole 按 role 过滤；countByPaper 计数', () => {
    for (const role of ['first-read', 'first-read', 'second-read'] as const) {
      repo.insert({
        paperId: 'p-1',
        annotationId: null,
        role,
        question: 'Q1',
        model: 'm',
        quoteText: '',
        prefixText: '',
        suffixText: '',
        anchorPage: null,
        contentMd: ''
      })
    }
    expect(repo.listByRole('p-1', 'first-read')).toHaveLength(2)
    expect(repo.listByRole('p-1', 'adjudicate')).toHaveLength(0)
    expect(repo.countByPaper('p-1')).toBe(3)
  })

  it('级联：paper 删除 → ai_notes 级联清空（CASCADE）', () => {
    repo.insert({
      paperId: 'p-1', annotationId: null, role: 'first-read', question: 'Q1',
      model: 'm', quoteText: '', prefixText: '', suffixText: '', anchorPage: null, contentMd: ''
    })
    db.prepare('DELETE FROM papers WHERE id = ?').run('p-1')
    expect(repo.countByPaper('p-1')).toBe(0)
  })

  it('级联：annotation 删除 → annotation_id 置 NULL 条目保留（SET NULL 降级篇级）', () => {
    seedAnnotation('a-2', 'p-1')
    repo.insert({
      paperId: 'p-1', annotationId: 'a-2', role: 'first-read', question: 'Q2',
      model: 'm', quoteText: 'q', prefixText: '', suffixText: '', anchorPage: 1, contentMd: ''
    })
    db.prepare('DELETE FROM annotations WHERE id = ?').run('a-2')
    const list = repo.listByPaper('p-1')
    expect(list).toHaveLength(1)
    expect(list[0]?.annotationId).toBeNull()
    expect(list[0]?.quoteText).toBe('q')
  })

  it('role CHECK：非法 role 被 DDL 拒绝（枚举真相=迁移 003）', () => {
    expect(() =>
      repo.insert({
        paperId: 'p-1', annotationId: null, role: 'third-read' as never, question: 'Q1',
        model: 'm', quoteText: '', prefixText: '', suffixText: '', anchorPage: null, contentMd: ''
      })
    ).toThrow()
  })

  it('updateContent：更新 content_md 且 updatedAt 不回退（同毫秒相等合法）；未知 id 返回 null', () => {
    const n = repo.insert({
      paperId: 'p-1', annotationId: null, role: 'first-read', question: 'Q1',
      model: 'm', quoteText: '', prefixText: '', suffixText: '', anchorPage: null, contentMd: '旧'
    })
    const updated = repo.updateContent(n.id, '新内容')
    expect(updated?.contentMd).toBe('新内容')
    expect(updated !== null && updated.updatedAt >= n.updatedAt).toBe(true)
    expect(repo.listByPaper('p-1')[0]?.contentMd).toBe('新内容')
    expect(repo.updateContent('不存在', 'x')).toBeNull()
  })

  it('deleteByPaper：清面返回删除数（导入器幂等重灌原语）', () => {
    for (let i = 0; i < 2; i += 1) {
      repo.insert({
        paperId: 'p-1', annotationId: null, role: 'first-read', question: 'Q1',
        model: 'm', quoteText: '', prefixText: '', suffixText: '', anchorPage: null, contentMd: ''
      })
    }
    expect(repo.deleteByPaper('p-1')).toBe(2)
    expect(repo.countByPaper('p-1')).toBe(0)
    expect(repo.deleteByPaper('p-1')).toBe(0)
  })
})
