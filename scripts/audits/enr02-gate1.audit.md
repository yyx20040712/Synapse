# SR2-ENR-02 门一对抗深审档（venueTier 映射与 manifest 装配）

- 审计者：三屋模式门一子代理（独立于实现者，不信任其报告任何断言，逐条对实物核实）
- 日期：2026-08-28；基线 HEAD=6e5a3b2（ENR-01 收口，git log 证实）
- 模式：只读审计（禁改源文件/测试/配置；禁 npm/test/verify 执行；主控已亲验 verify exit=0+e2e 20/20）
- 技能清点（宪法开工纪律）：code-review-excellence 不用（票面工单 A~E 已给出完整对抗审计程序，按票面程序优先）；systematic-debugging 不用（无调试面，纯实物核对）；test-driven-development 不用（不写实现，只审 TDD 证据）；verification-before-completion 不用（变体：完成验证=本档落盘后 Read 回读，命令执行禁令不适用其流程）。其余技能为领域知识库，与本审计无关联面。

## 输入核实

| 输入 | 实物 | 判定 |
| --- | --- | --- |
| diff 包 enr02-gate1.diff（413 行） | 逐文件与工作区实物（venue-tier.ts / corpus.assemble.ts / corpus.export.service.ts / interface-template.ts / ADR-0011 / locks/manifest.json / 两受锁测试 / 新测试）对照一致 | 可信 |
| 票面母本 | src/shared/venue-tier.ts 头注五层（L2-57）+ enr-ticketing-draft.md SR2-ENR-02 节（L149-223） | 可信 |
| 实现者报告 enr02-impl.report.md | 逐节对实物核（见 D） | 一处 W（清单口径） |
| 首红日志 enr02-first-red.log | 12 failed 清单逐条与三宿主用例对上（8+2+2） | 可信 |
| verify 日志 enr02-impl-verify.log | quality/tickets(106 open 1)/locks(137)/lint/typecheck 全段+Test Files 89 passed (89)/Tests 652 passed (652)+build 完成+`exit=0`（L1984）+e2e 段 20 passed+`exit=0`（L2053） | 可信 |

## A. 母本符合度（diff vs 票面五层）

- **VenueTier 三档**：`export type VenueTier = 'T1' | 'T2' | 'T3'`（venue-tier.ts L61），档位语义头注单源（T1=领域顶刊/T2=领域主力刊/T3=一般刊）——票面接口层逐字兑现。
- **VENUE_TIER_MAP**：`Readonly<Record<string, VenueTier>>`（L68），种子 5 条（票面「3~5 条示例级」上限取满），键=display_name 原形；`venueToTier` 仅 `venue.trim()` 精确等值查表、**无 toLowerCase**（L77-80）——N-r2b 核实：实现与测试双锚（venue-tier.test L42 `'nature water'→null`）。`venueToTier('')`：''→trim→''→查表 undefined→null ✓。
- **装配两形**：frontMatter（corpus.assemble.ts L151-158）citedByCount `!== undefined && !== null` 才装配（0 合法）、venueTier 查表命中装配未命中省略；测试有值形/0 值边界/缺省形三用例锚定（assemble.test L130-170）。
- **manifest 成对省略（N-r2e）**：corpus.export.service.ts L276-281 以 citedByCount 为钥匙 spread 两键，无则全省略；测试用 `'citedByCount' in plain === false` 键存在性断言（export.test L238-239，比 toBeUndefined 严格——区分键缺失与值 undefined），高质量。
- **INTERFACE 指标口径节+W6**：interface-template.ts L43-55「含金量指标（可选字段）」节；W6 原文「citedByCount=缓存快照随手动增强刷新；contentSha 幂等以同缓存状态为前提——增量对比消费方须知」**逐字在场**（L53-54，括号补句为同义强化非口径变更）；测试 L245-250 四 toContain 断言与模板实物一致。
- **ADR v1.2 补注（W5）**：docs/adr/0011 L116-124，编号第 7 条跨节连续（第 6 条属 v1.1 节），W5 原文「venueTier v1 实现档=受锁常量修订制（D3-A 2026-08-27 用户拍板：最小供给档）；『允许用户改』的 UI 面留 D3-B 档」逐字在场+兑现口径与 schemaVersion 恒 1 说明。
- **schemaVersion 恒 1**：frontMatter 硬编码 `'schemaVersion: 1'`（assemble L139）、manifest 硬编码 `schemaVersion: 1`（export.service L215）、INTERFACE 版本承诺节未动、ADR v1.2 明文——四点一致。
- **N2 头指针**：corpus.assemble.ts L1=`// b3: P7-C` **未动**（判据「动了必 B」——未触发）；C-02 裁决链头注主体未动，仅 L18-21 预留位描述行同步（票面行为层明指「corpus.assemble.ts:18 预留位兑现」——行号正落此段，属票面预期内）。
- **golden=契约扩展非放宽**：实际比票面更保守——golden 逐字节用例**零改动**（夹具不含缓存值，缺省形天然稳定），新断言全部为另加用例，无一条既有断言被修改或删除。

