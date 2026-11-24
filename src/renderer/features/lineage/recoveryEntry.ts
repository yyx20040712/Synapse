/**
 * [F-RECOV-01 → F-RECOV-04 → B4 L2 拆件] recoveryEntry —— ws-entry 屏障与确认条决策族
 * 门面（构造注入 SchedulerPorts，entry 零 import scheduler——依赖方向 scheduler→entry
 * 单向无环；恢复流程体=recovery-restore-flow）。
 * [回炉 W-D2b 拆件] 呈现态与两端端口契约类型=recovery-entry-model（本件原名再导出）。
 * [F-RECOV-01 → F-RECOV-04] recoveryEntry —— ws-entry 屏障与确认条决策族（终裁
 * W1/W6 拆件：自 recoveryScheduler 迁入；构造注入 SchedulerPorts，entry 零
 * import scheduler——依赖方向 scheduler→entry 单向无环；scheduler 门面委托）。
 *
 * ── 行为面（确认条状态机：checking→{open|await-decision}；await-decision→
 *    {restore 成功→open|discard（确认后）→open|defer→open+pendingChip|
 *    deadFolder（冻结维持）|reopen→await-decision}）──
 * - enter：bumpGen（保留面）+冻结→peek（1500ms 界——确认条动作面 busy 不可永挂）
 *   →empty=开门+开门补存（视同编辑事件 trailing，W9）／available|invalid|
 *   foreign-version=确认条维持冻结直到决策（degraded 保留——W5①）；peek 失败=
 *   fail-open 开门+degraded（kind=unavailable）。
 * - [F-RECOV-04 回炉 B-2] restore 全序（设计稿 §2.3/§3.4 主控终裁⑥复审修正版
 *      ——先落定后单次替换确认）：恢复请求→未落定写判定（queue 非空∨草稿在∨
 *      flushing，宿主谓词单源）→未落定写在场=先落定步（busy 态：开门→宿主收口
 *      草稿经既有 commit 入口转队列+save()——commit 入口 closeEdit/beginUnitGated
 *      受 recovery 门拦，落定步经调度器既有合法通道 setGateOpen 开门、收口即回
 *      冻结；四条件核验 clean∧!flushing∧queue 空∧草稿无 驻宿主）→任一不过/失败=
 *      停条 busy=f 可重试（不弹确认不自动续）→过=单次替换确认（「已保存当前 N 项
 *      修改」，无「不落定直接替换」径）→read（界）→folder 校验（fail-open）→
 *      预检（宿主装配读面→纯数据清单；读取失败=阻断可重试〔终裁②〕；冲突=清单
 *      再确认〔D2〕——清单确认携替换警示，一次确认不二问）→无冲突且未确认过、
 *      而 defer 过或替换守卫为真（副本目标会话有 unfinalized 或 undo/
 *      redo 非空——hasReplaceableSession，用户裁决 R2 只看目标会话；[回炉 W-B3·R-B5] 设计稿 §6.3：有历史但
 *      IO clean 时只确认替换、不预先落定）=替换确认→载入→takeOver 原样回写
 *      （≤3 次；stale 采纳重试；pending|queue-overflow=break 条保留可重试
 *      ——N8）→水化计划→路由。未落定写空、非 defer 且会话无可替换内容（启动屏障
 *      直达）=零确认直达（e2e R1-R5 语义不变）。流程体驻 recovery-restore-flow
 *      （本件门面转调）；[B4 L2 §8.4 行 7] takeOver 成功→ports.onTakeOver→owner
 *      adopt。
 * - [F-RECOV-04] discard：确认框（动作数+草稿+「新的编辑将重新受副本保护」——终裁⑤）确认后才
 *   release；[B4 L2 §8.4 行 9] release 成功→ports.onForeignSlotReleased（owner 可认领）；
 *   询问未接线=fail-open 继续（既有测试夹具兼容）。
 * - defer：busy 期禁用（终裁①）；开门+pendingChip 常驻／reopen 重开再冻结
 *   （slotKind=null=重新 peek——Z7 死按钮修复复用 enter 全语义）。
 * - [回炉 B-3] 确认流跨代判废=操作序号 opSeq（与 gen 分轴——gen 可被内部
 *      save() 的 clean 化合法推进，不作操作身份依据）：enter/reset 作废在途操作；
 *      每个操作起始捕获本序号，其后每个 await 边界与每次 loadPayload/release/
 *      门写/busy 写前校验身份，过期操作静默放弃（零 emit 零 IPC 零门写——不得
 *      清新操作 busy、不得动新条状态、不得改门）。
 * - [W6②] 决策开门（gone/discard/defer/restore 成功）→onGateReopened：宿主
 *   判 degraded∧快照非空=立即臂探针（不等编辑）；快照空=W6① 即刻清。
 *
 * 宿主钩子接线（F-RECOV-04 增四项可选——生产宿主=RecoveryBarHost 经 recovery-host-ports
 * 恒装配；未注入的旧测试夹具沿原语义）：hasUnsettledWrites（覆盖守卫判定源——缺省
 * fail-open 无未落定写）；askRestoreDecision（确认框承载——settle-replace 缺省
 * 取消、replace/conflicts 缺省继续）；settleUnsettledWrites（落定步承载——缺省
 * 视为已落定，旧夹具兼容）；runRestorePreflight（预检装配——缺省跳过=零
 * graph 读，旧夹具零适配）；hasReplaceableSession（[回炉 W-B3·R-B5] 替换守卫
 * 谓词——缺省=不确认，旧夹具零适配）。
 *
 * 端口面申报（对 W1 九项的偏差——主控报告承载）：增 setGateOpen/getState/
 * getGen/onGateReopened 四项（门写/行为守卫读/代际读/开门收口钩——缺它们须在
 * entry 复制状态=双源）；getGateOpen 无读方删除；requestImmediateSave 落为
 * requestPendingResend（trailing 语义）：锁测 W9 锚「peek 收束→armed→advance
 * 300 首写」与 saveNow 即时形互斥，从 v2 §4.5「视同编辑事件」措辞。
 * [B4 L2] 增 onTakeOver（§8.4 行 7 owner adopt 承载）与 onForeignSlotReleased
 * （行 9 外槽放弃→owner 可认领）。
 */
