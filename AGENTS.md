# AGENTS.md —— AI 协作宪法（给所有代理的硬规则）

> 本文档是全部代理必须遵守的硬规则单源。历史事故编年档在仓外档案区
> （`/home/yyx/synapse-archive/docs-2026-10-28/root/AI辅助开发经验教训.md`）；
> 工作法原理层见 `docs/methodology.md`。CI 强制其中可机检条目，其余靠审查。
> **规则冲突时以本文为准。**

## 项目一句话

单人使用的本地学术文献管理 + PDF 阅读标注桌面应用（Electron + 纯 TypeScript）。

## 硬规则（违反即返工）

### 会话开工纪律（技能清点——任何工作的第一步）

- **任何工作启动时，先枚举当前环境的可用技能清单，逐项标注「用 / 不用 + 理由」，
  写入开工记录**（当次简报 / 任务台账 / 会话开篇均可，随产物留存备查）**后再动手**。
  禁止未清点技能就裸手搭流程。
- 判据：与任务相关的工程技能（系统化调试 / TDD / 完成前验证 / 子代理开发等）
  默认「用」；标「不用」必须给出具体理由（如「纯文档改动，无测试面」），不许
  空泛带过。
- 中途发现漏用且已走弯路 → 立即补加载，并把教训记入当次简报。

### 状态与不变量纪律（防代码退化三盲区：时序/接缝/未声明假设）

- **状态机前置**：凡「store + 异步 + 用户输入」的工单或修改，行为层规约必须**先**
  给出状态/迁移表（枚举态空间），并按「态空间 + 跨格序列」交审计——单格枚举
  盖不住跨格序列。
- **不变量登记**：跨模块/跨时间的行为不变量一律登记 `docs/invariants.md`（声明处
  + 强制方式 + 锚定〔=有机器防线持续验证〕状态）；未登记 = 未定义行为。新增
  跨模块行为不登记本册视同未完成。禁止依赖默认假设（一切「文档永不滚」级
  假设须登记后才可依赖）。
- **同类缺陷二次触发即重构**：同一模块同类 bug 第二次出现 → 停止增量补丁，先出
  态空间/设计文档再实现（增量守卫每步局部合理，合起来没人能一句话说清——
  质量失控的形成机制）。
- **接缝归责**：改动模块 A 时必须核对相邻模块 B 对同一行为的声明（注释/契约）；
  发现两处声明互斥即停下报告裁决，不得顺手改一侧。

### 代码组织

- **文件 ≤500 行**（ESLint `max-lines` error）。repo ≤300 行、组件 ≤250 行。出现第二职责就拆文件。
- **分层单向**：`ipc → services → repos → db`；`renderer → window.api → ipc`。禁止跨层（ESLint 强制）。
- **方案切换 = 删除旧方案**。不允许两套 PDF 方案、两个 ORM 并存。
- **死代码即删**：孤儿组件、重复资产（pdf.js worker 只允许一份）。提交前确认新文件被引用。
- **类型单一真相源**：一切跨进程类型来自 `src/shared/`；类型变更 = [locked-change]（受锁文件变更的提交尾注——见「依赖与提交」段）流程。禁止手写两份等价类型。
- 重复 3 次以上的逻辑抽函数；第 2 次保持重复（Rule of Three）。

### 安全禁令（否定式，一条都不许碰）

- 禁止 `nodeIntegration: true` / `webSecurity: false` / `sandbox: false` / `contextIsolation: false`
- 禁止 renderer 引入任何 Node/Electron API 或绝对文件路径（路径只能来自 main 侧系统对话框或拖拽 File 经 preload webUtils 解析——受信边界清单见 INV-07）
- 禁止对未过 `shell-guard` 校验的 URL 调 `openExternal`
- 禁止字符串拼接 SQL；一切语句 `db.prepare` 预编译 + 参数绑定；FTS 输入必须经 `escapeFtsQuery`
- 禁止 `eval` / `new Function` / `unsafe-eval`（CSP 已封死）
- 禁止新增出网 host（白名单在 `src/shared/constants.ts`，新增需 ADR + [locked-change]）

### 完成定义（Definition of Done）

- [ ] `npm run verify` 全绿（quality + test-surface（测试面指纹门——verify/CI 两侧同含）+ tickets + locks + lint + typecheck + test + build；CI 同口径另含 e2e 与 lock-change-guard/[dep-change] 尾注/test-refactor 范围闸/npm audit 等守卫步）
- [ ] src 产物零外部模型代号——门禁 `npm run lint:model-names`（词表与扫描面
  单源=check-model-names.mjs；src 负锚〔负锚=禁词清单 grep 反向锁定，命中
  即红〕经 quality 段随 verify/CI 跑，独立脚本=收尾手动快跑入口）
