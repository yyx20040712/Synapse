# F-GEOM-01-G6 门一审包（对抗式隔离一审——k2 承载）

## 审对象与断言基线

票：F-GEOM-01-G6（M3 目录化 anchors/ 迁移，零行为纯迁移，尾注
[locked-change][test-refactor]）。审包三件自包含：
1. **本简报**（任务书+实现报告+复算义务）；
2. **g6-gate1-diff.patch**（1613 行全量 diff，git diff -M 生成；44 文件改动
   面+6 新探针全文；rename 识别已在 patch 头可见）；
3. 证据 raw（scripts/audits/g6-*.log 系列——你有 Read 权可按需抽核，不随包
   内联）。

**核心断言（逐 hunk 验证，证伪任一即 FAIL）**：
A1 零行为变更——14 件迁移中 12 件 diff 必须为 0 行（rename 100%），仅
anchor-locate.ts（4 行）与 open-paper-anchor.ts（3 行）允许改写，且仅限
import 路径段（'./state/x'→'../state/x'、'../../shared/x'→'../../../shared/x'）；
A2 消费面改写仅路径段变化——C 段 17 文件 35 处+D 段 1 处+H 段 e2e 注释 1 处，
每处 diff 前后除 `anchors/` 路径段外逐字符相同；
A3 tests 面纯路径改写零断言语义变化——E 段 17 物理件 34 行（含 2 vi.mock 行），
用例数/断言数零漂移（vitest 1744=基线）；
A4 check-quality.mjs:99 白名单值恰改 'reader/ai-note-style'→
'reader/anchors/ai-note-style'（:87 注释零改写）；
A5 registry 10 行仅 file 字段路径段变化，status/owner/summary 零触碰（:297
仍 open——翻 done 归主控收口）；
A6 探针 6 件（b18-claim/g6-recon/g6-recon2/g6-recon3/g6-rewrite/g6-oneway）
无生产行为（仅 scripts/audits 证据面）。

## 数字复算义务（独立重算，禁抄报告）

R1 14 件行数和=3121（wc 口径）；R2 rename 相似度分布（12×100%+2 件含
改写）；R3 C=35 处/17 文件（patch 中逐 hunk 数）；R4 E=34 行/17 件；
R5 registry=10 行（20±行 diff）；R6 locks manifest 348→351（+3=实现者探针
g6-recon3/g6-rewrite/g6-oneway；主控 3 件已在基线 348 内——时间线：基线首跑
345→generate+apply 348→实现者交付后 351）。

## 三项票面口径勘正（裁其如实性）

K1 「lineage×2」=src import 1（LineageSideAiNotes:22）+check-quality:99 白
名单 1——成立否；K2 「open-paper-bus」实为 **shared 域**文件非 lineage——
深度修正 4 行归 B 段成立否；K3 「pdf-factory」零命中（G4 实勘先例延续）——
裁「票面起草口径沿用、实勘勘正」处置是否充分。

## 实现者自裁申报 4 条（逐条裁）

S1 M1_RESTORE_EXIT 首捕弱（echo 的 echo）→补跑 cp→diff 链再捕=0——证据
充分性；S2 build kB 数=vite 摘要显示值+raw 字节 sha 同档——口径可否；S3 自产
探针 3 件随收口登记——合规；S4 **git status --porcelain 只读字面违约自首**
（票面「禁任何 git 命令」）——裁：只读零写入，如实申报，处置（警告级留档）
是否充分。

## 抽核建议位（不限于）

- patch 中 annotation-resolve.ts / geometry-types.ts 的 rename 段（similarity
  100% 声明与内容零变化）；
- selection-evaluate.ts 14 行（7 处 import ×2）——C 段最大单文件面；
- ai-notes-section.test.tsx / lineage-side-panel.test.tsx 的 vi.mock 行；
- g6-verify7.log / g6-mutation.log / g6-build-hash.log / g6-oneway.log /
  g6-anchored-net.log 尾部 EXIT 行物理在档性；
- 实现者声称「构建产物与 G5 哈希同名逐字恒等」——index-D3egZtl2.js/
  index-BfpEygSE.css（零行为迁移的最强旁证，N3 标配）。

## 输出义务

报告写 scripts/audits/g6-gate1-report.md（中文 Write 工具，禁 heredoc）：
verdict=PASS / PASS_WITH_WARNINGS / FAIL；B/W/N 分级逐条（B=阻断）；末行
FINDINGS: B=/W=/N=/VERDICT=。你无 Write 通道时在最终消息全文输出报告
（主控归档）。
