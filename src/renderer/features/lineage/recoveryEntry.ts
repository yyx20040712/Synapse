/**
 * [F-RECOV-01 → F-RECOV-04] recoveryEntry —— ws-entry 屏障与确认条决策族（终裁
 * W1/W6 拆件：自 recoveryScheduler 迁入；构造注入 SchedulerPorts，entry 零
 * import scheduler——依赖方向 scheduler→entry 单向无环；scheduler 门面委托）。
 *
 * ── 行为面（确认条状态机：checking→{open|await-decision}；await-decision→
 *    {restore 成功→open|discard（确认后）→open|defer→open+pendingChip|
 *    deadFolder（冻结维持）|reopen→await-decision}）──
 * - enter：bumpGen（保留面）+冻结→peek（1500ms 界——确认条动作面 busy 不可永
 *   挂）→empty=开门+开门补存（视同编辑事件 trailing，W9）／available|invalid|
 *   foreign-version=确认条维持冻结直到决策（degraded 保留——W5① frozen 不清）；
 *   peek 失败=fail-open 开门+degraded（kind=unavailable）。
 * - [F-RECOV-04 回炉 B-2] restore 全序（设计稿 §2.3/§3.4 主控终裁⑥复审修正版
 *   ——先落定后单次替换确认）：恢复请求→未落定写判定（queue 非空∨草稿在∨
 *   flushing，宿主谓词单源）→未落定写在场=先落定步（busy 态：开门→宿主收口
 *   草稿经既有 commit 入口转队列+save()——commit 入口 closeEdit/beginUnitGated
 *   受 recovery 门拦，落定步经调度器既有合法通道 setGateOpen 开门、收口即回
 *   冻结；四条件核验 clean∧!flushing∧queue 空∧草稿无 驻宿主）→任一不过/失败=
 *   停条 busy=f 可重试（不弹确认不自动续）→过=单次替换确认（「已保存当前 N 项
 *   修改」，无「不落定直接替换」径）→read（界）→folder 校验（fail-open）→
 *   预检（宿主装配读面→纯数据清单；读取失败=阻断可重试〔终裁②〕；冲突=清单
 *   再确认〔D2〕）→defer 过且无冲突且未确认过=替换确认→载入→takeOver 原样
 *   回写（≤3 次；stale 采纳重试；pending|queue-overflow=break 条保留可重试
 *   ——N8）→水化计划→路由。未落定写空且非 defer（启动屏障直达）=零确认直达
 *   （e2e R1-R5 语义不变）。
 * - [F-RECOV-04] discard：确认框（动作数+草稿+「新的编辑将重新受副本保护」
 *   ——终裁⑤）确认后才 release；询问未接线=fail-open 继续（既有测试夹具兼容）。
 * - defer：busy 期禁用（终裁①）；开门+pendingChip 常驻／reopen 重开再冻结
 *   （slotKind=null=重新 peek——Z7 死按钮修复复用 enter 全语义）。
 * - [回炉 B-3] 确认流跨代判废=操作序号 opSeq（与 gen 分轴——gen 可被内部
 *   save() 的 clean 化合法推进，不作操作身份依据）：enter/reset 作废在途操作；
 *   每个操作起始捕获本序号，其后每个 await 边界与每次 loadPayload/release/
 *   门写/busy 写前校验身份，过期操作静默放弃（零 emit 零 IPC 零门写——不得
 *   清新操作 busy、不得动新条状态、不得改门）。
 * - [W6②] 决策开门（gone/discard/defer/restore 成功）→onGateReopened：宿主
 *   判 degraded∧快照非空=立即臂探针（不等编辑）；快照空=W6① 即刻清。
 *
 * 宿主钩子接线（F-RECOV-04 增四项可选——生产宿主=RecoveryBarHost 恒装配；
 * 未注入的旧测试夹具沿原语义）：hasUnsettledWrites（覆盖守卫判定源——缺省
 * fail-open 无未落定写）；askRestoreDecision（确认框承载——settle-replace 缺省
 * 取消、replace/conflicts 缺省继续）；settleUnsettledWrites（落定步承载——缺省
 * 视为已落定，旧夹具兼容）；runRestorePreflight（预检装配——缺省跳过=零
 * graph 读，旧夹具零适配）。
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
  type LineageRecoveryPayload,
  type RecoveryPeekRes,
  type RecoveryReadRes,
  type RecoveryReleaseRes,
  type RecoverySaveRes,
  type RecoverySlotFile
} from '@shared/recovery/schemas'
import type { PreflightConflict } from './recovery-restore-preflight'

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
/** [回炉 B-2] 落定步结果：boolean=成败（旧测试夹具兼容形——无计数）；对象形=
 *  生产宿主落定四条件核验+已收口计数（确认文案「已保存当前 N 项修改」数据面；
 *  savedActions 含经既有 commit 入口收口的草稿） */
export type SettleUnsettledResult = boolean | { ok: boolean; savedActions: number; savedDraft: boolean }