- [ ] `grep` 无 `TODO|FIXME|placeholder`（CI quality 关卡）
- [ ] 无乱码：中文内容工具验证可读（CI mojibake 关卡）
- [ ] `git diff --stat` 无范围蔓延
- [ ] 占位实现已删除；工单在 `tickets/registry.ts` 更新状态
- [ ] 新增受锁文件已入锁 manifest（Linux 环境走 node 复刻口径，见「环境事实」段）
- [ ] **计数类数字（用例数/文件数/行数/出现次数等快照）写入前经脚本实测**
  （wc/grep/机器输出），禁凭印象；**报告面计数（简报/审包/收尾单/呈报/交接书/
  专项报告等一切对外书面材料中的计数——受锁件数/组件数/包分区块数等）写入
  同规并附实测命令**（命令+输出随批次档案〔仓外归档区〕落盘，数字不得脱离
  命令单独出现；派生值〔差值/百分比等〕附算式+所依实测命令）
- [ ] **派发简报一切预期数字（计数/尺寸/预算/坐标/方向/阈值/比例等类）写入前
  手算留痕**（落点=简报「基线数字」段，附算式或一行推导注），并与设计单源/
  受锁测试对账——与上条互补：快照=事后脚本实测，预期=事前手算对账
- [ ] 本票触及的 ADR/架构段落已回写（对照 docs/architecture.md §5 ADR 索引+
  §3 模块结构；设计决策演进的票把变更同步到对应 ADR 修订记录或 architecture
  对应节；无触及如实申报）
- [ ] **收尾 push 后挂 CI 完成复查回执方可结束本批**（gh api/run view 确认
  conclusion；非 success=先定性：非确定失败单现→复跑定绿+flake 台账
  observing；同指纹复现→立案排查）

### 测试纪律

- **测试是锁定的合约**：禁止修改 `tests/**`、`**/*.test.ts`、`src/shared/**`（CI sha256 对账）。发现测试本身有错 → 报告人类，走 `[locked-change]`，**不得自行修改让代码通过**。
- **每个测试必须能失败一次**（写完先红再绿；恒真断言 = 假阳性，比没测试更危险）。
- **e2e 非确定失败立案线=同用例 2 次**：同一 e2e 用例出现 2 次非确定性失败即
  立案排查（复跑绿不算处理完毕并关闭——记录失败指纹：差值/同值/序列位置）；
  禁拖到多场多现（多次复现都在消耗审查者信任带宽）。
- **变异红证（=先让测试红一次以证明该测试能失败的证据）的还原安全**：对**未提交**
  的实现做「临时变异→红→还原」时禁用 `git checkout`（会把未提交实现一并抹掉），
  用文件备份法（cp 备份→变异→测→cp 还原→diff 确认空）。
- **受锁 e2e spec 改动后必须全量 verify**：playwright 用 esbuild 转译不查类型，
  tsc 关卡才能拦住类型注解缺陷——只跑 playwright 会漏。
- 修核心模块（渲染/数据层）前先跑它的测试；改完再跑。
- e2e 必须断言"渲染出真实文本"（几何全绿但文字不可见的先例在档）。
- 豁免台账=未冻结退役申请单：regen 冻结与死条目清偿同批原子、零命中条目
  同批清偿、节奏阈值见 methodology §4.6。
- 测试锁分级：不变量与用户可见交互契约紧、实现细节松（判据四规则+迁移范式见
  methodology §4.7）；松化=判分留痕+豁免+新断言变异红证。

### 工单工作流（三阶段流程默认 + 弱模型领单）

**三阶段流程（strong 工单默认，ADR-0017）**：主控（编排会话——唯一对接用户、
唯一有权派发工单与子代理）派发→实现者子代理（领工单正文五层规约，TDD 红→
绿→**断言级变异红证**；禁 git/registry）→隔离一审对抗深审+终审复核（独立
子代理）→主控按裁决权限三分法处置返工（≤2）→收尾单写（亲自验证 verify 真退出
码+locks+diff 范围→更新 registry→[locked-change] 提交）。实现者自裁申报一切
超工单正文决定（含删减面 diff 自查）；新测试 always-active（不经
guardedDescribe）。
**岗位与派发配置=技能 ai-dev-org 单源**——项目文档不记载此类事项。派发模板
三件=docs/methodology.md §4。
- 返工处置：B 本域必修；W/N 主控分流（本域必修或域外登记；N 可随已触发
  返工顺带）；返工轮按工单生命周期计数（重派不重置），设计与实施同
  ≤2——细则 methodology §4.4。

