/**
 * AnnotationEditor —— 标注批注编辑弹层（AnnotationLayer 的交互子件，纯展示）。
 *
 * 数据与副作用全在 AnnotationLayer/AnnotationPopups：本件只收 textarea 文本并
 * 上交（onSave(comment) / onDelete / onCancel），busy 期间按钮禁点防重复提交。
 * 弹层挂载在页根内、文本层之上（z 高于划选工具条），按命中矩形的左下沿定位；
 * key 由父级按 annotation.id 传（换条编辑必经卸载重挂，comment 状态不串）。
 *
 * [F-A11] 笔记编辑 UX 双缺：①自动保存反馈+②撤销/重做——草稿逻辑（值栈/
 *   防抖/保存状态机）驻 use-annotation-draft.ts 域 hook（250 行关卡拆件——
 *   状态机表与跨格注记随逻辑迁驻该件头注；本件留 JSX 接线）。
 * [F-VISFB-12] 取消/Escape 先 flush（H2/H3/H4）：clean/saved 无待存与 busy
 *   在途手动写承接两路同步收层（零跳变）；dirty/failed/saving 路径 await
 *   draft.flush 立存后按终态收层判定（写挂起期间不收层；终态 failed=不收层
 *   ——停留编辑器呈现保存失败态，重试=保存钮/二次 Escape 再 flush，逃生径=
 *   删除钮/切目标 fire-first 注册表承接；卸载注册承接面=组件真卸载〔切目标/
 *   路由〕时的 failed 条目兜底——删除链先清册〔discard 出表+墓碑拒注册〕，
 *   不经此兜底）。UI 反馈不阻塞面=写经 onAutosave
 *   （AnnotationPopups）置 busy 全钮禁用。
 * [F-VISFB-13] 四态图标与布局（§0-2 锁定裁决）：保存钮=共享 SaveStateButton
 *   （save-status.ts 单源推导——dirty 彩色可点〔点击即存=onSave 手动保存链〕/
 *   saved 灰禁/saving spinner 禁用/failed 红+短文本「重试」可点；busy 在途
 *   归一 saving 格）；saved/failed 标记=图标+sr-only 态语（A4 删「已保存」
 *   类可见字样——textContent/accessible name 双面保活）；A5 按钮重排：保存/
 *   删除右上、取消上移——底行退役，全动作单工具行（与笔记面板两消费方一致
 *   重排）。failed 态逃生径=删除钮/切目标 fire-first（N-1 闸，锚在
 *   save-state-button.test.tsx ④）。
 */
import { useEffect, useRef } from 'react'
import type { Annotation, AnnotationRect } from '@shared/models/annotation'
import { ICON_CHECK, ICON_REDO, ICON_RETRY, ICON_TRASH, ICON_UNDO, ICON_X } from '../../../shared/icons'
import { ANNOTATION_BTN_CLASS as btn } from '../anchors/annotation-style'
import { useAnnotationDraft } from '../interact/use-annotation-draft'
import { saveAnnotationDraft } from '../interact/annotation-draft-registry'
import { SaveStateButton } from '../../../shared/ui/SaveStateButton'
import { editorSaveUiState } from '../../../shared/save-status'

