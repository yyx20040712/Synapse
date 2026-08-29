# R2-SH2 实现者报告——顶栏身份区+字体衬线消费清零（三屋·ADR-0017）

> 工单：R2-SH2 / 实现者子代理 / 模型 builtin:bigmodel-coding-plan/GLM-5.3（思考等级 thinking）
> 基线锚：HEAD=5ae8620；开工 verify 基线=107 文件 888 用例/locks 166/e2e 26。
> 产物：实现+受锁改写+变异红证 2+verify/e2e 全绿；状态=完成（无 BLOCKED）。

## 开工记录·技能清点（会话开工纪律）

- **test-driven-development：用**——本单核心流程（首红→绿→变异红证全链走完）
- **verification-before-completion：用**——verify 真退出码亲验落盘（EXITCODE=0）
- **systematic-debugging：用（条件触发）**——verify 首跑红在 locks:check=流程顺序问题
  （relock 先于全量 verify），e2e 首跑假红=tee|tail 管道 SIGPIPE（非测试缺陷，复跑即绿）
- **frontend-design / frontend-ui-engineering：不用**——CSS/JSX 规格票面预裁已给全，无设计探索面
- **browser-testing-with-devtools / webapp-testing / e2e-testing-patterns：不用**——e2e 由
  既有 playwright spec 承担，票面已定两 spec 零改预判（实测兑现）
- **其余（DB/云/安全/SRE/Git 工作流类）：不用**——纯渲染层单域改动；git 操作被实现者禁令排除
- 配置自查：自身处于正确模型/思考等级（首行已自报）；无子代理派发。

## 1. 行为层

- **顶栏身份区（决4）**：App 壳根布局改「顶栏 header+侧栏+主区」——根 div 改
  `flex h-full flex-col`；`<header className="app-header">` 居根最前（nav 之先），
  内容=logo svg（迁自 .app-nav-brand，资源不删）+`<span className="app-header-name">`
  Synapse+WorkspaceSwitcher（迁挂，组件文件零触碰，dirty/onManage props 原样）+
  `.app-nav-ver` v0.1 右区（margin-left:auto 推右——预裁2 信息保留）；nav 内
  `.app-nav-brand` 行整删，nav 首行直接起导航项，`.app-nav-foot` 原样留侧栏（ver 迁
  走后剩 txt 文案「本地学术文献管理」）。内容行 `flex min-h-0 flex-1` 保文档永不滚
  不变量（滚动仍只发生在 main 容器）。
- **样式（theme.css）**：新 `.app-header` 族=白底 var(--panel)+下边 1px var(--border)+
  高 44px（h-11）+flex 行布局+padding 0 12px；`.app-header svg` 22px；`.app-header-name`
  15px/600/var(--text)；`.app-header .app-nav-ver` 推右。侧栏 `.app-nav` 规则零值改
  （flex column 自适应——brand 删后首行即导航项），`.app-nav-brand`/`.app-nav-brand svg`/
  `.app-nav-name` 三规则删除（类随品牌行退役）。
- **字体衬线消费清零（决5）**：五消费类 font-family 声明删（回继承 UI 字体）——
  `.app-nav-name`（随类删）/`.app-nav-ver`/`.rdr-num`（**tabular-nums 保留**）/
  `.rdr-aside-h4`/`.syn-settings h2`；`--font-display` :root 定义 **:34 保留**（决5 原文）。
- **--gold-night 别名退役（LG10 结案）**：:41 定义删除；头注值冲突裁决段同步改写
  （「别名已随 R2-SH2 决5 别名退役删除——死代码即删」）。
- **注释同步**：.rdr-num（去「衬线」表述）/​.rdr-aside-h4（同）/​App 壳侧栏段注释
  （品牌行迁顶栏说明）/​App.tsx 头注与 JSX 内注释（顶栏身份区+断言面说明）。

## 2. 接口层

改动文件 3 实现+3 受锁测试（+locks manifest）：

- `src/renderer/app/App.tsx`：return 块重排（header/内容行 wrapper）+头注同步；~200→204 行。
- `src/renderer/shared/theme.css`：.app-header 族新增（4 规则）+brand 三规则删+五 font-display
  消费删+gold-night 定义删+注释同步；414 行（红线内）。
- `tests/unit/renderer/app-shell.test.tsx`（受锁）：品牌断言侧栏→顶栏改写（含版本号右区）
  +新 it①顶栏三件（header 在场+logo/品牌名/切换器在 header 内）+新 it②侧栏品牌行
  负锚（.app-nav-brand/.app-nav-name 零残留）+describe 名与头注同步。
