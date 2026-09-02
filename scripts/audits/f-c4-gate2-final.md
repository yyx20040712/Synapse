# F-C4 门二终审档 —— F-D4 + F-SL 两票修票二审（2026-09-02）

> 档位申报：派发要求=deepseek v4 flash（docs/methodology.md §4.5）；本环境由主控派发承载、
> 模型非本代理可切换项——如实申报（与两票实现报告同口径）。
> 定位=只读终审位：零源码/测试/受锁面/审计档改动（本档+两份自证 raw 除外）；零 git add/commit。
> 审查对象=工作区未提交态两票：F-D4（scripts/audits/f-d4-brief.md，实现报告 f-d4-impl.report.md）
> + F-SL（f-sl-brief.md，f-sl-impl.report.md）；门一审=f-d4-gate1-kimi.md / f-sl-gate1-kimi.md。

## 〇、开工记录（技能清点——AGENTS 会话开工纪律）

**用**：verification-before-completion（终审核心=机器面亲验真退出码，不轻信转述）；
code-review-excellence（四清单代码审查方法论）。
**不用+理由**：systematic-debugging（非调试任务——审查位无排障面）；test-driven-development
（禁改文件，无新测试面）；git 工作流类（禁 add/commit，git 仅只读 diff/status）；
browser/UI 测试类（无 UI 视觉面，全程无可见浏览器——前台焦点保护纪律）；
其余工程技能与本只读审查任务无关。
配置自查：Volta PATH 前缀注入，node=v24.20.0（quality 版本守卫口径）亲验 ✓。

## 一、处置核对（清单 1——防「说了没改」）

### F-D4 回炉 1（门一 B:0/W:3/N:2 → 处置记录=实现报告 §九）

| 回炉点 | 处置要求（门一） | 实物核对（门二） | 结论 |
| --- | --- | --- | --- |
| W1 filter① 组件级不可证伪 | §七-5 如实改报「无机器锚」或给出真能失败的锚 | §七-5 已改报：filter①=渲染门之外的**内部质量门、无机器锚**（INV-49「部分锚定」同族口径）；用例③价值重述=锁「runImport 重置 sessionRef」面（变异推演机制说明在案，未为锚再动受锁面）。与门一给的两路线之 a 吻合 | **成立** |
| W2 首红 [6/6] 漏报 | 对质 f-d4-red.raw.txt 全量，申报第 6 条目性质 | §三 已补报 [1/6]=文件级条目（Failed Suites 1，EBUSY unlink synapse-ws-d4-JuN9BJ…db-shm，Windows 文件锁族清理噪声，不计入 Tests）+[2/6]~[6/6]=五条用例红。门二亲查 raw：:3673「Failed Suites 1」/:3676 EBUSY 原文/:3677 [1/6]/:3698 [2/6]/:3773 [6/6]/汇总 `Tests 5 failed \| 1096 passed (1101)`——**与补报逐字吻合** | **成立** |
| W3 --stat 旧口径 | 按 add -N 最终态重报并复核删减面结论 | §七-6 已重报 11 files +413/-42 +numstat 逐文件明细。门二算术复验：1+9+19+60+5+17+24+5+92+20+161=**413** ✓、0+5+1+29+0+0+3+2+1+1+0=**42** ✓（该口径=F-D4 收口时点；当前终态因 F-SL 叠加为 15 files +488/-57，两票分账精确对账见 §五）。「删减面零断言删减」门二亲验四个受锁测试 diff：既有断言体零改动，仅追加构造桩行+双参迁移（语义原文保留）；import.service 删行=旧 report/入口体重构（语义超集，M1 变异红证锁定 finally 契约） | **成立** |
| N1 并发计数中间态无锚 | 知晓项（票面未要求） | workspace.test 六处 `importInFlight: () => false` 桩在位（门二亲验 diff）；计数语义（>0 判定）经代码审查成立 | 确认知晓项 |
| N2 时序表第 3 格无新用例 | 知晓项（既有桩隐式覆盖） | 同上——既有全绿=原行为零变旁证 | 确认知晓项 |

