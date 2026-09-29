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

/** 12 域方法集 pin（it.each 展开 + 与运行时对账双消费） */
const DOMAIN_PINS: readonly [string, readonly string[]][] = [
  ['ai_sensor', ['aiStatus', 'importAll', 'listByPaper', 'observe', 'requestAiRead', 'zcodeDetect', 'zcodeInstall']],
  ['enrich', ['fetch']],
  ['export_', ['bibtex', 'clipboard', 'corpus', 'corpusItem', 'corpusSession', 'csv', 'report']],
  ['import_', ['fromDialog', 'fromFolder', 'fromPaths']],
  ['library', ['collections', 'detail', 'list', 'updateMeta']],
  ['lineage', ['graph', 'importDraft', 'removeEdge', 'removeNode', 'upsertEdge', 'upsertLineTypes', 'upsertNode']],
  ['notes', ['get', 'remove', 'save']],
  ['reader', ['deleteAnnotation', 'listAnnotations', 'open', 'saveAnnotation', 'saveProgress', 'updateAnnotation']],
  ['settings', ['diagNetwork', 'get', 'set']],
  ['system', ['openExternal', 'setQuitDirty', 'windowControl']],
  ['tags', ['attach', 'delete', 'detach', 'list', 'merge', 'rename', 'upsert']],
  ['workspaces', ['create', 'list', 'rename', 'switch']]
]

// 组名数字保持基线指纹 key 稳定（test-surface describePath 入 key——改名即
// 全组 MISSING_CASE）；活锚=下方「通道总数」用例断言 toBe(55)（F-LIBUI-01
// 起 55 通道：export_ 域 corpusSet 退役——用户 D4 裁决 2026-09-29；此前
// T3-P5 起 56=lineage 域 6→7 加 upsertLineTypes）
describe('contracts/api-surface-closure —— 接线表闭合性（55 通道 pin）', () => {
  it('通道总数=55（接线表闭合性：增删通道须意识化更新本 pin+[locked-change]）', () => {
    expect(allChannels().length).toBe(55)
  })

  it('域枚举 pin：恰 12 域', () => {
    expect(Object.keys(API_SURFACE).sort()).toEqual(DOMAIN_PINS.map(([d]) => d).sort())
    expect(DOMAIN_PINS).toHaveLength(12)
  })

  it.each(DOMAIN_PINS)('域 %s 方法集 pin', (domain, methods) => {
    expect(Object.keys(API_SURFACE[domain as keyof typeof API_SURFACE]).sort()).toEqual([...methods].sort())
  })

  it('路由前缀集 pin：通道名首段全集合（import_→import、ai_sensor→ai-sensor|ai-notes|zcode-link 的跨名域全枚举）', () => {
    const prefixes = [...new Set(allChannels().map((c) => c.channel.split('/')[0]))].sort()
    expect(prefixes).toEqual([
      'ai-notes',
      'ai-sensor',
      'enrich',
      'export',
      'import',
      'library',
      'lineage',
      'notes',
      'reader',
      'settings',
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

  it('事件通道三枚举 pin；事件通道一律 /event 后缀、invoke 通道无此后缀（命名空间互斥）', () => {
    expect(Object.keys(EVENT_CHANNELS).sort()).toEqual(['exportCorpus', 'importProgress', 'windowState'])
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

  it('事件通道值 pin：三通道字符串精确钉死（改名即红——键集/后缀 pin 之外的值位锚）', () => {
    expect({ ...EVENT_CHANNELS }).toEqual({
      importProgress: 'import/progress/event',
      exportCorpus: 'export/corpus/event',
      windowState: 'system/window-state/event'
    })
  })

  it('事件通道载荷 schema 配对在场（PreloadEvents 类型消费的运行时锚——缺导出即红）', () => {
    expect(typeof S.importProgressEventSchema.safeParse).toBe('function')
    expect(typeof S.exportProgressEventSchema.safeParse).toBe('function')
    expect(typeof S.windowStateEventSchema.safeParse).toBe('function')
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
