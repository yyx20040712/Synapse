// @vitest-environment jsdom
/** TagEditor 写后刷新：以可变 tags.list 数据验证实际写入与 store 刷新条件。 */
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { makeApiStub, toastSpy } from '../../utils/api-client-mock'

const stubApi = makeApiStub({
  tags: { list: vi.fn(), upsert: vi.fn(), attach: vi.fn(), detach: vi.fn() }
})

import { TagEditor } from '../../../src/renderer/features/tags/TagEditor'
import { useTagsStore, type TagWithCount } from '../../../src/renderer/features/tags/tags.store'

;(globalThis as unknown as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true

let root: Root | null = null
let host: HTMLDivElement | null = null
let listedTags: TagWithCount[] = []
let listSnapshots: TagWithCount[][] = []

async function renderEditor(
  attached: Array<{ id: string; name: string }>,
  storeTags: TagWithCount[] = [],
  onChanged: () => void = () => undefined
): Promise<void> {
  listedTags = storeTags.map((t) => ({ ...t }))
  listSnapshots = []
  useTagsStore.setState({
    tagsByFolder: { __main__: listedTags },
    loading: false,
    errorByFolder: {}
  })
  stubApi.tags.list.mockImplementation(async () => {
    const snapshot = listedTags.map((t) => ({ ...t }))
    listSnapshots.push(snapshot)
    return { ok: true as const, data: snapshot }
  })
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  await act(async () => {
    root?.render(
      <TagEditor paperId="p-1" folderId="__main__" tags={attached} onChanged={onChanged} />
    )
  })
}

function inputEl(): HTMLInputElement {
  const el = host?.querySelector('input[aria-label="新增标签"]')
  if (!(el instanceof HTMLInputElement)) throw new Error('新增标签输入框不在场')
  return el
}

function addBtn(): HTMLButtonElement {
  const el = host?.querySelector('button[aria-label="添加标签"]')
  if (!(el instanceof HTMLButtonElement)) throw new Error('「添加标签」按钮不在场')
  return el
}

async function setType(text: string): Promise<void> {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set
  await act(async () => {
    setter?.call(inputEl(), text)
    inputEl().dispatchEvent(new Event('input', { bubbles: true }))
  })
}

async function pressEnter(): Promise<void> {
  await act(async () => {
    inputEl().dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true })
    )
  })
}

