[routing]: run=20260910000654-gly7 source=kimi-main model=kimi-k3 switches=0 usage=in=7644,out=4477 latency=145424ms (by ds-call.mjs 链)

# F-LOCK-01 门一对抗深审结论

## B（阻断）

无。红证链（prered 311→310→baseline True→locks:check 311 交叉对数；mutation 变异 311/True→还原 312/False→apply True）逻辑自洽且计数全链吻合，diff 证实集合逐字迁移与两脚本 dot-source 落地。

## W（警告）

**W1｜unlock-protected.ps1 残留死变量 `$root`（死代码，违反工单 B 项自查）**
diff 显示 unlock 第 5 行 `$root = Split-Path -Parent $PSScriptRoot` 保留，但收集面删净后该文件剩余全部代码（dot-source→`$unlocked=0`→`Get-ProtectedFiles | ForEach`→Write-Host，全件 15 行）无任何 `$root` 消费。lock-protected.ps1 的 `$root` 因后续 manifest 写入段不在 diff 面内，是否同死**不确定**。实现报告 §2 称「其余逻辑零改动」恰成此残留成因——删除面未做引用清零。

**W2｜验收④「verify 全链 exit=0」包内证据不闭合**
票面验收=「locks:check 311+verify 全链 exit=0」。包内 verify-tail 仅有一个 exit=0，且位于 build 与测试输出**之间**（次序：built→exit=0→160 passed→locks 312），更像某子步骤的退出码；末行是 `locks 检查通过：312` 而非 exit=0。报告声称的权威证据 f-lock01-verify.raw.txt（末行追加 exit=$?）、f-lock01-postred.raw.txt、f-lock01-bom.raw.txt **均不在审计包内**，作为隔离一审无法核实（明确不确定）。locks 312 与测试 160/1562 有 tail 直证，可信；缺的是全链终态一锤。

## N（提示）

**N1｜dot-source 作用域覆盖**：共享件顶层 `$root = Split-Path -Parent $PSScriptRoot`（get-protected-files.ps1:7）在 dot-source 语义下覆盖调用者同名变量。当前同值无害，报告 §7 已自申报，属已知契约面。

**N2｜变异方式替代成立**：自裁项 1（改名 `'__f-lock01-mutation__.nonexistent'` 替代注释行）因 Test-Path 守卫等价于移除条目，红证语义未削弱；restore 自查先出「count: 0」伪影后以 grep -F 修正段（行 6/19 双命中）闭环，诚实处理，不降级。

**N3｜mjs 侧头注互指未随迁**：共享件头注已单向指 check-locks.mjs（「修改任一侧需同步另一侧」），但 check-locks.mjs 零改动，其头注若仍写「与 lock-protected.ps1 保持一致」则指向已悬空（收集逻辑已迁出 lock）。mjs 内容不在包内，**不确定**，建议下票顺手核验。

**N4｜存量行为沿用非新增**：根 walk `-Include *.test.ts` 先遍历 node_modules 等再 Where 过滤（性能面）、cfg Test-Path 静默跳过缺失件，均为逐字迁移的存量语义，非本票引入。

**N5｜311→312 delta 双重可解释**：新件入 scripts/*.ps1 walk（+1），且 check-locks.mjs 独立算出 312 与 manifest 一致=跨语言集合对齐的最强旁证。

## 统计

B=0 ｜ W=2 ｜ N=5

## 总评

**放行（附条件）**：实现本体与红证链无缺陷；W1 一行死变量建议顺手删除，W2 需实现者补出 verify.raw 末行 exit=0 原文（或包外已有则指向路径）即可销项，均不构成回炉。