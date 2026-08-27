# 缺陷②实施报告 —— 阅读器标签页标题显示内容寻址哈希名而非文献名

单元：事件驱动缺陷修复②（用户 2026-08-27 视检实锤）
模式：三屋实现者子代理（ADR-0017）；日期 2026-08-27

## 0. 技能清点（开工纪律）

- test-driven-development：**用**——TDD 四档（首红→实现→绿→断言级变异红证）全程执行。
- verification-before-completion：**用**——verify 真退出码落盘（§6）。
- systematic-debugging：**不用**——缺陷根源主控已定位（papers.repo detailById 的 fileName=file_ref 基名），修法已裁决，非排查任务。
- subagent-driven-development：**不用**——本会话即实现者子代理，派发职责在主控。
- 其余工程技能（数据库/云/前端设计等）：与本单元（renderer 标题字段贯通）无测试/实现面交集，不用。

配置自查：实现者单会话，无子代理派发面；npm 命令全部前置
`export PATH="/d/nodejs24:/c/Windows/System32:$PATH"`（Node24 铁律）。

## 1. 实现摘要

缺陷根源：papers.repo `detailById` 的 `fileName` = file_ref（`xx/yy/<sha256>.pdf`）基名
——内容寻址哈希名不可读；TabBar `tabTitle` 与 tab-dirty `confirmCloseDirty` 均以
fileName 去扩展名作标题 → 标签页显示哈希名。

修法（主控裁决票面）：
1. `TabState` 增必填 `title: string`（文献名——PaperDetail.title 是用户可读名单源，
   导入时=文件名茎，fill-empty 语义保证不被 enrich 覆盖）；makeLoadingTab 新建分支
   初值 `''`（error 重试经 `...prev` 沿用既有 title，与 fileName 同语义）。
2. hydration 处补 `title: d.title`。
3. `tabTitle(tab)`：loading/error 占位不变；ready 态
   `tab.title !== '' ? tab.title : tab.fileName.replace(/\.pdf$/i, '')`
   （空 title 兜底 fileName 去扩展名——防御位）。
4. `confirmCloseDirty` 标题行同型：title 优先 → fileName 去扩展名 → paperId 兜底。
5. TabBar.tsx 头注行为层按票面指定文案更新；reader.store.ts 头注 TabState 形状行同步。

**票面接缝事实修正（自裁申报①）**：票面称「PaperDetail d 在此可用（hydration 处）」，
但 `api.reader.open` 的响应 schema（readerOpenResSchema，src/shared/ipc/schemas.ts:33-38）
实际只含 `fileUrl/fileName/lastReadPage`——renderer 侧 `d` 上没有 title（类型层与运行时
均无）。main 侧 `reader.service.open` 内部 `d`（=detailById 的 PaperDetail，含 title）
现成可用，仅 :53 未透传。故按裁决意图（hydration 处 `title: d.title` 单次请求直达）
补契约管道：readerOpenResSchema 增 `title: z.string()` + reader.service open 透传
`title: d.title`。papers.repo 零触碰（fileName 语义=托管文件基名，AI-04 依赖，票面禁改）。
TabBar 其他行为（灰点/roving/关闭确认流程）零触碰。

## 2. 文件清单（15 文件：5 实现 + 9 受锁测试 + 1 locks manifest）

实现面：
- `src/shared/ipc/schemas.ts`【受锁】readerOpenResSchema 增 title 字段（契约扩展）
- `src/main/services/reader.service.ts` open 透传 title + 头注行为层更新
- `src/renderer/features/reader/reader.store.ts` TabState.title 建位 + makeLoadingTab
  初值 + hydration `title: d.title` + 头注形状行更新
- `src/renderer/features/reader/TabBar.tsx` tabTitle title 优先 + 头注按票面文案
- `src/renderer/features/reader/tab-dirty.ts` confirmCloseDirty 标题行同型修法

受锁测试面（授权=契约扩展：夹具补 title + 新增断言）：
- `tests/unit/renderer/tab-bar.test.tsx` makeTab 夹具补 `title: ''` + 顶层新用例
  「标题=title 优先（fileName 为内容寻址哈希名时显示文献名）；title 空兜底 fileName 去扩展名」
- `tests/unit/renderer/tab-dirty.test.tsx` 夹具补 title + 顶层新用例
  「confirmCloseDirty 文案标题=title 优先（哈希 fileName 不入文案）；空 title 兜底」
- `tests/unit/renderer/reader.store.test.ts` 顶层新用例
  「缺陷②：open 成功后 tab.title 落账文献名（fileName 语义不变）」
- `tests/unit/services/reader.service.test.ts` 顶层新用例
  「缺陷②：open 透传 title（detailById 的文献名直达 renderer）」
