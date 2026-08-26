四清单核验全部完成，e2e 真环境全链绿（6.8s）。以下为终审报告。

---

# SR2-AI-04 第二门终审报告（GLM 位，2026-08-26）

**核验方式**：第一门审计原文（scripts/audits/ai04-impl.audit.raw.txt）逐条比对 + 六实现/测试文件全读 + git diff 变更面清点 + ABI 切换流程实测（node→vitest→electron 复位）+ `npm run verify` 全链 + e2e 本 spec 真环境回归 + locks:check 对账。开工技能清点：verification-before-completion（精神采纳——核验即本体）、code-review-excellence/systematic-debugging（不用——任务为结构化核verify非开放审查/无调试）、测试类技能（不用——不写新测试只跑受锁测试）。

## 清单 1：处置核验 —— ✓ 全部落地，无新引入缺陷

- **W1（初始态自证恒真）✓ 采纳落地**：tests/unit/renderer/corpus-export.test.tsx:111 模块级 `const INITIAL_SNAPSHOT = { ...useCorpusExportStore.getState() }`（顶层语句，执行先于任何 beforeEach）；初始态用例 :162-173 先 `expect(getState()).toEqual(INITIAL_SNAPSHOT)` 锁「重置字面量≡真实默认值」再逐字段显式断言（双锚）；resetStore :116 补 `sessionId: null`。能失败性推演成立：store 默认 `busy:true` 类漂移 → 模块加载时 snapshot 捕获漂移值 → resetStore 后 toEqual 即红，不再依赖 e2e 慢防线。实测 17 用例全绿（16+1 新增）。
- **W2（not-ok 透传无锚）✓ 采纳落地**：:308-312 生产组装用例补 `deny={ok:false,error:{code:'INVALID_REQUEST',...}}` 桩 + `resolves.toEqual(deny)` 透传断言，与 useExportCorpusEvents.ts:40-43 映射 `r.ok ? {ok:true,data:undefined} : r` 精确对应；映射退化即红，会话死锁镜像面合约已锁。
- **N1（跨会话迟到污染）✓ 部分窗闭合落地**：store 增 `sessionId: string|null`（接口 :43-44、默认 :60、start 重置 :70）；applyProgress :92 `if (s.sessionId !== null && s.sessionId !== p.sessionId) return` 首事件建立身份、异身份忽略；残余窗（新会话 start 后首事件前）已在 :90-91 注释显式声明。新增跨会话过滤用例 :259-287（cs-a 在途、cs-b 被滤、断言 sessionId/phase/done 三字段）。无新缺陷：终态 sessionId 残留无消费面（busy=false 守卫挡住一切 applyProgress；下次 start 重置）。
- **N2（failSession 无守卫）✓ 采纳落地**：corpus.export.service.ts:279 首行 `if (session !== s) return` + 注释声明「不依赖提取器串行协议成立」。时序自洽性核验：deferOutcome 的 run 执行时 session===s 恒成立（新会话 invoke 被 EXPORT_BUSY 挡住、老会话终局只由本排队 run 触发），advance :223 无条件 `session=null` 无误杀面；守卫精确闭合异常路径（run 失败迟到 failSession）。
- **附带**：修复①（fileRefById 全路径）核验闭环——papers.repo.ts:234-238 返回完整三层 `file_ref`，service :336 消费，与 e2e 种子 :110-111 同口径；修复②（deferOutcome :290-296 setImmediate）；CorpusExtractor.ts 改动仅注释强化零行为变更；App.tsx/SettingsPage.tsx 接线各 3-4 行最小增量。

## 清单 2：不采理由复核 —— ✓ 三条全部成立

- **N3（PNG >1000B 下限）不采成立**：spec :186-191 断言 PNG magic+>1KB。页面由 createMultiPagePdf 生成、含 marker 文字与页框，1224×1584 真渲染页快照典型远超 1KB；跌破 1KB 需整页无任何笔画像素（=文字渲染消失），那本身就是应红的失败模式——该断言方向是防「空画布退化」而非精确体积匹配，误红面实际不可达。
- **N4（日期口径）不采成立**：docs/ROADMAP.md:237「执行实况注记（2026-08-27）」、:249「SR2-AI-03 ✅（2026-08-27 c9ea6ec）」、交接书文件名 `2026-08-27_next-session-handoff-v4.md`——08-27 确为战役会话既定口径；locks manifest generatedAt 是宿主钟，两口径语义不同，维持正确。
- **N5（safeName 碰撞）不采成立**：annotationId 为应用生成 UUID，字符集 `[0-9a-f-]` 全部落在 safeName 白名单 `[a-zA-Z0-9_-]` 内——洗涤是恒等映射，不同 UUID 数学上必不碰撞；碰撞仅在篡改载荷（纵深防御假想敌）下可达，无实际守卫对象，不登记不构成缺陷。

