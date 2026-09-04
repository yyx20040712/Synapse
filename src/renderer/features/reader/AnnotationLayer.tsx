/**
 * [SR-RDR-06] AnnotationLayer —— 标注渲染与命中（工单：done / weak，依赖 annotation-anchor+anchor-serialize）
 *
 * ── 行为层 ──
 * - 按当前页过滤标注：rects 归一化坐标 → 绝对定位色块（颜色由 kind+color 决定；
 *   整层容器 mix-blend-mode:multiply——荧光笔语义，白纸显色、黑字透出，色块不透明；
 *   下划线为收边后底缘 2px 实条，每行一条——rectStyle 已迁 annotation-style
 *   （F-11 顶/底收边修标注下偏；F-A4 b② 行盒自适应 band——重锚字形带在场
 *   时顶贴字形顶缘底贴底缘）；DOM 回退层行级合并=annotation-anchor.mergeLineRects
 *   （[F-A8 门2] 适用面收缩 INV-47）；
 *   渲染读时另过 annotation-merge.mergeRects 归并（F-A1 挂 B，INV-E——
 *   F-A4 b① 行高感知 lineH 注入；存量缺陷态 rects 库数据零迁移，读时归并
 *   存量渐净；resolved 产物已过挂 A，幂等无害）
 * - 打开文档/翻页时三层编排重锚（[F-A8 门2] 项几何主链→DOM 回退→存量兜底
 *   ——annotation-resolve-layered 域；仅显示不回写库；MutationObserver+rAF 合并）
 * - 点击标注：弹四选项菜单（AnnotationMenu：复制引文→剪贴板+失败 toast；删除→
 *   confirm→api.reader.deleteAnnotation；添加笔记→开批注编辑 AnnotationEditor
 *   （comment textarea，保存 api.reader.updateAnnotation）；取消收起）——点击他条
 *   标注=切目标，不残留双弹层；成功后经 reader.store.updateAnnotation/
 *   removeAnnotation 同步本地数组并回调 onChanged
 * - sortKey 由仓储层生成（"页码:页内序号"），渲染按 props 顺序即可
 *
 * ── 接口层 ──
 * - export function AnnotationLayer(props: { annotations: Annotation[];
 *     page: number; pageRoot: HTMLElement | null; onChanged(): void }): JSX.Element | null
 *
 * ── 架构层 ──
 * - 重锚根是页根内 .textLayer 容器（与 SelectionLayer 同口径）；annotation-anchor
 *   是唯一 DOM 遍历点；api 调用 + store 三方法同步在本层，AnnotationEditor 纯展示
 * - 色块层 pointer-events:none 仅矩形可命中——点击标注即开菜单；矩形上方能否
 *   发起文本重选由选择模式条件化（F-A3/INV-42，F-A2 根治）：常规=v1 约束
 *   保持（从矩形外起选）；选择模式=rect 穿透（拖选可在标注块上发起；rectStyle
 *   零改——覆盖在消费方）+进入即关已开弹层（S1/S5，paint 前收起；切回不恢复）
 *
 * ── 生命周期层 ── / ── 文化层 ──
 * - e2e：tests/e2e/reader-text.spec.ts 后半（选中→高亮→重开仍在原位）
 */
import { useEffect, useLayoutEffect, useState } from 'react'
import type { Annotation, AnnotationRect } from '@shared/models/annotation'
import { api, unwrap, ApiClientError } from '../../api/client'
import { showToast } from '../../shared/ui/Toast'
import { normalizedLineHeight, matchBand, bandsNearRects, type ResolvedAnnotation, type RowBand } from './annotation-resolve'
import { resolveAnnotationRectsLayered } from './annotation-resolve-layered'
import { usePageItemsStore } from './page-items.store'
import { mergeRects } from './annotation-merge'
import { pushUndo } from './annotation-undo'
import { AnnotationEditor } from './AnnotationEditor'
import { AnnotationMenu } from './AnnotationMenu'
import { rectStyle } from './annotation-style'
import { PAGE_LAYER_Z } from './page-layer-z'
import { useReaderStore } from './reader.store'

