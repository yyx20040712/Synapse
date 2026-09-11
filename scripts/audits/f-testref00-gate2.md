# 门二 · F-TESTREF-00 测试面指纹门 · 终审报告（三屋第三屋）

> 审岗：门二终审（独立子代理，只读仓库——唯一可写=本输出档）。node v24.20.0（PATH 实测）。
> 对象：暂存区待提交态（git diff --cached，29 文件 +42921/-18）。
> 依据：设计定稿 docs/design/2026-09-11_f-testref00-design-final.md（母本）+实现报告
> scripts/audits/f-testref00-impl.report.md（§8 回炉段）+门一 R1/R2 两轮+三份证据 raw。
> 开工技能清点：code-review-excellence（用）+verification-before-completion（用）；
> systematic-debugging/TDD/javascript-testing-patterns 等（不用——只读审查岗，不写实现
> 不调试不新增测试面）。配置：门二=GLM5.3 终审档。

---

## 清单① 处置核对（R1 全 findings + R2 findings + 主控裁决 + 两项回炉新自裁）

### 门一 R1（B1 两半 / W1-W11 / N1-N10）逐条 vs 终态实物

| 条目 | 要求 | 终态实物证据 | 判定 |
| --- | --- | --- | --- |
| B1a（信任根入锁） | 基线/豁免入 protectedFiles | check-locks.mjs +2 行（`scripts/test-surface.baseline.json`/`...exemptions.json`，注释引「门一 R1 B1」）；get-protected-files.ps1 @() 同两路径；locks/manifest.json 实测 325 条含两 JSON（node 解析 files.length=325；grep 两文件名各 1 次在册） | PASS |
| B1b（空基线恒绿） | loadBaseline 健全性下限 | check-test-surface.mjs:43-48：`fileCount < 1 \|\| !parsed.stats \|\| stats.fileCount !== fileCount \|\| !(stats.caseCount >= 1)` → corrupt（exit 2）；raw b1b 段复测 EXIT=2+主控补证段 `B1B_EXIT=2`（mutation-raw.txt:131-132） | PASS |
| W1（merge-safe） | diff-tree -m | ci.yml 范围闸：`git diff-tree --no-commit-id --name-only -m -r "$C"`（注释引门一 W1） | PASS |
| W2（尾注自愿制注记） | 裁定接受+论证落位 | ci.yml 注释「W2 门一裁定接受…locks sha 锁+[locked-change] guard 独立守护，本范围闸=战役附加层」 | PASS |
| W3（正则结尾锚） | 禁前缀逃逸 | TR_RE=`^scripts/(check-test-surface(\.mjs)?$\|test-surface(\.mjs)?$\|test-surface/\|test-surface\.(baseline\|exemptions)\.json$)`——结尾锚闭合 | PASS |
| W4（BASE 兜底） | fetch+merge-base+notice 升 warning | ci.yml：`git fetch origin main`→`git merge-base origin/main HEAD`→仍失败 `::warning`+exit 0（注释引 W4） | PASS |
| W5（先阻断后写） | die(1) 先于 writeFileSync | check-test-surface.mjs:350（die）位于 :351（writeFileSync）之前，注释引 W5 | PASS |
| W6（import 别名） | 别名/伪装/namespace→红 | extract.mjs importAliasCheck:168-200：named 别名/伪装本地名/default 伪装/namespace import 四向 UNRESOLVABLE（:183-186 namespace 段=回炉新自裁①落位）；stats UNRESOLVABLE=0 维持（stats-raw 回炉段） | PASS |
| W7（哨兵扩+spec.tsx） | PropertyAccess 形态+白名单扩 | extract.mjs:38 WHITELIST_RE 含 `spec\.tsx`；sentinelCheck:414-415 `isBareThree \|\| isDottedThree(/^(it\|test\|describe)\./)`；guard.ts 不红实证（UNRESOLVABLE=0） | PASS |
| W8（双桶） | conditional 双向红+hard 新增红/删除绿 | extract.mjs:356-363 双桶分流；主件 judge:172-211 双桶 countMultiset 隔离判定，hard 删→`ACTIVATED` delta（:201）；raw m10 双半实证（新增半 exit 1/删除半 ACTIVATED+exit 0） | PASS |
| W9（豁免低摩擦） | 裁定接受：入锁+人审 | exemptions.json 入 manifest 325 ✓；本票逻辑未改 | PASS |
| W10（NEW 可见性） | NEW 行附断言计数 | 主件 :148 与 :304 两处 `NEW … (line N, M assertions)`；主控补证 m3 复跑 raw：`NEW … (line 170, 0 assertions)`（mutation-raw.txt:124） | PASS |
| W11（CASE_TODO 字样） | 裁定接受+注记 | extract.mjs:48-49 定义行注「vitest API 建模命名非占位标记（门一 W11 主控裁定接受——check-quality 扫描域=src+tests 不含 scripts）」；门二亲跑 quality:check exit 0 实证不触发 | PASS |
| N1（ticketIdCount 超票面） | 记录 | 保留于 statsOf（无害扩展，R1 定性记录不阻断） | PASS（记录项） |
| N2（M9 描述漏 NEW 行） | 记录 | raw m9 段含 NEW 行（mutation-raw.txt:63）在档 | PASS（记录项） |
| N3（4819 无独立出处） | 记录 | 派生数口径注记 | PASS（记录项） |
| N4（签名不含 skipSites） | 主控预裁接受（文件级建模必然推论） | impl §8.2 落「接受」注记；caseSignature 仅 {a,m}（主件:78-80） | PASS |
| N5（预裁①残留通道） | 记录 | 运行时约定面，R1 定性不阻断 | PASS（记录项） |
| N6（CONSERVATIVE_REDS 扩展） | 补申报 | impl §8.2 补申报 it.concurrent/test.extend/describe.configure/test.describe.configure/it.skipIf/it.runIf/test.skipIf/test.runIf；extract.mjs:52-56 集合内容与申报一致 | PASS |
| N7（stats 死字段） | 用活 | loadBaseline:46 用 stats.fileCount/caseCount 校验 | PASS |
| N8（模块级全局缓存） | 记录 | 未改（R1 定性不阻断，CLI 单次调用安全） | PASS（记录项） |
| N9（sha 自报） | 记录+补证 | 主控补证段 m3/m5 独立 sha（51a41a4c…/f10502bd…）双侧一致（mutation-raw.txt:127/130） | PASS |
| N10（受锁声明不一致） | 补齐 | extract.mjs:3-4 头注「[locked-change] 声明面随主件——门一 N10 补齐」 | PASS |

