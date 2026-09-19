# F-SENSOR-01 门二审包（b25 批；实证终审——你有仓读权限，逐项独立复算，禁采信转述）

## 1. 票与交付摘要

F-SENSOR-01（registry:313，中票）：ai_sensor 域整理——零行为装配重构。主控预裁+实现者（ops-executor，GLM5.3flash $max）交付，改动恰三件：
- `src/main/services/index.ts`：ServiceBundle.ai_sensor 交并拼盘拆三键平铺（ai_sensor/ai_notes_import/zcode_link）+IIFE/三 spread 消解+`readStatus: aiSensor.readStatus` 方法引用直传（构造序显式）+错位注释删除新注释块落新位；export_ 交并不动（F-EXPORT-01 承接）。
- `src/main/ipc/ai_sensor.ts`：七 handler 对号迁键+头注两句。
- `tests/utils/ipc-deps.ts`：桩工厂 ai_sensor 单行拆三行（unlock→改→即时 apply 单链，[locked-change][test-refactor]）。
- 零触碰：契约面（api-surface/schemas）/三服务件逻辑与路径/preload/renderer/bootstrap/registry/e2e specs。

主控预裁五条（拆域被 ADR-0017 排除/对齐=桶键对齐/契约零触碰/方法引用直传/协议版本字段不顺带）+实现者自裁两条（M2 首码 TS2345 勘正；注释取删除）——门一已逐条裁成立（见 §3）。

## 2. 机检与验证事实（证据件=scripts/audits/b25-*，请独立复算）

| 项 | 证据件 | 声称值 |
| --- | --- | --- |
| 基线锚 verify | b25-verify-baseline.log | EXIT=0（170/1744） |
| 七关卡 | b25-gate-{lint,typecheck,test,quality,tickets,locks,build}.log | 全 EXIT=0 |
| 变异 M1 红/还原 | b25-m1-{mutation,restore}.log | EXIT=2（TS2339×1 对位 importAll）/RESTORE_EXIT=0+DIFF=EMPTY |
| 变异 M2 红/还原 | b25-m2-{mutation,restore}.log | EXIT=2（TS2345+嵌套 TS2741 语义正文点名 readStatus）/RESTORE_EXIT=0+DIFF=EMPTY |
| 定向回归 | b25-regression.log | EXIT=0（3 文件/37 用例） |
| 终跑 verify | b25-verify-final.log | FINAL_EXIT=0 |
| e2e 默认门 | b25-e2e-default.log | **43/43 绿 EXIT=0**（2.0m；在册 flake corpus-export:157 未触发——G10 特例边界声明凭先例） |
| W1/W2/W3 销项 | b25-w1-closure.mjs/.log（v1 废档 b25-w123-closure.log） | 三 CLEAR（接口面两两交集∅/readStatus 体 this=0/三件 process/timer 代码面零命中） |
| 实现报告 | b25-impl-report.md | 含自裁申报段 |
| diff | `git diff`（工作树未提交） | 三件+manifest+relay.md |

锁链：375（b24 终态 374+b25-claim.mjs 探针入锁）→销项探针 b25-w1-closure.mjs 入锁后 manifest 再涨（locks:apply 已跑——manifest 现值请实读 locks/manifest.json 与 git diff 核对，恰三项+探针增量）。manifest 机械变化=时间戳+b25-claim.mjs+b25-w1-closure.mjs 入锁+ipc-depts sha 更新（门一 W4 销项=本行+§2 表）。

## 3. 门一审结果（deepseek 兜底位承载——见 §5 承载实录）与主控处置

