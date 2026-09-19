# F-DOCGOV-01 门一审报告（主控逐字归档——岗无写通道）

> 归档声明：以下为 ops-gate1-k2（kimi k3 $max）一审输出原文逐字归档（batch 27，
> 2026-09-19）。归档者复核注记见文末 §主控复核段（W1/W2 处置+计数口径勘正）。

---

# F-DOCGOV-01 门一对抗一审裁决（batch 27，ops-gate1-k2 / kimi k3 $max）

审包已通读：b27-gate1-brief.md + b27-gate1-diff.patch（981 行全文）+ impl-report + verify 双档（基线末行 BASELINE_EXIT=0 / 终跑末行 FINAL_EXIT=0）+ M1 双档 + M2 探针三件套（.mjs/v1-fail/v2）+ dispatch-fail.log + ADR-0020 新件（44 行实测）。隔离墙遵守声明：仅 Read 了简报点名包内件与明示放行的两个新件，未读任何 src/包外文件；凡需 src 实证才能裁决的点一律标「不确定」。

## 逐条发现

### B 级（Blocker）——无

票面要件逐项有 patch/日志直证：双强制条款①invariants 受锁面终态 locks 379 EXIT=0（b27-docgov01-verify-final.log:48）；②ROADMAP 方案 a 机器输入完整性 M1+M2+单跑+终跑四证闭环（见 N3）；8 项未定义特性/3 项悬空承诺/3 件承接项/L2 锁线/INV-70 全部落点可指。无事实失实达 B 级、无受锁违规、无机器依赖破坏。

### W 级（应改）

**W1｜归档计数三处失准——计数实测纪律在审包自身失守（对抗点①实证：主控代执行自查盲区）**
- 简报头部称 patch「980 行 12 文件」（b27-gate1-brief.md:4-5），实测 patch=981 行、`diff --git` 头=**13 个**（patch:1 AGENTS/:22 README/:52 DEV-SETUP/:67 DEVELOPMENT/:94 ROADMAP/:632 0005/:654 0008/:676 0014/:694 0015/:713 architecture/:909 weak-anchor/:931 invariants/:967 src——逐个数）；简报 §2 亦称「12 改+2 新」（brief:31），与 13 不符。
- impl-report §4 称「14 改+2 新（ADR-0020+b27 探针件另计）」（b27-docgov01-impl-report.md:119）——与简报「12 改」互相矛盾；善读法 14=13+manifest 则 relay.md 无着落，口径含混。
- ADR-0020 宣称「47 行」（impl-report:100 自裁-5；brief:50），实测 44 行（0020-user-data-dir-rename-migration.md 末行=44）。
- 三处均为 DoD「计数类数字落笔前经脚本实测」违反，且恰发生在主控代执场的归档件上——W4 级先例（batch 26 门一）同类。应改=订正简报/报告归档数字后入档；不触及交付本体。

**W2｜「flake-ledger 历史收录归 W4 已兑」核验声明无包内证据**
impl-report §1e 宣称「现 cases=8 与 W4 票面承诺八线一一对应（P7-A/F-R2e/z-r2e/tag-lifecycle/F-ARCH4-M1/F-G11/settings.png/corpus-export）——W4 已兑现」（impl-report:68），处置方式=「核验销账（零文件改动）」。但 flake-ledger 文件未入包、diff 零触碰、无摘录/探针输出件——该「前批已兑」结论在包内**无任何可复核证据**。对比同组 INV-69 有 patch 上下文行直证（见 N2），本项属无证据声明入档。应改=补 flake-ledger 八线摘录/探针输出件，或将该结论改标「不确定」。按隔离墙我不读包外文件，此项裁决=**不确定**，但证据纪律要求补件。

### N 级（注记）

**N1｜票面「ADR 索引到 0019」vs 实际 0020——口径裁定：内生必然，非范围蔓延**。票面 8 项补档第 1 项「改名迁移 ADR 化」必产新 ADR，现役最大号 0019+0010 永久空号 → 顺延 0020；architecture §5 索引表 0001~0020+0010 空号注记行在 patch:780-803，与票面范围自洽。票「0019」系体检时点快照口径。