- `tests/unit/renderer/theme.test.ts`（受锁）：TOKENS 删 --gold-night 行+新 it 源码形态
  负锚（css 不含 `var(--font-display)` 消费串+不含 `--gold-night:` 定义——B1 先例形态锁）。
- `tests/unit/renderer/r3-rdr-set-visual.test.tsx`（受锁，**票面外第三面自裁——见 W1**）：
  :151「金节标=衬线+金左缘条」正断言（与决5 互斥的旧形态锁）改写为负锚
  （not.toMatch var(--font-display)），金左缘条/分节卡值面断言原样。
- `locks/manifest.json`：3 受锁测试 hash 同步（generate 实测）。
- 无新模块/无 IPC/无 shared 面/无新依赖。

## 3. 架构层

- 零新依赖（运行时预算不变）；分层零涉（纯 renderer 壳层）。
- 行数红线：App.tsx 204/theme.css 414/两测试 175/155——均 ≤500。
- WorkspaceSwitcher.tsx **零触碰**（git diff 无此文件）——纯挂载点迁移。
- 死代码即删：brand 三 CSS 规则+gold-night 定义随消费清零删除；无孤儿残留
  （grep 全仓 font-display/gold-night 消费面=theme.css 定义+library.css 既有 3 处+测试负锚/注释，见 W2/W3）。

## 4. 测试面

- **TDD 全程**（红先于实现）：受锁测试批内改→`npm run test` 首红=4 failed|886 passed
  (890)——红点全在新断言面（app-shell 改写 it+新 it①②+theme 负锚 it），落盘
  `scripts/audits/r2-sh2-firstraw.log`（FIRSTRAW_EXITCODE=1）→实现→绿 890/890
  （EXITCODE=0）。
- **意外红处置（W1 接缝）**：绿前首跑红出 `r3-rdr-set-visual.test.tsx`（票面§4 未列的
  第三受锁面）：其 :151 材质文本锁断言 `.syn-settings h2` 含 var(--font-display)——
  与决5 直接互斥。按主控预裁5「必红则受锁改写申报」同构逻辑自裁批内改写为负锚
  （**非放宽断言**——旧形态锁→决5 新形态锁，与 theme.test 负锚同向双保险），
  报告申报待门一深审。
- **变异红证 ×2**（cp 备份法，禁 git checkout——未提交实现）：
  ①删 header JSX 块→app-shell 顶栏 2 it 红（r2-sh2-mutation-1.log）→cp 还原 diff 空；
  ②.rdr-num 回填 `font-family: var(--font-display)`→theme 负锚 it 红
  （r2-sh2-mutation-2.log）→cp 还原 diff 空。两红点均断言级锁值精确命中。
- **verify 全量**：relock（unlock→批内改→generate→apply）后 `npm run verify` 真退出码
  0 落盘 `scripts/audits/r2-sh2-verify.log`（quality/tickets/locks/lint/typecheck/test/
  build 全绿；首跑红在 locks:check=relock 前跑 verify 的流程顺序问题，relock 后复跑即绿）。
- **用例数实测 890=预测 890±2 精确命中**：构成=888 基线+app-shell 新 it 2+theme 新
  it 1−theme TOKENS --gold-night it.each 行 1；r3-rdr-set-visual 3 it 改断言不加数。
- **locks 166 实测命中**（无新受锁路径；manifest 3 hash 更新+generatedAt）。
- **e2e 零改预判验证**：`npx playwright test smoke.spec.ts workspaces.spec.ts`=
  **5/5 passed（4.5s，E2E_EXITCODE=0）**落盘 `r2-sh2-e2e.log`——smoke:22
  getByText('Synapse') 零改过（品牌文本迁顶栏后仍唯一在场）+workspaces 切换器断言
  全 getByRole name 无容器位断言。首跑退出 1=tee|tail 管道 SIGPIPE 假红（第 5 件无
  失败输出），文件重定向复跑 5/5 绿。其余 spec 归主控收口。
- **真机复评面归主控**（票面§4）：顶栏观感+F-05/INV-34 TabBar 行高链/滚动收敛冒烟+
  设置/侧板节标无衬线残留抽查+切换器展开面板白底对比度（W4）。

## 5. 文化层

