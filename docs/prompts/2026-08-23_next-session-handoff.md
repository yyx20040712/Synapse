# 任务：三轨道推进（人工验收回流 / v2 蓝图立项 / 防线升级）

> 用法：本文件是新会话的完整任务书。开窗口粘贴一行即可：「按 docs/prompts/
> 2026-08-23_next-session-handoff.md 开工」。前置基础设施与教训见 §5。

## 0. 开工前置（强制，不可跳过——同时是上下文污染控制规程）

1. **分级阅读，只读清单内文件**（本任务书的设计目标就是让新会话不重扫全库）：
   - 必读：`AGENTS.md`（重点节：「会话开工纪律」「状态与不变量纪律」「测试纪律」
     「依赖与提交」）；本文件全文；`docs/ROADMAP.md`（只看标题行与「当前基线」节）。
   - 按轨道选读：轨道 A → `docs/reports/2026-08-23_ubs-campaign.md` §7 与
     `docs/reports/2026-08-23_defect-campaign.md` §8（验收清单出处）；轨道 B →
     本文件 §2-B 素材清单 + `docs/ROADMAP.md` 全文；轨道 C → `docs/invariants.md`
     + `scripts/check-quality.mjs` + `eslint.config.js`。
   - **禁止**：全库通读；重读历史报告全文（只读指定节，结论都已沉淀）；把 Temp
     目录里的历史审计 JSON 拉进上下文（易失缓存，结论在提交信息与报告里）。
2. 按宪法执行技能清点（枚举+用/不用+理由，写入开工记录）并完成配置自查
   （正确配置=环境默认即正确，自查内容=确认本会话无任何思考等级降级设置存在；子代理只派只读检索且其结论须由主会话对照源码核实——历史事故与判据见 AGENTS 该节原文：等级被调低→签发的全部裁决作废）。
3. 全程纪律：受锁文件 locks:unlock→改→locks:apply + [locked-change]；禁新增依赖
   （走 ADR+[dep-change]）；一逻辑单元一 commit；先红后绿（无红面者记录依据）；
   卡住停下报告；不放宽任何检查；双门齐备才可提交（deepseek 一审 + GLM 二审）；
   机器事实终裁。
4. 开工先跑一遍 `npm run verify` 确认基线（预期 exit 0，51 文件 246 用例；
   若不是——停下报告，不要顺手修）。

## 1. 背景与当前基线（一段话，细节全在指针里）

v1 已完整交付（ROADMAP Phase 0~6 全勾，74/74 工单 done）并经两轮治理战役：
2026-08-23 四问题缺陷战役（U1~U7）与 UBS 未定义行为清点战役（13 提交，HEAD
2f57653，CI run #20 绿）。当前：verify exit 0（246 用例）、e2e 8/8、登记册 13 条
（9 已锚定/3 部分/1 未锚定）、工作树干净。人工验证用安装包：
`dist_new/Synapse-Remake-0.1.0-setup.exe`（2026-08-23 16:09 从 HEAD 2f57653 构建，
asar 断言过包含最新渲染产物 index-DbsSUaEH.js 与 electron-v146 原生绑定；旧
`dist/` 目录被系统句柄锁死暂不可清理，重启后可删）。
「剩余事项」三层（无一是已知功能缺陷）：人工验收动作（用户的）、防线升级欠账
（INV-02/11/13 部分锚定+INV-07 未锚定）、v2 特性候选（未立项）。

## 2. 三轨道任务

### 轨道 A（最高优先，事件驱动）：人工验收回流处理

用户人工验收中发现任何缺陷 → 报回本会话 → 按 2026-08-23 战役的双门流水线开
修复单元（取证→态空间表→先红后绿→deepseek+GLM→提交）。无回报则本轨道空转。
验收清单出处（供用户对照，不必主动重跑）：UBS 报告 §7、缺陷战役报告 §8、
ROADMAP Phase 5/6「留用户随手验」行。

### 轨道 B：v2 蓝图立项（Phase 7+ 编排——**含强制用户裁决停点**）

