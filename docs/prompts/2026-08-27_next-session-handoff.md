# 任务：SR2-AI-01~05 逐单（P7-G 应用面第一批）→ AI-06~10/LG-01~05 工单化随批次

> 用法：新会话粘贴一行「按 docs/prompts/2026-08-27_next-session-handoff.md 开工」。
> 前任会话（2026-08-26 全天）：**P7-C 全役收官**（工单化 9009c13+六单实现+
> 收官 e2e 3bed876，共 8 提交；战役报告 docs/reports/2026-08-26_p7c-campaign.md）；
> 同日文档群维护（方法论成册 docs/methodology.md+教训档第十节+宪法两处+交接书本文）。
> 本文取代 2026-08-26_next-session-handoff.md（其任务〇/一已完成）。

## 0. 开工前置（强制，不可跳过——上下文污染控制规程）

1. **分级阅读，只读清单内文件/节**：
   - 必读：`AGENTS.md`（重点节：开工纪律/状态与不变量/测试纪律/依赖与提交/
     工单工作流）；本文件全文；**`docs/methodology.md` 全文（新——原理层，
     建立工作法框架，约 5% 预算）**；`docs/ROADMAP.md`「Phase 7+」全节
     （P7-C 已 ✅ 回写+主线执行实况注记）；`docs/invariants.md` 全表
     （**24 条**——16~21 为规划期预登记随 AI 工单锚定；20/24 本日新锚定）。
   - 任务一选读：`docs/reports/2026-08-25_ai-module-plan.md`（v1.1 §4 工单化
     母本含定稿增补列）；`docs/reports/2026-08-25_ai-plan-review.md` §5/§6
     （骨架+导出会话状态机表=AI-02/03 头注母本）；`docs/adr/
     0011-md-corpus-interface-contract.md`（v1.1）；`docs/reports/
     2026-08-25_ai-ingest-lineage-skeleton.md` §2（AI-06~10 骨架）。
   - **摩擦常量清单（开工即知，禁现场学费——08-26 实录九条，详见 p7c-campaign
     §5）**：①quality 行数算法=split('\n').length（尾行+1——写测试/头注先算）
     ②vi.mock 工厂引用模块级变量必 vi.hoisted ③check-tickets 规则 2：src 中
     引用已完成工单号=红（跨票引用一律短形 C-0N，自身标识全形）④受锁文件
     apply 后编辑必 EPERM（编辑前确认解锁态）⑤审计 diff：未跟踪文件先
     `git add -N`；locks:apply 后重导 diff（哈希随 apply 变）⑥fake timers
     轮询测试必须并行 advanceTimersByTimeAsync（await promise 死锁）⑦React
     jsdom：受控输入=原生 setter+input 事件/click 派发子按钮/换 tab 只冲微
     任务 ⑧GBK 终端乱码→vitest 输出用 grep 过滤或 JSON reporter ⑨staging
     显式列文件+提交后不复打 log。
   - **禁止**：全库通读；重读历史规划文档全文（裁决已浓缩 ADR/蓝图 §4.3）；
     拉 commit 长 message 或 Temp 审计 JSON 进上下文（复审只看战役报告 §3）。
2. 技能清点+配置自查（宪法开工纪律；简报必含此节，deepseek 缺失判 WARN）。
3. 全程纪律：受锁 unlock→改→即时 apply+[locked-change]；禁新依赖；一单元一
   commit；先红后绿；双门齐备才提交；机器事实终裁；卡住停下报告；不放宽检查。
4. 开工先跑 `npm run verify`（预期 exit 0，**66 文件 381 用例**）+ `npm run
   test:e2e`（预期 **12/12**）。若不是——停下报告，不要顺手修。测试一律走
   `npm run test`（裸 npx vitest 因 ABI 停 electron 态必假红）。

## 0b. P7-C 交付核对面（开工首站逐项过一遍，每项≤5 分钟）

