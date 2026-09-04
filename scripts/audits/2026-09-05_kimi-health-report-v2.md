# Synapse 全仓健康体检报告 v2（2026-09-05 交接场——Kimi 主会话亲验版）

> 体检场：2026-09-05 场首（第四次 Ruling：交接场首动作=Kimi 全面体检反馈主控）。
> 体检人：**Kimi（主会话形态——区别于 2026-09-02 首份的外链零仓库形态，本次全部
> 结论有亲跑命令输出或源码亲读为据）**。开工记录=2026-09-05_session-start.md。
> 本报告=反馈件：分级发现+证据锚+建议动作，**终裁与排期权归 GLM5.3 主控**。

---

## 一、总体判断（摘要）

**全仓处于「防线全部在场且实战中、余量面开始见底」的健康态**——无 P0 阻断项，
无腐败征兆；真正的信号在三处「余量耗尽预警」：组件物理行 4 件贴线（余量 1 行）、
scripts/audits 留档面口径漂移（356 项未跟踪）、theme.css 持续增长无关卡。
两票新落地（P7D-01 token 三轴/P7X-02 outbox）证据链完整、边界申报诚实、
期二清单清晰——新码质量面未见侵蚀。

## 二、基线数字亲验（§0）

| 项 | 交接书 v47 值 | 本体检亲跑 | 一致性 |
| --- | --- | --- | --- |
| verify | 156 文件/1422 用例/locks 286/exit=0 | **156/1422/286/exit=0**（kimi-audit-verify.raw.txt） | ✓ |
| registry open | 2（P7D-01/F-A8） | grep 实测 2 open/149 done | ✓ |
| 工作树 | 跟踪面干净 | 非 ?? 行=0 | ✓ |

## 三、架构与债务面

### 3.1 行数红线：**双口径复核——无违例，但贴线预警**

- ESLint max-lines=500（skipBlankLines+skipComments）：全仓有效行最高=schemas.ts 326，
  **无一超线**。pdf-item-geometry.ts 物理 514/有效 318——62% 注释密度是文化层风格非压力。
- check-quality 分层关卡（**物理行**口径，scripts/check-quality.mjs:120-125）：
  **4 组件贴线余量 1 行**——PageColumn.tsx 249、AnnotationLayer.tsx 249、
  AiNotesSection.tsx 249、LineageBoard.tsx 249；ReaderPage.tsx 248（余量 2 行）。
  **结论：这五个组件下一次任何净增行必破线**——拆件预案应先行而非撞线再拆
  （历史范式=趁早拆：annotation-anchor 476→339/PageBox 拆件先例正确）。

### 3.2 分层/类型/死代码

- 分层五旗标（sandbox:true/contextIsolation:true/nodeIntegration:false/webSecurity:true）
  在档（main-window.ts:64-68）；类型检查**全域覆盖实证**（探针：tests/unit 新建 .ts
  测试写类型错误→tsc exit=2 命中——tsconfig.node include 含 tests/**/*.ts，
  tsconfig.web 含 tests/**/*.tsx，无盲区）。
- 孤儿件扫描：零真孤儿（唯一命中 env.d.ts=类型声明误报，tsconfig include 消费）。
- 运行时依赖 **6 个**（better-sqlite3/pdfjs-dist/react/react-dom/zod/zustand）——
  预算 15 的 40%，余量充裕。

### 3.3 tsconfig.node「jsx 债」定性修正（v46 观察项）

实证修正：**非覆盖盲区**。债的真实形态=.ts 测试 import .tsx 链时报 TS6142
（node 程序无 jsx 配置）——是「报错不直观」的体验债+隐性约束（.ts 测试禁直
引组件）。F-A8 门 0 的绕行（结构最小面）已验证可行。处置候选=tsconfig.node 加
一行 `"jsx": "react-jsx"`（成本极低）或测试纪律注明约束；**P2**。

### 3.4 theme.css 645 行

CSS 无 lint 关卡（ESLint 无 CSS 面）——P7D-01 批一后持续增长，批二字号轴还会再加。
当前可读性尚靠分节注释维持。处置候选=按域拆件（theme 核心 token+shell/reader/lineage
段）或先登记 CSS 行数关卡防失控；**P2**（批二前是拆分的最佳窗口——字号轴落地后
再拆=二次漂移面）。

## 四、安全红线面（全绿，无发现）

五禁令 grep 零违例；SQL 全 prepare+参数绑定（抽查 lineage.repo.ts:190-194 模板
字面量无拼接）；openExternal 单点经 shell-guard（security/shell-guard.ts:55）；
出网白名单在 src/shared/constants.ts:19；CSP default-src 'self' 在构建产物核证。

