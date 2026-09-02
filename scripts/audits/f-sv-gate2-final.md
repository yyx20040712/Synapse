# F-SV 门二终审报告（二审实证位）

> 审查对象：单票修票 F-SV 工作区未提交态（4 文件）。只读+亲跑验证，零源码/测试/受锁面改动。
> 档位申报：票面要求=deepseek v4 flash 优先；本环境派发承载如实申报——子代理无法自证承载
> 模型档位，以派发指令申报为准记录在案（不作为审查结论的影响因子，证据全部机器面/在档可复核）。
> 环境：volta node v24.20.0（亲验 `node -v`）；verify 亲跑档=scripts/audits/f-sv-gate2-verify.raw.txt。

## 清单一：门一处置核对（防「说了没改」）

### W1（RED「Errors 1 error」书面解释）——**复核成立，闭环**

实现报告 §八 的因果链逐帧对 raw 与源码亲验，全部吻合：

| 声称 | 亲验证据 | 结论 |
| --- | --- | --- |
| store:69:24=旧 save 的 invoke await 帧 | `git show HEAD:…settings.store.ts` 第 69 行=`api.settings.set(patch as …)`（旧 save try 体 63-76 直发无排队） | ✓ |
| test:171:52=旧文本用例② Promise.reject 创建点 | f-sv-red.raw.txt:3793-3796 上下文直接展示 `171| .mockImplementationOnce(() => Promise.reject(new Error('写盘失败…` | ✓ |
| test:174:40=pSave1 创建点 | 同 raw:3797 `173| const useStore = await loadStore…`→堆栈末帧 174=pSave1；失败详情区（3754）另示 `175| const pSave2` 佐证 174=pSave1 | ✓ |
| :177:17 断言失败**早于** rejects handler 挂接 | raw:3753-3759 直接展示 `177| expect(set).toHaveBeenCalledTimes(1)`（失败行）与 `179| await expect(pSave1).rejects`（挂接行）——用例②中止时 pSave1 零处理者悬挂 | ✓ |
| 三红=各自断言产生（154:17/177:17/208:35），error=伴生 | raw:3741（用例① :154:17）/3753（② :177:17）/3764+3770（③ :208:35）三断言行号逐一在档；unhandledRejection 上报滞后→latest test 注记③（raw:3807-3809 原文自证非因果归属） | ✓ |
| GREEN/M1/M2/verify 四件零 Errors | 亲 grep 四件「Errors\|Unhandled」计数均=0；附带申报的 r1fail 同机制 1 error 亦亲验在档（:3705/:3710） | ✓ |

定性正确：RED 的红由三断言产生，error=被中止用例②悬挂 pSave1 的异步伴生（来源已定死，非既有噪声），
不污染红证「正确红」定性。**存疑 2（W1 基线）随之消解**——来源定死为新用例②自身悬挂，无需
「RED 前全量基线」佐证。

### W2（verify 首跑 typecheck 红未留档）——按门一裁定处置=记档不补做 ✓

指纹（TS2741 'uiScale' missing ×5，test:156/161/186/204/206，exit=2）已逐字记录于实现报告 §四；
门一定 W(轻) 明示「不要求补做」，主控终审指令同口径。双档在案，处置一致。

### N1（INV-03 先例列）——主控已收口补齐，三列一致 ✓

现态 diff（亲取）：INV-03 行先例列含「+ settings save 链式全序（同通道写全序——null 哨兵空闲
直发/忙时排队/链永不断/inflight 归零才复位，F-SV）」。三列核对：
- 声明列：「同通道写全序（2026-09-02 F-SV 写方向同族第三变体）…与 undo 身份寻址/addAnnotation
  按身份寻址并列」✓
- 先例列：settings save 链式全序席位已加 ✓（门一时缺失，现态补齐——门一材料包内嵌 diff 与
  现态 diff 对照可证此增量）
- 锚定列：「F-SV 同通道写全序三用例（排队时序/链不断/saving 不闪断，always-active）」✓
列间自洽。收口侧配套：invariants 哈希随补齐更新（3438ec18→337e02cf）+manifest 重 apply
（generatedAt 13:40:28），locks:check=239 一致亲验。

### N2/N3（链深≥3 无覆盖/用例②载荷对称性）——知晓项，无动作，在案 ✓

### 存疑 1（行数）——亲测闭环

`wc -l`：store=**119**、test=**215**，与实现报告一致（门一审查清单预填 138/216 无依据，门一
自己已作此结论，终审实测复核）。

## 清单二：母本符合度（票面 §一 时序表四格 vs 实现）

| 格 | 票面预期 | 实现（settings.store.ts:95-112） | 测试锚 | 判 |
| --- | --- | --- | --- | --- |
| 1 | save₂ 排队，save₁ settle 后才发，终态=save₂ 值 | `saveChain===null ? doSave : saveChain.then(()=>doSave)`（:99-100） | 用例①（settle 前 called 1/settle 后恰 2/NthCalledWith(2,two)/终态 two@x.y）+M1 红证 | ✓ |
| 2 | 链不断，save₁ 错误上抛其调用方 | `saveChain = run.then(双 noop)`（:101）+`await run`（:103）各自上抛 | 用例②（rejects.toThrow('写盘失败') 排队者照常发出） | ✓ |
| 3 | 单 save 直发行为零变（验收线=1103 既有全绿） | null 哨兵空闲直发（invoke 同步即发） | verify 亲跑 1106=1103 既有+3 新全绿 | ✓ |
| 4 | save 期间 load 版本计数零变 | load 路径 diff 零触（:87-93 原样） | INV-03 既有四用例全绿 | ✓ |

