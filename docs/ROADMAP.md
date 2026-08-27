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

## Phase 7+（v2 蓝图——**B3 已裁决 2026-08-23**，工单化经 B4 防线入场）

> 素材与实证：`docs/reports/2026-08-23_v2-blueprint-b1.md`（B1 只读清点：用户 2026-08-23
> 验收反馈一手素材 + 需求-现状 file:line 映射 + 负面清单 12 项甄别表 + 技术债六对策）。
> 本节是编排层草案，只定 顺序/依赖/验收骨架；工单级规约（状态机前置 + 错误反馈两型
> 条款）在用户裁决范围后经 `npm run ticket:new` 生成。反馈要点：v1 无功能性缺陷回报，
> 需求为 WPS 范式六组 + 北极星愿景（笔记=AI 传感器，提炼结构化语料）。

### 建议顺序与依赖

主线 **P7-A → P7-B → P7-F → P7-C → P7-G → P7-H**（依赖链：标注菜单是「添加笔记」入口；tab 是灰点载体；
连续滚动先定几何模型——笔记跳转/锚定一次到位；C 消费 A/B/F 的接缝；G（AI 传感器链条，2026-08-25
增量裁决+第四轮扩容 AI-01~10）消费 C 的语料面与装配规约——P7-F 与 G 零依赖可穿插；H（发展脉络图）
消费 G 的 AI 语料面与 C 的锚点定位服务）；**P7-D** 并行
（token 变量集在 C 开工前铺完即可，玻璃战役（P7-D 本体）放主线后段）；**P7-E** 按价值穿插。
排序兼取风险递增（先低风险高感知，建立反馈循环）。
> **执行实况注记（2026-08-26）**：C 已先于 F 落地（✅）——依据 N1 增补块
> 「P7-F 先后皆可、接口按 F-aware 设计」裁决。F 的消费接口随之冻结：定位=
> `anchor-locate.ts` locateAnchor 签名（P7-F 只换滚动步实现）；片段序=
> `annotation-order.ts` 文档序语义（与渲染几何无关）。F 仍未做，属主线遗留位。

### P7-A：阅读器交互基建 ✅（2026-08-24，工单 4/4 + e2e 验收；战役报告 docs/reports/2026-08-24_p7a-campaign.md）

> 提交区间 ec4ab42→fdd83e9（前置 a1e1822 防线/e364ea0 工单化/c5a2e98 规则4b）。
> 交付：ctrl 滚轮缩放（绑 onZoom 管线）/ctrl+c 复制（含剪贴板写权限最小放行修复——
> e2e 实锤集成缺陷）/翻页键位映射表（P7-F 语义迁移落点）/标注四选项菜单（编辑器
> 经「添加笔记」触发）/SplitPane 可拖拽分隔条（宽度持久化，main-null 稳定子位模式）。
> INV-14 输入接缝三面全锚（31 用例）；登记册/INV-14 行已回写。

| 项 | 内容 |
| --- | --- |
| 内容 | ctrl+滚轮缩放（绑现有 onZoom 管线）；ctrl+c 复制补偿（无菜单 Electron 应用的系统快捷键缺位，经 keymap 显式接管）+ 复制文本层选中文本；ctrl+v 语义限定为编辑框焦点下的原生粘贴透传（keymap 不拦截）；标注点击四选项菜单（复制引文/删除/添加笔记/取消——现为直开编辑器，改菜单触发）；侧栏 pane 分隔条拖拽（宽度持久化） |
| 价值 | 常规操作归位（用户点名）；「添加笔记」入口路径；感知成本最低 |
| 依赖 | 无——全部挂现有机制（zoom 管线/文本层/标注层） |
| 风险 | 输入接缝分散 → keymap 单例集中注册（成对注销），新不变量预登记；keymap 对 input/textarea 焦点避让（不拦截原生编辑快捷键——衔接 P7-C textarea 原生 undo 决策）；剪贴板仅 renderer 本地 API 不出网 |
| 验收 | keymap 成对注册锁定用例；菜单四出口分支锁定用例；e2e 断言缩放/复制可见效果；手动视检跟手度 |