**回炉 1 处置核对结论：三点全数落地，报告仅改 f-d4-impl.report.md 一文件、代码/测试/受锁面零改动（与 §九 申明一致——工作区 diff 中 F-D4 面文件与回炉前证据 raw 的哈希链无法逐字节回溯，但两 raw 时点（f-d4-verify 20:30）晚于实现，报告本身为 untracked 无版本对照，此为能力边界如实申报）。**

### F-SL 主控销项复核（门一 B:0/W:2/N:3 → 主控源码销项两处）

**W-1 帧同步（主控销项=SelectionLayer.tsx:85 + :199）——门二复核：销项成立。**
- SelectionLayer.tsx:85 实测：`const { pageRoot, paperId, onSaved } = props`——函数组件 props 每渲染解构；
- :199 实测：`async function save(kind)` 为组件体内**普通函数声明**（非 useCallback、无 latest-ref/ref 中转）；
- 推演链：帧 N（paperId=A）触发 save → 闭包绑定帧 N 的 paperId=A 与 onSaved；await（:211
  saveAnnotation）期间切 tab → ReaderPage 渲染帧 N+1（onSaved=(a)=>addAnnotation(B,a)）——但
  in-flight 调用仍持帧 N 闭包 → await 返回后 :212 `onSaved(saved)`=addAnnotation(A, saved) → 落 A
  tab、B 零污染；:214 pushUndo(paperId=A) 与 :216 clearTabDirty(A) 同帧同源。
- 结论：门一 W-1 的担忧形态（latest-ref 模式会破修复）在本源码中**不存在**，主控销项证据链充分。

**W-2 undo 栈（主控裁=无害残余登记不回炉）——门二复核：支持该裁定。**
- reader.store.ts:242 实测：closeOne 内 `clearStack(id)`（注释「撤销栈随 tab 关闭丢弃（UNDO-01 接缝）」）；
- annotation-undo.ts:31 实测（头注状态机表）：「closeTab/clearStack：任意态→empty（栈随 tab 丢弃）」；
- 孤儿机制亲验：annotation-undo.ts:90-96 pushUndo 遇 `stacks[paperId]` 缺席会**重建**——save await
  窗内关 tab A → clearStack(A) → 迟到 :14 pushUndo(A, create) 确实产生孤儿条目（门一推演非虚）；
- 无害性四论证：①per-paper 隔离（不污染他 tab）；②孤儿条目 undo=create 逆=delete 一条**真实存在于
  DB 的标注**（撤销其保存动作，语义自洽）；③apply remove 与 api 删除同步（无内存/DB 失一致）；
  ④修复前同场景更坏（错 tab 追加=永久幽灵标注）。概率窗=save 毫秒窗内关 tab+重开同 tab+ctrl+z 三层。
- 备查一项（如实申报）：「登记」若指入册 invariants——INV-03 扩写段（门二亲验 invariants.md diff）
  仅含写方向条款，**未见 undo 孤儿残余明示文字**；若主控「登记」意为审计档知晓项（门一 W-2 条目
  本身+本档复验），则已在案。不构成回炉条件，建议收口单一句话定夺其落点。

**F-SL 门一 3N 核对**：N-1（grep 回执缺失）——门二独立 grep tests/ 全量：onSaved 仅现于
selection-layer/selection-paint 测试（vi.fn() 桩，不感知 store 签名），票面「预期无」**旁证成立**；
N-2（行号漂移 1-3 行，报告层）；N-3（INV-52 混入 --stat 计数，报告已披露+门二 numstat 分账证实其
披露准确）。三 N 均报告层瑕疵，不涉实现正确性。

## 二、母本符合度（清单 2）

### F-D4：票面五层规约 vs 终态 diff（时序表六格逐格）

