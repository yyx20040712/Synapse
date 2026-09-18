# F-GEOM-01-G2 门二终审简报（实证终审——独立复算+收口预批）

> 岗位：门二（异构终审，与实现者/门一均异构）。对象=F-GEOM-01-G2 实现票全链
> （实现→门一→处置）。你岗有 Read/Glob/Grep——下述路径可亲读独立复算，禁改任何文件。
> 工作区：E:\class\智慧水务\Synapse_remake。

## 一、票面与流程地位

- 票：tickets/registry.ts 的 F-GEOM-01-G2（[locked-change][test-refactor]，战役唯一
  行为变更票）。设计书=docs/design/2026-09-18_f-geom01-unification-and-reader-
  subdomains.md（§2.4 保存门/§3.5 净删清单①②③/§5.2 风险 1-2/§5.4 INV-58）。
- 流程实录：主控侦察→受锁面先行对账表（g2-assertion-reconciliation.md）→六段简报
  （g2-impl-brief.md）→ops-executor 实现（g2-impl-report.md）→门一 PASS_WITH_
  WARNINGS B0/W1/N7（g2-gate1-report.md 含主控处置段）。
- 变更集=工作树未提交面：git 视角=10 已跟踪文件改动+3 未跟踪 audits 件（本简报/
  对账表/报告同域另有 6 .log 证据件）。

## 二、四组关键数字独立复算（核心义务）

1. **±行数逐 hunk**：`git diff --numstat`（自跑）应=selection-evaluate +20/-33、
   anchor-serialize +3/-2、annotation-anchor +1/-26、invariants +1/-1、exemptions
   +14/-1、selection-layer.test +35/-0、selection-item-chain.test +2/-2、
   selection-paint.test +28/-0、annotation-anchor.test +1/-16、manifest +7/-7；
   合计 +112/-88（10 文件）。
2. **指纹门 C 面对账**：scripts/test-surface.baseline.json（187 文件/1790 用例/5417
   断言）vs 当前测试面——①两条豁免（scripts/test-surface.exemptions.json）caseTitle
   与基线内旧标题逐字一致（selection-item-chain 回退①旧题+annotation-anchor
   rectsFromRange 题）；②selection-layer.test 14 例与 selection-paint 17 例在基线的
   cases 标题全集=当前文件标题全集（纯桩增零 C 面变）；③用例数口径=基线 1790 的
   tests 域含 1745（vitest 运行域）——本票后 vitest 应 170 文件/1744 用例（−1=
   rectsFromRange 删除）。
3. **锁面**：locks/manifest.json 应 338 项且恰 6 受锁件 sha256 变更+generatedAt（6 件
   =四测试+invariants+exemptions——可用 manifest 内 sha 与文件实算比对抽查 ≥2 件）。
4. **证据链 EXIT 物理在档**：scripts/audits/g2-{red-fallback1,green-full,
   mutation1-savegate,mutation2-probe,verify-final,e2e-appgate}.log——尾段应含
   RED_EXIT=1/T3_STEP1_EXIT=1/GREEN_FULL_EXIT=0/ANCHOR_NET_EXIT=0/MUT1_RED_EXIT=1/
   MUT2_RED_EXIT=2/VERIFY_EXIT=0/E2E_EXIT=0 等标记行（变异还原段 RESTORE/DIFF_EMPTY
   同查）。

## 三、实质面裁点（除数字外）

- P 候选取向：①保存门行为面=唯一变更票的语义完备（M1 变异红证是否真钉住「回退态
  无保存入口」——log 内红点行核对）；②e2e 默认门 43 例的口径（G2 是行为变更票，
  e2e 必跑——与 G1 零行为票不同，验收三件套=指纹门 C_after ⊇ C_before+锚定回归网
  +e2e 默认门是否全兑）；③门一 W1 处置（RoT 第 4 份后置到目录化迁移票随迁抽取）
  的合理性独立复核；④INV-58 修订文本与 selection-evaluate 新头注的互证（stale 自述
  消除=设计书 §2.6 交互点 5）。
- N 候选取向：门一 N6 盲区（回退②③无逐因工具条断言）留痕去向；.log 入库
  git add -f；账本补记（executor+门一+门二三行，主控收口做）。

## 四、收口五面预批（裁定主控收口清单是否完备）

1. 主控亲跑 `npm run verify` 终跑真退出码落档（g2-verify-final 由实现者已跑，主控
   收口重跑或抽验+registry 翻 done 后复跑——以实现者 log+主控终跑双档）；
2. locks 复核：manifest 与提交同步（单提交含全部受锁件+manifest）；
3. registry 翻 F-GEOM-01-G2 done（open 19→18）；
4. 单提交 [locked-change][test-refactor]，显式列文件（10+3 audits 件+6 .log add -f
   +relay.md 板面收口）；
5. health-scan RED=0+账本三行补记（绑定岗主控 node JSON.stringify——临时件用毕删）。

## 五、输出契约

终回复：**P0（收口阻断）/P1（须处置）/P2（留痕）逐条+N 条+VERDICT: GO |
GO_WITH_CONDITIONS | NO-GO**（≤50 行）。四组数字复算结果逐组给出（对上/对不上+实值）。
