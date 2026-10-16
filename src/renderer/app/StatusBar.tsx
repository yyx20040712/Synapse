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
 * - [F-VISFB-14] 保存槽四态单源化（INV-141⑤新面消费）：autosave 载型=
 *   SaveUiState|null（renderer/shared/save-status 单源）；槽视图（真文本+
 *   alarm 档）=deriveSaveStatusSlot 唯一推导——组件零散落映射（旧本件
 *   AUTOSAVE_LABEL 私有表退役；文本逐字同值=受锁 app-shell 断言面零变）
 * - 省略槽（探明申报，禁假数据）：自动保存·时间——App 级无时间戳干净源；
 *   待 enrich 计数——enrichStatus 仅详情面板按需拉取，列表查询不含此列
 *   （无聚合通道）
 *
 * ── 接口层 ──
 * - export function StatusBar(props: { wsName: string; paperCount: number;
 *     nodeCount: number; edgeCount: number; selectedCount: number;
 *     themeLabel: string; autosave: AutosaveStatus })
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
 *   [T3-U1] 自动保存槽 describe（三态真文本+null 省略）+
 *   [F-VISFB-14] save-status-slot.test（deriveSaveStatusSlot 单源推导）
 */
import { deriveSaveStatusSlot, type SaveUiState } from '../shared/save-status'

/** [T3-U1→F-VISFB-14] 自动保存槽四态（SaveUiState 单源消费；null=槽省略） */
export type AutosaveStatus = SaveUiState | null

export function StatusBar(props: {
  wsName: string
  paperCount: number
  nodeCount: number
  edgeCount: number
  selectedCount: number
  themeLabel: string
  autosave: AutosaveStatus
}): JSX.Element {
  const autosaveSlot = props.autosave !== null ? deriveSaveStatusSlot(props.autosave) : null
  return (
    <>
      <span>
        课题 {props.wsName} · {props.paperCount} 篇
      </span>
      <span>
        脉络 {props.nodeCount} 节点 / {props.edgeCount} 连线
      </span>
      <span>已选 {props.selectedCount}</span>
      {autosaveSlot !== null && (
        <span className={autosaveSlot.alarm ? 'sig' : undefined}>
          自动保存 · {autosaveSlot.text}
        </span>
      )}
      <span className="sep" aria-hidden="true" />
      <span>主题：{props.themeLabel}</span>
    </>
  )
}
