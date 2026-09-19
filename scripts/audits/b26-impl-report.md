# F-EXPORT-01 实现者交付报告（batch 26）

票：F-EXPORT-01（registry:314）——corpus.export 拆件。
实现者：ops-executor（GLM5.3flash $max）。简报：scripts/audits/b26-impl-brief.md。
开工首步技能清点：test-driven-development（用——红绿+变异红证义务）/
verification-before-completion（用——verify 亲验退出码）/systematic-debugging
（备用未触发——无不可解释红）；其余不用（禁 git 写/禁子代理/纯后端拆件）。

## ① 交付清单（逐件，wc -l 实测）

| 文件 | 前 | 后 | Δ | 内容 |
| --- | --- | --- | --- | --- |
| src/main/services/export_/export-session-state.ts | 14 | 132 | +118 | 骨架→真身：ExportSessionPhase 六态+ActiveSession（字段零改外提）+SessionError+createExportSessionState（begin/current/isActive/markTerminal 四口，闭包会话引用单源）+deferOutcome（setImmediate 时序协议）；态空间迁移表全表+跨格序列八行母本随迁本件头注，INV-17/18/65 锚定段落随迁 |
| src/main/services/export_/corpus.export.io.ts | — | 104 | +104 | 新件：盘面 IO 纯函数群（MANIFEST_TMP/ManifestPaper/CorpusManifest/cleanRebuild/writeCorpusMd/writeFulltext/readCorpusSha/writeFigure/finalizeManifest/removeManifestTmp）；无状态/无事件/零 sendEvent |
| src/main/services/export_/corpus.export.service.ts | 442 | 300 | −142 | 瘦身编排件：工厂签名与 CorpusExportDeps/CorpusExportService 公开接口零改；内部 session 闭包→state 件、IO 调用迁 io 件、sendProgress/extract-request 组包留本件；态空间表移件 1 留指针，R12 装配单源/通道判定/INTERFACE.md 段落保留；状态机逻辑零残留副本 |
| src/main/services/index.ts | 152 | 154 | +2 | 桶键拆分：ServiceBundle `export_: ExportService & CorpusExportService` → `export_: ExportService`+`corpus_export: CorpusExportService` 两键平铺（b25 同型注释句）；装配段双 spread 消解=局部量 corpusExport 先行恰一构+直传 |
| src/main/ipc/export_.ts | 141 | 141 | 0 | 恰 2 handler 迁键：corpusItem(:86)/corpusSession(:95) → deps.services.corpus_export.X；其余 6 handler（bibtex/csv/clipboard/report/corpus/corpusSet）export_ 键不动 |
| src/main/bootstrap.ts | 273 | 273 | 0 | 恰 2 处 abort 接线迁键（:238 did-start-navigation/:241 render-process-gone → corpus_export.abortActiveSession） |
| tests/utils/ipc-deps.ts | 51 | 52 | +1 | 受锁单点：`export_: null as never,` 单行拆两行（+corpus_export 行）；单链=locks:unlock(EXIT=0)→改→locks:generate(EXIT=0)+apply(EXIT=0) 即时闭合，locks 378 条一致 |
| scripts/audits/b26-mutation1.log | — | 57 行 | 新增 | M1 变异红证档 |
| scripts/audits/b26-mutation2.log | — | 15 行 | 新增 | M2 变异红证档 |
| scripts/audits/b26-impl-verify.log | — | — | 新增 | verify 终跑全输出 |

git 面：本实现者零 git 写操作（简报⑤禁令）；未跟踪新件=corpus.export.io.ts+三
log+报告。工作树既有脏面（docs/handoff/relay.md、locks/manifest.json 的
b26-claim.mjs 登记段）系主控 claim 时点残面，非本实现者产物；manifest 本次
diff 含受锁单链再生成的 ipc-deps.ts 新 sha 与 generatedAt 刷新（规程内）。

零触碰面核验：shared/ipc/schemas+api-surface、ipc/index.ts 装配行
（export_: createExportIpc(deps) 不动）、preload/renderer、e2e specs、
corpus.assemble/interface-template/export.service、corpus.export.test.ts
（519 行受锁零触碰）——grep 全仓 services.export_ 消费面恰=ipc/export_.ts
8 处+bootstrap 2 处，其中迁键恰 4 处，与简报对号。

## ② 验证证据（命令+退出码+关键输出）

定向回归（vitest 定向）：
- `npx vitest run tests/unit/services/corpus.export.test.ts` → EXIT=0，
  Tests 16 passed (16)【简报写 14 用例，实测 it 块=16（vitest 机器输出），
  以实测数为准——计数落笔前实测纪律】
- `npx vitest run tests/unit/services/corpus.export.test.ts tests/unit/ipc/export_.test.ts`
  → EXIT=0，Test Files 2 passed (2)，Tests 20 passed (20)（16+4）

等价锁：受锁 519 行测试零触碰即绿=公开接口/行为等价成立。

