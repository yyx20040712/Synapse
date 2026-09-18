# F-GEOM-01-G3 门二终审简报（主控→异构二审岗）

> 档位：ops-adjudicator 绑定子代理（deepseek-flash $max）。工作区根
> E:\class\智慧水务\Synapse_remake。审档输出路径（你唯一可写件）：
> `scripts/audits/g3-gate2-report.md`。

## 铁律

只读审计（Read/Glob/Grep 仅限）；唯一可写=上述报告件；禁 npm/test/git 写操作。

## 背景

F-GEOM-01-G3=band 三档绑定+跨族交互点登记（F-GEOM 战役第 3 实施票，**纯登记面
零行为变更**：INV-68 落册+INV-58 坐标域边界注+三处换算头注域声明+selection-paint/
annotation-resolve 陈旧头注勘正）。门一已审（PASS_WITH_WARNINGS B0/W2/N7），主控
已处置 W1/W2——本审=终态把关。

## 输入件

1. **终态 diff**（W1/W2 处置后，6 文件 +24/-9）：`scripts/audits/g3-gate2-diff.patch`
   （relay.md 认领 3 行非本票面已剔）。
2. **票面**：`tickets/registry.ts` 294 行起 F-GEOM-01-G3；设计书母本
   `docs/design/2026-09-18_f-geom01-unification-and-reader-subdomains.md`
   §2.3/§2.5/§2.6/§5.4。
3. **实现链档**：`scripts/audits/g3-impl-brief.md`（六段简报）→
   `scripts/audits/g3-impl-report.md`（实现者报告，自裁 6 条）→
   `scripts/audits/g3-gate1-brief.md`（门一审包）→
   `scripts/audits/g3-gate1-report.md`（门一报告：B0/W2/N7）。
4. **证据日志**：`scripts/audits/g3-verify-final.log`（实现者侧，尾行
   G3_VERIFY_FINAL_EXIT=0）+`scripts/audits/g3-verify-final2.log`（**主控 W1/W2
   处置后终跑**，尾行 G3_VERIFY_FINAL2_EXIT=0——你重点核这份）。

## 主控处置声明（W1/W2——门二审核对）

- **W1**（门一发现：annotation-resolve.ts:231 bandsNearRects 头注「三消费点公共面」
  陈旧，与本票 INV-68 档3 唯一消费登记互斥）：主控已按门一措辞勘正——现头注=
  「[F-GEOM-01-G3] 勘正：现状唯一消费=AnnotationLayer S3b/S6 存量回退（INV-68 档3）
  ——F-A5 时代三消费点口径已随 F-A6 选区迁项几何族过时」。
- **W2**（门一裁决推翻主控预裁「保留」：INV-68 状态列「已登记」越维护规则三档
  词表）：主控接受门一裁决，已改词——现状态列=「未锚定（门一 W2 裁改词：登记
  性质=事实升格防漂移非行为变更，无独立红证面——防线=未来跨档消费走 review
  拦截位，非 CI 负锚）」。
- N 级 7 条均记录级（N5/N6 归 G11 票面既有义务覆盖；N1~N4/N7 知会级），零代码动作。
- 主控简报侧勘误：门一 N4 指出主控简报「+21/-9」实为 +21/-8（处置前）；W1/W2
  处置后终态=+24/-9（diff 实测）。

## 四清单+一

1. **处置核对**：门一 findings 全量 vs 终态实物——W1/W2 是否按门一措辞落准
   （逐字比对 diff hunk）；N 级是否有应处置而未处置项；「说了没改/改了没说」扫描。
2. **母本符合度**：票面六要件+设计书 §2.5 表三档逐格 vs INV-68 条文终态（含 W2
   改词后）；§2.6 三交互点收口句；§2.3 坐标域三处登记不物理收敛口径。
3. **宪法红线终审**：零行为变更声明（逐 hunk——W1/W2 处置是否引入任何代码语义
   变更）；受锁链（unlock→改→apply 两轮，manifest 与 invariants.md 双改同步）；
   UTF-8；行数；[locked-change] 义务完整性（invariants.md+manifest 同提交）。
4. **机器面核对**：g3-verify-final2.log 数理一致（206 票/open 18/locks 338/
   test 170 文件 1744 用例/指纹门 187/1789/5411+豁免 2hits/build 绿）——与
   batch 14 收口基线零漂移推演；registry 翻 done 推演（本审时 open 18，收口后
   17——tickets:check 在 verify 链内的口径理解）；e2e 不跑口径复核（零行为
   变更，G11 票面含验收门全跑义务）。
5. **成本账本行**（主控汇出，你核对格式）：实现者 ops-executor
   GLM5.3flash $max 1 unit；门一 k1 kimi k3 $max 1 unit；门二（本岗）
   deepseek-flash $max 1 unit——绑定岗无自动落账，主控收口时补记
   `.zcode/org-ledger.jsonl`（行 schema=references/02 §9）。

## 输出契约

`scripts/audits/g3-gate2-report.md`：P0/P1/P2/N 逐条+证据（file:line/日志行号）+
四清单结论+总评（GO/GO_WITH_CONDITIONS/NO-GO）+收口预批清单（主控收口执行序：
registry 翻 done→显式列文件提交（[locked-change] 尾注）→板面收口→health-scan）。
回复五行内。
