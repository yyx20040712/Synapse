/**
 * [F-RECOV-01] recoveryEntry —— ws-entry 屏障与确认条决策族（终裁 W1/W6 拆件：
 * 自 recoveryScheduler 迁入；构造注入 SchedulerPorts，entry 零 import scheduler
 * ——依赖方向 scheduler→entry 单向无环；scheduler 门面委托，公共 API 不变，
 * test-surface C_after ⊇ C_before 由此满足）。
 *
 * ── 行为面（确认条状态机：checking→{open|await-decision}；await-decision→
 *    {restore 成功→open|discard→open|defer→open+pendingChip|deadFolder（冻结
 *    维持）|reopen→await-decision}）──
 * - enter：bumpGen（保留面）+冻结→peek（1500ms 界——确认条动作面 busy 不可永
 *   挂）→empty=开门+开门补存（视同编辑事件 trailing，W9）／available|invalid|
 *   foreign-version=确认条维持冻结直到决策（degraded 保留——W5① frozen 不清）；
 *   peek 失败=fail-open 开门+degraded（kind=unavailable）。
 * - restore：read（界）→folder 校验（fail-open）→载入→takeOver 原样回写
 *   （≤3 次；stale 采纳重试；pending|queue-overflow=break 条保留可重试——N8
 *   消费点穷举之二）→水化计划→路由。
 * - discard：release（discard）→epoch 采纳→恢复流程内清 store 恢复态（W5）。
 * - defer/reopen：开门+pendingChip 常驻／重开再冻结（slotKind=null=重新
 *   peek——Z7 死按钮修复复用 enter 全语义）。
 * - [W6②] 决策开门（gone/discard/defer/restore 成功）→onGateReopened：宿主
 *   判 degraded∧快照非空=立即臂探针（不等编辑）；快照空=W6① 即刻清。
 *
 * 端口面申报（对 W1 九项的偏差——主控报告承载）：增 setGateOpen/getState/
 * getGen/onGateReopened 四项（门写/行为守卫读/代际读/开门收口钩——缺它们须在
 * entry 复制状态=双源）；getGateOpen 无读方删除；requestImmediateSave 落为
 * requestPendingResend（trailing 语义）：锁测 W9 锚「peek 收束→armed→advance
 * 300 首写」与 saveNow 即时形互斥，从 v2 §4.5「视同编辑事件」措辞。
 */
import { api, unwrap } from '../../api/client'
import { MAIN_GRAPH_ID } from '@shared/models/lineage'
import {
  lineageRecoveryPayloadSchema,
  type RecoveryPeekRes,
  type RecoveryReadRes,
  type RecoveryReleaseRes,
  type RecoverySaveRes,
  type RecoverySlotFile
} from '@shared/recovery/schemas'

export const RECOVERY_TYPE = 'lineage-session'
const TAKEOVER_ATTEMPTS = 3

export type RecoveryPhase = 'idle' | 'checking' | 'await-decision' | 'open'
export type RecoverySlotKind = 'available' | 'invalid' | 'foreign-version' | null

export interface RecoveryUiState {
  phase: RecoveryPhase
  slotKind: RecoverySlotKind
  file: RecoverySlotFile | null
  /** 恢复校验 folder 不在（死文件夹——恢复禁用+放弃/稍后处理） */
  deadFolder: boolean
  busy: boolean
  /** 稍后处理/pending 拒写 chip（W-07） */
  pendingChip: boolean
  degraded: boolean
  /** [F-RECOV-01] degraded 呈现分档（INV-166 扩展）：slow=写入缓慢／stuck-pending=
   *  弃置待确认／unavailable=已观测失败或溢出（锁存——成功才清） */
  kind: 'slow' | 'stuck-pending' | 'unavailable' | null
  /** kind=unavailable 且探针连败≥3：加缀「重启应用可恢复」（W8 终态承载） */
  restartHint: boolean
}

