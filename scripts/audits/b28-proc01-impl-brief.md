# F-PROC-01 实现者简报（b28——制度批，主控→实现者子代理）

## ① 身份与禁令

你是实现者子代理，领单 **F-PROC-01**（registry:318，制度批——裁决 9 后步+裁决 14 落点）。
禁令：禁 git add/commit/push；禁翻 registry 状态；禁触 tickets/（取证也不许）；
禁新依赖；禁改 `tests/**`、`src/shared/**`、`scripts/check-quality.mjs`（受锁，
本票零触碰）；一切编辑 ≤500 行/件；中文 UTF-8；卡住=BLOCKED 停手不自裁。
档位=随宿主会话模型（2026-09-19 用户裁决未绑定形态），账本记 session:host-tier。

## ② 必读序（文件清单化，逐件读）

1. `AGENTS.md`——只读「完成定义（Definition of Done）」段（:79 起）与「工单工作流」段（:108 起）；
2. `tickets/registry.ts:318`——F-PROC-01 票面（六子任务）；
3. `docs/design/2026-09-18_complexity-governance-ruling.md`——只读 §0 裁决汇编表（裁决 9/14 两行）+§3 梯队五行；
4. `docs/methodology.md`——全文 341 行（主制度锚，本票主战场）；
5. `scripts/audits/b28-proc01-impl-brief.md`——本简报（落点分配表=③）；
6. 参考（背景理解，不改）：`scripts/audits/2026-09-18_survey-doc-drift.md` ③悬空清单/⑤健康度评估段、`scripts/audits/b28-docgov01-impl-report.md`（如不存在则读 `scripts/audits/b27-docgov01-impl-report.md` §6 移交清单）。

## ③ 主控裁决（落点分配表——实现者照表执行，不再自裁；全部待门审裁）

**总则**：纯制度/文档批，零 src/零 tests/零受锁脚本触碰；`docs/methodology.md`
是制度句单一真相源（P3——check-quality.mjs 内不加重复注记）。共 9 文件恰 10 处编辑。

