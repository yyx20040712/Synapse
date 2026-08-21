/**
 * [SR-RDR-01] annotation-anchor —— 定位纯函数（工单：open / strong，Phase 3/4）
 *
 * ── 行为层 ──
 * - 文本偏移 ↔ DOM 范围 互转（WADM textQuote/textPosition 思路）：
 *   findRangeAtOffset(root: HTMLElement, start: number, end: number): DOMRange | null
 *   —— 遍历文本节点累计字符偏移，命中区间返回 { rects, range }
 * - verifyQuote(root, { prefix, quote, suffix, start }): number | null
 *   —— 用前缀/后缀/引文校验 startOffset 是否仍有效；失效时尝试重定位
 * - rectsFromRange(range, pageSize): AnnotationRect[]（归一化 0..1）
 *
 * ── 接口层 ──
 * - export interface DOMRange { rects: AnnotationRect[]; textNodes: Array<{ node: Text; offset: number }> }
 * - 上述三个函数签名如行为层（全部纯/幂等，无 React 依赖）
 *
 * ── 架构层 ──
 * - 全项目唯一操作 DOM 文本遍历的地方；SelectionLayer/AnnotationLayer 只调用它
 *
 * ── 生命周期层 ──
 * - 性能约束：单页千级文本节点 <10ms；不做跨页标注（v1 负面清单）
 *
 * ── 文化层 ──
 * - 测试：tests/unit/renderer/annotation-anchor.test.ts（已锁定，jsdom 环境跑 DOM 用例：
 *   基本命中/跨节点/前后缀漂移/重定位失败 返回 null）
 */
import { NotImplementedError } from '@shared/app-error'
import type { AnnotationRect } from '@shared/models/annotation'

export interface DOMRange {
  rects: AnnotationRect[]
  textNodes: Array<{ node: Text; offset: number }>
}

export function findRangeAtOffset(
  _root: HTMLElement,
  _start: number,
  _end: number
): DOMRange | null {
  throw new NotImplementedError('SR-RDR-01', 'findRangeAtOffset')
}

export function verifyQuote(
  _root: HTMLElement,
  _selector: { prefix: string; quote: string; suffix: string; start: number }
): number | null {
  throw new NotImplementedError('SR-RDR-01', 'verifyQuote')
}

export function rectsFromRange(_range: DOMRange, _pageSize: { w: number; h: number }): AnnotationRect[] {
  throw new NotImplementedError('SR-RDR-01', 'rectsFromRange')
}