- `tests/unit/renderer/anchor-locate.test.ts` 夹具补 title（tsc 强制，见 §5）
- `tests/unit/renderer/ai-annotation-layer.test.tsx` 同上
- `tests/unit/renderer/ai-notes-section.test.tsx` 同上
- `tests/unit/renderer/outline-aside.test.tsx` 同上
- `tests/unit/renderer/reader-notes-panel.test.tsx` 同上
- `locks/manifest.json` locks:apply 再生成（132 条，与基线同数）

新用例均按宪法「新测试 always-active（不经 guardedDescribe）」置于顶层 `it`
（先例：ai-notes-section.test.tsx 等）。既有 open 桩/IPC 桩零改动
（reader.store.test 的 mock 经 loadStore(api: unknown) 无类型约束且无用例读 title；
tests/unit/ipc/reader.test.ts 纯委托无字段断言——最小改动面原则不触碰）。

## 3. 红证记录（TDD 首红——对实现前代码必红）

首红批次 = TabState 类型扩展（含 makeLoadingTab `title: ''`——类型必需基建）+
4 个新用例；行为面（tabTitle/confirmCloseDirty/hydration/schema 透传）未动。
`npm run test` 输出：

```
 Test Files  4 failed | 82 passed (86)
      Tests  4 failed | 615 passed (619)
 FAIL tests/unit/services/reader.service.test.ts > 缺陷②：open 透传 title（…）
   105|   expect(r.title).toBe('t')
 FAIL tests/unit/renderer/tab-bar.test.tsx > 标题=title 优先（…）
 FAIL tests/unit/renderer/tab-dirty.test.tsx > confirmCloseDirty 文案标题=title 优先（…）
 FAIL tests/unit/renderer/reader.store.test.ts > 缺陷②：open 成功后 tab.title 落账文献名（…）
   372|   expect(tab?.title).toBe('深度学习综述')
```

恰 4 个新用例红、既有 615 用例全绿（基线 615 吻合——行为面零回归）。
绿批次落改后：`Test Files 86 passed (86)；Tests 619 passed (619)`。

## 4. 变异红证（断言级，cp 文件备份法——未用 git checkout）

| # | 变异点 | 单 token 变异 | 结果 | 还原 |
|---|--------|--------------|------|------|
| M1 | TabBar.tsx tabTitle | `tab.title !== ''` → `===` | 3 failed（含目标用例「标题=title 优先」；另 2 红为 title='' 夹具经同分支连带，同源敏感） | cp 还原，diff 空输出（DIFF_EMPTY_M1） |
| M2 | tab-dirty.ts confirmCloseDirty | `tab.title !== ''` → `===` | 2 failed（含目标用例「confirmCloseDirty 文案标题=title 优先」） | cp 还原，diff 空输出（DIFF_EMPTY_M2） |
| M3 | reader.store.ts hydration | `title: d.title` → `title: ''` | 恰 1 failed（目标用例「缺陷②：open 成功后 tab.title 落账文献名」独中） | cp 还原，diff 空输出（DIFF_EMPTY_M3） |

备份存 /tmp（TabBar.tsx.bak / tab-dirty.ts.bak / reader.store.ts.bak），
`diff <bak> <file>` 三次均空 → 还原完整。

## 5. verify 真退出码 + locks 实录

verify 轮次（全部 `npm run verify > log; echo EXIT=$?`）：
- 第 1 轮：`EXIT=2`——typecheck（tsconfig.node.json 先行）拦出
  `tests/unit/renderer/anchor-locate.test.ts(25,3): error TS2741 Property 'title' is
  missing ... required in type 'TabState'`（全量恰 1 错；node project 失败后 `&&`
  短路，web project 未跑）。
- 第 2 轮（补 anchor-locate 后）：`EXIT=2`——web project 继续暴露 4 处同型 makeTab
  夹具（ai-annotation-layer:66 / ai-notes-section:103 / outline-aside:60 /
  reader-notes-panel:61，均 TS2741）。TabState 增必填字段的夹具传染面由 tsc 关卡
  完整拦截（playwright/esbuild 不查类型——宪法「受锁 e2e spec 改动后必须全量 verify」
  同族教训的 tsc 价值实证）。
- 终轮：`EXIT=0`——quality + tickets + locks:check + lint + typecheck + test + build
  全绿；`Test Files 86 passed (86)；Tests 619 passed (619)`（≥ 基线 615，+4 新用例）。

locks 实录（无新受锁路径，未用 locks:generate）：
1. `npm run locks:unlock` → 「已解锁 132 个文件」（基线 132 吻合）
2. 首红+绿批次批内改 → `npm run locks:apply` → 「已锁定 132 个文件（只读）。manifest 记录 132 条」
3. 夹具传染面分批暴露 → 二次 unlock → 补 anchor-locate → apply → 三次 unlock →
   补 4 处 makeTab → apply → 终态 manifest 132 条（与基线同数）
