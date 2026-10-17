// b3: P7-H
/**
 * [F-VISFB-62 拆件] lineage-note-ops —— 悬浮笔记动作域件（自 lineage.store
 * 拆出 2026-10-17——store 496 行险位〔61 号遗留「62 号必须先拆件」清偿〕；
 * 先例=lineage-session-ops.ts〔F-VISFB-61 拆件位〕）。拆件=纯移动零语义改：
 * addFloatingNote/updateFloatingNote/removeFloatingNote 三实现自 store 迁入
 * （载荷字段序/守卫序/守卫条件逐字节保形），store 留接口签名+解构注入接线
 * （调用面名字零 churn）。
 *
 * ── 行为层（语义随迁——注释原文自 lineage.store）──
 * - 三操作=编辑单元族（beginUnit→enqueue——与边/节点写同链）；store 级
 *   锁面（undo/redo/save 往返/reload/folder 隔离/saving 锁）=
 *   tests/unit/renderer/lineage-floating-notes.test.ts（61 号——本件零语义改）。
 *
 * ── 接口层 ──
 * - export function createNoteOps(deps: NoteOpsDeps): NoteOps
 *   （get/beginUnit/enqueue 结构注入——宿主=lineage.store 装配位；
 *   set 不注入：三操作写面全经 enqueue 乐观应用，无直写面）
 */
import type { FloatingNote } from '@shared/models/lineage'
import type { WriteAction } from './lineage-write-queue'

export interface NoteOps {
  addFloatingNote(x: number, y: number, content: string): void
  updateFloatingNote(id: string, patch: Partial<Pick<FloatingNote, 'content' | 'x' | 'y'>>): void
  removeFloatingNote(id: string): void
}

/** 域件依赖注入面（宿主 store 装配：get=图域+笔记现值；beginUnit=会话
 *  编辑单元入口〔lineage-session-ops〕；enqueue=暂存队列〔lineage-write-queue〕） */
export interface NoteOpsDeps {
  get(): { folderId: string; floatingNotes: FloatingNote[] }
  beginUnit(): boolean
  enqueue(action: WriteAction): void
}

export function createNoteOps(deps: NoteOpsDeps): NoteOps {
  const { get, beginUnit, enqueue } = deps

  // [F-VISFB-61] 悬浮笔记三动作（beginUnit→enqueue——与边/节点写同链：
  // 暂存+乐观+undo 栈+save 可等待）
  const addFloatingNote = (x: number, y: number, content: string): void => {
    if (!beginUnit()) return
    enqueue({
      kind: 'upsert-floating-note',
      input: { folderId: get().folderId, x, y, content }
    })
  }

  const updateFloatingNote = (id: string, patch: Partial<Pick<FloatingNote, 'content' | 'x' | 'y'>>): void => {
    const n = get().floatingNotes.find((f) => f.id === id)
    if (n === undefined) throw new Error(`悬浮笔记不在图中：${id}`)
    // [回炉 R4] 空 patch 早退：无任何键=无编辑语义——不产生编辑单元（不入队
    // 不 dirty 不清 redoStack 不刷 updated_at）
    if (Object.keys(patch).length === 0) return
    if (!beginUnit()) return
    // 全载荷合成（现值+patch 覆盖——防半更新清字段，A8 同族）
    enqueue({
      kind: 'upsert-floating-note',
      input: {
        id: n.id,
        folderId: n.folderId,
        x: patch.x ?? n.x,
        y: patch.y ?? n.y,
        content: patch.content ?? n.content
      }
    })
  }

  const removeFloatingNote = (id: string): void => {
    // [回炉 R1] 幽灵 id 抛（与 updateFloatingNote 对称——接口注释契约落地；
    // 先检后 beginUnit=抛后零副作用：不入队不清 redoStack 不置 dirty）
    if (get().floatingNotes.find((f) => f.id === id) === undefined) {
      throw new Error(`悬浮笔记不在图中：${id}`)
    }
    if (!beginUnit()) return
    enqueue({ kind: 'remove-floating-note', id })
  }

  return { addFloatingNote, updateFloatingNote, removeFloatingNote }
}
