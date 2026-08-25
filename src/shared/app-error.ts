/**
 * 统一错误模型 —— 跨 IPC 的唯一错误形状（契约，已冻结）。
 *
 * 规则：
 * - 所有 IPC 响应都是 Result<T>；异常堆栈禁止跨进程（安全 §6.3）
 * - AppErrorCode 是封闭枚举，新增需走 ADR + [locked-change]
 * - NotImplementedError 是骨架期的受控占位：每个实例必须携带工单号，
 *   CI 由 scripts/check-tickets.mjs 校验工单号真实存在且为 open（防作弊 K3）
 */

export type AppErrorCode =
  | 'NOT_IMPLEMENTED' // 工单未完成（骨架期受控占位）
  | 'INVALID_REQUEST' // 请求未通过 zod 校验
  | 'NOT_FOUND' // 目标资源不存在
  | 'CONFLICT' // 唯一性冲突（如重复标签）
  | 'DUPLICATE_FILE' // 相同 sha256 的 PDF 已存在
  | 'UNSUPPORTED_FILE' // 非 PDF 或损坏文件
  | 'IO_ERROR' // 本地文件读写失败
  | 'DB_ERROR' // SQLite 错误
  | 'NETWORK_ERROR' // 出网失败（含超时）
  | 'RATE_LIMITED' // 上游限流（429）
  | 'UPSTREAM_ERROR' // 上游返回异常数据
  | 'PARSE_ERROR' // 解析失败（PDF/PDF 元数据/BibTeX 上游 JSON）
  | 'CANCELLED' // 用户取消（如关闭对话框）
  | 'EXPORT_BUSY' // 导出会话单飞：进行中拒绝第二会话（INV-18，AI-03 落地）
  | 'INTERNAL' // 未预期错误（兜底）

export interface AppError {
  code: AppErrorCode
  /** 面向用户的中文消息（可直接展示） */
  message: string
  /** 可选调试细节（不含堆栈） */
  detail?: string
}

export type Result<T> = { ok: true; data: T } | { ok: false; error: AppError }

/** 工单号类型别名（真实校验在 tickets/registry，shared 不依赖进程层） */
export type TicketId = string

export function ok<T>(data: T): Result<T> {
  return { ok: true, data }
}

export function err(code: AppErrorCode, message: string, detail?: string): Result<never> {
  return { ok: false, error: detail === undefined ? { code, message } : { code, message, detail } }
}

/** AppErrorCode 全集（toAppError 的结构化识别用；新增码必须同步这里） */
const APP_ERROR_CODES: readonly AppErrorCode[] = [
  'EXPORT_BUSY',
  'NOT_IMPLEMENTED',
  'INVALID_REQUEST',
  'NOT_FOUND',
  'CONFLICT',
  'DUPLICATE_FILE',
  'UNSUPPORTED_FILE',
  'IO_ERROR',
  'DB_ERROR',
  'NETWORK_ERROR',
  'RATE_LIMITED',
  'UPSTREAM_ERROR',
  'PARSE_ERROR',
  'CANCELLED',
  'INTERNAL'
]

function asAppErrorCode(v: unknown): AppErrorCode | undefined {
  return typeof v === 'string' && APP_ERROR_CODES.includes(v as AppErrorCode)
    ? (v as AppErrorCode)
    : undefined
}

/** 将任意抛出的异常折叠为 AppError（main 侧 IPC 出口统一使用） */
export function toAppError(e: unknown): AppError {
  if (e instanceof NotImplementedError) {
    return { code: 'NOT_IMPLEMENTED', message: e.message, detail: `工单 ${e.ticket}` }
  }
  if (e instanceof Error) {
    // 结构化域错误（FileStoreError/HttpFetchError 等带 code 字段）：保留 code 与
    // 面向用户的消息——前端要按码分支（取消/重试/提示差异），一律折叠 INTERNAL 会埋掉语义
    const code = asAppErrorCode((e as { code?: unknown }).code)
    if (code !== undefined) return { code, message: e.message }
    return { code: 'INTERNAL', message: '发生未预期的内部错误', detail: e.message }
  }
  return { code: 'INTERNAL', message: '发生未预期的内部错误', detail: String(e) }
}

/** 判别帮助：Result 值窄化 */
export function isOk<T>(r: Result<T>): r is { ok: true; data: T } {
  return r.ok
}

/**
 * 受控占位异常：骨架期所有未完成工单的实现体抛出它。
 * 错误消息中包含工单号，npm run tickets:check 会扫描比对注册表。
 */
export class NotImplementedError extends Error {
  readonly ticket: TicketId

  constructor(ticket: TicketId, what?: string) {
    super(
      `[${ticket}] 模块尚未实现${what ? '：' + what : ''}。` +
        '请按文件头部规约完成实现；完成后在 tickets/registry.ts 翻状态。'
    )
    this.name = 'NotImplementedError'
    this.ticket = ticket
  }
}

/**
 * 骨架期对象占位：任何方法/属性访问时才抛 NotImplementedError。
 * 用于服务/仓储工厂——保证 bootstrap 装配不炸、未接线的调用才报"工单未完成"。
 * 实现工单时整体替换为真实对象。
 */
export function unimplementedObject<T extends object>(ticket: TicketId, what: string): T {
  return new Proxy({} as T, {
    get(_target, prop) {
      throw new NotImplementedError(ticket, `${what}.${String(prop)}`)
    }
  })
}
