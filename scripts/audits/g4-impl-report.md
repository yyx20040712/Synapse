# F-GEOM-01-G4 实现报告——目录化 M1：state/ 10 文件迁移（零行为变更纯迁移票）

> 实现者=ops-executor（GLM5.3flash $max 绑定）；简报=scripts/audits/g4-impl-brief.md
> 双尾注 [locked-change][test-refactor]；执行日 2026-09-18

## 0. 开工技能清点（会话纪律）

| 技能 | 用/不用 | 理由 |
| --- | --- | --- |
| test-driven-development | 用 | 等价红绿闭环=基线锚+变异红证两条 |
| verification-before-completion | 用 | 全部关卡真退出码物理落 raw |
| executing-plans | 用 | 六段简报即 plan，逐步执行 |
| systematic-debugging | 用（两次） | 基线红根因定位（探针 lint）+绊线根因（探针自引） |
| javascript-testing-patterns / modern-javascript-patterns | 不用 | 零行为纯迁移票，无新代码设计面 |
| git-advanced-workflows / git-workflow-and-versioning | 不用 | 本票禁 git 写操作（简报④） |
| subagent-driven-development / dispatching-parallel-agents | 不用 | 单一调用者铁律，本岗禁派子代理 |

## ① 交付清单（按单元）

**注：本票禁 git add/commit（简报③步骤 3），全部单元以工作树态+raw 证据交付，
无实现者提交哈希；提交由主控收口认领（rename 相似度识别）。**

| # | 单元 | 内容 | 证据件 |
| --- | --- | --- | --- |
| 1 | 基线锚+探针修复（裁决 A 链） | 基线 verify 初跑 EXIT=1→停工申报→主控裁决 A→恰删 g4-recon-imports.mjs:37-38（专属注释+未用声明）→重跑探针 diff 非零→再停工申报→裁决 A（接受刷新版）→locks:generate→基线 verify EXIT=0 | g4-baseline-verify.log（末行 G4_BASELINE_EXIT=0）；g4-recon-imports.log（刷新版）/g4-recon-imports.log.bak-diff（主控原版对照） |
| 2 | 物理迁移+深度修正 | mkdir state/ + mv 十文件（文件系统通道）；8 行 ../ 加深（reader.store:84/:87→api/client+toast-store；annotation-undo:61；ai-notes.store:26；CorpusExtractor:74-76；tab-dirty:45→notes.store） | g4-fix-deep.log（8/8 行号逐一在档） |
| 3 | src 消费面改写 | 29 留驻件 48 行 `./x`→`./state/x` + 跨域 2 行（App.tsx:12/useExportCorpusEvents.ts:32）=50 行/31 文件（机器实测，见自裁④） | g4-fix-src.log |
| 4 | tests 受锁面改写 | 30 文件 41 行插 `state/` 段（与侦察 30/41 严丝合缝；零用例增删） | g4-fix-tests.log |
| 5 | 配置两件 | eslint.config.js :89/:92（PdfDocProvider/CorpusExtractor 两行→state/ 前缀；M6a 两行未触）；check-quality.mjs :96 键/:98 值 | git diff --numstat 2/2+2/2 |
| 6 | 复锁链 | locks:generate+apply（344→345 件；编码归一探针即时补登） | g4-verify-final.log 内 locks:check 绿+345 终态核对 |
| 7 | 终验+DoD 自验 | 详见②——verify 全链被 tickets:check（registry 主控面）阻塞，其余关卡全绿独立取证 | g4-verify-final.log / g4-verify-partial.log |
| 8 | 变异红证 M1（src 面） | TabBar.tsx:41 `'./state/reader.store'`→旧径：typecheck TS2307(41,32) EXIT=2→cp 还原 diff 空→复绿 EXIT=0 | g4-mutation1.log（三段俱全） |
| 9 | 变异红证 M2（tests 面） | reader.store.test.ts:25 删 state/ 段：vitest 全用例 `Failed to load url .../reader/reader.store` EXIT=1→cp 还原 diff 空→复绿 EXIT=0→复锁 | g4-mutation2.log（三段俱全+复锁+locks:check） |
| 10 | 实现报告 | 本件 | g4-impl-report.md |

