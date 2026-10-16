/**
 * 受管文件存储（SR-INFRA-04，已完成）。
 *
 * 职责：PDF 唯一存放地（userData/files）的守门人。
 * - storePdfFromPath：sha256 去重拷贝入库（<前2字符>/<次2字符>/<sha>.pdf 分桶）
 * - resolveManagedPath：file_ref → 绝对路径，强制前缀校验（目录穿越拒绝）
 * - readFileBytes：协议层读取
 * - [F-VISFB-42] 图表资产分支：figures/<paperId>/<digest>.png 内容寻址
 *   （storeFigureBytes 原子写/resolveFigurePath 严格形态校验/removePaperFigures
 *   硬删整目录——派生物可重建，不走 .trash 隔离）
 *
 * 安全（§6.3）：file_ref 一律相对路径+正斜杠；解析结果必须在受管根内。
 * 测试：tests/unit/services/file-store.test.ts（去重/穿越攻击向量/非 PDF 拒绝）。
 */
import { createHash } from 'node:crypto'
import { mkdir, readFile, rename, rm, stat } from 'node:fs/promises'
import { isAbsolute, resolve, sep, win32 } from 'node:path'
import { atomicWriteFile } from '../shared/atomic-write'
import { DomainError } from '../shared/domain-error'

/** 受管存储域错误（基类一行继承——name/code 经 shared/domain-error 自动落，
 *  F-DEDUP-01 单源；受锁测试 import 本导出面，出口保持 file-store.ts 不变） */
export class FileStoreError extends DomainError {}

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
  /**
   * [F-DBCAMP-01 DB-4 / 设计 §5.d②] 受管 PDF 隔离：files/<a>/<b>/<sha>.pdf →
   * files/.trash/<a>/<b>/<sha>.pdf（mkdir recursive+rename）。目标已在=覆写
   * 语义（同 sha 二次隔离幂等）。失败抛 FileStoreError(IO_ERROR)——调用侧
   * （papers/folders delete）非致命捕获（孤儿文件=既定边界）。purge 不在
   * 本面（用户手动清理）。
   */
  moveToTrash(fileRef: string): Promise<void>
}

/**
 * [F-VISFB-42] 图表资产分支接口（受管存储的派生资产面——与 FileStore 分置：
 * 受锁协议测试桩把 FileStore 五方法形状钉死，figure 面独立接口零扰动）。
 * createFileStore 产物=FileStore & FigureFileStore（同一受管根）。
 */
export interface FigureFileStore {
  /**
   * 派生图表资产写：figures/<paperId>/<digest>.png 内容寻址（同参已存在且
   * 大小一致=复用不重写）；返回 fileRef。字节编码面归调用方（本件不校验
   * PNG 魔数——载荷上界由 figure-store 守卫）。
   */
  storeFigureBytes(paperId: string, digest: string, bytes: Uint8Array): Promise<string>
  /**
   * figure file_ref 形态校验+寻址（严格 figures/<paperId>/<digest-hex64>.png
   * 形态；越界/异形抛 FileStoreError——协议层 403 源）。PDF 分支
   * resolveManagedPath 零变（既有 fileRef 解析零变）。
   */
  resolveFigurePath(fileRef: string): string
  /**
   * 硬删该篇全部图表资产（figures/<paperId>/ 整目录 rm——派生物可重建非用户
   * 原始资产，不走 .trash 隔离=与受管 PDF moveToTrash 的语义差异〔INV-133
   * 扩面申报行〕）；目录缺席=幂等成功；失败抛 FileStoreError。
   */
  removePaperFigures(paperId: string): Promise<void>
}

const PDF_MAGIC = '%PDF-'

/** 隔离区目录名（受管根下隐藏目录——resolveManagedPath 正常解析不含此前缀：
 *  papers.file_ref 恒 store() 产物，.trash 路径不参与受管解析） */
const TRASH_DIR = '.trash'

/** [F-VISFB-42] 图表资产目录名（受管根下与 PDF 分桶平行的派生资产面） */
const FIGURES_DIR = 'figures'

/** figure 资产参数/路径形态单源（ASCII 寻址：paperId 字符集白名单〔parseAppFileUrl
 *  同款〕+digest=解码位图 sha256 hex64——00B digest 单键；file_ref 三段严格形态） */
const FIGURE_ID_RE = /^[A-Za-z0-9-]{1,64}$/
const FIGURE_DIGEST_RE = /^[0-9a-f]{64}$/
const FIGURE_REF_RE = /^figures\/([A-Za-z0-9-]{1,64})\/([0-9a-f]{64})\.png$/

