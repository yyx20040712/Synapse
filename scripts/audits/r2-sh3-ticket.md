# R2-SH3 票面:frameless 标题栏合并(bilibili 式)——五层规约

> 来源:用户决策(handoff-v5 §1 决1)「顶栏希望与系统最小化-最大化-关闭栏
> 合并(bilibili 式)」;方案定案=handoff-v5 同格:`titleBarStyle:'hidden'`
> +自绘 caption 三键入顶栏右区+`-webkit-app-region` 拖拽区(按钮 no-drag)。
> 中票三屋(ADR-0017)。LOOP 会话票——不在 tickets/registry,禁触碰 registry。

## 行为层

### 窗控通道动作语义(main 侧单一真源)

| action | 语义 | 返回 |
| --- | --- | --- |
| `minimize` | win.minimize() | 执行后 isMaximized() 回读 |
| `maximize-toggle` | isMaximized() ? unmaximize() : maximize() | 切换后 isMaximized() |
| `close` | **win.close()——绝不 destroy**(保 TABS-04 dirty 拦截链) | 同上回读 |
| `get-state` | 只读 isMaximized(),零副作用 | 当前态 |

### maximize 状态推送(renderer 图标态)

| 态 | 含义 | 迁移 |
| --- | --- | --- |
| unknown | 挂载初值未拉到 | get-state 应答 → true/false |
| maximized=true | 窗口最大化 | unmaximize 事件沿 → false |
| maximized=false | 常态 | maximize 事件沿 / 双击 drag 区最大化(Windows 系统行为)→ true |

main 侧 win.on('maximize'/'unmaximize') → webContents.send(事件通道)。
**初值走 get-state 拉取而非 did-finish-load 推送**(主控预裁:时序自包含,
不依赖 effect 与 load 事件的先后)。

### 布局行为

- 顶栏 `.app-header` 整条=拖拽区(drag);`.app-header-switcher` 容器与
  三键容器=no-drag。版本号 v0.1 仍 margin-left:auto,三键组排最右
  (bilibili 式)。切换器展开面板随容器 no-drag——**面板溢出 header 盒
  部分(向下侵入 main 区)同样不可被 drag 吞点击**。
- 双击 header 空白=Windows 系统最大化/还原(drag 区原生行为,零代码)。

## 接口层

- `src/shared/ipc/schemas.ts`(受锁):
  - `windowControlReqSchema = z.object({ action: z.enum(['minimize','maximize-toggle','close','get-state']) }).strict()`
  - `windowStateEventSchema = z.object({ maximized: z.boolean() }).strict()`
  - `windowControlResSchema = z.object({ ok: z.literal(true), maximized: z.boolean() }).strict()`
- `src/shared/ipc/api-surface.ts`(受锁):system 域加
  `windowControl: { channel: 'system/window-control', Req/Res 同上 }`;
  `EVENT_CHANNELS` 加 `windowState: 'system/window-state/event'`;
  `PreloadEvents` 加 `onWindowState(cb: (e: WindowStateEvent) => void): () => void`
- `src/main/windows/main-window.ts`:
  - createMainWindow options 加 `titleBarStyle: 'hidden'`(autoHideMenuBar 保留)
  - `export function controlWindow(win: WindowLike, action: WindowControlAction): { maximized: boolean }`
  - `export function bindWindowStateEvents(win: MaximizeEventsLike, send: (payload: { maximized: boolean }) => void): void`
  - 窗口形状用最小接口(结构化类型,测试免依赖 electron 真体——文件内既有风格)
- `src/main/ipc/index.ts`:IpcDeps 加
  `controlWindow: (action: WindowControlAction) => { maximized: boolean }`
- `src/main/ipc/system.ts`:handler `async windowControl(req)` → deps 透传
- `src/main/bootstrap.ts`:装配——controlWindow 闭包包 window;事件绑定
  `bindWindowStateEvents(window, (p) => window.webContents.send(EVENT_CHANNELS.windowState, p))`
- `src/preload/index.ts`:buildEvents 手写桥同步加 onWindowState
  (**PreloadEvents 类型变更后此处必须跟——契约测试对账面**)
- `src/renderer/app/TitleBarControls.tsx`(新组件):
  - 三按钮 aria-label:「最小化」「最大化」(maximized=true 时「向下还原」)/「关闭」
  - 图标内联 SVG stroke=currentColor(禁新依赖红线)
  - effect:get-state 拉初值+onWindowState 订阅,卸载退订
- `src/renderer/app/App.tsx`:header 右区挂 `<TitleBarControls />`(版本号后)

## 架构层

- 分层单向:renderer → window.api.system.windowControl → ipc(既有机制零新面)
- 类型单一真相源:action 枚举/事件形状只住 schemas.ts;renderer 复用
  `WindowControlAction` 类型(经 api-surface 类型推导,禁手写第二份)
- App.tsx 组件 ≤250 行红线:TitleBarControls 独立文件(App 现 184 行,余量足)
- 皮肤住 theme.css 类(B1 教训:禁内联 style 承载交互态)
- 安全禁令面零触碰(titleBarStyle 非 webPreferences;安全 flags 原样)

## 生命周期层

- dev/prod 同行为(hidden 在 Windows 全隐藏系统 chrome);macOS 不在支持面
  (单人 Windows 应用,不做 hiddenInset 分支)
- e2e 回归防线:workspaces.spec 点切换器——若 no-drag 漏标该 spec 即红(免费防线)
- window-state.ts bounds 记忆不受影响(仅记忆 x/y/w/h,已存行为)

## 文化层(测试=TDD 红→绿→变异红证)

- 新 `tests/unit/windows/window-control.test.ts`(受锁):
  - controlWindow:minimize 调 minimize/maximize-toggle 双向(min↔max)/close
    **调 close 不调 destroy**/get-state 只读零副作用
  - bindWindowStateEvents:maximize→send(true)/unmaximize→send(false)
  - createMainWindow 传 `titleBarStyle:'hidden'`(BrowserWindowCtor 桩 capture options)
- 扩 `tests/unit/ipc/system.test.ts`(受锁):windowControl 四 action 透传断言
- 扩 `tests/contracts/preload-surface.test.ts`(受锁):onWindowState 桥
  订阅/退订/透传样例断言(对齐既有 onImportProgress 样例形态)
- e2e `tests/e2e/smoke.spec.ts` 扩(受锁):三键可见(role=button accessible
  name)+maximize-toggle 真行为(electronApp.evaluate isMaximized 断言
  true→再点→false);断言 header 的 computed style `-webkit-app-region`='drag'
  且三键容器 no-drag
- 变异红证方向(各落盘 .raw.txt):①删 titleBarStyle→options 断言红;
  ②close 键改 destroy→close 断言红;③maximize-toggle 分支反→双向断言红;
  ④no-drag 摘除→e2e 点击断言红(或 computed 断言红)

## 视觉/真机验收(⑤b/⑤f)

- 无头真机截图:顶栏常态+maximize 后(图标切换 restore)+close hover 态
  (computed `background` 断言红 #e81123 系亦可)
- 用户复测面(交接书记录):Windows 三键 hover/press 与系统观感一致性

## 主控已预裁项(门一可攻击,推翻需更强依据)

1. 单通道四 action(非三通道):接线表/契约面最小
2. 初值 get-state 拉取(非 did-finish-load 推送):时序自包含
3. close 走 win.close():保 dirty guard
4. 不用 titleBarOverlay:v5 用户方案定案自绘
5. 版本号仍 auto 推右,三键最右
6. drag=整条 header;no-drag=切换器容器+三键容器两处
