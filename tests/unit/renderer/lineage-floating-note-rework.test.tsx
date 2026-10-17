// @vitest-environment jsdom
/**
 * [F-VISFB-62 回炉轮 1] 悬浮笔记 UI 回炉面测试（R1-R7——门一双审 k1 FAIL
 * B4+d1 FAIL B2 合并裁决；首版基础消费面=lineage-floating-note-ui.test.tsx，
 * 本件按测试件有效行留余量拆驻）。量测桩口径同首版件：内容层 rect/offset
 * 全 own 域语义（三域律 C 域），left=40/top=20=origin，1000×800=own 尺寸。
 *
 * 覆盖：R1 空图挂载（LineageTimeline 装配——nodes=[] 时 .tl-content 在：
 * 空态文案+已有笔记真实文本可见可编辑+空白右键创建）/R2 编辑会话收口
 * （恰一会话+textarea 内点击稿不回退+打断〔点他笔记/拖柄〕先收口旧会话）
 * /R3 幽灵写防御（空编辑右键删除全序恰一次 remove+拖动中他径删除不触达
 * store——jsdom 吞 listener 异常故以 spy 断言）/R4 saving 让位/R5 textarea
 * 右键原生放行（不 preventDefault）/R6 柄贴顶可达（y≥柄高+柄 top/height
 * inline 单源——S3 声明统一：CSS 变量法已弃）/R7 盲区（右键排除面含边
 * 编辑柄+拖动越界钳制——非对称坐标断言驻首版件）；[回炉轮 2] S1 saving
 * 在飞中止（菜单关/拖动丢弃回弹）/S2 钳制数学（上界先与下限取 max）/
 * S6 会话硬化（pointerId 绑定+window blur 中止）。always-active（不经
 * guardedDescribe）。
 */
import { makeApiStub } from '../../utils/api-client-mock'

const stubApi = makeApiStub({
  lineage: {
    graph: vi.fn(),
    upsertFloatingNote: vi.fn(),
    removeFloatingNote: vi.fn()
  }
})

import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { FloatingNote } from '../../../src/shared/models/lineage'
import { useLineageStore } from '../../../src/renderer/features/lineage/lineage.store'
import { useLineageViewStore } from '../../../src/renderer/features/lineage/lineage-view.store'
import { LineageFloatingNotes } from '../../../src/renderer/features/lineage/LineageFloatingNotes'
import { LineageTimeline } from '../../../src/renderer/features/lineage/LineageTimeline'
import { NOTE_GRIP_H, NOTE_H, NOTE_W } from '../../../src/renderer/features/lineage/lineage-note-geom'

;(globalThis as unknown as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true

function makeNote(over: Partial<FloatingNote> = {}): FloatingNote {
  return {
    id: over.id ?? 'fn-1',
    folderId: '__main__',
    x: 100,
    y: 100,
    content: '内容甲',
    createdAt: 't0',
    updatedAt: 't0',
    ...over
  }
}

let root: Root | null = null
let host: HTMLDivElement | null = null
let contentEl: HTMLDivElement | null = null

function mountNotes(): void {
  host = document.createElement('div')
  document.body.appendChild(host)
  contentEl = document.createElement('div')
  contentEl.className = 'tl-content'
  host.appendChild(contentEl)
  contentEl.getBoundingClientRect = () =>
    ({ left: 40, top: 20, right: 1040, bottom: 820, width: 1000, height: 800, x: 40, y: 20 }) as DOMRect
  Object.defineProperty(contentEl, 'offsetWidth', { value: 1000, configurable: true })
  Object.defineProperty(contentEl, 'offsetHeight', { value: 800, configurable: true })
  root = createRoot(host)
  act(() => {
    root?.render(<LineageFloatingNotes contentRef={{ current: contentEl }} />)
  })
}

/** [R1] 真装配位：LineageTimeline nodes=[]（.tl-content 应在场——空态文案层内并存） */
function mountTimelineEmpty(): HTMLElement | null {
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  act(() => {
    root?.render(<LineageTimeline nodes={[]} edges={[]} />)
  })
  return host.querySelector('.tl-content')
}

const state = () => useLineageStore.getState()
const openBlankMenu = (clientX: number, clientY: number): void => {
  contentEl!.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX, clientY }))
}
const menuEl = (): HTMLElement | null => document.querySelector('[data-testid="note-anchor-menu"]')
const clickMenuItem = (label: string): void => {
  const btn = Array.from(document.querySelectorAll('[role="menuitem"]')).find((b) => b.textContent === label)
  btn?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
}
const noteElOf = (id: string): HTMLElement | null => document.querySelector(`.tl-note[data-note-id="${id}"]`)
const pdown = (el: Element, clientX: number, clientY: number): void => {
  el.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, cancelable: true, button: 0, clientX, clientY }))
}
const pmove = (clientX: number, clientY: number): void => {
  document.dispatchEvent(new MouseEvent('pointermove', { bubbles: true, clientX, clientY }))
}
const pup = (clientX: number, clientY: number): void => {
  document.dispatchEvent(new MouseEvent('pointerup', { bubbles: true, clientX, clientY }))
}
const ctxOn = (el: Element, clientX: number, clientY: number): void => {
  el.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX, clientY }))
}
const typeInto = (ta: HTMLTextAreaElement, value: string): void => {
  const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!
  setter.call(ta, value)
  ta.dispatchEvent(new Event('input', { bubbles: true }))
}
const blurTa = (ta: HTMLElement): void => {
  ta.dispatchEvent(new FocusEvent('focusout', { bubbles: true }))
}

