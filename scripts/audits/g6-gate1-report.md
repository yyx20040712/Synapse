# F-GEOM-01-G6 门一对抗审查报告（ops-gate1-k2 / kimi k3 $max）

> 归档说明：门一岗无 Write 通道，本件由主控从其最终消息逐字归档（G4/G5 同型）。

**verdict=PASS_WITH_WARNINGS**（零阻断；1 项审包文书计数失准 W；6 项 N）

## 核心断言逐条裁定（A1~A6）

**A1 零行为=成立**。patch 头实证：12 件 `similarity index 100%` 纯 rename（g6-gate1-diff.patch:1070-1077/1100-1131/1152-1159，含 annotation-resolve.ts/geometry-types.ts 抽核位）；anchor-locate.ts 98% 单 hunk 恰 4 行（patch:1089-1096），open-paper-anchor.ts 92% 单 hunk 恰 3 行（patch:1143-1148），全部仅限 import 路径段；深度数学核验正确（reader/anchors/ 下 `../state/x`、`../../../shared/x` 解析回原位；同域 './anchor-serialize'/'./anchor-locate' 作 context 行零触碰 patch:1088/1142）。实物抽核 anchors/open-paper-anchor.ts:25-28 与 patch 后像逐字一致。M1 变异证旧径已物理消失（TS2307 "Cannot find module './annotation-resolve'"，g6-mutation.log:9）。

**A2 消费面=成立**。逐 hunk 复数：C 段 17 文件恰 35 处（5+1+1+1+5+1+1+1+1+3+1+1+1+1+2+7+2，patch:876-1227），D 段 1 处（patch:871-872），H 段 e2e 注释 1 处行号不变（patch:1236-1237）；selection-evaluate.ts 恰 7 处（patch:1196-1209）；每处 -/+ 行除 `anchors/` 段外逐字符相同。g6-rewrite.mjs 清单（patch:713-771）与 patch hunk 逐行对账闭合。

**A3 tests 面=成立**。E 段逐 hunk 复数恰 34 行/17 件，含 2 vi.mock 行（patch:1290 ai-notes-section:42、patch:1422 lineage-side-panel:47）；hunk 全部位于 import 区，断言语义零触碰。零漂移三证：vitest 1744=基线（baseline2:3926 / verify7:3827 / verify-final:3842 三跑同值）；指纹门迁移前后逐字同值（183/187 文件、1757/1789 用例、5334/5411 断言，baseline2:27=verify7:20）；M2 tests 面变异红证链完整（mutation.log:22/56/57/69）。

**A4 check-quality=成立**。patch:854-861 hunk `@@ -96,7 +96,7 @@` 仅 :99 一行 `'reader/ai-note-style'`→`'reader/anchors/ai-note-style'`；:87 注释在 hunk 界外物理零改写，recon2.log:44 与 recon3.log:8 双向佐证 :87 原貌。

**A5 registry=成立**。10 hunk 逐一比对均仅 file 字段加 `anchors/` 段（patch:1532/1541/1550/1558/1567/1576/1585/1594/1603/1609），status/owner/summary 零触碰——F-GEOM-01 与 G6 自身仍 `status: 'open'`（patch:1595/1610）；迁移前后 tickets 门 open 15 同值（baseline2:77 / verify7:70），且 locks manifest 无 registry.ts 条目变动=该件本不在锁面（locks 门 351 绿佐证，verify7:80-81）。

**A6 探针 6 件=成立**。均 scripts/audits 新件：g6-recon/recon2/recon3/oneway 纯只读扫描；g6-rewrite 两遍制断言门（pass1 任一不符零写盘退出，patch:817-835）；b18-claim 仅写 relay.md 带三重守卫+回读（patch:236-262）。无生产接线。

## 数字复算（R1~R6）

R2=成立（12×100%+98%+92%）。R3=成立（35/17 逐 hunk 复数）。R4=成立（34/17）。R5=成立（10 行；recon2.log:48-57 迁移前独立扫出同 10 行号）。R6=成立（locks 348=baseline2:87 → 351=verify7:80；diff 面 manifest +6 条目=主控 3+实现者 3，与 R6 自申明时间线 345→348→351 一致，HEAD=345 未分段提交）。**R1=部分成立（不确定声明）**：简报逐件数算术和=3121 自洽（509+427+172+413+251+119+259+284+293+69+43+119+60+103=3121）；实测 2/14 吻合（open-paper-anchor=43、ai-note-style=60，wc 口径）；余 12 件未逐件复算——主证已由 git similarity 100% 承担，行数为次要口径，残余风险≈0。

## 票面口径勘正裁定（K1~K3）

