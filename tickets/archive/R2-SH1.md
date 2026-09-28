# R2-SH1 票面归档（F-GOV-01）

- id: R2-SH1
- file: src/main/bootstrap.ts
- area: infra
- owner: strong
- status: done

## summary 原文

应用重命名 Synapse Remake→Synapse+userData 数据迁移（U3a——独立成票单独审计·handoff §8；⚠landmine=userData 目录名派生自 productName=用户真实数据目录搬迁，复用 WS1 幂等模式）：package.json name/productName 同步+文本消费位（main-window 标题/App 品牌位/index.html title 超票面发现+受锁 smoke.spec/app-shell.test 断言）+grep 口径修正（消费/注释面清零；迁移模块+测试功能面字面量 6 处=契约钉死豁免——门一 W1 结构性调和裁决）；迁移=独立模块 migrate-user-data.ts（纯 node:fs 零 electron 可测性）bootstrap 最早段——分支矩阵：旧在新无→renameSync 原子迁移+显式 setPath（Electron 启动期缓存派生值=实现者超票面发现，userDataDir 取值在迁移后=时序无竞态主控独立核实+门一交叉验证）；新已存在→跳过（天然备份）；皆无→全新；rename 失败→回落旧路径运行（数据安全优先）+warn；受锁=constants 邮箱域/smoke/app-shell 三件+新测试 5 it（分支矩阵全测+setPathCalls 显式断言）+locks 166；门一 B0/W3/N10（W-G1 electron-builder.yml 钉旧名=票面「无安装器面」前提失实→主控直改 productName/artifactName；W-G2 ci 强制 [dep-change]→收口双尾注；W-G3 lockfile root name→主控直改）+门二 PASS 零回炉（grep 亲测 6 命中分类正确+sha256 独立复算逐位命中）；W4 local-state.mjs 取证器路径随收口改（新目录优先+旧名兜底）；**真机迁移验证（备份-换装舞步）**：39M 真实库 tmp 全备份→首启=窗口标题 Synapse+双课题结构完整迁入新位+旧位 rename 走→二启幂等（跳过分支+旧位零重建）；verify exit=0（888 用例=883+5 精确命中）+e2e 全量 26；提交双尾注 [locked-change]+[dep-change]——票面/三报告/收口单在档

> 归档于 F-GOV-01（2026-09-28）；registry 主表已瘦身为结论句+本件指针
