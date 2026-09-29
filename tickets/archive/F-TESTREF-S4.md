# F-TESTREF-S4 票面归档（F-GOV-01 机制）

- id: F-TESTREF-S4
- file: scripts/check-test-surface.mjs
- area: infra
- owner: strong
- status: done

## summary 原文（立案五层规约）

指纹门 check 脚本防御面加固四项（S3 门链备案族兑现，v74 §3 在册；2026-09-29 挂账清理场立案——用户指令「继续开工完善上述挂账」）：行为层=①k1-N1 台账 entries 元素 null/非对象/数组前置校验（受控 die 3，原=裸 TypeError 崩溃）②d1-N-1 条目键白名单七键（file/caseTitle/assertionText/skipSiteText/fileScope/reason/rulingLink——拼错键点名 exit 3，原=FILE 条目死键静默通过掩蔽作者意图）③d1-N-4 快照 fileScope 畸形值（非 true 布尔含 "true" 字符串）归 snapshotCorrupt（原=exemptionEntryKey 身份键不等→轴二假 added/removed 双误报）④d1-N-6 FILE_MISSING 磁盘二分（existsSync(join(root,path))——盘在→SCAN_MISSING 新 kind 红指向抽取器/后缀白名单排查；盘无→FILE 豁免通道零变；豁免命中 recordFace 优先于二分）；d1-N-2 check 不查多登=明确维持设计现状（轴二 baseline 窗口拦，v75 全量对账毕）。接口层=scripts/check-test-surface.mjs（546→578 行）+姊妹件 tests/unit/tools/check-test-surface-hardening.test.ts（CLI 探针法，S3 先例族）。架构层=纯机检加固（判定语义零变，只增 fail-closed 面）；[locked-change][test-refactor] 双尾注。生命周期层=TDD 先红后绿+变异红证 M1-M4+M-T8；基线/台账/快照三 json 零触碰。文化层=零新依赖；出处=v74 §3 S3 备案族裁决部 P2 行。

## 收口记录（2026-09-29 场，三屋全链+回炉 1+裁决部 P2 声明面补）

**实现**=ops-executor（session:host-tier，314.2 万 tokens/58 调用）：四项全落地+TDD 首跑 6F|1P（T7 对照绿=既有通道锁）→7/7 绿；姊妹件 22/22 零回归；变异 M1-M4（cp 备份法）四红还原 diff 空。超票面自裁 5 项全追认——a) 磁盘判定式 join(root,path)（简报原文 join(root,'tests',path) 双前缀恒假=死码——基线键已含 tests/ 前缀，fixture 实证）；b) T4 断言盯「未知键」措辞（既有泛文案 JSON.stringify(e) 含拼错键子串会假绿）；c) root!==undefined 守卫；d) T5 补重写修复断言；e) typecheck TS2532 snap[0]! 修复。

**门一**=k1 PASS（B0/W2/N5）+d1 PASS（B0/W3/N6）异构双席独立。双席同中 W1=「check 侧畸形快照行为未测试锁定」。

**回炉 R1（主控亲执）**：W1 补 T8 帧（畸形快照 fileScope:'true'→不跑 baseline 修复直接 check→exit 0+「检查通过」——锁「check 不读快照」契约）；M-T8 变异（cmdCheck 注入 snapshotCorrupt die(2)）T8 红→还原 grep 零残留→8/8 绿。处置矩阵：k1-W2 销项（snapOk 放行 undefined=正确设计——**裁决部 P1 勘正后依据**=台账 129 条全 matcher 形态 fileScope 键 0 处，undefined 形态必然出现，拒收即全表误判 corrupt；原记「123 matcher+6 FILE」=S3 探针 hits/stale 计数误植）；d1-W2 降 N 维持（judge 模块私有仅两调用点均传 root）；d1-W3 维持备案（快照深校验防御深度止于 file/fileScope——structuredClone 正常路径深校验冗余既有立场）；d1-N1/k1-N5 销项（容器级 !Array.isArray 既有守卫在档，审包摘录未含致误判）；k1-N3 销项（变异映射 M1→①/M2→②/M3→③/M4→④ 四证对四项）。

**门二**=probe 首跑 6/8（两红同根因：locks:check EXIT=1 新测试件 sha 漂移——**主控回炉加 T8 后未即时 locks:apply 自首**，宪法条款疏漏被守卫按设计拦截）→locks:apply 275 重锁→locks:check EXIT=0+verify EXIT=0 终验（189 件/2064 用例）。裁决部 **GO_WITH_CONDITIONS（P0=0）**——独立复算抓两处记录失实（123/6 误植+「cur 205」应为 base 205/cur 206）+独立发现 SCAN_MISSING 与两处「无豁免通道全集」声明互斥（hint 死路指引）。P1 勘正采纳（本档已落）；**P2 办理**=头注 exit code 段+cmdBaseline hardKinds 注释与 die(4) 文案+cmdCheck die(1) hint 三处补 SCAN_MISSING 入无豁免通道集（「先排查抽取器/文件后缀白名单，修因无果再人工裁决删基线显式重跑」）——注释/文案级改动，复审豁免援分级烤验小批逻辑（纯文案 ≤3 文件无逻辑行变更——k1/d1 双席已过逻辑面，本处仅声明面对齐）；P3=教训登记（受锁件锁后编辑→即刻 apply→再进探针，随交接书 §5 回流）。备案 C1-C5：C1 快照 matcher/meta 键类型不验（手编注入才可达，轴一仍拦——首现案例再议）；C2 judge 第三调用点须显式传 root；C3 大小写不敏感平台重命名归类分歧（win32→SCAN_MISSING/linux→FILE_MISSING，首现再议）；C4 k1-N1 第三调用点标签无佐证并入 C2；C5 d1-N-2 存量 stale 仅计数可见（既有设计）。

**基线**=verify EXIT=0（189 件/2064 用例=188+1/2056+8）；指纹门 check 真实仓 EXIT=0（台账 129 零触碰+NEW_FILE 新件 8 用例 delta；cur 205→206 文件面=NEW_FILE 增量、base 205 维持——无再生成欠账，本票新增面全数 delta 绿通道）；locks 274→275（+新测试件）；e2e 免跑（零 src 改动裁量——S3 C3 先例）。

**P2 连带修正（收口期主控亲执）**：P2 hint 文案新增「SCAN_MISSING 无豁免通道」字样自伤 T7 裸子串负锚（`not.toContain('SCAN_MISSING')` 被 hint 误中假红，verify 复跑即拦）——T7 负锚收紧为 `not.toContain('FAIL SCAN_MISSING')`（锁失败 kind 形态而非裸子串，比原锚更强且不受 hint 文案演化影响；负锚精确化属 P2 办理完整性范围内，如实现者自裁 b 同族「文案含关键词撞负锚」防御）。

**证据仓外档**=`E:/zcode_md/synapse-archive/F-TESTREF-S4/`（TDD 首跑+变异 M1-M4/M-T8+probe 矩阵+verify/locks log）。
