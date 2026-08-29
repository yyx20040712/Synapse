# R2-LG11 实现者报告——脉络重制浅色严谨板（F2 修正役·零 schema 单元）

> 三屋模式实现者交付（ADR-0017）。票面=`scripts/audits/r2-lg11-brief.md`；
> 裁决母本=`docs/prompts/2026-08-29_loop-handoff-v3.md` §2/§3。
> 模型自报：GLM-5.3 / 思考等级=高（开工首行已自报）。

## 1. 实现摘要

- **classify 双纯函数**（新 `lineage-classify.ts`）：`isSurvey`（综述|survey|review|概述|评述
  子串，大小写不敏感）+`isCore`（研究性论文且入度≥2，出度不计——决2 D1'）。
- **layout 扩展**：`nodeHeight(title)` 高度单源（46+18×clamp(ceil(len×12.5/(nodeWidth−24)),1,3)
  →1/2/3 行=64/82/100，NODE_H 删除）；综述右列（触及边分流不进树、列左缘=
  max(非右列右缘)+SURVEY_COL_GAP(80)、同层输入序错开≥半宽和+SIBLING_GAP、
  y=year 层带、双覆盖综述走覆盖值）；BAND_LEFT/BAND_RIGHT/LAYER_LABEL_DY 单源导出（B1 清账）。
- **NodeCard 整件重制**：白卡 rx=8+边框编码矩阵（核心 accent 1.5 实线/普通 branch 1
  实线/主题+综述 branch 1 虚线 6 4；选中 +0.75）+foreignObject 题名换行（line-clamp 3+
  SVG title 全文 tooltip）+年份行 12px text-dim UI 字体；data-kind 扩第四值 survey。
