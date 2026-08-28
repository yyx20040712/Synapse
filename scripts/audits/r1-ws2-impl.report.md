# R1-WS2 实现者报告——课题切换器渲染层（侧栏 UI+dirty 守卫+设置面课题管理）

> 三屋模式实现者子代理 · 2026-08-28 · 票面 `scripts/audits/r1-ws2-brief.md`（P1~P5 全做，P5 未越界）
> 技能清点：TDD/verification-before-completion/javascript-testing-patterns/e2e-testing-patterns=用；
> frontend-design/theme-factory=不用（TH1 未开工，票面预裁勿预铺 token）；systematic-debugging=用（e2e reload 卡点三跳取证）。

## 1. 实现摘要

- **P1 store**（`src/renderer/features/workspaces/workspace.store.ts`，108 行）：zustand——load()（stale-guard+列表型失败写 error 不抛）/create(name)（透传+自动刷新清单，返回新 id）/rename（items 即时改名）/switchTo(id,{dirty})（幂等直返→dirty 确认（文案「切换课题将丢弃未保存的标注/脉络修改。确认切换？」沿用 main-window:144 退出守卫风格）→api.switch→`window.location.reload()`）。dirty 聚合值经参数注入（App 编排 props），零跨域 store 互引。类型 `WorkspaceItem` 从 shared schema 推导（不手写第二份）。
- **P2 切换器**（`WorkspaceSwitcher.tsx`，158 行）：nav 顶部挂载（App.tsx）；当前课题名+▾（aria-label「切换课题」）；展开=课题列表（当前项「（当前）」标记）+「新建课题…」（内嵌输入，创建即切）+「管理课题」（onManage→App setView('settings')）。视觉全走既有 theme 变量。
- **P3 设置面课题管理节**（`WorkspaceSection.tsx`，150 行）：列表+当前标记+重命名 inline 编辑+新建（创建并切换）。经 **App slot 注入**（见自裁②）。
- **App.tsx 接线**（+15 行）：workspace.store 挂载 load（store 列表型失败自吞——受锁 app-quit-dirty 测试 stubApi 无 workspaces 域靠此不炸，已实测仍绿）；`<WorkspaceSwitcher dirty={quitDirty} onManage=…/>`+`<SettingsPage workspaceSection={<WorkspaceSection dirty={quitDirty}/>}/>`。nav 四按钮文案/aria 零触碰（42 处既有 e2e name 断言不受影响，grep 复核）。

## 2. 文件清单（git diff --stat：4 改 +6 新，无范围蔓延）

新：`src/renderer/features/workspaces/{workspace.store.ts,WorkspaceSwitcher.tsx,WorkspaceSection.tsx}`、`tests/unit/renderer/{workspace.store.test.ts,workspace-switcher.test.tsx}`、`tests/e2e/workspaces.spec.ts`
改：`src/renderer/app/App.tsx`、`src/renderer/features/settings/SettingsPage.tsx`、`src/main/windows/main-window.ts`（自裁①）、`locks/manifest.json`（locks 扩容）

## 3. 首红证据

两测试文件先落盘后跑：`Failed to resolve import "../../../src/renderer/features/workspaces/workspace.store"` / `.../WorkspaceSwitcher"`——2 failed (no tests collected)，实现零存在性红（npm run test 路径过滤，01:30:43）。

## 4. 变异红证+还原证据（cp 备份法，未用 git checkout）

- **变异①删 dirty 拦截行**（`if (dirty && !window.confirm(...)) return false`）→ 红：`switchTo dirty 且用户取消` it ×1（`expected "bound " to be called 1 times, but got 0 times`——confirm 未弹即直切）。还原 `diff` 空（RESTORE-1 CLEAN）。
- **变异②删 reload 两行** → 红 ×2：`switchTo 无 dirty`+`dirty 且用户确认`（reloadSpy 0 times）。还原 diff 空（RESTORE-2 CLEAN），复跑 8/8 绿。

## 5. e2e 新 spec 全跑输出

