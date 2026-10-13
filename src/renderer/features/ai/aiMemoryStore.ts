/**
 * [F-DBCAMP-01 DB-2 UI U5] aiMemoryStore —— 管理面板记忆 Tab 数据面
 * （设计 §1.4/§4.2：scope 级列表+CRUD+搜索；组件禁直连 api）。
 *
 * ── 态空间表（状态机前置纪律——先于实现定型；回炉轮 1 R1/R2/R4/R5/R12 修订）──
 * 面一 列表条目 panels[s]（s∈{paper,lineage,global}）：
 *   态 = absent（面板未挂/已切走）| loading | ready(items) | error
 *   迁移：
 *     absent --load（首载/重挂）--> loading --回包--> ready | error
 *     loading --unload/切走--> absent（per-scope 序号自增，晚到回包失格）
 *     ready|error --过滤签名变化（setCategory/setPinnedOnly/setQuery）--> loading
 *     ready|error --CRUD 成功或 NOT_FOUND 刷新--> loading --回包--> ready|error
 * 面二 过滤组 filters（单一活动组——UI 单源）：
 *   { scope, category(''=全部分类), pinnedOnly, query }
 *   迁移：setScope（category 重置 ''——类目值域随档）/setCategory/
 *   setPinnedOnly/setQuery → 更新+触发面一迁移（签名变化即重派）。
 *   不变量：query.trim() 非空 ⇔ 检索模式（Req={scope,query}，topK=8 服务层
 *   自决）；否则列表模式 Req={scope, category?/非空, pinnedOnly?/true}——
 *   两模式互斥由本路由保证（zod refine 拒共发——UI 侧保证互不共发）。
 *   [R5] unload 清 query（检索过滤态复位 ''——searchDraft 为组件局部态随
 *   卸载消亡，store 侧同步复位防「重挂呈检索模式而搜索框空」脱节）；
 *   draft/category/pinnedOnly/scope 保留（防丢稿沿承+过滤面有可见控件单源）。
 *   [r1-D3] 检索模式（query 在席）下分类/置顶下拉不置灰：req 层互斥已保证
 *   （buildReq 检索模式丢弃 category/pinnedOnly——zod refine 同拒共发），
 *   UI 呈现取舍=保留控件可调态、提交检索即生效于检索面，清空检索回落列表
 *   模式时过滤值原样复效。
 * 面三 表单态：draft（新建）{category,title,content}；editing（编辑）
 *   {id,category,title,content}|null；formError: string|null（新建面行内）；
 *   rowErrors: Record<id,string>（行内错误——置顶/删除/编辑失败）；
 *   creating/updating: boolean（在途防重——R2：在途时再派发即 no-op）。
 *   迁移：create 成功→draft 复位+刷新；失败（INVALID_REQUEST/网络）→
 *   formError 通用错误+draft 保留。update 成功→editing=null+刷新；
 *   失败→rowErrors[id]+editing 保留。remove 成功→行本地移除（零重派——
 *   删除即终态）；NOT_FOUND（任一 CRUD）→行消失+刷新（设计 §1.4）；
 *   无 CONFLICT 分支（服务层无抛出路径）。[R4] startEdit 清 formError
 *   （新建面错误不残留到编辑面）。
 * 面四 竞态收尾解耦（回炉 R1——d1-W1+k3-W3）：
 *   - CRUD 成功收尾（draft 复位/editing 清/在途标志复位）**无条件执行**
 *     ——成功事实与链路存活无关；仅列表 refresh 面受 per-scope seq 守卫
 *     （晚到 refresh 不改写新链：过滤变更/切档/卸载后零追加刷新，列表可旧）。
 *   - 失败收尾（formError/rowErrors 落定+NOT_FOUND 行移除）仅当该 scope
 *     条目**在场**（panels[s] 存在——未卸载/未切走）时落定；卸载/切档后
 *     晚到失败**丢弃**（自裁：面板已无呈现面，落定即下次挂载的残留错误）。
 *   - remove 成功的行移除=列表面变更，恒受 seq 守卫（过滤重派后旧删除回包
 *     不落新链——W1c 沿承）。
 *   - [R12-N3] editing 悬孤（所指行已不在 items——NOT_FOUND 移除/新链回包
 *     不含该行）为合法暂态：编辑表单随行消亡不渲染，startEdit/cancelEdit/
 *     unload 自愈，无孤儿交互面。
 *   - [R12-N6] 编辑分类 select 值域=当前档冻结类目：历史异常值（行 category
 *     不在当前档值域——理论不可达，DDL 条件 CHECK 拦截）受控 select 显空
 *     option 不崩，防御面维持。
 *   - [r1-D1] 已闭窗（epoch 机制，U6 前置首项）：切档/重挂后再 startEdit /
 *     再填草稿 × 晚到成功回包交错——成功内容收尾（draft 复位/editing 清）
 *     仅在 epoch 未变时无条件执行；epoch 已变时走**身份校验析取**（收尾
 *     处方=gate1-r1-verdict W-r1-1）：当前草稿/编辑态仍逐字段等于提交时
 *     值→仍复位（R1 防同稿重提语义保持）；已被替换（新稿/startEdit(B)）→
 *     保留（不以旧回包吞新输入）。
 *   - [r1-D2] 已闭窗（epoch 机制）：失败收尾（formError/rowErrors/NOT_FOUND
 *     行移除）加 epoch 守卫（epoch!==ep→丢弃）；unload→重挂后存活探针
 *     （panels[s] 在场）保留为防御带，epoch 守卫为主。
 * 面五 会话 epoch（W-r1-1/N-r1-1 闭窗单源——store 闭包计数）：
 *   epoch 0 起；unload() 与 setScope()（切档自增——同档 no-op 不增）各自
 *   +1；create/update/setPinned/remove 派发时捕获当值 ep。收尾分层：在途
 *   标志（creating/updating）复位**恒执行**（传输态非会话内容态——防 epoch
 *   变更后标志悬挂卡死防重）；内容收尾仅 epoch===ep 或身份校验通过（面四
 *   r1-D1 析取）；失败收尾仅 epoch===ep（面四 r1-D2）。列表 refresh 面不
 *   需 epoch（unload/setScope 必伴随对应 seqs 自增——既有守卫已覆盖）。
 * 幂等护栏：load() 时条目 status∈{loading,ready} 且载入签名==当前签名→
 *   不派发；error 或签名不符→派发（沿 aiTasksStore 范式）。
 * 竞态丢弃：per-scope 请求序号 stale-guard（load/setScope/unload 自增使
 *   晚到的列表回包失格——卸载/切档后不得复活条目；CRUD 回包按面四解耦）。
 *
 * ── 接口层 ──
 * - export const useAiMemoryStore（actions 见 AiMemoryStore）
 *
 * ── 架构层 ──
 * - 只 import api/client 与 shared 模型；数据面只经 ai_memory 五通道
 *   （renderer 分层单向——window.api 唯一出口；新建仅 global 档=新呈裁-1）。
 *
 * ── 文化层 ──
 * - 测试：tests/unit/renderer/ai-memory-store.test.ts（受锁——态机/双语义
 *   路由/幂等/竞态/CRUD 错误映射/回炉 R1-R5 轴）；e2e E7=ai-manage-tabs.spec.ts。
 */
