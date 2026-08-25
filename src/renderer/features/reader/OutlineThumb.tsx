/**
 * 单页缩略图（目录/缩略图侧栏的子组件，无独立工单）：进入视口才渲染一次，
 * 卸载取消在途任务。渲染调用全走句柄方法，不引入 pdfjs 运行时依赖。
 */
import { useEffect, useRef } from 'react'
import type { PDFDocumentProxy, RenderTask } from './PdfCanvas'

/** 缩略图渲染比例（规约：scale 0.2） */
export const THUMB_SCALE = 0.2

export function Thumbnail(props: {
  doc: PDFDocumentProxy
  pageIndex: number
  active: boolean
  onNavigate: (p: number) => void
}): JSX.Element {
  const { doc, pageIndex, active } = props
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const renderedRef = useRef(false)
  const taskRef = useRef<RenderTask | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (canvas === null) {
      return
    }
    const render = async (): Promise<void> => {
      if (renderedRef.current) {
        return
      }
      renderedRef.current = true
      try {
        const page = await doc.getPage(pageIndex + 1)
        const ctx = canvas.getContext('2d')
        if (ctx === null) {
          return
        }
        const viewport = page.getViewport({ scale: THUMB_SCALE })
        canvas.width = Math.floor(viewport.width)
        canvas.height = Math.floor(viewport.height)
        const task = page.render({ canvasContext: ctx, viewport })
        taskRef.current = task
        await task.promise
      } catch {
        // 句柄销毁/渲染取消：留白即可，重渲染由 doc 变化重挂载驱动
      }
    }
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        observer.disconnect()
        void render()
      }
    })
    observer.observe(canvas)
    return () => {
      observer.disconnect()
      taskRef.current?.cancel()
    }
  }, [doc, pageIndex])

  return (
    <button
      type="button"
      className="flex w-full flex-col items-center gap-0.5 rounded border p-1"
      style={{
        borderColor: active ? 'var(--accent)' : 'var(--border)',
        background: active ? 'var(--accent-soft)' : 'var(--panel)'
      }}
      onClick={() => props.onNavigate(pageIndex)}
    >
      <canvas ref={canvasRef} aria-label={`第 ${pageIndex + 1} 页缩略图`} />
      <span className="text-xs" style={{ color: 'var(--text-dim)' }}>
        {pageIndex + 1}
      </span>
    </button>
  )
}
