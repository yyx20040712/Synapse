# R2-SH3 门二终审报告（三屋 ADR-0017）

> 审计人：门二终审孙代理（GLM-5.3，只读；唯一可写=本档）。
> 输入（全部实读）：票面 r2-sh3-ticket.md / 实现报告 r2-sh3-impl.report.md /
> 门一审档 r2-sh3-gate1-report.md（23B/2W/10N）/ 当前工作区实物（git diff +
> 源码）/ 证据 11 件 raw + r2-sh3-out/ / 主控处置记录（C1/C5/C6 直修+E4/E5
> 处置）/ AGENTS.md / docs/methodology.md §4.3 四清单+一。
> 方法：静态读码+diff 快照对账+机器面数字独立复算；禁跑 npm/test/构建。

## 技能清点（宪法开工纪律）

- code-review-excellence：**用**（门二终审=深度审查）。
- verification-before-completion：**用**（本档落盘前逐数字与实物复核）。
- test-driven-development / systematic-debugging：不用——只读终审方，无实现/
  调试面；TDD 证据链以票面规约为评判基准。
- subagent-driven-development：不用加载——三屋流程以主控派发指令+
  methodology §4 文本为准（已实读）。
- 配置自查：本代理无派发面，只读角色，思考等级承主控配置。

## 核心对账方法（本档结论的地基）

当前工作区 `git diff`（19 文件 **+740/-23**）与门一审档所据快照
`r2-sh3-gate1.diff`（+731/-23）做逐字节 diff 对账：**差异恰好三处、仅三处**
——TitleBarControls.tsx 函数式 setState+注释（+3 行）、theme.css C5 注释
（+3 行）、theme.css C6 注释（+3 行），外加 2 个 index-hash 行。+731→+740
恰为 +9。由此：**门一对 19 文件面的全部审查结论（除 C1/C5/C6 外）对当前
实物直接继承成立**；门二独立复核聚焦三处修复语义+机器面+红线抽查。

---

## ① 处置核对（主控对门一 findings 的处置 vs 终态实物）

**C1（W，初值竞态）——已修，语义验证通过。**
TitleBarControls.tsx:69-72：

```ts
setMaximized((prev) => (prev === null ? r.data.maximized : prev))
```

- 函数式 setState **真正关闭覆盖窗**：门一攻击场景=事件沿先到（prev 非
  null）→ 迟到 get-state 应答携旧快照；修复后应答仅在 unknown（null）态
  应用，prev 非 null 时原值保留——旧快照无法覆盖事件新值。
- 反向序无害：应答先到（null→快照）→ 事件沿 :75 无条件 setState 权威覆盖
  → 终态一致。
- StrictMode 双跑首跑应答被 alive 门丢弃（:77）、点击路径 send() :86 仍
  无条件应用（点击应答与事件沿同值，门一已论证无冲突）。
- 注释标「门一 C1」在位（:69-71），与主控处置记录吻合。

**C5（W，-12px 联动注释）——已修，位置正确。**
theme.css:126-129，紧邻 `margin-right: -12px` 声明上方，覆盖门一要求
两点：「-12 对冲 .app-header padding: 0 12px（:86）」数值联动声明 +
「改 header padding 须同步改此值」警示，标「门一 C5」。

**C6（N，close 红源序依赖）——已修，位置正确。**
theme.css:163-165，紧邻 `.titlebar-btn-close:hover` 块前：同特异性
(0,2,0) 源序在后胜 + 「勿在本块之后追加 .titlebar-btn:hover 变体」防误改
警示，标「门一 C6」。

**其余 B/N（含 E4→交接书遗留池、E5→下票票面预裁引用）——确无「说了没改」。**
门一 23B/10N 中除 C1/C5/C6 外无任何要求代码动作的条目（B=通过、N=备案/
择机）；E4/E5 处置为文档面（交接书/下票票面），归主控收口动作，代码面
无需改动。diff 对账证明除三处修复外零漂移，无未申报改动混入。

