# AD-7：已记录的取舍与地雷（Phase 3 开工前系统性检查轮沉淀）

日期：2026-08-22 · 状态：已接受（登记性质；第 3–6 节为第二轮检查增补）

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

## 3. 尾注防线是"君子协定"——无人类审批绑定（第二轮 #3）

CI 的 `[dep-change]`/`[locked-change]` 检查只校验提交信息字符串：AI 可以自己跑
`locks:apply` 重生成 manifest、自己写尾注。防线设计上**接受**这一点——对抗面是
"弱模型领单流程中不顺手改契约"，不是主会话本身；真正的关是工单工作流第 4 步
（人类审查 git diff 后翻状态）。配套纪律：**禁止强推 main**——`github.event.before`
失效时两道尾注检查按"基线不可用"兜底整段跳过；如需硬保障应在 GitHub 侧配分支
保护（本地不可代劳）。

## 4. sqlite-abi 缓存完整性无校验（第二轮 #6）

- `existsSync` 即认缓存有效、下载无 checksum：进程被杀留下的截断 `.node` 会被
  永久采用（node 绑定有 require 自校验兜底，electron 绑定只能到运行时才炸）。
  缓解：异常时删 `abi-cache` 重跑 setup。
- 缓存目录名不含 better-sqlite3 版本号：npm 正常重装会整目录替换（自愈）；手工
  保留缓存跨版本升级可能错配——**升级 better-sqlite3 时必须删 abi-cache**。
- ABI 选择已修为按运行时精确命中（第二轮 #1，commit 2189c09），不再取最大号。

## 5. 防线已知盲区（低优先级登记，暂不修）

- `check-quality`：'TO DO' 变体可绕过占位扫描；只扫静态 `from '...'` 导入，
  动态 `import()`/路径别名可绕分层与跨 feature 检查（ESLint import 关卡补位）。
- `check-tickets`：路径分隔符硬编码 Windows（`replaceAll('/','\\')`）——
  Linux/WSL 本地跑 verify 会全红（fail-closed 方向，非安全问题）。
- `check-locks` 跳过 coverage 目录而 quality/tickets 不跳：跑过 `--coverage` 后
  理论上可误红。
- 工单锁定测试的覆盖面窄是历史根因（两轮 bug 的共同放行通道）：工单任务书
  规约三句已入 ROADMAP 执行纪律第 6 条，新工单测试要求见 AGENTS 测试纪律。

## 6. 第二轮 #4 核查结论：shell-guard 逃逸指控不成立（防再误报）

报告称整数/十六进制 IPv4 主机名（`https://2130706433` 等）可过守卫——复跑证伪：
WHATWG URL 解析（Node 与 Chromium 同规范）在 `new URL()` 阶段已把全部 IPv4 简写
形态规范化为点分 hostname，点分正则即全形态覆盖。已补 4 条回归向量锁死该前提
（commit 5cde904）。教训：**审查报告的"已实锤"同样需要复跑验证**（本报告的
#1/#5 实锤复跑成立，#4 不成立）。
