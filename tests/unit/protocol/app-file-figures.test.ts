/**
 * [F-VISFB-42] app-file 协议图表分支（app-file://<paperId>/figures/<figureId>）。
 *
 * 覆盖：parseAppFigureUrl 纯函数（合法形态+攻击向量拒绝族）；handler 图表分支
 * （命中 200 image/png+字节一致/lookup null 404/file_ref 越界 403/未接线 404）；
 * PDF 分支逐字节兼容锚（parseAppFileUrl 对 figure 形态仍拒+paper URL handler
 * 行为零变）。always-active（不经 guardedDescribe）。
 */
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  createAppFileHandler,
  parseAppFigureUrl,
  parseAppFileUrl
} from '../../../src/main/protocol/app-file.protocol'
import { createFileStore, sha256Hex } from '../../../src/main/services/import_/file-store'

let root: string
beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'proto-fig-'))
})
afterEach(async () => {
  await rm(root, { recursive: true, force: true })
})

describe('F-VISFB-42 parseAppFigureUrl 纯函数', () => {
  it('合法：app-file://<paperId>/figures/<figureId> 解析出二元组', () => {
    expect(parseAppFigureUrl('app-file://p-1/figures/f-2')).toEqual({
      paperId: 'p-1',
      figureId: 'f-2'
    })
    expect(parseAppFigureUrl('app-file://a1b2c3d4-e5f6-7890-abcd-ef0123456789/figures/fig-x1')).toEqual(
      { paperId: 'a1b2c3d4-e5f6-7890-abcd-ef0123456789', figureId: 'fig-x1' }
    )
  })

  it('攻击向量全部 null（../ 注入/错段名/三段/超长/大小写/末尾斜杠）', () => {
    for (const evil of [
      'app-file://p-1/figures/f-2/',
      'app-file://p-1/figures',
      'app-file://p-1/figures/',
      'app-file://p-1/Figures/f-2',
      'app-file://p-1/wrong/f-2',
      'app-file://p-1/figures/f-2/extra',
      'app-file://../figures/f-2',
      'app-file://p-1/figures/../../etc/passwd',
      'app-file://p-1/figures/f..2',
      'app-file://p-1/figures/' + 'a'.repeat(65),
      'app-file://' + 'a'.repeat(65) + '/figures/f-2',
      'app-file://中文id/figures/f-2',
      'app-file://p-1/figures/f?x=1',
      'http://evil/p-1/figures/f-2',
      'app-file://p-1/figures/f-2#frag'
    ]) {
      expect(parseAppFigureUrl(evil), `应拒绝：${evil}`).toBeNull()
    }
  })

  it('PDF 分支逐字节兼容：parseAppFileUrl 对 figure 形态仍 null（解析口零变）', () => {
    expect(parseAppFileUrl('app-file://p-1/figures/f-2')).toBeNull()
    expect(parseAppFileUrl('app-file://paper01')).toBe('paper01')
  })
})

describe('F-VISFB-42 handler 图表分支', () => {
  it('命中：200 image/png+字节一致', async () => {
    const store = createFileStore(root)
    const bytes = new TextEncoder().encode('figure-png-bytes')
    const ref = await store.storeFigureBytes('p-1', sha256Hex(bytes), bytes)
    const handler = createAppFileHandler(async () => null, store, {
      figureLookup: async (_paperId, _figureId) => ref,
      figureFiles: store
    })
    const res = await handler(new Request('app-file://p-1/figures/f-2'))
    expect(res.status).toBe(200)
    expect(res.headers.get('Content-Type')).toBe('image/png')
    expect(new Uint8Array(await res.arrayBuffer())).toEqual(bytes)
  })

  it('lookup null：404 图表不存在', async () => {
    const store = createFileStore(root)
    const handler = createAppFileHandler(async () => null, store, {
      figureLookup: async () => null,
      figureFiles: store
    })
    const res = await handler(new Request('app-file://p-1/figures/f-none'))
    expect(res.status).toBe(404)
  })

  it('file_ref 越界：403（resolveFigurePath 拒——路径越界拒绝测试锚）', async () => {
    const store = createFileStore(root)
    const handler = createAppFileHandler(async () => null, store, {
      figureLookup: async () => 'figures/p-1/../../evil.png',
      figureFiles: store
    })
    const res = await handler(new Request('app-file://p-1/figures/f-2'))
    expect(res.status).toBe(403)
  })

  it('未接线（FigureBranch 缺席）：figure URL 404——旧装配兼容面', async () => {
    const store = createFileStore(root)
    const handler = createAppFileHandler(async () => null, store)
    const res = await handler(new Request('app-file://p-1/figures/f-2'))
    expect(res.status).toBe(404)
  })

  it('PDF 分支兼容：两参旧形态下 paper URL 行为零变（200 application/pdf）', async () => {
    const store = createFileStore(root)
    const pdfBytes = new TextEncoder().encode(
      '%PDF-1.7\n%\xe2\xe3\xcf\xd3\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n'
    )
    const stored = await store.storePdfFromBytes(pdfBytes, 'a.pdf')
    const handler = createAppFileHandler(async () => stored.fileRef, store)
    const res = await handler(new Request('app-file://p-1'))
    expect(res.status).toBe(200)
    expect(res.headers.get('Content-Type')).toBe('application/pdf')
    expect(new Uint8Array(await res.arrayBuffer())).toEqual(pdfBytes)
  })
})