**弱模型领单（既有流程不变）**：

1. 读 `tickets/registry.ts` 找 `status: 'open'` 且 `owner: 'weak'` 的工单。
2. 打开工单文件，**文件头五层规约就是完整任务书**；先读它对应的锁定测试。
3. 只改这一个文件（+ 必要时新文件）。禁止顺手实现别的工单、禁止改契约、禁止改测试。
4. `npm run verify` 绿 → 报告人类审查 `git diff` → 人类更新 registry 状态 → 提交。
5. 卡住了就停，报告卡点；**不许删检查、不许放宽断言、不许引入新依赖**。
6. 测试红了先怀疑自己的实现；确认是测试/契约问题 → 停下报告。
7. **[test-refactor] 测试重构专项票**：动 tests/** 须双尾注
   `[locked-change][test-refactor]`——CI 范围闸机检 diff 路径白名单（src/** 红）、
   verify 的 `test-surface:check` 机检契约面 C_after ⊇ C_before；有意收紧/删改
   先取主控裁决再落 `scripts/test-surface.exemptions.json` 豁免（reason+
   rulingLink）；专项毕基线再生成走 `npm run test-surface:baseline`+全量 diff
   审计（设计定稿=docs/design/2026-09-11_f-testref00-design-final.md）。

### 治理面生命周期

- 新增治理面（机检脚本/强制文档字段/CI 关卡）立案时必须附**退出条件与评审
  触发器**并登记 `docs/defense-lifecycle.md`——无退出条件者不予创建工单。
- 防线撤/并一律主控裁决；登记表「拦截实绩」栏空≠撤除理由（实绩栏是观察记录
  不是存续资格，防线未触发≠无价值）。
- done 票 summary 日落：收尾满 3 批（判据见登记册规则区）后由收尾主控瘦身为
  结论句+archive 指针（规则管增量）。

### 文档写作规范

**语言要求（平实语言）**：

- 平实中文直说事实与要求；面向第一次接触本项目的人写，不面向「在场者」写。
- 新术语先定义后使用，定义用日常语言；同一概念全文用同一个词，禁止同义换称。
- **禁止自造隐喻词充当术语**：军事/机构/行帮类旧词（战役、门一、门二、回炉、
  收口、保号、票面、钉版、批档、销项、落章、席位、屎山、三屋等）不得进入
  新写内容。比喻只允许出现在解释性段落，不得进入规则条文、标题与提交说明。
  禁用词表与机检脚本单源=scripts/check-doc-terms.mjs（经 check-quality 随
  verify/CI 跑）；机检扫描面外的新增面（registry 新增行/新交接书）以本节
  人审执法。
- 引用历史文件中的旧词时括号注明今名（如「回炉（返工）」）；历史文件本身
  不改写。
- 提交说明用平实语言：零黑话、零外部模型代号（与产出入仓纪律同面）。

**写作契约（六条；2026-11-18 用户裁决采为标准，对一切新写与重写内容即刻
生效，取代原五字段头要求——出处与沿革归 git 提交与仓外快照，不进文档头）**：

1. 直接说明对象、行为、条件和结果。
2. 一个概念使用一个名称，沿用代码和项目已有术语。
3. 不用比喻、拟人、口号或营销性评价代替技术定义。
4. 事实、推断、建议和决定分开。
5. 标题描述具体内容，段落提供可核对的信息。
6. 修改时重写整个相关章节，删除重复和失效表述，不追加「最新说明」。

- 跨项目通用方法论不抄写进本仓文档，持指针指向技能 references（单源纪律）。
- 文档与代码不一致时报告具体差异；用户刚修改的活文档代表最新设计意图，
  代码和测试代表现状，不静默覆盖任何一边。

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
<!-- ORG-SEG:END -->

### 依赖与提交

- **禁止新增依赖**，确需新增 → 先 ADR + [dep-change] 尾注。运行时依赖预算 ≤15 个。
- `package.json`/lockfile 变更必须带 `[dep-change]` 尾注（CI 检查）。
- 受锁文件（tests/shared/migrations/CI/lint/构建/测试配置/脚本）变更必须带 `[locked-change]` 尾注。
- 受锁文件修改前先 `npm run locks:unlock` 解除只读，改完即时 `npm run locks:apply` 重锁并
  更新 manifest（新增受锁路径需先 `npm run locks:generate` 再 apply）。
  （Linux：ps1 锁工具缺位，locks:unlock/apply/generate 三命令均不可用
  ——manifest 维护走环境事实段的 node 复刻口径。）
- 触碰锁定文件的提交**即时**同步 manifest（manifest 与该提交同步），禁止跨提交
  延迟重生成——CI 只查 push head，中间提交锁不同步会造成按提交回溯时的假绿。
- **自产 scripts/*.mjs/*.ps1 工具件写完即时 `locks:generate`+`apply`**：受锁
  集合经 check-locks 的 walk **自动覆盖 scripts 下全部 .mjs/.ps1**——文件一诞生
  即属受锁面，manifest 落后=下次 locks:check/verify 必红；禁延至收尾补登。
- 每次 AI 改动一个逻辑单元一个 commit；提交前 `git diff --stat` 自查。
- **创建工单/更新状态笔最小验证面=typecheck**：tickets/registry.ts 变更的提交
  推送前须 `npm run typecheck` 绿（tickets:check 无类型面——TicketArea 越界
  会致 CI 确定红；同型复发二次即升级机检关卡立案；创建工单防线=用户授权
  主控自决）。
- **多命令链判码纪律**：命令链以 grep/管道过滤输出判定通过时，须显式判命令
  退出码（`[ $? -eq 0 ]` 或管道首命令 `${PIPESTATUS[0]}`），grep 行命中≠命令
  绿。
- staging 一律显式列文件（或先 `git status` 核对未跟踪面）——`git add -A <目录>`
  会扫入未跟踪残留；提交后勿复打 log（工具已回显，超长 message 双倍上下文
  成本）。
- **scripts/audits 留档口径 v2**：
  ①证据件（raw/md/json/patch/diff/log——含简报/报告/审计档/verify 与变异输出、
  探针工具件）**写入仓外档案区（现役=`/home/yyx/synapse-archive/scripts-audits/`
  ——路径随宿主用户目录，换机随迁更新本句），不入库**；
  批次日志登记文件名清单（登记制）。仓内 `scripts/audits/` 仅存 README 指针件
  （`.gitignore` `scripts/audits/*` 全拦+README 例外）。
  ②探针/工具件随证据件驻仓外档案区——check-locks walk 只认仓内
  `scripts/**.mjs|.ps1`，仓外件不入 manifest（跨 clone 无失效面）；`scripts/`
  根下新增工具件的受锁纪律不变（walk 自动覆盖）。
  ③mutation backup 副本禁驻留（变异还原毕即删）。
  收尾毕 `git status` 未跟踪面应为零（证据件在仓外+目录内容已 ignore）。
- 中文一律 UTF-8；写文件后验证可读（CI mojibake 关卡兜底）。

### 明确不做（v1 负面清单——防止顺手实现）

知识图谱（指自动引文网络图可视化；人工策展的核心 idea 时间树不在此列——
指针 ADR-0014）、翻译、Scopus/WoS、插件系统、i18n 多语言、云同步、EPUB、
多窗口（OS 级多 BrowserWindow；单窗口内多标签页不在此列）、遥测、后台自动
网络任务（增强只手动触发）、Markdown 富文本编辑器（textarea 即可）。

> PDF 下载管线（CARSI/CDP/Sci-Hub）已移出负面清单，进入测试版后的开发方向；
> 届时新增出网 host 仍须 ADR + [locked-change]（安全禁令段不随本清理豁免），
> 后台自动网络任务「只手动触发」约束是否随 AI 管线放宽=届时用户裁决位。
> 其余各项维持不做。

## 环境事实（Linux/VMware 现役；WSL2/Windows 时代全文=git 历史各维护批前版本+事故档）

- **Linux（VMware 虚拟机 Ubuntu 24.04.5，X11 桌面）+ Electron 44**（44.4.3，
  Chromium M152/内嵌 Node 24/ABI 149）。e2e 开箱即用（electron linux dist 经
  npmmirror 镜像随 npm ci 落位+playwright）。本地 e2e 输入事件类偶发红判读
  口径（用户裁决）=**全天同一标准：红即红，非确定失败单现复跑定绿按通则，无
  按时段豁免、无择窗排程——三族（输入事件/几何/窗口状态）再红一律按待根治
  缺陷立案（承接票 F-E2EFLK-01）**。CI 面底色=windows-latest runner 虚拟屏
  1024×768 钳制窗口（DEFAULT_BOUNDS 1280×800 被 clampBounds——窄视口下布局
  容量形态与本地 1280×800 不同构）：新 e2e 用例凡 boundingBox+mouse 拖拽/
  点击面对视口外元素须先滚动锚定；**双端拖拽（拖拽源+落点双卡）在 CI 窄视口
  须种子级同月共视设计**（跨年 span 不可共视——单卡滚动锚治不了双端）；CI
  再现 element-not-found 间接签名红首查视口外坐标；窄视口卡宽 flex 压缩≠
  CARD_W 128（维持登记）。**CI 合成输入栈无原生文本选区扩展**
  （windows-latest+Electron 44——CDP Input 全路径均退化为「mousedown 置
  坍缩光标+move 平移光标」，app 零缺陷已裁定；Linux 同路径正常——单源=
  INV-170②）：选区类 e2e 的选区产生一律走程序化写（selectText/
  setBaseAndExtent 先例），禁再以原生拖选扩展形态烧 CI run；真实用户态不受
  影响（真实输入≠合成输入）。**Chromium 边框亚像素平台差**（border 1.6px
  声明在 Linux DPR=1 下 used value 落定 1px、Windows 保 1.6px）=路由几何面
  教训——单源=routing/detour.ts 头注，勿在文档复抄。
- **Node 24=`~/tools/node24`**（tarball 自 npmmirror 装；系统 apt node 18 不满足
  engines>=22）。check-quality 版本守卫**非 24 即红**（跳过口
  SYNAPSE_SKIP_NODE_GUARD=1=vitest 升级票验证场专用）——每会话先
  `export PATH=~/tools/node24/bin:$PATH`（~/.bashrc 已持久化）。package.json
  `volta` 字段沿用勿删（Windows 机回归时 Volta 自动生效的跨平台保险；CI
  ci.yml node-version=24 同口径）。engines >=22（勿改回）。
- **升 Electron 前先查 prebuild 矩阵**：核查数据源**必须含 npm 包内容**
  （tar -tzf / npm pack --dry-run），不能只查 GitHub release 资产（v13 起
  prebuilt 随 npm 包直发）。
- **Electron 42 起 npm 包无 postinstall**：二进制改首次 require 懒下载——
  postinstall 已显式串 `install-electron`（幂等，dist 在则秒过），下载失败
  暴露在 npm install 阶段。
- 网络两面分立：**npm 面本机直连可用**；`.npmrc` npmmirror 二进制镜像沿用有效
  （electron）。**git 面（github.com）=gitconfig URL 级代理 192.168.163.1:7890**
  （VM 经宿主机代理访 GitHub——推送依赖宿主代理在位）。
- better-sqlite3 13 起 N-API 版：同一份绑定跨 Node/Electron ABI 通用
  （prebuilds/ 随包直发含 linux-x64/win32-x64 等）。
- 全部命令收敛：`npm run verify` / `npm run dev` / `npm run test:e2e`（需先 build）。
- git=系统 git，repo-local 无遗留覆盖；远端 origin=
  github.com/yyx20040712/Synapse。推送凭据已配（gh auth login 承载的 URL 级
  helper+~/.git-credentials 转存）；换机/换令牌配法=docs/DEV-SETUP.md §3。
- **ps1 锁工具四件 Linux 缺位**（locks:generate/apply/unlock+ticket:new）——
  manifest 维护=node 复刻口径（sha256=createHash('sha256').update(
  readFileSync(f))，与 check-locks.mjs 哈希行同式；排版=JSON.stringify(m,null,4)
  +'\n'；受锁路径集不变以 check-locks walk 为准）：改受锁测试面→复刻同步
  manifest→locks:check 绿→[locked-change] 提交（流程不变，工具件=/tmp 一次性；
  unlock 的只读位=Windows fs 属性，Linux 侧无只读位=无等价需求——完整性由
  locks:check 强制）。
- 行尾纪律：仓库根 `.gitattributes` 强制 LF（locks 的 sha256 以 LF 为准，勿删）。
- **探针纪律沿用**：探针类代码一律 Write/Edit 直写文件后 `node 文件`；node -e
  仅限纯 ASCII 单行。**显式路径过滤跑测试跑毕核对执行数**——vitest/
  playwright 按路径过滤时拼错路径可静默零执行零失败=全绿假象——跑毕必核对
  执行文件数/用例数与预期一致，不符即停查路径拼写。
- Windows 文件锁族噪声（geometric-repack「File exists」等）教训归档 git
  历史——Linux ext4 无此族；如回归 Windows 机沿用「忽略勿重装」。
