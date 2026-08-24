// b3: P7-B
/**
 * [SR2-TABS-01] reader.store —— per-tab 多文献状态（工单：open / strong）
 *
 * ── 行为层 ──
 * - 状态形状：{ tabs: Record<paperId, TabState>; order: paperId[]; activeId: string | null }
 *   TabState = { paperId; fileUrl; fileName; page; totalPages; zoom; color;
 *   annotations; status: 'loading' | 'ready' | 'error'; dirty: boolean }
 *   （dirty 建位于本单、恒 false——信号写入路径归 SR2-TABS-03（其改动面含本
 *   文件）；undo 栈不进 TabState，归 SR2-UNDO-01 模块级自持，plan 门 W2 裁决）
 *   （顶层便捷字段全部下钻 TabState——单一真相源，禁投影双源；消费方经
 *   s.tabs[s.activeId ?? ''] 选择器取）
 * - tab 生命周期状态机（宪法状态机前置；跨格序列为审计重点）。事件×态全表
 *   （closeTab/activateTab 对任意态生效，openPaper 按 tab 现态分支）：
 *   | 事件 | loading | ready | error | absent |
 *   | openPaper(id) 载入成功 | → ready | 幂等激活 | 重试：→loading | →loading（追加+激活） |
 *   | openPaper(id) 载入失败 | → error | —（幂等激活不重载） | 保持 error | → error（占位 tab） |
 *   | activateTab(id) | 激活不变态 | 激活不变态 | 激活不变态 | —（id 必须存在，不存在 no-op） |
 *   | closeTab(id) | → absent（在途响应到达按规则①丢弃） | → absent | → absent | — |
 *   - closeTab 收缩序：关 activeId 时取右邻（无右邻取左邻，全空 → activeId=null
 *     空态提示，不隐式切 App 视图）；order 同步移除
 * - 竞态守卫（INV-03 per-tab 化，模块级 loadSeq 总序号）——迟到响应三规则：
 *   ① 响应到达时 tab 已 absent（被关）→ 丢弃
 *   ② tab 存在但已发起新一轮加载（seq 过期）→ 丢弃
 *   ③ tab 存在且 seq 最新 → 写入该 tab（即使 activeId 已切走——旧 tab 数据照常
 *   落账，绝不覆盖展示中的新 tab）
 *   - 跨格序列（锁定测试锚定）：
 *     S1 换 tab：open(A) ready → open(B) ready（A 保留）→ activate(A) → A 的
 *        page/zoom/annotations 原样恢复（状态未失忆）
 *     S2 关 tab：open(A) open(B) → close(B)（activeId 回 A）→ close(A) →
 *        activeId=null（空态）；order 收缩序正确
 *     S3 加载中切换：open(A) loading → open(B) ready → A 响应迟到 → 只写入
 *        A 的 tab（B 展示不受干扰）；loading 中 close(A) → A 迟到响应丢弃（规则①）
 * - 进度防抖：PROGRESS_DEBOUNCE_MS=2000 单定时器 + 闭包快照 {paperId, page}
 *   （换 tab 不误写他 tab 进度）；closeTab 时 pending 进度属被关 tab → 立即
 *   flush 落库（尽力而为，catch 吞——进度非关键数据，规约记录依据）
 * - 旧 setter（setPage/setZoom/setTotalPages/setColor/addAnnotation/
 *   updateAnnotation/removeAnnotation）作用于 active tab；activeId=null 时 no-op
 *
 * ── 接口层 ──
 * - export interface TabState / ReaderStore（形状如上）
 * - export const useReaderStore: UseBoundStore<...>
 * - openPaper(id) 保留动作型错误契约（失败上抛由消费方 toast，tab 置 error）
 *
 * ── 架构层 ──
 * - 只 import api/client 与 shared 模型；禁止 import 组件
 * - 接缝（本工单改动面）：ReaderPage.tsx:49-78 / SelectionLayer.tsx:67-68 选择器
 *   迁移（s.paperId → s.tabs[s.activeId ?? '']?.paperId 等，行为不变）；
 *   AnnotationLayer.tsx:146/176 零改动（方法签名不变）
 *
 * ── 生命周期层 ──
 * - 预留：TabState.dirty 信号写入（SR2-TABS-03）；不做：tab 拖拽排序、会话恢复
 *
 * ── 文化层 ──
 * - 测试：tests/unit/renderer/reader.store.test.ts 随本单迁移（受锁
 *   [locked-change]：旧 7 用例断言路径下钻 per-tab（单 tab 场景语义不变）+
 *   新增 per-tab 组：幂等激活/S1/S2/S3 三序列/进度 flush）
 * - docs/invariants.md INV-03 行随本单更新（stale-guard per-tab 变体描述）——
 *   登记册列本单改动面（plan 门 W3 处置）
 * - INV-14 不适用（无 DOM 监听面）
 */
