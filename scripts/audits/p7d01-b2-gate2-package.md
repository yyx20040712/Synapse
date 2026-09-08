# P7D-01 批二门二审档包（主控预生成 2026-09-08,含回炉两轮）

## 门一报告全文（Kimi K3,W4/N13,PASS_WITH_WARNINGS）
[routing]: run=20260908154800-xnz1 source=kimi-main model=kimi-k3 switches=0 usage=in=11596,out=9789 latency=255643ms (by ds-call.mjs 链)

# P7D-01 批二 · 门一对抗深审报告

## A. 母本符合度（裁决档映射表 vs diff 逐行）

**[N] A-1 六 token 定义逐值对应裁决表**
证据：theme.css diff `+  --fs-micro: 10px;` / `caption: 11px` / `body: 12px` / `strong: 13px` / `title: 14px` / `display: 17px`——与裁决档 §1 六档锚值逐值一致。

**[N] A-2 30 处替换逐处值→token 对应（强制审项①，逐处核毕）**
CSS 25 处 + tsx inline 4 处 + arbitrary 1 处，逐处对账：
- 变化面 13 处全部命中裁决预期：9.5→micro ×3（theme-shell.css app-nav-ver/app-nav-txt、theme-lineage.css 图注）；10.5→caption ×4（library.css lib-tag/tagmore/card-meta、theme-lineage.css 图例）；11.5→caption ×1（theme-reader.css rdr-aside-h4）；12.5→body ×1（LineageNodeCard TITLE_STYLE）；13.5→strong ×1（theme-shell.css nav 钮）；15→title ×3（library.css lib-detail-title/lib-detail-v-serif、theme-shell.css app-header-name）。
- 零变化 17 处仅换载体：10→micro ×3（LineageNodeMeta、ws-caret、TabBar text-[10px]）；11→caption ×3（lib-card-venue/lib-detail-k/LineageSideTags）；12→body ×5（lib-chip/NodeCard/lineage fit-btn/ws-item/ws-field）；13→strong ×4（reader syn-settings h2、lineage toolbar ×2、workspace）；14→title ×1；17→display ×1。
- 无一处映射错位（如 15→14 未误绑 display，13.5 未误绑 body）。13 处值变化=裁决档 §2 预期红清单，按审计口径不当缺陷。

**[N] A-3 @theme 重绑与 mockup 裁决 P5 一致性（强制审项·附加）**
theme.css diff `@theme { --text-xs: var(--fs-body); --text-sm: var(--fs-title); }`——与裁决档 §2「text-xs×131=12px 恰为 body 锚 / text-sm×25=14px 恰为 title 锚」一致；15→14 三处消费面（顶栏应用名+详情标题+衬线大字）与裁决档 §2 消费面描述一一对应。tailwind v4 默认 text-xs=0.75rem=12px / text-sm=0.875rem=14px，重绑后值不变、零视觉差声明成立。

## B. 宪法红线

**[N] B-1 受锁三件改动均在票面+追认内**
manifest.json diff 显示 invariants.md / theme.test.ts / library-cards.test.tsx 三哈希更新+generatedAt 刷新——前两者票面条款 3d/3e 明文授权，第三者属实现者 §4.2 自裁+验证摘要主控明文追认（「主控已 apply 286 重锁」与报告「locks:apply=主控位我禁跑」分工一致，无越权跑锁证据）。

**[N] B-2 INV-61 登记格式**
diff 中 INV-61 行与相邻 INV-59/INV-60 同构五列（编号|描述|锚定|测试|状态），含自裁申报注记与负锚口径注记。

**[N] B-3 UTF-8**
diff 全文中文渲染正常，无乱码/替换字符证据。注：纯文本 diff 无法技术性核验字节级编码，此项为无反证而非实证。

**[W] B-4 新文件引用悬空风险（不确定）**
INV-61、theme.css 注释、theme.test.ts 头注、library-cards 注释共 4 处引用 `docs/design/2026-09-08_p7d01-b2-fontscale-ruling.md`，但该文件不在本 diff 13 件清单内，审计包内无法证实其已入库。若裁决档仅在审计包语境存在而未提交仓库，则 4 处文档引用悬空。证据：实现者报告 §2 文件清单 13 件无此文件；INV-61 diff 摘录「docs/design/2026-09-08_p7d01-b2-fontscale-ruling.md」。**不确定**，请主控一句确认。

## C. 代码与测试质量

**[N] C-1 @theme 重绑编译面稳定性（强制审项③）**
证据链闭合：验证摘要 ③「DOM 计算样式定向断言 13/13 ALL PASS（…text-xs 12/text-sm 14——@theme 重绑经真机 DOM 生效铁证）」+报告「build exit=0（产物含 tailwind v4 编译后 CSS）」。`--text-xs: var(--fs-body)` 为 v4 合法 var 链，编译期不解引用、运行期 :root 解析；text-xs×131 在场保证变量不被 tree-shake。默认 `--text-xs--line-height` 未被覆写，行高维持 v4 默认——零视觉差声明成立。

**[W] C-2 FS 负锚声明形态存在绕过通道（强制审项②，等价性论证部分成立但有洞）**
证据：theme.test.ts 新增段 `new RegExp(\`font-size:\\s*${lit.replaceAll('.', '\\.')}\\s*;\`, 'g')`。该形态：
1. **要求尾随分号**——`font-size: 10px` 作块末声明无分号时不咬；
2. **不咬 `!important`**——`font-size: 10px !important;` 中 px 后是空格+`!`，`\s*;` 失配；
3. **不咬 `font:` 简写**——`font: italic 12px/1.5 serif` 同样设置 font-size 且无 `font-size:` 前缀。
自裁 §4.1 的「防护语义等价」论证对「定义正锚+消费负锚」主干成立，但负锚比批一纯文本计数窄了一个形态维度。现状 1543 绿仅证明现存代码不踩这三形态，未来回填可绕过。建议（非阻塞）：正则改 `font-size:\s*<lit>(?![\d.])`（去分号依赖+防 10px 误咬 100px 类前缀——现正则 `\s*;` 恰好兼有此后瞻作用，改时须保留）。

**[W] C-3 负锚枚举式覆盖：新字面量/新文件/未列文件无防线（强制审项②延伸）**
证据：`FS_LITERALS` 固定 12 值、`FS_CSS` 固定 7 文件、`FS_TSX` 固定 4 文件。推论：
1. 新增 `font-size: 16px;`（不在 12 值清单）在七 CSS 内全绿——报告自述的 grep 标准 `font-size: *[0-9]`（任意数字归零）严于测试实际锚（仅枚举值归零），**测试未复现报告自证的口径**；
2. INV-61 登记语义为「font-size 消费面禁字面量」全域命题，但 tsx 锚仅扫 4 件——其余 tsx（library/workspaces/reader 诸件）若现存或新增 `fontSize: 12` / `text-[14px]` 字面量，防线不咬。包内无证据证明其余 tsx 有此类字面量（不确定），但锚定面<登记语义面是结构性事实。

**[N] C-4 library-cards 三断言配套强度（强制审项④）**
diff：三断言改 `font-size: var\(--fs-title\)` / `var\(--fs-caption\)` ×2——仍逐类（.lib-card-title/.lib-card-venue/.lib-card-meta）逐属性 toMatch 正则，且 var 名具体到档位（非 `var\(--fs-` 泛匹配），值面转由 TOKENS 六正锚（`['--fs-title', '14px']` 等，theme.test.ts diff）锁定。强度同构成立，meta 10.5→11 用例名随迁标注裁决变化面。另注：全量 1543 绿发生在 13 处值变化之后——任何其他锁定旧字面量的测试必然转红，故「全 tests/ 唯一冲突面」的 grep 声称有强间接证据支撑（E-1 联动）。

**[N] C-5 挂载/事件面**
本票无 hook/事件面，按票面跳过。

**[N] C-6 先红 27 红构成可复算（强制审项·诚实性交叉）**
18 对 [字面量×文件] 逐对复算：theme-shell 3（15/13.5/9.5——9.5×2 同对）+theme-reader 2+theme-lineage 4（13×2 同对）+library 6（11×2→1、10.5×3→1、15×2→1）+workspace 3（12×2→1）=18 ✓；6+18+2+1=27 ✓；93=6+84（12×7）+2+1 ✓；209=116+93 ✓；1543=1450+93 ✓。全部数字自洽可复算。

## D. 报告诚实性

**[N] D-1 两自裁 vs 主控追认表述**
§4.1 论据（theme.css '12px' 现状 1 次=--radius-m 定义行，token 化后必 2 次→纯文本「恰 1 次」结构性必红）在 theme.css diff 中可见佐证（--fs-body: 12px 新增后与 --radius-m 同值并存）；§4.2 申报「超票面编辑」措辞与验证摘要「主控追认」措辞一一对应，无淡化。两自裁均在 INV-61 锚定列留痕。但 §4.1 的「防护语义等价」结论偏乐观——见 C-2/C-3，等价性有洞，属论证瑕疵而非不诚实（论据本身真实）。

