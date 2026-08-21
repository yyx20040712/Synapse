import { mkdtemp, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, describe, expect, it } from 'vitest'
import {
  createFileStore,
  isPdfBytes,
  sha256Hex,
  FileStoreError
} from '../../../src/main/services/import_/file-store'
import { createTinyPdf } from '../../utils/pdf-factory'

const tempRoots: string[] = []
async function newStoreDir(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'file-store-'))
  tempRoots.push(dir)
  return dir
}
afterAll(async () => {
  const fs = await import('node:fs/promises')
  for (const dir of tempRoots) await fs.rm(dir, { recursive: true, force: true })
})

describe('file-store —— 受管存储（含路径穿越攻击向量）', () => {
  it('isPdfBytes：%PDF- 魔数识别', () => {
    expect(isPdfBytes(createTinyPdf())).toBe(true)
    expect(isPdfBytes(new TextEncoder().encode('%PDF-'))).toBe(false)
    expect(isPdfBytes(new TextEncoder().encode('hello'))).toBe(false)
  })

  it('sha256Hex：结果稳定且为 64 位十六进制', () => {
    const hex = sha256Hex(new Uint8Array([1, 2, 3]))
    expect(hex).toMatch(/^[0-9a-f]{64}$/)
    expect(sha256Hex(new Uint8Array([1, 2, 3]))).toBe(hex)
  })

  it('storePdfFromPath：入库返回 fileRef（分桶路径）与 sha256', async () => {
    const store = createFileStore(await newStoreDir())
    const src = join(await newStoreDir(), '论文一.pdf')
    await writeFile(src, createTinyPdf())
    const stored = await store.storePdfFromPath(src)
    expect(stored.fileRef).toMatch(/^[0-9a-f]{2}\/[0-9a-f]{2}\/[0-9a-f]{64}\.pdf$/)
    expect(stored.sha256).toMatch(/^[0-9a-f]{64}$/)
    expect(stored.sizeBytes).toBe(createTinyPdf().length)
  })

  it('去重：同内容二次入库复用同一 fileRef', async () => {
    const store = createFileStore(await newStoreDir())
    const dir = await newStoreDir()
    const a = join(dir, 'a.pdf')
    const b = join(dir, 'b.pdf')
    await writeFile(a, createTinyPdf())
    await writeFile(b, createTinyPdf())
    const first = await store.storePdfFromPath(a)
    const second = await store.storePdfFromPath(b)
    expect(second.fileRef).toBe(first.fileRef)
    expect(second.fileName).toBe('b.pdf')
  })

  it('拒绝非 PDF（UNSUPPORTED_FILE）', async () => {
    const store = createFileStore(await newStoreDir())
    const src = join(await newStoreDir(), 'fake.pdf')
    await writeFile(src, 'not a pdf at all')
    await expect(store.storePdfFromPath(src)).rejects.toMatchObject({
      name: 'FileStoreError',
      code: 'UNSUPPORTED_FILE'
    })
  })

  it('源文件不存在（IO_ERROR，消息只含文件名不含本机路径）', async () => {
    const store = createFileStore(await newStoreDir())
    let caught: unknown
    try {
      await store.storePdfFromPath('E:/不存在/xx.pdf')
    } catch (e) {
      caught = e
    }
    expect(caught).toBeInstanceOf(FileStoreError)
    expect((caught as FileStoreError).code).toBe('IO_ERROR')
    expect((caught as Error).message).not.toContain('E:/不存在')
    expect((caught as Error).message).toContain('xx.pdf')
  })

  it('原子写自愈：截断的历史残留文件（大小不符）会被重写修复', async () => {
    const store = createFileStore(await newStoreDir())
    const bytes = createTinyPdf()
    const stored = await store.storePdfFromBytes(bytes, 'a.pdf')
    // 模拟旧版直写崩溃留下的截断残留
    const fs = await import('node:fs/promises')
    const abs = store.resolveManagedPath(stored.fileRef)
    await fs.writeFile(abs, bytes.subarray(0, 10))
    const again = await store.storePdfFromBytes(bytes, 'b.pdf')
    expect(again.fileRef).toBe(stored.fileRef)
    const back = await store.readFileBytes(stored.fileRef)
    expect(Buffer.from(back).equals(Buffer.from(bytes))).toBe(true)
  })

  it('穿越攻击向量：resolveManagedPath 拒绝绝对路径/..//反斜杠/非 pdf', () => {
    const store = createFileStore('C:/fake-root')
    for (const evil of [
      'E:/evil/x.pdf',
      '../etc/passwd.pdf',
      'a\\b\\c.pdf',
      'a/b/c.exe',
      ''
    ]) {
      expect(() => store.resolveManagedPath(evil), `应拒绝：${evil}`).toThrow(FileStoreError)
    }
  })

  it('readFileBytes：读回与写入一致（UTF-8 内容无编码损坏）', async () => {
    const store = createFileStore(await newStoreDir())
    const bytes = createTinyPdf()
    const stored = await store.storePdfFromBytes(bytes, '测试.pdf')
    const back = await store.readFileBytes(stored.fileRef)
    expect(Buffer.from(back).equals(Buffer.from(bytes))).toBe(true)
    expect(new TextDecoder().decode(back.subarray(0, 5))).toBe('%PDF-')
  })
})
