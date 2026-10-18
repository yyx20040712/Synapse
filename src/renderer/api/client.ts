/**
 * renderer 侧 IPC 客户端（SR-INFRA-14，已完成）。
 *
 * 职责：对 window.api 的薄包装——Result 解包（错误统一抛带中文 message 的
 * ApiClientError，由 UI 层 catch 后 toast）；禁止组件直接碰 window.api 的
 * 原始 Promise<Result>（统一错误面）。
 */
import type { Result } from '@shared/app-error'

export class ApiClientError extends Error {
  readonly code: string
  /** [F-VISFB-65 单元二] 结构化拒因（只读——AppError.reason 经 unwrap 复制；
   *  消费面=flush 三联判据等按 reason 细分分支。缺席=键不存在） */
  readonly reason?: string

  constructor(code: string, message: string, reason?: string) {
    super(message)
    this.name = 'ApiClientError'
    this.code = code
    if (reason !== undefined) this.reason = reason
  }
}

export async function unwrap<T>(call: Promise<Result<T>>): Promise<T> {
  const r = await call
  if (!r.ok) {
    throw new ApiClientError(r.error.code, r.error.message, r.error.reason)
  }
  return r.data
}

/** 类型化门面：组件只 import { api }，不碰 window */
export const api = window.api
export const apiEvents = window.apiEvents
