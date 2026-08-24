// @vitest-environment jsdom
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { expect, it, vi } from 'vitest'
import type { Annotation, AnnotationRect } from '../../../src/shared/models/annotation'
import { AnnotationMenu } from '../../../src/renderer/features/reader/AnnotationMenu'
import { guardedDescribe } from '../../utils/guard'

/** 完整形态的最小标注（类型契约：接口层全字段） */
function makeAnnotation(): Annotation {
  return {
    id: 'anno-1',
    paperId: 'paper-1',
    page: 0,
    kind: 'highlight',
    color: 'yellow',
    quoteText: '被标注的引文内容',
    prefixText: '前',
    suffixText: '后',
    startOffset: 1,
    endOffset: 10,
    rects: [{ page: 0, x: 0.1, y: 0.2, w: 0.3, h: 0.05 }],
    comment: '',
    createdAt: '2026-08-23T00:00:00Z',
    updatedAt: '2026-08-23T00:00:00Z'
  }
}

/** 命中矩形靠右（x=0.8）以覆盖左沿夹取分支 */
const RIGHT_RECT: AnnotationRect = { page: 0, x: 0.8, y: 0.5, w: 0.1, h: 0.05 }

function renderMenu(
  props: Partial<Parameters<typeof AnnotationMenu>[0]> = {}
): { root: ReturnType<typeof createRoot>; host: HTMLDivElement } {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const root = createRoot(host)
  act(() => {
    root.render(
      <AnnotationMenu
        annotation={makeAnnotation()}
        rect={RIGHT_RECT}
        busy={false}
        onCopy={vi.fn()}
        onDelete={vi.fn()}
        onAddNote={vi.fn()}
        onCancel={vi.fn()}
        {...props}
      />
    )
  })
  return { root, host }
}

function clickButton(host: HTMLElement, label: string): void {
  const btn = [...host.querySelectorAll('button')].find((b) => b.textContent === label)
  expect(btn, `按钮存在：${label}`).toBeDefined()
  act(() => {
    btn?.click()
  })
}

guardedDescribe('SR2-ANNO-01', 'AnnotationMenu —— 标注四选项菜单', () => {
  it('渲染四选项与菜单锚点 testid', () => {
    const { host } = renderMenu()
    expect(host.querySelector('[data-testid="annotation-menu"]')).not.toBeNull()
    for (const label of ['复制引文', '删除', '添加笔记', '取消']) {
      expect(
        [...host.querySelectorAll('button')].some((b) => b.textContent === label)
      ).toBe(true)
    }
  })

  it('四出口回调：各按钮点击各触发对应回调一次', () => {
    const onCopy = vi.fn()
    const onDelete = vi.fn()
    const onAddNote = vi.fn()
    const onCancel = vi.fn()
    const { host } = renderMenu({ onCopy, onDelete, onAddNote, onCancel })
    clickButton(host, '复制引文')
    expect(onCopy).toHaveBeenCalledTimes(1)
    clickButton(host, '删除')
    expect(onDelete).toHaveBeenCalledTimes(1)
    clickButton(host, '添加笔记')
    expect(onAddNote).toHaveBeenCalledTimes(1)
    clickButton(host, '取消')
    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  it('busy 期间四按钮禁用且点击不触发回调', () => {
    const onCopy = vi.fn()
    const onDelete = vi.fn()
    const { host } = renderMenu({ busy: true, onCopy, onDelete })
    for (const btn of [...host.querySelectorAll('button')]) {
      expect(btn.disabled).toBe(true)
    }
    clickButton(host, '复制引文')
    clickButton(host, '删除')
    expect(onCopy).not.toHaveBeenCalled()
    expect(onDelete).not.toHaveBeenCalled()
  })

  it('定位：贴命中矩形左下沿，右缘越界时左沿夹取（55%），不越界时按矩形原位', () => {
    const { host } = renderMenu()
    const menu = host.querySelector('[data-testid="annotation-menu"]') as HTMLElement
    expect(menu.style.left).toBe('55%')
    expect(menu.style.top).toBe('calc(55% + 6px)')
    // 不夹取分支：x=0.1 时左沿即矩形原位（防溢出公式的两分支全锁定）
    const host2 = document.createElement('div')
    document.body.appendChild(host2)
    const root2 = createRoot(host2)
    act(() => {
      root2.render(
        <AnnotationMenu
          annotation={makeAnnotation()}
          rect={{ page: 0, x: 0.1, y: 0.5, w: 0.1, h: 0.05 }}
          busy={false}
          onCopy={vi.fn()}
          onDelete={vi.fn()}
          onAddNote={vi.fn()}
          onCancel={vi.fn()}
        />
      )
    })
    const menu2 = host2.querySelector('[data-testid="annotation-menu"]') as HTMLElement
    expect(menu2.style.left).toBe('10%')
    expect(menu2.style.top).toBe('calc(55% + 6px)')
  })
})
