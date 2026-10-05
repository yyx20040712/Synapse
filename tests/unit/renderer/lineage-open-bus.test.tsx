// @vitest-environment jsdom
/**
 * [LG-04→F-UIRES-03 B2·RR1] openFromBus 消费方级测试（INV-20 单入口接缝
 * ——always-active 裸 it，不经 guardedDescribe）。[RR1] 自 lineage-side-panel
 * .test.tsx 拆出（主件 500 行红线——B1 tag-dropdown 拆件先例；语义零改）。
 *
 * 覆盖：带锚请求→locateAnchor 单入口（锚三元组透传，B2 起 aiNoteId 面退役）
 * /无锚请求→openPaper 既有链路（locateAnchor 不介入）/页级降级（resolve
 * page）静默——降级提示归 locateAnchor 内部不重复 toast/无锚打开失败→动作型
 * toast（既有文案保持）。
 */
import { beforeEach, expect, it, vi } from 'vitest'
import { makeApiStub } from '../../utils/api-client-mock'

const stubApi = makeApiStub({
  lineage: { graph: vi.fn() }
})
void stubApi

const { openPaperStub, locateAnchorStub } = vi.hoisted(() => ({
  openPaperStub: vi.fn(),
  locateAnchorStub: vi.fn()
}))

// openFromBus 消费面：reader.store 仅需 getState().openPaper（B2 起 anchor
// 分支即定位——无面板信号前置）
vi.mock('../../../src/renderer/features/reader/state/reader.store', () => ({
  useReaderStore: { getState: () => ({ openPaper: openPaperStub }) }
}))
vi.mock('../../../src/renderer/features/reader/anchors/anchor-locate', () => ({
  locateAnchor: locateAnchorStub
}))

import { showToast } from '../../../src/renderer/shared/ui/toast-store'
import { openFromBus } from '../../../src/renderer/features/reader/anchors/open-paper-anchor'

const flush = async (turns = 6): Promise<void> => {
  for (let i = 0; i < turns; i++) {
    await Promise.resolve()
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  locateAnchorStub.mockResolvedValue('exact')
  openPaperStub.mockResolvedValue(undefined)
})

it('消费方级：带锚请求→locateAnchor 单入口（锚三元组透传；openPaper 不重复调）', async () => {
  openFromBus({
    paperId: 'p-1',
    anchor: { quoteText: 'q', prefixText: 'p', suffixText: 's', anchorPage: 2 }
  })
  await flush()
  expect(locateAnchorStub).toHaveBeenCalledWith({
    paperId: 'p-1',
    anchor: { quoteText: 'q', prefixText: 'p', suffixText: 's', anchorPage: 2 }
  })
  expect(openPaperStub).not.toHaveBeenCalled()
})

it('消费方级：无锚请求→openPaper 既有链路（locateAnchor 不介入）', async () => {
  openFromBus({ paperId: 'p-1' })
  await flush()
  expect(openPaperStub).toHaveBeenCalledWith('p-1')
  expect(locateAnchorStub).not.toHaveBeenCalled()
})

it('消费方级：页级降级（resolve page）静默——降级提示归 locateAnchor 内部，不重复 toast', async () => {
  locateAnchorStub.mockResolvedValue('page')
  openFromBus({ paperId: 'p-1', anchor: { quoteText: 'q', prefixText: '', suffixText: '' } })
  await flush()
  expect(showToast).not.toHaveBeenCalled()
})

it('消费方级：无锚打开失败→动作型 toast（既有文案保持）', async () => {
  openPaperStub.mockRejectedValue(new Error('文件不存在'))
  openFromBus({ paperId: 'p-1' })
  await flush()
  expect(showToast).toHaveBeenCalledWith('文件不存在', 'error')
})
