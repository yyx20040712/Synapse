/**
 * [F-VISFB-65 U3] recovery.service —— 恢复副本编排服务（设计书 §1-§2）。
 *
 * ── 行为层（状态机前置）──
 * 态：epoch 表（per (ws,type) 内存单调计数）× 槽态（files 层四态）×
 * chains（per (ws,type) 串行操作链）。
 * 迁移（save 判定序=§2 字面）：
 * - zod/注册表 → workspaceId 校验（≠当前工作区=INVALID_REQUEST 拒——B-05：
 *   在途 save 跨工作区落错槽不可达）→ epoch（不符=stale）→ 槽归属：
 *   槽空 / 槽 lastWriterSession=本人会话（ownToken 匹配）→ 写；槽为他者且
 *   takeOverToken 匹配当前文件 token（双校验之 epoch 已过）→ 写；否则
 *   pending 拒写返文件信息。saved 必回新 token。
 * - release：文件 token≠请求 token → gone（不删不推进——W-01）；匹配 →
 *   **先删文件成功→再推进 epoch**（删除失败=error 响应不推进——W-03）。
 * - peek：逐注册类型读槽四态+epoch（invalid/foreign-version 携 file 行
 *   ——token=真 token 或 opaque，放弃唯一凭证）。
 * - startupScan：根 ensure→孤儿目录清理→逐 (ws,type) tmp 提升（IPC 注册前
 *   bootstrap 调用）。
 * - [F-RECOV-01 N8/W7] save 链深上界 D_max=8（per-(ws,type)）：入链前查深
 *   （拒=queue-overflow 新 status——typed，shared/recovery/schemas），入链
 *   即 ++、settle finally--（拒时不占深）；release/read 豁免（clean 收口与
 *   读取不可拒——豁免有界性假设=用户动作频度有界）；peek 不走链（既有事实）。
 *
 * ── 不变量锚（INV-157/158/159/160）──
 * 单槽恒一；外会话/未消费副本不可覆写（takeOver 双校验例外）；release 先删
 * 后推进（旧 epoch save=stale 不复活）；非自有文件不自动删（用户 release
 * 唯一删除径）。
 */
import { randomUUID } from 'node:crypto'
import { join } from 'node:path'
import { DomainError } from '../shared/domain-error'
import {
  cleanupOrphanDirs,
  deleteSlot,
  ensureRecoveryRoot,
  promoteTmp,
  readSlot,
  writeSlotAtomic
} from './recovery.files'
import {
  RECOVERY_REGISTRY,
  RECOVERY_TYPES,
  isRegisteredRecoveryType,
  type RecoveryPeekReq,
  type RecoveryPeekRes,
  type RecoveryReadReq,
  type RecoveryReadRes,
  type RecoveryReleaseReq,
  type RecoveryReleaseRes,
  type RecoverySaveReq,
  type RecoverySaveRes,
  type RecoverySlotFile,
  type RecoveryType
} from '../../../shared/recovery/schemas'

class RecoveryDomainError extends DomainError {}

function invalidReq(message: string): RecoveryDomainError {
  return new RecoveryDomainError('INVALID_REQUEST', message)
}

/** [F-RECOV-01] per-(ws,type) save 链深上界（W7 终裁 D_max=8——仅拦 save） */
const SAVE_CHAIN_MAX = 8

export interface RecoveryServiceDeps {
  /** recovery 根目录（=<userData>/recovery——应用级单例注入） */
  recoveryRoot: string
  /** 当前工作区 id（bootstrap 装配/切换原子更新——服务根随其移动） */
  currentWorkspaceId: () => string
}

export type RecoveryService = {
  peek(req: RecoveryPeekReq): Promise<RecoveryPeekRes>
  save(req: RecoverySaveReq): Promise<RecoverySaveRes>
  read(req: RecoveryReadReq): Promise<RecoveryReadRes>
  release(req: RecoveryReleaseReq): Promise<RecoveryReleaseRes>
  /** 启动扫（IPC 前）：根 ensure+孤儿清理+tmp 提升 */
  startupScan(opts: { workspaceIds: readonly string[] }): Promise<void>
}

