/**
 * [F-SLIMB4A-01 拆件；B4-A R1 §11.1/回炉 R5] notes.write-host —— 笔记写宿主 ports
 * （自 notes.store 拆出 2026-11-25；§11.1「notes.store 只留草稿/load/合并/pending
 * 镜像；派发与收口迁出」——写派发的宿主侧装配与端口驻本件，行为零变=重构保真锚：
 * notes.store/notes-store-b3/notes-persistence-lane 全量零改即绿）。
 *
 * ── 行为层（自 notes.store 原样迁驻——语句零改；各动作语义=notes.store 头注与
 *   NotesStore 接口注释，本件不重述）──
 * - 持久化适配器装配：createNotesPersistence 的 ports（载荷读取/派发快照/派发、
 *   成功、失败与反向写成功的草稿回喂）。
 * - dispatchSaveNow：立存核心（无闸）——saveNow/persistNow 与 flushNow 收口链共用。
 * - persistNow/persistNowRaw/historyWriteNow/adoptPersisted：reader 文本控制器的
 *   立存/裸写/已落库值采纳端口（经 notes.store 同名 action 暴露）。
 *
 * ── 接口层 ──
 * - export interface NotesWriteHostDeps / NotesWriteHost
 * - export function createNotesWriteHost(deps): NotesWriteHost
 *
 * ── 架构层 ──
 * - notes 域内部件；运行时只 import notes.persistence。宿主草稿态与编辑元数据
 *   （模块级 Map/Set——ADR-0008 五结构不坍缩，声明仍在 notes.store）归宿主闭包，
 *   经 deps 按引用注入，本件不持第二份（notes.persistence 同约）；对 notes.store
 *   仅 type-only import（零运行时环）。
 */
import { createNotesPersistence, type NotesDispatchCtx, type NotesDispatchResult } from './notes.persistence'
import type { NoteDraft, NotesStore } from './notes.store'

/** 写宿主消费的宿主 store 切片（宿主 store 的子集——薄壳注入零耦合） */
type WriteHostStoreSlice = Pick<NotesStore, 'noteByPaper' | 'saveSoon'>

/** 写宿主 deps（宿主 notes.store 闭包装配——草稿/元数据归宿主，本件不持第二份） */
export interface NotesWriteHostDeps {
  /** 宿主 store 读面（派发载荷读取/回执比对/saveSoon 续排） */
  get(): WriteHostStoreSlice
  /** 草稿条目写入（宿主闭包） */
  setDraft(paperId: string, patch: Partial<NoteDraft>): void
  /** 编辑已落库清账（宿主闭包：清未保存标记与触碰记录并落 savedAt） */
  markSaved(paperId: string, savedAt: string): void
  clearTimer(paperId: string): void
  /** 编辑元数据（模块级 Map/Set——宿主声明、按引用注入；语义见 notes.store 头注） */
  editSeq: Map<string, number>
  pendingEdit: Set<string>
  touchedFields: Map<string, { contentMd?: boolean }>
  loadedOnce: Set<string>
  lastEditedAt: Map<string, number>
}

/** 写宿主面：持久化适配器＋立存核心＋文本控制器端口（四 action 原样挂入宿主 store——签名取 NotesStore，类型不双写） */
export interface NotesWriteHost extends Pick<NotesStore, 'persistNow' | 'persistNowRaw' | 'historyWriteNow' | 'adoptPersisted'> {
  /** 保存派发适配器（派发/裸写/在途读面——notes.persistence 单口） */
  persistence: ReturnType<typeof createNotesPersistence>
  /** 立存核心（无闸；首载门控命中=null） */
  dispatchSaveNow(paperId: string): Promise<NotesDispatchResult | null>
}