import { create } from 'zustand'
import { api, unwrap } from '../../api/client'
import type { Annotation, AnnotationColor } from '@shared/models/annotation'

export interface ReaderStore {
  paperId: string | null
  fileUrl: string | null
  fileName: string
  page: number
  totalPages: number
  zoom: number
  color: AnnotationColor
  annotations: Annotation[]
  openPaper(id: string): Promise<void>
  close(): void
  setPage(page: number): void
  setZoom(zoom: number): void
  setTotalPages(total: number): void
  setColor(color: AnnotationColor): void
  addAnnotation(a: Annotation): void
  updateAnnotation(a: Annotation): void
  removeAnnotation(id: string): void
}

export function createReaderStoreInitialState() {
  return {
    paperId: null as string | null,
    fileUrl: null as string | null,
    fileName: '',
    page: 0,
    totalPages: 0,
    zoom: 1,
    color: 'yellow' as AnnotationColor,
    annotations: [] as Annotation[]
  }
}

/** 进度防抖窗口：翻页后静置 2s 才落库（与 ReaderPage 规约一致） */
const PROGRESS_DEBOUNCE_MS = 2000

export const useReaderStore = create<ReaderStore>()((set, get) => {
  // openPaper 请求序号（模块内闭包）：只认最后一次发起的打开
  let openSeq = 0
  let progressTimer: ReturnType<typeof setTimeout> | null = null

  const clearProgressTimer = (): void => {
    if (progressTimer !== null) {
      clearTimeout(progressTimer)
      progressTimer = null
    }
  }

  const scheduleProgress = (): void => {
    const { paperId, page } = get()
    if (paperId === null) {
      return
    }
    clearProgressTimer()
    progressTimer = setTimeout(() => {
      progressTimer = null
      // 防抖落库失败不上抛：进度属尽力而为，不打断阅读（下次翻页会再试）
      void api.reader.saveProgress({ paperId, page }).catch(() => undefined)
    }, PROGRESS_DEBOUNCE_MS)
  }

  return {
    ...createReaderStoreInitialState(),

    async openPaper(id) {
      const seq = ++openSeq
      const d = await unwrap(api.reader.open({ paperId: id }))
      if (seq !== openSeq) {
        return
      }
      const anns = await unwrap(api.reader.listAnnotations({ paperId: id }))
      if (seq !== openSeq) {
        return
      }
      // 整体替换打开状态（清掉上一篇的派生选中态：页码/标注数组）
      clearProgressTimer()
      set({
        paperId: id,
        fileUrl: d.fileUrl,
        fileName: d.fileName,
        page: d.lastReadPage,
        annotations: anns
      })
    },

    close() {
      // 抬序号让在途的 openPaper 失效，再整体复位
      openSeq += 1
      clearProgressTimer()
      set(createReaderStoreInitialState())
    },

    setPage(page) {
      // 0 基页码夹取到 [0, totalPages-1]；totalPages 未知（0）时由 PdfCanvas 侧兜底
      const clamped = Math.max(0, Math.min(Math.floor(page), get().totalPages - 1))
      set({ page: clamped })
      scheduleProgress()
    },

    setZoom(zoom) {
      set({ zoom: Math.min(3, Math.max(0.5, zoom)) })
    },

    setTotalPages(total) {
      set({ totalPages: Math.max(0, Math.floor(total)) })
    },

    setColor(color) {
      set({ color })
    },

    addAnnotation(a) {
      set({ annotations: [...get().annotations, a] })
    },

    updateAnnotation(a) {
      set({ annotations: get().annotations.map((x) => (x.id === a.id ? a : x)) })
    },

    removeAnnotation(id) {
      set({ annotations: get().annotations.filter((x) => x.id !== id) })
    }
  }
})
