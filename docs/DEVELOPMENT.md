# 开发指南（DEVELOPMENT）

面向两类读者：人类作者 与 领工单的 AI（弱模型）。弱模型请先读 `AGENTS.md`。

## 1. 日常命令

```bash
npm run verify        # 提交前必跑：quality + tickets + locks + lint + typecheck + test + build（与 CI 同口径）
npm run dev           # 开发模式（HMR）
npm run test          # vitest（单测/契约/安全）
npm run build         # electron-vite build（产物 out/）
npm run test:e2e      # Playwright（先 build）
npm run dist            # 打包 NSIS 安装包（镜像 env→electron 绑定→build→electron-builder，产物 dist/）
npm run smoke:installer # 安装包冒烟：静默装→沙箱启动→存活断言→静默卸载（先 dist）
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
| Phase 2 完成（library UI）✅ 2026-08-22 | renderer 逻辑层 60%（已兑现：纳入 coverage.include + 60 覆盖组，实测 81.2 lines；.tsx 组件不纳入，由 e2e 覆盖） |
| Phase 5 完成 ✅ 2026-08-22 | 全局 lines ≥70%（已兑现：四项统一收紧 70，实测 lines 76.46；repos 85 维持） |

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

## 7. 打包与分发（Phase 6 起）

- `npm run dist` 产 `dist/Synapse-Remake-<version>-setup.exe`；scripts/dist.mjs 自动编排：
  npmmirror 镜像 env（SKIP_MIRROR=1 跳过）→ sqlite-abi 切 electron 绑定 → 三段 build →
  electron-builder NSIS（electronDist 复用本地 node_modules/electron/dist，npmRebuild 关闭）。
- **新机器首跑**：winCodeSign-2.6.0 含 darwin symlink，无管理员权限解压失败——一次性预置
  `%LOCALAPPDATA%\electron-builder\Cache\winCodeSign\winCodeSign-2.6.0`（操作细节见
  docs/reports/2026-08-22_SR-PKG-01.md §4）。
- `npm run smoke:installer` 只验「装得上/起得来/卸得掉」（含卸载注册表 HKCU/HKLM 强断言）；
  全链路（导入→阅读→标注→导出）需在无开发环境的机器人工验收。
- 已知上游行为：静默卸载可留空安装目录壳（electron-builder#1298）——冒烟脚本已代清理，
  且断言文件清零与注册表清空。

## 8. 工程惯例速查（时序/接缝/不变量——防三类骨架盲区）

> 背景：工单和五层规约治理静态结构；以下惯例治理它们管不到的三个维度。宪法对应条款
> 见 AGENTS.md「状态与不变量纪律」；跨模块不变量登记册见 `docs/invariants.md`。

- **异步 store 一律带请求序号 stale-guard**（闭包 `let loadSeq = 0`，落地前
  `if (seq !== loadSeq) return`，成功/失败两路径都要守）。先例：library / notes /
  tags / reader 四个 store；新增 store 抄这个形状，锁定测试须含"迟到旧响应被丢弃"
  用例（INV-03）。
- **错误反馈两型**：动作型（load/save/增强）失败上抛或 error 字段 + 消费方 toast；
  列表型失败记 store.error 由消费方 watch（带迁移守卫：挂载残留旧错不重播）——禁止
  静默吞错（INV-02）。先例：notes.store（动作型）/ tags.store + TagEditor（列表型）。
- **状态机先行**：涉及并发时序的模块，先写态空间表（状态 × 事件 → 迁移），跨格序列
  （A 态的产物在 B 态到达）显式枚举后再实现；同类竞态第二次出现 = 重构触发线。
- **e2e 感知断言**：断言"看得见"必须查计算样式（background-color / opacity /
  mix-blend-mode），几何可见（toBeVisible）不算——历史 D1/L7 两度"测试全绿但肉眼
  不可见"（INV-06）。先例：reader-text.spec 标注链。
- **性质测试现状**：未引入 fast-check（新增依赖须 ADR + [dep-change]）；零依赖替代 =
  锁定测试内手写固定种子的伪随机操作序列攻击不变量。
- **不变量工作流**：改动跨模块行为 → 同步 `docs/invariants.md`（含锚定状态）→ 补锚
  优先级 lint/CI > 单测 > e2e > 人审。

