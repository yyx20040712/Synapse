# ADR-0022：草稿导入链退役

日期：2026-09-30 ｜ 票：F-BAKRET-01 ｜ 状态：已裁（用户裁决 2026-09-30 在档——v90 §4；主控推荐案用户已批准立项，可否决窗口已过）

## 背景

老版脉络图草稿导入（lineage JSON 文件经 main 侧对话框选取→zod 三段校验→
全有或全无替换式重灌）是废弃设计：单人本地应用语境下「除非电脑损坏数据
迁移，没人会导入草稿」。备份需求的真实形态是**多实体整体迁移**，由规划中
的服务端多实体导出承接，与现行单实体 lineage.json 导入格式不同构——
复刻价值趋零。宪法「方案切换=删除旧方案/死代码即删」：git 历史即完整
资产，直接删代码+本短 ADR 入档语义。

## 决策

1. **删除面=仅导入链**（通道 61→60）：service 的
   validateDraft/importDraft/importFromFile 三面+清面原语 clearGraph+
   lineage/import 通道与 shared Res schema+dialogs.pickJsonFile+
   renderer 导入入口动作件与工具栏按钮+全部导入链用例。
2. **保留面零变**（门一 W2 事实修正）：lineage.json 无独立导出入口——
   assemble 是 corpus AI 语料五件套的部件（corpus 面用户裁决不动）→
   assemble 链+导出面 INV-77 过滤兜底全部保留（存量幽灵边对五件套
   携出的防御仍需）；INV-90 跨图边守卫保留（防御纵深）；脉络图种子
   三路（①脉络页 UI 添加节点 ②挂接导入自动建节点 ③papers.moveFolder
   自动建节点）行为零变。
3. **备份域清单**（未来服务端多实体导出的耦合面）：文件夹+文献+笔记+
   脉络+AI 语料**紧密耦合一起导出**——多实体 bundle，非单实体文件。
4. **全有或全无事务经验**（服务端 bundle 设计可参考）：本链交付的
   withTransaction 包裹「清面+整套重灌」整批替换语义——事务保证清面
   成功但重插失败时整体回滚、无半写残留；服务端 bundle 的导入侧
   （如未来「恢复」功能）应沿用同族原子性设计。

## 备选否决

- **保留导入链+仅隐藏入口**：否决——死代码即删（宪法），保留=双真相
  拖累通道面与 schema 面。
- **改写为 lineage.json 单实体导入**：否决——备份需求=多实体耦合导出，
  单实体格式不同构、复刻价值趋零。
- **顺带退役 lineage.assemble/INV-77**：否决——assemble 为 corpus 五件套
  部件非独立导出入口（门一 W2 事实修正）；存量幽灵边防御仍需。

## 后果

- IPC 通道 61→60（lineage/import 退役）；契约 pin/域方法集随迁
  （[locked-change]）。
- 脉络图种子入口收敛为三路（UI 添加/挂接导入/moveFolder）；draft zod
  schema（shared/models/lineage.ts）保留为文件协议历史定义面（测试仍
  锁定其 strict 语义），不再有 src 消费方。
- 库中幽灵边自本票起不可经产品路径产生（INV-90+导入链双堵）——存量
  数据防御由 graph() 子图过滤+导出面 INV-77 过滤兜底承载。
- e2e 种子链改述：脉络图种子=e2e-env.seedLineageGraph（子进程直写库，
  seedPaperRow 同型基建）+T1 用 UI 添加节点产品路径。

## 关联

- git 回溯：**06ea570**=SR2-LG-01 导入链引入（validateDraft 三段+替换式
  重灌+INV-27 宿主）｜**548dfda**=F-FOLDER-01 INV-88 draft 归属统一语义｜
  **95d40c223bd**=F-FOLDER-02·C2 终态（跨图边跳过+计数+导出面兜底）。
  ｜ADR-0014（lineage 图数据模型）｜ADR-0013（备份/恢复姿态）｜
  INV-27/77/88/90（退役注记见 docs/invariants.md）。
