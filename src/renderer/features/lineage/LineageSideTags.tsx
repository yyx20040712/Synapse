// b3: P7-H
/**
 * [F-LG14] LineageSideTags —— 侧板标签编辑分节（LineageSidePanel 拆件——
 * 组件行数红线落点）。
 *
 * 行为：既有标签小片渲染（行内 × 移除）+输入添加（Enter/失焦/＋按钮三路
 * [F-UIRES-02 R8]——TagEditor 丙类范式对齐：失焦提交经组词守卫+序 B 补提交
 * [shared/inline-keys 单源]、Esc=清空、＋钮 mousedown preventDefault 防点击
 * 夺焦双发）；同名添加短路（同节点去重第一道 UX 防——第二道=main repo 写
 * 边界单源）；增删即时持久化=整组上抛 onSetTags（Page 编排→lineage.store
 * .setNodeTags→既有 upsert-node 通道）；空串不派发（draft 协议 min(1) 同源
 * 口径——失焦/序 B 路同守）；名取 DOM 当前值（序 B 下 state 滞后——
 * INV-85⑥ 同型）。
 */
import { useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import type { LineageNode } from '@shared/models/lineage'
import { TAG_NAME_MAX } from '@shared/models/tag'
import { ICON_PLUS, ICON_X } from '../../shared/icons'
import { inlineKeyDown, useComposingCommit } from '../../shared/inline-keys'

/** 标签小片样式（红示意：红字小片——用户图7「红小块」） */
const SIDE_TAG_CHIP: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  borderRadius: 3,
  fontSize: 'var(--fs-caption)',
  color: 'var(--danger)',
  background: 'var(--danger-a08)',
  border: '1px solid var(--danger-a25)'
}

export function LineageSideTags(props: {
  node: LineageNode
  onSetTags(nodeId: string, tags: string[]): void
}): JSX.Element {
  const { node } = props
  const [tagInput, setTagInput] = useState('')
  const tags = node.tags ?? []
  // [F-UIRES-02 R8] 组词守卫+序 B 补提交（shared/inline-keys 单源）
  const inputRef = useRef<HTMLInputElement | null>(null)
  const composing = useComposingCommit(inputRef, addTag)

  /** 三路共用添加：名取 DOM 当前值（序 B 下 state 滞后于定案文本） */
  function addTag(): void {
    const t = (inputRef.current?.value ?? tagInput).trim()
    if (t === '' || tags.includes(t)) return
    props.onSetTags(node.id, [...tags, t])
    setTagInput('')
  }
  const removeTag = (t: string): void => {
    props.onSetTags(node.id, tags.filter((x) => x !== t))
  }

  return (
    <section data-testid="lineage-side-tags">
      <h4 className="m-0 pl-1.5 font-medium" style={{ borderLeft: '3px solid var(--accent)', color: 'var(--text-dim)' }}>
        标签
      </h4>
      <div className="flex flex-wrap items-center gap-1">
        {tags.map((t) => (
          <span key={t} data-testid="lineage-tag-chip" className="gap-0.75 px-1" style={SIDE_TAG_CHIP}>
            {t}
            {/* [F-UIRES-02 批 B R3] chip × 字符→ICON_X；title 与 aria-label 同源 */}
            <button
              type="button"
              data-testid="lineage-tag-remove"
              aria-label={`移除标签 ${t}`}
              title={`移除标签 ${t}`}
              className="syn-icon-btn leading-none"
              style={{ color: 'var(--danger)' }}
              onClick={() => removeTag(t)}
            >
              {ICON_X}
            </button>
          </span>
        ))}
        <input
          data-testid="lineage-tag-input"
          maxLength={TAG_NAME_MAX}
          className="w-24 rounded border px-1.5 py-0.5 text-xs"
          style={{ borderColor: 'var(--border)' }}
          value={tagInput}
          aria-label="新标签名"
          ref={inputRef}
          onChange={(e) => setTagInput(e.target.value)}
          onCompositionStart={composing.onCompositionStart}
          onCompositionEnd={composing.onCompositionEnd}
          // [F-UIRES-02 R8] Enter=添加/Esc=清空（常驻输入取消语义；无失焦
          // 提交标记门面——skipBlur 直通）；isComposing 守卫在键面单源
          onKeyDown={(e) =>
            inlineKeyDown(
              e,
              addTag,
              () => setTagInput(''),
              () => undefined
            )
          }
          // [F-UIRES-02 R8] 失焦=提交：组词中拒绝+复位（序 B 补提交承载）
          onBlur={() => {
            if (composing.composingRef.current) {
              composing.composingRef.current = false
              return
            }
            addTag()
          }}
        />
        {/* [F-UIRES-02 批 B R8] ＋ 字符→ICON_PLUS；补 aria-label「添加标签」
            （盘点 #30 可达名缺失——title/aria-label 同源）；sr-only 保
            textContent 恰=「+」（受锁 lineage-side-tags-keys:73 精确匹配面） */}
        <button
          type="button"
          aria-label="添加标签"
          title="添加标签"
          className="syn-icon-btn rounded border px-1.5 py-0.5 text-xs"
          style={{ borderColor: 'var(--accent)', color: 'var(--accent)' }}
          // [F-UIRES-02 R8] mousedown 阻焦点转移：不触发输入框 blur——click
          // 单路提交（TagEditor:213 先例）；组词期点击不提交（三路同守卫）
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            if (composing.composingRef.current) return
            addTag()
          }}
        >
          {ICON_PLUS}
          <span className="sr-only">+</span>
        </button>
      </div>
    </section>
  )
}