**自裁①（null 哨兵偏离票面字面「初始 resolved」）链路完整**：r1 实证在档（格2 TypeError
`resolveSave is not a function`——票面字面形态使首 invoke 延一微任务，击红受锁合约）→以票面
自身验收线优先改 null 哨兵→主控预裁 1 复核认可（「自裁成立，且更优：空闲路径零 microtask
开销」）→门一正面核验认可（「票面验收线优先的合法取舍」）→终审逐行核 diff：直发分支与旧代码
在单 save 上逐 tick 等价。**同意**——语义为票面形态超集（仅少一跳延迟）。

**自裁②（用例②失败桩改可控 reject）链路完整**：r1 实证即弃 reject 在 flush 下整链排干致排队
断言失义→改 rejectSet1 受控（与用例①同构）→M1 变异补证改写后用例②非恒真（2 failed，指纹同
RED「called 2 times」）→主控预裁 2 认可→门一认可。**同意**。一处表述精度如实记档（不构成缺陷）：
主控预裁 2 写「直 throw 桩在 **null 哨兵形态下**不能产生可控窗」，而 r1 期实现实为票面字面
形态（初始 resolved）；两者结论同向（即弃/直 throw 均不可控），不影响裁定。

## 清单三：宪法红线终审

- **受锁流程**：unlock→改 test+invariants→apply（f-sv-locks-apply.raw.txt exit=0）→二次
  unlock（补 uiScale）→apply2（f-sv-locks-apply2.raw.txt exit=0）→主控 N1 补齐+gen 脚本
  即时登记后再 apply——现 manifest=**239**（238+f-sv-gen-gate1-brief.mjs），locks:check=239
  一致 exit=0 **亲验**。摩擦根治纪律（gen 即时登记）首次执行，manifest diff 四处
  （timestamp+invariants 哈希+新增路径+test 哈希）与现态逐一吻合。
- **always-active**：新 describe 直接 `describe(...)`（test:131），不经 guardedDescribe，头注
  申明（:122-130）✓。既有 6 用例断言文本零改（diff 仅尾追加+import 行补 describe）✓。
- **行数**：store 119 / test 215，均 ≤500，实测在案 ✓。
- **UTF-8/中文**：三改动文件亲读无乱码；verify quality 关卡「无乱码」绿 ✓。
- **禁新依赖**：package.json/package-lock.json 零 diff（git diff --name-only 亲验空）✓。
- **TODO/FIXME/placeholder**：三改动文件 grep -c 均 0（严格口径亲跑，exit=1=零命中）✓。
- **变异还原安全**：cp 备份→变异→测→还原；**cmp -s 备份 vs 现态 store 字节级 IDENTICAL
  亲验**（强于 raw 转述）；未用 git checkout ✓。
- **verify 期间禁动受锁面**：实现报告 §五 自述解锁窗内完成；无法从时间戳独立复核全程窗口
  （如实记录：raw 无逐秒时间线），但终态锁一致性+全绿已闭合风险面。

## 清单四：机器面核对（亲跑，不轻信转述）

| 项 | 预期 | 实测 | 判 |
| --- | --- | --- | --- |
| `npm run verify` 真退出码 | 0 | **exit=0**（quality「无占位/无乱码/无跨域」+tickets+locks 239+lint+typecheck+test+build 全过；落档 f-sv-gate2-verify.raw.txt） | ✓ |
| test 规模 | 127 文件 1106 用例（1103+3） | **127 文件 / 1106 passed (1106)**（gate2 raw :3745-3746） | ✓ |
| `npm run locks:check` | 239（238+gen 即时登记） | **239 一致，exit=0** | ✓ |
| raw 对照（red/green/m1/m2/apply×2） | 与报告 §四 表一致 | red=3F/1103P/Errors1/exit1；green=127/1106/exit0；m1=2F/1104P/exit1；m2=1F/1105P/exit1；apply×2 exit=0——逐件 tail 亲验 | ✓ |
| `git diff --stat` | 恰 4 文件（审计档除外） | 4 files changed, 149+/14-（invariants 2/manifest 10/store 54/test 97）；其余全部为未跟踪审计档（??），不入 diff | ✓ |

149 vs 门一时 145 的 +4 增量=N1 先例列一行+manifest gen 登记 4 行——与主控收口动作自洽。

## 清单五：e2e 面裁定——**不需要补跑**

1. tests/e2e 无并发连点/双击档位用例：内容级 grep `\.save\(|saving` 于 11 个 spec **零命中**。
2. 设置页唯 e2e 面=smoke.spec.ts:177-178（uiScale 单 save 全链：设置→点「大 125%」→save 落地
   →--ui-scale）；该路径走 null 哨兵**直发分支**，与旧实现逐 tick 等价（invoke 同步即发，
   diff 亲核），行为零变由代码等价性+1103 既有用例（含 settings save 落地链）双锚。
3. F-SV 新语义（互斥/排队）无 e2e 触达面，由三新单测+M1/M2 变异托底。

## 总评

实现本体（null 哨兵链式全序）经门一竞窗推演、M1/M2 变异红证与本终审逐帧源码级复核，未发现
代码级缺陷；门一 B:0/W:2/N:3+存疑 2 经主控收口（N1 补齐+gen 即时登记）与实现者书面解释
（W1 源码级自洽成立）全部闭环；机器面亲跑全绿且数理精确一致（127/1106、locks 239、exit=0）。
W1 解释质量值得记档正面一笔：五帧对账（171:52→69:24→174:40→177:17→179）全部可在 raw 与
HEAD 版源码独立复核，非口头推演。

**终判：PASS**（可进 [locked-change] 提交流程：store+test+invariants+manifest 四文件，
建议提交信息含 F-SV 与 [locked-change] 尾注）。