4. 终轮 verify 含 locks:check 通过（manifest 与文件 sha 同步）

## 6. 自裁申报

1. **契约管道扩展（超票面字面文件清单）**：`src/shared/ipc/schemas.ts` +
   `src/main/services/reader.service.ts`——票面修法「hydration 处 `title: d.title`」
   预设 open 响应携带 title，与代码事实（readerOpenResSchema 三字段）不符；上述两处
   是裁决修法成立的必要前置（main 侧 detailById 数据现成，仅透传），非替代方案。
   schemas.ts 属受锁面，已走 unlock→改→apply 流程；提交需 [locked-change] 尾注（主控收口）。
2. **夹具传染面（授权范畴内的扩展解释）**：TabState 必填 title 使 5 个构造完整
   TabState 字面量的测试文件（anchor-locate / ai-annotation-layer / ai-notes-section /
   outline-aside / reader-notes-panel）tsc 强制补 `title: ''`——属票面授权「夹具补
   title 字段」的直接后果，全部只加一行、零断言/语义改动。
3. **删减面 diff 自查**：预期零删减，实际零删减。`git diff --stat` = 15 files changed,
   113 insertions(+), 19 deletions(-)；deletions 全部为被替换的旧实现行
   （tabTitle return 行 / confirmCloseDirty title 行 / reader.service 返回行——同位
   改写非行为删减）。无孤儿文件、无未引用新文件（无新文件产生）。
   未跟踪残留（dev-launch.cmd / dist_new/ / scripts/audits/enr-*）为环境预存，
   非本单元产物，未触碰。
4. 既有测试桩零改动决策：reader.store.test 的 12+ 处 open mock 与 tests/unit/ipc/
   reader.test.ts 桩不补 title（无类型约束、无用例读取）——最小 diff 面优先；
   运行时这些桩路径 title=undefined 无人消费，不构成类型谎言面。

## 7. 疑虑

1. `git diff` 对 `locks/manifest.json` 报 CRLF→LF 警告（powershell 脚本写出行尾）：
   locks:check 在终轮 verify 内通过（manifest sha 与文件实际一致），.gitattributes
   提交时规范化 LF——主控收口提交时留意即可，无回溯假绿风险（push head 口径已核）。
2. e2e 未跑（票面未要求；verify 不含 test:e2e）。schema 出向新增字段对 e2e 的影响
   面为零（handler 实际返回 title，strict 校验自洽；渲染面 e2e 若断言 tab 标题文本
   将自然获益）。如主控要求，需先 build 再 npm run test:e2e。
3. error 态重试经 `...prev` 沿用既有 title——error 态 tabTitle 早返回「打开失败」
   占位，title 保留与否无行为差异（与 fileName 同语义），已按同族字段一致处理。

## 8. 回炉 1 轮（门一 0B/4W/6N——回执 scripts/audits/tabs-title-gate1.audit.md）

主控四条处置（W4 拆 W4a=注释更新；e2e 全量跑不在本轮处置面）：

**W1·补证**——变异矩阵补 reader.service title 透传单点红证（M4）：
| # | 变异点 | 单 token 变异 | 结果 | 还原 |
|---|--------|--------------|------|------|
| M4 | reader.service.ts:54 open 透传行 | `title: d.title` → `title: ''` | 恰 1 failed = reader.service.test「缺陷②：open 透传 title」独中（618 passed） | cp 备份法还原（备份 /tmp/reader.service.ts.bak），diff 空输出（DIFF_EMPTY_M4） |

全程 cp 备份法（未用 git checkout）；与 M1-M3 合并后 4 新断言面 ↔ 4 变异点一一对应，
变异矩阵闭合。

**W2·文字级**——TabBar.tsx:6-7 头注消费枚举补 title：
「order（排列序）/ activeId / tabs（每 tab 的 fileName/status）」→
「…fileName/**title**/status…」——段内与 :8-9「title 优先」声明的自相矛盾消除。

**W3·文字级**——reader.service.ts:8 头注计数修正：
「本层薄取三字段」→「本层薄取四字段」（open 实取 fileUrl/fileName/title/lastReadPage）。

**W4a·受锁注释**——tests/e2e/reader-text.spec.ts:251-252 注释更新（unlock→改→apply
流程照旧；注释级=契约声明同步非放宽）：
旧：「真实 tab 标题=fileRef 基名（sha.pdf），按 order 位置定位（打开序=甲0/乙1/丙2）」
新：「tab 标题=title 优先（文献名）/fileName 兜底（2026-08-27 缺陷②随单改为文献名），
定位不依赖标题文本——按 order 位置（打开序=甲0/乙1/丙2）」
定位策略（nth 位置）语义保留——注释同时显式声明「定位不依赖标题文本」防未来误改。
受锁 e2e spec 改动后已跑全量 verify（宪法 UBS 条款）。