export function createRecoveryService(deps: RecoveryServiceDeps): RecoveryService {
  const { recoveryRoot } = deps
  /** per-(ws,type) epoch（内存单调——release 推进；重启归零由 renderer 重 peek 承接） */
  const epochs = new Map<string, number>()
  /** per-(ws,type) 串行链（同键操作全序——并发 save/release 不交错） */
  const chains = new Map<string, Promise<unknown>>()
  /** [F-RECOV-01] per-key save 在链深（入链 ++／settle finally——；release/read 不计） */
  const saveDepth = new Map<string, number>()

  const keyOf = (ws: string, type: string): string => `${ws}\u0000${type}`
  const dirOf = (ws: string): string => join(recoveryRoot, ws)

  function serialize<T>(key: string, op: () => Promise<T>): Promise<T> {
    const run = (chains.get(key) ?? Promise.resolve()).then(op, op)
    chains.set(key, run.then(
      () => undefined,
      () => undefined
    ))
    return run
  }

  /** workspaceId 显式校验（≠当前工作区=拒——B-05） */
  function guardWorkspace(ws: string): void {
    if (ws !== deps.currentWorkspaceId()) {
      throw invalidReq(`恢复请求工作区不符：请求 ${ws}，当前 ${deps.currentWorkspaceId()}`)
    }
  }

  /** peek file 行派生（invalid/foreign-version 亦携——放弃唯一凭证；summary 尽力） */
  function slotFileOf(slot: Awaited<ReturnType<typeof readSlot>>): RecoverySlotFile {
    const summary = slot.summary ?? { actionCount: 0, draftPresent: false }
    return {
      token: slot.token ?? '',
      writtenAt: slot.writtenAt ?? '',
      lastWriterSession: slot.lastWriterSession ?? '',
      actionCount: summary.actionCount,
      draftPresent: summary.draftPresent
    }
  }

  return {
    async peek(req) {
      guardWorkspace(req.workspaceId)
      const slots: RecoveryPeekRes['slots'] = {}
      for (const type of RECOVERY_TYPES) {
        if (!isRegisteredRecoveryType(type)) continue
        const slot = await readSlot(dirOf(req.workspaceId), type)
        const status =
          slot.kind === 'empty' || slot.kind === 'available' || slot.kind === 'invalid' || slot.kind === 'foreign-version'
            ? slot.kind
            : 'invalid'
        slots[type] = {
          status,
          epoch: epochs.get(keyOf(req.workspaceId, type)) ?? 0,
          ...(slot.kind === 'empty' ? {} : { file: slotFileOf(slot) })
        }
      }
      return { slots }
    },

    async save(req) {
      guardWorkspace(req.workspaceId)
      if (!isRegisteredRecoveryType(req.type)) throw invalidReq(`未注册的恢复类型：${req.type as string}`)
      const meta = RECOVERY_REGISTRY[req.type]!
      if (req.payload === undefined) throw invalidReq('恢复载荷缺失')
      const parsed = meta.payloadSchema.safeParse(req.payload)
      if (!parsed.success) throw invalidReq(`恢复载荷不合法：${req.type as string}`)
      const payload = parsed.data
      const k = keyOf(req.workspaceId, req.type)
      // [F-RECOV-01 N8] 先查后入链（拒时不 ++）；入链即 ++、settle finally--
      if ((saveDepth.get(k) ?? 0) >= SAVE_CHAIN_MAX) {
        return { status: 'queue-overflow' as const, epoch: epochs.get(k) ?? 0 }
      }
      saveDepth.set(k, (saveDepth.get(k) ?? 0) + 1)
      try {
        return await serialize(k, async () => {
          const curEpoch = epochs.get(k) ?? 0
          if (req.epoch !== curEpoch) return { status: 'stale' as const, epoch: curEpoch }
          const dir = dirOf(req.workspaceId)
          const slot = await readSlot(dir, req.type)
          // 槽归属：空 / 本人会话最近 token（lastWriterSession 匹配=ownToken 语义）
          const own = slot.kind === 'available' && slot.lastWriterSession === req.session
          // [回炉 W6/INV-160] takeOver 仅限 available 槽（可读可覆写面）——invalid/
          // foreign-version 即便 token 匹配也 pending（不可覆写，仅 release 可收）
          const takeOver =
            req.takeOverToken !== undefined && slot.kind === 'available' && slot.token === req.takeOverToken
          if (!own && !takeOver && slot.kind !== 'empty') {
            return { status: 'pending' as const, epoch: curEpoch, file: slotFileOf(slot) }
          }
          const token = randomUUID()
          await writeSlotAtomic(dir, req.type, {
            token,
            writtenAt: new Date().toISOString(),
            lastWriterSession: req.session,
            payload
          })
          return { status: 'saved' as const, token, epoch: curEpoch }
        })
      } finally {
        saveDepth.set(k, Math.max((saveDepth.get(k) ?? 1) - 1, 0))
      }
    },

    async read(req) {
      guardWorkspace(req.workspaceId)
      if (!isRegisteredRecoveryType(req.type)) throw invalidReq(`未注册的恢复类型：${req.type as string}`)
      const k = keyOf(req.workspaceId, req.type)
      return serialize(k, async () => {
        const slot = await readSlot(dirOf(req.workspaceId), req.type)
        if (slot.kind === 'available' && slot.token === req.token) {
          return { status: 'found' as const, payload: slot.payload }
        }
        return { status: 'gone' as const }
      })
    },

    async release(req) {
      guardWorkspace(req.workspaceId)
      if (!isRegisteredRecoveryType(req.type)) throw invalidReq(`未注册的恢复类型：${req.type as string}`)
      const k = keyOf(req.workspaceId, req.type)
      return serialize(k, async () => {
        const curEpoch = epochs.get(k) ?? 0
        const slot = await readSlot(dirOf(req.workspaceId), req.type)
        // token 不符/槽缺=gone：不删不推进（W-01）
        if (slot.kind === 'empty' || slot.token !== req.token) {
          return { status: 'gone' as const, epoch: curEpoch }
        }
        // 先删（失败=error 不推进——W-03 半成功序）→ 再推进 epoch
        await deleteSlot(dirOf(req.workspaceId), req.type)
        const next = curEpoch + 1
        epochs.set(k, next)
        return { status: 'released' as const, epoch: next }
      })
    },

    async startupScan(opts) {
      await ensureRecoveryRoot(recoveryRoot)
      await cleanupOrphanDirs(recoveryRoot, new Set(opts.workspaceIds))
      for (const ws of opts.workspaceIds) {
        for (const type of RECOVERY_TYPES) {
          if (!isRegisteredRecoveryType(type)) continue
          await promoteTmp(join(recoveryRoot, ws), type as RecoveryType)
        }
      }
    }
  }
}