beforeEach(() => {
  useLineageStore.setState({
    nodes: [],
    edges: [],
    floatingNotes: [],
    status: 'ready',
    error: null,
    saveStatus: 'clean',
    lastWriteError: null,
    queue: [],
    flushing: false,
    undoStack: [],
    redoStack: [],
    folderId: '__main__'
  })
  useLineageViewStore.setState({ mode: 'edit', tool: 'select', zoom: 1 })
  document.documentElement.style.removeProperty('--ui-scale')
  for (const fn of Object.values(stubApi.lineage)) fn.mockReset()
  stubApi.lineage.graph.mockResolvedValue({ ok: true, data: { nodes: [], edges: [], floatingNotes: [] } })
})

afterEach(async () => {
  await act(async () => {
    root?.unmount()
  })
  root = null
  host?.remove()
  host = null
  contentEl = null
})

describe('R1 空图挂载（LineageTimeline 装配——笔记是图内容一部分）', () => {
  it('nodes 空时 .tl-content 结构在：空态文案+已有笔记真实文本可见可编辑+空白右键创建可用', () => {
    useLineageStore.setState({ floatingNotes: [makeNote({ id: 'fn-only', content: '空图幸存笔记' })] })
    const content = mountTimelineEmpty()
    expect(content).not.toBeNull()
    expect(host!.textContent).toContain('暂无脉络图')
    const noteText = content!.querySelector('.tl-note[data-note-id="fn-only"] .tl-note-text')
    expect(noteText?.textContent).toBe('空图幸存笔记')
    act(() => {
      pdown(noteElOf('fn-only')!, 120, 120)
    })
    expect(noteElOf('fn-only')!.querySelector('textarea')).not.toBeNull()
    act(() => {
      ctxOn(content!.querySelector('.tl-empty')!, 300, 200)
    })
    act(() => {
      clickMenuItem('新建悬浮笔记')
    })
    expect(state().floatingNotes).toHaveLength(2)
  })
})

