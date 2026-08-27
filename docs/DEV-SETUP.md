# DEV-SETUP —— 新设备开发环境引导（2026-08-27 设备迁移方案 C 固化）

> 本文档=把「新机从 clone 到 verify 全绿」所需的本机知识固化进仓库。
> 按序走完 §1~§5，任何一步卡住先查 AGENTS.md「环境事实」节。
> 基线核对数字见 §5——对不上=环境配错，停下排查勿硬闯。

## 1. 前置环境

| 项 | 要求 | 说明 |
| --- | --- | --- |
| Node | **24.x**（engines >=20 但 better-sqlite3 v12.11.1 需 node-v115 预编译，CI 用 20 会源码编译失败——勿改回） | `node -v` 核对 |
| git | 任意（系统 git / MinGit 均可） | 新机若用 MinGit 须按 §3 配 openssl |
| 网络代理 | `127.0.0.1:7890`（若新机代理不同，替换下文所有出现处） | GitHub 直连不稳是既有事实 |
| zcode CLI | 按既定规格安装（skills/插件同规格——与项目仓库无关，用户侧配置） | 项目侧零依赖 |

## 2. 克隆与安装

```bash
git clone https://github.com/yyx20040712/Synapse.git Synapse_remake
cd Synapse_remake
npm ci          # .npmrc 已入库（npmmirror 二进制镜像）；
                # postinstall 串 install-electron（幂等）——Electron 42 二进制
                # 首次 require 懒下载被前置到安装阶段，失败在此暴露
```

- npm ci 会重建 better-sqlite3 **abi-cache 双 ABI 预编译**（node/electron 两份，
  `scripts/sqlite-abi.mjs` 自动切换——npm scripts 已接线，无需手工）。
- **禁止 `npm run dev` 之外的裸 electron 启动**；全部命令收敛=verify/dev/test:e2e。

## 3. git 本地配置（clone 后必做——不随仓库走）

以下配置在本项目目录内执行（repo-local）。旧机原文绑定 `E:\class\智慧水务\`
绝对路径，新机按实际路径调整：

```bash
git config http.proxy  http://127.0.0.1:7890
git config https.proxy http://127.0.0.1:7890

# 仅当用 MinGit（schannel 经代理握手失败的既有事故）——CA 路径=你的 MinGit 实际位置：
git config http.sslBackend openssl
git config http.sslCAInfo "<MinGit路径>/mingw64/etc/ssl/certs/ca-bundle.crt"

git config user.name user        # 与既有提交身份一致
git config user.email user@local
```

- 系统 git（自带 curl+CA）通常**不需要**后两条——先 push 一次试试，失败再加。
- 行尾纪律：仓库根 `.gitattributes` 强制 LF（locks 的 sha256 以 LF 为准）——
  新机**禁改** autocrlf 相关仓库配置。

## 4. 本机状态导入（若携带了迁移包）

旧机已导出 `local-state-backup/synapse-local-state-*.tar.gz`（userData 开发
数据三件=synapse.db+files/+settings.json + 59 个 audits 原始红绿日志）。
把该文件拷到新机仓库根，然后：

```bash
node scripts/local-state.mjs list   synapse-local-state-*.tar.gz   # 先核对清单
node scripts/local-state.mjs import synapse-local-state-*.tar.gz   # 应用进程须先关闭（SQLite 锁）
```

- 日志恢复到 `scripts/audits/logs-restored/`（不直接混入——核对后自行处置）。
- 不迁移也能开发：新库=空文献库（导入 PDF 即用）；日志仅证据链用途。

## 5. 基线核对（全绿才算环境就绪）

```bash
npm run verify        # 预期 exit 0：86 文件 615 用例 / locks 132 / 工单 104 open 0
npm run build && npm run test:e2e   # 预期 20/20（e2e 不含在 verify 里，须单独跑）
```

- 数字对不上：先看是否 Node 版本≠24 / sqlite-abi 未切换（`npm run test` 内含
  切换，裸跑 npx vitest 会假红——宪法既有纪律）。
- locks 报受锁文件被改：新机**禁动** `tests/**`、`src/shared/**`、migrations、
  CI/lint/构建/测试配置（sha256 对账，改须走 [locked-change] 流程）。

## 6. 首会话开工

按 `docs/prompts/` 下**编号最大**的 handoff 开工（设备迁移专用开工书=
`2026-08-27_device-migration-handoff.md`）。宪法纪律（技能清点/分级阅读/
三屋模式）不变——见 AGENTS.md。