- **Edges 改版**：props=geom（Map id→{x,y,halfH}，Canvas 预构建——禁每边重扫）+surveyIds；
  三型色优先级=综述关联(var(--survey-edge) 1.4 虚 2 3)>推断(#8a94a6 1.2 虚 5 4)>
  普通(branch 1.2 实)；glow 全撤；label halo 白底 #4a5060。
- **Canvas/Legend/夜幕摘除**：.lineage-night→.lineage-host（var(--bg)）；LineageNightDecor
  删除；LineageLegend 新建（四项真实文本，data-legend+aria-hidden+pointer-events:none）；
  层带=border 实线+菱形 branch+年份标 13px text-dim（「YYYY 年」/「未知年份」逐字保留）；
  coreIds/geom/surveyIds 三 useMemo 预构建。
- **viewport**：BAND_LEFT 迁出+fitViewport 半高改 nodeHeight——chain 夹具题名全 1 行
  （6/4/4 字→ceil(75/156)=1 等）→nodeHeight=64=旧 NODE_H，auto-fit 3 it 手算数值
  **恒等**（既有 it 零改全绿即证）。
- **侧板三件+Board/Page**：白玻璃 rgba(255,255,255,0.92)+#e4ded1+blur12；h4 accent 左缘条；
  条目卡 #ffffff+淡描边；文本系亮面 token；QUESTION_COLOR 分色单源零改（锚断言原样绿）。
- **theme.css**：脉络样式块重写（.lineage-host/.lineage-legend 族/.lineage-toolbar/
  .lineage-fit-btn 白玻璃）+:root 增 --node-branch(#b8c4d4)/--survey-edge(#c8cdd6)；
  夜幕 token 11 枚定义保留（决5 同精神）；theme.test.ts 零碰全绿。
- **INV-38 登记**（docs/invariants.md，INV-37 行后）：卡高单源三消费+BAND 三常量单源+
  综述右列+classify 公式——同条补记（票面裁决 9 选项 A）。

## 2. 文件清单（含行数）

改（13）：
| 文件 | 行数 | 说明 |
| --- | --- | --- |
| src/renderer/features/lineage/LineageNodeCard.tsx | 103 | 整件重制（头注 `// b3: P7-H` 首行保留） |
| src/renderer/features/lineage/LineageEdges.tsx | 79 | geom+surveyIds+三型色 |
| src/renderer/features/lineage/LineageCanvas.tsx | 198 | host 化+预构建+层带浅色 |
| src/renderer/features/lineage/lineage-layout.ts | 382 | nodeHeight/综述右列/BAND 常量 |
| src/renderer/features/lineage/lineage-viewport.ts | 165 | BAND_LEFT 迁出+nodeHeight 引 |
| src/renderer/features/lineage/LineageSidePanel.tsx | 192 | 白玻璃+accent 缘条 |
| src/renderer/features/lineage/LineageSideAiNotes.tsx | 141 | 皮肤值浅色化 |
| src/renderer/features/lineage/LineageSideManualNote.tsx | 90 | 皮肤值浅色化 |
| src/renderer/features/lineage/LineageBoard.tsx | 230 | 重试按钮夜色残留清零+注释（行为零变） |
| src/renderer/features/lineage/LineagePage.tsx | 98 | 注释面（1 处 stale 注释） |
| src/renderer/shared/theme.css | 398 | 脉络块重写+2 token |
| tests/unit/renderer/lineage-canvas.test.tsx | 457 | R2-LG9 5 it 删（视觉 describe 拆出，见自裁 1） |
| tests/unit/renderer/lineage-layout.test.ts | 438 | 增两 describe 7 it+盲区补强断言（旧断言零碰） |
| tests/unit/renderer/lineage-side-panel.test.tsx | 499 | :311 夜化 it 改写浅色（QUESTION_COLOR 锚原样） |
| docs/invariants.md | — | INV-38 一行 |

增（4）：lineage-classify.ts(34)/LineageLegend.tsx(33)/
tests/unit/renderer/lineage-classify.test.ts(94)/
tests/unit/renderer/lineage-canvas-visual.test.tsx(228)。
删（1）：LineageNightDecor.tsx（整件）。
零碰：src/shared/models/lineage.ts、tests/unit/renderer/theme.test.ts、
tests/e2e/lineage.spec.ts（主控预裁「预期零改」兑现——未触发 BLOCKED）。

## 3. 红证索引

| 日志 | 变异内容 | 结果 |
| --- | --- | --- |
| scripts/audits/r2-lg11-firstraw.log | 旧代码上新断言（4 测试文件改写后） | exit=1，4 文件 13 it 红 |
| scripts/audits/r2-lg11-mutation-1.log | ①边框色值互换（NodeCard accent↔branch） | exit=1，1 it 红（白卡边框编码四态） |
| scripts/audits/r2-lg11-mutation-2.log | ②nodeHeight 档值+1（46→47） | exit=1，5 it 红（三档 3+canvas 卡高 1+auto-fit 首载数值 1——恰好证 fitViewport 消费耦合） |
| scripts/audits/r2-lg11-mutation-3.log | ③综述分流行删除（综述回树） | exit=1，1 it 红（综述不进树 it 含补强断言） |

还原安全：三处均 cp 备份法（cp→变异→测→cp 还原→diff 确认空，无 git checkout）。
变异③首跑曾假阴性（全绿）——根因=测试盲区，处置见自裁 8。

## 4. 测试证据

- `npm run test`：**105→最终 106 文件 / 875 用例全绿**（预测 875 精确命中）。
  构成：858 基线−5（canvas R2-LG9 旧 it）+7（canvas 视觉——拆分后驻
  lineage-canvas-visual.test.tsx）+7（layout 综述右列 4+nodeHeight 3）+8（classify）=875。
- `npm run verify`（真退出码落盘 scripts/audits/r2-lg11-verify.log，尾部）：
  **exit=0**——quality（TODO/FIXME/placeholder grep 无命中）+tickets（工单统计：共
  119——R2 前缀不入 check-tickets 口径，主控预告正常态）+locks（163 条对账绿）+
  lint+typecheck+test(875)+build（末环到达且成功）。
- auto-fit 3 it 与分档宽 it 零碰全绿——fitViewport 改引 nodeHeight 的恒等推算：
  chain 夹具题名「扩散模型起点」6 字/「主题分组」4 字/「最新进展」4 字全短档
  (180)，lines=ceil(len×12.5/156)：6 字=ceil(0.962)=1、4 字=ceil(0.321)=1——
  nodeHeight=46+18=64=旧 NODE_H，y 半高 32 恒等，transform 数值逐位不变。

## 5. locks 实录

| 步骤 | 结果 |
| --- | --- |
| locks:unlock（开工） | 解锁 161 文件 |
| 批内改写 4 受锁测试+实现 | （同工作段） |
| locks:generate | 162 条（收 lineage-classify.test.ts） |
| locks:apply | 锁定 162 |
| verify 首跑 lint 红（max-lines，见自裁 1）→ 拆分测试文件 | unlock（报 163——脚本按 manifest+已锁属性文件计数，visual.test 已被通配收录） |
| locks:generate（二次） | **163 条**（再收 lineage-canvas-visual.test.tsx） |
| locks:apply（二次） | 锁定 163，manifest 记录 163 条 |
| verify 复跑 | exit=0（locks:check 对账绿） |

**manifest 终值 163**（票面预测 162——+1 来自自裁 1 的测试文件拆分，申报）。
锁操作与文件改动均同工作段完成，无跨段解锁态残留。

## 6. 自裁申报（超票面决定+删减面自查）

1. **测试文件拆分（最大超票面项）**：canvas.test.tsx 改后 ESLint 报 529 有效行超
   max-lines 500（error）——豁免 glob `tests/**/*.ts` **不含 .tsx**（基线 523 物理行
   靠 skipBlank/skipComments 勉强过线，我的改写突破）。处置=R2-LG11 视觉 describe
   拆出为**新受锁文件** `lineage-canvas-visual.test.tsx`（7 it 原样迁移+helper 复制），
   canvas.test.tsx 回 457 行。影响：票面 §6 受锁清单「lineage-canvas.test.tsx 整块改写」
   落点=拆出成件；locks 161→**163**（预测 162）；测试文件 104→106。用例数不变（875）。
2. **断言序列化对齐**：border/背景 hex 经 React+jsdom CSSOM 归一 rgb()（#e4ded1→
   rgb(228,222,209)、#ffffff→rgb(255,255,255)，rgba() 形式不动）——side-panel 浅色 it
   断言改 rgb() 等价形式，视觉值零变。
3. **-webkit-box-orient 断言盲区**：jsdom cssstyle 静默丢弃该属性（node 实证：setProperty
   后 attr/属性读取均无；真实 Chromium 保留）——运行时断言=display:-webkit-box+
   -webkit-line-clamp:3+overflow:hidden 三件+**源码形态锁**（readFileSync 断
   WebkitBoxOrient，theme.test B1 先例；jsdom 环境 import.meta.url 非 file: scheme，
   以 process.cwd() 拼路径——npm run test 的 cwd 恒为 repo 根）。
4. **综述右列 y 覆盖边缘语义**：票面字面「y=其 year 层带 y」——单覆盖（x null/y 非
   null）综述进右列时 y 覆盖被忽略（强制层带 y）。按票面字面实现；拖拽写路径 x/y
   同写=双覆盖走覆盖分支（e2e T2 链不受影响）；该边缘在测试断言中未单锁（票面
   测试面亦未列），申报留档。
5. **侧板 h3/p 衬线摘除**：票面 §1.1.1 未点名 h3/p 的 var(--font-display)——但
   --gold-bright/--text-on-night 文字在白底上功能性不可见必须换 token，fontFamily+
   letterSpacing 随决5「脉络域衬线清零」连带摘除（token 定义留 theme.css）。
6. **Board 重试按钮浅色化**：票面只点名 pending-link 提示条排查（实测该条已是浅色
   token **零改**）——工具条浅色化后重试按钮 gold-soft/gold-bright 夜色残留不可见，
   改 var(--accent-soft)/var(--accent)（与 Page/SidePanel 重试按钮同族），「脉络域
   夜色消费清零」范围内。
7. **菱形刻度 fillOpacity 0.5 保留**：票面只给 fill=node-branch 未提 opacity——最小
   改动保留原值。
8. **变异③假阴性→测试盲区补强**：删综述分流行首跑**全绿**（综述 x 终被右列覆盖+
   单链夹具父居中不变，四个综述 it 均不可观测）——补断言「综述兄弟不进父树占位」
   （P 单子 C1 时 P.x===C1.x）后变异必红。过程活证据：夹具题名「唯一非综述子」因
   含「综述」子串被 isSurvey 误判（子串启发不辨否定语境——v1 已知局限的实证，
   题名改「正常子节点」）。该断言属本单受锁改写范围内的加固。
9. **Canvas 198 行 vs 票面预估 ≤190**（+8）：geom/surveyIds/coreIds 三 useMemo 预构建
   为 O(n) 红线必要面；组件硬红线 250 未破（票面预估系预估非红线）。
10. **非本人改动声明**：git 工作区中 tickets/registry.ts 的 M（R2-LG11 工单条目
    open 态+SR2-F-09 行尾逗号）系**主控派单预置**，实现者全程未触 tickets/（禁令
    遵守）；scripts/audits/f1-out/*.png 为 F1 战役历史未跟踪遗留，非本单产物。
11. **删减面 diff 自查**（git diff --stat 全列于工作区，18 文件 +446/−391）：
    除上述申报项外无范围蔓延——src/renderer/features/lineage 12 件+theme.css+
    3 受锁测试+1 新受锁测试+1 新 classify 测试+invariants.md+locks/manifest.json
    （+registry.md 主控预置项）。实现文件新增受锁面（classify/visual/Legend）已
    locks:generate 收录；src/shared/models/lineage.ts 零触碰。

## 开工记录（AGENTS 会话开工纪律——技能清点）

技能清点（开工时已在回复首段留存）：test-driven-development 用（TDD 红绿+变异红证）/
verification-before-completion 用（verify 真退出码落盘）/javascript-testing-patterns 用
（受锁测试改写）/frontend-ui-engineering 用（SVG/CSS 重制）/systematic-debugging 备用
（实际启用于假阴性根因排查）/git 系+数据库系+云系不用（禁 git 操作/无 DB/云面）。
配置自查：模型=GLM-5.3，思考等级=高（首行自报）。
