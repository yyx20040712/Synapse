> 证据档｜2026-09-17 四路只读调研之四（工单/测试/脚本/存储盘点）
> 产出：Explore 只读子代理；转录原样未改——分析责任归产出方，勘误以裁决书为准。
> 消费：docs/design/2026-09-18_complexity-governance-ruling.md §7

# Synapse_remake 过程资产与债务面盘点报告

盘点时间 2026-09-17；所有数字来自 grep/wc/find/node/git 实测，命令随条附注。

---

## ① 工单全景（tickets/registry.ts，291 行）

**总量与状态**（`grep -c "{ id: '"` / `grep -o "status: '...'" | sort | uniq -c`）
- 工单总数 **183**；status: **done 174 / open 9**（仅两态，无其他）
- owner: **strong 131 / weak 52**（强弱模型双轨制）
- area 分布：reader 47、infra 45、service 20、ipc 11、library-ui 10、ui-kit 10、lineage 9、db 8、settings-ui 5、tags-ui 5、network 3、hooks 3、notes-ui 2、workspaces 2

**前缀分组**（工单号 awk 切前缀 `sort | uniq -c`，Top）：SR-INFRA 17、SR2-AI 12、SR-SVC 10、SR2-F 9、SR-RDR 9、SR-IPC 9、SR2-LG 8、**F-TESTREF 8**、SR-LIB 7、P7E 7、F-LINT 7、SR2-C 6、SR-DB 5、SR2-TABS 4、SR2-ENR/SR-UI/SR-TAG/SR-NET/P7X/F-CSS 各 3、R2-* 6、R3-* 3、R1-WS 2，其余 F-单票约 20（C-A3/B7/P7A/P7D/F-A6~A12/F-R2/F-R3 等）各 1。

**open 工单逐条（9 条，全部 owner=strong）**（`grep "status: 'open'"`）：

| id | 标题（票面摘要首句） | owner |
|---|---|---|
| F-TESTREF-S1 | 指纹门抽取器语法子集补强（each 双层/本地别名/type-only 三残留） | strong |
| F-TESTREF-W1A | 测试优化战役 W1a=mock 工厂下沉（39 文件 vi.mock 单源化） | strong |
| F-TESTREF-W1B | W1b=几何桩+局部工厂下沉（22 文件 97 处几何桩） | strong |
| F-TESTREF-W1C | W1c=e2e 脚手架单源（launch 5 副本+seedPaperRow 5 处） | strong |
| F-TESTREF-W2 | W2=探针 spec 移出默认门（z-* 探针 719 行≈e2e 16%） | strong |
| F-TESTREF-W3 | W3=src/shared 直接契约测试补齐（覆盖倒挂最薄面 0.32→≥0.8） | strong |
| F-TESTREF-W4 | W4=不确定面机件化（flake 台账+INV-63/64，战役收官票） | strong |
| F-DEDUP-01 | 服务层偶然复杂度收敛（DomainError 15 文件/原子写 13 处单源化） | strong |
| F-GEOM-01 | INV-58 双几何族同族化战役（pdf 项几何族收编 DOM 量测族） | strong |

即：当前债务集中在**一个未完战役（F-TESTREF 测试优化，7/8 open）+ 2 张结构收敛票**。

**战役脉络**（按票面日期注释推断，一句话/段）：
1. **骨架期（08-21~）**：SR-INFRA 17 票强模型铺基础设施，weak 52 票分层填 ipc/db/svc/net/renderer UI——"强骨架+弱填肉"双轨。
2. **SR-PKG（08-22）**：NSIS 打包+安装包冒烟，Phase 6 分发。
3. **Phase 7 v2（08-23~24）**：SR2-KEY/ANNO/UIK/TABS/UNDO——快捷键+多标签+撤销。
4. **SR2-C（08-26）**：笔记结构化重构（双层 α+DB 真相源）。
5. **SR2-AI 两批（08-27）**：AI 传感器全链（ai_notes 基座→语料导出→伴随进程回灌→zcode 联动）。
6. **SR2-LG/ENR/F（08-27~09）**：脉络图、被引数据、阅读器页列几何与滚动战役（F-01~09）。
7. **R1/R2/R3 用户需求三役（约 08-28~29）**：课题域隔离（WS）、脉络视觉两轮重制（LG9~12）、全库视觉系统（TH1/LIB/RDRSET）、应用重命名迁移（SH1/2）。
8. **修正役+预留点清扫（F-R2/F-R3/P7A/P7E-01~07，08-30~09-02）**：滚动漂移、pdfjs 泄漏、剪贴板竞态、标签生命周期/拖拽导入/页内搜索/剪贴板导出/阅读时长/多选过滤/智能排序。
9. **F-A6~A12 划选几何战役（09-03~10）**：五轮方案残留根治，取证→决策门→迁移→收口全链。
10. **治理/关卡战役（F-AUDIT/SPLIT/CSS-01~03/LINT-01~04/TOOL/REG/DOC/LOCK/SNAP/TESTREF-00，09-05~16）**：audits 清场、组件拆件、CSS 分域、颜色/字号/双常量 lint 机器化、测试面指纹门。
11. **遗留（open）**：F-TESTREF 战役后半程 + 服务层去重 + 双几何族收敛。