- **B1 素材清点（只读，批内不修任何东西）**：产出素材册存
  `%TEMP%\synapse_workflow\analyses\`，长寿命结论随 B2 蓝图草案提交入库 docs/reports/（B2 是本轨道首个提交；B3 仅停点无提交）。
  素材源四处（逐项核实存在性与依赖，file:line 级）：
  1. 代码内 v2 预留点：主题切换接线（src/renderer/features/settings/SettingsPage.tsx「随 v2 接线」注释+
     theme.css 变量集已备）；标签改名/合并/删除（src/main/services/tags.service.ts 生命周期层）；
     拖拽导入（src/renderer/features/library/ImportDropZone.tsx webUtils 注释）；导出到剪贴板（src/main/services/export_/export.service.ts
     生命周期层「ipc 加通道」）；阅读时长统计（src/main/services/reader.service.ts 生命周期层 + 002 迁移预留列）。
  2. 战役暂缓项：连续滚动（架构级四层，缺陷战役 §6）；enrich 交互式重试预算；
     玻璃质感/切换渐变（UX 增量）；安装包体积优化（docs/reports/2026-08-22_SR-PKG-02.md 存档）。
  3. 防线升级项（与轨道 C 互为表里，见 C）。
  4. 负面清单边界甄别：AGENTS「明确不做（v1 负面清单）」**全部条目逐项**过一遍，区分「永久不做」与「v2 候选」
     ——只把可辩护为 v2 候选的列入素材，逐项给依据（多窗口/EPUB/云同步等为
     永久边界的不得混入）。
- **B2 蓝图草案**：ROADMAP.md 增补「Phase 7+（草案）」——每个候选项给
  价值/依赖/风险/验收四栏 + 建议顺序。草案提交前走 plan 门双审。
- **B3 用户裁决停点（强制）**：草案完成后**停下问用户**排期与取舍（哪些进
  Phase 7、哪些继续挂起、优先级）。未获用户明示范围，**禁止开工任何 v2 特性
  工单**（防顺手实现——宪法负面清单教训）。
- **B4 工单化**（裁决后）：`npm run ticket:new` 生成五层规约骨架（模板已含
  状态机前置+错误反馈两型条款）→ registry 登记 → 各工单按既有领单流程执行。

### 轨道 C（可与 B1 并行的自主小战役）：不变量防线升级

- C1 INV-11 单一真相源 + INV-07 路径出口的 **lint 化可行性评估与实现**：
  候选落点 `scripts/check-quality.mjs`（仓库自有静态关卡，先例：features 跨域
  检查）——INV-11 方向：跨文件重复字面量/双源声明检测的窄化规则；INV-07 方向：
  renderer 侧绝对路径字面量与 Electron API 的补充检测（现有 ESLint 已禁
  node/electron import，补路径字面量形态）。评估结论无论做不做都落 ADR（docs/adr/ 目录，编号顺延现最大 0009；ADR 非受锁文件）——不做
  须量化依据，对齐 ADR-0008/0009 裁决风格）。可行则实现+[locked-change]
  （check-quality.mjs 受锁）+先红后绿（新规则须先在含违例的临时样本上红）。
- C2 INV-02/INV-13 维持规约锚定的登记册措辞回写收尾（若 C1 改变防线格局，
  同步 invariants.md 状态列）。

## 3. 执行批次与优先级

1. 开工前置（§0）→ 基线 verify。
2. B1 素材清点 ∥ C1 评估（两个只读/评估任务并行推进，各自成册）。
3. C1 可行实现（若裁决为做）；B2 蓝图草案 → plan 门双审 → 提交草案。
4. B3 用户裁决停点（问询排期）→ B4 工单化（裁决后）。
5. 轨道 A 全程事件驱动插队，最高优先。
6. 收官：全量 verify+e2e；invariants.md/ROADMAP 状态回写；报告入 docs/reports/；
   push 前 CI 对账；push 问询用户。

## 4. 终止条件（预声明，沿用战役契约）

- NIT 级存档不回炉；同一单元回炉 ≤2 次仍不收敛 → 停下升级用户。
- 审计输入携带全部前轮裁决（简报累积制）；双门齐备才可提交；机器事实终裁；
  BLOCKING 被机器事实证伪时携核验事实重审一次。
- 发现测试/契约本身有问题 → 停下报告，走 [locked-change]。
- **用户裁决停点是不可跳过的硬停**（B3）；裁决前不得实现 v2 特性。
- 「不做」是合法结论（对齐 D1/D2 先例），但须 ADR+量化依据。

## 5. 基础设施与历史教训（infra 就绪，直接复用）

- GLM 二审入口：由承担执行的 GLM 主会话本身以结构化清单执行（变更面核对/态空间-用例对应/假阳性排查/旧用例兼容四清单，先例=2026-08-23_ubs-campaign.md §4），记录写 %TEMP%synapse_workflowauditsUBS-*-glm.md；GLM 门不依赖外部工具。
- deepseek 审计调用器：库内权威副本 `scripts/deepseek_audit.py`（--mode
  diff|analysis|plan；plan 模式审规划/制度文档）。key 运行时从
  `~\.zcode\v2\config.json` 读；api.deepseek.com 直连不走代理、32K 输出预算、
  900s 超时；大输入简报顶部加聚焦声明。调用例：python scripts/deepseek_audit.py --name <单元名> --diff-file <diff路径> --brief-file <简报路径> --mode diff（产物默认落 scripts/audits/，mv 到 Temp）。key 缺失/损坏→deepseek 门不可用→停下报告用户（双门是硬约束，不得跳门提交）；网络偶发 SSL 重置/限流：重试；GitHub
  API 查 CI 用存储凭据认证（匿名限流）。
- 工作目录：`%TEMP%\synapse_workflow\{briefs,diffs,audits,analyses}\`（易失；
  长寿命结论入库）。审计产物脚本默认落 scripts/audits/——**移到 Temp** 保持
  仓库干净（本战役惯例）。
- 2026-08-23 新沉淀两条宪法测试纪律（AGENTS 已载）：变异红证的还原安全
  （未提交实现禁 git checkout，用文件备份法）；受锁 e2e spec 改动后必须全量
  verify（playwright 转译不查类型）。
- 版本口径：Electron 42.9.3 + Node 24（CI 勿改回 20）；打包 `npm run dist`
  （镜像 env→sqlite-abi→build→NSIS，产物 dist/Synapse-Remake-<version>-setup.exe；旧 dist/ 被句柄锁时按下方教训①重定向）；
  安装包冒烟 `npm run smoke:installer`（静默装/卸走注册表——只在用户要求时跑）。
- 打包环境两个实测教训（2026-08-23）：①`dist/win-unpacked` 可能被系统句柄
  （杀软/索引过滤驱动）锁死致 electron-builder unlink EBUSY 且 rm 无效、无任何
  用户态进程可见——绕开法：`--config.directories.output=<新目录>` 重定向输出
  （先例 dist_new/）；②electron-builder CLI 真实路径经 package.json bin 字段解析
  = `node_modules/electron-builder/cli.js`（dist.mjs 的解析法，out/cli.js 不存在）。
