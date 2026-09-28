# R3-RDRSET 票面归档（F-GOV-01）

- id: R3-RDRSET
- file: src/renderer/features/settings/SettingsSection.tsx
- area: settings-ui
- owner: strong
- status: done

## summary 原文

阅读器周边+设置页视觉（视觉役收官单元——设计定稿浓度表：阅读器=装饰浓度最低）：ReaderToolbar 玻璃浮层（panel-glass+blur10+金底缘——border-b 等高 1px 换 CSS 零占位，F-05 shrink-0/flex-wrap/py-2 几何零变）+ghost 控件+衬线页码；TabBar active 金 hairline 底缘（inset 零占位）；OutlineAside 金缘 tab+ReaderNotesPanel h4 金左缘条节标（阅读器侧板保持亮面——夜色只属脉络域）；SettingsPage 分节卡+金节标衬线+节间 DiamondRule 复用（SettingsSection.tsx 拆件，作用域 CSS 自持节）；红线零触碰机检实证（AiAnnotationLayer/AnnotationLayer/SelectionRects/scroll-converge/PageColumn/multiply/z-index 九名 grep 计数全 0——F-07 层叠链+F-05 滚动收敛面不动）。联审 PASS 无返工（reader-text.spec 107 断言五次全量从未红；e2e 间歇红三线证据裁定环境波动+backdrop-filter 边缘贡献留 W1 观察项——再现 ≥2 立案 A/B 摘 blur）。3 新 it；首红/变异/rework 日志落盘。verify 859 用例+e2e 25 passed×2）[locked-change]——票面 scripts/audits/r3-rdr-set-brief.md；依赖 R3-TH1 token+R3-LIB DiamondRule

> 归档于 F-GOV-01（2026-09-28）；registry 主表已瘦身为结论句+本件指针
