# F-CONSOL-07 票面归档（F-GOV-01 机制）

- id: F-CONSOL-07
- file: tests/unit/renderer/theme-boot.test.ts
- area: infra
- owner: strong
- status: done

## summary 原文（立案五层规约）

TB:84 注释勘正微票（2026-09-29 v77 交接场立案——F-CONSOL-05 遗留备案 P3-3 兑现）：行为层=theme-boot.test.ts 接缝一负锚注释勘正——原注「\btype=防 data-type 类子串误报」失实（\b 词边界在连字符后恒成立，data-type=module 仍可误中负锚=已知假阳性面；\b 真防的是词字符接缀 xtype= 类），勘正为机理准确的「防词字符接缀、不防连字符前缀+升级方向=属性结构化解析（F-CONSOL-05 遗留备案）」；注释 4 行替换 1 行净+3，零逻辑行变更，正则与断言零改动（升级归 P3-1 另票）。接口层=theme-boot.test.ts（受锁面 unlock→改→即时 apply）+registry 行+locks manifest。架构层=[locked-change][test-refactor] 双尾注（diff 含 tests/** 按宪法战役范围闸）。生命周期层=定向 vitest 8/8+全量 verify EXIT=0（指纹门 206/2120/6553/12 base=cur 零 delta——注释不进抽取面）+树态 3 路径零蔓延；分级烤验小批（微票 A 先例同型）=k1 单审+主控亲验。文化层=零新依赖；票号 registry+archive 双查重零命中。

## 收口记录（2026-09-29 场，主控亲执+k1 单审）

**门一 k1 单审=PASS（B0/W1/N3）**：
- W1 票面计数口径失实（初报「注释 4 行替换 2 行」，diff 实证 -1/+4 净+3）——registry 行已随收口订正。
- N1「字母接缀」措辞可收为「词字符接缀」（_type=/1type= 同族）——已随订正采纳入 registry 行。
- N2 假阳性实比注释所举更宽：data-defer/data-async/data-nomodule 同族第一支路+type=modules 尾部无 \b（HTML 未知 type 值本不执行=歪打正着真阳）——全支路面随 P3-1 立项写入依据（交接书 §2 池面备注）。
- N3 包外不可核验项（查重/时序）由 verify 全绿+树态佐证，自述一致无反证。

**终态基线**：verify EXIT=0（189 件/2066 用例不变）；指纹门 check EXIT=0（206/2120/6553/12 零 delta）；locks 275；台账 131 零触碰。

**勘正（F-CONSOL-08，同场）**：上文「verify EXIT=0」同 F-CONSOL-06 系管道假绿
（`| grep | head; echo $?` 退出码取自 head），真值=红（F-CONSOL-06 done 行+
baseline.json 的 tickets 段误报，与本票改动无关——本票 diff 面注释/registry/manifest
各段实绿）。本票提交 c193c2aa460 为带红提交。修复与根因链归 F-CONSOL-08。
