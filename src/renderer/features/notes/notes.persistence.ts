/**
 * [B4-A R1 §11.1] notes.persistence —— 笔记写派发适配与收口（自 notes.store 拆出
 * 2026-11-23；参数化 notes 写适配与在途回显，不复制第二草稿态）。
 *
 * ── 行为层 ──
 * - 保存派发单口（防抖到期/saveNow 点击/persistNow/flush 重试/收口链共用）：
 *   载荷=派发时经 ports 读取的草稿闭包快照；派发即清 saveFailed（error+点击→
 *   saving 格）。[B4-A R1 §2.2] 写体经 per-tab lane 入链——与同 tab 批注文本写、
 *   操作层 undo/redo 反向写共用一条串行链（同篇在途写不再并发；单层入链契约：
 *   写体内不再入链）。
 * - [B4-A 回炉 R5] 裸写体（不自行入链——reader 文本控制器把 history 命令做成
 *   复合链任务，任务体内直调；再入链=循环等待）：writeDraftRaw=写 store 当前草稿
 *   （命令的预 flush，结算同普通写）；writeValueRaw=写指定内容（文本 undo/redo
 *   反向值——不是 store 草稿），成功结算按内容经 ports.onSettledContent 回喂、失败
 *   结算归宿主（错误态置不置位取决于有无待写草稿——notes.store.historyWriteNow）。
 *   两者**不入在途表**：表按「最新一笔」语义供 persistNow/收口面等待，裸写在链上先于
 *   其后入链的普通写落定——记入会使早记录、晚落定的普通写出表（收口面丢失等待）；
 *   裸写自身由调用方的链位承载（收口面的 laneDrain 等它落定）。
 * - 在途回显（inflight Map 本件持有）：同篇并发在途记最新一笔；早到笔 settle
 *   时若 map 已指向新笔则不删（flush 语义按最新在途收敛）。
 * - 结果经 ports 回喂（onSettled/onFailed）——编辑序号守卫（editSeq）与草稿
 *   镜像归宿主 store（ports 捕获上下文），本件不持第二份草稿态。
 * - 永不 reject：api 失败经 onFailed 承接；派发结果=「本次写成功与否+本次写入
 *   的草稿内容」（persistNow 据此回报「当前草稿是否已在库」）。
 * - 收口面（flush/flushAll/flushNow/flushAllNow——自 store 迁驻，语句语义零变）：
 *   flush=卸载面收口（在途完成后 pending 立即落盘/error 立即重试一次/普遍
 *   dirty no-op——timer 通道承接）；flushAll=遍历 pending 快照逐篇串行；flushNow=
 *   flush 后仍 pending 即立存（防抖 timer 不承接关 tab/退出面）；flushAllNow=
 *   逐篇 flushNow+纯在途面兜底等待。
 *
 * ── 接口层 ──
 * - export interface NotesDispatchCtx / NotesDispatchResult / NotesPersistPorts
 * - export function createNotesPersistence(ports): { dispatch/writeDraftRaw/
 *   writeValueRaw/inflightOf/inflightIds }
 * - export function createNotesCloseout(deps): NotesCloseout
 *
 * ── 架构层 ──
 * - notes 域内部件；只 import api/client、shared 模型与 renderer/shared 的
 *   tab-write-lane（分层单向不破；不 import reader 域件）。
 */
import { api, unwrap } from '../../api/client'
import { enqueueTabTask } from '../../shared/tab-write-lane'
import type { Note } from '@shared/models/note'

/** 派发上下文（宿主在派发时捕获的快照——编辑序号守卫判定输入） */
export interface NotesDispatchCtx {
  seqAtDispatch: number
}

/** 一次派发的落库结果：ok=本次写成功；content=本次写入的草稿内容 */
export interface NotesDispatchResult {
  ok: boolean
  content: string
}

