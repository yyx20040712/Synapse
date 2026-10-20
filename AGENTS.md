# AGENTS.md —— AI 协作宪法（给所有代理的硬规则）

> 本文档的每条规则都有历史事故对应（事故档见根目录 `AI辅助开发经验教训.md`；
> 工作法原理层见 `docs/methodology.md`）。
> CI 会强制其中可机检的条目；不可机检的靠审查。**规则冲突时以本文为准。**

> 原 Synapse↔ai-dev-org 词汇映射表已于 2026-10-20（F-DOCS-01）删除——
> 术语以本文各首次出现处的白话定义为准；跨技能对照见用户技能 ai-dev-org
> references/00。

## 项目一句话

单人使用的本地学术文献管理 + PDF 阅读标注桌面应用（Electron + 纯 TypeScript）。

## 硬规则（违反即返工）

### 会话开工纪律（技能清点——任何工作的第一步）

- **任何工作启动时，先枚举当前环境的可用技能清单，逐项标注「用 / 不用 + 理由」，写入
  开工记录**（当次简报 / 任务台账 / 会话开篇均可，随产物留存备查）**后再动手**。禁止
  裸手搭流程（2026-08-23 前置会话实证：未加载工程技能裸手搭审计流水线，叠加 GLM 思考
  等级配错，整场裁决作废、专项半途终止）。
- 判据：与任务相关的工程技能（系统化调试 / TDD / 完成前验证 / 子代理开发等）默认「用」；
  标「不用」必须给出具体理由（如「纯文档改动，无测试面」），不许空泛带过。
- 配置自查随清点一并完成：确认自身与将派发的子代理处于正确模型 / 思考等级配置（同源事故：
  等级配错的模型签发的一切裁决视为无效）；三阶段流程（实现→门一→门二，ADR-0017，
  原称三屋模式；门一=
  隔离一审——实现完成后由独立子代理只凭完整 diff 做对抗式审查，门二=终审——另一独立
  子代理复核门一结论并做实证验证）派发的「正确配置」以 docs/methodology.md
  §4.5 档位表为准。
- 中途发现漏用且已走弯路 → 立即补加载，并把教训记入当次简报。

### 状态与不变量纪律（防屎山三盲区：时序/接缝/未声明假设）

- **状态机前置**：凡「store + 异步 + 用户输入」的工单或修改，行为层规约必须**先**给出
  状态/迁移表（枚举态空间），并按「态空间 + 跨格序列」交审计——单格枚举盖不住跨格
  序列（2026-08-23 U2 五轮返工实证：18 格单格全过，"合并落地→补存失败→再 load" 跨格
  序列丢稿由 deepseek 门拦截）。
- **不变量登记**：跨模块/跨时间的行为不变量一律登记 `docs/invariants.md`（声明处 +
  强制方式 + 锚定〔=有机器防线持续验证〕状态）；未登记 = 未定义行为。新增跨模块行为不登记本册视同未完成。
  禁止依赖默认假设（"文档永不滚"曾未声明，用户证实后才补）。
- **同类缺陷二次触发即重构**：同一模块同类 bug 第二次出现 → 停止增量补丁，先出态
  空间/设计文档再实现（增量守卫每步局部合理，合起来没人能一句话说清——屎山形成机制）。
- **接缝归责**：改动模块 A 时必须核对相邻模块 B 对同一行为的声明（注释/契约）；发现
  两处声明互斥即停下报告裁决，不得顺手改一侧（2026-08-23 tags.store 与 TagEditor
  注释互斥实证）。

### 代码组织

- **文件 ≤500 行**（ESLint `max-lines` error）。repo ≤300 行、组件 ≤250 行。出现第二职责就拆文件。
- **分层单向**：`ipc → services → repos → db`；`renderer → window.api → ipc`。禁止跨层（ESLint 强制）。
- **方案切换 = 删除旧方案**。不允许两套 PDF 方案、两个 ORM 并存（教训 E5/B3）。
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

