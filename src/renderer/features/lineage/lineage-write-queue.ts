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
 *   [F-VISFB-61] 悬浮笔记三操作（创建/编辑/删除）入编辑单元族——快照/
 *   队列/乐观应用/undo 栈全链同构（快照含 floatingNotes）。
 * - [T3-P8 R3] lazy 载荷：enqueue 只存 id+差异（patch=字段覆盖/override=槽位
 *   语义轴），applyAction 执行时点 fullRowInput(最新行) 合成——暂存窗内
 *   先行落地的乐观变更自然并入。[F-UIRES-03 C3] 改月语义轴（override
 *   year/month 形）随改月动作退役删除（INV-107——override 生产者收窄=slot 透写）。
 */
import { api, unwrap, ApiClientError } from '../../api/client'
import { showToast } from '../../shared/ui/toast-store'
import { LINE_TYPE_COLORS, lineageOrder } from '@shared/models/lineage'
import type {
  FloatingNote,
  FloatingNoteUpsert,
  LineageEdge,
  LineageEdgeUpsert,
  LineageNode
} from '@shared/models/lineage'

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
  /** 语义轴整替（后到胜出）：{slot}=月内序透写。[F-UIRES-03 C3] year/month
   *  改月形随改月动作退役删除（INV-107） */
  override?: { slot: number }
}

/** 写动作（排队单元；[F-VISFB-66 裁定 3] 旧换父标记随三入口退役删除
 *  ——N5 部分失败 toast 前缀面随之消亡；[回炉 R9] silentSave=画线动作面——
 *  flush 成功 toast 抑制（暂存提示已承载）。
 *  [F-ALIGN-01] 新建节点形态（input 全载荷）随旧节点写通道退役删除
 *  ——节点动作恒=既有节点 patch（INV-NEW-1：节点唯一来源=入库/移动两路） */
export type WriteAction =
  | LazyNodePatch
  | { kind: 'remove-node'; id: string }
  | { kind: 'upsert-edge'; input: LineageEdgeUpsert; isNew?: boolean; silentSave?: boolean }
  | { kind: 'remove-edge'; id: string }
  /** [F-LGRAPH-01②U8] 图级色行名整批替换（单实体——同类合并最后写胜出） */
  | { kind: 'upsert-line-type-names'; input: string[] }
  /** [F-VISFB-61] 悬浮笔记三操作（创建/编辑=upsert 同通道全载荷；删除）——
   *  id 型动作（同 id upsert 合并最后写胜出；remove 异 kind 不合并——
   *  remove-edge 同族）；isNew=本地 uuid 回写标记（无 toast 面——62 号 UI
   *  承载反馈） */
  | { kind: 'upsert-floating-note'; input: FloatingNoteUpsert; isNew?: boolean }
  | { kind: 'remove-floating-note'; id: string }

/** [F-LGRAPH-01②U1] 会话快照（每编辑单元前图态全量浅快照——undo/redo 载荷；
 *  [F-VISFB-61] +floatingNotes——笔记三操作入撤销维度） */
