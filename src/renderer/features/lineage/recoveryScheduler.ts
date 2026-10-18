/**
 * [F-VISFB-65 U5] recoveryScheduler —— 脉络暂存会话恢复副本调度器（设计书
 * §4/§6/§9；store-free 模块单例：workspaceId/快照/载入/水化/路由全部注入，
 * 与 lineage.store 双向零环——store 只消费 recoveryBlocked/钩子）。
 *
 * ── 行为面（状态机=§9 轴 scheduler{idle,armed,writing,coalescing,
 *    clean-released,degraded}×gate{open,frozen}；跨格不变量头注逐条）──
 * - 触发面：编辑单元（enqueue 后）/草稿内容变更/出队 saveNow/恢复 takeOver。
 *   写频=300ms trailing 节流+单飞行+最新快照合流；出队 saveNow 不节流即时发。
 * - 代际（INV-161）：凡 clean 化/弃置/工作区切换，**同一同步 tick** 先 gen++
 *   +丢 pending 快照+清 trailing/退避定时器，再等在途收束（响应按 gen 判废
 *   ——token 簿记除外：release 收口取在途写的最新 token，防近全量副本留驻），
 *   再 release（ownToken/lastWrittenToken 清空）。
 * - save 失败退避 3 次（1s/2s/4s）→degraded：持久视觉态（chip 常驻——
 *   INV-166 恢复故障不降编辑可用性，不 toast 轰炸）；成功清除。
 * - stale 采纳：epoch 失配=stale→采纳回包 epoch 按节流重发（自愈单环）。
 * - pending 拒写→chip「恢复副本待处理」（W-07 稍后处理族）。
 * - ws-entry 屏障（B-04/W-11）：进入即 frozen（blocked()=真）→peek→
 *   empty=开门/available|invalid|foreign-version=确认条维持冻结直到决策
 *   （恢复/放弃/稍后处理）；peek 失败=fail-open 开门+degraded。
 * - 退出窗（§4）：强退=最后 saveNow 尽力不 release；clean 收口链
 *   awaitRecoveryQuitSettled 供 quit-flush 收口（1500ms 硬超时 fail-open）。
 * - 未装配（inited=假）：一切入口 no-op、blocked() 恒假（存量单测兼容）。
 */
import { api, unwrap } from '../../api/client'
import { MAIN_GRAPH_ID } from '@shared/models/lineage'
import {
  lineageRecoveryPayloadSchema,
  type LineageRecoveryPayload,
  type RecoverySlotFile
} from '@shared/recovery/schemas'

const RECOVERY_TYPE = 'lineage-session'
const TRAILING_MS = 300
const QUIT_TIMEOUT_MS = 1500
const BACKOFF_DELAYS = [1000, 2000, 4000]
const TAKEOVER_ATTEMPTS = 3

export interface RecoverySchedulerInit {
  workspaceId(): string
  /** 当前可保存快照（clean 会话返 null——未编辑会话零恢复面写） */
  snapshot(): LineageRecoveryPayload | null
  /** 恢复载入 store（置 dirty+两栈清——宿主=lineage.store.applyRecoverySession） */
  loadPayload(payload: LineageRecoveryPayload): void
  /** 载入+接管完成后回调（草稿再水化计划驻宿主） */
  onRestored(payload: LineageRecoveryPayload): void
  openLineageView(): void
  /** [回炉 W5] 放弃分支清恢复态 store（宿主=lineage.store.discardSession——
   *  再保存不复活已弃会话；仅恢复流程内调用，defer 后不再清） */
  discardLoadedSession(): void
}

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
}

type Timer = ReturnType<typeof setTimeout>

// ── 模块单例态 ──────────────────────────────────────────────
let inited = false
let initFns: RecoverySchedulerInit | null = null
const sessionId = crypto.randomUUID()

let gateOpen = true
let epoch = 0
let ownToken: string | null = null
let lastWrittenToken: string | null = null
let generation = 0
let trailingTimer: Timer | null = null
let backoffTimer: Timer | null = null
let inFlight: Promise<unknown> | null = null
let needsResend = false
let immediateResend = false
let failStreak = 0
let restoredLoaded = false
let quitChain: Promise<void> = Promise.resolve()

let uiState: RecoveryUiState = {
  phase: 'idle',
  slotKind: null,
  file: null,
  deadFolder: false,
  busy: false,
  pendingChip: false,
  degraded: false
}
const listeners = new Set<() => void>()

function emit(patch?: Partial<RecoveryUiState>): void {
  if (patch !== undefined) uiState = { ...uiState, ...patch }
  for (const cb of listeners) cb()
}

function clearTimers(): void {
  if (trailingTimer !== null) {
    clearTimeout(trailingTimer)
    trailingTimer = null
  }
  if (backoffTimer !== null) {
    clearTimeout(backoffTimer)
    backoffTimer = null
  }
}