`tests/e2e/workspaces.spec.ts`（场景=票面 P4：旧路径种子→启动迁移兼容→侧栏默认课题+文献在场→新建课题 B（dirty=false 无确认直切）→reload 后库空+脉络空态「暂无脉络图——导入草稿或添加节点」+切换器示 B→切回→文献在场）：

```
ok 24 tests\e2e\workspaces.spec.ts:18:1 › 课题切换：新建课题 B 后库/脉络整体切换，切回后文献在场 (1.8s)
25 passed (1.3m)     ← e2e 全量亲跑（24 既有+1 新），E2E_EXIT=0，log=scripts/audits/r1-ws2-e2e-full.log
```

## 6. locks 实录

新 3 测试文件 generate→apply：146→**149** 条，check-locks 过（"locks 检查通过：149 个受锁文件与 manifest 一致"）。既有受锁文件零解锁（src/main/windows/main-window.ts 非受锁面——manifest 146 条仅 migrations/shared/tests/配置，python 枚举核实）。

## 7. verify 真退出码

`npm run verify > scripts/audits/r1-ws2-verify.log` → **exit=2（typecheck 段红，唯一红点）**。分段：quality ✓（无占位/乱码/跨域）/tickets ✓（open 0）/locks ✓（149）/lint ✓/typecheck ✗/**WS1 遗留非本单面**（见 §9-1）/test+build 未达（&& 链断）。分项补齐：`npm run test` exit=0（**99 文件 775 用例全绿**=基线 97/761+本单 2 文件 14 用例，恰合）；`npm run test:e2e`（含 build）exit=0（25 passed）。

## 8. 自裁申报（超票面决定，逐项详证）

1. **main-window.ts will-navigate 同 URL 放行**（:106-114，+9 行）：ADR-0018 裁决的 `location.reload()` 被既有护栏 `will-navigate→preventDefault()` 无条件吞（reload 也走 will-navigate）。取证三跳：e2e 红（创建后切换器 aria-expanded=true 文本不变）→ evaluate invoke `workspaces.create` 返回 `{"ok":true,"data":{"id":"ws-…"}}`（排除 main 侧）→ tabDirty（order=[] 空聚合）与 lineageDirty（初始 saveStatus='saved'）均 false（排除 dirty 误弹）→ 定位护栏。**接缝归责申报**：ADR-0018（reload 机制）与护栏注释（禁任何导航）互斥，按母本裁决做最小必要放行（仅 `url === getURL()` 同源重载；外站/异文件导航仍禁——护栏意图不变）。非受锁面。
2. **SettingsPage 改 slot 注入**（`workspaceSection?: ReactNode`）：quality 门禁禁 feature→feature import（初版 `import '../workspaces/WorkspaceSection'` 被拦："跨 feature 引用"）。按票面架构层原文「跨域经 App 编排」改为 App 组合根渲染传 slot；dirty 聚合随 slot 由 App 注入（原 workspaceDirty prop 取消）。既有调用零破坏（可选 prop）。
3. **switchTo 幂等分支**（id===currentId 直返 false）：票面未写；防点当前课题触发无谓 confirm/reload；测试锁定（it「幂等直返」）。
4. **删两处 input placeholder 属性**：quality 正则 `…|placeholder/i` 连 HTML 属性都拦（check-quality.mjs:28，renderer 无先例）；aria-label 已承担定位（e2e getByLabel 实测过）。
5. **reload-e2e 形态**：主控预裁③降级预案（断言 switch IPC 返回+evaluate 查 location）**未启用**——will-navigate 放行后 reload 稳定，playwright win 句柄跨 reload 有效+auto-retry expect 重同步，全链直跑通过。
6. **e2e 种子形态**：PDF 本体未写（LibraryPage 列表只读 db 行 title；不断言打开阅读）——种子=纯库行（e2e-env.seedPaperRow 旧路径直插）。
7. **switchTo 命名**（票面字面 switch）：避保留字视觉混淆微调，语义同。

## 9. 疑虑/对账（主控裁量项）

1. **WS1 遗留类型缺陷（verify 唯一红，实现者未修）**：`tickets/registry.ts:214` R1-WS1 行 `area: 'workspaces'`，TicketArea 联合（:19-33）无此成员——**5ed38ff（WS1 提交）带入**，其宣称 verify exit=0 与 HEAD 事实矛盾（引用链 `tests/utils/guard.ts:11→registry` 将其拉进两个 tsc 项目，tsconfig.node include `tickets/**/*.ts`）。tickets 为实现者禁触+受锁面，按宪法「不得自行修改让代码通过」保持零触（AskUserQuestion 申报无应答）。**修复建议（主控/[locked-change]）**：TicketType 联合加一行 `| 'workspaces'`（locks:unlock→改→apply）；改后 verify 预计全绿（其余段已全绿）。
2. **基线对账**：vitest 97→99 文件/761→775 用例（+2/+14=本单恰合）；locks 146→149（+3=本单新测试）；e2e 24→25 passed（+1=本单 spec）；open 0 不变。除 §9-1 外无未解释偏差。
3. 组件测试一处断言首跑红后修正（buttonByText('课题甲') 命中切换器主按钮而非面板项——测试自身定位缺陷，改为精确文本匹配 '课题甲（当前）'，实现零改动）。

## 10. 成本

实现者子代理单会话 ≈（未细分计时）；产物=6 新文件+4 改文件+3 份 log/报告。

## 11. 回炉增补（门一裁决 W1/W2/W4，2026-08-28 第二轮）

前置：主控已 [locked-change] 修复 WS1 遗留 TicketType（registry 联合补 `'workspaces'`）——上轮 §9-1 卡点解除，verify exit=0 通路打开。流程照裁决：locks:unlock（149）→改→generate→apply（**149→150**，+1=main-window-navigation.test.ts）。

- **W2（必改）假绿窗堵口**：`tests/e2e/workspaces.spec.ts` 缺席断言（原 :49）前增 `await expect(win.getByText('正在加载文献列表…')).toBeHidden({ timeout: 10_000 })`——LibraryPage:99-103 加载行与 papers 同 commit 置/清位，其隐藏=列表加载终态的确定性信号；不锚则 loading 期 rows 空使 `toHaveCount(0)` 立即通过（缺席≠空库证明）。专项跑绿 1 passed (1.9s)。
- **W1 error 兑现**：`WorkspaceSwitcher.tsx` 补内联错误行（`aria-label="课题列表错误"`，`var(--danger)` 一行+「重试」按钮复用 `load`）——非 toast，兑现 workspace.store 头注「写 error 供内联展示」契约；组件头注同步登记。新 it 首红（`error 应内联渲染: expected undefined to be defined`）→实现→绿（7/7）。
- **W4 deny 面锚定**：`main-window.ts` 抽 `export function shouldBlockNavigation(currentUrl, targetUrl): boolean`（严格字符串相等——同 URL 重载放行；外站/异文件/data: 变体一律 deny；头注声明安全语义），will-navigate handler 改经纯函数接线。新测 `tests/unit/windows/main-window-navigation.test.ts` 3 it（同 URL 放行/外站 deny（https+异 file 双探）/data: 变体 deny（html+base64 双探）），always-active。变异红证：`!==`→`===` 逻辑反转 3 it 全红→cp 备份还原 diff 空（RESTORE CLEAN）。

**回炉后全量**：vitest **100 文件 779 用例** exit=0（99→100/+1 文件、775→779/+4=W4 3 it+W1 1 it）；全量 e2e **25 passed** (1.3m) exit=0；**verify exit=0**（log=`scripts/audits/r1-ws2-verify.log`，末尾「== 回炉」节；vite pdfjs 双引用为既有噪音非错误）。质量/票务/锁/lint/typecheck 全段绿。行数：WorkspaceSwitcher 193/main-window 198——均 ≤500。
