# 架构与业务流程链条核查报告（2026-08-24，任务一）

> 依据：docs/prompts/2026-08-24_next-session-handoff.md 任务一（用户指令：接手 AI
> 必须先检查架构和业务流程链条，核查通过后才继续开发）。方法：分级阅读（清单内
> 文件）+ 只读 Explore 子代理主链证据收集（结论经主会话对照源码核实）+ 防线规则
> 活性违例样本实测。基线 HEAD = 689a1a8。

## 0. 核查结论（先给裁决）

**通过（6.5/7 环首尾相连），发现一处主链 UI 接线缺口**：BibTeX（及 CSV）导出
后端链完整但 renderer 无触发点——按任务书条款转双门修复单元处理后进任务二。
六面核查：机器基线 ✅ / 分层单向 ✅ / 业务主链 ⚠️（BibTeX 半条断链）/ 输入接缝
INV-14 ✅ / 防线规则活性 ✅（三样本全拦截）/ 安全面 ✅。

## 1. 机器基线 ✅

- `npm run verify` exit 0：quality（占位/乱码/跨域/行数/分层）→ tickets（78 工单
  open 0）→ locks（90 文件 sha256 一致）→ lint → typecheck → test
  **55 文件 281 用例全过**（vitest 终行口径，与任务书预期一致）→ build 全过。
- `npm run test:e2e` exit 0：**10/10**（reader-text 6 含 P7-A 缩放/拖拽/复制三集成
  + smoke 4，含 CSP meta 与策略常量一致性断言）。

## 2. 分层单向 ✅（机器化在位 + 抽查合规）

- ESLint `no-restricted-imports` 六组规则（eslint.config.js:47-136）：renderer 禁
  Node/Electron 与 main/preload（:47-60，含裸目录形式）；main 禁 renderer（:68-76）；
  shared 禁 main/renderer/preload/electron/node:*（:86-91）；db 禁上层（:100）；services
  禁 ipc（:118）；ipc 层有对应限制（:134）。
- check-quality.mjs 规则 5（:91-116）按解析后绝对路径强制：services 不得 import
  main/ipc、db 不得 import services/ipc（补 ESLint glob 分不清 shared/ipc 契约与
  main/ipc 层的盲区）。
- 抽查（reader 链四层）：ipc/reader.ts:22-23（调 services）→ services/reader.service.ts
  :48-66（调 repos）→ repos/annotations.repo.ts:166-252（db.prepare 参数绑定）——
  方向合规，无跨层。

## 3. 业务主链走查（7 环 file:line）

