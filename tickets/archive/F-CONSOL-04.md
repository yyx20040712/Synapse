# F-CONSOL-04 票面归档（F-GOV-01 机制）

- id: F-CONSOL-04
- file: tests/unit/renderer/lineage-timeline-page.test.tsx
- area: infra
- owner: strong
- status: done

## summary 原文（立案五层规约）

lineage-canvas.test 名实对齐改名票（v67 §3 起备案「lineage-canvas.test 文件名-内容错位（基线键已入册——F-CONSOL 系候选）」销项；2026-09-29 挂账清理场立案——用户指令「继续开工完善上述挂账」）：行为层=git mv 改名 tests/unit/renderer/lineage-canvas.test.tsx→tests/unit/renderer/lineage-timeline-page.test.tsx（内容在 T3-P6 已改写为 LineageTimeline/LineagePage 组件测试——Canvas 断言面随 SVG 画布方案退役删除，文件名残留 canvas 失真）+头注补 2 行来源标注+旧基线键走 S3 FILE 级豁免通道退役（台账 129→130——通道首次真实使用）。接口层=改名件+scripts/test-surface.exemptions.json+locks/manifest.json（generate 重生成）。架构层=[locked-change][test-refactor] 双尾注；基线零触碰（旧键留 base 由豁免消费、新键 NEW_FILE 9 用例 delta 绿）。生命周期层=verify EXIT=0+指纹门 check EXIT=0（exemptions 130 hits:1 stale:129）。文化层=零新依赖；出处=v67-v76 交接书备案链+v76 §2 候选票行。

## 收口记录（2026-09-29 场，分级烤验小批=k1 单审+主控亲验）

- 引用面核查（重生成前摸底时点）：全仓 grep「lineage-canvas」仅命中基线键（11240 行=豁免对象）+manifest 锁键（589 行=已重生成剔除）+自身头注——零代码/文档引用破坏；台账 file 字段命中系 grep 后写入（时序说明，k1-N5/N6 处置）。
- 主控亲验矩阵：verify EXIT=0（189 件/2064 用例——件数不变，9 用例随文件迁移）；指纹门 check EXIT=0（NEW_FILE 新键 9 用例+hits:1）；locks generate+apply 同步；树态恰 3 项零蔓延。
- k1 单审 PASS（B0/W1/N6）：W1=头注新增行末「）」悬空闭合括号（上文 [LG-02] 段括号已闭合）——修（去括号）；N4 双 timeline 件互指（正向已在档 line 12「分组/砖砌/CSS 逐值锁=lineage-timeline.test.tsx 单源」，反向互指维持候选）；N3 FILE 豁免残留期同名复生风险（stale 129 机制固有同族，维持）；N7 尾注=双尾注已带。
- **立案查重失误实录（教训）**：起票号 F-CONSOL-03 未查 registry+archive 双面——撞 09-28 已归档「测试资产清出」票（旧档 13 行在 tickets/archive/F-CONSOL-03.md，registry 349 行 done 在册），双行 F-CONSOL-03 短暂共存后被查实；Write 覆盖旧档被「先 Read 后写」机制兜底拦住（零损坏）。改号 F-CONSOL-04（registry 行+头注+台账 reason 三面同步）。教训=立案前票号必须 registry 主表+archive 归档面双查重（交接书 §5 候选）。
- 互指现状：本件头注指向 lineage-timeline.test.tsx（单源分工）在档；反向（lineage-timeline.test.tsx → 本件）未加——本票克制纯改名微票不扩面，登记候选。
