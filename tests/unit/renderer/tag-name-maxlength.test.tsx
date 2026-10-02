// @vitest-environment jsdom
/**
 * [T4 小挂账] 标签名文本输入框 maxLength 兑现锁定测试（always-active）——
 * tag-editor/tag-lifecycle-ui/lineage-tag-edit 姊妹件族（受锁既有件零改动）。
 *
 * 锁行为面（v87 P2-T4）：标签输入框无 maxLength——>50 字收英文 zod 报错。
 * 单源常量 TAG_NAME_MAX（shared/models/tag）+全部标签名文本输入点：
 * ① TagEditor「新增标签」② TagRenameDialog「新标签名」③ LineageTagDialog
 * 添加标签 ④ LineageSideTags「新标签名」；schema 面（tagSchema/
 * tagNameReqSchema/renameTagReqSchema）.max 引用同一常量（边界=恰上限过、
 * 超 1 拒——单源接线锁）。
 */
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { makeApiStub } from '../../utils/api-client-mock'
import { TAG_NAME_MAX, tagSchema } from '../../../src/shared/models/tag'
import { renameTagReqSchema, tagNameReqSchema } from '../../../src/shared/ipc/schemas'

const stubApi = makeApiStub({
  tags: { list: vi.fn(), upsert: vi.fn(), attach: vi.fn(), detach: vi.fn(), rename: vi.fn() },
  lineage: { graph: vi.fn() }
})

import { TagEditor } from '../../../src/renderer/features/tags/TagEditor'
import { TagRenameDialog } from '../../../src/renderer/features/tags/TagLifecycle'
import { useTagsStore } from '../../../src/renderer/features/tags/tags.store'
import { LineageTagDialog } from '../../../src/renderer/features/lineage/LineageTagDialog'
import { LineageSideTags } from '../../../src/renderer/features/lineage/LineageSideTags'

let root: Root | null = null
let host: HTMLDivElement | null = null

function mount(element: JSX.Element): void {
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  act(() => {
    root?.render(element)
  })
}

const TAG_A = { id: 't-1', name: '综述', color: null }

beforeEach(() => {
  vi.clearAllMocks()
  stubApi.tags.list.mockReset()
  stubApi.tags.upsert.mockReset()
  stubApi.tags.attach.mockReset()
  stubApi.tags.detach.mockReset()
  stubApi.tags.rename.mockReset()
  stubApi.tags.list.mockResolvedValue({
    ok: true,
    data: [{ ...TAG_A, paperCount: 1 }]
  })
  stubApi.tags.upsert.mockResolvedValue({ ok: true, data: { ...TAG_A, paperCount: 1 } })
  stubApi.tags.attach.mockResolvedValue({ ok: true, data: { ok: true } })
  stubApi.tags.rename.mockResolvedValue({ ok: true, data: { ok: true } })
  useTagsStore.setState({ tags: [{ ...TAG_A, paperCount: 1 }], error: null })
})

afterEach(() => {
  act(() => {
    root?.unmount()
  })
  root = null
  host?.remove()
  host = null
})

describe('T4 标签名输入点 maxLength=TAG_NAME_MAX（四输入面+schema 单源接线）', () => {
  it('TagEditor「新增标签」输入框携带 maxLength', () => {
    mount(<TagEditor paperId="p-1" tags={[TAG_A]} onChanged={() => undefined} />)
    const input = document.querySelector('input[aria-label="新增标签"]') as HTMLInputElement | null
    expect(input, '新增标签输入框在场').not.toBeNull()
    expect(input!.maxLength, `maxLength=${TAG_NAME_MAX}`).toBe(TAG_NAME_MAX)
  })

  it('TagRenameDialog「新标签名」输入框携带 maxLength', () => {
    mount(
      <TagRenameDialog tag={TAG_A} onClose={() => undefined} onMutated={() => undefined} />
    )
    const input = document.querySelector('input[aria-label="新标签名"]') as HTMLInputElement | null
    expect(input, '重命名输入框在场').not.toBeNull()
    expect(input!.maxLength, `maxLength=${TAG_NAME_MAX}`).toBe(TAG_NAME_MAX)
  })

  it('LineageTagDialog 添加标签输入框携带 maxLength', () => {
    mount(
      <LineageTagDialog
        open
        node={{ id: 'n-1', paperId: null, title: '节点', coreIdea: '', year: 2024, x: null, y: null, month: null, slot: null, folderId: '__main__', tags: null, createdAt: 't', updatedAt: 't' }}
        onClose={() => undefined}
        onSave={() => undefined}
      />
    )
    const input = document.querySelector('[data-testid="lineage-tag-input"]') as HTMLInputElement | null
    expect(input, '脉络添加标签输入框在场').not.toBeNull()
    expect(input!.maxLength, `maxLength=${TAG_NAME_MAX}`).toBe(TAG_NAME_MAX)
  })

  it('LineageSideTags「新标签名」输入框携带 maxLength', () => {
    mount(
      <LineageSideTags
        node={{ id: 'n-1', paperId: null, title: '节点', coreIdea: '', year: 2024, x: null, y: null, month: null, slot: null, folderId: '__main__', tags: null, createdAt: 't', updatedAt: 't' }}
        onSetTags={() => undefined}
      />
    )
    const input = document.querySelector('input[aria-label="新标签名"]') as HTMLInputElement | null
    expect(input, '侧板标签输入框在场').not.toBeNull()
    expect(input!.maxLength, `maxLength=${TAG_NAME_MAX}`).toBe(TAG_NAME_MAX)
  })

  it('schema 单源接线：TAG_NAME_MAX 恰上限过、超 1 拒（tagSchema/tagNameReq/renameTagReq 三面同界）', () => {
    const at = '甲'.repeat(TAG_NAME_MAX)
    const over = '甲'.repeat(TAG_NAME_MAX + 1)
    expect(tagSchema.safeParse({ id: 't', name: at, color: null }).success, '恰上限过（tagSchema）').toBe(true)
    expect(tagSchema.safeParse({ id: 't', name: over, color: null }).success, '超 1 拒（tagSchema）').toBe(false)
    expect(tagNameReqSchema.safeParse({ name: at }).success, '恰上限过（tagNameReq）').toBe(true)
    expect(tagNameReqSchema.safeParse({ name: over }).success, '超 1 拒（tagNameReq）').toBe(false)
    expect(renameTagReqSchema.safeParse({ tagId: 't', name: at }).success, '恰上限过（renameTagReq）').toBe(true)
    expect(renameTagReqSchema.safeParse({ tagId: 't', name: over }).success, '超 1 拒（renameTagReq）').toBe(false)
  })
})
