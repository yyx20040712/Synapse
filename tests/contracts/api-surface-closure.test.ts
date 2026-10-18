import { describe, expect, it } from 'vitest'
import {
  API_SURFACE,
  EVENT_CHANNELS,
  PRELOAD_HIDDEN_METHODS,
  allChannels
} from '../../src/shared/ipc/api-surface'
import * as S from '../../src/shared/ipc/schemas'

/**
 * [F-TESTREF-W3] src/shared/ipc/api-surface.ts 直接契约测试——接线表闭合性。
 * 与既有 contracts/api-surface.test.ts（通道唯一性/命名/strict 通用性质）互补：
 * 本文件 pin 表的**形状**（通道数/域枚举/每域方法集/路由前缀集），任何通道
 * 增删都必须意识化更新 pin——接线表是「新增通道必须走 [locked-change]」的
 * 执法对象，pin 即变更审计锚。新测试 always-active。
 */

/** 21 域方法集 pin（it.each 展开 + 与运行时对账双消费；[F-DBCAMP-01 DB-2 U2]
 *  +AI 六域 13 通道（ai_sessions/ai_messages/ai_memory/ai_tasks/ai_audit/ai_cascade
 *  ——audit 通道 ai-tasks/list-audit 域归属 ai_audit）；[F-FOLDER-01] +folders/+papers
 *  两域五通道；[F-BAKRET-01] lineage 域 importDraft 退役——lineage 7→6 方法；
 *  [F-ALIGN-01 D1] lineage 域 upsertNode→patchNode（通道拆分——2026-10-04）；
 *  [F-UIRES-01 批 B] papers 域 +delete——1→2 方法；[F-DBCAMP-01 DB-1 U2 /
 *  F-STAR-01] papers 域 +setStarred——2→3 方法；[F-DBCAMP-01 DB-3 U2]
 *  +snapshot 域五通道（快照导出面——20→21 域）；[F-DBCAMP-01 DB-3 U3]
 *  snapshot 域 +importFromFile（导入合并面——域 21 不变）；[F-VISFB-43]
 *  +figures 域五通道（图表提取管线——21→22 域）；[F-VISFB-61] lineage 域
 *  +upsertFloatingNote/+removeFloatingNote（悬浮笔记数据与会话面——6→8 方法）） */
const DOMAIN_PINS: readonly [string, readonly string[]][] = [
  ['ai_audit', ['list']],
  ['ai_cascade', ['preview']],
  ['ai_memory', ['create', 'delete', 'listByScope', 'setPinned', 'update']],
  ['ai_messages', ['listPinned', 'setPinned']],
  ['ai_sensor', ['aiStatus', 'importAll', 'listByPaper', 'observe', 'requestAiRead', 'zcodeDetect', 'zcodeInstall']],
  ['ai_sessions', ['listMessages', 'open']],
  ['ai_tasks', ['cancel', 'list']],
  ['enrich', ['fetch']],
  ['export_', ['bibtex', 'clipboard', 'corpus', 'corpusItem', 'corpusSession', 'csv', 'report']],
  ['figures', ['begin', 'complete', 'list', 'pending', 'store']],
  ['folders', ['create', 'delete', 'list', 'rename']],
  ['import_', ['fromDialog', 'fromFolder', 'fromPaths']],
  ['library', ['collections', 'detail', 'list', 'updateMeta']],
  ['lineage', [
    'graph',
    'patchNode',
    'removeEdge',
    'removeFloatingNote',
    'removeNode',
    'upsertEdge',
    'upsertFloatingNote',
    'upsertLineTypes'
  ]],
  ['notes', ['get', 'remove', 'save']],
  ['papers', ['delete', 'moveFolder', 'setStarred']],
  ['reader', ['deleteAnnotation', 'listAnnotations', 'open', 'saveAnnotation', 'saveProgress', 'updateAnnotation']],
  ['settings', ['diagNetwork', 'get', 'set']],
  ['snapshot', ['exportToFile', 'getSyncKey', 'importFromFile', 'importPeerKey', 'listPeerKeys', 'removePeerKey']],
  ['system', ['openExternal', 'reportQuitFlush', 'setQuitDirty', 'windowControl']],
  ['tags', ['attach', 'delete', 'detach', 'list', 'merge', 'rename', 'setColor', 'upsert']],
  ['workspaces', ['create', 'list', 'rename', 'switch']]
]

