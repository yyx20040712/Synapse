# DEV-SETUP —— 新设备开发环境引导

本文=把「新机从 clone 到 verify 全绿」所需的本机知识固化进仓库。
按序走完 §1~§5，任何一步卡住先查 AGENTS.md「环境事实」节。

## 1. 前置环境

| 项 | 要求 | 说明 |
| --- | --- | --- |
| Node | **24.x**（engines>=22；check-quality 版本守卫非 24 即红） | **Linux=~/tools/node24 tarball**（npmmirror 下载解压：`curl -sL https://registry.npmmirror.com/-/binary/node/v24.20.0/node-v24.20.0-linux-x64.tar.xz`，PATH 前缀或 ~/.bashrc 持久化）；系统 apt node 18 不满足要求。Windows 机=Volta 项目锁定沿用（package.json `volta` 字段，clone 即生效） |
| git | 系统 git | Linux 零额外网络配置（直连）；推送凭据见 §3 |
| 网络 | 直连（npm 面） | `.npmrc` npmmirror 二进制镜像入库沿用（Electron 二进制下载加速） |
| zcode CLI | 按用户侧规格安装（skills/插件与项目仓库无关） | 项目侧零依赖 |

> 仓库应驻 Linux 原生文件系统（如 ~/，ext4）——网络盘/挂载盘下 git/npm 显著
> 变慢且文件 watcher 失效。
>
> 核对：新开 shell `node -v` 必须=24.x（系统 node18 会因版本守卫必红）；
> VMware X11 桌面下 playwright/electron 本机开箱即用，若依赖库缺失再查
> `npx playwright install-deps`。
>
> **本机残留备案**：仓库根 `.mimosa/`（finding-ledger/hook-state/history 等）系
> zcode 宿主钩子的本机产物，非项目资产（.gitignore 已忽略）——审计/取证时勿误认；
> 同类还有 `local-state-backup/`、`dist_new/` 等本机目录。

## 2. 克隆与安装

```bash
git clone https://github.com/yyx20040712/Synapse.git Synapse_remake
cd Synapse_remake
npm ci          # .npmrc 已入库（npmmirror 二进制镜像）；
                # postinstall 串 install-electron（幂等）——Electron 二进制下载
                # 失败在此阶段暴露
```

- better-sqlite3 13（N-API 版）：prebuilt 随 npm 包直发（prebuilds/），
  npm ci 即得、Node/Electron 双运行时无需任何切换步骤；Electron linux-x64
  二进制经 `.npmrc` npmmirror 镜像下载（clone 即生效）。
- **禁止 `npm run dev` 之外的裸 electron 启动**；全部命令收敛=verify/dev/test:e2e。

## 3. git 本地配置（clone 后必做——不随仓库走）

Linux（现役机）——网络零配置（直连），必做仅身份+推送凭据：

```bash
git config user.name user        # 与既有提交身份一致
git config user.email user@local

# 推送凭据二选一：
#   ssh：ssh-keygen -t ed25519 → 公钥入 GitHub → git remote set-url origin git@github.com:yyx20040712/Synapse.git
#   PAT：git config credential.helper store && git push（首推输入令牌即记住）
#   （gh auth login 承载的 URL 级 helper 亦可；换令牌=gh auth login 重新入会话，
#    或覆写 ~/.git-credentials 对应行）
```

- 行尾纪律：仓库根 `.gitattributes` 强制 LF（locks 的 sha256 以 LF 为准）——
  新机**禁改** autocrlf 相关仓库配置。

<details><summary>Windows 机网络配置（回归 Windows 且需代理时参考）</summary>

```bash
git config http.proxy  http://127.0.0.1:7890
git config https.proxy http://127.0.0.1:7890
# 仅当用 MinGit（schannel 经代理握手失败时）——CA 路径=你的 MinGit 实际位置：
git config http.sslBackend openssl
git config http.sslCAInfo "<MinGit路径>/mingw64/etc/ssl/certs/ca-bundle.crt"
```

（这些是 repo-local 覆盖，.git/config 不随 clone 走。）
</details>

## 4. 本机状态导入（可选——换机/重装迁移开发数据用）

旧机导出件 `local-state-backup/synapse-local-state-*.tar.gz`（userData 开发
数据三件=synapse.db+files/+settings.json+audits 原始日志）。若拿得到该文件，
拷到仓库根后：

```bash
node scripts/local-state.mjs list   synapse-local-state-*.tar.gz   # 先核对清单
node scripts/local-state.mjs import synapse-local-state-*.tar.gz   # 应用进程须先关闭（SQLite 锁）
```

- 日志恢复到 `scripts/audits/logs-restored/`（不直接混入——核对后自行处置）。
- 不迁移也能开发：新库=空文献库（导入 PDF 即用）；日志仅证据链用途。

## 5. 基线核对（达到预期口径才算环境就绪）

```bash
npm run verify               # 预期 exit 0（用例数/locks 数随批次浮动，以实际输出为准）
npm run build && npm run test:e2e   # 预期全量用例以实际输出为准（e2e 不含在 verify 里，须单独跑）
```

- verify 红：先看是否 Node 版本≠24（版本守卫在 quality 段）。
- locks 报受锁文件被改：新机**禁动** `tests/**`、`src/shared/**`、migrations、
  CI/lint/构建/测试配置（sha256 对账，改须走 [locked-change] 流程——Linux 下
  ps1 锁工具缺位，manifest 维护走 node 复刻口径，见 AGENTS.md 环境事实）。
- 真实库位置（单源=代码 app.getPath，见 DEVELOPMENT §6）：Linux=
  `~/.config/Synapse/`（Electron userData 默认）；Windows=
  `%APPDATA%\Synapse\`（改名迁移走 `src/main/migrate-user-data.ts` 兜底回落）。
- 只读取证查库：**node:sqlite 内置模块**读 DB **副本**（copyFileSync 后
  `DatabaseSync(tmp,{readOnly:true})`）——零 ABI 换绑零 EBUSY；写面仍走
  better-sqlite3。
- 用户应用开着时：单实例锁+绑定文件 EBUSY——取证器启动前确认 electron
  进程不在（`pgrep -f electron`；Windows=tasklist | findstr electron）。

## 6. 首会话开工

按 `docs/prompts/` 下**编号最大**的 handoff 开工（历史交接书在仓外档案区，
见 registry 头部迁移注记的路径）。宪法纪律（技能清点/分级阅读/三阶段流程）
不变——见 AGENTS.md。
