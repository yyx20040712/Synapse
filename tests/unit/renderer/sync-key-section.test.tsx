// @vitest-environment jsdom
/**
 * [F-DBCAMP-01 DB-3 U2] SyncKeySection 锁定测试（always-active——jsdom 习式=
 * budget-section.test.tsx：createRoot+act；api 桩=makeApiStub snapshot 面）。
 *
 * 覆盖（简报③-6/③-8.5）：节标题「同步密钥」真文本渲染；bundle 文本形态
 * （uuid:64-hex 正则）；QR svg 在场（rect>0——渲染面 DOM 断言承载 e2e 替代
 * 形态，③-11）；导入非法串→错误 toast 零 api 调用；导入合法→api 调用+列表
 * 刷新；移除→api 调用。
 */
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { makeApiStub, toastSpy } from '../../utils/api-client-mock'

const stubApi = makeApiStub({
  snapshot: {
    getSyncKey: vi.fn(),
    importPeerKey: vi.fn(),
    listPeerKeys: vi.fn(),
    removePeerKey: vi.fn(),
    exportToFile: vi.fn(),
    importFromFile: vi.fn()
  }
})

import { SyncKeySection } from '../../../src/renderer/features/settings/SyncKeySection'
import { IMPORT_REASON_ZH } from '../../../src/renderer/features/settings/SnapshotImportButton'
import { SNAPSHOT_IMPORT_REJECT_REASONS } from '../../../src/shared/ipc/schemas'