export interface SchedulerPorts {
  /** peek（1500ms 硬超时+unwrap 已包——确认条动作面） */
  peek(): Promise<RecoveryPeekRes>
  read(token: string): Promise<RecoveryReadRes>
  /** save（takeOver 形态=takeOverToken 携带；1500ms 界+token 双账本记账在端口承接） */
  save(payload: unknown, takeOverToken?: string): Promise<RecoverySaveRes>
  release(token: string, reason: 'clean' | 'discard'): Promise<RecoveryReleaseRes>
  /** gen++（ws-entry 形态：chip/health/双 streak 保留——W5①；返回新代际） */
  bumpGen(): number
  getGen(): number
  adoptEpoch(epoch: number): void
  /** [R7] peek 成功后清 token 双账本（基线行为回移——enter 判定槽归属前重置会话凭据） */
  resetTokens(): void
  emit(patch: Partial<RecoveryUiState>): void
  setGateOpen(open: boolean): void
  getState(): RecoveryUiState
  /** 开门补存（视同编辑事件——trailing；W1 同型语义修订见头注） */
  requestPendingResend(): void
  /** 决策开门收口钩（W6② 条件重臂／W6① 即刻清——宿主判定） */
  onGateReopened(): void
}

/** 恢复流程宿主回调（scheduler 装配时转发——store 载入/水化/路由/弃置清态） */
export interface RecoveryEntryHost {
  loadPayload(payload: unknown): void
  onRestored(payload: unknown): void
  openLineageView(): void
  discardLoadedSession(): void
}

export interface RecoveryEntry {
  enterWorkspaceRecovery(): Promise<void>
  restoreRecoverySlot(): Promise<void>
  discardRecoverySlot(): Promise<void>
  deferRecoverySlot(): void
  reopenRecoveryBar(): void
  attach(getHost: () => RecoveryEntryHost | null): void
  reset(): void
}

/** 校验 folder 在场（主图恒活；校验面失败=fail-open——真拒绝在 flush 冲突链） */
async function folderAlive(folderId: string): Promise<boolean> {
  if (folderId === MAIN_GRAPH_ID) return true
  try {
    const folders = await unwrap(api.folders.list({}))
    return folders.some((f) => f.id === folderId)
  } catch {
    return true
  }
}

