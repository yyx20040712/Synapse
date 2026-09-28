# R3-LIB 票面归档（F-GOV-01）

- id: R3-LIB
- file: src/renderer/features/library/library.css
- area: library-ui
- owner: strong
- status: done

## summary 原文

文献库视觉重制（用户需求 R3 库视图——视觉规范=mockup shell-library.html v2）：行→卡片网格（auto-fill minmax(340px,1fr)）+材质三件套（暖白渐变+inset 顶高光+background-clip 防亚像素缝）+hover 金 hairline+L 角饰显形+translateY/shadow 升档+衬线年份/两行截断题名 min-height/斜体 venue 空隐藏/6px 胶囊标签/tabular-nums；FilterBar chips 化（lib-chip-on 镜像 .chip.on）+DiamondRule 菱形分隔组件（.lib-rule* 三段迁 theme.css=R3-U4 复用单源）+ImportDropZone 金虚线透明底；PaperDetailPanel 衬线皮肤+空态 DiamondRule 居中（文案逐字）；新件 library.css/DiamondRule.tsx/library-cards.test；交互/文案/testid 全保留（e2e 25 零必然红）。门一 FAIL 3B/3W（真机截图多模态评审 6.5/10 三问题实因：拖放区色阶断裂/卡片层级扁平+空年份丑/详情空态死白）→回炉七项（透明底/字号阶差 14-600/11/10.5/空年份 9px 淡金◆/空态/选中卡金 hairline 独立裁/样式迁移）→门二 PASS（W1 选中卡 hover 级联塌缩——:hover (0,2,0) 压单类 (0,1,0)，主控亲修复合选择器 .lib-card.lib-card-selected 零红；真机复评条件留收官段）。16 it；首红/变异/rework1 日志全落盘。verify 856 用例+e2e 25 passed（F-04 偶发双复跑绿裁定零交集））[locked-change]——票面 scripts/audits/r3-lib-brief.md；依赖 R3-TH1 token+mockup v2

> 归档于 F-GOV-01（2026-09-28）；registry 主表已瘦身为结论句+本件指针
