// b3: P7-H
/**
 * [F-LGRAPH-01②U1] lineage-write-queue —— 脉络编辑会话暂存机制（自
 * lineage.store 拆出；[②U1] 语义翻转：enqueue 即 flush 自动保存→编辑会话
 * 暂存+点保存批量落库——mockup §2.2/A7 仲裁）。
 *
 * ── 会话态状态机（宪法前置；测试=lineage-session-store.test/lineage-store-write/lineage-store-reorder/write-queue.test）──
 * - 态空间：saveStatus ∈ {clean, dirty, saving, error} × queue（暂存动作序列）
 *   × undoStack/redoStack（会话快照栈——每编辑单元前图态全量浅快照）。
 * - 迁移：
 *   - clean+任一编辑单元→dirty（乐观应用+入队，**不发 IPC**——A7 单一写路径）
 *   - dirty+点保存→saving（save()=flush 串行派发；lazy 载荷读最新行——A8
 *     全载荷合成含 via/dashed/color，repo ON CONFLICT 清 via 接缝随全载荷消解）
 *   - saving+全部成功且队列清空→clean（服务器行回填+**两栈清空**——Word 式
 *     基线重置：保存后不可再撤回保存前）
 *   - saving+系统型失败（非 CONFLICT）→error（**队首保留**+toast+重试——
 *     INV-04 同型：失败不推进保存态）
 *   - saving+CONFLICT 拒绝型→**丢弃动作继续队列**（toast reason 透传；丢弃
 *     后队列空→clean+**库态重拉**（乐观值不残留——服务器权威，INV-84 修订：
 *     乐观写在场的代价由 load 回填消解）
 *   - undo：dirty 态弹栈恢复快照（redo 栈入当前态）；恢复到基线快照
 *     （queue 空）→clean（§2.2「undo 回到基线」）；saving 态锁定 no-op
 *   - 新编辑单元→redo 栈清（§2.2）
 *   - discardSession（dirty 切图确认分支）：队列+两栈清+回 clean——乐观残值
 *     由随后 setFolder→load 库态覆盖（不落库=弃暂存）
 * - 编辑单元=单次拖放/加点/删点/重置走线/端点重连/画线/删线/命名提交（含
 *   线型行内改名）/线形变更——与撤销栈单元同构（一单元=一撤销步；拖放类
 *   单元由轮 2 调线/拖拽接入，store.beginUnit 为统一入口）。
 * - [T3-P8 R3] lazy 载荷：enqueue 只存 id+差异（patch=字段覆盖/override=槽位·
 *   改月语义轴），applyAction 执行时点 fullRowInput(最新行) 合成——暂存窗内
 *   先行落地的乐观变更自然并入。
 */
import { api, unwrap, ApiClientError } from '../../api/client'
import { showToast } from '../../shared/ui/toast-store'
import { LINE_TYPE_COLORS, lineageOrder } from '@shared/models/lineage'
import type { LineageEdge, LineageEdgeUpsert, LineageNode } from '@shared/models/lineage'

/**
 * [F-LGRAPH-01②U1] 保存态四态（mockup §2.2——saveStatus 枚举语义反转申报：
 * 'saved'→'clean' 概念=本地与库一致基线；'dirty'=暂存未落库（编辑会话内
 * 正常态）；'saving'=批量落库中（工具组锁定）；'error'=保存失败（行内错误
 * +重试——dirty 语义保持，error 档承载失败指示）。
 */
export type LineageSaveStatus = 'clean' | 'dirty' | 'saving' | 'error'

/** [F-ALIGN-01] patch-node 白名单载荷面（=IPC lineagePatchNodeReqSchema 去 id
 *  ——id=定位键；paperId/folderId/时间戳不可 patch；核心想法字段已随 [A3
 *  F-CONTRACTA-01 2026-10-04] 核心想法域全退役删除（全文笔记承接语义）；
 *  tags 已随 [A1b F-CONTRACTA-01] 标签域退役删除） */
