# R3-LIB 门一联审档（对抗深审）——文献库视觉重制（卡片网格+筛选+详情栏）

> 审计人：门一独立子代理（GLM-5.3，三屋模式 R3-LIB）。日期 2026-08-29。
> 铁律遵守：全程只读仓库（唯一可写=本档）；未跑 npm/测试；未做任何 git 写
> （git status/diff --stat 为只读对账）。
>
> **开工技能清点**（宪法会话开工纪律）：`code-review-excellence` **用**（本任务=
> 对抗性审查核心）/ `frontend-design`+`frontend-ui-engineering` **用**（真机三
> 问题归因涉视觉层级与材质色阶判断——本席与实现者不同：实现者避加载防审美
> 冲突，门审恰需独立审美输入对抗「逐值誊录但整体不成立」的风险，主控 6.5/10
> 真机结论即此症）/ `verification-before-completion` **用（证据口径）**——禁跑
> 测试，逐证据日志亲读非转述（verify :2559/:2599、e2e :72-73、first-red
> :178/:1735、mutation 全 28 行逐行）/ `test-driven-development` **不用（仅采
> 其证据标准评估 TDD 四档形态）** / `systematic-debugging` **不用**（无运行时
> 复现面，归因=diff/终态源码静态定位）/ 其余运维·文档·网格类技能**不用**
> （纯只读审查无对应面）。配置自查：门审子代理身份，模型/思考等级按主控派发
> 配置运行。
>
> 输入件全读：gate1.diff（841 行全文）、brief v1（49 行）、visual-system 定稿
> §1/§2/§4、mockup shell-library.html v2（212 行全文）、impl.report（149 行）、
> first-red.log（1740 行三段结构）、mutation.log（28 行全）、verify.log（链路
> 头尾+受关注例）、e2e.log（73 行全）、终态源码 9 文件、theme.css（340 行全）、
> Button.tsx、TagFilter.tsx、locks/manifest.json（153 条）、git status、
> sha256sum 实算、file 编码实测。

## 统计行

**B=3 / W=3 / N=8 —— 裁决：FAIL（回炉一轮：真机三问题 3B+本席加判 3W，
全部 CSS/微 TSX 同域面，一轮可收口；证据链全真、诚信无缺陷）**

---

## A. 真机三问题归因（最高优先）+ 最小修法

主控真机多模态评审 6.5/10 三问题，逐条在 diff/终态源码定位成因如下。

### B1（问题①）导入拖放区与纸白背景色阶断裂——材质过渡生硬

**成因定位（library.css:169-174 + LibraryPage.tsx:70）**：
`.lib-dropzone { background: var(--panel) }` = **#ffffff 纯平白**，直接坐在
`--bg #f6f4ee` 暖纸白+丝纹纹理（theme.css:67-69）上。页面其余表面全部有材质
层次：卡片=168° 暖白渐变（#fffdf9→#fff→#fdfaf3）+inset 顶高光+shadow-1，
chips=panel-glass 半透明，详情栏=#fff 但有 border-left 分界。唯独 dropzone=
**大面积（全宽×p-6≈110px 高）纯平白+零阴影**——冷暖阶差+零层次双杀，视觉上
比卡片更「亮」，抢了内容区焦点，材质断裂感即此。旧版同为 panel 平底但周围是
同质 panel 行卡故无此症；R3-U2 换暖纸底+渐变卡后落差显形——**实现逐值忠实
（票面只写了「虚线金框+拖入金辉」，未规定底色），是票面欠规格+实现未做材质
归一，非誊录错误**。mockup 无 dropzone 元素（仅有 topbar CTA 按钮），无对照源。

**最小修法（R1）**：`.lib-dropzone` 的 `background: var(--panel)` →
`transparent`（虚线金框直落纸面=拖放靶区惯用语，材质归一；拖入金辉态
`.lib-dropzone-dragging` 不动）。备选：`var(--panel-glass)`+`var(--shadow-1)`
（半透明白升一档，与 chips 同材质）——若主控嫌全透「凹陷感」过强用此。
**推荐 transparent。** 建议同步补 CSS 文本锁 it（`.lib-dropzone` 段
`background: transparent`），防回退。

### B2（问题②）卡片信息层级扁平 + 空年份「—」占位丑

