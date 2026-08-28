# SR2-LG-07 门二终审档（脉络布局非单调年份树修复+边 label 渲染——缺陷 E1）

> 审计人：门二终审孙代理（2026-08-28）。输入：票面 v1（sr2-lg-07-brief.md）/
> 实现者报告（sr2-lg-07-impl.report.md）/门一审档（sr2-lg-07-gate1.audit.md）/
> diff 包（sr2-lg-07-gate1.diff，571 行 9 文件）/仓库源文件抽读（只读）。
> 铁律遵守：只读（本档为唯一产出）；未跑 npm/test/构建（静态核验+独立手推替代）；
> 未触 git 写、未触 tickets/。
>
> 开工技能清点：code-review-excellence=用（终审对抗审查直接命中）；
> verification-before-completion=用（放行条件逐项核）；systematic-debugging/
> TDD/e2e 等=不用（纯只读审计，禁跑测试，无实施面）。

## 0. 结论速览

**总评：PASS——准予收口。** 四清单全过、无新破坏、门一 4W 处置与终态实物
零偏差。收口放行条件 5 项（§6）。

## 1. 清单① 处置核对（门一 4W 主控裁决预登记 vs 终态实物）

| 门一项 | 预登记处置 | 终态实物核 | 判 |
|---|---|---|---|
| W1=B3 格 4 无测试锚 | 记战役报告（不加代码） | 两新 it 仅锚格 2（E1）/格 3（紧凑），无格 4 夹具私加；layout.ts 终读无额外改动 | ✓ 说了没改=无 |
| W2=D4 label 压卡观察 | 入遗留池 | LineageEdges.tsx 全文（diff 全量可见）无碰撞避让逻辑；Board 头注「不做」负面清单原样 | ✓ |
| W3=E4 行数口径偏差（286/234/62 vs 285/233/61） | 记战役报告 | 实现报告保持原自报数未篡改；本审 wc 实算 285/233/61（+1=EOF 口径差，门一定性成立） | ✓ |
| W4=E7 票面 it 数笔误（12→实 17；7→实 4） | 主控责任记档 | brief 原文未动（68 行原样，笔误留存备查）——处置即记档非改票面 | ✓ |

门一 N1~N23 无行动面抽查（8 项亲核）：A1 算法（终审 M1 第四遍独立推演，
见 §2）/A2 坐标系（plo/phi 定义 :255-256 与消费 :227/:231/:243 终读吻合）/
C1 行数/C5 接口零改/E2 UTF-8（7 文件含 manifest 亲验）/E3 TODO（6 文件
grep exit=1 零命中亲验）/E6 tickets 推演（check-tickets.mjs 规则 2/6 亲读
复现）/E8 e2e（git status tests/e2e/ 零条目佐证）——**均无隐含行动面**。

## 2. 清单② 母本符合度（票面五层 vs diff+终态源文件）

- **行为层 ✓**：M1 分叉可见——it①（layout.test:129）三断言（两孙 x 差
  ≥NODE_W+SIBLING_GAP／根链 Brown=Reynolds 同 x／Reynolds 居中两孙中点
  <0.5）；紧凑保留——it②（:155）双断言（B−A 恰 toBe(220) 防过度推开＋
  B1/A3 异层同 x 交错未死）。**终审 M1 第四遍独立推演逐位吻合**：
  Cross=90/SH=310/Reynolds=Brown=200；y=140/420/0/280——与主控票面、
  实现者实测 JSON、门一 A1 三源一致（四源闭合）。
- **接口层 ✓**：layoutLineage 签名（layout.ts:116）零改；LayoutResult
  （:100-105）形状零改；Frame（:108-114）**非 export**（内部扩展不外泄）；
  Canvas props（Canvas:45-49）零改；常量 NODE_W=180/NODE_H=64/
  LAYER_GAP=140/SIBLING_GAP=40/TREE_GAP=80（:91-98）逐字未动。
- **架构层 ✓**：diff 9 文件+git status 均无 src/shared/；layout.ts 终读
  全文纯数据进出（仅 console.warn，无 DOM/window）；LineageEdges 仅
  import shared type+NODE_H——零新依赖、单向 Canvas→Edges→layout。
- **生命周期层 ✓**：auto-fit 未做（Canvas:52 `useState<Viewport>(
  {tx:0,ty:0,k:1})` 硬编码保持）；碰撞避让/折叠/DAG 零实现。
- **文化层 ✓**：TDD 四档证据齐（首红 3 failed|31 passed log／实现／
  变异①②+拆件后对最终形态补做同枚变异／verify EXIT_CODE=0 两轮+留档
  .sr2-lg-07-verify-tail.txt）；受锁两文件 unlock→改→apply 流程闭合
  （§3）；**推演值入测试注释实核**：it① 注释「Cross=90、SH=310（错开恰
  220）、Reynolds=Brown=200」、it②「A=310、B=530、B1=A3=530」——与
  实测逐位一致。

## 3. 清单③ 宪法红线终审

- **受锁流程 ✓（最强静态证据）**：本审以 node crypto 对磁盘两测试文件
  实算 sha256 与 manifest 记录比对——layout.test `f1c3affb…ca6ee` /
  canvas.test `1992fc…b81de3` **双 match=true**（locks:apply 痕迹与磁盘
  态一致实证）；manifest 仅动 generatedAt+两 sha（diff:5-22），144 条
  静态计数核对（grep '"path"' = 144）。
