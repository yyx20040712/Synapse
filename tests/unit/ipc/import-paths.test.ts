import { expect, it, vi } from 'vitest'
import { createImportIpc } from '../../../src/main/ipc/import_'
import { makeIpcDeps } from '../../utils/ipc-deps'

/**
 * [P7E-02] fromPaths 通道装配（always-active，无工单门）：一行委托
 * services.import_.importFiles(req.paths)——路径由 preload webUtils 桥解析注入，
 * 本通道对 renderer 隐藏（PRELOAD_HIDDEN_METHODS，INV-07 修订/INV-54）。
 * 既有 tests/unit/ipc/import_.test.ts 受锁不动，fromPaths 用例由本文件承载。
 */
it('fromPaths：请求 paths 逐参委托 importFiles，目录导入不被触碰', async () => {
  const importFiles = vi.fn(async () => ({
    imported: [{ id: 'p1' }, { id: 'p2' }],
    duplicates: ['重复.pdf'],
    failed: [{ fileName: '坏.pdf', reason: '损坏' }]
  }))
  const importFolder = vi.fn(async () => ({ imported: [], duplicates: [], failed: [] }))
  const ipc = createImportIpc(
    makeIpcDeps({ services: { import_: { importFiles, importFolder } as never } })
  )

  const r = await ipc.fromPaths({ paths: ['E:/拖拽一.pdf', 'E:/拖拽二.pdf'] })

  expect(importFiles).toHaveBeenCalledTimes(1)
  expect(importFiles).toHaveBeenCalledWith(['E:/拖拽一.pdf', 'E:/拖拽二.pdf'])
  expect(importFolder).not.toHaveBeenCalled()
  // importFiles 的三项计数语义原样透传（装配层不改写结果）
  expect(r.imported).toHaveLength(2)
  expect(r.duplicates).toEqual(['重复.pdf'])
  expect(r.failed).toEqual([{ fileName: '坏.pdf', reason: '损坏' }])
})

it('fromPaths：importFiles 抛异常时原样上抛（异常折叠归 register 统一层）', async () => {
  const boom = new Error('导入服务故障')
  const ipc = createImportIpc(
    makeIpcDeps({
      services: { import_: { importFiles: vi.fn(async () => Promise.reject(boom)), importFolder: vi.fn() } as never }
    })
  )
  await expect(ipc.fromPaths({ paths: ['E:/a.pdf'] })).rejects.toBe(boom)
})
