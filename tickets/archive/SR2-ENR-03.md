# SR2-ENR-03 票面归档（F-GOV-01）

- id: SR2-ENR-03
- file: src/renderer/features/library/PaperDetailPanel.tsx
- area: library-ui
- owner: strong
- status: done

## summary 原文

详情面板被引数透出（b3: ENR 域；验收缺陷 D 修复——UI 透出面缺位非 bug：数据链全通（迁移 005→detailById 装配→schema optional）唯独 renderer 零引用；「期刊」与「来源」间加一行 Row（citedByCount===undefined 空→Row 自动 —；零值显示 0）；新测试 paper-detail-cited.test.tsx 3 it always-active（124/缺省 —/零值 0 边界）；shared/models 零触碰）[locked-change]（新测试入锁 143→144）——票面 scripts/audits/sr2-enr-03-brief.md；依赖 ENR-01/02 数据面

> 归档于 F-GOV-01（2026-09-28）；registry 主表已瘦身为结论句+本件指针
