# AGENTS.md —— AI 协作规则

本文件是全部代理必须遵守的规则单源。规则冲突时以本文件为准。历史沿革归
git 提交与仓外档案区，不写入规则正文。

## 项目

Synapse：单人使用的本地学术文献管理 + PDF 阅读标注桌面应用，技术栈为
Electron + 纯 TypeScript。项目处于半成品阶段：功能按需生长，规则以够用
为度，不为假设中的团队规模增加流程；发现规则与实际需要不符时，报告后
修订规则，而不是绕开规则。

## 安全禁令（无条件，违反即返工）

- 禁止 `nodeIntegration: true` / `webSecurity: false` / `sandbox: false` / `contextIsolation: false`
- 禁止 renderer 引入任何 Node/Electron API 或绝对文件路径；路径只能来自
  main 侧系统对话框，或拖拽 File 经 preload webUtils 解析
- 禁止对未过 shell-guard 校验的 URL 调 `openExternal`
- 一切 SQL 经 `db.prepare` 预编译 + 参数绑定，禁止字符串拼接；FTS 输入
  必须经 `escapeFtsQuery`
- 禁止 `eval` / `new Function` / `unsafe-eval`（CSP 已封死）
- 出网 host 白名单在 `src/shared/constants.ts`；新增 host 须先写 ADR

## 代码组织

- 分层单向：`ipc → services → repos → db`；`renderer → window.api → ipc`
  （ESLint 强制）
- 文件 ≤500 行（ESLint max-lines）；出现第二职责就拆文件
- 方案切换时删除旧方案；死代码即删，提交前确认新文件被引用
- 跨进程类型单一真相源=`src/shared/`；禁止手写两份等价类型
- 同一逻辑第三次出现时抽函数（Rule of Three）

## 设计先行

- 「store + 异步 + 用户输入」的行为改动，动手前先列出状态与迁移的
  完整枚举，再实现
- 跨模块、跨时间的行为不变量登记 `docs/invariants.md`（声明 + 验证
  方式）；登记条目与代码冲突时报告差异，不静默改任何一边
- 同一模块同类缺陷第二次出现时停止增量补丁，先写设计再实现
- 改动模块 A 时核对相邻模块 B 对同一行为的声明；两处互斥即停下报告

## 测试纪律

- 测试是合约：让实现迁就测试，而不是让测试迁就实现。发现测试本身
  有错，报告用户裁决，不自行修改让代码通过
- 每个新测试先跑红再跑绿；恒真断言比没有测试更危险
- `tests/**`、`src/shared/**`、migrations、CI 工作流与检查脚本的变更，
  须在提交说明中显式申报理由——防静默削弱测试与防线（凭申报与 diff
  审查承载）
- e2e 必须断言渲染出的真实文本，不接受几何全绿但文字不可见
- 修核心模块（渲染层/数据层）前后各跑一遍它的测试
- e2e 非确定失败：单次复跑定绿可放行并记入 flake 台账
  （`docs/audits/flake-ledger.json`）；同一用例出现两次非确定失败
  即立案排查

## 工作流

- 复杂任务由主控（唯一对接用户的会话）编排：派发实现者子代理 →
  独立审查 → 主控收尾（verify、提交、报告）。小任务主控直接做，
  不强制派发
- 实现者不运行 git、不改契约文件（`src/shared`、测试、migrations、
  CI）；超出发范围的决定如实申报，不自行裁决
- 卡住就停下报告卡点；不删检查、不放宽断言、不引入新依赖
- 弱模型领单：读 `tickets/registry.ts` 找 `status: 'open'` 且
  `owner: 'weak'` 的工单，只改工单指向的文件，`npm run verify` 绿后
  报告人类审查 diff，由人类更新状态并提交

## 文档

活文档集：`README.md`、`docs/architecture.md`、`docs/invariants.md`、
`docs/security.md`、`docs/ROADMAP.md`、`docs/DEVELOPMENT.md`、
`docs/DEV-SETUP.md`、`docs/adr/`。行为或约束变化时在同批更新受影响的
活文档；无文档影响时不创建文档。

写作六条契约（对一切新写与重写内容生效）：

1. 直接说明对象、行为、条件和结果
2. 一个概念使用一个名称，沿用代码和项目已有术语
3. 不用比喻、拟人或口号代替技术定义
4. 事实、推断、建议和决定分开
5. 标题描述具体内容，段落提供可核对的信息
6. 修改时重写整个相关章节，删除失效表述，不追加「最新说明」

平实中文，新术语先定义后使用。文档与代码不一致时报告具体差异；用户
刚修改的活文档代表最新设计意图，代码和测试代表现状。

