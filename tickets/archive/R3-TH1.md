# R3-TH1 票面归档（F-GOV-01）

- id: R3-TH1
- file: src/renderer/shared/theme.css
- area: ui-kit
- owner: strong
- status: done

## summary 原文

视觉系统主题基建（用户需求 R3：UI 美术优化参考 aquaresearch+原神——设计定稿 docs/design/2026-08-28_visual-system.md，token 终值单一来源=mockup shell-library.html :root）——①theme.css v2：旧 9 键换值（暖纸白 --bg #f6f4ee/墨青 --accent #2c5f8a/暖灰边框——40 tsx 内联引用零churn 名兼容）+新增 27 键（--gold 金铜系/--ink 墨青侧栏/--font-display 衬线栈 Georgia/宋体/--shadow 1-2-3/--radius s-m-l/--panel-glass/--night 夜幕系 R2 预铺）+纸面丝纹底；②App 壳：墨青渐变侧栏+右缘金渐隐线+菱形品牌标+四内联 SVG 图标（零依赖红线）+金 active 左缘条+版本徽记 footer；WorkspaceSwitcher 夜色最小适配；③共享四件 skin（Button/Dialog/SplitPane/Toast）——联审捉 B1 真缺陷：Button 静态皮肤内联 style 恒压 :hover 类致 hover 提亮永不生效（CSS 级联）→回炉迁全类化+4 it 防线（含 hover 0.7/ghost gold 文本断言+形态锁）；④受锁必然红恰 1 处（F-06 bodyBg rgb(247,248,250)→rgb(246,244,238) 预裁③核准）+token 防漂移锁 theme.test；annotation 五色保持原值（e2e 精确断言锁定优先）。联审 B1/W1/N6→回炉→827 用例+e2e 25 passed；locks 150→152；对比度抽查 --accent 3.6→6.1:1 --ok 3.1→4.7:1 均改善）[locked-change]——票面 scripts/audits/r3-th1-brief.md；依赖设计定稿+mockup 摸鱼图（多模态两轮 8/10 定稿）

> 归档于 F-GOV-01（2026-09-28）；registry 主表已瘦身为结论句+本件指针
