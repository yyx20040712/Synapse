[routing]: run=20260910001355-bsov source=kimi-main model=kimi-k3 switches=0 usage=in=2248,out=1865 latency=51093ms (by ds-call.mjs 链)

## 逐项判定

**新破坏1（返回类型）— 销项。** `Get-ChildItem -File`/`Get-Item` 产出 `FileInfo`，`Sort-Object` 不改元素类型；消费点 `$_.IsReadOnly`、`$f.FullName`（lock-protected.ps1 行 18/22/24）均成立。无字符串化风险。

**新破坏2（Sort-Object -Unique）— 销项。** 函数末行 `$files | Sort-Object -Property FullName -Unique` 在场，去重基于 FullName 属性而非默认字符串化，语义正确。

**N3（lock 侧 dot-source）— 销项。** `. (Join-Path $PSScriptRoot 'get-protected-files.ps1')` 在场；三处 `Get-ProtectedFiles` 调用（解锁/重算/锁定）集合一致；`$root` 在 `$rel` 截断与 `$locksDir` 两处消费，无死变量。

**新破坏3（mjs baseline）— 销项。** `join(root, 'scripts', 'dup-constants.baseline.json')` 显式登记，附 F-LINT-02 注释；`.json` 不被 scripts walk（`.mjs|.ps1`）重复收集，Set 去重兜底。

**W2（verify 连续序）— 有条件销项。** 索引行号单调递增（4114→4146→8180→8181→8221），末 6 行含 `✓ built in 1.76s` 与 `exit=0`，test(1562)→build 串联于 locks(312 一致)之后，链序合规。但 4146–8180 段与全链命令行 4114 的原文我本轮未见实体，仅有索引声明——连续性采信"在档可抽查"承诺，建议存档备查，不作阻断。

## 非阻断观察（不要求本轮处置）

1. **mjs `walk()` 实现未出示**：`walk(root, /\.test\.tsx?$/)` 是否排除 `node_modules` 无证据；ps1 侧靠 `notmatch` 事后过滤。locks:check 312 一致表明当前无分歧，但 node_modules 若未来引入 `.test.ts` 文件将触发跨语言不对称——建议后续补充 walk 源码。
2. **排序口径跨语言差异**：ps1 `Sort-Object`（文化感知、大小写不敏感）vs mjs `.sort()`（码点序）。manifest 顺序与 mjs 序可能不一致；locks:check 通过说明比对非顺序敏感，无现实缺陷。
3. **静默 catch**：lock-protected.ps1 解锁步 `try{}catch{}` 吞错。对后续重算 hash 无害（只读可读），锁定步失败会因 `EA=Stop` 显式报错，静默面可控。

**结论：五项全部销项，无阻断。** F-LOCK-01 门一通过，W2 附"原始日志存档备查"条件。