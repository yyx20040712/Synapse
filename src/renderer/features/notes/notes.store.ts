/**
 * [SR-NOTE-02] notes.store —— 笔记编辑状态（工单：done / weak）
 *
 * ── 行为层 ──
 * - { noteByPaper: Record<string, { contentMd; saving; savedAt; pending; saveFailed }> }
 *   （pending=未落库编辑镜像——面板"未保存/已保存"诚实显示的依据；saveFailed=
 *   最近一次保存失败——四态钮 error 态单源；[A2 F-CONTRACTA-01] title 停用，
 *   编辑域=contentMd 单字段）
 * - load：unwrap(api.notes.get) 重建草稿；请求序号 stale-guard 丢弃晚到旧响应
 *   （含旧失败）。落地不变量：本地有未保存编辑（pendingEdit）→ 一律字段级合并
 *   （碰过的字段保草稿、未碰的取服务器、savedAt 取服务器——时间先后不参与），
 *   打首载标记并补存挂起编辑；无未保存编辑 → 整版落地+首载标记（失败不打）
 * - edit：同步写草稿+模块级编辑元数据打点（时刻/编辑序号/触碰字段/未保存标记）
 * - saveSoon：防抖 IDLE_FLUSH_MS（[B4-A R1] @shared/constants 单源——批注文本
 *   与总评共用 1.5s）只存最新内容；首载落地前挂起（服务器基线未知不抢存）
 * - saveSoon/saveNow/persistNow 保存成功仅在派发后无新编辑（编辑序号守卫）时清
 *   未保存标记与触碰记录；失败不推进 savedAt、pending 保留（INV-04）
 * - [B4-A R1] persistNow：立存并回报终态（reader 文本控制器 persist 端口——
 *   总评单元 1.5s 空闲/blur/flush 的落库通道）；true=当前草稿已在库
 * - [B4-A 回炉 R5] 文本 undo/redo 的两笔写经裸写体（控制器把 history 命令做成
 *   复合链任务，任务体内直调——不自行入链）：persistNowRaw=命令预 flush（写当前
 *   草稿，结算同普通写）；historyWriteNow=反向写（写指定值，**不写进草稿**——
 *   history 在途窗内的新输入显示值保留，§2.5 #16b；结算按内容：草稿≠已写值→草稿
 *   保未保存标记，由控制器落库调度承接）。反向值进草稿只经 adoptPersisted
 *   （控制器采纳已落库反向值时的镜像——不打新编辑点）；反向写失败=草稿与未保存
 *   标记不动（反向值不本地应用，失败两栈不动），有待写草稿才置 saveFailed
 * - saveNow：点击立即落盘（closing gate 用户入口）；flushAll/flushNow/
 *   flushAllNow：收口面（实现驻 notes.persistence）；状态机补格（四态钮后端，
 *   INV-106）：派发即清 saveFailed、成功且无新编辑→clean、成功但有新编辑→
 *   pending 合并态+启新防抖 T、失败→saveFailed
 * - 弃改收口（discardPendingEdit/discardAllPendingEdits）已退役：课题切换改
 *   「先全量 flush 成功再切换」、关闭失败不再有确认放弃径（B4 设计 §2.5 #38/
 *   §10.2/§13.2），弃改代际守卫随之删除；在途回调只余编辑序号守卫（editSeq）
 * - resetEditStateForTests：测试隔离锚（生产代码不调用）
 * - 错误契约：load 属动作型（失败上抛由组件 toast）；保存失败 saving 复位且
 *   savedAt 不推进，下次 edit→saveSoon 自然重试
 *
 * ── 接口层 ──
 * - export const useNotesStore: UseBoundStore<NotesStore>
 *
 * ── 架构层 ──
 * - 只 import api/client 与 shared 模型；禁止 import 组件
 * - 防抖句柄按 paperId 分键（闭包，不进 state）；编辑元数据为模块级 Map/Set
 *   （不进 state 亦不入 NoteDraft 契约——五模块分布式状态机=ADR-0008 裁决
 *   不坍缩）；条目随会话内触碰过的文献线性增长（KB 量级，接受不驱逐）；
 *   写派发与收口面驻 notes.persistence.ts（写体经 per-tab lane 串行）；写派发的
 *   宿主侧装配（ports/立存核心）与文本控制器立存/裸写端口驻 notes.write-host.ts
 *   （[F-SLIMB4A-01 拆件]——经 deps 注入本草稿态与元数据，本件仍为其唯一持有方）
 *
 * ── 生命周期层 ── / ── 文化层 ──
 * - 测试：tests/unit/renderer/notes.store.test.ts（已锁定，api 桩 + fake timers）
 */