| 面 | 一句话核对法 | 锚 |
| --- | --- | --- |
| 侧栏三栏 | 打开文献→侧栏「目录/缩略图/笔记」三选项卡切换，切换不丢目录树 | C-04；e2e 第 8 测 |
| α 双层笔记 | 笔记 tab 写总评看「未保存→已保存」四态；划选正文保存→片段列表实时出条目 | C-03；e2e+7 用例 |
| N1 双向定位 | 片段条目单击→标注滚动+闪烁；标注单击→自动切笔记 tab+高亮该条 | C-05；INV-20（9 用例） |
| 语料导出 | 详情面板「导出语料 md」（单篇）；库页「导出语料集合」选目录→corpus/*.md | C-02；**手动视检项**（机器锚=ipc 4 用例） |
| 库侧下线 | 详情面板无「打开笔记」有「去阅读器写笔记」（一键切到阅读器笔记面） | C-06；3 用例 |

随手验清单全文=p7c-campaign §6。

## 1. 背景与当前基线（一段话，细节在指针里）

2026-08-26 单会话完成 P7-C 全役：六张 SR2-C 工单（片段序单源 INV-24→corpus
装配 R12 单源+单篇/全库导出→阅读器 α 双层笔记面→三栏宿主→N1 anchor-locate
三层防线 INV-20→库侧编辑面下线）+收官 e2e（12/12 首跑即绿）。当前：
**verify 66 文件 381 用例 exit 0、e2e 12/12、locks 101、工单 89 open 0、INV 24 条
（20/22/23/24 两日变更）、领先 origin 约 38 提交未 push（决策属用户）**。
工作树残留两处（均不阻塞）：`dist_new/`（不动）、`scripts/audits/`（句柄锁
残留——重启后删或留置，**staging 禁扫入**）。

## 2. 任务序列（顺序：一→二→三穿插四；事件驱动最高）

### 任务一：SR2-AI-01~05 逐单——下一主站
母本=ai-module-plan v1.1 §4（含定稿增补列）：
- **AI-01**：迁移 003 ai_notes 表（DDL 含 question 列+role CHECK——一行一锚定段
  N2 粒度）+repo（FTS v1 不入——zcode grep 承担）；自持锚定三元组与 annotations
  完全解耦（D3 彻底化）。
- **AI-02**：pdfjs 白名单 ESLint 化（INV-16 锚定 [locked-change]——白名单=
  PdfCanvas/TextLayer/CorpusExtractor 三文件）+CorpusExtractor 自持文档生命
  周期+事件桥**单向**（回传走常规 invoke 端点）。
- **AI-03**：五件套导出会话——**corpus md 装配在 corpus.assemble.ts 延展（R12
  单源条款已落地=该文件头注，禁另起装配）**；manifest 终局单写+原子替换+会话
  开始清空重建+单飞 EXPORT_BUSY（INV-17/18 随单锚定；状态机母本=ai-plan-review
  §6）。注意：C-02 已建 corpus/corpusSet 两通道与 corpusSetRes——会话工单按
  ADR-0011 v1.1 判定复用或演进（[locked-change]）。
- **AI-04**：设置页导出入口+App 层订阅+toast（进度可见性走应用 UI 事件）。
- **AI-05**：tools/ai-sensor 工具骨架（断点续跑队列幂等——vitest 宿主）。
- **站间停点：2~3 单一会话**（08-26 上下文实测收紧——单边界停+交接书承接）。
- 工单化流程同 P7-C 先例：`npm run ticket:new`+状态机前置表+deepseek plan 门
  （mode=plan）+GLM 二审。

### 任务二：AI-06~10 工单化+实现（随批次）
契约=ADR-0015（B' 伴随进程协议+回灌+N2 粒度）；骨架=skeleton §2（job 生命
周期状态机=idle→submitted→picked→reading→done/failed/abandoned 母本）。
**头注引用裁决指针写「蓝图 §4.3」**（B4 规则 6 decidedScopes 已含 P7-G/P7-H）。
渲染对等 INV-19/伴随进程 INV-21 随单锚定。

### 任务三：LG-01~05 工单化（P7-H 脉络图）
契约=ADR-0014（lineage 模型+迁移 004）；骨架=skeleton §3（tidy-tree 纯函数+
autosave 态空间+退出拦截并集接缝）。**LG-04 侧板双击跳转必须复用
anchor-locate（INV-20 单入口——禁各写降级）**。

### 任务四（穿插）：C1 防线升级评估
INV-11 单源常量/INV-07 路径字面量 lint 化可行性 → 落 ADR（0010 空号已核实，
**下一可用 0016**）。等待审计/用户反馈的间隙穿插。

### P7-F：主线遗留位（非本任务序列，说明性）
C 先行已按 N1 增补块裁决（F-aware）；F 落地只换滚动实现——接口冻结点=
anchor-locate 签名+annotation-order 语义（ROADMAP 主线注记）。

### 事件驱动（最高插队）
用户人工验收缺陷 → 双门修复单元。随手验清单=§0b+p7c-campaign §6。

## 3. 执行批次

1. §0 前置+双基线绿+§0b 核对面过一遍。
2. AI-01→02→03（→04→05，预算内）——每单一提交，2~3 单即停出交接。
3. AI-06~10 工单化批次 → 实现。4. LG-01~05 同。5. C1 间隙穿插。
6. 每站收官回写 ROADMAP；**push 前问询用户**（现领先约 38 提交）。

## 4. 终止条件（预声明，沿用战役契约）

- 同一单元 deepseek 回炉 ≤2 次仍不收敛 → 停下升级用户（UNDO-01 先例警示；
  每 BLOCKING 配回归用例+净增量 diff）。
- 审计输入携带全部前轮裁决（简报累积制）；BLOCKING 被机器事实证伪时携核验
  事实重审一次；发现测试/契约问题→停下走 [locked-change]。
- 「不做」是合法结论但须 ADR+量化依据；无用户明示不 push、不打安装包。
- **上下文止损**：会话预算吃紧在单边界停（约 60% 消耗时预告），勿燃烧到
  最后一刻——交接书取代制承接。

## 5. 基础设施与历史教训

- 08-25 版十条全数有效（交接书存档：双门调用例/900s 三态/变异红证文件备份法/
  e2e 四坑/Toast 拆分/行数守恒/shell 瞬时态/质量关卡算法/版本口径）。
- 08-26 新增九条=p7c-campaign §5（已浓缩入本文 §0 摩擦常量清单——开工即读）。
- **上下文控制三措施（本版起为纪律）**：①摩擦项常量化（§0 已列）②战役/
  批次 2~3 单切会话、单边界停 ③提交后不复打 log。方法论层=docs/methodology.md
  P12。
- 双门审计器：`%TEMP%\synapse_workflow\deepseek_audit.py`（--mode diff|plan；
  key 在 ~/.zcode/v2/config.json）；产物存 audits/ 子目录；简报存 briefs/。
- 版本口径：Electron 42.9.3+Node 24；测试走 npm run test；三命令收敛不变。

## 6. 关键文档与工单指针（速查）

| 对象 | 位置 |
| --- | --- |
| 方法论（原理层，新） | docs/methodology.md |
| P7-C 战役报告（含审计链+新教训+随手验） | docs/reports/2026-08-26_p7c-campaign.md |
| AI 工单化母本（01~05） | docs/reports/2026-08-25_ai-module-plan.md（v1.1） |
| 骨架母本（06~10+LG） | docs/reports/2026-08-25_ai-ingest-lineage-skeleton.md |
| 契约三件 | docs/adr/0011（v1.1）/0014/0015 |
| 导出会话状态机 | docs/reports/2026-08-25_ai-plan-review.md §6 |
| INV 登记册（24 条） | docs/invariants.md |
| corpus 装配单源（R12 落地点） | src/main/services/export_/corpus.assemble.ts 头注 |
| 锚点定位服务（INV-20） | src/renderer/features/reader/anchor-locate.ts 头注 |
| 双门审计存档 | %TEMP%\synapse_workflow\audits\（c01~c06/p7c 系列） |