### P7-B：多标签页 + 同步状态投影 ✅（2026-08-25 收官，工单 5/5——TABS-01/02/03 前役 + TABS-04/UNDO-01 收官役；e2e 三序列（换/关/退含 error 场景）全绿，INV-15/22 装配级收口升已锚定，INV-23 新登记；战役报告 docs/reports/2026-08-25_p7b-campaign.md）

| 项 | 内容 |
| --- | --- |
| 内容 | 阅读视图内 tab 栏（单窗口多文献，WPS 范式）；reader.store 重构 per-tab 状态字典；tab 灰点=未落库/保存失败投影（deriveSaveStatus 语义延伸）；关闭脏 tab 与退出应用时提示；标注操作级 undo 栈 |
| 价值 | 多文献快速切换；状态诚实可见到 tab 粒度 |
| 依赖 | P7-A（输入接缝先收口） |
| 风险 | 全案最高——reader.store 状态形状重构，宪法状态机前置（tab 生命周期态空间+跨格序列先交审计，U2 教训）；灰点不得引入手动保存模式（autosave-first 保数据安全，显式指示保可见性）；退出提示经 main 侧窗口关闭拦截（close preventDefault + 二次确认，新 IPC 通道走 preload/window.api 分层）——该拦截行为属「单窗口多标签」解释的一部分，随 B3-问2 一并确认 |
| 验收 | 态空间表+跨格序列用例（换 tab/关 tab/退出三序列 e2e）；undo 栈锁定用例；旧 reader 用例全量兼容 |

### P7-F：连续滚动阅读（用户 2026-08-23 补充需求点名，自 P8+ 池升级）

| 项 | 内容 |
| --- | --- |
| 内容 | 阅读器由逐页翻页改为纵向连续滚动（页面列渲染+视口内懒渲染/离屏回收）；阅读进度按滚动位置回写与恢复；缩放/适应宽度在滚动模型下重定义；标注层/文本层/划选层随滚动几何重锚 |
| 价值 | 论文连续阅读，不靠缩略图翻页（用户点名）；长文献阅读体验质变 |
| 依赖 | P7-A（快捷键/缩放接缝先收口——翻页键位语义迁移的承载层）、P7-B（per-tab 状态骨架先定，滚动状态改内容不改形状） |
| 风险 | 架构级四层重定义（docs/reports/2026-08-23_defect-campaign.md §6 暂缓存档的同一项）——渲染管线/页 canvas 内存回收/进度语义/锚定几何；宪法状态机前置（滚动位置状态机+跨格序列先交审计）；滚动位置/进度回写/锚定几何的跨模块不变量按宪法预登记 docs/invariants.md |
| 验收 | 离屏回收断言（视口外页 canvas 数上限，阈值随工单态空间表定）；进度回写/恢复 e2e；既有标注重开原位用例全量兼容；翻页键位语义迁移纳入 keymap 映射表锁定用例 |

### P7-C：笔记结构化重构（AI 语料核心） ✅（2026-08-26，工单 6/6 + 收官 e2e；战役报告 docs/reports/2026-08-26_p7c-campaign.md）

| 项 | 内容 |
| --- | --- |
| 内容 | 阅读器侧栏三栏并列（目录/缩略图/笔记）；片段笔记=标注锚定（引文+记录），排序 sortKey（"页码:序号"）→createdAt；双层概念裁决落地（α 片段+总评 / β 统一，见 B3-问1）；每篇 md 语料导出（front-matter 元信息+引文块+笔记，DB 真相源+md 投影）；笔记编辑 UI 收敛到阅读器侧栏——库侧 NotesPanel 编辑面随之下线（「方案切换=删除旧方案」红线，具体迁移路径随 B3-问1 裁决定案） |
| 价值 | 北极星：结构化语料=AI 传感器；「容易验证」由 golden+结构断言保障；导出即 AI 可读 |
| 依赖 | P7-A（菜单入口）、P7-B（多 tab 下笔记状态归属）、P7-F（滚动几何先定，跳转定位一次到位） |
| 风险 | 两套笔记概念并存=宪法「方案切换」红线，裁决必须先行；001 已冻结演进只能新增迁移；notes.store 五模块（ADR-0008）扩 per-tab 面须防状态机坍缩；灰点状态归属随 B3-问1 显式化——α 覆盖 annotations.comment 与 notes 两写面、β 投影 annotations.comment 单写面 |
| 验收 | 排序不变量（文档位置序+同段创建序）锁定用例；md 导出 golden+机器可读结构断言；FTS 连续性回归；跨文献语料集合导出手动视检；textarea 焦点下原生 undo/redo 可用性视检+keymap 避让专项用例（衔接 P7-A） |

