# R3-TH1 实现报告——视觉系统主题基建（token v2+App 壳+共享四件）

> 实现者子代理（三屋模式）。票面=`scripts/audits/r3-th1-brief.md` v1+主控预裁
> 三点。设计定稿=`docs/design/2026-08-28_visual-system.md`；token 终值单一
> 来源=两摸鱼图 `:root`。
>
> **开工技能清点**（宪法会话开工纪律）：`test-driven-development` 用（票面
> ④TDD 铁律）/ `verification-before-completion` 用（verify+e2e 真退出码
> 落盘）/ `frontend-ui-engineering`+`frontend-design` 用（CSS token+壳
> skin 工单直接相关）/ `javascript-testing-patterns` 用（新测试写法参考）/
> `systematic-debugging` 备而不用（无卡点）/ 其余运维·文档·网格类技能
> 不用（纯前端样式工单，无后端/部署/文档面）。

## 1. 实现摘要

- **P1 theme.css v2**：旧 9 token 换值（42 tsx 内联引用零 churn）+新增
  亮面 15/夜面 12 token 逐值誊自 mockup `:root`；body 背景换 `--bg`+纸面
  丝纹；html/body/#root overflow 锁与「文档永不滚」注释原样保留（Q1）。
- **P2 App 壳**：`.app-nav` 系类（theme.css，mockup nav 段逐值誊录）=
  墨青渐变底+右缘金渐隐线+菱形品牌 SVG 标+衬线品牌名+四入口内联 SVG
  图标（path 逐字取自 mockup，aria-hidden 防污染 accessible name）+
  active 态（金左缘条 `::before`+ink-hi 底+inset 金 hairline）+footer
  （版本徽记+「本地学术文献管理」）。课题位直接消费 R1-WS2 已收口的
  WorkspaceSwitcher（预裁①）。
- **Switcher 最小夜色适配**：切换钮=rgba 白微底+金 hairline（mockup .ws
  同款）；展开面板=--node-face 夜色浮层；输入/取消=夜面字段；当前项
  =rgba 白高亮。testid/文案/交互零改。
- **P3 共享四件**：Button primary=墨青+inset 金 hairline(.45)+6px 切角
  clip-path+hover 提亮(.7)/ghost hover 金铜（`.syn-btn-*` 附加类挂
  theme.css）；Dialog=头檐金 hairline+玻璃 blur 头区+radius-l+shadow-3；
  SplitPane=手柄金渐隐线；Toast=玻璃底+blur+shadow-2。类名契约/props/
  testid 零改。
- **annotation 五色保持原值**（见 §7 自裁申报 1）。

## 2. 文件清单（git diff 范围自查=9 改+2 新测试，零蔓延）

| 文件 | 变更 |
| --- | --- |
| `src/renderer/shared/theme.css` | 34→204 行：token v2+.app-nav 系+.syn-btn-* hover 类 |
| `src/renderer/app/App.tsx` | nav 段换 .app-nav 结构+NAV_ICONS 四图标；文案/交互零改 |
| `src/renderer/features/workspaces/WorkspaceSwitcher.tsx` | 仅样式段（trigger/panel/field 三 style）+过时接缝注释更新 |
| `src/renderer/shared/ui/Button.tsx` | VARIANT_STYLE.primary+className 附加 `syn-btn-${variant}` |
| `src/renderer/shared/ui/Dialog.tsx` | 卡面 style 覆盖+头檐金线/玻璃；className 零改 |
| `src/renderer/shared/ui/SplitPane.tsx` | 手柄 background 一处 |
| `src/renderer/shared/ui/Toast.tsx` | CARD_STYLE 五行 |
| `tests/e2e/reader-text.spec.ts` | **[locked-change]** F-06 bodyBg 断言值 1 处同步（§6） |
| `tests/unit/renderer/theme.test.ts` | 新（41 it：40 token 防漂移+1 body 声明面） |
| `tests/unit/renderer/app-shell.test.tsx` | 新（3 it：图标/active 类/品牌+footer） |
| `locks/manifest.json` | 150→152 条（generate+apply 实录见 §8） |

## 3. token 对照表（mockup :root → theme.css 逐行）

### 3a. 亮面（shell-library.html :root）

