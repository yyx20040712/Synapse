# AUDIT-B 扫描报告——功能对偶矩阵 6 对+1 边界取证（2026-09-03）

> 简报=`scripts/audits/auditb-brief.md`（范围/配方/判级线固化）。执行=只读取证
> 子代理：探针全部 `.js` 后缀（ESM——package type=module；避开 locks walk 对
> scripts/**.mjs 的自动覆盖，锁面归主控收口裁量）；**零 src/tests/tickets/locks
> 改动**（`git status --porcelain` 全为 untracked，`git diff` 空——见 §四）。
> 开工技能清点：verification-before-completion（用——全部数字实测转储在档）/
> e2e-testing-patterns（用——探针形态）；systematic-debugging/TDD 不用（纯取证
> 无修面）；browser-use 不用（全程无头 Playwright `_electron`，未开可见浏览器——
> 既有 f-* forensics 族同型）。

## 〇、产物与总览

| 件 | 路径 |
| --- | --- |
| 探针 B7 | `scripts/audits/auditb-b7.js`（tags 真库 IPC+DB 断言） |
| 探针 B1+B5 | `scripts/audits/auditb-b15.js`（合并一次 launch） |
| 探针 B2+B3 | `scripts/audits/auditb-b23.js`（合并一次 launch） |
| 探针 B4 | `scripts/audits/auditb-b4.js`（流光 A/B 性能） |
| 探针 B6 | `scripts/audits/auditb-b6.js`（dirty close×最小化，两跑复现） |
| 转储 | `scripts/audits/auditb-out/`：b7.json / b15.json / b23.json / b4.json / b6.json + 截图 b15-switcher-{small,large}.png、b15-toolbar-{small,large}.png、b23-maximized.png |

全部探针跑法：`"/c/Program Files/Volta/node.exe" scripts/audits/auditb-*.js`（Volta
node24 项目 pin；需 out/ 构建产物在位）。better-sqlite3 双 ABI 纪律：探针内
备份 electron 绑定→子进程 node ABI→finally 还原+sha256 对账（b7/b23
`bindingRestored: true` 在档；收尾独立复核 build/Release=abi-cache/electron-v146
哈希一致）。

| # | 对 | 结论 | 一行证据 |
| --- | --- | --- | --- |
| B1 | SET1 zoom × F-06/F-08 划选工具条 | **N** | 两档工具条顶锚恒=选区顶−42.0px、dx=0、无遮挡不出滚动容器（b15.json） |
| B2 | SH3 双击最大化 × F-03 滚动进度 | **N** | 真最大化（vp 1282×802→2048×1104）全程 nearestPage 恒 3/零 scroll 事件/DB last_read_page=3 落账正确（b23.json） |
| B3 | SH3 drag 区 × 阅读器键位滚动 | **N** | PageDown 三焦点面（body/drag 点击后/ws-trigger 钮）全滚 612.8px=clientH×0.9（b23.json） |
| B4 | UI1 常驻流光 × 性能/功耗 | **N** | A/B 相各 501 帧/5s（100.2fps）同轮廓、gapMax 10.2ms、longtask 0/0（b4.json） |
| B5 | workspace 切换器 × SET1 zoom 大档 | **N** | 零溢出零截断（panel/trigger/item scrollW≤clientW 全档）；面板字号恒 12/13px vs 内容 nav 高 ×1.248 量化反差在档（b15.json） |
| B6 | TABS-04 关闭拦截 × 最小化组合 | **N**（含 1 BLOCKED 子项） | 无丢失无误关：close 两跑全程拦截+父窗禁用（模态在场动态信号）+renderer 活；模态期 minimize 无效〔ds-审 W2 修订：Win32 owned-modal 归因=推演待文档对证，观察事实=IPC minimize 后 isMinimized 不变真（b6.json 两跑一致）〕 |
| B7 | tags upsert 纯空格名入库 | **W** | `upsert('   ')`→ok 应答 Tag{''}+真库 name='' 行 1 条+list 浮出空名标签（b7.json） |

**W 级=1（B7）；N 级=6；BLOCKED 子项=1（B6 两路径按钮点击，静态链替代取证）。**

---

## 一、逐项配方执行记录

### B7 tags upsert 纯空格名（P7E-01 已知边界）——W

**配方执行**：`auditb-b7.js`。临时 userData 首启建 schema→真实 IPC 面
`window.api.tags.upsert({name:'   '})`（3 空格过 zod min(1)）→list 应答→关应用→
node ABI 子进程开真库数 tags 行→还原绑定（哈希对账 true）。

**静态链**：
- `src/main/services/tags.service.ts:56-58`——`upsert` 只 `req.name.trim()` **无空判**
  （对照同文件 `rename` :71-76 有 `if (name === '') throw INVALID_REQUEST` 先例，
  注释明言「zod min(1) 拦不住纯空格——service 防御」）；
- `src/shared/ipc/schemas.ts:355`——`tagNameReqSchema = z.string().min(1).max(50)`，
  `'   '.length=3` 放行；
- `src/main/db/repos/tags.repo.ts:125-131`——`upsertByName` 直接
  `insertTag.run(uuid, name)`，无空名守卫。

**动态数值**（b7.json）：

| 步 | 应答/结果 |
| --- | --- |
| `upsert('   ')` | `{ok:true, data:{id:'c08e0d06-…', name:''}}` |
| `upsert('  对照标签  ')` | `{ok:true, name:'对照标签'}`（trim 正常面） |
| `rename('   ', 不存在 id)` | `{ok:false, code:'INVALID_REQUEST', message:'标签名不能为空'}`（先例守卫在场） |
| `list()` | `[{name:'', paperCount:0}, {name:'对照标签', paperCount:0}]`——**空名标签浮出 UI 数据面** |
| 真库 SELECT | `total:2, emptyNameCount:1`，`allNames:['','对照标签']` |

**结论行：W——可复现入库**（判级线「可复现入库=W 级修票」正中）。W 详情见 §三。

---

### B1 SET1 zoom × 划选工具条+划选链定位——N

**配方执行**：`auditb-b15.js`。种子多行 PDF（pdf-factory createMultiLinePdf 内联
同源）→开卷→125% 与 100% 两档各：程序化跨行划选（Range→selectionchange→防抖
200ms→工具条）→工具条 gBCR×选区 gBCR 对位转储+截图。

**静态链**：`SelectionToolbar.tsx:34-47`（absolute+left/top 消费 props.x/y）；
`selection-geometry.ts:89-98` `toolbarMountPos`（视口域定位→**÷localScale 归一**
到挂载盒本地）+ `:62-66` `localScale=clientWidth/gBCR.width`（同源 gBCR 量测，
任意嵌套 zoom 自动复合——票面「混用 offsetLeft/未缩放坐标=错位」的对照实现面）。

**动态数值**（b15.json `b1`）：

| 量 | @125% | @100% | 判读 |
| --- | --- | --- | --- |
| uiScaleVar / 页列 zoom | 1.25 / 0.8 | 1 / 1 | 页列反向补偿在场 |
| mountLocalScale | 0.8002 | 1.0002 | =1/1.25 归一正确 |
| 工具条 rect | x655.9 y170.1 w332.6 h38.2 | x604.4 y150 w267.4 h31.2 | 盒高 ×1.224≈×1.25 |
| 选区 rect.top/x | 212.1 / 655.9 | 192 / 604.4 | — |
| **顶锚（sel.top−tb.y）** | **42.0** | **42.0** | 与 TOOLBAR_ABOVE=42 精确一致〔ds-审 NIT：括注原误置本行，已移〕→**错位=0px** |
| 水平偏移 dx | 0 | 0 | 无水平错位 |
| gapV（sel.top−tb.bottom） | 3.8 | 10.8 | 差 −7.0px 系工具条盒高 ×1.25（31.2→38.2），非坐标混用 |
| 遮挡选区 | false | false | 无 |
| 工具条在滚动容器内 | true | true | 无越界 |

**结论行：N**——判级线「错位>4px=W」：实测**定位偏移 0px**（顶锚两档均精确 42.0、
dx=0——坐标自洽，无 offsetLeft/未缩放坐标混用实证）；gapV 跨档差 7px 的来源=工具
条自身盒高随 ui-scale ×1.25（位置不动的条件下盒子变大），属尺寸效应非错位，且无
遮挡、不出滚动容器。**记档风险**：125% 档残余间隙仅 3.8px——若未来新增更大档
（≥150%，盒高≈40+px）TOOLBAR_ABOVE=42 常量余量将转负（工具条压选区上缘），届时
需票面（TOOLBAR_ABOVE 按实测盒高动态化或按 ui-scale 补偿）。观感成分（工具条在
大档下视觉更大）只出量化事实，留场场。

---

### B2 SH3 双击最大化 × F-03 滚动进度——N

**配方执行**：`auditb-b23.js`。种子 8 页 PDF→开卷→scrollTop 直写滚到中部（真
scroll 事件→防抖 2s 落账）→装 scroll 计数器→**双击 drag 区**（无头未触发系统
最大化，2s isMaximized 轮询未真→**回退三键「最大化」按钮**，路径在档
`maximizePath:'fallback-button'`）→量测→unmaximize→量测→关应用→真库
last_read_page 对照（双路径探测：L0 legacy=root 库/二次启动物化迁移
root→workspaces/default——活动库命中后者）。

**方法论坑（在档）**：首轮用 `win.setViewportSize(1280,800)` 导致 CDP 设备度量
仿真锁死内容区——真窗 bounds 已 2064×1120 但 innerWidth 恒 1280、reflow 不触发
（b23.json 首轮数据自证）；去仿真后最大化才真改变视口。**B2 的 resize 面必须用
自然窗口尺寸**（未来 e2e 测 resize 面同此）。

**动态数值**（b23.json `b2`，末轮自然尺寸）：

| 相位 | vp | clientH | scrollTop | nearestPage0(0基) | srOnly 页 | scroll 事件 |
| --- | --- | --- | --- | --- | --- | --- |
| 初始 | 1282×802 | 676 | 12 | 0 | 1 | — |
| 滚到中部（+3.2s） | 1282×802 | 676 | 2578 | 3 | 4 | — |
| **最大化**（bounds 2064×1120 实证） | **2048×1104** | **978** | 2578 | **3** | **4** | **0** |
| 还原 | 1282×802 | 676 | 2578 | 3 | 4 | 0 |
| 终态（+2.5s） | 1282×802 | 676 | 2578 | 3 | 4 | — |
| 真库（workspaces/default/synapse.db） | — | — | — | last_read_page=**3** | — | — |

pageJumps 四段全 0（scroll_to_max/max_to_restore/restore_to_final/netDrift）；
DB last_read_page=3=终态视口中心页（0 基）——**记账正确**。

**结论行：N**——判级线「maximize 瞬间页进度漂移≥1 页=W」：零漂移（视口高
+302px 重排下 scrollTop/nearestPage/store 页码全恒定）、零 scroll 事件（无伪
scroll 触发 writing 态）、DB 落账与终态一致。**子项注记（非 BLOCKED）**：真
dblclick-drag 最大化在 Playwright 合成输入下不可达（首击即被系统窗拖路径吞——
`-webkit-app-region:drag` 的 OS 级语义）；按钮路径与双击路径收敛到同一
`BrowserWindow.maximize()`（`main-window.ts:242-261` controlWindow +
`:272-280` bindWindowStateEvents 头注明言「含双击 drag 区最大化等 Windows 系统
行为触发的沿」），resize×进度 行为面已全覆盖。

---

### B3 SH3 drag 区 × 阅读器键位滚动——N

**配方执行**：`auditb-b23.js` B3 段（独立二次 launch）。三种焦点面各按真键盘
`PageDown`（CDP）→量滚动位移+keydown target 捕获（capture once 探针）。

**静态链**：`keymap.ts:83-87`——键位监听挂 **document**（「单一 document keydown
监听」头注契约），`:68-79` editable 避让后按表派发；`ReaderShortcuts.ts:55-60`
PAGE_KEYS（PageDown/PageUp/ArrowL/R→prev/next）+`:52` SCROLL_STEP_RATIO=0.9；
`theme.css:95` drag 区只作用于鼠标（`-webkit-app-region`），`:116/:153` 切换器/
三键容器 no-drag。

**动态数值**（b23.json `b3`）：

| 焦点面 | activeElement | keydown target | PageDown 位移 |
| --- | --- | --- | --- |
| body 初值 | BODY | BODY | **612.8px** |
| drag 区点击后（.app-header-name 中心点单击） | BODY（点击被系统窗拖吞——焦点未动） | BODY | **612.8px** |
| header 可聚焦钮（ws-trigger，面板开） | BUTTON.ws-trigger | BUTTON.ws-trigger | **612.8px** |

期望步长=clientH 676×0.9=608.4px（实测 612.8——clientH 在 B3 会话略异，同源
0.9 比例成立）；三面全滚。

**结论行：N**——判级线「PageDown 失效且无替代路径=W」：三焦点面全部送达（document
级 keymap 与焦点位置无关）；drag 区只吞鼠标不吞键盘（点击后焦点保持 body）；
替代路径另有滚轮（`ReaderPage.tsx:174` onWheel——不依赖焦点）。**在场裁触发
条件**：若未来键位注册从 document 级改为焦点区级（如仅挂阅读器容器），本结论
需复测。

---

### B4 UI1 常驻流光 × 性能/功耗——N

**配方执行**：`auditb-b4.js`。库视图静止 5s×2 相 A/B（A=流光在场；B=运行时
`style.animation='none'` 关流光——不改源文件）；每相 rAF 自续帧计数+间隔分位+
PerformanceObserver longtask。（首轮探针 bug：rAF 未自续注册 frameCount=1——已修，
末轮数据为准。）

**静态链**：`workspace.css:12-31`——`.ws-trigger` 常驻
`animation: syn-pan-x 6s ease-in-out infinite`；`theme.css:605-613`——keyframes
仅动 `background-position`（往返型，配 background-size 220%）——**无 layout/paint
触发属性**；`:131-137` prefers-reduced-motion 关动画守卫在场。

**动态数值**（b4.json）：

| 相 | 帧数/5s | avgFps | gapP50 | gapP95 | gapMax | >50ms 帧间隔 | longtask | longtaskMs |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| A 流光在场（syn-pan-x 6s infinite 实证） | 501 | 100.2 | 10ms | 10.1ms | 10.2ms | 0 | **0** | 0 |
| B 流光关闭（verify=none） | 501 | 100.2 | 10ms | 10.1ms | 10.2ms | 0 | **0** | 0 |

frameCountDelta=0，A/B 帧轮廓逐分位一致。

**结论行：N**〔ds-审 W1 修订：机制归因降级为观测口径——零 longtask 只证无>50ms 长任务，合成器/paint 层结论需 CDP trace 补证，本版按观测事实记〕：两相 longtask
均 0、帧间隔 max 10.2ms（远低于 50ms 线）、开关流光帧轮廓零差——background-position
相对无差异（A/B 同帧轮廓）。**在场裁触发条件**：流光若改用触发 layout/paint 的
属性（width/复合 shadow 等）需复测；低端机上帧率预算敏感时的观感裁决留场场。
（注：无头会话 renderer 侧无 process.getCPUUsage 面——判级依简报许可的
rAF+longtask 探针口径。）

---

### B5 workspace 切换器面板 × SET1 zoom 大档——N

**配方执行**：`auditb-b15.js` B5 段。库视图 100%/125% 两档：开面板（点「切换
课题」）→ws-trigger/ws-panel/ws-item rect+computed font-size+scrollWidth/
clientWidth 溢出判定+内容区对照样本（.app-nav-item）+截图。

**静态链**：`theme.css:122-136`——缩放挂 `.app-content-row`（zoom: var(--ui-scale)）；
header（含切换器）在缩放行外结构性豁免（E5 裁决——caption/顶栏保持系统观感）；
`WorkspaceSwitcher.tsx:85-100` 触发钮 + `:115-169` 面板。

**动态数值**（b15.json `b5`）：

| 量 | @100% | @125% | 判读 |
| --- | --- | --- | --- |
| ws-trigger computed fontSize | 13px | 13px | header 行外——不随档 |
| ws-panel item fontSize | 12px | 12px | 同上 |
| .app-nav-item computed fontSize | 13.5px | 13.5px | computed 对 CSS zoom 无感（smoke.spec 同注）——**视觉字号实为 ×1.25** |
| .app-nav-item rect 高 | 40.3 | 50.3 | **×1.248**——内容区缩放实证 |
| ws-panel rect | x109 y42.2 **200×111.6** | 同左（逐位一致） | 面板几何跨档零变 |
| 面板宽/视口占比 | 0.156 | 0.156 | — |
| panel scrollW>clientW | false | false | 无溢出 |
| trigger 文本溢出 | false | false | 无截断 |
| 任一 item 溢出 | false | false | 无截断 |

**结论行：N**——判级线「面板截断/溢出=W（功能面）；纯观感反差=N 量化记档在场
裁」：功能面零截断零溢出（全元素全档 scrollW≤clientW）；量化反差在档=面板区
（顶栏行外豁免）字号/几何跨档零变 vs 内容区视觉 ×1.25（nav 高 40.3→50.3）。
观感方向级（顶栏面板与内容区大小反差是否可接受）按闲时零承担纪律留场场裁决。

---

### B6 TABS-04 关闭拦截 × SH3 三键 close × 最小化组合——N（含 1 BLOCKED 子项）

**配方执行**：`auditb-b6.js`，**两跑复现（数据逐位一致）**。dirty 注入=经 App
同一上报通道 `window.api.system.setQuitDirty({dirty:true})`（`App.tsx:139` 同
通道；真实 dirty 态需标注保存失败路径，通道注入对 main 侧 `quitDirtyCached`
等效——`bootstrap.ts` close 守卫读 `getQuitDirty()` 与来源无关，探针注记在案）；
close 触发=`windowControl({action:'close'})`（=三键「关闭」钮同一 IPC）；
最小化=`windowControl({action:'minimize'})`（模态期 renderer 三键被模态输入
抑制挡住真点不到——**任务栏最小化是真实用户路径**，main 侧动作等价）。

**静态链**：`bootstrap.ts:212-227`（close 守卫装配：dirty→preventDefault→
`dialog.showMessageBox(window,…)` parented 模态，defaultId/cancelId=1 防误触）；
`main-window.ts:196-211` handleCloseWithQuitGuard（确认=destroy/取消=保持/对话框
异常按取消）；`tests/unit/windows/quit-dirty-guard.test.ts`（受锁单测：clean
放行/dirty+确认 destroy/dirty+取消保持三态）；`src/main` 全量 grep 无第二处
窗口 disable 路径（export 服务 disabled 为按钮态非窗口）——**enabled 翻转信号
唯一归于模态**。

**动态数值**（b6.json，两跑一致）：

| 步 | visible | minimized | enabled | destroyed |
| --- | --- | --- | --- | --- |
| 基线 | false* | false | **true** | false |
| close 后（模态期 +1.2s） | true | false | **false** | false |
| 模态期 minimize（+0.8s） | true | **false（无效）** | false | false |
| restore 后 | true | false | **false（模态仍在）** | false |
| 二次 close 后 | true | false | false | false |

\* 基线 visible=false=ready-to-show 时序（采样早于首 paint；close 后 true 起
恒 true——不影响判读，全程自洽）。renderer 活性：模态期 evaluate 正常应答
（lib-card 计数 0=空库，B6 未种子文献——活性信号是 evaluate 响应本身）。

**结论行：N**——判级线「确认框期间最小化致 dirty 丢失或确认框消失=W」：两跑
均**零丢失零误关**（close 全程被拦含二次防重入、父窗禁用恒在场=模态不消失、
renderer 进程活）。**量化事实**：模态期 minimize 调用 ok 但 isMinimized 恒
false——Win32 owned-modal 语义**推演**〔ds-审 W2：待与 Win32/Electron 文档对证；N 级成立落在零丢失/零误关行为事实〕（模态挂起期间 owner 窗不可最小化推演，任务栏路径
同受此 OS 规则约束），用户唯一出口=应答对话框（两路径），无数据丢失路径。
**BLOCKED 子项**：「确认放弃/取消两按钮点击均可达」的动态取证不可执行——原生
对话框非 DOM，无头不可点；**替代取证**=上述静态链（bootstrap 装配+守卫纯函数
+受锁单测三态锚）。**在场裁触发条件**：若用户期望模态期可最小化（对照他窗
内容再决定是否放弃），属方向级交互裁决（自绘确认框 vs 原生模态）留场场。

---

## 二、探针环境事实（方法论记档——供后续取证/门审复用）

1. **Playwright `setViewportSize` 在 Electron 上锁死内容区**：CDP 设备度量仿真
   生效后，真窗 bounds 变化（最大化 2064×1120 实证）不再传导到
   innerWidth/innerHeight（恒 1280×800）——resize 行为面（含 B2）必须自然窗口
   尺寸取证（b23 首轮/末轮对照在档）。
2. **合成 dblclick 不触发 drag 区原生最大化**（首击被系统窗拖吞）；三键按钮路径
   同效 `BrowserWindow.maximize()`，已覆盖行为面。
3. **活动库路径**：L0 legacy-fresh（workspaces/ 无）=root `synapse.db`；**二次
   启动物化迁移 root→workspaces/default/synapse.db**（workspace.service L0 态机）
   ——跨 launch 探针的 DB 读需双路径探测（b23 修法在档）。
4. **模态挂起下 `app.close()` 死等**（close→dirty 守卫再拦截→再模态）；且仅杀
   主进程留 GPU/renderer 孤儿——模态场收尾用 `taskkill /F /T /PID` 树杀（b6
   修法在档）。
5. Windows 下子进程 dynamic import 绝对路径需 file:// URL 或 createRequire（b7
   修法在档）。

## 三、发现清单

### W 级（1 条）

**B7-W1：tags upsert 纯空格名 trim 后空串入库**
- **现象**：`upsert({name:'   '})` 应答 `{ok:true, data:{name:''}}`；真库 tags
  表出现 name='' 行；`list()` 将空名标签浮出 UI 数据面（TagEditor/筛选器可见
  空白 chip 面）。
- **根因**：`tags.service.ts:57` upsert 只 trim 无空判——同文件 rename（:73-75）
  已有同型守卫先例（注释明言 zod min(1) 拦不住纯空格）；zod
  `tagNameReqSchema.min(1)`（schemas.ts:355）对长度 3 的纯空格放行；repo
  `upsertByName`（tags.repo.ts:125-131）无守卫直插。
- **证据**：b7.json 全量（IPC 应答/list/真库计数/trim 对照/rename 对照）；
  file:line 如上。
- **建议票面方向**：upsert 对齐 rename 校验序——trim 后 `name===''` →
  `INVALID_REQUEST '标签名不能为空'`（一行级修票）；态空间=输入三格（空串/
  纯空格/有效名）×两方法（upsert/rename）归一；单测两条（`'   '`→
  INVALID_REQUEST 红；`'  x  '`→`'x'` 绿——trim 正常面不回归）。既有 P7E-01
  票系（rename/merge/delete）补 upsert 缺口。

### N 级（6 条——量化事实+在场裁触发条件）

1. **B1-N 划选工具条×zoom 自洽**：定位偏移 0px（顶锚恒 42.0、dx=0 两档）、无
   遮挡、不出滚动容器；gapV 差 7px=工具条盒高 ×1.25 尺寸效应非坐标混用。
   触发条件：新增 ≥150% 档时 TOOLBAR_ABOVE=42 余量（125% 档残余 3.8px）转负
   即工具条压选区——届时需票面（常量动态化/按 ui-scale 补偿）。
2. **B2-N 最大化×进度零扰动**：真 resize（clientH 676→978）下
   nearestPage/scrollTop/store 页码/DB 落账全恒定、零 scroll 事件。触发条件：
   无（该对闭环）。子项注记=合成 dblclick 不可达（§二.2），按钮路径同效已覆盖。
3. **B3-N drag 区×键位**：PageDown 三焦点面全滚（612.8px=clientH×0.9）；drag
   区只吞鼠标（点击后焦点保持 body），键位经 document 级 keymap 与焦点无关；
   滚轮为焦点无关替代路径。触发条件：键位注册面若改为焦点区级需复测。
4. **B4-N 流光（观测口径）**〔ds-审 W1 降级〕：A/B 相 501 帧同轮廓（100.2fps/gapMax 10.2ms/longtask
   0）——相对无差异+零长任务；合成层结论留 CDP trace 补证位；reduced-motion 守卫在场（workspace.css:131-137）。触发
   条件：动画属性改 layout/paint 触发面需复测；低端机观感留场场。
5. **B5-N 切换器面板零溢出**：全元素全档 scrollW≤clientW；面板几何跨档零变
   （200×111.6/15.6% 视口）；量化反差=面板区（顶栏豁免）恒 12/13px vs 内容区
   视觉 ×1.25（nav 高 40.3→50.3）。触发条件：观感方向级反差接受度留场场。
6. **B6-N 模态×最小化无丢失**：close 全程拦截（含二次防重入）+父窗禁用恒在场
   （模态动态信号，main 无第二 disable 路径）+renderer 活；模态期 minimize
   无效=观察事实+owned-modal 推演归因（非应用缺陷判定基于零数据丢失路径的行为事实）。BLOCKED 子项=
   两按钮点击动态取证（原生对话框无头不可点）→静态链+受锁单测替代。触发条件：
   「模态期可最小化」期望若成立=自绘确认框方向级改造留场场。

## 四、纪律自查

- **只读面**：`git status --porcelain` 全 untracked（auditb-*.js+auditb-out/+
  主控既有 brief/auditc 残件）；`git diff` 空——零 src/tests/tickets/locks
  改动、零 git 写操作 ✓。
- **计数落笔前实测**：本报告一切数字出自 auditb-out/*.json 转储（探针 stdout
  同步在档），无凭印象值 ✓。
- **better-sqlite3 ABI 还原**：b7/b23 探针内 sha256 对账 true + 收尾独立复核
  build/Release=abi-cache/electron-v146 哈希一致 ✓。
- **无可见浏览器/前台占用**：全程 Playwright `_electron` 驱动既有构建产物
  （f-* forensics 族同型），未开内置浏览器 ✓。
- **verify 基线**：未触碰任何受锁/测试/源文件——基线不动（主控收口时按简报
  验收项复核）。
- 探针 locks 登记归主控收口（子代理禁 locks——简报 §一.2 纪律；.js 后缀已
  避开 check-locks walk 的 .mjs/.ps1 自动覆盖面）。