import { create } from 'zustand'
import { api, unwrap, ApiClientError } from '../../api/client'
import { GENERIC_ERROR } from './ui-texts'
import type { AiMemoryListItem, AiScope } from '@shared/models/ai-domain'

/** 列表条目态枚举（条目缺席=面板未挂载该档） */
export type AiMemoryStatus = 'loading' | 'ready' | 'error'

export interface AiMemoryEntry {
  status: AiMemoryStatus
  items: AiMemoryListItem[]
}

/** 过滤组（category ''=全部分类；query ''=列表模式） */
export interface AiMemoryFilters {
  scope: AiScope
  category: string
  pinnedOnly: boolean
  query: string
}

/** 新建草稿（label 无输入面——契约可选 default ''，W-3） */
export interface AiMemoryDraft {
  category: string
  title: string
  content: string
}

/** 编辑态（agent 行无编辑面——UI 不提供入口） */
export interface AiMemoryEditing extends AiMemoryDraft {
  id: number
}

export interface AiMemoryStore {
  panels: Record<string, AiMemoryEntry>
  filters: AiMemoryFilters
  draft: AiMemoryDraft
  editing: AiMemoryEditing | null
  formError: string | null
  rowErrors: Record<number, string>
  /** create 在途（R2 防重——UI 联动提交钮置灰） */
  creating: boolean
  /** update 在途（R2 防重——UI 联动保存钮置灰） */
  updating: boolean
  load(): void
  setScope(scope: AiScope): void
  setCategory(category: string): void
  setPinnedOnly(pinnedOnly: boolean): void
  setQuery(query: string): void
  setDraft(patch: Partial<AiMemoryDraft>): void
  create(): void
  startEdit(item: AiMemoryListItem): void
  setEditDraft(patch: Partial<AiMemoryDraft>): void
  cancelEdit(): void
  update(): void
  setPinned(id: number, pinned: boolean): void
  remove(id: number): void
  /** 面板卸载清面（幂等） */
  unload(): void
}

