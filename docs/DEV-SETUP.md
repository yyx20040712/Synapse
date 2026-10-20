# DEV-SETUP —— 新设备开发环境引导（2026-08-27 方案 C 固化；2026-10-13 WSL2 迁移维护批更新+同日 VMware 对齐批更新——现役机=Linux/VMware Ubuntu 24.04.5）

> 本文档=把「新机从 clone 到 verify 全绿」所需的本机知识固化进仓库。
> 按序走完 §1~§5，任何一步卡住先查 AGENTS.md「环境事实」节。
> 基线核对数字见 §5——对不上=环境配错，停下排查勿硬闯。

## 1. 前置环境（Linux/VMware 现役机口径）

| 项 | 要求 | 说明 |
| --- | --- | --- |
| Node | **24.x**（engines>=22；check-quality 版本守卫非 24 即红——Node 25 下 vitest jsdom 假红实证） | **Linux=~/tools/node24 tarball**（npmmirror 下载解压：`curl -sL https://registry.npmmirror.com/-/binary/node/v24.20.0/node-v24.20.0-linux-x64.tar.xz`，PATH 前缀或 ~/.bashrc 持久化）；系统 apt node 18 不可用。Windows 机=Volta 项目锁定沿用（package.json `volta` 字段，clone 即生效） |
| git | 系统 git | Linux **零额外网络配置**（直连；Windows 遗留 ssl/proxy 覆盖已删）；推送凭据=§3 |
| 网络 | 直连 | `.npmrc` npmmirror 二进制镜像入库沿用；旧机代理 7890 已废 |
| zcode CLI | 按既定规格安装（skills/插件同规格——与项目仓库无关，用户侧配置） | 项目侧零依赖 |

> 仓库应驻 Linux 原生文件系统（如 ~/，ext4）——网络盘/挂载盘下 git/npm 显著
> 变慢且文件 watcher 失效（WSL2 时代=/mnt/c drvfs 同理）。
>
> 核对：新开 shell `node -v` 必须=24.x（系统 node18 会因版本守卫必红——见 AGENTS.md
> 环境事实）；VMware X11 桌面下 playwright/electron 本机开箱即用（全量 135+1 用例
> （INV-168 v218 口径）〔v184 后〕：全天同一标准，红即红，非确定失败单现复跑定绿按通则；FLK-02/03
> 旧「环境登记态」处置已随 2026-10-19 用户裁决废除窗口口径而失效；WSL2 曾单次
> 108/108 全绿〔v181，108 用例时代〕）〔2026-10-20 F-DOCS-01 对齐〕，若依赖库
> 缺失再查 `npx playwright install-deps`。

> **本机残留备案**：仓库根 `.mimosa/`（finding-ledger/hook-state/history 等）系
> zcode 宿主钩子的本机产物，非项目资产（.gitignore 已忽略）——审计/取证时勿误认；
> 同类还有 `local-state-backup/`、`dist_new/` 等本机目录（存储批 F-STOR-01 处置面）。

## 2. 克隆与安装

```bash
git clone https://github.com/yyx20040712/Synapse.git Synapse_remake
cd Synapse_remake
npm ci          # .npmrc 已入库（npmmirror 二进制镜像）；
                # postinstall 串 install-electron（幂等）——Electron 42 二进制
                # 首次 require 懒下载被前置到安装阶段，失败在此暴露
```

- better-sqlite3 13.0.3（N-API 版）：prebuilt 随 npm 包直发（prebuilds/），
  npm ci 即得、Node/Electron 双运行时无需任何切换步骤；Electron linux-x64
  二进制经 `.npmrc` npmmirror 镜像下载（clone 即生效——WSL2 实测镜像下载
  过程；VMware 实测=整目录拷贝 node_modules 直接可用〔免 ci，verify 全绿〕）。
- **禁止 `npm run dev` 之外的裸 electron 启动**；全部命令收敛=verify/dev/test:e2e。

## 3. git 本地配置（clone 后必做——不随仓库走）

Linux/VMware（现役机）——网络零配置（直连），必做仅身份+推送凭据：

