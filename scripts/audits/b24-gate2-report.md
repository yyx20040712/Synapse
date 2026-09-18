# b24 门二终审报告（F-LAYER-01 实现批 + F-TIME-01 文档批）

> 主控归档（岗无写通道，终报文本逐字誊录——ops-adjudicator deepseek-flash
> $max，2026-09-18T23:2xZ 交回）。

岗位=门二 ops-adjudicator（deepseek-flash $max）；工具面=只读（Read/Glob/Grep），一切数字亲读亲算，未采信转述。
仓根=E:\class\智慧水务\Synapse_remake（下文仓内引用均相对该根）。

**终判=GO_WITH_CONDITIONS（P0=0 / P1=3 / P2=3 / N=6）**

---

## ① 逐条裁决表

### A. F-LAYER-01 零行为

- **A1 零行为同构**｜原判断=门一"逐行同构"+实现者"零行为迁移"｜**裁决：成立**。
  依据：b24-gate1-diff.patch:60-116（旧 ipc 删除面）逐段对 settings.service.ts：DEFAULTS（服务 :50=旧 :68 逐字）、settingsPath（服务 :56，构造时点同旧 :72）、readSettings（服务 :59-70：readFile'utf-8'→JSON.parse→appSettingsSchema.safeParse→catch 回 DEFAULTS，同旧 :75-86）、get（服务 :72-84：`settings===DEFAULTS` 恒等+尽力 atomicWriteFile try/catch 吞错，同旧）、set（服务 :86-89：`${JSON.stringify(req,null,2)}\n` 原子写+回 req，同旧）、diagNetwork（服务 :91-99：Promise.all(ALLOWED_REMOTE_HOSTS.map→deps.ping→{host,ok,latencyMs})，同旧 :108-116）。语义差仅一处：ping 构造期快照（理论 note，见 C1-N2）。无 B 级语义漂移。