> **N1 增补（2026-08-25 蓝图 §4.3）**：阅读器笔记↔标注双向单击定位——侧栏笔记条目
> 单击→阅读器定位标注（滚动+闪烁）；标注单击→既有四选项菜单+侧栏同步高亮（方案a）。
> 交付共享「锚点定位服务」（三层防线=quote 重锚→anchor_page 页级降级→仅开篇，
> INV-20 单入口；P7-H 跳转复用）。工单化时并入 C 组或紧随其后小单（工程自决）；
> P7-F 先后皆可，接口按 F-aware 设计。

### P7-G：AI 传感器链条（B3 增量裁决 2026-08-25——用户连续裁决 D1-D6+七问 v1，方向已定）

| 项 | 内容 |
| --- | --- |
| 内容 | 应用面（被动传感器）：ai_notes 独立表（自持锚定三元组）/全文+图提取管线（renderer pdfjs 单点→IPC 流→main 落盘）/语料导出五件套（ADR-0011 契约）/设置页导出入口；工具面（tools/ai-sensor/，主动消费端）：zcode 技能+三模型可配+断点续跑队列+七问提示词（实验迭代资产不走工单）。三读/梳理管线本体属提示词工程，工程化边界止于骨架与契约 |
| 价值 | 北极星落地：读文献（全量三读建档）+梳理领域（四类核心贡献时间线）两模式；锚定型 AI 语料=幻觉接地；含金量指标（代理度量） |
| 依赖 | P7-C（笔记结构化=用户语料面与 corpus 装配规约来源）；P7-F 无关可穿插 |
| 风险 | 提取管线跨进程接缝（事件桥首个双向协作面）；导出幂等 sha 口径；AI 语料不污染 annotations（独立表裁决的彻底化）；零 LLM 出网/零新依赖红线 |
| 验收 | 工单序列 SR2-AI-01~05（技术路线=docs/reports/2026-08-25_ai-module-plan.md **v1.1**）：repo 单测/提取管线多页夹具断言/导出 golden+结构断言（ADR-0011 **v1.1** 口径）/e2e 全链/queue 幂等测试；蓝图 B0 §4.1 裁决记录+§4.2 七问 schema 为规约来源 |

> **2026-08-25 计划审查定稿（v1.1）**：七项未定义特性闭合（pdfjs import 白名单化/
> 事件桥单向化——回传走常规 invoke/Extractor 自持文档生命周期/manifest 终局单写+
> 清空重建+单飞/front-matter 去 exportedAt 保幂等 sha/figures 定全页快照/[ai:*]
> 装配入 v1 且 v1 无生产者显式声明）；INV-16~18 预登记；导出会话状态机表就绪
> （AI-02/03 工单头注母本）。审查与裁决实录=docs/reports/2026-08-25_ai-plan-review.md。

> **执行实况注记（2026-08-27）**：应用面第一批工单化完成（1516a97——SR2-AI-01~05
> 五张票面过 deepseek plan 门 r2 PW+GLM 二审；状态机迁移表/载荷 schema/目录隔离
> 守卫/幂等范围/断点语义边界全数入票面）。**SR2-AI-01 ✅**（222962c——迁移 003+
> repo 六方法+AiNote 单源契约+INV-25 级联语义登记已锚定；TDD 红证 8/8）。
> **SR2-AI-02 ✅**（102df65——CorpusExtractor 四态迁移+背压+裁剪数学+真 pdfjs
> 集成用例；ESLint pdfjs 白名单 INV-16 翻已锚定（lint 实证拦截 R1 漏扫的
> OutlinePanel/OutlineThumb 类型直连）；IPC 契约（corpusItem 通道+exportCorpus
> 事件单向）落地；事件载荷两处契约修正（annotations 随发+rect.page 单源）。
> verify 68 文件 399 用例）。下一单 SR2-AI-03（票面已就位——**注意：母本的
> export/corpus 通道名已被 C-02 单篇导出占用，五件套会话通道须更名
> （如 export/corpus-session）**，随 AI-03 实现简报记录）。

