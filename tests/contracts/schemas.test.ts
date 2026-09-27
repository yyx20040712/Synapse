import { describe, expect, it } from 'vitest'
import type { z } from 'zod'
import * as S from '../../src/shared/ipc/schemas'

/**
 * [F-TESTREF-W3] src/shared/ipc/schemas.ts 直接契约测试——zod 边界矩阵。
 *
 * 闭合策略（本文件核心机制）：
 * - 夹具表 VALID 覆盖 schemas.ts 全部 zod 导出（运行时 Object.keys 对账）——
 *   新增 schema 漏配夹具、或删改 schema 后夹具名悬空，闭包用例即红；
 * - 每个对象形容器夹具做「加未知字段必拒收」探针——.strict() 命名约定
 *   （文件头注）逐导出 schema 的**首对象层**机器执行（嵌套模型层由专项
 *   探针用例锚定），不再靠 review 肉眼；
 * - 数值边界（min/max 三点界）走专项用例，夹具常量（NOTE_TITLE_MAX 等）
 *   从被测模块导入——常量与边界接线同源，改常量不改测试即红。
 * 新测试 always-active（不经 guardedDescribe——K3 威胁在三屋结构性缺位）。
 */

const ISO = '2026-01-01T00:00:00.000Z'

// ── 模型夹具（最小合法形——通道 schema 内嵌模型的传递覆盖面）──────────
const rect = { page: 0, x: 0.1, y: 0.2, w: 0.3, h: 0.02 }
const annotationInput = {
  page: 0,
  kind: 'highlight' as const,
  color: 'yellow' as const,
  quoteText: '水处理',
  prefixText: '',
  suffixText: '',
  startOffset: 0,
  endOffset: 2,
  rects: [rect],
  comment: ''
}
const annotation = { id: 'a1', paperId: 'p1', createdAt: ISO, updatedAt: ISO, ...annotationInput }
const paperSummary = {
  id: 'p1',
  title: '论文',
  authors: ['张三'],
  year: 2026,
  venue: 'Nature Water',
  doi: '10.1/x',
  tagNames: [],
  collectionNames: [],
  annotationCount: 0,
  noteCount: 0,
  lastReadPage: 0,
  addedAt: ISO
}
const note = { id: 'n1', paperId: 'p1', title: '题', contentMd: '# m', createdAt: ISO, updatedAt: ISO }
const collection = { id: 'c1', name: '组', position: 0 }
const lineageNode = {
  id: 'ln1',
  paperId: null,
  title: '主题',
  coreIdea: '',
  year: null,
  x: null,
  y: null,
  tags: null,
  month: null,
  slot: null,
  createdAt: ISO,
  updatedAt: ISO
}
const lineageEdge = {
  id: 'le1',
  fromNode: 'ln1',
  toNode: 'ln2',
  label: '',
  kind: 'tree' as const,
  sub: null,
  createdAt: ISO,
  updatedAt: ISO
}
const sensorStatus = {
  state: 'idle',
  currentPaper: null,
  role: null,
  updatedAt: ISO,
  heartbeatAt: ISO,
  running: false
}
const wsItem = { id: 'ws1', name: '课题', createdAt: ISO, paperCount: 0 }
const netDiagItem = { host: 'api.crossref.org', ok: true, latencyMs: -1 }

