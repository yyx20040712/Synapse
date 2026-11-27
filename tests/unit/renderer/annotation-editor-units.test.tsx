// @vitest-environment jsdom
/**
 * [B4-A R1 §3] 文本单元语义——AnnotationEditor 组件测试（新建，always-active；
 * 自 annotation-editor-ux.test.tsx 分立——该件近 max-lines 500）。
 *
 * 锁设计稿 §3「阅读器文本单元语义全表」的输入/收口事件列（批注 comment 面；
 * 总评面同控制器的镜像用例在 reader-notes-history.test.tsx）：
 * - 连续输入合并：窗口内后续键只更新 after——空闲提交恰一个单元（一步 undo 回
 *   到单元 before，不逐键成步）；
 * - 空格/回车：并入当前单元后立即关闭（下一字符开新单元；不额外产生空白单元）；
 * - 粘贴：先关闭已有单元，粘贴内容单独构成并立即关闭一个单元（undo 逐步经过
 *   两值；不拆成逐字符步骤）；
 * - blur：同步关闭当前单元后立即落库（不等 1.5s）；重复 blur 不双提交；
 * - flush-then-undo：undo 先等在途写落定再反向写（调用序=在途值→反向值）；
 * - 操作层代际失效：bumpTextGeneration 后编辑器采用恢复值、旧文本栈不可撤；
 * - 非输入回显/idle-flush：不开新历史单元、不清 redo；
 * - canRedo 投影：存在未提交新输入时 false，future 的真正销毁时点=该单元提交；
 * - 反向写在途窗内新输入：显示值保留，打开单元基线改指反向值（§2.5 #16b）。
 * 计时常量经 @shared/constants IDLE_FLUSH_MS 单源；深度锚 TEXT_HISTORY_DEPTH_MAX。
 */
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { makeAnnotation } from '../../utils/factories'
import { IDLE_FLUSH_MS } from '../../../src/shared/constants'
import type { AnnotationRect } from '../../../src/shared/models/annotation'
import {
  bumpTextGeneration,
  clearAllTextHistory,
  textTargetSize
} from '../../../src/renderer/features/reader/state/reader-text-history'
import { AnnotationEditor } from '../../../src/renderer/features/reader/view/AnnotationEditor'

const RECT: AnnotationRect = { page: 0, x: 0.1, y: 0.2, w: 0.3, h: 0.05 }
const TARGET = { paperId: 'paper-1', kind: 'annotation-comment', annotationId: 'anno-1' } as const

let root: Root | null = null
let host: HTMLDivElement | null = null

beforeEach(() => {
  vi.useFakeTimers()
  ;(globalThis as unknown as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
})

afterEach(() => {
  act(() => {
    root?.unmount()
  })
  root = null
  host?.remove()
  host = null
  document.body.innerHTML = ''
  vi.useRealTimers()
  vi.clearAllMocks()
  clearAllTextHistory()
})

function typeInto(el: HTMLTextAreaElement, text: string): void {
  const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set
  act(() => {
    setter?.call(el, text)
    el.dispatchEvent(new Event('input', { bubbles: true }))
  })
}

function deferred<T>(): { promise: Promise<T>; resolve: (v: T) => void } {
  let resolve!: (v: T) => void
  const promise = new Promise<T>((r) => {
    resolve = r
  })
  return { promise, resolve }
}

function renderEditor(
  props: Partial<Parameters<typeof AnnotationEditor>[0]> = {}
): { onAutosave: ReturnType<typeof vi.fn>; onHistoryWrite: ReturnType<typeof vi.fn> } {
  const onAutosave = vi.fn(() => Promise.resolve(true))
  const onHistoryWrite = vi.fn((_comment: string) => Promise.resolve(true))
  // [B4-A 回炉 R5 fixture migration] 裸写体端口必选：夹具写体本就不入链，同一桩兼作裸通道
  act(() => {
    root!.render(
      <AnnotationEditor
        annotation={makeAnnotation()}
        rect={RECT}
        busy={false}
        onCancel={vi.fn()}
        onDelete={vi.fn()}
        onAutosave={onAutosave}
        onAutosaveRaw={props.onAutosave ?? onAutosave}
        onHistoryWriteRaw={onHistoryWrite}
        {...props}
      />
    )
  })
  return { onAutosave, onHistoryWrite }
}

function textarea(): HTMLTextAreaElement {
  return host!.querySelector('textarea') as HTMLTextAreaElement
}

function undoBtn(): HTMLButtonElement {
  return host!.querySelector<HTMLButtonElement>('[data-testid="annotation-editor-undo"]')!
}

function redoBtn(): HTMLButtonElement {
  return host!.querySelector<HTMLButtonElement>('[data-testid="annotation-editor-redo"]')!
}

/** 冲微任务到链终态（undo/redo 异步真实链） */
async function settle(): Promise<void> {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(0)
  })
}