> **SR2-AI-03 ✅**（2026-08-27 c9ea6ec——五件套会话状态机全表落地：manifest
> 终局单写 tmp+rename/清空重建（目录根用户文件不动）/单飞 EXPORT_BUSY/幂等
> （范围=产物文件）/corpusItem 流式消费+路径穿越消毒/corpusSet 目录隔离守卫/
> orderAiNotes 装配延展（R12 单源内）/INTERFACE.md 静态单源；通道更名
> corpus-session 落地；INV-17/18 翻已锚定（INV-18 e2e 面随 AI-04）；双门
> r1 FAIL（1B 证伪+1B 采纳）→r2 PW 全处置→GLM PASS；verify 69 文件 409
> 用例）。下一单 SR2-AI-04（票面已就位；AI-02 的会话超时兜底观察项随其
> e2e 评估）。

> **SR2-AI-04 ✅**（2026-08-27 5310975——设置页导出节三件套（store 进度态
> 单源投影/useExportCorpusEvents App 层事件桥——INV-14 成对清理+终局 toast
> busy 变化沿 R14/CorpusExportSection 单飞 disabled）+**e2e 受锁新 spec：
> pdfjs render→canvas→PNG 渲染面首次真环境覆盖**+INV-17/18 e2e 面+INV-14
> 扩面（事件订阅同族）；**e2e 首跑即抓出 AI-03 两处真缺陷并修复**：①
> preparing 源文件判定 fileRefById 全路径（PaperDetail.fileName 是基名丢目录
> 层——单测桩恒等映射不可达面）②deferOutcome 篇终局推进延后至 invoke 回复
> 后（处理器内同步发下一篇 extract-request→事件先于回复→提取器防御分支丢
> 请求→串行链死锁——时序契约入 INV-18 补条）；超时兜底观察项裁决=v1 进程组
> 同死语义可接受（报告 §2.3）；双门 FAIL 轻量→全处置→GLM PASS；verify 70
> 文件 426 用例+e2e 13/13）。

> **SR2-AI-05 ✅ → 应用面第一批全役收官**（2026-08-27 9fea57e——queue.mjs
> 纯函数三件（diff/幂等/断点续跑六用例 vitest 宿主）+IO 骨架（planSession
> 激活判据/markDone 原子写）+CLI+SKILL.md+config.template+prompts×4+README；
> 零 npm 依赖零出网；门一 PW（W1 readJson 三态分离——损坏静默重置实锤修复）
> →门二 11 探针终审 PASS+N-新1 undefined 哨兵随手修；verify 71 文件 432
> 用例+locks 110+工单 94 open 0。**AI-01~05 五单全役 ✅**——战役报告=
> docs/reports/2026-08-27_ai-campaign.md（交付清单/双门战绩/随手验清单/
> 教训七条/手动视检留用户清单）。第二批 AI-06~10（ADR-0015 回灌与联动组）
> 票面未工单化按增容节顺排。）

> **第四轮裁决增容（2026-08-25 蓝图 §4.3，ADR-0015）——SR2-AI-06~10 回灌与联动组**：
> 06 伴随进程文件协议（pending job/status+心跳/产物 corpus-ai——应用零 LLM 出网
> 保持，E1=B'）；07 回灌导入器（ai-notes/import+list 通道 [locked-change]，幂等，
> 工具永不写 DB——「v1 无生产者」声明就此解除）；08 笔记面板 AI 面（[ai:*] 分节
> +七问分色+只读+「AI 正在读」状态行+「AI 读文献」按钮=写 job）；09 AI 标注渲染
> 对等（重锚入标注层同管线/存储独立/v1 只读/三层防线验收条款，INV-19/20）；10
> 设置页 zcode 联动（发现+一键装技能+心跳三档，**不代启会话**，INV-21）。依赖：
> 06→07→08∥09；10 依赖 06。ai_notes DDL 增 question 列（一行一锚定段，N2）并入
> AI-01。密钥留工具侧 config.json（E7）；D utilityProcess 自含方案记 P8+ 升级候选。