| token | mockup 值 | theme.css 值 | 备注 |
| --- | --- | --- | --- |
| --bg | #f6f4ee | #f6f4ee | 旧 #f7f8fa 换值 |
| --panel | #ffffff | #ffffff | 不变（F-06 pageBg 断言零风险） |
| --panel-glass | rgba(255,255,255,0.72) | rgba(255, 255, 255, 0.72) | 新增（仅空格规范化） |
| --border | #e4ded1 | #e4ded1 | 旧 #e5e7eb |
| --border-gold | #c9a86a | #c9a86a | 新增 |
| --text | #23262d | #23262d | 旧 #1f2328 |
| --text-dim | #6f7482 | #6f7482 | 旧 #6b7280 |
| --accent | #2c5f8a | #2c5f8a | 旧 #2563eb（墨青） |
| --accent-soft | #dcebf5 | #dcebf5 | 旧 #dbeafe |
| --gold | #b8935a | #b8935a | 新增；两稿冲突取亮面（票面 P1 裁决） |
| --gold-soft | rgba(201,168,106,0.14) | **rgba(207, 174, 114, 0.16)** | **票面 P1 显式裁决取 lineage 稿值** |
| --gold-bright | （:root 无；active 条内 #e3c98f） | #e3c98f | 新增（lineage :root 值） |
| --gold-line | （lineage 稿） | rgba(207, 174, 114, 0.1) | 新增（lineage :root） |
| --danger | #b3403a | #b3403a | 旧 #dc2626；lineage.spec:500 断言=变量名字符串，零风险 |
| --ok | #3d7a50 | #3d7a50 | 旧 #16a34a |
| --shadow-1 | 0 1px 2px rgba(35,38,45,.06) | 0 1px 2px rgba(35, 38, 45, 0.06) | 新增（规范化空格） |
| --shadow-2 | 0 4px 14px rgba(35,38,45,.09) | 0 4px 14px rgba(35, 38, 45, 0.09) | 新增 |
| --shadow-3 | 0 10px 34px rgba(35,38,45,.16) | 0 10px 34px rgba(35, 38, 45, 0.16) | 新增 |
| --radius-s/m/l | 8px/12px/16px | 8px/12px/16px | 新增 |
| --font-display | Georgia,'Times New Roman','Songti SC',SimSun,serif | 同（引号保持） | 新增 |
| --ink | #1b2333 | #1b2333 | 新增 |
| --ink-hi | #232d44 | #232d44 | 新增 |

### 3b. 夜面（lineage-constellation.html :root——R2 消费预留，只定义）

| token | mockup 值 | theme.css 值 | 备注 |
| --- | --- | --- | --- |
| --night-bg | #171e33 | #171e33 | |
| --night-bg2 | #111728 | #111728 | |
| --node-face | #222c4d | #222c4d | 本单被 Switcher 展开面板消费 |
| --node-face-hi | #2b3760 | #2b3760 | |
| --gold（夜面） | #cfae72 | **--gold-night: #cfae72** | 与亮面 --gold 冲突→自裁别名（§7-3） |
| --band-line | rgba(207,174,114,0.12) | rgba(207, 174, 114, 0.12) | |
| --star | rgba(222,230,255,0.55) | rgba(222, 230, 255, 0.55) | |
| --text-on-night | #e9e6db | #e9e6db | 本单被 Switcher 面板消费 |
| --text-mid | #c6cbdd | #c6cbdd | |
| --text-dim-on-night | #97a0bb | #97a0bb | |
| --edge-glow | rgba(207,174,114,0.4) | rgba(207, 174, 114, 0.4) | |

### 3c. annotation 五色（保持原值）

--annotation-yellow #fde047/green #86efac/blue #93c5fd/red #fca5a5/purple
#d8b4fe——票面 P1「微调向暖」未执行，理由见 §7-1。

### 3d. 壳散值（mockup nav 段，类内誊录非 token）

nav 渐变终点 #171e2f（mockup nav 专属，≠--night-bg2 #111728——照誊）；
文字色 #cfd5e4/#aeb6ca/#efe9da/#f3eddd/#e6eaf4/#8d95ad/#6d7590；金缘
rgba(201,168,106,.5)/.28/.25；分隔 rgba(255,255,255,.07)/.05/.06。

## 4. 首红证据（TDD 红→绿）

写完两新测试先跑 `npm run test`（全量，禁裸 vitest 纪律）：

```
Test Files  2 failed | 100 passed (102)
Tests  38 failed | 785 passed (823)
```

