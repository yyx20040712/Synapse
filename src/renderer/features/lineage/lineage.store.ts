// b3: P7-H
/**
 * lineage.store —— 脉络图数据+读面/写面状态单源（store）。
 *
 * ── 数据单源接缝声明（双向锚定：本行+LineagePage 头注）──
 * lineage/graph 取数=本 store 单点；LineagePage/LineageCanvas/03 编辑层
 * （LineageBoard）/04 侧板（LineageSidePanel）一律经本 store 分发消费——
 * **03/04 禁双取**（不得另行直连 window.api.lineage.graph 建第二取数点；
 * 04 的 ai_notes/list、notes/get 属不同数据域不在本约；03 添加对话框的
 * library.list 属文献库域取数同样不在本约）。数据缓存：nodes/edges 驻
 * store（视图切换卸载不丢，03/04 消费面免二次取数）。
 *
 * ── 读面状态枚举（门一 N6）──
 * loading/ready/error 三态；stale-guard 请求序号（notes.store 同型）：晚到
 * 的旧响应（含旧失败）丢弃；**写面互锁（LG-03）**：写队列未清空时 graph
 * 落地同样丢弃（写回填面为准——写与读竞态的窄窗防御）。
 *
 * ── 写面状态机（LG-03，宪法前置；测试=tests/unit/renderer/lineage-store-write.test.ts）──
 * - 态空间：saveStatus ∈ {saved, saving, error} × queue（写动作序列）
 * - 迁移：saved+edit→saving（入队+flush 派发）/saving+edit→saving（同实体
 *   排队合并=**最后写胜出**）/flush 逐动作成功且队列清空→saved（数据回填）
 *   /系统型失败（非 CONFLICT）→error（**队首保留**+toast+重试——INV-04
 *   同型：失败不推进保存态）/CONFLICT 拒绝型→**丢弃动作继续队列**（树守卫
 *   reason 透传 toast——守卫宿主=LG-01 service INV-27；永不成功的动作
 *   丢弃否则卡队头且脏态误报）/error+edit→saving（自动重试）/error+retry→
 *   saving（重发保留队列）
 * - 跨格序列：连续编辑中保存失败→后续编辑不丢（队列保留+合并收尾）；改父
 *   删成功+加失败=合法中间态（节点暂无父，森林语义）+toast 指明+重试只重发加边
 * - dirty 投影：saveStatus≠saved 即脏（useLineageDirty——App 退出拦截
 *   聚合输入，INV-22 扩面）
 *
 * 错误契约：load 失败不上抛——失败态驻 store.error（列表型瞬态，消费方
 * 呈现+重试，INV-02 两型分清；动作型 toast 面=本 store 写路径 flush 内
 * showToast——toast-store 的 .ts 可导入先例 reader.store 同型）。
 */
import { create } from 'zustand'
import { api, unwrap, ApiClientError } from '../../api/client'
import { showToast } from '../../shared/ui/toast-store'
import type { LineageEdge, LineageEdgeUpsert, LineageNode, LineageNodeUpsert } from '@shared/models/lineage'

export type LineageStatus = 'loading' | 'ready' | 'error'

/** 保存态三态（ADR-0014 保存语义对齐标注/笔记——INV-04 同型不新立号） */
export type LineageSaveStatus = 'saved' | 'saving' | 'error'

/** 写动作（排队单元；reparent 的加边动作带标记——N5 部分失败 toast 前缀） */
type WriteAction =
  | { kind: 'upsert-node'; input: LineageNodeUpsert; reparent?: boolean }
  | { kind: 'remove-node'; id: string }
  | { kind: 'upsert-edge'; input: LineageEdgeUpsert; reparent?: boolean }
  | { kind: 'remove-edge'; id: string }

