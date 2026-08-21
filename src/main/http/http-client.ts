/**
 * 出网客户端（SR-INFRA-05，已完成）。
 *
 * 职责：主进程唯一的 HTTP 出口。强制 host 白名单（安全 §6.4）、超时、
 * 有限重试（429/5xx/网络错误退避）、响应 zod 校验。renderer 永远不能直接出网。
 *
 * fetch 实现可注入：Electron 运行时注入 net.fetch（跟随系统代理），
 * 单元测试注入桩实现（tests/unit/http/http-client.test.ts）。
 */
import { z } from 'zod'
import type { AppErrorCode } from '../../shared/app-error'
import { ALLOWED_REMOTE_HOSTS, HTTP_MAX_RETRIES, HTTP_TIMEOUT_MS } from '../../shared/constants'

const zUnknown = z.unknown()

export type FetchLike = (url: string, init?: RequestInit) => Promise<Response>

export class HttpFetchError extends Error {
  readonly code: AppErrorCode
  /** 上游 HTTP 状态码（网络层错误时缺省）；provider 用它区分 404 与其他错误 */
  readonly status?: number

  constructor(code: AppErrorCode, message: string, status?: number) {
    super(message)
    this.name = 'HttpFetchError'
    this.code = code
    this.status = status
  }
}

export interface HttpClientOptions {
  fetchImpl?: FetchLike
  timeoutMs?: number
  maxRetries?: number
  /** 礼貌池标识（CrossRef/OpenAlex），拼入 User-Agent */
  contactEmail?: string
}

export function assertAllowedUrl(rawUrl: string): URL {
  let url: URL
  try {
    url = new URL(rawUrl)
  } catch {
    throw new HttpFetchError('NETWORK_ERROR', `URL 无法解析：${rawUrl}`)
  }
  if (url.protocol !== 'https:') {
    throw new HttpFetchError('NETWORK_ERROR', '仅允许 https 出网')
  }
  if (!ALLOWED_REMOTE_HOSTS.includes(url.hostname)) {
    throw new HttpFetchError(
      'NETWORK_ERROR',
      `目标 host 不在白名单：${url.hostname}（白名单见 shared/constants.ts）`
    )
  }
  return url
}

export interface HttpGetJsonOptions extends HttpClientOptions {
  /** 响应体校验 schema；不匹配抛 UPSTREAM_ERROR */
  schema: z.ZodType
}

export async function fetchJson<T>(rawUrl: string, opts: HttpGetJsonOptions): Promise<T> {
  const url = assertAllowedUrl(rawUrl)
  const doFetch = opts.fetchImpl ?? globalThis.fetch
  const timeoutMs = opts.timeoutMs ?? HTTP_TIMEOUT_MS
  const maxRetries = opts.maxRetries ?? HTTP_MAX_RETRIES
  const userAgent = opts.contactEmail
    ? `SynapseRemake/0.1 (mailto:${opts.contactEmail})`
    : 'SynapseRemake/0.1'

  let lastError: HttpFetchError = new HttpFetchError('NETWORK_ERROR', '未发起请求')
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    if (attempt > 0) {
      await sleep(backoffMs(attempt))
    }
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)
    try {
      const res = await doFetch(url.toString(), {
        signal: controller.signal,
        headers: { 'User-Agent': userAgent, Accept: 'application/json' }
      })
      if (res.status === 429 || res.status === 502 || res.status === 503 || res.status === 504) {
        lastError = new HttpFetchError(
          res.status === 429 ? 'RATE_LIMITED' : 'UPSTREAM_ERROR',
          `上游暂不可用（HTTP ${res.status}）`
        )
        continue
      }
      if (!res.ok) {
        throw new HttpFetchError('UPSTREAM_ERROR', `上游返回 HTTP ${res.status}`, res.status)
      }
      const body: unknown = await res.json()
      const parsed = opts.schema.safeParse(body)
      if (!parsed.success) {
        throw new HttpFetchError(
          'UPSTREAM_ERROR',
          `上游数据结构不符合预期：${parsed.error.issues[0]?.path.join('.') ?? ''}`
        )
      }
      return parsed.data as T
    } catch (e) {
      if (e instanceof HttpFetchError && e.code === 'UPSTREAM_ERROR') throw e
      lastError = new HttpFetchError(
        'NETWORK_ERROR',
        e instanceof Error ? `网络错误：${e.message}` : '网络错误'
      )
      // 继续退避重试
    } finally {
      clearTimeout(timer)
    }
  }
  throw lastError
}

/** 探活（网络诊断用）：只测连通与耗时，不解析响应体 */
export async function pingHost(
  rawUrl: string,
  opts: HttpClientOptions
): Promise<{ ok: boolean; latencyMs: number }> {
  const started = Date.now()
  try {
    await fetchJson(rawUrl, {
      ...opts,
      maxRetries: 0,
      timeoutMs: opts.timeoutMs ?? 5000,
      schema: zUnknown
    })
    return { ok: true, latencyMs: Date.now() - started }
  } catch {
    return { ok: false, latencyMs: -1 }
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/** 抓取文本（arXiv Atom XML 等非 JSON 上游用），同白名单/超时/重试策略 */
export async function fetchText(rawUrl: string, opts: HttpClientOptions): Promise<string> {
  const url = assertAllowedUrl(rawUrl)
  const doFetch = opts.fetchImpl ?? globalThis.fetch
  const timeoutMs = opts.timeoutMs ?? HTTP_TIMEOUT_MS
  const maxRetries = opts.maxRetries ?? HTTP_MAX_RETRIES
  let lastError: HttpFetchError = new HttpFetchError('NETWORK_ERROR', '未发起请求')
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    if (attempt > 0) await sleep(backoffMs(attempt))
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)
    try {
      const res = await doFetch(url.toString(), {
        signal: controller.signal,
        headers: { 'User-Agent': 'SynapseRemake/0.1', Accept: 'text/xml, text/plain, */*' }
      })
      if (res.status === 429 || res.status === 502 || res.status === 503 || res.status === 504) {
        lastError = new HttpFetchError(
          res.status === 429 ? 'RATE_LIMITED' : 'UPSTREAM_ERROR',
          `上游暂不可用（HTTP ${res.status}）`
        )
        continue
      }
      if (!res.ok) throw new HttpFetchError('UPSTREAM_ERROR', `上游返回 HTTP ${res.status}`, res.status)
      return await res.text()
    } catch (e) {
      if (e instanceof HttpFetchError && e.code === 'UPSTREAM_ERROR') throw e
      lastError = new HttpFetchError(
        'NETWORK_ERROR',
        e instanceof Error ? `网络错误：${e.message}` : '网络错误'
      )
    } finally {
      clearTimeout(timer)
    }
  }
  throw lastError
}

function backoffMs(attempt: number): number {
  return 500 * 2 ** (attempt - 1)
}
