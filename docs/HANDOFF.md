# HANDOFF —— 下一会话续接指南（2026-08-21 深夜，生产级加固后）

> 本文档为快照。规则正本：`AGENTS.md`（AI 宪法）+ `docs/architecture.md`。
> 弱模型填充工作流见 `docs/DEVELOPMENT.md` §2。

## 当前状态（已全部完成 ✅）

- **git 基线 + 锁机制 + CI 就绪**：13 个提交；75 个受锁文件（manifest+只读）
- **生产级加固轮（2026-08-21）已全部落地**：审查发现的 P0/P1/P2/P3 全部修复，
  唯一例外是 Electron 33 升级——按 `docs/adr/0006` 延期至 Phase 6 打包门
- **`npm run verify` 全绿**：lint → typecheck → vitest（71 过 / 123 按工单延期）→ build
- **e2e**：3 过（smoke 含 preload/CSP 运行时断言）+ 1 按工单延期（reader-text）
- **三道关卡全绿**：quality（含行数分级+解析路径分层）/ tickets（含 tests 工单号扫描）/
  locks（75 文件一致）

## 加固轮新增的硬约束（后续开发不得回退）

- **`.gitattributes` 强制 LF**：locks 的 sha256 以 LF 为准，勿删（CI/fresh clone 会炸）
- **preload 是 CJS（out/preload/index.cjs）**：沙箱渲染器不支持 ESM preload；
  zod 由 electron.vite 配置打进 bundle（沙箱只许 require('electron')）
- **CSP 单真相源**：策略只在 `src/main/security/csp.ts`，构建期 cspMetaPlugin 注入
  index.html；源码 html 禁止手写 meta（契约测试+e2e 断言双锁）
- **出网重定向一律不跟随**（redirect:'error'）+ 响应体 20MB 上限（http-client）
- **file-store 原子写**（temp+rename）；错误消息不含本机路径
- **权限请求 handler 挂在 session 上**（`webContents.session.setPermissionRequestHandler`，
  webContents 上没有这个方法——踩过的坑）
- **migrate 可注入 migrations 参数**（测试验证回滚用）
- **check-tickets 扫描 tests/** 的工单号引用：测试里只能用真实存在的工单号
- **guard.ts 未知工单号当场抛错**：不允许静默 skip

## 剩余步骤

1. **（待用户）推送 GitHub 启用 CI**：`.github/workflows/ci.yml` 已按生产标准强化
   （fetch-depth 0 + origin/main..HEAD 尾注范围检查 + timeout/concurrency + 失败产物上传）。
   推送后确认 Actions 真实跑绿（教训 E1：防线要通电）。
2. **主线开发**：按 Phase 1（repos SR-DB-01~05）→ Phase 2（导入+文献库 UI）→
   Phase 3（阅读器，SR-RDR-01/02/03 决策门 + docs/adr/0002）→ ……
3. **Phase 6 打包前**：按 `docs/adr/0006` 升级 Electron 至当期支持线（[dep-change] +
   `scripts/sqlite-abi.mjs` 的 ELECTRON_ABI_MAP 补表 + e2e 全绿）。

## 环境事实

- Node 24.18 / npm 12（本地）；CI Node 20
- 网络代理 127.0.0.1:7890；`.npmrc` 配 npmmirror 二进制镜像
  （electron + better-sqlite3；`scripts/sqlite-abi.mjs` GitHub 优先、镜像兜底）
- better-sqlite3 是 **V8 直接绑定**（非 N-API）：双 ABI 由 sqlite-abi.mjs 切换
- e2e：先 `npm run build` 再 `npx playwright test`（`npm run test:e2e` 已含）
- electron 调试：`SYNAPSE_USER_DATA=<临时目录> node_modules\electron\dist\electron.exe out\main\index.js`
- git 在 `E:\class\智慧水务\tools\MinGit\cmd\git.exe`；已加 safe.directory + LF 纪律

## 工单全景（tickets/registry.ts）

- infra（strong/done）17 个；open 55 = weak 52 + strong 3
  （SR-RDR-01/02/03：annotation-anchor、PdfCanvas、TextLayer——Phase 3 决策门）
- 领单流程：registry 找 open+weak → 读文件头五层规约 + 对应锁定测试 → 实现 →
  verify 绿 → 人工审查翻状态（详见 AGENTS.md / DEVELOPMENT.md）