### 门一 R2（W12 / N11-N16）逐条

| 条目 | 终态处置 | 判定 |
| --- | --- | --- |
| W12（哨兵 each 双层形态） | registry 新票 F-TESTREF-S1 ①（status open，summary 明文引 W12） | PASS（登记后续票） |
| N11（本地变量别名） | S1 ② | PASS |
| N12（B1b tee 叙述） | mutation-raw.txt:133-136 主控补注段在档（「首测经 tee 管道重定向（$? 取 tee 退出码），复测为直跑裸测」+三源闭合申明） | PASS |
| N13（loadBaseline 深度防御） | 记录项（锁面 sha=真实防线）——未入 S1，R2 定性不阻断 | PASS（记录项） |
| N14（W10 新格式+M1-M5/M9 未复跑） | 主控补证段：m3/m5/B1b 三项复跑（mutation-raw.txt:120-132，含 W10 格式实证 `0 assertions`）——M1/M2/M4/M9 仍为首轮 raw，但其判定路径（MISSING_CASE/MISSING_ASSERT/ONLY_FORBIDDEN）未在回炉中改动，首轮证据仍有效；M2 断言面与 W10 无交集 | PASS |
| N15（type-only import） | S1 ③ | PASS |
| N16（哨兵误伤面） | 记录项（红向、存量 0）——未入 S1 | PASS（记录项） |

### 主控裁决 vs 实物

- 预裁①（skipSites 文件级建模）：接受——extract.mjs 头注自裁①+防削弱语义论证（新增调用=计数+1 红/删=红/删用例由 MISSING_CASE 兜底）+M7/M8 红证背书。PASS
- 裁定接受项 W2/W9/W11/N4/N6：注记/登记全落位（上表）。PASS

