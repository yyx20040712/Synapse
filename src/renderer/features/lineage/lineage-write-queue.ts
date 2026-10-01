// b3: P7-H
/**
 * [F-LGRAPH-01①U1] lineage-write-queue —— 脉络写队列机制（自 lineage.store
 * 拆出，行为零变——写面状态机单源注释随迁；消费面=lineage.store 薄壳）。
 *
 * ── 写面状态机（LG-03，宪法前置；测试=lineage-store-write/reorder/write-queue.test）──
 * - 态空间：saveStatus ∈ {saved, saving, error} × queue（写动作序列）
 * - 迁移：saved+edit→saving（入队+flush 派发）/saving+edit→saving（同实体
 *   排队合并=**最后写胜出**）/flush 逐动作成功且队列清空→saved（数据回填）
 *   /系统型失败（非 CONFLICT）→error（**队首保留**+toast+重试——INV-04
 *   同型：失败不推进保存态）/CONFLICT 拒绝型→**丢弃动作继续队列**（树守卫
 *   reason 透传 toast——守卫宿主=LG-01 service INV-27）/error+edit→saving
 *   （自动重试）/error+retry→saving（重发保留队列）
 * - 跨格序列：连续编辑中保存失败→后续编辑不丢（队列保留+合并收尾）；改父
 *   删成功+加失败=合法中间态（森林语义）+toast 指明+重试只重发加边
 * - saved 语义（INV-84，P2-1 用户裁决）：saved=本地与服务器数据一致，非全部
 *   编辑意图已落盘——CONFLICT 丢弃后排空回 saved 属正确行为。
 * - 动作型 toast 面=flush 内 showToast（toast-store 的 .ts 可导入先例）。
 *
 * [T3-P8 R3] lazy 载荷：enqueue 只存 id+差异（patch=字段覆盖/override=槽位·
 * 改月语义轴），applyAction 执行时点 fullRowInput(最新行)合成——写窗内先行
 * 落地的变更自然并入，enqueue 时点旧快照不再静默回写。
 */
import { api, unwrap, ApiClientError } from '../../api/client'
import { showToast } from '../../shared/ui/toast-store'
import { lineageOrder } from '@shared/models/lineage'
import type { LineageEdge, LineageEdgeUpsert, LineageNode, LineageNodeUpsert, LineTypeGroup } from '@shared/models/lineage'

/** 保存态三态（ADR-0014 保存语义对齐标注/笔记——INV-04 同型不新立号） */
export type LineageSaveStatus = 'saved' | 'saving' | 'error'

export interface LazyNodeUpsert {
  kind: 'upsert-node'
  id: string
  patch: Partial<Pick<LineageNodeUpsert, 'coreIdea' | 'tags' | 'x' | 'y'>>
  /** 语义轴整替（后到胜出）：{slot}=月内序透写；{year,month}=改月（合成时
   *  slot 键缺省——服务端组变 max+1 尾部既有分支） */
  override?: { slot: number } | { year: number | null; month: number | null }
}

/** 写动作（排队单元；reparent 的加边动作带标记——N5 部分失败 toast 前缀） */
export type WriteAction =
  | { kind: 'upsert-node'; input: LineageNodeUpsert }
  | LazyNodeUpsert
  | { kind: 'remove-node'; id: string }
  | { kind: 'upsert-edge'; input: LineageEdgeUpsert; reparent?: boolean }
  | { kind: 'remove-edge'; id: string }
  /** [T3-P7B] 图级线型整批替换（单实体——同类合并最后写胜出；FIFO 保证
   *  lineTypes 先于引用其的 edge 写，引用完整性写序） */
  | { kind: 'upsert-line-types'; input: LineTypeGroup[] }

/** 写队列宿主最小面（zustand store 结构性满足——数据态回填+队列驻留） */
export interface WriteQueueHost {
  nodes: LineageNode[]
  edges: LineageEdge[]
  lineTypes: LineTypeGroup[]
  saveStatus: LineageSaveStatus
  lastWriteError: string | null
  queue: WriteAction[]
  flushing: boolean
}