**±行数（git diff --numstat 机器实测）**：
- 迁移面：旧径十文件删除 1445 行（=state/ 新 1445 行逐字节同源+8 行深度修正；0/311+0/98+0/37+0/72+0/196+0/29+0/483+0/76+0/117+0/26）
- src 消费面：31 文件 +50/-50（域内 29 件 48 行+跨域 2 行；TabBar/scroll-progress/AiAnnotationLayer/AiNotesSection 各 3 行余 1-2 行）
- tests 面：30 文件 +41/-41（含 factories.ts:20；3 行×2 件=tab-dirty/ai-annotation-layer，2 行×7 件=tab-bar/pdf-page-canvas/reader-store-undo-race/reader-page-open-race/ai-notes-section/anchor-locate/annotation-popups-autosave，1 行×21 件）【勘误（门一 W1）：本行原括注枚举漏列 ai-notes-section/anchor-locate/annotation-popups-autosave 三件且 1 行件误记 24——主数字 30/41 三面机器互证无误，仅枚举失实；2026-09-18 收口时勘正】
- 配置：eslint.config.js 2/2+check-quality.mjs 2/2
- 探针修复：g4-recon-imports.mjs -2 行（裁决 A 授权项）
- 非本票面（主控遗留，勿计入本票）：docs/handoff/relay.md 1/1（调度器）、locks/manifest.json 61/33（主控 341 预登+本轮 generate 同步）

## ② 验证证据（命令+退出码+关键输出）

| 命令 | 退出码 | 关键输出 |
| --- | --- | --- |
| npm run verify（基线，探针修复后） | 0 | g4-baseline-verify.log 末行 `G4_BASELINE_EXIT=0` |
| node scripts/audits/g4-fix-deep.mjs | 0 | `DEEP FIX DONE: 8 lines (expected 8)` |
| node scripts/audits/g4-fix-src.mjs | 0 | `SRC FIX DONE: 50 lines` |
| node scripts/audits/g4-fix-tests.mjs | 0 | `TESTS FIX DONE: 30 files / 41 lines` |
| npm run verify（终验） | 1 | quality ✓→test-surface ✓（指纹门绿）→**tickets ✗（registry 旧径——主控收口面，见下）**，链在此中断 |
| npm run lint && typecheck && test && build（补链取证） | 0 | lint ✓；typecheck ✓；vitest **170 文件/1744 用例与基线逐数对称（零漂移实证）**；build 三段 ✓；`G4_PARTIAL_CHAIN_EXIT=0` |
| 指纹门 | — | `files: 183 base / 187 cur | cases: 1757 base / 1789 cur | assertions: 5334 base / 5411 cur | skipSites: 15/15`——cur=187/1789/5411 与简报基线零漂移；`C_after ⊇ C_before（指纹门绿）`；exemptions 2 条零新增 |
| 旧路径零残留（DoD grep 域） | — | src+tests+eslint.config.js+check-quality.mjs 命中 **0**（M6a 两行不在十模块模式内自然免疫） |
| state/ 复核 | — | 恰 10 文件 1445 行（wc 终态复核） |
| npm run locks:check（终态） | 0 | `locks 检查通过：345 个受锁文件与 manifest 一致`；新探针只读位在 |
| 全部 g4 产件 UTF-8 | — | iconv 逐件验证 OK（mutation2 经归一后 OK，见自裁⑧） |

**阻塞呈报（唯一未达 DoD 项：verify 全链 EXIT=0）**：tickets:check 红=
5 行违规（4 唯一+1 重复），全部因 tickets/registry.ts 九行 file 字段仍指旧径
（:111/:146/:148/:150/:170/:208/:230/:232/:295——简报②明示=主控收口义务、实现者
禁触），tests 已改 state/ 新径故 guardedDescribe↔被测文件映射必然断。registry 九行
`features/reader/<mod>`→`features/reader/state/<mod>` 落笔后 verify 全链即闭
（其余七关卡已逐一独立取证全绿）。