| 环 | 入口 → 出口 | 证据（file:line） | 判定 |
| --- | --- | --- | --- |
| 导入 | ImportDropZone 按钮 → IPC → service → file-store → repo | ImportDropZone.tsx:102-103/146/155 → api-surface.ts:44-45 → ipc/import_.ts:33-40 → import.service.ts:105-152（:113 storePdfFromPath、:141-144 withTransaction）→ file-store.ts:47-63（sha256 分桶+复用去重）→ papers.repo.ts:226-232 | ✅ |
| 库列表 | library.store ↔ FilterBar ↔ PaperList | library.store.ts:57-93（:58-59 loadSeq stale-guard、:69/72 旧响应丢弃、:81-84 setQuery 清派生选中态）→ FilterBar.tsx:40-54（防抖 300ms 进 store）→ PaperRow.tsx:75（onDoubleClick） | ✅ |
| 打开阅读 | open-paper-bus → App 切视图 → ReaderPage 装配 | open-paper-bus.ts:12-27（:15 闩锁）→ App.tsx:64-68 → ReaderPage.tsx:95-109（双路打开）/:158-208（PdfCanvas/TextLayer/SelectionLayer/AnnotationLayer/ReaderToolbar 装配）/:210-240（SplitPane+OutlineAside）→ reader.store.ts:97-116（openSeq stale-guard） | ✅ |
| 划选标注 | SelectionLayer → annotation-anchor → repo | SelectionLayer.tsx:85（selectionToAnchor）/142-169（:160 saveAnnotation）→ annotation-anchor.ts:201-241（三重定位）/373-440（mergeLineRects，INV-05 单点收口）→ annotations.repo.ts:166-202 insert | ✅ |
| 标注菜单 | AnnotationLayer 点击 → AnnotationMenu 四出口 | AnnotationLayer.tsx:207-211（点击开菜单+关编辑器）/216-229（:221 onCopy、:222 onDelete、:223-226 onAddNote、:227 onCancel）→ AnnotationMenu.tsx:68-79（四按钮）→ AnnotationEditor.tsx:14-90（「添加笔记」路径） | ✅ |
| 批注/笔记 | AnnotationEditor → repo update；NotesPanel 总评 | AnnotationLayer.tsx:138-154（saveComment→:145 updateAnnotation）→ NotesPanel.tsx:45-50（deriveSaveStatus 四态）/55-63（detectSaveFailed）→ notes.store.ts:111-217（load/edit/saveSoon 三段守卫）→ notes.repo.ts:104-118（事务 upsert） | ✅ |
| 导出 | 详情面板按钮 → ipc → service → 两投影 | PaperDetailPanel.tsx:104（api.export_.report）→ ipc/export_.ts:52-84（:54-67 先 build 后对话框，:62-63 CANCELLED）→ export.service.ts:112-122（:119-120 标注+笔记取数）→ markdown.report.ts:53-88（高亮 :64-76/笔记 :78-84）；**BibTeX 支线：ipc/export_.ts:70-72 → export.service.ts:82-93 → bibtex.serializer.ts:71-95 后端完整，renderer 全目录 grep 仅 api.export_.report 一个调用点——UI 不可达** | ⚠️ |

三 store（library/notes/reader）stale-guard 均在文件头注释宣称且实现到位（INV-03）。
AnnotationLayer.tsx:189 `onChanged={() => undefined}` 有配套注释（store 同步内置于
组件），非漏接。

### 3.1 唯一缺口定性：BibTeX/CSV 导出 UI 入口缺失

- **证据**：`grep -rn "bibtex|export_\." src/renderer` 仅命中 PaperDetailPanel.tsx:104
  的 `api.export_.report`；后端三通道（api-surface.ts:51-53 export/bibtex、export/csv、
  export/report）中 bibtex/csv 两通道无任何 renderer 调用点；测试锚定存在
  （tests/unit/ipc/export_.test.ts、tests/unit/services/export.service.test.ts、
  tests/unit/services/bibtex.serializer.test.ts——覆盖后端全链，故 verify 恒绿测不出）。
- **影响**：任务书主链定义含「导出（export.service→markdown.report/BibTeX）」——
  BibTeX 从用户操作面不可达，Phase 5 验收条款「BibTeX 导出可被 Zotero 导入」实际
  只有测试级验证路径，用户随手验无法执行。
- **定性**：主链 UI 接线缺口（半条断链），非设计内状态（B1 报告 §3 预留点清单中
  export.service.ts:27 是「导出剪贴板」另一特性，与此无关）。
- **处置**：转双门修复单元（PaperDetailPanel 加「导出 BibTeX」入口，模式照抄既有
  runAction('report')；CSV 同缺口但不在任务书主链定义内，登记为已知缺口归 P7-E
  导出剪贴板候选一并处理，不在本修复单元扩面）。

## 4. 输入接缝四件（INV-14 三面锚抽查）✅

登记册（docs/invariants.md INV-14 行）宣称 31 用例三面锚，实测核对：

| 面 | 实现 | 锁定用例 |
| --- | --- | --- |
| keymap 模块级 | keymap.ts:89-95（监听与注册表共存亡） | keymap.test.ts 12 用例（:49 成对注销行为、:59 配对面、:85 跨格序列） |
| 快捷键/滚轮消费方 | ReaderShortcuts.ts:76-104（:100-103 清理函数与注册同源） | reader-shortcuts.test.tsx 8 用例（:165 卸载清理、:175 滚轮配对面） |
| 指针/body 样式 | SplitPane.tsx:100-130（拖拽会话同源清理，:123-129 还原副作用） | split-pane.test.tsx 11 用例（:107 拖拽中途卸载还原、:163 pointercancel 同路径） |

