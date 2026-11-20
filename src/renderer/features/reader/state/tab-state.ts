// [B1 批] 自 reader.store 拆出——store 增研究面板字段前置瘦身，类型与默认值
// 单一真相源不变，reader.store 再导出保持既有 import 面零迁移（工单域与
// 状态机注释见 reader.store.ts 头注）
/**
 * TabState —— per-tab 状态形状与新建默认值（reader.store 拆分件）
 *
 * ── 行为层 ──
 * - TabState 形状与生命周期注释自 reader.store.ts 原样迁入（字段语义零变；
 *   状态机/竞态守卫实现留驻 reader.store——本件只持类型与 makeLoadingTab）
 * - [B1 批] 新增可选 researchTab（右栏研究面板页签态，per-tab 会话态）：
 *   | 事件 | researchTab 迁移 |
 *   | openPaper（absent 新建） | 不写（字段缺席=缺省 ai——消费方 ?? 'ai' 兜底） |
 *   | openPaper（error 重试） | 沿 prev（{...prev,status:'loading'}） |
 *   | setResearchTab(t) | active tab 写入 t；activeId=null no-op |
 *   | closeOne(id) | 随 tab 删除；重开同 id=全新 tab（缺省 ai） |
 *   | close() | 整体复位（初始态工厂） |
 *   可选字段=存量测试夹具零破坏（selectionMode/pageLayout 同型先例）
 *
 * ── 接口层 ──
 * - export interface TabState
 * - export function makeLoadingTab(paperId, prev): TabState（error 重试沿用
 *   既有显示字段，status 归 loading）
 *
 * ── 架构层 ── / ── 生命周期层 ── / ── 文化层 ──
 * - renderer 内部类型（不入 src/shared——跨进程不消费）；测试面随
 *   reader.store.test（factories.makeTab 经 reader.store 再导出零迁移）
 */
import type { Annotation, AnnotationColor } from '@shared/models/annotation'

export interface TabState {
  paperId: string
  fileUrl: string
  fileName: string
  /** 文献名（PaperDetail.title）——标签页可读名单源（缺陷②）；空串=未知，
   *  展示层兜底 fileName 去扩展名（防御位） */
  title: string
  page: number
  totalPages: number
  zoom: number
  color: AnnotationColor
  annotations: Annotation[]
  status: 'loading' | 'ready' | 'error'
  /** 灰点信号位（TABS-03 写入；本单恒 false） */
  dirty: boolean
  /** 标注「选择模式」（F-A3/INV-42，per-tab 视图交互态）：true=两层标注渲染
   *  rect pointer-events 全关（点击穿透零副作用，拖选可在标注块上发起——
   *  F-A2 根治）；会话内存态不持久化。可选字段=存量测试夹具（受锁 sha256
   *  面，8 文件完整对象直植）零破坏的必要形式；缺席即常规态，消费方一律
   *  ?? false 兜底；makeLoadingTab 新建分支显式 false */
  selectionMode?: boolean
  /** 页布局（F-R1 双页阅读，per-tab 视图态——与 zoom/color/selectionMode
   *  同型）：'single'=单列（默认）；'double'=两页一行。生命周期迁移表：
   *  | openPaper（absent 新建） | 'single'（makeLoadingTab 显式置值） |
   *  | openPaper（error 重试） | 沿 prev（{...prev,status:'loading'}） |
   *  | setPageLayout(m) | active tab 写入 m；activeId=null no-op |
   *  | closeOne(id) | 随 tab 删除；重开同 id=全新 tab='single' |
   *  | close() | 整体复位 |
   *  可选字段=存量测试夹具零破坏（消费方 ?? 'single' 兜底）；v1 不落库
   *  （重开回 single——zoom 同型，票面备案） */
  pageLayout?: 'single' | 'double'
  /** [B1 批] 右栏研究面板页签（per-tab 会话态——与 selectionMode 同型）：
   *  'ai'=AI 对话（缺省，字段缺席即 ai）；'notes'=笔记。生命周期迁移表见
   *  本件头注行为层；消费方（ResearchAside）?? 'ai' 兜底 */
  researchTab?: 'ai' | 'notes'
  /** [B2 批] 右栏研究面板滚动会话记忆（per-tab，按页签分槽）：值=有效滚动
   *  容器瞬时 scrollTop（笔记页签=fragment 列表容器、AI 页签=消息列表——
   *  面板内部自持滚动，host .rdr-research-body 解析兜底）。生命周期迁移表：
   *  | 事件 | researchScroll 迁移 |
   *  | openPaper（absent 新建） | 不写（字段缺席=两页签 0/顶部） |
   *  | openPaper（error 重试） | 沿 prev（{...prev,status:'loading'}） |
   *  | saveResearchScroll(id,t,v) | 显式 paperId 寻址写入该槽（不读 activeId） |
   *  | closeOne(id) | 随 tab 删除；重开同 id=全新（缺省 0） |
   *  | close() | 整体复位（重开应用=新 store 实例，无持久化面） |
   *  收账三点（页签点击前/activeId 变化 effect/组件卸载 cleanup——禁 scroll
   *  事件监听）；恢复=容器 scrollTop 直写（INV-34 例外登记），严禁经
   *  setPage/scrollRequest（INV-29/118 双源分离） */
  researchScroll?: { ai?: number; notes?: number }
}

/** 新建 loading 态 tab（error 重试时沿用既有显示字段，status 归 loading；
 *  [B1 批] researchTab 两分支均不写——新建缺省 ai、重试沿 prev 字段） */
export function makeLoadingTab(paperId: string, prev: TabState | undefined): TabState {
  if (prev !== undefined) {
    return { ...prev, status: 'loading' }
  }
  return {
    paperId,
    fileUrl: '',
    fileName: '',
    title: '',
    page: 0,
    totalPages: 0,
    zoom: 1,
    color: 'yellow',
    annotations: [],
    status: 'loading',
    dirty: false,
    selectionMode: false,
    pageLayout: 'single'
  }
}
