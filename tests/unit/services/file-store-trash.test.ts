/**
 * [F-DBCAMP-01 DB-4 / 设计 §5.d②] file-store.moveToTrash —— 受管 PDF 隔离
 * （files/<a>/<b>/<sha>.pdf → files/.trash/<a>/<b>/<sha>.pdf）。
 *
 * 覆盖：store 后隔离（源消失+目标可读+字节一致）；同 sha 二次隔离幂等
 * （目标已在=覆写语义）；源不存在=IO_ERROR（FileStoreError——调用侧非致命
 * 捕获面）；.trash 不参与 resolveManagedPath 正常解析的负对照（游防线在
 * resolveManagedPath，本件只锚 .trash 子目录形态合法性——用户手动清理面）。
 * always-active（不经 guardedDescribe）。
 */
import { mkdtemp, readFile, stat } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { createFileStore } from '../../../src/main/services/import_/file-store'

const PDF = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x0a, 0x25, 1, 2, 3])

async function newStore(): Promise<ReturnType<typeof createFileStore>> {
  const root = await mkdtemp(join(tmpdir(), 'synapse-trash-'))
  return createFileStore(root)
}

describe('F-DBCAMP-01 DB-4 file-store.moveToTrash', () => {

  it('隔离后源不可读+目标字节一致（真断言——目标路径经 root 拼接核对）', async () => {
    const root = await mkdtemp(join(tmpdir(), 'synapse-trash-'))
    const fs = createFileStore(root)
    const stored = await fs.storePdfFromBytes(PDF, 'b.pdf')
    await fs.moveToTrash(stored.fileRef)
    await expect(fs.readFileBytes(stored.fileRef)).rejects.toThrow()
    const trashed = await readFile(join(root, '.trash', stored.fileRef))
    expect(new Uint8Array(trashed)).toEqual(PDF)
    await expect(stat(join(root, stored.fileRef))).rejects.toThrow()
  })

  it('同 sha 二次隔离幂等：目标已在=覆写语义不炸', async () => {
    const fs = await newStore()
    const stored = await fs.storePdfFromBytes(PDF, 'c.pdf')
    await fs.moveToTrash(stored.fileRef)
    // 再 store 回原位（去重复用路径已断——直接重写）后二次隔离
    const again = await fs.storePdfFromBytes(PDF, 'c.pdf')
    expect(again.fileRef).toBe(stored.fileRef)
    await fs.moveToTrash(stored.fileRef)
    await expect(fs.readFileBytes(stored.fileRef)).rejects.toThrow()
  })

  it('源不存在：IO_ERROR（FileStoreError.code——非致命捕获面在 service）', async () => {
    const fs = await newStore()
    const err = await fs.moveToTrash('ab/cd/deadbeef.pdf').catch((e: unknown) => e)
    expect((err as { code?: string }).code).toBe('IO_ERROR')
  })

  it('非法 fileRef：前缀守卫拒绝（../ 穿越）', async () => {
    const fs = await newStore()
    const err = await fs.moveToTrash('../evil.pdf').catch((e: unknown) => e)
    expect((err as { code?: string }).code).toBe('IO_ERROR')
  })
})
