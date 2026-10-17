/**
 * 测试基建：IpcDeps 桩工厂（受锁文件）。
 * 用法：makeIpcDeps({ services: {...}, dialogs: {...} }) 覆盖需要的部分。
 */
import type { IpcDeps } from '../../src/main/ipc'
import type { ServiceBundle } from '../../src/main/services'
import type { Dialogs } from '../../src/main/dialogs'

export interface IpcDepsOverrides {
  services?: Partial<ServiceBundle>
  dialogs?: Partial<Dialogs>
  shell?: IpcDeps['shell']
  ping?: (host: string) => Promise<{ ok: boolean; latencyMs: number }>
  userDataDir?: string
  setQuitDirty?: (dirty: boolean) => void
  setLineagePending?: (pending: boolean) => void // 桩恒供值（IpcDeps 侧已必填——本覆盖键保持可选语义）
  reportQuitFlush?: IpcDeps['reportQuitFlush'] // [F-VISFB-14] 退出握手回执落点（IpcDeps 必填——桩恒供值同型）
  controlWindow?: IpcDeps['controlWindow']
}

export function makeIpcDeps(over: IpcDepsOverrides = {}): IpcDeps {
  return {
    services: {
      library: null as never,
      reader: null as never,
      tags: null as never,
      notes: null as never,
      import_: null as never,
      enrich: null as never,
      export_: null as never,
      corpus_export: null as never,
      ai_sensor: null as never,
      ai_notes_import: null as never,
      zcode_link: null as never,
      lineage: null as never,
      floatingNotes: null as never, // [F-VISFB-61] 悬浮笔记用例面键（面外桩——类型闭合随 ServiceBundle 增键）
      folders: null as never,
      papers: null as never,
      aiSessions: null as never, // [F-DBCAMP-01 DB-2 U2a] AI 域两键（面外桩）
      aiMemorySearch: null as never,
      aiTasks: null as never, // [F-DBCAMP-01 DB-2 U2b-1] AI 任务键（面外桩）
      aiContext: null as never, // [F-DBCAMP-01 DB-2 U2b-2a] AI 装配引擎键（面外桩）
      aiTail: null as never, // [F-DBCAMP-01 DB-2 U2b-2b] AI 尾段装配键（面外桩）
      aiMemoryManual: null as never, // [F-DBCAMP-01 DB-2 U2] AI 记忆手动面键（面外桩）
      aiCascade: null as never, // [F-DBCAMP-01 DB-2 U2] AI 级联预览键（面外桩）
      snapshot: null as never, // [F-DBCAMP-01 DB-3 U2] 快照导出面键（面外桩——类型闭合随 ServiceBundle 增键）
      snapshotImport: null as never, // [F-DBCAMP-01 DB-3 U3] 快照导入合并面键（面外桩——同上类型闭合）
      figures: null as never, // [F-VISFB-43] 图表提取管线域键（面外桩——类型闭合随 ServiceBundle 增键）
      ...over.services
    },
    dialogs: {
      pickPdfFiles: async () => null,
      pickFolder: async () => null,
      saveFile: async () => null,
      openFile: async () => null, // [F-DBCAMP-01 DB-3 U3] 快照导入开文件口（Dialogs 增键的类型闭合）
      ...over.dialogs
    },
    shell:
      over.shell ?? {
        openExternal: async () => undefined
      },
    userDataDir: over.userDataDir ?? 'C:/synapse-test-user-data',
    ping: over.ping ?? (async () => ({ ok: true, latencyMs: 10 })),
    setQuitDirty: over.setQuitDirty ?? (() => {}),
    setLineagePending: over.setLineagePending ?? (() => {}),
    reportQuitFlush: over.reportQuitFlush ?? (() => {}),
    controlWindow: over.controlWindow ?? ((_action) => ({ maximized: false }))
  }
}
