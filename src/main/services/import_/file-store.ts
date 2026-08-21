/**
 * 受管文件存储（SR-INFRA-04，已完成）。
 *
 * 职责：PDF 唯一存放地（userData/files）的守门人。
 * - storePdfFromPath：sha256 去重拷贝入库（<前2字符>/<次2字符>/<sha>.pdf 分桶）
 * - resolveManagedPath：file_ref → 绝对路径，强制前缀校验（目录穿越拒绝）
 * - readFileBytes：协议层读取
 *
 * 安全（§6.3）：file_ref 一律相对路径+正斜杠；解析结果必须在受管根内。
 * 测试：tests/unit/services/file-store.test.ts（去重/穿越攻击向量/非 PDF 拒绝）。
 */
import { createHash, randomUUID } from 'node:crypto'
import { mkdir, readFile, stat } from 'node:fs/promises'
import { isAbsolute, resolve, sep } from 'node:path'
import type { AppErrorCode } from '../../../shared/app-error'

export class FileStoreError extends Error {
  readonly code: AppErrorCode

  constructor(code: AppErrorCode, message: string) {
    super(message)
    this.name = 'FileStoreError'
    this.code = code
  }
}

export interface StoredFile {
  /** 受管存储内相对路径（正斜杠），如 "ab/cd/<sha>.pdf" */
  fileRef: string
  sha256: string
  sizeBytes: number
  fileName: string
}

export interface FileStore {
  storePdfFromPath(srcPath: string): Promise<StoredFile>
  storePdfFromBytes(bytes: Uint8Array, fileName: string): Promise<StoredFile>
  resolveManagedPath(fileRef: string): string
  readFileBytes(fileRef: string): Promise<Uint8Array>
}

const PDF_MAGIC = '%PDF-'

export function createFileStore(rootDir: string): FileStore {
  const root = resolve(rootDir)

  async function store(bytes: Uint8Array, fileName: string): Promise<StoredFile> {
    if (!isPdfBytes(bytes)) {
      throw new FileStoreError('UNSUPPORTED_FILE', `不是有效的 PDF 文件：${fileName}`)
    }
    const sha256 = sha256Hex(bytes)
    const fileRef = `${sha256.slice(0, 2)}/${sha256.slice(2, 4)}/${sha256}.pdf`
    const dest = resolveManagedPath(fileRef)
    await mkdir(dirname(dest), { recursive: true })
    const existing = await stat(dest).catch(() => null)
    if (existing && existing.size === bytes.length) {
      // 已存在且大小一致：同内容文件，直接复用（去重）
    } else {
      // 不存在，或历史残留的截断文件（大小不符）：原子重写
      await copyOrWrite(dest, bytes)
    }
    return { fileRef, sha256, sizeBytes: bytes.length, fileName }
  }

  function resolveManagedPath(fileRef: string): string {
    if (typeof fileRef !== 'string' || fileRef === '') {
      throw new FileStoreError('IO_ERROR', 'file_ref 不能为空')
    }
    if (isAbsolute(fileRef) || fileRef.includes('..') || fileRef.includes('\\')) {
      throw new FileStoreError('IO_ERROR', `非法 file_ref：${fileRef}`)
    }
    if (!fileRef.endsWith('.pdf')) {
      throw new FileStoreError('IO_ERROR', `受管存储只接受 .pdf：${fileRef}`)
    }
    const resolved = resolve(root, fileRef)
    if (resolved !== root && !resolved.startsWith(root + sep)) {
      throw new FileStoreError('IO_ERROR', `路径越出受管存储：${fileRef}`)
    }
    return resolved
  }

  return {
    storePdfFromPath: async (srcPath) => {
      let bytes: Uint8Array
      try {
        bytes = await readFile(srcPath)
      } catch (e) {
        // 错误消息只含文件名不含本机全路径（错误会跨 IPC 展示）
        throw new FileStoreError(
          'IO_ERROR',
          `读取源文件失败：${basename(srcPath)}（${e instanceof Error ? e.message : String(e)}）`
        )
      }
      const fileName = basename(srcPath)
      return store(bytes, fileName)
    },
    storePdfFromBytes: (bytes, fileName) => store(bytes, fileName),
    resolveManagedPath,
    readFileBytes: async (fileRef) => {
      const path = resolveManagedPath(fileRef)
      try {
        return new Uint8Array(await readFile(path))
      } catch (e) {
        throw new FileStoreError(
          'IO_ERROR',
          `读取受管文件失败：${fileRef}（${e instanceof Error ? e.message : String(e)}）`
        )
      }
    }
  }
}

// ── 纯函数（直接导出供单测）────────────────────────────────────────

export function isPdfBytes(bytes: Uint8Array): boolean {
  // %PDF- 后必须跟版本号数字（孤立 "%PDF-" 不是合法 PDF）
  if (bytes.length < 8) return false
  if (String.fromCharCode(...bytes.subarray(0, 5)) !== PDF_MAGIC) return false
  const versionDigit = String.fromCharCode(bytes[5] ?? 0)
  return versionDigit >= '0' && versionDigit <= '9'
}

export function sha256Hex(bytes: Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex')
}

// ── 极简路径工具（避免引入 win32 语义歧义）──────────────────────────

function dirname(p: string): string {
  const idx = p.lastIndexOf(sep)
  return idx === -1 ? '.' : p.slice(0, idx)
}

function basename(p: string): string {
  const norm = p.replaceAll('\\', '/')
  const idx = norm.lastIndexOf('/')
  return idx === -1 ? norm : norm.slice(idx + 1)
}

async function copyOrWrite(dest: string, bytes: Uint8Array): Promise<void> {
  // 原子写：先写同目录临时文件，成功后 rename 到最终路径。
  // 直写目标路径一旦中途崩溃会留下截断文件，而文件名=内容 sha256 会让去重逻辑
  // 永久复用损坏文件（无法通过重新导入自愈）；rename 在同卷上原子。
  // 错误消息只含文件名不含本机全路径（错误会跨 IPC 展示）。
  const { writeFile, rename, rm } = await import('node:fs/promises')
  const tmp = `${dest}.tmp-${randomUUID()}`
  try {
    await writeFile(tmp, bytes)
    await rename(tmp, dest)
  } catch (e) {
    await rm(tmp, { force: true }).catch(() => undefined)
    throw new FileStoreError(
      'IO_ERROR',
      `写入受管文件失败：${basename(dest)}（${e instanceof Error ? e.message : String(e)}）`
    )
  }
}