## ③ 自裁申报（门审拷问面）

1. **受锁面勘正 3 件→30 件**（预登记项①）：设计书 §3.4 与票面「CorpusExtractor 相关
   测试 3 件」实勘 30 文件 41 行；[locked-change][test-refactor] 已覆盖；实测 41 行零增删。
2. **mv 用文件系统通道非 git mv**（预登记项②）：git 权限边界；rename 相似度由主控收口认领。
3. **探针修复+绊线+双版 raw**（裁决 A 授权项，按主控扩写要求）：恰删
   g4-recon-imports.mjs:37（专属注释）+:38（未用声明）两行；重跑 diff 非零（+2 行=
   本票预写探针 g4-fix-src.mjs 跨域字面串被侦察探针自扫，探针自计数族）；主控终裁
   接受刷新版——g4-recon-imports.log（刷新版）/g4-recon-imports.log.bak-diff（原版）并存。
4. **src 消费面 50 行/31 文件 vs 简报 49 行/32 文件**：口径差——简报按模块对/文件去重计，
   本实现按物理 import 行 grep 实测；行差+1=同模块双行形态（`import`+`import type` 各占
   一行，如 TabBar:41/:43）；文件差-1=简报 30 件去重口径多计 1（实测留驻 29+跨域 2）。
   改写全覆盖零遗漏（残留 grep 0 实证）。
5. **locks:generate 三次**（简报步骤 8 仅一次）：基线前一次（探针修复 sha 同步+三探针首登
   344——否则基线 verify 的 locks:check 必红）、复锁一次、编码归一探针补登一次（345，
   宪法「自产工具件即时 generate+apply」义务）。均为结构性必需，非范围扩面。
6. **M2 变异涉锁微窗**：unlock→变异→还原→apply 额外一轮（简报单窗口径外）——受锁测试件
   写权限必需；还原后 locks:check 绿=manifest 零内容漂移；终态 345 件全只读。
7. **变异红证先于终验全绿执行**：终验被 tickets:check（主控面）阻塞，变异不依赖该关卡
   （只依赖迁移终态），先行完成保进度；证据三段俱全不受影响。
8. **g4-mutation2.log 编码归一**：:116-:117 两行 powershell 重定向输出为 GBK 字节，按
   GBK 解码重编码 UTF-8（内容未变，「已锁定 344 个文件」原文保留）；v1 归一探针尾注自身
   经 'binary' 挤道损坏已重写（v2 在档）；归一动作以尾注行明示在 log 内。
9. **补链取证 g4-verify-partial.log**：lint/typecheck/test/build 单独串跑——终验在 tickets
   中断后为证明其余关卡全绿的证据补链（等价于 verify 后四步，命令面未扩）。
10. **新增工具件四件入锁**：g4-fix-{deep,src,tests}.mjs+g4-encoding-normalize.mjs
    （受锁面自动覆盖 scripts/**/*.mjs，已随 generate 登记 345）。

## 证据件索引（scripts/audits/）

- 简报：g4-impl-brief.md（主控）｜侦察：g4-recon-{imports,internal,tests}.log+.mjs（主控）
- 基线：g4-baseline-verify.log｜终验：g4-verify-final.log｜补链：g4-verify-partial.log
- 改写审计：g4-fix-deep.log / g4-fix-src.log / g4-fix-tests.log（+同名 .mjs）
- 变异：g4-mutation1.log（src 面）/ g4-mutation2.log（tests 面）
- 编码：g4-encoding-normalize.mjs｜对照：g4-recon-imports.log.bak-diff（主控原版）

MODEL-SELF: model-field:account:bigmodel-individual-coding-plan/GLM-5.3$max
LEDGER-CLAIM: role=ops-executor executor=model-field:account:bigmodel-individual-coding-plan/GLM-5.3$max units=10 outcome=partial