**verdict=PASS_WITH_WARNINGS B=0/W=4/N=4**（报告 b25-gate1-report.md，请亲读）：
- W1 spread 撞名遮蔽不可证伪 → **销项**：b25-w1-closure.log 接口面两两交集全∅（aiSensor 6 方法/aiNotes 2/zcode 2——类型面=返回对象成员名投影，TS structural typing 保证）。
- W2 readStatus this 绑定不可证伪 → **销项**：函数体 :283-304 this 命中=0（探针物理在档）；另 e2e zcode-link.spec 6.0s 绿走真装配链路（readStatus 直传实战）。
- W3 构造序前移无副作用证据 → **销项**：三件 process/timer 代码面零命中（唯一命中=zcode-link:18 头注注释文字）——工厂=纯闭包定义。
- W4 manifest 无法独立裁决 → **销项**：§2 销项探针行+你有仓读权限亲核 git diff locks/manifest.json。
- N1 diffstat 申报不符 → **勘正在档**：ipc/ai_sensor.ts 实为 +6/−4（净 +2）非简报 §4.5 的 +5/−5——实现者报告侧计数笔误，门一 N 级，勘正句落本简报+批次日志，不回炉。
- N2 注释沿革/N3 变异覆盖注记/N4 通道前缀面表述（桶键↔件名两面成立、通道前缀面不映射=ADR-0017 一致）→ 收口措辞采纳。

## 4. 请你裁决（逐项独立复算）

A. 改动面恰三件+零行为主张（逐 hunk+§3 销项三证据复核——销项探针本身的方法学是否可靠：接口面提取 v2 的正则是否漏成员？建议你 grep 三服务件 return 体重验）。
B. 受锁面判定精确性：恰 tests/utils/ipc-deps.ts 一件 [locked-change][test-refactor]+manifest 机械项；契约面零触碰与票面「若动」条件句一致性。
C. 变异红证真实性（两 log 的 EXIT/错误码物理亲读；M1/M2 均 typecheck 面的防线单一性+§3 W1/W2 销项补强后是否闭合）。
D. 门一 W1/W2/W3 销项充分性（探针结论 vs 逐字亲验）。
E. e2e 43/43 绿+F-EXPORT-01 开工义务关系（本票非 EXPORT 承接票；在册 flake 未触发口径与 G10 特例边界凭一致性）。
F. 计数复核（wc/diffstat/用例数——实现报告 §计数 vs 你的独立实测；N1 勘正采纳与否）。
G. 承载实录裁决（§5）与欠账处置。
H. 收口序预批：①你的 P1 条件（如有）→②主控收口终跑 verify（翻 done 后，变量法落档）→③翻票 FLIP 探针→④health-scan（账本终态后跑——G9 教训②序）→⑤账本补记（executor+gate1 外发+adjudicator+主控，findings 对象形）→⑥staging 显式列文件（含 .log add -f）→⑦单笔提交 [locked-change][test-refactor] 尾注+relay.md 回写合并进提交（b22/b23/b24 先例：回写→一次提交，避免提交后脏面）→⑧板面 READY+勾选+批次日志。请对 ①~⑧ 出 P1 级放行条件或预批。

## 5. 承载实录（欠账登记）

门一=**k2 绑定连续两次 Provider authentication failed→外发 kimi-backup HTTP 403「5-hour usage limit」（实证在档 ds-call-v2 流水 run=20260918235225）→归因 zipoo 5h 配额窗耗尽→deepseek 审计兜底位外发承载**（deepseek-v4-flash，run=20260918235238，in=3334/out=21978/101s）——b20/b24 先例第三现；k1=用户封顶禁派。**门一/门二同族 deepseek 欠账如实登记**（门二绑定 deepseek-flash）；kimi 恢复补跑 Ruling（batch 20 立）新增实例 b25。请裁：同族欠账是否影响本批判定力（b24 门二先裁「不影响——门二全部裁决自原始件重推未采信门一转述」；本票门一仅 W/N 无 B，且 W1-W4 已由独立机检测销项闭合）。

## 6. 输出

最终回复=完整终审报告（主控逐字归档 b25-gate2-report.md）：verdict（GO / GO_WITH_CONDITIONS / NO-GO）+P0/P1/P2/N 分级+裁决表 A~H 逐项结论+P1 放行条件清单。