| # | 文件 | 锚点 | 内容 |
|---|---|---|---|
| 1 | `AGENTS.md` | DoD 清单末项「计数类数字……禁凭印象」行之后追加 | 新 checkbox 行：`- [ ] 本票触及的 ADR/架构段落已回写（对照 docs/architecture.md §6 实体表+ADR 索引；设计决策演进的票把变更同步到对应 ADR 修订记录或 architecture 对应节；无触及如实申报——2026-09-19 裁决 9）` |
| 2 | `docs/methodology.md` | §4 引言区「治理五指标」blockquote（:159-161）改写+其后新增一条 blockquote | （a）五指标→**八指标**：原五数保留+新增三数（reader 占 src 比，基线 37.2%=2026-09-19 GEOM 战役后实测 11,514/30,974 行含 CSS 口径；COMPOSITION_ROOT_ALLOW 条数，基线 7；模块级单例清单数，基线 13=zustand 11+toast-store+annotation-undo，INV-70 附件清单单源随其滚动）——注明「2026-09-19 复杂度治理裁决 9 扩三（F-PROC-01）」；口径句：三新指标单源=本段、行数分母含 CSS、滚动载体=交接书/接力板基线段两形态通用。（b）同 blockquote 尾或紧随新增：**COMPOSITION_ROOT_ALLOW 冻结规矩**——白名单冻结，新增例外=用户级裁决（[locked-change]+裁决指针），主控/实现者不得自裁扩列 |
| 3 | `docs/methodology.md` | 上条之后新增独立 blockquote | **交接书固定段：事故档回流行（裁决 9——修复三周断链）**：每份交接书 §4 教训行段固定增「事故档回流」状态行——本段教训已回流/未回流 `AI辅助开发经验教训.md` 逐条标注（未回流写明触发场次）；回流判据=教训具有「当初为什么立这条规则」性质 |
| 4 | `docs/methodology.md` | P10 段末（:109 后）增段 | **M2 制度预防（裁决 9——工单规约增句）**：工单/设计书引入平行新实现路线时票面必须显式声明**并存理由+退役触发线**；无退役触发线的并存=回炉项（多路线交互面是乘积级复杂度源——M2，docs/reports/2026-09-11_architecture-complexity-audit.md §3） |
| 5 | `docs/methodology.md` | §4.4 收口段「顺序铁律」增补之后同缩进追加 | **health-scan 与 verify 并行不并入（2026-09-18 裁决 14 落档）**：health-scan（派发流水健康）与 verify（代码质量）对象不同各自独立，互不入对方 DoD/串行链——防流程规则面被误判为漂移 |
| 6 | `docs/methodology.md` | §4.5 末行「成本账本行……门二从派发回执汇出」之后追加 | **直调类派发账本补记规则（F-ALIGN-01 核查落法——票面⑤）**：绑定子代理/会话内直调不经派发器链=无自动流水——派发毕由主控**即时**补记账本行（findings 对象形：B/W/N+verdict+note），禁事后批次性补记；根因=F-ALIGN-01 查实断流 9 天（写入器只挂派发器链，2026-09-18 align01-org-audit.md） |
| 7 | `docs/methodology.md` | §2 末条「预登记要克制」之后追加新条 | **登记册形态规约（survey D-2 处置）**：INV 条目单条超长（≈400 字级）=语义已超登记册形态、实为微型 ADR——新增条目到此规模即拆 ADR 化（条目瘦身一句声明+指针→ADR 详述）；存量 INV-27（三 kind 全景~900 字）为历史叙述红线例**不回拆**，其模型演进另见 ADR-0014 |
| 8 | `docs/audits/audit0-findings.md` | :1 标题行保留原文，紧随其后插入职能注记 blockquote | **职能注记（2026-09-19 F-PROC-01 头部声明勘正——survey ⑤）**：本册「唯一登记处」声明自 2026-09-03 后失真——后续体检发现改走 docs/audits/weak-anchor-register.md（弱锚观察）与批次日志/交接书（战役发现）；本册转 AUDIT0 战役（2026-08-30~09-03）历史档+该战役专用登记处，新体检发现不再入册 |
| 9 | `docs/adr/0013-backup-restore-posture.md` | 「## 后果」段之后文件末尾新增段 | `## 复审状态（2026-09-19 F-PROC-01 巡检注记）`：复审条件节所列触发（不可再生文献占比高）截至 2026-09-19 未触发——手动快照导出重评持续挂起=合法挂起（触发线在文非悬空）；后续每次触及备份/恢复面的票收口时对本节条件复核 |
| 10 | `docs/adr/0015-ai-ingest-and-sidecar-protocol.md` | 文末「## 修订记录」段内追加一条 | `- 复审巡检（2026-09-19 F-PROC-01）：背景节 D utilityProcess 自含方案 P8+ 候选挂起中——P8 未启役无复审必要；启动 P8 或外链进程诉求出现时该候选随设计链首跳重评` |
| 11 | `docs/audits/weak-anchor-register.md` | W-10 行之后表格追加一行 | `| W-11 | INV-56 已知还原项（P7E-04 剪贴板可选注入） | clipboard 现为可选注入（受锁桩工厂禁改下处置）——「补必填+桩工厂同步」还原项悬置于 INV-56 条文内无独立登记（survey ③#8 实录，b27 移交 F-PROC-01） | export-clipboard.test 装配缺失响亮守卫（现有） | 观察（下次合法触碰 tests/utils/ipc-deps.ts 的场次补必填+桩工厂同步——触碰即触发，届时核销本条） |` |

（表 11 行=10 处 methodology/文档编辑+AGENTS 1 处；#2 含 (a)(b) 两子改同一段区。）

## ④ 纪律（纯文档批的验证形态）

- **无新用例面**：TDD 红绿不适用——等价验证=verify 全绿（七关卡）+**一切落笔数字实测**
  （落笔前 wc/grep/node 脚本输出——37.2%/7/13 三基线主控已实测，你复核后落笔）；
- 每处编辑后 grep 验证中文可读（防 mojibake）；
- **Edit 锚定含标题行时 new_string 必须完整回补**（b26 教训③）；追加段落一律锚
  「段尾行+后段标题」双点或 cat >>；
- 票面六子任务 ↔ 落点表映射：①=#1；②=#3；③=#2a；④=#2b+#4；⑤=#6；⑥=#5；
  移交三项裁量=#7（INV-27 评估落规约不拆）+#8（audit0）+#9/#10/#11（survey ③ 余项显式化）；
- verify 真退出码落盘：`npm run verify; echo exit=$? >> scripts/audits/b28-proc01-verify-final.log`。

## ⑤ 基线数字（自检参照——b27 终态）

- verify：Test Files 167 / Tests 1724 / 指纹门 183·1768·5368·skip14；
- tickets open=3（本票 F-PROC-01 open——你不翻状态）；locks=382（b28-claim 已入）；
- 你改完全部为纯文档面——verify 应零漂移（指纹门/locks/用例数全部不变）。

## ⑥ 报告契约

全文落 `scripts/audits/b28-proc01-impl-report.md`：实现摘要/文件清单（恰 9 文件
逐件列）/计数实测表（三基线复测+编辑行数）/自裁申报（超简报面的一切决定——
含措辞微调）/疑虑。回复五行内（只报 EXIT 码+文件数+自裁条数）。