| 格 | 票面预期 | 实现+锚 | 门二核验 |
| --- | --- | --- | --- |
| ①in-flight×switch | CONFLICT，库零副作用 | workspace.service.ts switch：busy 检查后 `if (deps.importInFlight()) throw wsImportInFlight()`，**先于** closeCurrent；新用例锚 `rejects.toThrow(/导入进行中/)`+`closeCalls()===0`+`assembledDirs()===[]`（workspace.test diff 亲验） | ✓ |
| ②in-flight×create/rename | 同上 | create/rename 同构三行（diff 亲验：create:164-165/rename:179-180/switch:198-199 区），同用例覆盖三入口 | ✓ |
| ③exit 后×switch | 放行，原行为零变 | gate.exit 后计数=0 → importInFlight()=false；六处 `()=>false` 桩既有用例全绿兜底（N2 口径） | ✓ |
| ④reload 后旧事件（busy=false） | 忽略，state 不写 | ImportDropZone 订阅回调首行 `if (!busyRef.current) return`（diff 亲验）；锚定面=回炉 W1 已如实改报「部分锚定」（组件级不可证伪——门一裁决+门二认可：runImport 入口无条件重置 sessionRef 使深断言恒绿） | ✓（部分锚定口径） |
| ⑤新会话 busy 中旧 sessionId | 异身份滤 | `sessionRef.current===null→锚定 / ≠e.sessionId→return`（diff 亲验）；用例②「异 sessionId→文案不变」+M2 变异红证（删过滤→污染用例红） | ✓ |
| ⑥新会话 busy 中本会话 | 写（原行为） | 用例①「本会话事件→文案更新」 | ✓ |

五层其余：接口层（gate/importInFlight/ServiceDeps.importGate 三必选+bootstrap 两处注入——diff 亲验
bootstrap 顶层 `importInFlightCount`/`importGate` 在容器 assemble 闭包之外）✓；架构层（gate 禁入
shared——schemas.ts diff 仅 sessionId 字段；两服务 duck-typing 互不 import）✓；生命周期层（测试锚
全数落地，e2e 零改——diff 无 e2e 文件）✓；文化层（两服务头注+ImportDropZone 头注残余窗声明
corpus 同口径+INV-52 登记一行格式照 INV-50/51——invariants diff 亲验）✓。

### F-SL：票面五层规约 vs 终态 diff（行为层三条）

1. **per-paperId 寻址不读 activeId**：reader.store.ts 实现体 `const tab = tabs[paperId]; if (tab ===
   undefined) return; set({...})`——实现体全文无 activeId 引用（diff 亲验）；接口 :154+JSDoc 同步 ✓
2. **tab 缺席 no-op**：`if (tab === undefined) return`+边界注释（「DB 已落，重开自 DB 读对齐——undo
   同语义」，照 undo :458 口径）✓；用例②前置防恒真断言（`tabs['p-1']).toBeUndefined()`）在位 ✓
3. **接线闭包同帧捕获**：ReaderPage.tsx 接线 `onSaved={(a) => addAnnotation(paperId, a)}`+注释（与
   props.paperId 同源同帧）✓；用例①前置防恒真断言（`activeId).toBe('p-2')`）在位 ✓
   - SelectionLayer props 契约零改（SelectionLayer.tsx 不在改动面）✓；update/remove 未动 ✓；
     undo 栈/clearTabDirty 仍按 props.paperId（SelectionLayer :214/:216 亲验未触碰）✓

其余层：接口层（:91/:114/:65/:70 四处调用迁移+注释「SelectionLayer→addAnnotation 路径」原文保留——
diff 亲验）✓；架构层（只动 reader 域两文件+受锁测试，旧单参形态不留——tsc 调用面清零由 typecheck
关卡背书）✓；文化层（头注 :49 setter 列表同步+INV-03 扩写「写方向同族」条款格式照 per-tab 变体段，
先例列/锁定列同步——invariants diff 亲验）✓。

