import { beforeEach, expect, it } from 'vitest'
import { createAnnotationsRepo } from '../../../../src/main/db/repos/annotations.repo'
import type { SqliteDb } from '../../../../src/main/db/connection'
import { createTestDb, fixedIso } from '../../../utils/fixtures'
import { guardedDescribe } from '../../../utils/guard'
import type { AnnotationInput } from '../../../../src/shared/models/annotation'

function input(over: Partial<AnnotationInput> = {}): AnnotationInput {
  return {
    page: over.page ?? 0,
    kind: over.kind ?? 'highlight',
    color: over.color ?? 'yellow',
    quoteText: over.quoteText ?? '被高亮的原文',
    prefixText: over.prefixText ?? '前文',
    suffixText: over.suffixText ?? '后文',
    startOffset: over.startOffset ?? 10,
    endOffset: over.endOffset ?? 16,
    rects: over.rects ?? [{ page: 0, x: 0.1, y: 0.2, w: 0.3, h: 0.02 }],
    comment: over.comment ?? ''
  }
}

function seedPaper(db: SqliteDb, id = 'p-1'): void {
  db.prepare(
    `INSERT INTO papers (id, file_ref, sha256, added_at, updated_at) VALUES (?,'a.pdf','s-'||?,'t','t')`
  ).run(id, id)
}

guardedDescribe('SR-DB-02', 'annotations.repo —— 标注读写', () => {
  let db: SqliteDb
  let repo: ReturnType<typeof createAnnotationsRepo>

  beforeEach(() => {
    db = createTestDb()
    seedPaper(db)
    repo = createAnnotationsRepo(db)
  })

  it('insert 生成 id/时间戳并回落字段一致', () => {
    const a = repo.insert('p-1', input())
    expect(a.id).toMatch(/^[0-9a-f-]{36}$/)
    expect(a.paperId).toBe('p-1')
    expect(a.quoteText).toBe('被高亮的原文')
    expect(a.createdAt).toBe(a.updatedAt)
  })

  it('listByPaper：按 page、startOffset 稳定排序', () => {
    repo.insert('p-1', input({ page: 2, startOffset: 0, endOffset: 5 }))
    repo.insert('p-1', input({ page: 1, startOffset: 9, endOffset: 12 }))
    repo.insert('p-1', input({ page: 1, startOffset: 3, endOffset: 4 }))
    const list = repo.listByPaper('p-1')
    expect(list.map((a) => [a.page, a.startOffset])).toEqual([
      [1, 3],
      [1, 9],
      [2, 0]
    ])
  })

  it('update 整体替换（comment/颜色），返回更新后对象', () => {
    const a = repo.insert('p-1', input())
    const changed = { ...a, color: 'green' as const, comment: '重要', updatedAt: fixedIso() }
    expect(repo.update(changed)?.color).toBe('green')
    const list = repo.listByPaper('p-1')
    expect(list[0]?.comment).toBe('重要')
  })

  it('update 不存在的 id 返回 null；delete 返回是否删除', () => {
    const a = repo.insert('p-1', input())
    expect(repo.update({ ...a, id: 'ghost' })).toBeNull()
    expect(repo.delete('ghost')).toBe(false)
    expect(repo.delete(a.id)).toBe(true)
    expect(repo.listByPaper('p-1')).toHaveLength(0)
  })

  it('search：FTS 命中引文与评论，可按文献过滤', () => {
    seedPaper(db, 'p-2')
    repo.insert('p-1', input({ quoteText: '漏损控制策略', comment: '' }))
    repo.insert('p-2', input({ quoteText: '别的内容', comment: '关于漏损的评论' }))
    const both = repo.search(null, '漏损')
    expect(both).toHaveLength(2)
    const only1 = repo.search('p-1', '漏损')
    expect(only1.map((a) => a.paperId)).toEqual(['p-1'])
  })

  it('countByPaper', () => {
    repo.insert('p-1', input())
    repo.insert('p-1', input({ startOffset: 20, endOffset: 25 }))
    expect(repo.countByPaper('p-1')).toBe(2)
    expect(repo.countByPaper('p-2')).toBe(0)
  })

  it('rects JSON 编解码：往返结构一致', () => {
    const rects = [
      { page: 0, x: 0.11, y: 0.22, w: 0.33, h: 0.02 },
      { page: 0, x: 0.44, y: 0.55, w: 0.1, h: 0.01 }
    ]
    const a = repo.insert('p-1', input({ rects }))
    expect(a.rects).toEqual(rects)
  })
})