## B. 宪法红线

- **分层单向**：venue-tier.ts 零 import（shared 无反向依赖）；corpus.assemble（main services）import shared ✓ 方向合法；export.service 未新增跨层依赖。
- **文件行数**：venue-tier.ts 80 / corpus.assemble.ts 204 / corpus.export.service.ts 422 / interface-template.ts 61 / venue-tier.test.ts 47——全部 ≤500（lint verify 绿旁证）。
- **禁新依赖**：package.json 不在 git status 修改列表 ✓。
- **UTF-8**：file 命令报 UTF-8、Read 全文中文可读无乱码 ✓。
- **受锁测试改动=契约扩展**：corpus.assemble.test.ts 仅 +3 用例插在 golden 与幂等用例之间（diff hunk 逐一核对，既有断言零触碰）；corpus.export.test.ts 仅 +1 import（INTERFACE_MD）+seedMetrics helper+2 用例（既有十二用例零触碰）——**无任何放宽**。
- **SQL 纪律**：seedMetrics 两 UPDATE 均 db.prepare+参数绑定（export.test L77-84）✓。
- **受锁域流程**：venue-tier.ts（src/shared 全域入锁）sha 已更新入 manifest（e258e8→f9869c）；新测试经 generate→apply 入锁（manifest L501）；manifest 实物 137 条（grep 计数=137，与 verify log locks:check「137 个受锁文件与 manifest 一致」+exit=0 闭环）。
- **安全禁令**：零 IPC/renderer/出网面触碰，无违例面。

## C. 代码与测试质量

- **判空口径**：`paper.citedByCount !== undefined && paper.citedByCount !== null`（assemble L152）——0 是合法值不禁 falsy，与 ENR-01「判别 === null 禁 ??/falsy」同源。注意：zod `.optional()` 不收显式 null，`!== null` 半边实为纯函数直调路径的纵深防御（PaperDetail 运行时无校验）——双层条件合理非冗余。
- **变异五轮恰中性逐轮推演验证**：
  - 变异 1（删 trim）：仅「仅 trim 归一」用例红（'  Nature Water  ' 失配）；全表往返（键原形）/空串/内部空白用例均不变红——**恰 1 红** ✓。
  - 变异 2（条件首 `!== undefined`→`!== null`）：undefined !== null 为 true→缺省形误装配 `citedByCount: undefined` 行→golden 全量（逐字节多行）+assemble 缺省形+export 两形 mdPlain 三宿主红；0 值/有值形照常装配不红；export「正常全链」expectedMd 与产物同变异一致不红；幂等重导双跑同变异不红——**恰 3 红** ✓。此变异设计真恰中：它精确捕获「undefined 判别操作数」这一与 ENR-01 判空铁律同源的关键分叉，且红面横跨纯函数 golden/结构断言/真库导出三层宿主——不是同构断言的重复计数。
  - 变异 3（`venueTier:`→`venueTierX:`）：有值形 `fm[i+2]==="venueTier: 'T1'"`+export mdCited toContain 红；0 值边界与缺省形用例因 venue 未命中本就不装配该行、golden 因夹具 venue 未命中逐字节不变——均不红——**恰 2 红** ✓。
  - 变异 4（manifest fetchedAt→countSource）：仅 export 两形 fetchedAt 断言红（md 层无此字段）——**恰 1 红** ✓，恰好锚定「fetchedAt 只进 manifest 不进 md」的分工面。
  - 变异 5（W6 字面「同缓存状态」→「同缓存」）：仅 INTERFACE 声明存在性红——**恰 1 红** ✓。
- **作废重做诚实性**：变异 3 首次否定翻转（tier !== null→=== null）致 yamlStr(null) TypeError 红面 6+——error 型失败=测试自身崩溃而非断言失败，无断言证明力，判「不满足恰中」作废重做为属性名变异——判定准确、申报诚实（报告 L78-80）。
- **新测试 8 用例裸 describe**：venue-tier.test.ts 用 `describe`（非 guardedDescribe），W4 合规；STUB 删除守卫（`'VENUE_TIER_STUB' in module === false`）是 quality 关卡的测试级伴生。
- **测试扩展（自裁 4）不越票面语义**：纯空白串/内部空白/N-r2b 小写/三档齐备/全表往返/STUB 守卫均为契约已声明语义的验证性边界，无新行为发明；assemble 0 值边界=ENR-01 判空铁律在装配面的延伸锚（票面行为层「0 是合法值」句的测试化）。

