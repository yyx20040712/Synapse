# F-GEOM-01-G6 门二终审简报（实证裁决位）

## 审对象与前置结论

票：F-GEOM-01-G6（M3 目录化 anchors/ 迁移，零行为纯迁移，
[locked-change][test-refactor]——GEOM 战役受锁面最重迁移步）。

实现者=ops-executor（GLM5.3flash $max）交付全绿；门一=ops-gate1-k2
（kimi k3 $max，zipoo——用户指令 2026-09-18 起 k2 承载）verdict=
**PASS_WITH_WARNINGS B=0/W=1/N=6**，可放行门二。

## 你的证据面（Read 权按需抽核）

- 全量 diff：scripts/audits/g6-gate1-diff.patch（1613 行，git diff -M）；
- 门一报告：scripts/audits/g6-gate1-report.md（逐断言裁定+复算+发现清单）；
- 实现报告/六段简报：scripts/audits/g6-impl-report.md / g6-impl-brief.md；
- 证据 raw：scripts/audits/g6-{verify-baseline;verify-baseline2;verify7;
  verify-final;mutation;build-hash;anchored-net;oneway;recon;recon2;recon3}.log
  系列；
- 设计书：docs/design/2026-09-18_f-geom01-unification-and-reader-subdomains.md
  §3.1/§3.4/§5.1/§5.2；
- 工作树=未提交交付态（git 状态你无权跑，以 patch 为准；主控收口在终裁后）。

## 门一发现的主控处置申报（裁其充分性）

- **W1（审包简报「44 文件」计数失实）**：主控承认——起草 gate1-brief 时把
  `git diff -M --stat | grep -c` 的行匹配数（44）直接当 diff 文件数落笔，未
  复算（patch 实证 60 diff 头）。处置=本简报+批次日志勘误段留痕（简报系已
  归档历史输入件不回改）。同族教训：审包文书面数字与报告数字同守「落笔前
  实测」。
- **N1（heartbeat 15:05:00Z→14:57:35Z「回退」）**：15:05:00Z 系 batch 17
  收口写入的近似整点值（batch 6 教训 W6 同款时钟近似），本批认领以实测
  14:57:35Z 覆盖；调度员发布锚 last_dispatch=14:56:11Z 与认领时序自洽。
  票外板面事项，无处置需求。
- **N2（impl-brief ⑤「345」与③-1「348」并立）**：⑤为基线首跑前预留旧数
  字，③-1 已勘正未同步⑤——文书口径残留，处置=批次日志勘误段（同 W1 不
  回改已归档件）。
- **N3/N4/N5**：侦察探针正则盲区（vi.mock/../../出边/12 件行数未逐件复
  算）——均已经 recon2/recon3+patch+门一逐行核验+similarity 100% 主证闭
  合；教训登记（探针过滤器覆盖面：import 行正则须含 vi.mock 形态、出边扫
  须含 ../ 前缀）。
- **N6（调度面混入提交面）**：b18-claim.mjs+relay.md 认领行与票面同 diff——
  处置裁量=按 G4/G5 先例随收口一并提交（板面更新+claim 工具件属批次运行
  留档，非票面越界）。

## 终审义务

1. **数字独立复算**（禁抄门一/报告）：14 件行数和、C=35/17、E=34/17、
   registry=10、B 段 7 行、域内互引 25 处、locks 345→348→351 时间线、
   vitest 1744、指纹门 187/1789/5411 零漂移、锚定回归网 18 件/211 用例、
   构建产物 index-D3egZtl2.js/index-BfpEygSE.css 同名同尺寸（零行为最强
   旁证）。
2. **收口前置条件裁定**（G4/G5 惯例）：①翻 done 前置——终跑 verify 须在
   registry G6 翻 done + locks 终态之后跑（「已验证态≠提交态」缝封闭）；
   ②冻结序——全量写入→终跑→单提交（manifest 与提交同步，禁跨提交延迟）；
   ③staging 白名单核验义务（G5 教训④：add 链禁 2>/dev/null 吞错+提交后核
   create/rename mode 清单——本票 14 对 rename 识别是提交完整性关键）。
3. **回炉判定**：B=0 且 W/N 均文书级——是否存在需回炉的实现面缺陷。
4. **G11 对账债登记义务**：设计书 §3.2 anchors/ 段 13 件括号行数与实测
   偏差（509 vs 515、427 vs 454 等——G5 P2-2 同款文档口径偏差，非本票
   缺陷）——裁「登记 G11 收官对账债」处置是否成立。
5. **口径一致性**：票面「锚定回归网 18 物理件」中 5 件零改写（经
   PdfPageCanvas 再导出消费/无依赖面）+13 件有改写+4 件名单外受锁件
   （release-affinity/ai-notes-section/lineage-side-panel/ai-note-style.test）
   =实际受锁 17 物理件——裁此实勘口径如实性。

## 输出义务

报告写 scripts/audits/g6-gate2-report.md（无写通道则最终消息全文输出，
主控归档）：verdict=GO / GO_WITH_CONDITIONS / NO-GO；P0/P1/P2/N 分级；每条
含证据行号；末行 FINDINGS: P0=/P1=/P2=/N=/VERDICT=。中文 ≤6KB（ORG-12）。
