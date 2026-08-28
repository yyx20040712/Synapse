# R1-WS1 课题域主进程（库级隔离：装配容器化+workspaces IPC 域+遗留迁移）——票面 v1

> 来源：用户需求 R1「文献库与发展脉络按课题分离」；裁决=ADR-0018
> （`docs/adr/0018-workspace-db-per-topic.md`——库级分目录方案，先读）。
> 纪律：三屋模式；实现者禁 git/registry；取证禁触 tickets/。

## 1. 主控预裁项

- **P1 装配容器化（bootstrap.ts 单文件内结构调整）**：
  - 抽 `assembleDataLayer(userDataDir, wsDir) → { db, repos, fileStore,
    services, close }`（现 :62-95 的数据层段——createServices 依赖回调
    里 BrowserWindow 广播/zcodeBaseDir/templateDir 等与库无关项保持闭包
    外参）；`userDataDir` 与课题目录解耦（contactEmail 等全局读取不动）。
  - 容器：模块内可变 `current` + **稳定 facade**（Proxy 或显式委托对象，
    形态实现者自裁并申报）——ipc/index.ts 的 `deps.services` 消费形态
    **零改动**；`registerAppFileProtocol` 的 `repos.papers.fileRefById`
    回调改经容器间接取（bootstrap 内一处）。
  - switch 时序：busy 串行守卫（并发 switch/进行中返回 DomainError）
    → 旧库 `db.close()` → 指针写入 → assemble 新课题 → 换容器引用。
- **P2 workspace.service（新文件 src/main/services/workspaces/）**：
  - 目录约定：`userData/workspaces/<id>/`（id=nanoid/短随机，禁止用户
    名直入路径——Win 路径字符雷）；`<id>/meta.json`={name,createdAt}；
    `<id>/synapse.db`+`<id>/files/`。指针=userData/workspace.json
    {currentId}（损坏/缺省=取目录序第一，无目录=建 default）。
  - 方法：list()→{items:[{id,name,createdAt}],currentId}；create(name)
    →建目录+空库 migrate+meta；rename(id,name)；switch(id)（存在性
    校验+P1 重建）；currentName()。
  - 常量（workspaces 目录名/pointer 文件名）放本域文件——**禁入
    shared/constants.ts**（避免无谓受锁扩容；renderer 不见路径）。
- **P3 遗留迁移（幂等，bootstrap 最早段）**：`userData/synapse.db` 存在
  且 `userData/workspaces/` 不存在 → mkdir workspaces/default →
  rename synapse.db(-wal/-shm 若在)+files/ 整体入 default/ → 指针=
  default。**e2e 种子链写旧路径被本迁移兼容（受锁 e2e helper 零改）**
  ——迁移后既有 24 e2e 全过=本单 e2e 验收面。
- **P4 IPC 域（受锁扩容 [locked-change]，契约扩展非放宽）**：
  `workspaces/list`（voidReq→{items,currentId}）/`workspaces/create`
  （{name:1-40 字}→{id}）/`workspaces/rename`（{id,name}→void）/
  `workspaces/switch`（{id}→{ok:true}）。改点=shared/ipc/schemas.ts+
  api-surface.ts+preload/index.ts+renderer api/client.ts（workspaces
    五方法；switch 返回后 renderer 侧 reload 归 R1-WS2，本单只透通道）。
- **P5 不做**：课题删除（破坏性，遗留池）；跨课题检索；切换时通知
  renderer（R1-WS2 reload 语义）；主题节点/草稿协议任何改动。

## 2. 五层规约

**─ 行为层 ──**：启动=迁移检查→读指针→装配当前课题库；switch=关旧
库→指针→装配新库（后续渲染层 reload 取新数据）。list/create/rename
即时反映目录与 meta 状态。

**─ 接口层 ──**：新文件=workspace.service.ts（+可选 workspace.fs.ts
拆目录操作）；bootstrap.ts 结构调整；受锁三件扩容；renderer api/client
+五方法。既有 IPC 通道/服务签名零改动。

**─ 架构层 ──**：分层单向保持（ipc→services→fs/db）；**INV 登记
（docs/invariants.md 随本单）**：同一时刻至多一个课题库打开；switch
非线程并行（busy 守卫）；指针文件损坏=降级第一课题不崩溃（INV-02 族）。

**─ 生命周期层 ──**：不做：workspace 目录手工编辑的 watch 兼容；
meta 版本字段（v1 无 schema 演进面）。

**─ 文化层 ──**：TDD——新测试 `tests/unit/services/workspace.test.ts`
[locks:generate]：list/create/rename/指针缺省/switch 重建（真临时目录+
真库）/迁移幂等（二次启动不动）+迁移幂等不破坏 e2e 配方；contracts
测试扩容 workspaces 域 [locked]。e2e=既有 24 全过（迁移兼容即验收）。
变异红证 ≥2（删 busy 守卫→并发 it 红；删迁移 rename→迁移 it 红；cp
备份法还原）。报告落 `scripts/audits/r1-ws1-impl.report.md`，五行内回复。

## 3. 机检兼容自查

无 TODO/FIXME/placeholder；UTF-8；node24 前缀；locks unlock→改→
generate（新测试路径）→apply；verify 真退出码落盘；基线=95 文件 741
用例+本单增量自报；e2e 24 passed+0 skip 亲跑留证。