/** 1500ms 硬超时 fail-open（§4：save/release 各自带界） */
function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('恢复副本操作超时')), ms)
    p.then(
      (v) => {
        clearTimeout(t)
        resolve(v)
      },
      (e) => {
        clearTimeout(t)
        reject(e)
      }
    )
  })
}

// ── 写面（节流/单飞/合流/退避）──────────────────────────────

async function dispatchSave(gen: number): Promise<void> {
  const fns = initFns
  if (fns === null) return
  const payload = fns.snapshot()
  if (payload === null) return
  try {
    // [回炉 W3] 常态写无硬超时（1500ms 界只属确认条动作与退出窗——慢盘不作败）
    const res = await unwrap(
      api.recovery.save({
        workspaceId: fns.workspaceId(),
        type: RECOVERY_TYPE,
        epoch,
        session: sessionId,
        payload
      })
    )
    if (res.status === 'saved') {
      // token 簿记不受 gen 判废（clean 收口取最新 token——防近全量副本留驻）
      lastWrittenToken = res.token
      if (gen === generation) {
        ownToken = res.token
        failStreak = 0
        emit({ degraded: false })
      }
      return
    }
    if (res.status === 'stale') {
      if (gen === generation) {
        epoch = res.epoch
        armTrailing() // 采纳新 epoch 后按节流重发（自愈单环）
      }
      return
    }
    if (gen === generation) {
      emit({ pendingChip: true })
    }
  } catch {
    if (gen === generation) scheduleBackoff()
  }
}

function scheduleBackoff(): void {
  failStreak += 1
  if (failStreak > BACKOFF_DELAYS.length) {
    emit({ degraded: true })
    return
  }
  const delay = BACKOFF_DELAYS[Math.min(failStreak - 1, BACKOFF_DELAYS.length - 1)]!
  backoffTimer = setTimeout(() => {
    backoffTimer = null
    void pump()
  }, delay)
}

function armTrailing(): void {
  if (!inited) return
  if (inFlight !== null || trailingTimer !== null) {
    needsResend = true
    return
  }
  trailingTimer = setTimeout(() => {
    trailingTimer = null
    void pump()
  }, TRAILING_MS)
}

async function pump(): Promise<void> {
  if (inFlight !== null || !inited) return
  const gen = generation
  // 本次发送即取最新快照——先消费挂起标记（防自触发循环：saveNow 置位→本次
  // 发送→收束误读旧标记再次发送）
  needsResend = false
  immediateResend = false
  inFlight = dispatchSave(gen)
  await inFlight
  inFlight = null
  // 飞行窗内新触发：即时类立即补发（单飞合流），节流类重臂 300ms
  if (needsResend) {
    needsResend = false
    if (immediateResend) {
      immediateResend = false
      void pump()
    } else {
      armTrailing()
    }
  }
}

/** 编辑单元触发（enqueue 后）——300ms trailing */
export function notifyRecoveryEditUnit(): void {
  armTrailing()
}

/** 草稿内容变更触发（B-02——与编辑单元同节流面） */
export function notifyRecoveryDraftChange(): void {
  armTrailing()
}

/** 出队 saveNow（flush 每动作成功出队后——fire-and-forget 不节流即时发） */
export function notifyRecoverySaveNow(): void {
  if (!inited) return
  needsResend = true
  immediateResend = true
  if (inFlight !== null) return
  if (trailingTimer !== null) {
    clearTimeout(trailingTimer)
    trailingTimer = null
  }
  void pump()
}

// ── clean 族（generation 同步先行——INV-161）────────────────

function markCleanAwaitable(reason: 'clean' | 'discard'): Promise<void> {
  generation += 1 // 同步先行：本 tick 内 pending/trailing 全作废
  needsResend = false
  immediateResend = false
  clearTimers()
  const flight = inFlight
  const ws = initFns?.workspaceId() ?? ''
  const chain = (async () => {
    if (flight !== null) await flight // drain 在途（token 簿记保留）
    const token = lastWrittenToken ?? ownToken
    ownToken = null
    lastWrittenToken = null
    if (token === null || ws === '' || !inited) return
    try {
      await withTimeout(
        unwrap(
          api.recovery.release({
            workspaceId: ws,
            type: RECOVERY_TYPE,
            token,
            reason
          })
        ),
        QUIT_TIMEOUT_MS
      )
    } catch {
      // 失败吞接：副本留驻=下次启动屏障兜底（无害恢复族——INV-167）
    }
  })()
  quitChain = chain
  return chain
}

/** clean 四源挂点（flush 全成功/undo 回基线/discardSession/退出 clean）——fire-and-forget */
export function markRecoveryClean(reason: 'clean' | 'discard'): void {
  if (!inited) return
  void markCleanAwaitable(reason)
}

