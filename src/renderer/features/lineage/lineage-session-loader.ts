/**
 * [B4 L2 / 设计稿 §2.3 loadSeq·inflightGraph·invalidationEpoch 行、§2.5 #33-#36、
 * §2.6 34a-34d/#41/#43、§11.2] lineage-session-loader —— 每会话 keyed graph 单飞读。
 *
 * ── 行为层 ──
 * - 单飞句柄（§2.3）：每会话至多一个在途读，驻 entry.inflightGraph（Promise 不进
 *   响应式快照）；首载与和解读复用同一句柄。复用判据（34a/#43）=同 folder ∧ 在途
 *   读 generation=会话当前 ∧ 读捕获 epoch≥会话当前；否则按当前 epoch 重新单飞
 *   （不并发第二次同身份读）。
 * - 读身份（#43 迟到响应归属）：发起时捕获 folderId+sessionGeneration+推进后的
 *   loadSeq+invalidationEpoch；应用要求四者全匹配——任一不符丢弃，不写图态、
 *   不清 needsReload。[回炉 W-B1·R-B4] 身份键判据走唯一准入函数
 *   （lineage-writeback-admission.admitWriteback）——原判据漏比读的 folderId 与会话
 *   现 folderId：改键/换归属后的会话会收下旧文件夹的响应。
 * - 首载 load（#35 首次 graph 响应分支）：status→loading→ready|error；新会话
 *   H/R 空、U=0，已有会话 H/R/U 不变。读被丢（事件前发起的旧读）→按当前 epoch
 *   续拉，有界；暂存队列未清空或在途写→图落地丢弃、回置 ready+needsReload
 *   （编辑会话暂存为准）。读失败→status=error（只写原会话）。
 * - 和解 reconcile（#34/#35 权威应用分支=#10b needsReload 唯一清位点）：读失败
 *   原样上抛（#10c——调用方折叠 failed+error，位保留不定稿）；应用判据失败
 *   （Q>0/他在途/迟到）→dropped（#10d/#34d——位保留，链尾续拉）。
 * - activate 裁决（#33/#34/§8.2）：ready∧needsReload=0=零 graph IPC；needsReload
 *   ∧Q0∧F0=交调用方排一次和解；error=重载；loading=复用在途读。
 *
 * ── 接口层 ── export function createSessionLoader(deps): SessionLoader
 *
 * ── 架构层 ── 纯编排件：keyed 读任务=lineage-write-conflicts createReconcileTask
 * （单飞存取/读身份经 deps 注入）；物理读与会话写入经 deps 注入，零直写 store。
 */
import type { LineageGraphRes } from '@shared/ipc/schemas'
import type { LineageSession } from './lineage-session-registry'
import { admitWriteback, captureStamp, targetOf } from './lineage-writeback-admission'
import {
  createReconcileTask,
  type InflightRead,
  type ReconcileOutcome,
  type ReconcileInflightStore
} from './lineage-write-conflicts'

/** loader 视角的会话条目（registry SessionEntry 的结构子集） */
export interface LoaderEntry {
  data: LineageSession
  inflightGraph: InflightRead | null
}

export interface SessionLoaderDeps {
  /** keyed graph 物理读（folderId=会话键） */
  read(folderId: string): Promise<LineageGraphRes>
  /** 会话写入（registry 内部 apply——已替换/已删会话的条目不投影） */
  write(entry: LoaderEntry, patch: Partial<LineageSession>): void
  /** 会话仍注册且未删（迟到响应归属前提——#42/#43） */
  alive(entry: LoaderEntry): boolean
}

export type ActivateDecision = 'cached' | 'reconcile' | 'reload' | 'reuse'

export interface SessionLoader {
  load(entry: LoaderEntry): Promise<void>
  reconcile(entry: LoaderEntry): Promise<ReconcileOutcome>
  activate(entry: LoaderEntry): ActivateDecision
}

const MAX_LOAD_ATTEMPTS = 3
const LOAD_UNSETTLED = '脉络图读取期间数据持续变更，请重试'

