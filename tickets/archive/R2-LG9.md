# R2-LG9 票面归档（F-GOV-01）

- id: R2-LG9
- file: src/renderer/features/lineage/LineageTimeline.tsx
- area: lineage
- owner: strong
- status: done

## summary 原文

【T3-P6 收口：本票 file 原指 LineageCanvas.tsx——随 T3-P6 时间线方案切换整族退役删除，退役语义无承接件（星象板/视口坐标系随 SVG 画布方案终结——时间线滚动容器为新语义非延续）——指针指 LineageTimeline.tsx 仅满足机检 file 存在性，非语义承接；退役历史在案=本注记】脉络命之座星象板视觉重制（用户需求 R2「布局太丑」主战场——视觉规范=mockup lineage-constellation.html v2 多模态评审 7.5/10 交付线）：夜幕星空宿主（三层星点+星云四层 radial+✦ 装饰 pointer-events:none 不参与布局）+节点卡（defs linearGradient 三停 165° 渐变+L 金角饰 path+题名 #f5f3ea+衬线金年份）+金微光年份层带（12%α 线+菱形刻度+衬线标——初始视口偏左不可见=无 auto-fit 既有行为，归 R2-LG10）+边辉（feGaussianBlur 2.6 glow 金实链/虚线银推断）+图例两型+工具条玻璃化；拆件 LineageNodeCard/NightDecor（Canvas 245≤250）；消费 theme.css 夜幕 token 零复写；badge 文本不落画布（e2e T4 strict 单源自裁）。联审 0B/1W/6N PASS（视觉规范逐值对照无缺项+e2e lineage 4 条零必然红独立证实+defs 单份无 id 冲突+星空驻宿主不随 viewport——W1 首红/变异日志未落盘=证据缺口记录处置，联审独立推演自洽；N5/N6 层带标初始不可见与 pending-link 亮面板色归 LG10/后续）；5 新 it 入锁 152（渐变/角饰/夜幕宿主/图例/推断边）。verify 832 用例+e2e 25 passed）[locked-change]——票面 scripts/audits/r2-lg9-brief.md；依赖 R3-TH1 夜幕 token+LG-07 布局既有

> 归档于 F-GOV-01（2026-09-28）；registry 主表已瘦身为结论句+本件指针
