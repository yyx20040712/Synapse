# F-TESTREF-S3 票面归档（F-GOV-01 机制）

- id: F-TESTREF-S3
- file: scripts/check-test-surface.mjs
- area: infra
- owner: strong
- status: done

## summary 原文（立案五层规约）

FILE 级豁免通道——删整测试文件的机检出路（F-TESTREF-S2 移交候选小票，2026-09-27 用户裁决「归入下一工单」立案；来龙去脉=S2 收口[96019e4606a]die(4) 文案分桶设计时认定 FILE_MISSING/TICKETS_MISSING/ONLY_FORBIDDEN=无豁免通道类、指人工删基线重跑——但真实删整测试文件场景[F-TIME-02 先例：删 4 件]豁免台账 per-case 形态无法承载 FILE 级退役，v65 §3+v66 §3 两轮备案后立案）：行为层=exemptions.json 增 FILE 级条目形态+check-test-surface 轴一/轴二认 FILE 级豁免+die(4) 文案更新+快照兼容（version 1 向后兼容不破）；接口层=scripts/check-test-surface.mjs+tests/unit/tools/check-test-surface.test.ts（CLI 探针法扩展用例）；架构层=纯测试面白名单票（[locked-change][test-refactor] 双尾注）；生命周期层=TDD 先红后绿+变异红证+基线不触碰；文化层=零新依赖/单源延展/出处备案=v65 §3+v66 §3+S2 移交语。

## 收口记录（2026-09-29 场，三屋全链+回炉 1）

**实现**=ops-executor（session:host-tier，262.4 万 tokens/39 调用）：①条目形态=显式哨兵 `{file, fileScope:true, reason, rulingLink}`（零 matcher 键——主控预裁防 matcher 键拼错静默升级整文件豁免）；②loadExemptions 两类互斥 schema（fileScope 非 true/与 matcher 并存 die 3）；③exemptionHits 增 kind='file'；④judge FILE_MISSING 先试豁免（命中 recordFace 留档，stats 口径零变）；⑤身份键含 fileScope（S2 多重集差语义保持）；⑥hardKinds 收窄=TICKETS_MISSING/ONLY_FORBIDDEN；⑦die(4)/die(1)/头注三处文案同步。新用例落姊妹件 tests/unit/tools/check-test-surface-file.test.ts（受锁既有件零改动——T3-U1 先例族；成因句经门二 F1 勘正：max-lines 对 tests/**/*.ts 已由 eslint override 关闭，依据=受锁件零改动+宪法规范层）。TDD 首跑红 5F/1P（T1/T3/T4/T5/T6 红[现状 FILE 条目 die 3]、T2 绿[既有行为已正确]）→终态 8/8 绿（含 R1 补 T7/T8）+既有件 14/14 零回归。变异 M1（摘 'file' 分支）3F/M2（摘 fileScope 校验）5F 还原净。超票面 3 项申报（变异期二次 unlock-apply/T4a 取形自裁/其余无）。

**门一**=k1 PWW（B0/W1/N8）+d1 PWW（B0/W3/N6）双席独立。**双席同中 W1**=exemptionHits 跨 kind 误命中潜伏面（FILE 条目在 payload 匹配字段 undefined 时可被 case/assert 分支从宽误捞——现无活路径[调用方 payload 恒真实字符串]，防御面）。d1-W2=statsLine 口径——主控终裁伪问题（累计行在旧失败路径本就执行+statsLine 打印先于 die，行为零变；裁决部独立复核通过）。d1-W3=并存/重复条目测试盲区。

**回炉 R1（主控亲执）**：a) W1 加固=exemptionHits FILE 条目结构性隔离（fileScope===true 短路+continue，头注 R1 注记——守卫非活路径故无 CLI 红证面，probe 变异 A 支实证 8/8 仍绿）；b) W3 闭合=T7（同文件 FILE+matcher 并存协同：双 RETIRING+快照双条）+T8（重复 FILE 条件命中路径多重集：exit 0+快照双条）。

**门二**=probe 10/10 PASS（verify 188 件/2056 例 EXIT=0；指纹门 cur files 205/cases 2110/assertions 6501/skipSites 12[+8 例+48 断言全数本票]；两件 22 例；真实仓 check EXIT=0+entries 129 hits 6 stale 123+台账零 fileScope；schema/R1 短路/hardKinds 三处直读在位；树态恰 3 项；locks 274；台账+基线双 diff 空；变异 A 支 8/8 绿=防御守卫无红证面实证+B 支 5 failed 精确预期红集）+裁决部 **GO_WITH_CONDITIONS（P0=0）**——C1 头注勘正（已兑现：max-lines 表述失实→受锁件零改动+宪法规范层）、C2 收口双尾注形态、C3 e2e 免跑（零 src 改动裁量）。裁决部独立复算全一致（188=187+1；2110=2102+8；6501=6453+48；274=273+1；129−6=123）+F1-F7 注记全采纳（F1 勘正/F4 T8 边界由既有 13b 单源锁/F5 NEW_FILE 11 个中本票仅 1 个——记账勿把 base 滞后 delta 归 S3/F6 包外断言点名/F7 异构独立）。

**基线**=verify 188 件/2056 例 EXIT=0（收口树亲验）；e2e 免跑（C3——零 src 改动+spec 零 diff）；指纹门 cur 205/2110/6501/12（base 194/1994/6175/12 维持再生成欠账）；locks 273→274（+新测试件）；豁免台账 129 零触碰；open 面 2→1（余 F-TESTREF-S1）。

**证据仓外档**=`E:/zcode_md/synapse-archive/F-TESTREF-S3/`（probe progress+verify/vitest/check/locks log+变异 a/b log 与工具件）。
