# ADR-0027：恢复副本统一管理（WPS 式丢稿防御——单一服务/单槽/类型注册表）

- 状态：accepted（2026-10-19，F-VISFB-65 实施批随批落档）
- 关联票：F-VISFB-65（63 号 C2 簇后果根治）；设计链=kimi 拟定两轮+deepseek 对抗两轮+主控终裁 v3（批档=仓外 20261019-fvisfb65-impl/65-design-final.md）

## 背景

成熟桌面办公软件丢稿防御三道防线（恢复副本/自动暂存落盘/关闭确认）中，本项目仅有第三道
（脏标记+关窗确认，F-VISFB-63/64 已落地）。63 号裁决部 C2 簇暴露的后果（save 撞 CONFLICT
静默蒸发/幽灵页面态/quit 零确认丢稿）需要前两道补位。用户裁决（2026-10-17 逐字）：
「wps式，但注意恢复副本是一个新的数据类型，需要统一管理，且副本数目越少越好节约空间。」

## 候选

1. **集中式恢复服务+类型注册表（采纳）**：main 侧单一 recovery 服务，单一存储位
   `<userData>/recovery/<workspaceId>/<fileName>`，shared 侧 RECOVERY_REGISTRY 为命名/
   schema/生命周期单源（为未来 reader 草稿族预留同一管理位）；每 (工作区,类型) 单槽覆写。
2. feature 散落自建（各写面自存自管）——被用户约束 a 直接否决（禁散落自建）。
3. 版本链/多槽——被「副本数目越少越好」否决（恒至多一份）。

## 裁决（含对抗链终裁要点）

- 消费=takeOver 超越制：恢复=读副本→载入→以原载荷原样回写同槽（携 takeOverToken 双校验
  token+epoch）——无「先删后写」空窗；外会话未决副本拒覆写（pending）。
- 删除=release token 作用域（clean 四源：flush 全成功/undo 回基线/切图弃置/干净退出——仅
  删本会话自有副本 token；恢复条放弃=discard 可删外会话 token）；先删文件成功再推进
  per-type epoch（epoch 删除屏障——旧 epoch 迟到写不复活）。
- 与 DB 落库解耦：flush 出队触发 fire-and-forget 恢复读（重放由 WriteAction 幂等兜底——
  remove 族缺席=0 幂等、upsert 族 id 键幂等；重放尾无硬上界）。
- 退出窗 1500ms fail-open；非自有文件（invalid/foreign-version/高版本）永不自动删除。
- CONFLICT 降级询问仅 floating-note upsert ghost-folder 族（三联判据 kind+code+reason；
  AppError 增可选 reason 字段承载——Result 信封结构化透传）。

## 后果

- 新增 recovery 服务域+四 IPC 通道（peek/save/read/release——api-surface 域计数 +1）；
  writeActionSchema 自 renderer 迁 shared（跨进程类型单源）。
- 不变量族 INV-156..167 登记（docs/invariants.md）；持久性承诺=进程崩溃级（不承诺掉电）。
- 草稿四态迁移（drafting/commit 窗/去重判据/再水化）与 ws-entry 屏障为配套语义。

## 修订记录

- 2026-10-19 随 F-VISFB-65 实施批首录（门一回炉轮并入：takeOver 失败回滚+remap 收尾
  folder 矫正+启动窗冻结三项设计补充）。