async function clickUndo(): Promise<void> {
  act(() => {
    undoBtn().click()
  })
  await settle()
}

async function clickRedo(): Promise<void> {
  act(() => {
    redoBtn().click()
  })
  await settle()
}

/** 空闲到期（单元提交+落库） */
async function idle(): Promise<void> {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(IDLE_FLUSH_MS)
  })
}

describe('B4-A R1 §3 文本单元语义 —— 连续输入/空格/回车/粘贴的单元边界', () => {
  it('连续输入合并：5 次键入→空闲提交恰一个单元（undo 一步回初值，不逐键成步）', async () => {
    const { onHistoryWrite } = renderEditor()
    const ta = textarea()
    for (const v of ['n', 'ni', 'nia', 'nial', 'nialong']) {
      typeInto(ta, v)
    }
    await idle()
    expect(onHistoryWrite).toHaveBeenCalledTimes(0)
    await clickUndo()
    // 一个单元=一步：直接回到单元 before（''），不经中间键值
    expect(ta.value).toBe('')
    expect(onHistoryWrite).toHaveBeenCalledTimes(1)
    expect(onHistoryWrite).toHaveBeenCalledWith('')
    expect(undoBtn().disabled).toBe(true)
  })

  it('空格：并入当前单元后立即关闭——下一字符开新单元；undo 逐步经「a 」回「」', async () => {
    const { onHistoryWrite } = renderEditor()
    const ta = textarea()
    typeInto(ta, 'a')
    typeInto(ta, 'a ')
    typeInto(ta, 'a b')
    // 空格键后单元即闭合（不等空闲）：第二个单元已开
    await clickUndo()
    expect(ta.value).toBe('a ')
    await clickUndo()
    expect(ta.value).toBe('')
    expect(onHistoryWrite).toHaveBeenCalledTimes(2)
    expect(undoBtn().disabled).toBe(true)
  })

  it('空格不额外产生空白单元：输入后又回退到 before 的单元闭合不产历史项', async () => {
    renderEditor()
    const ta = textarea()
    typeInto(ta, 'a')
    typeInto(ta, '') // 回退到 before：打开单元零差
    typeInto(ta, ' ')
    await idle()
    // 唯一历史项=「''→' '」（零差单元不产项——空格并入的是它自己开的单元）
    await clickUndo()
    expect(ta.value).toBe('')
    expect(undoBtn().disabled).toBe(true)
  })

  it('回车：换行并入当前单元后关闭（多行 textarea 保持换行）；undo 逐步经「a\\n」回「」', async () => {
    renderEditor()
    const ta = textarea()
    typeInto(ta, 'a')
    typeInto(ta, 'a\n')
    typeInto(ta, 'a\nb')
    await clickUndo()
    expect(ta.value).toBe('a\n')
    await clickUndo()
    expect(ta.value).toBe('')
    expect(undoBtn().disabled).toBe(true)
  })

  it('粘贴独立单元：先关闭已有单元，粘贴内容单独成一步——undo 逐步经过两值且不拆逐字符', async () => {
    const { onHistoryWrite } = renderEditor()
    const ta = textarea()
    typeInto(ta, 'ab')
    act(() => {
      ta.dispatchEvent(new Event('paste', { bubbles: true }))
    })
    typeInto(ta, 'abXYZ')
    await idle()
    expect(onHistoryWrite).toHaveBeenCalledTimes(0)
    // 第一步回到粘贴前值（粘贴单元），第二步回到键入前值（旧单元）——两值都保留
    await clickUndo()
    expect(ta.value).toBe('ab')
    await clickUndo()
    expect(ta.value).toBe('')
    expect(onHistoryWrite).toHaveBeenCalledTimes(2)
    await clickRedo()
    expect(ta.value).toBe('ab')
    await clickRedo()
    expect(ta.value).toBe('abXYZ')
  })

  it('粘贴后未变更的打标不误判下一次真实键入（空粘贴后普通输入仍并入/开单元）', async () => {
    renderEditor()
    const ta = textarea()
    act(() => {
      ta.dispatchEvent(new Event('paste', { bubbles: true }))
    })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0)
    })
    typeInto(ta, 'a')
    typeInto(ta, 'ab')
    await idle()
    await clickUndo()
    // 普通连续键入合并为一个单元（若被误判为粘贴：'a' 先独立闭合→首步回 'a'）
    expect(ta.value).toBe('')
  })
})