**成因定位一（字号体系，library.css:79-129）**：year 17px 衬线金 / title
13.5px w500 / venue 11.5px / meta 11px——**逐值=mockup 原值**（誊录无错），
但题名↔次级阶差仅 2px/0.5px，且 venue 与 meta 同为 `--text-dim` 同灰——真机
100% 缩放下次级三行（期刊/作者/标注笔记）融成一片灰，题名孤立无援。mockup
截图成立靠的是英文长题名占满两行+被引 accent 色打破灰带；真机中文短题名+
meta 无 accent 跨度（PaperSummary 无 citedByCount 字段，paper.ts:19-25 实核，
卡面被引不可得，见 N2）——**同值不同料，mockup 参数直译在真数据上失效**。

**成因定位二（空年份渲染路径，PaperRow.tsx:55）**：
`{paper.year === null ? '—' : paper.year}`——单 em dash（U+2014，主控描述
「——」为视觉连写）以 **17px 金色衬线**渲染在年份槽，等于给「未知」打了
全卡最大最亮的字——占位符比信息还抢眼。mockup 无空年份用例（五卡全年份），
票面 P1 未规定空年策略，实现者自裁申报于报告自裁④——自裁诚实但选错占位语言。

**最小修法（R2+R3）**：
- **R2a** `.lib-card-title`：font-size 13.5→**14px**、font-weight 500→**600**，
  min-height 38→**40px**（两行等高保持：1.45×14≈20.3×2）。
- **R2b** `.lib-card-venue`：11.5→**11px**。
- **R2c** `.lib-card-meta`：11→**10.5px**。
  → 题名↔次级阶差 2px→**3.5px**+字重阶差，三处纯 CSS 值（文本锁不锁字号，
  e2e/零红实证：测试断言仅类名与 340px/渐变/24px 等既有锁项）。
- **R3** PaperRow 空年份改渲染 `<span className="lib-card-year-empty"
  aria-hidden="true">◆</span>`（CSS：9px、color var(--border-gold)、垂直对齐
  baseline 微调），年份槽 min-width:44px 保持列对齐——**◆=定稿「菱形语法
  系统（◆ 品牌标/年份刻度/分隔线）贯穿语言」的正字法**，空值退装饰不抢戏。
  最保守备选=空串。补 unit it：makeSummary({year:null}) 卡渲染 ◆ 且非 '—'
  （首红可红——当前实现渲染 '—' 恰红）。

### B3（问题③）右侧详情栏空态=死白条（无设计态）

**成因定位（PaperDetailPanel.tsx:126-132 + library.css:180-183）**：
`paperId === null` 分支返回裸 `<div className="p-6 text-xs"
style={{color:'var(--text-dim)'}}>选中列表中的文献后显示详情</div>`——顶对齐
小灰字，余下 w-80(320px)×全高 `--panel` #ffffff 纯白柱+border-left——库初始
态（未选中任何卡）右侧即**一整条死白**。mockup 无空态设计（恒有选中文献），
票面 P3 未列空态——**票面欠规格项**，实现未超出票面但也没补设计缺口。

**最小修法（R4）**：空态分支改
```tsx
if (paperId === null) {
  return (
    <div className="lib-detail-empty">
      <DiamondRule />
      <p>选中列表中的文献后显示详情</p>
    </div>
  )
}
```
CSS：`.lib-detail-empty { height:100%; min-height:200px; display:flex;
flex-direction:column; align-items:center; justify-content:center; gap:12px;
color:var(--text-dim); font-size:12px; letter-spacing:1px; }`——复用既有
DiamondRule（零新组件），死白条变「菱形静候态」。文案**逐字保留**（N7 实核：
全 tests/ 零引用，重设计安全但保留文案为零风险）。「正在加载详情…」分支
（:153-157）同裸形态，顺手同 class 同治（可选，一并最省）。
补 unit it：render PaperDetailPanel({paperId:null}) → `.lib-detail-empty`
在场+文案在场（首红可红——当前实现无该类恰红）。

### 选中卡平色底自裁——独立裁定（主控授权项）

