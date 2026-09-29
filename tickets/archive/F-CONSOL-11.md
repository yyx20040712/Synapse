# F-CONSOL-11 票面归档（F-GOV-01 机制）

- id: F-CONSOL-11
- file: tests/unit/renderer/theme-boot.test.ts
- area: infra
- owner: strong
- status: done（收口时翻）

## summary 原文（立案五层规约）

P3 断言结构化升级票（F-CONSOL-05 裁决部遗留 P3-1/P3-2 兑现——v80 §2.3 池面裁量立案
2026-09-29）：①P3-1 接缝一负锚属性结构化解析（DOMParser 解析 index.html——head 内
script 以 src 属性值精确绑定锚定 './theme-boot.js'；hasAttribute 逐查
defer/async/nomodule[DOM 属性名小写归一]+type 属性值非 module；data-defer/
data-type=module 假阳性面[F-CONSOL-07 注释在档+k1-N2 全支路面]结构消灭）②P3-2
错误文案锚双轨化（'database is locked' 六处直写收敛单源 fixture const——code 驱
行为轨、message 经 const 驱显示轨）③TB 注释随实装收尾（原 P3-3 勘正已由
F-CONSOL-07 兑现）。断言语义=等强或加强（用例标题不动）。接口层=两测试件+豁免
台账+locks manifest。架构层=[locked-change][test-refactor] 双尾注。生命周期层=
变异红证≥3 支+假阳性绿证 1 支+verify 真值+指纹门 delta 全归因+e2e 免跑[零 src
——U1 C3 先例]。文化层=零新依赖+票号双查重。ADR/INV 触及=无[INV-71 锁面语义
不变仅实现形态升级]。

**立案行勘正注记（裁决部 C4）**：立案行「同驻 head 的 main.tsx module 标签不
误伤」失实——index.html:16 实在 `<body>` 尾。对实现零影响（区分谓词=src 精确
等值+doc.head 查询域双重限定，与 main.tsx 位置无耦合——k1 复审判+裁决部独立
确认）；测试注释已按事实改写。历史立案文本不回改，本注记为准。

## 收口记录（2026-09-29 场，executor TDD+门一双席两轮+回炉 R1 主控亲执+probe+裁决部）

**实现**=ops-executor（session:host-tier——2026-09-19 裁决未绑定形态；446 万
tokens/1122s）。TDD：改前定向 28/28 绿→改后 28/28 绿（theme-boot 8+store-write
20，用例数不变）。自裁 6 条：M-D 双支代一支（票面预期「改 const 值→红」在单源
实现下恒绿——store 逐字透传 e.message[lineage.store.ts:319-322]，D1 绿=单源
接线证+D2 红=断言活性证）/TS2488（tsconfig 无 DOM.Iterable，`[...]` 展开改
`Array.from()`——esbuild 不查类型 tsc 才拦，与 F-ROUTE-01 anchor 同族又一实证）
/theme-boot 豁免条目附 assertionText/断言消息措辞填充/一次管道吃退出码违例当轮
自纠/M-E 可选支已做。

**门一首轮（k1+d1 并行异构）**：k1 FAIL（B-1）+d1 PASS_WITH_CONDITIONS（W-1 同发现）。
- **B-1/W-1（type 负锚尾逃逸）**：新 `not.toBe('module')` 对 `type="module "`
  （尾空白/前缀族）旧正则红新绿——语义净减弱违「等强或加强」承诺；浏览器对该
  值按未知类型不执行脚本=正中 tripwire 要防的静默失效族（比 defer 更重）。
- **k1-W1/d1-N1（豁免台账力学）**：F-CONSOL-05 caseTitle 级宽条目仍在吸收
  theme-boot 案——「收窄」名实不符；5 旧签名仅 1 条精确留档。
- 其余：M-D 双支裁正当（双席同向）/M-C 绿证有效/k1-N9 rider 追认判准成立。