- **行数实算 ✓**：wc 实算 layout.ts=285／Canvas=233／Edges=61／Board=232
  ——≤500（ESLint）/≤250（组件红线）全过；与门一 C1 实算一致。
- **UTF-8 ✓**：7 改动文件（含 manifest）node utf8 解码零 U+FFFD（亲验）。
- **TODO 零 ✓**：6 个 src/tests 文件 grep TODO|FIXME|placeholder exit=1。
- **新测试 always-active ✓**：两文件零 guardedDescribe（仅头注 :8/:9 声明
  文字）；新 it 直接挂普通 describe（layout:47 块/canvas:100 块）。
- **拆件无死代码 ✓**：LineageEdges 被 Canvas:28 import、:186 消费
  （grep 全 src 引用面仅此一处=唯一消费方，非孤儿）。

## 4. 清单④ 机器面核对

- **用例算术 ✓**：734+3=737；两测试文件 it 实数 layout=19（17+2）/
  canvas=15（14+1）——与报告、门一 E7 实数自洽。
- **manifest 144 ✓**（§3）。
- **e2e 零改 24+0 ✓**：git status tests/e2e/ 零条目（零文件改动=基线
  24 不变，静态等价）；lineage.spec test 句柄实数 4（grep 复核）与
  报告「4/4 加跑」对齐；实现者加跑属票面外兜底，佐证可信（门一 E8
  断言面亲核：真实文本/path 计数/拖拽 transform，无布局数值断言）。
- **registry 衔接 ✓**：SR2-LG-07 未建单（grep LG-07 零命中）；LG-01~05
  file 各异无覆盖（repo.ts/lineage-layout.ts/LineageBoard.tsx/
  LineageSidePanel.tsx/lineage.spec.ts——五者互异）；**主控拟建单
  file=lineage-layout.ts 衔接闭合**：①check-tickets 规则 6 无 file
  唯一性约束，与 LG-02 同 file 不触发任何规则；②b3 头指针行
  layout.ts:1 `// b3: P7-H` 实核在位；③P7-H 在 ROADMAP 已裁决集
  （docs/ROADMAP.md:364 `### P7-H：发展脉络图`）；④规则 2/3/4/4b 对
  该建单推演全绿（layout.ts 无 SR2-LG-07 字面量、无占位桩、非 tsx、
  无 STUB；tests it 名不进 ticketRefRe 扫描——:77-90 continue 分支）。
- **M1 草稿重导入验证=用户验收面 ✓**：票面 P3 已注记（「用户验收若报
  出画再立小票」），来源档 §2E1 取证链在——真机复验归收口后用户验收，
  终审静态面已闭合。

## 5. 清单⑤ 成本账本（主控汇出，档内复核引用）

| 单元 | token | 工具调用 | 时长 |
|---|---|---|---|
| 实现者子代理 | 3,880,161 | 60 | 18.3 min |
| 门一对抗深审 | 644,241 | 17 | 7.2 min |
| 门二终审（本档） | 未计（主控收口时补录） | 12 | — |

## 6. 新破坏扫描（门一后至今）

- git status 与门一 E5 记录的工作树完全一致（6 改+LineageEdges 新增），
  src/tests 面零门一后变动；audits 目录新增件均为过程产物
  （gate1.audit/gate1.diff/verify-tail）与并行工单件（sr2-ai-11-brief.md，
  非本单）——**无新破坏**。
- 终读 layout.ts/Canvas/两测试与 diff 内容逐处吻合（约束 2 公式
  :226-228 与票面 P1 逐字一致；Canvas:186 LineageEdges 消费；it 落位）。
- 观察项（非缺陷，既有面）：layout.ts:3 规约头「（工单：open / strong）」
  状态描述过时（LG-02 已 done）——本单 diff 未触碰该行，历史遗留注释，
  不计入本单；主控若顺手更新属注释级（无连带）。

## 7. 收口放行条件清单（主控执行）

1. **建单+翻状态**：tickets/registry.ts 增 SR2-LG-07 条目
   （file=`src/renderer/features/lineage/lineage-layout.ts`——b3 指针
   已就位、P7-H 已裁决；summary 建议含「缺陷 E1 修复+边 label 渲染+
   LineageEdges 拆件」），status 直接 'done'。registry **不在 locks
   manifest 受锁面**（grep 核零条目）——无需 locks 流程。
2. **提交尾注**：[locked-change]（两受锁测试文件+locks/manifest.json）。
3. **staging 显式列文件**（AGENTS 纪律）：6 改（manifest/Board/Canvas/
   layout/两测试）+LineageEdges 新增+audits 本单六件（brief/
   impl.report/gate1.audit/gate1.diff/.sr2-lg-07-verify-tail.txt/
   本 gate2.audit）；**排除 sr2-ai-11-brief.md（并行工单件，勿扫入）**。
4. **4W 处置落账**：W1/W3 记战役报告；W2 入遗留池（与 P3 auto-fit 同挂
   用户验收观察项）；W4 记档。
5. **用户验收面**：M1 草稿重导入真机复验图五场景（分叉可见+边 label
   可读）+观察项（auto-fit/label 压卡）——报出再立小票（票面 P3 通道）。

## 8. 终审结论

**PASS。** 门一「通过（PASS），零回炉」维持；母本五层符合、宪法红线
零触、机器面全闭合、处置零偏差、无新破坏。SR2-LG-07 准予收口。