红面=theme.test 37 it（旧 token 值不匹配新断言）+app-shell 1 it（footer
文案缺失）+其内 37 token 计数——具体 FAIL 输出：
`theme.test.ts > '--gold 声明为设计定稿值 #b8935a'` 等 38 项；
`app-shell.test.tsx > 品牌行（Synapse Remake）与 footer…: expected
'Synapse Remake默认课题 ▾文献库阅读器设置脉络' to contain '本地学术文献管理'`。
实现后同命令：`102 passed (102) / 823 passed (823)`，EXIT=0。

## 5. 变异红证+还原证据（cp 备份法，未用 git checkout）

| # | 变异 | 红 | 还原 |
| --- | --- | --- | --- |
| 1 | theme.css `--gold: #b8935a;`→`#000000;` | `theme.test.ts > --gold 声明为设计定稿值 #b8935a` 1 failed/822 passed，EXIT=1 | `cp /tmp/theme.css.bak`→`diff` 输出空（RESTORE-DIFF-EMPTY） |
| 2 | App.tsx active 类拼接删（`` `app-nav-item${…active…}` ``→`"app-nav-item"`） | `app-shell.test.tsx > 默认视图（文献库）带 active 态类，其余入口不带` 1 failed/822 passed，EXIT=1 | `cp /tmp/App.tsx.bak`→`diff` 空（RESTORE-DIFF-EMPTY） |

两证均「只红目标 it、其余全绿」=断言级红证（非连锁崩）；还原 diff 空落盘
于本节表格（命令输出已随会话留存）。

## 6. 受锁必然红申报清单（AI-11 扩容口径）

| 处 | 旧值 | 新值 | 依据 |
| --- | --- | --- | --- |
| `tests/e2e/reader-text.spec.ts:661`（F-06 bodyBg） | `'rgb(247, 248, 250)'` | `'rgb(246, 244, 238)'`（--bg #f6f4ee） | 主控预裁③显式核准：「该断言锁旧值 #f7f8fa→新 #f6f4ee 必红——[locked-change] 改断言值同步新 token」 |

其余 e2e 断言面逐一 grep 核对零触：reader-text:186/474/505
annotation-yellow rgb(253,224,71)（五色原值保持→绿）；:657 pageBg
rgb(255,255,255)（--panel 不变）；:660/671 透明家族断言（无关）；smoke:22
`getByText('Synapse Remake')`（品牌文案保留→绿）；smoke/reader-text 各
`getByRole('button', { name: '文献库' 等 })`（文案+button 结构保留→绿）；
lineage.spec:491-500 变量名字符串断言（变量名零改→绿）。

## 7. 自裁申报

1. **annotation 五色未微调（票面 P1 字面 vs 预裁②优先级）**：P1 允许
   「向暖微调」，但 reader-text.spec 三处精确断言 rgb(253,224,71) 锁死
   yellow 终值——任何微调必红。预裁②明示「色相族保持优先级低于测试面
   稳定，申报后回退」→ 预知必红则不制造红，五色保持原值并在
   theme.test.ts 加防漂移锁（未来微调须连 e2e 一起 [locked-change] 走）。
2. **品牌文案「Synapse Remake」保留（非 mockup 短名「Synapse」）**：
   smoke.spec:22 getByText 断言面；预裁③「e2e 断言文案全保留」。视觉
   意图（衬线+菱形标）完整兑现，仅字长差。
3. **--gold-night 命名（自裁）**：两 mockup 的 --gold 值冲突（#b8935a vs
   #cfae72），票面裁亮面占用 --gold；夜面值 R2 必需，按「token 单源=两
   摸鱼图 :root 誊录」纪律以别名 --gold-night 全量誊入，避免 R2 再动
   token 层。
4. **footer 版本徽记 v0.1（自裁）**：mockup 写 v1.0（视觉稿占位）；取
   package.json version 0.1.0 短形 v0.1 对齐真实版本。
5. **nav 宽度 160→184px**：mockup 逐值誊录（tailwind w-40→.app-nav
   width:184px）；e2e 无侧栏绝对宽断言（SplitPane 拖拽断言用 boundingBox
   动态取值），全量 e2e 绿证零影响。
6. **theme.test 断言串格式**：css 值统一规范化空格（rgba(35, 38, 45,
   0.06)），对照表已逐行注明；断言含尾分号防 --gold 前缀误匹配 --gold-soft。