describe('R2 编辑会话收口（恰一会话/打断先收口/id 守卫）', () => {
  it('编辑中 textarea 内再点击：draft 不重置（稿不回退）不提交', () => {
    useLineageStore.setState({ floatingNotes: [makeNote({ id: 'fn-t', content: '半稿基' })] })
    mountNotes()
    act(() => {
      pdown(noteElOf('fn-t')!, 150, 150)
    })
    const ta = noteElOf('fn-t')!.querySelector('textarea')! as HTMLTextAreaElement
    act(() => {
      typeInto(ta, '半稿改')
    })
    act(() => {
      ta.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, button: 0, clientX: 160, clientY: 160 }))
    })
    const ta2 = noteElOf('fn-t')!.querySelector('textarea')! as HTMLTextAreaElement
    expect(ta2.value).toBe('半稿改')
    expect(state().floatingNotes[0]!.content).toBe('半稿基')
    expect(state().queue).toHaveLength(0)
  })

  it('编辑 A 点 B：旧会话先收口（A 稿入队）再开 B——两稿各入队', () => {
    useLineageStore.setState({
      floatingNotes: [
        makeNote({ id: 'fn-a', content: 'A初稿' }),
        makeNote({ id: 'fn-b', x: 300, y: 300, content: 'B初稿' })
      ]
    })
    mountNotes()
    act(() => {
      pdown(noteElOf('fn-a')!, 150, 150)
    })
    act(() => {
      typeInto(noteElOf('fn-a')!.querySelector('textarea')! as HTMLTextAreaElement, 'A定稿')
    })
    act(() => {
      pdown(noteElOf('fn-b')!, 350, 350)
    })
    expect(state().floatingNotes.find((f) => f.id === 'fn-a')!.content).toBe('A定稿')
    const tb = noteElOf('fn-b')!.querySelector('textarea')! as HTMLTextAreaElement
    expect(tb.value).toBe('B初稿')
    act(() => {
      typeInto(tb, 'B定稿')
    })
    act(() => {
      blurTa(tb)
    })
    const ups = state().queue.filter((a) => a.kind === 'upsert-floating-note')
    expect(ups).toHaveLength(2)
    expect(ups[0]).toMatchObject({ kind: 'upsert-floating-note', input: { id: 'fn-a', content: 'A定稿' } })
    expect(ups[1]).toMatchObject({ kind: 'upsert-floating-note', input: { id: 'fn-b', content: 'B定稿' } })
  })

  it('编辑中拖柄打断：稿先收口不丢+拖动落定同 id 合并单条 upsert（content+x/y）', () => {
    useLineageStore.setState({ floatingNotes: [makeNote({ id: 'fn-g', x: 100, y: 100, content: '拖基' })] })
    mountNotes()
    act(() => {
      pdown(noteElOf('fn-g')!, 150, 150)
    })
    act(() => {
      typeInto(noteElOf('fn-g')!.querySelector('textarea')! as HTMLTextAreaElement, '拖稿')
    })
    act(() => {
      pdown(noteElOf('fn-g')!.querySelector('.tl-note-grip')!, 140, 120)
    })
    expect(state().floatingNotes[0]!.content).toBe('拖稿')
    act(() => {
      pmove(190, 195)
    })
    act(() => {
      pup(190, 195)
    })
    expect(state().floatingNotes[0]).toMatchObject({ x: 150, y: 175, content: '拖稿' })
    const ups = state().queue.filter((a) => a.kind === 'upsert-floating-note')
    expect(ups).toHaveLength(1)
    expect(ups[0]).toMatchObject({ input: { id: 'fn-g', x: 150, y: 175, content: '拖稿' } })
  })
})

describe('R3 幽灵写防御（异步落点写前核在场）', () => {
  it('空编辑笔记右键删除全序：收口回收先删→onPick 幽灵跳过（不抛+恰一次 remove+菜单关闭）', () => {
    mountNotes()
    act(() => {
      openBlankMenu(240, 220)
    })
    act(() => {
      clickMenuItem('新建悬浮笔记')
    })
    const created = state().floatingNotes[0]!
    act(() => {
      ctxOn(noteElOf(created.id)!, 300, 260)
    })
    expect(state().floatingNotes).toHaveLength(0)
    expect(menuEl()).not.toBeNull()
    act(() => {
      clickMenuItem('删除笔记')
    })
    expect(menuEl()).toBeNull()
    expect(state().queue.filter((a) => a.kind === 'remove-floating-note')).toHaveLength(1)
  })

  it('拖动中他径删除→pointerup 不抛不写（jsdom 吞 listener 异常——以 store 触达 spy 断言幽灵写不发生）', () => {
    useLineageStore.setState({ floatingNotes: [makeNote({ id: 'fn-h', x: 100, y: 100 })] })
    mountNotes()
    const ghostWrite = vi.spyOn(useLineageStore.getState(), 'updateFloatingNote')
    act(() => {
      pdown(noteElOf('fn-h')!.querySelector('.tl-note-grip')!, 140, 120)
    })
    act(() => {
      pmove(190, 195)
    })
    act(() => {
      useLineageStore.setState({ floatingNotes: [] })
    })
    act(() => {
      pup(190, 195)
    })
    expect(ghostWrite).not.toHaveBeenCalled()
    expect(state().queue).toHaveLength(0)
    ghostWrite.mockRestore()
  })
})