**verify 真退出码（回炉轮）**：`npm run verify > /tmp/verify4.log 2>&1; echo EXIT=$?` →
`EXIT=0`（quality+tickets+locks:check+lint+typecheck+test+build 全绿；
Test Files 86 passed (86)；Tests 619 passed (619)）。
locks 实录（回炉轮）：unlock（132）→ W4a 批内改 → apply（132 锁定/manifest 132 条）。

**自裁申报增量**：无新增自裁面。回炉轮改动=1 变异红证（已还原，diff 空）+3 处注释级
修正（W2/W3/W4a）+manifest 再生成；`git diff --stat` = 16 files, +118/-23（较上轮
+5/-4：W2 1 行、W3 1 行、W4a 2 行注释、manifest sha/generatedAt；零行为删减）。
门一 N4/N1/N2/N3 注记已知悉（tab-dirty 头注「文献名」语义漂移/兜底深度不对称/
tab-bar 旧用例名失配/manifest CRLF 噪音）——均为主控裁量档，未动。

## 9. 回炉 2 轮（e2e 全量红 2/20——主控亲跑裁定归本单元处置）

**根因**：TabBar 标题改显文献题后，tab 关闭钮 aria-label=`关闭 <标题>` 含种子标题
字样（reader-text.spec.ts 种子「智慧水务 e2e 下划线链文献」/「智慧水务 e2e 备注链
文献」故意内嵌按钮名），与 :350 `getByRole('button', { name: '下划线' })` / :382
'备注' 发生子串碰撞（Playwright name 默认子串匹配）→ strict mode violation 双元素。
修前 tab 标题=哈希名从不碰撞——本单元行为改动的 e2e 回归面。

**处置 1（定位收紧）**：
- :350 → `win.getByTestId('selection-toolbar').getByRole('button', { name: '下划线' })`
- :382 → 同型 '备注'
（错误信息已证 selection-toolbar 作用域内唯一解析；紧邻行 :349/:381 本就断言该
容器可见——收紧后定位器自文档。）

**处置 2（W4a 注释证伪改写）**：上轮「定位不依赖标题文本」全称声明被红证伪，改写
为如实表述：「tab 定位按 order 位置…；选区工具栏按钮定位已收紧到 selection-toolbar
作用域——防 tab 关闭钮 aria-label 含标题字样的子串碰撞（Playwright name 默认子串
匹配——2026-08-27 回炉 2）」。

**处置 3（顺手排查面）**：grep tests/e2e/*.spec.ts 全部 `getByRole('button', …)`
（24 处具名 + 3 处特殊）× 20 个种子标题交叉比对——**除已红两处外零命中**：
- lineage.spec.ts「脉络」×5（:173/:196/:258/:330/:473）全部带 `exact: true`——
  精确匹配不吃子串，且「脉络根/甲/乙文献」标题不含独立「脉络」按钮歧义面；
- reader-text.spec.ts:208 label 循环限定 `annotation-menu` 容器作用域（tab 关闭钮
  不在其中），label「复制引文/删除/添加笔记/取消」亦非任何标题子串；
- :279/:282 `getByRole('button')` 无 name（结构定位）不受影响；
- 其余按钮名（文献库/设置/导入 AI 笔记/AI 读文献/高亮/阅读器/添加/导出语料/保存/
  一键装技能）与全部种子标题无子串关系（「导出语料」vs 标题片段「语料导出」语序
  相异非子串）。

**受锁流程**：unlock（132）→ 三处批内改（两定位器+一注释块）→ apply（132 锁定/
manifest 132 条）。

**两项真退出码**：
- `npm run verify > /tmp/verify5.log; echo VERIFY_EXIT=$?` → `VERIFY_EXIT=0`
  （quality+tickets+locks:check+lint+typecheck+test+build 全绿；Test Files 86
  passed (86)；Tests 619 passed (619)——受锁 e2e spec 改动后全量 verify 已跑，
  宪法 UBS 条款满足）
- `npm run build > log; echo BUILD_EXIT=$?` → `BUILD_EXIT=0`；
  `npm run test:e2e > log; echo E2E_EXIT=$?` → `E2E_EXIT=0`，**20 passed (1.0m)**
  （回炉前 2 红 → 20/20 全绿）。

**自裁申报增量**：无。改动=受锁 e2e spec 三处（两定位器收紧+注释如实化），实现面
零触碰；定位收紧语义=测试基建加固非断言放宽（作用域更窄、解析唯一性更强）。
