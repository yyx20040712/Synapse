# HANDOFF —— 下一会话续接指南（2026-08-21 晚）

> 本文档为「骨架收尾」交接快照。读完后按「剩余步骤」执行即可，无需回溯历史会话。
> 规则正本：`AGENTS.md`（AI 宪法）+ `docs/architecture.md`。

## 当前状态（已全部完成 ✅）

- **源码约 120 文件**：`src/shared` 契约（冻结）、强模块 17 个（已实现）、规约化 stub 55 个工单
- **测试**：47 文件 / 185 用例——62 过、123 按工单延期（guardedDescribe）、0 挂
- **`npm run verify` 全绿**：lint → typecheck → vitest → electron-vite build
- **e2e smoke 通过**（2 过 + 1 按工单延期）：应用可启动、侧栏三入口可切换
- **better-sqlite3 双 ABI 方案**：`scripts/sqlite-abi.mjs`（abi-cache 两份预编译；
  npm scripts 已接线——`test` 前切 node 绑定，`build/dev` 前切 electron 绑定，postinstall 自动 setup）
- **依赖**：electron 33.4.11 / better-sqlite3 12.11.1 / pdfjs-dist 4.10.38 / react 18.3.1；
  npm 12 的 allowScripts 已批准三包（package.json 内已有字段）
- **当日攻克的坑**（均已修复，勿回退）：
  - `registerIpc` 禁止在注册期探测 handlers（unimplementedObject 代理访问即抛）——fn 取用必须在 invoke 闭包内
  - FTS 用 **trigram** 分词器（unicode61 对中文无子串匹配）；repo 搜索策略：≥3 字 FTS / 短词 LIKE
  - `isPdfBytes` 要求 `%PDF-` 后跟版本数字；shell-guard 拒绝一切 IPv4 字面量；
    `app-file://` URL 只允许 `scheme://<id>` 可带尾斜杠

## 剩余步骤（按序，本会话未做）

1. **git 基线**：系统 PATH 无 git，用 `"E:\class\智慧水务\tools\MinGit\cmd\git.exe"`。
   在 `E:\class\智慧水务\Synapse_remake` 执行：`init` → `config --local user.name "user"` /
   `config --local user.email "user@local"` → `add -A` → 首次 commit
   （信息：`骨架基线：契约+强模块+规约化stub+测试系统`）。
   ⚠️ 只读文件（若已设只读）git add 不受影响；.gitignore 已就位（node_modules/out/dist 等）。
2. **锁机制上线**：`npm run locks:apply`（生成 locks/manifest.json + 设只读）→
   再次 commit（信息末尾必须带 `[locked-change]` 尾注）→ `npm run locks:check` 确认绿。
3. **三道关卡快检**：`node scripts/check-quality.mjs`、`node scripts/check-tickets.mjs`（应输出：
   72 工单 / open 55（weak 52，strong 3））。
4. **（可选）推送 GitHub 启用 CI**：用户提供远端后 push；CI 六关卡在
   `.github/workflows/ci.yml`。推送后确认 Actions 真实跑绿（教训 E1：防线要通电）。
5. **最终汇报**：向用户交付——工单统计、防线状态、弱模型填充工作流
   （领单：`tickets/registry.ts` → 读文件头规约 + 对应锁定测试 → 实现 → verify 绿 →
   人工翻状态合入；流程详见 `AGENTS.md` 与 `docs/DEVELOPMENT.md`）。

## 环境事实

- Node 24.18 / npm 12（install-scripts 需 allowScripts，package.json 已配）
- 网络代理 127.0.0.1:7890；GitHub 直连不稳 → `.npmrc` 已配 npmmirror 镜像（electron +
  better-sqlite3 二进制）；`scripts/sqlite-abi.mjs` 下载也是 GitHub 优先、npmmirror 兜底
- e2e：先 `npm run build` 再 `npx playwright test`（`npm run test:e2e` 已含）
- electron 调试：`SYNAPSE_USER_DATA=<临时目录> node_modules\electron\dist\electron.exe out\main\index.js`

## 工单全景（tickets/registry.ts）

- infra（strong/done）17 个；open 55 个 = weak 52（repos×5 / services×10 / providers×3 /
  ipc×9 / UI×22 / hooks×2 / reader 弱件×6...以 registry 为准） + strong-open 3
  （SR-RDR-01/02/03：annotation-anchor、PdfCanvas、TextLayer——Phase 3 阅读器决策门）
- 后续阶段：Phase 1 repos → Phase 2 导入+文献库 UI → Phase 3 阅读器（strong 工单 +
  pdf.js spike 决策门，见 docs/adr/0002）→ Phase 4 标注笔记 → Phase 5 增强导出 → Phase 6 打包
