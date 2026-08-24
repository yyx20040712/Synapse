# 任务：P7-B 收官（TABS-04/UNDO-01/e2e）→ 排序确认后主线续推（P7-C → AI-01~05）

> 用法：本文件是新会话的完整任务书。开窗口粘贴一行即可：「按 docs/prompts/
> 2026-08-25_next-session-handoff.md 开工」。前任会话（2026-08-24~25，两役
> 连续）：链条核查+断链修复+P7-B 工单化与三单实现+AI 传感器链条全套规划落档。

## 0. 开工前置（强制，不可跳过——上下文污染控制规程）

1. **分级阅读，只读清单内文件**：
   - 必读：`AGENTS.md`（重点节：「会话开工纪律」「状态与不变量纪律」「测试
     纪律」「依赖与提交」「工单工作流」）；本文件全文；`docs/ROADMAP.md`
     （标题行+「当前基线」+「Phase 7+」全节含 P7-G）。
   - 任务一选读：`docs/reports/2026-08-24_p7a-campaign.md` §4（战役教训——
     §4.1 子树重挂/§4.2 updater 双坑/§4.4 dispatch 包 act 开工前必读）；
     `src/main/windows/main-window.ts` 头注（TABS-04 工单规约）；
     `src/renderer/features/reader/annotation-undo.ts` 头注（UNDO-01 规约）。
   - 任务二选读：`docs/reports/2026-08-24_chain-audit.md`（核查基线）；
     `docs/reports/2026-08-25_ai-module-plan.md`（AI 工单化母本——§2 架构
     细节/§4 工单序列）；`docs/reports/2026-08-25_ai-sensor-blueprint.md`
     §4.1 裁决记录+§4.2 七问（规约来源）；`docs/adr/0011-md-corpus-interface-contract.md`。
   - 任务三选读：`docs/invariants.md` + `scripts/check-quality.mjs` +
     `eslint.config.js`。
   - **禁止**：全库通读；重读历史报告全文（只读指定节）；把 Temp 目录审计
     JSON 拉进上下文。
2. 按宪法执行技能清点（枚举+用/不用+理由，写入开工记录）并完成配置自查
   （确认无思考等级降级；子代理只派只读检索且结论须主会话对照源码核实）。
3. 全程纪律：受锁文件 locks:unlock→改→即时 locks:apply+[locked-change]；
   禁新增依赖（走 ADR+[dep-change]）；一逻辑单元一 commit；先红后绿（无红面
   者记录依据）；双门齐备才可提交（deepseek 一审+GLM 二审，调用例见 §5）；
   机器事实终裁；卡住停下报告；不放宽任何检查。
4. 开工先跑 `npm run verify`（预期 exit 0，56 文件 **314 用例**）+ `npm run
   test:e2e`（预期 10/10）。**若不是——停下报告，不要顺手修**。

## 1. 背景与当前基线（一段话，细节全在指针里）

v1+P7-A 已交付；2026-08-24~25 两役：链条核查六面通过（唯一缺口 BibTeX 导出
UI 入口已修复，dc621b9/187b6cd）；P7-B 工单化五张过 plan 门（26cc54e）并实现
三单——TABS-01 per-tab store（633aa97，18 用例，deepseek 三轮收敛含 inflight
身份校验真缺陷）/TABS-02 TabBar（11 用例，r1 BLOCKING「空态分支不装 TabBar=
error tab 死锁」修复，INV-15 登记）/TABS-03 灰点聚合（8 用例，跨域聚合器
check-quality 白名单受控例外）。当前：verify 314 用例、e2e 10/10、工单 83
（open 2：**SR2-TABS-04/SR2-UNDO-01**）、锁 93、INV-14 三面锚+INV-15 部分
（装配级待收官 e2e）。**本地领先 origin 约 21 提交未 push（push 决策属用户，
无明示不 push）**。工作树仅探针残留三件（`_esm_probe.mjs`/`_ptr_probe.mjs`/
`src/renderer/shared/_rule6_probe.ts`——句柄锁，重启后删，不阻塞关卡）。

AI 传感器链条**设计层已全闭环**（用户 D1-D6+七问逐项裁决）：蓝图 B0/ADR-0011
（五件套契约）/0012/0013/技术路线计划/ROADMAP `### P7-G` 增量裁决节——实施
排在其前置（P7-C）之后，工单序列 SR2-AI-01~05 见 ai-module-plan §4。

