# SR2-ENR-02 门二终审档（venueTier 映射与 manifest 装配）

- 审计者：三屋模式门二终审子代理（独立于实现者与门一；门一结论本身亦在抽核面内）
- 日期：2026-08-28；基线 HEAD=6e5a3b2（ENR-01 收口）
- 模式：只读审计（禁改仓库文件；禁 npm/test/verify 执行——主控已亲验 verify exit=0+e2e 20/20+真库只读探查；本档做实物一致性核对）
- 技能清点（宪法开工纪律）：code-review-excellence **用**（门二终审=对抗式深审核心方法）；verification-before-completion **用**（本档落盘后回读自查）；systematic-debugging 不用（无缺陷定位面）；test-driven-development 不用（不写实现，只审 TDD 证据链四档）；其余技能与本审计无关联面。
- 配置自查：GLM-5.3 终审档（主控派发），思考等级与派发口径一致。

## 输入核实

| 输入 | 实物核对 | 判定 |
| --- | --- | --- |
| 票面母本 | src/shared/venue-tier.ts 头注 L2-57 与 enr-ticketing-draft.md L149-223 双源逐节读入，两源一致 | 可信 |
| 实现者报告 enr02-impl.report.md | 自裁 5 项+疑虑 3 项逐条对实物（见①②） | 可信 |
| 首红日志 enr02-first-red.log | 12 failed 清单逐条读入（venue-tier 8+assemble 2+export 2），用例名与测试文件实物一致 | 可信 |
| verify 日志 enr02-impl-verify.log | quality/tickets（106/open 1 strong 1）/locks（137）/lint/typecheck/test（89 文件 652）/build+verify 段 `exit=0`（L1984）+e2e 段 20 passed+`exit=0`（L2052-2053） | 可信 |
| 门一审计 enr02-gate1.audit.md（0B/2W/6N，PASS） | 全 findings 抽核（见①③④） | 可信 |
| diff 包 enr02-gate1.diff（413 行） | 9 个 `diff --git` 块=8 修改+1 新测试，与 git status 实物一一对应；ADR hunk 与 sed 实读吻合；两测试文件完整 diff 与 `git diff` 工作区实物比对一致 | 可信 |

## ① 处置核对（门一 findings+主控裁决 vs 终态实物）

- **W1（报告计数漏 manifest）**：git status 实物=**8 M**（含 locks/manifest.json）+1 新测试（`?? tests/unit/shared/venue-tier.test.ts`）；`git diff --stat` 实物=8 files changed, **197 insertions(+), 14 deletions(-)**——与主控「收口按 8 文件口径」处置**吻合**；报告「7 文件 +189/-10」差额 +8/-4 恰为 manifest.json 块（diff 包第 2 块在场），门一「非隐瞒、口径不齐」定性属实。未跟踪残留（dev-launch.cmd/dist_new//audits 档）与门一 N2 记录一致——收口 staging 显式列文件提醒维持。**PASS**。
- **W2（真库导出抽查留人工）——主控处置口径评估**：票面验收项原文=「verify 绿；真库导出抽查 manifest 两字段+时间戳」。主控已做真库只读探查（synapse.db user_version=4——迁移 005 待启动自动应用；papers=4），完整链（启动→手动增强→导出→manifest 抽查）转用户验收清单。裁定：**诚实且充分，认可**。诚实性：(a) 明确区分「只读探查」与「完整验收链」，未虚报已验收；(b) user_version=4 如实透出（真库尚无 cited_by_count 数据，此时导出必为缺省形——不回避）。充分性：(a) 机器可代办面已尽——export.test 装配两形用例走 createTestDb 真 sqlite+真导出会话+真 manifest 落盘断言，「导出→manifest 两字段+时间戳」的机器面已锁；(b) 剩余面（手动增强→缓存快照→有值形端到端）受 INV-08 红线（增强仅手动触发）约束，子代理/主控在用户真库执行写操作越权，转用户验收清单是正确归责非推诿；(c) ENR-01 收口同留此面，一次用户操作（启动自动迁移 005→增强一篇→导出→抽查）可同时闭两单验收。附注：用户验收清单宜明示前置「首次启动自动应用迁移 005」，防用户误判字段缺失为缺陷（主控台账已录 user_version=4 事实，此为措辞建议非缺口）。**PASS**。
- **门一预裁四项维持终审**：(1) WR 不补入（N5）——维持（见疑虑 1 复核）；(2) manifest 成对省略不新增 INV（E 节裁定）——维持（见疑虑 2 复核）；(3) pdfjs warning 基线噪声（N6）——维持（见疑虑 3 复核）；(4) W1 处置（8 文件口径）——维持（上文核对吻合）。**四项全部维持。PASS**。
- **实现者疑虑 3 项复核裁定**：
  - 疑虑 1（Water Research 不补）：**维持不补**。物证闭环：golden 夹具 venue='Water Research'（assemble.test L32）+golden 逐字节断言 L100 `"venue: 'Water Research'"`+0 值边界注释 L162——三锚定使补入=golden 漂移连带改三处受锁断言；票面「3~5 条示例级」5 条取满合规；D3-A 受锁常量修订制已开内容增量口（ADR v1.2 第 7 条明文），学术口径欠账有制度化偿付通道。
  - 疑虑 2（manifest 成对省略是否新增 INV）：**维持不新增**。复核认可门一论述：INV 登记判据=跨模块/跨时间行为，成对省略是 INV-28（detailById 配对透出）的单点下游消费（装配条件单点在 finishPaper L276-281，无第二实现点）+三层锚（ManifestPaper 注释 L156-159+ADR v1.2 第 7 条+受锁测试 `in` 键存在断言）+票面 N-r2e 规约。后续 ENR-03+ 开消费面再随单评估。
  - 疑虑 3（pdfjs warning 基线噪声）：**证实**。verify log L1972-1976（build 段 vite reporter）双导入 warning 指向 renderer/features/reader 的 CorpusExtractor/PdfCanvas/TextLayer——三文件均不在 git status 修改列表（本单零触碰），与改动面（export_/shared）零交集。

