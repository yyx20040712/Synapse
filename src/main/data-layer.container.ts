/**
 * [R1-WS1] data-layer.container —— 课题级数据层的稳定 facade 容器（ADR-0018）。
 *
 * 为什么在 main 根：容器聚合 db/repos/services 三层（分层单向 ipc→services→
 * repos→db 的「装配面」在 bootstrap 同级——services 禁直连 db，本文件是例外
 * 落点，与 bootstrap.ts 同权）。
 *
 * ── 行为层 ──
 * - 容器=模块内可变 current + 稳定 facade（Proxy get 陷阱逐访问转发现当前层——
 *  「访问即取当前」，switch 换引用后 IPC/协议层零感知热换）。
 * - 形态自裁（Proxy vs 显式委托）：选 Proxy——ServiceBundle 10 域×N 方法显式
 *  委托需逐方法重声明且新增服务双处维护；Proxy 动态转发与 unimplementedObject
 *  先例同型（app-error）。函数值绑回真实 owner（防 this 丢失）。
 * - 时序：workspace.service.switch 编排 closeCurrent → 指针 → assembleInto
 *  （票面 P1 字面序）；容器不持业务态（busy 守卫在 workspace.service）。
 *
 * ── 接口层 ──
 * - services/fileStore：稳定 facade（ipc/index deps.services 消费形态零改动的
 *  机制面；app-file 协议的 fileStore 同理）；papersFileRef：协议回调经容器间接
 *  取（bootstrap 一处接线，switch 后活指向新课题库）。
 *
 * ── 架构层 ──
 * - 不 import electron（装配函数由 bootstrap 注入外参闭包——单测纯 node 可测）；
 * - 装配前访问 facade=显式中文错误（不静默 undefined——INV-02 族）。
 *
 * ── 文化层 ──
 * - 测试：tests/unit/services/workspace.test.ts（容器 describe——真库热换+旧句柄失效断言）
 */
import type { SqliteDb } from './db/connection'
import type { Repos } from './db/repos'
import type { ServiceBundle } from './services'
import type { FileStore } from './services/import_/file-store'

export interface DataLayer {
  db: SqliteDb
  repos: Repos
  fileStore: FileStore
  services: ServiceBundle
}

export interface DataLayerContainer {
  /** 稳定 services facade（createIpcHandlers 的 deps.services——访问即取当前课题层） */
  services: ServiceBundle
  /** 稳定 fileStore facade（app-file 协议读受管 PDF 的活指向） */
  fileStore: FileStore
  /** 协议回调：paperId → file_ref（经容器间接取，switch 后指向新课题库） */
  papersFileRef: (paperId: string) => Promise<string | null>
  /** 在目标目录装配新数据层并换 current 引用（不关旧库——关库归 closeCurrent） */
  assembleInto: (dataDir: string) => Promise<void>
  /** 关当前课题库句柄（幂等性由调用方保证——bootstrap shutdown 的 dbClosed 先例） */
  closeCurrent: () => void
}

export interface DataLayerContainerDeps {
  /** 装配一课题数据层（bootstrap 注入：与库无关项保持闭包外参——票面 P1） */
  assemble: (dataDir: string) => Promise<DataLayer> | DataLayer
}

/** 访问即取当前的转发 Proxy：函数值绑回真实 owner（防 this 丢失） */
function liveProxy<T extends object>(pick: () => T): T {
  return new Proxy({} as T, {
    get(_target, prop) {
      const owner = pick()
      const value = (owner as Record<string | symbol, unknown>)[prop]
      if (typeof value === 'function') {
        return (value as (...args: unknown[]) => unknown).bind(owner)
      }
      return value
    }
  })
}

export function createDataLayerContainer(deps: DataLayerContainerDeps): DataLayerContainer {
  let current: DataLayer | null = null

  function requireCurrent(): DataLayer {
    if (current === null) {
      throw new Error('课题数据层未装配：容器 facade 在首次装配前被访问')
    }
    return current
  }

  return {
    services: liveProxy(() => requireCurrent().services),
    fileStore: liveProxy(() => requireCurrent().fileStore),
    papersFileRef: async (paperId) => requireCurrent().repos.papers.fileRefById(paperId),
    assembleInto: async (dataDir) => {
      current = await deps.assemble(dataDir)
    },
    closeCurrent: () => {
      current?.db.close()
      current = null
    }
  }
}