export interface NotesPersistPorts {
  /** 派发载荷读取（返回 undefined=草稿条目不存在→零写） */
  readPayload(paperId: string): { contentMd: string } | undefined
  /** 派发时刻快照（editSeq 编辑序号——回调比对输入） */
  captureCtx(paperId: string): NotesDispatchCtx
  /** 派发即清 saveFailed（error+点击→saving 格） */
  onDispatch(paperId: string): void
  /** 保存成功回喂（宿主按代际守卫清/保 pending 镜像） */
  onSettled(paperId: string, saved: Note, ctx: NotesDispatchCtx): void
  /** 保存失败回喂（saving 复位+saveFailed 置位；savedAt 不推进） */
  onFailed(paperId: string, ctx: NotesDispatchCtx): void
  /** [B4-A 回炉 R5] 反向写成功回喂（库值=content；不经编辑序号守卫——content≠
   *  store 草稿时草稿尚未落库）：草稿仍=content→按已落库清未保存标记；草稿≠content
   *  （history 在途窗内的新输入，或控制器尚未采纳的旧值）→草稿保未保存标记 */
  onSettledContent(paperId: string, saved: Note, content: string): void
}

export function createNotesPersistence(ports: NotesPersistPorts): {
  /** 保存派发（返回在途 promise——flush 等待用；永不 reject） */
  dispatch(paperId: string): Promise<NotesDispatchResult>
  /** [回炉 R5] 裸写 store 当前草稿（控制器链任务体内直调——不自行入链；不入在途
   *  表；永不 reject） */
  writeDraftRaw(paperId: string): Promise<NotesDispatchResult>
  /** [回炉 R5] 裸写指定内容——文本 undo/redo 反向值（同上；永不 reject） */
  writeValueRaw(paperId: string, content: string): Promise<NotesDispatchResult>
  /** 在途句柄读取（无在途=undefined） */
  inflightOf(paperId: string): Promise<NotesDispatchResult> | undefined
  /** 在途 id 快照（flushAllNow 纯在途面兜底遍历用） */
  inflightIds(): string[]
} {
  /** [F-UIRES-03 B3] 每篇在途保存 promise（flush 等待在途完成的依据）。
   *  同篇并发在途时记最新一笔；早到笔 settle 时若 map 已指向新笔则不删 */
  const inflight = new Map<string, Promise<NotesDispatchResult>>()

  /** 链任务写体（per-tab lane 内执行）：结果经 ports 回喂，永不 reject */
  async function write(paperId: string, content: string, ctx: NotesDispatchCtx): Promise<NotesDispatchResult> {
    try {
      const saved = await unwrap(api.notes.save({ paperId, contentMd: content }))
      ports.onSettled(paperId, saved, ctx)
      return { ok: true, content }
    } catch {
      ports.onFailed(paperId, ctx)
      return { ok: false, content }
    }
  }

  function dispatch(paperId: string): Promise<NotesDispatchResult> {
    const draft = ports.readPayload(paperId)
    if (draft === undefined) {
      return Promise.resolve({ ok: true, content: '' })
    }
    const ctx = ports.captureCtx(paperId)
    ports.onDispatch(paperId)
    const flight = enqueueTabTask(paperId, () => write(paperId, draft.contentMd, ctx))
    inflight.set(paperId, flight)
    const release = (): void => {
      // 同篇并发在途时只清自己（map 已指向新笔则保留——flush 按最新在途收敛）
      if (inflight.get(paperId) === flight) inflight.delete(paperId)
    }
    void flight.then(release, release)
    return flight
  }

  /** 裸写 store 当前草稿（不入在途表——头注）；无草稿条目=零写 */
  function writeDraftRaw(paperId: string): Promise<NotesDispatchResult> {
    const draft = ports.readPayload(paperId)
    if (draft === undefined) return Promise.resolve({ ok: true, content: '' })
    const ctx = ports.captureCtx(paperId)
    ports.onDispatch(paperId)
    return write(paperId, draft.contentMd, ctx)
  }

  /** 裸写指定内容——文本 undo/redo 反向值（不入在途表——头注）。失败不经 onFailed：
   *  无待写草稿的反向写不得置错误态（重试须有物可写），结算归宿主 historyWriteNow */
  async function writeValueRaw(paperId: string, content: string): Promise<NotesDispatchResult> {
    ports.onDispatch(paperId)
    try {
      const saved = await unwrap(api.notes.save({ paperId, contentMd: content }))
      ports.onSettledContent(paperId, saved, content)
      return { ok: true, content }
    } catch {
      return { ok: false, content }
    }
  }

  return {
    dispatch,
    writeDraftRaw,
    writeValueRaw,
    inflightOf: (paperId) => inflight.get(paperId),
    inflightIds: () => [...inflight.keys()]
  }
}

