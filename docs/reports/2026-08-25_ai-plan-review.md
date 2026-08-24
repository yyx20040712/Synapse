# AI 模块计划审查与技术路线定稿（2026-08-25）

> 定位：总负责人接手场（任务书=docs/prompts/2026-08-25_next-session-handoff.md）。
> 产出=架构基线核实 + ai-module-plan 审查（R1~R14）+ 技术路线 v1.1 定稿 + 未定义特性
> 分析（INV-16~18 预登记）。同步修订：ai-module-plan（原地 v1.1）/ADR-0011（v1.1）/
> docs/invariants.md/ROADMAP P7-G。纯 docs，无实现，无工单状态变更。

## 0. 开工记录（宪法「会话开工纪律」）

| 技能 | 用/不用 | 理由 |
| --- | --- | --- |
| writing-plans | 用 | 定稿技术路线与工单骨架属计划写作 |
| code-review-excellence | 用 | 审查本质是设计/方案审查（对照源码逐条核证） |
| verification-before-completion | 用 | 收尾前 verify+diff 范围自查 |
| dispatching-parallel-agents（只读 Explore） | 用 | 架构大范围扫读派只读子代理；其结论已由主会话对照源码逐条核实（§2 证据均为亲读 file:line） |
| test-driven-development / systematic-debugging / browser 系 | 不用 | 纯规划文档场，无实现面/无缺陷调查/无浏览器操作 |
| subagent-driven-development | 不用 | 本场不向弱模型派实现工单 |

配置自查：GLM-5.3 常规思考档，规划主导场，无需弱模型派单；子代理只读。

## 1. 架构基线核实（2026-08-25 本场实测）

- `npm run verify` **exit 0**（quality/tickets/locks/lint/typecheck/test/build 七关）；
  测试 **314 用例 / 58 文件**（与交接书 314 口径一致）。
- 环境事实（新记）：verify 的 build 末段把 better-sqlite3 切到 **electron ABI**（日志
  `sqlite-abi.mjs use electron`）；此后裸跑 `npx vitest run` 会因 Node 进程加载 electron
  ABI 绑定而 DB 面 8 文件 49 红——**测试一律走 `npm run test`**（内含 `sqlite-abi use
  node` 前置），裸 vitest 的红不是基线问题（本场实证）。
- 工单 83：open 2（SR2-TABS-04 strong / SR2-UNDO-01 strong——annotation-undo.ts 54 行
  系 unimplementedObject 桩+五层规约头注，未实现，与交接书一致）；锁 93；领先
  origin **23 提交**（交接书 21+两笔 docs）；工作树仅 `dist_new/`（Phase 6 安装包
  产物，未跟踪，不清不动）；探针三件（_esm/_ptr/_rule6_probe）**已消失**——交接书
  「重启后删」预期成立。
- 架构一句话：Electron 42 单窗口，`ipc（zod 校验统一注册）→ services → repos →
  db`，`renderer(features 五域+shared) → window.api/preload → ipc`，跨进程类型单源
  `src/shared/`；pdfjs-dist 渲染在 renderer（PdfCanvas+TextLayer 两处运行时 import）；
  事件桥现状仅 importProgress 一个 main→renderer 单向通道；迁移至 002（003 顺延
  正确）；运行时依赖 6 个（预算 15）；`export_/` 服务域已存在（bibtex/csv/report
  三通道）；ADR 编号 0010 为 C1 预留空号，新 ADR 顺延 **0014**。

## 2. 审查发现（计划 ↔ 源码/契约对照；证据均主会话亲读）

