// @vitest-environment jsdom
/**
 * [F-DBCAMP-01 DB-4 / F-STAR-01 A3+A4] 脉络卡/侧板星标点亮（P-11 退出条件
 * ——三模式均 toggle 星标；edit 态 transitional「星标域点击=选中卡」分派随
 * DB-4 退役）。
 *
 * 覆盖：卡星标域——主题节点（paperId null）不渲染；未标记=书页图标+title
 * 「星标」；已标记=高亮星（on class+aria-pressed）；点击=stopPropagation+
 * 回调（不扰卡身选中/聚焦）。store 面——toggleNodeStar：api 逐参+节点本地
 * isStarred 翻转；失败回滚+toast；paperId null no-op。侧板（A4）——panel-star
 * 按态呈现+点击上抛 onToggleStar。
 * always-active（不经 guardedDescribe）。
 */
import { makeApiStub } from '../../utils/api-client-mock'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defaultLineTypeNames, type LineageNode } from '../../../src/shared/models/lineage'
import { useLineageStore } from '../../../src/renderer/features/lineage/lineage.store'

// 侧板子节挂载链桩（notes/reader/ai_sensor——api-client-mock 展开型共享桩）
// +store 星标切换桩（papers.setStarred——A3 toggleNodeStar 面）
const stubApi = makeApiStub({
  notes: { get: vi.fn(async () => ({ ok: true as const, data: null })) },
  reader: {
    list: vi.fn(async () => ({ ok: true as const, data: [] })),
    listAnnotations: vi.fn(async () => ({ ok: true as const, data: [] }))
  },
  ai_sensor: {
    list: vi.fn(async () => ({ ok: true as const, data: [] })),
    listByPaper: vi.fn(async () => ({ ok: true as const, data: [] }))
  },
  papers: { setStarred: vi.fn() },
  // [F-UIRES-04 批 3b 回炉 r1] SidePaperInfo M1 接缝面（主控裁 reject：error 态最小 DOM 增量，M2/pdfjs 链不进单测）
  library: { detail: vi.fn(() => Promise.reject(new Error('library.detail: b3b 接缝面未桩接'))) }
})