/** 行内通用错误文案单源=ui-texts.ts（回炉 R3 收敛） */
/** 非 global 档新建拦截文案（新呈裁-1） */
const CREATE_SCOPE_BLOCKED = '暂不支持在本面板为该档新建'
/** 新建草稿复位形状（category=global 档首类目——受控 select 恒有合法值） */
const BLANK_DRAFT: AiMemoryDraft = { category: 'user_preference', title: '', content: '' }

const EMPTY_ENTRY: AiMemoryEntry = { status: 'loading', items: [] }
const ALL_SCOPES: AiScope[] = ['paper', 'lineage', 'global']

/** 当前过滤签名（列表重派判据——scope 之外三过滤维） */
function sigOf(f: AiMemoryFilters): string {
  return `${f.category}|${f.pinnedOnly ? 1 : 0}|${f.query.trim()}`
}

/** 双语义路由（W-1）：query 在席=检索模式；缺席=列表模式（过滤键按需省略） */
function buildReq(f: AiMemoryFilters): { scope: AiScope; category?: string; pinnedOnly?: boolean; query?: string } {
  const q = f.query.trim()
  if (q !== '') return { scope: f.scope, query: q }
  const req: { scope: AiScope; category?: string; pinnedOnly?: boolean } = { scope: f.scope }
  if (f.category !== '') req.category = f.category
  if (f.pinnedOnly) req.pinnedOnly = true
  return req
}