| # | 发现（证据） | 定稿处置 |
| --- | --- | --- |
| R1 | 计划称「pdfjs-dist 只许 PdfCanvas.tsx import（:44 既有单点）」不实：import 实为 41-47 行；且 TextLayer.tsx:29 是第二处运行时 import（PdfCanvas.tsx:27「唯一允许」的自我声明与事实矛盾）；新提取器将成为第三处 | **白名单三文件**：运行时 import 仅许 PdfCanvas/TextLayer/CorpusExtractor；ESLint no-restricted-imports 机器锚（eslint.config.js 受锁 [locked-change]，随 SR2-AI-02）；PdfCanvas.tsx:27 与 TextLayer.tsx:21 头注「唯一」措辞同步修正（接缝归责纪律）。弃「pdfjs-core.ts 单点收口」重构案——不动已验证组件，白名单同样机器可检 |
| R2 | 计划「复用已打开文档句柄」不可行：句柄在 ReaderPage.tsx:91 组件 state（unknown 类型），模块外不可达；「pdfjs 内部缓存」说法错误——getDocument 无跨调用文档缓存 | CorpusExtractor **自持生命周期**（load→逐页提取→destroy），与阅读器句柄零耦合；app-file:// url 由 main 在事件载荷下发（INV-07 先例=reader/open 返回该 url） |
| R3 | 计划「反向事件桥/PreloadEvents 首个双向协作面」过重：api-surface.ts:76 明确声明事件通道 main→renderer **单向**；renderer→main 回传本就有成熟模式（invoke+register zod 校验+Result 折叠） | **事件桥单向化**：回传=常规端点 `export/corpus-item`（invoke）；事件仅新增一个 main→renderer 通道（载荷判别联合 extract-request/progress）；EVENT_CHANNELS 单向声明保持不变——「双向协作面」新接缝消除 |
| R4 | [ai:*] 段 v1/v2 归属矛盾：ADR-0011 正文结构③称「v2 扩展位，v1 不实现」，但计划 AI-01 交付 ai_notes DDL+repo、AI-03 golden 断言 [ai:*] 装配；且 v1 无任何 ai_notes 写入方（回灌=未来工单），repo 若无消费者触「死代码」红线 | **ADR-0011 v1.1**：[ai:*] 段装配入 v1（纯投影侧、消费者按前缀忽略未知段，非破坏）；显式声明「v1 无生产者——生产者=测试夹具，消费者=导出装配，写入面=未来回灌工单立项」 |
| R5 | 计划「进度可见=manifest 部分写入+终态标志」引入 ADR 未定义的 manifest 状态字段；工具侧可能读到半份 manifest（读写协议未定义） | **manifest 终局单写**：临时文件+rename 原子替换；导出会话开始即删旧 manifest；「manifest 存在=导出完整就绪」为工具侧唯一激活判据（与 SKILL.md 检测规则对齐）；进度走 UI 事件不走 manifest |
| R6 | contentSha 幂等口径自相矛盾：ADR front-matter schema 含 exportedAt + 验收要求 contentSha 与文件内容匹配 + 计划要求「sha 不含 exportedAt」——文件字节含时间戳则重导必变 | **front-matter 去 exportedAt**（时间戳只进 manifest per-paper 条目）；contentSha/fulltextSha=文件字节 sha256；同库重导**逐字节稳定**（golden 锚定） |
| R7 | figures 页图范围未定义：D6/ADR 未说明全页还是仅标注页（全库全页≈GB 级，仅标注页则多模态降级） | **全页快照**（D1「数据基座尽可能不失真」同哲学）；体积/时长预期由 INTERFACE.md 声明；未来收窄=版本化修订（INTERFACE 版本号联动） |
| R8 | 导出目录覆盖/残留语义未定义（二次导出、删除文献后的孤儿文件、中断残留） | 会话开始**清空重建** corpus/fulltext/figures 三子目录；manifest 增可选 `errors:[{paperId,reason}]`，papers[] 只列成功篇（缺文件/损坏篇进 errors） |
| R9 | 导出并发/重入未定义（双击按钮） | 会话**单飞**：进行中拒绝第二会话（app-error 新码 EXPORT_BUSY，src/shared/app-error.ts 受锁 [locked-change]）+UI 按钮 disabled |
| R10 | 接缝归责清单：PdfCanvas/TextLayer 头注声明修正（R1）；extract 事件注入走 bootstrap 装配桶先例（importProgress/sendProgress 同型）；新 zod schema 入 src/shared/ipc/schemas.ts（受锁） | 全部列入对应工单头注验收条款 |
| R11 | 工具面测试宿主二选一悬空（node:test vs vitest=两套测试基建风险） | 定 **vitest**（落 tests/unit/tools/，verify 管线自动覆盖；弃 node:test） |
| R12 | P7-C（md 语料导出）与 SR2-AI-03（五件套）存在双实现风险（宪法「方案切换」红线） | **装配单源**：corpus md 装配纯函数 corpus.assemble.ts 由 P7-C 建立（sortKey 序/引文块/[user] 前缀规约落地），AI-03 在**同一文件**延展（fulltext/figures/sha/manifest/errors）——禁第二套装配 |
| R13 | 文档漂移小项：蓝图 §2「三件套」系 D6 修订前措辞（ADR-0011 同日已升五件套）；ADR-0010 空号=C1 预留（与交接书任务三一致），新 ADR=0014 | 蓝图为愿景固化文档不改（ADR 是契约真相源）；编号事实记入本报告 |
| R14 | 骨架补缺：SettingsPage.tsx 172 行+导出节将触组件 250 行限；ai_notes.role 无约束；设置节卸载后进度/完成反馈丢失（INV-02 面） | 拆 CorpusExportSection.tsx；DDL 加 `CHECK(role IN (...))`；App 层订阅 useExportCorpusEvents（INV-14 成对清理）驱动 corpus-export.store（zustand），完成/失败 toast 常驻可见 |

