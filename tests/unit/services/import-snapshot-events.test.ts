/**
 * [B4 L2 回炉 X-IMP / 设计稿 §2.6 #41] 快照导入成功后的结构事件双播（service 级）。
 *
 * 行为面（落点=import-snapshot.service——与既有三处双播同层：folders.service、
 * library.service、import.service；ipc 域模块保持纯薄分发）：导入结果
 * outcome='applied' 且非 noop → 事务提交之后、回执之前，先发 folders.changed、
 * 后发 lineage.changed（两出口均为空载荷——通道与载荷零变化）。消费侧=renderer
 * lineage-folder-reconcile 的 #41 全 registry 失效：缓存会话返回时按 #34 单飞和解，
 * 不再显示导入前的图态。拒收（零库副作用）与幂等 noop（零库变）不发。
 *
 * 夹具=tests/utils/snapshot-lineage-sides（真库双库：源库 X 导出→演练库 Y 导入）。
 * 「事务提交之后」的判定=withTransaction 提交沿（真事务返回后才记提交沿）＋
 * 出口调用时刻库不在事务内。always-active。
 */
import { describe, expect, it, vi } from 'vitest'
import { createImportSnapshotService } from '../../../src/main/services/snapshot/import-snapshot.service'
import { createFoldersService } from '../../../src/main/services/folders.service'
import type { Repos } from '../../../src/main/db/repos'
import { exportVol, makeSnapshotSide, pair, type SnapshotSide } from '../../utils/snapshot-lineage-sides'
import { seedFolder, seedPaper } from '../../utils/lineage-history-db'

const OWNER_X = '3f2b8a04-5c6d-4e1f-9a2b-7c8d9e0f1a2b'
const OWNER_Y = '4d3c9b15-6e7f-4a2b-8c3d-0f1a2b3c4d5e'

interface ExitProbe {
  sendFoldersChanged: ReturnType<typeof vi.fn>
  sendLineageChanged: ReturnType<typeof vi.fn>
  /** 事件时序（提交沿与两出口的先后） */
  log: string[]
  /** 两出口各自调用时刻库是否在事务内 */
  inTxAtCall: boolean[]
}

function makeExits(side: SnapshotSide): ExitProbe {
  const log: string[] = []
  const inTxAtCall: boolean[] = []
  return {
    log,
    inTxAtCall,
    sendFoldersChanged: vi.fn(() => {
      log.push('folders')
      inTxAtCall.push(side.db.inTransaction)
    }),
    sendLineageChanged: vi.fn(() => {
      log.push('lineage')
      inTxAtCall.push(side.db.inTransaction)
    })
  }
}

/** repos 包装：真 withTransaction 返回（=事务已提交）后才记提交沿 */
function withCommitProbe(repos: Repos, log: string[]): Repos {
  const inner = repos.withTransaction
  return {
    ...repos,
    withTransaction: <T>(fn: () => T): T => {
      const result = inner(fn)
      log.push('tx-commit')
      return result
    }
  }
}

function makeImporter(side: SnapshotSide, probe: ExitProbe): ReturnType<typeof createImportSnapshotService> {
  return createImportSnapshotService({
    repos: withCommitProbe(side.repos, probe.log),
    sendFoldersChanged: probe.sendFoldersChanged,
    sendLineageChanged: probe.sendLineageChanged
  })
}

function folderCount(side: SnapshotSide, id: string): number {
  return (side.db.prepare('SELECT COUNT(*) AS c FROM collections WHERE id = ?').get(id) as { c: number }).c
}

