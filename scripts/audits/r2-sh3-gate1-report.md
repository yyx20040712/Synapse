# R2-SH3 门一对抗深审报告（三屋 ADR-0017）

> 审计人：门一对抗深审孙代理（GLM-5.3，只读）。
> 输入：gate1.diff（19 文件 +731/-23）/ 票面 r2-sh3-ticket.md / 实现报告
> r2-sh3-impl.report.md / 证据日志 11 件 + r2-sh3-out/regions.json。
> 方法：静态读码+逐帧推演+实物核对（wc/git diff --stat/grep 日志）；禁跑 npm/test。
> 等级：B=通过；W=有据缺陷（低危可修）；N=信息性备注（无需动作或择机）。

## 技能清点（宪法开工纪律）

- code-review-excellence：**用**（本任务即对抗深审）。
- verification-before-completion：**用**（结论逐项与实物核对后才落档）。
- test-driven-development：不用——只读审计方不写测试；红/绿/变异证据链以票面规约为评判基准。
- systematic-debugging：不用——静态审计非故障定位。
- 其余运维/数据/设计类：不用——与本审计面无关。
- 配置自查：本代理无派发面；只读角色，模型/思考等级承主控配置。

---

## A. 母本符合度（diff vs 票面五层）

**A1 [B] 行为层四 action 语义逐项落地**
main-window.ts:236-255 `controlWindow` switch 四分支与票面行为层表逐行对应：
minimize→`win.minimize()`（238-240）；maximize-toggle 双向（241-247，
`isMaximized()?unmaximize():maximize()`）；close→`win.close()`（248-250，
绝无 destroy 调用——switch 全文无 destroy 分支）；get-state 空操作零副作用
（251-252）。统一回读 `{ maximized: win.isMaximized() }`（254）符合票面
「执行后回读」语义。头注 25-26 行声明 close 不 destroy 的守卫链理由。

**A2 [B] maximize 状态机三态落地**
TitleBarControls.tsx:487 `useState<boolean|null>(null)` 对应 unknown 态；
get-state 应答（493-498）与 onWindowState 事件沿（499）双通道收敛同一
setState；maximized=true 时 aria-label 与图标双切「向下还原」（523-527）。

**A3 [B] 布局行为全对齐**
theme.css:91 header=drag；:109 switcher=no-drag；:127 controls=no-drag；
:111-113 版本号 `margin-left:auto` 保留；三键排最右——regions.json
rightOrder 实证 `logo→Synapse→切换器→v0.1→titlebar-controls`。

**A4 [B] 接口层逐文件九处全落地**
schemas.ts:677-688（req/event/res 三 schema）；api-surface.ts:644
（windowControl 通道）+:655（EVENT_CHANNELS.windowState）+:662
（PreloadEvents.onWindowState）；main-window.ts:125（titleBarStyle:'hidden'
，autoHideMenuBar:122 保留）；ipc/index.ts:200（IpcDeps.controlWindow）；
ipc/system.ts:223-226（handler 透传回带）；bootstrap.ts:160（闭包）+:218
（事件绑定，与票面形式逐字一致）；preload/index.ts:393-397（手写桥）；
App.tsx:152（版本号后挂载）。独立导出 `windowControlActionSchema` 系自裁 1
（形状等价，服务类型单源），已过主控初核，无新攻击依据。

**A5 [B] 架构层合规**
类型单一真相源：action 枚举/事件形状只住 schemas.ts；renderer 经
`import type` 复用（TitleBarControls.tsx:460）；`window.apiEvents` 类型来自
env.d.ts:6 `PreloadEvents` 推导（api-surface 单源）。App.tsx 187 行 ≤250。
皮肤全住 theme.css 类，组件零内联交互态 style（B1 教训遵守）。

**A6 [B] 文化层测试清单全落地+主控预裁六条全遵守**
window-control.test.ts（四 action/事件绑定/titleBarStyle/CSS 皮肤锁）、
system.test.ts 扩展、preload-surface.test.ts 扩展、smoke.spec e2e 扩展
（三键可见+computed 三断言+poll 真行为）均落地；预裁①~⑥（单通道四
action/get-state 拉初值/close 不 destroy/不用 overlay/版本号 auto/drag-
no-drag 归属）逐条与实物一致，无推翻依据。