**[N] D-2 先红构成逐项可解释**
见 C-6，复算全过。

**[N] D-3 行数/文件数声称**
「+77 行 454 行总」与 diff hunk 头 `@@ -377,3 +385,70 @@`（旧 379 行末段→新约 454 行）吻合；「13 文件」与 diff 实际 13 件吻合。

## E. 接缝与后续单

**[N] E-1 tests/ 漏网字面量断言**
间接证据充分：13 处值变化后全量 1543/1543 绿，任何锁定旧值（10.5/9.5/11.5/12.5/13.5/15）的断言必红——library-cards 外无残留。残余不确定性（非值锁定的形态断言）包内无法排除，不确定标注。

**[N] E-2 --fs-* 与 --ui-scale 相乘语义（B5 复核结论核查）**
报告 §5 结论「--fs-* 不入任何 zoom/calc 乘算表达式」与裁决档 §3-4「产出核查结论供档、不预改」一致；zoom 属渲染后整体缩放、字号载体更换不改变缩放语义的论证正确。13 处变化点在缩放档≠1 时与零变化点同比例呈现——语义无回归。符合「不预改、不报裁」边界。

**[W] E-3 theme-lineage.css:113-119 注释失实残留**
实现者 §6.1 自报：注释含「9.5px 斜体」历史描述，值已 9.5→10，注释失实；负锚声明形态不咬注释故测试不红。实现者按范围纪律未动并报裁，处置流程合规，但事实层面的文档漂移已确认存在，留作后续单清。

**[N] E-4 INV-61 措辞**
「font-size 消费面禁字面量（CSS 声明/inline/arbitrary），tailwind 经 @theme 重绑入单源」与实现面一致；唯登记语义面宽于锚定面（C-3），后续单若收紧锚定宜同步回注 INV-61 测试列。

## 统计

- B（阻断）=0
- W（警告）=4：B-4 引用悬空（不确定）、C-2 负锚形态绕过通道、C-3 枚举覆盖<登记语义、E-3 注释失实残留
- N（通过）=13：A-1/A-2/A-3、B-1/B-2/B-3、C-1/C-4/C-5/C-6、D-1/D-2/D-3、E-1/E-2/E-4 中 N 项

## 总评：**PASS_WITH_WARNINGS**

票面核心（30 处逐处映射/13 处变化=裁决预期/@theme 重绑真机生效/先红 27 复算/93 用例构成）全部对得上裁决档，零阻断项。四个 W 均为防线强度与文档残留类：C-2/C-3 指向同一根因——INV-61 登记的是全域禁令，落地的却是枚举式（12 值×7 CSS+4 tsx、且要求尾随分号）锚定，建议批三或独立小单把负锚升级为「任意数字 font-size 声明归零」（即实现者自己 grep 自证的那个口径）并去分号依赖；B-4 请主控一句话确认裁决档文件已入库即可关闭；E-3 注释失实随下一触碰 lineage 皮肤的工单顺手清。
## 主控处置表
- B-4 裁决档悬空：确认非悬空——裁决档在工作树,随本收口提交入库（门一包外可见性限制）。
- C-2/C-3 负锚枚举式覆盖<登记语义：接受为后续增强单候选（正则全域「任意数字 font-size 声明归零」——不阻塞本票,枚举锚已锁当前 30 处消费面）;教训入交接书。
- E-3 注释失实：主控顺手清（10px/39）——清理过程中主控抓到第 14 处变化面=max-height 37.05px 跨模块耦合族（CSS+EDGE_LABEL_H+LH+双测试锚）,字号 9.5→10 后 3 行实际 39px>37.05px=截断行为差——回炉一轮实现者全族迁移（8 处成员）+估宽基准 9.5/4.75→10/5 随迁（回炉二轮——防重叠碰撞盒语义,非纯容差）。
- 回炉二轮红 1 例适配亲核：edge-label-layout.test ③ 夹具 hw 50→52 恢复触发条件（估宽 42→44 使 dx 第三档翻转的因果链注记完整）,断言面零放宽。

## 实现者报告终版（含 §7 回炉两轮）
# P7D-01 批二 实现者报告——字号六档语义刻度落地

> 档位申报：GLM5.3flash/思考中（平台以实际执行模型为准）。
> 技能清点（开工纪律）：test-driven-development「用」（3d 先红证）；
> verification-before-completion「用」（verify 真退出码+分段落盘）；
> systematic-debugging「暂不用」（新实现非调试，未遇阻）；
> subagent-driven-development「不用」（本人即实现者，无派发面）。

## 1. 实现摘要

裁决档 §1 六档映射表逐行落地：3a token 六档定义（theme.css :root 批一
z 序段后）+3b tailwind v4 @theme 重绑（text-xs→--fs-body/text-sm→
--fs-title）+3c 消费面 30 处硬编码→var(--fs-*)（CSS 25 处+tsx inline
4 处+arbitrary 1 处）+3d theme.test.ts 防线扩展（先红证）+3e INV-61
登记。13 处值变化=用户裁决预期（未「修正」回旧值）。

消费对账（grep 实测）：var(--fs-*) 消费 32 处=30 处替换+2 处 @theme
重绑行；替换后七 CSS font-size 字面量归零（grep "font-size: *[0-9]"
零匹配）。

## 2. 文件清单（git diff --stat 实测 13 文件，零范围蔓延）

| 文件 | 变更 |
| --- | --- |
| src/renderer/shared/theme.css | +17（@theme 重绑块 8 行+:root --fs-* 六档 9 行） |
| src/renderer/shared/theme-shell.css | 4 处（15→title/13.5→strong/9.5→micro ×2） |
| src/renderer/shared/theme-reader.css | 2 处（11.5→caption/13→strong） |
| src/renderer/shared/theme-lineage.css | 5 处（10.5→caption/13→strong ×2/12→body/9.5→micro） |
| src/renderer/features/library/library.css | 10 处（17→display/14→title/11→caption ×2/10.5→caption ×3/12→body/15→title ×2） |
| src/renderer/features/workspaces/workspace.css | 4 处（13→strong/10→micro/12→body ×2） |
| src/renderer/features/lineage/LineageNodeMeta.tsx | fontSize '10px'→'var(--fs-micro)' |
| src/renderer/features/lineage/LineageNodeCard.tsx | '12.5px'/'12px'→'var(--fs-body)' ×2 |
| src/renderer/features/lineage/LineageSideTags.tsx | fontSize 11→'var(--fs-caption)' |
| src/renderer/features/reader/TabBar.tsx | text-[10px]→text-[length:var(--fs-micro)] |
| tests/unit/renderer/theme.test.ts | +77 行 454 行总（<500 达标）；新增 93 用例 |
| tests/unit/renderer/library-cards.test.tsx | 三断言 token 化配套（自裁申报 §4.2） |
| docs/invariants.md | INV-61 登记（文末表格） |

行号核对：简报 3c 表 30 处行号与现场 grep 全吻合，零漂移修正。

## 3. 测试与验证证据

- **先红证**（3c 执行前）：theme.test.ts 单跑 **27 failed | 182 passed，
  exit=1**，raw=scripts/audits/p7d01-b2-first-red.raw.txt。红构成逐项
  可解释：TOKENS 六正锚 6+FS 负锚矩阵 18（=[字面量,文件] 组合，与 25 处
  在场字面量分布一致）+tsx 形态锁 2+@theme 重绑锁 1=27。
- **转绿**：theme.test.ts 209/209（=批一基线 116+新增 93）。
- **全量 test**：npm run test **1543/1543 全绿 exit=0**（=基线 1450+93），
  raw=scripts/audits/p7d01-b2-test-full2.raw.txt（首跑 1 红处置见 §4.2，
  首 跑 raw=p7d01-b2-test-full.raw.txt 在档）。
- **verify 真退出码**：**exit=1，红在 locks:check 段**（三受锁件
  invariants.md/theme.test.ts/library-cards.test.tsx 哈希变更——预解锁
  工作流预期面，locks:apply=主控位我禁跑；quality:check+tickets:check
  在 && 链中已先过），raw=scripts/audits/p7d01-b2-verify.raw.txt。
  其余被截断关卡独立补跑：lint+typecheck+build **exit=0 全绿**，
  raw=scripts/audits/p7d01-b2-lint-type-build.raw.txt（build 产物含
  tailwind v4 编译后 CSS——@theme 重绑经 vite 链验证）。
- 新增用例 93=6（TOKENS 正锚 it.each）+84（FS_COUNTS 12 字面量×7 文件
  it.each）+2（tsx 形态）+1（@theme 重绑锁）。

## 4. 自裁申报

### 4.1 负锚矩阵口径修正：font-size 声明形态（非批一纯文本计数同构）