全量 verify（log=scripts/audits/b26-impl-verify.log）：
- `npm run verify` → **VERIFY_EXIT=0**
- 关卡对账基线（b26-verify-baseline.log）零漂移：Test Files 170/170、
  Tests 1744/1744、指纹门 187·1789·5411·skip15 全同值、locks 378 一致、
  open 5（F-EXPORT-01 仍 open=预期态，收口主控翻票后自清）、tickets:check
  通过、lint/typecheck/build 绿；渲染产物恒等（index-D3egZtl2.js/
  index-BfpEygSE.css 与基线同名同尺寸）；main 产物 182.85 kB（拆件重构
  预期态，基线 181.89 kB）。

## ③ 变异红证（先红后还原后绿，退出码物理在档）

M1（状态机守卫——INV-65 承重面），档=scripts/audits/b26-mutation1.log：
1. cp 备份 export-session-state.ts → 仓库外 /tmp（禁 git checkout——未提交
   面会被抹掉，宪法测试纪律）；
2. 变异：createExportSessionState.isActive 改 `return true`（守卫永真）；
3. 红：定向 corpus.export.test → **MUTATION1_RED_EXIT=1**，恰 1 failed/
   15 passed——红用例=「F-SESS-01 advance 守卫：complete 已排队终局推进
   （deferOutcome 未跑）时 abort——悬挂推进不得终写 manifest」（abort 后
   悬挂推进误终写 manifest，命中简报预判用例）；
4. 还原：cp 备份回写+diff 空（RESTORE_DIFF_EMPTY 确认）+复跑
   → **MUTATION1_GREEN_EXIT=0**（16/16）；备份即删（mutation 副本禁驻留）。

M2（桶键迁移），档=scripts/audits/b26-mutation2.log：
1. cp 备份 ipc/export_.ts → /tmp；
2. 变异：corpusItem 行键回退 corpus_export→export_；
3. 红：`npx tsc --noEmit -p tsconfig.node.json` → **MUTATION2_RED_EXIT=2**，
   恰 1 错：`src/main/ipc/export_.ts(86,48): error TS2339: Property
   'corpusItem' does not exist on type 'ExportService'`（TS2339 对位简报
   预判——交并已拆后旧键必哑）；
4. 还原：cp 回写+diff EXIT=0（identical）+复跑 typecheck
   → **MUTATION2_GREEN_EXIT=0**；备份即删。

## ④ 超票面自裁申报（逐条）

1. **SessionError 迁址并 export**：自 service 内私有类迁 export-session-state.ts
   并导出（ActiveSession.reject 载荷类型零改的前提下，state 件自包含的唯一
   无环解）；service 改从 state 件导入，类体/语义/注释零改。
2. **ManifestPaper/CorpusManifest 迁址**：自 service 迁 corpus.export.io.ts 并
   导出（state 件 ActiveSession.papers 与 io 件 finalizeManifest 参数双消费；
   依赖方向 state→io→interface-template，无环；字段零改，仅 CorpusManifest
   为 manifest 字面量新立具名类型——JSON.stringify 输出不变）。
3. **deferOutcomeFor 薄适配器**：简报定 deferOutcome(run) 单参落 state 件——
   failSession 折叠处置链（catch→failSession+消息串）留 service，新增 6 行
   适配器 deferOutcomeFor(s, run) 接两调用点（消息串逐字保留；合成语义与
   拆前 deferOutcome(s, run) 逐句等价）。Rule of Three 第 2 次本可重复，取
   单点接线防消息串双份漂移。
4. **writeFigure 返回相对路径**：签名按简报 (dir, paperId, name, buf) 落地，
   返回值自设为 `figures/<id>/<name>`（manifest 相对路径构造单点归 io 件）；
   service 端 push 返回值。消毒（sanitizePathToken）留 service（renderer
   载荷协议关注点）。
5. **markTerminal 实现=identity 复核后置空**（if session===s then null）：调用
   面（advance/failSession）均已过 isActive 守卫，与简报「同步置 null」逐字节
   等价；保留复核=纵深防御（旧对象迟到终局不得误清新会话引用）。
6. **service 压线 300 行**（简报目标 ≤300，首版 344 超 44）：删接口层三方法
   bullet（与 interface JSDoc 逐句重复的真冗余）+导入块收敛+短注释并行——
   内容零删（R12/通道判定/INTERFACE.md/实现裁决/架构/生命周期全锚点保留）；
   终值 wc=300（边界达成）。state 132（~150 ✓）/io 104（~120 ✓）。
7. **简报「14 用例」勘正**：实测受锁文件 it 块=16（vitest 输出 16 tests），
   报告全篇按 16 呈数。
8. **变异时序申报**：M1/M2 执行于 service 头注压缩前；其后仅 service 件
   注释/导入行变动（零代码路径变化），压缩后 tsc EXIT=0+定向 20/20+
   verify EXIT=0 复验在档；两变异目标文件（state.ts/ipc/export_.ts）自
   变异还原后零改动（marker grep 计数=0 双验）。
9. **ExportSessionPhase 落位**：六态联合按简报落 state 件并 export；
   interrupted 非驻留态不入联合字面量（头注声明——不可观测、无迁移消费面，
   与原 service 头注口径一致）。

## ⑤ 完成定义核对

- npm run verify EXIT=0（tickets open 5 含 F-EXPORT-01=预期态）✓
- 两变异红证在档（b26-mutation1/2.log，退出码物理）✓
- 本报告完整 ✓
- e2e corpus-export 全链：简报明令主控收口跑，实现者未跑（预期分工）✓
