/**
 * [SR-RDR-08] OutlinePanel —— 目录/缩略图侧栏（工单：done / weak）
 *
 * ── 行为层 ──
 * - Tab1 目录：pdf.getOutline() 树形列表；点击跳页（resolve 目的地页码）；
 *   无目录显示"本文档无书签目录"
 * - Tab2 缩略图：当前页 ±10 页的 canvas 小图（scale 0.2，懒渲染 IntersectionObserver）
 *
 * ── 接口层 ──
 * - export function OutlinePanel(props: { pdfDoc: unknown;
 *     currentPage: number; onNavigate(page: number): void }): JSX.Element
 *
 * ── 架构层 ── / ── 生命周期层 ── / ── 文化层 ──
 * - pdfDoc 以 getDocument 句柄传入（类型 unknown，内部窄化为 pdfjs 类型）；
 *   pdfjs-dist 仅类型导入——运行时调用全走句柄自身方法，不引入运行时依赖面
 *   （渲染 API 唯一入口仍是 PdfCanvas）；句柄生命周期归 PdfCanvas（换文档即销毁），
 *   本组件在途请求失败一律静默降级（目录/缩略图缺席不影响主阅读）
 */
import { useEffect, useState } from 'react'
import type { PDFDocumentProxy } from 'pdfjs-dist'
import { Thumbnail } from './OutlineThumb'

/** 目录树节点（pdfjs OutlineItem 结构子集） */
interface OutlineNode {
  title: string
  dest: unknown
  items: OutlineNode[]
}

/** 缩略图窗口（规约：当前页 ±10）；渲染比例与子组件在 OutlineThumb */
const THUMB_WINDOW = 10

/** 句柄窄化：只认具备目录/页面/目的地解析能力的真文档（null/销毁句柄不进） */
function isPdfDoc(v: unknown): v is PDFDocumentProxy {
  const d = v as
    | {
        getOutline?: unknown
        getPage?: unknown
        getDestination?: unknown
        getPageIndex?: unknown
        numPages?: unknown
      }
    | null
  return (
    d !== null &&
    typeof d.getOutline === 'function' &&
    typeof d.getPage === 'function' &&
    typeof d.getDestination === 'function' &&
    typeof d.getPageIndex === 'function' &&
    typeof d.numPages === 'number'
  )
}

export function OutlinePanel(props: {
  pdfDoc: unknown
  currentPage: number
  onNavigate: (page: number) => void
}): JSX.Element {
  const { pdfDoc, currentPage, onNavigate } = props
  const [tab, setTab] = useState<'outline' | 'thumbs'>('outline')
  const [outline, setOutline] = useState<OutlineNode[] | null>(null)
  const [loading, setLoading] = useState(false)

  // 目录随文档加载一次；句柄为空/销毁时清空（换文档由 ReaderPage 置 null 触发）
  useEffect(() => {
    if (!isPdfDoc(pdfDoc)) {
      setOutline(null)
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    pdfDoc
      .getOutline()
      .then((items) => {
        if (cancelled) {
          return
        }
        setOutline(items === null ? null : (items as unknown as OutlineNode[]))
        setLoading(false)
      })
      .catch(() => {
        if (!cancelled) {
          setOutline(null)
          setLoading(false)
        }
      })
    return () => {
      cancelled = true
    }
  }, [pdfDoc])

  /** 目的地解析：命名目的地先查表；数组首元素是页引用（getPageIndex，0 基）或页号 */
  const goToDest = async (dest: unknown): Promise<void> => {
    if (!isPdfDoc(pdfDoc)) {
      return
    }
    try {
      const explicit = typeof dest === 'string' ? await pdfDoc.getDestination(dest) : dest
      if (!Array.isArray(explicit) || explicit.length === 0) {
        return
      }
      const head = explicit[0]
      if (typeof head === 'number') {
        onNavigate(head)
        return
      }
      if (typeof head === 'object' && head !== null) {
        const ref = head as Parameters<PDFDocumentProxy['getPageIndex']>[0]
        onNavigate(await pdfDoc.getPageIndex(ref))
      }
    } catch {
      // 目的地失效（文档版本差异等）：不跳转即可
    }
  }

  const renderNodes = (nodes: OutlineNode[], depth: number): JSX.Element => (
    <ul className="m-0 list-none p-0" style={{ paddingLeft: depth > 0 ? '12px' : undefined }}>
      {nodes.map((node, i) => (
        <li key={`${depth}-${i}`}>
          <button
            type="button"
            className="block w-full truncate rounded px-1 py-0.5 text-left text-xs hover:underline"
            style={{ color: 'var(--text)' }}
            title={node.title}
            onClick={() => void goToDest(node.dest)}
          >
            {node.title === '' ? `（条目 ${i + 1}）` : node.title}
          </button>
          {node.items.length > 0 && renderNodes(node.items, depth + 1)}
        </li>
      ))}
    </ul>
  )

  const numPages = isPdfDoc(pdfDoc) ? pdfDoc.numPages : 0
  const from = Math.max(0, currentPage - THUMB_WINDOW)
  const to = Math.min(numPages - 1, currentPage + THUMB_WINDOW)
  const thumbIndices =
    numPages > 0 && to >= from
      ? Array.from({ length: to - from + 1 }, (_, i) => from + i)
      : []

  return (
    <div className="flex h-full flex-col text-sm">
      <div className="flex shrink-0 border-b" style={{ borderColor: 'var(--border)' }} role="tablist">
        {(['outline', 'thumbs'] as const).map((id) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            className="flex-1 px-2 py-1 text-xs"
            style={
              tab === id
                ? { color: 'var(--accent)', fontWeight: 500, borderBottom: '2px solid var(--accent)' }
                : { color: 'var(--text-dim)' }
            }
            onClick={() => setTab(id)}
          >
            {id === 'outline' ? '目录' : '缩略图'}
          </button>
        ))}
      </div>
      <div className="min-h-0 flex-1 overflow-auto p-1">
        {tab === 'outline' ? (
          loading ? (
            <p className="p-2 text-xs" style={{ color: 'var(--text-dim)' }}>
              正在读取目录…
            </p>
          ) : outline === null || outline.length === 0 ? (
            <p className="p-2 text-xs" style={{ color: 'var(--text-dim)' }}>
              本文档无书签目录
            </p>
          ) : (
            renderNodes(outline, 0)
          )
        ) : numPages === 0 ? (
          <p className="p-2 text-xs" style={{ color: 'var(--text-dim)' }}>
            文档未打开
          </p>
        ) : (
          <div className="flex flex-col gap-1">
            {thumbIndices.map((idx) =>
              isPdfDoc(pdfDoc) ? (
                <Thumbnail
                  key={idx}
                  doc={pdfDoc}
                  pageIndex={idx}
                  active={idx === currentPage}
                  onNavigate={onNavigate}
                />
              ) : null
            )}
          </div>
        )}
      </div>
    </div>
  )
}
