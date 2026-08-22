# ROADMAP —— 后续阶段规划（2026-08-21 制定）

> 本文是**阶段编排层**：只做顺序/依赖/验收，不是第二份工单真相源。
> 执行单元永远是 `tickets/registry.ts` 里的工单（领单流程见 `docs/DEVELOPMENT.md` §2）；
> 本文与 registry 冲突时以 registry 为准，并回来修本文。
> 每个 Phase 收尾时更新本文的勾选状态。

## 当前基线（制定时快照；2026-08-22 Phase 6 收官轮更新）

- 工单：74 = done 74 + open 0——Phase 1~6 全部完成（1/2 于 2026-08-21，3/4/5/6 于
  2026-08-22）；打包分发链路就绪（npm run dist 产 NSIS 安装包 + npm run smoke:installer 冒烟）
- 防线：`npm run verify` 全绿（已并入 quality / tickets / locks 三关，与 CI 同口径）；85 受锁文件；覆盖率门槛三组已生效（全局 70 / repos 85 / renderer 逻辑层 60）
  （2026-08-22 起：playwright / electron.vite / tsconfig×3 入锁；toast.test.tsx 入锁；
  Phase 3 期间 tests/e2e/seed-paper.mjs 作为新测试基础设施入锁）
- CI：**已通电**（2026-08-21 push 至 github.com/yyx20040712/Synapse；首跑红于
  Node 20 缺 better-sqlite3 v12.11.1 预编译→已修为 Node 24，次跑全绿）。尾注检查
  基线兼容 push 事件（PR base sha / push before），manifest 变更关卡已真实拦截验证
- **Electron 升级门已过（2026-08-22）**：33.4.11 → **42.9.3**（支持线中位，ABI 146，
  better-sqlite3 维持 12.11.1——prebuild 矩阵核查结论见 ADR-0006 执行记录；
  运行时 audit 0 漏洞；升级时点验收 verify 全绿 + e2e smoke 3 绿，现 e2e **6 绿**
  ——reader-text 两测（渲染文本 + Phase 4 标注链后半：划选→高亮→重开原位→编辑→
  删除，位置断言归一 canvas 盒参照系），另有 IPC invoke 全链路与
  app-file:// fetch CSP 回归两道防线）
- 两轮系统性 Bug 检查已闭环（2026-08-22）：业务层 7 项修复 + 防线层加固（ABI 精确
  选择 / 键序无关解析 / guardedDescribe 绑定对账），取舍与地雷登记于 ADR-0007
- pdf.js spike 决策门已过（2026-08-22）：canvas + 官方 TextLayer 路线在真实
  Electron 42 上 13 项断言全过，ADR-0002 维持库 API 路线（结论与 Phase 3 实证输入
  见其文末）
- 加固轮硬约束（LF 纪律 / preload CJS / CSP 单源 / redirect 禁跟随等）已沉淀在
  `docs/architecture.md`、`AGENTS.md` 与代码/测试本身，勿回退

---

## 行动清单（2026-08-21 定稿；随执行滚动更新，完成后回写勾选）

1. **Phase 1（本日执行）✅**：SR-DB-01~05 五工单并行领单；repos 覆盖率门槛已收紧
   至 85%（实际 ~90%）。
2. **Phase 2（本日执行）✅**：纵切波次全部完成（含提前的 UI 基建 SR-UI-03/SR-HK-01）；
   e2e smoke 3 绿，导入→列表链路端到端可用。
3. **Phase 3 前置 ✅（2026-08-22）**：Electron 升级门已执行（33.4.11→42.9.3，
   prebuild 矩阵核查→ADR-0006 执行记录）与 pdf.js spike 已通过（13 项断言全绿→
   ADR-0002 决策门结论）。**Phase 3 工单解除封锁。**
4. **Phase 3（2026-08-22）✅**：9/9 工单清零（strong 3 + weak 6，含 SR-RDR-01/02/03
   三件套与 SR-SVC-02/SR-IPC-02/SR-RDR-04/07/08/09）；e2e reader-text 激活转绿
   （5/5）。期间两次锁定测试缺陷经 [locked-change] 修复（reader.service 测试桩漏
   updateReadPage；e2e 种子在 Playwright 进程内加载原生模块遭 Windows 自锁→子进程
   化落库）；PdfCanvas 三次契约演进（onDocInfo / onPageRender 载荷补 styles+lang /
   onDocReady），均随消费方同批送审。