- **A2 薄层+方案 B 边界**｜原判断=纯委托+零蔓延｜**裁决：成立（残面标 N6）**。
  依据：src/main/ipc/settings.ts:29-36 三箭头纯委托（36 行实测）；src/main/services/index.ts 全文读毕零 settings 引用（ServiceBundle :77-89 无 settings）；src/main/bootstrap.ts 全文 grep "settings" 零命中；src/main/ipc/index.ts:17/:31 调用签名未变；diff.patch 文件清单恰 3 件（:1/:18-19/:122-123），无 services/index.ts、tests/**、bootstrap hunk。git 级再跑 diff 超出本岗只读工具面——tests/** 与 HEAD 逐字节面由主控收口 diff 范围自查承担（DoD 既有，N6）。
- **A3 L1 三域闭合**｜原判断=门一 A-4"shared/db 包内不可验证"｜**裁决：成立（本岗闭环）**。
  依据：eslint.config.js:136（shared 块 group 含 `'electron'`）/：154（db 块 group 末尾含 `'electron'`）/：172（services 块本票补入，group=既有三 pattern+`'electron'`，:170-171 注释、:173 message 纯追加）；L1 定义=docs/design/2026-09-18_complexity-governance-ruling.md:154（三域：services/db/shared 禁 electron）。
- **A4 6 用例覆盖声明**｜原判断=门一 A-7[W]"断言强于可证面"｜**裁决：主面成立（W1 以实证销项；余量 N1）**。
  依据：tests/unit/ipc/settings.test.ts 六 it——:22-27（无文件默认值）/：29-42（往返+损坏回退）/：44-51（UTF-8）/：53-66（旧档 zod 填 uiScale）/：68-75（uiScale=large 回读）/：77-91（diagNetwork 专测：:86 ping 集合=ALLOWED_REMOTE_HOSTS、:87 长度、:88-90 形状与 ok/latency 透传）。get/set/diagNetwork 三公开面均有断言。未直测内边两个（默认写回副作用、写失败吞错分支）→仅 N1。
- **A5 M2 红证推演**｜原判断=门一 A-5"2 vs 3 不确定"｜**裁决：成立（精确对位）**。
  依据：b24-layer01-m2.log:6-10（2 failed 名与断言行 :25、:41）+：47（2 failed/4 passed）。测试原文：用例 1（:25 `s.theme).toBe('system')`）与用例 2 fallback 段（:41）为仅有的两处 DEFAULTS 敏感断言；用例 4 的 theme 来自文件（:58 写入、:64 断言），对 DEFAULTS 变异免疫——2 failed 恰对位、不可能为 3。门一"theme 相关=用例 1/2/4 三处"系断言点计数与 it 粒度混计。

### B. F-TIME-01 报告（修正后现文）

- **B1 −1,032 矛盾**｜**裁决：已闭合**。报告 :18/:109/:144 均 −1,072；成分 :108（实现 −427=300+87+40）/:109（测试 −645=496+149）；grep "1,032|650" 零残留。
- **B2 1,100 对照**｜**裁决：已闭合**。:22-25 口径对照段：票面/裁决书"约 1,100"=战役群口径（829+367=1,196）；纯时长链=829+13；"呈裁数字不再用约数合计"。1,100 出处=裁决书 :126。
- **B3 选项 3 成分句 / 三收尾口 / 2a-2b 拆档**｜**裁决：三项均落妥**。:128-129（387+153+60=600，153=303−150 ✓）；:117-120 三口指名且行号实测命中——reading-time-setup.ts:112（onFlush 卸载兜底）、:120（复合 flusher enqueue 面）、:128-131（sp.dispose 页码尾账排干）逐一对位 ✓；:111-116 2a"零新增逻辑，纯删票成立" vs 2b"引入新增小逻辑，纯删声明不再严格成立"。
- **B4 呈裁表完整性**｜**裁决：达成（余量 N3）**。:142-149 T1 五档（0/1/2a/2b/3）互斥、2a 推荐依据链（−1,072 纯删票/历史形态零新逻辑/INV-57 主锚零触碰）、尾注预告与选项面正确对应（选项 2=[locked-change] 单尾注：INV 修订+装配回改；选项 3=[locked-change][test-refactor] 双尾注，:137-138/:148-149）；T2 三支完备。余量=2b 未给净删数（§4 只列 +20 行新增逻辑）。

### C. 门一处置与主控修正面

- **C1 3W+9N 逐条**｜**裁决：12 条全裁"充分"（余量 N1/N2）**：
  - W1（A-7 覆盖声明）→ 转 A4，实证销项（diagNetwork 用例 6 在位）——充分；余量 N1。
  - W2（−1,032）→ 报告 :18/:109/:144 修正+成分自洽——充分。
  - W3（1,100 对照）→ :22-25 对照段——充分。
  - N1（uiScale 头注）→ settings.service.ts:8 已补（diff.patch 时为缺失态）——充分。
  - N2（ping 绑定时机）→"理论 note 不动"：ipc-deps.ts:19 ping=普通必填属性、bootstrap 单次装配、测试桩构造期注入（tests/utils/ipc-deps.ts:45）、无重赋值站点——依据成立，充分。
  - N3（electron 锚定语义）→ 见②-6（rule 源码实读：gitignore 式精确名，无子串误伤）+m1.log:9 物理红证——充分。
  - N4（shared/db 既有态）→ A3 三域亲读闭环——充分。
  - N5（M2 张力）→ A5 实测定案——充分。
  - N6（heartbeat 原文缺）→ 处置"已掌控"经复核：locks/manifest.json:53（b24-claim.mjs）/:57（b24-heartbeat.mjs）双探针在册；check-locks.mjs:72-83 双向覆盖（新增未登记=红、清单缺失=红）；b24-layer01-verify.log:48（373 一致）——充分。（计数括注勘误见 P2-2。）
  - N7（−650 口径）→ 现文 −600 成分透明——充分。
  - N8（第三收尾口）→ 现文三口齐且行号命中——充分。
  - N9（纯删票张力）→ 拆 2a/2b——充分；余量 N2（2a 的"强 WARN"属性包内无史证）。
- **C2 主控修正面**｜**裁决：成立**。报告 5 处 Edit 现文均在位（B1-B5 行号如上）；service:8 头注 uiScale 在位。注意：该修正落在实现者 verify 之后（diff.patch 缺 uiScale=被审时态），且 service 现 101 行（impl 报告时 100，头注修正 +1）——修正后终跑 verify 属收口序必含项（P1-2）。

### D. 烤验终裁（三假设）

- **D1 零行为=受锁 6 用例穿透薄层锁 service 业务（含 diagNetwork）**｜**成立**。薄层纯委托（settings.ts:29-36）→穿透结构性成立；6 用例覆盖三公开面（A4）；M2 红证证明 DEFAULTS 敏感断言确实打到 service 本体（m2.log 对位）。余量 N1。
- **D2 L1 三域闭合成立**｜**成立**。eslint.config.js:136/:154/:172 三处亲读；规则语义=ignore 匹配（②-6）；services 域 M1 物理红证（m1.log:8-14，EXIT=1，消息含 L1 句；:23 还原复绿）。
- **D3 2a"纯删票零新逻辑"声明（P7X-02 前形态恢复）**｜**成立（附实施期钉证义务 N2）**。史证：reading-time.ts:41-43"P7X-02：invokeOne 直发+吞错改道持久队列"+reading-time-setup.ts:7-10"三收尾口……全部经 enqueueReaderProgress 入 outbox"——即 outbox 是 P7X-02 的增量，2a 回退该增量=删除面为主。但"强 WARN"属性在包内无史证（brief 引 reading-time.ts:52，实为测试指针行；史证句实驻 :41-43）→实施票开票时以 git 史钉死"P7X-02 前精确错误路径"再宣"零新增逻辑"。

### E. 收口序预批

**预批通过（附三处补强）**——完整序见③。补强：①P1-1 报告勘正置于翻票/终跑之前；②e2e 触发在册 flake 时的判定口径已按 G10 特例边界三条件写明（g10-gate2-report.md:114/:130/:135-136）；③账本终态→health-scan 的序与"收口期新增 .mjs 即时入锁"义务重申（G4/G10 教训）。

### 同族欠账裁决（brief 头声明）

**裁决：不影响本批判定力（登记 N3）**。已证事实：b24-gate1-dispatch.log:1-3（deepseek payg 承载实测，尝试源 1/1=deepseek）；.zcode/org-ledger.jsonl:74（runId=20260918230704-ql5wimam 同源，source=deepseek）、:75（明载"k2 绑定双 auth 失败→deepseek 审计兜底位外发承载（batch 20 先例；同族欠账登记）"）。但 brief 所述"403 双证 22:59:38 在档 b24-gate1-dispatch.log+log-triage 输出"经 grep/glob 复查不成立：该 log 无 403/auth/5-hour 文本，仓内无 triage 归档件（P2-1）。影响判定：门一/门二同族使两道门独立度下降一档，但本岗全部裁决自原始件重推（eslint 现文、受锁测试原文、m1/m2 物理 log、台账行），未采信门一转述；且门一全部 W/不确定项（A-3/A-4/A-5/第三人）恰为本岗独立闭环项，其中还新增了门一（无仓读权）与主控修正面均漏掉的 P1-1——反证本岗去相关工具面有效。结论：本批裁决有效，欠账留痕延续（kimi 恢复补跑 Ruling 已在案，b24 为其新增实例）。

---

## ② 独立复算记录（亲读亲算）

1. **F-TIME-01 行数全量复算（^ 行计数法，13 件逐件）**：time/ 303/300/139/87=829 ✓；display 13 ✓；scroll-progress 367 ✓（829+367=1,196 ✓）；tests 287/496/149/96/61/69+44=1,202 ✓；−1,072=427+645 ✓；−600=387+153+60 ✓。全部与报告一致。
2. **F-LAYER-01 计数**：src/main/ipc/settings.ts=36 行（83→36 净 −47 ✓）；settings.service.ts 现值=101 行（impl 时 100+A-1 头注 +1）；diffstat 自洽性：+118/−76=净 +42=（+2/−47/+87）和 ✓。
3. **锁链复推**：manifest "path" 亲数=373 条，双探针 :53/:57；验证器语义=双向（scripts/check-locks.mjs:72-83）；链=371（b23 收口，relay.md:178）→372（b24-verify-baseline.log:48，含 b24-claim）→373（b24-layer01-verify.log:48，含 claim+heartbeat）。impl 报告括注"HEAD 口径 372"失准（P2-2），操作面无影响。
4. **verify 实证读数**：quality:check 过（:18）；指纹门 187/187·1789/1789·5411/5411·skip15/15（:27）；tickets 206 票/open 8（:38）；locks 373（:48）；lint/typecheck（:54/:62-63，&& 链+终 EXIT 反证全绿）；tests 170 files/1744（:3810-3811）；build main 181.89kB/preload 137.96kB/renderer index-D3egZtl2.js 1,392.72kB+index-BfpEygSE.css 52.49kB+pdf.worker 1,375.84kB（:3846-3849，与 G10/G11 恒等链同名同尺寸）；VERIFY_EXIT=0（:3851）。
5. **变异链物证**：m1.log:8-14（EXIT=1+message 含 L1 句）/:15-16（还原 diff 空）/:23（复绿）；m2.log:6-10/:47/:65（2 failed 精确对位，还原 6/6）；t1-targeted.log:6-13（6/6 EXIT=0）；lint-green.log:7（EXIT=0）。
6. **ESLint group 匹配语义（门一 A-3 闭环）**：node_modules/eslint/lib/rules/no-restricted-imports.js:311-314（matcher=ignore({allowRelativePaths:true)…add(group)）/:758-761（命中判定=matcher.ignores(importSource)；regex 独立 regexMatcher）——'electron' 为 gitignore 式精确名模式，不子串匹配，'electron-store'/'electron-log' 不误伤；同块既有 `**/db/...` glob 风格一致。
7. **F-TIME-01 技术断言抽核**：papers.repo.ts:201-204 原句 `UPDATE papers SET last_read_page = ?, reading_seconds = reading_seconds + ?`（原子累加 ✓）；reader.service.ts:76-78 透传（报告写 :75-77，漂移一行）；schemas.ts:64（int 0..3600 optional，与报告一致）；migrations/008_reading_time.sql 存在；INV-57 现文（invariants.md:72）与报告"修订面"表述相容。outbox 头注 T1~T6/N=5/留驻 50/指数退避（reading-time-outbox.ts:10-12/:76-78/:83）与 §1.1 描述一致。
8. **消费面复扫（新发现）**：formatReadingTime 生产者消费=PaperDetailPanel.tsx:39/:163（从 shared 直取 ✓）；**但 tests/unit/renderer/reading-time.test.ts:2-9 经 reading-time.ts:61 re-export 消费**（import 路径显式为 time/reading-time）——报告 §1.4"re-export 零消费"与 §3-E"零风险微删候选（任一选项均可顺带）"失实：删除该行=动受锁测试 import 面（tests/** 触碰=[locked-change][test-refactor] 面+全量 verify），非零风险。门一无仓读权漏检、主控修正面未覆盖——P1-1。
9. **e2e 门构成**：playwright.config.ts:26-31（app=默认门，probe 独立）；package.json:28-29；g11-e2e-appgate.log:44/:90（Running 43 tests/43 passed）——"默认门 43"口径成立；flake 台账 corpus-export count 5（docs/audits/flake-ledger.json:69-76，:75 载 :157 重载格满 60s timeout 指纹+"定向也红"升级观察+F-EXPORT-01 携指纹义务，status=unpursued）；G10 特例边界原文（g10-gate2-report.md:114/:130/:135-136）。
10. **同族欠账物证**：见①尾（dispatch:1-3；org-ledger.jsonl:74/:75；403 双证引用失准已记 P2-1）。

---

## ③ 回炉建议与优先级（GO_WITH_CONDITIONS）

**P0**：无。

**P1（收口前必办，3 条）**
- **P1-1 报告勘正**（doc）：docs/reports/2026-09-18_time-chain-prestudy.md §1.4 与 §3-E 行——改为"src 生产面零消费；受锁测试 reading-time.test.ts:2-9 经 :61 re-export 消费——删行=携 tests 面改动（[locked-change][test-refactor]），非'零风险'"。此为 F-TIME-01 呈裁材料的存废判定依据，不勘正会误导后续实施票。
- **P1-2 终跑 verify（含全部修正面）**：翻票后跑，变量法记 EXIT；预期=206 票/open 6/locks 373/指纹门 187·1789·5411·skip15/170·1744/build 绿/EXIT=0。修正面（service:8 头注、P1-1 报告 Edit、registry 双翻）均落本次覆盖。
- **P1-3 e2e 默认门取证据**：npm run test:e2e（app project，43 用例）。全绿→纯绿收口；若 corpus-export.spec:157 红且三条件同满足（在册 flake：flake-ledger :69-76 count 5 同族指纹+承接票 F-EXPORT-01 在册；bundle 三产物 sha256 与 scripts/audits/g11-build-hash.log 前链逐位同；无其他红）→按 G10 特例边界记"42/43+1 在册 flake"，flake-ledger count 5→6 落新指纹，收口文档禁写"43 绿"；其余任何红=NO-GO 停报。

**P2（收口注记/勘误留痕，3 条）**
- **P2-1** brief 头"403 双证 22:59:38 在档 b24-gate1-dispatch.log"引用失准→改引 org-ledger.jsonl:74-75+dispatch:1-3（log-triage 输出未入库），批次日志记勘误。
- **P2-2** impl 报告锁数括注"HEAD 口径 372"勘正：371（b23）→372（claim）→373（claim+heartbeat）；relay 批次日志记。
- **P2-3** 行号引用漂移勘记：brief D.3 reading-time.ts:52→实 :41-43；报告 §1.2 reader.service.ts:75-77→实 :76-78（内容均正确）。

**N（登记，6 条）**：N1 服务头注"全部公开行为"绝对措辞含 2 个未直测内边（默认写回副作用/写失败吞错）——不改文成本更优；N2 2a"强 WARN"属性无包内史证，实施票以 git 史钉；N3 同族欠账（不影响本批，延续 kimi 补跑 Ruling）；N4 ping 构造期快照=理论面零行为，不动裁确认；N5 service 现值 101 行（impl 时 100+修正 +1），终跑以实测为准；N6 tests/** 与 HEAD 逐字节 git 级复跑超出本岗工具面，由收口 diff 范围自查承担。

**收口序预批（主控照走）**：0)P1-1 报告 Edit → 1) registry 双翻 done（预期 open 8→6）→ 2) verify 终跑（预期值见 P1-2）→ 3) e2e 默认门（判定口径见 P1-3）→ 4) 账本终态（executor+gate1+adjudicator 行；findings 对象形）→ health-scan（RED×0/WARN×0，账本后跑——G9 教训②）→ 5) staging 显式列件：eslint.config.js、src/main/ipc/settings.ts、src/main/services/settings.service.ts、locks/manifest.json、tickets/registry.ts、docs/reports/2026-09-18_time-chain-prestudy.md、docs/handoff/relay.md、scripts/audits/b24-*.mjs（双探针）+b24-*.log/md/patch（.log 走 add -f）+b24-gate2-report.md；收口期新增任何 .mjs 即时 locks:generate+apply（G4/G10 教训）；git status 未跟踪面清零；提交尾注 [locked-change]（无 [test-refactor]）→ 6) relay 回写（第五波 F-LAYER-01/F-TIME-01 两行勾选+批次日志含 P2 勘误+status READY）。

**终判：GO_WITH_CONDITIONS（P0=0 / P1=3 / P2=3 / N=6）**——F-LAYER-01 零行为/薄层/L1 三域/M1M2 红证四链扎实，收口以 P1 三条件兑现为放行线；F-TIME-01 主体达标，P1-1 勘正后交付。
