# F-GEOM-01-G6 门二终审报告（ops-adjudicator · deepseek-flash $max）

> 归档说明：门二岗无 Write 通道，本件由主控从其最终消息逐字归档（G4/G5 同型）。

**VERDICT=GO_WITH_CONDITIONS**：实现面回炉=0（P0=0、无实现面 P1）；两条 P1 均系收口侧放行条件，兑现后无需复审。隔离声明：本审仅只读工具面（Read/Glob/Grep，未跑命令、未派子代理、未改文件）；审包=scripts/audits/g6-* 全件；机读尾栏按本岗 B2 契约置于 FINDINGS 行之后（末两行）。

## 一、逐条裁决表

| # | 原判断 | 裁决 | 依据（行号） |
|---|---|---|---|
| 1 | A1 零行为（12×100%+98%+92%） | 成立 | rename 头 patch:1071-1157/1079/1133；构建内容哈希名前后恒等 baseline2:3963-3964=verify7:3864-3865=verify-final:3879-3880；M1 TS2307 mutation.log:9 |
| 2 | A2 C=35/17、D=1 | 成立 | 本审独立复扫工作树：35 处/17 件（7,5,5,3,2,2,1×11）；patch:876-1227 |
| 3 | A3 E=34/17 含 2 vi.mock | 成立 | 本审独立复扫 tests：anchors/ 34 处/17 件逐件吻合；vi.mock patch:1290/1422；M2 红 mutation.log:32 |
| 4 | A4 F 仅 :99 | 成立 | 亲读 check-quality.mjs:87（无路径注释、零触）/99（新值）=patch:854-861 |
| 5 | A5 registry=10 零 status | 成立 | 10 对 ± 行 patch:1532-1610；G6 仍 open patch:1610；tickets 绿 verify7:72 |
| 6 | A6 探针 6 件 | 成立 | patch:226-813，无生产接线 |
| 7 | R1=3121 | 成立 | 本审逐件 grep=509/427/172/413/251/119/259/284/293/69/43/119/60/103，Σ3121——门一 12/14 未复算残余清零 |
| 8 | R6 locks 345→348→351 | 成立 | 348=baseline2:87；351=verify7:80=verify-final:87；manifest +6 零删→345=351−6；本审 "path": 计数=351 |
| 9 | 指纹门 187/1789/5411 零漂移 | 成立 | baseline2:27=verify7:20=verify-final:27（C_after⊇C_before） |
| 10 | vitest 170/1744 | 成立 | 三跑同值 baseline2:3925-3926=verify7:3826-3827=verify-final:3841-3842 |
| 11 | 锚定网 18 件/211 用例 | 成立 | anchored-net.log:263-268；stderr 栈帧指 anchors/ 新径 :23 |
| 12 | 域内互引 25 零改写 | 成立 | recon.log:103（60−35）；recon3.log:6（25/25 双计）；context 零触 patch:1088/1142 |
| 13 | B=7 行+§3.1 单向 | 成立 | patch:1085-1097/1139-1149；oneway.log:2-8（0/0/3/0） |
| 14 | 收口①翻 done 前置 | **未兑现→P1-1** | verify-final:77 open 15 与 G6 仍 open（patch:1610）互证终跑为翻 done 前像；须翻 done 后重跑（G3 先例 registry:1606） |
| 15 | 收口②③冻结序/staging | 条件成立→P1-2 | 14 对 rename 已在 patch 识别（含 98%/92%）；6 新探针已入 manifest（patch:41-71） |
| 16 | 门一 W1「44 文件」 | 处置充分 | diff 头本审实测 60（52+relay+manifest+6）；errata 留痕不回改足 |
| 17 | 门一 N1 心跳回退 | 处置充分（票外） | patch:19-21=实测认领值；last_dispatch 14:56:11Z 时序自洽 |
| 18 | 门一 N2 345/348 | 处置充分 | raw 为准（348→351）；⑤系预登记残留；勘误即可 |
| 19 | 门一 N3/N4/N5 | 处置充分 | recon 仅 32/34（:103）→recon2 补 vi.mock 两行 :21/:27；出边盲区由 patch+typecheck 闭合；N5 残余由本审行 7 清零 |
| 20 | 门一 N6 调度面混入 | 准 | 随收口提交（G4/G5 先例）；板值=实测认领值 |
| 21 | G11 对账债（§3.2 行数） | 成立（范围精化=P2-1） | 本审实测 11/13 偏差、2 件吻合；另发现 §5.1 基线 187/1790/5417 vs 实测 1789/5411 |
| 22 | e2e 未跑归 G11 | 准 | 零运行时值变+构建名恒等；G1/G4/G5 同裁先例 |