- [ ] `npm run verify` 全绿（quality + tickets + locks + lint + typecheck + test + build；指纹门 verify/CI 两侧同含[C-A4 起]——CI 另含 e2e 与 lock-change-guard/[dep-change] 尾注/test-refactor 范围闸/npm audit 等守卫步；model-names 的 src 代号负锚〔负锚=禁词清单 grep 反向锁定，命中即红〕已内联 quality 段随 verify/CI 跑[2026-09-16 起]，独立脚本=收尾手动快跑入口，README 数字非此口径）
- [ ] src 产物零外部模型代号（glm/deepseek/kimi 等词表）——门禁 `npm run lint:model-names`（扫描面单源=check-model-names.mjs；src 负锚自 2026-09-16 起经 quality 段随 verify/CI 跑——独立 npm 脚本为收尾手动快跑入口）
- [ ] `grep` 无 `TODO|FIXME|placeholder`（CI quality 关卡）
- [ ] 无乱码：中文内容工具验证可读（CI mojibake 关卡）
- [ ] `git diff --stat` 无范围蔓延
- [ ] 占位实现已删除；工单在 `tickets/registry.ts` 更新状态
- [ ] 新增受锁文件已 `npm run locks:apply`
- [ ] 计数类数字（用例数/文件数/行数/出现次数等快照）写入前经脚本实测（wc/grep/
  机器输出），禁凭印象——2026-09-02 体检场拼包两条失实实证（INV 计数 43/3/2
  误写 40/4/3、e2e 3 次连跑误写 4 值，下游模型被带偏两轮才被对抗链拦截）；
  **报告面计数（简报/审包/收尾单/呈报/交接书/专项报告等一切对外书面材料中的
  计数——受锁件数/组件数/包分区块数等）写入同规并附实测命令**（命令+输出
  随批次档案〔仓外归档区〕落盘，数字不得脱离命令单独出现；派生值〔差值/百分比等〕附算式+所依
  实测命令）——2026-10-15 用户裁决升格（前史=三现同族：k3-N8 组件 12/13+d1-N8
  审包 18/34+DB-4 受锁件 33/19→实测 54，快照条款在报告面仍有执行坡口）
- [ ] 派发简报一切预期数字（计数/尺寸/预算/坐标/方向/阈值/比例等类）写入前
  手算留痕（落点=简报「基线数字」段，附算式或一行推导注），并与设计单源/
  受锁测试对账——与上条互补：快照=事后脚本实测，预期=事前手算对账；两夜
  二次同族误差实证（U1 bond 方向+U2 宽 36 封闭，均赖门二实证部手算拦截；
  2026-10-08 用户裁决升格 DoD 候补条为正式条款）
- [ ] 本票触及的 ADR/架构段落已回写（对照 docs/architecture.md §5 ADR 索引+§6 实体表；设计决策演进的票把变更同步到对应 ADR 修订记录或 architecture 对应节；无触及如实申报——2026-09-17 裁决 9）
- [ ] **收尾 push 后挂 CI 完成复查回执方可结束本批**（gh api/run view 确认
  conclusion；非 success=先定性：非确定失败单现→复跑定绿+flake 台账
  observing；同指纹复现→立案排查。前史=F-CIFLK-01 教训〔v184 收尾漏
  CI 核查致 T3 四 run 恒红无人发现〕；2026-10-14 用户裁决自环境段
  升格本段——v185/v187 两场践行闭环）

### 测试纪律

- **测试是锁定的合约**：禁止修改 `tests/**`、`**/*.test.ts`、`src/shared/**`（CI sha256 对账）。发现测试本身有错 → 报告人类，走 `[locked-change]`，**不得自行修改让代码通过**。
- **每个测试必须能失败一次**（写完先红再绿；恒真断言 = 假阳性，比没测试更危险）。
- **e2e 非确定失败立案线=同用例 2 次**（通则，2026-09-02 体检场终裁入册）：
  同一 e2e 用例出现 2 次非确定性失败即立案排查（复跑绿不算处理完毕并关闭——记录失败
  指纹：差值/同值/序列位置）；禁拖到多场多现（P7-A 七现才行动的教训——前六
  次都在消耗审查者信任带宽）。