## D. 报告诚实性（自裁 5 项+否定性断言）

- 自裁 1（种子表避开 Water Research）：实物表 5 键无 'Water Research' ✓；依赖链核实——assemble.test 夹具 venue='Water Research'（L32）且 golden 逐字节（L90-127）+0 值边界（L162-163）+缺省形（L166-170）三处锚定该 venue 的缺省形，若入表则三处全红（golden 漂移）——「夹具兼容权宜」断言成立。
- 自裁 2（头注同步）：assemble L18-21 已同步为兑现口径，与行为（L151-158）一致；头指针与 C-02 链主体未动 ✓。
- 自裁 3（INV-28 违例态诚实透出）：detailById 透出（papers.repo.ts L242-248）count 非 null 而 fetched_at null 时 citedByFetchedAt=undefined→manifest spread 后 JSON.stringify 丢键→「有 count 无 fetchedAt」条目——不静默丢 count、不增防御分支，描述与代码行为逐字吻合 ✓。
- 自裁 4/5：见 C/D 上文 ✓；真库抽查留主控已申报（并 W2）。
- **否定性断言核实**：registry 未动 ✓（不在 git status 修改列表；registry.ts L202 status:'open' 与 verify tickets 段「open 1（strong 1）」互证——实现者守「控制面单写者=主控」禁令）；头指针未动 ✓；e2e spec 零触碰 ✓（tests/e2e 无任何改动；e2e 补跑 20 passed 与 log L2031-2052 一致）。
- 首红 12 failed：日志 FAIL 清单 8（venue-tier）+2（assemble 有值形/0 值边界）+2（export 装配两形/INTERFACE 存在性）与报告明细一致；「缺省形属恒真守卫面、红证由变异 2/3 补」的口径准确（首红时缺省形天然绿——旧实现无该字段）。

### [W1] 报告文件清单漏列 locks/manifest.json（数字口径不齐）

- 证据：git status 实物=**8 文件修改**（含 locks/manifest.json）+1 新测试；git diff --stat 实物=8 files changed, **197 insertions(+), 14 deletions(-)**。报告 § 二自述「7 文件 +189/-10」——差额恰为 manifest.json 的 +8/-4（generatedAt 1+3 sha 更新+新条目 4）。§ 五 locks 实录对流程与 137 条有专节详述、diff 包亦含 manifest hunk，**非隐瞒**，但「文件清单表 vs git status 实物」作为收口机检口径不齐——若照报告「7 文件」staging 将漏锁账本。
- 处置：不回炉。收口单按 **8 文件+1 新测试**口径陈述与 staging（manifest.json 是票面 locks 流程的必然产物，非范围蔓延）。

### [W2] 票面验收项「真库导出抽查 manifest 两字段+时间戳」未由实现者执行

- 证据：票面文化层验收行=「verify 绿；真库导出抽查 manifest 两字段+时间戳」；报告自裁 5 申报以单测真库夹具（createTestDb 真 sqlite+真导出会话+manifest 落盘断言）近似覆盖，真机 UI 抽查留主控/人工。
- 论述：单测面确为真库（非 mock），但「真库导出」票面语义含手动增强链路（ENR-01 写面→ENR-02 装配的端到端联调真值）——ENR-01 收口同样留有此项（其验收「真库手动增强一篇→detailById 透出三字段」）。属流程性后移且已诚实申报，非缺陷；但**主控收口前必须人工执行或明示豁免**，否则验收面留洞。
- 处置：不回炉，转主控收口清单必办项。

## E. 接缝与后续单

- **assemble 头注同步 vs 裁决链**：与行为一致、未动主体（见 A）；venue-tier.ts 头注（ENR-02 链）与 assemble 头注（C-02 链）对同一行为的两处声明一致不互斥——接缝归责闭合。
- **interface-template 生成物 vs 测试断言**：四断言子串（citedByCount/venueTier/citedByFetchedAt/同缓存状态）在 INTERFACE_MD 实物全部在场；corpus md 结构节 L31-32 的必选字段清单未列两可选字段、由专节声明——分层组织无互斥（见 N4）。
- **INV-17/18 与会话协议零冲突**：exportedAt 不进 front-matter（md 层零时间戳，幂等重导用例绿证实）；citedByFetchedAt 只进 manifest（manifest 本就不参与逐字节断言——INV-17 已锚定范围=产物文件）；INV-18 终局单写/清空重建/单飞/deferOutcome 时序全部未触碰（改动仅 s.papers.push 对象字面量尾部的条件展开）。
- **契约链四环闭合**：detailById（INV-28 配对透出）→assemble frontMatter（两可选字段）→manifest finishPaper（成对 spread）→INTERFACE（口径声明+sha 提示）——逐环实物核对闭合。
- **疑虑 2 裁定（manifest 成对省略是否新增 INV）**：**维持不新增**。理由：成对省略是 INV-28「透出配对规则」的**单点下游消费**（装配条件单点在 finishPaper，无第二实现点），且已有三层锚（ManifestPaper 注释+ADR v1.2 第 7 条+受锁测试 in 断言）+票面 N-r2e 规约；INV 册登记判据是「跨模块/跨时间」——本行为无跨模块双写面。后续 ENR-03+ 若开消费面（FTS/排序）再随单评估补登。

