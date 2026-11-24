/**
 * [B4 L2 回炉 X-IMP / 设计稿 §2.6 #41] 快照导入事件出口的生产装配（createServices 接线）。
 *
 * 服务级行为面见 import-snapshot-events.test.ts（出口调用条件、时点与顺序）。本文件
 * 锁的是**装配**：生产入口 createServices 必须把 bootstrap 注入的两个事件出口
 * （sendFoldersChanged / sendLineageChanged）接到 snapshotImport 上——service 的两个
 * 出口是可选依赖，装配行漏注入时 service 照常工作但静默不发事件（缓存会话不失效），
 * 服务级测试与既有受锁测试（均以 { repos } 构造）都拦不住该旁路。
 *
 * 夹具：真库双库（tests/utils/snapshot-lineage-sides）＋ createServices 全量装配
 * （fileStore/http 以桩代——导入合并只写库、不出网、不动文件面）。
 */
import { describe, expect, it, vi } from 'vitest'
import { createServices, type ServiceDeps } from '../../../src/main/services'
import { createImportGate } from '../../../src/main/import-gate'
import type { Repos } from '../../../src/main/db/repos'
import { exportVol, makeSnapshotSide, pair } from '../../utils/snapshot-lineage-sides'
import { seedPaper } from '../../utils/lineage-history-db'

const OWNER_X = '3f2b8a04-5c6d-4e1f-9a2b-7c8d9e0f1a2b'
const OWNER_Y = '4d3c9b15-6e7f-4a2b-8c3d-0f1a2b3c4d5e'

interface ExitStubs {
  sendFoldersChanged: () => void
  sendLineageChanged: () => void
}

/** 生产装配入口（bootstrap 同形入参；事件出口=本用例注入的桩） */
function makeBundle(repos: Repos, exits?: ExitStubs): ReturnType<typeof createServices> {
  const deps: ServiceDeps = {
    repos,
    fileStore: {} as never, // 导入合并只写库——本用例不经文件面
    contactEmail: () => 'w-c-wiring@example.invalid',
    http: {
      fetchJson: async () => {
        throw new Error('本用例不出网')
      },
      fetchText: async () => {
        throw new Error('本用例不出网')
      }
    },
    importGate: createImportGate(),
    aiSensorRootDir: '/synapse-w-c-wiring-ai-sensor',
    zcodeBaseDir: '/synapse-w-c-wiring-zcode',
    templateDir: '/synapse-w-c-wiring-template',
    ...(exits === undefined ? {} : exits)
  }
  return createServices(deps)
}

describe('[B4 L2 回炉 X-IMP] 快照导入事件出口的生产装配（createServices→snapshotImport）', () => {
  it('装配接通：经 createServices 导入成功→注入的两个出口各恰一次，先 folders 后 lineage', () => {
    const x = makeSnapshotSide(OWNER_X)
    const y = makeSnapshotSide(OWNER_Y)
    pair(y, x)
    seedPaper(x.db, 'p-x1')
    const order: string[] = []
    const sendFoldersChanged = vi.fn(() => {
      order.push('folders')
    })
    const sendLineageChanged = vi.fn(() => {
      order.push('lineage')
    })
    const bundle = makeBundle(y.repos, { sendFoldersChanged, sendLineageChanged })
    const res = bundle.snapshotImport.importFromBuffer(exportVol(x))
    expect(res.outcome).toBe('applied')
    expect(res.stats?.inserted).toBe(1)
    expect(sendFoldersChanged).toHaveBeenCalledTimes(1)
    expect(sendLineageChanged).toHaveBeenCalledTimes(1)
    expect(order).toEqual(['folders', 'lineage'])
    x.db.close()
    y.db.close()
  })

  it('装配不放宽：经 createServices 的拒收（未配对）与幂等 noop 均零调用', () => {
    const x = makeSnapshotSide(OWNER_X)
    const y = makeSnapshotSide(OWNER_Y)
    pair(y, x)
    seedPaper(x.db, 'p-x1')
    const bytes = exportVol(x)
    const sendFoldersChanged = vi.fn()
    const sendLineageChanged = vi.fn()
    const bundle = makeBundle(y.repos, { sendFoldersChanged, sendLineageChanged })
    expect(bundle.snapshotImport.importFromBuffer(bytes).outcome).toBe('applied')
    expect(sendFoldersChanged).toHaveBeenCalledTimes(1)
    // 同卷二次导入=noop（零库变）
    const again = bundle.snapshotImport.importFromBuffer(bytes)
    expect(again.outcome).toBe('applied')
    expect(again.noop).toBe(true)
    // 未配对的第三方卷=hmac_fail 拒收（零库副作用）
    const z = makeSnapshotSide('5e4d0c26-7f8a-4b3c-9d4e-1a2b3c4d5e6f')
    const rejected = bundle.snapshotImport.importFromBuffer(exportVol(z))
    expect(rejected.outcome).toBe('rejected')
    expect(rejected.reason).toBe('hmac_fail')
    expect(sendFoldersChanged).toHaveBeenCalledTimes(1)
    expect(sendLineageChanged).toHaveBeenCalledTimes(1)
    x.db.close()
    y.db.close()
    z.db.close()
  })

  it('出口未注入（装配缺省=空操作）：经 createServices 导入照常成功、不抛', () => {
    const x = makeSnapshotSide(OWNER_X)
    const y = makeSnapshotSide(OWNER_Y)
    pair(y, x)
    seedPaper(x.db, 'p-x1')
    const res = makeBundle(y.repos).snapshotImport.importFromBuffer(exportVol(x))
    expect(res.outcome).toBe('applied')
    expect(res.stats?.inserted).toBe(1)
    x.db.close()
    y.db.close()
  })
})