**修后全量 vitest（108 文件/904 用例 exit=0）**：承主控处置记录申明——
孙代理铁律禁跑 npm/test，无法独立复验；C1 修复仅为 renderer setState
形态变化，不触测试断言面（window-control.test.ts 无 get-state 应答时序
断言），绿数不变在逻辑上自洽。收口 `npm run verify` 将终验（见裁决清单）。

## ② 母本符合度（票面五层 vs 实物——抽查+继承）

门一 A1-A6 逐节深审结论经 diff 一致性继承成立；门二独立抽查关键锚点全中：

- **四 action 语义**：main-window.ts `controlWindow` switch 四分支（minimize/
  toggle 双向/close/get-state 零副作用）+统一回读 `{maximized}`——门一 A1
  逐行核过，diff 未变。
- **close 不 destroy**：grep 全文件，destroy 仅出现于头注文档与 quit guard
  既有面（:198 接口形状 / :209 dirty 确认后强制关闭——TABS-04 既有代码）；
  `controlWindow` 内无 destroy 分支 ✓。E3 链路（close→quit guard 拦截）未动。
- **drag/no-drag 归属**：theme.css:91 header=drag；:109 switcher=no-drag；
  :130 controls=no-drag——票面预裁⑥ 形态 ✓。
- **titleBarStyle**：main-window.ts:125 `'hidden'` 在 BrowserWindow options
  顶层，:128 webPreferences 内仅 `...WINDOW_SECURITY_FLAGS` 原样展开 ✓。
- **测试清单**：window-control.test.ts（164 行，四 action/事件绑定/
  titleBarStyle/CSS 皮肤锁）+system.test 扩+preload-surface.test 扩+
  smoke.spec e2e 扩（:135 computed app-region 断言、:146 maximize-toggle
  真行为）全在位 ✓。
- **类型单源**：schemas.ts:394-404 三 schema+三类型（WindowControlAction/
  Req/Res、WindowStateEvent）只住 schemas.ts；TitleBarControls.tsx:33 纯
  `import type` 复用，无第二份 ✓。

## ③ 宪法红线终审

- **分层单向**：renderer→window.api/window.apiEvents；无 Node/Electron
  import、无绝对路径（门一 B5+diff 一致性）✓。
- **受锁流程**：unlock(169) 后改动面=9 改+2 新增，与 manifest 推演吻合——
  9 个修改的受锁文件（schemas/api-surface/system.test/preload-surface.test/
  smoke.spec/ipc-deps/app-shell/app-quit-dirty/lineage-board）在
  `locks/manifest.json` 全部有旧条目（hash 已陈旧）；2 个新受锁路径
  （tests/unit/windows/window-control.test.ts、scripts/audits/
  r2-sh3-forensics.mjs）manifest 中零条目（grep=0）→ **check 必红=预期
  态**，收口流程 locks:generate→apply 正确 ✓。与实现报告§7 申报一致。
- **安全禁令**：WINDOW_SECURITY_FLAGS 定义与展开零改动；titleBarStyle 非
  webPreferences 成员；无新依赖（图标全内联 SVG）；无新增出网 host ✓。
- **行数**：TitleBarControls 115（≤250 组件红线）/App 187（≤250）/
  main-window 268、bootstrap 243、schemas 404、api-surface 181（≤500）/
  window-control.test 164（tests 面 max-lines off）✓。theme.css 575 行系
  既存超限延续（见 G2 勘误），ESLint 机器面不含 css，非本票引入违例。
- **UTF-8**：全部改动文件中文注释可读 ✓。
- **TDD 四档**：首红（11 failed|893 passed(904)，3 文件）→绿（108/904
  exit=0）→变异四方向红行（门一 C8 逐份对位）→还原（门一 D4 备案还原
  diff 未落盘；今日 diff 对账追加一层间接证：当前实物与门一快照一致，
  四变异确已还原）✓。
- **git 面**：staged 空、无新提交、三新文件 A 标记系 intent-to-add（diff
  可见性所需），无违规 ✓。

## ④ 机器面核对

