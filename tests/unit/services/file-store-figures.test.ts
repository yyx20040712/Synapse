/**
 * [F-VISFB-42] file-store 图表资产分支（figures/<paperId>/<digest>.png 内容寻址）。
 *
 * 覆盖：storeFigureBytes 落盘字节一致+同参幂等；resolveFigurePath 严格形态
 * （路径越界拒绝族——../ 注入/绝对路径/异形 ref/后缀混入）；removePaperFigures
 * 整目录硬删+PDF 资产不受扰+缺席幂等；PDF 分支逐字节兼容锚
 * （resolveManagedPath 原行为零变：合法 pdf ref 照常解析+figure ref 拒）。
 * always-active（不经 guardedDescribe）；真文件（mkdtemp 受管根）。
 */
import { mkdtemp, readFile, rm, stat } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  createFileStore,
  FileStoreError,
  sha256Hex
} from '../../../src/main/services/import_/file-store'

const PDF_BYTES = new TextEncoder().encode(
  '%PDF-1.7\n%\xe2\xe3\xcf\xd3\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n'
)

let root: string
beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'fs-fig-'))
})
afterEach(async () => {
  await rm(root, { recursive: true, force: true })
})

describe('F-VISFB-42 file-store 图表资产分支', () => {
  it('storeFigureBytes：内容寻址落盘（figures/<pid>/<digest>.png）+字节一致+同参幂等', async () => {
    const store = createFileStore(root)
    const bytes = new TextEncoder().encode('png-proxy-bytes-1')
    const digest = sha256Hex(bytes)
    const ref = await store.storeFigureBytes('p-1', digest, bytes)
    expect(ref).toBe(`figures/p-1/${digest}.png`)
    const onDisk = new Uint8Array(await readFile(join(root, ref)))
    expect(onDisk).toEqual(bytes)
    const ref2 = await store.storeFigureBytes('p-1', digest, bytes)
    expect(ref2).toBe(ref)
    const again = new Uint8Array(await readFile(join(root, ref2)))
    expect(again).toEqual(bytes)
  })

  it('storeFigureBytes：参数形态校验（paperId 越界字符/digest 非 hex64 拒）', async () => {
    const store = createFileStore(root)
    const bytes = new TextEncoder().encode('x')
    const digest = sha256Hex(bytes)
    await expect(store.storeFigureBytes('../evil', digest, bytes)).rejects.toBeInstanceOf(
      FileStoreError
    )
    await expect(store.storeFigureBytes('p/1', digest, bytes)).rejects.toBeInstanceOf(FileStoreError)
    await expect(store.storeFigureBytes('p-1', 'NOT-HEX', bytes)).rejects.toBeInstanceOf(
      FileStoreError
    )
    await expect(store.storeFigureBytes('p-1', digest.slice(0, 63), bytes)).rejects.toBeInstanceOf(
      FileStoreError
    )
  })

  it('resolveFigurePath：合法寻址；路径越界拒绝族全拒（测试锚）', async () => {
    const store = createFileStore(root)
    const bytes = new TextEncoder().encode('y')
    const digest = sha256Hex(bytes)
    const ref = await store.storeFigureBytes('p-1', digest, bytes)
    expect(store.resolveFigurePath(ref)).toBe(join(root, ref))
    const evil = [
      `figures/p-1/${digest}.pdf`,
      'figures/../p-1/x.png',
      'figures/p-1/../p-2/x.png',
      `ab/cd/${digest}.png`,
      `${ref}/../../etc/passwd`,
      join(root, ref),
      `figures\\p-1\\${digest}.png`,
      `figures/p-1/${digest.toUpperCase()}.png`,
      'figures/p-1/.png'
    ]
    for (const e of evil) {
      expect(() => store.resolveFigurePath(e), `应拒绝：${e}`).toThrow(FileStoreError)
    }
  })

  it('removePaperFigures：整目录硬删+缺席幂等', async () => {
    const store = createFileStore(root)
    const b1 = new TextEncoder().encode('a')
    const b2 = new TextEncoder().encode('b')
    await store.storeFigureBytes('p-1', sha256Hex(b1), b1)
    await store.storeFigureBytes('p-1', sha256Hex(b2), b2)
    const dirBefore = await stat(join(root, 'figures', 'p-1'))
    expect(dirBefore.isDirectory()).toBe(true)
    await store.removePaperFigures('p-1')
    await expect(stat(join(root, 'figures', 'p-1'))).rejects.toThrow()
    await expect(store.removePaperFigures('p-1')).resolves.toBeUndefined()
  })

  it('removePaperFigures：他篇目录与受管 PDF 隔离资产不受扰', async () => {
    const store = createFileStore(root)
    const b1 = new TextEncoder().encode('a')
    await store.storeFigureBytes('p-1', sha256Hex(b1), b1)
    await store.storeFigureBytes('p-2', sha256Hex(b1), b1)
    const stored = await store.storePdfFromBytes(PDF_BYTES, 'a.pdf')
    await store.moveToTrash(stored.fileRef)
    await store.removePaperFigures('p-1')
    const p2 = await stat(join(root, 'figures', 'p-2'))
    expect(p2.isDirectory()).toBe(true)
    const trashed = await stat(join(root, '.trash', stored.fileRef))
    expect(trashed.isFile()).toBe(true)
  })

  it('PDF 分支逐字节兼容：resolveManagedPath 原行为零变（pdf ref 照常+figure ref 拒）', () => {
    const store = createFileStore(root)
    expect(store.resolveManagedPath('ab/cd/abcdef.pdf')).toBe(join(root, 'ab/cd/abcdef.pdf'))
    const bytes = new TextEncoder().encode('z')
    const digest = sha256Hex(bytes)
    expect(() => store.resolveManagedPath(`figures/p-1/${digest}.png`)).toThrow(FileStoreError)
  })
})