> **SR2-AI-06 ✅**（2026-08-27 c2bfc4f——三屋模式试点首单：主控派发/实现者子代理 TDD/双门孙代理审计。
> 应用侧 createAiSensorService 五方法（幂等 job 原子写/心跳新鲜度单源 10min/
> 三态分离）+工具侧 companion.mjs 会话壳（拾取/--beat/--deliver 四步序，
> **INV-26 入册：移除 job 以产物落盘为前提**）+IPC 两通道挂 export_ 域
> （corpusItem 同型）+SKILL.md companion 模式改写+平台路径表。TDD 四档
> （red→green→变异红证→verify 73 文件 452 用例 exit 0）；双门 0B/3W/13N
> →回炉 1→门二 PASS；试点数据与模式评估=v7 交接书 §4。下一单 AI-07
> （域归属口径预裁决随 v7 §3）。）

> **第二批工单化完成（2026-08-27 闲时会话，双门 plan 门）**：SR2-AI-06~10 五张
> 票面（门一对抗深审 B3/W9/N6 全处置→门二终审 6 点文本返工后复核 PASS——存档
> scripts/audits/ai-batch2-ticketing.*）。plan 门要点：06 failed 态消解=「移除
> job 以产物落盘为前提」协议不变量（ADR-0015 §1 字面）；07 幂等=archive 账本
> sha 去重（前提两机器事实登记票面）；08∥09 细化为 **08→09 定序**（09 硬依赖
> 08 交付 ai-note-style+ai-notes.store）；10 撤协议目录路径展示（renderer 绝对
> 路径零先例——发现机制归 06 SKILL.md 平台惯例路径文档）。执行序 06→07→08→
> 09→10 串行领取逐单提交；首单 AI-06 实现待开工（状态机表+协议不变量已入票面）。

> **批二收官 ✅（2026-08-27 8be7f91/fb53e63/78e4b5d/58986be——三屋模式四连单，
> 全役报告=docs/reports/2026-08-27_ai-campaign-batch2.md）**：
> **SR2-AI-07 ✅**（8be7f91——前置步=ai_sensor 域迁移：API_SURFACE 新立域，
> 06 两通道自 export_ 迁入（通道名不变）+契约测试十域穷举；回灌导入器三路径
> 幂等（archive 账本 sha256 首导/跳过/清面重灌）+部分成功三桶；「v1 无生产者」
> 声明解除。门一 0B/2W→门二 PASS）。**SR2-AI-08 ✅**（fb53e63——实现者 BLOCKED
> 上报→主控三分法预裁：新立 **ai-sensor/observe 第五通道**（per-paper 四事实
> 聚合，六态判定单源；aiStatus 保持现状）；六态状态行+跨格序列①③⑤用例+七问
> 分色单源 ai-note-style+ai-notes.store 新 store（notes.store 零触碰）；e2e
> 受锁新 spec 14/14；门一 0B/0W/9N 首次零回炉）。**SR2-AI-09 ✅**（78e4b5d——
> verifyQuote 重锚同几何管线（唯一 DOM 遍历点不另写几何）/anchor-locate exact
> 层扩 [data-ai-note-id]（INV-20 三防线结构不动）/notifyAiNoteHighlight 反向
> 同步（C-05 同型）/INV-19 annotations 写面 diff 级零触碰；e2e 15/15）。**
> SR2-AI-10 ✅**（58986be——detect 五态+一键装技能纯 fs 零进程（INV-21 登记册
> 锚定+e2e 纯 fs 断言）+zcode-link/detect+install 挂 ai_sensor 域+extraResources；
> 门一 2W 触宪法「每测试须能失败一次」→**回炉 1 轮**（两用例补前置事实断言+
> R1 占位还原自验红）→复核 ADDRESSED→门二 PASS）。终态基线：verify exit 0
> （**79 文件 520 用例**）+e2e **16/16**+locks **121**+工单 99 open **0**
> （批二五单全清）。P7-G 全域完成——下一阶段 P7-H（脉络图）。