## 三、宪法红线终审（清单 3）

| 红线 | 门二核验 | 结论 |
| --- | --- | --- |
| 分层单向 | gate=main 根装配细节禁入 shared（schemas diff 仅 sessionId）；ipc→services→repos→db 无跨层（import/workspace 服务仅增 deps 字段）；renderer→window.api→ipc（ImportDropZone 仅 import api/client+shared 类型） | ✓ |
| 安全禁令 | 改动面 grep 零 nodeIntegration/webSecurity/sandbox/eval/openExternal/SQL 拼接新增面；CSP/白名单未触碰 | ✓ |
| 受锁流程 | F-D4：unlock 235→改（schemas/两测试/invariants）→generate（新路径 dropzone 测试）→apply 236；F-SL：unlock→改（两测试+INV-03）→apply 237（机械登记 F-D4 残留 f-d4-gen-gate1-brief.mjs——处置权移交主控在案）；manifest 实测 237 条（数组结构逐条核对：f-d4-gen 已登记+dropzone 测试已登记）与派发预期吻合。**当前工作区 locks:check 红（见 §四）** | ✓流程/△现状 |
| 文件行数 | 全部 ≤500：bootstrap 261/import.service 315/workspace.service 217/services.index 152/ImportDropZone 166/reader.store 483/schemas 435/dropzone 测试 161/workspace.test 472/import.service.test 264；组件 ≤250：ReaderPage 228 ✓；reader.store.test 511=tests/** eslint override 豁免（在档+报告申报） | ✓ |
| UTF-8 中文 | quality 关「无乱码」绿（门二亲跑）；中文注释头注全部可读（diff 亲验） | ✓ |
| 新测试 always-active | F-D4 dropzone describe+import.service F-D4 describe+F-SL describe 头注均明示「always-active 不经 guardedDescribe」（三处 diff 亲验——K3 纪律） | ✓ |
| 禁 TODO/FIXME/placeholder | 改动 13 文件 grep 零命中（门二亲跑 exit=1=无匹配）；quality 关同口径绿 | ✓ |
| 无新依赖 | git diff 无 package.json/lockfile（15 文件清单核对） | ✓ |

## 四、机器面核对（清单 4——亲跑，不轻信转述）

- **`npm run verify` 亲跑：exit=1**（f-c4-gate2-verify.raw.txt）。前段 quality 绿（无占位/无乱码/无
  跨域）+tickets 绿（119 工单注册表一致）；**locks:check 红**：`新增受锁文件未登记：
  scripts/audits/f-sl-gen-gate1-brief.mjs`；lint/typecheck/test/build 被链式阻断。
- **尾链分段亲跑（lint+typecheck+test+build）：exit=0**（f-c4-gate2-verify-tail.raw.txt）——
  `Test Files 127 passed (127)`、`Tests 1103 passed (1103)`、三段 built ✓、尾部 `exit=0`。
- **locks:check 单独复跑：红同因**（同一未登记文件）。
- **数理一致**：127 测试文件/1103 用例 ✓（F-D4 +8=import.service 3+workspace 1+dropzone 4——门二
  亲验各 diff 用例计数；F-SL +2——亲验两新用例）；manifest 237 条 ✓ 与派发单预期（237 含
  f-d4-gen-gate1-brief.mjs）吻合；f-d4-verify.raw.txt（236/1101/exit=0）与 f-sl-verify.raw.txt
  （237/1103/exit=0）各时点自洽——**两票实现者的 verify 绿申报在其时点均真实**。
- **红项根因（门二定性）**：f-sl-gen-gate1-brief.mjs（F-SL 门一材料生成器）诞生于 20:47，晚于 F-SL
  locks:apply 的 manifest generatedAt 20:43:36 与其 verify——属**门一材料生成器时序摩擦第三次发生**
  （check-locks.mjs:41 将 scripts/**/*.mjs|ps1 全量纳入受锁 pattern：①f-d4-gen 20:34 诞生→F-SL 开工
  红→F-SL apply 吸收至 237；②f-sl-gen 20:47 诞生→本门二开工红）。非两票实现缺陷，但 DoD
  「verify 全绿」在当前工作区不成立——收口单必须处置（见终判条件）。