export type LineageNodePatchBody = Partial<
  Pick<LineageNode, 'title' | 'year' | 'month' | 'slot' | 'x' | 'y'>
>

export interface LazyNodePatch {
  kind: 'patch-node'
  id: string
  patch: Partial<Pick<LineageNode, 'x' | 'y'>>
  /** 语义轴整替（后到胜出）：{slot}=月内序透写；{year,month}=改月（合成时
   *  slot 键缺省——服务端组变 max+1 尾部既有分支；乐观应用=组内末预估） */
  override?: { slot: number } | { year: number | null; month: number | null }
}

/** 写动作（排队单元；reparent 的加边动作带标记——N5 部分失败 toast 前缀；
 *  [回炉 R9] silentSave=画线动作面——flush 成功 toast 抑制（暂存提示已承载）。
 *  [F-ALIGN-01] 新建节点形态（input 全载荷）随旧节点写通道退役删除
 *  ——节点动作恒=既有节点 patch（INV-NEW-1：节点唯一来源=入库/移动两路） */
export type WriteAction =
  | LazyNodePatch
  | { kind: 'remove-node'; id: string }
  | { kind: 'upsert-edge'; input: LineageEdgeUpsert; reparent?: boolean; isNew?: boolean; silentSave?: boolean }
  | { kind: 'remove-edge'; id: string }
  /** [F-LGRAPH-01②U8] 图级色行名整批替换（单实体——同类合并最后写胜出） */
  | { kind: 'upsert-line-type-names'; input: string[] }

/** [F-LGRAPH-01②U1] 会话快照（每编辑单元前图态全量浅快照——undo/redo 载荷） */
export interface SessionSnapshot {
  nodes: LineageNode[]
  edges: LineageEdge[]
  lineTypeNames: string[]
  queue: WriteAction[]
}

/** 写队列宿主最小面（zustand store 结构性满足——数据态回填+队列驻留） */
export interface WriteQueueHost {
  nodes: LineageNode[]
  edges: LineageEdge[]
  lineTypeNames: string[]
  saveStatus: LineageSaveStatus
  lastWriteError: string | null
  queue: WriteAction[]
  flushing: boolean
  undoStack: SessionSnapshot[]
  redoStack: SessionSnapshot[]
  /** 库态重取（CONFLICT 丢弃后服务器权威回填——store.load 注入） */
  load(): Promise<void>
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
  /** 编辑动作入暂存（乐观应用+入队——不发 IPC；saveStatus=dirty） */
  enqueue(action: WriteAction): void
  /** 批量落库（save 钮/retry 触发——串行派发；成功=clean+栈基线重置） */
  flush(): Promise<void>
}

/** 同实体判定（排队合并=最后写胜出）：同 kind 且目标相同（[F-ALIGN-01] 节点
 *  动作恒=patch（id 型）——按 id 判等，新建不合并分支随 input 形态退役删） */