// ── 合法夹具全集（键 ⟷ schemas.ts zod 导出一一对应——闭包对账面）────────
const VALID: Record<string, unknown[]> = {
  voidReqSchema: [{}],
  libraryListResSchema: [{ items: [paperSummary], total: 1 }],
  paperIdReqSchema: [{ paperId: 'p1' }],
  updateMetaReqSchema: [
    { paperId: 'p1', patch: {} },
    { paperId: 'p1', patch: { title: '新题', year: null, doi: null } }
  ],
  collectionListResSchema: [[collection]],
  readerOpenResSchema: [{ fileUrl: 'app-file://p1', fileName: 'a.pdf', title: '论文', lastReadPage: 0 }],
  saveAnnotationReqSchema: [{ paperId: 'p1', annotation: annotationInput }],
  updateAnnotationReqSchema: [{ annotation }],
  annotationIdReqSchema: [{ annotationId: 'a1' }],
  annotationListResSchema: [[annotation]],
  saveProgressReqSchema: [
    { paperId: 'p1', page: 0 },
    { paperId: 'p1', page: 3 }
  ],
  trueAckSchema: [{ ok: true }],
  importPathsReqSchema: [{ paths: ['C:/a.pdf'] }],
  importResultSchema: [
    { imported: [paperSummary], duplicates: ['b.pdf'], failed: [{ fileName: 'c.pdf', reason: '损坏' }] }
  ],
  importProgressEventSchema: [{ phase: 'scanning', current: 0, total: 2, fileName: 'a.pdf', sessionId: 's1' }],
  enrichReqSchema: [{ paperId: 'p1' }],
  exportSelectionReqSchema: [{ paperIds: ['p1'] }],
  exportResSchema: [{ filePath: 'C:/out.bib', count: 1 }],
  reportReqSchema: [{ paperId: 'p1' }],
  clipboardReqSchema: [
    { format: 'bibtex', paperIds: ['p1'] },
    { format: 'csv', paperIds: ['p1'] }
  ],
  corpusItemReqSchema: [{ kind: 'fulltext', sessionId: 's1', paperId: 'p1', page: 1, payload: '# md' }],
  extractRequestEventSchema: [
    { type: 'extract-request', sessionId: 's1', paperId: 'p1', url: 'app-file://p1', annotations: [{ id: 'a1', rects: [rect] }] }
  ],
  exportProgressEventSchema: [{ type: 'progress', sessionId: 's1', done: 0, total: 2, phase: 'preparing' }],
  corpusSessionReqSchema: [{}, { paperIds: ['p1'] }],
  corpusSessionResSchema: [{ dir: 'C:/out', fileCount: 2, errorCount: 0 }],
  aiReadJobResSchema: [{ jobId: 'j1' }],
  sensorStatusSchema: [sensorStatus],
  aiSensorStatusResSchema: [null, sensorStatus],
  observeResSchema: [
    { status: null, hasPendingJob: false, productExists: false, archivedExists: false },
    { status: sensorStatus, hasPendingJob: true, productExists: true, archivedExists: false }
  ],
  aiNotesImportResSchema: [
    { imported: ['p1'], skipped: ['p2'], errors: [{ paperId: 'p3', reason: '缺字段' }] }
  ],
  zcodeLinkDetectResSchema: [
    { state: 'installed-idle', status: null, overwrite: false },
    { state: 'error', status: sensorStatus, overwrite: true, reason: '读取失败' }
  ],
  zcodeLinkInstallResSchema: [{ fileCount: 3 }],
  lineageImportResSchema: [
    { ok: true, nodeCount: 1, edgeCount: 0 },
    { ok: false, errors: [{ path: 'nodes[0]', reason: 'title 不能为空' }] }
  ],
  lineagePaperMetricsSchema: [
    { citedByCount: null, venueTier: null },
    { citedByCount: 3, venueTier: 'T2' }
  ],
  lineageGraphResSchema: [
    {
      nodes: [lineageNode],
      edges: [lineageEdge],
      paperMetrics: { p1: { citedByCount: 1, venueTier: 'T1' } },
      lineTypes: [
        { base: 'tree', subs: [{ id: 'lt1', name: '强继承', color: '#F2773A', dash: '', w: 2 }] },
        { base: 'inferred', subs: [] },
        { base: 'ref', subs: [] },
        { base: 'manual', subs: [] }
      ]
    }
  ],
  lineageUpsertNodeReqSchema: [
    { title: '新节点', coreIdea: '', year: null },
    { id: 'ln1', paperId: 'p1', title: 't', coreIdea: '', year: 2020, x: 1, y: 2, tags: ['a'] },
    { title: '带月', coreIdea: '', year: 2020, month: 6, slot: 1 }
  ],
  lineageIdReqSchema: [{ id: 'ln1' }],
  lineageUpsertEdgeReqSchema: [
    { from: 'a', to: 'b' },
    { id: 'le1', from: 'a', to: 'b', label: 'L', kind: 'ref' },
    { from: 'a', to: 'c', label: 'L', kind: 'manual', sub: 'lt1' }
  ],
  lineageUpsertLineTypesReqSchema: [
    [
      { base: 'tree', subs: [] },
      { base: 'inferred', subs: [] },
      { base: 'ref', subs: [] },
      { base: 'manual', subs: [] }
    ]
  ],
  corpusReqSchema: [{ paperId: 'p1' }],
  corpusSetReqSchema: [{}],
  corpusSetResSchema: [{ filePath: 'C:/corpus.md', count: 1, skipped: [{ paperId: 'p2', reason: '无文件' }] }],
  tagWithCountSchema: [{ id: 't1', name: '标签', paperCount: 0 }],
  tagNameReqSchema: [{ name: '标签' }],
  attachTagReqSchema: [{ paperId: 'p1', tagId: 't1' }],
  detachTagReqSchema: [{ paperId: 'p1', tagId: 't1' }],
  tagIdReqSchema: [{ tagId: 't1' }],
  renameTagReqSchema: [{ tagId: 't1', name: '新名' }],
  mergeTagReqSchema: [{ sourceId: 't1', targetId: 't2' }],
  noteGetResSchema: [null, note],
  noteSaveReqSchema: [{ paperId: 'p1', title: '', contentMd: '' }],
  noteIdReqSchema: [{ noteId: 'n1' }],
  workspaceItemSchema: [wsItem],
  workspaceListResSchema: [{ items: [wsItem], currentId: 'ws1' }],
  workspaceCreateReqSchema: [{ name: '课题' }],
  workspaceCreateResSchema: [{ id: 'ws1' }],
  workspaceRenameReqSchema: [{ id: 'ws1', name: '课题二' }],
  workspaceSwitchReqSchema: [{ id: 'ws1' }],
  uiScaleSchema: ['small', 'medium', 'large'],
  appSettingsSchema: [
    { contactEmail: 'user@example.com' },
    { contactEmail: 'user@example.com', theme: 'dark', uiScale: 'large' }
  ],
  netDiagItemSchema: [netDiagItem],
  netDiagResSchema: [[netDiagItem], []],
  openExternalReqSchema: [{ url: 'https://example.com' }],
  setQuitDirtyReqSchema: [{ dirty: false }, { dirty: true }],
  windowControlActionSchema: ['minimize', 'maximize-toggle', 'close', 'get-state'],
  windowControlReqSchema: [{ action: 'close' }],
  windowStateEventSchema: [{ maximized: false }],
  windowControlResSchema: [{ ok: true, maximized: true }]
}

