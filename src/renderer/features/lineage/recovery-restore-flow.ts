/**
 * [B4 L2 / 设计稿 §11.2、F-RECOV-04 回炉 B-2/B-3/终裁⑥复审修正版] recovery-restore-flow
 * —— 恢复决策流（recoveryEntry.restoreRecoverySlot 的流程体外移；entry 只留屏障与
 * 决策族门面）。
 *
 * ── 行为面（先落定后单次替换确认）──
 * - restore 请求→未落定写判定（queue 非空∨草稿在∨flushing——宿主谓词单源）→在场=
 *   先落定步（busy 态：开门→宿主收口草稿经既有 commit 入口转队列+save()——commit
 *   入口受 recovery 门拦，落定步经调度器既有合法通道 setGateOpen 开门、收口即回
 *   冻结）→任一不过/失败=停条 busy=f 可重试（不弹确认不自动续）→过=单次替换确认
 *   （「已保存当前 N 项修改」，无「不落定直接替换」径）→read（界）→folder 校验
 *   （fail-open）→预检（宿主装配读面→纯数据清单；读取失败=阻断可重试〔终裁②〕；
 *   冲突=清单再确认〔D2〕，清单携替换警示——一次确认不二问）→替换确认（触发条件
 *   见下）→载入→takeOver 原样回写（≤3 次；stale 采纳重试；pending|queue-overflow
 *   =break 条保留可重试——N8）→水化计划→路由。
 * - 替换确认的触发（[回炉 W-B3·R-B5] 设计稿 §6.3、§2.5 #39）：落定步/冲突清单
 *   都未确认过，且（defer 过〔pendingChip——沿用既有条件：仅宿主接了预检时确认〕
 *   或替换守卫为真）。替换守卫=hasReplaceableSession(payload.folderId)：副本目标会话
 *   有 Q/F/draft、unfinalized 或 undo/redo 非空（用户裁决 R2：只看目标会话——活动
 *   会话≠目标时不计）；目标 folder 只在
 *   read 之后可知，故钩子带 folderId 参数、读到 payload 后求值。仅 U/H/R（IO
 *   clean）=只弹替换确认、不预先落定；用户拒绝=不载入、条回 busy=f 可重试。宿主
 *   未提供该谓词=旧语义（旧夹具零适配）。未落定写空、非 defer 且无可替换内容
 *   （启动屏障直达）=零确认直达（e2e R1-R5 语义不变）。
 * - [B4 L2 §8.4 行 7] takeOver 成功→owner=F（onTakeOver——调度器装配 adopt）。
 * - [回炉 B-3] 确认流跨代判废=操作序号 opSeq（entry 持有——alive() 端口）：每个 await
 *   边界与每次 loadPayload/release/门写/busy 写前校验身份，过期操作静默放弃（零
 *   emit 零 IPC 零门写——不得清新操作 busy、不得动新条状态、不得改门）。
 *
 * ── 接口层 ── export function createRestoreFlow(deps): { run(token) }
 *
 * ── 架构层 ── 纯编排件：IPC/宿主钩子经 ports 注入（entry 组合）；不 import scheduler。
 */
import { api, unwrap } from '../../api/client'
import { MAIN_GRAPH_ID } from '@shared/models/lineage'
import { lineageRecoveryPayloadSchema, type LineageRecoveryPayload } from '@shared/recovery/schemas'
import type {
  PreflightOutcome,
  RecoveryEntryHost,
  RecoveryUiState,
  RestoreDecision,
  SchedulerPorts,
  SettleUnsettledResult
} from './recoveryEntry'

const TAKEOVER_ATTEMPTS = 3

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