export const useAiMemoryStore = create<AiMemoryStore>()((set, get) => {
  // per-scope 请求序号+载入签名（stale-guard——沿 aiTasksStore 范式）
  const seqs = new Map<string, number>()
  const sigs = new Map<string, string>()
  // 会话 epoch（面五）：unload/setScope 自增——晚到 CRUD 回包的内容收尾失格判据
  let epoch = 0

  const setPanel = (scope: string, patch: Partial<AiMemoryEntry>): void => {
    set({ panels: { ...get().panels, [scope]: { ...EMPTY_ENTRY, ...get().panels[scope], ...patch } } })
  }

  const dropPanel = (scope: string): void => {
    const rest = { ...get().panels }
    delete rest[scope]
    set({ panels: rest })
  }

  const removeRow = (scope: string, id: number): void => {
    const entry = get().panels[scope]
    if (entry === undefined) return
    setPanel(scope, { items: entry.items.filter((m) => m.id !== id) })
  }

  const dispatch = (scope: AiScope, filters: AiMemoryFilters): void => {
    const seq = (seqs.get(scope) ?? 0) + 1
    seqs.set(scope, seq)
    sigs.set(scope, sigOf(filters))
    setPanel(scope, { status: 'loading', items: [] })
    unwrap(api.ai_memory.listByScope(buildReq(filters)))
      .then((res) => {
        if (seqs.get(scope) !== seq) return
        setPanel(scope, { status: 'ready', items: res.items })
      })
      .catch(() => {
        if (seqs.get(scope) !== seq) return
        setPanel(scope, { status: 'error', items: [] })
      })
  }

  /** CRUD 回包统一错误映射（§1.4：NOT_FOUND→行消失+刷新；其余→行内/表单错误）。
   *  [回炉 R1] 调用面已过「条目在场」存活探针（卸载/切走后不达此处）；
   *  NOT_FOUND 行移除=失败收尾（在场即落），refresh 面仍按入参 seq 守卫 */
  const crudCatch = (scope: AiScope, id: number, form: boolean, err: unknown, seq: number | undefined): void => {
    const code = err instanceof ApiClientError ? err.code : ''
    if (code === 'NOT_FOUND') {
      removeRow(scope, id)
      if (seqs.get(scope) === seq) dispatch(scope, get().filters)
      return
    }
    // INVALID_REQUEST/网络异常→通用行内错误（无 CONFLICT 分支——服务层无抛出路径）
    if (form) {
      set({ formError: GENERIC_ERROR })
      return
    }
    set({ rowErrors: { ...get().rowErrors, [id]: GENERIC_ERROR } })
  }

  return {
    panels: {},
    filters: { scope: 'global', category: '', pinnedOnly: false, query: '' },
    draft: { ...BLANK_DRAFT },
    editing: null,
    formError: null,
    rowErrors: {},
    creating: false,
    updating: false,

    load() {
      const f = get().filters
      const cur = get().panels[f.scope]
      // 幂等护栏：同签名 loading/ready 在场不再派发；error/签名变化重派
      if (cur !== undefined && cur.status !== 'error' && sigs.get(f.scope) === sigOf(f)) return
      dispatch(f.scope, f)
    },

    setScope(scope) {
      const prev = get().filters
      if (prev.scope === scope) return
      epoch += 1
      // 切档即清旧条目+序号自增（在途回包失格）；分类随档重置（值域随档）
      seqs.set(prev.scope, (seqs.get(prev.scope) ?? 0) + 1)
      dropPanel(prev.scope)
      const filters: AiMemoryFilters = { ...prev, scope, category: '' }
      set({ filters })
      dispatch(scope, filters)
    },

    setCategory(category) {
      const filters = { ...get().filters, category }
      set({ filters })
      dispatch(filters.scope, filters)
    },

    setPinnedOnly(pinnedOnly) {
      const filters = { ...get().filters, pinnedOnly }
      set({ filters })
      dispatch(filters.scope, filters)
    },

    setQuery(query) {
      const filters = { ...get().filters, query }
      set({ filters })
      dispatch(filters.scope, filters)
    },

    setDraft(patch) {
      set({ draft: { ...get().draft, ...patch } })
    },

    create() {
      const f = get().filters
      if (f.scope !== 'global') {
        // 新建仅 global 档开放（新呈裁-1——UI 置灰外的守卫位）
        set({ formError: CREATE_SCOPE_BLOCKED })
        return
      }
      if (get().creating) return // R2 在途防重（双击单发）
      // 捕获原值（undefined 亦恒等比较——未派发过 list 时 CRUD 回包不误判失格；
      // 卸载/切档/重派自增后才失格——仅作用于 refresh 面，见面四收尾解耦）
      const seq = seqs.get('global')
      const ep = epoch
      const { category, title, content } = get().draft
      set({ formError: null, creating: true })
      unwrap(api.ai_memory.create({ scope: 'global', anchorId: null, category, title, content }))
        .then(() => {
          // 在途复位恒执行（面五）；draft 复位=epoch 未变 ∨ 身份校验析取
          //（当前草稿仍逐字段等于提交时草稿→复位防同稿重提重复行；已变=保留）
          const d = get().draft
          const untouched =
            d.category === category && d.title === title && d.content === content
          if (epoch === ep || untouched) {
            set({ draft: { ...BLANK_DRAFT } })
          }
          set({ creating: false })
          // refresh 面仍受 seq 守卫（晚到不改写新链——列表可旧）
          if (seqs.get('global') !== seq) return
          dispatch('global', get().filters)
        })
        .catch((e: unknown) => {
          set({ creating: false })
          if (epoch !== ep) return // 面五 r1-D2：epoch 守卫为主
          // R1 失败收尾防御带：面板已卸载/切走（条目缺席）→丢弃
          if (get().panels.global === undefined) return
          crudCatch('global', -1, true, e, seq)
        })
    },

    startEdit(item) {
      set({
        editing: { id: item.id, category: item.category, title: item.title, content: item.content },
        // R4：新建面错误不残留到编辑面
        formError: null,
        rowErrors: omitRowError(get().rowErrors, item.id)
      })
    },

    setEditDraft(patch) {
      const cur = get().editing
      if (cur === null) return
      set({ editing: { ...cur, ...patch } })
    },

    cancelEdit() {
      const cur = get().editing
      if (cur === null) return
      set({ editing: null, rowErrors: omitRowError(get().rowErrors, cur.id) })
    },

    update() {
      const cur = get().editing
      if (cur === null) return
      if (get().updating) return // R2 在途防重（双击单发）
      const scope = get().filters.scope
      const seq = seqs.get(scope)
      const ep = epoch
      set({ updating: true })
      unwrap(api.ai_memory.update({ id: cur.id, patch: { title: cur.title, content: cur.content, category: cur.category } }))
        .then(() => {
          // 在途复位恒执行（面五）；editing/行错清=epoch 未变 ∨ 身份校验析取
          //（当前 editing 仍逐字段等于提交时编辑态→清+行错清——R1c 悬孤自愈
          // 语义保持；已被替换（startEdit(B)/改字段）→保留不吞新编辑态）
          const now = get().editing
          const untouched =
            now !== null &&
            now.id === cur.id &&
            now.category === cur.category &&
            now.title === cur.title &&
            now.content === cur.content
          if (epoch === ep || untouched) {
            set({ editing: null, rowErrors: omitRowError(get().rowErrors, cur.id), updating: false })
          } else {
            set({ updating: false })
          }
          if (seqs.get(scope) !== seq) return
          dispatch(scope, get().filters)
        })
        .catch((e: unknown) => {
          set({ updating: false })
          if (epoch !== ep) return // 面五 r1-D2：epoch 守卫为主
          if (get().panels[scope] === undefined) return // R1 卸载/切走→失败收尾丢弃
          crudCatch(scope, cur.id, false, e, seq)
        })
    },

    setPinned(id, pinned) {
      const scope = get().filters.scope
      const seq = seqs.get(scope)
      const ep = epoch
      const rowErrors = omitRowError(get().rowErrors, id)
      set({ rowErrors })
      unwrap(api.ai_memory.setPinned({ id, pinned }))
        .then(() => {
          if (seqs.get(scope) !== seq) return
          dispatch(scope, get().filters)
        })
        .catch((e: unknown) => {
          if (epoch !== ep) return // 面五 r1-D2：epoch 守卫为主
          if (get().panels[scope] === undefined) return // R1 卸载/切走→失败收尾丢弃
          crudCatch(scope, id, false, e, seq)
        })
    },

    remove(id) {
      const scope = get().filters.scope
      const seq = seqs.get(scope)
      const ep = epoch
      unwrap(api.ai_memory.delete({ id }))
        .then(() => {
          if (seqs.get(scope) !== seq) return
          // 删除即终态：行本地移除零重派（NOT_FOUND 分支才刷新）；行移除=
          // 列表面变更恒受守卫（面四——过滤重派后旧删除回包不落新链）
          removeRow(scope, id)
        })
        .catch((e: unknown) => {
          if (epoch !== ep) return // 面五 r1-D2：epoch 守卫为主
          if (get().panels[scope] === undefined) return // R1 卸载/切走→失败收尾丢弃
          crudCatch(scope, id, false, e, seq)
        })
    },

    unload() {
      epoch += 1
      // 卸载清全部条目+序号自增（在途回包 refresh 面全失格）；R5 清检索过滤态
      // （query 复位——searchDraft 组件局部态随卸载消亡，防重挂脱节）；draft/
      // category/pinnedOnly/scope 保留（防丢稿+过滤面可见控件单源）
      for (const s of ALL_SCOPES) {
        seqs.set(s, (seqs.get(s) ?? 0) + 1)
      }
      set({
        panels: {},
        rowErrors: {},
        formError: null,
        editing: null,
        creating: false,
        updating: false,
        filters: { ...get().filters, query: '' }
      })
    }
  }
})

/** 清单行错误键（编辑/置顶前清旧错误——防残留误呈） */
function omitRowError(rowErrors: Record<number, string>, id: number): Record<number, string> {
  const rest = { ...rowErrors }
  delete rest[id]
  return rest
}
