# AD-7：已记录的取舍与地雷（Phase 3 开工前系统性检查轮沉淀）

日期：2026-08-22 · 状态：已接受（登记性质，不含当次代码改动）

本轮系统性 Bug 检查确认修复之外，以下两项为**有意保留的设计取舍/潜在地雷**，
仅登记不改动；触碰相关区域时必读。

## 1. 大 PDF 元数据解析在主进程同步执行

`pdf-meta.extract.ts` 走纯字节解析路线（无 pdfjs-dist 依赖约束，见其架构层注释）：
多次全文件朴素扫描 + 每流二进制串化 + `inflateSync` 同步解压。几百 MB 的扫描版
PDF 在导入期间会阻塞主进程（全部 IPC 卡住）。

- 取舍依据：单人本地工具、典型文献 PDF 数 MB 级、无新增依赖约束下的最简实现。
- 触发条件：单文件 >100MB 或批量导入超大文件时可感知。
- 将来缓解路径（按需，需先实测）：`worker_threads` 卸载解析，或先读头部/尾部的
  采样解析。**在 SR-SVC-05 增强链或用户实际报告卡顿之前不动。**

## 2. FTS 触发器 × ON DELETE CASCADE：级联删除不清理 FTS 索引

`connection.ts` 的 pragma 未开 `recursive_triggers`；SQLite 的外键级联删除
（`papers → annotations/notes/tags` 及关联表）不触发 `*_fts_ad` 触发器——
直接 `DELETE FROM papers` 会在三张 FTS 表留下**永久孤儿**（rowid 复用后会查出
错行）。

- 当前安全的原因：v1 负面清单无删除文献功能，`DELETE FROM papers` 不可达。
- **将来实现删除文献时必须二选一**：应用层级联（事务内显式 DELETE 各 FTS 表，
  经 `repos.withTransaction`）或开启 `recursive_triggers` 并补回归测试。
  在此之前禁止任何人手工/工具直接删主表行。
