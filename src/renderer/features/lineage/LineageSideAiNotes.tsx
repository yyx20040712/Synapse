// b3: P7-H
/**
 * LineageSideAiNotes —— 侧板 AI 评估与建议分节（LG-04 交付件→[F-UIRES-03 B2]
 * 「四删三立」更名：原 AI 节名退役+**双击链退役**（条目纯展示——B2 后
 * 全应用唯一保留双击链=片段条目；B2 后置占位章随本真节替代消亡）；文件名/
 * 组件名/testid 不变；ai_notes 留库直读——INV-101 域不变+INV-105 显示面唯一
 * （阅读器左栏 AI 区+页内 AI 高亮层整删——本节=AI 评估语料渲染显示面唯一）。
 *
 * 行为：选中节点 paperId 驱动惰性取数（ai_sensor.listByPaper——W4 直连
 * window.api 预裁）；loading/error+重试/空态/分节呈现。question 分组（组头=
 * 「第N问：原始命题」——QUESTION_LABEL：QUESTION_TEXT 拼接，2026-08-28 复测
 * 三问题 P2 组头对号，divergence 无原文保持短标签+QUESTION_COLOR 左缘色条）
 * ×组内条目按 role 分段标注（一审/二审/裁决——呈现轴转置 2026-08-28 缺陷 F）
 * =**ai-note-style 单源跨域只读消费**（check-quality COMPOSITION_ROOT_ALLOW
 * 受控例外——标签/分色映射禁本域复写，接缝双向锚定：本行+ai-note-style 头注）；
 * 分组逻辑本域自持（Rule of Three 保持——条目保留 data-ai-note-id 属性
 * 〔e2e/单测既有锚〕，无点击交互）。
 * stale 守卫：请求序号（选中节点切换后晚到旧响应丢弃——anchor-locate
 * locateSeq 同族思想，票面 N7 校准字面）。
 */
import { useEffect, useState } from 'react'
import { api, unwrap } from '../../api/client'
import { RetryButton } from '../../shared/ui/RetryButton'
import { AI_NOTE_QUESTIONS } from '@shared/models/ai-note'
import type { AiNote } from '@shared/models/ai-note'
import { QUESTION_COLOR, QUESTION_LABEL, QUESTION_TEXT, ROLE_LABEL, ROLE_ORDER } from '../reader/anchors/ai-note-style'

type Phase = 'loading' | 'ready' | 'error'

/**
 * R2-LG11 浅色化（浅色严谨板）：h4 accent 左缘条；条目卡=白底
 * （#ffffff+沿用淡描边 rgba(151,160,187,.28)）；文本系亮面 token
 * （--text/--text-dim）。**QUESTION_COLOR 组头左缘条与色块零改**
 * （AI-08 分色单源——分色不因换肤回退）；testid 零改（文案随 B2 节名改）。
 */
/** 条目卡（白底淡描边） */
const NOTE_CARD = {
  background: 'var(--panel)',
  borderColor: 'var(--note-border)'
} as const

export function LineageSideAiNotes(props: { paperId: string }): JSX.Element {
  const { paperId } = props
  const [notes, setNotes] = useState<AiNote[] | null>(null)
  const [phase, setPhase] = useState<Phase>('loading')
  const [message, setMessage] = useState('')
  /** 请求序号 stale 守卫 + 重试计数（retryTick 变化即重发） */
  const [retryTick, setRetryTick] = useState(0)

  useEffect(() => {
    let seq = 0
    setPhase('loading')
    unwrap(api.ai_sensor.listByPaper({ paperId }))
      .then((data) => {
        if (seq !== 0) return
        setNotes(data)
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
    <section data-testid="lineage-side-ai-notes" className="flex flex-col gap-1">
      <h4
        className="m-0 pl-1.5 font-medium"
        style={{ color: 'var(--text-dim)', borderLeft: '3px solid var(--accent)' }}
      >
        AI 评估与建议
      </h4>
      {phase === 'loading' && <p className="m-0" style={{ color: 'var(--text-dim)' }}>AI 评估加载中…</p>}
      {phase === 'error' && (
        <div
          role="alert"
          data-testid="lineage-side-ai-error"
          className="flex items-center gap-2 rounded border px-2 py-1"
          style={{ borderColor: 'var(--danger)', color: 'var(--danger)' }}
        >
          <span>AI 评估加载失败：{message}</span>
          {/* [F-UIRES-02 批 B R2] 文字重试钮→共享 RetryButton（data-action
              受锁锚透传） */}
          <RetryButton dataAction="retry" onClick={() => setRetryTick((t) => t + 1)} />
        </div>
      )}
      {phase === 'ready' &&
        (notes === null || notes.length === 0 ? (
          <p className="m-0" style={{ color: 'var(--text-dim)' }}>暂无 AI 评估与建议</p>
        ) : (
          AI_NOTE_QUESTIONS.filter((question) => notes.some((n) => n.question === question)).map(
            (question) => (
              <div key={question} data-question={question}>
                <h5
                  className="m-0 pl-1 font-medium"
                  style={{ borderLeft: `3px solid ${QUESTION_COLOR[question]}`, color: 'var(--text-dim)' }}
                >
                  {question === 'divergence'
                    ? QUESTION_LABEL[question]
                    : `${QUESTION_LABEL[question]}：${QUESTION_TEXT[question]}`}
                </h5>
                {notes
                  .filter((n) => n.question === question)
                  .sort((a, b) => ROLE_ORDER.indexOf(a.role) - ROLE_ORDER.indexOf(b.role))
                  .map((n) => (
                    <div
                      key={n.id}
                      data-ai-note-id={n.id}
                      className="mt-0.5 rounded border px-2 py-1"
                      style={NOTE_CARD}
                    >
                      <span className="flex items-center gap-1">
                        <span aria-hidden className="inline-block h-2 w-2 shrink-0 rounded-sm" style={{ background: QUESTION_COLOR[n.question] }} />
                        <span style={{ color: 'var(--text-dim)' }}>
                          {ROLE_LABEL[n.role]}
                          {n.anchorPage !== null ? ` · p.${n.anchorPage}` : ''}
                        </span>
                      </span>
                      {n.quoteText !== '' && (
                        <span className="mt-0.5 block truncate" style={{ color: 'var(--text-dim)' }}>{n.quoteText}</span>
                      )}
                      <span className="mt-0.5 block whitespace-pre-wrap" style={{ color: 'var(--text)' }}>{n.contentMd}</span>
                    </div>
                  ))}
              </div>
            )
          )
        ))}
    </section>
  )
}
