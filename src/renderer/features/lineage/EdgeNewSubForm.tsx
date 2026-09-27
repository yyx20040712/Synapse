// b3: T3-P7B
/**
 * [T3-P7B] EdgeNewSubForm —— 新建线型内联表单子件（EdgeTypePopover 拆件
 * ——组件 250 行红线；票面④：名称 text[默认「线型 N」N=subs.length+1 可编辑]
 * +预览线[PALETTE/DASH_ROT 轮转 D-10 索引=组内 subs.length+w=1.7]+确定取消；
 * 确定语义（saveLineTypes 整批+自动选中）归父件，本件纯受控表单）。
 * [R5 回炉 1] NewSubLauncher=「＋新建线型」钮+表单挂载块（窗口禁建 disabled/
 * title 承载面；[回炉 1 行数红线] 自 EdgeTypePopover 二次拆出）。
 */
import type { CSSProperties } from 'react'

/** 「＋新建线型」钮+内联表单挂载（saveLocked=saving/error 禁建——R5） */
export function NewSubLauncher(props: {
  saveLocked: boolean
  formOpen: boolean
  name: string
  onName(v: string): void
  preview: CSSProperties
  onOpen(): void
  onConfirm(): void
  onCancel(): void
}): JSX.Element {
  return (
    <>
      <button
        type="button"
        className="pbtn sec"
        data-testid="edge-pop-newsub"
        disabled={props.saveLocked}
        title={props.saveLocked ? '等待上次保存完成' : undefined}
        onClick={props.onOpen}
      >
        ＋ 新建线型
      </button>
      {props.formOpen && (
        <EdgeNewSubForm
          name={props.name}
          onName={props.onName}
          saveLocked={props.saveLocked}
          preview={props.preview}
          onConfirm={props.onConfirm}
          onCancel={props.onCancel}
        />
      )}
    </>
  )
}

export function EdgeNewSubForm(props: {
  name: string
  onName(v: string): void
  /** [R5 回炉 1] 窗口禁建（saving/error=确定钮禁用+title——过期 props 面） */
  saveLocked: boolean
  preview: CSSProperties
  onConfirm(): void
  onCancel(): void
}): JSX.Element {
  return (
    <div className="newsub-form" data-testid="edge-pop-newsub-form">
      <input
        type="text"
        value={props.name}
        data-testid="edge-pop-newsub-name"
        onChange={(e) => props.onName(e.target.value)}
      />
      <i className="newsub-preview" style={props.preview} />
      <div className="newsub-acts">
        <button
          type="button"
          className="pbtn pri"
          data-testid="edge-pop-newsub-confirm"
          disabled={props.saveLocked}
          title={props.saveLocked ? '等待上次保存完成' : undefined}
          onClick={props.onConfirm}
        >
          确定
        </button>
        <button type="button" className="pbtn sec" data-testid="edge-pop-newsub-cancel" onClick={props.onCancel}>
          取消
        </button>
      </div>
    </div>
  )
}