**A7 [N] 票面自述数字小误**
票面架构层称「App 现 184 行」，git 基线实测 183 行（App.tsx 现 187）。
票面笔误，无实质影响。

## B. 宪法红线

**B1 [B] 安全面零触碰**
main-window.ts:119-132：`titleBarStyle:'hidden'` 在 BrowserWindow options
顶层（:125），webPreferences 对象（:127-131）内 `WINDOW_SECURITY_FLAGS`
原样展开零改动；diff 中 WINDOW_SECURITY_FLAGS 定义（:62-72）无任何变更。
web-preferences.test.ts 不在 diff（安全面测试全量保留）。禁令清单
（nodeIntegration/webSecurity/sandbox/contextIsolation）无一条触碰。

**B2 [B] 文件行数全过**
main-window.ts 268≤500；App.tsx 187≤250（组件红线）；bootstrap.ts 243；
TitleBarControls.tsx 112；tests 面 max-lines off（eslint.config.js:187-189）；
lint exit=0 实证。

**B3 [N] theme.css 569 行（基线 510 已超 500）**
ESLint max-lines 面不含 css（files 数组均 ts/tsx；lint 绿实证）。宪法字面
「文件≤500」的机器强制口径=ESLint 面，css 超限系本票前既存状态，非本票
引入的违例。备查。

**B4 [B] UTF-8 中文**
全部改动文件中文注释 Read 可读；quality 检查（mojibake 关卡）exit=0
（r2-sh3-quality.raw.txt：「无占位标记/无乱码/无跨域引用」）。

**B5 [B] 分层单向**
renderer→window.api/window.apiEvents（TitleBarControls.tsx 无 electron/
Node/绝对路径 import）；main 侧 ipc→注入（IpcDeps 形状）无跨层；schema
类型经 shared 单源。合规。

