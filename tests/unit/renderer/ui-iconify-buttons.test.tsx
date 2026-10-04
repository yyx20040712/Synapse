// @vitest-environment jsdom
/**
 * [F-UIRES-02 批 B] 小按钮图标化面 —— 锁定合约（always-active，不经
 * guardedDescribe——宪法 K3 条款）。
 *
 * 覆盖（行为锁=sr-only/aria-label/title/svg 存在性断言——票面：仅图标+
 * 悬停汉字 title+aria-label 同源；textContent 经 sr-only span 保受锁精确
 * 匹配断言零改）：
 * - 共享件：Dialog/Toast 关闭 X（title=aria-label 同源+svg）。
 * - Reader 域：ReaderSearchBox 三钮（‹›× title 补齐+同源）/SelectionToolbar
 *   三动作钮（高亮/下划线/备注 svg+title 同源+textContent 保活——受锁
 *   selection-layer:268 与 e2e accessible name 面）/AnnotationEditor 五钮
 *   （撤销/重做/保存/删除/取消——data-testid 保活+title+textContent 恰=原
 *   文本，受锁 annotation-popups-autosave:217 与 annotation-menu:64 面）。
 * - 标签域：TagEditor chip ×与「添加」（aria-label 保活+title 同源）。
 * - 脉络域：EdgeMenu 确定钮/LineageSideTags ＋钮与 chip ×（textContent
 *   '+'/'确定' 保活——受锁 lineage-side-tags-keys:73/lineage-edge-edit-menu:245
 *   面）/LineageToolbar 保存·选择·撤销·重做（随态 title+aria-label 同源+
 *   textContent 保活）/LineageNavPane 收起展开（title/aria-label 保活）。
 * - 课题域：WorkspaceRenameRow 确定/取消（textContent 保活——受锁
 *   workspaces e2e accessible name 面）。
 * - 壳层：TitleBarControls 三键 title 补齐（与 aria-label 同源——R11）。
 * - R14 组词守卫锁（C5）：LineageSideTags ＋钮/EdgeMenu 确定钮组词期不提交
 *   （workspaces 面 RR2 同款已在批 A workspaces-page-keys:244 锁过）。
 */
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { makeApiStub, stubApiEvents } from '../../utils/api-client-mock'

const stubApi = makeApiStub({
  tags: { list: vi.fn(), upsert: vi.fn(), attach: vi.fn(), detach: vi.fn() },
  lineage: { graph: vi.fn(), upsertLineTypes: vi.fn() },
  folders: { list: vi.fn() },
  notes: { get: vi.fn(), save: vi.fn() },
  reader: {}
})

import { Dialog } from '../../../src/renderer/shared/ui/Dialog'
import { ToastHost } from '../../../src/renderer/shared/ui/Toast'
import type * as ToastStoreModule from '../../../src/renderer/shared/ui/toast-store'
import { ReaderSearchBox } from '../../../src/renderer/features/reader/view/ReaderSearchBox'
import { SelectionToolbar } from '../../../src/renderer/features/reader/interact/SelectionToolbar'
import { AnnotationEditor } from '../../../src/renderer/features/reader/view/AnnotationEditor'
import type { Annotation } from '../../../src/shared/models/annotation'
import { TagEditor } from '../../../src/renderer/features/tags/TagEditor'
import { useTagsStore } from '../../../src/renderer/features/tags/tags.store'
import { EdgeMenu } from '../../../src/renderer/features/lineage/EdgeMenu'
import { LineageSideTags } from '../../../src/renderer/features/lineage/LineageSideTags'
import { LineageToolbar } from '../../../src/renderer/features/lineage/LineageToolbar'
import { LineageNavPane } from '../../../src/renderer/features/lineage/LineageNavPane'
import { useLineageStore } from '../../../src/renderer/features/lineage/lineage.store'
import { useLineageViewStore } from '../../../src/renderer/features/lineage/lineage-view.store'
import type { LineageNode } from '../../../src/shared/models/lineage'
import { LINE_TYPE_COLORS } from '../../../src/shared/models/lineage'
import { AiNoteGroupList } from '../../../src/renderer/features/reader/panels/AiNoteGroupList'
import type { AiNote } from '../../../src/shared/models/ai-note'
import { WorkspaceRenameRow } from '../../../src/renderer/features/workspaces/WorkspaceRenameRow'
import { TitleBarControls } from '../../../src/renderer/app/TitleBarControls'