export function createRecoveryEntry(ports: SchedulerPorts): RecoveryEntry {
  let restoredLoaded = false
  let getHost: () => RecoveryEntryHost | null = () => null

  async function enterWorkspaceRecovery(): Promise<void> {
    const gen = ports.bumpGen()
    ports.setGateOpen(false)
    ports.emit({ phase: 'checking', slotKind: null, file: null, deadFolder: false, busy: false, pendingChip: false })
    try {
      // peek=确认条动作面（busy 不可永挂）——1500ms 硬超时，超时走 reject=fail-open
      const res = await ports.peek()
      if (gen !== ports.getGen()) return // 迟到响应（重入/切换竞窗）判废
      const slot = res.slots[RECOVERY_TYPE]
      if (slot !== undefined) ports.adoptEpoch(slot.epoch)
      ports.resetTokens() // [R7] 基线行为回移：peek 成功后清 ownToken/lastWrittenToken（会话凭据重置）
      if (slot === undefined || slot.status === 'empty') {
        // Z6 成功 entry 清 degraded（空槽分支）
        ports.emit({ phase: 'open', degraded: false, kind: null, restartHint: false })
        ports.setGateOpen(true)
        ports.requestPendingResend() // W9 冻结窗残留脏态补存（视同编辑）
        return
      }
      // 有槽=确认条（degraded 保留——W5① frozen 不清）
      ports.emit({ phase: 'await-decision', slotKind: slot.status, file: slot.file ?? null })
    } catch {
      // peek 失败=fail-open 开门+degraded（副本态未知=当前编辑未受保护）
      ports.emit({ phase: 'open', degraded: true, kind: 'unavailable', restartHint: false })
      ports.setGateOpen(true)
      ports.requestPendingResend()
    }
  }

  async function restoreRecoverySlot(): Promise<void> {
    const st = ports.getState()
    if (st.phase !== 'await-decision' || st.file === null || st.busy) return
    const token = st.file.token
    ports.emit({ busy: true })
    const gen = ports.getGen()
    try {
      const r = await ports.read(token)
      if (gen !== ports.getGen()) return
      if (r.status === 'gone') {
        ports.emit({ phase: 'open', slotKind: null, file: null, busy: false, pendingChip: false })
        ports.setGateOpen(true)
        ports.onGateReopened()
        return
      }
      const payload = lineageRecoveryPayloadSchema.parse(r.payload)
      if (!(await folderAlive(payload.folderId))) {
        ports.emit({ busy: false, deadFolder: true }) // 恢复禁用（门维持冻结）
        return
      }
      getHost()?.loadPayload(payload)
      restoredLoaded = true // 放弃分支清恢复态判定源（W5）
      // takeOver：原 payload 原样回写（draft 不可能 null 覆盖唯一副本）
      let ok = false
      for (let i = 0; i < TAKEOVER_ATTEMPTS && !ok; i += 1) {
        const res = await ports.save(payload, token)
        if (res.status === 'saved') {
          ok = true
        } else if (res.status === 'stale') {
          ports.adoptEpoch(res.epoch) // 采纳后重试
        } else {
          // pending（槽被换）|queue-overflow（链深满）——降级承接：条保留可重试。
          // [d1-N4 随批登记] 循环不逐轮复查 ws：错 ws 由 main guardWorkspace 拒
          // （错误→外层 catch→条可重试闭合）——IPC 层既有守卫承载。
          break
        }
      }
      if (ok) {
        ports.emit({ phase: 'open', slotKind: null, file: null, busy: false, pendingChip: false })
        ports.setGateOpen(true)
        ports.onGateReopened()
        const host = getHost()
        if (host !== null) {
          host.onRestored(payload)
          host.openLineageView()
        }
        return
      }
      // takeOver 未成=条恢复可用态保留（busy 假+门冻结）——重试恢复或放弃
      ports.emit({ busy: false })
    } catch {
      ports.emit({ busy: false }) // 保持条可重试
    }
  }

  async function discardRecoverySlot(): Promise<void> {
    const st = ports.getState()
    if (st.phase !== 'await-decision' || st.file === null || st.busy) return
    const token = st.file.token
    ports.emit({ busy: true })
    try {
      const res = await ports.release(token, 'discard')
      ports.adoptEpoch(res.epoch) // released 推进后的 epoch 采纳（本会话续用）
      ports.setGateOpen(true)
      // 恢复流程内放弃：清恢复态 store（defer 后编辑期不再清——W5）
      if (restoredLoaded) {
        restoredLoaded = false
        getHost()?.discardLoadedSession()
      }
      ports.emit({ phase: 'open', slotKind: null, file: null, deadFolder: false, busy: false, pendingChip: false })
      ports.onGateReopened()
    } catch {
      ports.emit({ busy: false }) // 失败保持条可重试
    }
  }

  function deferRecoverySlot(): void {
    const st = ports.getState()
    if (st.phase !== 'await-decision') return
    restoredLoaded = false // 稍后处理=编辑期开始——放弃不再清 store
    ports.setGateOpen(true)
    ports.emit({ phase: 'open', pendingChip: true })
    ports.onGateReopened()
  }

  function reopenRecoveryBar(): void {
    const st = ports.getState()
    if (st.phase !== 'open') return
    if (st.slotKind === null) {
      void enterWorkspaceRecovery() // Z7：slotKind=null（fail-open 后 pending 置 chip）=重新 peek
      return
    }
    ports.setGateOpen(false)
    ports.emit({ phase: 'await-decision' })
  }

  return {
    enterWorkspaceRecovery,
    restoreRecoverySlot,
    discardRecoverySlot,
    deferRecoverySlot,
    reopenRecoveryBar,
    attach(get) {
      getHost = get
    },
    reset() {
      restoredLoaded = false
      getHost = () => null
    }
  }
}