async function mouseClick(button: HTMLButtonElement): Promise<void> {
  await act(async () => {
    const md = new MouseEvent('mousedown', { bubbles: true, cancelable: true })
    button.dispatchEvent(md)
    expect(md.defaultPrevented).toBe(true)
    button.click()
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  stubApi.tags.upsert.mockImplementation(async () => ({
    ok: true as const,
    data: { id: 't-new', name: '水质' }
  }))
  stubApi.tags.attach.mockImplementation(async () => ({
    ok: true as const,
    data: { ok: true }
  }))
})

afterEach(async () => {
  await act(async () => root?.unmount())
  host?.remove()
  root = null
  host = null
})

describe('TagEditor 写后 tags.store 刷新', () => {
  it('新建并挂接成功：attach 后增量 list，store 含新标签', async () => {
    const onChanged = vi.fn()
    await renderEditor([], [], onChanged)
    const baseline = stubApi.tags.list.mock.calls.length
    stubApi.tags.attach.mockImplementationOnce(async () => {
      listedTags = [{ id: 't-new', name: '水质', paperCount: 1, color: null }]
      return { ok: true as const, data: { ok: true } }
    })
    await setType('水质')
    await pressEnter()
    expect(stubApi.tags.list).toHaveBeenCalledTimes(baseline + 1)
    expect(listSnapshots.at(-1)?.map((t) => t.id)).toContain('t-new')
    expect(useTagsStore.getState().tagsByFolder['__main__']).toEqual([
      { id: 't-new', name: '水质', paperCount: 1, color: null }
    ])
    expect(onChanged).toHaveBeenCalledTimes(1)
    expect(inputEl().value).toBe('')
    expect(addBtn().disabled).toBe(false)
  })

  it('建议挂接成功：再次 list 后 paperCount 更新', async () => {
    const onChanged = vi.fn()
    await renderEditor(
      [],
      [{ id: 't-s1', name: '水锤', paperCount: 3, color: null }],
      onChanged
    )
    const baseline = stubApi.tags.list.mock.calls.length
    stubApi.tags.attach.mockImplementationOnce(async () => {
      listedTags = [{ id: 't-s1', name: '水锤', paperCount: 4, color: null }]
      return { ok: true as const, data: { ok: true } }
    })
    await setType('水')
    const suggestion = [...host!.querySelectorAll('button')].find(
      (b) => b.textContent === '水锤'
    )
    await mouseClick(suggestion as HTMLButtonElement)
    expect(stubApi.tags.list).toHaveBeenCalledTimes(baseline + 1)
    expect(useTagsStore.getState().tagsByFolder['__main__']?.[0]?.paperCount).toBe(4)
    expect(onChanged).toHaveBeenCalledTimes(1)
    expect(inputEl().value).toBe('')
    expect(addBtn().disabled).toBe(false)
  })

  it('移除成功：再次 list 后计数下降，input 不变', async () => {
    const onChanged = vi.fn()
    await renderEditor(
      [{ id: 't-1', name: '旧标' }],
      [{ id: 't-1', name: '旧标', paperCount: 2, color: null }],
      onChanged
    )
    const baseline = stubApi.tags.list.mock.calls.length
    stubApi.tags.detach.mockImplementationOnce(async () => {
      listedTags = [{ id: 't-1', name: '旧标', paperCount: 1, color: null }]
      return { ok: true as const, data: { ok: true } }
    })
    await setType('残留')
    const remove = host?.querySelector('button[aria-label="移除标签 旧标"]')
    await mouseClick(remove as HTMLButtonElement)
    expect(stubApi.tags.list).toHaveBeenCalledTimes(baseline + 1)
    expect(useTagsStore.getState().tagsByFolder['__main__']?.[0]?.paperCount).toBe(1)
    expect(onChanged).toHaveBeenCalledTimes(1)
    expect(inputEl().value).toBe('残留')
    expect(addBtn().disabled).toBe(false)
  })

  it('upsert 成功但 attach 失败：仍刷新孤儿标签，不调用 onChanged 且保留 input', async () => {
    const onChanged = vi.fn()
    await renderEditor([], [], onChanged)
    const baseline = stubApi.tags.list.mock.calls.length
    stubApi.tags.upsert.mockImplementationOnce(async () => {
      listedTags = [{ id: 't-orphan', name: '孤儿', paperCount: 0, color: null }]
      return { ok: true as const, data: { id: 't-orphan', name: '孤儿' } }
    })
    stubApi.tags.attach.mockImplementationOnce(async () => ({
      ok: false as const,
      error: { code: 'DB_ERROR', message: '挂接失败' }
    }))
    await setType('孤儿')
    await pressEnter()
    expect(stubApi.tags.list).toHaveBeenCalledTimes(baseline + 1)
    expect(useTagsStore.getState().tagsByFolder['__main__']?.[0]?.id).toBe('t-orphan')
    expect(host?.querySelector('[aria-label="标签建议"]')?.textContent).toContain('孤儿')
    expect(onChanged).not.toHaveBeenCalled()
    expect(inputEl().value).toBe('孤儿')
    expect(addBtn().disabled).toBe(false)
  })

  it('upsert 纯失败：不新增 list，不调用 onChanged 且保留 input', async () => {
    const onChanged = vi.fn()
    await renderEditor([], [], onChanged)
    const baseline = stubApi.tags.list.mock.calls.length
    stubApi.tags.upsert.mockImplementationOnce(async () => ({
      ok: false as const,
      error: { code: 'DB_ERROR', message: '建标失败' }
    }))
    await setType('未写入')
    await pressEnter()
    expect(stubApi.tags.list).toHaveBeenCalledTimes(baseline)
    expect(stubApi.tags.attach).not.toHaveBeenCalled()
    expect(onChanged).not.toHaveBeenCalled()
    expect(inputEl().value).toBe('未写入')
    expect(addBtn().disabled).toBe(false)
  })

  it('建议挂接纯失败：不新增 list、不调用 onChanged，清空前缀并复位 busy', async () => {
    const onChanged = vi.fn()
    await renderEditor(
      [],
      [{ id: 't-s1', name: '水锤', paperCount: 3, color: null }],
      onChanged
    )
    const baseline = stubApi.tags.list.mock.calls.length
    stubApi.tags.attach.mockImplementationOnce(async () => ({
      ok: false as const,
      error: { code: 'DB_ERROR', message: '建议挂接失败' }
    }))
    await setType('水')
    const suggestion = [...host!.querySelectorAll('button')].find(
      (b) => b.textContent === '水锤'
    )
    await mouseClick(suggestion as HTMLButtonElement)
    expect(stubApi.tags.list).toHaveBeenCalledTimes(baseline)
    expect(onChanged).not.toHaveBeenCalled()
    expect(inputEl().value).toBe('')
    expect(addBtn().disabled).toBe(false)
  })

  it('移除纯失败：不新增 list、不调用 onChanged，保留 input 并复位 busy', async () => {
    const onChanged = vi.fn()
    await renderEditor(
      [{ id: 't-1', name: '旧标' }],
      [{ id: 't-1', name: '旧标', paperCount: 2, color: null }],
      onChanged
    )
    const baseline = stubApi.tags.list.mock.calls.length
    stubApi.tags.detach.mockImplementationOnce(async () => ({
      ok: false as const,
      error: { code: 'DB_ERROR', message: '移除失败' }
    }))
    await setType('残留')
    const remove = host?.querySelector('button[aria-label="移除标签 旧标"]')
    await mouseClick(remove as HTMLButtonElement)
    expect(stubApi.tags.list).toHaveBeenCalledTimes(baseline)
    expect(onChanged).not.toHaveBeenCalled()
    expect(inputEl().value).toBe('残留')
    expect(addBtn().disabled).toBe(false)
  })

  it('写后 list 拒绝：沿用列表错误提示，不误报写入失败且复位 busy', async () => {
    const onChanged = vi.fn()
    await renderEditor([], [], onChanged)
    stubApi.tags.list.mockRejectedValueOnce(new Error('列表拒绝'))
    await setType('水质')
    await pressEnter()
    expect(onChanged).toHaveBeenCalledTimes(1)
    expect(useTagsStore.getState().errorByFolder['__main__']).toBe('列表拒绝')
    expect(toastSpy).toHaveBeenCalledTimes(1)
    expect(toastSpy).toHaveBeenCalledWith('标签列表刷新失败：列表拒绝', 'error')
    expect(toastSpy).not.toHaveBeenCalledWith('标签操作失败', 'error')
    expect(inputEl().value).toBe('')
    expect(addBtn().disabled).toBe(false)
  })

  it('refresh 挂起期间再次 Enter：busyRef 拒绝第二次写入，完成后复位 busy', async () => {
    const onChanged = vi.fn()
    await renderEditor([], [], onChanged)
    const baseline = stubApi.tags.list.mock.calls.length
    let resolveList!: () => void
    stubApi.tags.list.mockImplementationOnce(
      () =>
        new Promise<{ ok: true; data: TagWithCount[] }>((resolve) => {
          resolveList = () => resolve({ ok: true, data: listedTags.map((t) => ({ ...t })) })
        })
    )
    await setType('水质')
    await pressEnter()
    expect(stubApi.tags.list).toHaveBeenCalledTimes(baseline + 1)
    expect(addBtn().disabled).toBe(true)
    await setType('二次写入')
    await pressEnter()
    expect(stubApi.tags.upsert).toHaveBeenCalledTimes(1)
    expect(stubApi.tags.attach).toHaveBeenCalledTimes(1)
    expect(onChanged).toHaveBeenCalledTimes(1)
    await act(async () => {
      resolveList()
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
    expect(addBtn().disabled).toBe(false)
  })
})
