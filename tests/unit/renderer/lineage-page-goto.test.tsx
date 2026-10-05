// @vitest-environment jsdom
/**
 * [F-UIRES-03 C3·RR1-A] 「去文献库」编排分支单测（always-active 裸 describe
 * ——K3）。锁三面：
 * ①分支计划（gotoLibraryPlan——LineagePage 消费单源）：folderId=MAIN_GRAPH_ID
 *   （未归夹）→folderScope=undefined 全库降级（Partial 合并键覆盖——清旧夹
 *   过滤）；真夹→{kind:'folder'} 精确过滤；paperId 透传。计划喂真
 *   library.store.setQuery 断言终态=编排语义完整链（RR1-A 挂载面自裁——
 *   LineagePage 整件挂载 jsdom 超时根因未定不阻塞，分支计算+store 写效果
 *   +事件三环全锁）。
 * ②Card title 哨兵分支（双源统一锁）：title 判=MAIN_GRAPH_ID 常量（字面量
 *   双源消除——常量值或判式变异即红）。
 * ③事件后发序：requestOpenLibrary=先置数后广播（listener 单次收到）。
 * 变异红证在档（rr1a-mutation-{page,card}.raw）：Page 分支反转/Card title
 * 判错字面量两变异各红→cp 备份还原 diff 空。
 */
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { makeApiStub } from '../../utils/api-client-mock'
import type { LineageNode } from '../../../src/shared/models/lineage'
import { MAIN_GRAPH_ID } from '../../../src/shared/models/lineage'

// 模块级桩注入（window.api 面——挂载 Timeline 消费域；变量不直接读）
const _stubApi = makeApiStub({
  lineage: {
    graph: vi.fn(),
    patchNode: vi.fn(),
    removeNode: vi.fn(),
    upsertEdge: vi.fn(),
    removeEdge: vi.fn(),
    upsertLineTypes: vi.fn()
  },
  library: { list: vi.fn() }
})

import { OPEN_LIBRARY_EVENT, requestOpenLibrary } from '../../../src/renderer/shared/open-library-bus'
import { useLibraryStore } from '../../../src/renderer/features/library/library.store'
import { gotoLibraryPlan } from '../../../src/renderer/features/lineage/goto-library-plan'
import { LineageTimeline } from '../../../src/renderer/features/lineage/LineageTimeline'

;(globalThis as unknown as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true

const folderNode = (id: string, folderId: string): LineageNode => ({
  id, paperId: `paper-${id}`, title: `节点${id}`, year: 2020, x: null, y: null,
  month: 5, slot: 0, folderId, createdAt: 't', updatedAt: 't'
})

let root: Root | null = null
let host: HTMLDivElement | null = null

beforeEach(() => {
  vi.clearAllMocks()
  useLibraryStore.setState({
    query: { sort: 'added_desc', offset: 0, limit: 50, folderScope: { kind: 'folder', folderId: 'old-folder' } },
    selectedId: null, papers: [], total: 0, loading: false, error: null
  })
})

afterEach(() => {
  act(() => {
    root?.unmount()
  })
  root = null
  host?.remove()
  host = null
  vi.restoreAllMocks()
})

describe('F-UIRES-03 C3·RR1-A「去文献库」编排分支（gotoLibraryPlan 单源）', () => {
  it('__main__ 哨兵分支：folderScope 置 undefined（全库降级——键覆盖清旧夹）+selectPaper 执行+事件后发一次', () => {
    // 前提锁：预置旧夹过滤（降级分支须清之——Partial 合并语义的判别前提）
    expect(useLibraryStore.getState().query.folderScope).toEqual({ kind: 'folder', folderId: 'old-folder' })
    const plan = gotoLibraryPlan('paper-U', MAIN_GRAPH_ID)
    expect(plan.folderScope).toBeUndefined()
    expect(plan.paperId).toBe('paper-U')
    // 编排消费链（LineagePage.handleCardGotoLibrary 同式）：先置数
    useLibraryStore.getState().setQuery({ folderScope: plan.folderScope })
    useLibraryStore.getState().selectPaper(plan.paperId)
    expect(useLibraryStore.getState().query.folderScope).toBeUndefined()
    expect(useLibraryStore.getState().selectedId).toBe('paper-U')
    // 后广播（一次）
    const heard: number[] = []
    const onEv = (): void => {
      heard.push(1)
    }
    window.addEventListener(OPEN_LIBRARY_EVENT, onEv)
    requestOpenLibrary()
    expect(heard).toEqual([1])
    window.removeEventListener(OPEN_LIBRARY_EVENT, onEv)
  })

  it('真夹分支：folderScope={kind:folder} 精确过滤+offset 归零；主题节点 paperId=null 透传（Page 侧不置选中）', () => {
    const plan = gotoLibraryPlan('paper-A', 'e2e-folder')
    expect(plan.folderScope).toEqual({ kind: 'folder', folderId: 'e2e-folder' })
    useLibraryStore.getState().setQuery({ folderScope: plan.folderScope })
    expect(useLibraryStore.getState().query.folderScope).toEqual({ kind: 'folder', folderId: 'e2e-folder' })
    expect(useLibraryStore.getState().query.offset).toBe(0)
    // 主题节点：paperId null 透传（消费侧 if 分支语义载体）
    expect(gotoLibraryPlan(null, 'e2e-folder').paperId).toBeNull()
  })

  it('Card title 哨兵分支两文案（MAIN_GRAPH_ID 常量判——字面量双源消除回归锁）', () => {
    host = document.createElement('div')
    document.body.appendChild(host)
    root = createRoot(host)
    act(() => {
      root?.render(
        <LineageTimeline
          nodes={[folderNode('A', 'e2e-folder'), folderNode('U', MAIN_GRAPH_ID)]}
          edges={[]}
        />
      )
    })
    const btnOf = (nodeId: string): HTMLElement => {
      const el = host?.querySelector(`.tl-card[data-node-id="${nodeId}"] [data-testid="card-goto-library"]`)
      if (!(el instanceof HTMLElement)) throw new Error(`去文献库钮未渲染：${nodeId}`)
      return el
    }
    expect(btnOf('U').title, '未归夹卡=全库降级文案').toBe('在文献库打开（未归文件夹——全库视图）')
    expect(btnOf('A').title, '真夹卡=所在夹文案').toBe('在文献库打开所在文件夹并定位')
  })
})