---

## ② 测试面数字

**目录结构**（`ls -R tests`）：contracts / e2e / security / unit（11 子域）/ utils。

**文件数**（`find tests -name "*.test.*" | wc -l` 与 `-name "*.spec.ts"`）：
- 单测文件（**.test.ts/.tsx**）：**162** = unit 156 + contracts 3 + security 3
- unit 细分：renderer **88**、services 27、ipc 12、db 16、windows 4、main 2、shared 2、tools 2、http/preload/protocol 各 1
- e2e spec：**17**（含 2 个 z-* 探针 spec + seed-paper.mjs + e2e-env.ts 脚手架）

**用例数**（grep 实测）：
- `describe(`：**213**；`it(`：**1419**；`it.each(`：3 处；`expect(`：**4854**；`.skip` 20 处
- e2e：`test(` **44** 个用例、`test.describe(` 3 处
- **指纹门基线自报**（node 解析 `scripts/test-surface.baseline.json` → stats）：**fileCount 179 / caseCount 1623 / assertionCount 4979 / skipSite 15（全 conditional，hard 0）/ eachExpandedRows 160 / unresolvable 0**
- 对账闭合：1419 `it(` + 44 e2e `test(` + 160 each 展开 = **1623** ✓（指纹门口径含 e2e 标题面，故 179 文件 = 162+17）