;(globalThis as unknown as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true

function makeNode(over: Partial<LineageNode> = {}): LineageNode {
  return {
    id: over.id ?? 'n-1',
    paperId: over.paperId ?? 'p-1',
    title: over.title ?? '文献甲',
    year: 2025,
    folderId: '__main__',
    x: null,
    y: null,
    month: 1,
    slot: 1,
    ...(over.isStarred !== undefined ? { isStarred: over.isStarred } : {}),
    createdAt: 't',
    updatedAt: 't',
    ...over
  } as LineageNode
}

let root: Root | null = null
let host: HTMLDivElement | null = null

async function render(node: JSX.Element): Promise<void> {
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  await act(async () => {
    root?.render(node)
  })
}

beforeEach(() => {
  Element.prototype.scrollIntoView = () => undefined
  stubApi.papers.setStarred.mockClear()
  stubApi.papers.setStarred.mockImplementation(async () => ({ ok: true as const, data: { ok: true } }))
})

afterEach(async () => {
  await act(async () => {
    root?.unmount()
  })
  root = null
  host?.remove()
  host = null
  vi.unstubAllGlobals()
})

describe('F-STAR-01 A3 脉络卡星标域', () => {
  async function setupCard(node: LineageNode): Promise<{
    card: HTMLElement | null
    onStarClick: ReturnType<typeof vi.fn>
    onNodeClick: ReturnType<typeof vi.fn>
  }> {
    const { LineageTimelineCard } = await import('../../../src/renderer/features/lineage/LineageTimelineCard')
    const onStarClick = vi.fn()
    const onNodeClick = vi.fn()
    await render(
      <LineageTimelineCard
        node={node}
        no={1}
        metrics={null}
        selected={false}
        onNodeClick={onNodeClick}
        onStarClick={onStarClick}
      />
    )
    return { card: host?.querySelector('.tl-card') ?? null, onStarClick, onNodeClick }
  }

  it('主题节点（paperId null）：星标域不渲染（无文献可标——tags 判空同款先例）', async () => {
    const { card } = await setupCard(makeNode({ id: 'theme', paperId: null, isStarred: undefined }))
    expect(card?.querySelector('.c-star')).toBeNull()
  })

  it('未标记：书页图标形态+title「星标」+aria-pressed=false', async () => {
    const { card } = await setupCard(makeNode({ isStarred: false }))
    const star = card?.querySelector('.c-star')
    expect(star).not.toBeNull()
    expect(star?.getAttribute('title')).toBe('星标')
    expect(star?.getAttribute('aria-pressed')).toBe('false')
    expect(star?.classList.contains('on')).toBe(false)
    expect(star?.querySelector('svg path')?.getAttribute('fill')).toBe('none')
  })

  it('已标记：高亮星形态（on class+aria-pressed=true+title「取消星标」+实心填充）', async () => {
    const { card } = await setupCard(makeNode({ isStarred: true }))
    const star = card?.querySelector('.c-star')
    expect(star?.classList.contains('on')).toBe(true)
    expect(star?.getAttribute('aria-pressed')).toBe('true')
    expect(star?.getAttribute('title')).toBe('取消星标')
    expect(star?.querySelector('svg path')?.getAttribute('fill')).not.toBe('none')
  })

  it('点击：stopPropagation（卡身 onNodeClick 不触发）+onStarClick(nodeId) 上抛', async () => {
    const { card, onStarClick, onNodeClick } = await setupCard(makeNode({ isStarred: false }))
    await act(async () => {
      card?.querySelector('.c-star')?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    expect(onStarClick).toHaveBeenCalledTimes(1)
    expect(onNodeClick).not.toHaveBeenCalled()
  })
})

describe('F-STAR-01 A3 lineage.store toggleNodeStar', () => {
  it('toggle：api.papers.setStarred 逐参+节点本地 isStarred 翻转（非编辑暂存面——队列零介入）', async () => {
    const store = useLineageStore
    store.setState({
      nodes: [makeNode({ id: 'n-1', paperId: 'p-1', isStarred: false })],
      saveStatus: 'clean',
      queue: [],
      undoStack: [],
      redoStack: []
    })
    await store.getState().toggleNodeStar({ id: 'n-1', paperId: 'p-1', isStarred: false })
    expect(stubApi.papers.setStarred).toHaveBeenCalledWith({ paperId: 'p-1', starred: true })
    expect(store.getState().nodes[0]?.isStarred).toBe(true)
    expect(store.getState().queue).toHaveLength(0)
  })

  it('失败：回滚原值（toast 面经 toast-store——断言收口在回滚行为）', async () => {
    stubApi.papers.setStarred.mockImplementation(async () => ({
      ok: false as const,
      error: { code: 'DB_ERROR', message: '写失败' }
    }))
    const store = useLineageStore
    store.setState({
      nodes: [makeNode({ id: 'n-1', paperId: 'p-1', isStarred: true })],
      queue: [],
      undoStack: [],
      redoStack: []
    })
    await store.getState().toggleNodeStar({ id: 'n-1', paperId: 'p-1', isStarred: true })
    expect(store.getState().nodes[0]?.isStarred).toBe(true)
  })

  it('载荷面收窄：store 不做节点查表（调用面 Timeline/Panel 判 paperId——主题节点星标域不渲染=结构性 no-op）', async () => {
    const store = useLineageStore
    // store 节点面未含该 id（props-only 挂载面）——载荷快照仍可切（api 逐参）
    store.setState({ nodes: [], queue: [] })
    await store.getState().toggleNodeStar({ id: 'n-x', paperId: 'p-x', isStarred: false })
    expect(stubApi.papers.setStarred).toHaveBeenCalledWith({ paperId: 'p-x', starred: true })
  })

  it('undo 快照不捕获星标（回炉 r1-R2/k3-W-1）：入栈→toggleNodeStar(true)→undo→isStarred 仍 true（星标=非撤销维度恒保现值——不与 DB 脱钩）', async () => {
    const store = useLineageStore
    const before = makeNode({ id: 'n-1', paperId: 'p-1', isStarred: false })
    store.setState({
      nodes: [before],
      edges: [],
      lineTypeNames: defaultLineTypeNames(),
      queue: [],
      undoStack: [],
      redoStack: [],
      saveStatus: 'clean',
      flushing: false
    })
    // 编辑单元入栈（beginUnit 前快照——isStarred=false 时点）
    store.setState({
      undoStack: [
        { nodes: [before], edges: [], lineTypeNames: defaultLineTypeNames(), queue: [], floatingNotes: [] }
      ]
    })
    await store.getState().toggleNodeStar({ id: 'n-1', paperId: 'p-1', isStarred: false })
    expect(store.getState().nodes[0]?.isStarred).toBe(true)
    store.getState().undo()
    expect(store.getState().nodes[0]?.isStarred, 'undo 后星标保持现值（快照不回退）').toBe(true)
  })

  it('redo 向跨格序列（回炉 r2-R15）：入栈→toggle(true)→undo→redo→isStarred 仍 true；undo 后 toggle 再 redo 同保现值（判别序列 B——变异摘 overlay 须红）', async () => {
    const store = useLineageStore
    const reset = (): void => {
      store.setState({
        nodes: [makeNode({ id: 'n-1', paperId: 'p-1', isStarred: false })],
        edges: [],
        lineTypeNames: defaultLineTypeNames(),
        queue: [],
        undoStack: [],
        redoStack: [],
        saveStatus: 'clean',
        flushing: false
      })
    }
    const pushSnap = (): void => {
      store.setState({
        undoStack: [
          {
            nodes: [makeNode({ id: 'n-1', paperId: 'p-1', isStarred: false })],
            edges: [],
            lineTypeNames: defaultLineTypeNames(),
            queue: [],
            floatingNotes: []
          }
        ]
      })
    }
    // 序列 A（主控指定）：入栈→toggle→undo→redo——undo/redo 共用 restore
    // 单点=同语义机械覆盖（redo 恢复的 cur 录制点已含星标现值，首跑即绿）
    reset()
    pushSnap()
    await store.getState().toggleNodeStar({ id: 'n-1', paperId: 'p-1', isStarred: false })
    store.getState().undo()
    store.getState().redo()
    expect(store.getState().nodes[0]?.isStarred, '序列 A：redo 后星标仍 true').toBe(true)
    // 序列 B（判别面）：undo→toggle→redo——cur 录制点早于星标切换，
    // redo 恢复快照 false 时 overlay 回贴现值 true（摘 overlay 即红）
    reset()
    pushSnap()
    store.getState().undo()
    await store.getState().toggleNodeStar({ id: 'n-1', paperId: 'p-1', isStarred: false })
    expect(store.getState().nodes[0]?.isStarred).toBe(true)
    store.getState().redo()
    expect(store.getState().nodes[0]?.isStarred, '序列 B：undo 后星标不被 redo 回滚').toBe(true)
  })

  it('add→star→undo→redo 边界（回炉 r2-R16/k3 角案）：回归节点 isStarred 取快照录制值（快照缺维度=缺席键，下次 graph 载入自愈——登记非修复）', async () => {
    const store = useLineageStore
    const n1 = makeNode({ id: 'n-1', paperId: 'p-1' })
    const n2 = makeNode({ id: 'n-2', paperId: 'p-2' })
    store.setState({
      nodes: [n1],
      edges: [],
      lineTypeNames: defaultLineTypeNames(),
      queue: [],
      undoStack: [{ nodes: [n1], edges: [], lineTypeNames: defaultLineTypeNames(), queue: [], floatingNotes: [] }],
      redoStack: [],
      saveStatus: 'clean',
      flushing: false
    })
    // 编辑动作=新节点加入（入栈后现网 [n1,n2]）
    store.setState({ nodes: [n1, n2] })
    await store.getState().toggleNodeStar({ id: 'n-2', paperId: 'p-2', isStarred: undefined })
    expect(store.getState().nodes.find((n) => n.id === 'n-2')?.isStarred).toBe(true)
    // undo：恢复 S0=[n1]——n2 消失（快照缺 id=新增后撤销，不贴保持快照值）
    store.getState().undo()
    expect(store.getState().nodes.map((n) => n.id)).toEqual(['n-1'])
    // redo：n2 回归——isStarred 取 cur 录制值（undo 时刻现网已含 true）
    store.getState().redo()
    expect(store.getState().nodes.map((n) => n.id).sort()).toEqual(['n-1', 'n-2'])
    expect(store.getState().nodes.find((n) => n.id === 'n-2')?.isStarred, '回归节点星标=快照录制值').toBe(true)
  })
})

describe('F-STAR-01 A4 LineageSidePanel 星标域', () => {
  it('文献节点：panel-star 按态呈现（aria-pressed/title）+点击上抛 onToggleStar', async () => {
    const { LineageSidePanel } = await import('../../../src/renderer/features/lineage/LineageSidePanel')
    const onToggleStar = vi.fn()
    await render(
      <LineageSidePanel
        node={makeNode({ isStarred: false })}
        onJumpToPaper={() => undefined}
        onToggleStar={onToggleStar}
      />
    )
    const star = host?.querySelector('.panel-star')
    expect(star).not.toBeNull()
    expect(star?.getAttribute('aria-pressed')).toBe('false')
    expect(star?.getAttribute('title')).toBe('星标')
    await act(async () => {
      star?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    expect(onToggleStar).toHaveBeenCalledWith({ id: 'n-1', paperId: 'p-1', isStarred: false })
  })

  it('主题节点：星标域不渲染（卡面同款判空口径）', async () => {
    const { LineageSidePanel } = await import('../../../src/renderer/features/lineage/LineageSidePanel')
    await render(
      <LineageSidePanel node={makeNode({ paperId: null })} onJumpToPaper={() => undefined} />
    )
    expect(host?.querySelector('.panel-star')).toBeNull()
  })
})
