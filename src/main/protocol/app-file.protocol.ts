/**
 * app-file:// 自定义协议（SR-INFRA-08，已完成）。
 *
 * 职责：renderer 获取受管 PDF 的唯一通道。URL 形如 app-file://<paperId>。
 * 安全（§6.3）：id 字符集白名单（防路径把戏）→ 查库拿 file_ref → 受管前缀校验
 * → 才读文件。renderer 全程接触不到文件系统路径。
 *
 * 注意：registerAppFileScheme 必须在 app ready 之前调用（Electron 限制）。
 * 测试：tests/unit/protocol/app-file.protocol.test.ts（URL 解析纯函数 + 桶桩）。
 */
import { access, constants } from 'node:fs/promises'
import type { Protocol, ProtocolResponse } from 'electron'
import { APP_FILE_SCHEME } from '../../shared/constants'
import type { FileStore } from '../services/import_/file-store'

/** paperId → file_ref 的窄查询（由 bootstrap 从 papers.repo 注入） */
export type PaperFileLookup = (paperId: string) => Promise<string | null>

/** URL 解析纯函数：合法返回 paperId，非法返回 null（单测覆盖攻击向量） */
export function parseAppFileUrl(rawUrl: string): string | null {
  const prefix = `${APP_FILE_SCHEME}://`
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
      return errorResponse(400, '非法的文件引用 URL')
    }
    const fileRef = await lookup(paperId)
    if (fileRef === null) {
      return errorResponse(404, `文献不存在：${paperId}`)
    }
    let path: string
    try {
      path = fileStore.resolveManagedPath(fileRef)
    } catch {
      return errorResponse(403, '文件引用越界，已拒绝')
    }
    try {
      await access(path, constants.R_OK)
    } catch {
      return errorResponse(404, '文件不存在或不可读')
    }
    const bytes = await fileStore.readFileBytes(fileRef)
    return new Response(new Uint8Array(bytes), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Length': String(bytes.byteLength),
        'Access-Control-Allow-Origin': '*'
      }
    })
  }
}

function errorResponse(status: number, message: string): Response {
  return new Response(message, {
    status,
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Access-Control-Allow-Origin': '*' }
  })
}

/** 兼容旧 API 形态的显式注册（bootstrap 使用） */
export function registerAppFileProtocol(
  protocol: Protocol,
  lookup: PaperFileLookup,
  fileStore: FileStore
): void {
  protocol.handle(APP_FILE_SCHEME, createAppFileHandler(lookup, fileStore))
}

export type { ProtocolResponse }
