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
  // [F-FOLDER-01] collectionNames 退役——folderId/impactFactor 必携（可空）
  folderId: null,
  impactFactor: null,
  annotationCount: 0,
  noteCount: 0,
  lastReadPage: 0,
  addedAt: ISO
}
const note = { id: 'n1', paperId: 'p1', contentMd: '# m', createdAt: ISO, updatedAt: ISO }
const collection = { id: 'c1', name: '组', position: 0 }
const lineageNode = {
  id: 'ln1',
  paperId: null,
  title: '主题',
  coreIdea: '',
  year: null,
  x: null,
  y: null,
  month: null,
  slot: null,
  folderId: '__main__', // [F-FOLDER-01] 节点图归属必填
  createdAt: ISO,
  updatedAt: ISO
}
const lineageEdge = {
  id: 'le1',
  fromNode: 'ln1',
  toNode: 'ln2',
  label: '',
  dashed: false, // [F-LGRAPH-01②U8] 视觉线型内联（kind/sub 退役）
  color: '#3a5bd9',
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
  // [F-FOLDER-01] 文件夹域+双事件+图读入参
  folderSchema: [{ id: 'f1', name: '图一', position: 0, paperCount: 0 }],
  folderCreateReqSchema: [{ name: '图一' }],
  folderRenameReqSchema: [{ id: 'f1', name: '新名' }],
  folderDeleteReqSchema: [{ id: 'f1' }],
  // [F-ALIGN-01 D5] toFolderId 收紧 string（null=移出→未归档路径退役）
  paperMoveReqSchema: [{ paperId: 'p1', toFolderId: 'f1' }],
  // [F-UIRES-01 批 B] papers/delete 载荷（文献域单源——models/paper）
  paperDeleteReqSchema: [{ paperId: 'p1' }],
  foldersChangedEventSchema: [{}],
  lineageChangedEventSchema: [{}],
  lineageGraphReqSchema: [{}, { folderId: 'f1' }],
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
  // [F-ALIGN-01 D3] 导入三通道 Req 必携 targetFolderId（INV-NEW-2 主锚契约面）
  importPathsReqSchema: [{ paths: ['C:/a.pdf'], targetFolderId: 'f1' }],
  importTargetReqSchema: [{ targetFolderId: 'f1' }],
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
  lineagePaperMetricsSchema: [
    { citedByCount: null, venueTier: null },
    { citedByCount: 3, venueTier: 'T2' }
  ],
  lineageGraphResSchema: [
    {
      nodes: [lineageNode],
      edges: [lineageEdge],
      pubNos: { p1: 3 }, // [F-FOLDER-01] 库级编号表（键=paperId）
      paperMetrics: { p1: { citedByCount: 1, venueTier: 'T1' } },
      lineTypeNames: ['主线', '待命名', '待命名', '待命名', '待命名', '待命名'], // [F-LGRAPH-01②U8] 色行名（恰 6）
      tagNames: { p1: ['方法', '流域'] } // [A1a] 文献库标签名组表（键=paperId，值=名序）
    }
  ],
  // [F-ALIGN-01] upsert-node 通道退役（新建形态结构性不可表达）——patch-node
  // 白名单=id+七编辑字段（[A1b] tags 已随标签域退役删除；coreIdea=A3 遗留面）
  lineagePatchNodeReqSchema: [
    { id: 'ln1' },
    { id: 'ln1', x: 1, y: 2 },
    { id: 'ln1', title: 't', coreIdea: '', year: 2020, month: 6, slot: 1 },
    { id: 'ln1', month: null }
  ],
  lineageIdReqSchema: [{ id: 'ln1' }],
  lineageUpsertEdgeReqSchema: [
    { from: 'a', to: 'b' },
    { id: 'le1', from: 'a', to: 'b', label: 'L' },
    { from: 'a', to: 'c', label: 'L', dashed: true, color: '#c07a2a' } // [F-LGRAPH-01②U8] 视觉内联
  ],
  lineageUpsertLineTypesReqSchema: [
    ['主线', '待命名', '待命名', '待命名', '待命名', '待命名'] // [②U8] 色行名恰 6
  ],
  corpusReqSchema: [{ paperId: 'p1' }],
  tagWithCountSchema: [
    { id: 't1', name: '标签', paperCount: 0, color: null },
    { id: 't2', name: '彩标', paperCount: 3, color: '#0ea5e9' }
  ],
  tagNameReqSchema: [{ name: '标签' }],
  attachTagReqSchema: [{ paperId: 'p1', tagId: 't1' }],
  detachTagReqSchema: [{ paperId: 'p1', tagId: 't1' }],
  tagIdReqSchema: [{ tagId: 't1' }],
  renameTagReqSchema: [{ tagId: 't1', name: '新名' }],
  mergeTagReqSchema: [{ sourceId: 't1', targetId: 't2' }],
  tagSetColorReqSchema: [{ tagId: 't1', color: '#e11d48' }, { tagId: 't1', color: null }],
  noteGetResSchema: [null, note],
  noteSaveReqSchema: [{ paperId: 'p1', contentMd: '' }],
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
  'detachTagReqSchema',
  'enrichReqSchema',
  'exportProgressEventSchema',
  'folderCreateReqSchema',
  'folderDeleteReqSchema',
  'folderRenameReqSchema',
  'folderSchema',
  'foldersChangedEventSchema',
  'exportResSchema',
  'exportSelectionReqSchema',
  'extractRequestEventSchema',
  'importPathsReqSchema',
  'importProgressEventSchema',
  'importResultSchema',
  'importTargetReqSchema',
  'libraryListResSchema',
  'lineageChangedEventSchema',
  'lineageGraphReqSchema',
  'lineageGraphResSchema',
  'lineageIdReqSchema',
  'lineagePaperMetricsSchema',
  'lineagePatchNodeReqSchema',
  'lineageUpsertEdgeReqSchema',
  'lineageUpsertLineTypesReqSchema',
  'mergeTagReqSchema',
  'netDiagItemSchema',
  'netDiagResSchema',
  'noteGetResSchema',
  'noteIdReqSchema',
  'noteSaveReqSchema',
  'observeResSchema',
  'openExternalReqSchema',
  'paperIdReqSchema',
  'paperDeleteReqSchema',
  'paperMoveReqSchema',
  'readerOpenResSchema',
  'renameTagReqSchema',
  'reportReqSchema',
  'saveAnnotationReqSchema',
  'saveProgressReqSchema',
  'sensorStatusSchema',
  'setQuitDirtyReqSchema',
  'tagIdReqSchema',
  'tagNameReqSchema',
  'tagSetColorReqSchema',
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
    expect(S.importPathsReqSchema.safeParse({ paths: paths(1), targetFolderId: 'f1' }).success).toBe(true)
    expect(S.importPathsReqSchema.safeParse({ paths: paths(100), targetFolderId: 'f1' }).success).toBe(true)
    expect(S.importPathsReqSchema.safeParse({ paths: paths(0), targetFolderId: 'f1' }).success).toBe(false)
    expect(S.importPathsReqSchema.safeParse({ paths: paths(101), targetFolderId: 'f1' }).success).toBe(false)
    expect(S.importPathsReqSchema.safeParse({ paths: [''], targetFolderId: 'f1' }).success).toBe(false)
  })

  it('[F-ALIGN-01] 导入三通道 targetFolderId 必填（INV-NEW-2 主锚契约面——缺省/null/空串全拒）+paperMoveReq null 拒（D5 未归档域退役）', () => {
    // 拖拽通道（from-paths）：缺省/null/空串拒——null 不达 importOne 落夹赋值
    expect(S.importPathsReqSchema.safeParse({ paths: ['C:/a.pdf'] }).success).toBe(false)
    expect(S.importPathsReqSchema.safeParse({ paths: ['C:/a.pdf'], targetFolderId: null }).success).toBe(false)
    expect(S.importPathsReqSchema.safeParse({ paths: ['C:/a.pdf'], targetFolderId: '' }).success).toBe(false)
    // 对话框/文件夹两通道（importTargetReqSchema）：缺省/null/空串拒
    for (const bad of [undefined, null, '']) {
      expect(S.importTargetReqSchema.safeParse({ targetFolderId: bad }).success, `targetFolderId=${String(bad)} 应拒`).toBe(false)
    }
    // 移动载荷：toFolderId null/空串拒（「移出→未归档」路径契约面消亡）
    expect(S.paperMoveReqSchema.safeParse({ paperId: 'p1', toFolderId: null }).success).toBe(false)
    expect(S.paperMoveReqSchema.safeParse({ paperId: 'p1', toFolderId: '' }).success).toBe(false)
    expect(S.paperMoveReqSchema.safeParse({ paperId: 'p1', toFolderId: 'f1' }).success).toBe(true)
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

  it('lineagePaperMetrics null 语义：citedByCount null/0 均过（0=值非缺）；venueTier 三档过、T9 拒', () => {
    expect(S.lineagePaperMetricsSchema.safeParse({ citedByCount: 0, venueTier: null }).success).toBe(true)
    expect(S.lineagePaperMetricsSchema.safeParse({ citedByCount: null, venueTier: 'T1' }).success).toBe(true)
    expect(S.lineagePaperMetricsSchema.safeParse({ citedByCount: null, venueTier: 'T3' }).success).toBe(true)
    expect(S.lineagePaperMetricsSchema.safeParse({ citedByCount: null, venueTier: 'T9' }).success).toBe(false)
  })

  it('[F-ALIGN-01] lineagePatchNodeReq：id 必填拒缺/空串；白名单外字段 strict 拒；paperId/folderId 不可 patch 拒；month null=清除语义合法', () => {
    // id=定位键必填（新建形态结构性不可表达——INV-NEW-1 契约机检锚）
    expect(S.lineagePatchNodeReqSchema.safeParse({ x: 1 }).success).toBe(false) // 缺 id 拒
    expect(S.lineagePatchNodeReqSchema.safeParse({ id: '' }).success).toBe(false) // 空串拒
    // 白名单外字段 strict 拒（新建载荷成员全数拒收；[A1b] tags 随脉络私有
    // 标签域退役入拒收面——标签唯一源=文献库域）
    for (const extra of ['paperId', 'folderId', 'createdAt', 'updatedAt', 'tags']) {
      expect(
        S.lineagePatchNodeReqSchema.safeParse({ id: 'ln1', [extra]: 'x' }).success,
        `${extra} 不可经 patch-node 携带（身份/移动/时间戳字段${extra === 'tags' ? '/已退役标签字段' : ''}）`
      ).toBe(false)
    }
    // month null=清除语义合法（移入未定月框）+全部白名单成员合法形
    expect(S.lineagePatchNodeReqSchema.safeParse({ id: 'ln1', month: null }).success).toBe(true)
    expect(
      S.lineagePatchNodeReqSchema.safeParse({ id: 'ln1', x: 1.5, y: 2, year: 2020, month: 6, slot: 1, title: 't', coreIdea: '' }).success
    ).toBe(true)
    expect(S.lineagePatchNodeReqSchema.safeParse({ id: 'ln1', tags: null }).success).toBe(false) // [A1b] tags 已退役——strict 拒（标签唯一源=文献库域）
    expect(S.lineagePatchNodeReqSchema.safeParse({ id: 'ln1', coreIdea: null }).success).toBe(false) // coreIdea 不可空（DDL NOT NULL+节点 schema 单源——空串承载清面）
    // month 值域沿承节点 schema（1..12——非白名单弱化面）
    expect(S.lineagePatchNodeReqSchema.safeParse({ id: 'ln1', month: 13 }).success).toBe(false)
    expect(S.lineagePatchNodeReqSchema.safeParse({ id: 'ln1', slot: -1 }).success).toBe(false)
  })

  it('嵌套模型层 strict 探针：rects/patch/failed/skipped/errors/annotations 元素与 paperMetrics 值去 strict 即红（首层探针覆盖不到的第二层）', () => {
    const badRect = { ...rect, __nestedProbe: 1 }
    expect(S.saveAnnotationReqSchema.safeParse({ paperId: 'p1', annotation: { ...annotationInput, rects: [badRect] } }).success).toBe(false)
    expect(S.annotationListResSchema.safeParse([{ ...annotation, rects: [badRect] }]).success).toBe(false)
    expect(S.updateMetaReqSchema.safeParse({ paperId: 'p1', patch: { title: 't', __nestedProbe: 1 } }).success).toBe(false)
    expect(S.importResultSchema.safeParse({ imported: [], duplicates: [], failed: [{ fileName: 'f', reason: 'r', __nestedProbe: 1 }] }).success).toBe(false)
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

  it('tagSetColorReqSchema color 负例：大写/短位/缺 # 拒，null=恢复默认合法（d1-N5——hex 契约负向锁）', () => {
    for (const bad of ['#E11D48', '#e11d4', 'e11d48', '#e11d48g', '#e11d4800', 42, '', ' #e11d48']) {
      expect(
        S.tagSetColorReqSchema.safeParse({ tagId: 't1', color: bad }).success,
        `非法 color ${JSON.stringify(bad)} 应拒`
      ).toBe(false)
    }
    expect(S.tagSetColorReqSchema.safeParse({ tagId: 't1' }).success, '缺 color 键应拒（required 非 optional——宽松化正则防）').toBe(false)
    expect(S.tagSetColorReqSchema.safeParse({ tagId: 't1', color: null }).success).toBe(true)
    expect(S.tagSetColorReqSchema.safeParse({ tagId: 't1', color: '#0ea5e9' }).success).toBe(true)
  })
})
