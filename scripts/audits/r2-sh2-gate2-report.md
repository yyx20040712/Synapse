# R2-SH2 门二终审报告（三屋·ADR-0017）

> 审者：门二终审子代理 / 模型 builtin:bigmodel-coding-plan/GLM-5.3（思考等级
> default，回复首行已自报）。只读终审，唯一可写=本报告；禁 npm test/verify、
> 禁 git 写操作（全程遵守）。
> 基线锚 HEAD=5ae8620 / verify 基线 107 文件 888 用例 / locks 166 / e2e 26。

## 开工记录·技能清点（会话开工纪律）

- **code-review-excellence：用**——终审本体（四清单+一逐项核）。
- **verification-before-completion：用**——一切关键数（sha256×3/行数×6/
  manifest 计数/890 数理/时间线）独立复算，不信任任何代理转述。
- **requesting/receiving-code-review：不用**——门二即审查终点，无再派发面。
- **browser 类（devtools/webapp/e2e-patterns）：不用**——铁律禁测试运行与
  浏览器操作；e2e 面以落盘日志+断言面静态推演核对。视觉通道实证缺失：
  Read header.png 仅回 CDN URL（handoff §1.1 记载复现），W4 观感判定无门二
  独立通道，维持归主控。
- **TDD/systematic-debugging：不用**——只读终审无实现/调试面（红证链以
  落盘日志+变异态数理交叉验证）。
- 其余（DB/云/SRE/Git 工作流）：不用——纯 renderer 壳层+CSS 终审。
- 配置自查：自身 GLM-5.3/default 档首行自报；无子代理派发。

## 0. 统计

| 维度 | 数 |
|---|---|
| 输入 | 票面+实现报告+门一报告+diff 包 441 行+母本（loop-handoff-v3 §2/§4）+methodology §4.3+日志 6（firstraw/mut-1/2/3/verify/e2e） |
| 独立复核 | sha256×3 全 match / 行数×6 / manifest 计数 166 / grep×5（font-display、gold-night、Synapse 唯一性、R2-SH2 引用面、Switcher 触碰面）/ 时间线×3（verify 20:03:14 vs mut-3 20:11:14 vs manifest 20:11:47） |
| 判定 | **PASS，零回炉，可进收口**——附收口硬条件 2（N1 重跑 verify+W4 真机复评定生死，均已在主控处置计划内） |
| 新发现 | N×1（G1 记档级）/ B×0 / W×0 |

## ① 处置核对（门一全 findings + 主控裁决 vs 终态实物——防「说了没改」）

