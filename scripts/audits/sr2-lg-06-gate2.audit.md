# SR2-LG-06 门二终审——脉络跳转接笔记面板信号（缺陷 E2）

> 审计人：门一+门二联审孙代理（ENR-03 联审先例）。只读静态终审，
> 禁 npm/test/构建/tickets 触碰/git 写。门一深审结论见
> `scripts/audits/sr2-lg-06-gate1.audit.md`（A~E 全过，零回炉项）。

## 清单一：处置核对 / 母本符合度（P1~P4 五层）——过

| 票面项 | 实测 | 判 |
| --- | --- | --- |
| P1 一行接线（anchor 分支 locateAnchor 前，`req.aiNoteId !== undefined`） | open-paper-anchor.ts:30-31 逐字兑现（1 行接线+1 行注释=接口层「+2 行」上限内，文件 +12 全账=接线 2+头注 10） | 过 |
| P2 无锚/无 aiNoteId/annotationId 路径零触碰 | openPaper 分支一字未动；裸锚 it② 锁守卫；annotationId 场景类型层面不可达（OpenPaperRequest 无此字段） | 过 |
| P3 受锁文件加 2 it+stub 扩展 | test:207-244 两 it 齐备（顺序断言+守卫断言）；stub 池/mock 双点扩 | 过 |
| P4 头注 LG-06 链声明、LG-04 链不动 | diff 上下文实证原段保留、新段追加 | 过 |
| 行为层（双信号正交：面板归 notify、定位归 locateAnchor） | B 项对抗推演三形态全红（见门一） | 过 |
| 架构层（零依赖、INV-20 不违） | 无 import 增删；notify 是呈现信号非定位降级，单入口未动 | 过 |
| 生命周期层（不做面） | annotationId 切 tab / per-paper 化均未顺手做 | 过 |

## 清单二：宪法红线——过（一事实修正，一行动项）

- **manifest 144 一致性**：node 实数 `files: 144`；并对
  `tests/unit/renderer/lineage-side-panel.test.tsx` 独立复算 sha256
  （LF 归一）= `b5e5a1a9…f10e0f0`，与 manifest 新条目逐字符一致。
- **行数**：open-paper-anchor.ts 实算 42 行 ≤500。测试文件 471 行 ≤500
  （观察项：距顶仅 29 行余量，后续往此文件加用例须先考虑拆分）。
- **UTF-8**：两改动文件 U+FFFD 计数=0，中文 Read 可读。
- **TODO/FIXME/placeholder**：grep 零命中（exit 1）。
- **TDD 四档**：首红留存（报告 §3.1 "called 1 times, but got 0 times"，
  1 failed|19 passed——it② 守卫语义本就应绿，票面预判兑现）；绿 20/20；
  变异恰中（cp 备份法+sed 删接线行→同 it 同断言点红，**禁 git checkout
  纪律遵守**）；还原 diff 空（DIFF_EMPTY=OK）+复跑绿。测试自缺陷三处
  修正均申报且方向为硬化（未放宽断言、未改既有用例——与现文件 18 个
  既有 it 逐一比对无改动）。备注：it② 无独立变异红证，但其失败模式
  存在（守卫被移除即无条件发信号→红），与既有「无锚→openPaper」守卫
  it 同型，票面文化层只要求 ≥1（已满足），合规。
- **安全禁令**：无出网/eval/SQL/renderer 越层面——diff 面不涉。

## 清单三：机器面——过（算术可静态复核项全中）

- **95 文件**：`find tests -name "*.test.ts(x)"` 实数 95，与报告一致。
- **734 用例**：732 基线+2=734 算术自洽；总数禁跑不可独立复算，采信
  第三轮 verify 真退出码 0 自报（退出码三档演进 1→2→0 本身是关卡在
  工作的证据：tickets 拦错号→tsc 拦类型→全绿）。
- **e2e 零改 24+0**：git status 无任何 e2e 面改动；7 个 spec 文件未触；
  24 基线为自报（静态不可复算），不变性由「零改动」背书。
- **registry**：authoritative 计数（与 check-tickets 同款 objRe）=113
  全 done、0 open、无 LG-06——「未建单+实现者禁建」与报告一致。
- **建单衔接·事实修正（重要）**：主控派单前提「LG-04 既有条目 file 同为
  open-paper-anchor.ts」与 registry 事实不符——**SR2-LG-04 的 file=
  `src/renderer/features/lineage/LineageSidePanel.tsx`**（registry:199）；
  open-paper-anchor.ts 只在代码头注携带 LG-04 链声明。registry 现无任何
  条目 file 指向 open-paper-anchor.ts → 建 SR2-LG-06（file=本文件）是
  该文件**首个** registry 条目，**无覆盖风险**（比主控担心的更干净）；
  一文件双工单的 registry 先例仍成立（C-05+F-02 双条目同指
  anchor-locate.ts，registry:159/204）。
- **建单行动项（唯一硬前置）**：check-tickets 规则 6 要求 SR2-* 工单的
  file 头部注释区含 `// b3: P7-X` 独立注释行（P7-X ∈ ROADMAP 已裁决集
  P7-A,B,C,D,E,F,G,H）。open-paper-anchor.ts 现无此行——**建单时须同步
  补一行**（照 anchor-locate.ts 先例：行 1 `// b3: P7-C` 独立行+裁决链
  以注释段追加，头指针不随后续票挪动），否则建单后 verify tickets 关卡
  即红。此为 src 一行改动，归主控收口动作，非实现者遗漏。

## 清单四：成本账本行

- 实现者子代理：1,773,131 tokens / 51 工具调用 / 8.6 min（主控提供，
  记入战役账本）。门一+门二联审孙代理：3 输入档+4 源文件抽读+7 组静态
  核验命令+2 审计档产出（本档与 gate1）。

## 收口放行条件清单（主控亲验序列）

1. 亲跑 `npm run verify` 真退出码 0（不复读实现报告数字）。
2. `locks:check` 对账（本审已静态预核 sha 一致，仍以亲跑为准）。
3. `git diff --stat` 范围=3 文件+62/-7，staging 显式列文件（brief/report/
   审计档随单或按主控惯例归档）。
4. 建 registry 条目 SR2-LG-06（file=`src/renderer/features/reader/
   open-paper-anchor.ts`，owner=strong）**并同步补 `// b3: P7-X` 头指针行**
   → 复跑 verify 复绿（规则 6+规则 2 联动确认）。
5. 提交尾注 `[locked-change]`（受锁测试+manifest 同单）。
6. 可选：头注 `[LG-06]` 回写 `[SR2-LG-06]`（建单后自引用合法；规则面
   非必需，排版裁量）。

## 门二终裁

**放行收口**。零回炉、零阻塞缺陷；一项事实修正（LG-04 注册文件指向）
与一项建单硬前置（b3 指针行）移交主控收口序列第 4 步处置。
