/**
 * [SR-RDR-09] reader.store —— 阅读器状态（工单：done / weak）
 *
 * ── 行为层 ──
 * - 状态：{ paperId: string | null; fileUrl: string | null; fileName: string;
 *     page: number; totalPages: number; zoom: number; color: AnnotationColor;
 *     annotations: Annotation[] }
 * - openPaper(id)：unwrap(api.reader.open({ paperId })) 置 fileUrl/page（lastReadPage，
 *   此处不夹取——totalPages 在 ReaderPage 拿到页数前为 0）；加载 annotations
 *   （api.reader.listAnnotations）；带请求序号 stale-guard：并发打开时晚到的
 *   旧响应直接丢弃，不得覆盖新文献
 * - setPage/zoom/color；setPage 夹取 0..totalPages-1（页码 0 基）并触发
 *   saveProgress 2s 防抖（api.reader.saveProgress，换文献/关闭时取消待写）
 * - addAnnotation/updateAnnotation/removeAnnotation：本地数组同步操作——
 *   api 调用属 SelectionLayer/AnnotationLayer 组件职责（spec 措辞"调 api 后刷新
 *   本地数组"即此流程），成功后经这三个方法刷新本地状态（锁定测试按同步语义断言）
 *
 * ── 接口层 ──
 * - export const useReaderStore: UseBoundStore<...>（形状如上）
 *
 * ── 架构层 ──
 * - 只 import api/client 与 shared 模型；禁止 import 组件
 * - 错误契约（全 store 统一）：openPaper 属动作型——失败上抛（unwrap 的 ApiClientError），
 *   由调用组件 catch 后 toast，store 不吞错、不写半开状态（锁定测试已按此断言）
 *
 * ── 生命周期层 ── / ── 文化层 ──
 * - 测试：tests/unit/renderer/reader.store.test.ts（已锁定，api 桩）
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