/** [F-RECOV-04] 恢复决策询问类型（宿主承载确认框——resolve(true)=继续/false=取消） */
export type RestoreDecision =
  | { kind: 'settle-replace'; savedActions: number; savedDraft: boolean }
  | { kind: 'replace' }
  | { kind: 'conflicts'; conflicts: PreflightConflict[]; replaceWarning: boolean }
  | { kind: 'discard'; actionCount: number; draftPresent: boolean }
  | { kind: 'preflight-unavailable' }

/** 预检结果（宿主装配读面→纯数据清单；read-failed=阻断可重试——终裁②） */
export type PreflightOutcome = { kind: 'ran'; conflicts: PreflightConflict[] } | { kind: 'read-failed' }

/** 恢复流程宿主回调（scheduler 装配时转发——store 载入/水化/路由/弃置清态；
 *  F-RECOV-04 四项可选钩子未注入=旧语义，见头注缺省表） */
export interface RecoveryEntryHost {
  loadPayload(payload: unknown): void
  onRestored(payload: unknown): void
  openLineageView(): void
  discardLoadedSession(): void
  /** 未落定写谓词（queue 非空∨草稿在∨flushing——宿主装配 store+草稿观测） */
  hasUnsettledWrites?(): boolean
  /** 恢复决策询问（确认框承载） */
  askRestoreDecision?(decision: RestoreDecision): Promise<boolean>
  /** 落定当前会话写（草稿经既有 commit 入口转队列+flush+四条件核验；false=落定
   *  失败——停条可重试不自动续；对象形=核验结果+已收口计数） */
  settleUnsettledWrites?(): Promise<SettleUnsettledResult>
  /** 恢复预检（graph/folders 读面装配→纯数据清单） */
  runRestorePreflight?(payload: LineageRecoveryPayload): Promise<PreflightOutcome>
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
  // [回炉 B-3] 恢复操作序号（opSeq）：确认流操作身份轴，与 gen 分轴（gen 可被
  // 内部 save() 的 clean 化合法推进——落定步 flush 即触发 clean-gen 增长，gen
  // 快照不构成操作身份）。enter/reset 递增作废在途操作；操作体每个 await 边界
  // 与每次 loadPayload/release/门写/busy 写前校验身份，过期操作静默放弃。
  let opSeq = 0

