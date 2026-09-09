[routing]: run=20260909130258-4spa source=deepseek model=deepseek-v4-flash switches=0 usage=in=5380,out=19903 latency=181366ms (by ds-call.mjs 链)

B-1〔C-1 处置申报未兑现〕`check-dup-constants.mjs` baseline 解析 catch 块：仅 `console.error(...)` 后 `entries = []`。处置表与头注宣称“损坏 exit=1 不放行”，但 catch 内无 `process.exit/exitCode`、无 throw、返回对象也无 corrupt 标志。损坏时若存量组已全收敛（源码侧删除），`newRed=[]`，独立 CLI 与 check-quality 挂点均 exit 0——损坏只留 stderr 一行告警，仍可被 CI 放行。当前“会红”仅因 6 组存量仍在源码中、被事故性转成 newRed 的间接效果，不是实现承诺的硬拦截。

W-1〔bigint 归一与头注“天然排除”不符〕`normalizeNumber(text)=String(Number(text))`；`literalOf` 对 NumericLiteral 不剔后缀。TS AST 中 `1n` 以 NumericLiteral 文本（`…n`）表示（我对 TS 无独立 BigIntLiteral SyntaxKind 较有把握，但未实机验证，不确定度中）。若如此，`Number('1n')→NaN→'NaN'`：`const A=1n` 与 `const A=2n` 跨文件会被归成同一 value='NaN’ 误红，而设计裁决是 bigint 排除。建议 `/[nN]$/.test(n.text)` 时返回 null。

W-2〔测试排除规则自相矛盾〕`collectDeclarations` walk filter：排 `.test.ts` 却未排 `.spec.ts`，且头注/边界矩阵均未申报测试排除规则。同性质测试夹具一个豁免、一个可入红层，可能使测试内同名同值常量产生误报。

W-3〔“独立跑看全量”提示不可达〕`clipped` 截断文案为“lint:dup-constants 独立跑看全量”，但 CLI 入口的 details 同样经 `clipped(DETAIL_LIMIT=20)`；`DUP_CONSTANTS_B2` 只放 B-2 清单。formatDupDetails 无任何免截断出口，提示具有误导性。

W-4〔收集范围无作用域限定，边界未申报〕`collectDeclarations` 的 `visit` 经 `ts.forEachChild` 遍历整棵 AST，函数/块级局部 const 亦被收为全局“声明”。两文件各自函数内 `const INITIAL_TAB='overview'` 这类互不相关局部常量会按红层拦截，但无需共享单源。头注判据未声明“仅顶层/模块级”，行为比设计面宽，属潜在误报源。

N-1〔baseline 实档及回归红证未随包〕终态 diff 仅含 check-quality/package.json/check-locks.mjs/lock-protected.ps1 四处；`scripts/dup-constants.baseline.json` 内容（6 组存量指纹）与门一提到的 `f-lint02-red-paren.raw.txt` 均未附，无法核实“双处登记”客体存在、存量指纹匹配及括号 sentinel 红证在档。缺失时因 `existsSync=false` 会让存量组全变 newRed，属 fail-closed，但“收敛子票 6 组”的基线账无法对起。

N-2〔包外口径无法由代码核销〕锁文件 304/230 行、verify 编排 A10 竞态排队、成本账本均为主控声明，本包无对应代码/日志证据，不置可否。

总评：B——双处登记、剥壳、截断单源、越证删词均有代码佐证，但 C-1“损坏 exit=1 防绕过加固”未独立实现，仅靠存量变 newRed 的事故路径兜底，红证不成立；另有 bigint 归一、.spec 漏排、局部 const 入红三个可致误报的边界点，建议补修并附 baseline 实档后再核销。