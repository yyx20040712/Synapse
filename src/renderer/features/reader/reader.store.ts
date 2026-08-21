/**
 * [SR-RDR-09] reader.store —— 阅读器状态（工单：open / weak）
 *
 * ── 行为层 ──
 * - 状态：{ paperId: string | null; fileUrl: string | null; fileName: string;
 *     page: number; totalPages: number; zoom: number; color: AnnotationColor;
 *     annotations: Annotation[] }
 * - openPaper(id)：unwrap(api.reader.open({ paperId })) 置 fileUrl/page（lastReadPage）；
 *   加载 annotations（api.reader.listAnnotations）
 * - setPage/zoom/color；saveProgress 防抖 2s（api.reader.saveProgress）
 * - addAnnotation/updateAnnotation/removeAnnotation：调 api 后刷新本地数组
 * - 错误契约（全 store 统一）：openPaper 属动作型——失败上抛（unwrap 的 ApiClientError），
 *   由调用组件 catch 后 toast，store 不吞错（锁定测试已按此断言）
 *
 * ── 接口层 ──
 * - export const useReaderStore: UseBoundStore<...>（形状如上）
 *
 * ── 架构层 ── / ── 生命周期层 ── / ── 文化层 ──
 * - 测试：tests/unit/renderer/reader.store.test.ts（已锁定，api 桩）
 */
import { create } from 'zustand'
import { NotImplementedError } from '@shared/app-error'
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

const notImpl = (method: string): never => {
  throw new NotImplementedError('SR-RDR-09', `reader.store.${method}`)
}

export const useReaderStore = create<ReaderStore>()(() => ({
  paperId: null,
  fileUrl: null,
  fileName: '',
  page: 0,
  totalPages: 0,
  zoom: 1,
  color: 'yellow',
  annotations: [],
  openPaper: (_id) => notImpl('openPaper'),
  close: () => notImpl('close'),
  setPage: (_p) => notImpl('setPage'),
  setZoom: (_z) => notImpl('setZoom'),
  setTotalPages: (_t) => notImpl('setTotalPages'),
  setColor: (_c) => notImpl('setColor'),
  addAnnotation: (_a) => notImpl('addAnnotation'),
  updateAnnotation: (_a) => notImpl('updateAnnotation'),
  removeAnnotation: (_id) => notImpl('removeAnnotation')
}))
