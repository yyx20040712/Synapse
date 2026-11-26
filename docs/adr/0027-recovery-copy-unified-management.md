# ADR-0027：恢复副本统一管理（单一服务/单槽/类型注册表）

日期：2026-10-19 · 状态：已裁决——已落地（recovery 域四通道+INV-156..167 登记 docs/invariants.md）

## 背景

成熟桌面办公软件丢稿防御三道防线（恢复副本/自动暂存落盘/关闭确认）中，
本项目原先仅有第三道（脏标记+关窗确认，ADR-0026 及其前史已落地）。先行
批次裁决暴露的后果（save 撞 CONFLICT 静默蒸发/幽灵页面态/quit 零确认
丢稿）需要前两道补位。用户裁决（2026-10-17 逐字）：「wps式，但注意恢复
副本是一个新的数据类型，需要统一管理，且副本数目越少越好节约空间。」

## 候选

1. **集中式恢复服务+类型注册表（采纳）**：main 侧单一 recovery 服务，
   单一存储位 `<userData>/recovery/<workspaceId>/<fileName>`，shared 侧
   RECOVERY_REGISTRY 为命名/schema/生命周期单源（为未来 reader 草稿族
   预留同一管理位）；每 (工作区,类型) 单槽覆写。
2. feature 散落自建（各写面自存自管）——被用户约束直接否决（禁散落
   自建）。
3. 版本链/多槽——被「副本数目越少越好」否决（恒至多一份）。

## 裁决

- 消费=takeOver 超越制：恢复=读副本→载入→以原载荷原样回写同槽（携
  takeOverToken 双校验 token+epoch）——无「先删后写」空窗；外会话未决
  副本拒覆写（pending）。
- 删除=release token 作用域（clean 四源：flush 全成功/undo 回基线/切图
  弃置/干净退出——仅删本会话自有副本 token；恢复条放弃=discard 可删
  外会话 token）；先删文件成功再推进 per-type epoch（epoch 删除屏障
  ——旧 epoch 迟到写不复活）。
- 与 DB 落库解耦：flush 出队触发 fire-and-forget 恢复读（重放由
  WriteAction 幂等兜底——remove 族缺席=0 幂等、upsert 族 id 键幂等；
  重放尾无硬上界）。
- 退出窗 1500ms fail-open；非自有文件（invalid/foreign-version/高版本）
  永不自动删除。
- CONFLICT 降级询问仅 floating-note upsert ghost-folder 族（三联判据
  kind+code+reason；AppError 增可选 reason 字段承载——Result 信封结构化
  透传）。
- 实施期并入的三项设计补充（2026-10-19）：takeOver 失败回滚+remap 后
  folder 矫正+启动窗冻结。

## 后果

- 新增 recovery 服务域+四 IPC 通道（peek/save/read/release——
  api-surface 域计数 +1）；writeActionSchema 自 renderer 迁 shared
  （跨进程类型单源）。
- 不变量族 INV-156..167 登记（docs/invariants.md）；持久性承诺=进程
  崩溃级（不承诺掉电）。
- 草稿四态迁移（drafting/commit 窗/去重判据/再水化）与 ws-entry 屏障
  为配套语义。
- 设计单源=仓外档案区 scripts-audits/20261019-fvisfb65-impl/
  65-design-final.md。
- 注记（B4-B/ADR-0032，2026-11-25 文档债补写）：上文裁决中「clean 四源：
  flush 全成功/undo 回基线/切图弃置/干净退出」的 undo 回基线与切图弃置
  两源已随 B4-B 取代——undo/redo 经 history-unit 落库后队列空才构成
  clean 化挂点（非快照回基线；INV-161 修订行），dirty 切图弃置确认框已
  退役（切换 flush-first；课题切换弃置仍为 release 面）；per-folder
  recoveryOwner 是调度归属不是多槽（单槽恒一不变）。
- 限制（B4-B 回写；用户裁决 D-1＝甲、适用面＝乙、R4）：撤销/重做被
  history-unit 以 CONFLICT 拒绝的历史项，由用户在保存错误行点击「丢弃这条
  过期历史」并确认后移除。适用面=四种 CONFLICT 拒因（`HISTORY_STALE`、
  `HISTORY_PAPER_MISSING`、`HISTORY_FOLDER_MISSING`、`HISTORY_GRAPH_INVALID`
  ——值域单源=`src/shared/ipc/lineage-history.schemas` 的
  `HISTORY_UNIT_CONFLICT_REASONS`）；系统失败不给该出口。出口只在 edit 模式
  工具组的保存错误行可见，browse/focus 模式下撤销被拒只有 toast——是否
  在这两个模式给入口留 B5 评估。
  〔B5 演进注记 2026-11-26：R4 edit-only 限制已由 ADR-0033 翻案——告警与
  丢弃出口挂稳定 Page 外壳，edit/browse/focus 三模式可达；本节保留为历史
  决策记录。〕
