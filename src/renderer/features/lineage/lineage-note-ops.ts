// b3: P7-H
/**
 * [B4 L1 / 设计稿 §2.5 #3/#4、§5.2 #11-#13] lineage-note-ops —— 悬浮笔记动作域件
 * （三操作=编辑单元族；[B4 L1] 由快照撤销域改接同步编辑单元 recorder：登记该
 * 笔记 before→enqueue 乐观应用→commit 构造 changes）。
 * [F-VISFB-62 拆件] lineage-note-ops —— 悬浮笔记动作域件（自 lineage.store
 * 拆出 2026-10-17——store 496 行险位〔61 号遗留「62 号必须先拆件」清偿〕；
 * 先例=lineage-session-ops.ts〔F-VISFB-61 拆件位〕。
 *
 * ── 行为层 ──
 * - addFloatingNote：null→F'（本地 id 即持久 id——登记须先于乐观应用，故 id 在
 *   构造层生成；isNew 仅标记）。
 * - updateFloatingNote：F→F'（全载荷合成防半更新清字段）；空 patch 早退=无编辑
 *   语义（不入队不 dirty 不清 redo——RR13 同型）。
 * - removeFloatingNote：F→null；幽灵 id 先检后开单元=抛后零副作用。
 * - 三操作与边/节点写同链：gate（quit/recovery/conflict 冻结、同会话 saving 编辑
 *   锁）由宿主 editUnit 判定——返回 false=放弃写。store 级锁面（undo/redo/save
 *   往返/reload/folder 隔离/saving 锁）的测试=tests/unit/renderer/lineage-floating-notes.test.ts（61 号）。
 *
 * ── 接口层 ──
 * - export function createNoteOps(deps: NoteOpsDeps): NoteOps
 *   （get/editUnit/enqueue 结构注入——宿主=lineage.store 装配位；
 *   set 不注入：三操作写面全经 enqueue 乐观应用，无直写面）
 */
import type { LineageEditCommandKind } from '@shared/ipc/lineage-history.schemas'
import type { FloatingNote } from '@shared/models/lineage'
import type { WriteAction } from '@shared/recovery/schemas'
import type { EditUnit } from './lineage-session-ops'

export interface NoteOps {
  /** [F-VISFB-61] 悬浮笔记创建（当前图域——folderId=store.folderId；乐观
   *  应用+入队，不发 IPC；一单元=一撤销步）；62 号 UI 按 effective-scale
   *  换算内容坐标后传入（store 只存取画布 own 域坐标） */
  addFloatingNote(x: number, y: number, content: string): void
  /** [F-VISFB-61] 编辑（content/x/y patch——全载荷合成防半更新清字段，
   *  A8 同族；同 id 队列合并最后写胜出） */
  updateFloatingNote(id: string, patch: Partial<Pick<FloatingNote, 'content' | 'x' | 'y'>>): void
  /** [F-VISFB-61] 删除（乐观移除+remove 动作入队；幽灵 id 抛） */
  removeFloatingNote(id: string): void
}

/** 域件依赖注入面（宿主 store 装配：get=笔记现值；editUnit=同步编辑单元边界；
 *  enqueue=暂存队列〔lineage-write-queue〕） */
export interface NoteOpsDeps {
  get(): { folderId: string; floatingNotes: FloatingNote[] }
  editUnit(command: LineageEditCommandKind, body: (unit: EditUnit) => void): boolean
  enqueue(action: WriteAction): void
}

export function createNoteOps(deps: NoteOpsDeps): NoteOps {
  const { get, editUnit, enqueue } = deps

  // 悬浮笔记三动作（editUnit→enqueue——与边/节点写同链：乐观+changes+可等待）
  const addFloatingNote = (x: number, y: number, content: string): void => {
    editUnit('addFloatingNote', (u) => {
      const id = crypto.randomUUID() // 本地乐观 id=落库 id（登记先于乐观应用）
      u.watchNote(id)
      enqueue({ kind: 'upsert-floating-note', input: { id, folderId: get().folderId, x, y, content }, isNew: true })
    })
  }

  const updateFloatingNote = (id: string, patch: Partial<Pick<FloatingNote, 'content' | 'x' | 'y'>>): void => {
    const n = get().floatingNotes.find((f) => f.id === id)
    if (n === undefined) throw new Error(`悬浮笔记不在图中：${id}`)
    // [回炉 R4] 空 patch 早退：无任何键=无编辑语义——不产生编辑单元（不入队
    // 不 dirty 不清 redoStack 不刷 updated_at）
    if (Object.keys(patch).length === 0) return
    editUnit('updateFloatingNote', (u) => {
      u.watchNote(n.id)
      // 全载荷合成（现值+patch 覆盖——防半更新清字段，A8 同族）
      enqueue({
        kind: 'upsert-floating-note',
        input: { id: n.id, folderId: n.folderId, x: patch.x ?? n.x, y: patch.y ?? n.y, content: patch.content ?? n.content }
      })
    })
  }

  const removeFloatingNote = (id: string): void => {
    // [回炉 R1] 幽灵 id 抛（与 updateFloatingNote 对称——接口注释契约落地；
    // 先检后开单元=抛后零副作用：不入队不清 redoStack 不置 dirty）
    if (get().floatingNotes.find((f) => f.id === id) === undefined) {
      throw new Error(`悬浮笔记不在图中：${id}`)
    }
    editUnit('removeFloatingNote', (u) => {
      u.watchNote(id)
      enqueue({ kind: 'remove-floating-note', id })
    })
  }

  return { addFloatingNote, updateFloatingNote, removeFloatingNote }
}