### [N1] locks/manifest.json 工作副本为 CRLF（552 处 \r）

- 证据：`grep -c $'\r' locks/manifest.json`=552；git status 对其报「CRLF will be replaced by LF」。
- 论述：manifest.json 自身不在受锁清单（它是锁账本），check-locks 只按字节重算清单内 137 文件 sha；入库时 .gitattributes（`* text=auto eol=lf`）归一为 LF，JSON 语义不变，CI 端无对账影响——属 lock 脚本（PowerShell 写回）的体系既有形态，非本单引入。**关键排除**：新入锁文件 tests/unit/shared/venue-tier.test.ts 与改动的 venue-tier.ts 本地字节均为 LF（grep \r=0）——不存在「本地 CRLF sha 入库转 LF 后 CI 假红」风险。
- 处置：注记备查，无动作。

### [N2] 未跟踪残留面（收口 staging 提醒）

- 证据：git status 未跟踪含 dev-launch.cmd、dist_new/、scripts/audits/enr02-*（派发/审计档）。
- 论述：均非本单实现产物（audits 档为主控/门审产物按惯例不入库或随审计惯例处置）；宪法既有教训「git add -A <目录> 会扫入未跟踪残留」——收口 staging 必须显式列 8 文件+1 新测试。
- 处置：转主控收口操作提醒。

### [N3] 首红日志为摘要型留存

- 证据：enr02-first-red.log 为命令行+失败清单摘要（非 vitest 原始全量输出）。
- 论述：12 failed 数字与逐条 FAIL 行俱在、可与新测试用例逐一对应（8+2+2），可核对性足够；「先红再绿」证明链完整（功能缺失型红，非笔误红）。留档粒度不构成缺陷。
- 处置：注记，后续单沿用即可。

### [N4] INTERFACE 字段清单与可选专节的组织方式

- 证据：interface-template.ts L31-32（corpus md 结构节字段清单）未列 citedByCount/venueTier，L43-55 专节声明可选携带。
- 论述：必选清单+可选专节分层，两处声明不互斥（专节明文「front-matter 可选携带」）；消费者解析不受影响。可选优化=清单行尾加「（可选含金量字段见下节）」指针，非必须。
- 处置：注记，不强制。

### [N5] 疑虑 1（Water Research 补入）裁定：维持主控预裁「不补」

- 攻击尝试：核对票面「3~5 条示例级机制为主」——5 条取满不含 WR 合规；golden+0 值边界+缺省形三锚定使补入=连带改三处受锁断言+golden；D3-A 受锁常量修订制已开内容增量口（ADR v1.2 明文），且「Water Research 缺席系夹具兼容权宜」在报告与测试注释（assemble.test L162）双重诚实声明。推翻预裁需更强依据——无。维持。

### [N6] verify log pdfjs-dist 双导入 warning 为既有基线噪声

- 证据：log L1972-1976 与 L2016-2020（verify 与 e2e 两段同现），指向 CorpusExtractor/PdfCanvas/TextLayer 既有双导入形态，与本单改动面（export_/shared）零交集。
- 处置：证实实现者疑虑 3，无动作。

## 统计

**0 B / 2 W / 6 N**

## 总评

**PASS**（不回炉；W1/W2 转主控收口处置：W1 收口单按 8 文件+1 新测试口径陈述与 staging，W2 收口前人工执行真库导出抽查或明示豁免）。

母本符合度（五层逐项含 N-r2b/N-r2e/W5/W6/N2 全兑现）、宪法红线（分层/行数/依赖/受锁流程/SQL 全绿）、TDD 链（首红 12 功能缺失型→绿 652=639+13→变异五轮断言级恰中+一轮作废重做诚实申报）、报告诚实性（自裁五项与否定性断言全部与实物吻合，唯文件清单数字口径漏 locks 一处 W）、接缝（ENR-01/02 四环契约链闭合，INV-17/18 零扰动）五工单全过。主控预裁四项全部维持（N5 攻击失败）。
