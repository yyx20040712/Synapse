/**
 * [SR-NOTE-02] notes.store —— 笔记编辑状态（工单：done / weak）
 *
 * ── 行为层 ──
 * - { noteByPaper: Record<string, { contentMd: string; saving: boolean;
 *     savedAt: string | null; pending: boolean }> }（pending=未落库编辑镜像，见
 *     NoteDraft 字段注释——面板"未保存/已保存"诚实显示的依据；
 *     [A2 F-CONTRACTA-01 2026-10-04] title 停用——草稿/编辑域坍缩为
 *     contentMd 单字段，字段级合并语义随之单字段化）
 * - load(paperId)：unwrap(api.notes.get) 重建草稿（无笔记 → 空草稿，savedAt=null）；
 *   带请求序号 stale-guard（对齐 library.store）——晚到的旧响应（含旧失败）直接
 *   丢弃。落地不变量：本地存在未保存编辑（模块级 pendingEdit，save 成功清、
 *   失败不清）→ 一律字段级合并——用户碰过的字段保草稿值、未碰过的取服务器、
 *   savedAt 取服务器（无半成品、无整版覆盖，时间先后不参与判定），触碰记录
 *   保留到补存真正落库（save 成功才清），打首载标记并补存挂起编辑；无未保存
 *   编辑 → 整版落地并打首载标记（失败不打——面板禁用无输入，重试成功走合并+补存）
 * - edit(paperId, patch)（同步写草稿；并记模块级编辑时间戳、编辑序号、已触碰
 *   字段与未保存标记）；saveSoon(paperId)（防抖 1.5s，重排重置计时，只保存
 *   最新内容；首载落地前挂起——从未成功载入且草稿含用户编辑时不排程，重开
 *   面板不受影响：既有草稿是完整基线非半成品，正常防抖；save 成功仅在派发
 *   后无新编辑（编辑序号守卫）时清未保存标记与触碰记录）
 * - [F-UIRES-03 B3] saveNow(paperId)：点击立即落盘——清防抖 T+同步派发（与
 *   防抖到期共用 dispatchSave；首载门控同 saveSoon——服务器基线未知不抢存，
 *   由 load 合并+补存承接）；flush(paperId)：卸载面收口（切文献/面板卸载时
 *   调）——pending∧saving 在途：等在途完成后以 pending 合并态**立即**落盘
 *   （消费时点一的新防抖由此提前兑现）；pending∧error：立即重试落盘一次；
 *   普遍 dirty（防抖在排）：no-op——既有 timer 通道承接（不抢跑）。应用退出
 *   无 renderer 侧预卸载事件（destroy 绕过 beforeunload）——退出通道=既有
 *   quit-dirty 拦截（INV-22：pending 镜像含 error 态恒拦，拦截窗内 timer/在途
 *   照常落盘）
 * - [F-UIRES-03 B3] 状态机补格（四态钮后端，INV-106）：派发即清 saveFailed
 *   （error+点击→saving）；成功且派发后无新编辑→clean；成功但又有新编辑→
 *   pending 合并态转 dirty 且**启新防抖 T**（消费时点一——保存期输入由新周期
 *   收尾，不再依赖组件恰好在 edit 时重排）；失败→saveFailed 置位（error）且
 *   pending/savedAt 不动（INV-04）；edit 清 saveFailed（error+输入→dirty）
 * - discardPendingEdit(paperId)（单篇弃改收口——关脏 tab 确认丢弃后调）：清
 *   防抖句柄+全部模块级编辑元数据（pendingEdit/touchedFields/lastEditedAt/
 *   editSeq）+noteByPaper 条目（幂等——不存在亦无害），discardGen 自增使在途
 *   save 回调按代际守卫全 no-op；discardAllPendingEdits()（全量弃改收口——
 *   切课题确认后调）：遍历 pendingEdit 快照逐篇同收口。代际守卫一句话：弃改
 *   后到达的保存回调不得复活任何本地状态（条目/pending 镜像/未保存标记——
 *   in-flight 残余仅剩 DB 落地毫秒窗，票面已接受；跨格序列语义见锁定测试
 *   「discard 族（A3 悬置写修票）」：①discard→重开=整版落地②discard→回调
 *   到达=零状态变更③discardAll=零 timer 零草稿④App 切视图不 discard——
 *   autosave-first 草稿存活）
 * - 错误契约（全 store 统一）：load 属动作型——失败上抛（unwrap 的 ApiClientError），
 *   由 NotesPanel catch 后 toast；saveSoon 失败时 saving 必须复位且 savedAt 不推进
 *   （= 仍有未保存内容，不静默丢稿），下一次 edit 再次触发 saveSoon 即自然重试
 *
 * ── 接口层 ──
 * - export const useNotesStore: UseBoundStore<...>
 *
 * ── 架构层 ──
 * - 只 import api/client 与 shared 模型；禁止 import 组件
 * - 防抖句柄按 paperId 分键（模块闭包，不进 state）；编辑元数据（时间戳/已触碰
 *   字段/首载标记/未保存编辑标记）为模块级 Map/Set——不进 state 亦不入 NoteDraft
 *   导出契约；条目随会话内触碰过的文献线性增长（单用户本地应用为 KB 量级，接受
 *   不驱逐）；无笔记/有笔记共用同一草稿槽
 *
 * ── 生命周期层 ── / ── 文化层 ──
 * - 测试：tests/unit/renderer/notes.store.test.ts（已锁定，api 桩 + fake timers）
 */