K1 成立：「lineage×2」=LineageSideAiNotes.tsx:22 import（patch:872）+check-quality:99 白名单行（patch:859），恰 2 处形态与票面暗示不同但数量闭合。K2 成立：open-paper-bus 实驻 src/renderer/shared/（open-paper-anchor.ts:28 实物在证），相关改动归 B 段深度修正（7 行中 4 行 shared 域），票面"lineage 域"定性已勘正。K3 成立且更强：实物读 tests/utils/pdf-factory.ts:1-60——**全文零 import**（纯字节工厂），票面"pdf-factory（CorpusExtractor import）"为起草残留；迁移后 oneway 旧径残留=0（oneway.log:10）兜底。

## 自裁申报裁定（S1~S4）

S1 充分：mutation.log:20-21 `M1_RESTORE_EXIT=0` 双行物理在档（首捕弱+补跑再捕，与申报逐字吻合），实质证据 M1_DIFF_EMPTY=YES(:11)/M1_GREEN_EXIT=0(:19) 首轮已落。S2 可：verify-final.log:3879-3880 vite 摘要 52.49/1,392.72 kB 物理在档且与 G5 基线同名同值；更强旁证=baseline2.log:3963-3964（迁移前同包对照）同名——包内前后哈希恒等自闭合；raw 字节+sha 前 16 位另档（build-hash.log:6-7）。S3 合规：manifest +g6-recon3/g6-rewrite/g6-oneway（patch:52-71）。S4 维持警告级留档：`git status --porcelain` 只读零写入、如实申报，票面禁令的防护对象（stage/commit/历史改写）零触碰。

## 发现清单

- **[W1] 审包简报文件计数失准**：简报称"44 文件改动面+6 新探针"（g6-gate1-brief.md:8-9），patch 实证=60 个 diff 头（票内 52=17C+1D+14rename+1F+1H+17E+1registry，+relay.md+manifest+6 探针）。"44"任何口径均无法复算吻合（内容改动面=40、加部分 rename=42）。不影响实现正确性，违计数落笔实测纪律（审包文书面）。
- **[N1] relay.md heartbeat_utc 回退**：15:05:00Z→14:57:35Z（patch:19-21），旧值超前新 last_dispatch(22:56+08:00=14:56Z)——调度板面时序异常，G6 票外，提请注意。
- **[N2] 实现简报内部口径残留**：⑤"apply 后 manifest 345 项"（g6-impl-brief.md:133）与③-1"348"（:90）并立；R6 时间线已自申明，raw 证 348→351。
- **[N3] recon 主探针盲区已闭合**：行过滤器漏 vi.mock 形态（g6-recon.log TESTS=32 vs E=34；:404 过滤器须 `from '`/`import '`），recon2 字符串面补捕 vi.mock 两行（recon2.log:21/:27），recon3 登记/实命中 34/34（recon3.log:5）+patch 实证闭合。
- **[N4] recon2 [1] 过滤器结构性漏 `../../` 出边**：仅列 3 条 state 入边（recon2.log:2-4），B 段 4 条 shared 深度修正不在其输出；B 段 7 行经 patch 单 hunk+typecheck 门+本审逐行核验闭合，无残留。
- **[N5] R1 不确定声明**：12/14 件行数未逐件复算（见上 R1 节），主证链不依赖该数。
- **[N6] 调度面混入提交面**：b18-claim.mjs+relay.md（batch-18 板面）与 G6 票面同 diff——主控收口裁量项（分拆提交或按留档口径①入库），非实现者越界。

## 证据 EXIT 行物理在档性（抽核全过）

verify7 八关 GATE_EXIT=0（:12/:62/:72/:81/:89/:97/:3831/:3867）；verify-final VERIFY_EXIT=0（:3882）；baseline2 G6_VERIFY_BASELINE2_EXIT=0（:3966）；anchored-net ANCHORED_NET_EXIT=0 且 18 文件/211 用例（:263-268，stderr 栈帧已指向 anchors/ 新径=:23-24 旁证测试跑在新路径）；oneway ONEWAY_RESULT=PASS（:11，anchors→state 恰 3 边明细 :6-8）；mutation M1/M2 全链 EXIT 在档。

## 总评

零行为纯迁移票的全部硬断言（A1~A6）经逐 hunk 独立复数+实物抽核+门禁 raw 三重闭合；三项票面口径勘正（K1~K3）如实且 K3 经实物证更强；四条自裁（S1~S4）处置充分。唯一 W 落在审包简报自身计数（44 vs 实证 60），不涉实现面。域内互引 25 处零改写经 recon.log 独立复数（25=60 SELF−35 C 段）+similarity 100% 双证。**可放行至门二。**

MODEL-SELF: model-field:5e1abd9d-1f4f-41fb-afa1-ecb5ce76e256/k3$max
FINDINGS: B=0 W=1 N=6 VERDICT=PASS_WITH_WARNINGS