/** 意外异常（非 ApiClientError）时的兜底中文消息 */
const UPDATE_FAILED = '标注保存失败'
const DELETE_FAILED = '标注删除失败'
const DELETE_CONFIRM = '删除这条标注？'

/** 重锚后的显示矩形（id → { rects, bands }；缺项回退存量 rects） */
type ResolvedRects = Record<string, ResolvedAnnotation>

/** 弹层目标（连同命中矩形供定位）——菜单与编辑器互斥使用同形 */
interface PopupTarget {
  annotation: Annotation
  rect: AnnotationRect
}

/** 复制失败的动作型提示（双路径共用；菜单已乐观收起，重试=重新点击标注） */
const COPY_FAILED = '复制到剪贴板失败，可点击标注重试'

export function AnnotationLayer(props: {
  annotations: Annotation[]
  page: number
  pageRoot: HTMLElement | null
  onChanged: () => void
}): JSX.Element | null {
  const { annotations, page, pageRoot, onChanged } = props
  const [resolved, setResolved] = useState<ResolvedRects>({})
  // [F-A4 b①] 挂 B 行高感知 lineH（textLayer span 字号中位数/textLayer 盒高；量测退化 undefined=旧行为）
  const [lineH, setLineH] = useState<number | undefined>(undefined)
  // [F-A5 b] 存量回退 band：重锚失败条目（S3b/S6）的 rects 经 bandsNearRects 单源
  const [fallbackBands, setFallbackBands] = useState<RowBand[]>([])
  const [menu, setMenu] = useState<PopupTarget | null>(null)
  const [editing, setEditing] = useState<PopupTarget | null>(null)
  const [busy, setBusy] = useState(false)
  // F-A3（INV-42）：选择模式自订阅（per-tab，SelectionLayer color 先例；props 零变）
  const selectionMode = useReaderStore((s) => s.tabs[s.activeId ?? '']?.selectionMode ?? false)
  // [F-A8 门2 CR1] 页项 store 订阅（pages[page+1] 条目变化→resolve 重调度——
  // store 晚于 textLayer 就绪竞态由订阅兜底；CR3 键=当前渲染页，文档切换=clear
  // 重填；缺席归一 null——编排器 S0 判定口径）
  const pageEntry = usePageItemsStore((s) => s.pages[page + 1]) ?? null
  // 进入选择模式：关已开菜单/编辑器（S1/S5；useLayoutEffect=paint 前收起，票面 §4）
  useLayoutEffect(() => {
    if (selectionMode) { setMenu(null); setEditing(null) }
  }, [selectionMode])

  const pageAnnotations = annotations.filter((a) => a.page === page)

  // 文本层就绪后重锚 [F-A8 门2]：三层编排（项几何→DOM→存量——layered 域；仅显示不回写）
  useEffect(() => {
    if (pageRoot === null) {
      return
    }
    const textLayer = pageRoot.querySelector('.textLayer') as HTMLElement | null
    if (textLayer === null) {
      return
    }
    let scheduled = false
    const resolve = (): void => {
      scheduled = false
      const next = resolveAnnotationRectsLayered({ textLayer, annotations, page, entry: pageEntry })
      setResolved(next)
      setLineH(normalizedLineHeight(textLayer))
      const failed = annotations.filter((a) => a.page === page && next[a.id] === undefined && a.rects.length > 0)
      setFallbackBands(failed.length > 0 ? bandsNearRects(textLayer, failed.flatMap((a) => a.rects)) : [])
    }
    // 文本层 span 逐个入 DOM（pdf.js render() 异步）：rAF 合并成每帧一次
    const schedule = (): void => {
      if (!scheduled) {
        scheduled = true
        requestAnimationFrame(resolve)
      }
    }
    resolve()
    const observer = new MutationObserver(schedule)
    observer.observe(textLayer, { childList: true, subtree: true })
    return () => observer.disconnect()
  }, [annotations, page, pageRoot, pageEntry])

  /** 批注保存：api 成功 → store 同步 → 收起弹层 → onChanged 通知 */
  async function saveComment(a: Annotation, comment: string): Promise<void> {
    if (busy) {
      return
    }
    setBusy(true)
    try {
      const next: Annotation = { ...a, comment, updatedAt: new Date().toISOString() }
      const saved = await unwrap(api.reader.updateAnnotation({ annotation: next }))
      useReaderStore.getState().updateAnnotation(saved)
      pushUndo(a.paperId, { kind: 'comment-edit', before: a })
      useReaderStore.getState().clearTabDirty(a.paperId)
      setEditing(null)
      onChanged()
    } catch (e) {
      // 保存失败：tab 灰点置位（TABS-03 两写面之一）
      useReaderStore.getState().markTabDirty(a.paperId)
      showToast(e instanceof ApiClientError ? e.message : UPDATE_FAILED, 'error')
    } finally {
      setBusy(false)
    }
  }

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

  /** 删除：confirm 确认 → api → store 同步 → 收起（菜单/编辑器一并）→ onChanged 通知 */
  async function deleteAnnotation(a: Annotation): Promise<void> {
    if (busy || !window.confirm(DELETE_CONFIRM)) {
      return
    }
    setBusy(true)
    try {
      await unwrap(api.reader.deleteAnnotation({ annotationId: a.id }))
      useReaderStore.getState().removeAnnotation(a.id)
      pushUndo(a.paperId, { kind: 'delete', annotation: a })
      useReaderStore.getState().clearTabDirty(a.paperId)
      setEditing(null)
      setMenu(null)
      onChanged()
    } catch (e) {
      // 删除失败：tab 灰点置位（TABS-03 两写面之一）
      useReaderStore.getState().markTabDirty(a.paperId)
      showToast(e instanceof ApiClientError ? e.message : DELETE_FAILED, 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <div
        data-testid="annotation-layer"
        className="absolute inset-0"
        style={{ zIndex: PAGE_LAYER_Z.colorBlocks, pointerEvents: 'none' }}
      >
        {/* [F-A5/ADR-0019 R2] 色块=背景板：multiply 摘除+z 常量单源（canvas
            透明底墨带恒在色块上——文字纯黑不被染，用户背景板令）；[F-A4 b]
            lineH 归并+band 自适应（重锚带优先；[F-A5 b] 重锚失败回退存量
            rects 亦经同一 band 单源 fallbackBands） */}
        {pageAnnotations.map((a) =>
          mergeRects(resolved[a.id]?.rects ?? a.rects, lineH).map((r, i) => (
            <div
              key={`${a.id}:${i}`}
              data-testid="annotation-rect"
              data-annotation-id={a.id}
              data-source={resolved[a.id]?.source}
              role="button"
              aria-label={`标注：${a.quoteText}`}
              title={a.comment !== '' ? a.comment : a.quoteText}
              className="absolute"
              style={selectionMode ? { ...rectStyle(a.kind, a.color, r, matchBand(resolved[a.id]?.bands ?? fallbackBands, r)), pointerEvents: 'none' } : rectStyle(a.kind, a.color, r, matchBand(resolved[a.id]?.bands ?? fallbackBands, r))}
              onClick={() => {
                // 选择模式=穿透零副作用（pointerEvents:none+守卫兜一切点击——真鼠标同拦，C-2① 证）
                if (selectionMode) return
                // 点击他条=切目标（菜单接管收起编辑器）；反向同步侧栏高亮（C-05）
                useReaderStore.getState().notifyNoteHighlight(a.id)
                setMenu({ annotation: a, rect: r })
                setEditing(null)
              }}
            />
          ))
        )}
      </div>
      {menu !== null && (
        <AnnotationMenu
          annotation={menu.annotation}
          rect={menu.rect}
          busy={busy}
          onCopy={() => copyQuote(menu.annotation)}
          onDelete={() => void deleteAnnotation(menu.annotation)}
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
          onSave={(comment) => void saveComment(editing.annotation, comment)}
          onDelete={() => void deleteAnnotation(editing.annotation)}
        />
      )}
    </>
  )
}