> **P7-H 工单化完成（2026-08-27 主会话，双 plan 门）**：SR2-LG-01~05 五张
> 票面（门一对抗深审 0B/4W/9N→回炉文字级修补→复核 W1~W4 全 ADDRESSED→
> 门二终审 PASS 六点清单空——存档 scripts/audits/lg-ticketing.*）。plan 门
> 要点：INV-27 树单父不变量宿主=LG-01 service 写面（导入校验+upsertEdge
> 运行时守卫双口，03 只接线）；导入=全有或全无替换式+确认对话框（草稿整图
> 语义）；lineage 域立域（契约测试 11 域穷举 [locked-change]）；写四通道
> schemas 注册归 03；退出聚合=App 组合根 ∪ 扩+INV-22 随 03 扩面+tab-dirty
> 仅 stale 声明行更新；LG-04 直连 ai_notes/list 依据=跨域互引红线；LG-05
> e2e 双条件守卫（依赖∪自身）+主控收口亲验恒真占位替换。基线：verify
> 79 文件 520 用例/locks 122/open 5。执行序按号串行逐单提交。

### P7-H：发展脉络图（2026-08-25 E3/E4/E5 裁决立项——蓝图 §4.3、ADR-0014）

| 项 | 内容 |
| --- | --- |
| 内容 | 新顶层视图「脉络」：时间树画布（y=年份分层，x=Reingold-Tilford tidy tree 零依赖手写；SVG+pan/zoom INV-14）；节点=文献卡片（简要信息+核心 idea）或纯主题节点；边=策展逻辑线（梳理智能体 lineage JSON 草稿导入+人工修订）；节点单击=侧板详情（元信息+核心 idea+AI/人工笔记，N3）；笔记双击=锚点定位服务跳阅读器（INV-20 三层防线，与 N1 共享单入口）；手工拖拽位置/加删边/改父+自动保存（语义同标注/笔记，INV-04 同型；退出拦截聚合面扩接缝） |
| 价值 | 领域梳理的可视化消费面——北极星「梳理领域」模式的输出落地（四类核心贡献时间线的人工策展形态） |
| 依赖 | P7-G AI-06~10（节点核心 idea 来自 AI 语料+笔记数据面）；P7-C N1 锚点定位服务；P7-F 几何（F-aware 接口，先后皆可） |
| 风险 | 零新依赖红线下自研布局与画布交互（RT 布局纯函数化保可测性）；树约束不变量（service 层+单测）；手工编辑自动保存态空间（宪法状态机前置）；跨支 DAG（Sugiyama-lite）留 v2 升版条件=真实多父诉求 |
| 验收 | 工单序列 SR2-LG-01~05：lineage 模型+导入（迁移 004，ADR-0014 DDL）→布局纯函数+SVG 画布→节点/边交互编辑+自动保存+退出聚合扩面→侧板详情+双击跳转→e2e 全链（浏览/编辑保存/跳转） |

### P7-D：玻璃质感 UX 战役（可与主线并行）

| 项 | 内容 |
| --- | --- |
| 内容 | theme.css token 体系扩展（材质/动效时长/缓动变量）；玻璃质感实现（backdrop-filter 等）；微交互反馈体系（toast 基础上补按钮/保存/切换反馈）；主题三选接线（既有预留） |
| 价值 | 用户点名观感与行为反馈；token 体系是 B/C 的消费基座 |
| 依赖 | 无硬依赖；若 B/C 消费其 token 则先行铺变量集 |
| 风险 | hardcoded style 散落=INV-11 同型债 → 变量单源+轨道 C lint 覆盖；backdrop-filter 大面积性能 |
| 验收 | 变量单源断言；主题切换 e2e；缩放/翻页跟手度目视；反馈态可枚举（每交互有可见响应） |