| 项 | 门一/主控处置 | 终态实物核对（门二独立） | 判 |
|---|---|---|---|
| W1（r3-rdr 受锁第三面改写） | 接受——非放宽（旧形态锁→决5 新形态负锚） | diff :367-373：not.toMatch var(--font-display) 负锚+金左缘条正断言 `3px solid var(--gold)` 原样保留；文件 hash 与 manifest 一致（见③） | ✓ |
| W2（lib 三处补做·主控压缩票） | 接受=向母本收敛 | **theme.test 负锚三断言直读**：:139 theme.css 无 var(--font-display) / :140 无 `--gold-night:` 定义 / :143-145 libCss 同负锚——三断言全在；**library.css 三处直读结构完整**：.lib-card-year（flex/min-width/17px/gold 值面原样）/ .lib-detail-title（15px/500/1.5 原样）/ .lib-detail-v-serif（15px/gold 原样），font-family 行净删无残缺——主控 sed 事故修复后终态完好属实 | ✓ |
| W2-mutation-3 红点 | 主控补做变异红证 | 日志直读：全量 890 语境 889 passed\|1 failed，红点=theme.test:143 libCss 断言（「library.css 衬线消费应清零…not to contain」），断言级精确命中，exit=1 | ✓ |
| W3（theme.test:10-11 头注漂移） | 遗留池（本单不改） | 终态 :10-11 仍含「夜面值别名 --gold-night（R2 消费预留）」——按处置保持原样，未越面 | ✓ |
| W4（Switcher 白底对比度·升格） | 归主控真机复评定生死（不可见即回炉改色） | r2-sh2-out/header.png 在档（主控复评材料）；门二视觉通道缺失无法独立判读——维持归主控裁定，本报告不代办 | 待主控 |
| B1/B2（自裁防御） | 接受（N2 论据瑕疵记档） | 终态 App.tsx:145-147 wrapper+theme.css:103 max-height:44px（B1）、theme.css :85-86 relative+z-index:10（B2）在位；「撑高顶栏」旧表述仍在 App.tsx:144 注释+theme.css:101-102（处置=下张同域票修正，遗留池，本单不动正确） | ✓ |
| N1（verify 时序硬条件） | 收口单写前必须重跑 verify | 时间线独立复核：verify.log Start at 20:03:14 早于 mutation-3（20:11:14）与 manifest relock（generatedAt 12:11:47Z=本地 20:11:47）——**8 文件终态下 quality/lint/typecheck/build 四段无落盘证据**，N1 成立且仍开口（test 段已由 mut-3 的 890 语境覆盖） | 待收口 |
| N3（z-10 同层理论冲突） | 记档（几何不可达） | 无需动作项；theme.css 终态 lineage-fit-btn/legend z-10 未触碰 | ✓ |

结论：门一全 findings 处置与终态实物**零偏差**；仅 N1（收口重跑）与 W4（真机
定生死）两项按计划归主控收口段，非回炉项。

## ② 母本符合度（handoff-v3 §2 决4/决5+§4 逐节 vs 终态）

### 决4 顶栏身份区——逐值符合

| 母本要求 | 终态实证 | 判 |
|---|---|---|
| 顶栏=应用名+课题切换器一体（ZCode 式） | App.tsx:134-151：header.app-header=logo svg+`.app-header-name`「Synapse」+Switcher wrapper+ver 右区（结构完整） | ✓ |
| 切换器迁位·组件本体逻辑零改 | git status 全量 M 面 8 文件无 WorkspaceSwitcher.tsx；props dirty/onManage 原样（diff :76）；零祖先组合选择器前提经门一 D4 复核+diff 终态无 .app-nav 后代选择器新增 | ✓ |
| 侧栏品牌行删除 | nav 首行直接起 NAV 项（App.tsx:155-165）；.app-nav-brand/-brand svg/-name 三 CSS 规则删（diff :239-255）；app-shell 负锚 it 0 计数锁死 | ✓ |
| 高度裁量（h-9 级+2~4px） | 44px=h-11（theme.css:82）——票面预裁1 上限裁量在案（hover/焦点环余量），母本区间为下限语义，**记为预裁域内偏离**，非私自扩面 | ✓（预裁域内） |
| F-05/INV-34 真机复评 | 归主控收口（票面明文）；静态面：`flex h-full flex-col`+内容行 `flex min-h-0 flex-1`（App.tsx:134/152）高度约束链正确 | 静态✓/真机待 |

### 决5 衬线消费清零——母本清单逐位（含 W2 收敛后）

| 母本位（§4「lib 衬线年份/页码/设置节标/品牌位/脉络年份」+§2「年份/标题/品牌/页码」） | 终态 | 判 |
|---|---|---|
| lib 衬线年份（.lib-card-year） | W2 清零 ✓（负锚第三断言锁） | ✓ |
| 标题（.lib-detail-title/.rdr-aside-h4） | 清零 ✓ | ✓ |
| 品牌位（.app-nav-name 随类删；新 .app-header-name 无衬线） | 清零 ✓ | ✓ |
| 页码（.rdr-num） | font-family 删+**tabular-nums 保留**（diff :276 原样）——决5「不动」兑现 | ✓ |
| 设置节标（.syn-settings h2） | 清零 ✓（r3-rdr 负锚+theme 负锚双锁） | ✓ |
| 脉络年份 | R2-LG11 已摘（U2a 连带），本单 grep 全 src `var(--font-display)` 消费=0 实证（仅 :root 定义行） | ✓ |
| 定义保留 | theme.css:34 `--font-display: Georgia…` 原样——决5 原文兑现 | ✓ |
| --gold-night 评估去留 | 退役：定义删（src 零定义；仅 2 处历史注释=theme.css:7/LineageSidePanel.tsx:95 退役说明，正当记录）+TOKENS 行删+头注改写 | ✓ |
| 全回 UI 字体 | 实现为回继承（body UI 字体栈），与「全回 Segoe UI/微软雅黑」语义等价 | ✓ |