;(globalThis as unknown as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true

const OWNER = '3f2b8a04-5c6d-4e1f-9a2b-7c8d9e0f1a2b'
const PEER = '4d3c9b15-6e7f-4a2b-8c3d-0f1a2b3c4d5e'
const BUNDLE = `${OWNER}:${'ab'.repeat(32)}`

let root: Root | null = null
let host: HTMLDivElement | null = null

async function settle(ticks = 6): Promise<void> {
  await act(async () => {
    for (let i = 0; i < ticks; i += 1) {
      await Promise.resolve()
    }
  })
}

async function mount(): Promise<void> {
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  await act(async () => {
    root?.render(<SyncKeySection />)
  })
  await settle()
}

function clickButton(text: string): void {
  const el = Array.from(host?.querySelectorAll('button') ?? []).find((b) => b.textContent === text)
  if (!(el instanceof HTMLButtonElement)) {
    throw new Error(`按钮不在场：${text}`)
  }
  act(() => {
    el.click()
  })
}

function setImportInput(value: string): void {
  const el = host?.querySelector('textarea[aria-label="导入同步密钥"]')
  if (!(el instanceof HTMLTextAreaElement)) {
    throw new Error('导入 textarea 不在场')
  }
  const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!
  act(() => {
    setter.call(el, value)
    el.dispatchEvent(new Event('input', { bubbles: true }))
  })
}

beforeEach(() => {
  vi.mocked(stubApi.snapshot.getSyncKey).mockReset()
  vi.mocked(stubApi.snapshot.listPeerKeys).mockReset()
  vi.mocked(stubApi.snapshot.importPeerKey).mockReset()
  vi.mocked(stubApi.snapshot.removePeerKey).mockReset()
  vi.mocked(stubApi.snapshot.exportToFile).mockReset()
  vi.mocked(stubApi.snapshot.importFromFile).mockReset()
  toastSpy.mockClear()
})

/** [回炉 R3/R11a] 挂载基座（导出钮在 bundle 区内）+clipboard mock 安装 */
async function mountWithKey(): Promise<void> {
  stubApi.snapshot.getSyncKey.mockResolvedValue({
    ok: true,
    data: { ownerId: OWNER, syncKey: 'ab'.repeat(32), bundle: BUNDLE }
  })
  stubApi.snapshot.listPeerKeys.mockResolvedValue({ ok: true, data: { peers: [] } })
  await mount()
}

describe('F-DBCAMP-01 DB-3 U2 SyncKeySection —— 设置页同步密钥节', () => {
  it('节标题「同步密钥」真文本渲染+说明文案在场（密钥不随快照传输——带外分发）', async () => {
    stubApi.snapshot.getSyncKey.mockResolvedValue({
      ok: true,
      data: { ownerId: OWNER, syncKey: 'ab'.repeat(32), bundle: BUNDLE }
    })
    stubApi.snapshot.listPeerKeys.mockResolvedValue({ ok: true, data: { peers: [] } })
    await mount()
    expect(host?.textContent).toContain('同步密钥')
    expect(host?.textContent).toContain('带外')
    root?.unmount()
  })

  it('bundle 文本形态=uuid:64-hex（等宽展示）+QR svg 在场（rect>0）', async () => {
    stubApi.snapshot.getSyncKey.mockResolvedValue({
      ok: true,
      data: { ownerId: OWNER, syncKey: 'ab'.repeat(32), bundle: BUNDLE }
    })
    stubApi.snapshot.listPeerKeys.mockResolvedValue({ ok: true, data: { peers: [] } })
    await mount()
    const bundleEl = host?.querySelector('[data-testid="sync-key-bundle"]')
    expect(bundleEl?.textContent).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}:[0-9a-f]{64}$/)
    const rects = host?.querySelectorAll('[data-testid="sync-key-qr"] rect')
    expect((rects?.length ?? 0)).toBeGreaterThan(0)
    root?.unmount()
  })

  it('导入非法串→错误 toast+importPeerKey 零调用（本地预校验拦）', async () => {
    stubApi.snapshot.getSyncKey.mockResolvedValue({
      ok: true,
      data: { ownerId: OWNER, syncKey: 'ab'.repeat(32), bundle: BUNDLE }
    })
    stubApi.snapshot.listPeerKeys.mockResolvedValue({ ok: true, data: { peers: [] } })
    await mount()
    setImportInput('not-a-bundle')
    clickButton('导入')
    await settle()
    expect(stubApi.snapshot.importPeerKey).not.toHaveBeenCalled()
    expect(toastSpy).toHaveBeenCalledWith(expect.stringContaining('格式不正确'), 'error')
    root?.unmount()
  })

  it('导入合法→importPeerKey 调用+对端列表刷新呈现（owner 短标=uuid 前 8 位）', async () => {
    stubApi.snapshot.getSyncKey.mockResolvedValue({
      ok: true,
      data: { ownerId: OWNER, syncKey: 'ab'.repeat(32), bundle: BUNDLE }
    })
    stubApi.snapshot.listPeerKeys.mockResolvedValue({ ok: true, data: { peers: [] } })
    await mount()
    stubApi.snapshot.importPeerKey.mockResolvedValue({ ok: true, data: { ownerId: PEER } })
    stubApi.snapshot.listPeerKeys.mockResolvedValue({
      ok: true,
      data: { peers: [{ ownerId: PEER, importedAt: '2026-10-15T08:00:00.000Z' }] }
    })
    setImportInput(`${PEER}:${'cd'.repeat(32)}`)
    clickButton('导入')
    await settle()
    expect(stubApi.snapshot.importPeerKey).toHaveBeenCalledWith({ bundle: `${PEER}:${'cd'.repeat(32)}` })
    expect(stubApi.snapshot.listPeerKeys).toHaveBeenCalledTimes(2)
    expect(host?.textContent).toContain(PEER.slice(0, 8))
    expect(toastSpy).toHaveBeenCalledWith('同步密钥已导入', 'success')
    root?.unmount()
  })

  it('移除对端→removePeerKey 调用+列表刷新为空', async () => {
    stubApi.snapshot.getSyncKey.mockResolvedValue({
      ok: true,
      data: { ownerId: OWNER, syncKey: 'ab'.repeat(32), bundle: BUNDLE }
    })
    stubApi.snapshot.listPeerKeys.mockResolvedValue({
      ok: true,
      data: { peers: [{ ownerId: PEER, importedAt: '2026-10-15T08:00:00.000Z' }] }
    })
    await mount()
    stubApi.snapshot.removePeerKey.mockResolvedValue({ ok: true, data: { removed: true } })
    stubApi.snapshot.listPeerKeys.mockResolvedValue({ ok: true, data: { peers: [] } })
    clickButton('移除')
    await settle()
    expect(stubApi.snapshot.removePeerKey).toHaveBeenCalledWith({ ownerId: PEER })
    expect(host?.querySelector('[data-testid="sync-key-peers"]')).toBeNull()
    root?.unmount()
  })

  it('[回炉 R3] 导出快照成功：exportToFile 调用+成功 toast 含卷号（第 N 卷）', async () => {
    await mountWithKey()
    stubApi.snapshot.exportToFile.mockResolvedValue({
      ok: true,
      data: { filePath: '/x/synapse-snapshot.synsnap', snapshotSeq: 3, tableCounts: { papers: 1 } }
    })
    clickButton('导出快照到文件')
    await settle()
    expect(stubApi.snapshot.exportToFile).toHaveBeenCalledWith({})
    expect(toastSpy).toHaveBeenCalledWith('快照已导出（第 3 卷）', 'success')
    root?.unmount()
  })

  it('[回炉 R3] 导出取消：CANCELLED 回包→info toast 已取消导出（非 error 面）', async () => {
    await mountWithKey()
    stubApi.snapshot.exportToFile.mockResolvedValue({
      ok: false,
      error: { code: 'CANCELLED', message: '已取消保存' }
    })
    clickButton('导出快照到文件')
    await settle()
    expect(toastSpy).toHaveBeenCalledWith('已取消导出', 'info')
    expect(toastSpy).not.toHaveBeenCalledWith(expect.anything(), 'error')
    root?.unmount()
  })

  it('[回炉 R11a] 复制按钮：navigator.clipboard.writeText 收 bundle 全串+成功 toast', async () => {
    const writeText = vi.fn(async () => undefined)
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true
    })
    await mountWithKey()
    clickButton('复制')
    await settle()
    expect(writeText).toHaveBeenCalledWith(BUNDLE)
    expect(toastSpy).toHaveBeenCalledWith('同步密钥已复制', 'success')
    root?.unmount()
  })

  // [F-DBCAMP-01 DB-3 U3] 导入钮（toast 文案逐字——d1-W1 回炉先例形态）
  it('导入快照 applied：成功 toast 逐字「已导入第 N 卷：新 X 改 Y 删 Z」', async () => {
    await mountWithKey()
    stubApi.snapshot.importFromFile.mockResolvedValue({
      ok: true,
      data: {
        outcome: 'applied',
        ownerId: PEER,
        snapshotSeq: 2,
        stats: { inserted: 3, updated: 1, skippedStale: 0, skippedRevive: 1, deleted: 2, a7Conflicts: 0 }
      }
    })
    clickButton('从文件导入快照')
    await settle()
    expect(stubApi.snapshot.importFromFile).toHaveBeenCalledWith({})
    expect(toastSpy).toHaveBeenCalledWith('已导入第 2 卷：新 3 改 1 删 2', 'success')
    root?.unmount()
  })

  it('导入快照 A7 冲突：toast 附「冲突 n 行（首例 entity/id）」', async () => {
    await mountWithKey()
    stubApi.snapshot.importFromFile.mockResolvedValue({
      ok: true,
      data: {
        outcome: 'applied',
        ownerId: PEER,
        snapshotSeq: 2,
        stats: {
          inserted: 1,
          updated: 0,
          skippedStale: 0,
          skippedRevive: 0,
          deleted: 0,
          a7Conflicts: 2,
          a7FirstEntity: 'papers',
          a7FirstId: 'p-l3'
        }
      }
    })
    clickButton('从文件导入快照')
    await settle()
    expect(toastSpy).toHaveBeenCalledWith('已导入第 2 卷：新 1 改 0 删 0，冲突 2 行（首例 papers/p-l3）', 'success')
    root?.unmount()
  })

  it('导入快照 rejected：原因码中文映射 toast（seq_stale 例）', async () => {
    await mountWithKey()
    stubApi.snapshot.importFromFile.mockResolvedValue({
      ok: true,
      data: { outcome: 'rejected', reason: 'seq_stale', ownerId: PEER, snapshotSeq: 1 }
    })
    clickButton('从文件导入快照')
    await settle()
    expect(toastSpy).toHaveBeenCalledWith('导入被拒：该快照卷不比本地已导入的新', 'error')
    root?.unmount()
  })

  it('导入快照取消：CANCELLED 回包→info toast 已取消导入（非 error 面）', async () => {
    await mountWithKey()
    stubApi.snapshot.importFromFile.mockResolvedValue({
      ok: false,
      error: { code: 'CANCELLED', message: '已取消导入' }
    })
    clickButton('从文件导入快照')
    await settle()
    expect(toastSpy).toHaveBeenCalledWith('已取消导入', 'info')
    expect(toastSpy).not.toHaveBeenCalledWith(expect.anything(), 'error')
    root?.unmount()
  })

  it('导入快照幂等 no-op：noop 回包→info toast「第 N 卷此前已导入，本次未重复应用」', async () => {
    await mountWithKey()
    stubApi.snapshot.importFromFile.mockResolvedValue({
      ok: true,
      data: {
        outcome: 'applied',
        ownerId: PEER,
        snapshotSeq: 2,
        noop: true,
        stats: { inserted: 0, updated: 0, skippedStale: 0, skippedRevive: 0, deleted: 0, a7Conflicts: 0 }
      }
    })
    clickButton('从文件导入快照')
    await settle()
    expect(toastSpy).toHaveBeenCalledWith('第 2 卷此前已导入，本次未重复应用', 'info')
    root?.unmount()
  })

  // [回炉 R8] 十码中文映射全键快照断言（Object.entries 循环锁全部文案值——
  // 枚举单源=shared schemas；映射表单源=SnapshotImportButton 导出）
  it('[R8] 拒收原因码中文映射：十码全键+文案逐字快照', () => {
    const expected: Record<string, string> = {
      self_reimport: '不能导入本库自身的快照',
      struct_invalid: '快照文件结构无效',
      version_mismatch: '快照格式版本不受支持',
      schema_newer: '快照数据库版本比本库新，请先升级应用',
      hmac_fail: '快照验签失败（密钥不匹配或文件损坏）',
      decrypt_fail: '快照解密失败',
      seq_stale: '该快照卷不比本地已导入的新',
      seq_conflict: '同卷号内容不一致，已拒收',
      hash_mismatch: '快照内容校验不符',
      counts_mismatch: '快照行数校验不符'
    }
    expect(Object.keys(IMPORT_REASON_ZH).sort()).toEqual([...SNAPSHOT_IMPORT_REJECT_REASONS].sort())
    for (const [reason, zh] of Object.entries(IMPORT_REASON_ZH)) {
      expect(zh, `原因码 ${reason} 的中文映射`).toBe(expected[reason])
      expect(zh.length, `原因码 ${reason} 映射非空`).toBeGreaterThan(0)
    }
  })
})