export interface NotesCloseout {
  flush(paperId: string): Promise<void>
  flushAll(): Promise<void>
  flushNow(paperId: string): Promise<void>
  flushAllNow(): Promise<void>
}

/** 收口面依赖（宿主 store 注入——草稿/元数据归宿主，本件不持第二份） */
export interface NotesCloseoutDeps {
  inflightOf(paperId: string): Promise<NotesDispatchResult> | undefined
  inflightIds(): string[]
  /** 未保存编辑的文献 id 快照（遍历期变异安全） */
  pendingIds(): string[]
  hasPending(paperId: string): boolean
  /** 读取草稿失败标记（条目缺席=undefined） */
  readFailed(paperId: string): boolean | undefined
  clearTimer(paperId: string): void
  dispatch(paperId: string): Promise<NotesDispatchResult>
  /** 立存核心（首载门控命中=null） */
  dispatchNow(paperId: string): Promise<NotesDispatchResult | null>
}

export function createNotesCloseout(deps: NotesCloseoutDeps): NotesCloseout {
  async function flush(paperId: string): Promise<void> {
    // 三路：①pending∧saving 在途——等在途完成（成功侧已启新防抖/失败侧落 error）；
    // ②pending∧error——立即重试落盘一次；③普遍 dirty（防抖在排）——no-op，既有
    // timer 通道承接（模块级 timer 不随组件卸载清除）。等待期间若已有新在途接管
    // （并发防抖撞上）则让位——其载荷即最新合并态
    const hadFlight = deps.inflightOf(paperId)
    if (hadFlight !== undefined) {
      await hadFlight
      if (deps.inflightOf(paperId) !== undefined) return
    }
    if (!deps.hasPending(paperId)) return
    if (hadFlight === undefined && !deps.readFailed(paperId)) return
    deps.clearTimer(paperId)
    await deps.dispatch(paperId)
  }

  async function flushNow(paperId: string): Promise<void> {
    // flush（在途收敛+error 重试+clean no-op）后仍 pending 即立存（防抖 timer
    // 通道不承接关 tab/退出面——收口后 renderer 可能即亡）。flush 让位的新在途
    // 等待到 settle 再判。gated：门控 no-op→pending 残留，由收口方呈现。
    await flush(paperId)
    let flight = deps.inflightOf(paperId)
    while (flight !== undefined) {
      await flight
      flight = deps.inflightOf(paperId)
    }
    if (!deps.hasPending(paperId)) return
    await deps.dispatchNow(paperId)
  }

  return {
    flush,
    async flushAll(): Promise<void> {
      // 遍历 pending 快照逐篇串行（快照防遍历中变异——不用 Promise.all 并发派发）
      for (const paperId of deps.pendingIds()) {
        await flush(paperId)
      }
    },
    flushNow,
    async flushAllNow(): Promise<void> {
      // pending 快照逐篇串行 flushNow；[回炉 W-2] 纯在途面兜底：pendingEdit 无键
      // 而在途的写（冗余 saveNow 在途）同样等待 settle（快照重取
      // 循环：settle 期新接管的在途次轮兜住；退出面无用户输入，有界收敛）
      for (const paperId of deps.pendingIds()) {
        await flushNow(paperId)
      }
      let inflightIds = deps.inflightIds()
      while (inflightIds.length > 0) {
        await Promise.all(inflightIds.map((id) => deps.inflightOf(id)!))
        inflightIds = deps.inflightIds()
      }
    }
  }
}