母本符合度总结：决4/决5 **无缺位、无擅自扩面**；W2 补做后 lib 面与母本明文
完全收敛（票面五类清单确系收窄誊录，门一判断成立）。

## ③ 宪法红线终审

1. **受锁批次+hash**：manifest 独立计数 **166 files**；三受锁文件 sha256 独立
   复算——app-shell `fc5b477c…`/r3-rdr `1521c2fe…`/theme.test `cd858953…`
   **全 match**（与 diff 包新 hash 逐位一致）；无新受锁路径。流程 unlock→批内
   改→generate（无新文件）→apply 与申报相符。
2. **行数红线（实测）**：App.tsx **183**/theme.css **414**/library.css 206/
   app-shell.test **156**/theme.test **147**/r3-rdr 158——全 ≤500。**门一实测
   （183/156/147）逐位复现；实现者申报（204/175/155）偏高虚报确认**——无后果
   （全在红线内），但「实测申报」口径失实记诚实性瑕疵（已在门一 W-2 落档，
   收口单申报即可）。
3. **UTF-8**：diff/日志/三报告+终态源文件中文直读全可读，无乱码。
4. **WorkspaceSwitcher 零触碰**：git status M 面 8 文件无此文件——票面红线兑现。
5. **安全禁令/分层**：改动面=renderer 壳层 3 实现+3 受锁测试+manifest+registry，
   无 IPC/shared/db/主进程涉面；无新依赖、无出网、无 eval 类、无绝对路径——禁令零涉。
6. **TDD 证据链四档**：
   - 首红档：firstraw 直读=`npm run test` 正规入口（sqlite-abi 链在）**定向跑
     两文件 50 用例 4 failed|46 passed，exit=1**，红点全在新断言面且断言级——
     「先红后绿」成立；**但总数口径「890」失实**（门一 W-1）+定向跑证据强度
     弱于全量首红：漏选文件面的旧锁冲突不可见——该风险**实际发生**（W1 第三
     面红在绿前首跑才暴露，未入 firstraw 档案）并被正确处置。档位评定：
     **通过（降档记瑕疵）**——红证真实、断言级、全程正规入口；教训（首红宜
     全量或至少含全部受锁改写文件）回流 methodology 候选。
   - 绿档：verify 890/890、EXITCODE=0（实现者终态时点）；8 文件终态重跑=N1
     收口硬条件（见④）。
   - 变异红证档：**×3 全真**——mut-1（删 header JSX→app-shell 顶栏 2 it 红，
     「header 在场 expected null not to be null」断言级）；mut-2（.rdr-num 回填
     →theme 负锚第一断言红，44+1）；mut-3（library.css 回填→libCss 第三断言红，
     889+1 全量 890 语境）。票面要求 ≥2，实际 3，且三个负锚/it 各有专属红点。
   - 还原安全档：实现者 cp 备份法+diff 双空（申报）；mut-3 还原由终态实物背书
     （library.css grep font-display=0+theme.test hash=manifest）——未提交实现
     无 git checkout 抹除事故。
   - **G1（新·记档级）**：r3-rdr 改写负锚 it 无落盘首红（firstraw 未含该文件，
     绿前首跑红未存档）——其「能失败一次」由旧正断言（改写前在同源码上通过）
     逻辑闭环+同族负锚 mut-2 红证间接覆盖，风险极低，仅记档不阻断。