export interface LineageStore {
  nodes: LineageNode[]
  edges: LineageEdge[]
  status: LineageStatus
  error: string | null
  /** 写面保存态三态（≠saved 即脏——退出聚合输入） */
  saveStatus: LineageSaveStatus
  /** 最近一次系统型写失败消息（error 态指示条呈现；成功清空） */
  lastWriteError: string | null
  /** 待发/重发写动作队列（驻 state 供测试与脏态判定；flushing=串行派发中） */
  queue: WriteAction[]
  flushing: boolean
  load(): Promise<void>
  /** 加节点两型：文献型（paperId 绑定+元数据默认）/主题型（阶段分组） */
  addPaperNode(paper: { id: string; title: string; year: number | null }): void
  addThemeNode(title: string): void
  /** 拖拽落点→x/y 覆盖（JSON Canvas 模式；全字段载荷收口在此防半更新清字段） */
  moveNode(id: string, x: number, y: number): void
  editCoreIdea(id: string, coreIdea: string): void
  linkNodes(from: string, to: string, label?: string): void
  /** 改父=删旧边+加新边两调用（N5 语义；无旧边=仅加边） */
  reparentNode(nodeId: string, newParentId: string): void
  removeNode(id: string): void
  removeEdge(id: string): void
  /** error 态重试：重发保留队列（动作在 error+新编辑时自动重试） */
  retrySave(): void
}

/** 退出拦截聚合输入（INV-22 扩面：tab dirty ∪ lineage dirty——App.tsx 组合根单点） */
export function useLineageDirty(): boolean {
  return useLineageStore((s) => s.saveStatus !== 'saved')
}

/** 同实体判定（排队合并=最后写胜出）：同 kind 且目标相同（新建节点无 id 不合并） */
function sameTarget(a: WriteAction, b: WriteAction): boolean {
  if (a.kind !== b.kind) return false
  if (a.kind === 'upsert-node' && b.kind === 'upsert-node') {
    return a.input.id !== undefined && a.input.id === b.input.id
  }
  if (a.kind === 'upsert-edge' && b.kind === 'upsert-edge') {
    return a.input.fromNode === b.input.fromNode && a.input.toNode === b.input.toNode
  }
  return (a as { id: string }).id === (b as { id: string }).id
}

/** 改父失败 toast 前缀（N5：删成功+加失败=合法中间态，须指明不静默不假报成功） */
function writeFailToast(action: WriteAction, message: string): void {
  if ('reparent' in action && action.reparent === true) {
    showToast(`旧连线已移除，新连线未建立：${message}`, 'error')
  } else {
    showToast(message, 'error')
  }
}