**裁定：改金 hairline 方案（渐变保留），accent-soft 平色底否决。**
现行 `.lib-card-selected { background: var(--accent-soft) }`（library.css:
39-44）= 340px 宽大平面**冷蓝平色**（#dcebf5），砸在暖纸材质海里——与 B1
同病族（材质断裂），且选中瞬间卡面渐变/inset 高光全灭（「渐变让位」自裁的
代价是选中卡成了页面上唯一无材质的表面，真机观感=贴了张蓝标签）。mockup 无
选中态，但系内已有大表面 active 先例：**nav active=近基面(ink-hi)+inset 金
hairline rgba(201,168,106,.28)**（theme.css:140-144）——「表面不动、金线定
调」才是本系统大表面的强调语法；accent-soft 语法属于小 chip（mockup .chip.on
/TagFilter 均小表面，已合规）。
**最小修法（R5）**：
```css
.lib-card-selected {
  border-color: var(--gold);
  background: linear-gradient(168deg, #fffdf9 0%, var(--panel) 40%, #fdfaf3 100%);
  background-clip: padding-box;
  box-shadow: inset 0 0 0 1px rgba(201, 168, 106, 0.45), var(--shadow-2);
}
.lib-card-selected .lib-corner { opacity: 0.9; border-color: var(--gold); }
```
选中唯一性=金描边+inset 金 ring+角饰常显+shadow-2 四重成立，与 hover
（border-gold #c9a86a 浅金+角饰 hover 显+shadow-2）拉开两档。测试面零红
（断言仅类名挂载，library-cards.test:「选中卡挂 lib-card-selected」it 不涉
色值）；建议补文本锁 it 锁 `var(--gold)` 描边防回退。

---

## B. mockup v2 符合度逐值对照（shell-library.html）

### 卡片三件套+排版（mockup .card 系 vs .lib-card 系）——逐值

| 项 | mockup v2 | 实现（library.css） | 判 |
| --- | --- | --- | --- |
| 渐变 | `linear-gradient(168deg,#fffdf9 0%,var(--panel) 40%,#fdfaf3 100%)` | 同串逐字 | 一致 |
| inset 顶高光 | `inset 0 1px 0 rgba(255,255,255,.9)` | 同 | 一致 |
| shadow | `var(--shadow-1)` 叠加 | 同 | 一致 |
| border/radius/padding | 1px var(--border)/radius-l/14px 16px | 同 | 一致 |
| transition | `box-shadow .22s,border-color .22s,transform .22s` | 同 | 一致 |
| background-clip | 无 | +`padding-box` | **定稿注意事项②加锁，授权偏离** |
| hover | shadow-2+border-gold+translateY(-1px) | 同 | 一致 |
| 角饰 | 伪元素 14px/op0→hover .9 金/tl/br 逐边 | 实 span 同值+`pointer-events:none` | 自裁③授权，视觉等价 |
| row1/year/title | flex baseline gap10/17px 衬线金 min44/13.5px lh1.45 w500 clamp2 min38 | 逐值同 | 一致 |
| venue | `:empty{display:none}`+6px/11.5px/dim/italic | 条件渲染+同值 | DOM 等价（自裁授权） |
| tags/tag | gap6 mt9 wrap/10.5px accent+accent-soft **999px** | 同值但 radius **6px** | **票面 P1+定稿 §1「tag 建议收 6px」授权** |
| meta | gap10 mt9 11px dim tabular-nums | 同值 | 一致（内容差异见 N2） |
| 网格 | `repeat(auto-fill,minmax(340px,1fr))` gap12 start | 同 | 一致 |

### 菱形分隔三段（mockup 行 160-164 vs .lib-rule 系）——逐值一致

line-l `linear-gradient(90deg,transparent,var(--border-gold))` 1px / gem 6px
var(--gold) rotate(45deg) / line-r 镜像 / 容器 flex align-center gap10——全同；
**+min-width:24px+flex:1（注意事项③加锁，授权增强）**。挂载位=筛选区后列表前
（LibraryPage:101），测试 DOM 序断言在案。

### chips（mockup .chip/.search/.chip.on vs .lib-chip）

999px/12px/4px 12px/1px var(--border) 一致；**材质取 .search**（panel-glass+
shadow-1）而非 .chip（panel 无影），字色 text 而非 text-dim——融合偏离见 N1
（可辩护：mockup chip 是静态标签，实现的是交互控件，控件材质向搜索框看齐）。
**.chip.on（active=accent-soft 底+accent 描边）未在搜索/select 落地——票面
P2 字面未全兑现，TagFilter 自带合规（accent-soft+accent 实核 TagFilter.tsx:
66-68）→ W2。**

