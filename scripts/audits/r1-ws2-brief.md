# R1-WS2 课题切换器渲染层（侧栏切换 UI+dirty 守卫+设置面课题管理）——票面 v1

> 来源：ADR-0018 R1 第二单元（前置=R1-WS1 已收口：workspaces 五方法在
> api/client 就位）。本单=用户可见面：切课题=文献库+脉络整体切换。
> 纪律：三屋模式；实现者禁 git/registry；取证禁触 tickets/。

## 1. 主控预裁项

- **P1 workspace.store（新文件 src/renderer/features/workspaces/）**：
  zustand——load()（list+currentName 驻留）/create(name)/rename/
  switch(id)。**switch 流程=dirty 聚合检查**（复用 App.tsx 既有
  tabDirty∪lineageDirty 聚合值——经 props/注入传入，禁 store 互引跨域）
  →dirty 时 confirm 对话框（沿用退出守卫文案风格「切换课题将丢弃未
  保存的标注/脉络修改」）→ api switch → `window.location.reload()`
  （全新 stores 零 stale 态——ADR-0018 裁决）。
- **P2 侧栏切换器（App.tsx nav 顶部）**：当前课题名展示（display 字体
  位随 R3 主题单，本单先占位常规样式）+下拉（既有课题列表+「新建课题
  …」项+「管理」入口跳设置）。**nav 按钮文案/aria 不动**（e2e 断言面）。
- **P3 设置面课题管理节（SettingsPage 增节）**：列表（当前课题标记）+
  新建（名称输入+创建即切）/重命名（inline 编辑）。「管理」侧栏入口
  跳设置页。删除不做（ADR-0018 v1 边界）。
- **P4 受锁面**：新 e2e `tests/e2e/workspaces.spec.ts` [locks:generate]
  ——验收判据场景：旧布局种子（1 篇文献）→启动（迁移兼容）→新建课题
  B→reload 后文献库空+脉络空态→切回 default→文献在场。单测：store
  dirty 拦截/无 dirty 直切/reload 调用（jsdom location.reload stub）+
  侧栏渲染（现有 App 级测试先例 app-quit-dirty.test.tsx 的 mock 配方）。
- **P5 不做**：切换动画；课题色标/图标；快捷键。

## 2. 五层规约

**─ 行为层 ──**：侧栏可见当前课题；切换=（dirty 确认）→IPC→reload→
新课题数据；新建=命名→创建→切过去；重命名即时生效于侧栏与设置面。

**─ 接口层 ──**：新文件 workspace.store.ts+WorkspaceSwitcher.tsx+
SettingsPage 节；App.tsx 接线（+workspace.store 挂载 load）。既有组件
props 零破坏。

**─ 架构层 ──**：renderer 分域（features/workspaces）；跨域经 App
编排（dirty 聚合注入）——不引 reader/lineage 域 store。

**─ 生命周期层 ──**：不做：多窗口课题并行（单窗口应用不变量）；
reload 前内存态快照恢复。

**─ 文化层 ──**：TDD——store/切换器 it 首红→实现→绿→变异红证 ≥2
（删 dirty 拦截→拦截 it 红；删 reload→切换 it 红）。e2e 新 spec 全跑
留证。报告落 `scripts/audits/r1-ws2-impl.report.md`，五行内回复。

## 3. 机检兼容自查

无 TODO/FIXME/placeholder；UTF-8；node24 前缀；locks generate（新
spec+新单测路径）→apply；verify 真退出码落盘；e2e 25 passed 自报
（24+1）。