简报 3d 原口径「DURATION_COUNTS 同构（纯文本计数）：唯 theme.css 每值
恰 1 次」在 px 通用值上**结构性不可行**——实测：theme.css '12px' 现状
1 次为 --radius-m 定义行（token 定义后将=2 次，恰 1 次断言必红）；
theme-shell.css '10px' 9 次全非 font-size 声明（padding/radius 类）。
批一可行前提「时长字面量唯时长消费」在 px 上不成立。修正为：
负锚锚定 `font-size:\s*<字面量>;` 声明形态（七 CSS 全 0），token 定义
行由 TOKENS 六正锚独立锁定——防护语义等价（定义正锚+消费负锚），先红
证仍成立（25 处在场声明形态即红）。已同步注记入测试头注与 INV-61。

### 4.2 library-cards.test.tsx 三断言 token 化配套（超票面编辑）

全量首跑 1 红：library-cards.test.tsx:298-301 既有受锁断言锁定
.lib-card-title/.lib-card-venue/.lib-card-meta 的 font-size 字面量
（14px/11px/10.5px）——与票面 3c（library.css:114 等替换）+3d（负锚
归零）**绝对互斥**（无中间态），属主控派单接缝漏列（全 tests/ 唯一
冲突面，grep 实测）。处置=更新三断言为 var(--fs-*) 载体（**强度不
放宽**：仍逐类逐属性 toMatch 同构；值面转由 TOKENS 六正锚+FS 负锚
双锁），用例名随迁（meta 10.5→11=裁决变化面）。事实依据：该文件
可写（-rw-r--r--，主控预解锁覆盖整个受锁面而非仅 theme.test.ts）；
diff 一键可回退（未提交）。**此编辑请主控门审重点过目**。

### 4.3 其他