### 详情栏衬线（mockup aside 系 vs .lib-detail-* 系）

h2 15px 衬线 w500 lh1.5 一致 / .k 11px dim ls1px 一致 / .v.serif 15px 衬线金
一致 / .abs mt14+border-top+pt12 一致（行高 leading-5≈1.67 vs 1.7 见 N3）/
aside border-left+panel 一致（宽 w-80=320 vs 300 见 N3）。按钮走共享 Button
（票面 P3 明文），CTA 6px 切角+inset 金 hairline .45→.7 实核 theme.css
:183-192=定稿注意事项①终值（mockup 8px 被定稿覆盖）。

### 注意事项①②③落实核对（定稿 §4）

- **① CTA 与搜索框距 ≥16px**：**结构满足**——导入 CTA 在 dropzone 内，FilterBar
  搜索 chip 在下一区段，垂直距=dropzone p-6 下边距 24px+页 gap-2 8px=32px≥16。
  切角 6px（非 8px）✓（Button 终值）。
- **② background-clip:padding-box**：✓ `.lib-card`/`.lib-card-selected` 双卡态
  都带（选中态渐变回归后 R5 已保此键），文本锁 it 在案。
- **③ 菱形线段 min-width 24px+flex:1**：✓ 逐值，文本锁 it 在案。

---

## C. e2e 兼容 + 既有 unit 零红核对（25 passed 证据）

- **e2e 全量亲跑：25 passed (1.2m)、E2E_EXIT=0**——r3-lib-e2e.log:72-73 亲读。
- 文献行 getByText 断言面逐一实核（文本保留=绿的根本）：题名 span 在卡根
  button 内逐字保留——ai-notes:51/178、reader-scroll:128/270/303、
  reader-text:122 五处 dblclick；lineage:438 dblclick+:203/227/238/488 可见性；
  workspaces:36/64 可见性+:51「正在加载文献列表…」（loading 分支零改）
  +:53 count(0)。line-clamp 截断不破 getByText（jsdom/Playwright 按 DOM 文本
  命中，卡题名两行内完整）。
- 文案零改实核终态：FilterBar aria-label×4+全部分类/全部年份/最近添加/年份
  新→旧/标题 A→Z（FilterBar.tsx:65-107）；导入 PDF 文件/导入文件夹
  （ImportDropZone:128/135）；去阅读器写笔记/编辑元数据/导出三件+打开 DOI 页
  （PaperDetailPanel:196-216）；「（无标题）」「佚名」et al. 回退（PaperRow:36/
  formatAuthors 逐字）。
- 既有 unit 零红（verify.log 亲读）：paper-detail-cited 3/3（:2170，被引 124/
  —/0——Row 两 span 结构保持）；paper-detail-notes-off 3/3（:2125）；
  paper-detail-export 3/3（:2010）；library-cards 新 10/10（:1451）；
  library.store/theme.test 在 103 文件全绿内。renderer 侧引用 PaperRow 的测试
  仅 library-cards 一个（grep 实核，其余命中=main 侧 DB PaperRow 类型同名异物）。
- 用例数理：**850 = 基线 840 + 新 10**（verify.log:2559）自洽。

---

## D. 宪法红线核对