;(globalThis as unknown as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true

let root: Root | null = null
let host: HTMLDivElement | null = null

function mount(node: JSX.Element): void {
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  act(() => {
    root?.render(node)
  })
}

/** 同源断言单点：title 属性在场且与 aria-label 同值（票面明文同源条款） */
function expectSameLabel(btn: HTMLButtonElement): string {
  const title = btn.getAttribute('title')
  expect(title, 'title 属性在场（悬停汉字提示）').not.toBeNull()
  expect(btn.getAttribute('aria-label'), 'aria-label 与 title 同源').toBe(title)
  return title ?? ''
}

function expectSvg(btn: HTMLElement, label: string): void {
  const svg = btn.querySelector('svg')
  expect(svg, `${label} 应含 svg 图标子元素`).not.toBeNull()
  expect(svg?.getAttribute('aria-hidden'), `${label} svg 应 aria-hidden`).toBe('true')
}

/** 精确 textContent 找按钮（受锁断言同口径——sr-only span 保活验证面） */
function findBtnByText(text: string): HTMLButtonElement {
  const b = [...host!.querySelectorAll('button')].find((x) => x.textContent === text)
  expect(b, `按钮 ${text} 应在场（textContent 精确匹配）`).toBeDefined()
  return b as HTMLButtonElement
}

afterEach(() => {
  act(() => {
    root?.unmount()
  })
  root = null
  host?.remove()
  host = null
})

describe('F-UIRES-02 批 B 共享件——关闭 X 图标化', () => {
  it('Dialog 头关闭钮：svg+title/aria-label 同源「关闭对话框」', () => {
    mount(<Dialog open title="测试对话框" onClose={() => undefined}>内容</Dialog>)
    const btn = host!.querySelector<HTMLButtonElement>('[aria-label="关闭对话框"]')!
    expect(btn, '关闭钮在场').not.toBeNull()
    expectSameLabel(btn)
    expectSvg(btn, 'Dialog 关闭钮')
  })

  it('Toast 卡关闭钮：svg+title/aria-label 同源「关闭通知」', async () => {
    // showToast 在 api-client-mock 中被 spy 替换（队列不真蓄）——importActual
    // 取真 store 实例入队（mock 展开型共享真模块闭包：ToastHost 订阅同队列）
    const realStore = await vi.importActual<typeof ToastStoreModule>(
      '../../../src/renderer/shared/ui/toast-store'
    )
    act(() => {
      realStore.showToast('批 B 测试通知', 'info')
    })
    mount(<ToastHost />)
    const btn = host!.querySelector<HTMLButtonElement>('[aria-label="关闭通知"]')!
    expect(btn, '关闭钮在场').not.toBeNull()
    expectSameLabel(btn)
    expectSvg(btn, 'Toast 关闭钮')
  })
})

describe('F-UIRES-02 批 B Reader 域', () => {
  it('ReaderSearchBox 三钮：svg+title 补齐并与 aria-label 同源', () => {
    mount(
      <ReaderSearchBox
        state="done" query="q" lastSubmitted="q" matchCount={2} activeIndex={0} focusSeq={1}
        onQueryChange={() => undefined} onSubmit={() => undefined} onPrev={() => undefined} onNext={() => undefined} onClose={() => undefined}
      />
    )
    for (const label of ['上一个', '下一个', '关闭搜索']) {
      const btn = host!.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`)!
      expect(btn, `${label} 按钮在场`).not.toBeNull()
      expectSameLabel(btn)
      expectSvg(btn, label)
    }
  })

  it('SelectionToolbar 三动作钮：svg+title 同源动作名+textContent 保活', () => {
    const ref = { current: null } as unknown as { current: HTMLDivElement | null }
    mount(
      <SelectionToolbar containerRef={ref} x={0} y={0} busy={false} color="yellow"
        onColor={() => undefined} onSave={() => undefined} />
    )
    for (const label of ['高亮', '下划线', '备注']) {
      const btn = findBtnByText(label)
      expect(btn.getAttribute('title'), `${label} title 与动作名同源`).toBe(label)
      expectSvg(btn, label)
    }
  })

  it('AnnotationEditor 五钮：svg+title 同源+textContent 恰=原文本+data-testid 保活', () => {
    const annotation: Annotation = {
      id: 'a-1', paperId: 'p-1', page: 0, kind: 'note', color: 'yellow',
      quoteText: '引文', prefixText: '', suffixText: '', startOffset: 0, endOffset: 2,
      rects: [{ page: 0, x: 0.1, y: 0.1, w: 0.2, h: 0.02 }], comment: '', createdAt: 't', updatedAt: 't'
    }
    mount(
      <AnnotationEditor annotation={annotation} rect={{ page: 0, x: 0.1, y: 0.1, w: 0.2, h: 0.02 }}
        busy={false} onCancel={() => undefined} onSave={() => undefined} onDelete={() => undefined}
        onAutosave={() => Promise.resolve(true)} />
    )
    for (const testid of ['annotation-editor-undo', 'annotation-editor-redo']) {
      const btn = host!.querySelector<HTMLButtonElement>(`[data-testid="${testid}"]`)!
      expect(btn, `${testid} 保活`).not.toBeNull()
      expectSvg(btn, testid)
      expectSameLabel(btn)
    }
    expect(host!.querySelector('[data-testid="annotation-editor-undo"]')!.textContent).toBe('撤销')
    expect(host!.querySelector('[data-testid="annotation-editor-redo"]')!.textContent).toBe('重做')
    for (const label of ['保存', '删除', '取消']) {
      const btn = findBtnByText(label)
      expectSameLabel(btn)
      expectSvg(btn, label)
    }
  })

  it('AiNoteGroupList 段头：chevron svg 随态+title 展开/收起+aria-expanded 保活', () => {
    const mk = (id: string, role: AiNote['role']): AiNote => ({
      id, paperId: 'p-1', annotationId: null, role, question: 'Q1', model: 'm',
      quoteText: '', prefixText: '', suffixText: '', anchorPage: 1, contentMd: `c-${id}`, createdAt: 't', updatedAt: 't'
    })
    mount(<AiNoteGroupList notes={[mk('a1', 'first-read'), mk('c1', 'adjudicate')]} onLocate={() => undefined} />)
    const collapsed = host!.querySelector<HTMLButtonElement>('button[data-role-section="first-read"]')!
    const expanded = host!.querySelector<HTMLButtonElement>('button[data-role-section="adjudicate"]')!
    expect(collapsed.getAttribute('title')).toBe('展开')
    expect(expanded.getAttribute('title')).toBe('收起')
    expectSvg(collapsed, '一审段头')
    expectSvg(expanded, '裁决段头')
    expect(collapsed.getAttribute('aria-expanded')).toBe('false')
    expect(expanded.getAttribute('aria-expanded')).toBe('true')
    // [RR1-3] 方向流派锁：原 ▸/▾ 字符=down/right 流派（最小视觉变更原则）——
    // 收起=右向 chevron、展开=下向 chevron（path d 特征断言防再翻流派）
    expect(collapsed.querySelector('svg path')?.getAttribute('d')).toBe('M9 4l8 8-8 8')
    expect(expanded.querySelector('svg path')?.getAttribute('d')).toBe('M4 9l8 8 8-8')
  })
})

describe('F-UIRES-02 批 B 标签域——TagEditor', () => {
  beforeEach(() => {
    useTagsStore.setState({ tags: [], loading: false, error: null })
    stubApi.tags.list.mockResolvedValue({ ok: true, data: [] })
  })

  it('chip 移除钮：svg+title/aria-label 同源「移除标签 名」+「添加」钮图标化', async () => {
    host = document.createElement('div')
    document.body.appendChild(host)
    root = createRoot(host)
    await act(async () => {
      root?.render(<TagEditor paperId="p-1" tags={[{ id: 't-1', name: '水锤' }]} onChanged={() => undefined} />)
    })
    const chipBtn = host!.querySelector<HTMLButtonElement>('[aria-label="移除标签 水锤"]')!
    expect(chipBtn, 'chip 移除钮在场').not.toBeNull()
    expectSameLabel(chipBtn)
    expectSvg(chipBtn, 'chip 移除钮')
    const addBtn = host!.querySelector<HTMLButtonElement>('[aria-label="添加标签"]')!
    expect(addBtn, '添加钮在场').not.toBeNull()
    expectSameLabel(addBtn)
    expectSvg(addBtn, '添加钮')
  })
})

describe('F-UIRES-02 批 B 脉络域', () => {
  it('EdgeMenu 确定钮：svg+title「确定」+textContent 保活', () => {
    mount(
      <EdgeMenu
        target={{ kind: 'edge', edgeId: 'e1', label: '主线', x: 10, y: 10 }}
        dashed={false} color={LINE_TYPE_COLORS[0]}
        onRename={() => undefined} onLineStyle={() => undefined} onReset={() => undefined}
        onDelete={() => undefined} onDeleteVertex={() => undefined} onClose={() => undefined}
      />
    )
    act(() => {
      ;([...document.querySelectorAll('[data-testid="edge-menu"] [role="menuitem"]')].find(
        (b) => b.textContent === '命名'
      ) as HTMLElement).click()
    })
    const confirm = findBtnByText('确定')
    expect(confirm.getAttribute('title')).toBe('确定')
    expectSvg(confirm, 'EdgeMenu 确定钮')
  })

  it('LineageSideTags ＋钮/chip ×：svg+title/aria-label 同源+textContent 恰=＋', () => {
    const node = { id: 'n1', paperId: null, title: '主题', coreIdea: '', year: null, x: null, y: null, month: null, slot: null, folderId: '__main__', tags: ['甲'], createdAt: 't', updatedAt: 't' } as unknown as LineageNode
    mount(<LineageSideTags node={node} onSetTags={() => undefined} />)
    const plus = findBtnByText('+')
    expect(plus.getAttribute('title')).toBe('添加标签')
    expect(plus.getAttribute('aria-label')).toBe('添加标签')
    expectSvg(plus, '＋钮')
    const chipBtn = host!.querySelector<HTMLButtonElement>('[aria-label="移除标签 甲"]')!
    expect(chipBtn, 'chip 移除钮在场').not.toBeNull()
    expectSameLabel(chipBtn)
    expectSvg(chipBtn, 'chip 移除钮')
  })

  it('LineageToolbar：保存钮 svg+随态 title/aria-label 同源+textContent 恰=保存；撤销/重做补 aria-label', () => {
    useLineageStore.setState({
      nodes: [], edges: [], lineTypeNames: ['', '', '', '', '', ''],
      status: 'ready', error: null, saveStatus: 'dirty', lastWriteError: null,
      queue: [], flushing: false, undoStack: [], redoStack: [], folderId: '__main__'
    })
    useLineageViewStore.setState({
      mode: 'edit', focusSet: [], navCollapsed: false, navWidth: 208,
      tool: 'select', currentLineColor: LINE_TYPE_COLORS[0], linetypeListOpenFor: null
    })
    mount(<LineageToolbar mode="edit" />)
    const save = host!.querySelector<HTMLButtonElement>('[data-testid="lineage-save-btn"]')!
    expect(save.textContent).toBe('保存')
    expectSvg(save, '保存钮')
    expectSameLabel(save)
    const hand = host!.querySelector<HTMLButtonElement>('[data-testid="lineage-tool-select"]')!
    expect(hand.textContent).toBe('选择')
    expectSvg(hand, '小手选择钮')
    for (const id of ['lineage-undo', 'lineage-redo']) {
      const btn = host!.querySelector<HTMLButtonElement>(`[data-testid="${id}"]`)!
      expect(btn, `${id} 在场`).not.toBeNull()
      expectSvg(btn, id)
      expectSameLabel(btn)
    }
  })

  it('LineageNavPane：收起/展开钮 svg+title/aria-label 保活', () => {
    stubApiEvents({ onFoldersChanged: () => () => undefined })
    stubApi.folders.list.mockResolvedValue({ ok: true, data: [] })
    useLineageStore.setState({
      nodes: [], edges: [], lineTypeNames: [], status: 'ready', error: null,
      saveStatus: 'clean', lastWriteError: null, queue: [], flushing: false,
      undoStack: [], redoStack: [], folderId: '__main__'
    })
    useLineageViewStore.setState({
      mode: 'browse', focusSet: [], navCollapsed: false, navWidth: 208,
      tool: 'select', currentLineColor: LINE_TYPE_COLORS[0], linetypeListOpenFor: null
    })
    mount(<LineageNavPane />)
    const collapse = host!.querySelector<HTMLButtonElement>('[data-testid="lineage-nav-collapse"]')!
    expect(collapse, '收起钮在场').not.toBeNull()
    expectSvg(collapse, '收起钮')
    expectSameLabel(collapse)
    expect(collapse.textContent).toBe('收起导航窗格')
    act(() => {
      collapse.click()
    })
    const expand = host!.querySelector<HTMLButtonElement>('[data-testid="lineage-nav-expand"]')!
    expect(expand, '展开钮在场').not.toBeNull()
    expectSvg(expand, '展开钮')
    expectSameLabel(expand)
    expect(expand.textContent).toBe('展开导航窗格')
  })
})

describe('F-UIRES-02 批 B 课题域+壳层', () => {
  it('WorkspaceRenameRow 确定/取消：svg+title 同源+textContent 保活', () => {
    mount(<WorkspaceRenameRow draft="课题甲" onDraftChange={() => undefined} onSubmit={() => undefined} onCancel={() => undefined} />)
    for (const label of ['确定', '取消']) {
      const btn = findBtnByText(label)
      expect(btn.getAttribute('title')).toBe(label)
      expectSvg(btn, label)
    }
  })

  it('TitleBarControls 三键：title 补齐并与 aria-label 同源（R11）', () => {
    ;(globalThis as unknown as { window: Window }).window.api = {
      system: { windowControl: vi.fn().mockResolvedValue({ ok: true, data: { maximized: false } }) }
    } as unknown as typeof window.api
    ;(globalThis as unknown as { window: Window }).window.apiEvents = {
      onWindowState: vi.fn(() => () => undefined)
    } as unknown as typeof window.apiEvents
    mount(<TitleBarControls />)
    for (const label of ['最小化', '最大化', '关闭']) {
      const btn = host!.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`)!
      expect(btn, `${label} 键在场`).not.toBeNull()
      expectSameLabel(btn)
    }
  })
})

