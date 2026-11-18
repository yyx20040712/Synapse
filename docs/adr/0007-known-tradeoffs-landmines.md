# ADR-0007：已登记取舍与地雷（登记性地雷在册）

日期：2026-08-22 · 状态：已接受

## 背景

系统性 Bug 检查轮确认修复之外，以下问题定为「有意保留的设计取舍/潜在地雷」：仅登记不改动，触碰相关区域时必读。本 ADR 是这类问题的登记册，条目随事实变化更新现状描述。

## 裁决

以下各项登记在册，维持现状。

### 1. 大 PDF 元数据解析在主进程同步执行

`src/main/services/import_/pdf-meta.extract.ts` 走纯字节解析路线（无 pdfjs-dist 依赖约束，见其架构层注释）：多次全文件朴素扫描+每流二进制串化+`inflateSync` 同步解压。几百 MB 的扫描版 PDF 在导入期间会阻塞主进程（全部 IPC 卡住）。

- 取舍依据：单人本地工具、典型文献 PDF 数 MB 级、无新增依赖约束下的最简实现。
- 触发条件：单文件 >100MB 或批量导入超大文件时可感知。
- 缓解路径（按需，需先实测）：`worker_threads` 卸载解析，或先读头部/尾部的采样解析。在用户实际报告卡顿之前不动。

### 2. FTS 触发器 × ON DELETE CASCADE

`src/main/db/connection.ts` 的 pragma 未开 `recursive_triggers`（`DB_PRAGMAS` 只含 foreign_keys=ON 等，无该项）。当初登记的推论：外键级联删除（papers → annotations/notes/tags 及关联表）不触发 `*_fts_ad` 触发器，直接 `DELETE FROM papers` 会在 FTS 表留下永久孤儿（rowid 复用后查出错行）。登记时的安全前提=无删除文献功能，`DELETE FROM papers` 不可达；并预登了实现删除文献时的二选一条件：应用层级联（事务内显式清各 FTS 表，经 `repos.withTransaction`），或开启 `recursive_triggers` 并补回归测试。

- 现状：删除文献路径已落地，走的是第三条路——文件夹域删除（INV-NEW-3）与单篇删除通道均直接 `DELETE FROM papers`，级联清理由现行引擎的触发器行为承担。现行引擎（SQLite 3.53.4）实测级联删除会触发 AFTER DELETE 触发器，FTS 零孤儿（2026-11-18 基线 schema 内存库探针：删 papers 行后 papers_fts/notes_fts/annotations_fts MATCH 零残留）——与当初基于文档推论的行为不同。回归锚在位：tests/unit/services/papers-delete.test.ts（单篇直删 FTS 零残留）、tests/unit/services/folders-delete-domain.test.ts（域删 FTS 正负对照）。
- 引擎升级复核条件：该清理行为依赖 SQLite 版本行为（非 SQL 标准保证），升级 better-sqlite3（SQLite 引擎随动）时须复测级联×FTS 用例。
- 仍然禁止绕过应用手工/工具直接删主表行：该路径无应用层验证。

### 3. 尾注防线是「君子协定」——无人类审批绑定

CI 的 `[dep-change]`/`[locked-change]` 检查只校验提交信息字符串：AI 可以自己跑 `locks:apply` 重生成 manifest、自己写尾注。防线设计上接受这一点——对抗面是「弱模型领单流程中不顺手改契约」，不是主会话本身；真正的关是工单工作流的人类审查步（审查 git diff 后翻状态）。配套纪律：**禁止强推 main**——`github.event.before` 失效时两道尾注检查按「基线不可用」兜底整段跳过；如需硬保障应在 GitHub 侧配分支保护（本地不可代劳）。

### 4. 防线已知盲区（低优先级登记，暂不修）

- check-quality：带空格的占位标记拆写变体可绕过占位扫描；只扫静态 `from '...'` 导入，动态 `import()`/路径别名可绕分层与跨 feature 检查（ESLint import 关卡补位）。
- check-locks 跳过 coverage 目录而 quality/tickets 不跳：跑过 `--coverage` 后理论上可误红。
- 工单锁定测试的覆盖面窄是历史根因（早期两轮 bug 的共同放行通道）：工单任务书规约已入 ROADMAP 执行纪律，新工单测试要求见 AGENTS.md 测试纪律。

### 5. shell-guard 逃逸指控不成立（防再误报）

报告称整数/十六进制 IPv4 主机名（如 `https://2130706433`）可过守卫——复跑证伪：WHATWG URL 解析（Node 与 Chromium 同规范）在 `new URL()` 阶段已把全部 IPv4 简写形态规范化为点分 hostname，点分正则即全形态覆盖。已补 4 条回归向量锁死该前提。教训：**审查报告的「已实锤」同样需要复跑验证**（本册第 1 项与盲区项复跑成立，本项不成立）。

登记项沿革：本册曾登记「sqlite-abi 缓存完整性无校验」一项（双 ABI 切换机制时代的缓存风险：`existsSync` 即认缓存有效、下载无 checksum、缓存目录不含 better-sqlite3 版本号）。该机制已随 better-sqlite3 v13 N-API 化整体退役（ADR-0006 执行记录段二），条目随之失效撤册。
