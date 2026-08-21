# AGENTS.md —— AI 协作宪法（给所有代理的硬规则）

> 本文档的每条规则都有历史事故对应（见 `AI辅助开发经验教训.md`）。
> CI 会强制其中可机检的条目；不可机检的靠审查。**规则冲突时以本文为准。**

## 项目一句话

单人使用的本地学术文献管理 + PDF 阅读标注桌面应用（Electron + 纯 TypeScript）。

## 硬规则（违反即返工）

### 代码组织

- **文件 ≤500 行**（ESLint `max-lines` error）。repo ≤300 行、组件 ≤250 行。出现第二职责就拆文件。
- **分层单向**：`ipc → services → repos → db`；`renderer → window.api → ipc`。禁止跨层（ESLint 强制）。
- **方案切换 = 删除旧方案**。不允许两套 PDF 方案、两个 ORM 并存（教训 E5/B3）。
- **死代码即删**：孤儿组件、重复资产（pdf.js worker 只允许一份）。提交前确认新文件被引用。
- **类型单一真相源**：一切跨进程类型来自 `src/shared/`；类型变更 = [locked-change] 流程。禁止手写两份等价类型。
- 重复 3 次以上的逻辑抽函数；第 2 次保持重复（Rule of Three）。

### 安全禁令（否定式，一条都不许碰）

- 禁止 `nodeIntegration: true` / `webSecurity: false` / `sandbox: false` / `contextIsolation: false`
- 禁止 renderer 引入任何 Node/Electron API 或绝对文件路径（路径只能来自 main 侧系统对话框）
- 禁止对未过 `shell-guard` 校验的 URL 调 `openExternal`
- 禁止字符串拼接 SQL；一切语句 `db.prepare` 预编译 + 参数绑定；FTS 输入必须经 `escapeFtsQuery`
- 禁止 `eval` / `new Function` / `unsafe-eval`（CSP 已封死）
- 禁止新增出网 host（白名单在 `src/shared/constants.ts`，新增需 ADR + [locked-change]）

### 完成定义（Definition of Done）

- [ ] `npm run verify` 全绿（quality + tickets + locks + lint + typecheck + test + build，与 CI 同口径，不是 README 数字）
- [ ] `grep` 无 `TODO|FIXME|placeholder`（CI quality 关卡）
- [ ] 无乱码：中文内容工具验证可读（CI mojibake 关卡）
- [ ] `git diff --stat` 无范围蔓延
- [ ] 占位实现已删除；工单在 `tickets/registry.ts` 翻状态
- [ ] 新增受锁文件已 `npm run locks:apply`

### 测试纪律

- **测试是锁定的合约**：禁止修改 `tests/**`、`**/*.test.ts`、`src/shared/**`（CI sha256 对账）。发现测试本身有错 → 报告人类，走 `[locked-change]`，**不得自行修改让代码通过**。
- **每个测试必须能失败一次**（写完先红再绿；恒真断言 = 假阳性，比没测试更危险）。
- 修核心模块（渲染/数据层）前先跑它的测试；改完再跑。
- e2e 必须断言"渲染出真实文本"（历史：52 测试全绿但文字不可见）。

### 工单工作流（弱模型领单专用）

1. 读 `tickets/registry.ts` 找 `status: 'open'` 且 `owner: 'weak'` 的工单。
2. 打开工单文件，**文件头五层规约就是完整任务书**；先读它对应的锁定测试。
3. 只改这一个文件（+ 必要时新文件）。禁止顺手实现别的工单、禁止改契约、禁止改测试。
4. `npm run verify` 绿 → 报告人类审查 `git diff` → 人类翻 registry 状态 → 提交。
5. 卡住了就停，报告卡点；**不许删检查、不许放宽断言、不许引入新依赖**。
6. 测试红了先怀疑自己的实现；确认是测试/契约问题 → 停下报告。

### 依赖与提交

- **禁止新增依赖**，确需新增 → 先 ADR + [dep-change] 尾注。运行时依赖预算 ≤15 个。
- `package.json`/lockfile 变更必须带 `[dep-change]` 尾注（CI 检查）。
- 受锁文件（tests/shared/migrations/CI/lint/构建/测试配置/脚本）变更必须带 `[locked-change]` 尾注。
- 每次 AI 改动一个逻辑单元一个 commit；提交前 `git diff --stat` 自查。
- 中文一律 UTF-8；Windows 下写文件后验证可读。

### 明确不做（v1 负面清单——防止顺手实现）

知识图谱、翻译、PDF 下载管线（CARSI/CDP/Sci-Hub）、Scopus/WoS、插件系统、i18n 多语言、云同步、EPUB、多窗口、遥测、后台自动网络任务（增强只手动触发）、Markdown 富文本编辑器（textarea 即可）。

## 环境事实

- Windows + Electron 42（42.9.3，2026-08-22 升级门执行，ABI 146）+ Node 24（本地与
  CI 一致；engines 仍 >=20，但 CI 用 20 会因 better-sqlite3 v12.11.1 缺 node-v115
  预编译而源码编译失败——首跑实证，勿改回）
- **升 Electron 前先查 prebuild 矩阵**（教训实证 2026-08-22）：Electron 43（ABI 148）
  在 better-sqlite3 12.11.1 上无 win32 预编译，而带 v148 的 12.11.2/12.12.0 只有
  GitHub release 未发 npm、v13.x 无任何 win 预编译——故落 42（v146 现成）。
  版本→ABI 映射数据源：npm 包 `node-abi`（registry.npmmirror.com 可下）
- **Electron 42 起 npm 包无 postinstall**（41 尚有、42 移除，实证）：二进制改为首次
  require 时同步懒下载（卡在意想不到的位置）——postinstall 已显式串 `install-electron`
  （幂等，dist 在则秒过），把下载失败暴露在 npm install 阶段；bin 由 electron 包提供
- 网络代理 127.0.0.1:7890；GitHub 直连不稳 → `.npmrc` 已配 npmmirror 二进制镜像
  （electron + better-sqlite3），`scripts/sqlite-abi.mjs` 下载 GitHub 优先、镜像兜底
- better-sqlite3 是 V8 直接绑定（随 Node/Electron ABI 变化，**不是** N-API 通用件）；
  双 ABI 由 `scripts/sqlite-abi.mjs` 管理（abi-cache 两份预编译，npm scripts 自动切换）
- 全部命令收敛：`npm run verify` / `npm run dev` / `npm run test:e2e`（需先 build）
- git 在 `E:\class\智慧水务\tools\MinGit`（若系统 PATH 没有全局 git）；远端 origin 已配
  github.com/yyx20040712/Synapse。MinGit 默认 schannel 经代理握手失败——已配
  repo-local `http.sslBackend=openssl` + 自带 CA bundle（勿删 .git/config 里这几行）
- 行尾纪律：仓库根 `.gitattributes` 强制 LF（locks 的 sha256 以 LF 为准，勿删）