describe('F-UIRES-02 批 B R14 组词守卫锁（C5——对删守卫变异红证方向）', () => {
  it('LineageSideTags 组词期点＋钮：不提交（onSetTags 零调用——输入先填值防空串 no-op 假阳性）', () => {
    const onSetTags = vi.fn()
    const node = { id: 'n1', paperId: null, title: '主题', coreIdea: '', year: null, x: null, y: null, month: null, slot: null, folderId: '__main__', tags: [], createdAt: 't', updatedAt: 't' } as unknown as LineageNode
    mount(<LineageSideTags node={node} onSetTags={onSetTags} />)
    const input = host!.querySelector<HTMLInputElement>('[data-testid="lineage-tag-input"]')!
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!
    act(() => {
      setter.call(input, '组词中')
      input.dispatchEvent(new Event('input', { bubbles: true }))
    })
    act(() => {
      input.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true }))
    })
    const plus = findBtnByText('+')
    act(() => {
      plus.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    expect(onSetTags, '组词期点＋不提交').not.toHaveBeenCalled()
  })

  it('EdgeMenu 组词期点确定钮：不提交不关菜单（onRename/onClose 零调用）', () => {
    const onRename = vi.fn()
    const onClose = vi.fn()
    mount(
      <EdgeMenu
        target={{ kind: 'edge', edgeId: 'e1', label: '主线', x: 10, y: 10 }}
        dashed={false} color={LINE_TYPE_COLORS[0]}
        onRename={onRename} onLineStyle={() => undefined} onReset={() => undefined}
        onDelete={() => undefined} onDeleteVertex={() => undefined} onClose={onClose}
      />
    )
    act(() => {
      ;([...document.querySelectorAll('[data-testid="edge-menu"] [role="menuitem"]')].find(
        (b) => b.textContent === '命名'
      ) as HTMLElement).click()
    })
    const input = document.querySelector<HTMLInputElement>('[data-testid="edge-rename-input"]')!
    act(() => {
      input.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true }))
    })
    const confirm = ([...document.querySelectorAll<HTMLButtonElement>('[data-testid="edge-menu"] button')].find(
      (b) => b.textContent === '确定'
    ))!
    expect(confirm, '确定钮在场').toBeDefined()
    act(() => {
      confirm.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    expect(onRename, '组词期确定不提交').not.toHaveBeenCalled()
    expect(onClose, '组词期确定不关菜单').not.toHaveBeenCalled()
  })
})
