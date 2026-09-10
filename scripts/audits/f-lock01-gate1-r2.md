[routing]: run=20260910001157-pcu3 source=kimi-main model=kimi-k3 switches=0 usage=in=1659,out=1691 latency=61179ms (by ds-call.mjs 链)

## 定点复核结论

**W1：ADDRESSED（有保留）**
diff 显示 `$root = Split-Path -Parent $PSScriptRoot` 及全部内联收集逻辑已删除，改为 dot-source `get-protected-files.ps1` 调 `Get-ProtectedFiles`。死变量确已消除。保留见下"新破坏 1"。

**W2：部分可信，证据仍不充分**
乱序成因解释（grep 分批 append）合理，可接受。但本次出示的尾段存在同样的证明力缺陷：`✓ built in 1.76s` 之后**直接**是 `exit=0`，中间**没有 vitest 结果行、没有 locks:verify 输出**。若全链为 `build && test && locks:verify; echo exit=$?`，则 vitest 与 locks 步骤的正常输出应出现在 exit 行之前。当前 tail 只能证明 build 成功且 `exit=$?` 取到 0，无法排除 exit=0 仅反映 build 一步（即 test/locks 未跑或其输出又被另行截取）。**“回炉后重跑全链 exit=0”申明未被出示证据支撑**。"首跑 raw 末行同为 exit=0、中段在档"亦未出示。判：成因解释 ADDRESSED，全链通过证据 NOT ADDRESSED（需要含 vitest 摘要与 locks 输出的连续尾段）。

**N3：ADDRESSED（注释层面）**
check-locks.mjs:25 注释已改指 `get-protected-files.ps1`。但注释断言"lock/unlock 两脚本 dot-source 共用"——diff 只出示了 unlock 一侧，**lock-protected.ps1 是否同样 dot-source 未出示证据**。若 lock 侧仍内联收集，则"单一来源"只收敛了一半，跨脚本发散风险依旧。不确定，需 lock-protected.ps1 现状佐证。

## 新破坏扫描

1. **静默失败面（高）**：`Get-ProtectedFiles | ForEach-Object { try { $_.IsReadOnly = $false; ... } catch {} }`。若 `Get-ProtectedFiles` 返回字符串路径而非 FileInfo，属性赋值抛错被空 catch 吞掉，脚本仍以退出码 0 报"已解锁 N 个文件"或"0 个文件"，无任何失败信号。`get-protected-files.ps1` 全文未出示，返回类型不确定——**必须核验**。
2. **去重丢失（低）**：原 `Sort-Object -Property FullName -Unique` 被删。若 `Get-ProtectedFiles` 内部收集有重叠（如 scripts 同时被通配与枚举命中），`$unlocked` 计数虚高，仅外观问题。
3. **跨语言一致性断言未验**：unlock 注释称 `Get-ProtectedFiles` 含 `dup-constants.baseline.json`；check-locks.mjs 的 `protectedFiles()` diff 只展示到 tests 行，无法确认 mjs 侧同样含该 baseline。两侧清单一致性（票面核心）在本轮证据中仍不可验。
4. dot-source 目标文件缺失时 `$ErrorActionPreference='Stop'` 会硬失败，可接受，无新问题。

**总体**：W1/N3 代码层面成立；W2 全链通过证据不足；新破坏 1（返回类型+静默 catch）为放行阻塞项，需出示 `get-protected-files.ps1` 与 lock-protected.ps1 现状后方可销项。