7. **Switcher 错误行 color 保持 var(--danger)**：#b3403a 在墨青底上对比
   ~2.9:1 偏暗，但预裁①授权清单是「夜色系变量/rgba 白」不含 danger 亮
   系——最小适配原则下不动，可辨度留观察项（见 §9 疑虑 2）。
8. **Button clip-path 裁掉外投影**：CSS clip-path 裁剪含外阴影（mockup
   import-btn 同形态：外 shadow 被切角裁、inset hairline 可见）——照誊，
   非缺陷。

## 8. locks 实录

- `npm run locks:unlock`：解锁 150 个文件（=基线 locks 150 对账一致）。
- 新测试两件写入+e2e 断言修改后：`npm run locks:generate`（152 条，仅
  生成未设只读）→ `npm run locks:apply`（已锁定 152 个，只读）→
  `npm run locks:check` 通过（152 与 manifest 一致）。即时重锁，无跨提交
  延迟。
- 行尾口径核验：受锁文件哈希按磁盘原始字节（check-locks.mjs
  `readFileSync(f)`）；新测试 Write 工具落盘 LF；manifest.json 自身不在
  受锁集合（CRLF 警告无对账影响；.gitattributes 入库转 LF 无碍）。
- **主控收口提示**：提交须带 [locked-change] 尾注（tests/+manifest 面）。

## 9. verify+e2e 真退出码

- `npm run verify > scripts/audits/r3-th1-verify.log`：
  **VERIFY_EXIT=0**。关卡行：quality 检查通过（无占位/乱码/跨域引用）/
  tickets 检查通过 / locks 检查通过（152 一致）/ lint+typecheck+test
  （102 文件 823 用例=基线 779+44 新）/ build ✓。
  基线对账：100 文件 779→102/823（+2 文件+44 用例=本单新增，偏差已对账）。
- `npm run test:e2e > scripts/audits/r3-th1-e2e.log`：
  **E2E_EXIT=0，25 passed (1.4m)**=基线 25 passed 持平。含 smoke（品牌
  文案/四入口）、F-06 视觉小票（新 bodyBg 断言绿）、SplitPane 拖拽、
  workspaces 切换器全绿。

## 10. 疑虑

1. **Switcher 展开面板绝对定位缺位**：面板为文档流内块（展开时下推 nav
   项），非 mockup 浮层形态——预裁①授权「样式段最小适配」不含结构改，
   保持现状；视觉上展开时 nav 收缩一屏内可接受（R2/后续视觉单元可收口）。
2. **墨青底上 danger 文案对比度**（§7-7）：如门一认为不可接受，建议后续
   在 token 层加 --danger-on-night 亮红（需票面），不在本单散值处理。
3. **Dialog 玻璃头檐在长内容滚动时**：blur 头区+内容区白底分界由金
   hairline 承担，无 header 吸顶（原结构零改约束）——滚动中头檐不随内容
   滚（flex 布局列，内容区独立滚动），视觉成立，无需改。

---

# 回炉一轮（联审裁决 FAIL：B1/W1+报告数字三处）

## R1. B1 修复——Button hover 交互态静默失效（必改）

**根因**：上轮静态皮肤住 Button.tsx 内联 style（primary boxShadow/ghost
background+color），hover 挂 theme.css 类——CSS 层叠上内联声明恒压任何
类选择器（无论特异性），`.syn-btn-primary:hover` 的提亮（.45→.7）与
ghost 金铜 hover 永不生效。

**修复形态（自裁）**：静态皮肤**全迁** theme.css 类（四变体
`.syn-btn-primary/secondary/danger/ghost` 静态规则+两条 hover 规则同层），
Button.tsx 内联清空——删除 `VARIANT_STYLE` 常量与 `style` prop（含 ghost
`border:'none'` 特判，改 `.syn-btn-ghost { border:none }`）。层叠依据：
theme.css 中 `.syn-btn-*` 为非 @layer 规则，压过 tailwind v4 utilities
（@layer utilities）——unlayered > layered，tailwind `border`/`rounded`
不被反压。类名契约/props/testid 零改（`syn-btn-${variant}` 上轮已附加）。

**新防线（theme.test.ts 新 describe，4 it）**：
1. `.syn-btn-primary` 静态类在场且含 `rgba(201, 168, 106, 0.45)`（inset
   金 hairline）+`clip-path`（6px 切角）；
2. `.syn-btn-primary:not(:disabled):hover` 含 `rgba(227, 201, 143, 0.7)`
   （裁决点名「hover 含 0.7」）；
