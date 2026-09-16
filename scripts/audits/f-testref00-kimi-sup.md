[routing]: run=20260916013833-kog5 source=kimi-main model=kimi-k3 role=gate1-reviewer@9549e465 cfg=bec09005e3ac switches=0 usage=in=24918,out=7745 latency=246592ms (by ds-call-v2 链)

# 门一 Kimi 席位全量独立审——F-TESTREF-00 终态（ff96cb1f02）

## 逐条发现

**[B-1] 新文件分支缺失 ONLY_FORBIDDEN 判定——it.only/describe.only 经新建测试文件绕过门**
证据：scripts/check-test-surface.mjs judge() `if (!b && c)` 分支（NEW_FILE 段）只查 conditional/hardSkipSites 与 markers 含 'skip' 后 `continue`；only 检查（`cs.markers.includes('only')` → ONLY_FORBIDDEN）仅存在于其后的两态比对分支，新文件永不抵达。
理由：设计定稿 §5-5「only（含传播）恒红」字面违背；攻击面真实——新建测试文件内 it.only 走 NEW delta 绿，vitest only 聚焦语义致 CI 全仓测试静默缩水；M4/M9 变异均改既有文件故未暴露。

**[W-1] 既有用例加 skip 双报 MISSING_CASE+SKIP_ADDED（设计 B2 预期单报 SKIP_ADDED）**
证据：check-test-surface.mjs 上半场——基线无 skip 签名在当前无配对且 bcs.markers 不含 skip 不走激活分支 → MISSING_CASE；下半场同一当前 skip 签名经 activatable（空）落空 → SKIP_ADDED。变异矩阵 M1-M10 无「既有用例加 skip」支（M6 系新 key 场景单报）。
理由：双红 exit 1 不漏报，但输出语义偏离 N3/B2 单类目预期，排障噪音；豁免处置时 MISSING_CASE 条目可能误配。

**[W-2] expect 别名 import 未纳入 importAliasCheck——新文件断言面可零指纹**
证据：extract.mjs importAliasCheck 仅检测 THREE_API（it/test/describe）；expect 收集要求 `ts.isIdentifier(node.expression) && text === 'expect'`。`import { expect as exp } from 'vitest'` 后 exp(...) 不计断言。
理由：存量文件触发 MISSING_ASSERT 红（有兜底），但新文件以别名 expect 书写则 assertions=[] 以 NEW delta 绿入面，待 baseline 再生成时 0 断言入基线，后续删改无指纹；防御深度缺口，依赖 baseline 人审兜底（不确定：人审能否识别，标不确定）。

**[N-1] 豁免 stale 计数可失真**
证据：check-test-surface.mjs `stale: entries.length - exemptHitKeys.size`——同一豁免条目多次命中只记一个 key，同条目跨 kind 命中记多 key，可致 stale 为负或虚高。
理由：纯报告面，不影响判定。

## 审项总览

- A 母本符合度：除 B-1（§5-5 违背）外，§2/§3 三态 skip/each/expect 单元/§5 判定+exit code/§6 豁免/§7 挂载+范围闸均符合，含 W1-W9 裁决落位。
- B 宪法红线：零新依赖（typescript 系既有 devDep，package.json diff 无依赖段变更）/386+477 行均 ≤500/受锁声明在档/无占位字样；UTF-8/LF/BOM 面 diff 包内不可验，标不确定。
- C 门绕过通道：见 B-1/W-2；范围闸 diff-tree -m/merge-base 兜底/结尾锚已按 R1 修复落位；基线篡改面已被 protectedFiles 双侧登记闭合（diff 实证 check-locks.mjs+ps1）；签名计数逻辑抽验未发现碰撞构造。
- D 证据诚实性：stats 字段与 statsOf 输出一致，skipSiteCount=15=conditional 15+hard 0 自洽，23910 行与回炉段一致；B1b 首测 EXIT=0 测量误差已主动申报更正，诚实性无瑕疵；基线数据件未附无法全量对拍（不确定，按简报口径接受）。
- E 自裁申报 vs 实物：§6 十项+§8 回炉段逐项与 diff 对拍一致（双桶/哨兵 AST/namespace 红/新文件桶增红均在码）。

统计：B=1 W=2 N=1

总评：**需修复**。B-1 为设计硬条款「only 恒红」在新文件场景的确定性逃逸通道，修补面小（NEW_FILE 分支补 only 检查+一支变异红证），修后可收口。

FINDINGS: B=1 W=2 N=1 VERDICT=FAIL