import { create } from 'zustand'
import { api, unwrap } from '../../api/client'
import type { Note } from '@shared/models/note'

export interface NoteDraft {
  contentMd: string
  saving: boolean
  savedAt: string | null
  /** 草稿含未落库编辑（模块级 pendingEdit 的响应式镜像，面板"未保存"显示依据）。
   *  四个同步点与 pendingEdit 一一对应：edit 置 true / save 成功且派发后无新编辑
   *  清 false / 合并落地置 true / 整版落地置 false（save 失败与派发后有新编辑不动） */
  pending: boolean
  /** [F-UIRES-03 B3] 最近一次保存失败（error 态判定入 store——四态钮/重试路径
   *  单源；取代组件层周期终点判定）。同步点：save 失败置 true / 派发即清
   *  （error+点击→saving）/ edit 清（error+输入→dirty）/ 整版与合并落地清 */
  saveFailed: boolean
}

export interface NotesStore {
  noteByPaper: Record<string, NoteDraft>
  load(paperId: string): Promise<void>
  edit(paperId: string, patch: { contentMd?: string }): void
  saveSoon(paperId: string): void
  /** [F-UIRES-03 B3] 点击立即落盘：清防抖 T+同步派发（首载门控同 saveSoon） */
  saveNow(paperId: string): void
  /** [F-UIRES-03 B3] 卸载面收口（切文献/面板卸载）：在途完成后 pending 立即
   *  落盘 / error 立即重试一次 / 普遍 dirty no-op（timer 通道承接） */
  flush(paperId: string): Promise<void>
  /** 单篇弃改收口（关脏 tab 确认丢弃后调）——幂等，条目/元数据不存在亦无害 */
  discardPendingEdit(paperId: string): void
  /** 全量弃改收口（切课题确认后调）——遍历 pendingEdit 快照逐篇同收口 */
  discardAllPendingEdits(): void
}

/** 自动保存防抖窗口（毫秒） */
const SAVE_DEBOUNCE_MS = 1500

const EMPTY_DRAFT: NoteDraft = { contentMd: '', saving: false, savedAt: null, pending: false, saveFailed: false }

/** 每篇文献最近一次 edit 的时刻（Date.now()）——saveSoon 首载门控的判定依据（仅取存在性） */
const lastEditedAt = new Map<string, number>()

/** 每篇文献"用户已触碰字段"（edit 打点；save 成功清/整版落地清，合并路径保留）——字段级合并的依据 */
const touchedFields = new Map<string, { contentMd?: boolean }>()

/** 已成功落地过服务器基线的文献（load 成功路径打点，失败不打）——首载完成前挂起自动保存的门控 */
const loadedOnce = new Set<string>()

/** 本地存在未保存编辑的文献（edit 打点；save 成功清、失败不清）——load 落地时合并/整版的判定：
 *  不变量——存在未保存编辑一律字段级合并（含"失败→重试成功""防抖窗口内切走切回"等
 *  编辑早于本次 load 的场景），无未保存编辑才整版落地 */
const pendingEdit = new Set<string>()

/** 每篇文献的编辑序号（edit 自增）——save 成功回调比对"派发快照"：派发后又有
 *  新编辑（序号前进）则不清未保存标记，新编辑由重排的防抖保存收尾 */
const editSeq = new Map<string, number>()

/** 每篇文献的弃改代际（discard 自增）——save 回调比对"派发快照"：弃改后到达的
 *  保存回调不得复活任何本地状态（代际已变即全 no-op；gen 在每次派发时重取，
 *  discard 后的新编辑链不受误伤）。in-flight 残余=仅 DB 落地毫秒窗（票面已接受） */
const discardGen = new Map<string, number>()

/** [F-UIRES-03 B3] 每篇文献在途保存的 promise（flush 等待在途完成的依据）。
 *  同篇并发在途（防抖到期撞上未完在途——既有行为）时记最新一笔；早到笔
 *  settle 时若 map 已指向新笔则不删（flush 语义按最新在途收敛） */