  async function enterWorkspaceRecovery(): Promise<void> {
    opSeq += 1 // [回炉 B-3] 重入工作区作废在途确认流操作（旧确认迟到零副作用）
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
      // peek 失败=fail-open 开门+degraded（副本态未知=当前编辑未受保护）；
      // [复审 R2-B1] 迟到失败判废——旧 enter 的 reject 不覆盖新条状态/不解冻新门
      if (gen !== ports.getGen()) return
      ports.emit({ phase: 'open', degraded: true, kind: 'unavailable', restartHint: false })
      ports.setGateOpen(true)
      ports.requestPendingResend()
    }
  }

  async function restoreRecoverySlot(): Promise<void> {
    const st = ports.getState()
    if (st.phase !== 'await-decision' || st.file === null || st.busy) return
    const token = st.file.token
    const host = getHost()
    const op = opSeq // [回炉 B-3] 本操作身份（enter/reset 作废）
    const alive = (): boolean => op === opSeq
    ports.emit({ busy: true })
    // [F-RECOV-04 C3/C4 主控终裁⑥复审修正版] 先落定后单次替换确认：未落定写在
    // 场→恢复不执行（不 read 不 loadPayload），先进入落定步（busy 态）。草稿经
    // 既有 commit 入口转队列+save() 由宿主承载；commit 入口（closeEdit/
    // beginUnitGated）受 recovery 门拦——落定步经调度器既有合法通道 setGateOpen
    // 开门收口、收口即回冻结（禁绕门旁门：四条件核验在宿主为终审，开门窗内新
    // 编辑会被核验拦回停条）。四条件全过才弹替换确认；任一不过/失败=停条
    // busy=f 可重试（不弹确认不自动续）。
    let replaceConfirmed = false
    if ((host?.hasUnsettledWrites?.() ?? false) === true) {
      ports.setGateOpen(true)
      let raw: SettleUnsettledResult
      try {
        raw = host?.settleUnsettledWrites !== undefined ? await host.settleUnsettledWrites() : true
      } catch {
        // [复审 R2-B2] 落定钩子 reject=「任一不过/失败」面：停条 busy=f 门回冻结
        // 可重试（不外抛——宿主 void 调用防 unhandled rejection）；身份过期=静默放弃
        if (!alive()) return
        ports.setGateOpen(false)
        ports.emit({ busy: false })
        return
      }
      if (!alive()) return // [B-3] 身份过期——门/条归属新状态，零写静默放弃
      ports.setGateOpen(false) // 落定收口即回冻结（确认与载入窗编辑不可达）
      const settled = typeof raw === 'boolean' ? raw : raw.ok
      if (!settled) {
        ports.emit({ busy: false }) // 停条可重试（终裁⑥——不自动续）
        return
      }
      replaceConfirmed = true
      const go =
        host?.askRestoreDecision !== undefined
          ? await host.askRestoreDecision({
              kind: 'settle-replace',
              savedActions: typeof raw === 'boolean' ? 0 : raw.savedActions,
              savedDraft: typeof raw === 'boolean' ? false : raw.savedDraft
            })
          : false // 询问未接线=取消（破坏径 fail-closed）
      if (!alive()) return
      if (!go) {
        ports.emit({ busy: false })
        return
      }
    }
    const gen = ports.getGen() // 落定步 flush 合法推进 gen——快照自此取（B-3 分轴注）
    try {
      const r = await ports.read(token)
      if (!alive() || gen !== ports.getGen()) return // [B-3]+既有 gen 双守卫
      if (r.status === 'gone') {
        if (!alive()) return
        ports.emit({ phase: 'open', slotKind: null, file: null, busy: false, pendingChip: false })
        ports.setGateOpen(true)
        ports.onGateReopened()
        return
      }
      const payload = lineageRecoveryPayloadSchema.parse(r.payload)
      const folderOk = await folderAlive(payload.folderId)
      if (!alive()) return // [复审 R2-W1] 真支路同判废——旧操作不得派发预检读面
      if (!folderOk) {
        ports.emit({ busy: false, deadFolder: true }) // 恢复禁用（门维持冻结）
        return
      }
      // [F-RECOV-04 D1/D2/D3] 预检（宿主装配读面→纯数据清单；未接线=跳过——
      // 旧测试夹具零适配）。读取失败=阻断可重试（与冲突不同态不同文案——终裁②）；
      // 冲突=清单再确认（取消=副本保留可重试）；defer 过且无冲突且落定步未确认
      // 过=替换确认一次。
      if (host?.runRestorePreflight !== undefined) {
        const outcome = await host.runRestorePreflight(payload)
        if (!alive()) return
        if (outcome.kind === 'read-failed') {
          if (host.askRestoreDecision !== undefined) {
            await host.askRestoreDecision({ kind: 'preflight-unavailable' })
          }
          if (!alive()) return
          ports.emit({ busy: false })
          return
        }
        if (outcome.conflicts.length > 0) {
          const go =
            host.askRestoreDecision !== undefined
              ? await host.askRestoreDecision({
                  kind: 'conflicts',
                  conflicts: outcome.conflicts,
                  replaceWarning: st.pendingChip
                })
              : true
          if (!alive()) return
          if (!go) {
            ports.emit({ busy: false })
            return
          }
        } else if (st.pendingChip && !replaceConfirmed) {
          const go =
            host.askRestoreDecision !== undefined ? await host.askRestoreDecision({ kind: 'replace' }) : true
          if (!alive()) return
          if (!go) {
            ports.emit({ busy: false })
            return
          }
        }
      }
      if (!alive()) return // [B-3] 载入前末守卫——旧操作不得 loadPayload
      getHost()?.loadPayload(payload)
      restoredLoaded = true // 放弃分支清恢复态判定源（W5）
      // takeOver：原 payload 原样回写（draft 不可能 null 覆盖唯一副本）
      let ok = false
      for (let i = 0; i < TAKEOVER_ATTEMPTS && !ok; i += 1) {
        const res = await ports.save(payload, token)
        if (!alive()) return // [B-3] 迟到 save 结果零簿记（epoch/条/门全不动）
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
      if (alive()) ports.emit({ busy: false }) // [B-3] 失败收口不得清新操作 busy
    }
  }

  async function discardRecoverySlot(): Promise<void> {
    const st = ports.getState()
    if (st.phase !== 'await-decision' || st.file === null || st.busy) return
    const token = st.file.token
    const host = getHost()
    const op = opSeq // [回炉 B-3] 本操作身份
    const alive = (): boolean => op === opSeq
    ports.emit({ busy: true })
    // [F-RECOV-04 A4] 放弃不可逆确认：确认前不 release（副本=唯一删除径——
    // release 即物理删槽）。文案数据面=动作数+草稿+「新的编辑将重新受副本保护」
    // （终裁⑤）；询问未接线=fail-open 继续（既有测试夹具兼容——生产宿主恒装配）
    const go =
      host?.askRestoreDecision !== undefined
        ? await host.askRestoreDecision({
            kind: 'discard',
            actionCount: st.file.actionCount,
            draftPresent: st.file.draftPresent
          })
        : true
    if (!alive()) return // [B-3] 旧确认迟到=零副作用（不 release 不动条不动门）
    if (!go) {
      ports.emit({ busy: false })
      return
    }
    try {
      const res = await ports.release(token, 'discard')
      if (!alive()) return // [B-3] 迟到 release 结果零簿记
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
      if (alive()) ports.emit({ busy: false }) // [B-3] 失败收口不得清新操作 busy
    }
  }

  function deferRecoverySlot(): void {
    const st = ports.getState()
    if (st.phase !== 'await-decision' || st.busy) return // [F-RECOV-04 终裁①] busy 期 defer 同禁（A7 全钮一致）
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
      opSeq += 1 // [回炉 B-3] 重装配作废在途确认流操作
      getHost = () => null
    }
  }
}