**回炉 R1（主控亲执）**：
- D1：`not.toBe('module')`→`not.toMatch(/module/)`（toLowerCase 后≡/module/i）。
  k1 复审「旧红⊆新红」等强证明（旧正则命中⟹值以 module 开头⟹含子串⟹新断言
  必红）；收紧态（xmodule/前导空白族）全有防护语义支撑。新增 **M-F** 红证：
  `type="module "` 变异→接缝一恰 1 failed 红→还原 diff 空。
- D2：F-CONSOL-05 case 级宽条目退役删除+theme-boot 旧 5 签名逐条补登
  （assertionText 逐字取自 baseline json 原文，含多行断言空格保真）+9 条
  rulingLink 统一 `tickets/registry.ts（F-CONSOL-11 行）`。台账 144→152
  （=−1+5+4 分项）；hits 22=13[ROUTE 存量]+5+4；stale 130=131−1。
  **rulingLink 口径定义（裁决部 C5）**：本票改动（显示轨收编/负锚结构化）所致
  旧签名退役的授权归因=本票 registry 行；上游出处（F-CONSOL-05.md P3 备案）
  保留在 reason 文本。lineage 4 条非本票改动面的条目随批统一同口径（历史授权
  载体从 F-CONSOL-05.md 重定向至本票行——裁决部 N-2 采信申报）。
- D3：注释事实勘误（main.tsx 实在 body 尾）——主控如实申报首轮审包背景失实。
- D4：**M-G** 红证：boot 标签挪 body（src 不变）→接缝一恰 1 failed 红→还原
  diff 空（head 作用域谓词活性——d1-N2 指出 M-E 不能区分作用域与全文档查询，
  此支闭合）。

**门一复审**：k1 PASS（B0W0N4——B-1 闭合+等强性证明）+d1 PASS（B0W0N4——W-1
超集闭合+N1/N2 处置核验；新 d1 席承审，原席会话不可续）。

**门二**：probe 矩阵 7/7 绿（定向 28/28/指纹门 EXIT=0[152/22/130]/locks 276/
全量 verify 真值 EXIT=0[190 件/2082 用例]/树态恰 5 路径/计数八项/e2e 免跑依据
成立）；唯一异常=主控简报口径歧义（lineage 豁免条目增量 4/全量 5——存量 1 条
=T3-P8 面，非缺陷）。裁决部 **GO_WITH_CONDITIONS（P0=0/回炉面 0）**：C1 证据
留档（仓外档 13 件）+C2 v81 中性化归因+C3 分项算式（本档落实）+C4 done summary
禁用失实句（registry 落实）+C5 口径句（本段落实）+C6 rider 物证（仓外档
rider-aac39fa-diff.txt——追认生效）。独立复算全闭合：190=207−17[e2e spec]；
2082=2075+1+6；152=144−1+5+4；22=13+5+4。

**留档族（N 级，入池不本批做）**：importmap 等未知 type 值同盲点（新旧同漏——
增强候选：type 缺省或 JS MIME 白名单正向锁）；隐式 head 理论态（k1-N-R3）；
M-D2 标签语义；d1-N3 type 断言文案分层表述；d1-N4 合法 MIME 绿支读码证明
（无变异绿证）。

**rider（aac39fa 勘正微批追认）**：k1-N9 立「纯机检值文档勘正微批追认须同满足
亲验机检值+后批门审覆盖双条件」判准，本例双条件满足+物证在档→追认生效。

**终态基线**：verify EXIT=0 真值（190 件/2082 用例——用例数与 v80 持平[本票
零用例增删]）；指纹门 check EXIT=0（entries 152/hits 22/stale 130）；locks 276
（sha 滚动同步）；e2e 免跑（零 src——U1 C3 先例）；树态恰 5 路径。

**证据仓外档**=`E:/zcode_md/synapse-archive/F-CONSOL-11/`（13 件：probe 9 log+
回炉 2 log+rider diff+批次日志）。
