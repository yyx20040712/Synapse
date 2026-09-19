# ADR-0020：应用改名与 userData 目录迁移（Synapse Remake → Synapse）

- 日期：2026-08-29 落地（R2-SH1 工单）；2026-09-19 F-DOCGOV-01 补档 ADR 化
  （此前该决策仅存在于 registry 票面+代码头注——体检「未定义特性」项）
- 状态：已裁决并执行（真机迁移验证在档）
- 关联：R2-SH1 工单（tickets/registry.ts）/src/main/migrate-user-data.ts（行为
  单源）/ADR-0018（课题分目录——本迁移先于课题布局执行）/DEV-SETUP §5

## 背景

应用 productName 由「Synapse Remake」改为「Synapse」。Electron 的 userData
目录名派生自 productName——改名即用户真实数据目录搬迁（landmine 性质：
非仅显示名变更）。复用 R1-WS1 workspace.fs 的幂等迁移模式，独立成票单独审计。

## 决策

1. **改名范围**：package.json name/productName 同步+main-window 标题/App 品牌
   位/index.html title+electron-builder 产物名（artifactName）——文本消费位
   grep 口径清零（迁移模块/测试功能面字面量 6 处=契约钉死豁免）。
2. **迁移模块独立**：migrate-user-data.ts 纯 node:fs/node:path（零 electron
   import，node 环境 vitest 可测）；bootstrap 最早段调用（SYNAPSE_USER_DATA
   override 时跳过——e2e/取证零影响；ensureWorkspaceLayout 课题布局之前）。
3. **四分支幂等矩阵**（行为单源=src/main/migrate-user-data.ts 头注）：

   | 条件 | 动作 |
   | --- | --- |
   | 新路径在（含首迁中断残留） | 跳过：零改动旧目录、零 setPath（幂等；旧目录原位保留=天然备份） |
   | 旧在新无 | renameSync 整体迁移（同卷原子，无半迁移态）+ setPath 新路径 |
   | 皆无 | 全新安装语义：零动作（目录由 Electron 按需建） |
   | rename 抛错（占用/权限） | 不 fallback 复制、不动旧目录：setPath 回落旧路径继续运行（**数据安全优先于重命名完成**）+warn 留痕 |

4. **时序**：迁移在 bootstrap 内先于一切 userDataDir 消费；Electron 启动期缓存
   派生值经显式 setPath 处理（实现者超票面发现，主控独立核实+门一交叉验证）。
   二启命中跳过分支（幂等）；判定以路径存在性为准不比对内容。

## 后果

- 用户数据目录= `%APPDATA%\Synapse\`（旧 `Synapse Remake` 首启自动迁入，旧位
  原样保留）；备份指引随改（DEVELOPMENT §6 已同步）。
- 测试：tests/unit/main/migrate-user-data.test.ts 五用例（分支矩阵全测+
  setPathCalls 显式断言，always-active）。
- 真机验证（2026-08-29 备份-换装舞步）：39M 真实库全备份→首启双课题结构完整
  迁入新位→二启幂等（跳过+旧位零重建）。