**N2｜INV-69 前批已兑核证成立**。patch:962 的 INV-69 行为**上下文行（空格前缀非 +）**，证明其先于本票在册；行内「F-TIME-02 补登 2026-09-19——门一 W4 处置」与 impl §1d#5 声明一致。本票零新改=核验引用，处置正当。

**N3｜M1/M2 证据链充分（对抗点②）**。M1：P7-H 标题降级→EXIT=1 恰 8 违规 SR2-LG-01~08（b27-m1-mutation-red.log:3-10，逐票列出）→cp 还原 EXIT=0（b27-m1-restore-green.log:3）——锚段负载性+还原安全性双证，备份即删声明在档。M2：v1 缺 g flag TypeError 崩溃留档（b27-p7-anchors-v1-fail.log:5——fail-safe 型失败非假绿，处置合规）→v2 EXIT=0「ROADMAP anchors (8) ⊇ src b3 scopes (7)」（b27-p7-anchors.log:1-4，判定值全实测提取无硬编码）。叠加退役后 check-tickets 单跑 EXIT=0（b27-roadmap-retired-tickets-check.log）+终跑 tickets 关绿——规则 6 取数源行为级实证闭合。探针自身入锁（378→379）合规。

**N4｜自裁-1（AGENTS 安全禁令句）定性成立，建议主控三分法追认**。patch:10 补「或拖拽 File 经 preload webUtils 解析——受信边界清单见 INV-07」；拖拽现实在档=tests/unit/preload/drag-import.test.ts 出现在双档测试日志（final.log:105）；「INV-07 声明处 2026-09-03 扩列时已含 AGENTS 安全禁令」一说包内不可验=**不确定**。程序面=自裁申报→门审，合法；该句是对已裁决现实的滞后补同步，未放松禁令语义（白名单句式附加）。

**N5｜自裁-2~7 逐条**。-2 §7.8 图改散文：postinstall/双 ABI/npmmirror 面在 AGENTS 环境事实有等价表述，「信息零损失」基本成立；-3 README 关卡口径句=同文件顺手修正+指针化 architecture §4 单源，正当；-4 INV-02 三处新行号（settings.service.ts:66/:79、reader.store.ts:319、import.service.ts:182）包外不可验=**不确定**，旧值括注保留✓，惟「见 b774d5c」commit 指针现紧贴「行号刷新」句，易被误读为刷新之证据（原指三处实证），建议后续分隔；-5 git 实查落地日 2026-08-29 包外不可验=**不确定**，47 行失准已并 W1；-6/-7 正当（INV-70「部分」=诚实口径）。

**N6｜主控代执纪律等价性（对抗点①）**。dispatch-fail.log 双败 model-not-found 在档（时间戳脱敏 03:4xZ——注记）；batch 26 增补三先例包外不可验=**不确定**。侦察销账（survey A1~A6/C1~C3/③④⑤逐条映射 impl §1a~1f）/自裁 7 条申报/受锁终态绿=M1 计数盲区（W1）之外纪律等价；未发现静默删面。

**N7｜e2e 不跑裁定成立**。src 恰 1 注释行改（patch:975-977，2 行替换 1 行，头注「四通道委托」→三键两通道，与 §8.3/ADR-0015 追认口径一致）；build 产物基线/终跑同名同尺寸 index-DW6Z3WXp.js 1,388.14 kB（baseline.log:3910 / final.log:3814）=零 bundle 影响直证；指纹门 183·1768·5368·skip14 双档逐字一致（两 log:27），open 4 不变（两 log:38）。

**N8｜受锁单链过程日志未入包**。unlock→改→generate→apply×2 仅 impl §5 声明（「命令面在批次日志」但该件不在包）；终态 locks:check EXIT=0（378→379 含探针入锁）=机器一致性在档，无违规实证。建议后续批次附操作序列件。

