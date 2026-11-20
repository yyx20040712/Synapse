/**
 * [B3] DrCitation —— 引用分节（三格式分段钮+预览文本+复制引用钮；两宿主
 * 共用：PaperDetailPanel「引用」节 / LineageSidePanel 信息区后分节）。
 *
 * ── 行为层 ──
 * - 格式分段钮三枚：GB/T 7714（默认）/APA/BibTeX——aria-pressed 受控；
 *   格式选择=会话级模块偏好（见 preferredFormat——宿主换篇卸载不丢、跨两
 *   面板驻留、不持久化）
 * - 预览文本：api.export_.citation({format,paperId}) 加载（序列化单源在
 *   main——renderer 零格式化逻辑）；paperId/format 变化重载（迟到回包 seq
 *   守卫丢弃）；加载态「正在生成引用…」；失败态错误文案+重试钮
 * - 复制引用：navigator.clipboard.writeText(当前展示文本)——预览文本已在
 *   renderer，直接写（与 export/clipboard 通道「内容不过 renderer」的差异：
 *   该通道服务批量导出，本件服务已展示文本的单条复制）；成功 toast
 *   「引用已复制」/失败「复制到剪贴板失败」（库域动作型文案沿承）
 *
 * ── 接口层 ──
 * - export function DrCitation(props: { paperId: string }): JSX.Element
 *   （零宿主依赖——节头由宿主按各自语汇承载：库域 .lib-dr-sec/脉络域 h4）
 *
 * ── 架构层 ──
 * - library feature；lineage 侧板消费经 check-quality 白名单受控例外
 *  （LineageSideFragments→reader 同型先例——共用件单源防两域各拼一份）
 *
 * ── 生命周期层 ── / ── 文化层 ──
 * - 测试：tests/unit/renderer/dr-citation.test.tsx（加载/切格式/复制/失败/
 *   重载）+paper-detail-drawer.test.tsx（库域分节在场）
 */
import { useEffect, useState } from 'react'
import type { CitationFormat } from '@shared/ipc/schemas'
import { api, unwrap, ApiClientError } from '../../api/client'
import { showToast } from '../../shared/ui/Toast'
import { RetryButton } from '../../shared/ui/RetryButton'
import { CLIP_FAILED, OP_FAILED } from '../../shared/ui-constants'

const FORMATS: Array<{ id: CitationFormat; label: string }> = [
  { id: 'gbt7714', label: 'GB/T 7714' },
  { id: 'apa', label: 'APA' },
  { id: 'bibtex', label: 'BibTeX' }
]

type Phase =
  | { kind: 'loading' }
  | { kind: 'ready'; text: string }
  | { kind: 'error'; message: string }

/** 会话级格式偏好（模块级变量）：PaperDetailPanel 换篇加载期会整体卸载本件
 *  （stale 守卫 detail=null 提前返回），组件态即丢偏好——[B3 审查回炉 B-1]；
 * 会话内跨文献/跨两面板驻留，不写持久化（重开应用回默认 GB/T 7714） */
let preferredFormat: CitationFormat = 'gbt7714'

export function DrCitation(props: { paperId: string }): JSX.Element {
  const { paperId } = props
  const [format, setFormat] = useState<CitationFormat>(preferredFormat)
  const [phase, setPhase] = useState<Phase>({ kind: 'loading' })
  const [retryTick, setRetryTick] = useState(0)

  // 加载：paperId/format/重试变化触发；迟到回包 seq 守卫丢弃（切文献竞态）
  useEffect(() => {
    let seq = 0
    setPhase({ kind: 'loading' })
    unwrap(api.export_.citation({ format, paperId }))
      .then((r) => {
        if (seq === 0) setPhase({ kind: 'ready', text: r.text })
      })
      .catch((e: unknown) => {
        if (seq !== 0) return
        setPhase({
          kind: 'error',
          message: e instanceof ApiClientError ? e.message : OP_FAILED
        })
      })
    return () => {
      seq = 1
    }
  }, [paperId, format, retryTick])

  /** 复制当前展示文本（renderer 侧写——见头注与 clipboard 通道的分工） */
  const copyCitation = (text: string): void => {
    void navigator.clipboard
      .writeText(text)
      .then(() => showToast('引用已复制', 'success'))
      .catch(() => showToast(CLIP_FAILED, 'error'))
  }

  return (
    <div data-testid="dr-citation" className="lib-dr-citation flex flex-col gap-1.5">
      <div className="flex items-center gap-1" role="group" aria-label="引用格式">
        {FORMATS.map((f) => (
          <button
            key={f.id}
            type="button"
            aria-pressed={format === f.id}
            title={f.label}
            className="lib-dr-cit-fmt rounded border px-1.5 py-0.5"
            style={{
              borderColor: format === f.id ? 'var(--accent)' : 'var(--border)',
              color: format === f.id ? 'var(--accent)' : 'var(--text-dim)'
            }}
            onClick={() => {
              preferredFormat = f.id
              setFormat(f.id)
            }}
          >
            {f.label}
          </button>
        ))}
      </div>
      {phase.kind === 'loading' && (
        <p className="m-0 text-xs" style={{ color: 'var(--text-dim)' }}>
          正在生成引用…
        </p>
      )}
      {phase.kind === 'error' && (
        <div
          role="alert"
          className="flex items-center gap-2 rounded border px-2 py-1 text-xs"
          style={{ borderColor: 'var(--danger)', color: 'var(--danger)' }}
        >
          <span>{`生成引用失败：${phase.message}`}</span>
          <RetryButton testId="citation-retry" onClick={() => setRetryTick((t) => t + 1)} />
        </div>
      )}
      {phase.kind === 'ready' && (
        <>
          {/* 预览文本：等宽可换行（BibTeX 多行——pre-wrap 保留换行） */}
          <p
            data-testid="citation-text"
            className="m-0 whitespace-pre-wrap break-words rounded border px-2 py-1.5 font-mono text-xs"
            style={{ borderColor: 'var(--border)', background: 'var(--panel)' }}
          >
            {phase.text}
          </p>
          <button
            type="button"
            className="lib-dr-cit-copy self-start rounded border px-2 py-0.5 text-xs"
            style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
            onClick={() => copyCitation(phase.text)}
          >
            复制引用
          </button>
        </>
      )}
    </div>
  )
}