5. **Phase 4（2026-08-22）✅**：6/6 工单清零（SR-RDR-05/06 标注链 + 笔记链四单
   SR-SVC-10/SR-IPC-03/SR-NOTE-02/SR-NOTE-01）；e2e reader-text 后半激活转绿
   （全套 6/6）。过程沉淀：annotation-anchor 契约演进一次（selectionToAnchor——
   划选→锚定三元组，probe-range 边界探测 [locked-change]）；首版 e2e 位置断言被
   人工复跑抓出约两成假阳性 flaky（跨 session 比窗口绝对坐标，窗口几何不逐像素
   一致）→ 修正为归一 canvas 盒参照系 [locked-change]——"恒绿和随机绿一样危险"；
   色板样式第 3 处消费触发 Rule of Three 抽取 annotation-style.ts。NotesPanel
   装配点随 SR-LIB-04（Phase 5）。
6. **Phase 5 收官 ✅（2026-08-22）**：23 工单清零 + DEVELOPMENT §4 两项覆盖率承诺兑现
   （a9bfe2e/0cafe84，三子代理流水线审计）+ e2e 6/6 + 收官报告 docs/reports/2026-08-22_phase5-closeout.md。
7. **Phase 6（2026-08-22）✅**：SR-PKG-01/02 开单（f5c0eda）→实现→双模型审计→收官（5520bd2/2ebe766）；三子代理流水线全程运转，审计四轮修复循环记录见 docs/reports/2026-08-22_SR-PKG-02.md。
8. 每 Phase 收尾：更新本文勾选 + architecture.md §7 图纸状态标注 + push 触发 CI。

---

## Phase 0（收尾）：CI 通电 ✅（2026-08-21）

| 项 | 内容 |
| --- | --- |
| 任务 | ~~用户提供 GitHub 远端 → push → 确认 Actions 六关卡真实跑绿~~ 已完成 |
| 验收 | CI 两次连续绿：首跑红（Node 20 无预编译，已修）→ 第二跑全绿 → 第三跑（本次 ROADMAP 勾选提交） |
| 备注 | 通电过程沉淀两个环境事实进 AGENTS.md：CI Node 必须 24（勿改回）；MinGit 走代理需 OpenSSL TLS 后端 |

## Phase 1：数据基座（repos）✅（2026-08-21）

| 项 | 内容 |
| --- | --- |
| 工单 | SR-DB-01 ~ SR-DB-05（5 个，weak，可并行） |
| 目标 | 五张仓储全部真实实现，guardedDescribe 延期的 repo 测试全部激活转绿 |
| 验收 | ① `npm run verify` 绿；② 抽查：搜索走 trigram FTS（≥3 字）+ 短词 LIKE 兜底（`%`/`_` 已转义）；③ 全部 SQL `db.prepare` 参数绑定 |
| 风险 | papers.repo 规约最重（FTS 联查 + 分页 + 排序），注意 repo ≤300 行机检——超了拆映射函数不是拆文件 |
| 依赖 | 无（schema/fts.ts/migrate 已就绪） |

## Phase 2：导入闭环（第一条可用链路）✅（2026-08-21）

| 项 | 内容 |
| --- | --- |
| 工单 | 纵切：SR-SVC-04（pdf-meta 纯函数）→ SR-SVC-03（import.service）→ SR-IPC-05（import ipc）→ SR-SVC-01（library.service）→ SR-IPC-01（library ipc）→ UI：SR-LIB-06 → SR-LIB-07 → SR-LIB-02 → SR-LIB-03 → SR-LIB-01（10 个，weak） |
| 目标 | 「点按钮选 PDF → 入库 → 列表可见」端到端可用 |
| 验收 | ① 全部对应锁定测试激活转绿；② `npm run dev` 手动视检：导入两份相同 PDF 验证去重提示（DUPLICATE_FILE）、导入非 PDF 验证拒绝（UNSUPPORTED_FILE）；③ 进度事件到 UI（ImportDropZone 订阅 apiEvents.onImportProgress） |
| 风险 | 导入进度推送已由 bootstrap 注入 services 桶——ipc 层不碰 sendProgress（SR-IPC-05 任务书已修正，按修正后的做） |
| 依赖 | Phase 1 |

## ✅ 已定案：Electron 升级门 = Phase 3 阅读器之前（ADR-0006 修订版）