// 组名数字=活锚同步（[r1 R4 k3-N6/d1-N1] 55→75 陈旧计数同步——describePath 入
// test-surface 基线指纹 key，组名变=全组旧身份淘汰（豁免随批登记，新基线登账）；
// 沿革：[F-DBCAMP-01 DB-3 U3] 80→81：+snapshot/import-from-file（域 21 不变）；
// [F-DBCAMP-01 DB-3 U2] 75→80：+snapshot 域五通道；[F-DBCAMP-01 DB-2 U2]
// 62→75 +AI 六域 13 通道；[F-FOLDER-01]
// 56→61：+folders 四通道+papers/move-folder；[F-UIRES-01 批 B] 60→61：+papers/delete；
// [F-BAKRET-01] 61→60：lineage/import 退役——用户裁决 2026-09-30）
describe('contracts/api-surface-closure —— 接线表闭合性（89 通道 pin）', () => {
  it('通道总数=89（接线表闭合性：增删通道须意识化更新本 pin+[locked-change]——[F-VISFB-61] 87→89：+lineage/upsert-floating-note+lineage/remove-floating-note（悬浮笔记数据与会话面，域 22 不变）；[F-VISFB-14] 86→87：+system/report-quit-flush（退出握手回执）；[F-VISFB-43] 81→86：+figures 域五通道（图表提取管线）；[F-DBCAMP-01 DB-3 U3] 80→81：+snapshot/import-from-file（导入合并面，域 21 不变）；[F-DBCAMP-01 DB-3 U2] 75→80：+snapshot 域五通道；[F-DBCAMP-01 DB-2 U2] 62→75 +AI 六域 13 通道；[F-DBCAMP-01 DB-1 U2] 61→62：+papers/set-starred；[F-UIRES-01 批 B] 60→61：+papers/delete）', () => {
    expect(allChannels().length).toBe(89)
  })

  it('域枚举 pin：恰 22 域（[F-VISFB-43] 21→22：+figures；[F-DBCAMP-01 DB-3 U2] 20→21：+snapshot；[F-DBCAMP-01 DB-2 U2] 14→20：+AI 六域；[F-FOLDER-01] 12→14：+folders+papers）', () => {
    expect(Object.keys(API_SURFACE).sort()).toEqual(DOMAIN_PINS.map(([d]) => d).sort())
    expect(DOMAIN_PINS).toHaveLength(22)
  })

  it.each(DOMAIN_PINS)('域 %s 方法集 pin', (domain, methods) => {
    expect(Object.keys(API_SURFACE[domain as keyof typeof API_SURFACE]).sort()).toEqual([...methods].sort())
  })

  it('路由前缀集 pin：通道名首段全集合（import_→import、ai_sensor→ai-sensor|ai-notes|zcode-link 的跨名域全枚举）', () => {
    const prefixes = [...new Set(allChannels().map((c) => c.channel.split('/')[0]))].sort()
    expect(prefixes).toEqual([
      'ai-cascade',
      'ai-memory',
      'ai-messages',
      'ai-notes',
      'ai-sensor',
      'ai-sessions',
      'ai-tasks',
      'enrich',
      'export',
      'figures',
      'folders',
      'import',
      'library',
      'lineage',
      'notes',
      'papers',
      'reader',
      'settings',
      'snapshot',
      'system',
      'tags',
      'workspaces',
      'zcode-link'
    ])
  })

  it('PRELOAD_HIDDEN_METHODS 闭合：引用的域/方法都在表内；隐藏通道仍在 allChannels（main 侧全量注册不减面——INV-07/INV-54）', () => {
    const domains = Object.keys(API_SURFACE)
    for (const [domain, methods] of Object.entries(PRELOAD_HIDDEN_METHODS)) {
      expect(domains, `PRELOAD_HIDDEN_METHODS 引用了不存在的域 ${domain}`).toContain(domain)
      const inTable = Object.keys(API_SURFACE[domain as keyof typeof API_SURFACE])
      for (const m of methods) {
        expect(inTable, `PRELOAD_HIDDEN_METHODS 引用了 ${domain}.${m} 但表内无此方法`).toContain(m)
      }
    }
    const channels = allChannels().map((c) => c.channel)
    for (const [domain, methods] of Object.entries(PRELOAD_HIDDEN_METHODS)) {
      for (const m of methods) {
        const ep = (API_SURFACE as Record<string, Record<string, { channel: string }>>)[domain]?.[m]
        expect(channels, `隐藏通道 ${ep?.channel} 应保留在 allChannels（preload 不暴露≠main 不注册）`).toContain(ep?.channel)
      }
    }
  })

  it('事件通道七枚举 pin（[F-VISFB-14] +quitFlush；[F-FOLDER-01] +foldersChanged+lineageChanged；[F-VISFB-64] +quitFlushAbort）；事件通道一律 /event 后缀、invoke 通道无此后缀（命名空间互斥）', () => {
    expect(Object.keys(EVENT_CHANNELS).sort()).toEqual([
      'exportCorpus',
      'foldersChanged',
      'importProgress',
      'lineageChanged',
      'quitFlush',
      'quitFlushAbort',
      'windowState'
    ])
    const eventChannels = Object.values(EVENT_CHANNELS)
    for (const ch of eventChannels) {
      expect(ch.endsWith('/event'), `事件通道 ${ch} 应带 /event 后缀（单向推送命名约定）`).toBe(true)
    }
    const invoke = allChannels().map((c) => c.channel)
    expect(invoke.filter((c) => c.endsWith('/event')), 'invoke 通道不应占用 /event 后缀命名空间').toEqual([])
    expect(invoke.filter((c) => eventChannels.includes(c as (typeof eventChannels)[number]))).toEqual([])
  })

  it('PRELOAD_HIDDEN_METHODS 集合本体 pin：恰 import_.fromPaths 一项（增删隐藏面须意识化——防引用检查型 vacuous green）', () => {
    expect(Object.entries(PRELOAD_HIDDEN_METHODS).map(([d, ms]) => `${d}:[${[...ms].sort().join(',')}]`)).toEqual([
      'import_:[fromPaths]'
    ])
  })

  it('事件通道值 pin：通道字符串精确钉死（改名即红——键集/后缀 pin 之外的值位锚；[F-VISFB-14] +quitFlush；[F-VISFB-64] +quitFlushAbort）', () => {
    expect({ ...EVENT_CHANNELS }).toEqual({
      importProgress: 'import/progress/event',
      exportCorpus: 'export/corpus/event',
      windowState: 'system/window-state/event',
      foldersChanged: 'folders/changed/event',
      lineageChanged: 'lineage/changed/event',
      quitFlush: 'system/quit-flush/event',
      quitFlushAbort: 'system/quit-flush-abort/event'
    })
  })

  it('事件通道载荷 schema 配对在场（PreloadEvents 类型消费的运行时锚——缺导出即红；[F-VISFB-14] +quitFlush；[F-VISFB-64] +quitFlushAbort）', () => {
    expect(typeof S.importProgressEventSchema.safeParse).toBe('function')
    expect(typeof S.exportProgressEventSchema.safeParse).toBe('function')
    expect(typeof S.windowStateEventSchema.safeParse).toBe('function')
    expect(typeof S.foldersChangedEventSchema.safeParse).toBe('function')
    expect(typeof S.lineageChangedEventSchema.safeParse).toBe('function')
    expect(typeof S.quitFlushEventSchema.safeParse).toBe('function')
    expect(typeof S.quitFlushAbortEventSchema.safeParse).toBe('function')
  })

  it('组合装配域（ComposedHandlerDomains=workspaces）通道名 pin：四通道全注册（ApiHandlers 可选的编译期代价→运行时枚举补偿）', () => {
    expect(
      allChannels()
        .filter((c) => c.domain === 'workspaces')
        .map((c) => c.channel)
        .sort()
    ).toEqual(['workspaces/create', 'workspaces/list', 'workspaces/rename', 'workspaces/switch'])
  })
})