**配置面**：
- playwright.config.ts（21 行）：testDir tests/e2e、workers=1、fullyParallel=false、CI retries=1、timeout 60s、forbidOnly（CI）、trace on-first-retry、outputDir test-results——串行防抖取向。
- vitest.config.ts（52 行）：node 环境；coverage v8，**阈值三级：全局 70 / src/main/db/repos 85 / src/renderer/*.ts 60**；e2e 排除在外。

**豁免与锁定**：
- `scripts/test-surface.exemptions.json` = `{"version":1,"entries":[]}`——**空，零豁免，无任何 reason**（指纹门全量生效）。
- sha256 锁定（node 解析 locks/manifest.json）：tests 相关 **187 条** = unit 156 + e2e 19（17 spec+e2e-env.ts+seed-paper.mjs）+ utils 6 + contracts 3 + security 3——**全部测试文件及脚手架均在锁内，无一漏网**。
- 116 个测试文件引用 guard（guardedDescribe/isTicketDone）——工单状态驱动测试激活（K3 防作弊）。

---

## ③ scripts/ 资产账

**清单与行数**（`wc -l scripts/*.mjs *.ps1 *.py *.json`）：代码+数据共 **19 文件 26310 行**；其中基线 json 占 23910 行。代码文件（不含 json）**16 个 2400 行**：

| 类别 | 文件（行数） |
|---|---|
| CI 关卡（6） | check-quality 378、check-test-surface 419、check-tickets 269、check-dup-constants 243、check-locks 90、check-model-names 52 |
| 锁管理（3） | lock-protected.ps1 42、get-protected-files.ps1 27（共享清单单源）、unlock-protected.ps1 14 |
| 正则单源（1） | color-re.mjs 68（F-LINT-04 色值正则唯一字面量） |
| 构建辅助（3） | installer-smoke 211、local-state 176、dist 68、sqlite-abi 121 |
| 流程工具（1） | new-ticket.ps1 34（打印工单模板） |
| 一次性/外部审计（1） | deepseek_audit.py 180（08-23 多智能体审计流水线遗留，唯一 .py） |
| 数据基线（3） | test-surface.baseline.json 23910、dup-constants.baseline.json 4（entries 已清空=棘轮收紧终态）、test-surface.exemptions.json 4（空） |
| 子目录 | test-surface/extract.mjs 480（指纹抽取器） |

**ai-dev-org 派发器类**：scripts/ 顶层**无** dispatch 脚本；派发证据沉淀在 **scripts/audits/**——`2026-09-10_w5-dispatch.sh`（audits 内唯一 .sh）、`f-testref00-kimi-dispatch-log.md`（含 5 轮 17 attempt 504 排障）、`night1-gate1-dispatch*.raw.txt` 共 4 个 dispatch 文件；派发器本体（v2.2.1，最新提交提及）在仓外 Zcode 会话侧，AGENTS.md:103 定义"三屋模式"派发纪律。audits 内 92 个 .mjs 绝大多数是**审计取证探针**（forensics probe），即派发/门审流程的产物。

**scripts/audits/**（只看量级）：**3099 个文件、56 个子目录（含 37 个 `*out*` 数据目录，已 gitignore 不入库）**；按扩展名 txt 1240 / md 663 / json 460 / log 285 / png 208 / mjs 92 / diff 67 / patch 51 / pdf 24；顶层条目 2408；文件名含 brief 106、report 125、gate 675——**这是一座与产品代码同量级的"过程证据山"**（对比：src 触达 991 次 vs audits 触达 2373 次）。

---

## ④ locks/ 清单

`node -e "require('./locks/manifest.json').files.length"` = **328 个文件**，generatedAt 2026-09-16。目录分布：

| 目录 | 数量 | | 目录 | 数量 |
|---|---|---|---|---|
| tests/unit | 156 | | tests/utils | 6 |
| scripts/audits | 92 | | tests/contracts | 3 |
| tests/e2e | 19 | | tests/security | 3 |
| scripts | 18 | | scripts/test-surface | 1 |
| src/shared | 13 | | docs（invariants.md） | 1 |
| src/main | 8 | | .github/workflows/ci.yml | 1 |
| 根配置 | 各 1 | | (tsconfig×3/vitest/playwright/eslint/electron.vite) | 7 |

结构：**测试面 187 + scripts 面 111 + src 21 + 根配置 9**。注意 renderer 源码几乎不在锁内（锁的是"契约与证据"，不是实现）。

---

## ⑤ CI 关卡清单（.github/workflows/，仅 ci.yml 一个）

**job `verify`**（windows-latest，30min，Node 24，fetch-depth 0）按序：
1. `[dep-change]` 尾注检查——package(-lock).json 变更的提交必须带尾注
2. `check-locks.mjs`——受锁文件 sha256 对账
3. `check-quality.mjs`——占位标记/乱码/跨域互引/字号+颜色字面量负锚/C-4c var() 语义锚
4. `check-tickets.mjs`——工单一致性（K3：引用号必须存在、done 后禁 NotImplementedError）
5. lint（max-lines 500+分层边界）→ typecheck
6. vitest 单测+契约+覆盖率（三级阈值）
7. build（electron-vite）→ e2e（Playwright _electron，产物复用）
8. 失败 artifact 上传 → `npm audit --omit=dev --audit-level=high`（高危即红）

**job `lock-change-guard`**（ubuntu，5min）：
- `[locked-change]` 尾注检查（manifest 变更须带尾注，K2 双锁）
- `[test-refactor]` 战役范围闸——带该尾注的提交 diff 路径必须 ⊆ 白名单正则，**src/** 一律红（F-TESTREF 战役附加层）

---

## ⑥ 根目录残留账（du -sh + git ls-files + .gitignore 交叉）

| 目录 | 大小 | 内容 | gitignore | git 跟踪 | 判定 |
|---|---|---|---|---|---|
| local-state-backup/ | **45M** | synapse-local-state-20260827-1910.tar.gz（08-27 设备迁移备份） | ✓ | 0 文件 | 本机备份，可外移归档 |
| dist/ | **117M** | electron-builder 产物（setup.exe+blockmap+win-unpacked） | ✓ | 0 | 可再生构建产物，最大占盘 |
| dist_new/ | 7.0M | win-unpacked/；ignore 注释明示"**2026-08-28 遗留池处置：勿入库**" | ✓ | 0 | 命名即残留，可清 |
| out/ | 10M | electron-vite 构建输出（e2e 前置） | ✓ | 0 | 可再生 |
| test-results/ | 512K | playwright 失败产物 | ✓ | 0 | 可再生 |
| coverage/ | 512K | vitest html 覆盖率 | ✓ | 0 | 可再生 |
| tools/ | 6.0M | ai-sensor 工具 12 文件（11 跟踪+config.json 密钥忽略） | config.json ✓ | 11 | 正常资产（SR2-AI-05 交付物） |
| build/ | 512K | icon.ico | ✗ | 1 | 正常资产 |

**该清未清判定**：`git status --porcelain` 未跟踪非忽略文件 = **0**，工作区干净，dev-launch.cmd/*.tsbuildinfo 均已 ignore——**git 层面无未清项**；唯一灰区是 dist_new（7M，遗留池标记）+ local-state-backup（45M）这 52M 纯本机残留占盘，不影响版本库。

---

## ⑦ git 速度曲线

**总量**：`git rev-list --count HEAD` = **451 提交**（2026-08-21 → 09-16，28 天，均值 **16.1/天**）。

**按日分布**（`git log --format=%ad --date=short | sort | uniq -c`）：
08-21:47 / **08-22:64（峰）** / 08-23:32 / 08-24:10 / 08-25:19 / 08-26:18 / 08-27:25 / 08-28:26 / 08-29:32 / 08-30:21 / 08-31:17 / **09-01:5（谷）** / 09-02:28 / 09-03:27 / 09-04:14 / 09-05:11 / 09-06~08:**0** / 09-09:31 / 09-10:14 / 09-11:0 / 09-12:3 / 09-13~15:0 / 09-16:7。

三段休耕（09-06~08、09-11、09-13~15）与战役节奏吻合（门 3 真机测试 09-09 回归后转入治理期）。

**目录触达 Top**（最近 30 天=全历史，`git log --name-only | awk -F/ '{print $1}' | sort | uniq -c`）：
**scripts 2445（其中 scripts/audits 独占 2373 = 全部触达的 47.3%）** > src 991 > tests 447 > docs 433 > locks 209 > tickets 168 > AGENTS.md 34 > tools 16。

**最近 7 天**（09-10 起，10 提交）：scripts 50（audits 38）/ src 14 / docs 9 / locks 5 / tickets 3 / tests 2——**末期活动重心已从产品代码转向证据归档与关卡治理**。

---

## ⑧ 历史事故模式归纳（AI辅助开发经验教训.md，357 行）

章节骨架：一时间线 / 二·三个核心症状（AI 幻觉、代码淹没上下文、越做越乱） / 二·五有效修正（A~G 七则） / 四·五可执行模板 / 五行动速查 / 六三条守则 / 七下一步 / **八~十二·五节增补事故存档**（08-22 防线自身被审查、08-22 审计流水线、08-24~26 战役制、08-29 F1 划选、08-29 R2 修正役）。

**最近 5 条事故标题**（第十二节，2026-08-29 R2 修正役，倒序）：
1. 工单号前缀即检查域选择（R2 系正则盲区→"open 0"是假象）
2. 导入整批替换语义=用户心智危险面
3. ABI 换绑的 Windows 文件锁竞态三防线
4. 「纯 CSS 级」判断漏掉布局语义副作用（U4 回归）
5. sed 连续行号删除漂移破坏块结构

**反复出现的事故模式类型**（跨八~十二节归纳，按频度）：
1. **"绿"的三重假象**（最高频）：断言绿≠全量绿≠真实数据形态绿——DOM 断言全绿≠真机可见（十一节）、isCore 入度≥2 在树单父下数学恒假+夹具绕 service 守卫=假绿（十二节）、同名双元素 strict violation（十二节）、F-CSS-02 枚举锚漏新值。
2. **证据链断供**（第二高频）：*.log 被 gitignore 静默拦+add 吞警告 18 文件未入库、diff 包先 add 致 staged 缺件、manifest 有 sha 无文件（F-A8 门 0 教训）、python 截断 ADR 事故——"证据只在工作区=连第一重追溯都丢"。
3. **防线自身的时间演化失效**：sqlite-abi 选缓存最大 ABI 号被伪造目录静默采用、registry 正则锁键序/前缀盲区、lock/unlock 集合三处漂移、审计报告"已实锤"复跑证伪——"防线也要进审查清单"（八节主题）。
4. **同域多次失败=路线病**：划选三轮三机制打补丁（十一节）→ F-A6 五轮触发远超二次重构线后才"设计文档先行"——3+ 次失败必须质疑通道/架构而非调参数。
5. **审计器即基础设施故障**：审计输入不新鲜（修复后复审用旧简报）、推理模型输出预算不足（16K 全耗 reasoning）、回炉无终止条件振荡（UNDO-01 七轮四回炉）、CI 尾注检查是路径触发不看内容（九节）。
6. **用户语言→设计语言转译错位**：「太丑」实为文字溢出功能缺陷、「被引≥2」译成入度恒假、夜幕星象板全量落地即被整体否决——须 mockup 多模态评审+公式可达性推演前置。
7. **机检摩擦与环境怪癖重复付费**：质量关卡行数算法连咬六七次、GBK 乱码重读输出、CDP 取证三戒、Windows 文件锁竞态——对策是"摩擦常量化入册"，不许每会话重新学费（交接书 §0 清单）。

---

### 总画像（一段话）

这是一个**以"工单注册表+sha256 锁+多门审+证据归档"为控制面的 AI 驱动开发仓**：183 票仅余 9 open（全在一个未完的测试优化战役），451 提交/28 天高强度推进，过程资产（scripts/audits 3099 件证据、92 件探针、328 锁）体量已超产品代码触达本身；债务面不在"没做"，而在**测试脚手架五倍重复（mock 39 文件/几何桩 22 文件）、双几何族并存、服务层偶然复杂度**三张已立案的结构票，以及 52M 本机残留（dist_new+local-state-backup）与一座只增不减的 audits 证据山。