describe('[B4 L2 回炉 X-IMP] 快照导入：applied 非 noop→事务提交后双播（先 folders 后 lineage）', () => {
  it('导入成功（有插入行）：两出口各恰一次；时序=提交沿→folders→lineage；出口调用时刻不在事务内', () => {
    const x = makeSnapshotSide(OWNER_X)
    const y = makeSnapshotSide(OWNER_Y)
    pair(y, x)
    seedPaper(x.db, 'p-x1')
    const bytes = exportVol(x)
    const probe = makeExits(y)
    const res = makeImporter(y, probe).importFromBuffer(bytes)
    expect(res.outcome).toBe('applied')
    expect(res.noop).toBeUndefined()
    expect(res.stats?.inserted).toBe(1)
    expect(probe.sendFoldersChanged).toHaveBeenCalledTimes(1)
    expect(probe.sendLineageChanged).toHaveBeenCalledTimes(1)
    // 提交沿在前、两出口在后；顺序沿 folders.service（先 folders 后 lineage）
    expect(probe.log).toEqual(['tx-commit', 'folders', 'lineage'])
    expect(probe.inTxAtCall).toEqual([false, false])
    x.db.close()
    y.db.close()
  })

  it('卷内删夹删事件（本修复的动因路径——缓存会话须按 #41 失效）：目标库夹行已删后才双播，各恰一次', async () => {
    const x = makeSnapshotSide(OWNER_X)
    const y = makeSnapshotSide(OWNER_Y)
    pair(y, x)
    seedFolder(x.db, 'f-a', '夹甲')
    seedPaper(x.db, 'p-fa', 'f-a')
    // 第一卷：f-a 落到 Y（双播一次）
    const probe = makeExits(y)
    const importer = makeImporter(y, probe)
    expect(importer.importFromBuffer(exportVol(x)).outcome).toBe('applied')
    expect(folderCount(y, 'f-a')).toBe(1)
    expect(probe.sendFoldersChanged).toHaveBeenCalledTimes(1)
    // 源库真实删夹（folders.service 正道：先删夹内 papers 再删夹行）→第二卷携 collections 删事件
    await createFoldersService({
      repos: x.repos,
      lineagePending: () => false,
      sendFoldersChanged: () => undefined,
      sendLineageChanged: () => undefined
    }).delete({ id: 'f-a' })
    probe.log.length = 0
    probe.inTxAtCall.length = 0
    const res = importer.importFromBuffer(exportVol(x))
    expect(res.outcome).toBe('applied')
    expect(res.stats?.deleted).toBeGreaterThanOrEqual(1)
    expect(folderCount(y, 'f-a')).toBe(0)
    // 累计两次导入=各恰两次（本卷恰一次）；本卷时序仍是提交沿→folders→lineage
    expect(probe.sendFoldersChanged).toHaveBeenCalledTimes(2)
    expect(probe.sendLineageChanged).toHaveBeenCalledTimes(2)
    expect(probe.log).toEqual(['tx-commit', 'folders', 'lineage'])
    expect(probe.inTxAtCall).toEqual([false, false])
    x.db.close()
    y.db.close()
  })

  it('拒收零调用：未配对（hmac_fail）与自导入（self_reimport）均不发事件', () => {
    const x = makeSnapshotSide(OWNER_X)
    const y = makeSnapshotSide(OWNER_Y)
    // 未配对：Y 没有 X 的密钥→hmac_fail
    const probe = makeExits(y)
    const importer = makeImporter(y, probe)
    const unpaired = importer.importFromBuffer(exportVol(x))
    expect(unpaired.outcome).toBe('rejected')
    expect(unpaired.reason).toBe('hmac_fail')
    // 自导入：Y 导入自己导出的卷→self_reimport
    const selfImport = importer.importFromBuffer(exportVol(y))
    expect(selfImport.outcome).toBe('rejected')
    expect(selfImport.reason).toBe('self_reimport')
    expect(probe.sendFoldersChanged).not.toHaveBeenCalled()
    expect(probe.sendLineageChanged).not.toHaveBeenCalled()
    expect(probe.log).toEqual([])
    x.db.close()
    y.db.close()
  })

  it('幂等 noop 零调用：同卷二次导入（noop=true，零库变）不再发事件', () => {
    const x = makeSnapshotSide(OWNER_X)
    const y = makeSnapshotSide(OWNER_Y)
    pair(y, x)
    seedPaper(x.db, 'p-x1')
    const bytes = exportVol(x)
    const probe = makeExits(y)
    const importer = makeImporter(y, probe)
    expect(importer.importFromBuffer(bytes).outcome).toBe('applied')
    expect(probe.sendFoldersChanged).toHaveBeenCalledTimes(1)
    probe.log.length = 0
    const again = importer.importFromBuffer(bytes)
    expect(again.outcome).toBe('applied')
    expect(again.noop).toBe(true)
    // 仍是各一次（noop 那次零调用）；本次未进事务（提交沿未推进）
    expect(probe.sendFoldersChanged).toHaveBeenCalledTimes(1)
    expect(probe.sendLineageChanged).toHaveBeenCalledTimes(1)
    expect(probe.log).toEqual([])
    x.db.close()
    y.db.close()
  })

  it('出口未注入（{ repos } 构造——既有受锁测试形态）：照常导入成功、不抛', () => {
    const x = makeSnapshotSide(OWNER_X)
    const y = makeSnapshotSide(OWNER_Y)
    pair(y, x)
    seedPaper(x.db, 'p-x1')
    const res = createImportSnapshotService({ repos: y.repos }).importFromBuffer(exportVol(x))
    expect(res.outcome).toBe('applied')
    expect(res.stats?.inserted).toBe(1)
    x.db.close()
    y.db.close()
  })

  it('只注入其一：已注入的出口恰一次、缺席的那个不抛（两个出口各自可选）', () => {
    const x = makeSnapshotSide(OWNER_X)
    const y1 = makeSnapshotSide(OWNER_Y)
    pair(y1, x)
    seedPaper(x.db, 'p-x1')
    const sendFoldersChanged = vi.fn()
    const res1 = createImportSnapshotService({ repos: y1.repos, sendFoldersChanged }).importFromBuffer(exportVol(x))
    expect(res1.outcome).toBe('applied')
    expect(sendFoldersChanged).toHaveBeenCalledTimes(1)

    const y2 = makeSnapshotSide(OWNER_Y)
    pair(y2, x)
    const sendLineageChanged = vi.fn()
    const res2 = createImportSnapshotService({ repos: y2.repos, sendLineageChanged }).importFromBuffer(exportVol(x))
    expect(res2.outcome).toBe('applied')
    expect(sendLineageChanged).toHaveBeenCalledTimes(1)
    x.db.close()
    y1.db.close()
    y2.db.close()
  })
})