## 3. 技术路线 v1.1（定稿 deltas——其余按 ai-module-plan v1.1 原文执行）

```
导出编排（main 发起，会话单飞）：
1. main: dialog 选目录（INV-07）→ 删旧 manifest+清空重建三子目录
   → repo 取库（papers/annotations/notes/ai_notes）→ corpus.assemble 写 corpus/*.md
2. main → renderer: exportCorpus 事件 {type:'extract-request', sessionId, paperId, url}
   （url=app-file://，main 下发；progress 载荷同通道）
3. renderer: CorpusExtractor（App 层监听，自持 getDocument 生命周期，与阅读器零耦合）
   - fulltext: 全页 getTextContent 拼接，页界 \f；逐页 invoke export/corpus-item 回传
   - figures:  离屏 canvas 全页渲染 page-N.png + WADM 归一化 rects 裁 anno-<id>.png
   - invoke 逐页 await ack=天然背压；篇毕 {kind:'complete'|'error'}
4. main: 流式落盘 fulltext/figures → 全部终局后 manifest 终局单写（temp+rename，
   含 contentSha/fulltextSha/errors）→ resolve export/corpus → toast
```

## 4. 未定义特性分析（本场第 4 问的正面回答）

**结论：原计划存在 7 处未定义/自相矛盾特性（U1~U7），全部已在本次定稿闭合；新增跨
模块行为预登记 INV-16~18（未锚定，锚定随工单）；与既有 INV 逐条核对无新增冲突，但
4 条既有 INV 需在 AI 工单中携带对应条款。**

U1 pdfjs 单点声明不实（R1）→ 白名单+ESLint；U2 句柄复用假设错误（R2）→ 自持生命
周期；U3 manifest 读写协议缺失（R5）→ 终局单写；U4 幂等 sha 口径矛盾（R6）→
front-matter 去 exportedAt；U5 figures 范围缺失（R7）→ 全页；U6 目录残留与并发语义
缺失（R8/R9）→ 清空重建+单飞；U7 [ai:*] v1/v2 矛盾+无生产者（R4）→ ADR v1.1+显式
声明（否则 AI-01 触死代码红线）。

新 INV（已登记 docs/invariants.md，状态=未锚定/规划期预登记）：

- **INV-16** pdfjs-dist import 白名单（PdfCanvas/TextLayer/CorpusExtractor 三文件，
  ESLint 强制）——随 SR2-AI-02 锚定。
- **INV-17** 语料导出幂等口径（front-matter 无 exportedAt；sha=文件字节；同库重导
  逐字节稳定）——随 SR2-AI-03 golden 锚定。
- **INV-18** 导出会话协议（manifest 终局单写+原子替换；会话开始删旧 manifest+清空
  重建；单飞 BUSY；中断=无 manifest=工具不可激活）——随 SR2-AI-03/04 单测+e2e 锚定。

既有 INV 核对：INV-02（导出失败/完成 toast 入 AI-04 验收）｜INV-07（路径仍仅 main
对话框；app-file:// url 由 main 事件下发，先例成立）｜INV-08（零新增 host 不变）｜
INV-09（renderer 无 Node/绝对路径不变）｜INV-11（role 枚举真相入 DDL CHECK；
INTERFACE.md 单源 interface-template.ts）｜INV-13（export/corpus-item Result 折叠的
renderer 消费分支=会话 error 态）｜INV-14（App 层事件订阅成对清理）。