## 依赖与提交

- 禁止新增依赖；确需新增，先写 ADR 并给提交加 `[dep-change]` 尾注；
  运行时依赖预算 ≤15 个
- `package.json` / lockfile 变更必须带 `[dep-change]` 尾注（CI 检查）
- 一个逻辑单元一个 commit；提交前 `git diff --stat` 自查范围；
  staging 显式列文件
- 提交说明用平实中文，写明做了什么、为什么、验证结果
- 报告中的计数（用例数/文件数/行数等）写入前经命令实测，不凭印象
- 判定命令链通过看退出码（verify 以日志内退出码行为准），不看 grep
  是否命中
- 审计证据、探针工具件写仓外档案区
  `/home/yyx/synapse-archive/scripts-audits/`，不入库；变异还原后
  备份即删
- 中文一律 UTF-8，写文件后确认可读

## 完成定义

- `npm run verify` 全绿（quality + tickets + lint + typecheck + test +
  build；CI 同口径另含 e2e 与依赖审计）
- `grep` 无 `TODO|FIXME|placeholder`
- diff 无范围蔓延；占位实现已删除；工单在 `tickets/registry.ts` 更新
- 触及其内容的架构段落或 ADR 已随批回写；无触及时如实申报
- push 后确认 CI 结论为 success 才算收尾

## 环境事实（Linux 现役；Windows 时代细节归 git 历史）

- VMware Ubuntu 24.04（X11）+ Electron 44；e2e 开箱即用（electron dist
  经 npmmirror 随 npm ci 落位 + playwright）
- Node 24=`~/tools/node24`（每会话先
  `export PATH=~/tools/node24/bin:$PATH`；`~/.bashrc` 已持久化）；
  engines >=22 勿改回；`package.json` 的 `volta` 字段保留勿删
- 网络：npm 直连可用（electron 二进制走 npmmirror 镜像）；推送
  github 经宿主机代理（gitconfig URL 级代理）；凭据配法见
  `docs/DEV-SETUP.md`
- better-sqlite3 13 起 N-API 版：同一份绑定跨 Node/Electron ABI 通用
- 升 Electron 前先查 prebuild 矩阵，数据源必须含 npm 包内容
  （`tar -tzf`），不能只查 GitHub release 资产
- CI=windows runner 窄视口（1024×768）：新 e2e 的 boundingBox +
  拖拽/点击须先滚动锚定；CI 合成输入无原生文本选区扩展，选区类 e2e
  用程序化写（selectText / setBaseAndExtent）
- 全部命令收敛：`npm run verify` / `npm run dev` / `npm run test:e2e`
  （需先 build）
- 仓库根 `.gitattributes` 强制 LF，勿删
- 显式路径过滤跑测试后核对执行数——拼错路径会静默零执行呈假绿
- 探针代码写成文件后 `node 文件` 运行；`node -e` 仅限纯 ASCII 单行

## 明确不做（防止顺手实现）

知识图谱（指自动引文网络图可视化；人工策展的核心 idea 时间树不在此
列）、翻译、Scopus/WoS、插件系统、i18n 多语言、云同步、EPUB、多窗口
（OS 级多 BrowserWindow；单窗口内多标签页不在此列）、遥测、后台自动
网络任务（增强只手动触发）、Markdown 富文本编辑器（textarea 即可）。

PDF 下载管线（CARSI/CDP/Sci-Hub）已移出负面清单，进入测试版后的开发
方向；届时新增出网 host 仍须 ADR，后台自动网络任务「只手动触发」约束
是否随 AI 管线放宽，届时由用户裁决。

<!-- ORG-SEG:BEGIN v2 -->
### 组织协作通用层（技能 ai-dev-org）

- 跨项目组织规范（岗位×输入边界×成本纪律）=用户全局技能
  ai-dev-org；本宪法为其项目实例，冲突时以本宪法为准。
- 主控=主会话；设计岗=会话内图像通道；其余岗位=会话内子代理承载；
  岗位与派发配置单源=技能（项目文档不记载）。组织差异回灌=.zcode/org-delta.jsonl。
- 技能版本不锚定：宪法不绑定 ai-dev-org 的版本号/提交号，跟随当前安装版。
- 组织账本=.zcode/org-ledger.jsonl（行 schema 单源=技能 references/02 §9）；
  结项前跑技能 scripts/health-scan.mjs（RED=0 方可结项）。
- 段预算机检：本段 ≤600 非空白字符
  （技能 scripts/check-constitution-budget.mjs AGENTS.md）。
<!-- ORG-SEG:END v2 -->