import { create } from 'zustand'
import { api, unwrap } from '../../api/client'
import type { Note } from '@shared/models/note'
import { IDLE_FLUSH_MS } from '@shared/constants'
import { quitWriteBlocked } from '../../app/quit-closing-gate'
import { createNotesCloseout, type NotesCloseout } from './notes.persistence'
import { createNotesWriteHost } from './notes.write-host'

export interface NoteDraft {
  contentMd: string
  saving: boolean
  savedAt: string | null
  /** 草稿含未落库编辑（模块级 pendingEdit 的响应式镜像，面板"未保存"显示依据）：
   *  edit 置 true / save 成功且无新编辑清 false / 合并落地置 true / 整版落地置 false */
  pending: boolean
  /** [F-UIRES-03 B3] 最近一次保存失败（error 态判定入 store——四态钮/重试单源）：
   *  save 失败置 true / 派发即清 / edit 清 / 整版与合并落地清 */
  saveFailed: boolean
}

export interface NotesStore extends NotesCloseout {
  noteByPaper: Record<string, NoteDraft>
  load(paperId: string): Promise<void>
  edit(paperId: string, patch: { contentMd?: string }): void
  saveSoon(paperId: string): void
  /** [F-UIRES-03 B3] 点击立即落盘；返回 Promise<void>（可等待面——门控命中=已决议空 promise） */
  saveNow(paperId: string): Promise<void>
  /** [B4-A R1] 立存并回报终态（reader 文本控制器 persist 端口）：true=当前草稿已在库 */
  persistNow(paperId: string): Promise<boolean>
  /** [B4-A 回炉 R5] 立存裸写（控制器 history 复合任务体内直调——不自行入链）：
   *  写当前草稿；true=当前草稿已在库；首载门控命中=false */
  persistNowRaw(paperId: string): Promise<boolean>
  /** [B4-A 回炉 R5] 文本 undo/redo 反向写裸体（控制器链任务体内直调——不自行入
   *  链）：把 value 写入库，true=该值已在库；反向值不写进草稿（窗内新输入保留） */
  historyWriteNow(paperId: string, value: string): Promise<boolean>
  /** [B4-A 回炉 R5] 已落库值采纳（控制器采纳 undo/redo 成功的反向值）：草稿置为
   *  该值并清未保存标记；不按新编辑打点 */
  adoptPersisted(paperId: string, contentMd: string): void
  /** 测试隔离锚（生产代码不调用——tab-write-lane resetTabLanes 同型）：清全部篇的
   *  防抖计时与编辑元数据（pendingEdit/touchedFields/lastEditedAt/editSeq）并清空
   *  条目。loadedOnce 不清（首载门控打卡跨用例保持——与既有清理口径一致） */
  resetEditStateForTests(): void
}

const EMPTY_DRAFT: NoteDraft = { contentMd: '', saving: false, savedAt: null, pending: false, saveFailed: false }