## 五、测试与守卫面

### 5.1 INV 册：60 条 = 55 已锚定/5 部分/0 未锚定

部分态五条均为**在档的人审/手动面**（INV-02 lint 化不可行已实证/INV-07+INV-54
真实 OS 拖拽手动验收/INV-11 双源人审/INV-13 折叠点人审）——非欠账失控，是诚实
登记。机器化候选（INV-11 lint 规则立项）维持 P3 备案。

### 5.2 always-active 合规

新件抽查合规：reading-time-outbox.test.ts 的 guardedDescribe 命中为头注声明字样
（「always-active（三屋纪律不经 guardedDescribe）」），非调用；anchor-item-verify
.test.tsx 无守卫。TODO/FIXME/placeholder grep 零命中（CI quality 关同口径）。

### 5.3 e2e 覆盖评估（17 spec/43 用例）

主路径全覆盖（导入/标签/脉络/阅读器五面/工作区/导出/缩放/outbox 重放）；设置缩放
有 R2-SET1 用例（smoke.spec:160）。已知残余=outbox「真实 enqueue 链」e2e 注种形态
（P7X-02 门一 E-1 在档接受：重放链全真，enqueue 链由 24 单测锚）——**该残余申报
诚实，接受成立**，但若未来 enqueue 装配面（setup.ts）再演化，建议补一条真实阅读
→强杀→重放的 e2e（当前注种形态对装配面回归盲）。P3。

## 六、新落地面专项复核

### 6.1 P7X-02 outbox（done 后首场复核）

- 边界清单在档完整性 ✓（设计书 §7 七条+§10 第八条「活卷防抖直发面交叠窗」——
  暂态回退自愈，频率需失败积压×同卷回访交叠）。**评估：接受记录正确，无急迫性**；
  期二候选（幂等键/per-paper 退避/死信手动修复路径/全页写穿 outbox）清单清晰。
- 回炉三 W 落地形态抽读核验：main.tsx 渲染先行+void 后置 ✓（W1 行序门二已静态
  断言，本体检复核源码一致）。
- **一个新增的结构性观察**：outbox 与 scroll-progress 现在共享同一 saveProgress
  通道但语义分裂（时长=队列持久化/页码滚动期=防抖直发、卸载期=队列）——「页码
  两种投递语义按收尾口分裂」是设计书已声明的取舍（§10-8），当前成立；若期二做
  「全页写穿 outbox」，此分裂自然消解。无需动作，维持观察。

### 6.2 P7D-01 token 体系（批二衔接面）

- --dur-*/--z-* 命名与 --fs-* 扩展兼容 ✓；theme.test.ts 锁面（负锚 21 三元组+形态
  锁）对批二改值面同样生效（新增 --fs-* 须同步扩 TOKENS——批二票面的自然条目）。
- 探针 p7d01-visual-probe.mjs 复用前提=批二改值前重采 baseline（交接书已记）；
  **补充提醒**：批二将改字号值=探针 PNG 逐字节对比将**预期失败**（字号变化是票面
  目的）——验收口径需从「零视觉差」切换为「逐档用户裁决的定向 diff 复核」，
  批二票面应预写该口径切换，避免实现者误把预期红当缺陷回退。

## 七、流程与控制面

### 7.1 registry 一致性 ✓

2 open（P7D-01 批二在场轮待/F-A8 门 3 观察期）=交接书口径一致；基线数字衔接
可解释（1357→1398→1422 两段递增均在案）。

### 7.2 scripts/audits 未跟踪面 356 项（**P1**）

全量归属 scripts/audits/（93 项 -out/ 数据目录+其余 raw/md 证据留档），项目根与
源码目录零杂散 ✓。但**入库口径漂移**：f-a8-gate2 场全证据集入库（28 件）、
p7d01/p7x02 场入库，而 auditc/f-l4/ds- 等历史场次大量 raw 件未入库——同一类
证据件两种处置。风险面：①git clean 误删=历史证据不可恢复；②clone 后 CI/审查
无法复现历史红证；③教训行引证的 raw 路径在仓库外漂移。**建议主控裁决入库口径
一次清场**（全入/前缀白名单入/全不入+本地归档规范三选一，落 AGENTS.md 或
scripts/audits/README）。

### 7.3 git 健康

fsck exit=0（dangling blob/tree=gc 前正常态）；geometric-repack 噪声在档忽略条款
（AGENTS.md 环境事实）维持适用。

## 八、风险排序（供主控终裁）

