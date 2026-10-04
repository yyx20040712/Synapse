import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * [P7E-02] 拖拽导入 preload 面（always-active，无工单门）：
 * - planDroppedImports 纯函数八分支（ok/ok 边界/none/too-many/'' 滤/后缀大小写/
 *   混合/类型门——W2 回炉：目录项 type='' 击穿后缀滤的防护）；
 * - apiDrag.importDropped 三分支：none/too-many → INVALID_REQUEST 中文错误且
 *   **零通道 invoke**（合成 File/超量在 preload 堆内即拒——被攻陷 renderer 无法
 *   注入任意路径，INV-54）；ok → invoke('import/from-paths', { paths,
 *   targetFolderId }) 载荷（[F-ALIGN-01 D3] 拖拽面必携落点——INV-NEW-2）。
 * electron mock 形态复用契约测试（preload-surface.test.ts）：exposed 收集
 * exposeInMainWorld、ipcRenderer/webUtils 打桩。
 */
const exposed = vi.hoisted(() => new Map<string, unknown>())
const mocks = vi.hoisted(() => ({
  invoke: vi.fn<(channel: string, req: unknown) => Promise<unknown>>(),
  on: vi.fn<(channel: string, listener: (e: unknown, payload: unknown) => void) => void>(),
  removeListener: vi.fn<(channel: string, listener: unknown) => void>(),
  pathFor: vi.fn<(f: File) => string>()
}))

vi.mock('electron', () => ({
  contextBridge: {
    exposeInMainWorld: (key: string, value: unknown): void => {
      exposed.set(key, value)
    }
  },
  ipcRenderer: mocks,
  webUtils: { getPathForFile: mocks.pathFor }
}))

await import('../../../src/preload/index')
import { MAX_DROP_FILES, planDroppedImports } from '../../../src/preload/drag-import'

/** File 桩：planDroppedImports 不读 File 自身属性（路径解析权全在 pathFor 注入） */
function file(name: string): File {
  return { name } as File
}

/** 按文件名映射解析结果的 pathFor 桩（未登记名 → ''＝合成 File 语义） */
function pathByMap(map: Record<string, string>): (f: File) => string {
  return (f) => map[(f as { name: string }).name] ?? ''
}

describe('P7E-02 planDroppedImports —— 过滤与计数判定（纯函数）', () => {
  it('ok：单条 pdf 解析成功 → { kind: ok, paths }', () => {
    const plan = planDroppedImports([file('a.pdf')], pathByMap({ 'a.pdf': 'E:/论文/a.pdf' }))
    expect(plan).toEqual({ kind: 'ok', paths: ['E:/论文/a.pdf'] })
  })

  it('ok 边界：恰好 100 条（上限含端）', () => {
    const files = Array.from({ length: MAX_DROP_FILES }, (_, i) => file(`f${i}.pdf`))
    const pathFor = (f: File): string => `E:/${(f as { name: string }).name}`
    const plan = planDroppedImports(files, pathFor)
    expect(plan).toEqual({ kind: 'ok', paths: files.map((f) => `E:/${(f as { name: string }).name}`) })
  })

  it('none：空手与非 pdf 全滤除', () => {
    expect(planDroppedImports([], (f) => `E:/${(f as { name: string }).name}`)).toEqual({ kind: 'none' })
    expect(
      planDroppedImports([file('a.docx'), file('b.png')], pathByMap({ 'a.docx': 'E:/a.docx', 'b.png': 'E:/b.png' }))
    ).toEqual({ kind: 'none' })
  })

  it("'' 滤：合成 File（webUtils 解析得空串）逐条剔除，全空 → none", () => {
    const plan = planDroppedImports([file('a.pdf'), file('b.pdf')], () => '')
    expect(plan).toEqual({ kind: 'none' })
  })

  it('后缀大小写不敏感：A.PDF 保留；伪后缀（pdf.txt / pdff）剔除', () => {
    const plan = planDroppedImports(
      [file('A.PDF'), file('b.Pdf'), file('c.pdf.txt'), file('d.pdff')],
      pathByMap({ 'A.PDF': 'E:/A.PDF', 'b.Pdf': 'E:/b.Pdf', 'c.pdf.txt': 'E:/c.pdf.txt', 'd.pdff': 'E:/d.pdff' })
    )
    expect(plan).toEqual({ kind: 'ok', paths: ['E:/A.PDF', 'E:/b.Pdf'] })
  })

  it('混合批：非 pdf、空串解析、目录（无 .pdf 后缀）均被滤除，仅 pdf 进入载荷', () => {
    const plan = planDroppedImports(
      [file('好.pdf'), file('坏.docx'), file('合成.pdf'), file('资料目录')],
      pathByMap({ '好.pdf': 'E:/好.pdf', '坏.docx': 'E:/坏.docx', '资料目录': 'E:/资料目录' })
      // 「合成.pdf」未登记 → pathFor 返回 ''
    )
    expect(plan).toEqual({ kind: 'ok', paths: ['E:/好.pdf'] })
  })

  it('类型门（W2 回炉）：目录项 type="" 即使路径后缀 .pdf 也剔除；注册类型 application/pdf 保留', () => {
    // 目录击穿面：Windows/macOS 目录可合法命名 *.pdf——File.type 恒 ''，类型门先剔；
    // .pdf 文件在注册类型系统下 type='application/pdf' 非空——保留
    const dirLike = { name: '资料.pdf', type: '' } as File
    const pdfLike = { name: '论文.pdf', type: 'application/pdf' } as File
    const plan = planDroppedImports(
      [dirLike, pdfLike],
      pathByMap({ '资料.pdf': 'E:/资料.pdf', '论文.pdf': 'E:/论文.pdf' })
    )
    expect(plan).toEqual({ kind: 'ok', paths: ['E:/论文.pdf'] })
  })

  it('too-many：滤后 101 条 → { kind: too-many }', () => {
    const files = Array.from({ length: MAX_DROP_FILES + 1 }, (_, i) => file(`f${i}.pdf`))
    const pathFor = (f: File): string => `E:/${(f as { name: string }).name}`
    expect(planDroppedImports(files, pathFor)).toEqual({ kind: 'too-many' })
  })
})

