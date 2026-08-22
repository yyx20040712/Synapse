/**
 * [SR-RDR-06] AnnotationLayer —— 标注渲染与命中（工单：done / weak，依赖 annotation-anchor）
 *
 * ── 行为层 ──
 * - 按当前页过滤标注：rects 归一化坐标 → 绝对定位色块（颜色由 kind+color 决定，
 *   高亮/备注透明度 0.35，下划线为矩形下沿 2px 实条）
 * - 打开文档/翻页时对每条标注 verifyQuote 重定位（排版变化自愈，仅影响显示不回写
 *   库；失败则按存量 rects 显示）。pdf.js 文本层异步入 DOM，MutationObserver +
 *   requestAnimationFrame 合并重算
 * - 点击标注：弹批注编辑（AnnotationEditor，comment textarea，保存
 *   api.reader.updateAnnotation）；删除按钮 → confirm → api.reader.deleteAnnotation；
 *   成功后经 reader.store.updateAnnotation/removeAnnotation 同步本地数组并回调 onChanged
 * - sortKey 由仓储层生成（"页码:页内序号"），渲染按 props 顺序即可
 *
 * ── 接口层 ──
 * - export function AnnotationLayer(props: { annotations: Annotation[];
 *     page: number; pageRoot: HTMLElement | null; onChanged(): void }): JSX.Element | null
 *
 * ── 架构层 ──
 * - 重锚根是页根内 .textLayer 容器（与 SelectionLayer 同口径）；annotation-anchor
 *   是唯一 DOM 遍历点；api 调用 + store 三方法同步在本层，AnnotationEditor 纯展示
 * - 色块层 pointer-events:none 仅矩形可命中——点击标注即编辑，代价是矩形上方
 *   无法发起文本重选（v1 约束：从矩形外起选）
 *
 * ── 生命周期层 ── / ── 文化层 ──
 * - e2e：tests/e2e/reader-text.spec.ts 后半（选中→高亮→重开仍在原位）
 */
import { useEffect, useState } from 'react'
import type { CSSProperties } from 'react'
import type { Annotation, AnnotationColor, AnnotationKind, AnnotationRect } from '@shared/models/annotation'
import { api, unwrap, ApiClientError } from '../../api/client'
import { showToast } from '../../shared/ui/Toast'
import { findRangeAtOffset, verifyQuote } from './annotation-anchor'
import { AnnotationEditor } from './AnnotationEditor'
import { COLOR_SWATCH } from './annotation-style'
import { useReaderStore } from './reader.store'

/** 意外异常（非 ApiClientError）时的兜底中文消息 */
const UPDATE_FAILED = '标注保存失败'
const DELETE_FAILED = '标注删除失败'
const DELETE_CONFIRM = '删除这条标注？'

/** 重锚后的显示矩形（id → rects；缺项回退存量 rects） */
type ResolvedRects = Record<string, AnnotationRect[]>

/** kind+color+归一化矩形 → 色块样式（高亮/备注整块半透明，下划线为下沿实条） */
function rectStyle(kind: AnnotationKind, color: AnnotationColor, r: AnnotationRect): CSSProperties {
  const base: CSSProperties = {
    left: `${r.x * 100}%`,
    width: `${r.w * 100}%`,
    background: COLOR_SWATCH[color],
    pointerEvents: 'auto',
    cursor: 'pointer'
  }
  if (kind === 'underline') {
    return { ...base, top: `calc(${(r.y + r.h) * 100}% - 2px)`, height: '2px', opacity: 0.9 }
  }
  return { ...base, top: `${r.y * 100}%`, height: `${r.h * 100}%`, opacity: 0.35 }
}

/** 正在编辑的标注（连同命中矩形，供弹层定位） */
interface Editing {
  annotation: Annotation
  rect: AnnotationRect
}

