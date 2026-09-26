/**
 * [T3-P2] StatusBar —— 26px 状态条（等宽字仪表带）。
 *
 * ── 行为层 ──
 * - 槽位（左→右）：课题 {名} · {篇数} 篇｜脉络 {N} 节点 / {M} 连线｜已选 {0/1}
 *   →.sep（flex:1）→主题：{名}
 * - 纯展示哑件：数据全部经 props 注入（App 组合根订阅各 store——沿
 *   WorkspaceSection dirty 注入先例，禁 StatusBar 自引域 store）
 * - 省略槽（探明申报，禁假数据）：自动保存·时间——App 级无干净信号
 *   （save-status=纯函数，四态驻 ReaderNotesPanel 每笔记草稿）；待 enrich
 *   计数——enrichStatus 仅详情面板按需拉取，列表查询不含此列（无聚合通道）
 *
 * ── 接口层 ──
 * - export function StatusBar(props: { wsName: string; paperCount: number;
 *     nodeCount: number; edgeCount: number; selectedCount: number;
 *     themeLabel: string })
 *
 * ── 架构层 ──
 * - 皮肤住 theme-shell.css .app-statusbar（.ok/.sig 色类预留在皮肤件）
 *
 * ── 生命周期层 ──
 * - 不做：交互（纯读带）；刷新动作（store 变化沿自动重渲）
 *
 * ── 文化层 ──
 * - 值单源=mockup L74-77；测试=app-shell.test 状态条 describe（真文本）
 */
export function StatusBar(props: {
  wsName: string
  paperCount: number
  nodeCount: number
  edgeCount: number
  selectedCount: number
  themeLabel: string
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
      <span className="sep" aria-hidden="true" />
      <span>主题：{props.themeLabel}</span>
    </>
  )
}