| 项 | 核对结果 |
| --- | --- |
| 904=893+11 | ✓ first-red.raw.txt Tests 行直接确认：`11 failed \| 893 passed (904)`；失败分布 3 文件=window-control(9)+system(1)+preload-surface(1) |
| 108=107+1 | ✓ 首红 Test Files=`3 failed \| 105 passed (108)`——TDD 测试先行故新文件首红已在；基线=107 文件/893 用例（由 green 108−1 倒推，门一 D3 三方互证）；**forensics.mjs 非测试文件不入 vitest 口径**，新测试文件仅 window-control.test.ts——口径成立 |
| locks manifest | ✓ 2 新路径未扫入+9 改文件 hash 陈旧→check 必红=预期态；收口=generate→apply（流程正确） |
| e2e 面申明 | ✓ smoke.spec 新用例在位（:135/:146）；r2-sh3-*.raw.txt 无 e2e 运行日志→「未真跑、归主控收口」申报与事实一致 |
| 翻 done 推演 | 不适用 ✓ registry grep r2-sh3=0（LOOP 票不在 registry，与票面头部声明+主控预裁⑦一致） |
| TODO/placeholder | ✓ 改动面 grep 零残留 |

## ⑤ 成本账本行（汇自主控处置简报给定值；两份报告正文未内嵌 token 数）

| 单元 | token | 工具调用 | 时长 |
| --- | --- | --- | --- |
| 实现者 | 7,139,381 | 111 | 23.3 分钟 |
| 门一对抗深审 | 1,175,442 | 28 | 8.5 分钟 |
| 门二终审（本档） | 待主控补（孙代理无法自观测） | — | — |

## 门二新发现（均 N 级备案，无动作强制）

- **G1 [N]** TitleBarControls 头注 :12-13「（事件沿与应答双通道收敛到同一
  setState，后到者胜=终态一致）」——该句上下文限定点击路径（send() 应答
  仍无条件应用，「后到者胜」成立）；初值路径经 C1 修复后不再是「后到者
  胜」，新语义已由 :69-71 代码级注释精确声明。两处不互斥，孤立读头注有
  轻微张力，备案；若后续触碰此文件可顺手把头注括号句改「初值应答仅
  unknown 态生效（见下 C1 注）」。
- **G2 [N]** theme.css 实测 575 行（门一 B3 记 569 系 C5/C6 补注前读数；
  575=569+6 自洽）。基线勘误：575−66(净增)=509，门一 B3 记「基线 510」
  一行级笔误，无实质影响（既存超限结论不变）。
- **G3 [N]** 修后全量 vitest 108/904 exit=0 系承主控申明（孙代理禁跑未
  独立复验）；收口 verify 将终验，若届时红数≠904 以收口实跑为准。

---

## 最终裁决：**放行收口**

四清单+一逐节结论：①三处主控直修全部实物验证通过、语义正确、无漏改；
②票面五层落地（继承门一深审+锚点抽查）；③宪法红线全过（安全面零触碰/
受锁申报与 manifest 推演吻合/行数/UTF-8/TDD 四档）；④机器面数字全口径
自洽（904=893+11、108=107+1 成立、check 必红=预期态、e2e 申报属实、
翻 done 不适用）；⑤成本账本已汇（门二行待补）。无回炉项、无拦截项。

**收口前主控必做清单**：

1. `npm run verify` 全量（亲验真退出码；含 G3 终验点）。
2. `npm run test:e2e`（smoke 新用例+workspaces 回归首验——实现者未跑已
   申报，收口首验点）。
3. `npm run locks:generate`（扫入 window-control.test.ts + r2-sh3-forensics.mjs
   两新路径）→ `npm run locks:apply` 重锁，manifest 与提交即时同步。
4. `[locked-change]` 提交；staging **显式列文件**——工作区有大量未跟踪
   审计产物（f1-out/*.png、r2-sh3-out/、各 raw.txt），严禁 `git add -A`。
5. 交接书补录：E4 遗留池（maximized 态关窗存大 bounds 怪癖）、E5 下票
   SET1 预裁引用（zoom 与 caption 相互作用）、用户复测面（Windows 三键
   hover/press 观感+双击空白最大化）、门二成本行。