describe('P7E-02 apiDrag.importDropped —— preload 桥三分支', () => {
  beforeEach(() => {
    mocks.invoke.mockReset()
    mocks.pathFor.mockReset()
  })

  function drag(): { importDropped(files: File[], targetFolderId: string): Promise<unknown> } {
    const d = exposed.get('apiDrag')
    if (typeof d !== 'object' || d === null) throw new Error('window.apiDrag 未暴露')
    return d as { importDropped(files: File[], targetFolderId: string): Promise<unknown> }
  }

  it('none 分支：全滤除 → INVALID_REQUEST 中文错误，零通道 invoke', async () => {
    mocks.pathFor.mockReturnValue('') // 合成 File：webUtils 解析得 ''
    const r = await drag().importDropped([file('a.pdf')], 'f-drop')
    expect(r).toEqual({
      ok: false,
      error: { code: 'INVALID_REQUEST', message: '仅支持拖入 PDF 文件' }
    })
    expect(mocks.invoke).not.toHaveBeenCalled()
  })

  it('too-many 分支：滤后超 100 → INVALID_REQUEST 中文错误，零通道 invoke', async () => {
    mocks.pathFor.mockImplementation((f) => `E:/${(f as { name: string }).name}`)
    const files = Array.from({ length: MAX_DROP_FILES + 1 }, (_, i) => file(`f${i}.pdf`))
    const r = await drag().importDropped(files, 'f-drop')
    expect(r).toEqual({
      ok: false,
      error: { code: 'INVALID_REQUEST', message: '一次最多拖入 100 个文件' }
    })
    expect(mocks.invoke).not.toHaveBeenCalled()
  })

  it('ok 分支：滤后有效 → invoke import/from-paths 携 paths+targetFolderId 载荷（[F-ALIGN-01 D3] 拖拽必携落点），响应原样透传', async () => {
    const reply = { ok: true as const, data: { imported: [], duplicates: [], failed: [] } }
    mocks.invoke.mockResolvedValue(reply)
    mocks.pathFor.mockImplementation((f) => `E:/${(f as { name: string }).name}`)
    const r = await drag().importDropped([file('一.pdf'), file('二.PDF'), file('三.docx')], 'f-drop')
    expect(mocks.invoke).toHaveBeenCalledTimes(1)
    expect(mocks.invoke).toHaveBeenCalledWith('import/from-paths', {
      paths: ['E:/一.pdf', 'E:/二.PDF'],
      targetFolderId: 'f-drop'
    })
    expect(r).toBe(reply)
  })
})