## 5. 定稿骨架与工单序列（SR2-AI-01~05 编号不变，验收要点增补）

```
src/main/db/migrations/003_ai_notes.sql               [受锁] role CHECK 约束
src/main/db/repos/ai_notes.repo.ts                    （+repos/index.ts 注册）
src/main/services/export_/corpus.export.service.ts    会话编排+manifest 终局单写
src/main/services/export_/corpus.assemble.ts          md 装配纯函数（P7-C 建，AI-03 延展）
src/main/services/export_/interface-template.ts       INTERFACE.md 静态单源
src/renderer/features/reader/CorpusExtractor.ts       自持文档生命周期+离屏渲染+裁剪数学
src/renderer/features/settings/CorpusExportSection.tsx 设置页导出节（组件行数防线）
src/renderer/features/settings/corpus-export.store.ts 进度态（zustand 既有先例）
src/renderer/shared/hooks/useExportCorpusEvents.ts    App 层订阅+toast（INV-14 成对）
src/shared/ipc/api-surface.ts                         [受锁] export/corpus、export/corpus-item、
                                                        EVENT_CHANNELS 增 exportCorpus（单向）
src/shared/ipc/schemas.ts / app-error.ts              [受锁] 新 schema / EXPORT_BUSY
tools/ai-sensor/{SKILL.md,README.md,config.template.json,queue.mjs,prompts/*.md}
tests/unit/tools/queue.test.ts                        （vitest 宿主，R11）
```

| 工单 | 定稿增补（在 ai-module-plan v1.1 §4 基础上） |
| --- | --- |
| SR2-AI-01 | DDL 加 role CHECK；头注载明「v1 无生产者」声明（R4） |
| SR2-AI-02 | ESLint 白名单规则（[locked-change]）+PdfCanvas/TextLayer 头注修正；Extractor 自持生命周期（R1/R2） |
| SR2-AI-03 | manifest 终局单写+errors+清空重建（R5/R8）；幂等 golden（R6）；全页快照（R7）；装配单源接续 P7-C（R12） |
| SR2-AI-04 | CorpusExportSection 拆分+App 层订阅+toast（R14） |
| SR2-AI-05 | vitest 宿主；config.json 入 .gitignore；tools/ 入 eslint 覆盖核对（R11/R14） |

排序不变：P7-B 收官 → P7-C → AI-01~05（P7-F 可穿插）——交接书默认提案生效。

## 6. 导出会话状态机表（宪法状态机前置——AI-02/03 工单头注母本）

主会话态空间：`idle → preparing（清目录+写 corpus md）→ streaming（逐篇提取回传）→
finalizing（manifest 终写）→ done ｜ failed ｜ interrupted（进程/窗口死）`

| 跨格序列 | 期望行为 |
| --- | --- |
| 正常全链 | preparing→streaming→finalizing→done；manifest 存在且 sha 全匹配 |
| 篇失败（文件缺失/损坏） | 该篇进 errors[]，会话继续；done 为「部分成功」，UI 呈现 errorCount |
| chunk 回传失败（invoke 折叠错误） | 会话 failed；toast（INV-02）；manifest 不写；重跑修复 |
| 中断（窗口关/进程退） | 无 manifest → 工具不可激活；重跑=清空重建（幂等） |
| 并发第二会话 | EXPORT_BUSY 拒绝+按钮 disabled |
| 导出中用户导航离开设置页 | 流不中断（监听在 App 层）；完成/失败 toast 常驻可见 |
| renderer 逐页回传 | 每页一 invoke，await ack 后发下一页（天然背压，无大 payload 整块） |

## 7. 下一步

1. P7-B 收官三步（TABS-04 → UNDO-01 → e2e 三序列+收官报告）——交接书任务一，本场
   未动实现面，仍为主线首站。
2. P7-C 工单化（装配单源条款随 R12 写入头注）→ SR2-AI-01~05 逐单（母本=ai-module-plan
   v1.1 + 本报告 §5/§6）。
3. C1→ADR-0010（空号预留确认）；push 决策留用户（领先 23 提交）。
