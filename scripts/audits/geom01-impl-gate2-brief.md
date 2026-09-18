# 裁决位简报：F-GEOM-01 实施票立案批（G1~G11）——relay batch 12 轻量双审二审

## 0. 你的任务

你是裁决位（ops-adjudicator，deepseek-flash max）。对本案做终审裁决：
①复核门一（PASS_WITH_WARNINGS B=0/W=2/N=3）的发现与主控处置是否闭合；
②独立复算关键数字与事实；③裁决本批可否收口提交。产出报告+末栏
`FINDINGS: B=n/W=n/N=n/VERDICT=GO 或 GO_WITH_CONDITIONS 或 NO-GO`。
你有 Read/Glob/Grep，仓库根 E:\class\智慧水务\Synapse_remake 可交叉核对。

## 1. 批次与对象

- 本批=「F-GEOM-01 实现票立案批」：tickets/registry.ts 新增 11 条目
  （F-GEOM-01-G1~G11，全 strong open）+母票 F-GEOM-01 行尾立案注记+块注释；
  两件骨架（src/renderer/features/reader/geometry-types.ts、
  docs/reports/2026-09-18_f-geom01-campaign-closeout.md）。零 src 行为变更。
- 依据链：设计书 docs/design/2026-09-18_f-geom01-unification-and-reader-
  subdomains.md §5.3 切分（定稿提交 af946a5324）+relay 板 batch 11 收口
  指令「下波=F-GEOM-01 实现票立案批（G1~G11 骨架件+registry+locks 立案序）」。
- 审计档：scripts/audits/geom01-impl-gate1-brief.md（一审审包）/
  geom01-impl-gate1-report.md（一审报告逐字）/ geom01-impl-registry.patch
  （处置后终态 diff，35 行）/ geom01-impl-verify.raw.txt（首跑）/
  geom01-impl-verify-final.raw.txt（处置后终跑）。

## 2. 门一发现与主控处置实录（请逐条裁决闭合性）

- **W1（迁移票缺「既有票 file 全域随迁」义务，40+ 票次波及）**：处置=
  registry 块注释补「全域随迁义务」段（目录化迁移步落盘时 registry 全体
  file 指向被迁路径的票含 done 票与 G 票自身一并随迁改写——check-tickets
  规则 1 全票存在性硬红兜底，属票面声明的批量改写面非票面外静默批改）。
  见 geom01-impl-registry.patch 块注释段。
- **W2（锚定回归网 17 件计数口径）**：处置=主控机检实测
  tests/unit/renderer（ls+grep）——selection-layer×2 物理展开=
  selection-layer.test.tsx+selection-layer-fa12.test.tsx，锚定回归网
  物理件=18；G6 票面已改「18 物理件（§5.1 名单 17 项中 selection-layer×2
  =双文件——tests/unit/renderer ls 实测=18）」。
- **N1（relay 落板时态）**：处置=落板在本批收口步执行（11 子项顶层
  `- [ ]` 行+F-GEOM-01 父行保留），批次日志澄清「上板=收口兑现」；子项
  id 与 registry 一一对应由主控收口时人工核对（无机检面，如实记）。
- **N2（G1 红证前提未明示）**：处置=主控亲读 tsconfig.web.json:23-28
  ——include 含 `tests/**/*.tsx`，tsc 关卡覆盖受锁测试，红证通道有效；
  G1 票面已补前提明示（「tsconfig.web.json include 含 tests/**/*.tsx
  覆盖受锁测试」）。
- **N3（设计书表层瑕疵两则）**：处置=记录不改动（设计书非本批对象；
  registry 按 §5.3 正确不受影响）——批次日志登记，后续触设计书票顺带。

## 3. 机检证据（两次实测）

- 处置前 verify 全链 EXIT=0（geom01-impl-verify.raw.txt，标记
  GEOM01_FILING_VERIFY_EXIT=0 物理在档）。
- **处置后终树 verify 全链 EXIT=0**（geom01-impl-verify-final.raw.txt，
  标记 GEOM01_FILING_VERIFY_FINAL_EXIT=0 物理在档）：tickets 206 票
  open 20（weak 0/strong 20）｜locks 338 一致零变更｜test 170 文件
  1745 用例全绿（与 batch 11 基线零漂移）｜test-surface 门过（既有纯增
  滞后态零新增）｜quality/lint/typecheck/build 全绿。
- 受锁集合核对（scripts/get-protected-files.ps1）：本批触及三路径
  （tickets/registry.ts、src/renderer/**、docs/reports/**）均不在受锁
  集合 → 零 [locked-change] 义务、零 locks 操作。

## 4. 主控自裁清单（含未处置前的一审申报 5 项，一审已拷问）

①锚选择（G1/G11 骨架载体先例/G2 行为变更落点/G3 INV 册/G4~G10 域代表
件+翻 done 随迁）；②板面 11 子项顶层行（grep 门兼容）；③零锁面；④e2e
未跑（零行为变更，batch 1 同口径）；⑤no_progress 计数 +1 按规则字面留痕
（立案批无勾选行可勾，连续 3 才 HOLD）。

## 5. 请你裁决的点

1. W1/W2/N1/N2/N3 五项处置是否闭合（处置本身已入 registry 终态——
   处置变更了审计对象，请对**终态**再核）。
2. 处置变更后门一报告时态滞后（报告基于处置前 registry 行号/文字）——
   归档保留原报告+本简报 §2 处置实录的链路是否可接受。
3. 独立复算：206=195+11、open 20=9+11、G6 名单 18 物理件、M6b 13 件
   补全 PageColumnView 的 27=14+13 对账、骨架无占位词。
4. 收口序合规：处置→终树 verify→单提交（含 registry+骨架+审档+板）。

## 6. 输出要求

报告分节：A 复核与复算 / B 裁决发现（P0=阻断/P1=必办条件/P2=建议）/
C 结论。末栏必须含：`FINDINGS: B=n/W=n/N=n/VERDICT=GO 或
GO_WITH_CONDITIONS 或 NO-GO`（B/W/N 沿用你岗 P 分级外的计数口径时可
自明，但 VERDICT 必须三者其一）。