```bash
git config user.name user        # 与既有提交身份一致
git config user.email user@local

# 推送凭据二选一（VMware 机已配——2026-10-13 21:39 gh auth login 会话承载：
# gitconfig URL 级 helper=!gh auth git-credential；2026-10-14 首推免提示，
# ~/.git-credentials=git 转存 store 的自动副作用；轮换候选+副本盘点=v184
# §3-2；换令牌=新令牌经 gh auth login 入会话，或覆写 credentials 行）：
#   ssh：ssh-keygen -t ed25519 → 公钥入 GitHub → git remote set-url origin git@github.com:yyx20040712/Synapse.git
#   PAT：git config credential.helper store && git push（首推输入令牌即记住）
```

- 行尾纪律：仓库根 `.gitattributes` 强制 LF（locks 的 sha256 以 LF 为准）——
  新机**禁改** autocrlf 相关仓库配置。

<details><summary>Windows 机配置（历史档——2026-10-12 前旧机实况，回归 Windows 时参考）</summary>

```bash
git config http.proxy  http://127.0.0.1:7890
git config https.proxy http://127.0.0.1:7890
# 仅当用 MinGit（schannel 经代理握手失败的既有事故）——CA 路径=你的 MinGit 实际位置：
git config http.sslBackend openssl
git config http.sslCAInfo "<MinGit路径>/mingw64/etc/ssl/certs/ca-bundle.crt"
```

（本仓 WSL2 迁移时上述四项 repo-local 覆盖已删除——.git/config 不随 clone 走。）
</details>

## 4. 本机状态导入（历史档——2026-08-27 Windows→Windows 迁移批流程；2026-10-12 WSL2 迁移未携带迁移包，**流程本身未来换机/重装仍可用**）

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
npm run verify        # 预期 exit 0：408 文件 4267 用例 / locks 551（工单 open 数随排程浮动，
                      # 以 tickets/registry.ts 实时为准；2026-10-20 刷新）〔2026-10-20 F-DOCS-01 对齐〕
npm run build && npm run test:e2e   # 预期全量 135+1 用例（INV-168，2026-10-19 v218 口径；
                      # 以实际跑为准）（全天同一标准：红即红，非确定失败
                      # 单现复跑定绿按通则；FLK-02/03 旧「环境登记态」处置已随
                      # 2026-10-19 用户裁决废除窗口口径而失效；三族再红一律按待根治
                      # 缺陷立案（F-E2EFLK-01 承接），无按时段/环境豁免；e2e 全绿权威
                      # 基线=WSL2 v181〔108 用例时代〕；e2e
                      # 不含在 verify 里，须单独跑）〔2026-10-20 F-DOCS-01 对齐〕
```

- 数字对不上：先看是否 Node 版本≠24（裸跑 npx vitest 绕过版本守卫，
  Node 25 下 jsdom 假红——宪法既有纪律）；再核对是否忘了 build（e2e）。
- locks 报受锁文件被改：新机**禁动** `tests/**`、`src/shared/**`、migrations、
  CI/lint/构建/测试配置（sha256 对账，改须走 [locked-change] 流程——Linux 下
  ps1 锁工具缺位，manifest 维护=node 复刻口径，见 AGENTS.md 环境事实）。
- 真实库位置（单源=代码 app.getPath，见 DEVELOPMENT §6）：Linux=
  `~/.config/Synapse/`（Electron userData 默认）；Windows=
  `%APPDATA%\Synapse\`（R2-SH1 重命名迁移后；旧 `Synapse Remake` 已原子改名走
  ——`src/main/migrate-user-data.ts` 兜底回落）。
- 只读取证查库：**node:sqlite 内置模块**读 DB **副本**（copyFileSync 后
  `DatabaseSync(tmp,{readOnly:true})`）——零 ABI 换绑零 EBUSY；写面仍走
  better-sqlite3。
- 用户应用开着时：单实例锁+绑定文件 EBUSY——取证器启动前确认 electron
  进程不在（`pgrep -f electron`；Windows=tasklist | findstr electron）。

## 6. 首会话开工

按 `docs/prompts/` 下**编号最大**的 handoff 开工（设备迁移专用开工书=
`2026-08-27_device-migration-handoff.md`）。宪法纪律（技能清点/分级阅读/
三阶段流程）不变——见 AGENTS.md。
