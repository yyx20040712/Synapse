import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import {
  assertAllowedUrl,
  fetchJson,
  fetchText,
  HttpFetchError
} from '../../../src/main/http/http-client'

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

const okSchema = z.object({ message: z.object({ title: z.string() }) }).strict()

describe('http-client —— host 白名单与超时退避', () => {
  it('白名单外 host 直接拒绝（含内网/本机/任意 URL）', () => {
    for (const url of [
      'http://api.crossref.org/works', // 非 https
      'https://evil.com/works',
      'https://127.0.0.1/works',
      'file:///etc/passwd'
    ]) {
      expect(() => assertAllowedUrl(url), `应拒绝：${url}`).toThrow(HttpFetchError)
    }
    expect(() => assertAllowedUrl('https://api.crossref.org/works/10.1/x')).not.toThrow()
  })

  it('fetchJson：校验通过的响应解析成功且带 User-Agent', async () => {
    let seenUa = ''
    const fetchImpl = async (_u: string, init?: RequestInit) => {
      seenUa = (init?.headers as Record<string, string>)['User-Agent'] ?? ''
      return jsonResponse({ message: { title: '水' } })
    }
    const data = (await fetchJson('https://api.crossref.org/works/1', {
      fetchImpl,
      schema: okSchema,
      contactEmail: 'a@b.c'
    })) as { message: { title: string } }
    expect(data.message.title).toBe('水')
    expect(seenUa).toContain('mailto:a@b.c')
  })

  it('fetchJson：结构不符抛 UPSTREAM_ERROR', async () => {
    const fetchImpl = async () => jsonResponse({ message: { title: 123 } })
    await expect(
      fetchJson('https://api.openalex.org/works', { fetchImpl, schema: okSchema, maxRetries: 0 })
    ).rejects.toMatchObject({ code: 'UPSTREAM_ERROR' })
  })

  it('429 先重试：第二次成功则整体成功；maxRetries=0 直接 RATE_LIMITED', async () => {
    let calls = 0
    const fetchImpl = async () => {
      calls += 1
      return calls === 1 ? new Response('busy', { status: 429 }) : jsonResponse({ message: { title: 'ok' } })
    }
    const data = await fetchJson('https://api.crossref.org/works', {
      fetchImpl,
      schema: okSchema,
      maxRetries: 1,
      timeoutMs: 1000
    })
    expect(calls).toBe(2)
    expect((data as { message: { title: string } }).message.title).toBe('ok')

    await expect(
      fetchJson('https://api.crossref.org/works', {
        fetchImpl: async () => new Response('busy', { status: 429 }),
        schema: okSchema,
        maxRetries: 0
      })
    ).rejects.toMatchObject({ code: 'RATE_LIMITED' })
  })

  it('非 429/5xx 的 4xx 不重试直接抛 UPSTREAM_ERROR', async () => {
    let calls = 0
    const fetchImpl = async () => {
      calls += 1
      return new Response('nope', { status: 404 })
    }
    await expect(
      fetchJson('https://api.crossref.org/works/x', { fetchImpl, schema: okSchema, maxRetries: 2 })
    ).rejects.toMatchObject({ code: 'UPSTREAM_ERROR' })
    expect(calls).toBe(1)
  })

  it('网络错误（连接拒绝）重试后抛 NETWORK_ERROR', async () => {
    const fetchImpl = async () => {
      throw new TypeError('fetch failed')
    }
    await expect(
      fetchJson('https://export.arxiv.org/api/query', {
        fetchImpl,
        schema: okSchema,
        maxRetries: 1,
        timeoutMs: 200
      })
    ).rejects.toMatchObject({ code: 'NETWORK_ERROR' })
  })

  it('fetchText：返回文本体（arXiv XML 场景）', async () => {
    const fetchImpl = async () => new Response('<feed>ok</feed>', { status: 200 })
    const text = await fetchText('https://export.arxiv.org/api/query?id_list=1', {
      fetchImpl,
      maxRetries: 0
    })
    expect(text).toContain('<feed>')
  })

  it('白名单外 URL 的 fetchText 在发请求前即拒绝', async () => {
    let called = false
    const fetchImpl = async () => {
      called = true
      return new Response('')
    }
    await expect(
      fetchText('https://evil.example.com/x', { fetchImpl, maxRetries: 0 })
    ).rejects.toMatchObject({ code: 'NETWORK_ERROR' })
    expect(called).toBe(false)
  })
})