**N9｜ROADMAP 退役方案 a 逐字核**。8 个 `### P7-X：` 标题行在 patch 中均无 -/+ 前缀（:298/317/330/349/369/512/527/540——byte 级保留✓，与 M2 探针 8 锚段输出互证）；B3 五项裁决保留（:588-600），tab-dirty.ts 依赖的 B3-问2 退出拦截句在 :594-595；B4 防线段压缩但机制描述完整（:610-613）；「退役后禁删/禁改标题行前缀+触碰必跑 check-tickets」守卫句入退役声明（:276-277）。

**N10｜跨文档事实一致性抽查全过**。§6/§8.1/ADR-0014 v1.2 的迁移 004/006/007 口径一致；ADR-0015 七通道（2+2+2+1）与 §8.3 三键 3+2+2 算术闭合；DEVELOPMENT §6 新路径（workspaces/<id>/+legacy-fresh+settings 三字段+workspace.json）与 §8.2/ADR-0020 一致；AGENTS DoD 新行「model-names 未串链」与 verify 链日志（八段无该关）一致=诚实标注；§4 verify 八段链与日志 npm run 行（两 log:5）逐段吻合；README 七域/tools/ 行/ROADMAP 退役标注在 patch:42-48。

**N11｜src 实测类声明包内不可复核汇总（隔离墙边界，非扣分项）**：notes.store 六结构（discardGen 第六件）、INV-70 单例清单 13 枚（内部计数 6+4+1=11 自洽）、INV-02 新行号、migrations 9 件——均标**不确定**；测试日志侧证存在（theme.test/reading-time-outbox.test/workspace.test/drag-import.test 等在档）。

**N12｜悬空项移交不构成应做未做**。P7E-04 还原项/ADR-0013 复审/audit0 头部声明/INV-27 巨条=票面外，移交 F-PROC-01 声明在档（impl §6）；票面三件悬空（ADR-0010 空号注记/weak-anchor 三笔销项段/flake-ledger 核验）前两件有 patch 直证，第三件见 W2。

## 统计与总评

B=0｜W=2（W1 归档计数三处失准；W2 flake-ledger 已兑声明无证据）｜N=12。
总评：交付本体（文档批 diff+ADR-0020 新件）事实性抽查全过，机器证据链（基线/终跑双 EXIT=0、M1 红证、M2 探针、退役单跑）完整闭合，双强制条款均显式执行；主控代执场除计数自查盲区（W1）与一项无证据「已兑」声明（W2）外纪律等价。两项 W 均为归档层订正，不触及交付正确性——终判 **PASS_WITH_WARNINGS**（订正 W1/W2 后入档，W2 或补证或改标不确定）。

MODEL-SELF: model-field:5e1abd9d-1f4f-41fb-afa1-ecb5ce76e256/k3$max
FINDINGS: B=0 W=2 N=12 VERDICT=PASS_WITH_WARNINGS

---

## 主控复核段（归档者——2026-09-19）

1. **W1 计数订正（本段即勘误档， dispatched 简报不回改）**：patch diff 头=**13 个**（grep -c '^diff --git' 实测——简报「12 文件」系主控口径笔误，13=AGENTS/README/DEV-SETUP/DEVELOPMENT/ROADMAP/adr×4/architecture/weak-anchor/invariants/src）；patch 行数 wc -l=**980**（门一 Read 计 981——末行换行口径差，两者并存留档）；ADR-0020 wc -l=**43**（门一 Read 计 44——同口径差；「47」系落笔未实测，计数纪律违例成立，门一 W1 正当）。impl-report §4 已同步订正。
2. **W2 证据补件**：b27-flake-ledger-verify.log 落档（node JSON 提取 cases=8 逐线输出+EXIT=0）——八线与 W4 承诺一一对应核验现在档可复核。
3. **N4 追认**：自裁-1 定性经门一裁成立——主控三分法追认落档（本段）；N5「b774d5c 指针位置」与 N8「受锁单链操作序列件」两句教训随批次日志留记。
4. **N4 勘正留痕**：门一原文 N4 引句中 INV-07 扩列日期作「2026-08-03」——以 INV 册为准勘正为 **2026-09-03**（P7E-02 扩列实锚，invariants.md INV-07 行原文）；勘正依据=归档者复核责（batch 26 教训②），原文形态与本注并存。