describe('R4/R5 交互门补充（saving 让位/textarea 右键原生放行）', () => {
  it('R4 saving 态让位：笔记 pointer-events none+空白右键无菜单（防静默 no-op 丢稿）', () => {
    useLineageStore.setState({ floatingNotes: [makeNote()], saveStatus: 'saving' })
    mountNotes()
    const savingNote = document.querySelector('.tl-note') as HTMLElement | null
    expect(savingNote!.style.pointerEvents).toBe('none')
    act(() => {
      openBlankMenu(240, 220)
    })
    expect(menuEl()).toBeNull()
  })

  it('R5 编辑中 textarea 右键=原生菜单：不 preventDefault 不开删除菜单（剪切/复制/粘贴可用）', () => {
    useLineageStore.setState({ floatingNotes: [makeNote({ id: 'fn-r', content: '右键文' })] })
    mountNotes()
    act(() => {
      pdown(noteElOf('fn-r')!, 150, 150)
    })
    const ta = noteElOf('fn-r')!.querySelector('textarea')!
    const ev = new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: 320, clientY: 280 })
    act(() => {
      ta.dispatchEvent(ev)
    })
    expect(ev.defaultPrevented).toBe(false)
    expect(menuEl()).toBeNull()
  })
})

describe('R6/R7 盲区补强（柄贴顶/右键排除面/拖动越界）', () => {
  it('R6 贴顶拖动落定 y≥柄高+柄 top/height inline 单源（几何常量=geom 件）', () => {
    useLineageStore.setState({ floatingNotes: [makeNote({ id: 'fn-t2', x: 100, y: 100 })] })
    mountNotes()
    const grip0 = document.querySelector('.tl-note-grip') as HTMLElement
    expect(grip0.style.top).toBe(`-${NOTE_GRIP_H}px`)
    expect(grip0.style.height).toBe(`${NOTE_GRIP_H}px`)
    const grip = noteElOf('fn-t2')!.querySelector('.tl-note-grip')!
    act(() => {
      pdown(grip, 140, 120)
    })
    act(() => {
      pmove(150, -100)
    })
    act(() => {
      pup(150, -100)
    })
    expect(state().floatingNotes[0]).toMatchObject({ x: 110, y: NOTE_GRIP_H })
  })

  it('R7 右键排除：卡/边命中层/边编辑柄上右键不开创建菜单（他菜单域让路）', () => {
    mountNotes()
    for (const cls of ['tl-card', 'tl-edge-hit', 'edge-handle']) {
      const el = document.createElement('div')
      el.className = cls
      contentEl!.appendChild(el)
      act(() => {
        ctxOn(el, 240, 220)
      })
      expect(menuEl(), `${cls} 上右键不开创建菜单`).toBeNull()
      el.remove()
    }
  })

  it('R7 拖动越界钳制：拖出右/下界落定钳内（内容 own 域−占位，x/y 不对称）', () => {
    useLineageStore.setState({ floatingNotes: [makeNote({ id: 'fn-o', x: 100, y: 100 })] })
    mountNotes()
    const grip = noteElOf('fn-o')!.querySelector('.tl-note-grip')!
    act(() => {
      pdown(grip, 140, 120)
    })
    act(() => {
      pmove(2040, 2020)
    })
    act(() => {
      pup(2040, 2020)
    })
    expect(state().floatingNotes[0]).toMatchObject({ x: 1000 - NOTE_W, y: 800 - NOTE_H })
  })
})