## 清单 3：回归面 —— ✓ 干净

- `tests/unit/services/corpus.export.test.ts` 未被修改（git status 修改列表不含它，diff 为空）。
- ABI 严格流程实测：`use node`（v137）→ `npx vitest run`（services+renderer 两文件）→ **27/27 全绿**（10+17）→ `use electron`（v146）复位确认。deferOutcome 异步化与受锁测试的 nextExtract 轮询兼容（第一门论证+本次实测双重锚定）。
- `npm run verify` 全链绿（quality/tickets/locks/lint/typecheck/test/build 按顺序 && 串联走到 build 完成；build 输出同时印证 worker 资产单份，与 INV-16 已知边界声明一致）。
- e2e `corpus-export.spec.ts` 真环境全链绿（6.8s）——N1/N2 改动均在本 spec 覆盖的时序路径上，回归锚定完成。
- 变异红证说明：W1/W2/N1 锚的能失败性经逻辑推演确认（snapshot 捕获时序先于 beforeEach／映射退化即形状不匹配／删过滤行后 cs-b 覆盖被断言字段），终审位不做实际变异——工作区是唯一未提交实现面，触碰受锁文件做变异的还原风险大于推演残值（推演链无歧义）。

## 清单 4：宪法终扫 —— ✓ 合规（含两条非阻塞提示）

- **locks 流程 ✓**：三受锁路径（tests/unit/renderer/corpus-export.test.tsx、tests/e2e/corpus-export.spec.ts、scripts/check-quality.mjs）均入 manifest（grep 确认）；`locks:check` 109 文件全一致——证明 W1/W2 补测后确已重新 apply（否则 sha 必红）。invariants.md 非 manifest 成员，无需重锁。
- **[locked-change] ⚠ 提交动作待办（非缺陷）**：提交尚未发生；届时受锁文件变更（两测试文件+check-quality.mjs+manifest.json 自身）必须带 `[locked-change]` 尾注。终审声明：变更集就绪，提交时执行即可。
- **工单号引用规约 ✓**：`SR2-AI-04` 字面量 src/ 侧仅登记本体 CorpusExportSection.tsx 一处；测试/spec/registry/白名单注释/文档各就其位，无越权引用；e2e 激活用 `isTicketDone` 动态判定（reader-text.spec:35 同型先例），且 DEPS 不含自身（防自锁死锁）；registry 已翻 done。
- **跨 feature 白名单 ✓**：单条目 `useExportCorpusEvents.ts → ['reader/CorpusExtractor']` 精确到单文件单目标；接缝归责条款过——CorpusExtractor.ts 头注 :41「生产组装=useExportCorpusEvents（AI-04）」与白名单注释两侧声明互证一致、无互斥；tab-dirty/ReaderNotesPanel 同型先例成立。
- **不变量登记 ✓**：INV-14 扩面（事件订阅同族）+ INV-18 补条（deferOutcome 串行时序）均回写 docs/invariants.md，跨模块时序契约不再依赖注释。
- **质量面 ✓**：无 TODO/FIXME/placeholder；新文件中文 Read 全文可读；行数全部达标（最大单测 422 行 <500）；分层单向（renderer 三件仅 import api/client+shared）无违宪。
- **工作区残留提示（非本工单缺陷）**：`dist_new/`（electron-builder 产物：setup.exe/blockmap/win-unpacked）为未跟踪残留——提交时**严禁 `git add -A`/`git add .`**，须显式列文件（2026-08-26 scripts/audits 误扫同型教训）；建议提交后清理。`scripts/audits/` 两份审计存档是否入库由人类裁决（非受锁面）。

---

## 终审裁决：**PASS**

第一门两条 W 级处置（W1/W2）真实落地且锚的能失败性成立，两条 N 级采纳（N1/N2）实现自洽无新缺陷，三条不采（N3/N4/N5）理由经独立证据复核全部成立（ROADMAP 口径实证、UUID 恒等映射论证、PNG 防退化方向论证）。AI-03 两处修复（fileRefById 全路径+deferOutcome 时序）经代码链路+受锁单测+e2e 真环境三面锚定。回归面干净：受锁 AI-03 测试零改动且 10/10 绿，verify 七关卡全绿，e2e 全链绿。宪法面：locks 对账一致、不变量登记闭环、白名单正当、工单号引用合规。

**提交前置条件（人类执行提交时落实，不阻塞裁决）**：① 受锁文件提交带 `[locked-change]` 尾注；② 显式列文件 staging，排除 `dist_new/` 残留。