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
    // 样例号用非工单号字符串：真实工单号会随对应工单完成而被占位桩检查判红
    // workspaces 域（R1-WS1）为 bootstrap 组合装配域（api-surface ComposedHandlerDomains
    // ——ipc/index.ts 零改动裁决），此处显式枚举恢复该域的枚举覆盖
    const handlers: ApiHandlers = {
      library: unimplementedObject('SAMPLE-IPC', 'x'),
      reader: unimplementedObject('SAMPLE-IPC', 'x'),
      notes: unimplementedObject('SAMPLE-IPC', 'x'),
      tags: unimplementedObject('SAMPLE-IPC', 'x'),
      import_: unimplementedObject('SAMPLE-IPC', 'x'),
      enrich: unimplementedObject('SAMPLE-IPC', 'x'),
      export_: unimplementedObject('SAMPLE-IPC', 'x'),
      ai_sensor: unimplementedObject('SAMPLE-IPC', 'x'),
      lineage: unimplementedObject('SAMPLE-IPC', 'x'),
      settings: unimplementedObject('SAMPLE-IPC', 'x'),
      system: unimplementedObject('SAMPLE-IPC', 'x'),
      workspaces: unimplementedObject<NonNullable<ApiHandlers['workspaces']>>('SAMPLE-IPC', 'x')
    }
    expect(() => handlers.library.list).toThrow(NotImplementedError)
    expect(() => handlers.library.list).toThrow('SAMPLE-IPC')
    expect(() => handlers.workspaces?.list).toThrow('SAMPLE-IPC')
    const _types: PreloadApi = handlers as never
    void _types
  })

  it('workspaces 域（R1-WS1 扩容）：四通道在表 + create 名长 1-40 边界 + Res 形状', () => {
    expect(Object.keys(API_SURFACE.workspaces).sort()).toEqual(['create', 'list', 'rename', 'switch'])
    const create = API_SURFACE.workspaces.create.Req.safeParse({ name: '课'.repeat(40) })
    expect(create.success).toBe(true) // 40 字=上限含端
    expect(API_SURFACE.workspaces.create.Req.safeParse({ name: '课'.repeat(41) }).success).toBe(false)
    expect(API_SURFACE.workspaces.create.Req.safeParse({ name: '' }).success).toBe(false)
    expect(
      API_SURFACE.workspaces.list.Res.safeParse({
        items: [{ id: 'default', name: '默认课题', createdAt: '2026-01-01T00:00:00.000Z' }],
        currentId: 'default'
      }).success
    ).toBe(true)
    expect(API_SURFACE.workspaces.list.Res.safeParse({ items: [], currentId: '' }).success).toBe(false)
    expect(API_SURFACE.workspaces.switch.Res.safeParse({ ok: true }).success).toBe(true)
    expect(API_SURFACE.workspaces.rename.Res.safeParse({ ok: true }).success).toBe(true)
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