## 二、独立复算记录

- 14 件行数：14 件 grep `^` 逐件值全吻合（见行 7），算术 Σ=3121 ✓；锚定网 18=13 改写+5 零改写（selection-geometry/selection-mode/pages-overlay/pdf-page-canvas/selection-layer-fa12）+4 件名单外受锁（release-affinity/ai-notes-section/lineage-side-panel/ai-note-style.test）=E 17 物理件 ✓；reader 根 14 旧件 Glob 零残留。
- C/E 终态从工作树独立重扫（非抄 script 清单）：35/17、34/17 全吻合；U2=53 行/21 件、U3=36 行/19 件算术自洽。
- locks：manifest 351 条、零 registry.ts 条目（翻 done 不动锁）；348/351 双 log 在档。
- 构建：内容哈希命名恒等（名=哈希→字节恒等；raw 59,923/1,402,437 仅后像，前像不在包——名称恒等强于尺寸）；展示值 52.49/1,392.72 kB 三处同。
- 变异链：M1 EXIT=2→diff empty→绿；M2 EXIT=1→restore=0→13/13；M2 落于 verify7 后、verify-final（Start 23:21:09>23:19:40）前——末跑 locks=351 证「已复锁」。
- 无佐证点名：unlock/apply 命令行输出无 raw（终态 manifest+check-locks 兜底）；翻 done 后终跑尚未发生（P1-1）；构建 raw 字节前像缺席（上述）。

## 三、回炉建议与优先级

- **P0=0**：无实现面缺陷，回炉=0。B=0/W/N 全为文书级或票外。
- **P1-1（放行硬条件）**：registry G6 翻 done→locks 终态→重跑全量 verify 真 EXIT=0（预期 open 15→14、locks 351、170/1744、指纹门 187/1789/5411）→单提交，封「已验证态≠提交态」缝。
- **P1-2（staging/rename 完整性）**：显式列入 14 对 rename（旧删+新增 28 路径）、6 新探针（受锁，缺失则 clone 后 check-locks 必红）、manifest、registry、relay、B~H 面、证据件（三桶①）；add 链禁 2>/dev/null；提交后 `git show --stat -M` 核 12×R100+98%/92% 清单与 `git status` 未跟踪面归零。
- **P2-1**：G11 债登记成立，范围精化为实测表（11/13 有偏差：−6/−27/−1/−3/−1/−1/−1/−1/−1/−1/−1；2 件吻合），并并入 §5.1 计数差（1790/5417→1789/5411，G2 删例所致，走豁免/重冻结口径）。
- **N（无行动）**：W1/N1/N2/N3/N4/N5/N6/e2e 逐项处置充分（见上表 16-22）；§3.1 单向、板值与复锁时间线均已独立复证。

FINDINGS: P0=0 P1=2 P2=1 N=8 VERDICT=GO_WITH_CONDITIONS
MODEL-SELF: model-field:8ad55776-2296-4f1a-bc46-05755c8f1300/deepseek-flash$max
LEDGER-CLAIM: role=ops-adjudicator executor=model-field:8ad55776-2296-4f1a-bc46-05755c8f1300/deepseek-flash$max units=1 outcome=done