- **变异红证（=先让测试红一次以证明该测试能失败的证据）的还原安全**（2026-08-23 UBS
  实证）：对**未提交**的实现做「临时变异→
  红→还原」时禁用 `git checkout`（会把未提交实现一并抹掉），用文件备份法
  （cp 备份→变异→测→cp 还原→diff 确认空）。
- **受锁 e2e spec 改动后必须全量 verify**（2026-08-23 UBS 实证）：playwright 用
  esbuild 转译不查类型，tsc 关卡才能拦住类型注解缺陷——只跑 playwright 会漏。
- 修核心模块（渲染/数据层）前先跑它的测试；改完再跑。
- e2e 必须断言"渲染出真实文本"（历史：52 测试全绿但文字不可见）。
- 豁免台账=未冻结退役申请单：regen 冻结与死条目清偿同批原子、零命中条目
  同批清偿、节奏阈值见 methodology §4.6。
- 测试锁分级：不变量与用户可见交互契约紧、实现细节松（判据四规则+迁移范式见
  methodology §4.7）；松化=判分留痕+豁免+新断言变异红证。

### 工单工作流（三屋模式默认 + 弱模型领单）

**三阶段流程（strong 工单默认，2026-08-27 ADR-0017）**：主控（编排会话——
唯一对接用户、唯一有权派发工单与子代理）派发→实现者
子代理（领工单正文五层规约，TDD 红→绿→**断言级变异红证**；禁 git/registry）→
门一对抗深审+门二终审（独立子代理）→主控按裁决权限三分法处置返工（≤2）→
收尾单写（亲自验证 verify 真退出码+locks+diff 范围→更新 registry→[locked-change]
提交）。实现者自裁申报一切超工单正文决定（含删减面 diff 自查）；新测试
always-active（不经 guardedDescribe——K3 威胁在三阶段流程下结构上不存在）；每单元
子代理 token/时长入成本账本，成本按**模型×供应商×套餐**分列（交接书/
专项报告）。**派发必显式定档**（机型+供应商+思考等级一体写进派发指令；
单一调用者，缺省=继承主控档=最贵档静默浪费，禁静默继承默认）。模型分工
走 docs/methodology.md §4.5 终态：实现者=GLM5.3flash（deepseek 实现面
禁用）/门一=Kimi 链**绑定子代理主通道**（**本项目默认席=ops-gate1-k1
〔kimi-third 源〕**——2026-10-17 用户裁决「后续均k1承载」；前史=k3 源A
2026-10-14 固化后连续三场认证故障〔B2/B3/B4 各一录〕换席；k3/k2=额度兜底；
$max 显式档位——2026-09-18 裁决 13 入宪）/门二=异构二审/体验额度优先
消费（2026-09-02 用户裁决+同日终态对齐，蓝本=subagent-driven-
development Model Selection+loop-engineering references/06）；**架构与
技术路线层面的设计与优化=Kimi 拟定→deepseek 审核→GLM5.3 主控终裁+指挥
实现；交接场首动作=Kimi 全面体检反馈主控后再定后续开发**（2026-09-02
第四次 Ruling——双源复审实战验证对抗有效性）。派发模板
三件=docs/methodology.md §4。
- 返工处置：B 本域必修；W/N 主控分流（本域必修或域外登记；N 可随已触发
  回炉顺带）；回炉轮按工单生命周期计数（重派不重置），设计与实施同
  ≤2——细则 methodology §4.4。

**弱模型领单（既有流程不变）**：