export function createNotesWriteHost(deps: NotesWriteHostDeps): NotesWriteHost {
  const { get, setDraft, markSaved, clearTimer, editSeq, pendingEdit, touchedFields, loadedOnce, lastEditedAt } = deps

  // [B4-A R1 §11.1] 保存派发单口驻 notes.persistence.ts——本闭包即 ports 装配点
  const persistence = createNotesPersistence({
    readPayload: (paperId) => {
      const draft = get().noteByPaper[paperId]
      return draft === undefined ? undefined : { contentMd: draft.contentMd }
    },
    captureCtx: (paperId) => ({
      // 派发快照：本次保存对应的编辑序号（派发后若又有 edit，序号前进）
      seqAtDispatch: editSeq.get(paperId) ?? 0
    }),
    onDispatch: (paperId) => {
      setDraft(paperId, { saving: true, saveFailed: false })
    },
    onSettled: (paperId, saved, ctx: NotesDispatchCtx) => {
      // 编辑已落库：清"未保存编辑"标记与触碰记录——仅当派发后无新编辑（编辑
      // 序号未前进）；有新编辑则不清（仍受合并保护，由重排的防抖收尾）
      if ((editSeq.get(paperId) ?? 0) === ctx.seqAtDispatch) {
        // 与 pendingEdit 同点同条件清镜像：草稿自此等于服务器基线
        markSaved(paperId, saved.updatedAt)
      } else {
        // 派发后又有新编辑：pendingEdit 保留，镜像显式置 true（与同步点对偶，
        // 不靠"上一帧必为 true"的隐式假设）
        setDraft(paperId, { saving: false, savedAt: saved.updatedAt, pending: true })
        // [B3 消费时点一] pending 合并态转 dirty：启新防抖 T（复刻 load 补存
        // 语义——新输入无论组件在否都由新周期收尾；flush 在途等待后可提前兑现）
        get().saveSoon(paperId)
      }
    },
    onFailed: (paperId, _ctx) => {
      // 失败不推进 savedAt、pending 保留（未保存态延续）；[B3] saveFailed 置位
      setDraft(paperId, { saving: false, saveFailed: true })
    },
    // [B4-A 回炉 R5] 反向写成功（库值=content）：草稿仍=content→已落库；草稿≠content
    // （history 在途窗内的新输入，或控制器尚未采纳的旧值）→草稿未落库，置未保存标记
    // （不启防抖——由控制器的落库调度承接；采纳经 adoptPersisted 落定）
    onSettledContent: (paperId, saved, content) => {
      if (get().noteByPaper[paperId]?.contentMd === content) {
        markSaved(paperId, saved.updatedAt)
        return
      }
      pendingEdit.add(paperId)
      const touched = touchedFields.get(paperId) ?? {}
      touched.contentMd = true
      touchedFields.set(paperId, touched)
      setDraft(paperId, { saving: false, savedAt: saved.updatedAt, pending: true })
    }
  })

  // [F-VISFB-64·回炉 B1] 立存核心（无闸）：saveNow/persistNow 与 flushNow 收口链
  // 共用（首载门控+清防抖+同步派发）；闸只挂用户入口。门控命中=null
  const dispatchSaveNow = (paperId: string): Promise<NotesDispatchResult | null> => {
    if (!loadedOnce.has(paperId) && lastEditedAt.has(paperId)) return Promise.resolve(null)
    clearTimer(paperId)
    return persistence.dispatch(paperId)
  }

  return {
    persistence,
    dispatchSaveNow,

    async persistNow(paperId) {
      let flight = persistence.inflightOf(paperId)
      while (flight !== undefined) {
        await flight
        flight = persistence.inflightOf(paperId)
      }
      const draft = get().noteByPaper[paperId]
      // 无草稿条目/无未保存编辑=当前草稿已在库，零写
      if (draft === undefined || !pendingEdit.has(paperId)) return true
      const result = await dispatchSaveNow(paperId)
      // true 的充要条件：本次写成功 且 写入内容=当前草稿（派发后又有新编辑则 false）
      return result !== null && result.ok && get().noteByPaper[paperId]?.contentMd === result.content
    },

    async persistNowRaw(paperId) {
      // 首载门控同 persistNow（服务器基线未知不抢存）；在途等待不需要——调用方
      // （控制器链任务）在链上已排在本篇全部已入链写之后
      if (!loadedOnce.has(paperId) && lastEditedAt.has(paperId)) return false
      const draft = get().noteByPaper[paperId]
      if (draft === undefined || !pendingEdit.has(paperId)) return true
      clearTimer(paperId)
      const result = await persistence.writeDraftRaw(paperId)
      return result.ok && get().noteByPaper[paperId]?.contentMd === result.content
    },

    async historyWriteNow(paperId, value) {
      if (!loadedOnce.has(paperId) && lastEditedAt.has(paperId)) return false
      clearTimer(paperId)
      const result = await persistence.writeValueRaw(paperId, value)
      // 失败：草稿与未保存标记不动（反向值不本地应用）。有待写草稿（在途窗内新输入）
      // 才置错误态——错误态的重试（定稿/关闭预 flush）须有物可写；无待写时置位=重试
      // 恒 no-op，失败改由宿主 toast 呈现
      if (!result.ok) setDraft(paperId, { saving: false, saveFailed: pendingEdit.has(paperId) })
      return result.ok
    },

    adoptPersisted(paperId, contentMd) {
      pendingEdit.delete(paperId)
      touchedFields.delete(paperId)
      setDraft(paperId, { contentMd, saving: false, pending: false, saveFailed: false })
    }
  }
}
