/**
 * app-file:// 自定义协议（SR-INFRA-08，已完成；SR-SEC-01 收束 ACAO）。
 *
 * 职责：renderer 获取受管 PDF 的唯一通道。URL 形如 app-file://<paperId>。
 * 安全（§6.3）：id 字符集白名单（防路径把戏）→ 查库拿 file_ref → 受管前缀校验
 * → 才读文件。renderer 全程接触不到文件系统路径。
 *
 * [SR-SEC-01] 响应 CORS 面：成功与错误响应的 ACAO 由字面 '*' 改白名单回显——
 * 命中→回显请求 Origin 原值；未命中=不带 ACAO 头静默（不 403——防破坏
 * pdf.js loadingTask 错误分支）。白名单单源=下方两组常量。
 *
 * [SR-SEC-01 取证注记（2026-09-28，档=仓外 scripts-audits/SR-SEC-01/05-07）]
 * Electron protocol.handle 构造 Request 时剥离 forbidden headers——Origin 头在
 * prod（file://）与 dev（http://localhost）双态均不可观测（headers.get('origin')
 * 恒 JS null，可见头仅 accept/user-agent）：真实链路恒走「无头=不加 ACAO」分支；
 * corsEnabled scheme 的 CORS 放行不经 handler ACAO（无 ACAO 的 404 页侧可读、
 * 网络层无自动注入，CDP 双证）。白名单分支=Origin 透传形态变化时的既位防线，
 * 真实可达面由单测（伪造 Request）锚定。
 *
 * 注意：registerAppFileScheme 必须在 app ready 之前调用（Electron 限制）。
 * 测试：tests/unit/protocol/app-file.protocol.test.ts（URL 解析纯函数 +
 * resolveAcao 白名单 + handler ACAO 接线桶桩）。
 */
import { access, constants } from 'node:fs/promises'
import type { Protocol } from 'electron'
import { APP_FILE_SCHEME } from '../../shared/constants'
import { APP_FILE_URL_PREFIX } from '../../shared/app-file-url'
import type { FileStore } from '../services/import_/file-store'

/** paperId → file_ref 的窄查询（由 bootstrap 从 papers.repo 注入） */
export type PaperFileLookup = (paperId: string) => Promise<string | null>

// ── SR-SEC-01：CORS Origin 白名单（单源，INV-07 耦合注记）───────────
/** 字面 'null'：file:// 页发起 CORS 请求时浏览器序列化的 Origin 恒为此值 */
const ORIGIN_NULL_LITERAL = 'null'
/** dev 域名集：URL 解析取 hostname 精确等值（端口无关；renderer origin 形态
 *  变更——dev 端口/file→http 迁移等——须同步本集合，见 docs/invariants.md INV-07） */
const ALLOWED_ORIGIN_HOSTNAMES: ReadonlySet<string> = new Set(['localhost', '127.0.0.1'])

/**
 * [SR-SEC-01] Origin → ACAO 判定纯函数（本模块测试面导出；运行时仅 handler 消费）。
 * - 命中白名单（字面 'null' 或 dev 域名集 hostname 精确等值）→ 回显原值；
 * - 未命中 → undefined（=不带 ACAO 头静默）；
 * - null（无 Origin 头，非 CORS 请求）→ undefined——与字面 'null' 显式双分支。
 */
export function resolveAcao(requestOrigin: string | null): string | undefined {
  if (requestOrigin === null) return undefined
  if (requestOrigin === ORIGIN_NULL_LITERAL) return requestOrigin
  try {
    const { hostname } = new URL(requestOrigin)
    if (ALLOWED_ORIGIN_HOSTNAMES.has(hostname)) return requestOrigin
  } catch {
    // 非法 Origin 串=未命中（URL 解析抛出），静默落 undefined
  }
  return undefined
}

/** URL 解析纯函数：合法返回 paperId，非法返回 null（单测覆盖攻击向量） */
export function parseAppFileUrl(rawUrl: string): string | null {
  const prefix = APP_FILE_URL_PREFIX
  if (!rawUrl.startsWith(prefix)) return null
  // 只允许 "scheme://<id>" 或末尾一个 "/"：带路径/查询/片段一律拒绝
  const rest = decodeURIComponent(rawUrl.slice(prefix.length))
  const m = rest.match(/^([A-Za-z0-9-]{1,64})\/?$/)
  if (!m) return null
  return m[1] ?? null
}

export function registerAppFileScheme(protocol: Protocol): void {
  protocol.registerSchemesAsPrivileged([
    {
      scheme: APP_FILE_SCHEME,
      privileges: {
        standard: true,
        secure: true,
        supportFetchAPI: true,
        stream: true,
        corsEnabled: true
      }
    }
  ])
}

export function createAppFileHandler(
  lookup: PaperFileLookup,
  fileStore: FileStore
): (request: Request) => Promise<Response> {
  return async (request: Request) => {
    const paperId = parseAppFileUrl(request.url)
    if (paperId === null) {
      return errorResponse(400, '非法的文件引用 URL', request)
    }
    const fileRef = await lookup(paperId)
    if (fileRef === null) {
      return errorResponse(404, `文献不存在：${paperId}`, request)
    }
    let path: string
    try {
      path = fileStore.resolveManagedPath(fileRef)
    } catch {
      return errorResponse(403, '文件引用越界，已拒绝', request)
    }
    try {
      await access(path, constants.R_OK)
    } catch {
      return errorResponse(404, '文件不存在或不可读', request)
    }
    const bytes = await fileStore.readFileBytes(fileRef)
    // [SR-SEC-01] ACAO=白名单回显（命中才带头；undefined=静默不加）
    const headers: Record<string, string> = {
      'Content-Type': 'application/pdf',
      'Content-Length': String(bytes.byteLength)
    }
    const acao = resolveAcao(request.headers.get('origin'))
    if (acao !== undefined) headers['Access-Control-Allow-Origin'] = acao
    return new Response(new Uint8Array(bytes), { status: 200, headers })
  }
}

function errorResponse(status: number, message: string, request: Request): Response {
  // [SR-SEC-01] 错误面与成功面同接线：白名单命中才回显 ACAO（未命中=静默不加，
  // 不 403——防破坏 pdf.js loadingTask 错误分支的既有语义）
  const headers: Record<string, string> = { 'Content-Type': 'text/plain; charset=utf-8' }
  const acao = resolveAcao(request.headers.get('origin'))
  if (acao !== undefined) headers['Access-Control-Allow-Origin'] = acao
  return new Response(message, { status, headers })
}

/** 兼容旧 API 形态的显式注册（bootstrap 使用） */
export function registerAppFileProtocol(
  protocol: Protocol,
  lookup: PaperFileLookup,
  fileStore: FileStore
): void {
  protocol.handle(APP_FILE_SCHEME, createAppFileHandler(lookup, fileStore))
}