export const useLineageStore = create<LineageStore>()((set, get) => {
  // 请求序号 stale-guard：新 load 取代旧 load 后，旧响应（成功/失败）丢弃
  let seq = 0

  const enqueue = (action: WriteAction): void => {
    set((s) => ({
      queue: [...s.queue.filter((x) => !sameTarget(x, action)), action],
      saveStatus: 'saving'
    }))
    void flush()
  }

  const applyAction = async (action: WriteAction): Promise<void> => {
    if (action.kind === 'upsert-node') {
      const saved = await unwrap(api.lineage.upsertNode(action.input))
      set((s) => ({
        nodes: s.nodes.some((n) => n.id === saved.id)
          ? s.nodes.map((n) => (n.id === saved.id ? saved : n))
          : [...s.nodes, saved]
      }))
      return
    }
    if (action.kind === 'remove-node') {
      await unwrap(api.lineage.removeNode({ id: action.id }))
      set((s) => ({
        nodes: s.nodes.filter((n) => n.id !== action.id),
        // 级联镜像：两端点任一为该节点的边全清（DDL CASCADE 的 store 面）
        edges: s.edges.filter((e) => e.fromNode !== action.id && e.toNode !== action.id)
      }))
      return
    }
    if (action.kind === 'upsert-edge') {
      const saved = await unwrap(
        api.lineage.upsertEdge({
          from: action.input.fromNode,
          to: action.input.toNode,
          label: action.input.label
        })
      )
      set((s) => ({
        edges: s.edges.some((e) => e.id === saved.id)
          ? s.edges.map((e) => (e.id === saved.id ? saved : e))
          : [...s.edges, saved]
      }))
      return
    }
    await unwrap(api.lineage.removeEdge({ id: action.id }))
    set((s) => ({ edges: s.edges.filter((e) => e.id !== action.id) }))
  }

  async function flush(): Promise<void> {
    if (get().flushing) return
    // error→retry 恢复路径立即翻 saving（派发可见）；enqueue 路径已是 saving，重复无害
    set({ flushing: true, saveStatus: 'saving' })
    while (get().queue.length > 0) {
      const action = get().queue[0]!
      try {
        await applyAction(action)
        // 按动作身份出队（非 slice(1)：flight 期间同实体动作可能被合并替换，
        // 盲切首位会误删未发送的后值——「最后写胜出」与出队的组合缺陷，测试拦出）
        set((s) => ({ queue: s.queue.filter((x) => x !== action) }))
      } catch (e) {
        if (e instanceof ApiClientError && e.code === 'CONFLICT') {
          // 拒绝型（service 树守卫/幽灵 paperId 中文 reason）：永不成功——丢弃
          // 继续（不卡队头不误报脏），reason 透传 toast（守卫宿主=LG-01 service）
          writeFailToast(action, e.message)
          set((s) => ({ queue: s.queue.filter((x) => x !== action) }))
          continue
        }
        // 系统型：动作保留（不丢），error 态+重试（INV-04：失败不推进保存态）
        const message = e instanceof Error ? e.message : String(e)
        set({ saveStatus: 'error', lastWriteError: message, flushing: false })
        writeFailToast(action, message)
        return
      }
    }
    set({ saveStatus: 'saved', lastWriteError: null, flushing: false })
  }

  const nodeOf = (id: string): LineageNode => {
    const n = get().nodes.find((x) => x.id === id)
    if (n === undefined) throw new Error(`节点不在图中：${id}`)
    return n
  }

  return {
    nodes: [],
    edges: [],
    status: 'loading',
    error: null,
    saveStatus: 'saved',
    lastWriteError: null,
    queue: [],
    flushing: false,

    async load() {
      const s = ++seq
      set({ status: 'loading', error: null })
      try {
        const graph = await unwrap(api.lineage.graph({}))
        // 旧响应晚到丢弃；写队列未清空同样丢弃（写回填面为准——写读互锁）。
        // 丢弃时回置 ready：写进行中说明有数据面（error 态无 Board 无写），
        // 不回置会卡 loading 至下次挂载
        if (s !== seq || get().flushing || get().queue.length > 0) {
          if (s === seq) set({ status: 'ready' })
          return
        }
        set({ nodes: graph.nodes, edges: graph.edges, status: 'ready', error: null })
      } catch (e) {
        if (s !== seq) return
        set({ status: 'error', error: e instanceof Error ? e.message : String(e) })
      }
    },

    addPaperNode(paper) {
      enqueue({
        kind: 'upsert-node',
        input: { paperId: paper.id, title: paper.title, coreIdea: '', year: paper.year, x: null, y: null }
      })
    },

    addThemeNode(title) {
      enqueue({
        kind: 'upsert-node',
        input: { paperId: null, title, coreIdea: '', year: null, x: null, y: null }
      })
    },

    moveNode(id, x, y) {
      const n = nodeOf(id)
      enqueue({
        kind: 'upsert-node',
        input: { id: n.id, paperId: n.paperId, title: n.title, coreIdea: n.coreIdea, year: n.year, x, y }
      })
    },

    editCoreIdea(id, coreIdea) {
      const n = nodeOf(id)
      enqueue({
        kind: 'upsert-node',
        input: { id: n.id, paperId: n.paperId, title: n.title, coreIdea, year: n.year, x: n.x, y: n.y }
      })
    },

    linkNodes(from, to, label = '') {
      enqueue({ kind: 'upsert-edge', input: { fromNode: from, toNode: to, label } })
    },

    reparentNode(nodeId, newParentId) {
      // N5：删旧边+加新边两调用（UI 单操作）；删成功+加失败=合法中间态+toast 指明
      const old = get().edges.find((e) => e.toNode === nodeId)
      if (old !== undefined) enqueue({ kind: 'remove-edge', id: old.id })
      enqueue({
        kind: 'upsert-edge',
        input: { fromNode: newParentId, toNode: nodeId, label: '' },
        reparent: true
      })
    },

    removeNode(id) {
      enqueue({ kind: 'remove-node', id })
    },

    removeEdge(id) {
      enqueue({ kind: 'remove-edge', id })
    },

    retrySave() {
      void flush()
    }
  }
})
