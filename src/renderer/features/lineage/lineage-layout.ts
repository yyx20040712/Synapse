// b3: P7-H
/**
 * [SR2-LG-02] lineage-layout —— 布局纯函数+只读画布+脉络视图（工单：open / strong）
 *
 * ── 行为层 ──
 * - **布局纯函数**（ADR-0014 E3 字面）：y=年份分层（year 升序层带——
 *   year null 节点归「未知年份」末层）；x=**Reingold-Tilford tidy tree
 *   零依赖手写**（线性时间两趟扫描：后序遍历子树轮廓+兄弟间距+前序
 *   定 x——rescope-verification §4 算法调研母本；**D3 禁引**零新依赖
 *   红线）；**森林语义**（多根=多棵树并排——INV-27 单父无环前提下
 *   边集构成森林；孤立节点=单节点树）
 * - **手工位置覆盖优先**（JSON Canvas 模式）：节点 x/y 非 null → 用
 *   覆盖值不参与自动布局（覆盖节点与其余自动节点可重叠——v1 不做
 *   碰撞避让，票面声明）；null → 布局产出
 * - **同输入同输出**（纯函数性质单测锚定——排序稳定性：同层节点按
 *   树序非 id 字典序）
 * - **只读画布 LineageCanvas.tsx**：SVG 渲染（节点=卡片 rect+标题+
 *   年份；边=父子连线贝塞尔；主题节点样式区分文献节点）；pan/zoom
 *   （滚轮缩放+空白拖拽平移——**INV-14 成对注册/成对清理**既有
 *   不变量扩面，卸载清 listener 用例）
 * - **新顶层视图「脉络」**（E4）：App 导航第四项（NAV+ViewId 扩
 *   'lineage'——App.tsx infra 无工单挂载面）；LineagePage.tsx 视图
 *   宿主（经 lineage/graph 通道取数→**lineage.store 新建数据单源**
 *   （AI-08 ai-notes.store 同型新数据新域）——03/04 禁双取，接缝
 *   双向锚定声明两文件头注）
 *
 * ── 接口层 ──
 * - export function layoutLineage(nodes: LineageNode[], edges:
 *   LineageEdge[]): LayoutResult（{ positions: Map<id,{x,y}>,
 *   layerYears: number[]（含 NaN 哨兵=未知层? 以 year|null 序列化——
 *   形状实现定，票面不锁） }——输出坐标系=布局原点系，画布 viewport
 *   变换归组件）
 * - 交付面：lineage-layout.ts+LineageCanvas.tsx+LineagePage.tsx+
 *   lineage.store.ts+App.tsx 挂载（NAV/ViewId/路由三行族）+
 *   window.api 类型面（lineage 域 01 已立——消费零改动）
 *
 * ── 架构层 ──
 * - renderer/features/lineage 新域；依赖 window.api（lineage/graph）
 *   +shared/models/lineage（01 交付）+SVG 零第三方（React 内建）；
 *   **禁引 d3/任何布局库**（ESLint 无白名单新条目——零依赖红线）
 * - 分层不破：布局纯函数禁 DOM/window（可测性=纯数据进出）
 *
 * ── 生命周期层 ──
 * - 预留：节点显隐过滤（按年份带折叠——v2）；碰撞避让（覆盖节点
 *   重叠提示）；缩放范围钳制参数化
 * - 不做：交互编辑（03）；侧板/跳转（04）；DAG 布局（v2 升版条件=
 *   真实多父编辑诉求——ADR-0014）
 *
 * ── 文化层 ──
 * - 错误：graph 取数失败=列表型瞬态（store.error 消费方呈现+重试——
 *   INV-02 两型分清）；读面状态枚举（门一 N6）：loading/ready/error
 *   三态（无用户输入写面——状态机前置纪律不适用结论维持，pan/zoom
 *   =视口瞬态不入 store）；布局输入含 INV-27 破坏（多父/环）=防御性剔除
 *   非崩溃（理论不可达——service 层已守；剔除计数 console.warn 供
 *   调试，不 toast 不静默吞）
 * - 测试：tests/unit/renderer/lineage-layout.test.ts [受锁新增]——
 *   单链 x 序单调/兄弟不重叠（轮廓间距断言）/年份分层 y 单调+未知层
 *   末位/森林多根并排不重叠/覆盖优先（x/y 非 null 节点不移动）/空图
 *   空结果/纯函数性质（两次调用深相等）；LineageCanvas 组件测试
 *   [受锁新增]——节点文本真实渲染（「渲染出真实文本」红线）/pan
 *   listener 成对清理（INV-14）/zoom 钳制；**always-active**
 * - 新增受锁测试随实现 locks:generate+apply+[locked-change] 尾注
 * - 完成后：删除 STUB → npm run verify 绿 → 人工审查 git diff → 翻 registry
 */

/** 工单骨架标记（实现单元替换为真实实现） */
export const LINEAGE_LAYOUT_STUB = 'SR2-LG-02'
