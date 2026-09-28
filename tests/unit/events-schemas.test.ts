/**
 * 事件面 schema 正反例（SR-IPC-10）——三事件（importProgress / exportCorpus /
 * windowState）preload 接收侧 safeParse 消费的 zod schema 集合（单口=
 * src/shared/ipc/events.schemas.ts）。
 *
 * 本件职责：①正反例红绿链（schema 摘除变异红证的锚定面——strict 拒未知字段
 * /枚举外/越界值均必测）；②类型漂移锚——exportCorpus 判别联合的推断与
 * schemas.ts 手工 type 联合 ExportCorpusEvent 一致（漂移=编译红）。
 */
import { describe, it, expect } from 'vitest'
import type { z } from 'zod'
import type { ExportCorpusEvent } from '../../src/shared/ipc/schemas'
import {
  exportCorpusEventSchema,
  importProgressEventSchema,
  windowStateEventSchema
} from '../../src/shared/ipc/events.schemas'

// 类型漂移锚：union 推断与 schemas.ts 手工联合 ExportCorpusEvent 一致
// （schema 本体单源=schemas.ts，本锚防两处漂移；null 探针值零运行时对象）
const _corpus: ExportCorpusEvent = null as unknown as z.infer<typeof exportCorpusEventSchema>

const validImportProgress = {
  phase: 'copying',
  current: 2,
  total: 5,
  fileName: 'paper.pdf',
  sessionId: 's-1'
}

const validExtractRequest = {
  type: 'extract-request',
  sessionId: 's-1',
  paperId: 'p-1',
  url: 'app-file://p-1/0',
  annotations: [{ id: 'a-1', rects: [{ page: 0, x: 0.1, y: 0.2, w: 0.3, h: 0.4 }] }]
}

const validExportProgress = {
  type: 'progress',
  sessionId: 's-1',
  done: 3,
  total: 10,
  phase: 'streaming'
}

describe('importProgressEventSchema', () => {
  it('正例：合法进度帧 parse 成功且数据保真', () => {
    const r = importProgressEventSchema.safeParse(validImportProgress)
    expect(r.success).toBe(true)
    if (r.success) expect(r.data).toEqual(validImportProgress)
  })

  it('正例：done 终帧（正常载荷）通过', () => {
    const r = importProgressEventSchema.safeParse({
      ...validImportProgress,
      phase: 'done',
      current: 5
    })
    expect(r.success).toBe(true)
  })

  it('反例：缺 sessionId 拒（迟到帧跨会话过滤锚点不可缺）', () => {
    const { sessionId: _drop, ...bad } = validImportProgress
    expect(importProgressEventSchema.safeParse(bad).success).toBe(false)
  })

  it('反例：phase 枚举外拒', () => {
    expect(importProgressEventSchema.safeParse({ ...validImportProgress, phase: 'idle' }).success).toBe(false)
  })

  it('反例：负数 current 拒（int min(0)）', () => {
    expect(importProgressEventSchema.safeParse({ ...validImportProgress, current: -1 }).success).toBe(false)
  })

  it('反例：未知字段拒（strict）', () => {
    expect(importProgressEventSchema.safeParse({ ...validImportProgress, extra: 1 }).success).toBe(false)
  })
})

describe('exportCorpusEventSchema（判别联合）', () => {
  it('正例：extract-request 分支通过且数据保真', () => {
    const r = exportCorpusEventSchema.safeParse(validExtractRequest)
    expect(r.success).toBe(true)
    if (r.success) expect(r.data).toEqual(validExtractRequest)
  })

  it('正例：progress 分支通过且数据保真', () => {
    const r = exportCorpusEventSchema.safeParse(validExportProgress)
    expect(r.success).toBe(true)
    if (r.success) expect(r.data).toEqual(validExportProgress)
  })

  it('反例：判别键外值拒（type 不在两分支 literal 内）', () => {
    expect(exportCorpusEventSchema.safeParse({ ...validExportProgress, type: 'unknown' }).success).toBe(false)
  })

  it('反例：extract-request 缺 url 拒', () => {
    const { url: _drop, ...bad } = validExtractRequest
    expect(exportCorpusEventSchema.safeParse(bad).success).toBe(false)
  })

  it('反例：progress 缺 sessionId 拒', () => {
    const { sessionId: _drop, ...bad } = validExportProgress
    expect(exportCorpusEventSchema.safeParse(bad).success).toBe(false)
  })
})

describe('windowStateEventSchema', () => {
  it('正例：合法状态帧 parse 成功', () => {
    expect(windowStateEventSchema.safeParse({ maximized: true }).success).toBe(true)
    expect(windowStateEventSchema.safeParse({ maximized: false }).success).toBe(true)
  })

  it('反例：非布尔值拒', () => {
    expect(windowStateEventSchema.safeParse({ maximized: 'yes' }).success).toBe(false)
  })

  it('反例：未知字段拒（strict）', () => {
    expect(windowStateEventSchema.safeParse({ maximized: true, extra: 1 }).success).toBe(false)
  })
})
