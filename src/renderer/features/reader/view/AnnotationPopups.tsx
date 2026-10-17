/**
 * [F-SPLIT-01] AnnotationPopups —— 标注弹层动作件（自 AnnotationLayer 拆出
 * 2026-09-05；[F-VISFB-15] busy 族动作〔saveComment/autosaveComment/
 * deleteAnnotation——②busy 等待复判+③删除失败补偿〕抽域件 interact/
 * annotation-popups-actions.ts：组件 250 行关口，先例=use-annotation-draft 自
 * AnnotationEditor 拆出；copyQuote〔菜单 UI 动作，零 busy 面〕留驻本件）。
 *
 * ── 行为层 ──
 * - 点击标注：弹四选项菜单（AnnotationMenu：复制引文→剪贴板+失败 toast；删除→
 *   confirm→api；添加笔记→开批注编辑 AnnotationEditor；取消收起）——点击他条
 *   标注=切目标，不残留双弹层；成功后经 reader.store 同步本地数组并回调
 *   onChanged。busy 族动作行为面单源=annotation-popups-actions.ts 头注（②③
 *   改造点与态表驻彼）。
 * - 弹层无本地状态（禁改状态归属）——menu/editing/busy 由宿主 AnnotationLayer
 *   持有，本件经 props 收值+set 函数回写；本件经域 hook 接线动作族。
 * - AnnotationEditor 自动保存接线：onAutosave→actions.autosaveComment（编辑器
 *   内 800ms 停顿触发，反馈标记在编辑器本件）。
 *
 * ── 接口层 ──
 * - export function AnnotationPopups(props: { menu: PopupTarget | null;
 *   editing: PopupTarget | null; busy: boolean; setMenu; setEditing; setBusy;
 *   onChanged }): JSX.Element（PopupTarget 接口驻本件——宿主 state 类型
 *   消费经 import 单源）
 *
 * ── 架构层 ──
 * - api 调用+store 三方法同步随弹层动作归域 hook（原本件头注「在本层」随迁
 *   域件）；AnnotationEditor 纯展示不变。
 */
import { AnnotationEditor } from './AnnotationEditor'
import { AnnotationMenu } from './AnnotationMenu'
import { showToast } from '../../../shared/ui/Toast'
import { useAnnotationPopupActions } from '../interact/annotation-popups-actions'
import type { Annotation, AnnotationRect } from '@shared/models/annotation'

/** 弹层目标（连同命中矩形供定位）——菜单与编辑器互斥使用同形 */
export interface PopupTarget {
  annotation: Annotation
  rect: AnnotationRect
}

/** 复制失败的动作型提示（双路径共用；菜单已乐观收起，重试=重新点击标注） */
const COPY_FAILED = '复制到剪贴板失败，可点击标注重试'

export function AnnotationPopups(props: {
  menu: PopupTarget | null
  editing: PopupTarget | null
  busy: boolean
  setMenu: (v: PopupTarget | null) => void
  setEditing: (v: PopupTarget | null) => void
  setBusy: (v: boolean) => void
  onChanged: () => void
}): JSX.Element {
  const { menu, editing, busy, setMenu, setEditing, setBusy, onChanged } = props
  const actions = useAnnotationPopupActions({
    busy,
    setBusy,
    closeEditing: () => setEditing(null),
    closeMenu: () => setMenu(null),
    onChanged,
    editingId: editing?.annotation.id ?? null
  })

  /** 复制引文：双路径失败 toast（同步异常/写入拒绝，INV-02 动作型）→ 收起菜单 */
  function copyQuote(a: Annotation): void {
    setMenu(null)
    try {
      void navigator.clipboard.writeText(a.quoteText).catch(() => {
        showToast(COPY_FAILED, 'error')
      })
    } catch {
      showToast(COPY_FAILED, 'error')
    }
  }

  return (
    <>
      {menu !== null && (
        <AnnotationMenu
          annotation={menu.annotation}
          rect={menu.rect}
          busy={busy}
          onCopy={() => copyQuote(menu.annotation)}
          onDelete={() => void actions.deleteAnnotation(menu.annotation)}
          onAddNote={() => {
            setEditing(menu)
            setMenu(null)
          }}
          onCancel={() => setMenu(null)}
        />
      )}
      {editing !== null && (
        <AnnotationEditor
          key={editing.annotation.id}
          annotation={editing.annotation}
          rect={editing.rect}
          busy={busy}
          onCancel={() => setEditing(null)}
          onSave={(comment) => void actions.saveComment(editing.annotation, comment)}
          onDelete={() => void actions.deleteAnnotation(editing.annotation)}
          onAutosave={(comment) => actions.autosaveComment(editing.annotation, comment)}
        />
      )}
    </>
  )
}