// 模块级编辑元数据（ADR-0008 五模块分布式状态机，不坍缩）：
// lastEditedAt=最近 edit 时刻（saveSoon 首载门控仅取存在性）；
// touchedFields=用户已触碰字段（edit 打点/save 成功与整版落地清/合并保留）；
// loadedOnce=已落地过服务器基线的文献（load 成功打点——首载完成前挂起自动保存）；
// pendingEdit=本地存在未保存编辑的文献（edit 打点/save 成功且无新编辑清、失败不清
//   ——load 落地时「有则字段级合并、无则整版」的判定）；
// editSeq=编辑序号（edit 自增——save 回调比对派发快照：派发后又有新编辑则不清
//   未保存标记，新编辑由重排的防抖收尾）
const lastEditedAt = new Map<string, number>()
const touchedFields = new Map<string, { contentMd?: boolean }>()
const loadedOnce = new Set<string>()
const pendingEdit = new Set<string>()
const editSeq = new Map<string, number>()

export const useNotesStore = create<NotesStore>()((set, get) => {
  // 每篇文献一个防抖句柄；换文献互不干扰
  const timers: Record<string, ReturnType<typeof setTimeout>> = {}

  // 请求序号（store 闭包）：只认最后一次发起的 load（对齐 library.store 的 stale-guard）
  let loadSeq = 0

  const clearTimer = (paperId: string): void => {
    const t = timers[paperId]
    if (t !== undefined) {
      clearTimeout(t)
      delete timers[paperId]
    }
  }

  const draftOf = (paperId: string): NoteDraft => get().noteByPaper[paperId] ?? EMPTY_DRAFT

  const setDraft = (paperId: string, patch: Partial<NoteDraft>): void => {
    set({
      noteByPaper: {
        ...get().noteByPaper,
        [paperId]: { ...draftOf(paperId), ...patch }
      }
    })
  }

  // 编辑已落库：清「未保存编辑」标记与触碰记录（草稿自此等于服务器基线）
  const markSaved = (paperId: string, savedAt: string): void => {
    pendingEdit.delete(paperId)
    touchedFields.delete(paperId)
    setDraft(paperId, { saving: false, savedAt, pending: false })
  }

  // [F-SLIMB4A-01 拆件] 保存派发单口的 ports 装配、立存核心与文本控制器立存/裸写端口
  // 迁驻 notes.write-host.ts（行为零变）——草稿闭包与编辑元数据经 deps 注入（按引用，
  // 本闭包仍为唯一持有方，新件不持第二份）
  const writeHost = createNotesWriteHost({
    get,
    setDraft,
    markSaved,
    clearTimer,
    editSeq,
    pendingEdit,
    touchedFields,
    loadedOnce,
    lastEditedAt
  })

  // 收口面（flush/flushAll/flushNow/flushAllNow）实现驻 notes.persistence——
  // 本闭包装配依赖（在途句柄/草稿失败标记/pending 快照/立存核心）
  const closeout = createNotesCloseout({
    inflightOf: (paperId) => writeHost.persistence.inflightOf(paperId),
    inflightIds: () => writeHost.persistence.inflightIds(),
    pendingIds: () => [...pendingEdit],
    hasPending: (paperId) => pendingEdit.has(paperId),
    readFailed: (paperId) => get().noteByPaper[paperId]?.saveFailed,
    clearTimer,
    dispatch: (paperId) => writeHost.persistence.dispatch(paperId),
    dispatchNow: writeHost.dispatchSaveNow
  })

  return {
    noteByPaper: {},

    async load(paperId) {
      // 动作型：失败上抛由组件 toast；null 笔记合法（空草稿起步）
      const seq = ++loadSeq
      try {
        const note = await unwrap(api.notes.get({ paperId }))
        // 旧响应晚到：丢弃，不覆盖新结果/编辑中的草稿
        if (seq !== loadSeq) return
        const serverContent = note?.contentMd ?? ''
        const serverSavedAt = note?.updatedAt ?? null
        // 不变量：本地有未保存编辑（含保存失败）→ 字段级合并（头注）
        if (pendingEdit.has(paperId)) {
          const draft = get().noteByPaper[paperId] ?? EMPTY_DRAFT
          const touched = touchedFields.get(paperId)
          setDraft(paperId, {
            contentMd: touched?.contentMd ? draft.contentMd : serverContent,
            saving: false,
            savedAt: serverSavedAt,
            // 合并产物仍是未落库的用户内容（补存尚未派发/落库）——镜像置 true，
            // 面板不得因 savedAt 被赋服务器值而误显"已保存"
            pending: true,
            // [B3] 载入重建基线：旧失败态不跨 load 延续（补存派发时本也会清）
            saveFailed: false
          })
          // 触碰记录不清（合并产物仍未落库——作废点在 save 成功回调）
          loadedOnce.add(paperId)
          // 补存挂起的用户编辑（须在 loadedOnce 打点之后——否则被门控吞掉）
          get().saveSoon(paperId)
          return
        }
        // 整版落地：清"已触碰字段"（回到同步态语义）
        touchedFields.delete(paperId)
        setDraft(paperId, {
          contentMd: serverContent,
          saving: false,
          savedAt: serverSavedAt,
          pending: false,
          saveFailed: false
        })
        loadedOnce.add(paperId)
      } catch (e) {
        if (seq !== loadSeq) return // 旧请求的失败按迟到丢弃
        throw e
      }
    },

    edit(paperId, patch) {
      // [F-VISFB-64] closing gate：冻结期用户输入拒绝（quit 收口补存经豁免域放行）
      if (quitWriteBlocked()) return
      // 编辑元数据打点（模块级，不入 NoteDraft 契约——各 Map 头注）
      lastEditedAt.set(paperId, Date.now())
      pendingEdit.add(paperId)
      editSeq.set(paperId, (editSeq.get(paperId) ?? 0) + 1)
      const touched = touchedFields.get(paperId) ?? {}
      if (patch.contentMd !== undefined) touched.contentMd = true
      touchedFields.set(paperId, touched)
      // [B3 格8] error+输入→dirty：清 saveFailed（缓冲并入 dirty 编辑态；
      // 镜像 pending 保持"未落库"语义，非 saving 期缓冲位）
      setDraft(paperId, { ...patch, pending: true, saveFailed: false })
    },

    saveSoon(paperId) {
      // 首载完成前挂起保存（服务器基线未知——用户输入由 load 合并保护、落地后
      // 补存；load 失败不打卡）；重开面板不受影响：loadedOnce 已打卡
      if (!loadedOnce.has(paperId) && lastEditedAt.has(paperId)) return
      clearTimer(paperId)
      timers[paperId] = setTimeout(() => {
        delete timers[paperId]
        void writeHost.persistence.dispatch(paperId)
      }, IDLE_FLUSH_MS)
    },

    saveNow(paperId) {
      // [F-VISFB-64·回炉 B1] closing gate：saveNow=用户命令入口；收口链走
      // dispatchSaveNow 核心（闸点收窄到命令入口——异步链深处禁依赖豁免域）
      if (quitWriteBlocked()) return Promise.resolve()
      return writeHost.dispatchSaveNow(paperId).then(() => undefined)
    },

    persistNow: writeHost.persistNow,
    persistNowRaw: writeHost.persistNowRaw,
    historyWriteNow: writeHost.historyWriteNow,
    adoptPersisted: writeHost.adoptPersisted,

    flush: closeout.flush,
    flushAll: closeout.flushAll,
    flushNow: closeout.flushNow,
    flushAllNow: closeout.flushAllNow,

    resetEditStateForTests() {
      // 遍历键快照（clearTimer 删键）
      for (const paperId of Object.keys(timers)) clearTimer(paperId)
      pendingEdit.clear()
      touchedFields.clear()
      lastEditedAt.clear()
      editSeq.clear()
      set({ noteByPaper: {} })
    }
  }
})

export type { Note }
