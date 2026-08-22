# 开发指南（DEVELOPMENT）

面向两类读者：人类作者 与 领工单的 AI（弱模型）。弱模型请先读 `AGENTS.md`。

## 1. 日常命令

```bash
npm run verify        # 提交前必跑：quality + tickets + locks + lint + typecheck + test + build（与 CI 同口径）
npm run dev           # 开发模式（HMR）
npm run test          # vitest（单测/契约/安全）
npm run build         # electron-vite build（产物 out/）
npm run test:e2e      # Playwright（先 build）
```

## 2. 领工单流程（弱模型）

1. `tickets/registry.ts` 找 `open + weak` 工单；打开工单文件——**头部五层规约即任务书**。
2. 找到对应测试（规约头"文化层"写了路径），先读测试再写实现。
3. 只改该文件。实现完成后删除 `unimplementedObject` / 占位 JSX / `NotImplementedError`。
4. `npm run verify` 绿 → 停下等人类审查。**禁止**：改测试、改 shared、改配置、加依赖、顺手做别的工单。
5. 人类翻 registry 状态（`open → done`）→ 该工单测试自动激活 → 提交。

工单依赖顺序建议：repos（SR-DB-*）→ services（SR-SVC-*）→ ipc（SR-IPC-*）→ UI；
providers（SR-NET-*）与纯函数（bibtex/report/anchor）可并行。

## 3. 本仓库惯用法速查（防幻觉）

- **取数据**：`import { api, unwrap } from '../../api/client'`；`await unwrap(api.library.list({...}))`，失败抛 `ApiClientError`（catch 后 toast）。
- **Result 形状**：service 内抛错（`DomainError` 带 code），`register` 统一折叠；renderer 永远拿 Result。
- **新 IPC 通道**：改 `src/shared/ipc/schemas.ts` + `api-surface.ts`（[locked-change]，一般不需要）。
- **SQL**：`db.prepare('... WHERE id = ?').run(id)`；FTS 匹配串必须 `escapeFtsQuery(userInput)`。
- **多表写入**：service 层组合多条写入必须 `repos.withTransaction(() => {...})` 包裹
  （attach 失败整体回滚，防"failed 的文献已入库且 sha 被占用"半写状态）。
- **时间/ID**：`new Date().toISOString()` / `crypto.randomUUID()`。
- **样式**：颜色一律 `var(--accent)` 等主题变量（theme.css）；Tailwind 只用于布局类（flex/p-2/text-sm）。
- **zod**：一律 `.strict()`；带默认值字段在 z.input 侧可省略。
- **不要**：axios/dayjs/lodash/immer——用原生 fetch/Date/展开运算符/Zustand set。

## 4. 覆盖率门槛收紧计划

骨架期全局 40%（大量工单未实现）。收紧节奏（改 vitest.config.ts 需 [locked-change]）：

| 时点 | 动作 |
| --- | --- |
| Phase 1 完成（repos 全绿）✅ 2026-08-21 | repos 层 85% 已生效（实际 ~90%）；services 门槛待其工单完成后随全局线收紧 |
| Phase 2 完成（library UI） | renderer 逻辑层 60%（需先把 renderer 逻辑文件纳入 coverage.include，随 [locked-change]） |
| Phase 5 完成 | 全局 lines ≥70% |

## 5. 排错

- vitest 报 window 未定义：renderer store 测试须先 `vi.stubGlobal('window', { api: 桩 })` 再动态 import。
- e2e 起不来：确认先 `npm run build`；e2e 用 `SYNAPSE_USER_DATA` 隔离数据。
- 手动调试主进程（不进 dev、直接跑产物）：
  `SYNAPSE_USER_DATA=<临时目录> node_modules\electron\dist\electron.exe out\main\index.js`
  （bootstrap 失败会 console.error + 原生错误框）。
- better-sqlite3 ABI 报错：它是 V8 直接绑定（Node/Electron 各需一份），由 `scripts/sqlite-abi.mjs` 自动切换（按当前运行时精确 ABI 选缓存，缺哪个会点名报错，如
  `abi-cache 缺 electron-v146 绑定`）；若手动动过 `node_modules`，重跑 `npm ci`
  （升级 better-sqlite3 版本时必须删 abi-cache，见 ADR-0007 §4）。
- 中文乱码：统一 UTF-8；PowerShell 重定向用 `Out-File -Encoding utf8`；CI 有 mojibake 关卡兜底。

## 6. 数据位置与备份（用户需知）

- 数据库：`%APPDATA%\Synapse Remake\synapse.db`（WAL 模式，运行时会伴生
  `synapse.db-wal` / `synapse.db-shm` 侧车文件）。
- 受管 PDF：`%APPDATA%\Synapse Remake\files\<sha 分桶>\<sha256>.pdf`（内容寻址，天然去重）。
- 设置：`%APPDATA%\Synapse Remake\settings.json`（contactEmail / theme）。
- **备份方法：完全退出应用后，整个 `%APPDATA%\Synapse Remake` 目录复制到安全位置。**
  WAL 模式下只热复制 `.db` 而不带 `-wal` 侧车文件是不安全的（可能丢失最近写入）。
