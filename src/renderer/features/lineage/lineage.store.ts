// b3: P7-H
/**
 * lineage.store —— 脉络图数据+读面/写面状态单源（store）。
 *
 * ── 数据单源接缝声明（双向锚定：本行+LineagePage 头注）──
 * lineage/graph 取数=本 store 单点；LineagePage/LineageTimeline/03 编辑层
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
 * - saved 语义（INV-84，P2-1 用户裁决 2026-09-29 选 a）：saved=本地与服务器
 *   数据一致，非全部编辑意图已落盘——CONFLICT 丢弃后排空回 saved 属正确
 *   行为（排空≠意图保全，被拒意图仅 toast 瞬时提示）。按裁决原话口径：对
 *   100~300 篇文献网络，研究者发现新建线未出现相当自然，无需额外说明面
 *
 * 错误契约：load 失败不上抛——失败态驻 store.error（列表型瞬态，消费方
 * 呈现+重试，INV-02 两型分清；动作型 toast 面=本 store 写路径 flush 内
 * showToast——toast-store 的 .ts 可导入先例 reader.store 同型）。
 */
import { create } from 'zustand'
import { api, unwrap, ApiClientError } from '../../api/client'
import { showToast } from '../../shared/ui/toast-store'
import type { LineagePaperMetrics } from '@shared/ipc/schemas'
import { lineageOrder } from '@shared/models/lineage'
import type { LineageEdge, LineageEdgeUpsert, LineageNode, LineageNodeUpsert, LineTypeGroup } from '@shared/models/lineage'

export type LineageStatus = 'loading' | 'ready' | 'error'

/** 保存态三态（ADR-0014 保存语义对齐标注/笔记——INV-04 同型不新立号） */
export type LineageSaveStatus = 'saved' | 'saving' | 'error'

/**
 * [T3-P8 R3] 既有节点更新=lazy 载荷：enqueue 只存 id+差异（patch=字段覆盖/
 * override=槽位·改月语义轴），applyAction 执行时点 fullRowInput(最新行)合成
 * ——写窗内先行落地的变更自然并入，enqueue 时点旧快照不再静默回写
 * （跨格：改月排队↔同节点字段写/槽位写互吞或互回旧值）。
 */
export interface LazyNodeUpsert {
  kind: 'upsert-node'
  id: string
  patch: Partial<Pick<LineageNodeUpsert, 'coreIdea' | 'tags' | 'x' | 'y'>>
  /** 语义轴整替（后到胜出）：{slot}=月内序透写；{year,month}=改月（合成时
   *  slot 键缺省——服务端组变 max+1 尾部既有分支） */
  override?: { slot: number } | { year: number | null; month: number | null }
}

/** 写动作（排队单元；reparent 的加边动作带标记——N5 部分失败 toast 前缀） */
type WriteAction =
  | { kind: 'upsert-node'; input: LineageNodeUpsert }
  | LazyNodeUpsert
  | { kind: 'remove-node'; id: string }
  | { kind: 'upsert-edge'; input: LineageEdgeUpsert; reparent?: boolean }
  | { kind: 'remove-edge'; id: string }
  /** [T3-P7B] 图级线型整批替换（单实体——同类合并最后写胜出；FIFO 保证
   *  lineTypes 先于引用其的 edge 写，引用完整性写序） */
  | { kind: 'upsert-line-types'; input: LineTypeGroup[] }