### 两项回炉新自裁落位

1. namespace import 保守红：extract.mjs:183-186 ✓（R2 裁定接受）。
2. 新文件 skipSites 双桶新增红：主件 judge NEW_FILE 分支 :132-143（两桶各 SKIPSITE_ADDED+豁免通道同款）✓（R2 裁定接受）。

**清单①结论：PASS——无「说了没改」项；两自裁落位。**

---

## 清单② 母本符合度（diff vs 设计定稿 §0 处置表与 §2-§10）

| 节 | 核对点 | 证据 | 判定 |
| --- | --- | --- | --- |
| §0 处置表 15 行 | B1/B2/W1-W9/N1-N4 逐行 | 全部落地（B2=SKIP_ADDED 含新用例形态：主件 :298-302 case.markers 含 skip→SKIP_ADDED 而非 NEW；W1 传播=mergeMarkers:122-126；W2 最外层 expect=chainTop:112-116+全记；W3=⟨nse:源文本⟩ 基线实测样例「（出现 ⟨nse:css⟩ 次）」；W4=签名多重集 countMultiset ⊆；W6=哨兵+白名单四后缀；W7=逐提交判定） | PASS |
| §2 抽取域 | tests/** 白名单+key=JSON.stringify+哨兵 | extract.mjs:38-41/:433-444；key=:333/:373 `JSON.stringify([...describePath, title])` | PASS |
| §3 三态 skip | 声明→markers/字面量真值→红（hard 桶等价）/非字面量→skipSite | extract.mjs:352-363（字面量真值面经 W8 回炉双桶化，等价实现+门一 R2 核验背书——合规偏差） | PASS |
| §3 each 展开 | const 单跳+占位替换+行计数入多重集 | resolveEachRows:236-246（mutatedIds/唯一声明防护）；printfExpand:128-160；每行一 case :324-341；元组非字面量位=⟨nse⟩（自裁⑤，简报口径背书） | PASS |
| §3 expect 单元 | 最外层链 getText+空白归一+全记 | collectCaseBody:263-271（chainSet 同链顶自然合并=「最外层调用」语义）；起始行号以 case.line 落基线 | PASS |
| §4 基线 | 排序稳定/无易变字段/UTF-8 无 BOM/尾 \n | serializeBaseline:316-334（键排序+version/files/stats）；BOM 实测无（清单③） | PASS |
| §5 判定语义 | FILE_MISSING/NEW_FILE/TICKETS_MISSING/MISSING_CASE/MISSING_ASSERT/SKIP_ADDED/ACTIVATED/SKIPSITE_ADDED/REMOVED/ONLY_FORBIDDEN/NEW | judge 全分支在档（:117-307）；exit 0/1/2/3（:372-376 die(1)/:359 die(2)/豁免 die(3):64-67） | PASS |
| §6 豁免 | reason+rulingLink 强制+从宽匹配 | loadExemptions:56-76（三选一匹配键=自裁⑧，R1 未异议） | PASS |
| §7 挂载与范围闸 | 三 scripts+verify 插 quality 后+CI 白名单 | package.json：test-surface:check/:baseline/:stats 三条+verify 链 `quality:check && test-surface:check && …`；ci.yml lock-change-guard 追加 step；白名单逐项=tests/**+scripts 段（结尾锚=W3 回炉收紧，严于设计字面通配——保守向合规）+workflows+package(-lock)+docs/prompts+docs/design+registry+manifest+AGENTS+methodology/invariants+docs/audits+scripts/audits（自裁④） | PASS |
| §8 行预算 | 超 500 拆 lib | 主件 386/extract 477（wc -l 实测）均 ≤500 | PASS |
| §9 变异矩阵 | M1-M9 raw 落档 | mutation-raw.txt m1-m9 全段+回炉 m6/m7/m8/m10 双半+b1b+复测+主控补证段 | PASS |
| §11 DoD | stats 落盘 UNRESOLVABLE=0/M1-M9/verify 绿门接入/locks 322→N/双尾注 | stats-raw 双段 unresolvableCount:0；verify 链含 test-surface:check（final-raw:24-29+门二亲跑 :29）；locks 322（HEAD 实测）→325（工作树实测）=+extract.mjs+两 JSON ✓；双尾注=[locked-change][test-refactor] 于主件头注:20+AGENTS 第 7 条+票面——提交信息尾注由主控收口时携带（待提交态可验面已尽） | PASS |

实现自裁与设计字面的偏差（①-⑩+回炉 2 项）全部有 DoD 硬项/门一 R1-R2 裁决链背书，无未申报偏差。

**清单②结论：PASS。**

---

## 清单③ 宪法红线

| 项 | 核对 | 判定 |
| --- | --- | --- |
| 分层单向 | 纯 scripts 工具件+配置面，无 ipc/services/repos/db/renderer 触面 | PASS（不适用面申明） |
| 受锁 | manifest 实测 325 条（node 解析 files.length）；两 JSON+extract.mjs+主件 sha 在册；双侧登记（check-locks.mjs+get-protected-files.ps1 diff 实见） | PASS |
| 安全禁令 | 无 renderer/Node 注入面、无 SQL、无 eval/newFunction、无出网（import=fs/path/url+typescript 既有依赖）；package.json 无 dependencies 变更（零新依赖 ✓ 运行时预算不变） | PASS |
| 行数 ≤500 | 386/477 实测 | PASS |
| UTF-8 无 BOM 无乱码 | head -c 3：baseline=`{`（7b0a20）/exemptions=`{`/两 mjs=`#!`——均无 efbbbf；grep BOM 计数四件全 0；中文面（主件注释/基线标题/探针件）目测可读无乱码；quality:check 无乱码段 exit 0 | PASS |
| TDD 证据链 | mutation-raw.txt：M1-M9（:2-78）+还原总绿（:74-78）+[R1] m6/m7/m8/m10/b1b/m10-removed-half（:79-116）+[R1 复测]（:117-118）+[R2 后主控补证段] m3/m5/B1b（:120-132）+[主控补注 N12]（:133-136）——全段在档 | PASS |
| TODO/FIXME 字面 | 提交面 scripts/*.mjs 含 CASE_TODO/CASE_FIXME 标识符——W11 主控裁定接受+quality 扫描域=src+tests 实证（门二亲跑 exit 0） | PASS（裁定背书） |

**清单③结论：PASS。**

---

## 清单④ 机器面亲跑（禁只信报告——逐项自跑，真退出码）

| # | 命令 | 结果 | 判定 |
| --- | --- | --- | --- |
| a | `node scripts/check-test-surface.mjs` | exit 0；`files: 179 base / 179 cur \| cases: 1623/1623 \| assertions: 4979/4979 \| skipSites: 15/15`+`检查通过：C_after ⊇ C_before` | PASS |
| b | `npm run locks:check` | exit 0；`locks 检查通过：325 个受锁文件与 manifest 一致` | PASS |
| c | `node scripts/check-tickets.mjs` | exit 0；`共 183 个；open 9（weak 可领 0，strong 9）`（183-9=174 done ✓；F-TESTREF-00 已翻 done+F-TESTREF-S1 新增 open，diff 实见） | PASS |
| d | `npm run quality:check` | exit 0；无占位标记/无乱码/无跨域引用/无同值双常量新增 | PASS |
| e | `npm run lint` | exit 0 | PASS |
| f | `head -c 3 scripts/test-surface.baseline.json \| xxd` | `7b0a20`（`{`）——无 efbbbf（exemptions/extract.mjs/check-test-surface.mjs 同测无 BOM） | PASS |
| g | `git diff --cached --stat` 无 src/** 与 tests/** | grep src/\|tests/ 零命中（29 文件=ci.yml/AGENTS/methodology/manifest/package.json/check-locks/get-protected-files/主件/extract/baseline/exemptions/registry+19 件 scripts/audits 证据档）；骨架件 tests/utils/*.ts 不在本 diff（前一提交，git show HEAD 可证） | PASS |
| h | verify-final-raw 尾行 FINAL_VERIFY_EXIT=0 | **缺口：该文件不含 FINAL_VERIFY_EXIT 落款行**（尾行=build 成功输出）——真退出码落款在姊妹件 f-testref00-verify-raw.txt（行 4066 首轮/行 8110 回炉段两处 VERIFY-EXIT=0）；**门二独立闭环**：亲跑 `npm run verify` 全链 → **GATE2_VERIFY_EXIT=0**（test-surface:check 在链内绿+Test Files 162 passed+build 1.77s）——功能结论成立，落款行缺失=W-G2-1 | PASS（带 W-G2-1） |
| e2e | 申明 | 本票零测试改动+零 src 改动（g 项实证），e2e 面不适用 | PASS（申明） |

补充实测：基线 node 解析=files 179/cond 15/hard 0/stats 与 statsOf 全字段一致；reader-scroll 双 skipSite 在册（M8 目标）；⟨nse:css⟩ 展开样例实见；`git status --porcelain` 无未暂存/未跟踪残留（无变异备份/探针件残留）。

**清单④结论：PASS（h 项带 W-G2-1，功能结论由门二亲跑三源闭合）。**

---

## 清单⑤ 成本账本行（主控回执汇出用）

| 岗位 | 模型×供应商 | 用量 | 备注 |
| --- | --- | --- | --- |
| 主控 | GLM5.3（全程统一档） | —（全程未分段计量，如实记） | 派发/预裁/补证/收口 |
| 实现者首轮 | 统一档 Agent（无 model 参数——环境欠账如实记） | 7.49M tok / 85 调用 / 26.8 min | |
| 实现者回炉轮 1 | 同上 | 6.37M tok / 37 调用 / 7.5 min | |
| 门一 R1 | deepseek-v4-flash（deepseek 兜底——双 Kimi 源 504×6 后切） | in 22544 / out 24019 / 114s / switches=2 | ds-call-v2 链 |
| 门一 R2 | kimi-k3（kimi-main 第三退避——网关 504 两次后成功） | in 0 / out 9273 / 862s | 同链 |
| 门二（本岗） | GLM5.3 | token 由主控回执汇出 | 含亲跑 verify 全链一次 |

---

## 发现汇总（分级）

- **B：0**
- **W：1**
  - **W-G2-1**：`scripts/audits/f-testref00-verify-final-raw.txt` 尾行无 `FINAL_VERIFY_EXIT=0` 落款（主控派发预期存在）。真退出码落款仅在姊妹件 verify-raw.txt（两段）。缓解三源：①verify-raw 双段 VERIFY-EXIT=0；②final-raw 尾部=verify 链末段 build 成功输出；③门二亲跑全链 GATE2_VERIFY_EXIT=0。证据形式缺口非功能缺陷——建议主控收口时于 final-raw 末补落款行（或以本档为闭环证据），不阻断。
- **N：2**
  - **N-G2-1**：tickets/registry.ts F-TESTREF-00 summary 写「locks 319→325」，与实现报告 §8.3「322 原面+3」及 HEAD 实测（manifest 322 条）不符——319 为笔误（更早时点数字）。manifest 实物 325 正确，计数关卡无碍；纯记录性文字口径差。
  - **N-G2-2**：R2 N 级注记 N13（loadBaseline 深度防御）/N16（哨兵误伤面）/N8/N5 未纳入 S1 票面（S1 只收敛 W12/N11/N15）——R2 定性「不阻断」，登记非强制；建议 S1 触发时顺带重估是否收编。

---

## 总评

**PASS——放行提交。**

四清单+一逐项全 PASS：门一 R1/R2 全部 findings 与主控裁决零「说了没改」；两项回炉新自裁落位；diff 与设计定稿 §0-§11 符合（全部偏差有自裁+裁决链背书）；宪法红线（受锁 325 双侧登记/零新依赖/行数/BOM/UTF-8/TDD 链）全过；机器面 a-g 亲跑真退出码全绿+门二亲跑 verify 全链独立闭环（GATE2_VERIFY_EXIT=0，h 项落款缺口由此闭合）。唯一 W 级为证据档落款行形式缺口（W-G2-1），不构成阻断；两条 N 级为记录性注记。建议主控收口提交携带 `[locked-change][test-refactor]` 双尾注，并可顺手处置 W-G2-1/N-G2-1（补落款行+registry 数字更正均为主控可写面小改，非必须）。