export interface SessionSnapshot {
  nodes: LineageNode[]
  edges: LineageEdge[]
  lineTypeNames: string[]
  queue: WriteAction[]
  floatingNotes: FloatingNote[]
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
  /** [F-VISFB-61] 悬浮笔记数据态（乐观应用/快照轴共享面） */
  floatingNotes: FloatingNote[]
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
 *  动作恒=patch（id 型）——按 id 判等，新建不合并分支随 input 形态退役删）。
 *  [F-VISFB-66] upsert-edge 合并键 id 化（设计书 §D.4——B-02 终裁）：由
 *  from/to 对判等改 id 判等（与 remove-edge id 兜底、节点 patch id 判等族内
 *  一致）；同 id 合并=后动作整替（元数据 silentSave/isNew 后值胜——与旧同
 *  pair 合并 filter+append 同构，仅判等面收窄）。行为 diff 三格：同 id 同
 *  pair=合并（终态同旧）；同 id 异 pair（换端序列）=旧不合并顺序应用/新合并
 *  整替——终态一致（物化全载荷下两形态同落后值）；异 id=不合并（两态同） */
function sameTarget(a: WriteAction, b: WriteAction): boolean {
  if (a.kind !== b.kind) return false
  if (a.kind === 'patch-node' && b.kind === 'patch-node') {
    return a.id === b.id
  }
  if (a.kind === 'upsert-edge' && b.kind === 'upsert-edge') {
    return a.input.id === b.input.id
  }
  // [F-LGRAPH-01②U8] 色行名整批=单实体（图级配置）——同类恒合并
  if (a.kind === 'upsert-line-type-names' && b.kind === 'upsert-line-type-names') return true
  // [F-VISFB-61] 悬浮笔记 upsert=id 型判等（remove 走下方 id 兜底分支；
  // upsert×remove 异 kind 不合并——remove-edge 同族）
  if (a.kind === 'upsert-floating-note' && b.kind === 'upsert-floating-note') {
    return a.input.id === b.input.id
  }
  return (a as { id: string }).id === (b as { id: string }).id
}

/** 写失败 toast（[F-VISFB-66] 旧换父前缀面随业务退役删除——统一 reason 透传） */
function writeFailToast(message: string): void {
  showToast(message, 'error')
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
      // lazy 更新：patch 应用+override 语义轴（slot 透写）
      set((s) => ({
        nodes: lineageOrder(
          s.nodes.map((n): LineageNode => {
            if (n.id !== action.id) return n
            const patched: LineageNode = { ...n, ...action.patch }
            if (action.override === undefined) return { ...patched, updatedAt: new Date().toISOString() }
            return { ...patched, slot: action.override.slot, updatedAt: new Date().toISOString() }
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
        // [F-VISFB-66] via 三态：值=入乐观行；null/缺席=未携（自动路由——读
        // 模型 undefined 语义，与 repo NULL 归一同终态）
        ...(action.input.via != null && action.input.via.length > 0 ? { via: action.input.via } : {}),
        // [F-VISFB-66] 锚乐观面：值=钉定入乐观行；null/缺席=未钉定（读模型
        // undefined 语义——repo 全行替换下 null 落 NULL 幂等）
        ...(action.input.fromAnchor != null ? { fromAnchor: action.input.fromAnchor } : {}),
        ...(action.input.toAnchor != null ? { toAnchor: action.input.toAnchor } : {}),
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
    if (action.kind === 'upsert-floating-note') {
      const now = new Date().toISOString()
      const id = action.input.id ?? crypto.randomUUID()
      const next: FloatingNote = {
        id,
        folderId: action.input.folderId,
        x: action.input.x,
        y: action.input.y,
        content: action.input.content,
        createdAt: now,
        updatedAt: now
      }
      set((s) => ({
        floatingNotes: s.floatingNotes.some((n) => n.id === id)
          ? s.floatingNotes.map((n) => (n.id === id ? { ...next, createdAt: n.createdAt } : n))
          : [...s.floatingNotes, next]
      }))
      return
    }
    if (action.kind === 'remove-floating-note') {
      set((s) => ({ floatingNotes: s.floatingNotes.filter((n) => n.id !== action.id) }))
      return
    }
    set({ lineTypeNames: [...action.input] })
  }

  /** 新建类动作本地 uuid 回写（A7 乐观一致性）：本地乐观边 id=落库 id
   *  （repo 采纳 provided id）——无临时 id 漂移、服务器回显按同 id 覆盖；
   *  isNew 标记=新建 toast 判据（id 补齐后 undefined 判据失效）。
   *  [F-ALIGN-01] 节点新建形态随旧节点写通道退役删除——本面仅边新建 */
  const withLocalId = (a: WriteAction): WriteAction => {
    // [回炉 R20] upsert-edge 补 id 分支已不可达删除（enqueue id 必填 throw
    // 前置——store 边动作构造层恒携本地 uuid；防御纵深二道位消失，throw=唯一闸）
    // [F-VISFB-61] 笔记新建：本地乐观 id=落库 id（无临时 id 漂移）；isNew 仅
    // 标记（无 toast 面——62 号 UI 承载反馈）
    if (a.kind === 'upsert-floating-note' && a.input.id === undefined) {
      return { ...a, input: { ...a.input, id: crypto.randomUUID() }, isNew: true }
    }
    return a
  }

  /** [F-VISFB-66] upsert-edge 载荷归一化（undefined≡缺席——设计书 §D.4-3）：
   *  via/fromAnchor/toAnchor/dashed/color 的 undefined 键一律剥除（缺省与
   *  undefined 在队列载荷内等价——合并整替与 flush 载荷拼装面零 undefined
   *  残留；null=显式清除意图保留透传） */
  const normalizeEdgeInput = (input: LineageEdgeUpsert): LineageEdgeUpsert => ({
    id: input.id,
    fromNode: input.fromNode,
    toNode: input.toNode,
    label: input.label,
    ...(input.dashed !== undefined ? { dashed: input.dashed } : {}),
    ...(input.color !== undefined ? { color: input.color } : {}),
    ...(input.via !== undefined ? { via: input.via } : {}),
    ...(input.fromAnchor !== undefined ? { fromAnchor: input.fromAnchor } : {}),
    ...(input.toAnchor !== undefined ? { toAnchor: input.toAnchor } : {})
  })

  const enqueue = (rawAction: WriteAction): void => {
    // [F-VISFB-66] id 必填防御（§D.4-1）：upsert-edge 缺 id=throw。不可达
    // 推演：store 边动作构造层恒全载荷物化（一切边动作构造即携本地 uuid）
    // +withLocalId 兜底补 id——
    // enqueue 正常路径恒有 id；本格仅拦管线外合成动作（防御纵深）
    if (rawAction.kind === 'upsert-edge' && rawAction.input.id === undefined) {
      throw new Error('upsert-edge 动作缺 id（enqueue 契约：边动作构造层须物化本地 uuid）')
    }
    const action =
      rawAction.kind === 'upsert-edge'
        ? { ...rawAction, input: normalizeEdgeInput(rawAction.input) }
        : rawAction
    const withId = withLocalId(action)
    set((s) => {
      let queue: WriteAction[]
      if (isLazyPatch(withId)) {
        // [R3] 融合仅限**未派发**队列项（saving 派发窗内 flight 项保留原位）
        let hit = false
        queue = s.queue.map((x) => {
          if (x === inflight || !isLazyPatch(x) || !sameTarget(x, withId)) return x
          hit = true
          return fuseLazy(x, withId)
        })
        if (!hit) queue = [...s.queue, withId]
      } else {
        queue = [...s.queue.filter((x) => x !== inflight && !sameTarget(x, withId)), withId]
      }
      return { queue, saveStatus: 'dirty' }
    })
    applyOptimistic(withId)
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
   *  +override 语义轴（slot 透写） */
  const lazyInput = (a: LazyNodePatch): LineageNodePatchBody => {
    const patched: LineageNodePatchBody = { ...fullPatchBody(nodeOf(a.id)), ...a.patch }
    if (a.override === undefined) return patched
    return { ...patched, slot: a.override.slot }
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
          // via 透传（手动调线编辑动作置——缺省键不进载荷；[F-VISFB-66] null=
          // 显式清除透传〔setEdgeVia 约定迁移〕）
          ...(action.input.via !== undefined ? { via: action.input.via } : {}),
          // [F-VISFB-66] 端点锚透传（值=钉定/null=清除——A8 物化恒显式）
          ...(action.input.fromAnchor !== undefined ? { fromAnchor: action.input.fromAnchor } : {}),
          ...(action.input.toAnchor !== undefined ? { toAnchor: action.input.toAnchor } : {}),
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
    if (action.kind === 'upsert-floating-note') {
      const saved = await unwrap(api.lineage.upsertFloatingNote(action.input))
      set((s) => ({
        floatingNotes: s.floatingNotes.some((n) => n.id === saved.id)
          ? s.floatingNotes.map((n) => (n.id === saved.id ? saved : n))
          : [...s.floatingNotes, saved]
      }))
      return
    }
    if (action.kind === 'remove-floating-note') {
      await unwrap(api.lineage.removeFloatingNote({ id: action.id }))
      set((s) => ({ floatingNotes: s.floatingNotes.filter((n) => n.id !== action.id) }))
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
          writeFailToast(e.message)
          set((s) => ({ queue: s.queue.filter((x) => x !== action) }))
          continue
        }
        // 系统型：动作保留（不丢），error 态+重试（INV-04：失败不推进保存态）
        const message = e instanceof Error ? e.message : String(e)
        inflight = null
        set({ saveStatus: 'error', lastWriteError: message, flushing: false })
        writeFailToast(message)
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
