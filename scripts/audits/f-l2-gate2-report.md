# LOOP F-L2 门二终审报告(只读;零改动、零 git 写、零 npm)

> 独立终审子代理产出全文(主控代为落盘;原回复即本档,零改写)。

## ① 处置核对(门一 11 findings + 主控裁决 vs 终态实物)

| 项 | 裁决 | 终态实物 | 判定 |
|---|---|---|---|
| B-1 e2e 29 未跑 | 归主控收口面 | 终态无 e2e 证据(预期——verify 管线不含 e2e);放行后主控必跑 | PASS(收口前置条件) |
| W-1 fit 回退分支 | 备案 | 保留 `el.clientWidth \|\| rect.width`(lineage-viewport.ts:152),备案未改 | PASS |
| W-2 同帧双 gBCR | 回炉落地 | helper 签名 `(el, rect?)`(lineage-viewport.ts:67-71,`rect ?? el.getBoundingClientRect()`);wheel 单次 gBCR(L171-172 rect 同源供 left 与分母);⑤ 用例锁(test:79-86)+mutw2 变异红证 | PASS |
| W-3/W-4/W-5/W-6 | 备案 | 终态未动(pan onMove 单调 L212;B 断言同探针;④同测试)——备案口径 | PASS |
| N-1 探针 wheel 置位 | 备案+自洽 | 探针注释实证说明(diff f-l2-gate1-r2.diff:93-96) | PASS |
| N-2 数据漂移 | 主控消解 | 探针 tmpdir 副本 `synapse-f-l2-fixverify` 先 rm 再 cp(diff:44-53)——环境互斥 | PASS |
| N-3 守卫四组合 | 回炉落地 | ③c 用例(test:65-68,stubMeasured(800,0))+mutn3 单红实证 | PASS |
| N-4 挂载早期时序 | 备案(与修前等同) | 未动 | PASS |
| **证据撞名修复** | 主控 git checkout 恢复 | `f-l2-closeout-verify.raw.txt` 已跟踪、与 HEAD 零 diff、3115 行、内容=排查票收口 verify;新日志在 `f-l2-fix-closeout-verify.raw.txt`(50 行)与 `-r2`(48 行);impl.report:88 引用已同步 | **PASS** |
| r1 材料 diff 撞名 hunk | 主控亲裁净版重生成 | f-l2-gate1-r2.diff 仅三文件(197+56+87 行),无 3078 deletions hunk | PASS |

## ② 母本符合度

- **量测口径表三行**:fit=clientWidth/clientHeight 直取+守卫(lineage-viewport.ts:152-155);wheel=根框差×比值(L171-174);pan=dx×比值(L212-213)——三消费点全落地,与票面 §0 表逐行吻合(签名 rect 可选参=回炉令状授权,已在 impl.report 备案)。**PASS**
- **helper 规约**:比值=clientWidth/gBCR.width、≤0→1(L67-71);fitViewport 数学体零改(仅头注+两行);明确不做清单四项均未越界。**PASS**
- **git status 改动面**:1 M(lineage-viewport.ts)+2 新文件(f-l2-fix-verify.mjs、lineage-viewport-scale.test.ts,intent-to-add=主控生成 diff 痕迹)+本票 f-l2-* untracked 材料;受锁既有面(tests 既有件/src/shared/tickets/locks/docs)零 M;f1-out/* 为他票 untracked 残留(报告自裁声明未动,实物吻合)。**PASS**
- 一处记录:报告文件清单写「186→223 行」为**首轮**数字,终态 232 行(回炉 +9 未更新摘要)——备案级偏差,不影响红线。

## ③ 宪法红线终审

- **分层**:lineage-viewport.ts 仅 import react/@shared 类型/./lineage-layout,无 Node/Electron/绝对路径;探针在 scripts 域合法。PASS
- **行数**:lineage-viewport.ts=232 行(<<500);测试 87;探针 197。PASS
- **UTF-8**:node 读四改动文件 FFFD=0。PASS
- **TDD 证据链四档**:
  - 首红:first-red.raw.txt(4 tests|4 failed,rootToLocalScale is not a function×4)+114 files/956 基线零回归+EXIT=1。
  - 绿:green.raw.txt(115/961 passed)+EXIT=0;961=956+5。
  - 变异红+回炉重验:M1 首轮 ①④红;M2 首轮 ①④红;r2 重验 M1/M2 均 ①④⑤ 红;自裁 mutn3(③c 单红)/mutw2(⑤ 单红)各定点 1 红——「每个测试必须能失败一次」对 ③c/⑤ 成立。
  - 还原 diff 空:**r2 四变异日志全有 RESTORED+RESTORE-DIFF-EMPTY 回显**;**首轮 M1/M2 日志无该回显**(尾部仅 EXIT=1)——报告红证索引称首轮亦有回显,与实物不符;还原事实由后续 green-r2 963 全绿(变异若残留不可能绿)+工作树终态源码干净间接闭环。记 N 级证据面瑕疵,不阻断。
  - 963 链:green-r2.raw.txt(963 passed,FULLTEST-EXIT=0)=961+③c+⑤。**PASS**(带瑕疵记录)

## ④ 机器面核对

- 报告数字 vs 证据:963=961+③c+⑤ ✓;961=956+5 ✓。
- 探针:probe.raw.txt「PASS(14/14)」「EXIT=0」+fix-verify.json results=14 pass/0 fail;large 档 1532.5≤1683(修前溢出 211.75px 场景闭环);k 三档 1.5264/1.3115/1.0552 随 clientWidth 正比;D dtx=80.03≈100×0.8003。✓
- verify 唯一红=locks 结构性:fix-closeout-verify-r2.raw.txt 恰三新路径,VERIFY-EXIT=1;补全 LINT/TYPECHECK/BUILD EXIT=0;locks/manifest.json grep 三路径=0(未登记,口径一致)。✓
- 台账:audit0-findings.md F-L2=「已定位待开票」未翻=主控收口面,预期。✓ **PASS**
- precheck 基线交叉:precheck.json 三档 transform 逐位恒同 k=1.3873371819382787——印证实现报告自裁「首载 fit 未走 resetFit」的实证逻辑。✓

## ⑤ 成本账本(转录主控口径,无独立原始账本可核)

实现者 2.44M tokens/43 工具/11.4m;回炉代理(新代理承接)1.12M/32 工具/7.2m;门一 deepseek 2 调(r1+r2);门二=本代理(只读,零改动)。

---

## 总评:**放行收口**

三消费点修复母本符合、W-2/N-3 回炉完整落地、TDD 链四档闭合、探针 14/14 真机实证修复主断言、唯一红为结构性预期。遗留(均不阻断):

1. **主控收口必做**:e2e 29 全跑(B-1);locks:generate+apply(三新路径入册)+[locked-change] 提交;INV-43 登记 docs/invariants.md;台账 F-L2 翻已闭环。
2. **证据面瑕疵(备案勘注,不回炉)**:首轮 M1/M2 变异日志缺 RESTORE-DIFF-EMPTY 回显(还原由 963 绿+干净终态间接闭环);报告摘要「223 行」过期(终态 232)。
3. **备案遗留**:W-1/W-3/W-4/W-5/W-6/N-4 在档,触发再启。
4. **staging 提醒**:scripts/audits 下 f1-out/* 他票 untracked 残留+本票大量 untracked 材料——收口 add 显式列文件,防误扫;两新文件现为 intent-to-add 状态,提交正常 add 即可。