export function AnnotationEditor(props: {
  annotation: Annotation
  rect: AnnotationRect
  busy: boolean
  onCancel(): void
  onSave(comment: string): void
  onDelete(): void
  onAutosave(comment: string): Promise<boolean>
}): JSX.Element {
  const { annotation, rect, busy, onCancel, onSave, onDelete, onAutosave } = props
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  const draft = useAnnotationDraft(annotation.id, annotation.comment, onAutosave)
  const { comment, saveState } = draft

  // 打开即聚焦批注输入（Escape 收起=键盘可退出，见 textarea onKeyDown）
  useEffect(() => {
    textareaRef.current?.focus()
  }, [])

  /**
   * [F-VISFB-12] 取消先 flush（H2/H3/H4）：无待存（clean/saved——含值已回退
   * lastSaved）或 busy（在途手动保存/删除承接，卸载注册面兜底）→同步收层
   * （零跳变，锁定 Escape 同步锚）；有待存→await flush 立存后再收层。
   * [回炉轮 1 B-2] busy 分支显式入注册表（failed=false——在途手动写结果
   * 未知，重挂载按 dirty+timer 自动重试=S5 同语义）；手动写成功时 saveComment
   * 的 W3 等值清自理；值==服务器值（无待存）零注册。
   * [回炉轮 2 B-1] 实质查态（INV-141：fulfilled≠已落库，state 驱动运行时
   * 分支）：flush 终态 failed=**不收层**——停留编辑器呈现保存失败态
   * （saveState='failed' 标记+写路径 toast 已发）；逃生径=删除钮/切目标
   * fire-first（H6 注册表承接）。通道②卸载注册仍真——真正卸载径（路由/
   * 切目标/删除）的 failed 条目兜底（saveState='failed'→attempted 自动）。
   */
  function requestCancel(): void {
    if (busy || saveState === 'clean' || saveState === 'saved') {
      if (busy && comment !== annotation.comment) {
        saveAnnotationDraft(annotation.id, comment, false)
      }
      onCancel()
      return
    }
    void draft.flush().then((finalState) => {
      if (finalState === 'failed') {
        // failed=不收层：停留编辑器呈现保存失败态；二次 Escape=再 flush 重试
        return
      }
      onCancel()
    })
  }

  return (
    <div
      data-testid="annotation-editor"
      onPointerDown={(e) => {
        // F-RDR-02 D6（回炉 1·门一 B1）：点击弹层空白处重聚焦输入框（失焦后点击
        // 恢复光标——无害缓解）。preventDefault 必须：抑制随后 mousedown 的默认
        // 聚焦（默认动作会把焦点抢到不可聚焦目标的祖先/body——jsdom 不实现该
        // 动作族故单测面须真机探针双证 z-f-rdr02-repro-probe）；仅主键（右/中键
        // 无重聚焦语义）；目标非 textarea 自身/非按钮（closest 深判——按钮含
        // 图标子节点时 target 非 BUTTON）才抢焦点
        if (e.button !== 0) {
          return
        }
        const t = e.target as HTMLElement
        if (t !== textareaRef.current && t.closest('button') === null) {
          e.preventDefault()
          textareaRef.current?.focus()
        }
      }}
      className="absolute z-(--z-anchor-pop) flex w-72 flex-col gap-2 rounded border p-2 text-xs"
      style={{
        // 左沿贴命中矩形并夹取，避免右侧溢出页根
        left: `${Math.min(rect.x * 100, 55)}%`,
        top: `calc(${(rect.y + rect.h) * 100}% + 6px)`,
        background: 'var(--panel)',
        borderColor: 'var(--border)',
        boxShadow: 'var(--shadow-pop-md)'
      }}
    >
      <p className="line-clamp-2" style={{ color: 'var(--text-dim)' }}>
        {annotation.quoteText}
      </p>
      <textarea
        ref={textareaRef}
        rows={3}
        aria-label="批注内容"
        className="w-full resize-none rounded border p-1 text-xs"
        // [T3-P4] 弹层随族归一：底 var(--bg)（app 全域底）→--panel-2（mockup
        // .anno-pop textarea=panel 底系——悬浮面板底而非页面底）
        style={{ borderColor: 'var(--border)', background: 'var(--panel-2)' }}
        value={comment}
        onChange={(e) => draft.applyEdit(e.target.value)}
        onCompositionStart={draft.handleCompositionStart}
        onCompositionEnd={draft.handleCompositionEnd}
        onKeyDown={(e) => {
          // F-RDR-02：IME 组词期按键（229/keyCode）不消费——Escape 不关弹层、ctrl+z
          // 不打断组词（候选根因②；React onKeyDown 的 e.key 在组词期=Process/原键，
          // 需以 nativeEvent.isComposing 判定——annotation-editor-ux IME 用例在档）
          if (e.nativeEvent.isComposing) {
            return
          }
          if (e.key === 'Escape') {
            requestCancel()
            return
          }
          // 受控组件原生 undo 栈不可靠（F-A11）——拦截接值栈；metaKey=macOS Cmd 对位
          const mod = e.ctrlKey || e.metaKey
          if (mod && (e.key === 'z' || e.key === 'Z')) {
            e.preventDefault()
            if (e.shiftKey) {
              draft.redoEdit()
            } else {
              draft.undoEdit()
            }
            return
          }
          if (mod && (e.key === 'y' || e.key === 'Y')) {
            e.preventDefault()
            draft.redoEdit()
          }
        }}
      />
      {/* [F-VISFB-13 A5] 单工具行：撤销/重做 + 右侧（保存/删除/取消）——底行
          退役（保存/删除右上、取消上移，与笔记面板两消费方一致重排）。
          [F-UIRES-02 批 B R5] 撤销/重做/删除/取消图标+title 同源（data-testid
          受锁锚零变）；sr-only span 保 textContent/accessible name。
          [F-VISFB-13 A4] saved/failed 标记=图标+sr-only 态语（删可见字样——
          textContent 锚保活：'已保存'/'保存失败'）。 */}
      <div className="flex items-center gap-1">
        <button
          type="button"
          className={`${btn} syn-icon-btn`}
          style={{ borderColor: 'var(--border)' }}
          data-testid="annotation-editor-undo"
          title="撤销"
          aria-label="撤销"
          disabled={!draft.canUndo}
          onClick={draft.undoEdit}
        >
          {ICON_UNDO}
          <span className="sr-only">撤销</span>
        </button>
        <button
          type="button"
          className={`${btn} syn-icon-btn`}
          style={{ borderColor: 'var(--border)' }}
          data-testid="annotation-editor-redo"
          title="重做"
          aria-label="重做"
          disabled={!draft.canRedo}
          onClick={draft.redoEdit}
        >
          {ICON_REDO}
          <span className="sr-only">重做</span>
        </button>
        {(saveState === 'saved' || saveState === 'failed') && (
          <span
            data-testid="annotation-saved-flag"
            className="ml-auto syn-status-icon"
            style={{ color: saveState === 'failed' ? 'var(--danger)' : 'var(--text-dim)' }}
          >
            {saveState === 'failed' ? ICON_RETRY : ICON_CHECK}
            <span className="sr-only">{saveState === 'failed' ? '保存失败' : '已保存'}</span>
          </span>
        )}
        {/* [F-VISFB-13] 四态保存钮：状态轴=editorSaveUiState（save-status 单源），
            动作轴=onSave 手动保存链（dirty 点击即存/failed 点击重试）；busy 在途
            归一 saving 格。标记不在场时由保存钮承载右对齐（ml-auto） */}
        <SaveStateButton
          testId="annotation-editor-save"
          state={editorSaveUiState(saveState)}
          busy={busy}
          className={saveState === 'saved' || saveState === 'failed' ? undefined : 'ml-auto'}
          onClick={() => onSave(comment)}
        />
        <button
          type="button"
          className={`${btn} syn-icon-btn`}
          style={{ borderColor: 'var(--danger)', color: 'var(--danger)' }}
          disabled={busy}
          title="删除"
          aria-label="删除"
          onClick={onDelete}
        >
          {ICON_TRASH}
          <span className="sr-only">删除</span>
        </button>
        <button
          type="button"
          className={`${btn} syn-icon-btn`}
          style={{ borderColor: 'var(--border)' }}
          disabled={busy}
          title="取消"
          aria-label="取消"
          onClick={requestCancel}
        >
          {ICON_X}
          <span className="sr-only">取消</span>
        </button>
      </div>
    </div>
  )
}