keymap 注册态（keymap.test.ts:40 覆盖幂等/:85 register→unregister→register 无双绑定
残留）与 ctrl+滚轮（reader-shortcuts.test.tsx:146 上滚放大下滚缩小+preventDefault）
均对应用例在位。12+8+11=31，与登记册口径一致。

## 5. 防线规则活性（check-tickets 三新规则违例样本实测）✅

方法：文件备份法（cp 备份→构造违例→跑关卡→还原→diff 确认零残留）。定义源
=scripts/check-tickets.mjs 头注与实现（受锁，只读）。

| 规则 | 违例样本 | 拦截证据 |
| --- | --- | --- |
| 规则 2（done 工单号跨文件引用，:100-103） | ReaderShortcuts.ts 追加注释行含 SR2-KEY-01 | 红：「引用了已完成工单 SR2-KEY-01 的占位」 |
| 规则 4b（done 骨架残留，:130-140） | keymap.ts 追加 `export const KEYMAP_STUB = 'SR2-KEY-01'` | 红：「已 done，但文件仍含工单号初值的 *_STUB 骨架导出」 |
| 规则 6（v2 工单 b3 指针，:169-196） | registry.ts 临时加 SR2-TEST-99 条目 + 临时探针文件（无 b3 指针） | 红：「SR2-TEST-99（v2 工单）缺少 B3 裁决指针——文件头注释区须有 // b3: P7-X」 |

三样本还原后 check-tickets 均恢复绿；locks:apply 重锁 90 文件，check-locks 一致。
**防线活着。**

## 6. 安全面六件 ✅

| 件 | 实现 | 测试锚定 |
| --- | --- | --- |
| WINDOW_SECURITY_FLAGS | main-window.ts:11-21（sandbox/contextIsolation 开、nodeIntegration/webviewTag 关、webSecurity true） | web-preferences.test.ts:10-18 逐项断言 |
| permissionPolicy | main-window.ts:40-48（最小放行清单仅 clipboard-sanitized-write） | web-preferences.test.ts:24-37（写放行/读拒/通知拒/定位拒四断言——P7-A 先例形态） |
| 导航/弹窗护栏 | main-window.ts:71-72（will-navigate preventDefault + setWindowOpenHandler deny） | web-preferences.test.ts:20-22 |
| CSP 单真相源 | csp.ts:16-44（禁 unsafe-eval；connect-src 'self'+app-file:；构建 meta+dev 头双通道） | csp-meta.test.ts（源码 html 禁手写 meta + 指令完整性）+ smoke.spec.ts:46 运行时一致断言 |
| shell-guard | shell-guard.ts:15-60（https-only、拒 localhost/IP 字面量/凭据） | shell-guard.test.ts（攻击向量集含 IPv4 整数/十六进制/八进制简写） |
| 出网白名单 | constants.ts + http-client（host 白名单+redirect:error） | http-client.test.ts + e2e CSP 断言 |

## 7. 基础设施事件记录（核查期间）

- 规则 6 样本还原段 shell 复合命令挂起（还原 cp 已执行、rm 探针挂起）→ 停任务后
  单命令核实：registry.ts 已还原、探针文件句柄锁 rm 挂起（与任务书 §5 记录的
  `_esm_probe.mjs`/`_ptr_probe.mjs` 同型）。对策照先例：不阻塞关卡，重启后删。
  check-tickets/check-locks 复跑双绿，locks:apply 后 manifest 仅 generatedAt 时间戳
  差异（files 清单与 sha256 全一致），已还原 HEAD 版本，工作树仅探针残留。
- 遗留残留清单（重启后删）：`_esm_probe.mjs`、`_ptr_probe.mjs`、
  `src/renderer/shared/_rule6_probe.ts`（内容无害：单行 export const，quality 实测通过）。

## 8. 后续

1. 修复单元：BibTeX 导出 UI 入口（§3.1）——TDD 先红后绿 + deepseek 一审 + GLM 二审。
2. 任务二 P7-B 多标签（工单化→plan 门状态机表→实现→双门）。
3. CSV 导出入口缺口登记 P7-E（导出剪贴板候选）一并处理。