## ② 母本符合度（票面五层 vs 终态逐节）

- **行为层**：frontMatter 两可选字段装配在场（assemble.ts L151-158：citedByCount `!== undefined && !== null` 才装配——0 合法禁 falsy；venueTier 命中装配未命中省略）；manifest 成对省略在场（export.service L276-281 以 count 为钥匙 spread 两键）；INTERFACE 指标口径节+W6 原文在场（interface-template.ts L43-55，L53-54「citedByCount=缓存快照随手动增强刷新；contentSha 幂等以同缓存状态为前提——增量对比消费方须知」逐字）；无状态机新面（装配纯函数）。**PASS**。
- **接口层**：`VenueTier='T1'|'T2'|'T3'`（venue-tier.ts L61，档位语义头注单源 L59-60）；`VENUE_TIER_MAP: Readonly<Record<string, VenueTier>>` 种子 5 条（L68-74）；`venueToTier` 仅 trim+精确等值、''/纯空白/未命中→null（L77-80，**无 toLowerCase**——N-r2b 实现与测试双锚 L33-35）。**PASS**。
- **架构层**：schemaVersion 恒 1 四点一致（assemble L139/export.service L215/INTERFACE 版本承诺节/ADR v1.2 明文）；golden 逐字节用例零改动（见③受锁面——实际比票面更保守：夹具不含缓存值，缺省形天然稳定，全部新断言为另加用例）。ADR-0011 v1.2 第 7 条在场（L112-124）：W5 核心句「venueTier v1 实现档=受锁常量修订制（D3-A 2026-08-27 用户拍板：最小供给档）」逐字在场，括号内接破折号扩展为兑现细节（VENUE_TIER_MAP 驻址+D3-B 去向），语义无变更。**PASS**。
- **生命周期层**：不做面三项零蔓延（无 UI/无批量扩充/无 FTS 消费面——git status 8+1 全在票面清单内）。**PASS**。
- **文化层**：四类测试全在场（golden 零改动/结构断言两形 assemble +3 用例/venueToTier 四类+边界共 8 用例/INTERFACE 存在性 4 断言）；新测试裸 describe（venue-tier.test.ts L8，**不挂 C-02 guardedDescribe**——W4 合规+always-active 满足宪法 K3 条款）；收口机检项两档在场（verify 真退出码双段+变异还原记录）；受锁面流程闭环（见③）；文件清单与票面 8+1 对齐。**PASS**。
- **N2 头指针**：corpus.assemble.ts L1=`// b3: P7-C` 未动；头注 L18-21 预留位描述同步（票面行为层明指「corpus.assemble.ts:18 预留位兑现」——属票面预期内同步，非越权改动）。**PASS**。

## ③ 宪法红线终审