/** 夹具表键清单（字面量数组——it.each 展开与闭包对账双消费） */
const SCHEMA_NAMES = [
  'aiNotesImportResSchema',
  'aiReadJobResSchema',
  'aiSensorStatusResSchema',
  'annotationIdReqSchema',
  'annotationListResSchema',
  'appSettingsSchema',
  'attachTagReqSchema',
  'clipboardReqSchema',
  'collectionListResSchema',
  'corpusItemReqSchema',
  'corpusReqSchema',
  'corpusSessionReqSchema',
  'corpusSessionResSchema',
  'corpusSetReqSchema',
  'corpusSetResSchema',
  'detachTagReqSchema',
  'enrichReqSchema',
  'exportProgressEventSchema',
  'exportResSchema',
  'exportSelectionReqSchema',
  'extractRequestEventSchema',
  'importPathsReqSchema',
  'importProgressEventSchema',
  'importResultSchema',
  'libraryListResSchema',
  'lineageGraphResSchema',
  'lineageIdReqSchema',
  'lineageImportResSchema',
  'lineagePaperMetricsSchema',
  'lineageUpsertEdgeReqSchema',
  'lineageUpsertLineTypesReqSchema',
  'lineageUpsertNodeReqSchema',
  'mergeTagReqSchema',
  'netDiagItemSchema',
  'netDiagResSchema',
  'noteGetResSchema',
  'noteIdReqSchema',
  'noteSaveReqSchema',
  'observeResSchema',
  'openExternalReqSchema',
  'paperIdReqSchema',
  'readerOpenResSchema',
  'renameTagReqSchema',
  'reportReqSchema',
  'saveAnnotationReqSchema',
  'saveProgressReqSchema',
  'sensorStatusSchema',
  'setQuitDirtyReqSchema',
  'tagIdReqSchema',
  'tagNameReqSchema',
  'tagWithCountSchema',
  'trueAckSchema',
  'uiScaleSchema',
  'updateAnnotationReqSchema',
  'updateMetaReqSchema',
  'voidReqSchema',
  'windowControlActionSchema',
  'windowControlReqSchema',
  'windowControlResSchema',
  'windowStateEventSchema',
  'workspaceCreateReqSchema',
  'workspaceCreateResSchema',
  'workspaceItemSchema',
  'workspaceListResSchema',
  'workspaceRenameReqSchema',
  'workspaceSwitchReqSchema',
  'zcodeLinkDetectResSchema',
  'zcodeLinkInstallResSchema'
]

