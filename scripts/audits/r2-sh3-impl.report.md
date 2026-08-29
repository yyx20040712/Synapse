# R2-SH3 实现报告——frameless 标题栏合并(bilibili 式)

> 实现者子代理(三屋 ADR-0017);报告契约=派发简报⑥。
> 环境:Node 24 口径(`E:\class\智慧水务\tools\node24`,v24.9.0;本机默认 v25.2.1
> 有 jsdom 预存红,全程 PATH 前缀切换);Windows + Git Bash。

## 1. 实现摘要

- `titleBarStyle:'hidden'`(main-window.ts,安全 flags 面零触碰)+ 自绘
  caption 三键 `TitleBarControls.tsx`(内联 SVG stroke=currentColor,禁新依赖)
  挂 App.tsx header 右区(版本号 margin-left:auto 之后,三键组最右)。
- 单通道四 action IPC:`system/window-control`(minimize / maximize-toggle /
  close / get-state),close 走 `win.close()` 绝不 destroy(保 TABS-04 dirty
  拦截链);`controlWindow`/`bindWindowStateEvents` 纯逻辑住 main-window.ts
  (最小接口结构化类型,测试免依赖 electron 真体)。
- maximize 状态推送:`system/window-state/event` 事件通道 + preload 手写桥
  `onWindowState`;初值 renderer 挂载 get-state 拉取(主控预裁②,时序自包含)。
- drag/no-drag:整条 `.app-header`=drag(双击空白=Windows 系统最大化/还原零
  代码);`.app-header-switcher` + `.titlebar-controls` 两容器=no-drag。皮肤
  全住 theme.css 类(B1 教训)。
- maximized=true 时按钮 aria-label 与图标均切「向下还原」(主控预裁)。

## 2. 文件清单(逐文件 + 行数变化;git diff --stat 口径)

