/**
 * 测试基建：renderer 域局部工厂共享单源（F-TESTREF-W1B）。
 *
 * 收敛面（同名多实例实测，票面 ×4/×3/×3/×2 为调研期口径、下列为当批实测）：
 * - makeTab：11 文件局部实例 → 本件 patch 形单源（tab-bar 形=最通用；其余
 *   签名形调用点机械改 patch——page 数字/annotations 数组/selectionMode
 *   布尔/pageLayout 字符串四形态，语义逐文件核对保持：outline-aside 的
 *   totalPages:20 与 annotations 联动进 patch）。
 * - makeAnnotation：3 文件逐字同形（仅 comment 参数化差异）→ 默认参形零改动。
 * - makeDetail：4 文件两种默认形 → makeDetail(patch)（基形=cited/notes-off）
 *   +makeDemoDetail()（演示形=export/clip——作者双人/DOI/计数 2/演示时间戳）。
 * - seedLineage：3 文件逐字同形（useLineageStore.setState 直植）→ 调用点
 *   seed( 改名 seedLineage(。
 * - mkItem/mkText/seedRegistry：各 ×4 → 单源（F-GEOM-01-G7 RoT 债销项=b14
 *   门一 W1 登记；seedRegistry 统一收敛参数化超集形，selection-evaluate 原
 *   两参固定版在默认参数下行为等价）。
 *
 * 边界：本件含 renderer store 值依赖（useLineageStore/usePageItemsStore+act）
 * ——node 环境 db 域测试禁 import 本件（用 fixtures.ts）；盒几何桩看
 * tests/utils/geometry.ts。
 * 命名规范句见 geometry.ts 头注。红线：R1 零 src 变更；C 面零变化指纹门。
 * 受锁文件。[test-refactor][locked-change]
 */
import { act } from 'react'
import type { TabState } from '../../src/renderer/features/reader/state/reader.store'
import type { Annotation } from '../../src/shared/models/annotation'
import type { PaperDetail } from '../../src/shared/models/paper'
import type { LineageEdge, LineageNode } from '../../src/shared/models/lineage'
import type { PdfTextContent, PdfTextItem } from '../../src/renderer/features/reader/anchors/geometry-types'
import { useLineageStore } from '../../src/renderer/features/lineage/lineage.store'
import { usePageItemsStore } from '../../src/renderer/features/reader/anchors/page-items.store'

/** ready 态完整 tab（patch 覆盖——tab-bar 形基样） */
export function makeTab(id: string, patch: Partial<TabState> = {}): TabState {
  return {
    paperId: id,
    fileUrl: `app-file://${id}`,
    fileName: `${id}.pdf`,
    title: '',
    page: 0,
    totalPages: 10,
    zoom: 1,
    color: 'yellow',
    annotations: [],
    status: 'ready',
    dirty: false,
    ...patch
  }
}

/** highlight 标注基样（comment 参数化——editor-ux/popups-autosave 形） */
export function makeAnnotation(comment = ''): Annotation {
  return {
    id: 'anno-1',
    paperId: 'paper-1',
    page: 0,
    kind: 'highlight',
    color: 'yellow',
    quoteText: '被标注的引文内容',
    prefixText: '前',
    suffixText: '后',
    startOffset: 1,
    endOffset: 10,
    rects: [{ page: 0, x: 0.1, y: 0.2, w: 0.3, h: 0.05 }],
    comment,
    createdAt: '2026-08-23T00:00:00Z',
    updatedAt: '2026-08-23T00:00:00Z'
  }
}

/** 文献详情基样（cited/notes-off 形：单作者/无 DOI/零标注/极简时间戳） */
export function makeDetail(patch: Partial<PaperDetail> = {}): PaperDetail {
  return {
    id: 'paper-1',
    title: '样例论文',
    authors: ['张三'],
    year: 2026,
    venue: 'Journal of Testing',
    doi: null,
    tagNames: [],
    folderId: null,
    impactFactor: null,
    annotationCount: 0,
    noteCount: 1,
    lastReadPage: 0,
    addedAt: 't',
    abstract: '',
    arxivId: null,
    source: 'local',
    enrichStatus: 'pending',
    fileUrl: 'app-file://paper-1',
    fileName: 'a.pdf',
    updatedAt: 't',
    tags: [],
    ...patch
  }
}

/** 文献详情演示形（export/clip 形：双人作者/DOI/2 标注/演示时间戳/摘要） */
export function makeDemoDetail(): PaperDetail {
  return makeDetail({
    authors: ['张三', '李四'],
    doi: '10.0000/demo',
    annotationCount: 2,
    addedAt: '2026-08-24T00:00:00Z',
    abstract: '摘要内容',
    fileName: 'demo.pdf',
    updatedAt: '2026-08-24T00:00:00Z'
  })
}

/** lineage store 植入（board/manual-edit/tag-edit 三文件逐字同形） */
export function seedLineage(nodes: LineageNode[], edges: LineageEdge[] = []): void {
  useLineageStore.setState({
    nodes,
    edges,
    lineTypeNames: ['待命名', '待命名', '待命名', '待命名', '待命名', '待命名'],
    status: 'ready',
    error: null,
    saveStatus: 'clean', // [F-LGRAPH-01②U1] 会话基线（saved→clean 概念反转）
    lastWriteError: null,
    queue: [],
    flushing: false,
    undoStack: [],
    redoStack: []
  })
}

/** 造项：transform=[10,0,0,10,x,y]（PDF 基线 (x,y)、字号 10、宽 100 高 10） */
export function mkItem(str: string, x: number, y: number): PdfTextItem {
  return { str, dir: 'ltr', width: 100, height: 10, transform: [10, 0, 0, 10, x, y], fontName: 'g1', hasEOL: false }
}

export function mkText(items: PdfTextItem[]): PdfTextContent {
  return { items, styles: { g1: { fontFamily: 'serif', ascent: 0.8, descent: -0.2, vertical: false } }, lang: null }
}

/** 注册表写入口（PagesOverlay handlePageRender 的等价载荷——页号 1 基） */
export function seedRegistry(no: number, text: PdfTextContent, rotate = 0, view: [number, number, number, number] = [0, 0, 612, 792]): void {
  act(() => {
    usePageItemsStore.getState().setEntry({ page: no, text, geometry: { rotate, view }, box: { w: 612, h: 792 } })
  })
}
