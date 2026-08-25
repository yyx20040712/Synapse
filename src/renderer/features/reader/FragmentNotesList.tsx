/**
 * FragmentNotesList —— 片段层列表（α 双层的片段面，纯展示+回调）。
 *
 * 排序=sortByDocumentOrder（C-01 单源——INV-24 消费方）；每条=kind 色点+
 * 引文摘要+批注摘要+1 基页码；单击条目→onLocate(annotation.id)（定位语义归
 * C-05 锚点定位服务，本组件只上抛）；highlightAnnotationId 条目高亮+
 * scrollIntoView（标注单击反向同步的消费面，C-05 信号位驱动）。
 */
import { useEffect, useMemo, useRef } from 'react'
import type { Annotation } from '@shared/models/annotation'
import { sortByDocumentOrder } from '@shared/annotation-order'
import { COLOR_SWATCH } from './annotation-style'

/** 引文/批注摘要截断（显示策略） */
const EXCERPT_MAX = 60

function excerpt(s: string): string {
  const oneLine = s.replace(/\r?\n/g, ' ')
  return oneLine.length > EXCERPT_MAX ? `${oneLine.slice(0, EXCERPT_MAX)}…` : oneLine
}

const KIND_LABEL: Record<Annotation['kind'], string> = {
  highlight: '高亮',
  underline: '下划线',
  note: '备注'
}

export function FragmentNotesList(props: {
  annotations: Annotation[]
  onLocate(annotationId: string): void
  highlightAnnotationId?: string | null
}): JSX.Element {
  const { annotations, onLocate, highlightAnnotationId } = props
  const sorted = useMemo(() => sortByDocumentOrder(annotations), [annotations])
  const highlightRef = useRef<HTMLLIElement | null>(null)

  // 高亮条目滚动进视野（仅随 highlightAnnotationId 信号变化触发——sorted 新引用
  // 不重滚，防干扰用户滚动；scrollIntoView jsdom 无实现由测试桩）
  useEffect(() => {
    if (highlightAnnotationId != null && highlightRef.current !== null) {
      highlightRef.current.scrollIntoView({ block: 'nearest' })
    }
  }, [highlightAnnotationId])

  if (sorted.length === 0) {
    return (
      <p className="p-2 text-xs" style={{ color: 'var(--text-dim)' }}>
        在正文中划选即可添加片段笔记
      </p>
    )
  }

  return (
    <ul className="m-0 flex list-none flex-col gap-1 p-0" data-testid="fragment-list">
      {sorted.map((a) => {
        const highlighted = a.id === highlightAnnotationId
        return (
          <li key={a.id} ref={highlighted ? highlightRef : undefined} data-fragment-id={a.id} data-highlight={highlighted}>
            <button
              type="button"
              className="block w-full rounded border px-2 py-1 text-left text-xs"
              style={{
                borderColor: highlighted ? 'var(--accent)' : 'var(--border)',
                background: highlighted ? 'var(--accent-soft)' : 'transparent'
              }}
              onClick={() => onLocate(a.id)}
              title={a.comment !== '' ? a.comment : a.quoteText}
            >
              <span className="flex items-center gap-1">
                <span
                  aria-hidden
                  className="inline-block h-2 w-2 shrink-0 rounded-sm"
                  style={{ background: COLOR_SWATCH[a.color] }}
                />
                <span style={{ color: 'var(--text-dim)' }}>{`p.${a.page + 1} · ${KIND_LABEL[a.kind]}`}</span>
              </span>
              <span className="mt-0.5 block truncate" style={{ color: 'var(--text)' }}>
                {excerpt(a.quoteText)}
              </span>
              {a.comment !== '' && (
                <span className="mt-0.5 block truncate" style={{ color: 'var(--text-dim)' }}>
                  {excerpt(a.comment)}
                </span>
              )}
            </button>
          </li>
        )
      })}
    </ul>
  )
}