3. `.syn-btn-ghost:not(:disabled):hover` 含 `var(--gold)`（裁决点名）；
4. **B1 形态锁**：Button.tsx 源文本不含 `VARIANT_STYLE`/`boxShadow:`/
   `clipPath:`——皮肤声明不得回流组件内联（防回退到缺陷形态）。

**TDD 留证**：
- 先红：新断言跑 `npm run test` → 2 failed（it1 静态类缺位+it4 内联形态
  在位）/825 passed，EXIT=1（it2/it3 上轮 hover 规则已在故绿——回归锁）。
- 绿：修复后 827 passed (827)，EXIT=0。
- **变异红证一枚（裁决指定）**：sed 删 theme.css
  `.syn-btn-primary:not(:disabled):hover {…}` 整块 → it2「primary hover
  提亮 .45→.7」1 failed/826 passed，EXIT=1；`cp /tmp/theme2.css.bak` 还原
  →`diff` 空（RESTORE-DIFF-EMPTY）。

## R2. W1 处置——`.app-nav{gap:2px}` 未申报自加值

**移除**（不申报保留）。理由：mockup nav 段无 gap 声明（间距全由
`.nav-item` 的 `margin:2px 4px` 承担），「逐值誊录纪律」下自加值即偏
差。移除后间距来源回归 mockup 同构。**残留差异申报**：Switcher（React
组件版 ws 区）与首个 nav 项间距=2px（item margin-top），mockup `.ws` 的
`margin:0 4px 14px` 底距 14px——差 12px，属 Switcher 结构最小适配的既知
让位（预裁①不授权结构改），留待后续视觉单元收口。

## R3. 报告数字勘误三处（联审指认，报告内勘误不重跑）

1. §2「theme.css 34→204 行」勘误：**上轮收口时实为 187 行**（204 为误
   记）；回炉增补后现 211 行（wc -l 亲测）。
2. §1「42 tsx 内联引用零 churn」勘误：**旧 token 消费实为 40 tsx**
   （42 为票面数字，实际 grep 为 40；零 churn 结论不变）。
3. §4 首红分解勘误：38 failed = **theme.test 35 红 + app-shell 3 红**
   （非 37+1——旧 theme.css 中 --panel #ffffff+annotation 五色共 6 个
   token 断言旧值即命中故首跑即绿：41-6=35；app-shell 三 it 上轮全红：
   图标缺/active 类缺/footer 缺）。

## R4. 回炉后全量留证

- `npm run verify > scripts/audits/r3-th1-verify.log`：
  **VERIFY_EXIT=0**，827 passed（=回炉前 823+新防线 4）。关卡行：quality/
  tickets/locks 152 一致/lint/typecheck/build 全绿。
  注：log 内 PowerShell 段中文（quality 等关卡消息）显示为 GBK 管道
  乱码——控制台管道编码现象，非源码乱码（quality 关卡本体以 exit 码
  判定通过；上轮同命令输出正常可对照）。
- `npm run test:e2e > scripts/audits/r3-th1-e2e.log`（B1 触及 Button
  渲染面，回炉后全量亲跑）：**E2E_EXIT=0，25 passed (1.3m)**。
  **过程记录**：第一次全量跑 corpus-export 全链 60s 超时红（24 passed/
  1 failed）；单跑该 spec 2.8s 绿→判 flaky（全量并行负载下时序抖动，
  本单改动与其断言面零交集：该测走设置页导出链，无 Button 样式/nav
  布局断言）；全量重跑 25 passed 复绿。flaky 判定证据=单跑绿+复跑全量
  绿（两次独立绿证非必然红）。

## R5. 回炉变更文件清单（增量）

| 文件 | 变更 |
| --- | --- |
| `src/renderer/shared/theme.css` | 删 `.app-nav` gap:2px（W1）；Button 节重写：四变体静态类+两条 hover 同层（B1） |
| `src/renderer/shared/ui/Button.tsx` | 删 `VARIANT_STYLE`+`style` prop+ghost 特判；className 不变（61→56 行） |
| `tests/unit/renderer/theme.test.ts` | 新增 B1 防线 describe 4 it（受锁：unlock→改→generate+apply） |
| `locks/manifest.json` | 152 条 regenerate（theme.test.ts 哈希更新） |

提交尾注不变：[locked-change]（tests/+manifest 面仍触）。