const inflight = new Map<string, Promise<void>>()

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

  // [F-UIRES-03 B3] 保存派发单口（防抖到期/saveNow 点击/flush 重试三路共用）：
  // 载荷=调用时草稿闭包快照（saving 中新编辑不覆盖在途载荷——派发后 edit 只写
  // 草稿与编辑序号）；派发即清 saveFailed（error+点击→saving 格）。成功且派发
  // 后无新编辑→clean；成功但又有新编辑→pending 合并态转 dirty 且启新防抖 T
  // （消费时点一——不依赖组件恰在 edit 时重排，卸载后同样有收尾通道）；失败→
  // saveFailed 置位（error）且 pending/savedAt 不动（INV-04）。返回在途 promise
  // （flush 等待用；永不 reject——catch 已内吞）
  const dispatchSave = (paperId: string): Promise<void> => {
    const draft = get().noteByPaper[paperId]
    if (draft === undefined) {
      return Promise.resolve()
    }
    // 派发快照：本次保存对应的编辑序号（派发后若又有 edit，序号前进）与
    // 弃改代际（弃改后到达的回调按代际守卫全 no-op）
    const seqAtDispatch = editSeq.get(paperId) ?? 0
    const genAtDispatch = discardGen.get(paperId) ?? 0
    setDraft(paperId, { saving: true, saveFailed: false })
    const flight: Promise<void> = unwrap(
      api.notes.save({ paperId, contentMd: draft.contentMd })
    )
      .then((saved: Note) => {
        // 代际守卫（首行）：discard 已发生——全 no-op，不 setDraft、不动
        // pendingEdit/touchedFields（setDraft 会经 draftOf 重建已删条目+置
        // pending 镜像，即"回调复活"；既有 editSeq 守卫在其后保持原位）
        if ((discardGen.get(paperId) ?? 0) !== genAtDispatch) return
        // 编辑已落库：清"未保存编辑"标记与触碰记录（草稿自此等于服务器基线）
        // ——仅当派发后无新编辑（编辑序号未前进）；有新编辑则不清（新编辑仍
        // 受合并保护，由重排的防抖保存收尾）。失败路径不清——仍是未保存，
        // load 继续合并保护
        if ((editSeq.get(paperId) ?? 0) === seqAtDispatch) {
          pendingEdit.delete(paperId)
          touchedFields.delete(paperId)
          // 与 pendingEdit 同点同条件清镜像：草稿自此等于服务器基线
          setDraft(paperId, { saving: false, savedAt: saved.updatedAt, pending: false })
        } else {
          // 派发后又有新编辑：pendingEdit 保留，镜像显式置 true（与同步点对偶，
          // 不靠"上一帧必为 true"的隐式假设）
          setDraft(paperId, { saving: false, savedAt: saved.updatedAt, pending: true })
          // [B3 消费时点一] pending 合并态转 dirty：启新防抖 T（复刻 load 补存
          // 语义——新输入无论组件在否都由新周期收尾；flush 在途等待后可提前兑现）
          get().saveSoon(paperId)
        }
      })
      .catch(() => {
        // 代际守卫（首行）：discard 已发生——全 no-op（条目已删，setDraft 会
        // 重建它）；失败复位语义只对"未弃改"的保存链生效
        if ((discardGen.get(paperId) ?? 0) !== genAtDispatch) return
        // 失败不推进 savedAt（未保存态延续）；saving 复位后下次 edit→saveSoon 重试；
        // pendingEdit 与镜像 pending 均保留——内容未落库，面板继续显示未保存。
        // [B3] saveFailed 置位（error 态入 store——四态钮红描边/重试的单源）
        setDraft(paperId, { saving: false, saveFailed: true })
      })
      .finally(() => {
        // 同篇并发在途时只清自己（map 已指向新笔则保留——flush 按最新在途收敛）
        if (inflight.get(paperId) === flight) {
          inflight.delete(paperId)
        }
      })
    inflight.set(paperId, flight)
    return flight
  }

  // 弃改收口私有实现（单篇，discardPendingEdit 与 discardAllPendingEdits 共用）：
  // 清防抖句柄+全部模块级编辑元数据+条目；discardGen 自增使在途 save 回调按
  // 代际守卫全 no-op（防回调重建条目/pending 镜像）。全操作幂等——条目/元数据
  // 不存在亦无害。跨格序列：①此后 load 走整版落地（pendingEdit 已清，不合并
  // 回填）②在途 save 回调到达=零状态变更③discardAll 逐篇调用=零 timer 零草稿
  // ④App 切视图（无确认）不经此处——autosave-first 草稿存活（既有语义保持）
  const discardOne = (paperId: string): void => {
    clearTimer(paperId)
    pendingEdit.delete(paperId)
    touchedFields.delete(paperId)
    lastEditedAt.delete(paperId)
    editSeq.delete(paperId)
    discardGen.set(paperId, (discardGen.get(paperId) ?? 0) + 1)
    const rest = { ...get().noteByPaper }
    delete rest[paperId]
    set({ noteByPaper: rest })
  }

  return {
    noteByPaper: {},

    async load(paperId) {
      // 动作型：失败上抛由组件 toast；null 笔记合法（空草稿起步）
      const seq = ++loadSeq
      try {
        const note = await unwrap(api.notes.get({ paperId }))
        // 旧响应晚到（load 已被再次发起）：丢弃，不覆盖新结果/编辑中的草稿
        if (seq !== loadSeq) return
        const serverContent = note?.contentMd ?? ''
        const serverSavedAt = note?.updatedAt ?? null
        // 不变量：本地存在未保存编辑（pendingEdit，含保存失败）→ 一律字段级合并：
        // 碰过的字段保用户输入，未碰过的取服务器，savedAt 取服务器（无半成品、
        // 无整版覆盖）——时间先后不参与判定
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
          // 触碰记录不清：合并后的草稿仍是未落库的用户内容（补存失败或挂起时，
          // 下次合并须继续按 touched 保用户字段）；作废点在 save 成功回调（与
          // 未保存标记同点同条件）
          loadedOnce.add(paperId)
          // 把挂起的用户编辑落库（首载门控吞掉的防抖在此补上；须在 loadedOnce
          // 打点之后调，否则被 saveSoon 门控再次吞掉）
          get().saveSoon(paperId)
          return
        }
        // 整版落地：清"已触碰字段"（无未保存编辑，触碰值已落库/被覆盖，回到同步态语义）
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
        // 旧请求的失败同样按迟到丢弃（面板已发起更新的 load），仅最新请求失败上抛
        if (seq !== loadSeq) return
        throw e
      }
    },

    edit(paperId, patch) {
      // 编辑元数据打点（模块级，不入 NoteDraft 契约）：lastEditedAt 供 saveSoon
      // 首载门控，touched 供字段级合并，pendingEdit 标记"本地存在未保存编辑"，
      // editSeq 供保存成功回调判定"派发后是否又有新编辑"
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
      // 首载完成前挂起保存：从未成功载入且草稿已含用户编辑（服务器基线未知，
      // 可能半成品——如正文有输入而服务器侧尚无对应行）时不排程自动保存。用户输入由
      // load 的字段级合并保护、落地后补存；load 失败不打卡（面板禁用无输入，
      // 重试成功走合并+补存）。重开面板不受影响：loadedOnce 已打卡，正常防抖
      if (!loadedOnce.has(paperId) && lastEditedAt.has(paperId)) return
      clearTimer(paperId)
      timers[paperId] = setTimeout(() => {
        delete timers[paperId]
        void dispatchSave(paperId)
      }, SAVE_DEBOUNCE_MS)
    },

    saveNow(paperId) {
      // [B3 格3/格9] 点击立即落盘：清防抖 T+同步派发（dirty+点击/error+点击共用；
      // 首载门控同 saveSoon——服务器基线未知不抢存，由 load 合并+补存承接）
      if (!loadedOnce.has(paperId) && lastEditedAt.has(paperId)) return
      clearTimer(paperId)
      void dispatchSave(paperId)
    },

    async flush(paperId) {
      // [B3 卸载面] 切文献/面板卸载时收口（fire-and-forget 调用方；本方法可 await
      // 供测试钉终态）。三路：①pending∧saving 在途——等在途完成（成功侧已启新
      // 防抖/失败侧落 error），完成后仍有未落库编辑即立即落盘（不等新防抖）；
      // ②pending∧error——立即重试落盘一次；③普遍 dirty（防抖在排）——no-op，
      // 既有 timer 通道承接（模块级 timer 不随组件卸载清除）。等待期间若已有
      // 新在途接管（并发防抖撞上）则让位——其载荷即最新合并态
      const hadFlight = inflight.get(paperId)
      if (hadFlight !== undefined) {
        await hadFlight
        if (inflight.get(paperId) !== undefined) return
      }
      const draft = get().noteByPaper[paperId]
      if (draft === undefined || !pendingEdit.has(paperId)) return
      if (hadFlight === undefined && !draft.saveFailed) return
      clearTimer(paperId)
      await dispatchSave(paperId)
    },

    discardPendingEdit(paperId) {
      discardOne(paperId)
    },

    discardAllPendingEdits() {
      // 遍历 pendingEdit 快照逐篇调同一私有实现（防遍历中变异——discardOne
      // 会 delete pendingEdit 键）
      for (const paperId of [...pendingEdit]) {
        discardOne(paperId)
      }
    }
  }
})

export type { Note }