function isZodSchema(v: unknown): boolean {
  return typeof v === 'object' && v !== null && typeof (v as { safeParse?: unknown }).safeParse === 'function'
}
function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}
/** 容器夹具注入未知字段（数组形=逐元素注入对象元素）——strict 探针载荷 */
function withExtra(value: unknown): unknown {
  if (Array.isArray(value)) return value.map((el) => (isPlainObject(el) ? { ...el, __closureProbe: 1 } : el))
  if (isPlainObject(value)) return { ...value, __closureProbe: 1 }
  return value
}
/** 夹具是否存在对象面（字符串/纯 null 夹具无未知字段面，交枚举专项用例） */
function hasObjectFace(v: unknown): boolean {
  if (isPlainObject(v)) return true
  if (Array.isArray(v)) return v.some(isPlainObject)
  return false
}
function schemaByName(name: string): z.ZodType {
  const record = S as unknown as Record<string, unknown>
  const schema = record[name]
  if (!isZodSchema(schema)) throw new Error(`schemas.ts 无 zod 导出 ${name}`)
  return schema as z.ZodType
}

describe('contracts/schemas —— zod 边界矩阵（schemas.ts 全导出直接契约）', () => {
  it('导出闭合：schemas.ts 全部 zod 导出 ⟷ 夹具表键 ⟷ 用例清单三方一致', () => {
    const runtimeZodExports = Object.entries(S)
      .filter(([, v]) => isZodSchema(v))
      .map(([k]) => k)
      .sort()
    expect(Object.keys(VALID).sort(), '夹具表漏配或多配（新增 schema 须同步 VALID+SCHEMA_NAMES）').toEqual(runtimeZodExports)
    expect([...SCHEMA_NAMES].sort(), 'it.each 清单与夹具表漂移').toEqual(runtimeZodExports)
  })

  it.each(SCHEMA_NAMES)('%s：合法夹具全过 + 对象面夹具加未知字段必拒（strict 闭合）', (name) => {
    const schema = schemaByName(name)
    const fixtures = VALID[name]
    if (!fixtures) throw new Error(`夹具表缺 ${name}（新增 schema 须同步 VALID+SCHEMA_NAMES）`)
    expect(fixtures.length, `${name} 夹具表为空`).toBeGreaterThan(0)
    for (const fixture of fixtures) {
      expect(schema.safeParse(fixture).success, `${name} 应接受合法夹具 ${JSON.stringify(fixture).slice(0, 80)}`).toBe(true)
    }
    for (const fixture of fixtures.filter(hasObjectFace)) {
      expect(schema.safeParse(withExtra(fixture)).success, `${name} 应拒绝未知字段（strict 命名约定）`).toBe(false)
    }
  })

  it('saveProgress：page 负数拒；旧时长载荷 secondsDelta 已随 F-TIME-02 移除=strict 拒收未知字段', () => {
    const base = { paperId: 'p1', page: 0 }
    expect(S.saveProgressReqSchema.safeParse(base).success).toBe(true)
    expect(S.saveProgressReqSchema.safeParse({ paperId: 'p1', page: -1 }).success).toBe(false)
    // [F-TIME-02] 2026-09-19 用户裁决移除阅读时长：secondsDelta 载荷退役=
    // strict 命名约定拒收（本地单机应用无跨版本混跑面）
    expect(S.saveProgressReqSchema.safeParse({ ...base, secondsDelta: 60 }).success).toBe(false)
  })

  it('importPaths：数量门 1/100 过、0/101 拒；路径空串拒（第二道门——第一道在 preload）', () => {
    const paths = (n: number): string[] => Array.from({ length: n }, (_, i) => `C:/${i}.pdf`)
    expect(S.importPathsReqSchema.safeParse({ paths: paths(1) }).success).toBe(true)
    expect(S.importPathsReqSchema.safeParse({ paths: paths(100) }).success).toBe(true)
    expect(S.importPathsReqSchema.safeParse({ paths: paths(0) }).success).toBe(false)
    expect(S.importPathsReqSchema.safeParse({ paths: paths(101) }).success).toBe(false)
    expect(S.importPathsReqSchema.safeParse({ paths: [''] }).success).toBe(false)
  })

  it('exportSelection：paperIds 1/1000 过、0/1001 拒', () => {
    const ids = (n: number): string[] => Array.from({ length: n }, (_, i) => `p${i}`)
    expect(S.exportSelectionReqSchema.safeParse({ paperIds: ids(1) }).success).toBe(true)
    expect(S.exportSelectionReqSchema.safeParse({ paperIds: ids(1000) }).success).toBe(true)
    expect(S.exportSelectionReqSchema.safeParse({ paperIds: ids(0) }).success).toBe(false)
    expect(S.exportSelectionReqSchema.safeParse({ paperIds: ids(1001) }).success).toBe(false)
  })

  it('corpusSession：paperIds 缺省过（全库）、0 条/1001 条拒', () => {
    expect(S.corpusSessionReqSchema.safeParse({}).success).toBe(true)
    expect(S.corpusSessionReqSchema.safeParse({ paperIds: ['p1'] }).success).toBe(true)
    expect(S.corpusSessionReqSchema.safeParse({ paperIds: [] }).success).toBe(false)
    expect(
      S.corpusSessionReqSchema.safeParse({ paperIds: Array.from({ length: 1001 }, (_, i) => `p${i}`) }).success
    ).toBe(false)
  })

  it('标签与课题名长度界：标签 1/50 字过、51 字/空串拒（upsert/rename 同界）；课题名 40/41 界', () => {
    expect(S.tagNameReqSchema.safeParse({ name: '课' }).success).toBe(true)
    expect(S.tagNameReqSchema.safeParse({ name: '课'.repeat(50) }).success).toBe(true)
    expect(S.tagNameReqSchema.safeParse({ name: '课'.repeat(51) }).success).toBe(false)
    expect(S.tagNameReqSchema.safeParse({ name: '' }).success).toBe(false)
    expect(S.renameTagReqSchema.safeParse({ tagId: 't1', name: '课'.repeat(51) }).success).toBe(false)
    expect(S.workspaceCreateReqSchema.safeParse({ name: '课'.repeat(S.WORKSPACE_NAME_MAX) }).success).toBe(true)
    expect(S.workspaceCreateReqSchema.safeParse({ name: '课'.repeat(S.WORKSPACE_NAME_MAX + 1) }).success).toBe(false)
  })

  it('noteSave 标题界=NOTE_TITLE_MAX 常量接线：N 过、N+1 拒（INV-11 单一真相源）', () => {
    expect(S.NOTE_TITLE_MAX).toBe(200)
    expect(S.noteSaveReqSchema.safeParse({ paperId: 'p1', title: '题'.repeat(S.NOTE_TITLE_MAX), contentMd: '' }).success).toBe(true)
    expect(S.noteSaveReqSchema.safeParse({ paperId: 'p1', title: '题'.repeat(S.NOTE_TITLE_MAX + 1), contentMd: '' }).success).toBe(false)
  })

  it('extractRequestEvent：annotations 上界 5000 过、5001 拒', () => {
    const annos = (n: number): unknown[] => Array.from({ length: n }, (_, i) => ({ id: `a${i}`, rects: [] }))
    const payload = (n: number): unknown => ({
      type: 'extract-request',
      sessionId: 's1',
      paperId: 'p1',
      url: 'app-file://p1',
      annotations: annos(n)
    })
    expect(S.extractRequestEventSchema.safeParse(payload(5000)).success).toBe(true)
    expect(S.extractRequestEventSchema.safeParse(payload(5001)).success).toBe(false)
  })

  it('openExternal：url 长度界 2048 过、2049/空串拒', () => {
    expect(S.openExternalReqSchema.safeParse({ url: 'a'.repeat(2048) }).success).toBe(true)
    expect(S.openExternalReqSchema.safeParse({ url: 'a'.repeat(2049) }).success).toBe(false)
    expect(S.openExternalReqSchema.safeParse({ url: '' }).success).toBe(false)
  })

  it('corpusItem 判别联合：四 kind 各过；anno 缺 annotationId 拒、page 带 annotationId 拒（refine）；未知 kind 拒', () => {
    const base = { sessionId: 's1', paperId: 'p1', page: 1, payload: '# md' }
    expect(S.corpusItemReqSchema.safeParse({ ...base, kind: 'fulltext' }).success).toBe(true)
    expect(S.corpusItemReqSchema.safeParse({ ...base, kind: 'figure', figure: 'page' }).success).toBe(true)
    expect(
      S.corpusItemReqSchema.safeParse({ ...base, kind: 'figure', figure: 'anno', annotationId: 'a1' }).success
    ).toBe(true)
    expect(S.corpusItemReqSchema.safeParse({ sessionId: 's1', paperId: 'p1', kind: 'complete' }).success).toBe(true)
    expect(S.corpusItemReqSchema.safeParse({ sessionId: 's1', paperId: 'p1', kind: 'error', reason: 'x' }).success).toBe(true)
    expect(S.corpusItemReqSchema.safeParse({ ...base, kind: 'figure', figure: 'anno' }).success).toBe(false)
    expect(
      S.corpusItemReqSchema.safeParse({ ...base, kind: 'figure', figure: 'page', annotationId: 'a1' }).success
    ).toBe(false)
    expect(S.corpusItemReqSchema.safeParse({ ...base, kind: 'bogus' }).success).toBe(false)
  })

  it('lineageImportRes 两臂互斥：ok:true 带 errors 拒、ok:false 缺 errors 拒、ok 非字面量拒', () => {
    expect(S.lineageImportResSchema.safeParse({ ok: true, nodeCount: 0, edgeCount: 0, errors: [] }).success).toBe(false)
    expect(S.lineageImportResSchema.safeParse({ ok: false }).success).toBe(false)
    expect(S.lineageImportResSchema.safeParse({ ok: 'yes', nodeCount: 0, edgeCount: 0 }).success).toBe(false)
  })

  it('lineagePaperMetrics null 语义：citedByCount null/0 均过（0=值非缺）；venueTier 三档过、T9 拒', () => {
    expect(S.lineagePaperMetricsSchema.safeParse({ citedByCount: 0, venueTier: null }).success).toBe(true)
    expect(S.lineagePaperMetricsSchema.safeParse({ citedByCount: null, venueTier: 'T1' }).success).toBe(true)
    expect(S.lineagePaperMetricsSchema.safeParse({ citedByCount: null, venueTier: 'T3' }).success).toBe(true)
    expect(S.lineagePaperMetricsSchema.safeParse({ citedByCount: null, venueTier: 'T9' }).success).toBe(false)
  })

  it('嵌套模型层 strict 探针：rects/patch/failed/skipped/errors/annotations 元素与 paperMetrics 值去 strict 即红（首层探针覆盖不到的第二层）', () => {
    const badRect = { ...rect, __nestedProbe: 1 }
    expect(S.saveAnnotationReqSchema.safeParse({ paperId: 'p1', annotation: { ...annotationInput, rects: [badRect] } }).success).toBe(false)
    expect(S.annotationListResSchema.safeParse([{ ...annotation, rects: [badRect] }]).success).toBe(false)
    expect(S.updateMetaReqSchema.safeParse({ paperId: 'p1', patch: { title: 't', __nestedProbe: 1 } }).success).toBe(false)
    expect(S.importResultSchema.safeParse({ imported: [], duplicates: [], failed: [{ fileName: 'f', reason: 'r', __nestedProbe: 1 }] }).success).toBe(false)
    expect(S.corpusSetResSchema.safeParse({ filePath: 'x', count: 1, skipped: [{ paperId: 'p', reason: 'r', __nestedProbe: 1 }] }).success).toBe(false)
    expect(S.aiNotesImportResSchema.safeParse({ imported: [], skipped: [], errors: [{ paperId: 'p', reason: 'r', __nestedProbe: 1 }] }).success).toBe(false)
    expect(
      S.extractRequestEventSchema.safeParse({ type: 'extract-request', sessionId: 's', paperId: 'p', url: 'u', annotations: [{ id: 'a', rects: [], __nestedProbe: 1 }] }).success
    ).toBe(false)
    expect(
      S.lineageGraphResSchema.safeParse({ nodes: [], edges: [], paperMetrics: { p1: { citedByCount: 1, venueTier: 'T1', __nestedProbe: 1 } } }).success
    ).toBe(false)
  })

  it('appSettings：缺省填充 theme=light/uiScale=small；非法 email/theme/uiScale 拒（T3-P1 枚举退役 system）', () => {
    expect(S.appSettingsSchema.parse({ contactEmail: 'user@example.com' })).toEqual({
      contactEmail: 'user@example.com',
      theme: 'light',
      uiScale: 'small'
    })
    expect(S.appSettingsSchema.safeParse({ contactEmail: 'not-an-email' }).success).toBe(false)
    expect(S.appSettingsSchema.safeParse({ contactEmail: 'user@example.com', theme: 'blue' }).success).toBe(false)
    expect(S.appSettingsSchema.safeParse({ contactEmail: 'user@example.com', uiScale: 'huge' }).success).toBe(false)
  })

  it('UI_SCALE 映射与 uiScaleSchema 枚举闭合：三档键一致；数值 pin 1/1.1/1.25（--ui-scale 消费契约）', () => {
    expect(Object.keys(S.UI_SCALE).sort()).toEqual([...S.uiScaleSchema.options].sort())
    expect(S.UI_SCALE).toEqual({ small: 1, medium: 1.1, large: 1.25 })
  })

  it('windowControlAction 四动作枚举 pin（action 枚举只住此处——renderer 复用禁手写第二份）', () => {
    expect([...S.windowControlActionSchema.options]).toEqual(['minimize', 'maximize-toggle', 'close', 'get-state'])
    expect(S.windowControlReqSchema.safeParse({ action: 'bogus' }).success).toBe(false)
  })

  it('trueAck/windowControlRes 拒 ok:false（literal(true) 单值域）', () => {
    expect(S.trueAckSchema.safeParse({ ok: false }).success).toBe(false)
    expect(S.windowControlResSchema.safeParse({ ok: false, maximized: true }).success).toBe(false)
  })

  it('netDiagItem latencyMs：-1（超时哨兵）过、-2 拒', () => {
    expect(S.netDiagItemSchema.safeParse({ host: 'h', ok: false, latencyMs: -1 }).success).toBe(true)
    expect(S.netDiagItemSchema.safeParse({ host: 'h', ok: false, latencyMs: -2 }).success).toBe(false)
  })

  it('内联枚举基数 pin：clipboard format 两值/zcodeLinkDetect state 五值/导入导出事件 phase 四与三值（新增枚举值须意识化更新）', () => {
    expect([...(S.clipboardReqSchema.shape.format.options)]).toEqual(['bibtex', 'csv'])
    expect([...(S.zcodeLinkDetectResSchema.shape.state.options)]).toEqual([
      'zcode-not-found',
      'found-skill-missing',
      'installed-idle',
      'running',
      'error'
    ])
    expect([...(S.importProgressEventSchema.shape.phase.options)]).toEqual(['scanning', 'copying', 'extracting', 'done'])
    expect([...(S.exportProgressEventSchema.shape.phase.options)]).toEqual(['preparing', 'streaming', 'finalizing'])
  })

  it('zcodeLinkDetect 五态枚举探针：各态过、bogus 拒（四呈现态+error）', () => {
    for (const state of ['zcode-not-found', 'found-skill-missing', 'installed-idle', 'running', 'error'] as const) {
      expect(S.zcodeLinkDetectResSchema.safeParse({ state, status: null, overwrite: false }).success, `态 ${state} 应合法`).toBe(true)
    }
    expect(S.zcodeLinkDetectResSchema.safeParse({ state: 'bogus', status: null, overwrite: false }).success).toBe(false)
  })

  it('id 类字段空串拒（paperId/annotationId/tagId/noteId/lineage id——min(1) 全位探针）', () => {
    expect(S.paperIdReqSchema.safeParse({ paperId: '' }).success).toBe(false)
    expect(S.annotationIdReqSchema.safeParse({ annotationId: '' }).success).toBe(false)
    expect(S.tagIdReqSchema.safeParse({ tagId: '' }).success).toBe(false)
    expect(S.noteIdReqSchema.safeParse({ noteId: '' }).success).toBe(false)
    expect(S.lineageIdReqSchema.safeParse({ id: '' }).success).toBe(false)
  })

  it('aiSensorStatusRes/noteGetRes 可空两形：null 与对象均过（null=status.json 不存在/无笔记的合法态）', () => {
    expect(S.aiSensorStatusResSchema.safeParse(null).success).toBe(true)
    expect(S.noteGetResSchema.safeParse(null).success).toBe(true)
    expect(S.noteGetResSchema.safeParse(undefined).success).toBe(false)
  })
})