describe('S1/S2/S6 回炉轮 2（saving 在飞中止/钳制数学/会话硬化）', () => {
  it('S1① 在飞菜单随 saving 关闭（create/delete 两态）：菜单消失且 onPick 不可达（不创建不删除）', () => {
    useLineageStore.setState({ floatingNotes: [makeNote({ id: 'fn-s1' })] })
    mountNotes()
    act(() => {
      openBlankMenu(240, 220)
    })
    expect(menuEl()).not.toBeNull()
    act(() => {
      useLineageStore.setState({ flushing: true, saveStatus: 'saving' })
    })
    expect(menuEl()).toBeNull()
    act(() => {
      clickMenuItem('新建悬浮笔记')
    })
    expect(state().floatingNotes).toHaveLength(1)
    // delete 态同法（saving 关闭后再开再中断）
    act(() => {
      useLineageStore.setState({ flushing: false, saveStatus: 'clean' })
    })
    act(() => {
      ctxOn(noteElOf('fn-s1')!, 300, 260)
    })
    expect(menuEl()).not.toBeNull()
    act(() => {
      useLineageStore.setState({ flushing: true, saveStatus: 'saving' })
    })
    expect(menuEl()).toBeNull()
    act(() => {
      clickMenuItem('删除笔记')
    })
    expect(state().floatingNotes).toHaveLength(1)
  })

  it('S1② 拖动在飞→saving 中止：会话丢弃 live 回弹 store 现值+pointerup 零写不抛', () => {
    useLineageStore.setState({ floatingNotes: [makeNote({ id: 'fn-s1d', x: 100, y: 100 })] })
    mountNotes()
    const ghostWrite = vi.spyOn(useLineageStore.getState(), 'updateFloatingNote')
    act(() => {
      pdown(noteElOf('fn-s1d')!.querySelector('.tl-note-grip')!, 140, 120)
    })
    act(() => {
      pmove(190, 195)
    })
    expect(noteElOf('fn-s1d')!.style.left).toBe('150px')
    act(() => {
      useLineageStore.setState({ flushing: true, saveStatus: 'saving' })
    })
    expect(noteElOf('fn-s1d')!.style.left).toBe('100px')
    act(() => {
      pup(190, 195)
    })
    expect(ghostWrite).not.toHaveBeenCalled()
    ghostWrite.mockRestore()
  })

  it('S2 小内容域钳制数学：上界先与下限取 max——反压域 y 恒≥柄高+竖直可拖非死区', () => {
    useLineageStore.setState({ floatingNotes: [makeNote({ id: 'fn-s2', x: 10, y: 20 })] })
    mountNotes()
    // 反压形：contentH−h=50−40=10<柄高 14——旧式 maxY=10 会把下拖钳到 <14
    Object.defineProperty(contentEl!, 'offsetHeight', { value: 50, configurable: true })
    const note = noteElOf('fn-s2')!
    Object.defineProperty(note, 'offsetHeight', { value: 40, configurable: true })
    const grip = note.querySelector('.tl-note-grip')!
    act(() => {
      pdown(grip, 50, 40)
    })
    act(() => {
      pmove(50, 300)
    })
    act(() => {
      pup(50, 300)
    })
    expect(state().floatingNotes[0]!.y).toBe(NOTE_GRIP_H)
    // 非死区：contentH=60 → maxY=max(14,20)=20——竖直区间 [14,20] 可移动落定
    Object.defineProperty(contentEl!, 'offsetHeight', { value: 60, configurable: true })
    act(() => {
      pdown(grip, 50, 34)
    })
    act(() => {
      pmove(50, 80)
    })
    act(() => {
      pup(50, 80)
    })
    expect(state().floatingNotes[0]!.y).toBe(20)
  })

  it('S6① 会话指针绑定：他指 move 不驱动/他指 up 不收尾首指会话（主指收尾）', () => {
    useLineageStore.setState({ floatingNotes: [makeNote({ id: 'fn-p1', x: 100, y: 100 })] })
    mountNotes()
    const mk = (type: string, clientX: number, clientY: number, pid: number): MouseEvent => {
      const ev = new MouseEvent(type, { bubbles: true, clientX, clientY })
      Object.defineProperty(ev, 'pointerId', { value: pid })
      return ev
    }
    act(() => {
      noteElOf('fn-p1')!.querySelector('.tl-note-grip')!.dispatchEvent(mk('pointerdown', 140, 120, 1))
    })
    act(() => {
      document.dispatchEvent(mk('pointermove', 190, 195, 2))
    })
    expect(noteElOf('fn-p1')!.style.left).toBe('100px')
    act(() => {
      document.dispatchEvent(mk('pointermove', 190, 195, 1))
    })
    expect(noteElOf('fn-p1')!.style.left).toBe('150px')
    act(() => {
      document.dispatchEvent(mk('pointerup', 190, 195, 2))
    })
    expect(state().queue).toHaveLength(0)
    expect(noteElOf('fn-p1')!.style.left).toBe('150px')
    act(() => {
      document.dispatchEvent(mk('pointerup', 190, 195, 1))
    })
    expect(state().floatingNotes[0]).toMatchObject({ x: 150, y: 175 })
  })

  it('S6② window blur 中止：丢弃 live 回弹零写（useDrawLine 先例同型）', () => {
    useLineageStore.setState({ floatingNotes: [makeNote({ id: 'fn-p2', x: 100, y: 100 })] })
    mountNotes()
    const ghostWrite = vi.spyOn(useLineageStore.getState(), 'updateFloatingNote')
    act(() => {
      pdown(noteElOf('fn-p2')!.querySelector('.tl-note-grip')!, 140, 120)
    })
    act(() => {
      pmove(190, 195)
    })
    expect(noteElOf('fn-p2')!.style.left).toBe('150px')
    act(() => {
      window.dispatchEvent(new Event('blur'))
    })
    expect(noteElOf('fn-p2')!.style.left).toBe('100px')
    act(() => {
      pup(190, 195)
    })
    expect(ghostWrite).not.toHaveBeenCalled()
    ghostWrite.mockRestore()
  })
})