| 文件 | 变化 | 内容 |
| --- | --- | --- |
| `src/shared/ipc/schemas.ts`(受锁) | +15 | windowControlActionSchema/WindowControlAction/req/res + windowStateEventSchema/WindowStateEvent |
| `src/shared/ipc/api-surface.ts`(受锁) | +9/-2 | system 域 windowControl 通道;EVENT_CHANNELS.windowState;PreloadEvents.onWindowState |
| `src/main/windows/main-window.ts` | +94/-6 | 头注增量;titleBarStyle:'hidden';WindowLike/MaximizeEventsLike+controlWindow+bindWindowStateEvents(268 行,≤500) |
| `src/main/ipc/index.ts` | +3 | IpcDeps.controlWindow(action)=>{maximized} |
| `src/main/ipc/system.ts` | +7 | handler async windowControl(req)→deps 透传回带 {ok:true,maximized} |
| `src/main/bootstrap.ts` | +18/-1 | controlWindow 闭包直引 window;窗口创建后 bindWindowStateEvents→webContents.send |
| `src/preload/index.ts` | +7/-1 | buildEvents 手写桥 onWindowState(订阅/退订/透传) |
| `src/renderer/app/TitleBarControls.tsx` | 新 112 行 | 三键组件+unknown/true/false 状态机+effect(get-state 初值+订阅退订+alive 门) |
| `src/renderer/app/App.tsx` | +4 | header 版本号后挂 `<TitleBarControls />`(187 行,≤250) |
| `src/renderer/shared/theme.css` | +61/-1 | header drag+switcher/controls no-drag;titlebar 三键皮肤(close hover #e81123) |
| `tests/unit/windows/window-control.test.ts`(受锁,新) | 新 164 行 | 四 action/事件绑定/titleBarStyle/drag-no-drag CSS 皮肤锁(always-active,主控预裁不经 guardedDescribe) |
| `tests/unit/ipc/system.test.ts`(受锁) | +17 | guardedDescribe('SR-IPC-09') 内 windowControl 四 action 透传断言 |
| `tests/contracts/preload-surface.test.ts`(受锁) | +23 | onWindowState 桥订阅/退订/透传样例(onImportProgress 同型) |
| `tests/e2e/smoke.spec.ts`(受锁) | +42 | 三键可见+computed app-region 三断言+maximize-toggle 真行为 poll(未跑,归主控) |
| `tests/utils/ipc-deps.ts`(受锁) | +4/-1 | 桩加 controlWindow(shell 同型覆盖形态) |
| `tests/unit/renderer/app-shell.test.tsx`(受锁) | +14/-1 | window.api 桩+windowControl/apiEvents+onWindowState(超票面波及,见自裁④) |
| `tests/unit/renderer/app-quit-dirty.test.tsx`(受锁) | +14/-1 | 同上 |
| `tests/unit/renderer/lineage-board.test.tsx`(受锁) | +13/-1 | 同上 |
| `scripts/audits/r2-sh3-forensics.mjs`(受锁 scripts/*.mjs,新) | 新 | 无头真机取证(主控收口 locks:apply 扫入) |

合计 16 修改 +322/-23,新 3 文件(TitleBarControls/window-control.test/forensics.mjs)。

## 3. TDD 证据链

- **首红(全量套跑口径)**:`scripts/audits/r2-sh3-first-red.raw.txt`
  —— `11 failed | 893 passed (904)`,exit=1。新增 11 用例
  (window-control 9 + system 1 + preload-surface 1)全红,基线 893 零破坏。
- **绿(实现后全量)**:`scripts/audits/r2-sh3-green.raw.txt`
  —— 最终 `108 files / 904 tests passed`(=893+11),exit=0(末次跑含
  CSS align-self 修复后终验,退出码落盘文件尾)。
- **变异红证四方向**(文件备份法:cp 备份→变异→定向跑→cp 还原→diff
  RESTORED-CLEAN;定向跑经 `npm run test -- <file>` 走 npm script 口径):

| 方向 | 证据路径 | 红行摘录 |
| --- | --- | --- |
| ①删 titleBarStyle | `r2-sh3-mut-titlebar.raw.txt` | `expected { width: 1280, height: 800, …(4) } to match object { titleBarStyle: 'hidden', …(1) }` |
| ②close 改 destroy | `r2-sh3-mut-close-destroy.raw.txt` | `close:调 win.close 绝不 destroy` 用例:`expected "spy" to be called 1 times, but got 0 times`(win.close spy) |
| ③maximize-toggle 分支反转 | `r2-sh3-mut-toggle.raw.txt` | 2 FAIL:常态用例与最大化态用例均 `to be called 1 times, but got 0 times` |
| ④no-drag 摘除(theme.css 两处) | `r2-sh3-mut-nodrag.raw.txt` | `expected +0 to be 2`(CSS 文本 no-drag 计数断言) |

- 分段验证:lint `r2-sh3-lint.raw.txt`(exit=0;首跑 1 错=测试内联
  `import()` 类型注解,改顶部 type import 后绿)/ typecheck
  `r2-sh3-typecheck.raw.txt`(exit=0)/ quality `r2-sh3-quality.raw.txt`
  (exit=0,无 TODO/乱码/跨域)。build `r2-sh3-build.raw.txt`(exit=0)。
  全量 verify 归主控收口(locks:check 在受锁未 apply 前必红=预期态)。

## 4. 视觉/真机取证(⑤b;禁可见浏览器窗口,无头 electron.launch)

- 脚本:`scripts/audits/r2-sh3-forensics.mjs`(r2-f-after-forensics 同型:
  真实 userData 拷贝实景,⑤f 口径);原始输出 `r2-sh3-forensics.raw.txt`。
- 产物(`scripts/audits/r2-sh3-out/`):`header-normal.png` /
  `header-maximized.png` / `header-close-hover.png` / `regions.json`。
- regions.json 实测(全达标):
  - computed app-region:header=**drag** / switcher=**no-drag** /
    controls=**no-drag**
  - 三键 aria-label:常态 [最小化,最大化,关闭];maximize 后切「向下还原」
  - maximize-toggle 真行为:isMaximized true→再点 false(app.evaluate)
  - close hover:matches(':hover')=true,computed backgroundColor=
    **rgb(232,17,35)**(#e81123 系),rect 44×43.2(贯通顶栏)
  - 右区排布次序:logo→Synapse→切换器→v0.1→三键(最右)
- **取证驱动修复 1 处**:首测按钮 rect 高仅 10px(header 的
  align-items:center 下容器按 SVG 内容高收缩,热区过小)——
  `.titlebar-controls` 加 `align-self:stretch`,复测 44px 贯通。
- 截图回 CDN URL 环境(Read 图像不可直读)→ 按 methodology ⑤b F1 先例以
  可量化探针(matches/computed/rect/app.evaluate)裁定,截图仍落盘备查。

## 5. 自裁申报(一切超票面决定)

1. **schema 形态**:票面写 `z.object({ action: z.enum([...]) })` 内联;实现
   提取 `windowControlActionSchema` 独立导出以支撑 `WindowControlAction`
   类型单源(票面架构层「action 枚举只住 schemas.ts」的服务面;形状等价)。
2. **变异④防线形态**:CSS 文本断言(theme.test.ts 同型先例,住
   window-control.test.ts)替代 e2e computed——主控预裁明文「computed 断言
   红即可,不跑 e2e」;真机 computed 转储由取证脚本补强。
3. **bootstrap 装配**:controlWindow 闭包直引后声明的 `const window`(TDZ
   不可能触发:IPC 调用来自 renderer,必然晚于窗口创建;dialogs 惰性 getter
   同段先例)——未移动「IPC 注册→主窗口」头注顺序。
4. **renderer 三测试桩扩客**(app-shell/app-quit-dirty/lineage-board 的
   window.api 桩加 windowControl、新增 window.apiEvents 桩):票面未列,
   系 App 挂载 TitleBarControls(直用 window 桥)的必然波及面;受锁已
   unlock,同型最小侵入(stubApi 扩字段+defineProperty,无断言面改动)。
5. **theme.css 皮肤细节**(票面只裁 drag/no-drag 归属与类承载):
   `.titlebar-controls{margin-right:-12px}`(热区贴窗口右缘贯通,bilibili
   式,与 header padding 联动已注释);`.titlebar-btn svg` 覆写
   `.app-header svg` 22px 默认为 10px(同特异性源顺序在后胜,已注释);
   hover 浸染 rgba(44,95,138,.1)/close #e81123/active #f1707a;按钮
   width:44px 方形热区。
6. **TitleBarControls 图标**:viewBox 0 0 10 10、stroke-width 1、10px 视觉
   尺寸(票面只说内联 SVG stroke=currentColor);restore 图标双叠方框形。
7. **e2e spec 形态**:poll+`app.evaluate(({BrowserWindow})=>...)`
   (noUncheckedIndexedAccess 下 `[0]?.isMaximized() ?? false`);未跑,
   归主控(派发简报③)。
8. **ipc-deps 桩覆盖形态**:`controlWindow?: IpcDeps['controlWindow']`
   (shell 同型),未拆参数类型。

**删减面:无**(票面接口层清单逐项全落地;无 TODO/占位残留)。

## 6. 疑虑

1. e2e 新测试(poll/app.evaluate 形态)未经 Playwright 真跑——取证脚本已
   验证同型逻辑(点击/isMaximized/hover 全通过),风险低但非零;主控收口
   `npm run test:e2e` 时首验点。
2. 双击 header 空白最大化(drag 区 Windows 原生行为)零代码,未做自动
   断言(取证未模拟双击);onWindowState 事件沿会校正图标态,renderer 单元
   已覆盖状态机,余下归用户复测面(票面交接书记录项)。
3. 取证首跑 closeHoverBg 透明一次(unmaximize 窗口 resize 后 hover 坐标
   短暂失配的时序抖动),复跑带 matches(':hover') 探针确证生效——非产品
   缺陷,记录备查。
4. `.titlebar-controls` 的 margin-right:-12px 与 header padding 0 12px 存在
   数值联动(已注释声明);两值未来须同步改。

## 7. 受锁面申报

unlock(169)后改动受锁文件 7 个(schemas/api-surface/system.test/
preload-surface.test/smoke.spec/ipc-deps/三 renderer 桩=10 个文件)+
新增受锁路径 2 个(window-control.test.ts、r2-sh3-forensics.mjs)。
**未 locks:apply**(派发简报①:主控收口统一;新增路径需主控
locks:generate 后 apply 扫入)。