/** 退出窗收口等待（quit-flush ③ 后消费；release 自带 1500ms 界） */
export async function awaitRecoveryQuitSettled(): Promise<void> {
  await quitChain
}

/** 强退尽力：最后 saveNow（不 release——副本承载未落库状态） */
export function strongQuitRecoveryBestEffort(): void {
  if (!inited) return
  needsResend = true
  immediateResend = true
  if (inFlight !== null) return
  if (trailingTimer !== null) {
    clearTimeout(trailingTimer)
    trailingTimer = null
  }
  void pump()
}

/** 工作区切换（确认弃置后）：代际先行+弃置 release（reload 竞窗留驻=无害） */
export function prepareRecoveryWorkspaceSwitch(): Promise<void> {
  if (!inited) return Promise.resolve()
  // [d1-N2 主控亲笔] drain 等待 1500ms 封顶：在途 save 永不 settle 时切换不
  // 永久 busy；迟到 release=INV-167 无害族（副本留驻下次屏障承接）
  return Promise.race([
    markCleanAwaitable('discard'),
    new Promise<void>((resolve) => {
      setTimeout(resolve, 1500)
    })
  ])
}

// ── ws-entry 屏障与确认条（§6）──────────────────────────────

export async function enterWorkspaceRecovery(): Promise<void> {
  if (!inited) return
  generation += 1
  needsResend = false
  immediateResend = false
  clearTimers()
  gateOpen = false
  emit({ phase: 'checking', slotKind: null, file: null, deadFolder: false, busy: false, pendingChip: false })
  const fns = initFns!
  const gen = generation
  try {
    // [回炉 W3] peek=确认条动作面（busy 不可永挂）——带 1500ms 硬超时，超时
    // 走既有 reject 路径=fail-open 开门+degraded
    const res = await withTimeout(unwrap(api.recovery.peek({ workspaceId: fns.workspaceId() })), QUIT_TIMEOUT_MS)
    if (gen !== generation) return // 迟到响应（重入/切换竞窗）判废
    const slot = res.slots[RECOVERY_TYPE]
    epoch = slot?.epoch ?? epoch
    ownToken = null
    lastWrittenToken = null
    if (slot === undefined || slot.status === 'empty') {
      gateOpen = true
      emit({ phase: 'open', degraded: false }) // [回炉轮2 Z6] 成功 entry 清 degraded
      restorePendingSnapshot() // [回炉 W9] 冻结窗残留脏态补存
      return
    }
    emit({ phase: 'await-decision', slotKind: slot.status, file: slot.file ?? null, degraded: false }) // Z6 同
  } catch {
    // peek 失败=fail-open 开门+degraded（副本态未知=当前编辑未受保护）
    gateOpen = true
    emit({ phase: 'open', degraded: true })
    restorePendingSnapshot()
  }
}

/** [回炉 W9] 开门补存：冻结窗已存在的脏快照 armed（peek 收束沿——理论不可
 *  达面〔装配即冻结〕的防御性补口，窗口残留申报） */
function restorePendingSnapshot(): void {
  if (initFns !== null && initFns.snapshot() !== null) armTrailing()
}

async function folderAlive(folderId: string): Promise<boolean> {
  if (folderId === MAIN_GRAPH_ID) return true
  try {
    const folders = await unwrap(api.folders.list({}))
    return folders.some((f) => f.id === folderId)
  } catch {
    return true // 校验面失败=fail-open（真拒绝在 flush 冲突链——单元二）
  }
}

