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
      ...over.services
    },
    dialogs: {
      pickPdfFiles: async () => null,
      pickFolder: async () => null,
      saveFile: async () => null,
      ...over.dialogs
    },
    shell:
      over.shell ?? {
        openExternal: async () => undefined
      },
    userDataDir: over.userDataDir ?? 'C:/synapse-test-user-data',
    ping: over.ping ?? (async () => ({ ok: true, latencyMs: 10 }))
  }
}
