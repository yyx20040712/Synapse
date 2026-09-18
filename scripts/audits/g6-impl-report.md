# F-GEOM-01-G6 实现报告——M3 目录化 anchors/ 迁移（零行为纯迁移）

## 0. 开工技能清点（随产物留存）
用：test-driven-development（M1/M2）；verification-before-completion（七关卡+verify 亲验）。不用：js/e2e-testing-patterns（零行为票无新测试面，e2e 归 G11）；git-workflow-and-versioning（本票禁 git）；subagent-driven-development（单一调用者）。systematic-debugging 备而未启。绑定档位 GLM5.3flash $max——环境无 model 参数=已知限制，按绑定档位声明执行。

## ① 交付清单（按单元；本票禁 git=零提交，收口归主控）
- U1 迁移本体：mkdir anchors/ + mv 14 件（wc 实测 3121 行=简报 A 段逐件一致）。
- U2 非受锁改写：B 7 行+C 35 处/17 文件+D 1 处+G registry 10 行——g6-rewrite.mjs phase=src（53 行/21 文件 EXIT=0）。
- U3 受锁改写与锁链：unlock→E 34 行/17 件+F check-quality:99+H e2e 注释（36 行/19 文件 EXIT=0）→generate+apply 一次（manifest 348→351=+3 自产探针，"348+N"预期成立）。
- U4 证据链（下节全项）。

## ② 验证证据（raw 全在 scripts/audits/g6-*.log，只引文件+EXIT）
- 七关卡（g6-verify7.log）：quality:check/test-surface:check/tickets:check/locks:check/lint/typecheck/test/build 全 GATE_EXIT=0；test=170 文件/1744 用例（=基线 1744）。
- 全量 verify（g6-verify-final.log）：VERIFY_EXIT=0。
- 变异红证（g6-mutation.log）：M1=AnnotationLayer:42 回退→TS2307@(42,104) M1_RED_EXIT=2→还原 M1_DIFF_EMPTY=YES→M1_GREEN_EXIT=0；M2=anchor-locate.test:15 回退→Failed to resolve M2_RED_EXIT=1→M2_RESTORE_EXIT=0→M2_GREEN_EXIT=0→已复锁。
- 构建哈希恒等（g6-build-hash.log）：index-D3egZtl2.js/index-BfpEygSE.css 与 G5 同名（内容哈希=字节恒等）；raw 1,402,437/59,923 字节；vite 摘要 1,392.72 kB/52.49 kB 与 G5 逐字一致（g6-verify-final.log 尾）。
- 锚定回归网（g6-anchored-net.log）：18 件/211 用例绿，ANCHORED_NET_EXIT=0（含 5 零改写件）。
- §3.1 单向核验（g6-oneway.log）：state→anchors=0/time↔anchors=0/anchors→state=3（:88/:89/:26）PASS；旧径残留 0。
- 迁移前独立复核（g6-recon3.log）：C 35/35、D 1/1、E 34/34、域内互引 25/25（行级=说明符级双计）、清单外命中 0。

## ③ 交付面对账（数字均脚本实测）
A=14/3121 ✓；B=7 ✓；C=35/17 ✓；D=1 ✓；E=34/17（含 2 vi.mock 行）✓；F=1（:87 注释零改写）✓；G=10（status 零触碰——:297 仍 open，翻 done 归主控）✓；H=1（行号不变）✓；域内互引 25 零改写 ✓；e2e 未跑（归 G11）✓；三项票面口径勘正按简报②执行。

## ④ 自裁申报
1. M1_RESTORE_EXIT 首捕为还原链后 echo 的 echo（弱捕获）——补跑 cp→diff 还原等价链再捕 =0（双行在档）；实质证据 M1_DIFF_EMPTY/M1_GREEN_EXIT 首轮已落 log。M2 为 diff 链直捕，无此问题。
2. 简报③-4 kB 数（1,392.72/52.49）=electron-vite 摘要显示值（终局 verify 复现逐字一致）；raw 字节同档（g6-build-hash.log 含 sha256 前 16 位）。
3. 自产探针 3 件（g6-recon3/g6-rewrite/g6-oneway .mjs）随收口 generate 登记（348→351）。
4. 字面违约自首：终验时执行了一次 `git status --porcelain`（只读工作区对账、零写入零变更）——票面字面为"禁任何 git 命令"，该次调用虽无 stage/commit/配置面影响，仍属字面越界，如实申报。
除上述外无超票面改动。

## 停工申报
无。

MODEL-SELF: model-field:account:bigmodel-individual-coding-plan/GLM-5.3$max
LEDGER-CLAIM: role=ops-executor executor=model-field:account:bigmodel-individual-coding-plan/GLM-5.3$max units=4 outcome=done