/** 恢复=read→folder 校验→载入→takeOver 原样回写→水化计划→路由 */
export async function restoreRecoverySlot(): Promise<void> {
  if (!inited || uiState.phase !== 'await-decision' || uiState.file === null || uiState.busy) return
  const fns = initFns!
  const token = uiState.file.token
  emit({ busy: true })
  const gen = generation
  try {
    // [回炉 W3] 确认条动作带 1500ms 硬超时（busy 不可永挂——超时=外层 catch
    // 保持条可重试）
    const r = await withTimeout(
      unwrap(api.recovery.read({ workspaceId: fns.workspaceId(), type: RECOVERY_TYPE, token })),
      QUIT_TIMEOUT_MS
    )
    if (gen !== generation) return
    if (r.status === 'gone') {
      gateOpen = true
      emit({ phase: 'open', slotKind: null, file: null, busy: false, pendingChip: false })
      return
    }
    const payload = lineageRecoveryPayloadSchema.parse(r.payload)
    if (!(await folderAlive(payload.folderId))) {
      emit({ busy: false, deadFolder: true }) // 恢复禁用（门维持冻结）
      return
    }
    fns.loadPayload(payload)
    restoredLoaded = true // [回炉 W5] 放弃分支清恢复态判定源
    // takeOver：原 payload 原样回写（B-03——draft 不可能 null 覆盖唯一副本）
    let ok = false
    for (let i = 0; i < TAKEOVER_ATTEMPTS && !ok; i += 1) {
      const res = await withTimeout(
        unwrap(
          api.recovery.save({
            workspaceId: fns.workspaceId(),
            type: RECOVERY_TYPE,
            epoch,
            session: sessionId,
            payload,
            takeOverToken: token
          })
        ),
        QUIT_TIMEOUT_MS
      )
      if (res.status === 'saved') {
        ownToken = res.token
        lastWrittenToken = res.token
        ok = true
      } else if (res.status === 'stale') {
        epoch = res.epoch // 采纳后重试
      } else {
        break // pending：槽被换（单实例下不可达）——降级承接
      }
    }
    if (ok) {
      gateOpen = true
      emit({ phase: 'open', slotKind: null, file: null, busy: false, pendingChip: false })
      fns.onRestored(payload)
      fns.openLineageView()
      return
    }
    // [回炉 W5·主控批补充] takeOver 未成=条恢复可用态保留（busy 假+门冻结）——
    // 重试恢复或放弃（放弃将 discardLoadedSession 清 store——再保存不复活）
    emit({ busy: false })
  } catch {
    emit({ busy: false }) // 保持条可重试
  }
}

/** 放弃=release(token,'discard') */
export async function discardRecoverySlot(): Promise<void> {
  if (!inited || uiState.phase !== 'await-decision' || uiState.file === null || uiState.busy) return
  const token = uiState.file.token
  emit({ busy: true })
  try {
    const res = await withTimeout(
      unwrap(
        api.recovery.release({
          workspaceId: initFns!.workspaceId(),
          type: RECOVERY_TYPE,
          token,
          reason: 'discard'
        })
      ),
      QUIT_TIMEOUT_MS
    )
    epoch = res.epoch // released 推进后的 epoch 采纳（本会话续用）
    gateOpen = true
    // [回炉 W5] 恢复流程内放弃：清恢复态 store（defer 后编辑期不再清）
    if (restoredLoaded) {
      restoredLoaded = false
      initFns!.discardLoadedSession()
    }
    emit({ phase: 'open', slotKind: null, file: null, deadFolder: false, busy: false, pendingChip: false })
  } catch {
    emit({ busy: false }) // 失败保持条可重试
  }
}

/** 稍后处理：收起条开门可编辑（chip 常驻）——新 save 撞 pending 拒=未受保护呈现 */
export function deferRecoverySlot(): void {
  if (uiState.phase !== 'await-decision') return
  gateOpen = true
  restoredLoaded = false // [回炉 W5] 稍后处理=编辑期开始——放弃不再清 store
  emit({ phase: 'open', pendingChip: true })
}

/** chip 重开确认条（再冻结直到决策）。[回炉轮2 Z7] slotKind=null（fail-open
 *  开门后 save 撞 pending 置 chip——旧查看 no-op 死按钮）时=重新 peek：
 *  enterWorkspaceRecovery 全语义复用（空槽→chip 清+开门；有槽→确认条再现） */
export function reopenRecoveryBar(): void {
  if (uiState.phase !== 'open') return
  if (uiState.slotKind === null) {
    void enterWorkspaceRecovery()
    return
  }
  gateOpen = false
  emit({ phase: 'await-decision' })
}

// ── 门/状态/生命周期 ────────────────────────────────────────

/** 写面门（beginUnitGated 消费——quitWriteBlocked 同型；未装配恒假） */
export function recoveryBlocked(): boolean {
  return inited && !gateOpen
}

export function getRecoveryState(): RecoveryUiState {
  return uiState
}

export function subscribeRecoveryState(cb: () => void): () => void {
  listeners.add(cb)
  return () => {
    listeners.delete(cb)
  }
}

export function initRecoveryScheduler(init: RecoverySchedulerInit): void {
  initFns = init
  inited = true
  // [回炉 W9/d1-W04] 装配即冻结：清单加载窗（workspaceId 空）编辑不可达——
  // 开门权唯一归 enterWorkspaceRecovery 决策（peek 空/fail-open/确认条决策）
  gateOpen = false
}

/** 复位（测试/重装配；幂等） */
export function resetRecoveryScheduler(): void {
  clearTimers()
  inited = false
  initFns = null
  gateOpen = true
  epoch = 0
  ownToken = null
  lastWrittenToken = null
  inFlight = null
  needsResend = false
  immediateResend = false
  failStreak = 0
  restoredLoaded = false
  quitChain = Promise.resolve()
  uiState = {
    phase: 'idle',
    slotKind: null,
    file: null,
    deadFolder: false,
    busy: false,
    pendingChip: false,
    degraded: false
  }
}