## 五、改动面全量核对（清单 5）

`git diff HEAD --stat`=**15 files changed, +488/-57**（另 untracked 全部位于 scripts/audits/ 审计档
口径内，符合派发单豁免声明）。两票分账（numstat 亲测逐文件对账）：

- F-D4 面 11 文件 +413/-42（其收口时点口径，算术复验吻合，见 §一 W3）；
- F-SL 面 reader 域 4 文件 +68/-12（reader.store 19/6+ReaderPage 4/2+reader.store.test 43/2+
  undo-race 2/2——与 F-SL 报告「70/13 含 invariants 计数」分账一致：68+2 插入=70、12+1 删除=13）；
- 共享文件叠加：invariants +2/-1（INV-52 新行 +1/0 + INV-03 单行替换 +1/-1）；manifest +15/-7
  （F-D4 时点 +9/-5 + F-SL apply 增量 +6/-2：3 受锁哈希变化+1 新条目+排序位移）。
- 合并对账：插入 413+68+1+6=**488** ✓；删除 42+12+1+2=**57** ✓。**票外蔓延=零**。

## 六、结构性发现（移交主控，非两票缺陷）

门一材料生成器 .mjs 落 scripts/audits 即入受锁 pattern、且诞生晚于上一票 apply——已三现
（f-d4-gen→f-sl-gen→本次），每现即打红下一关 verify 的 locks:check。此模式与宪法「同类缺陷二次
触发即重构」条款相抵（已超二次）。收口处置建议二选一（主控权限）：甲=收口时统一 locks:apply
登记至 238 随 [locked-change] 提交（最小动作，摩擦延续至下一波场）；乙=将 gen-gate1-brief 类生成器
移出受锁 pattern（如迁至 scripts/audits/ 之外的临时目录或 check-locks pattern 收窄为
scripts/*.mjs 顶层）——结构性根治，需动受锁的 check-locks.mjs（[locked-change]+走 unlock/apply）。

## 总评与终判

两票实现面与票面五层规约逐格符合、时序表六格/行为层三条全数落地；回炉与销项处置全部实物兑现
（W1/W2/W3 三点+两处源码销项均经门二独立复核成立）；宪法红线八项全过；两票各自时点 verify 绿
真实（raw 证据链自洽）；改动面零蔓延、数理账目逐笔对平。

唯一未闭合项=当前工作区 locks:check 红——根因是门一材料生成器时序摩擦（非两票面），但 DoD
「verify 全绿」在此刻不成立，收口不可直接放行。

**终判：条件 PASS**。放行收口的前提条件（主控收口单执行）：

1. 处置 f-sl-gen-gate1-brief.mjs locks 残留（§六甲/乙二选一；乙为根治建议）；
2. 处置后亲跑 `npm run verify` 全链真退出码 0 取证落盘（门二分段证据=lint/typecheck/test/build
   已绿 +quality/tickets 已绿，locks 关为唯一缺口）；
3. 提交含 [locked-change] 尾注（覆盖 schemas.ts/两票受锁测试/invariants.md/manifest.json 及受锁
   的 check-locks.mjs 若走 §六乙）；触碰受锁面即时 locks:apply（manifest 与提交同步）；
4. 建议（非阻断）：W-2 无害残余的登记落点一句话定夺（invariants 补行或审计档知晓项口径——
   门二复核支持「无害」结论，见 §一）。

门二证据档（本档产出）：scripts/audits/f-c4-gate2-verify.raw.txt（verify 亲跑 exit=1 实录）/
f-c4-gate2-verify-tail.raw.txt（尾链分段 exit=0 实录）。
