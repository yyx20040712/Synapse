# P7X-03 结案报告——B6 模态期最小化语义文档对证

日期：2026-09-03 · 票：tickets/registry.ts:246（用户裁决 2026-09-03 全立项）· 前置：AUDIT-B B6 探针（scripts/audits/auditb-out/b6.json）+门审降级意见（scripts/audits/auditb-review-ds.json B6 条）· 结论：**对证成立——B6 结案（推演升文档实证），无需开修**。

## §1 对证问题（门审原话）

探针实测=模态期 IPC `minimize()` 调用 ok 但 `isMinimized` 恒 false（观察事实：零丢失/确认框保持）。门审意见：把原因归为「Win32 owned-modal 语义」并外推任务栏路径**属未标识推演**——须文档对证（MSDN/Chromium 源注）。

## §2 本仓机制链（代码锚）

1. 关闭守门=renderer `window.confirm`（src/renderer/features/reader/tab-dirty.ts:110——TabBar 关闭叉唯一入口）。
2. Electron 不重写 JS 对话框：`window.confirm` 走 **Chromium 原生对话框**（Windows 上为 views 实现的 owned-modal 原生窗口，宿主 HWND 为 owner）。
3. 探针实测旁证：模态期主窗 `enabled:false`（b6.json duringDialog 段——owner 被禁用的直接观测；baseline/afterRestore 均 true）。

## §3 文档对证（权威源逐字）

**MSDN《About Dialog Boxes》**（learn.microsoft.com/en-us/windows/win32/dlgbox/about-dialog-boxes）：
> "When the owner window is not already disabled, the system automatically disables the window and any child windows belonging to it when it creates the modal dialog box. **The owner window remains disabled until the dialog box is destroyed.**"
> "Neither the user nor the application can make the owner window active until the modal dialog box is destroyed."

→ 系统级明文：模态期 owner 被禁用且不可激活——禁用窗口的最小化请求（任务栏点击/程序调用）不生效=Win32 owned-modal 的既有语义（社区实证：Stack Overflow 3777551「模态在场时点任务栏仍不会最小化」）。

**Electron 侧源注**：
- 官方文档（BrowserWindow）：「A modal window is a child window that **disables parent window**.」——模态=禁用父窗是文档化行为非偶然。
- 源码锚：`shell/browser/native_window_views.cc` `NativeWindowViews::SetEnabled(bool)` → `::EnableWindow(GetAcceleratedWidget(), enable)`；issue #50068 维护者确认 show modal 时父窗「**purposely disabled**」（555+ 行）——姊妹路径（modal BrowserWindow）同机制，佐证 Electron 生态对「模态期禁用 owner」的刻意设计。

## §4 对证裁决

| 门审质疑点 | 对证结果 |
| --- | --- |
| 「owned-modal 归因是推演」 | **升实证**：MSDN 系统级明文（owner 禁用至对话框销毁+不可激活）+Electron 文档/源注双重锚 |
| 「任务栏路径外推无据」 | **成立**：禁用 owner 的最小化请求不生效=同一系统语义的任务栏表现（SO 3777511 实证）；且本仓 B6 的 N 结论本就落在**行为事实**（零丢失/确认框保持——探针在档）上，非归因上 |
| 「静态 grep 未排除应用层其他抑制」 | 探针 `enabled:false` 直接观测=禁用来自模态机制本身（本仓无自定义 setEnabled 调用——grep src/main 零命中） |

**边界诚实申报**：探针观察到的「minimize() 返回 ok 但无效」的**精确内部路径**（Chromium 对禁用窗口 SC_MINIMIZE 的处理细节）无逐行源注——但对证目标（B6 的 N 结论=dirty 零丢失+确认框不误关）所依赖的语义（模态期 owner 不可最小化/不可激活、对话框随 owner 隐藏而隐藏随恢复而复现）已在 MSDN+Electron 文档+探针三层闭合。

## §5 处置

- **B6 结案**（AUDIT-B 留场场项销项）：推演升文档实证，无修票面。
- P7X-03 翻 done（对证活免实现——票面预判兑现）。
- 附注：Electron 已知模态边缘行为族（#45965 关模态激活错窗/#48965 多次 show 致父窗残留禁用）与本仓 B6 场景无交集（我们未观测到该形态），仅作监控备忘不入案。

**对证源清单**：
- https://learn.microsoft.com/en-us/windows/win32/dlgbox/about-dialog-boxes
- https://electronjs.org/docs/latest/api/browser-window
- https://github.com/electron/electron/issues/50068
- https://stackoverflow.com/questions/3777551/how-to-minimize-owner-window-when-a-modal-is-showing