import type { RecoveryEntryHost, SchedulerPorts } from './recovery-entry-model'
import { createRestoreFlow } from './recovery-restore-flow'

/** [回炉 B-2] 落定步结果：boolean=成败（旧测试夹具兼容形——无计数）；对象形=
 *  生产宿主落定四条件核验+已收口计数（确认文案「已保存当前 N 项修改」数据面；
 *  savedActions 含经既有 commit 入口收口的草稿） */
/** [回炉 W-B3·R-B5] 决策/落定结果/预检结果的契约类型迁驻 recovery-restore-contract（本件已超行数预算）——此处原名再导出，import 路径不变 */
export type { PreflightOutcome, RestoreDecision, SettleUnsettledResult } from './recovery-restore-contract'

export const RECOVERY_TYPE = 'lineage-session'

/** [回炉 W-D2b 拆件] 呈现态与两端端口契约类型迁驻 recovery-entry-model（本件超行数预算）——此处原名再导出，import 路径不变 */
export type { RecoveryPhase, RecoverySlotKind, RecoveryUiState, SchedulerPorts, RecoveryEntryHost } from './recovery-entry-model'

export interface RecoveryEntry {
  enterWorkspaceRecovery(): Promise<void>
  restoreRecoverySlot(): Promise<void>
  discardRecoverySlot(): Promise<void>
  deferRecoverySlot(): void
  reopenRecoveryBar(): void
  attach(getHost: () => RecoveryEntryHost | null): void
  reset(): void
}

export function createRecoveryEntry(ports: SchedulerPorts): RecoveryEntry {
  let restoredLoaded = false
  let getHost: () => RecoveryEntryHost | null = () => null
  // [回炉 B-3] 恢复操作序号（opSeq）：确认流操作身份轴（enter/reset 递增作废在途操作）
  let opSeq = 0

  const flow = createRestoreFlow({
    ports,
    getHost: () => getHost(),
    onLoaded: () => {
      restoredLoaded = true // 放弃分支清恢复态判定源（W5）
    },
    emit: ports.emit,
    setGateOpen: ports.setGateOpen,
    onGateReopened: ports.onGateReopened,
    onTakeOver: ports.onTakeOver
  })

  async function enterWorkspaceRecovery(): Promise<void> {
    opSeq += 1 // 重入工作区作废在途确认流操作（旧确认迟到零副作用）
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
        ports.emit({ phase: 'open', degraded: false, kind: null, restartHint: false }) // Z6 空槽清 degraded
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
    const op = opSeq
    await flow.run(st.file.token, () => op === opSeq)
  }

  async function discardRecoverySlot(): Promise<void> {
    const st = ports.getState()
    if (st.phase !== 'await-decision' || st.file === null || st.busy) return
    const token = st.file.token
    const host = getHost()
    const op = opSeq
    const alive = (): boolean => op === opSeq
    ports.emit({ busy: true })
    // [F-RECOV-04 A4] 放弃不可逆确认：确认前不 release（副本=唯一删除径——release 即
    // 物理删槽）。询问未接线=fail-open 继续（生产宿主恒装配）
    const go =
      host?.askRestoreDecision !== undefined
        ? await host.askRestoreDecision({ kind: 'discard', actionCount: st.file.actionCount, draftPresent: st.file.draftPresent })
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
      ports.onForeignSlotReleased() // [B4 L2 §8.4 行 9] 外槽放弃→owner 可认领
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
      void enterWorkspaceRecovery() // Z7：slotKind=null（fail-open 后）=重新 peek
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
      opSeq += 1 // 重装配作废在途确认流操作
      getHost = () => null
    }
  }
}