- 阅读器是全项目唯一重度依赖 Chromium 渲染行为的模块，且其核心工单
  SR-RDR-01/02/03 是 strong 归属（训练数据顾虑最小）——在最终 Electron 上构建，
  省掉"升级后重验渲染"环节。
- 升级执行清单：目标版本选定（当期支持线）→ **先查 better-sqlite3 prebuild
  可用性**（无预编译则连带评估 better-sqlite3 升级）→ `ELECTRON_ABI_MAP` 补表 →
  全量 verify + e2e → ADR + [dep-change] 提交。未完成不得开工 Phase 3 工单。
- Phase 6 打包前仅需复核：版本仍在支持线（若期间又出了新的大版本线，按需小步跟）。

## Phase 3：阅读器（含决策门）✅（2026-08-22，工单 9/9）

| 项 | 内容 |
| --- | --- |
| 前置 | ① **Electron 升级门 ✅**（2026-08-22：42.9.3 落地，ELECTRON_ABI_MAP 补表 37~44，见 ADR-0006 执行记录）② pdf.js spike 决策门 ✅（2026-08-22：canvas+TextLayer+选择+DPR 13 项断言全过，ADR-0002 维持库 API 路线） |
| 工单 | strong：SR-RDR-01（annotation-anchor 纯函数）、SR-RDR-02（PdfCanvas）、SR-RDR-03（TextLayer）；weak：SR-RDR-04、SR-RDR-07 ~ 09 + SR-SVC-02（reader.service）+ SR-IPC-02（共 9 个；SR-RDR-05/06 属 Phase 4 标注链，勿在此实现） |
| 目标 | 双击文献打开阅读器；翻页/缩放/目录；文本可选择（为 Phase 4 标注铺路） |
| 验收 | **`tests/e2e/reader-text.spec.ts` 激活并转绿**（依赖工单 AND 条件已接线：SR-RDR-02 + SR-LIB-01 + SR-LIB-02 + SR-RDR-04）——这是"文字真实可见"的最终裁判 ✅（2026-08-22 首次真执行即绿，e2e 全套 5/5） |
| 结果 | 全部验收达成。过程沉淀：两个锁定测试缺陷 [locked-change] 修复（详见行动清单 4）；PdfCanvas 三次契约演进（onDocInfo / onPageRender 补 styles+lang / onDocReady）；TextLayer 官方 CSS 采用提取版（6 个 :root 块不引入，防主题泄漏） |
| 风险 | pdf.js worker 的 CSP 已放行（worker-src blob:）；canvas 高分屏 devicePixelRatio 处理在 spike 里验证 |
| 依赖 | Phase 2 |

## Phase 4：标注与笔记 ✅（2026-08-22，工单 6/6）

| 项 | 内容 |
| --- | --- |
| 工单 | SR-RDR-05（SelectionLayer）、SR-RDR-06（AnnotationLayer）、SR-SVC-10（notes.service）、SR-IPC-03（notes ipc）、SR-NOTE-01/02（6 个；annotations repo 已在 Phase 1、reader ipc 已在 Phase 3 完成） |
| 目标 | 划选文本 → 高亮/下划线/批注，重开应用后标注按 quote+prefix+suffix 锚定恢复；笔记面板 Markdown 编辑（textarea，不做富文本——负面清单） |
| 验收 | ① 对应锁定测试绿；② 手动视检：改窗口大小后标注位置仍正确（锚定纯函数的核心价值）；③ 标注随删除文献级联清库（已有级联测试）——①③ ✅；② 的等价路径由 e2e 重开原位断言覆盖（归一化矩形 0..1 相对页盒 + verifyQuote 显示级重锚），真机拖拽视检待随手验 |
| 结果 | 全部工单验收达成。过程沉淀详见行动清单 5；笔记面板（SR-NOTE-01）已完成待装配，消费方 PaperDetailPanel 属 Phase 5 |
| 风险 | WADM 锚定是项目最难的纯函数模块（SR-RDR-01，strong）——它排在 Phase 3 头部做，失败早暴露 |
| 依赖 | Phase 3 |

## Phase 5：标签 / 集合 / 详情 / 增强 / 导出 / 设置 ✅（2026-08-22，工单 23/23 + 收尾两承诺）