- 基线锚全数兑现：888→890（+2 精确）、locks 166 不变、e2e 两 spec 零改通过。
- 流程合规：npm run test 正规入口（未裸 vitest——ABI 陷阱）；SYNAPSE_USER_DATA 面
  零触碰真实 %APPDATA%（单测无 IO 面；e2e spec 内部自建 mkdtemp tmp）；
  禁令遵守（无 git add/commit、未翻 registry——开工时 registry.ts 的 M=主控预登记
  R2-SH2 工单条目 status: 'open'，本单产物不含此文件改动）；UTF-8 全程（报告写后
  cat 验证）；变异还原 diff 双空；/tmp 备份已清理；git diff --stat 范围自查=7 文件
  （3 实现+3 受锁+manifest，另 registry.ts 既有 M 非本单产物）。
- 成本：实现者子代理会话级 token/时长未计量（环境无计量面），申报「未计量」。

## 6. 申报区（Switcher 样式依赖核查+自裁+W/B）

### WorkspaceSwitcher 样式依赖核查结论（主控预裁3 兑现）

grep theme.css 全量 `.app-nav` 相关选择器=13 处**全部为独立类名**（.app-nav /
.app-nav::after / .app-nav-brand / .app-nav-brand svg / .app-nav-name / .app-nav-item /
.app-nav-item svg / .app-nav-item:hover / .app-nav-item-active / .app-nav-item-active::before /
.app-nav-foot / .app-nav-ver / .app-nav-txt），**零 `.app-nav .xxx` 祖先组合选择器**；
Switcher 组件样式全走内联 style（triggerStyle/panelStyle/fieldStyle）+tailwind 类，
theme.css 中无任何 workspace-switcher 类引用。**结论：无祖先锚定→theme.css 选择器
面零改，WorkspaceSwitcher 文件零触碰成立。**

### 自裁超票面决定（B 计 2）

- **B1**：Switcher 挂载点包一层 `<div className="app-header-switcher">`（+theme.css
  `.app-header-switcher { max-height: 44px }`）——票面「纯容器迁挂」未预见的布局
  保全：组件根是 flex-col（trigger+展开面板流内），无高度锚时展开面板会撑高顶栏
  （44px 定值被破）或 align-items:center 下整体上移出栏。max-height 锚住常态高度，
  面板向下溢出绘制（F-05 高度链不扰动）。
- **B2**：`.app-header` 加 `position: relative; z-index: 10`——展开面板溢出绘制时
  防 DOM 顺序在后的 main 区内容盖板（header 先于 main，无定位时后者压前者）。

### 观察项（W 计 4）

- **W1（受锁扩面）**：r3-rdr-set-visual.test.tsx:151 为票面§4 未列的第三受锁面
  （R3-U4 时期「金节标=衬线」形态锁，与决5 互斥）。自裁按预裁5 同构改写为负锚
  （见§4）。**门一请深审此改写是否在授权域内**；若裁越权则回退该 it+实现侧
  .syn-settings h2 回填衬线（二选一，主控裁决）。
- **W2（票面外既有消费）**：library.css 尚存 3 处 `var(--font-display)` 消费
  （.lib-card-year :88/.lib-detail-title :190/.lib-detail-v-serif :201）——不在票面
  五类清单（五类全在 theme.css），按禁超票面未动。若决5 语义=**全仓**衬线消费清零
  （而非五类清单口径），主控需补微票；theme.test 负锚现锁 theme.css 单文件与票面
  口径一致，无冲突。
- **W3（注释漂移-轻微）**：theme.test.ts:11 头注仍含「夜面值别名 --gold-night
  （R2 消费预留）」历史表述——票面注释同步范围=theme.css，测试文件头注按最小面
  未动，留主控裁量。
- **W4（观感风险-归主控真机复评）**：Switcher trigger 夜色适配内联样式
  （rgba(255,255,255,.05) 微底+#efe9da 亮字）系 R3-TH1 为墨青侧栏设计，迁白底
  顶栏后文字对比度存疑；组件零触碰红线未动，与 F-05 面一并归主控收口真机复评。

### BLOCKED：无。

### 产物清单（scripts/audits/）

`r2-sh2-firstraw.log` / `r2-sh2-mutation-1.log` / `r2-sh2-mutation-2.log` /
`r2-sh2-verify.log`（VERIFY_EXITCODE=0）/ `r2-sh2-e2e.log`（5/5，E2E_EXITCODE=0）/
本报告 `r2-sh2-impl.report.md`。
