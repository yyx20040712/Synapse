# ADR-0034 统一撤销历史契约与 off 装配

日期：2026-11-27。状态：已接受。工单：F-UNDOHIST-02（保持 open）。

## 背景

reader 有操作层与文本值层两套历史；lineage 有 per-folder 命令历史；library
尚无撤销历史。三域的深度、生命周期、冲突裁决和写序相似，但接口不同。统一
撤销已由用户裁决采用共享内核加域适配器，不为历史新增 SQL 表；实施分批，
第一批只建立契约、行为基线、共享内核和启动装配，生产档最高 `off`。

## 决策

1. 统一历史的可写栈由共享 registry 唯一持有。读取深度、栈顶或命令状态
   不创建 scope；领域适配器不得保留第二份可写 past/future。
2. `HistoryScope={workspaceId,domain,scopeId,sessionGeneration}`。`scopeId`
   使用有类型元组，不拼接解析。registry 按 workspace/domain/scopeId 保留已用
   generation 直到 `reset(workspace)`；同键关闭后同代或旧代重开拒绝，新代仅在
   旧 active dispose 后开放。旧代回执不得结算到新 scope。
3. `HistoryUnit` 保留领域载荷、命令名和变更集。结果保留
   `applied/noop/blocked/failed/conflict/superseded`；`conflict` 必携开放
   `domainReason:string`。`HISTORY_STALE/HISTORY_PAPER_MISSING/`
   `HISTORY_FOLDER_MISSING/HISTORY_GRAPH_INVALID` 是现行领域映射，不是封闭枚举。
4. 领域在 `open(scope,{redoOrder})` 固定重做取顶策略并捕获为标量：reader
   操作层和文本层为 `head`，lineage 为 `tail`。undo 顶恒为 past 尾；`peek`、
   `settle` 和 `dropTop` 使用同一 top/index 函数；head 的 future 截尾，tail 的
   future 截头，past 恒截头。深度恒为 `HISTORY_DEPTH_MAX`，调用方不能覆盖；
   `lookup` 不重建栈，也不改变策略。
5. 命令结算端口按 `beforePrepare/afterPrepare` 选择选中时点。lane 入口、
   prepare 返回后和 execute 紧前都同时核对 `registry.lookup(scope)` 仍是原栈且
   领域 `admitCommand()` 通过；execute 前失效返回未派发 superseded，execute 后
   失效返回已派发 superseded。prepare 失败、execute 返回非 applied、noop 或
   迟代回执都不移栈。领域通过 `settlement` 返回反向单元、延后输入和缺失策略；
   pending 是新正向编辑，总是清 future 并追加 past，不清 past。成功后移栈、
   领域改写和回显在同一通知抑制边界完成，订阅只发布一次。
6. 本批生产档最高 `off`。`SYNAPSE_UNDO_ROLLOUT` 严格解析
   `off/reader/lineage/library-basic/library-composite/all`；缺省静默取 `off`，
   非法值或超出本版上限才回退稳定档并诊断。`off` 只选择原后端，不复制历史，也不
   改业务写。启动档在 main 固定一次，经 query 传 renderer；renderer 只读
   一次，不暴露 Node API。
7. 现行行为不变：reader 操作/文本两层和 lineage 13 命令保持现有语义。
   第一批不接 reader 或 lineage 生产历史，不实现 library。

## 生命周期

- 新建或空栈只读不建 scope；noop 不新增历史边界。
- 新输入入 undo 并清自身 redo；有效文本或命令成功才记 unit。
- 命令失败、门拒或冲突不移栈，可重试；只确认当前过期栈顶才可丢弃。
- 显式保存只清 redo；undo 保留。保存本身不使三域 undo 失效。
- reader 关 tab 真正 close 后清本篇历史并换代；重开从空栈开始。
- 恢复副本实际载入只替换目标 folder，换代并清该 folder 历史；其他 folder
  不动。移动和实际应用快照不清三域历史，旧项由事务内预期端态裁决。
- 课题切换、退出或重启后内存历史消亡。崩溃后不恢复历史。
- 删除=放弃语义；删除成功后清除触及实体的历史项。文献移动和快照导入=
  前置保存门；noop 或取消不新增历史边界。后出的裁决⑨⑩优先于早期独立
  评审⑦的“建议清空三域”。

## 影响

第一批新增 `src/renderer/shared/history` 内核、registry 和 run 端口，拆出
`UndoCommandState` 与 `SaveCommandState`，保留兼容的 `HistoryCommandState`。
行为基线登记在三域现有实现的 characterization 测试中；生产写路径不变。
reader 条件写、启用 reader、lineage 迁移和 library 分片必须在后续批次独立
登记和评审；F-UNDOHIST-02 继续承载该范围。

后续 library 的用户补裁（2026-11-28，不在第一批实施范围内）：

- folder create/tag upsert 采用原 ID 恢复和严格前置检查；唯一键冲突零写，
  upsert 命中既有标签不产生创建项。
- 创建标签并挂接使用一个 main 事务、一个历史 unit。新标签撤挂接与创建，
  既有标签只撤新增挂接，已挂接为 noop；失败整事务回滚。
- 快照只实现最新版、带版本的恢复证据协议，不做旧客户端、旧卷或测试数据
  兼容；旧格式可拒收。该协议先于三表原 ID 创建/删除恢复启用。

现有 reader 历史没有 main 事务内普通预写指纹保护。本 ADR 不宣称该保护已
存在；它是 reader 档启用的前置条件。

## 验证

- `tests/unit/renderer/history-characterization.test.ts` 锁定预写时序、
  FIFO、重基、失败后新输入、非空 redo 保存、实际导入快照保留未触及撤销、
  触及项条件写拒绝和恢复目标隔离。
- 共享内核 conformance 覆盖固定深度、按身份结算、head/tail 重做、文本
  FIFO/rebase、合并、双侧 remap/reanchor、原子 pending、stale 丢顶、无副作用
  读取、generation 水线、三重准入、领域结算和单次发布。
- 启动测试覆盖缺省、非法、超上限、合法 off、无 theme、dev/production
  和重复读取一致性。