export function AnnotationLayer(props: {
  annotations: Annotation[]
  page: number
  pageRoot: HTMLElement | null
  onChanged: () => void
}): JSX.Element | null {
  const { annotations, page, pageRoot, onChanged } = props
  const [resolved, setResolved] = useState<ResolvedRects>({})
  const [editing, setEditing] = useState<Editing | null>(null)
  const [busy, setBusy] = useState(false)

  const pageAnnotations = annotations.filter((a) => a.page === page)

  // 文本层就绪后重锚：verifyQuote 校正偏移（自愈排版漂移）→ findRangeAtOffset 重算
  // rects；任一步失败回退存量 rects。仅显示层重锚，不回写库（避免每次打开放大写量）
  useEffect(() => {
    if (pageRoot === null) {
      return
    }
    const textLayer = pageRoot.querySelector('.textLayer') as HTMLElement | null
    if (textLayer === null) {
      return
    }
    let scheduled = false
    const resolve = (): void => {
      scheduled = false
      const next: ResolvedRects = {}
      for (const a of annotations) {
        if (a.page !== page || a.quoteText.length === 0) {
          continue
        }
        const at = verifyQuote(textLayer, {
          prefix: a.prefixText,
          quote: a.quoteText,
          suffix: a.suffixText,
          start: a.startOffset
        })
        if (at !== null) {
          const range = findRangeAtOffset(textLayer, at, at + a.quoteText.length)
          if (range !== null && range.rects.length > 0) {
            next[a.id] = range.rects
          }
        }
      }
      setResolved(next)
    }
    // 文本层 span 逐个入 DOM（pdf.js render() 异步）：rAF 合并成每帧一次
    const schedule = (): void => {
      if (!scheduled) {
        scheduled = true
        requestAnimationFrame(resolve)
      }
    }
    resolve()
    const observer = new MutationObserver(schedule)
    observer.observe(textLayer, { childList: true, subtree: true })
    return () => observer.disconnect()
  }, [annotations, page, pageRoot])

  /** 批注保存：api 成功 → store 同步 → 收起弹层 → onChanged 通知 */
  async function saveComment(a: Annotation, comment: string): Promise<void> {
    if (busy) {
      return
    }
    setBusy(true)
    try {
      const next: Annotation = { ...a, comment, updatedAt: new Date().toISOString() }
      const saved = await unwrap(api.reader.updateAnnotation({ annotation: next }))
      useReaderStore.getState().updateAnnotation(saved)
      setEditing(null)
      onChanged()
    } catch (e) {
      showToast(e instanceof ApiClientError ? e.message : UPDATE_FAILED, 'error')
    } finally {
      setBusy(false)
    }
  }

  /** 删除：confirm 确认 → api → store 同步 → 收起 → onChanged 通知 */
  async function deleteAnnotation(a: Annotation): Promise<void> {
    if (busy || !window.confirm(DELETE_CONFIRM)) {
      return
    }
    setBusy(true)
    try {
      await unwrap(api.reader.deleteAnnotation({ annotationId: a.id }))
      useReaderStore.getState().removeAnnotation(a.id)
      setEditing(null)
      onChanged()
    } catch (e) {
      showToast(e instanceof ApiClientError ? e.message : DELETE_FAILED, 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <div className="absolute inset-0" style={{ zIndex: 5, pointerEvents: 'none' }}>
        {pageAnnotations.map((a) =>
          (resolved[a.id] ?? a.rects).map((r, i) => (
            <div
              key={`${a.id}:${i}`}
              data-testid="annotation-rect"
              role="button"
              aria-label={`标注：${a.quoteText}`}
              title={a.comment !== '' ? a.comment : a.quoteText}
              className="absolute"
              style={rectStyle(a.kind, a.color, r)}
              onClick={() => setEditing({ annotation: a, rect: r })}
            />
          ))
        )}
      </div>
      {editing !== null && (
        <AnnotationEditor
          key={editing.annotation.id}
          annotation={editing.annotation}
          rect={editing.rect}
          busy={busy}
          onCancel={() => setEditing(null)}
          onSave={(comment) => void saveComment(editing.annotation, comment)}
          onDelete={() => void deleteAnnotation(editing.annotation)}
        />
      )}
    </>
  )
}
