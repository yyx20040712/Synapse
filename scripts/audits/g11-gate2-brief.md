# F-GEOM-01-G11 门二终审包（ops-adjudicator——异构二审，2026-09-19 batch 23）

> 审对象=工作树未提交改动（HEAD=62ef3802ad 之上）+两轮门审流（门一 FAIL
> →回炉 #1→复绿）。终稿 diff=scripts/audits/g11-gate2-diff.patch（6 文件
> 1709 行；探针 g11-*.mjs 系未跟踪新件不在 patch——直读文件本体）。你有
> Read/Glob/Grep——独立复算禁采信转述；产出预算=裁决表+分项证据。

## 票面与流程

F-GEOM-01-G11 战役收官票（registry :302，[locked-change]，11/11）：头注
扫尾+净删/交互点记账报告+验收门全跑+INV 终册+指纹门基线重冻结；母票
F-GEOM-01（:280）随本票翻 done（**翻票=主控收口动作，未执行**——审预批）。
流程=ops-executor 七步交付（简报 g11-impl-brief.md→报告 g11-impl-report.md
含 §8 回炉段）→门一 ops-gate1-k2 **FAIL（B1+W1+5N）**（g11-gate1-report.md）
→主控派回炉 #1（≤2 内）→B1/W1/N2 四件+探针补强+复验全绿→本审。

## 两轮改动面

第一轮六文件（g11-gate1-diff.patch，审基线）：PdfPageCanvas 头注重写/
invariants 11 处路径刷新+口径小节/closeout 报告真身/g10-oneway 头注/
baseline.json 重冻结/manifest 重锁。回炉增量（终稿 patch 对一轮 patch 的
差）：①invariants:62 INV-47 声明处全路径补 anchors/（第 11 处——一轮漏
刷即门一 B1）；②PdfPageCanvas:18-21 残句「旧路径」框架改写（W1）；③
g11-inv-anchor-check.mjs 增册文扫描段（B1 处置建议——从册文提取
features/reader/<段> 路径验存在性，v1 输出档保留 v2 新落）；④N2 口径
销项实测并入 impl-report §8。

## 终审断言（独立复算面）

A. **门一 B1 回炉兑现**：invariants.md 全册 `features/reader/<平铺>` 非
   域前缀旧径=0（grep 亲扫）+INV-47 行 :62 现行径+「11 处」计数三处书面
   （口径小节 :97/closeout §4/impl-report）与册面实态一致（主控判定式
   已验：flat 0 命中/prefixed 1 命中——你独立复扫）。
B. **探针补强真防线**：g11-inv-anchor-check.mjs 册文扫描段逻辑读——
   未修复态会 FAIL 的判定面成立（非恒真）；v1/v2 两输出档并存（G9 教训③
   探针版本覆盖=证据灭失——防复发）。
C. **验收门全跑（票面 §5.1 底色）**：e2e 双门=g11-e2e-appgate.log 43/43
   EXIT=0+g11-e2e-allgate.log 45/45 EXIT=0（2.1m）——EXIT 物理标记亲读；
   **在册 flake（corpus-export.spec:157，台账 count 5）本轮未发——门二
   G10 特例边界声明凭（在册 flake+bundle 恒等+承接票 F-EXPORT-01 在排程）
   未触发使用，纯绿收口**；flake-ledger.json 本批零 diff（复跑绿不销项
   口径）；指纹门=verify 内含（基线重冻结后 cur=冻结值 187/1789/5411）。
D. **构建产物恒等链第八票**：g11-build-hash.log+g11-build-hash2.log 三
   产物同名同尺寸同 sha256（9c3b8b84…/dcace2e7…/1baa1844…）——与
   g8-build-hash.log/g10-build-hash.log 前链 sha 前缀比对（门一 N4 的
   前链不确定项在回炉复验中闭合：主控复核 9c3b8b84 与 batch20 在档
   前缀相认——你亲比补强）。
E. **记账报告数字独立复算**：域分组 Σ+313/−309（六域+根删除组 71 files）
   /逐票 Σ+428/−424=+4 自洽/wc 双口径 11,815 vs 11,791（两侧非代码文件
   =0 实测=严格同域，N2 销项）/净+4 vs 预测 −20~−80 构成五项（删侧兑现
   59/50~60+增侧未入模型项逐条）——closeout §1 全表算术闭合。
F. **INV-68 十三锚**：g11-inv-anchor-check.log/+2.log 全 PASS+抽核 ≥4 处
   现行文件行内容（门一已亲读 9 处——你独立抽）。
G. **基线重冻结合规**：183/1757/5334→187/1789/5411 同值冻结（零测试面
   变更票预期态）+diff 审计档（g11-baseline-diff.log 875 行）+exemptions
   2 条 G2 旧条目**保留**（主控裁决：重冻结后转惰性桥接，保留为 G2 裁决
   审计史——checker 对新基线零咨询=零害；审此裁是否成立）。
H. **红线与流程**：tests/**/registry.ts/src 非注释行/relay.md（主控
   claim 面）/b22-recovery-verify.log 零触碰（终稿 patch 面+两轮流程档）
   ；回炉 #1=1 次（≤2 内）；翻票未越权（registry :302 仍 open）。
I. **收口序预批（G10 先例）**：主控拟执行序=①翻票双票（G11+母票
   F-GEOM-01，g11-tickets-flip.mjs 单跑 EXIT 落档）→②终跑 verify
   （open 10→8=恰两票翻 done+locks 一致+170/1744+指纹门+build 绿——
   注意探针/报告已入锁 370，翻票不改锁面）→③relay 父行「F-GEOM-01
   实现」+G11 行双勾+checked 26→28→④批次日志+提交（staging 显式清单
   含 .log add -f）→⑤health-scan（账本终态后跑——G9 教训②序）→⑥账本
   补记（executor 两轮+门一+门二，findings 对象形）。
J. **证据件名册**（staging 白名单预核）：g11-{impl-brief,impl-report,
   gate1-brief,gate1-report,gate2-brief,gate2-report}.md+g11-gate1-diff
   .patch+g11-gate2-diff.patch+g11-{netstat,inv-anchor-check,inv-anchor-
   check2}.mjs+g11-{netstat,inv-anchor-check,inv-anchor-check2,impl-verify,
   impl-verify2,build-hash,build-hash2,anchored-net,baseline-diff,e2e-
   appgate,e2e-allgate}.log+b22-recovery-verify.log（已暂存）+改动六文件
   ——收口前主控 ls 实测复核。

## 基线数字（供对账）

verify 双轮绿（g11-impl-verify.log:3843/impl-verify2.log:3825 EXIT=0——
locks 370/tickets 206 票 open 10/指纹门 187/1789/5411/skip15）；锚定回归
网 18 文件/211 用例（g11-anchored-net.log）；设计书 §5.1 底色=45+43+
回归网+指纹门四门全达。

## 产出

GO / GO_WITH_CONDITIONS / NO-GO +P0/P1/P2/N 分级+逐条证据；报告全文由
主控代归档 scripts/audits/g11-gate2-report.md。