export interface RestoreFlowDeps {
  ports: SchedulerPorts
  getHost(): RecoveryEntryHost | null
  /** 载入落位回调（entry 的 restoredLoaded 置位——放弃分支清恢复态判定源 W5） */
  onLoaded(): void
  emit(patch: Partial<RecoveryUiState>): void
  setGateOpen(open: boolean): void
  onGateReopened(): void
  /** [B4 L2 §8.4 行 7] takeOver 成功（payload=原样回写的载荷） */
  onTakeOver(payload: LineageRecoveryPayload): void
}

export interface RestoreFlow {
  /** alive=操作身份校验闭包（entry 的 opSeq——过期=true：静默放弃） */
  run(token: string, alive: () => boolean): Promise<void>
}

export function createRestoreFlow(deps: RestoreFlowDeps): RestoreFlow {
  return {
    async run(token, alive) {
      const st = deps.ports.getState()
      if (st.phase !== 'await-decision' || st.file === null || st.busy) return
      const host = deps.getHost()
      deps.emit({ busy: true })
      // [F-RECOV-04 C3/C4 主控终裁⑥复审修正版] 先落定后单次替换确认：未落定写在
      // 场→恢复不执行（不 read 不 loadPayload），先进入落定步（busy 态）。草稿经
      // 既有 commit 入口转队列+save() 由宿主承载；commit 入口（closeEdit/
      // beginUnitGated）受 recovery 门拦——落定步经调度器既有合法通道 setGateOpen
      // 开门收口、收口即回冻结（禁绕门旁门：四条件核验在宿主为终审，开门窗内新
      // 编辑会被核验拦回停条）。四条件全过才弹替换确认；任一不过/失败=停条
      // busy=f 可重试（不弹确认不自动续）。
      // （全序见头注）
      let replaceAsked = false // 本次流程已就「替换当前图」取得确认：落定步确认或冲突清单确认（不二问）
      if ((host?.hasUnsettledWrites?.() ?? false) === true) {
        deps.setGateOpen(true)
        let raw: SettleUnsettledResult
        try {
          raw = host?.settleUnsettledWrites !== undefined ? await host.settleUnsettledWrites() : true
        } catch {
          // [复审 R2-B2] 落定钩子 reject=「任一不过/失败」面：停条 busy=f 门回冻结
          // 可重试（不外抛——宿主 void 调用防 unhandled rejection）；身份过期=静默放弃
          if (!alive()) return
          deps.setGateOpen(false)
          deps.emit({ busy: false })
          return
        }
        if (!alive()) return // [B-3] 身份过期——门/条归属新状态，零写静默放弃
        deps.setGateOpen(false) // 落定收口即回冻结（确认与载入窗编辑不可达）
        const settled = typeof raw === 'boolean' ? raw : raw.ok
        if (!settled) {
          deps.emit({ busy: false }) // 停条可重试（终裁⑥——不自动续）
          return
        }
        replaceAsked = true
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
          deps.emit({ busy: false })
          return
        }
      }
      const gen = deps.ports.getGen() // 落定步 flush 合法推进 gen——快照自此取（B-3 分轴注）
      try {
        const r = await deps.ports.read(token)
        if (!alive() || gen !== deps.ports.getGen()) return // [B-3]+既有 gen 双守卫
        if (r.status === 'gone') {
          if (!alive()) return
          deps.emit({ phase: 'open', slotKind: null, file: null, busy: false, pendingChip: false })
          deps.setGateOpen(true)
          deps.onGateReopened()
          return
        }
        const payload = lineageRecoveryPayloadSchema.parse(r.payload)
        const folderOk = await folderAlive(payload.folderId)
        if (!alive()) return // [复审 R2-W1] 真支路同判废——旧操作不得派发预检读面
        if (!folderOk) {
          deps.emit({ busy: false, deadFolder: true }) // 恢复禁用（门维持冻结）
          return
        }
        // [回炉 W-B3·R-B5 / 设计稿 §6.3] 替换守卫：目标 folder 只在 read 之后可知——读到 payload 后求值一次。
        // 宿主未提供该谓词=假（旧语义）
        const replaceable = (host?.hasReplaceableSession?.(payload.folderId) ?? false) === true
        /** 预检端口（宿主未接线=undefined——旧夹具零适配） */
        const preflight = host?.runRestorePreflight?.bind(host)
        const preflightWired = preflight !== undefined
        // [F-RECOV-04 D1/D2/D3] 预检（宿主装配读面→纯数据清单；未接线=跳过——旧夹具
        // 零适配）。读取失败=阻断可重试（与冲突不同态不同文案——终裁②）；冲突=清单再确认
        // （取消=副本保留可重试）——携替换警示：defer 过或替换守卫为真。无冲突时的替换确认
        // 在块后判定（替换守卫不依赖预检是否接线）
        if (host !== null && preflight !== undefined) {
          const outcome: PreflightOutcome = await preflight(payload)
          if (!alive()) return
          if (outcome.kind === 'read-failed') {
            if (host.askRestoreDecision !== undefined) {
              await host.askRestoreDecision({ kind: 'preflight-unavailable' })
            }
            if (!alive()) return
            deps.emit({ busy: false })
            return
          }
          if (outcome.conflicts.length > 0) {
            const go =
              host.askRestoreDecision !== undefined
                ? await host.askRestoreDecision({
                    kind: 'conflicts',
                    conflicts: outcome.conflicts,
                    replaceWarning: st.pendingChip || replaceable
                  })
                : true
            if (!alive()) return
            if (!go) {
              deps.emit({ busy: false })
              return
            }
            replaceAsked = true // 清单已携替换警示——不二问（原与替换确认的 else-if 互斥语义）
          }
        }
        // 替换确认一次（见头注「替换确认的触发」）：defer 过（旧条件——仅宿主接了预检时）或替换守卫为真
        if (!replaceAsked && (replaceable || (st.pendingChip && preflightWired))) {
          const go = host?.askRestoreDecision !== undefined ? await host.askRestoreDecision({ kind: 'replace' }) : true
          if (!alive()) return
          if (!go) {
            deps.emit({ busy: false }) // 不载入——条回可重试（门仍冻结）
            return
          }
        }
        if (!alive()) return // [B-3] 载入前末守卫——旧操作不得 loadPayload
        deps.getHost()?.loadPayload(payload)
        deps.onLoaded()
        // takeOver：原 payload 原样回写（draft 不可能 null 覆盖唯一副本）
        let ok = false
        for (let i = 0; i < TAKEOVER_ATTEMPTS && !ok; i += 1) {
          const res = await deps.ports.save(payload, token)
          if (!alive()) return // [B-3] 迟到 save 结果零簿记（epoch/条/门全不动）
          if (res.status === 'saved') {
            ok = true
          } else if (res.status === 'stale') {
            deps.ports.adoptEpoch(res.epoch) // 采纳后重试
          } else {
            // pending（槽被换）|queue-overflow（链深满）——降级承接：条保留可重试。
            // [d1-N4 随批登记] 循环不逐轮复查 ws：错 ws 由 main guardWorkspace 拒
            // （错误→外层 catch→条可重试闭合）——IPC 层既有守卫承载。
            break
          }
        }
        if (ok) {
          deps.emit({ phase: 'open', slotKind: null, file: null, busy: false, pendingChip: false })
          deps.setGateOpen(true)
          deps.onGateReopened()
          deps.onTakeOver(payload) // [B4 L2 §8.4 行 7] owner→F
          const host2 = deps.getHost()
          if (host2 !== null) {
            host2.onRestored(payload)
            host2.openLineageView()
          }
          return
        }
        // takeOver 未成=条恢复可用态保留（busy 假+门冻结）——重试恢复或放弃
        deps.emit({ busy: false })
      } catch {
        if (alive()) deps.emit({ busy: false }) // [B-3] 失败收口不得清新操作 busy
      }
    }
  }
}

export type { RestoreDecision }