describe('B4-A R1 §3 文本单元语义 —— blur / flush-then-undo / 非输入回显', () => {
  it('blur：同步关闭当前单元后立即落库（不等 1.5s）；重复 blur 不双提交', async () => {
    const { onAutosave, onHistoryWrite } = renderEditor()
    const ta = textarea()
    typeInto(ta, 'x')
    expect(onAutosave).not.toHaveBeenCalled()
    act(() => {
      ta.blur()
    })
    await settle()
    // 零计时推进即派发（关闭单元→立即 flush）
    expect(onAutosave).toHaveBeenCalledTimes(1)
    expect(onAutosave).toHaveBeenCalledWith('x')
    // 单元已提交：一步 undo 可回初值
    await clickUndo()
    expect(ta.value).toBe('')
    expect(onHistoryWrite).toHaveBeenCalledTimes(1)
    // 再次 blur：无新单元、值已落库——零写零提交
    act(() => {
      ta.blur()
    })
    await settle()
    await idle()
    expect(onAutosave).toHaveBeenCalledTimes(1)
  })

  it('flush-then-undo：在途写未落定前零反向写；落定后调用序=在途值→反向值', async () => {
    const d1 = deferred<boolean>()
    const onAutosave = vi.fn(() => d1.promise)
    const { onHistoryWrite } = renderEditor({ annotation: makeAnnotation('orig'), onAutosave })
    const ta = textarea()
    typeInto(ta, 'x')
    await idle()
    expect(onAutosave).toHaveBeenCalledTimes(1)
    act(() => {
      undoBtn().click()
    })
    await settle()
    // drain 未完成：值不动、反向写零发
    expect(ta.value).toBe('x')
    expect(onHistoryWrite).not.toHaveBeenCalled()
    await act(async () => {
      d1.resolve(true)
      await settle()
    })
    expect(ta.value).toBe('orig')
    expect(onAutosave).toHaveBeenCalledTimes(1)
    expect(onHistoryWrite).toHaveBeenCalledWith('orig')
  })

  it('反向写在途窗内新输入：显示值保留，打开单元基线改指反向值（§2.5 #16b）', async () => {
    const d = deferred<boolean>()
    const onHistoryWrite = vi.fn((_comment: string) => d.promise)
    renderEditor({ annotation: makeAnnotation('orig'), onHistoryWriteRaw: onHistoryWrite })
    const ta = textarea()
    typeInto(ta, 'x')
    await idle()
    act(() => {
      undoBtn().click()
    })
    await settle()
    // 反向写挂起窗内用户继续输入
    typeInto(ta, 'y')
    await act(async () => {
      d.resolve(true)
      await settle()
    })
    // 显示值不被回执覆盖；新值未落库（dirty）
    expect(ta.value).toBe('y')
    // 新单元基线=反向值 orig：本单元一步 undo 回 orig（不是已被撤销的 x）
    act(() => {
      ta.blur()
    })
    await settle()
    await clickUndo()
    expect(ta.value).toBe('orig')
  })

  it('文本反向写失败：两栈不动（undo 仍可点、redo 不出现）、值不变；恢复后重试成功', async () => {
    let fail = false
    const onHistoryWrite = vi.fn(() => Promise.resolve(!fail))
    renderEditor({ onHistoryWriteRaw: onHistoryWrite })
    const ta = textarea()
    for (const v of ['a', 'ab']) {
      typeInto(ta, v)
      await idle()
    }
    await clickUndo()
    expect(ta.value).toBe('a')
    fail = true // 下一发反向写失败
    await clickUndo()
    // 失败：值不动；past 顶仍在（undo 可点）；future 不新增（redo 仍只指向 'ab'）
    expect(onHistoryWrite).toHaveBeenLastCalledWith('')
    expect(ta.value).toBe('a')
    expect(undoBtn().disabled).toBe(false)
    expect(redoBtn().disabled).toBe(false)
    fail = false
    await clickUndo()
    expect(ta.value).toBe('')
    expect(undoBtn().disabled).toBe(true)
    // 失败轮未在 future 留下重复项：重做两步回到 'ab' 后 redo 耗尽
    await clickRedo()
    expect(ta.value).toBe('a')
    await clickRedo()
    expect(ta.value).toBe('ab')
    expect(redoBtn().disabled).toBe(true)
  })

  it('非输入回显/idle-flush 不开新历史单元、不清 redo', async () => {
    const { onAutosave } = renderEditor()
    const ta = textarea()
    typeInto(ta, 'a')
    await idle()
    await clickUndo()
    expect(ta.value).toBe('')
    expect(redoBtn().disabled).toBe(false)
    // 多轮空闲（idle-flush 信号）与落库回显：redo 仍在场
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3 * IDLE_FLUSH_MS)
    })
    expect(onAutosave).toHaveBeenCalledTimes(1)
    expect(redoBtn().disabled).toBe(false)
    await clickRedo()
    expect(ta.value).toBe('a')
  })

  it('canRedo 投影：存在未提交新输入时 false；future 的真正销毁时点=该单元提交', async () => {
    renderEditor()
    const ta = textarea()
    typeInto(ta, 'a')
    await idle()
    await clickUndo()
    expect(redoBtn().disabled).toBe(false)
    // 新输入打开单元：redo 投影立即 false
    typeInto(ta, 'b')
    expect(redoBtn().disabled).toBe(true)
    // 提交前 undo：先关闭当前单元（提交——旧分支 future 'a' 销毁）再撤该单元，
    // 一步回单元 before；此刻可重做的是新单元（'b'），不是已被新输入取代的 'a'
    await clickUndo()
    expect(ta.value).toBe('')
    expect(redoBtn().disabled).toBe(false)
    await clickRedo()
    expect(ta.value).toBe('b')
  })

  it('canUndo 投影：栈空但有未提交有效输入时可点——一步撤回当前输入段', async () => {
    renderEditor()
    const ta = textarea()
    expect(undoBtn().disabled).toBe(true)
    typeInto(ta, 'a')
    expect(undoBtn().disabled).toBe(false)
    await clickUndo()
    expect(ta.value).toBe('')
    expect(undoBtn().disabled).toBe(true)
  })
})