## 2. 任务序列（顺序：一 → 二穿插三；事件驱动最高）

### 任务一：P7-B 收官（三步，站内停点=每步一提交）

1. **SR2-TABS-04 退出拦截**（工单头注=main-window.ts 文件头，自包含）：
   - 范围：`system/set-quit-dirty` 新通道（api-surface.ts 受锁 [locked-change]
     +schemas+ipc/system.ts 注册）/main-window close 守卫（quitDirtyGuard
     判定函数导出+preventDefault+main 侧 showMessageBox 确认+确认后
     win.destroy）/renderer 上报点（App 层 effect watch useTabDirtyAggregate
     ——tab-dirty.ts 已就绪的聚合钩子）。
   - 测试三面锚（plan 门 NIT2 条款）：quit-dirty-guard.test.ts（clean 放行/
     dirty 拦截+确认 destroy/取消保持）+system.test.ts 扩展通道断言+
     preload-surface.test.ts 自动对账。
   - 状态机表已在头注（clean/dirty/确认/取消四态）——实现前对照一遍。
2. **SR2-UNDO-01 标注 undo 栈**（头注=annotation-undo.ts）：三逆操作
   （create→delete/delete→re-create/comment-edit→回旧值）；模块级 Record
   per-tab；closeTab 清理接缝（reader.store.ts 一行）；ctrl+z 经
   ReaderShortcuts 键位表；**实现前核对 annotations.repo.insert 是否接受
   显式 id**（头注有指引——不接受则 re-create 用新 id）。
3. **P7-B 收官**：e2e 三序列（**换 tab/关 tab/退出**——含 error tab 场景，
   INV-15 装配级防线就此收口升已锚定；受锁 e2e 改动走 [locked-change]+全量
   verify 纪律）+全量 verify+e2e+ROADMAP P7-B 节回写 ✅+收官报告
   `docs/reports/2026-08-25_p7b-campaign.md`（提交清单/防线战绩/教训）。

### 任务二：主线续推（**排序已提案待用户确认——开工时问一句；无回复默认按提案**）

提案内容：P7-B 收官 → **P7-C 笔记结构化**（AI 链条的数据基座前置：三栏
UI/片段笔记 sortKey/md 导出 corpus 装配——工单化时以 ADR-0011 契约为验收
细目来源、D3 独立表裁决已定）→ **SR2-AI-01~05**（按
docs/reports/2026-08-25_ai-module-plan.md §4 逐单：数据基座→提取管线→
五件套导出→UI 入口→工具骨架；**三读/梳理提示词不工单化**——边界宣言在
计划 §4）；P7-F 连续滚动与 AI 零依赖可穿插或延后。用户若有新排序指令以其
为准。P7-C/AI 工单化均需 ticket:new+状态机前置表+deepseek plan 门（P7-B
先例流程）。

### 任务三（穿插）：C1 防线升级评估

INV-11 单源常量/INV-07 renderer 路径字面量的 lint 化可行性 → 落 **ADR-0010**
（编号顺延；「不做」须量化依据，对齐 ADR-0008/0009 风格）；可行则实现
（check-quality.mjs 受锁走 [locked-change]+违例样本先红）。在等待审计/用户
反馈的间隙穿插。

### 事件驱动（最高优先插队）

用户人工验收发现缺陷 → 双门修复单元（取证→态空间表→先红后绿→deepseek+GLM
→提交）。P7-A 随手验清单见 p7a-campaign §6；P7-B 随手验：多开两篇文献切
tab/关 tab（灰点：断网状态下保存标注看 ●）/loading 中切走再切回/退出应用
（有未保存笔记时确认框）。

## 3. 执行批次

1. 开工前置（§0）→ 双基线绿。
2. TABS-04 → UNDO-01 → P7-B 收官（报告+ROADMAP 回写，docs 提交）。
3. 排序确认 → P7-C 工单化（plan 门）→ 实现 → 收官。
4. SR2-AI-01~05 逐单（站间停点：预算不足在单边界停，禁压缩验证跨站续跑）。
5. C1 在间隙穿插。6. 每站收官回写 ROADMAP；**push 前问询用户**。

## 4. 终止条件（预声明，沿用战役契约）

