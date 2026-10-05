// b3: P7-H
/**
 * LineageSideFragments —— 侧板片段笔记分节（[F-UIRES-03 B2] 交付件，
 * LineageSidePanel 三节新序第②节；「四删三立」新立节）。
 *
 * 行为：选中节点 paperId 驱动惰性取数（api.reader.listAnnotations 直连
 * window.api——renderer→api 分层合法，LineageSideAiNotes 直连 ai_sensor 同型
 * 先例）；**全量 annotations 不按 kind/comment 过滤**（与阅读器 ReaderNotesPanel
 * 片段节同域同名同序——INV-101 域不变，数据留库直读零迁移）；排序=
 * sortByDocumentOrder（@shared/annotation-order 单源）。loading/error+重试
 * （role=alert+RetryButton，同型先例）/空态；stale 守卫=请求序号（LineageSideAiNotes
 * 模式——选中节点切换后晚到旧响应丢弃）。
 * 条目形态镜像 reader 域 FragmentNotesList（reader/panels 属 reader 域不可引
 * ——域红线；kind 色点=COLOR_SWATCH 自 reader/anchors/annotation-style 跨域
 * 受控例外〔check-quality COMPOSITION_ROOT_ALLOW——色点单源防双源，ai-note-style
 * 同型〕；KIND_LABEL/EXCERPT_MAX 本地复写——Rule of Three 第 2 次保持重复）；
 * 无空引文分支（annotation 锚字段必填=INV-102）。
 * 交互：**双击条目→跳阅读器**（onFragmentDblClick 上抛——B2 后全应用唯一保留
 * 双击链）；单击无操作（防误触——AI 节先例；Enter=键盘等价路径——可及性，
 * 与双击同一上抛单点，Space 不触发+e.repeat 不触发〔长按自动重复不连发〕）。
 */
import { useEffect, useState } from 'react'
import { api, unwrap } from '../../api/client'
import { RetryButton } from '../../shared/ui/RetryButton'
import type { Annotation } from '@shared/models/annotation'
import { sortByDocumentOrder } from '@shared/annotation-order'
import { COLOR_SWATCH } from '../reader/anchors/annotation-style'

type Phase = 'loading' | 'ready' | 'error'

/** 条目卡（白底淡描边——侧板三节同域视觉，LineageSideAiNotes 同款） */
const NOTE_CARD = {
  background: 'var(--panel)',
  borderColor: 'var(--note-border)'
} as const

/** 引文/批注摘要截断（显示策略——侧板本地值 60：Rule of Three 第 2 次保持
 *  复写〔reader 域 FragmentNotesList 同值 excerpt〕；异名声明避免同名跨文件
 *  假共享——dup-constants 机检口径，收敛点=第 3 处出现时抽 shared） */
const SIDE_EXCERPT_MAX = 60

function excerpt(s: string): string {
  const oneLine = s.replace(/\r?\n/g, ' ')
  return oneLine.length > SIDE_EXCERPT_MAX ? `${oneLine.slice(0, SIDE_EXCERPT_MAX)}…` : oneLine
}

/** kind 中文标签（Rule of Three 第 2 次保持复写——reader 域 FragmentNotesList
 *  同值；同名声明已在 dup-constants baseline） */
const KIND_LABEL: Record<Annotation['kind'], string> = {
  highlight: '高亮',
  underline: '下划线',
  note: '备注'
}

export function LineageSideFragments(props: {
  paperId: string
  onFragmentDblClick(a: Annotation): void
}): JSX.Element {
  const { paperId, onFragmentDblClick } = props
  const [annotations, setAnnotations] = useState<Annotation[] | null>(null)
  const [phase, setPhase] = useState<Phase>('loading')
  const [message, setMessage] = useState('')
  /** 请求序号 stale 守卫 + 重试计数（retryTick 变化即重发） */
  const [retryTick, setRetryTick] = useState(0)

  useEffect(() => {
    let seq = 0
    setPhase('loading')
    unwrap(api.reader.listAnnotations({ paperId }))
      .then((data) => {
        if (seq !== 0) return
        setAnnotations(data)
        setPhase('ready')
      })
      .catch((e: unknown) => {
        if (seq !== 0) return
        setMessage(e instanceof Error ? e.message : String(e))
        setPhase('error')
      })
    return () => {
      seq = 1
    }
  }, [paperId, retryTick])

  return (
    <section data-testid="lineage-side-fragments" className="flex flex-col gap-1">
      <h4
        className="m-0 pl-1.5 font-medium"
        style={{ color: 'var(--text-dim)', borderLeft: '3px solid var(--accent)' }}
      >
        片段笔记
      </h4>
      {phase === 'loading' && <p className="m-0" style={{ color: 'var(--text-dim)' }}>片段笔记加载中…</p>}
      {phase === 'error' && (
        <div
          role="alert"
          data-testid="lineage-side-fragments-error"
          className="flex items-center gap-2 rounded border px-2 py-1"
          style={{ borderColor: 'var(--danger)', color: 'var(--danger)' }}
        >
          <span>片段笔记加载失败：{message}</span>
          <RetryButton dataAction="retry" onClick={() => setRetryTick((t) => t + 1)} />
        </div>
      )}
      {phase === 'ready' &&
        (annotations === null || annotations.length === 0 ? (
          <p className="m-0" style={{ color: 'var(--text-dim)' }}>暂无片段笔记</p>
        ) : (
          <ul className="m-0 flex list-none flex-col gap-1 p-0">
            {sortByDocumentOrder(annotations).map((a) => (
              <li key={a.id} data-fragment-id={a.id}>
                <button
                  type="button"
                  className="block w-full rounded border px-2 py-1 text-left text-xs"
                  style={NOTE_CARD}
                  title={a.comment !== '' ? a.comment : a.quoteText}
                  onDoubleClick={() => onFragmentDblClick(a)}
                  onKeyDown={(e) => {
                    // Enter=键盘等价路径（可及性——与双击同一上抛单点；Space 不
                    // 触发+e.repeat 不触发——长按自动重复不连发跳转上抛）
                    if (e.key === 'Enter' && !e.repeat) onFragmentDblClick(a)
                  }}
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
            ))}
          </ul>
        ))}
    </section>
  )
}