export function createFileStore(rootDir: string): FileStore & FigureFileStore {
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
    // win32 形态绝对路径（E:/x、\\server\share UNC）在 posix.isAbsolute 下漏判落相对
    // 目录名=放行语义缺陷（F-PLATFORM-01——Linux 平台实证）
    if (isAbsolute(fileRef) || win32.isAbsolute(fileRef) || fileRef.includes('..') || fileRef.includes('\\')) {
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

  /** [F-VISFB-42] figure file_ref 严格形态校验+受管前缀校验（三段正则单源：
   *  ../ 段/绝对路径/后缀混入/大小写 digest 异形全拒——测试锚） */
  function resolveFigurePath(fileRef: string): string {
    if (typeof fileRef !== 'string' || fileRef === '') {
      throw new FileStoreError('IO_ERROR', 'figure file_ref 不能为空')
    }
    if (isAbsolute(fileRef) || win32.isAbsolute(fileRef) || fileRef.includes('\\')) {
      throw new FileStoreError('IO_ERROR', `非法 figure file_ref：${fileRef}`)
    }
    if (!FIGURE_REF_RE.test(fileRef)) {
      throw new FileStoreError('IO_ERROR', `非法 figure file_ref（须 figures/<paperId>/<digest>.png）：${fileRef}`)
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
        const raw = e instanceof Error ? e.message : String(e)
        // 平台无关脱敏：底层错误回显的原始全路径（verbatim+两种全量斜杠规范化
        // 形态——Windows/Linux 规范化方向相反）降为文件名；混合斜杠形态无已知产生源
        const safe = raw
          .replaceAll(srcPath, basename(srcPath))
          .replaceAll(srcPath.replaceAll('/', '\\'), basename(srcPath))
          .replaceAll(srcPath.replaceAll('\\', '/'), basename(srcPath))
        // 错误消息只含文件名不含本机全路径（错误会跨 IPC 展示）
        throw new FileStoreError('IO_ERROR', `读取源文件失败：${basename(srcPath)}（${safe}）`)
      }
      const fileName = basename(srcPath)
      return store(bytes, fileName)
    },
    storePdfFromBytes: (bytes, fileName) => store(bytes, fileName),
    resolveManagedPath,
    // [F-VISFB-42] 图表资产写：参数形态先守卫（paperId 白名单+digest hex64——
    // 路径段零拼接来源），落盘=atomicWriteFile 单源（tmp+rename 同卷原子）
    storeFigureBytes: async (paperId, digest, bytes) => {
      if (!FIGURE_ID_RE.test(paperId)) {
        throw new FileStoreError('IO_ERROR', `非法图表资产 paperId：${paperId}`)
      }
      if (!FIGURE_DIGEST_RE.test(digest)) {
        throw new FileStoreError('IO_ERROR', '非法图表资产 digest（须 hex64 sha256）')
      }
      const fileRef = `${FIGURES_DIR}/${paperId}/${digest}.png`
      const dest = resolveFigurePath(fileRef)
      const existing = await stat(dest).catch(() => null)
      if (existing !== null && existing.size === bytes.length) {
        // 内容寻址复用：同路径同大小=同 digest 同内容（sha256 抗碰撞性承载）
        return fileRef
      }
      try {
        await mkdir(dirname(dest), { recursive: true })
        await atomicWriteFile(dest, bytes, { uniqueTmp: true, cleanOnFail: true })
      } catch (e) {
        throw new FileStoreError(
          'IO_ERROR',
          `写入图表资产失败：${digest}.png（${e instanceof Error ? e.message : String(e)}）`
        )
      }
      return fileRef
    },
    resolveFigurePath,
    // [F-VISFB-42] 硬删：派生物可重建——不走 .trash（与受管 PDF 隔离语义差异
    // =INV-133 扩面申报行）；目录缺席 force=true 吞 ENOENT=幂等成功
    removePaperFigures: async (paperId) => {
      if (!FIGURE_ID_RE.test(paperId)) {
        throw new FileStoreError('IO_ERROR', `非法图表资产 paperId：${paperId}`)
      }
      try {
        await rm(resolve(root, FIGURES_DIR, paperId), { recursive: true, force: true })
      } catch (e) {
        throw new FileStoreError(
          'IO_ERROR',
          `硬删图表资产目录失败：${paperId}（${e instanceof Error ? e.message : String(e)}）`
        )
      }
    },
    // [F-DBCAMP-01 DB-4] 隔离：前缀守卫复用 resolveManagedPath（file_ref 合法性
    // 单源——非法引用在移动前即拒）；dest=受管根内 .trash 同桶路径
    moveToTrash: async (fileRef) => {
      const src = resolveManagedPath(fileRef)
      const dest = resolve(root, TRASH_DIR, fileRef)
      // [回炉 r1-R6] mkdir 与 rename 同入 try——「失败抛 FileStoreError(IO_ERROR)」
      // 契约全覆盖（mkdir EACCES/ENOSPC 原生 Error 违契面封堵）
      try {
        await mkdir(dirname(dest), { recursive: true })
        await rename(src, dest)
      } catch (e) {
        throw new FileStoreError(
          'IO_ERROR',
          `移入隔离区失败：${basename(dest)}（${e instanceof Error ? e.message : String(e)}）`
        )
      }
    },
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
  // 原子写单源=services/shared/atomic-write（F-DEDUP-01）：先写同目录临时文件
  // （uniqueTmp），成功后 rename 到最终路径。
  // 直写目标路径一旦中途崩溃会留下截断文件，而文件名=内容 sha256 会让去重逻辑
  // 永久复用损坏文件（无法通过重新导入自愈）；rename 在同卷上原子。
  // 错误消息只含文件名不含本机全路径（错误会跨 IPC 展示）——FileStoreError
  // 包装与 basename-only 文案留在调用侧（单源原样上抛 fs 错误，域化归调用方）。
  try {
    await atomicWriteFile(dest, bytes, { uniqueTmp: true, cleanOnFail: true })
  } catch (e) {
    throw new FileStoreError(
      'IO_ERROR',
      `写入受管文件失败：${basename(dest)}（${e instanceof Error ? e.message : String(e)}）`
    )
  }
}