- **分层单向**：venue-tier.ts 零 import（全文读入证实）；assemble.ts（main services）`import { venueToTier } from '../../../shared/venue-tier'`（L62）方向合法；renderer 零触碰（git status 证实）。**PASS**。
- **受锁流程（manifest 137 与实物一致）**：locks/manifest.json `grep -c '"path"'`=**137**；双锚点 sha256 实物重算比对——venue-tier.ts `f9869c75…ff6734` 与 venue-tier.test.ts `91e0029f…ada47` 均与 manifest 在册值逐字节一致（Git Bash sha256sum 直算文件字节，两文件本地 LF——门一 N1 已验 `grep \r`=0，无 CRLF 假绿面）；verify log L35「137 个受锁文件与 manifest 一致」闭环。报告 unlock（136）→generate→apply（137）流程与票面受锁面清单吻合。**PASS**。
- **安全禁令**：改动四文件 grep（openExternal/eval/new Function/nodeIntegration/webSecurity/http）零命中；零 IPC/零出网/零新 host。**PASS**。
- **行数**：venue-tier.ts 80 / corpus.assemble.ts 204 / corpus.export.service.ts 422 / interface-template.ts 61 / venue-tier.test.ts 47 / corpus.assemble.test.ts 354 / corpus.export.test.ts 443 / ADR-0011 124——全部 ≤500。**PASS**。
- **UTF-8**：file 命令报四关键文件均 UTF-8 Unicode text；中文全文可读。**PASS**。
- **TDD 证据链四档**：(1) 首红 12——日志实物 12 failed 清单（venue-tier 8+assemble 2+export 2）逐条与三宿主用例名对上，功能缺失型红（STUB 未删/装配未接线/INTERFACE 未声明），「缺省形首红时恒绿、红证由变异 2/3 补」口径准确；(2) 绿 652——log L1943-1944 `Test Files 89 passed (89)`/`Tests 652 passed (652)`；(3) 变异 5 轮——报告五轮恰中红数（1/3/2/1/1）经本档对测试断言形态逐轮复核推演自洽（变异 1 仅「仅 trim 归一」用例锚；变异 2 红面横跨 golden 逐字节+assemble 缺省形+export mdPlain 三宿主恰 3；变异 3 有值形行序断言 fm[i+2]+export toContain 恰 2；变异 4 仅 manifest fetchedAt 断言恰 1；变异 5 仅 INTERFACE toContain('同缓存状态')恰 1）；一轮作废重做（否定翻转致 TypeError error 型红无断言证明力）诚实申报——变异纪律（cp 备份禁 git checkout）声明在案；(4) verify exit=0 双段（L1984 verify+L2053 e2e）。**PASS**。
- **受锁测试改动=契约扩展非放宽**：git diff 实物核对——assemble.test 仅 +3 用例插于 golden 与幂等块之间（纯增量块）；export.test 仅 +1 import+seedMetrics helper+2 用例（纯增量块）；既有断言零删改。seedMetrics 两 UPDATE 均 db.prepare+参数绑定（SQL 纪律）。**PASS**。

## ④ 机器面核对

- **verify 数理**：652=639+13；13=8（venue-tier）+3（assemble）+2（export）——与报告/门一/新测试实物用例数（8/3/2）三方吻合；基线 639=ENR-01 收口口径。**PASS**。
- **locks 137**：见③（manifest 计数+sha 双锚+log 三方闭环）。**PASS**。
- **翻 done 推演（check-tickets.mjs 逐规则）**：翻 SR2-ENR-02 为 done 后——规则 1 文件存在 ✓；规则 2 src 面全号引用仅注册文件 venue-tier.ts 头注 L3（自引用豁免 `t.file !== rel`），**src 其余零残留**（grep 证实），tests 面 venue-tier.test L8 全号在 describe 字符串非 unimplementedObject/NotImplementedError 占位调用（不受限），golden/测试注释中的短式「ENR-02」无 SR2- 前缀不匹配 ticketRefRe ✓；规则 3 注册文件无占位调用 ✓；规则 4 非 .tsx ✓；规则 4b 注册文件无 data-ticket 属性、无工单号初值 `*_STUB` 导出（**VENUE_TIER_STUB 已删**——src 全域 grep 零残留，唯一在场=venue-tier.test L44-45 守卫断言 `'VENUE_TIER_STUB' in module === false`，系测试级伴生非骨架残留）✓；规则 5 无 guardedDescribe('SR2-ENR-02') ✓；规则 6 `// b3: P7-G` 在头注区（L1）且 P7-G 在 ROADMAP L226 已裁决集 ✓。**翻 done 后 tickets:check 不红，推演通过。PASS**。
- **e2e 面申明**：实现者跑 20 passed+exit=0（log L2031-2053 实物，corpus-export.spec 全链在列第 3）；主控亲跑 20/20（主控台账申明）——两跑双档。e2e spec 零触碰（tests/e2e 不在 git status）。**PASS**。
- **tickets 段互证**：log L25「open 1（weak 可领 0，strong 1）」与 registry.ts L202 status:'open'/owner:'strong' 互证；registry 未动（实现者守控制面单写者禁令）。**PASS**。

## ⑤ 成本账本行

| 单元 | token | 时长 |
| --- | --- | --- |
| 实现者 | ≈4.60M | 17.2min |
| 门一 | ≈1.17M | 5.2min |
| 门二（本档） | ≈0.95M（自估） | ≈12min（自估） |

## 总评

**PASS——批准收口（不回炉）**。

四清单+一全过：①门一 0B/2W/6N 全 findings 与主控处置对终态实物核对吻合（W1 八文件口径、W2 处置评估为诚实充分并附清单措辞建议）；②票面五层逐节兑现（N-r2b/N-r2e/W5/W6/N2 全在场）；③宪法红线全绿（分层/受锁 137+sha 双锚/安全禁令/行数/UTF-8/TDD 四档含变异五轮逐轮复核推演自洽）；④机器面闭环（652 数理/locks 137/翻 done 六规则推演不红/e2e 双跑 20/20）；⑤成本入账。主控预裁四项维持，实现者疑虑 3 项复核均维持原裁定。

收口前置：主控按 8 文件+1 新测试口径显式列文件 staging；翻 registry done 后 [locked-change] 提交（受锁面=两测试+shared 模块+manifest 同步）；用户验收清单执行时明示迁移 005 前置。