### P7-E：预留点清扫（12 处预留清单+1 处负面清单确认，见 B1 报告 §3，按价值穿插）

建议内序：标签生命周期（改名/合并/删除）> 拖拽导入 > 页内高亮搜索 > 导出剪贴板 >
阅读时长统计 > 标签多选过滤 > 智能排序 > 其余。逐项价值/依赖/风险/验收在工单化时补全——须给
来源出处（用户反馈条目或代码预留点），无出处默认不工单化。标签多选过滤/智能排序源于代码预留点
（TagFilter.tsx:6 / library.service.ts:20），价值=多标签体系查询完整性（非用户点名）。

### P8+ 候选池（不在 Phase 7 讨论）

enrich 交互式重试预算；安装包体积优化；RIS/EndNote；跨文献引用关系
（负面清单「知识图谱」边界内：线性列表/标签/集合/md 语料承载，明确不做网络图可视化；
**数据模型已占位裁决「暂不做」——ADR-0012，条件复审**；2026-08-25 E5 辨析：复审
条件已触发但对象不同——自动引文图维持不做，人工策展 lineage 时间树另立 ADR-0014/P7-H，
负面清单措辞已随修）；
**AI 传感器链条（北极星愿景本体，2026-08-25 升格为「规划中候选」**——用户
确认下一方向；蓝图=docs/reports/2026-08-25_ai-sensor-blueprint.md：zcode 编排→
领域梳理子智能体→每篇三孙智能体（deepseek 一读/GLM 二读/GLM 思辨裁决）→
锚定型 AI 语料池；五项待裁决 D1-D5（分层读法/裁决构成/语料数据模型/履历
搜索定位/脉络形态）裁决后工单化；接口契约=ADR-0011 md 语料 v1；实施前置=
P7 主线收官）。

愿景范畴声明（2026-08-25 更新）：「分析文献/串联领域」= **zcode（AI 编码
代理）-软件工具接口-文献文本+笔记**的传感器链条（用户 2026-08-23 定位、
2026-08-25 细化）——已从「先规划不实施」升级为「规划已固化（蓝图 B0），
实施待 D1-D5 裁决与 P7 收官」。

### 治理占位（2026-08-25 补档）

- md 语料接口契约 v1：ADR-0011（P7-C 验收细目来源+AI 消费面）。
- 备份/恢复姿态：ADR-0013（不做自动机制+手动指引；条件复审快照导出）。

### B3 用户裁决（已裁决 2026-08-23——本节即裁决指针，v2 工单头注引用此处）

1. **笔记双层概念** → **α**：片段层（标注锚定）+总评层（论文级综述）。用户实测佐证：总评
   触发路径藏于库侧详情面板（PaperDetailPanel.tsx:190「打开笔记」按钮 → :211 NotesPanel），
   阅读器内不可见故人工测试未发现——α 迁移阅读器侧栏同时修复可发现性。
2. **「多窗口」负面清单边界** → **确认**：单窗口多标签为 v2 合法解释；退出保存拦截
   （main 侧 close preventDefault + 二次确认）随此一并生效。
3. **md 存储形态** → **DB 唯一真相源 + md 投影导出**。
4. **排期取舍** → **授权工程侧自决**（按既定工程规范执行）；「分析/串联」先规划不实施
   （见 P8+ 愿景范畴声明）。
5. **补充需求**：连续滚动阅读（2026-08-23）→ 立项 P7-F，主线修订为 A→B→F→C。

**B4 工单化机器防线（首步前置，防绕过停点）**：v2 前缀工单入 `tickets/registry.ts` 前须在
工单头注携带 B3 裁决记录指针；未裁决时 check-tickets 拒绝 v2 工单登记（机制实现随 B4 首提交
落地，涉受锁脚本走 [locked-change]）——B3 停点不止于文档文字。已裁决范围内新增/变更候选
须 B3 增量裁决（用户确认）方可入场，预留点不得在工单化阶段任意加塞。**防线落地前的过渡
禁令**：check-tickets 拒绝机制实现（即 B4 首提交）之前，任何 v2 特性工单仍禁止入场——
防线实现单元先于一切 v2 特性工单。

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