**B6 [B] 受锁流程与申报一致**
check-locks.mjs:25-43 受锁集合含 tests/**、src/shared/**、`scripts/**`
的 .mjs/.ps1——报告§7 申报「新增受锁路径 2 个（window-control.test.ts、
r2-sh3-forensics.mjs）」判定正确；manifest 现无 r2-sh3 条目（grep=0）与
「未 apply 归主控收口」申报一致（当前=check 必红的预期态，报告§3 已声明）。
改动面核对：unlock 后实际触碰受锁文件=schemas/api-surface/system.test/
preload-surface.test/smoke.spec/ipc-deps/app-shell/app-quit-dirty/
lineage-board 共 9 个+新增 2 路径，与§2 表格逐行相符，无瞒报。
git log 无新提交（HEAD 仍 e471fc7f）；staged 区无内容性改动
（`git diff --cached --stat` 空）；三个新文件的 index A 标记系主控生成
diff 包所需 add 痕迹（未 add 的新文件不进 git diff），非实现者违规。

## C. 代码与测试质量

**C1 [W] TitleBarControls 初值竞态：get-state 迟到应答可覆盖事件新值（逐帧推演）**
时间线：effect（TitleBarControls.tsx:489-504）内先 invoke get-state 后同步
订阅 onWindowState——订阅建立不晚于请求离开 renderer，**挂载前**的翻转由
get-state 快照兜住（一致）。真正的窗口在**跨通道乱序**：invoke 应答与
`webContents.send` 走不同 Mojo 通道，Electron 不保证二者投递顺序。若在
[main handler 读快照] 与 [renderer 应用应答] 区间内窗口翻转且事件先到：
事件 setState(新值) → 应答 setState(旧快照) 覆盖 → 图标错态一拍。
现实性：初值拉取发生在挂载时刻，启动态恒非最大化（loadBounds 只恢复
x/y/w/h 不 maximize，window-state.ts:35-51），需在毫秒级窗内完成
「双击最大化→还原」物理上不可能；StrictMode 双跑首跑应答被 alive 门丢弃。
点击路径（send()）应答与事件沿必然同值无冲突。后果=图标一拍错态，下次
事件沿/点击自愈，无数据面。**一行可修**：应答侧改函数式 setState 仅
unknown 态应用（`setMaximized(prev => prev===null ? r.data.maximized : prev)`）。
定级 W：真实理论洞+修复成本一行，但发生率趋零且自愈——不构成回炉，
建议主控收口顺手加固或登记观察项。

**C2 [B] controlWindow/bindWindowStateEvents 纯逻辑推演通过**
四分支互斥穷尽（switch 无 default——zod enum 四值封闭，tsc exhaustiveness
由返回类型倒逼）；close 分支无 destroy；bindWindowStateEvents 事件映射
（maximize→true/unmaximize→false）正确；win 最小化不触发两事件
（Windows 语义，测试桩注释 952-954 亦锚定）。

**C3 [B] preload 桥退订正确**
index.ts:393-397 `listener` 箭头函数同一引用用于 on/removeListener，
退订精确；与既有 onImportProgress/onExportCorpus 同型；契约测试
（preload-surface.test.ts:698-719）断言 removeListener 收到同通道同函数。

**C4 [B] CSS 皮肤特异性显式推演通过**
- `.app-header svg`（theme.css:93-97，specificity (0,1,1)）vs
  `.titlebar-btn svg`（:144-151，(0,1,1)）：同特异性，源序后者在后胜→
  10px 生效；依赖已在块注释声明（:117-118）。
- `.titlebar-btn:hover`（:152，(0,2,0)）vs `.titlebar-btn-close:hover`
  （:160，(0,2,0)）：同特异性源序 close 在后→close 红压过普通 hover；
  `:active` 对（:156 vs :164）同理。真机取证实证 close hover computed=
  `rgb(232,17,35)`（#e81123）+matches(':hover')=true。
- base `.titlebar-btn`（(0,1,0)）恒被自身复合伪类（(0,2,0)）压制——
  hover/active 生效无障碍。
- 内联恒压一切类：组件零内联 style，无此风险面。
- logo SVG（App.tsx:139-142 内联 fill/stroke presentation 属性）不受
  `.titlebar-btn svg` 影响（不同子树）；`.app-header svg` 未设 fill/stroke
  无覆盖冲突。

**C5 [W] margin-right:-12px 联动注释不足，且报告转述强于实物**
报告自裁 5 称「与 header padding 联动已注释」、疑虑 4 称「(已注释声明)」。
实物核对：theme.css:126 `margin-right: -12px` 行内无注释，所在块注释
（:115-123）只讲热区贯通/align-self 病灶/svg 覆写——**未声明 -12 对冲
header `padding: 0 12px`（:86）的数值联动与「两值须同步改」警示**。取证
rect（x=1236,w=44,right=1280）实证贴缘行为正确，但维护耦合未落到代码。
一行可补。定级 W：主控点名审项不达标+报告「已注释」表述失真（无实质
隐瞒，注释主题存在但未覆盖联动语义）。

**C6 [N] close 红的源序依赖未注释**
`.titlebar-btn-close:hover/:active` 对 `.titlebar-btn:hover/:active` 的压盖
依赖同特异性源顺序（:152/:156 vs :160/:164），注释只声明了 svg 一处的
源序依赖（:117-118）。未来若有人在文件尾部追加 `.titlebar-btn:hover`
变体会意外压掉 close 红。低危备注，可与 C5 同一处补注。

**C7 [B] 测试断言质量**
window-control.test.ts 全部一行一断言、无行尾注释、无恒真；否定断言面
全（close 用例断 destroy/minimize 均 not called：1020-1027；get-state 用例
断四个 mutator+destroy 全 not called：1029-1038）；桩 `makeWin` 的
isMaximized 真实反映 maximize/unmaximize 副作用（949-963）非恒值。
system.test.ts 新用例 seen 数组锁四 action 顺序。preload-surface 新用例
与既有 onImportProgress 样例（:73-95）逐形态同构。

**C8 [B] 变异红证四方向证据链真实**
逐份核对红行与断言对位：①删 titleBarStyle→`toMatchObject` 差集仅
`titleBarStyle`（mut-titlebar.raw.txt:142 断言行）；②close 改 destroy→
`win.close` spy `to be called 1 times, but got 0 times`（mut-close-
destroy.raw.txt:101）；③toggle 分支反转→常态+最大化态两用例红（mut-
toggle.raw.txt:85/:93，maximize/unmaximize spy 各 0 times）；④no-drag
摘除→`expected +0 to be 2`（mut-nodrag.raw.txt:161 计数断言）。四方向
均「先红」实证，非恒真断言。

**C9 [N] CSS 文本断言的 drag 面未计数锁**
no-drag 用 split 计数=2 精确锁；drag 仅 `toContain`（window-control.
test.ts:1077-1079）——未来他处新增第二处 drag 不红。主控预裁②已接受
文本断言形态（theme.test.ts 同型先例），固有脆弱面备案。

**C10 [B] bootstrap TDZ 论证复核通过**
bootstrap.ts:160 闭包 `(action)=>controlWindow(window,action)` 捕获 :174
的 `const window`。解引用仅发生在 IPC handler 执行时=renderer invoke=必然
晚于窗口创建与 const 初始化（registerIpc :144 仅注册不调用；窗口创建前
无 renderer 页面可发请求）。dialogs 惰性 getter 先例同段（:151-153）。
论证成立。

**C11 [N] StrictMode 双跑与 act 告警**
入口 React.StrictMode（main.tsx:8-11）下 effect 双跑：首跑应答被 alive
门丢弃（:500-503）、退订执行——无害。green 日志 act 告警 1362 次 vs
first-red 1356 次（+6，TitleBarControls 挂载增量），`IS_REACT_ACT_
ENVIRONMENT` 未设系**预存测试环境噪音**非本票新缺陷。

**C12 [N] fullscreen 态不在图标反映面**
F11 等 fullscreen 走 enter-full-screen 而非 maximize 沿，图标态不反映。
票面未裁此面（Windows 单人应用、负面清单外），备注防后续误判为缺陷。

## D. 报告诚实性

**D1 [B] 文件数与增量核对**
`git diff --stat` 实测 19 文件 +731/-23 与 diff 包、主控简报三方一致；
报告「16 修改+322/-23+新 3 文件」自洽（322+133+112+164=731）。

**D2 [B] 行数抽查全中**
wc -l 实测：main-window.ts=268、App.tsx=187、TitleBarControls.tsx=112、
window-control.test.ts=164、forensics.mjs=133——与报告§2 表格逐项相同。

**D3 [B] 证据日志存在性+内容与转述一致**
11 件日志全在位。first-red：`11 failed | 893 passed (904)`，失败分布
window-control 9+system 1+preload-surface 1（grep FAIL 三文件计数吻合），
基线零破坏属实；green：108 文件/904 全过+末行 `exit=0`；lint/typecheck/
quality/build 四件均无错误输出；forensics.raw.txt+regions.json 实测值与
报告§4 逐项同（appRegions 三值/aria-label 切换/isMaximized true→false/
close hover rgb(232,17,35)/rect 44×43.2/rightOrder 次序）。

**D4 [N] 变异还原 diff 确认未落盘**
报告称「cp 还原→diff RESTORED-CLEAN」但日志只有变异跑红；还原证据缺失。
间接佐证：当前工作区=干净实现（git diff 与 diff 包逐字节级 stat 一致，
titleBarStyle 在位/close 分支无 destroy/no-drag 两处在位），四变异确已
还原。流程瑕疵备案，不疑造假。

**D5 [N] §7 概述句数字混乱**
「改动受锁文件 7 个(…=10 个文件)」——括号清单实数 9 个（§2 表格准确
无隐瞒），「7」与「10」均为算术笔误。实质面（文件清单）无失真。

**D6 [B] 自裁申报 8 条逐条 vs diff 无未申报改动**
diff 全部改动落位：schema 独立导出（自裁1）/CSS 文本断言（自裁2，主控
预裁背书）/TDZ 闭包（自裁3）/renderer 三桩扩客（自裁4，主控预裁⑧背书）/
皮肤细节（自裁5，见 C5 注释缺口）/图标尺寸（自裁5⑥）/e2e 形态（自裁7，
未跑已申报归主控）/ipc-deps 桩（自裁8）。forensics.mjs 系票面⑤b 取证
义务的实现载体+报告§2 列明。无超申报的源码/测试改动。

## E. 接缝与后续单

**E1 [B] App header 对 F-05 高度链零扰动**
三键容器 `align-self:stretch` 在 44px header 内贯通（取证 rect 高 43.2=
44-border）；switcher `max-height:44px` 约束原样；header 高度/overflow
行为不变；三键 `flex:none` 不挤切换器（margin-left:auto 分隔）。

**E2 [B] workspaces.spec 回归风险解除（待 e2e 真跑确认）**
spec 点「切换课题」钮（workspaces.spec.ts:39/:59）位于 no-drag 容器
`.app-header-switcher` 内，Playwright 点击不被 drag 区吞——票面「免费
防线」逻辑成立。注意 e2e 全套**未真跑**（报告申报归主控收口首验，
smoke 新用例+workspaces 旧用例都需 `npm run test:e2e` 过一遍；取证脚本
已验证同型点击/isMaximized 逻辑，风险低但非零）。

**E3 [B] quit-dirty-guard 链接缝完整**
close 按钮→`windowControl('close')`→`controlWindow`→`win.close()`→
bootstrap 两个 close 监听：saveBounds（:189-194）先注册先执行，quit
guard（:199-214）后执行 preventDefault+模态确认（顺序意图有注释
:196-198）——clean 放行/dirty 拦截弹框，与 TABS-04 状态机吻合；
quit-dirty-guard.test.ts 未动（行为面零触碰）。

**E4 [N] window-state 与最大化态的既有怪癖（非本票引入）**
maximized 态下关闭：saveBounds 保存最大化 bounds→下次启动恢复大窗但
非 maximized 态。既有行为（TABS-04 时代即如此），头注「bounds 记忆不受
影响（仅记忆 x/y/w/h，已存行为）」声明属实；但本票新增双击 drag 最大
化路径使最大化态更常驻，怪癖更易触达。建议后续票观察项登记（如 close
时 isMaximized 则保存 restore bounds）。

**E5 [N] 下票 SET1（zoom 三档）与 caption 的相互作用预判**
`setZoomFactor` 将等比放大自绘 caption：44px 热区/10px 图标随 zoom 变大
（zoom1.5→66px/15px），与系统应用「caption 不随页面 zoom 缩放」惯例相
悖；好消息：margin-right:-12px 对冲随 zoom 等比放大（-18 对 18）仍精确
贴缘，不产生错位。SET1 设计时需裁决 caption 是否 zoom 豁免（zoom 挂内容
容器而非 root，或 caption 容器反向缩放）——本条供下票票面预裁引用。

---

## 统计与总评

| 等级 | 数量 | 条目 |
| --- | --- | --- |
| B | 23 | A1-A6, B1/B2/B4/B5/B6, C2/C3/C4/C7/C8/C10, D1/D2/D3/D6, E1/E2/E3 |
| W | 2 | C1（初值竞态理论洞）, C5（-12px 联动注释不足+报告转述失真） |
| N | 10 | A7, B3, C6, C9, C11, C12, D4, D5, E4, E5 |

**总评：可收口（无回炉强制项）。**

- 母本符合度：票面五层逐节落地，主控预裁六条+实现者自裁八条全部核对
  无走样、无漏项、无未申报改动。
- 宪法红线：安全面（titleBarStyle 在 webPreferences 外、WINDOW_SECURITY_
  FLAGS 零触碰）、行数、UTF-8、分层、受锁申报全部通过。
- 证据链：首红 11 用例三文件分布、绿 904、变异四方向红行逐份与断言
  对位、真机取证 regions.json 值——真实可复核。
- 两条 W 均为低危一行修，建议主控裁量处置：
  1. C1：TitleBarControls get-state 应答改函数式 setState（仅 unknown
     态应用）——消除跨通道乱序覆盖窗；
  2. C5：theme.css:126 补「-12 对冲 header padding 0 12px，两值同步改」
     注释（可连同 C6 的 close 红源序依赖一并补）。
  二者不阻塞收口；若主控不改，建议将 C1 登记为已知限制（发生率趋零+
  自愈）写入交接书。
- 收口前必做（主控面）：`npm run verify` 全量+`npm run test:e2e`
  （smoke 新用例+workspaces 回归首验，实现者未跑已申报）+locks:generate
  扫入两个新受锁路径+[locked-change] 提交。
