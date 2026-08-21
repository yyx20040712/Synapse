import { describe, expect, it } from 'vitest'
import type { z } from 'zod'
import {
  API_SURFACE,
  allChannels,
  type ApiHandlers,
  type PreloadApi
} from '../../src/shared/ipc/api-surface'
import { NotImplementedError, unimplementedObject } from '../../src/shared/app-error'

describe('contracts/api-surface —— 接线表完整性（防契约漂移）', () => {
  it('通道名全局唯一', () => {
    const channels = allChannels().map((c) => c.channel)
    expect(new Set(channels).size).toBe(channels.length)
  })

  it('通道名符合 <域>/<动作> 命名规范', () => {
    for (const { channel } of allChannels()) {
      expect(channel, `通道名不规范：${channel}`).toMatch(/^[a-z][a-z0-9-]*\/[a-z][a-z0-9-]*$/)
    }
  })

  it('每个端点 Req/Res 都是 zod schema 且 Req 为 strict 对象', () => {
    const surface = API_SURFACE as Record<string, Record<string, { Req: z.ZodType; Res: z.ZodType }>>
    for (const { domain, method } of allChannels()) {
      const ep = surface[domain]?.[method]
      if (!ep) throw new Error(`接线表缺 ${domain}.${method}`)
      expect(typeof ep.Req.safeParse, `${domain}.${method}.Req 应为 zod schema`).toBe('function')
      expect(typeof ep.Res.safeParse, `${domain}.${method}.Res 应为 zod schema`).toBe('function')
      const parsed = ep.Req.safeParse({ __unknownField: 1 })
      expect(parsed.success, `${domain}.${method}.Req 应拒绝未知字段（strict）`).toBe(false)
    }
  })

  it('unimplementedObject 可完整满足 ApiHandlers 类型（骨架期类型自洽证明）', () => {
    const handlers: ApiHandlers = {
      library: unimplementedObject('SR-IPC-01', 'x'),
      reader: unimplementedObject('SR-IPC-02', 'x'),
      notes: unimplementedObject('SR-IPC-03', 'x'),
      tags: unimplementedObject('SR-IPC-04', 'x'),
      import_: unimplementedObject('SR-IPC-05', 'x'),
      enrich: unimplementedObject('SR-IPC-06', 'x'),
      export_: unimplementedObject('SR-IPC-07', 'x'),
      settings: unimplementedObject('SR-IPC-08', 'x'),
      system: unimplementedObject('SR-IPC-09', 'x')
    }
    expect(() => handlers.library.list).toThrow(NotImplementedError)
    expect(() => handlers.library.list).toThrow('SR-IPC-01')
    const _types: PreloadApi = handlers as never
    void _types
  })

  it('所有模型 schema fixture 往返：合法通过/非法拒绝（抽样关键端点）', () => {
    // library.list 请求：分页默认值填充
    const list = API_SURFACE.library.list.Req.safeParse({})
    expect(list.success).toBe(true)
    if (list.success) {
      expect(list.data).toMatchObject({ sort: 'added_desc', offset: 0, limit: 50 })
    }
    // reader.saveAnnotation 请求：标注定位器字段齐全才通过
    const badAnn = API_SURFACE.reader.saveAnnotation.Req.safeParse({
      paperId: 'p1',
      annotation: { page: 0 }
    })
    expect(badAnn.success).toBe(false)
    const goodAnn = API_SURFACE.reader.saveAnnotation.Req.safeParse({
      paperId: 'p1',
      annotation: {
        page: 0,
        kind: 'highlight',
        color: 'yellow',
        quoteText: '水',
        prefixText: '',
        suffixText: '',
        startOffset: 0,
        endOffset: 1,
        rects: [{ page: 0, x: 0.1, y: 0.2, w: 0.3, h: 0.02 }],
        comment: ''
      }
    })
    expect(goodAnn.success).toBe(true)
    // 非法颜色拒绝
    const badColor = API_SURFACE.reader.saveAnnotation.Req.safeParse({
      paperId: 'p1',
      annotation: {
        page: 0,
        kind: 'highlight',
        color: 'black',
        quoteText: '',
        prefixText: '',
        suffixText: '',
        startOffset: 0,
        endOffset: 0,
        rects: [],
        comment: ''
      }
    })
    expect(badColor.success).toBe(false)
  })
})