export interface WriteQueueDeps {
  set(
    patch:
      | Partial<WriteQueueHost>
      | ((s: WriteQueueHost) => Partial<WriteQueueHost>)
  ): void
  get(): WriteQueueHost
}

export interface WriteQueue {
  enqueue(action: WriteAction): void
  flush(): Promise<void>
}

/** 同实体判定（排队合并=最后写胜出）：同 kind 且目标相同（新建节点无 id 不合并） */
function sameTarget(a: WriteAction, b: WriteAction): boolean {
  if (a.kind !== b.kind) return false
  if (a.kind === 'upsert-node' && b.kind === 'upsert-node') {
    // [R3] 新建（input 无 id）不合并；更新 lazy（id 型）按 id 判等
    const idA = 'input' in a ? a.input.id : a.id
    const idB = 'input' in b ? b.input.id : b.id
    return idA !== undefined && idA === idB
  }
  if (a.kind === 'upsert-edge' && b.kind === 'upsert-edge') {
    return a.input.fromNode === b.input.fromNode && a.input.toNode === b.input.toNode
  }
  // [T3-P7B] 线型整批=单实体（图级配置）——同类恒合并
  if (a.kind === 'upsert-line-types' && b.kind === 'upsert-line-types') return true
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

export function createWriteQueue(deps: WriteQueueDeps): WriteQueue {
  const { set, get } = deps
  /** [R3] flush 派发中动作引用：enqueue 融合面排除（flight 项已发不融合） */
  let inflight: WriteAction | null = null

  /** [R3] lazy 同实体融合：patch 字段级合并（不同字段共存；同字段后值胜）；
   *  override 整替（语义轴互斥）。已知边界（[T3-P8] 门二裁决部 C4 主控终裁
   *  =后到整替胜出可接受）：改月写窗内同节点再入 reorderMonthSlots→月迁移被
   *  整替丢弃——窗口=写队列排空（毫秒级）且操作序列反直觉，不强制 */
  const fuseLazy = (a: LazyNodeUpsert, b: LazyNodeUpsert): LazyNodeUpsert => ({
    kind: 'upsert-node',
    id: b.id,
    patch: { ...a.patch, ...b.patch },
    override: b.override ?? a.override
  })

  const isLazyUpsert = (x: WriteAction): x is LazyNodeUpsert =>
    x.kind === 'upsert-node' && !('input' in x)

  const enqueue = (action: WriteAction): void => {
    set((s) => {
      let queue: WriteAction[]
      if (isLazyUpsert(action)) {
        // [R3] 融合仅限**未派发**队列项：flight 中动作已带旧意图发出，融合它
        // =首发+融合重发双落；flight 项保留原位，后来者独立排队——lazy 派发
        // 时点合成读最新行，串行落地终值仍=各轴最新意图（最后写胜出按轴成立）
        let hit = false
        queue = s.queue.map((x) => {
          if (x === inflight || !isLazyUpsert(x) || !sameTarget(x, action)) return x
          hit = true
          return fuseLazy(x, action)
        })
        if (!hit) queue = [...s.queue, action]
      } else {
        queue = [...s.queue.filter((x) => x !== inflight && !sameTarget(x, action)), action]
      }
      return { queue, saveStatus: 'saving' }
    })
    void flush()
  }

  const nodeOf = (id: string): LineageNode => {
    const n = get().nodes.find((x) => x.id === id)
    if (n === undefined) throw new Error(`节点不在图中：${id}`)
    return n
  }

  /** 既有节点→整行 upsert 载荷（全字段防半更新清字段；month/slot 补全——
   *  service normalizeMonthSlot 按「month 缺省=null 全量语义」归一；tags 条件
   *  展开：null/缺省不进键） */
  const fullRowInput = (n: LineageNode): LineageNodeUpsert => ({
    id: n.id,
    paperId: n.paperId,
    title: n.title,
    coreIdea: n.coreIdea,
    year: n.year,
    month: n.month,
    slot: n.slot,
    x: n.x,
    y: n.y,
    ...(n.tags != null ? { tags: n.tags } : {})
  })

  /** [R3] lazy 载荷执行时点合成：fullRowInput 读当前 store 行+patch 覆盖
   *  +override 语义轴 */
  const lazyInput = (a: LazyNodeUpsert): LineageNodeUpsert => {
    const patched: LineageNodeUpsert = { ...fullRowInput(nodeOf(a.id)), ...a.patch }
    if (a.override === undefined) return patched
    if ('slot' in a.override) return { ...patched, slot: a.override.slot }
    const { slot: _omit, ...rest } = patched // 改月=slot 键缺省（组变尾部归一）
    return { ...rest, ...a.override }
  }

  const applyAction = async (action: WriteAction): Promise<void> => {
    if (action.kind === 'upsert-node') {
      const input = 'input' in action ? action.input : lazyInput(action)
      const saved = await unwrap(api.lineage.upsertNode(input))
      // 回填后按 lineageOrder 重排（INV-75 消费面扩——store 数组序=渲染序单源）
      set((s) => ({
        nodes: lineageOrder(
          s.nodes.some((n) => n.id === saved.id)
            ? s.nodes.map((n) => (n.id === saved.id ? saved : n))
            : [...s.nodes, saved]
        )
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
          label: action.input.label,
          kind: action.input.kind,
          // sub 透传（null=回退基础型；既有调用点缺省键不进载荷，形状逐字节保持）
          ...(action.input.sub !== undefined ? { sub: action.input.sub } : {}),
          // via 透传（手动调线编辑动作置——缺省键不进载荷）
          ...(action.input.via !== undefined ? { via: action.input.via } : {}),
          // label 后编辑：id 提供经 IPC 更新（缺省键不进载荷）
          ...(action.input.id !== undefined ? { id: action.input.id } : {})
        })
      )
      set((s) => ({
        edges: s.edges.some((e) => e.id === saved.id)
          ? s.edges.map((e) => (e.id === saved.id ? saved : e))
          : [...s.edges, saved]
      }))
      // 新建边成功 toast=唯一可见反馈；label 后编辑（id 在场）不 toast 防噪
      if (action.input.id === undefined) {
        showToast(
          action.input.kind === 'ref'
            ? '综述关联已保存'
            : action.input.kind === 'manual'
              ? '人工父线已保存'
              : action.input.kind === 'inferred'
                ? '推断连线已保存'
                : '父子连线已保存',
          'success'
        )
      }
      return
    }
    if (action.kind === 'upsert-line-types') {
      // 整批替换（Res=校验后回显恒四组）——成功 set lineTypes
      const saved = await unwrap(api.lineage.upsertLineTypes(action.input))
      set({ lineTypes: saved })
      return
    }
    await unwrap(api.lineage.removeEdge({ id: action.id }))
    set((s) => ({ edges: s.edges.filter((e) => e.id !== action.id) }))
  }

  async function flush(): Promise<void> {
    if (get().flushing) return
    // error→retry 恢复路径立即翻 saving（派发可见）；enqueue 路径已是 saving
    set({ flushing: true, saveStatus: 'saving' })
    while (get().queue.length > 0) {
      const action = get().queue[0]!
      inflight = action // [R3] 派发中标记：enqueue 融合面排除
      try {
        await applyAction(action)
        // 按动作身份出队（非 slice(1)：flight 期间同实体动作可能被合并替换，
        // 盲切首位会误删未发送的后值——「最后写胜出」与出队的组合缺陷，测试拦出）
        set((s) => ({ queue: s.queue.filter((x) => x !== action) }))
      } catch (e) {
        if (e instanceof ApiClientError && e.code === 'CONFLICT') {
          // 拒绝型：永不成功——丢弃继续（不卡队头不误报脏），reason 透传 toast
          writeFailToast(action, e.message)
          set((s) => ({ queue: s.queue.filter((x) => x !== action) }))
          continue
        }
        // 系统型：动作保留（不丢），error 态+重试（INV-04：失败不推进保存态）
        const message = e instanceof Error ? e.message : String(e)
        inflight = null
        set({ saveStatus: 'error', lastWriteError: message, flushing: false })
        writeFailToast(action, message)
        return
      }
      inflight = null
    }
    set({ saveStatus: 'saved', lastWriteError: null, flushing: false })
  }

  return { enqueue, flush }
}