| 项 | 内容 |
| --- | --- |
| 工单 | 标签链：SR-SVC-09、SR-IPC-04、SR-TAG-01~03；详情与筛选：SR-LIB-04/05；增强链：SR-SVC-05、SR-NET-01~03、SR-IPC-06；导出链：SR-SVC-06/07/08、SR-IPC-07；设置与系统：SR-SET-01/02、SR-IPC-08/09；UI 基建（按需先做）：SR-UI-01/02、SR-HK-02（SR-UI-03/SR-HK-01 已提前于 Phase 2 完成）（共 23 个） |
| 目标 | 全部剩余 weak 工单清零；23 → 0 |
| 验收 | ① registry 无 open 工单（check-tickets 输出 open 0）；② 手动视检：BibTeX 导出可被 Zotero 导入、读书报告含高亮与笔记、设置页网络诊断显示三 host 探活结果——① ✅；② 读书报告/诊断单测与 golden 佐证 ✅，Zotero 导入与设置页目视留用户随手验（见结果行） |
| 风险 | 增强是唯一出网功能：手动触发（负面清单禁后台任务）、白名单 3 host 已锁死；导出文件名安全化规约必须遵守 |
| 结果 | 23 工单清零（最后一批 SR-SET-01/02 于 542ca4d）；收官兑现 DEVELOPMENT §4 两项覆盖率承诺（提交 a9bfe2e 全局 70 收紧 + 0cafe84 renderer 逻辑层 60 组，终态实测 77.35/88.97/81.21 lines）；e2e 6/6 绿；verify exit 0。审计与收官报告：docs/reports/2026-08-22_T2-coverage-threshold.md、docs/reports/2026-08-22_T2b-renderer-coverage.md、docs/reports/2026-08-22_phase5-closeout.md。留用户随手验三项（Zotero 导入/设置页诊断目视/真机拖拽标注视检）不阻塞 Phase 6 |
| 依赖 | Phase 2（标签/详情可与之并行）；增强/导出依赖 Phase 4（要读到标注笔记） |

## Phase 6：打包分发 ✅（2026-08-22，工单 2/2 + 自动化冒烟）

| 项 | 内容 |
| --- | --- |
| 前置 | 复核 Electron 版本仍在支持线（升级已在 Phase 3 前完成，见 ADR-0006 修订版） |
| 任务 | electron-builder 配置（NSIS）、图标、安装包冒烟（干净虚拟机装一次） |
| 验收 | 安装包在无开发环境的 Windows 上：装→导入→阅读→标注→导出 全链路可用——工单级 ✅（自动化冒烟：装得上/起得来/卸得掉，含注册表强断言）；原验收（干净机全链路）未闭合，留用户人工验收随手验（不阻塞收官） |
| 结果 | SR-PKG-01/02 清零（5520bd2/2ebe766）；产物 Synapse-Remake-0.1.0-setup.exe（113.5MB，asar 断言+绑定 sha256=electron-v146+打包应用启动验证过）；冒烟五次真跑全绿；审计报告 docs/reports/2026-08-22_SR-PKG-01.md、docs/reports/2026-08-22_SR-PKG-02.md。过程沉淀：上游 electron-builder#1298 空目录壳裁决（方案 a 规约对齐+加严断言，方案 b 钩子存档）；winCodeSign symlink 新机首跑需预置缓存（报告 §4）；体积优化项存档。留用户：干净机（无开发环境/虚拟机）装→导入→阅读→标注→导出全链路随手验 |
| 依赖 | Phase 5 |

---

## 执行纪律（每个 Phase 内不变）

1. 弱模型领单：registry 找 open+weak → 读文件头五层规约 + 对应锁定测试 → 只改该文件 →
   verify 绿 → 人工审查 → 翻状态（详见 `AGENTS.md` / `docs/DEVELOPMENT.md`）。
2. 一个工单一个 commit；受锁文件变更走 unlock → 改 → relock → `[locked-change]`；
   依赖变更 `[dep-change]`。
3. strong 工单（阅读器三件套）由强模型会话完成，不进弱模型队列。
4. 任何"防线要改"的冲动 → 停下报告人类（教训：不许删检查、不许放宽断言）。
5. 每 Phase 收尾：更新本文勾选与基线快照 + 提交。
6. 任务书规约三句（2026-08-22 系统性检查轮教训，写进新 store/service 工单的
   行为层）：store 异步动作用请求序号 stale-guard（旧响应不得覆盖新响应）；
   跨表/多语句写入必须经 `repos.withTransaction` 包裹；换查询/重载列表时清理
   selectedId 等派生选中态。
