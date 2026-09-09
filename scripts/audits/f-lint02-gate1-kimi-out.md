[routing]: run=20260909124135-bq4k source=kimi-main model=kimi-k3 switches=0 usage=in=8025,out=6289 latency=194397ms (by ds-call.mjs 链)

# F-LINT-02 门一深审结论

## A 母本符合度 —— [N]（符合，附两条观察）

- 判据 1（同名同值跨≥2文件即红）：`redGroups` 以 `name\0kind\0value` 分组后 `new Set(...file).size >= 2` 过滤——落实。
- 判据 2（trivial 豁免）：`isTrivial` 精确覆盖 {0,1,-1,true,false,'',null}，`-1` 由 PrefixUnary 剥壳后归一为 `'-1'` 命中豁免——落实。
- 判据 3（异名同文案 warn，长度≥4）：`d.value.length < 4 continue` + `names.size >= 2` 排除同名对（同名已归红层，warn 不重复计）——'ai-sensor'（9字符）必收，与判据一致。
- 判据 4/5/6：同文件豁免=distinct-file 计数天然实现；前缀规则未实现（终裁显式豁免）；引号/分隔符/1e3/无插值模板/as 剥壳/负数壳均见 `literalOf`/`normalizeNumber`——落实。
- 对拍修正 8 红/3 warn：属判据必然结果而非私改。`redByKey` 按名分组，'操作失败' 组内 ACTION_FAILED×3 与 OP_FAILED×4 各自满足同名跨文件→拆 2 红；整组异名再入 warn→3 warn 含 ai-sensor。终裁 §4 自留「对拍通过为验收」条款兜底，修正有据。
- baseline 棘轮：指纹=name+kind+value+文件集无行号（`fingerprintOf`），膨胀（文件集变化）即漂移转红，方向正确。B-2 副产物 stderr 只读、不卡 CI——落实。

## B 宪法红线 —— [W]（部分无法核销）

- **零新依赖**：diff 中 package.json 仅 +1 script 行，无 deps 变动；`import ts from 'typescript'` 用存量 devDep——符合。
- **行数 221≤500**：按所附全文点算约 221 行，头注自述一致——符合。
- **受锁登记两处无法核实**：实现报告 §2 称 check-locks.mjs +3 / lock-protected.ps1 +2/-1 显式登记 baseline.json，但**随附 diff 只含 package.json、check-quality.mjs 与两个新文件，这两处锁文件改动不在审包材料内**。baseline.json 是否真在受锁面，本席无从对证——这是审包缺口，非已证违例。unlock→改→apply 流程本身仅有报告自述支撑。

## C 代码与测试质量 —— [W]（四处边界缺陷/静默失败）

1. **baseline 解析失败静默吞掉且误导归因**（check-dup-constants.mjs `} catch { entries = [] }`）：baseline.json 损坏/JSON 非法时被当作空 baseline，8 组存量全部转红且报错文案为「baseline 外新增——收敛到 src/shared」——真实病因（文件损坏）被完全掩盖。方向是 fail-closed 不属放大风险，但排障者会被引向错误动作。建议 catch 内至少 stderr 一行告警。
2. **括号壳未剥——静默漏收**：`literalOf` 只剥 `AsExpression`/`SatisfiesExpression`，`const X = ('操作失败')` 的 ParenthesizedExpression 直接 return null。报告边界矩阵未覆盖此形态。漏报方向与「宁漏报不加噪」哲学自洽，但属未申报的收集边界（报告 §6-4 只申报了 as 剥壳口径）。
3. **20 行截断只在独立 CLI 路径生效**：`clipped()` 仅用于 `import.meta.url` 主入口；check-quality 第 7 段 `for (const v of dupResult.newRed) violations.push(...)` 无截断。终裁 §2.3「CI 输出截断 20 行」在 quality 链挂点（真实 CI 路径）未落地——极端新增场景下输出无界。
4. **AST 解析错误不检查**：`ts.createSourceFile(...)` 后未查 `parseDiagnostics`，语法破损文件静默产出残缺 AST→声明漏收，无任何痕迹。同哲学下可接受，但未申报。
5. 正面核销：exit code 传播正确（newRed→violations→exit 1；warn/baselineHits 不卡）；指纹无行号；同名对已正确排除出 warn 层；`import.meta.url === pathToFileURL(process.argv[1]).href` 主入口判定标准；CLI 守卫使 check-quality import 无副作用。
6. 红证 8 组（RED-1~4 含 1_500≡1500）仅有报告+raw.txt 自述，档案不在审包内——形态合理但无法复核，记为不确定。

## D 报告诚实性 —— [W]（基本诚实，一处越证指控）

- 自裁 9 条对 diff：#1/#2（8红/3warn 修正）与代码分组逻辑吻合；#3（指纹加 kind 维）与 `fingerprintOf`/`recorded` key 一致；#4（as 全剥）与 `literalOf` while 循环一致；#8（挂点=quality 宿主第7段+独立 script）与 diff 一致；#9（B-2 stderr+环境变量展开）一致。#5/#6/#7 涉档外材料，无法核。
- **疑虑①**：主控已核销=误读（ESLint max-lines=500 硬线，250=宪法目标线，F-A11 已按 code 口径裁）。报告表述「超组件 250 上限……该票面自称 verify exit=0 亲验与 quality 第 4 段必红矛盾」——其「必红」断言依赖 check-quality 第 4 段的计数/豁免逻辑，而该段不在随附 diff 内；且报告 §3 自述实测 quality 唯一红即此项，与主控「误读」裁定之间存在口径张力。按终裁背景此疑虑已核销，报告的表述方式（直指他票 verify 输出真伪）超出其在手证据，属越证指控，但申报行为本身符合诚实义务。
- 另注：报告自报 221 行与材料点算吻合，无行数注水迹象。

## E 接缝 —— [W]（主链接缝正确，一处不可核）

- check-quality 挂点：第 7 段在 violations 汇总 exit 之前插入，摘要行 console.log、违规 console.error+exit 1，与既有 6 段同构，无输出互扰；exit code 单向传播（dup 红→quality 红），正确。
- lint:dup-constants 独立 script 与 quality 链共用 `scanDuplicateConstants` 单一实现，无双份逻辑漂移风险——良好设计。
- F-A9/A10 manifest 卷入与 re-apply 预告在自裁 #6 明确在案——符合预告要求。
- **check-tickets 互扰无法核**：check-tickets 本体与 verify 链编排均不在审包材料内，次序/输出互扰无从对证——不确定，记缺口。

---

**一行总评**：判据落地与对拍修正均有代码证据支撑、自裁申报与 diff 高度一致，无阻断性违例；扣 W 于——锁文件两件套改动未随附无法核销、baseline 解析失败静默误归因、括号壳漏收未申报、quality 挂点路径无 20 行截断四处，建议补材料核销 B 项并修 C-1/C-3 后放行。