export function createSessionLoader(deps: SessionLoaderDeps): SessionLoader {
  const storeOf = (entry: LoaderEntry): ReconcileInflightStore => ({
    get: () => entry.inflightGraph,
    set: (read) => {
      entry.inflightGraph = read
    }
  })
  /** 新读发起：推进 loadSeq 并捕获会话身份（#43 身份键） */
  const issue = (entry: LoaderEntry): { generation: number; loadSeq: number } => {
    entry.data.loadSeq += 1
    return { generation: entry.data.sessionGeneration, loadSeq: entry.data.loadSeq }
  }
  /** #35/#43 应用判据：身份键准入（会话仍在 ∧ folderId·generation·loadSeq 匹配 ∧ 读捕获
   *  epoch≥当前——唯一准入函数）∧ Q0 ∧（F=0 或在途恰为本读所属 reconcile 任务——自身回执不拦） */
  const applyKeyed = (entry: LoaderEntry, graph: LineageGraphRes, read: InflightRead): boolean => {
    const s = entry.data
    if (read.generation === null || read.loadSeq === null) return false // keyed 读恒携读身份（issue）——缺=不可判
    const admitted = admitWriteback(
      targetOf(s, deps.alive(entry) && !s.deleted), // alive=仍注册且未删（孤儿 entry 的迟到读不写任何会话）
      { folderId: read.identity.folderId, generation: read.generation, loadSeq: read.loadSeq, epoch: read.identity.epoch }
    )
    if (!admitted) return false // 迟到/异会话响应：不写图态、不清位（#36/#43）
    if (s.queue.length > 0) return false
    if (s.inflight !== null && s.inflight.kind !== 'reconcile') return false
    deps.write(entry, {
      nodes: graph.nodes,
      edges: graph.edges,
      paperMetrics: graph.paperMetrics ?? {},
      pubNos: graph.pubNos ?? {},
      tagNames: graph.tagNames ?? {},
      lineTypeNames: graph.lineTypeNames,
      // [F-VISFB-61] 悬浮笔记随 graph 单读（?? []=旧桩装配兼容面）
      floatingNotes: graph.floatingNotes ?? [],
      status: 'ready',
      error: null,
      needsReload: false
    })
    return true
  }
  const task = (entry: LoaderEntry) =>
    createReconcileTask({
      get: () => entry.data,
      read: () => deps.read(entry.data.folderId),
      apply: () => false,
      inflight: storeOf(entry),
      issue: () => issue(entry),
      applyKeyed: (graph, _identity, read) => applyKeyed(entry, graph, read)
    })

  const load = async (entry: LoaderEntry): Promise<void> => {
    if (!deps.alive(entry)) return
    const hadGraph = entry.data.status === 'ready'
    deps.write(entry, { status: 'loading', error: null })
    for (let attempt = 0; attempt < MAX_LOAD_ATTEMPTS; attempt++) {
      try {
        if ((await task(entry).run()) === 'applied') return
      } catch (e) {
        // 会话已替换——迟到失败不写任何会话（准入：会话仍在）
        if (!admitWriteback(targetOf(entry.data, deps.alive(entry)), captureStamp(entry.data))) return
        deps.write(entry, { status: 'error', error: e instanceof Error ? e.message : String(e) })
        return
      }
      const s = entry.data
      // 会话仍在 ∧ 仍 loading——否则=他径已落定（并发和解已应用）/会话已替换
      if (!admitWriteback(targetOf(s, deps.alive(entry)), captureStamp(s)) || s.status !== 'loading') return
      if (s.queue.length > 0 || s.inflight !== null) {
        // 暂存队列未清空或在途写：图落地丢弃——回置既有图态（编辑会话暂存为准）
        // 丢弃时回置 ready：dirty 会话说明有数据面，不回置会卡 loading
        deps.write(entry, hadGraph ? { status: 'ready', needsReload: true } : { status: 'error', error: LOAD_UNSETTLED, needsReload: true })
        return
      }
      // 读被丢（事件前发起的旧读——任务内已按新 epoch 续拉一次）：再续拉，有界
    }
    if (admitWriteback(targetOf(entry.data, deps.alive(entry)), captureStamp(entry.data))) {
      deps.write(entry, { status: 'error', error: LOAD_UNSETTLED, needsReload: true })
    }
  }

  return {
    load,
    reconcile: (entry) => task(entry).run(),
    activate(entry) {
      const s = entry.data
      if (s.status === 'error') return 'reload'
      if (s.status === 'loading') return entry.inflightGraph === null ? 'reload' : 'reuse'
      if (s.needsReload && s.queue.length === 0 && s.inflight === null) return 'reconcile'
      return 'cached'
    }
  }
}
