[routing]: run=20260918191436-1yi58uld source=deepseek model=deepseek-v4-flash role=gate1-reviewer@fb86152e cfg=545b6843a147 switches=0 usage=in=10379,out=8536 latency=40712ms (by ds-call-v2 链)

# F-GEOM-01-G8 门一审计（隔离对抗审）

## 逐 hunk 零行为断言（④1）——通过
对 ⑤附A 全部 +/- 行逐条核：均为路径/相对深度改写，无 import 顺序变动、无类型导出形式变动（OutlinePanel:22、OutlineThumb:6 的 `import type` 形态原样保留）、无注释/断言改动。域内互引 7 边以 context 行零改出现即证（OutlinePanel `'./OutlineThumb'`、OutlineAside `'./OutlinePanel'`/`'./ReaderNotesPanel'`、ReaderNotesPanel `'./AiNotesSection'`/`'./FragmentNotesList'`、AiNotesSection `'./AiNoteGroupList'`/`'./AiNotesStatus'`）。深度改写逐条验算正确：reader/panels/* → features 需 `../../`（`notes.store`）、renderer 需 `../../../`（api、shared）；alias 面 `@shared/*` 不受深度影响，patch 未动=正确。

## 计数独立复算（④2）——对上
A=21：OutlineAside 3（:46/:49/:50）+OutlinePanel 1+OutlineThumb 1+ReaderNotesPanel 5（:47/:48/:49/:52/:55）+AiNotesSection 4+AiNoteGroupList 1+AiNotesStatus 5+FragmentNotesList 1=21 ✓；C=5（1+1+2+1）✓；E=1、B=1、F=6 对 ± ✓；总计 34=numstat ✓。附B 六行 registry 唯一差异=file 路径，status 值（含 G8 仍 `open`）零变 ✓。

## 发现

**W1 报告 §2.1「出边表（探针全表）」名不副实，且反向扫描域不完备。**
该表只列 panels→anchors 4 + panels→state 10 = 14 边，遗漏 patch 明确存在的跨域相对出边 7 条：panels→notes 1（`ReaderNotesPanel.tsx:52`，`'../notes/notes.store'`→`'../../notes/notes.store'`）、panels→api 2（`ReaderNotesPanel.tsx:47`、`AiNotesStatus.tsx:30`）、panels→shared 4（`ReaderNotesPanel.tsx:48`/`:49`、`AiNotesStatus.tsx:31`/`:32`）。改写本身无误（故不阻断），但「全表」表述失实，且「反向边 0」只声明覆盖 `state|anchors|time|interact→panels`——**未含 notes/api/shared 域回引**，若 notes.store 侧回引 panels 即构成循环而未被排除。

**W2 关键证据未入包，核心不变量不可独立复核。**
「全仓旧径残留=0 / 反向边=0」的唯一支撑是 `scripts/audits/g8-s31-check.mjs` 与同名 .log、`locks/manifest.json`、`g8-impl-verify.log`，本包均未附。patch 只能证明「改了的行改对了」，不能证明「没有该改而未改的行」；typecheck/unit 全绿对未解析到的字符串面（配置白名单、vi.mock）无证明力。故残留学说降为 W，而非 B。

**N1 静默失败盲区（不确定）。** 若 4 个受锁测试中存在指向已迁模块的字符串 `vi.mock`，失配时 vitest 静默接真模块、仍可全绿。包内可见的 `ai-notes-section.test.tsx:45` 的 vi.mock 指向未迁的 `anchors/anchor-locate`，其余 vi.mock 不可见——**不确定**，建议 G11 收官或补 `grep 'vi.mock'` 证据。

**N2 wc -l 八件各 -1（合计 -8）**：与设计书 §3.2 恒差 1/件，口径=无尾换行；非行为漂移，但设计书行数不可作核验基准（G11 债登记可接受）。

**N3 自产探针入锁（locks 358→359）**：探针属验证工装非交付面，G11 收官若清理将二次变更锁基线；与自裁⑥遗留态申报（主控 recon 两探针驻锁）自洽。

**N4 E 段勘误（票面 :96-97 → 实勘单行 :97）**与 patch 相符，接受；但单 hunk 无法排除 check-quality.mjs 他处（其他白名单/豁免表）残留旧径——白名单键不存在不会报错，属静默失效面，**不确定**。

**N5 e2e 不跑口径认可**（零行为迁移，G1-G7 同裁，义务归 G11）；M1/M2 仅覆盖 2/34 行变异红证，其余靠 typecheck+unit+指纹门零漂移兜底，红证覆盖不均但可接受。

## 统计与总评
B=0，W=2，N=5。零行为断言、计数数学、F 段 status 零变、E 段勘误四项均独立复核通过，无阻断项；两处 W 均为证据完备性/表述完备性缺口，非实现缺陷。
VERDICT（人读）：PASS_WITH_WARNINGS

FINDINGS: B=0 W=2 N=5 VERDICT=PASS