| 级 | 项 | 证据锚 | 建议动作 |
| --- | --- | --- | --- |
| **P1** | 组件物理行 4 件 249/250+1 件 248 贴线 | check-quality.mjs:124 物理行关卡；wc 实测 | **下批附带拆件预案小票**（五组件择先拆 PageColumn/LineageBoard——reader/lineage 是近期增长面；拆件=纯结构票零行为差） |
| **P1** | scripts/audits 留档入库口径漂移（356 项未跟踪） | §7.2 | 主控裁决口径+一次清场（本场外溢成本=一次 git add 决策） |
| **P2** | tsconfig.node jsx 债（定性修正：体验债非盲区） | §3.3 探针实证 | 一行 `"jsx": "react-jsx"` 或纪律注明；顺带核销 v46 观察项 |
| **P2** | theme.css 645 行无关卡持续增长 | wc 实测；批二将再增长 | 批二前拆分窗口期；或登记 CSS 行数关卡 |
| **P2** | outbox 期二清单（幂等键/per-paper 退避/全页写穿） | 设计书 §7/§10 | 维持备案，观察期真实使用数据后再裁 |
| **P3** | INV 5 条部分态（人审/手动面）+e2e 注种残余 | §5 | 维持备案；机器化 lint 立项待闲时 |
| 备案 | F-ARCH4-M1 多场零现/F-R3 stream 泵竞态 | 交接书 v47 | 维持被动观察不变 |

**总体建议下一开发序**（供主控终裁，非终裁）：①P1 拆件小票（闲时可动，零用户
依赖）→②audits 口径清场（主控单次裁决）→③待用户在场的 P7D-01 批二（附 §6.2
探针口径切换条款）→④F-A8 门 3（观察期满足后）。

——体检毕。本报告一切数字有亲跑输出或源码行号锚；无「应该/可能」级结论。

---

# 主控终裁处置记录（2026-09-05,GLM5.3——体检反馈终裁,§八排期权兑现）

> 逐条裁决+立案/执行安排;精确三桶计数（357=246+99+12,scripts/audits/bucket
> 分类脚本口径——226 证据文本+4 diff+16 根级 json=246 入库桶;99 *out* 数据目录;
> 12 backup 残留）。tsconfig.node.json **在锁面**（manifest 实核）——jsx 修=[locked-change]。

| 体检发现 | 终裁 | 处置 |
| --- | --- | --- |
| P1-1 组件物理行 4×249+1×248 贴线 | **接受,立案** | **F-SPLIT-01**（五件小同形合票,三屋;纯结构零行为差;探针 baseline 重采+COMPARE PASS 验收;拆件目标余量 ≥80 行/件;AnnotationLayer=编排消费面纯搬运禁触语义） |
| P1-2 audits 留档口径漂移 357 项 | **接受,口径三桶裁决+立案** | **F-AUDIT-01**（主控自为单）：①246 证据件入库 ②99 out 目录不入+.gitignore 增 `scripts/audits/*out*` 形态防再犯（.gitignore 非锁面）③12 backup 删（删前抽样核验=源文件副本+确认报告引用 raw 日志非备份本体） |
| P2-1 tsconfig.node jsx 债 | **接受（定性修正采纳——体验债非盲区,探针实证纠偏有效）** | 并入 F-AUDIT-01 顺带（一行 react-jsx;受锁 unlock→apply;typecheck 复跑;独立提交） |
| P2-2 theme.css 645 行无关卡 | **接受,立案** | **F-CSS-01**（分域拆件:token 块留守+皮肤段按域拆;批二前窗口;theme.test.ts 受锁扩展同票;可选 CSS 行数关卡登记） |
| P2-3 outbox 期二清单 | 维持备案 | 观察期真实使用数据后再裁 |
| P3 INV 5 条部分态/e2e 注种残余 | 维持备案 | INV-11 lint 机器化候选待闲时 |
| §6.1 页码投递语义分裂观察 | 维持观察 | 期二「全页写穿 outbox」若立项自然消解 |
| §6.2 批二探针口径切换提醒 | **采纳** | 批二票面预写条款（零视觉差→逐档定向 diff 复核口径切换+预期红申报）——在场轮开场件 |
| 备案项（F-ARCH4-M1/F-R3 等） | 维持 | 被动观察不变 |

**下一大批次执行序**（=交接书 v48 §2）：F-AUDIT-01（清场+顺带,两提交）→
F-SPLIT-01（三屋）→F-CSS-01（三屋）→P7D-01 批二（在场轮,票面含 §6.2 条款）→
F-A8 门 3（观察期条件满足后）。本段产物（体检报告/开工记录/verify raw）随
交接书 v48 提交入库（口径桶①）。