- tsx 形态锁在票面两条明文断言（not.toContain("fontSize: '1")/
  not.toContain('text-[10')）之上各增一条通用正则（/fontSize:\s*['"`]?\d/
  覆盖无引号数字形态——SideTags 原状 fontSize: 11 即此形态；/text-\[\d/
  覆盖数字开头 arbitrary，# 开头色值不咬）。
- theme.css token 插入点=批一 z 序段后（--z-pop 行后、--font-display
  前）——「--dur-* 段后」的批一区末尾读法，保持批一 dur/z 两段完整。
- INV-61 锚定方式列含 library-cards 随迁说明+负锚口径注记（与登记
  格式 INV-58~60 同构五列）。

## 5. B5 缩放静态核查（裁决档 §3-4 条款）

--ui-scale 消费面 grep 实测：theme-shell.css 63/66 两处 zoom 声明
（var(--ui-scale,1) 与 calc(1/var(--ui-scale,1)) 反补偿）+App.tsx:135
setProperty 单点写。**--fs-* 六 token 不入任何 zoom/calc 乘算表达式**
（无直接耦合面）；zoom 属布局级缩放（渲染后整体缩放），font-size 无论
字面量或 token 载体同受 zoom 作用——批二仅改取值单源，不改变缩放语义；
13 处值变化点在缩放档位≠1 时与 17 处零变化点同比例呈现。结论：统一
体系（--fs-*×--ui-scale 乘算）现状不存在也无必要，不另行报裁。

## 6. 疑虑

1. **theme-lineage.css:113-119 注释**含「9.5px 斜体」等历史描述字样
   （F-L1-C 裁决档案描述），值变化（9.5→10）后注释失实——按范围纪律
   未动（负锚为声明形态不咬注释），是否顺带更新请主控裁。
2. verify 无法达成整链绿=locks:check 预期红（§3），主控收口
   locks:apply+[locked-change] 提交后即应全绿——请主控亲验。

## 7. 回炉一轮——E-3 第 14 处变化面（字号→行高→盒高耦合链）

主控 E-3 注释清理时抓到批二与门一均漏检的耦合族：.lineage-edge-label
字号 9.5→10（--fs-micro）后 line-height 1.3 派生数学未同步——3 行盒高
39≠旧 max-height 37.05（第 3 行截 ~1.95px+悬停滚动提前触发）。

### 7.1 耦合族全局清点（执行序①）

grep '×1.3|1\.3;|line-height.*1\.3' + '37\.05|12\.35|41\.05|123\.5'
双扫（src+tests）结论：**行高 1.3 派生耦合族唯一=edge-label 域**（唯二
line-height:1.3 声明=theme-lineage.css:126 比例行高（字号无关，不迁）
+theme.css 无）；族成员 8 处：

| 位置 | 旧→新 |
| --- | --- |
| edge-label-layout.ts:30 EDGE_LABEL_H | 37.05→39（3×10×1.3） |
| edge-label-layout.ts:32 LH | 12.35→13 |
| edge-label-layout.ts:16 注释 | lh=12.35=37.05/3,±123.5→lh=13=39/3,±130 |
| edge-label-layout.ts:29 注释 | 3 行×9.5px×1.3→×10px× |
| theme-lineage.css:131 max-height | 37.05px→39px（:113-119 注释主控 E-3 已清，核对无误） |
| LineageEdges.tsx:13/:15 注释 | 130×37.05→130×39；9.5px→10px（清单外同族字样，随迁申报） |
| edge-label-layout.test.ts:20-22/:55/:68/:115 | LH=13/盒高 39+4/43+43/\|dy\|≥77.5/±(10lh+21.5)=±151.5 |
| lineage-canvas.test.tsx:453/:462 | 用例名 130×39+FO height '37.05'→'39' |

清单外发现两项（未擅改，申报主控裁）：
1. **estimateLabelWidth 估宽基准 9.5/4.75**（layout.ts:40-49）：字号派生
   （全宽 9.5px/字≈旧字号）——但头注 ：14-15 有容差声明背书（est 偏差
   由 gap 4+FO 恒 130 吸收，声明容差不修），主控迁移值清单未列；5% 偏差
   仍在声明容差内。是否随迁 10/5 请裁（若迁，test ①:41-42 期望 23/
   18.25 需连带）。
2. **edge-label-layout.test 为同构复算型无绝对值锚**（本轮先红证实证：
   期望改后旧实现下该文件仍全绿——EDGE_LABEL_H import 自实现+LH 测试侧
   常量比较性质断言，值迁移不设防）。全族唯一绝对值锚=lineage-canvas
   :462。可选补强：`expect(EDGE_LABEL_H).toBe(39)` 一行（超票面未加）。

### 7.2 先红证（执行序②）

期望先改→旧实现（37.05 在场）跑两测试：**1 failed（lineage-canvas ⑦
FO height '39' 断言）| 32 passed，exit=1**，raw=scripts/audits/
p7d01-b2-rework-red.raw.txt（edge-label-layout.test 全绿原因见 7.1
发现 2）。

### 7.3 实现迁移+转绿（执行序③）

layout.ts+theme-lineage.css:131+LineageEdges.tsx 注释落地后两测试
**33/33 绿**；src 全域 grep 37.05/12.35/41.05/123.5 **零残留**。
对账：渲染 FO height 由 LineageEdges.tsx:37 import EDGE_LABEL_H 常量
单源消费——layout.ts 改一处渲染自动随迁，无第二字面量。

### 7.4 verify（执行序④）

npm run verify 真退出码**追加** p7d01-b2-verify.raw.txt：**rework-exit=1，
红面仍=locks:check 段**（受锁件本轮新增 edge-label-layout.test.ts+
lineage-canvas.test.tsx 两件哈希变更——locks 输出实测恰列此两件，§3 首
轮的三件主控 E-3 已处理；apply=主控位）；&& 链在 locks 断——test 段
经独立全量补跑：**156 文件/1543 用例全绿 exit=0**（含回炉两文件重跑），
raw=scripts/audits/p7d01-b2-rework-test-full.raw.txt。lint+typecheck+
build 本轮重跑 **exit=0 全绿**（rework-ltb-exit=0，追加 p7d01-b2-
lint-type-build.raw.txt——build 产物 CSS 51.04 kB 不变，max-height 值
迁移不增量）。主控收口 locks:apply 后 verify 整链即绿。

### 7.5 回炉二轮——估宽基准随迁（主控裁决续命：不接受容差声明）

裁决：9.5/4.75 估宽基准随迁（换行行数预估字符宽——字号 +5.26% 后估窄
致边界文本预估行数偏少→碰撞盒偏小，削弱 F-L1-C 防重叠设计意图，非纯
显示容差；行高已 10 基准估宽留 9.5=半迁状态）。落地：:49 `9.5 : 4.75`
→`10 : 5`+:40-41 注释同步+test ①绝对锚期望连带（23→24/18.25→19，
§7.1 申报获批口径）。

**红如实报**：全量首跑 1 failed=edge-label-layout.test ③——该用例实为
数值边界敏感锚：估宽 42→44 使 hw 23→24，dx 第三档 |x|=80 对节点盒
（外扩半宽 56+23=79）由撞（78<79）翻转为分离（80≥80）——dy=0 档即
命中自由位、「y 偏移已发生」前提失效（§7.1 发现 2 的「同构复算零红」
预判对 ②②b③b⑤⑥/fit 成立——它们全满宽钳制 130 不受基准影响，唯 ③
短标签场景踩边界）。适配=节点盒 hw 50→52（外扩 58）恢复「dy=0 全档
相撞」触发条件，断言面零放宽（not.toBe(0)+disjoint 原样），适配理由
注记入用例注释。二跑全量 **156 文件/1543 用例绿 exit=0**（raw=
p7d01-b2-rework2-test-full2.raw.txt，首跑红 raw=p7d01-b2-rework2-
test-full.raw.txt 在档）。verify 追加 rework2 段（真退出码见
p7d01-b2-verify.raw.txt 尾——locks:check 预期红面同 §7.4：edge-
label-layout.test.ts 本轮再改，apply=主控位）。



## 主控亲验终态摘要
- verify EXIT=0：156 文件/1543 用例（1450+93）/locks 286 重锁绿（p7d01-b2-final-verify.raw.txt）。
- §6.2 定向验收（回炉前采集+回炉后复核）：探针 after COMPARE FAIL=预期红（8 态 DIFF+tokens 11 ok+sweeps ok——非字号面零漂）;像素差分带对位（变化带恰落顶栏/侧栏/卡片 meta/边标签/图例/底部版本号,无意外区）;wspanel crop 目检 0 可见差;DOM 计算样式断言 13/13 ALL PASS（六 token+五变化组件+tailwind 双重绑真机生效）。
- 探针 after 两次 seed 崩溃=out/ 产物坏中间态（rebuild 后恢复,最小 launch 复现闭环）——环境事故在档非代码缺陷。

## 完整 diff（工作树终态）
diff --git a/docs/invariants.md b/docs/invariants.md
index e7c132a5cb..74abefe18f 100644
--- a/docs/invariants.md
+++ b/docs/invariants.md
@@ -74,6 +74,7 @@
 
 | INV-59 | 重锚同族配对令（F-A8 门2，2026-09-04 随主链切换落地登记）：标注/AI 段重锚产物 resolved.rects 与 resolved.bands 必须**同几何族**（项几何主链=rectsForOffsetRange 项盒+bandsFromItems 同源派生；S4 DOM 回退层=findRangeAtOffset 行盒+bandsForTextNodes 节点口径同源）——主链禁跨族配对（消 R1：正确 rects×失真 bands 互漂错绑）；跨族配对仅允许显式回退格且属登记边界：**S3b 条目回退**（存量 rects[库]×bandsNearRects[DOM 量测]——现状语义逐位保持）与 **S5/S6 页级回退**（DOM 产物或其抑制后的存量直显）；matchBand 阈值（\|Δcenter\|≤rect.h）仍在为跨格边界兜底 | src/renderer/features/reader/annotation-resolve.ts（ResolvedAnnotation 域内 rects/bands 成对产出+resolveAnnotationRectsItem 同族管线）+annotation-resolve-layered.ts（三层编排=同族配对的编排保证——主链产物 rect/band 同域，跨族仅在登记回退格） | 单测（annotation-layer.test F-A8 门2 describe：S2 项几何产物 rect/band 同族数值断言（块几何=band 几何同基线）+S3b/S6 回退格跨族配对=登记边界渲染断言；anchor-item-verify.test：resolveAnnotationRectsItem 产物与 itemSelectionGeometry 同参直调逐位一致（rects+bands 双断言）） | 已锚定（单测级 F-A8 门2 本单——证据件 anchor-item-verify.test.tsx 为门 0 遗留未跟踪件,随门 2 收口提交补 git add 后生效[门二 W1 标注]） |
 | INV-60 | 重锚显示覆盖登记（F-A8 门2，2026-09-04 随主链切换落地登记）：重锚成功产物（项几何主链/S4 DOM 回退层）覆盖库值 rects **仅显示层、永不回写**（annotation.rects 库数据零迁移零触碰——重锚是渲染态推导非数据变更；INV-37 只覆盖拖选期不扩其文，本条另立）；产物域标记 source:'item'\|'dom' 随 resolved 运行时走（调试面=渲染块 data-source 属性+单测断言面；**不入库**=Annotation 模型锁面零触碰），渲染行为零差（色块样式不区分源） | src/renderer/features/reader/annotation-resolve.ts（ResolvedAnnotation.source 可选域）+AnnotationLayer.tsx/AiAnnotationLayer.tsx（data-source 调试属性）+annotation-resolve-layered.ts（markSource 唯一标域点） | 单测（annotation-layer.test/ai-annotation-layer.test F-A8 门2 describe：域标记断言（S0/S4='dom'/S2='item'/S3b·S6 抑制=无标记）+M3 主链换 DOM 变异→域标记断言红证在档；e2e reader-text「划选高亮后重开仍在原位」INV-51 稳态口径回归=显示覆盖不回写的端到端面） | 已锚定（单测级 F-A8 门2 本单；e2e 面随全量 reader-text 回归） |
+| INV-61 | 字号六档语义刻度单源：font-size 消费面禁字面量（CSS 声明/inline/arbitrary），tailwind text-xs/text-sm 经 v4 @theme 重绑到 --fs-* token——档位与锚值变更=用户裁决+本册 | P7D-01 批二用户裁决 2026-09-08（docs/design/2026-09-08_p7d01-b2-fontscale-ruling.md）；token 定义=src/renderer/shared/theme.css :root --fs-* 段+@theme 重绑块，消费面=四皮肤件+library.css+workspace.css+四 tsx inline+tailwind 类 | theme.test.ts（TOKENS 六正锚+FS_LITERALS 负锚矩阵（font-size 声明形态口径——px 通用值纯文本计数不可行）+@theme 重绑锁）+library-cards.test.tsx 三断言随迁 token 载体（实现者自裁申报在档） | 已锚定（2026-09-08 批二） |
 
 ## 维护规则
 
diff --git a/locks/manifest.json b/locks/manifest.json
index a91672c373..0706ddc2e1 100644
--- a/locks/manifest.json
+++ b/locks/manifest.json
@@ -1,5 +1,5 @@
 {
-    "generatedAt":  "2026-09-05T01:01:02.1980857Z",
+    "generatedAt":  "2026-09-08T16:05:41.2217614Z",
     "files":  [
                   {
                       "path":  ".github/workflows/ci.yml",
@@ -7,7 +7,7 @@
                   },
                   {
                       "path":  "docs/invariants.md",
-                      "sha256":  "4c0e7bc1cd764f6fdecebe6f91a36e545f030b89de7b1f639d414e458fefa291"
+                      "sha256":  "af55aa69ae6dea03736d4b659c609349094db1cf78fae3e61728495aecbfc899"
                   },
                   {
                       "path":  "electron.vite.config.ts",
@@ -707,7 +707,7 @@
                   },
                   {
                       "path":  "tests/unit/renderer/edge-label-layout.test.ts",
-                      "sha256":  "95444216a7b010f5a486efa5cb4bf1d67ecca6c91c4f18d29e645a2f713b3da8"
+                      "sha256":  "fff2bfb6c41f577239ab07123996941af39fce3c4b43045d2598286e8799e316"
                   },
                   {
                       "path":  "tests/unit/renderer/import-drag-ui.test.tsx",
@@ -727,7 +727,7 @@
                   },
                   {
                       "path":  "tests/unit/renderer/library-cards.test.tsx",
-                      "sha256":  "e74d54afa082dccc5314a687a26fa6dfe0b529062be0d417ca1f3826024e8ee9"
+                      "sha256":  "84a3817b929ed177992f813db5489d57125069888f9e8dc59b670a18ce5d6390"
                   },
                   {
                       "path":  "tests/unit/renderer/lineage-board.test.tsx",
@@ -735,7 +735,7 @@
                   },
                   {
                       "path":  "tests/unit/renderer/lineage-canvas.test.tsx",
-                      "sha256":  "08dce970a185bb7ebff4ef2340c2d7439e1fb8ff2463c81347c68d7caafde0e0"
+                      "sha256":  "5c778a72e306c585a2c458d5f6c194440dc882135c39f938216a7cc1cd61f72e"
                   },
                   {
                       "path":  "tests/unit/renderer/lineage-canvas-visual.test.tsx",
@@ -947,7 +947,7 @@
                   },
                   {
                       "path":  "tests/unit/renderer/theme.test.ts",
-                      "sha256":  "9312e70b0a01d79a1ae969717d915ce663352e82faf98f0030dd606604045115"
+                      "sha256":  "639651636327f79105e71f476a9e03d86f1c164e8ec667a8675ab3d53a9eb986"
                   },
                   {
                       "path":  "tests/unit/renderer/toast.test.tsx",
diff --git a/src/renderer/features/library/library.css b/src/renderer/features/library/library.css
index f15e1ee558..c677f0971c 100644
--- a/src/renderer/features/library/library.css
+++ b/src/renderer/features/library/library.css
@@ -97,7 +97,7 @@
 .lib-card-year {
   flex: none;
   min-width: 44px;
-  font-size: 17px;
+  font-size: var(--fs-display);
   color: var(--gold);
 }
 /* 空年份 ◆（回炉 R3）：9px 淡金菱形占位，year 槽 min-width 44px 保对齐 */
@@ -111,7 +111,7 @@
 }
 .lib-card-title {
   min-height: 38px;
-  font-size: 14px;
+  font-size: var(--fs-title);
   line-height: 1.45;
   font-weight: 600;
   display: -webkit-box;
@@ -122,7 +122,7 @@
 .lib-card-venue {
   display: block;
   margin-top: 6px;
-  font-size: 11px;
+  font-size: var(--fs-caption);
   color: var(--text-dim);
   font-style: italic;
 }
@@ -133,7 +133,7 @@
   margin-top: 9px;
 }
 .lib-tag {
-  font-size: 10.5px;
+  font-size: var(--fs-caption);
   color: var(--accent);
   background: var(--accent-soft);
   border-radius: 6px;
@@ -141,7 +141,7 @@
 }
 .lib-card-tagmore {
   align-self: center;
-  font-size: 10.5px;
+  font-size: var(--fs-caption);
   color: var(--text-dim);
 }
 .lib-card-meta {
@@ -149,13 +149,13 @@
   flex-wrap: wrap;
   gap: 10px;
   margin-top: 9px;
-  font-size: 10.5px;
+  font-size: var(--fs-caption);
   color: var(--text-dim);
   font-variant-numeric: tabular-nums;
 }
 /* 筛选 chips：搜索框/下拉统一胶囊语法（mockup .chip/.search） */
 .lib-chip {
-  font-size: 12px;
+  font-size: var(--fs-body);
   color: var(--text);
   border: 1px solid var(--border);
   border-radius: 999px;
@@ -208,17 +208,17 @@
   min-height: 160px;
 }
 .lib-detail-title {
-  font-size: 15px;
+  font-size: var(--fs-title);
   font-weight: 500;
   line-height: 1.5;
 }
 .lib-detail-k {
   color: var(--text-dim);
-  font-size: 11px;
+  font-size: var(--fs-caption);
   letter-spacing: 1px;
 }
 .lib-detail-v-serif {
-  font-size: 15px;
+  font-size: var(--fs-title);
   color: var(--gold);
 }
 .lib-detail-abs {
diff --git a/src/renderer/features/lineage/LineageEdges.tsx b/src/renderer/features/lineage/LineageEdges.tsx
index ac5ad4ff5f..4592cb8808 100644
--- a/src/renderer/features/lineage/LineageEdges.tsx
+++ b/src/renderer/features/lineage/LineageEdges.tsx
@@ -10,9 +10,9 @@
  *   （kind=manual，F-LG15）=var(--manual-edge) 1.4 虚线 7 5（琥珀长虚线——
  *   与 tree 实线/ref 点线三方色型双区分）。glow filter 全撤（浅色板）。
  * - **边 label=F-L1-C 变体 C 窄幅注释**（案册定稿 2026-08-30 用户裁决）：
- *   foreignObject 恒 130×37.05（EDGE_LABEL_MAX_W/H 单源——渲染盒恒上限，
+ *   foreignObject 恒 130×39（EDGE_LABEL_MAX_W/H 单源——渲染盒恒上限，
  *   短标签透明空区无视觉影响，FO pointerEvents none）内 HTML div
- *   `lineage-edge-label`（皮肤类驻 theme.css：9.5px 斜体 #6b7280 白晕
+ *   `lineage-edge-label`（皮肤类驻 theme.css：10px 斜体 #6b7280 白晕
  *   text-shadow；自然换行 break-word+max-height 3 行+overflow hidden——
  *   真实溢出内容承载滚动语义）+title 全文 tooltip（U2a 同款）。
  *   锚点=props.slots 槽位（Canvas 从 edge-label-layout 放置器算入，
diff --git a/src/renderer/features/lineage/LineageNodeCard.tsx b/src/renderer/features/lineage/LineageNodeCard.tsx
index 6c47d51bac..5040236eaf 100644
--- a/src/renderer/features/lineage/LineageNodeCard.tsx
+++ b/src/renderer/features/lineage/LineageNodeCard.tsx
@@ -50,7 +50,7 @@ import { LineageNodeMeta } from './LineageNodeMeta'
 const TITLE_STYLE = {
   flex: 1,
   minHeight: 0,
-  fontSize: '12.5px',
+  fontSize: 'var(--fs-body)',
   lineHeight: '18px',
   color: 'var(--text)',
   overflowY: 'auto',
@@ -144,7 +144,7 @@ export function LineageNodeCard(props: {
               display: 'flex',
               alignItems: 'center',
               justifyContent: 'center',
-              fontSize: '12px',
+              fontSize: 'var(--fs-body)',
               color: 'var(--text-dim)'
             }}
           >
diff --git a/src/renderer/features/lineage/LineageNodeMeta.tsx b/src/renderer/features/lineage/LineageNodeMeta.tsx
index 97553eed22..42dbd09d65 100644
--- a/src/renderer/features/lineage/LineageNodeMeta.tsx
+++ b/src/renderer/features/lineage/LineageNodeMeta.tsx
@@ -29,7 +29,7 @@ export function formatMetricsText(m: LineagePaperMetrics | null | undefined): st
 /** 标签小块样式（红示意：红字小片——用户图7「红小块」） */
 const TAG_CHIP_STYLE = {
   flexShrink: 0,
-  fontSize: '10px',
+  fontSize: 'var(--fs-micro)',
   lineHeight: '16px',
   borderRadius: 3,
   color: 'var(--danger)',
diff --git a/src/renderer/features/lineage/LineageSideTags.tsx b/src/renderer/features/lineage/LineageSideTags.tsx
index 64bdeb52f8..14053aca23 100644
--- a/src/renderer/features/lineage/LineageSideTags.tsx
+++ b/src/renderer/features/lineage/LineageSideTags.tsx
@@ -17,7 +17,7 @@ const SIDE_TAG_CHIP: CSSProperties = {
   display: 'inline-flex',
   alignItems: 'center',
   borderRadius: 3,
-  fontSize: 11,
+  fontSize: 'var(--fs-caption)',
   color: 'var(--danger)',
   background: 'rgba(179, 64, 58, 0.08)',
   border: '1px solid rgba(179, 64, 58, 0.25)'
diff --git a/src/renderer/features/lineage/edge-label-layout.ts b/src/renderer/features/lineage/edge-label-layout.ts
index e59610d1aa..cf227a2996 100644
--- a/src/renderer/features/lineage/edge-label-layout.ts
+++ b/src/renderer/features/lineage/edge-label-layout.ts
@@ -13,7 +13,7 @@
  *   INV-36/38 只读消费）；恰好接触（间距=半和）不算重叠（严格 < 判相交）。
  * - est 宽度偏差（latin 0.5em 近似）由 gap 4px+渲染 FO 恒 130 吸收——碰撞
  *   盒略窄于实际时重叠 ≤ 数 px 的残差，声明容差不修。
- * - dy ∈ 0,+lh,−lh,…±10lh（lh=12.35=37.05/3 行行高，±123.5/20 档）；同档
+ * - dy ∈ 0,+lh,−lh,…±10lh（lh=13=39/3 行行高，±130/20 档）；同档
  *   dx ∈ 0,−(w/2+16),+(w/2+16),−(w/2+16)×2,+(w/2+16)×2。**包络=回炉 1 R1
  *   实测依据**（f-l1c-verify.json）：nodeHeight 100 档半高 50+外扩 6+标签
  *   半高 18.5+gap → 锚在节点中心需 |dy|≥~85 或 dx≥~163，原 ±5lh=61.75/
@@ -26,10 +26,10 @@
  */
 /** 标签渲染盒恒宽（渲染 FO 恒上限尺寸——短标签透明空区无视觉影响） */
 export const EDGE_LABEL_MAX_W = 130
-/** 标签渲染盒恒高（3 行 × 9.5px × 1.3 行高） */
-export const EDGE_LABEL_H = 37.05
+/** 标签渲染盒恒高（3 行 × 10px × 1.3 行高——P7D-01 批二回炉：字号 9.5→10 耦合族随迁） */
+export const EDGE_LABEL_H = 39
 /** 放置器档距（先竖移的步长=单行行高） */
-const LH = 12.35
+const LH = 13
 /** 碰撞盒间隙 */
 const GAP = 4
 /** 节点盒外扩（标签与节点卡之间的呼吸距） */
@@ -37,8 +37,8 @@ const NODE_PAD = 6
 
 /**
  * 标签估宽（只用于碰撞盒——渲染 FO 恒 130 宽，窄标签碰撞盒窄=放置更自然）：
- * 码点 >0x2E80 计全宽 9.5px/字（口径：覆盖 CJK 统表/扩展/全角标点——
- * CJK 部首 0x2E80 起全数计入），其余半宽 4.75px/字；+左右 padding 合计 4；
+ * 码点 >0x2E80 计全宽 10px/字（口径：覆盖 CJK 统表/扩展/全角标点——
+ * CJK 部首 0x2E80 起全数计入），其余半宽 5px/字；+左右 padding 合计 4；
  * 钳 ≤130。空串=0（空 label 不渲染，碰撞盒零宽）。
  */
 export function estimateLabelWidth(label: string): number {
@@ -46,7 +46,7 @@ export function estimateLabelWidth(label: string): number {
   if (label === '') return 0
   let w = 4
   for (const ch of label) {
-    w += ch.codePointAt(0)! > 0x2e80 ? 9.5 : 4.75
+    w += ch.codePointAt(0)! > 0x2e80 ? 10 : 5
   }
   return Math.min(w, EDGE_LABEL_MAX_W)
 }
diff --git a/src/renderer/features/reader/TabBar.tsx b/src/renderer/features/reader/TabBar.tsx
index ebfd93f020..e13cb52f69 100644
--- a/src/renderer/features/reader/TabBar.tsx
+++ b/src/renderer/features/reader/TabBar.tsx
@@ -135,7 +135,7 @@ export function TabBar(): JSX.Element | null {
                 title="有未保存修改"
                 aria-label="有未保存修改"
                 data-testid="tab-dirty-dot"
-                className="shrink-0 text-[10px] leading-none"
+                className="shrink-0 text-[length:var(--fs-micro)] leading-none"
                 style={{ color: 'var(--warning, orange)' }}
               >
                 ●
diff --git a/src/renderer/features/workspaces/workspace.css b/src/renderer/features/workspaces/workspace.css
index d16989e459..cb9d97d684 100644
--- a/src/renderer/features/workspaces/workspace.css
+++ b/src/renderer/features/workspaces/workspace.css
@@ -20,7 +20,7 @@
   background-size: 220% 100%;
   animation: syn-pan-x 6s ease-in-out infinite;
   color: var(--text);
-  font-size: 13px;
+  font-size: var(--fs-strong);
   cursor: pointer;
   box-shadow: var(--shadow-1);
   transition:
@@ -46,7 +46,7 @@
 }
 .ws-caret {
   color: var(--accent);
-  font-size: 10px;
+  font-size: var(--fs-micro);
 }
 
 /* 下拉面板：亮面卡+冷蓝描边+shadow-3 浮层；入场 160ms 居中放大一圈渐显
@@ -89,7 +89,7 @@
   border-radius: var(--radius-s);
   background: transparent;
   color: var(--text);
-  font-size: 12px;
+  font-size: var(--fs-body);
   text-align: left;
   cursor: pointer;
   transition:
@@ -120,7 +120,7 @@
   border-radius: var(--radius-s);
   background: var(--panel);
   color: var(--text);
-  font-size: 12px;
+  font-size: var(--fs-body);
 }
 .ws-field:focus {
   outline: none;
diff --git a/src/renderer/shared/theme-lineage.css b/src/renderer/shared/theme-lineage.css
index 6e1cc016f9..b2e21c4bf0 100644
--- a/src/renderer/shared/theme-lineage.css
+++ b/src/renderer/shared/theme-lineage.css
@@ -18,7 +18,7 @@
   bottom: 16px;
   display: flex;
   gap: 14px;
-  font-size: 10.5px;
+  font-size: var(--fs-caption);
   color: var(--text-dim);
   background: rgba(255, 255, 255, 0.88);
   border: 1px solid var(--border);
@@ -64,7 +64,7 @@
   backdrop-filter: blur(10px);
   border: 1px solid var(--border);
   box-shadow: var(--shadow-2);
-  font-size: 13px;
+  font-size: var(--fs-strong);
 }
 .lineage-toolbar > button {
   background: transparent;
@@ -73,7 +73,7 @@
   padding: 4px 10px;
   border-radius: 8px;
   cursor: pointer;
-  font-size: 13px;
+  font-size: var(--fs-strong);
 }
 .lineage-toolbar > button:hover {
   color: var(--text);
@@ -96,7 +96,7 @@
   backdrop-filter: blur(10px);
   border: 1px solid var(--border);
   color: var(--text-dim);
-  font-size: 12px;
+  font-size: var(--fs-body);
   cursor: pointer;
 }
 .lineage-fit-btn:hover {
@@ -111,9 +111,9 @@
 }
 
 /* F-L1-C 边标签（变体 C 窄幅注释——2026-08-30 用户裁决案册定稿）：
-   foreignObject 内 HTML div 自然换行；9.5px 斜体灰阶 #6b7280 弱于节点
+   foreignObject 内 HTML div 自然换行；10px 斜体灰阶 #6b7280 弱于节点
    文字（图注层级）+白晕 text-shadow 四向 2px 截线（线从字后穿行被白晕
-   截断）；max-height 3 行×9.5×1.3=37.05+overflow hidden（真实溢出内容
+   截断）；max-height 3 行×10×1.3=39+overflow hidden（真实溢出内容
    承载滚动语义——非 line-clamp 省略）。悬停滚动交互态驻本类（B1 教训
    禁内联）；FO 层 pointer-events none（内联静态属性），div auto 由本类
    承载。 */
@@ -122,13 +122,13 @@
   width: 100%;
   height: 100%;
   padding: 2px;
-  font-size: 9.5px;
+  font-size: var(--fs-micro);
   line-height: 1.3;
   font-style: italic;
   color: #6b7280;
   text-align: center;
   overflow-wrap: break-word;
-  max-height: 37.05px;
+  max-height: 39px;
   overflow: hidden;
   text-shadow: 2px 0 #ffffff, -2px 0 #ffffff, 0 2px #ffffff, 0 -2px #ffffff;
   pointer-events: auto;
diff --git a/src/renderer/shared/theme-reader.css b/src/renderer/shared/theme-reader.css
index 87fcf217bf..bb0ab102eb 100644
--- a/src/renderer/shared/theme-reader.css
+++ b/src/renderer/shared/theme-reader.css
@@ -25,7 +25,7 @@
 /* 阅读器侧板节标：h4 金左缘条（R2-SH2 决5：衬线消费清零；夜色只属脉络域——侧板保持亮面） */
 .rdr-aside-h4 {
   margin: 0;
-  font-size: 11.5px;
+  font-size: var(--fs-caption);
   font-weight: 600;
   letter-spacing: 0.5px;
   color: var(--text);
@@ -45,7 +45,7 @@
 }
 .syn-settings h2 {
   margin: 0 0 2px;
-  font-size: 13px;
+  font-size: var(--fs-strong);
   font-weight: 600;
   letter-spacing: 0.5px;
   color: var(--text);
diff --git a/src/renderer/shared/theme-shell.css b/src/renderer/shared/theme-shell.css
index ad0b3c608a..d0ae1ed566 100644
--- a/src/renderer/shared/theme-shell.css
+++ b/src/renderer/shared/theme-shell.css
@@ -31,7 +31,7 @@
   flex: none;
 }
 .app-header-name {
-  font-size: 15px;
+  font-size: var(--fs-title);
   font-weight: 600;
   letter-spacing: 0.5px;
   color: var(--text);
@@ -161,7 +161,7 @@
   background: transparent;
   border-radius: var(--radius-m);
   font-family: inherit;
-  font-size: 13.5px;
+  font-size: var(--fs-strong);
   color: #aeb6ca;
   text-align: left;
   cursor: pointer;
@@ -214,7 +214,7 @@
   gap: 8px;
 }
 .app-nav-ver {
-  font-size: 9.5px;
+  font-size: var(--fs-micro);
   letter-spacing: 1px;
   color: #8d95ad;
   border: 1px solid rgba(141, 149, 173, 0.4);
@@ -222,7 +222,7 @@
   padding: 1px 6px;
 }
 .app-nav-txt {
-  font-size: 9.5px;
+  font-size: var(--fs-micro);
   color: #6d7590;
 }
 
diff --git a/src/renderer/shared/theme.css b/src/renderer/shared/theme.css
index 4ab2da1c2c..2920cb71b7 100644
--- a/src/renderer/shared/theme.css
+++ b/src/renderer/shared/theme.css
@@ -1,5 +1,14 @@
 @import 'tailwindcss';
 
+/* P7D-01 批二：tailwind 字号类并入 --fs-* 单源（v4 @theme 重绑——text-xs×131
+   =--fs-body / text-sm×25=--fs-title,零逐处改写;arbitrary 值 text-[10px]
+   不受重绑,消费面按清单改 var 载体。用户裁决 2026-09-08——docs/design/
+   2026-09-08_p7d01-b2-fontscale-ruling.md） */
+@theme {
+  --text-xs: var(--fs-body);
+  --text-sm: var(--fs-title);
+}
+
 /* 主题变量 v2（R3-TH1 视觉系统基建）：组件统一从这里取色，禁止散落硬编码色值。
    token 终值单一来源 = docs/design/mockups/shell-library.html（亮面 :root）+
    lineage-constellation.html（夜面 :root，R2 消费预留）——逐值誊录，
@@ -45,6 +54,14 @@
   --z-anchor-pop: 20;  /* 页内锚定弹层（阅读器标注菜单/编辑器） */
   --z-pop-veil: 40;    /* 弹层透明捕捉层（菜单 backdrop） */
   --z-pop: 50;         /* 弹层主体（模态/toast/菜单面板） */
+  /* ── 字号六档语义刻度（P7D-01 批二：用户裁决 2026-09-08——docs/design/
+     2026-09-08_p7d01-b2-fontscale-ruling.md;消费面禁字面量,INV-61）── */
+  --fs-micro: 10px;    /* 极小（脉络边标签/侧栏版本号/tab 关闭钮） */
+  --fs-caption: 11px;  /* 注脚（卡片 meta/图例/侧板节标系） */
+  --fs-body: 12px;     /* 正文基准（text-xs 同锚） */
+  --fs-strong: 13px;   /* 强调（nav 主字/侧板标题系） */
+  --fs-title: 14px;    /* 标题（详情标题/顶栏应用名,text-sm 同锚） */
+  --fs-display: 17px;  /* 展示（卡片衬线年份） */
   --font-display: Georgia, 'Times New Roman', 'Songti SC', SimSun, serif;
   --ink: #1b2333;
   --ink-hi: #232d44;
diff --git a/tests/unit/renderer/edge-label-layout.test.ts b/tests/unit/renderer/edge-label-layout.test.ts
index ecd7feebba..dcbedb1881 100644
--- a/tests/unit/renderer/edge-label-layout.test.ts
+++ b/tests/unit/renderer/edge-label-layout.test.ts
@@ -17,9 +17,9 @@ import { fitViewport } from '../../../src/renderer/features/lineage/lineage-view
 import type { LayoutResult } from '../../../src/renderer/features/lineage/lineage-layout'
 import type { LineageNode } from '../../../src/shared/models/lineage'
 
-/** 放置器档距（票面：lh=12.35=37.05/3 行行高） */
-const LH = 12.35
-/** 碰撞盒间隙（票面：gap 4——盒宽=est+4/盒高=37.05+4） */
+/** 放置器档距（P7D-01 批二回炉：lh=13=39/3 行行高——字号 9.5→10 耦合族随迁） */
+const LH = 13
+/** 碰撞盒间隙（票面：gap 4——盒宽=est+4/盒高=39+4） */
 const GAP = 4
 
 /** 标签碰撞盒（中心+半宽高——与实现同口径，供相交断言） */
@@ -36,10 +36,10 @@ function disjoint(
 }
 
 describe('F-L1-C edge-label-layout —— 防重叠放置器', () => {
-  it('①估算宽度：CJK 9.5/字、其余 4.75/字、+左右 padding 4、钳 130、空串 0', () => {
+  it('①估算宽度：CJK 10/字、其余 5/字、+左右 padding 4、钳 130、空串 0（批二回炉估宽基准随迁）', () => {
     // 码点 >0x2E80 计全宽（CJK 统表/扩展/全角标点——主控口径，头注声明）
-    expect(estimateLabelWidth('中中')).toBe(23) // 4 + 2×9.5
-    expect(estimateLabelWidth('中a')).toBe(18.25) // 4 + 9.5 + 4.75
+    expect(estimateLabelWidth('中中')).toBe(24) // 4 + 2×10
+    expect(estimateLabelWidth('中a')).toBe(19) // 4 + 10 + 5
     // 60 拉丁=4+285=289 → 钳 130
     expect(estimateLabelWidth('a'.repeat(60))).toBe(EDGE_LABEL_MAX_W)
     // 空 label 不渲染（既有语义）——碰撞盒零宽
@@ -52,7 +52,7 @@ describe('F-L1-C edge-label-layout —— 防重叠放置器', () => {
       { id: 'e2', label: '二'.repeat(40), anchor: { x: 0, y: 0 } }
     ]
     const m = placeEdgeLabels(items, [])
-    // 两盒（w=130+4 钳制满宽）不相交：竖移 ≥(41.05+41.05)/2 → 首自由位 +4lh
+    // 两盒（w=130+4 钳制满宽）不相交：竖移 ≥(43+43)/2 → 首自由位 +4lh
     expect(disjoint(labelBox(m.get('e1')!, items[0]!.label), labelBox(m.get('e2')!, items[1]!.label))).toBe(true)
     for (const it of items) {
       // 偏移序封顶 ±10lh（回炉 1 R1：±5lh 实测不足——真库锚在节点中心需 |dy|≥~85）
@@ -65,7 +65,7 @@ describe('F-L1-C edge-label-layout —— 防重叠放置器', () => {
       { id: 'e1', label: '一'.repeat(40), anchor: { x: 0, y: 0 } },
       { id: 'e2', label: '二'.repeat(40), anchor: { x: 0, y: 0 } }
     ]
-    // nodeHeight 100 档节点盒（半高 50）：外扩 6 后 96×56——|dy|≥76.525 才分离
+    // nodeHeight 100 档节点盒（半高 50）：外扩 6 后 96×56——|dy|≥77.5 才分离
     const nodeBoxes = [{ x: 0, y: 0, hw: 90, hh: 50 }]
     const m = placeEdgeLabels(items, nodeBoxes)
     const box = { x: 0, y: 0, hw: 96, hh: 56 }
@@ -79,14 +79,18 @@ describe('F-L1-C edge-label-layout —— 防重叠放置器', () => {
   })
 
   it('③标签与节点盒相交：按确定性偏移序搜到自由位——结果与节点盒（外扩 6）不相交且离开锚点', () => {
+    // 批二回炉估宽随迁适配：基准 9.5→10 使 '说明文字' 估宽 42→44（hw 23→24），
+    // dx 第三档 |x|=80 对旧 hw 50 盒由撞（78<79）翻转为分离（80≥80）——dy=0
+    // 档即命中自由位、「y 偏移已发生」前提失效；节点盒 hw 50→52（外扩 58）
+    // 恢复 dy=0 全档相撞触发条件，断言面不放宽（not 0+disjoint 原样）。
     const items = [{ id: 'e1', label: '说明文字', anchor: { x: 0, y: 0 } }]
-    // 节点盒中心在锚上方 40（hw 50/hh 20）：anchor 档 y 相交（触发偏移搜索）
-    const nodeBoxes = [{ x: 0, y: -40, hw: 50, hh: 20 }]
+    // 节点盒中心在锚上方 40（hw 52/hh 20）：anchor 档 y 相交（触发偏移搜索）
+    const nodeBoxes = [{ x: 0, y: -40, hw: 52, hh: 20 }]
     const m = placeEdgeLabels(items, nodeBoxes)
     const slot = m.get('e1')!
     expect(slot.y).not.toBe(0) // 偏移已发生（非原位硬放）
     // 外扩 6 后的节点盒与结果碰撞盒分离（用户保证①核心断言）
-    expect(disjoint(labelBox(slot, items[0]!.label), { x: 0, y: -40, hw: 56, hh: 26 })).toBe(true)
+    expect(disjoint(labelBox(slot, items[0]!.label), { x: 0, y: -40, hw: 58, hh: 26 })).toBe(true)
   })
 
   it('③b单标签锚在 100 高节点盒中心：移出（dy=0 档 dx 第二档 ±166 分离或 dy 跨盒——回炉 1 R1）', () => {
@@ -112,7 +116,7 @@ describe('F-L1-C edge-label-layout —— 防重叠放置器', () => {
   it('⑤全候选位被占：回 anchor（best effort——节点盒铺满 ±10lh×dx 两档包络，回炉 1 重设计）', () => {
     const items = [{ id: 'e1', label: '长'.repeat(40), anchor: { x: 0, y: 0 } }]
     // 满宽标签（w=134/dx 档 ±83/±166）包络：x 域 ±(166+67)=±233、y 域
-    // ±(10lh+20.525)=±144 ——环绕大盒 hw 250/hh 155（外扩 256×161）全覆盖
+    // ±(10lh+21.5)=±151.5 ——环绕大盒 hw 250/hh 155（外扩 256×161）全覆盖
     const nodeBoxes = [{ x: 0, y: 0, hw: 250, hh: 155 }]
     expect(placeEdgeLabels(items, nodeBoxes).get('e1')).toEqual({ x: 0, y: 0 })
   })
diff --git a/tests/unit/renderer/library-cards.test.tsx b/tests/unit/renderer/library-cards.test.tsx
index 5750c45969..6e00b0bc87 100644
--- a/tests/unit/renderer/library-cards.test.tsx
+++ b/tests/unit/renderer/library-cards.test.tsx
@@ -293,12 +293,16 @@ describe('R3-LIB 回炉一（门一 3B+3W）', () => {
     expect(css).toMatch(/\.lib-chip-on\s*\{[^}]*border-color: var\(--accent\)/)
   })
 
-  it('R1+R2 材质微调：dropzone 透明底落纸面；题名 14px/600、venue 11px、meta 10.5px', () => {
+  // P7D-01 批二（token 化配套——实现者自裁申报）：字号断言载体字面量→
+  // var(--fs-*)（title 14/venue 11 值不变零视觉差；meta 10.5→11=caption 档
+  // 用户裁决变化面）——值面锚随迁 theme.test.ts TOKENS 六正锚+FS 负锚矩阵；
+  // 本断言强度不放宽（逐类逐属性 toMatch 同构）。
+  it('R1+R2 材质微调：dropzone 透明底落纸面；题名 fs-title/600、venue/meta fs-caption（批二 token 化,meta 10.5→11 裁决变化）', () => {
     expect(css).toMatch(/\.lib-dropzone\s*\{[^}]*background: transparent/)
-    expect(css).toMatch(/\.lib-card-title\s*\{[^}]*font-size: 14px/)
+    expect(css).toMatch(/\.lib-card-title\s*\{[^}]*font-size: var\(--fs-title\)/)
     expect(css).toMatch(/\.lib-card-title\s*\{[^}]*font-weight: 600/)
-    expect(css).toMatch(/\.lib-card-venue\s*\{[^}]*font-size: 11px/)
-    expect(css).toMatch(/\.lib-card-meta\s*\{[^}]*font-size: 10\.5px/)
+    expect(css).toMatch(/\.lib-card-venue\s*\{[^}]*font-size: var\(--fs-caption\)/)
+    expect(css).toMatch(/\.lib-card-meta\s*\{[^}]*font-size: var\(--fs-caption\)/)
   })
 
   it('W3 共享位：theme-buttons.css 含 .lib-rule 三段（line-l/line-r/gem 渐隐线语法）', () => {
diff --git a/tests/unit/renderer/lineage-canvas.test.tsx b/tests/unit/renderer/lineage-canvas.test.tsx
index ea8932f599..b68d40c192 100644
--- a/tests/unit/renderer/lineage-canvas.test.tsx
+++ b/tests/unit/renderer/lineage-canvas.test.tsx
@@ -450,7 +450,7 @@ describe('F-L1-C 边标签（变体 C 换行+防重叠放置+悬停滚动）', (
     return { nodes, edges: [e1, e2] }
   }
 
-  it('⑦标签渲染形态：foreignObject 内 HTML div（class lineage-edge-label）+FO 恒 130×37.05+title 全文 tooltip', () => {
+  it('⑦标签渲染形态：foreignObject 内 HTML div（class lineage-edge-label）+FO 恒 130×39+title 全文 tooltip', () => {
     const g = widePair()
     mount(<LineageCanvas nodes={g.nodes} edges={g.edges} />)
     const label = host?.querySelector('[data-edge-label]')
@@ -459,7 +459,7 @@ describe('F-L1-C 边标签（变体 C 换行+防重叠放置+悬停滚动）', (
     // FO 恒上限尺寸（主控预裁 1：短标签透明空区免 est 偏差裁字）
     const fo = label?.closest('foreignObject')
     expect(fo?.getAttribute('width')).toBe('130')
-    expect(fo?.getAttribute('height')).toBe('37.05')
+    expect(fo?.getAttribute('height')).toBe('39')
     expect(label?.getAttribute('title')).toBe('谱'.repeat(40))
   })
 
diff --git a/tests/unit/renderer/theme.test.ts b/tests/unit/renderer/theme.test.ts
index 616d3e9bb1..daaf899cd9 100644
--- a/tests/unit/renderer/theme.test.ts
+++ b/tests/unit/renderer/theme.test.ts
@@ -103,7 +103,15 @@ const TOKENS: Array<[string, string]> = [
   ['--z-float', '10'],
   ['--z-anchor-pop', '20'],
   ['--z-pop-veil', '40'],
-  ['--z-pop', '50']
+  ['--z-pop', '50'],
+  // ── P7D-01 批二：字号六档语义刻度（用户裁决 2026-09-08——docs/design/
+  //    2026-09-08_p7d01-b2-fontscale-ruling.md；负锚见批二 describe）──
+  ['--fs-micro', '10px'],
+  ['--fs-caption', '11px'],
+  ['--fs-body', '12px'],
+  ['--fs-strong', '13px'],
+  ['--fs-title', '14px'],
+  ['--fs-display', '17px']
 ]
 
 describe('R3-TH1 theme token 冒烟（mockup :root 防漂移锁）', () => {
@@ -377,3 +385,70 @@ describe('P7D-01 批一 token 收敛防线（三轴形态锁）', () => {
     )
   })
 })
+
+describe('P7D-01 批二 字号六档语义刻度防线（消费面负锚+@theme 重绑锁）', () => {
+  /**
+   * 批二迁移（用户裁决 2026-09-08——docs/design/2026-09-08_p7d01-b2-fontscale-
+   * ruling.md）：font-size 消费面 30 处硬编码→6 个 --fs-* token（13 处值变化=
+   * 裁决预期非缺陷+17 处仅换载体零视觉差）；tailwind text-xs×131/text-sm×25 经
+   * v4 @theme 重绑并入单源（arbitrary 值 text-[10px] 不受重绑——tsx 面单改
+   * var 载体）。
+   * 负锚口径注记（与批一 DURATION_COUNTS 的差异）：px 是通用长度单位
+   * （padding/radius/border 同值并存——实测 theme.css '12px' 现状 1 次为
+   * --radius-m 定义行，皮肤件非 font-size 声明同值多见），纯文本计数必误咬；
+   * 故负锚锚定「font-size: <字面量>;」声明形态（七 CSS 全 0），token 定义行
+   * 由 TOKENS 六正锚独立锁定——防护语义等价（定义正锚+消费负锚）。
+   */
+  const wsFsCss = readFileSync(
+    fileURLToPath(new URL('../../../src/renderer/features/workspaces/workspace.css', import.meta.url)),
+    'utf8'
+  )
+  const FS_CSS: Array<[string, string]> = [
+    ['theme.css', css],
+    ['theme-shell.css', shellCss],
+    ['theme-buttons.css', buttonsCss],
+    ['theme-reader.css', readerCss],
+    ['theme-lineage.css', lineageCss],
+    ['library.css', libCss],
+    ['workspace.css', wsFsCss]
+  ]
+  const FS_LITERALS = [
+    '9.5px', '10px', '10.5px', '11px', '11.5px', '12px',
+    '12.5px', '13px', '13.5px', '14px', '15px', '17px'
+  ]
+  const FS_COUNTS: Array<[string, string, string]> = FS_CSS.flatMap(([name, text]) =>
+    FS_LITERALS.map((lit) => [lit, name, text] as [string, string, string])
+  )
+  const FS_TSX = [
+    '../../../src/renderer/features/lineage/LineageNodeMeta.tsx',
+    '../../../src/renderer/features/lineage/LineageNodeCard.tsx',
+    '../../../src/renderer/features/lineage/LineageSideTags.tsx',
+    '../../../src/renderer/features/reader/TabBar.tsx'
+  ]
+    .map((rel) => readFileSync(fileURLToPath(new URL(rel, import.meta.url)), 'utf8'))
+    .join('\n')
+
+  it.each(FS_COUNTS)(
+    'font-size 声明字面量 %s 在 %s 消费后归零（字号单源=--fs-* token）',
+    (lit, name, text) => {
+      const decl = new RegExp(`font-size:\\s*${lit.replaceAll('.', '\\.')}\\s*;`, 'g')
+      expect((text.match(decl) ?? []).length, `${name} 禁 font-size: ${lit} 字面量回填`).toBe(0)
+    }
+  )
+
+  it('四 tsx 禁 fontSize 数值字面量（inline 字号消费仅 var(--fs-*) token）', () => {
+    expect(FS_TSX, '票面明文形态：单引号数字开头').not.toContain("fontSize: '1")
+    expect(FS_TSX, '数值 fontSize 全形态（含无引号数字——SideTags fontSize: 11 形态）')
+      .not.toMatch(/fontSize:\s*['"`]?\d/)
+  })
+
+  it('四 tsx 禁 text-[数字] arbitrary 字号 class（arbitrary 不受 @theme 重绑）', () => {
+    expect(FS_TSX, '票面明文形态：text-[10 前缀').not.toContain('text-[10')
+    expect(FS_TSX, '数字开头 arbitrary（# 开头色值不咬）').not.toMatch(/text-\[\d/)
+  })
+
+  it('@theme 重绑在场（tailwind text-xs/text-sm 并入 --fs-* 单源——漂移即红）', () => {
+    expect(css).toContain('--text-xs: var(--fs-body)')
+    expect(css).toContain('--text-sm: var(--fs-title)')
+  })
+})
