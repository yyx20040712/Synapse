/**
 * [T3-P2] StatusBar —— 26px 状态条（等宽字仪表带）。
 *
 * ── 行为层 ──
 * - 槽位（左→右）：课题 {名} · {篇数} 篇｜脉络 {N} 节点 / {M} 连线｜已选 {0/1}
 *   ｜[T3-U1] 自动保存 · {已保存/保存中…/保存失败}→.sep（flex:1）→主题：{名}
 * - 纯展示哑件：数据全部经 props 注入（App 组合根订阅各 store——沿
 *   WorkspaceSection dirty 注入先例，禁 StatusBar 自引域 store）
 * - [T3-U1] 自动保存槽：autosave=null（无可写面信号）槽整体省略——禁假数据
 *   （无时间戳，干净源不带时间）；error 档挂 .sig（--signal 色）；
 *   聚合在 App 组合根（worst-of：tabDirty∪lineage saveStatus）
 * - 省略槽（探明申报，禁假数据）：自动保存·时间——App 级无时间戳干净源；
 *   待 enrich 计数——enrichStatus 仅详情面板按需拉取，列表查询不含此列
 *   （无聚合通道）
 *
 * ── 接口层 ──
 * - export function StatusBar(props: { wsName: string; paperCount: number;
 *     nodeCount: number; edgeCount: number; selectedCount: number;
 *     themeLabel: string; autosave: 'saved' | 'saving' | 'error' | null })
 *
 * ── 架构层 ──
 * - 皮肤住 theme-shell.css .app-statusbar（.sig=保存失败槽消费[T3-U1]；
 *   .ok 色类仍预留皮肤件）
 *
 * ── 生命周期层 ──
 * - 不做：交互（纯读带）；刷新动作（store 变化沿自动重渲）
 *
 * ── 文化层 ──
 * - 值单源=mockup L74-77；测试=app-shell.test 状态条 describe（真文本）+
 *   [T3-U1] 自动保存槽 describe（三态真文本+null 省略）
 */

/** [T3-U1] 自动保存槽三态（App 组合根 worst-of 聚合的输出；null=槽省略） */
export type AutosaveStatus = 'saved' | 'saving' | 'dirty' | 'error' | null

/** [T3-U1] 三态真文本（票面②原文——无时间戳，禁假数据）；
 * [F-LGRAPH-01②U1] +dirty=编辑会话暂存未落库（「待保存」——保存语义反转） */
const AUTOSAVE_LABEL: Record<Exclude<AutosaveStatus, null>, string> = {
  saved: '已保存',
  saving: '保存中…',
  error: '保存失败',
  dirty: '待保存'
}

export function StatusBar(props: {
  wsName: string
  paperCount: number
  nodeCount: number
  edgeCount: number
  selectedCount: number
  themeLabel: string
  autosave: AutosaveStatus
}): JSX.Element {
  return (
    <>
      <span>
        课题 {props.wsName} · {props.paperCount} 篇
      </span>
      <span>
        脉络 {props.nodeCount} 节点 / {props.edgeCount} 连线
      </span>
      <span>已选 {props.selectedCount}</span>
      {props.autosave !== null && (
        <span className={props.autosave === 'error' ? 'sig' : undefined}>
          自动保存 · {AUTOSAVE_LABEL[props.autosave]}
        </span>
      )}
      <span className="sep" aria-hidden="true" />
      <span>主题：{props.themeLabel}</span>
    </>
  )
}
