# ROADMAP —— 后续阶段规划（2026-08-21 制定）

> 本文是**阶段编排层**：只做顺序/依赖/验收，不是第二份工单真相源。
> 执行单元永远是 `tickets/registry.ts` 里的工单（领单流程见 `docs/DEVELOPMENT.md` §2）；
> 本文与 registry 冲突时以 registry 为准，并回来修本文。
> 每个 Phase 收尾时更新本文的勾选状态。

## 当前基线（制定时快照；2026-08-21 架构修复轮更新）

- 工单：72 = infra done 17 + open 55（weak 52 / strong 3）
- 防线：`npm run verify` 全绿（已并入 quality / tickets / locks 三关，与 CI 同口径）；81 受锁文件
  （本轮扩容：playwright / electron.vite / tsconfig×3 入锁）
- CI：workflow 已按生产标准就绪（本轮已修：触发分支 main 对齐、尾注检查基线兼容
  push 事件），**尚未推送通电**（教训 E1）——Phase 0 剩余动作仅为提供远端并 push
- 加固轮硬约束（LF 纪律 / preload CJS / CSP 单源 / redirect 禁跟随等）已沉淀在
  `docs/architecture.md`、`AGENTS.md` 与代码/测试本身，勿回退

---

## Phase 0（收尾）：CI 通电 ☐

| 项 | 内容 |
| --- | --- |
| 任务 | 用户提供 GitHub 远端 → push → 确认 Actions 六关卡真实跑绿 |
| 验收 | CI 两次连续绿（初始 push + 任一后续提交） |
| 备注 | 在此之前不要开始 Phase 1——防线没通电前填充，等于回到 Synapse 老路 |

## Phase 1：数据基座（repos）☐

| 项 | 内容 |
| --- | --- |
| 工单 | SR-DB-01 ~ SR-DB-05（5 个，weak，可并行） |
| 目标 | 五张仓储全部真实实现，guardedDescribe 延期的 repo 测试全部激活转绿 |
| 验收 | ① `npm run verify` 绿；② 抽查：搜索走 trigram FTS（≥3 字）+ 短词 LIKE 兜底（`%`/`_` 已转义）；③ 全部 SQL `db.prepare` 参数绑定 |
| 风险 | papers.repo 规约最重（FTS 联查 + 分页 + 排序），注意 repo ≤300 行机检——超了拆映射函数不是拆文件 |
| 依赖 | 无（schema/fts.ts/migrate 已就绪） |

## Phase 2：导入闭环（第一条可用链路）☐

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

## Phase 3：阅读器（含决策门）☐

| 项 | 内容 |
| --- | --- |
| 前置 | ① **Electron 升级门**（ADR-0006 修订版：升级至当期支持线，清单见上节）② pdf.js spike 决策门（`docs/adr/0002`：验证 pdfjs-dist 4.10.38 的 canvas 渲染 + getTextContent 路线在本项目可行，产出结论修订 ADR-0002 状态） |
| 工单 | strong：SR-RDR-01（annotation-anchor 纯函数）、SR-RDR-02（PdfCanvas）、SR-RDR-03（TextLayer）；weak：SR-RDR-04 ~ SR-RDR-09 + SR-SVC-02（reader.service）+ SR-IPC-02（12 个） |
| 目标 | 双击文献打开阅读器；翻页/缩放/目录；文本可选择（为 Phase 4 标注铺路） |
| 验收 | **`tests/e2e/reader-text.spec.ts` 激活并转绿**（依赖工单 AND 条件已接线：SR-RDR-02 + SR-LIB-01 + SR-LIB-02 + SR-RDR-04）——这是"文字真实可见"的最终裁判 |
| 风险 | pdf.js worker 的 CSP 已放行（worker-src blob:）；canvas 高分屏 devicePixelRatio 处理在 spike 里验证 |
| 依赖 | Phase 2 |

## Phase 4：标注与笔记 ☐

| 项 | 内容 |
| --- | --- |
| 工单 | SR-RDR-05（SelectionLayer）、SR-RDR-06（AnnotationLayer）、SR-SVC-10（notes.service）、SR-IPC-03（notes ipc）、SR-NOTE-01/02（6 个；annotations repo 已在 Phase 1、reader ipc 已在 Phase 3 完成） |
| 目标 | 划选文本 → 高亮/下划线/批注，重开应用后标注按 quote+prefix+suffix 锚定恢复；笔记面板 Markdown 编辑（textarea，不做富文本——负面清单） |
| 验收 | ① 对应锁定测试绿；② 手动视检：改窗口大小后标注位置仍正确（锚定纯函数的核心价值）；③ 标注随删除文献级联清库（已有级联测试） |
| 风险 | WADM 锚定是项目最难的纯函数模块（SR-RDR-01，strong）——它排在 Phase 3 头部做，失败早暴露 |
| 依赖 | Phase 3 |

## Phase 5：标签 / 集合 / 详情 / 增强 / 导出 / 设置 ☐

| 项 | 内容 |
| --- | --- |
| 工单 | 标签链：SR-SVC-09、SR-IPC-04、SR-TAG-01~03；详情与筛选：SR-LIB-04/05；增强链：SR-SVC-05、SR-NET-01~03、SR-IPC-06；导出链：SR-SVC-06/07/08、SR-IPC-07；设置与系统：SR-SET-01/02、SR-IPC-08/09；UI 基建（按需先做）：SR-UI-01~03、SR-HK-01/02（共 21 个） |
| 目标 | 全部剩余 weak 工单清零；55 → 0 |
| 验收 | ① registry 无 open 工单（check-tickets 输出 open 0）；② 手动视检：BibTeX 导出可被 Zotero 导入、读书报告含高亮与笔记、设置页网络诊断显示三 host 探活结果 |
| 风险 | 增强是唯一出网功能：手动触发（负面清单禁后台任务）、白名单 3 host 已锁死；导出文件名安全化规约必须遵守 |
| 依赖 | Phase 2（标签/详情可与之并行）；增强/导出依赖 Phase 4（要读到标注笔记） |

## Phase 6：打包分发 ☐

| 项 | 内容 |
| --- | --- |
| 前置 | 复核 Electron 版本仍在支持线（升级已在 Phase 3 前完成，见 ADR-0006 修订版） |
| 任务 | electron-builder 配置（NSIS）、图标、安装包冒烟（干净虚拟机装一次） |
| 验收 | 安装包在无开发环境的 Windows 上：装→导入→阅读→标注→导出 全链路可用 |
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