- NIT 级存档不回炉；同一单元 deepseek 回炉 ≤2 次仍不收敛 → 停下升级用户。
- 审计输入携带全部前轮裁决（简报累积制）；双门齐备才可提交；机器事实终裁；
  BLOCKING 被机器事实证伪时携核验事实重审一次。
- 发现测试/契约本身有问题 → 停下报告，走 [locked-change]。
- 「不做」是合法结论，但须 ADR+量化依据。
- **无用户明示不 push、不打安装包**（smoke:installer 只在用户要求时跑）。

## 5. 基础设施与历史教训（infra 就绪，直接复用）

- **双门**：`python scripts/deepseek_audit.py --name <单元名> --diff-file
  <diff> --brief-file <简报> --mode diff|analysis|plan`（key 运行时读
  ~/.zcode/v2/config.json，缺失→停下报告；api.deepseek.com 直连 900s）。产物
  落 scripts/audits/ 后**移到 Temp**（`%TEMP%\synapse_workflow\audits\`）保持
  仓库干净。已知两态故障：SSL 重置（WinError 10054）→重试；响应 JSON 落
  reasoning 通道致「未找到 JSON」→从 .raw.txt 打捞（先例 tabs01-r3：逐位置
  raw_decode 找 verdict 对象）。GLM 二审=主会话结构化自审（代码四清单：
  变更面/态空间-用例/假阳性/兼容；plan 三清单：自包含/覆盖/停点硬度），记录
  写 Temp audits/。**简报必含技能清点+配置自查节**（deepseek 曾以缺失判 WARN）。
- **TDD 红证路径**（guardedDescribe open=skip 机制）：临时翻 registry done →
  跑红 → 翻回 → 实现 → 完成后正式翻 done（TABS-01/02/03 三单实录）。
- **组件测试禁 resetModules+静态 act 混用**：React 双实例 instanceof 炸——
  组件级测试用静态 import+store 单例 setState 注入（tab-bar.test 先例）。
- **规则 2 连锁反应**：工单翻 done 后，其他文件头注里引用其工单号即被拦
  （本役第 7/8/9 次真阳性）——处置=跨文件引用去前缀（`SR2-TABS-01`→
  `TABS-01`），登记文件自引用合法保留。
- **quality 行数算法**=split('\n').length（比 wc -l 多 1 的尾行）；组件 ≤250
  常态拦——拆分/注释压缩守恒（P7-A 拆 OutlineAside、TABS-02 拆 useActiveTab
  先例）。
- **locks 细节**：新测试文件→locks:generate+apply；受锁文件改前 unlock；
  apply 后 manifest 仅 generatedAt 时间戳差异可 `git checkout -- locks/manifest.json`
  还原（无实质变更时不入提交）；locks:check 报「受锁文件被修改」=流程中
  正常红（apply 后即绿）。
- **终端乱码**：关卡输出 GBK 显示乱码≠文件乱码（quality mojibake 关卡以文件
  内容为准，verify 内已跑）。
- **shell 瞬时态**：复合命令挂起/rm 句柄锁（探针三件同型）→停任务+单命令+
  timeout 包装；esbuild 崩溃先移新文件对照再疑代码（§5 先例 2026-08-24）。
- 版本口径：Electron 42.9.3+Node 24（勿改回）；行尾 LF 纪律；`npm run verify`
  /`npm run dev`/`npm run test:e2e` 三命令收敛。

## 6. 关键文档与工单指针（速查）

| 对象 | 位置 |
| --- | --- |
| 链条核查基线 | docs/reports/2026-08-24_chain-audit.md |
| P7-A 教训/随手验 | docs/reports/2026-08-24_p7a-campaign.md §4/§6 |
| TABS-04 工单规约 | src/main/windows/main-window.ts 文件头注 |
| UNDO-01 工单规约 | src/renderer/features/reader/annotation-undo.ts 文件头注 |
| INV 登记册（14+15） | docs/invariants.md |
| AI 蓝图（裁决+七问） | docs/reports/2026-08-25_ai-sensor-blueprint.md §4.1/§4.2 |
| AI 技术路线+工单序列 | docs/reports/2026-08-25_ai-module-plan.md |
| 语料接口契约 | docs/adr/0011-md-corpus-interface-contract.md |
| P7-G 编排节 | docs/ROADMAP.md `### P7-G` |
| 双门审计存档 | %TEMP%\synapse_workflow\audits\（bibtex/p7b-plan/tabs01~03 系列） |
