# ADR-0018 课题（Workspace）隔离采用库级分目录方案

- 状态：已裁决（2026-08-28，总指挥会话）
- 背景：用户需求「软件面向不同课题，文献库与发展脉络都应按课题分离」。
  当前全局单库单图：papers/lineage_nodes 均无课题维度。
- 候选（调研报告见本场开工记录）：
  1. collections 加 is_topic——多对多语义≠课题单值归属；主题节点
     （paper_id null）无挂点；lineage 过滤需 JOIN 间接推导。否决。
  2. 新表 workspaces + papers.topic_id + lineage_nodes.topic_id——语义清晰
     但受锁面最大（shared 模型/api-surface/契约测试全批 [locked-change]），
     且 sha256 UNIQUE 与跨课题同文互斥需放松+全去重路径重审；corpus 导出
     语义需改过滤。
  3. **库级分目录（采纳）**：`userData/workspaces/<id>/` 各含 synapse.db +
     files/——语义=完全隔离（本需求字面），受锁面最小（既有 IPC 通道
     零改动；新增 workspaces 域=常规受锁扩容），sha256 去重/FTS/备份
     天然按课题；「切课题=切库」无跨库泄漏类缺陷面。
- 决策：
  - 每课题一目录一库一文件仓；课题清单=目录扫描+各 meta.json（name）。
  - 当前课题指针=userData/workspace.json（全局，库外）。
  - 主进程数据层装配（db+migrate+repos+fileStore+services）抽为可重建
    函数，经稳定 facade 容器供 IPC/协议层引用；switch=关旧库→重建→
    热换（busy 串行守卫）。
  - 渲染层切换=确认 dirty（复用 quit-dirty 聚合）→ IPC switch →
    `location.reload()`（全新 stores，零 stale 态类别）。
  - **遗留布局迁移（幂等）**：启动时存在旧版 `userData/synapse.db` 且
    `workspaces/` 不存在 → 建 `workspaces/default/` 整体移入
    synapse.db(-wal/-shm)+files/——既有用户数据零丢失；e2e 种子链写
    旧路径同样被迁移兼容（受锁 e2e helper 零改动）。
  - v1 边界：不做课题删除（破坏性操作，遗留池）；不做跨课题检索；
    ai-sensor 协议根保持全局（corpus 导出自当前库，天然按课题）。
- 后果：
  - 新增受锁面：ipc/schemas+api-surface+preload+contracts 测试的
    workspaces 域扩容（[locked-change]，契约扩展非放宽）。
  - 主进程 services 容器化为一次性结构调整（ipc/index.ts 的 deps 传递
    形态变更），INV 登记：同一时刻仅一个课题库打开（见 invariants.md
    随实现单元登记）。
  - 跨课题全局功能（全局检索/统一标签）未来如需=新裁决，v1 明确不做。
- 单元划分：R1-U1 主进程（装配容器化+workspaces 域+迁移）/ R1-U2
  渲染层（切换器+设置面）。均三屋模式。