## ④ 机器面核对

- **890 数理**：888 基线+app-shell 新 it 2（顶栏三件+侧栏负锚）+theme 新 it 1
  −TOKENS --gold-night it.each 行 1=**890**——与 verify.log（107 文件 890
  passed）及 mut-3（890 全量语境）三方一致；app-shell 3→5 it（verify 单文件
  计数 5）复核吻合。**门一口径（888+3−1）与实现者构成申报同值，数理闭合。**
- **locks 166**：独立计数命中；变更面=3 hash+generatedAt，无新路径。
- **翻 done 推演**：check-tickets.mjs 解析正则 `SR2?-[A-Z]+-\d+` 需 S 前缀
  ——`R2-SH2` **不匹配=R2 系整体在 check-tickets 盲区**（R2-LG12 门一 W1 已
  知设计，非本单引入）。推演结论：翻 done 后 tickets:check 仍绿；纵使未来
  正则扩展覆盖 R2 系，R2-SH2 引用面仅 App.tsx 自身（自引用豁免）且无
  data-ticket/STUB/占位桩（规则 2/3/4b 全不触发）——**翻 done 无红**。
- **N1（收口硬条件重申）**：verify.log（20:03:14）早于 W2 终态（mut-3 20:11:14/
  relock 20:11:47）——收口单写前主控必须重跑 `npm run verify` 亲验真退出码落盘
  （宪法 DoD+§4.4 顺序铁律：registry 翻 done 之后再跑全链，verify 永远最后）。
- **e2e 面申明**：实现者已跑 smoke 4+workspaces 1=**5/5，E2E_EXITCODE=0**
  （零改预判兑现：Synapse 渲染文本唯一在场=App.tsx:142——TextLayer.tsx:9 为
  注释非渲染文本，getByText 不命中；workspaces 无容器位断言）；**全量 26 归
  主控收口**（reader-text/lineage/corpus 等未跑面在案——W2 只动 css 字体+测试
  断言，e2e 断言面零涉，预期绿但必须跑）。

## ⑤ 成本账本

| 单元 | token | 轮次 | 时长 | 来源 |
|---|---|---|---|---|
| 实现者 | 2,903,781 | 54 | 13.4 分 | 主控派发回执（实现者自报「未计量」） |
| 门一 | 1,256,266 | 22 | 6.1 分 | 主控派发回执 |
| 门二（本报告） | 未计量 | — | — | 环境无会话级计量面；主控从派发回执汇出补登 |

## 终评

**PASS——零回炉，门二放行进收口。**

- 实现面与母本（决4/决5）逐值符合，W2 补做后 lib 面完全收敛；三负锚+顶栏
  双 it 变异红证 ×3 全真且断言级；锁 hash/locks 166/890 数理独立复算全闭合；
  Switcher 零触碰、安全禁令零涉、行数全在红线。
- 诚实性瑕疵二项（行数虚报+首红总数口径）已由门一落档，无后果，收口单申报即可；
  定向跑首红+W1 第三面未入首红档案的教训回流 methodology 候选（G1 连带）。
- **收口前置条件（主控，不可省）**：①N1——registry 翻 done+locks:check 后
  重跑全量 `npm run verify` 亲验真退出码+全量 e2e 26 落盘；②W4——真机复评
  Switcher 白底对比度定生死（不可见即回炉改色，建议走 wrapper 容器选择器外挂
  不破零触碰红线）+F-05/INV-34 顶栏 44px 阅读器滚动链冒烟。两项均已在主控
  处置计划内，非回炉项。
- 遗留池移交（门一 E 节确认+本审无增）：.lib-detail-v-serif 名实重构候选/
  theme.test:10-11 头注漂移/B1「撑高」注释表述修正（下张同域票）。
