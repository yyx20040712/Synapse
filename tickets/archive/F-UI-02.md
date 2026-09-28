# F-UI-02 票面归档（F-GOV-01）

- id: F-UI-02
- file: src/renderer/features/reader/view/ReaderToolbar.tsx
- area: reader
- owner: strong
- status: done

## summary 原文

阅读器工具栏+侧栏标签页图标化+反馈强化（设计文档 §2.5 P5+P6；D7=24×24 单色描边简笔画沿 NAV_ICONS/TitleBarControls 同源）：①ReaderToolbar 图标化面（主控裁量=五文字控件）：上一页/下一页（左右箭头）/适应宽度（⇔ 双向箭头）/双页（双矩形，**随 pageLayout 三元切换单矩形**——TitleBarControls isMax 三元先例）/选择模式（文本光标选择图标）——按钮=图标 aria-hidden+**sr-only 视觉隐藏文本**（textContent 保受锁断言：selection-mode:303 textContent==选择模式/double-page:425 findBtn(双页) 精确匹配+e2e reader-scroll:163 getByRole name=适应宽度/ai-notes-section:53 tab name=笔记）；−/＋/100% 保持字符数字（符号信息性，图标化反损可读性——主控自裁呈门审）；②OutlineAside TAB_LABELS 三 tab 图标化（目录=列表/缩略图=网格/笔记=笔记图标+sr-only span——outline-aside:96 toEqual 精确数组兼容）；③反馈强化（叠加式保活红线）：选择模式激活=bg var(--accent-soft) 填充常亮（叠既有 borderColor var(--accent)——selection-mode:323 borderColor 断言保活不动）+双页图标随态切换；title 原生 tooltip 全控件补齐；④CSS=theme-reader.css 新建工具栏 svg 类（仿 theme-shell.css .titlebar-btn svg：stroke currentColor/fill none/统一线宽）+tab 图标类；图标=内联 SVG 常量禁新依赖；颜色点组不动（已图形化）；【毕 2026-09-20 三屋全链】①toolbar-icons.tsx 新件（63 行六常量，24×24+aria-hidden，拆件保 ReaderToolbar ≤250——改造前 233+常量将超）；②ReaderToolbar 233→248：五控件 svg+sr-only span+title 悬停汉语+双页图标/-title 随 pageLayout 三元+选择模式激活 background var(--accent-soft) 常亮叠加（borderColor 断言保活不动）；−/＋/100%/颜色组零触碰（主控裁量保字符，门审追认）；③OutlineAside 157→185：TAB_ICONS 三常量+tab 纯图标 flex 居中+sr-only（outline-aside:96 精确数组兼容）+title；④theme-reader.css 14px 描边基线（.titlebar-btn svg 先例；门二 G4 独立反证 reader 域 svg 封闭集+ReaderSearchBox 零 svg=选择器零误伤）；⑤新测试 reader-toolbar-icons.test.tsx（139 行 4 it plain describe：五控件双面/双页 rect 随态/选择模式双断言并立/三 tab 数组精确——实现者申报 141 系口径差门二勘正）；TDD 红 4/4→绿+**变异四支**（M1 删 background/M2 三元钉死[实现者]+M3 aria-hidden 翻转/M4 删 TAB_ICONS 渲染[主控补——门一 W2 闭环]）全还原 diff 空；受锁邻面 6 文件 57 用例绿（保活实证）；门一 k1 B0/W3/N6（三 W 主控全销）+门二 GO（P0=0/P1=0——承接链 1724+3+3+4=1734 独立复算+保活断言行为级签名级双核）；verify 亲验 EXIT=0（168/1734/locks 247/指纹门 186·1780·5408·skip14）+e2e 三面 21 passed（适应宽度 name/tab name=笔记/三 tab——真 Chromium sr-only 双面实证）+model-names 0；批档=仓外 f-ui02-batch-record.md；[locked-change]（manifest+新测试件入锁 246→247）

> 归档于 F-GOV-01（2026-09-28）；registry 主表已瘦身为结论句+本件指针