export interface LineageStore {
  nodes: LineageNode[]
  edges: LineageEdge[]
  /** F-LG14 含金量摘要（键=paperId，graph 单读随行；主题节点无键） */
  paperMetrics: Record<string, LineagePaperMetrics>
  /** [F-FOLDER-01] pubNo 表（键=paperId——INV-92 库级派生编号，graph 单读随行；
   *  图内节点号与库号同源单一真相源（catalogNo 退役接替）；主题节点无键） */
  pubNos: Record<string, number>
  /** [T3-P7A] 线型组（graph 单读随行——恒四组；EdgeOverlay sub 覆盖渲染消费） */
  lineTypes: LineTypeGroup[]
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
  /** 拖拽落点→x/y 覆盖（JSON Canvas 模式；全字段载荷收口在此防半更新清字段）。
   *  [T3-P6] moveNode UI 消费随 T3-P6 退役（P8 槽位重排重接或届时裁删——
   *  主控裁决 e：x/y 数据面[DB 列/draft schema]未退役+store-write.test 直测
   *  =非孤儿，保留） */
  moveNode(id: string, x: number, y: number): void
  /** [T3-P8] 月组槽位全序重排：按传入序 slot=0..n-1 逐节点透写排队
   *  （normalizeMonthSlot slot 透写分支既有——零 service 改）；settle 落定后
   *  调用（无乐观写——P7B R5 同族：飞行窗禁写，失败=error+toast+重试） */
  reorderMonthSlots(nodeIds: string[]): void
  /** [T3-P8] 改月：month+year 全字段载荷、slot 键缺省——服务端组变分支
   *  （新组 max+1 落尾部）归一，月组内槽位不在此写 */
  moveNodeMonth(id: string, year: number | null, month: number | null): void
  editCoreIdea(id: string, coreIdea: string): void
  /** F-LG14 标签整组写入（增删 UI 语义化收口——全字段载荷含 tags，经既有
   *  upsert 通道即时持久化；去重单源在 main repo 写边界） */
  setNodeTags(id: string, tags: string[]): void
  linkNodes(from: string, to: string, label?: string): void
  /** 参考边（R2-LG12 用户裁决 A）：综述→文献 kind='ref'——service 双守
   *  （from 综述限定/拒环/同端点对互斥），CONFLICT 拒绝型丢弃不卡队列 */
  linkRefNodes(from: string, to: string): void
  /** 人工补父边（F-LG15 用户裁决**不限条数**）：父→子 kind='manual'——
   *  service 豁免单父/拒环（全边可达图）/同端点对与 tree·ref 互斥 */
  linkManualParent(childId: string, parentId: string, label?: string): void
  /** manual 边 label 后编辑（更新语义：id+端点+kind 保持——F-LG15） */
  editManualEdgeLabel(edgeId: string, label: string): void
  /** [T3-P7B] 线型选择器应用：id 全载荷 upsert（from/to/label 读现值——
   *  防半更新清字段；kind+sub 成对置，sub null=回退基础型） */
  applyEdgeLine(edgeId: string, kind: LineageEdge['kind'], sub: string | null): void
  /** [T3-P7B] 新建连线（四 kind 含 inferred——P5 备案 inferred 产生入口落位；
   *  CONFLICT 拒绝型丢弃不卡队列+toast reason 沿 linkRefNodes 先例） */
  linkWithLine(from: string, to: string, kind: LineageEdge['kind'], sub: string | null): void
  /** [T3-P7B] 线型组整批写（恒四组强校验在 schema/service；成功 set lineTypes） */
  saveLineTypes(groups: LineTypeGroup[]): void
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

export const useLineageStore = create<LineageStore>()((set, get) => {
  // 请求序号 stale-guard：新 load 取代旧 load 后，旧响应（成功/失败）丢弃
  let seq = 0
  /** [R3] flush 派发中动作引用：enqueue 融合面排除（flight 项已发不融合） */
  let inflight: WriteAction | null = null

  /** [R3] lazy 同实体融合：patch 字段级合并（不同字段共存——全字段语义在
   *  lazy 世界的正确翻译；同字段后值胜）；override 整替（语义轴互斥：改月时
   *  slot 必缺省，与槽位透写融合会钉旧组位）。已知边界（[T3-P8] 门二裁决部
   *  C4 主控终裁=后到整替胜出可接受）：改月（override={year,month}）写窗内
   *  同节点再入 reorderMonthSlots（override={slot}）→月迁移被整替丢弃、月回
   *  旧值——窗口=写队列排空（毫秒级）且操作序列反直觉（弹层刚关即拖同组卡）
   *  非正常路径；toast 已发与回跳的可见矛盾=B5 候选优化面（预演驻留同构
   *  movePreview），不强制 */
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
        // [R3] 融合仅限**未派发**队列项：flight 中动作（inflight）已带旧意图
        // 发出，融合它=首发+融合重发双落（跨格实测 calls 翻倍）；flight 项
        // 保留原位，后来者独立排队——lazy 派发时点合成读最新行，串行落地
        // 终值仍=各轴最新意图（最后写胜出按轴成立）
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

  /** [R3] lazy 载荷执行时点合成：fullRowInput 读当前 store 行（写窗内先行
   *  落地的字段/月/槽自然并入）+patch 覆盖+override 语义轴 */
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
      // [T3-P8] 回填后按 lineageOrder 重排（INV-75 消费面扩——store 数组序=
      // 渲染序单源：slot/月写落定后 Timeline 组内序随新全序，消费方零重排）
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
          // [T3-P7B] sub 透传（applyEdgeLine/linkWithLine 显式置——null=回退
          // 基础型；既有调用点缺省键不进载荷，形状逐字节保持）
          ...(action.input.sub !== undefined ? { sub: action.input.sub } : {}),
          // F-LG15 label 后编辑：id 提供经 IPC 更新（缺省键不进载荷——既有
          // 新建断言载荷形状逐字节保持）
          ...(action.input.id !== undefined ? { id: action.input.id } : {})
        })
      )
      set((s) => ({
        edges: s.edges.some((e) => e.id === saved.id)
          ? s.edges.map((e) => (e.id === saved.id ? saved : e))
          : [...s.edges, saved]
      }))
      // T3-P6 回炉（d1-W5）：P6 连线视觉退役至 P7 期间，新建边成功 toast=
      // 唯一可见反馈（防「点了没反应」误读为失败；P7 连线恢复后留作成功
      // 确认）；label 后编辑（id 在场）不 toast 防噪
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
      // [T3-P7B] 整批替换（Res=校验后回显恒四组）——成功 set lineTypes
      const saved = await unwrap(api.lineage.upsertLineTypes(action.input))
      set({ lineTypes: saved })
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
      inflight = action // [R3] 派发中标记：enqueue 融合面排除（见 enqueue 注）
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
        inflight = null
        set({ saveStatus: 'error', lastWriteError: message, flushing: false })
        writeFailToast(action, message)
        return
      }
      inflight = null
    }
    set({ saveStatus: 'saved', lastWriteError: null, flushing: false })
  }

  const nodeOf = (id: string): LineageNode => {
    const n = get().nodes.find((x) => x.id === id)
    if (n === undefined) throw new Error(`节点不在图中：${id}`)
    return n
  }

  /** 既有节点→整行 upsert 载荷（全字段防半更新清字段；[T3-P8] month/slot
   *  补全——service normalizeMonthSlot 按「month 缺省=null 全量语义」归一，
   *  缺月即清月（P8 改月面激活的潜伏缺陷：改月后编辑想法/标签会清月跳组）；
   *  F-LG14 tags 条件展开：null/缺省不进键——tags 在场才随行） */
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

  return {
    nodes: [],
    edges: [],
    paperMetrics: {},
    pubNos: {},
    lineTypes: [],
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
        set({
          nodes: graph.nodes,
          edges: graph.edges,
          paperMetrics: graph.paperMetrics ?? {},
          pubNos: graph.pubNos ?? {},
          lineTypes: graph.lineTypes,
          status: 'ready',
          error: null
        })
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
      nodeOf(id)
      enqueue({ kind: 'upsert-node', id, patch: { x, y } })
    },

    reorderMonthSlots(nodeIds) {
      // 月组全序重写：传入序即槽位序（0..n-1 透写）；同实体 lazy 融合
      nodeIds.forEach((id, slot) => {
        nodeOf(id)
        enqueue({ kind: 'upsert-node', id, patch: {}, override: { slot } })
      })
    },

    moveNodeMonth(id, year, month) {
      nodeOf(id)
      // override={year,month}：合成时 slot 键缺省（服务端组变 max+1——D-I-1）
      enqueue({ kind: 'upsert-node', id, patch: {}, override: { year, month } })
    },

    editCoreIdea(id, coreIdea) {
      nodeOf(id)
      enqueue({ kind: 'upsert-node', id, patch: { coreIdea } })
    },

    setNodeTags(id, tags) {
      nodeOf(id)
      // 空组=patch 无 tags 键（合成缺省→null 语义，「清空标签」一致）
      enqueue({ kind: 'upsert-node', id, patch: tags.length > 0 ? { tags } : {} })
    },

    linkNodes(from, to, label = '') {
      enqueue({ kind: 'upsert-edge', input: { fromNode: from, toNode: to, label } })
    },

    linkRefNodes(from, to) {
      enqueue({ kind: 'upsert-edge', input: { fromNode: from, toNode: to, label: '', kind: 'ref' } })
    },

    linkManualParent(childId, parentId, label = '') {
      enqueue({
        kind: 'upsert-edge',
        input: { fromNode: parentId, toNode: childId, label, kind: 'manual' }
      })
    },

    editManualEdgeLabel(edgeId, label) {
      const e = get().edges.find((x) => x.id === edgeId)
      if (e === undefined) throw new Error(`边不在图中：${edgeId}`)
      // 更新语义：id 提供端点保持（label 后编辑不换父——F-LG15）
      enqueue({
        kind: 'upsert-edge',
        input: { id: e.id, fromNode: e.fromNode, toNode: e.toNode, label, kind: e.kind }
      })
    },

    applyEdgeLine(edgeId, kind, sub) {
      const e = get().edges.find((x) => x.id === edgeId)
      if (e === undefined) throw new Error(`边不在图中：${edgeId}`)
      // id 全载荷：from/to/label 读现值（防半更新清字段）；kind+sub 成对置
      enqueue({
        kind: 'upsert-edge',
        input: { id: e.id, fromNode: e.fromNode, toNode: e.toNode, label: e.label, kind, sub }
      })
    },

    linkWithLine(from, to, kind, sub) {
      enqueue({ kind: 'upsert-edge', input: { fromNode: from, toNode: to, label: '', kind, sub } })
    },

    saveLineTypes(groups) {
      enqueue({ kind: 'upsert-line-types', input: groups })
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