| # | 审项 | 结论 | 证据 |
| --- | --- | --- | --- |
| D1 | DiamondRule 死码 | **过** | 被 LibraryPage:25/101 消费（当前唯一消费方=R3-U4 预铺，票面架构层+主控预裁授权）；三新文件全被引用（library.css←LibraryPage:33、test←vitest 套件） |
| D2 | 文件行数 | **过** | wc -l 实测：PaperRow 78/PaperList 112/FilterBar 115/ImportDropZone 145/PaperDetailPanel 244/LibraryPage 117（组件全 ≤250）/library.css 204（≤500）/DiamondRule 23——**与报告 §2 表 10/10 全对** |
| D3 | 受锁 | **过** | manifest 153 条（152→153，+library-cards.test.tsx 于 :341）；**sha256sum 实算 `6ce38c19…fa92` 与 manifest 逐字节一致**；generatedAt 23:08:59Z 晚于实现终态（时序成立）；tests/**+manifest 两受锁面→提交 [locked-change] 尾注义务已申报（报告 §6） |
| D4 | UTF-8 | **过** | file 实测三新文件均 UTF-8；逐文件中文亲读可读；verify 链 mojibake 关卡绿 |
| D5 | TDD 四档 | **过（附 N4）** | ①首红：first-red.log 三段诚实序列——模块缺失红（:16 import 解析失败）→环境修复段（:57 jsdom http: 协议 fileURLToPath 抛错，改 cwd 路径=测试面修复非断言放宽）→**断言级红 10/10**（:178、:1735-1736，失败原因全为特征缺失）；②绿：verify 10/10（:1451）；③变异：3 枚断言级恰中（M1 删渐变→材质文本锁红/M2 删挂载→页面存在性红/M3-redo 删角饰→角饰 it 红），还原 diff 空×3+终态 10/10 绿——**票面要求 ≥2 实做 3，主控点名两枚均在**；④全量 verify 850+build EXIT=0（:2599）。M3 首试 no-op 见 N4 |
| D6 | TODO/FIXME/placeholder | **过** | 八变更文件 grep 0 命中 |
| D7 | 安全禁令 | **过** | diff 全文无 eval/newFunction/出网/SQL/Node 注入——纯 CSS/TSX 皮肤面；分层单向无违（shared/ui←features 合法） |
| D8 | 方案切换=删旧 | **过** | 行式 ROW_STYLE/ROW_SELECTED_STYLE/TAG_BADGE_STYLE/BTN_PRIMARY/BTN_SECONDARY/disabledStyle 全删（-105 行净减），无并存双方案 |

---

## E. 报告诚实性（自裁逐条 + 未申报面扫描）

**自裁清单逐条核验（报告 §8）——注意：实为 7 项编号，主控工单称「八项」，
计数出入见 N5，内容无缺**：

1. 皮肤拆 library.css：✓ theme.css 零改（git status/diff 实证不在变更集，
   wc 340）；挂载唯一（LibraryPage:33）；主控预裁已认。挂 N6（头注「禁散落
   硬编码色值」vs 渐变端点三字面）。
2. DiamondRule 组件化：✓ 23 行+被消费；**但头注宣称「样式全在 theme.css
   .lib-rule*」失实——样式实际住 features/library/library.css:145-167**→W3
   （接缝声明失实+R3-U4 复用断裂：settings 页消费 DiamondRule 时不会加载
   library.css，裸奔无样式）。
3. 角饰实 span：✓ aria-hidden+pointer-events:none+测试物理基础成立。
4. meta 行重排：✓ formatAuthors 逐字保留；被引缺席有据（PaperSummary 无
   citedByCount，paper.ts 实核，见 N2）；空年「—」=B2 修法对象。
5. FilterBar 容器去边框盒：✓ mockup .filterbar 裸行对照成立；TagFilter
   零改属实（git status 不在变更集）。
6. 测试环境两补丁：✓ scrollIntoView polyfill+ACT_ENV 声明均在测试文件内，
   selection-layer 同口径属实——宿主 API 缺位修复，非断言放宽。
7. 选中卡平色自裁：✓ 如实申报且主动邀裁——本席裁金 hairline（R5）。

**未申报面扫描：git status 全对账**——7 改（六组件+manifest）+3 新
（css/DiamondRule/test）与报告 §2 完全一致；`git diff --stat` 7 files/58+/105-
与报告逐字一致；其余未跟踪件（r3-lib-* 审计物料、r3-rdr-set-brief.md=主控
他票简报）非实现面。**无未申报实现改动。**
报告数字复核全对：行数表 10/10、850=840+10、25 passed、152→153、
VERIFY_EXIT=0（:2599 亲读）。verify.log ErrorBoundary 栈噪音=app-error 契约
测试既有，报告 §7 预申报属实（诚实加分项）。

---

## F. 成本账本行

| 单元 | token（≈M） | 时长（min） | 来源 |
| --- | --- | --- | --- |
| 实现者（初轮） | ≈7.92 | ≈17.4 | 主控台账（impl.report 佐证） |
| 门一联审（本席） | ≈2.1（自报估算） | ≈28（自报估算） | 本席会话：八类输入件全读+终态源码 10 文件+mockup 逐值对照+sha256/编码/行数实算+四证据日志亲读+三问题归因 |

---

## N 级清单（不阻塞，回炉顺手可治者标注）

- **N1** chips 材质融合偏离（panel-glass+shadow-1+字色 text vs mockup .chip
  panel+无影+text-dim）——mockup chip 为静态标签、实现为交互控件，向 .search
  材质看齐可辩护；不裁回。
- **N2** 卡 meta 无「被引 N」：PaperSummary 无 citedByCount（paper.ts:19-25；
  :46 属 detail schema）——props 零改契约下不可得，作者保留=行为连续，合理。
- **N3** 既有量级偏离：aside w-80=320 vs mockup 300（旧布局沿用）；abs 行高
  tailwind leading-5≈1.67 vs 1.7——量级噪声不裁。
- **N4** mutation M3 首试未生效（mutation.log:13-15 无「mutation applied」行、
  EXIT=0）→ redo 生效红证（:20-25）——**日志诚实保留首败（佳）**，但报告 §4
  表只呈现成功红、未申报首试 no-op（微瑕，无实质影响）。
- **N5** 自裁计数出入：报告 §8 实为 7 项编号，主控工单称「八项」——内容无缺，
  计数口径之差。
- **N6** library.css 头注宣称「token 全走 :root 单源（禁散落硬编码色值）」，
  但卡片渐变端点 #fffdf9/#fdfaf3+白高光 rgba(255,255,255,.9) 三字面散落于
  .lib-card（mockup 逐字誊录、:root 无对应键）——声明过伸；回炉 R5 选中卡
  复用同渐变时建议：或头注改口「材质渐变端点=mockup 卡面专属字面」，或提
  :root token（--card-hi/--card-lo，theme.css 非受锁文件、加键不破
  theme.test 值锁）。
- **N7** 空态文案「选中列表中的文献后显示详情」全 tests/ 零引用（grep 实核）
  ——R4 重设计安全面；文案仍逐字保留（零风险）。
- **N8** mockup `.tag.gold` 变体（集合标签金色）未实现——tagNames 无集合/
  主题语义之分，单 accent 变体合理简化，不裁。

---

## 门二交接四清单（回炉后门二终审核对面）

1. **B/W 处置兑现**：R1-R7 七修法落点核对（library.css/PaperRow/
   PaperDetailPanel/FilterBar/DiamondRule 五文件+测试扩展）；新 it 首红→绿→
   ≥1 变异红证（建议变异：删 .lib-detail-empty→空态 it 红）；R5 选中卡
   `var(--gold)` 文本锁防回退；W3 走「迁 .lib-rule\* 进 theme.css」则核行数
   ≤500+library.css 残段清理。
2. **票面符合复推**：P1-P5 全项+注意事项①②③+本档 B 节对照表再扫（重点：
   chips active 态=P2 字面兑现、空年 ◆、dropzone 材质）。
3. **宪法红线**：行数/受锁（153 基础上 library-cards.test.tsx sha 变更→
   [locked-change]+locks:apply 即时）/UTF-8/TODO 零。
4. **机器面+真机复验**：verify 真退出码落盘+用例数 850+新增 N 数理一致+e2e
   25 亲跑；**真机多模态复评 ≥8/10 门槛**（6.5/10 回炉验收线）+三问题逐项
   对照消失。

---

## 总裁决

**FAIL → 回炉一轮（范围：R1-R7，全部 CSS/微 TSX 同域，预计一轮收口）。**

理由：证据链四档全真（首红 10/10/变异 3 恰中/还原 diff 空/verify+e2e 双
EXIT=0）、报告诚实性高（数字全对、疑虑主动申报、未申报面扫描零命中）、
mockup 逐值符合度优——**工程面无缺陷**；但视觉交付未过真机门槛（主控
6.5/10 三问题全部归因成立：两处票面欠规格+一处系统语法未贯彻），叠加本席
三 W（选中卡冷蓝平色与暖纸材质相冲、P2 chips active 字面未兑现、DiamondRule
接缝声明失实埋雷 R3-U4）。**放行与否：本轮回炉后经门二+真机复评 ≥8/10 再议
放行；不满足不放行。**

回炉纪律：实现者禁 git/registry；新 its always-active；cp 备份法变异；verify
全量真退出码落盘；受锁面（library-cards.test.tsx）改动即时 locks:apply+
[locked-change] 尾注；完成后门二终审四清单。
