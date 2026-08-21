import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import { makeChannelHandler } from '../../../src/main/ipc/register'
import { NotImplementedError } from '../../../src/shared/app-error'

const reqSchema = z.object({ paperId: z.string().min(1), extra: z.string().optional() }).strict()

describe('ipc/register.makeChannelHandler —— 校验/异常折叠三路径', () => {
  it('校验失败：返回 INVALID_REQUEST Result（不抛），detail 含字段路径', async () => {
    const handler = makeChannelHandler(reqSchema, async (req) => req)
    const r = (await handler({ paperId: '' })) as { ok: boolean; error: { code: string; detail: string } }
    expect(r.ok).toBe(false)
    expect(r.error.code).toBe('INVALID_REQUEST')
    expect(r.error.detail).toContain('paperId')
  })

  it('未知字段被 strict schema 拒绝（aquaresearch 教训：不许删类型保护）', async () => {
    const handler = makeChannelHandler(reqSchema, async (req) => req)
    const r = (await handler({ paperId: 'x', hacker: 1 })) as { ok: boolean; error: { code: string } }
    expect(r.ok).toBe(false)
    expect(r.error.code).toBe('INVALID_REQUEST')
  })

  it('未传请求体（undefined）按 {} 处理仍校验失败于必填字段', async () => {
    const handler = makeChannelHandler(reqSchema, async (req) => req)
    const r = (await handler(undefined)) as { ok: boolean; error: { code: string } }
    expect(r.error.code).toBe('INVALID_REQUEST')
  })

  it('成功路径：service 返回值装进 ok Result', async () => {
    const handler = makeChannelHandler(reqSchema, async (req) => ({ got: (req as { paperId: string }).paperId }))
    const r = (await handler({ paperId: 'p-1' })) as { ok: boolean; data: { got: string } }
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.data.got).toBe('p-1')
  })

  it('service 抛 NotImplementedError：折叠为 NOT_IMPLEMENTED + 工单号 detail', async () => {
    const handler = makeChannelHandler(reqSchema, async () => {
      // 样例号用非工单号字符串：真实工单号会随工单完成被占位桩检查判红
      throw new NotImplementedError('SAMPLE-1', '测试模块')
    })
    const r = (await handler({ paperId: 'p' })) as { ok: boolean; error: { code: string; message: string; detail: string } }
    expect(r.error.code).toBe('NOT_IMPLEMENTED')
    expect(r.error.message).toContain('SAMPLE-1')
    expect(r.error.detail).toContain('SAMPLE-1')
  })

  it('service 抛普通 Error：折叠为 INTERNAL，消息兜底不裸抛堆栈', async () => {
    const handler = makeChannelHandler(reqSchema, async () => {
      throw new Error('boom')
    })
    const r = (await handler({ paperId: 'p' })) as { ok: boolean; error: { code: string; message: string; detail: string } }
    expect(r.error.code).toBe('INTERNAL')
    expect(r.error.message).not.toContain('boom') // 用户消息不含内部细节
    expect(r.error.detail).toContain('boom') // detail 供诊断
  })
})