function sameTarget(a: WriteAction, b: WriteAction): boolean {
  if (a.kind !== b.kind) return false
  if (a.kind === 'patch-node' && b.kind === 'patch-node') {
    return a.id === b.id
  }
  if (a.kind === 'upsert-edge' && b.kind === 'upsert-edge') {
    return a.input.fromNode === b.input.fromNode && a.input.toNode === b.input.toNode
  }
  // [F-LGRAPH-01②U8] 色行名整批=单实体（图级配置）——同类恒合并
  if (a.kind === 'upsert-line-type-names' && b.kind === 'upsert-line-type-names') return true
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
  /** flush 派发中动作引用：enqueue 融合面排除（flight 项已发不融合） */
  let inflight: WriteAction | null = null

  /** [R3] lazy 同实体融合：patch 字段级合并（不同字段共存；同字段后值胜）；
   *  override 整替（语义轴互斥） */
  const fuseLazy = (a: LazyNodePatch, b: LazyNodePatch): LazyNodePatch => ({
    kind: 'patch-node',
    id: b.id,
    patch: { ...a.patch, ...b.patch },
    override: b.override ?? a.override
  })

  const isLazyPatch = (x: WriteAction): x is LazyNodePatch => x.kind === 'patch-node'

  /** [F-LGRAPH-01②U1] 乐观应用：编辑动作即时投影到本地数据态（A7——本地
   *  即时更新+暂存；节点变更后 lineageOrder 重排=渲染序单源沿承） */
  const applyOptimistic = (action: WriteAction): void => {
    if (action.kind === 'patch-node') {
      // lazy 更新：patch 应用+override 语义轴（改月乐观=跨组组内末预估——
      // slot null 组末渲染近似；落库归一回填真值）
      set((s) => ({
        nodes: lineageOrder(
          s.nodes.map((n): LineageNode => {
            if (n.id !== action.id) return n
            const patched: LineageNode = { ...n, ...action.patch }
            if (action.override === undefined) return { ...patched, updatedAt: new Date().toISOString() }
            if ('slot' in action.override) {
              return { ...patched, slot: action.override.slot, updatedAt: new Date().toISOString() }
            }
            // 改月乐观=组内末预估（slot null 组末渲染近似——落库归一回填真值）
            return { ...patched, ...action.override, slot: null, updatedAt: new Date().toISOString() }
          })
        )
      }))
      return
    }
    if (action.kind === 'remove-node') {
      set((s) => ({
        nodes: s.nodes.filter((n) => n.id !== action.id),
        // 级联镜像：两端点任一为该节点的边全清（DDL CASCADE 的会话面）
        edges: s.edges.filter((e) => e.fromNode !== action.id && e.toNode !== action.id)
      }))
      return
    }
    if (action.kind === 'upsert-edge') {
      const now = new Date().toISOString()
      const id = action.input.id ?? crypto.randomUUID()
      const next: LineageEdge = {
        id,
        fromNode: action.input.fromNode,
        toNode: action.input.toNode,
        label: action.input.label,
        dashed: action.input.dashed === true,
        color: action.input.color ?? LINE_TYPE_COLORS[0], // [R21] 常量单源（色板首色）
        ...(action.input.via !== undefined && action.input.via.length > 0 ? { via: action.input.via } : {}),
        createdAt: now,
        updatedAt: now
      }
      set((s) => ({
        edges: s.edges.some((e) => e.id === id)
          ? s.edges.map((e) => (e.id === id ? { ...next, createdAt: e.createdAt } : e))
          : [...s.edges, next]
      }))
      return
    }
    if (action.kind === 'remove-edge') {
      set((s) => ({ edges: s.edges.filter((e) => e.id !== action.id) }))
      return
    }
    set({ lineTypeNames: [...action.input] })
  }

  /** 新建类动作本地 uuid 回写（A7 乐观一致性）：本地乐观边 id=落库 id
   *  （repo 采纳 provided id）——无临时 id 漂移、服务器回显按同 id 覆盖；
   *  isNew 标记=新建 toast 判据（id 补齐后 undefined 判据失效）。
   *  [F-ALIGN-01] 节点新建形态随旧节点写通道退役删除——本面仅边新建 */
  const withLocalId = (a: WriteAction): WriteAction => {
    if (a.kind === 'upsert-edge' && a.input.id === undefined) {
      return { ...a, input: { ...a.input, id: crypto.randomUUID() }, isNew: true }
    }
    return a
  }

  const enqueue = (rawAction: WriteAction): void => {
    const action = withLocalId(rawAction)
    set((s) => {
      let queue: WriteAction[]
      if (isLazyPatch(action)) {
        // [R3] 融合仅限**未派发**队列项（saving 派发窗内 flight 项保留原位）
        let hit = false
        queue = s.queue.map((x) => {
          if (x === inflight || !isLazyPatch(x) || !sameTarget(x, action)) return x
          hit = true
          return fuseLazy(x, action)
        })
        if (!hit) queue = [...s.queue, action]
      } else {
        queue = [...s.queue.filter((x) => x !== inflight && !sameTarget(x, action)), action]
      }
      return { queue, saveStatus: 'dirty' }
    })
    applyOptimistic(action)
  }

  const nodeOf = (id: string): LineageNode => {
    const n = get().nodes.find((x) => x.id === id)
    if (n === undefined) throw new Error(`节点不在图中：${id}`)
    return n
  }

  /** 既有节点→patch-node 全字段载荷（白名单六字段防半更新清字段——A8 全载荷
   *  合成语义等价迁移：服务端 {...existing, ...patch} 合并，本地行全字段随发
   *  =整行面等价；身份/图归属/时间戳不在白名单——沿用库行。
   *  [A1b] tags 恒发行随标签域退役删除（原「恒发 tags:null 防清空失效」面
   *  随字段消亡——k1-W1 先例注记留档）；[A3 F-CONTRACTA-01] 核心想法恒发行
   *  随核心想法域全退役删除（同型先例） */
  const fullPatchBody = (n: LineageNode): LineageNodePatchBody => ({
    title: n.title,
    year: n.year,
    month: n.month,
    slot: n.slot,
    x: n.x,
    y: n.y
  })

  /** [R3] lazy 载荷执行时点合成：fullPatchBody 读当前 store 行+patch 覆盖
   *  +override 语义轴 */
  const lazyInput = (a: LazyNodePatch): LineageNodePatchBody => {
    const patched: LineageNodePatchBody = { ...fullPatchBody(nodeOf(a.id)), ...a.patch }
    if (a.override === undefined) return patched
    if ('slot' in a.override) return { ...patched, slot: a.override.slot }
    const { slot: _omit, ...rest } = patched // 改月=slot 键缺省（组变尾部归一）
    void _omit
    return { ...rest, ...a.override }
  }

  const applyAction = async (action: WriteAction): Promise<void> => {
    if (action.kind === 'patch-node') {
      const saved = await unwrap(api.lineage.patchNode({ id: action.id, ...lazyInput(action) }))
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
          // [F-LGRAPH-01②U8] 视觉线型内联透传（缺省键不进载荷——repo 归一）
          ...(action.input.dashed !== undefined ? { dashed: action.input.dashed } : {}),
          ...(action.input.color !== undefined ? { color: action.input.color } : {}),
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
      // 新建边成功 toast=唯一可见反馈；label 后编辑（id 显式提供）不 toast 防噪；
      // [回炉 R9] 画线动作面（silentSave）抑制——「已画线，保存后生效」暂存
      // 提示已承载，双 toast 合一
      if (action.isNew === true && action.silentSave !== true) {
        showToast('连线已保存', 'success')
      }
      return
    }
    if (action.kind === 'upsert-line-type-names') {
      // 整批替换（Res=归一后回显恰 6 行）——成功 set lineTypeNames
      const saved = await unwrap(api.lineage.upsertLineTypes(action.input))
      set({ lineTypeNames: saved })
      return
    }
    await unwrap(api.lineage.removeEdge({ id: action.id }))
    set((s) => ({ edges: s.edges.filter((e) => e.id !== action.id) }))
  }

  async function flush(): Promise<void> {
    if (get().flushing) return
    // error→retry 恢复路径立即翻 saving（派发可见）；save 钮触发同态
    set({ flushing: true, saveStatus: 'saving' })
    let conflictDropped = false
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
          conflictDropped = true
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
    // 成功收尾：clean+**两栈清空**（Word 式基线重置——保存后不可撤回保存前）
    set({ saveStatus: 'clean', lastWriteError: null, flushing: false, undoStack: [], redoStack: [] })
    // [F-LGRAPH-01②U1] CONFLICT 丢弃收尾：库态重拉（乐观残值消解——服务器
    // 权威；INV-84 修订申报：乐观写在场，被拒意图经 load 回填不在本地残留）
    if (conflictDropped) void get().load()
  }

  return { enqueue, flush }
}