describe('B4-A R1 §3 操作层代际失效 —— 文本 target 的 contentGeneration', () => {
  it('操作层恢复旧文后：编辑器采用恢复值，旧文本 past/future 失效（undo/redo 禁用）', async () => {
    renderEditor()
    const ta = textarea()
    typeInto(ta, 'a')
    await idle()
    typeInto(ta, 'ab')
    await idle()
    await clickUndo()
    expect(redoBtn().disabled).toBe(false)
    // 操作层 undo 成功恢复 annotation（携带已落库值）→代际递增
    act(() => {
      bumpTextGeneration(TARGET, '恢复值')
    })
    expect(ta.value).toBe('恢复值')
    expect(undoBtn().disabled).toBe(true)
    expect(redoBtn().disabled).toBe(true)
    // 定稿后的新输入开启新分支
    typeInto(ta, '恢复值2')
    await idle()
    await clickUndo()
    expect(ta.value).toBe('恢复值')
    expect(undoBtn().disabled).toBe(true)
  })

  it('代际失效丢弃在途打开单元（旧分支的未提交输入不成历史项）', async () => {
    renderEditor()
    const ta = textarea()
    typeInto(ta, 'a')
    await idle()
    // 未提交的新输入（打开单元）期间操作层恢复旧文
    typeInto(ta, 'abc')
    act(() => {
      bumpTextGeneration(TARGET, '恢复值')
    })
    expect(ta.value).toBe('恢复值')
    expect(undoBtn().disabled).toBe(true)
    // 定稿后的新输入开启新分支；旧分支 'abc' 不得在其后被提交成项——否则此处可再撤
    typeInto(ta, '恢复值X')
    await idle()
    await clickUndo()
    expect(ta.value).toBe('恢复值')
    expect(undoBtn().disabled).toBe(true)
  })

  it('注册表条目生命周期：有历史的 target 驻留跨视图；无历史的订阅随卸载出表', async () => {
    renderEditor()
    typeInto(textarea(), 'a')
    await idle()
    expect(textTargetSize()).toBe(1)
    act(() => {
      root?.unmount()
    })
    root = null
    // 历史驻留注册表（跨视图驻留——不随组件卸载焚毁）
    expect(textTargetSize()).toBe(1)
    root = createRoot(host!)
    renderEditor({ annotation: { ...makeAnnotation(), id: 'anno-empty' } })
    expect(textTargetSize()).toBe(2)
    act(() => {
      root?.unmount()
    })
    root = null
    // 从未提交的 target：末位订阅者退订即出表
    expect(textTargetSize()).toBe(1)
  })
})