1. 读 `tickets/registry.ts` 找 `status: 'open'` 且 `owner: 'weak'` 的工单。
2. 打开工单文件，**文件头五层规约就是完整任务书**；先读它对应的锁定测试。
3. 只改这一个文件（+ 必要时新文件）。禁止顺手实现别的工单、禁止改契约、禁止改测试。
4. `npm run verify` 绿 → 报告人类审查 `git diff` → 人类更新 registry 状态 → 提交。
5. 卡住了就停，报告卡点；**不许删检查、不许放宽断言、不许引入新依赖**。
6. 测试红了先怀疑自己的实现；确认是测试/契约问题 → 停下报告。
7. **[test-refactor] 测试重构专项票**：动 tests/** 须双尾注 `[locked-change][test-refactor]`——CI 范围闸机检 diff 路径白名单（src/** 红）、verify 的 `test-surface:check` 机检契约面 C_after ⊇ C_before；有意收紧/删改先取主控裁决再落 `scripts/test-surface.exemptions.json` 豁免（reason+rulingLink）；专项毕基线再生成走 `npm run test-surface:baseline`+全量 diff 审计（设计定稿=docs/design/2026-09-11_f-testref00-design-final.md）。

### 治理面生命周期（F-GOV-01，2026-09-28）

- 新增治理面（机检脚本/强制文档字段/CI 关卡）立案时必须附**退出条件与评审触发器**并登记
  `docs/defense-lifecycle.md`——无退出条件者不予创建工单。
- 防线撤/并一律主控裁决；登记表「拦截实绩」栏空≠撤除理由（D-GOV-16）。
- done 票 summary 日落：收尾满 3 批（判据见登记册规则区）后由收尾主控瘦身为
  结论句+archive 指针（存量已随本票单元一消化 229/229——沿革见登记册，规则管增量）。

<!-- ORG-SEG:BEGIN v2 -->
### 组织协作通用层（技能 ai-dev-org——2026-09-10 起；v2=2026-09-18）

- 跨项目组织规范（岗位×模型路由×部门墙×成本账本）=用户全局技能
  **ai-dev-org**（loop-engineering 替代件，旧件已归档）；本宪法
  三屋段为 Synapse 特化实例，冲突时以本宪法为准。
- **钉版**（2026-09-18 裁决 12）：技能基准=最新版 git 提交号，现钉
  v2.0.1@2e292bb；org-config 无版本字段，以提交号+本注为准。
- **门一主通道=绑定子代理**（ops-*，$max 显式档位——2026-09-18 裁决 13
  入宪，同技能 06 §6 补遗口径）；外部派发器 ds-call=健康探针+后备通道
  （runbook 择路权保留）。
- 派发器=ds-call-v2（2026-09-18 用户裁决批准切换，v1 已删除，
  [locked-change] 在档；历史档引用 v1 属撰写时态）。
- 供应商事实唯一真相源=org-config（项目覆盖件 .zcode/org-config.json）；
  组织差异回灌=.zcode/org-delta.jsonl（技能 05 移植指南 §6 协议）。
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
- 触碰锁定文件的提交**即时** `locks:apply`（manifest 与该提交同步），禁止跨提交
  延迟重生成——CI 只查 push head，中间提交锁不同步会造成按提交回溯时的假绿。
- **自产 scripts/*.mjs/*.ps1 工具件写完即时 `locks:generate`+`apply`**：受锁集合
  经 check-locks 的 walk **自动覆盖 scripts 下全部 .mjs/.ps1**——文件一诞生即属
  受锁面，manifest 落后=下次 locks:check/verify 必红；禁延至收尾补登
  （2026-09-02 四波场三现实录：两 gen 脚本连续落后于并行锁操作+门二 verify 拦截）。
- 每次 AI 改动一个逻辑单元一个 commit；提交前 `git diff --stat` 自查。
- **创建工单/更新状态笔最小验证面=typecheck**：tickets/registry.ts 变更的提交推送前
  须 `npm run typecheck` 绿（tickets:check 无类型面——TicketArea 越界曾致 CI
  确定红，前史=e6115dfd〔2026-10-20〕；同型复发二次即升级机检关卡立案——
  创建工单防线=用户授权主控自决，2026-10-20）。
- **多命令链判码纪律**：命令链以 grep/管道过滤输出判定通过时，须显式判命令
  退出码（`[ $? -eq 0 ]` 或管道首命令 `${PIPESTATUS[0]}`），grep 行命中≠命令
  绿——b8029630 带 typecheck 红提交事故实录（2026-10-18；单源=v214 §3-6③
  +账本 ci-triage 行）。
- staging 一律显式列文件（或先 `git status` 核对未跟踪面）——`git add -A <目录>`
  会扫入未跟踪残留（2026-08-26 scripts/audits 误扫实录）；提交后勿复打 log
  （工具已回显，超长 message 双倍上下文成本）。
- **scripts/audits 留档口径 v2**（2026-09-19 裁决 3 出库归档后形态，F-STOR-01；
  用户同日批准审批稿 a 选项——审批文件=docs/design/2026-09-19_f-stor01-bucket1-
  revision-proposal.md，前史三桶口径 2026-09-05 F-AUDIT-01 终裁见该档 §二）：
  ①证据件（raw/md/json/patch/diff/log——含简报/报告/门审档/verify 与变异输出、
  探针工具件）**写入仓外档案区（现役=`/home/yyx/synapse-archive/scripts-audits/`
  ——路径随宿主用户目录，换机随迁更新本句；Windows 时代 E:/zcode_md/ 与
  WSL2 时代 /home/agent/ 前缀均已失效），不入库**；
  批次日志登记文件名清单（登记制）。仓内 `scripts/audits/` 仅存
  README 指针件（`.gitignore` `scripts/audits/*` 全拦+README 例外）。
  ②探针/工具件随证据件驻仓外档案区——check-locks walk 只认仓内
  `scripts/**.mjs|.ps1`，仓外件不入 manifest（跨 clone 无失效面）；`scripts/`
  根下新增工具件的受锁纪律不变（walk 自动覆盖）。
  ③mutation backup 副本禁驻留（不变——变异还原毕即删）。
  收尾毕 `git status` 未跟踪面应为零（不变——证据件在仓外+目录内容已
  ignore，自动成立）。
- 中文一律 UTF-8；写文件后验证可读（CI mojibake 关卡兜底）。

### 明确不做（v1 负面清单——防止顺手实现）

知识图谱（指自动引文网络图可视化；人工策展的核心 idea 时间树不在此列——2026-08-25 E5 裁决，指针 ADR-0014）、翻译、Scopus/WoS、插件系统、i18n 多语言、云同步、EPUB、多窗口（OS 级多 BrowserWindow；单窗口内多标签页不在此列——2026-08-23 用户裁决，指针 ROADMAP Phase 7+ B3）、遥测、后台自动网络任务（增强只手动触发）、Markdown 富文本编辑器（textarea 即可）。

> 〔2026-10-19 用户裁决清理负面清单：「清理负面清单，因为后面做完这一票获取基础功能
> 完善可用的软件之后我就会开始做下载和AI管线」——**PDF 下载管线（CARSI/CDP/
> Sci-Hub）一项自本日起移出负面清单**，进入测试版后的开发方向；届时新增出网
> host 仍须 ADR + [locked-change]（安全禁令段不随本清理豁免），后台自动网络
> 任务「只手动触发」约束是否随 AI 管线放宽=届时用户裁决位。其余各项维持不做。〕

## 环境事实（Linux/VMware 现役——2026-10-12 Windows→WSL2、2026-10-13 WSL2→VMware 两跳迁移；WSL2/Windows 时代全文=git 历史各维护批前版本+事故档）

- **Linux（现役=VMware 虚拟机 Ubuntu 24.04.5，X11 桌面）+ Electron 44**（44.4.3，
  Chromium M152/内嵌 Node 24/ABI 149）。e2e 开箱即用（electron linux dist 经
  npmmirror 镜像随 npm ci 落位+playwright——WSLg 单次全量 108/108〔v181，
  2026-10-13，108 用例时代〕；VMware e2e 时间相关 flake 面〔2026-10-14 排查场
  最终裁定+**2026-10-19 用户裁决废除窗口口径**〕=FLK-01 输入事件偶发族+FLK-02
  几何族+FLK-03 窗口状态族（历史形态呈深夜稳定红/白天绿，guest 内环境假设
  已全排除〔无 suspend/屏保/DPMS/monitors 变动〕——残余解释面=宿主/虚拟化层，
  未根治）。**判读口径（用户 2026-10-19 逐字「彻底取消所谓白天窗描述，
  一个稳定的软件怎么能受时间影响呢」）=全天同一标准：红即红，非确定失败
  单现复跑定绿按通则，无按时段豁免、无择窗排程——三族再红一律按待根治
  缺陷立案（承接=F-E2EFLK-01；FLK-02/03 旧「环境登记态」处置同日失效）**；
  CI
  面底色=windows-latest runner 虚拟屏 1024×768 钳制窗口（DEFAULT_BOUNDS
  1280×800 被 clampBounds——窄视口下布局容量形态与本地 1280×800 不同构：
  月框低容量区同月多卡分行+错位、卡可被推出视口；F-CIFLK-01 已清偿
  2026-10-14=T3 拖拽前 scrollIntoView 滚动锚——新 e2e 用例凡 boundingBox+
  mouse 拖拽/点击面对视口外元素须先滚动锚定〔T5/T3 先例〕；**双端拖拽（拖拽
  源+落点双卡）在 CI 窄视口须种子级同月共视设计**（跨年 span 不可共视——单卡
  滚动锚治不了双端；F-CIFLK-01 四修终态沉淀〔2026-10-18 v214 §6〕）；判读沉淀=CI
  再现 element-not-found 间接签名红首查视口外坐标；次生遗留项 F-GEOMASSUME-01=
  窄视口卡宽 flex 压缩≠CARD_W 128——维持登记=2026-10-14 用户裁决）；**收尾
  CI 回执条款已升格完成定义段（2026-10-14 用户裁决——本段不再记载此项）**）。
  **CI 合成输入栈无原生文本选区扩展**（windows-latest+Electron 44——CDP Input
  全路径含裸 dispatchMouseEvent 与关 setInterceptDrags 均退化为「mousedown 置
  坍缩光标+move 平移光标」，四轮诊断 2026-10-19 最终裁定 app 零缺陷；Linux 同路径
  正常——单源=INV-170②+F-VISFB-53CI-01 批次档案）：选区类 e2e 的选区产生一律走
  程序化写（reader-text selectText/selection-twocol A' setBaseAndExtent 先例），
  禁再以原生拖选扩展形态烧 CI run；真实用户态不受影响（真实输入≠合成输入）。
  **Chromium 边框亚像素平台差**（border 1.6px 声明在 Linux
  DPR=1 下 used value 落定 1px、Windows 保 1.6px）=路由几何面教训——单源=
  routing/detour.ts 头注+F-PLATFORM-01 工单正文，勿在文档复抄。
- **Node 24=`~/tools/node24`**（tarball 自 npmmirror 装——WSL2/VMware 两机各
  2026-10-13 落位（v24.20.0）；系统 apt
  node 18 不满足 engines>=22）。check-quality 版本守卫**非 24 即红**（跳过口
  SYNAPSE_SKIP_NODE_GUARD=1=vitest 升级票验证场专用；Node 25 下 vitest 2.1.9
  jsdom localStorage 装载破损=Windows 实证、jsdom 层推定平台无关——node24
  对照绿实证）——每会话先
  `export PATH=~/tools/node24/bin:$PATH`（~/.bashrc 已持久化）。package.json
  `volta` 字段沿用勿删（Windows 机回归时 Volta 自动生效的跨平台保险；CI
  ci.yml node-version=24 同口径）。engines >=22（F-ELE-03 随 better-sqlite3
  v13 收紧，原 >=20——勿改回）。
- **升 Electron 前先查 prebuild 矩阵**（2026-08-22 教训+2026-09-19 勘误加严）：
  prebuild 核查数据源**必须含 npm 包内容**（tar -tzf / npm pack --dry-run），
  不能只查 GitHub release 资产（v13 起 prebuilt 随 npm 包直发——勘误源头）。
- **Electron 42 起 npm 包无 postinstall**（41 尚有、42 移除，实证）：二进制改
  首次 require 懒下载——postinstall 已显式串 `install-electron`（幂等，dist
  在则秒过），下载失败暴露在 npm install 阶段。
- 网络两面分立（2026-10-14 用户裁决回写——v184 §3-3 呈报完毕）：**npm 面
  本机直连可用**；`.npmrc` npmmirror 二进制镜像沿用有效（electron）。旧机
  代理 127.0.0.1:7890 配置随迁移已删。**git 面（github.com）=gitconfig URL
  级代理 192.168.163.1:7890**（VM 经宿主机代理访 GitHub，2026-10-13 随
  gh 登录同刻落位——推送依赖宿主机代理在位；裁决=保留）。
- better-sqlite3 13.0.3 起 N-API 版：同一份绑定跨 Node/Electron ABI 通用
  （prebuilds/ 随包直发含 linux-x64/win32-x64 等）；v12 时代双 ABI 切换机制
  （scripts/sqlite-abi.mjs）已删除退役。
- 全部命令收敛：`npm run verify` / `npm run dev` / `npm run test:e2e`（需先 build）。
- git=系统 git；repo-local Windows 遗留覆盖（http.sslBackend/sslCAInfo 指向
  MinGit 路径+proxy 7890）已于 F-PLATFORM-01 批毕删除——.git/config 不随
  clone 走，新 Linux 机 git 零配置（直连——npm 面；git 面 github 代理=见本段
  网络两面分立句〔2026-10-14 裁决保留〕——单源=网络段）。**推送状态**：VMware 现机已配
  凭据（2026-10-13 21:39 gh auth login 会话提供+gitconfig URL 级 helper；2026-10-14
  首推经 gh 免提示认证，~/.git-credentials=git 转存 store 的自动副作用——三批
  6 笔同日清偿，远端 main=HEAD 同步；令牌副本盘点+轮换候选=v184 §3-2；换机/
  换令牌配法=docs/DEV-SETUP.md §3）。远端 origin=github.com/yyx20040712/Synapse。
- **ps1 锁工具四件 Linux 缺位**（locks:generate/apply/unlock+ticket:new）——
  manifest 维护=node 复刻口径（sha256=createHash('sha256').update(
  readFileSync(f))，与 check-locks.mjs 哈希行同式；排版=JSON.stringify(m,null,4)
  +'\n'；受锁路径集不变以 check-locks walk 为准）：改受锁测试面→复刻同步
  manifest→locks:check 绿→[locked-change] 提交（流程不变，工具件=/tmp 一次性；
  unlock 的只读位=Windows fs 属性，Linux 侧无只读位=无等价需求——完整性由
  locks:check 强制）。
- 行尾纪律：仓库根 `.gitattributes` 强制 LF（locks 的 sha256 以 LF 为准，勿删）。
- **探针纪律沿用**：探针类代码一律 Write/Edit 直写文件后 `node 文件`；node -e
  仅限纯 ASCII 单行。（Windows Git Bash→node.exe 隔层传参四坑原文=git 历史
  ——`git log -p -- AGENTS.md` 环境事实段、本批前版本；其中①$ 展开/③printf
  正则变形在 Linux bash 链路同样成立=纪律层仍适用，②GBK 化/④argv 丢换行参
  =Windows 隔层特有。）；**显式路径过滤跑测试跑毕核对执行数**——vitest/
  playwright 按路径过滤时拼错路径可静默零执行零失败=全绿假象（vitest 实证
  =FLK-04 批 probe P6；playwright 同防口径=未单独立证；2026-10-15 用户裁决
  升格）——跑毕必核对执行文件数/用例数与预期一致，不符即停查路径拼写。
- Windows 文件锁族噪声（geometric-repack「File exists」等，2026-09-02 三现）
  教训归档 git 历史——Linux ext4 无此族（WSL2/VMware 两环境一致）；如回归
  Windows 机沿用「忽略勿重装」。
