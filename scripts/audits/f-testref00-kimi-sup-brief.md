# 门一 Kimi 席位补审任务：F-TESTREF-00 测试面指纹门（全量独立审——终态）

你是门一（对抗式审查员）。本趟为**补位审**：该项目门一 R1 席位当时因 Kimi 网关故障（双源 504×6）由 deepseek 兜底完成、R2 为定点复核（锚定 R1 findings 非全量）——你此趟做 **Kimi 首次全量独立审**。对象=已收口提交的终态（审靶 diff=提交 ff96cb1f02；当前 HEAD 其后仅有两条与本票无关的「源码注释模型代号清洗」提交，实现面零触碰已核）。你的结论=维持收口 或 需修复（附票面）。

## 背景（一段）
仓库=单人 Electron+TS 桌面应用（文献管理+PDF 标注）。tests/** 185 文件全 sha256 受锁（37K 行>src 31K 行），测试债因锁不可收拾。本票新建指纹门：抽取 tests 契约面（C 面=用例标题/断言文本/工单号/skip 标记）入基线，CI 机检 C_after ⊇ C_before（多重集）——允许动测试文件但碰契约即红，解锁一场测试重构战役（范围闸强制零 src 变更）。设计链三跳（Kimi 拟定→deepseek 对抗审核→GLM 终裁）已毕，终裁=附 1。

## 主控已预裁项（可攻击，但推翻需更强依据）
1. skipSites 文件级多重集（非用例级）——存量 15 处依赖门 skip 中 14 处物理位于模块级 helper（skipIfPending）体内；「helper 体内新增 skip 调用点」两模型皆盲=静态分析边界，缓解=helper 语义绑工单状态（0 open 恒不 skip）。
2. CI 范围闸尾注自愿制（不带 [test-refactor] 尾注的提交不受范围闸查）——设计权衡：tests 面另有 sha 锁+[locked-change] guard 独立守护，范围闸=战役附加层。
3. 豁免通道（exemptions.json，reason+rulingLink 强制，已入锁）——人工裁决留痕通道，低摩擦为已知限制（门二人审豁免条目）。
4. CASE_TODO/CASE_FIXME 变量名（vitest API it.todo/it.fixme 建模）——check-quality 扫描域实测=src+tests 不含 scripts，非占位标记。
5. 同 key 用例签名不含 skipSites（文件级建模必然推论）。
6. CONSERVATIVE_REDS 超设计清单扩展（it.concurrent/test.extend/describe.configure/skipIf/runIf 等——保守向）。
7. namespace import（import * as v）保守红+新文件 skipSites 新增红（回炉期自裁，属 B1 语义补面）。
8. 已登记后续票 S1 的残留面（勿重复报告，可补充新发现）：非白名单文件哨兵对 it.each 双层调用形态失明/本地变量别名（const myIt=it）漏抽/type-only import 误红。

## 审项 A~E
A 母本符合度：diff vs 设计定稿逐节（§2 抽取域/C 面/§3 三态 skip+each 展开+expect 单元/§5 判定+exit code 族/§6 豁免/§7 挂载+范围闸白名单）。
B 宪法红线：零新依赖（typescript+node 内建）/≤500 行/UTF-8/LF/受锁件诞生即锁声明/无 TODO-FIXME-占位。
C **门自身绕过通道专项（核心审项——对作弊者的想象力）**：抽取器语法盲区新面（前两轮已抓：import 别名/namespace/哨兵后缀——已堵；你找新的）/基线判定算法漏洞（同 key 签名构造碰撞/计数实现误差）/豁免滥用面/范围闸正则与 git 命令行为（diff-tree -m/merge-base 兜底/force-push 跳过）/基线 JSON 篡改面（已入 sha 锁——评估锁外攻击残留）。
D 证据诚实性：报告数字 vs raw 件对拍（179/1623/4979/15/160；变异矩阵含主控补证段）；B1b 首测 EXIT=0 复测 EXIT=2 的 tee 测量误差解释（raw 末段有主控补注）。
E 报告自裁申报 vs diff 实物（含回炉轮 §8 逐项）。

## 输出
[B|W|N] 逐条+证据（文件:行号/diff 行）+统计+总评（维持收口/需修复——附具体票面）。不确定的明确说不确定。中文。

---
## 附 1 设计定稿（终裁——唯一权威母本）

# F-TESTREF-00 设计定稿——测试面指纹门（设计链三跳第三跳：GLM 终裁）

> 链档：第一跳 Kimi 拟定 `scripts/audits/f-testref00-design-kimi.md`（kimi-main，in 3087/
> out 8982）→ 第二跳 deepseek 对抗审核 `scripts/audits/f-testref00-review-ds.md`
> （deepseek-v4-flash，B2/W9/N4——**结论「不可终裁需回炉」**）→ 本件第三跳终裁。
> 主控补证（两处 ⑤i 实锤+Q1-Q8 答案）随审核包 `f-testref00-review-brief.md` 在档。
> 本件为**实现票面的设计母本**——与 Kimi 原稿冲突处以本件为准；本件未覆盖处
> 循 Kimi 原稿；Kimi 原稿与 deepseek 审核意见冲突处以本件裁决表为准。

## 0. 审核处置总表（deepseek 逐条裁决）

| 审核项 | 裁决 | 落点 |
| --- | --- | --- |
| B1 体内条件 skip 放行通道 | **采纳修正**——弃主控草案 A 的「新增 skipSite 放行」；skipSites **双向皆红走豁免**（新增=防绕过红；删除=依赖门清理一次性豁免留痕，豁免台账可见，无持续摩擦） | §3 skipSites 三态 |
| B2 新用例带 skip 漏网 | **采纳**——全局规则：当前任一用例 markers 含 skip 而基线无同 key 同签名配对 → 红（SKIP_ADDED 含新用例形态） | §5 判定 |
| W1 describe 级标记传播 | **采纳**——describe.skip/only 向路径下全部子用例 markers 传播 | §3 |
| W2 断言单元与去重 | **采纳修正**——断言单元=**最外层 expect 调用**（CallExpression，callee=标识符 expect）getText+空白归一；**弃 Kimi §3.3 区间包含去重**（deepseek 实锤：外层 expect(fn).toThrow() 场景会丢真断言）——全部 expect 调用各计一份（含 vi.waitFor 内层/分支内层/await 操作数），双计只会多重集偏大、单调性无损 | §3 |
| W3 稳定标记键漏报/假绿 | **采纳修正**——非静态占位位纳入**该位实参源文本摘要**：占位替换值=字面量求值值或 `⟨nse:源文本空白归一⟩`（css→wsCss=源文本变=键变=红；行内容换位同理红）；§3.2 同步接受 const 单跳解析 | §3 it.each |
| W4 同 key 匹配复杂度 | **采纳简化**——弃「贪心+回溯二分匹配」，改**签名多重集计数**：签名=JSON(assertions 排序多重集+markers 排序+skipSites 排序)；同 key 下基线签名计数 ⊆ 当前计数（O(n) 确定性，无配对歧义） | §5 |
| W5 skip 取消过严 | **采纳**——markers 声明形态 skip→无 skip（激活）=绿+delta；无 skip→skip=红（B2）。skipSites 形态不适用（双向红，见 B1） | §5 |
| W6 扫描域硬编码漏扫 | **采纳**——扫描域=tests/** 全域白名单 `*.test.ts`/`*.test.tsx`/`*.spec.ts`；**漏扫哨兵**：tests/** 下非白名单名 .ts/.tsx 若文本含 `\b(it|test|describe)\s*\(` → 保守红（新目录/新扩展名防漏） | §2 |
| W7 范围闸 base 未定义/package.json | **采纳修正**——逐提交判定（CI 对 push 范围内每个含 [test-refactor] 尾注的提交 `git show --name-only` 判路径）；package.json 入白名单——**暴露面论证：依赖变更已被既有 [dep-change] guard（CI 步「依赖变更尾注检查」）独立拦截，双闸正交**；脚本段手改由门二机器面核对覆盖 | §7 |
| W8 行预算乐观 | **采纳**——实现序：先抽取器+stats 子命令全量估算，超 500 行即拆 `scripts/test-surface/` lib（子目录递归入锁已证 Q7），拆分件诞生即锁 | §8 |
| W9 变异矩阵不全 | **采纳**——扩至 M1-M9（§9） | §9 |
| N1 键分隔符碰撞 | **采纳**——key=`JSON.stringify([...describePath, title])` | §2 |
| N2 豁免同 title 过宽 | **注记采纳**——v1 从宽（file+caseTitle 匹配，assertionText 可选细化）；同 key 重复用例场景豁免条目宜附 assertionText；已知限制入头注 | §6 |
| N3 输出语义 | **采纳**——MISSING_*/SKIP_ADDED/SKIPSITE_ADDED/SKIPSITE_REMOVED/NEW 各自独立行+汇总计数行 | §5 |
| N4 | 并入 W4 | — |

## 1. 目标与非目标

循 Kimi 原稿 §1 全文（C/S 拆分、⊇ 多重集、留痕放行、非目标清单）——无修正。

## 2. 抽取域与 C 面定义

- **扫描域（W6 修正）**：`tests/**` 全域，白名单文件名 `*.test.ts` / `*.test.tsx` /
  `*.spec.ts`；`tests/utils/**`、`tests/e2e/e2e-env.ts` 等非用例文件不入抽取，但受
  **漏扫哨兵**约束（非白名单 .ts/.tsx 含用例调用形态 → 保守红）。
- FileSurface / CaseEntry 循 Kimi §2.2，修正：
  - `key = JSON.stringify([...describePath, title])`（N1）；
  - CaseEntry 增 `skipSites: string[]`（B1，体内条件 skip 规范化文本多重集）；
  - markers 含传播标记（W1：describe 级 skip/only 并入子用例 markers）。
- guardedDescribe 以 (静态 title, ticketId) 二元组建模、ticketIds 入 C 面——循原稿无修正。

## 3. 抽取算法（修正汇总）

1. **describe 族**：白名单 callee+后缀；第 1 参非字面量 → 保守红（循原稿）。级联
   skip/only 标记沿栈传播给子用例（W1）。
2. **用例族**：`it|test` + `.skip|.only|.todo|.fixme` 后缀与 `xit/xdescribe` 归一
   （循原稿）；markers 记声明标记+传播标记。
3. **体内条件 skip 三态（B1 终案）**：
   - 声明形态（后缀 skip）→ markers；
   - 体内 `test.skip()`（0 参）或**条件位为字面量真值**（`true`/非零数字等静态
     truthy 字面量）→ 按「新增 skip」红处理（等价声明）；
   - 体内 `test.skip(<非字面量 expr>, msg)` → 记 skipSite（规范化源文本=调用表达式
     getText 空白归一——含条件与消息文本）。
4. **it.each（W3 终案）**：第 1 参接受 ArrayLiteral 或**同文件 const 单跳解析**
   （限定：const 声明+ArrayLiteral 初始化+元素为字面量/字面量元组；该标识符在文件
   内存在任何赋值/更新/遮蔽 → 保守红）；标题模板逐占位符替换——消费位可静态求值
   （字面量）→ 真实值；不可求值 → `⟨nse:实参源文本空白归一⟩`；行计数入多重集
   （删行=缺失红/增行=delta）。printf 与 $ 形态子集循 Kimi §3.4；展开行共享回调体
   断言各记一份。
5. **expect 断言（W2 终案）**：单元=最外层 expect 调用 getText+空白归一；全记不
   去重；每条记起始行号。规范化=案 A（仅空白归一，字面量/引号/模板串原样——循
   Kimi §3.3 权衡表）。
6. **保守红清单**：循 Kimi §3.5 + it.each 解析失败形态（§3-4 上述限定外全部）+
  漏扫哨兵命中。输出 `UNRESOLVABLE file:line 原因`，exit 1。

## 4. 基线文件

循 Kimi §4 无修正（scripts/test-surface.baseline.json；排序稳定性/无易变字段/UTF-8
无 BOM/LF/JSON.stringify(,2)+尾 \n；stats 含 fileCount/caseCount/assertionCount/
skipSiteCount/eachExpandedRows）。**基线首版生成时点=实现票内、门接入 verify 前**，
生成后全量 diff 审计入证据。

## 5. 判定与输出（修正汇总）

1. 文件缺失 → FILE_MISSING 红；新文件 → 绿+delta（循原稿）。
2. ticketIds：基线 ⊄ 当前 → 红（循原稿）。
3. 用例（W4 终案）：签名=JSON(assertions 排序+markers 排序+skipSites 排序)；
   同 key 下基线签名计数须 ⊆ 当前计数。基线签名无容器 → MISSING_CASE 红。
4. skip 语义（B2/W5 终案）：
   - 基线签名（无 skip）→ 当前含 skip（新声明 skip 或新用例带 skip 或传播 skip）
     → SKIP_ADDED 红；
   - 基线含 skip → 当前无 skip（激活）→ 绿+delta（ACTIVATED 行）；
   - skipSites（体内条件形态）：ADDED 与 REMOVED **双向红**走豁免（B1）。
5. `only`（含传播）恒红 → ONLY_FORBIDDEN（循原稿+W1）。
6. delta 报告/失败输出/exit code 循 Kimi §5.2-5.4（exit 2=基线缺失损坏硬阻断、
   exit 3=豁免 schema 非法——保留）；输出类目按 N3 扩（SKIPSITE_ADDED/REMOVED/
   ACTIVATED）。

## 6. 豁免清单

循 Kimi §6 + N2 注记（同 title 重复用例时豁免从宽匹配的全部对应项——已知限制
头注明示；建议条目附 assertionText 消歧）。

## 7. CLI / verify / CI

- 子命令与 npm scripts 循 Kimi §7.1（test-surface:check / :baseline / :stats）。
- verify 链插入点循 Kimi §7.2（quality:check 之后）。
- CI 范围闸（W7 终案）：lock-change-guard job 追加分支——push 范围内每个提交信息
  含 `[test-refactor]` → `git show --name-only <该提交>` 判路径 ⊆
  `tests/** ∪ scripts/check-test-surface* ∪ scripts/test-surface*.{json,mjs} ∪
  scripts/test-surface/** ∪ .github/workflows/** ∪ package.json ∪ package-lock.json
  ∪ docs/prompts/** ∪ docs/design/** ∪ tickets/registry.ts ∪ locks/manifest.json
  ∪ AGENTS.md ∪ docs/methodology.md ∪ docs/invariants.md ∪ docs/audits/**`——
  **src/** 一律红。package.json 放行论证见 §0-W7。逐提交判定（merge 场景无歧义）。
- 双尾注制（[test-refactor]+[locked-change]）循 Kimi §8；用例闸=指纹闸蕴含。

## 8. 工程约束

循 Kimi §11 + W8：stats 先行估行数；超 500 拆 `scripts/test-surface/` 子目录 lib
（递归入锁已证）；拆分件与主件诞生即锁。

## 9. 门自身证伪矩阵（W9 扩展）

| # | 变异 | 预期 |
| --- | --- | --- |
| M1 | 删一个用例 | MISSING_CASE 红 |
| M2 | 改一个 expect 字面量 | MISSING_ASSERT 红 |
| M3 | 新增一个用例 | 绿+delta NEW |
| M4 | 加 it.only | ONLY_FORBIDDEN 红 |
| M5 | 删基线文件 | exit 2 硬阻断 |
| M6 | 新用例带 it.skip | SKIP_ADDED 红（B2） |
| M7 | 既有用例体内新增条件 test.skip(expr,msg) | SKIPSITE_ADDED 红（B1） |
| M8 | 删一处既有 skipSite | SKIPSITE_REMOVED 红（B1） |
| M9 | describe.only 包住既有用例 | ONLY_FORBIDDEN 红（W1 传播） |

还原一律 cp 备份法（禁 git checkout）；九支矩阵输出落 `.raw.txt` 入证据。

## 10. 不做面（v1 明示）

- 容差方向判定（一律红走豁免）；S 面一切（重复/行数/风格）；覆盖率数值；断言语义
  理解；运行时标题复刻（键=确定性稳定锚非运行时等价）；跨文件用例移动追踪（移用例
  =旧文件 MISSING 红+新文件 NEW delta，人工对拍豁免）；豁免条目自动清理。

## 11. 实现票面要点（派发时随简报）

- 交付件：scripts/check-test-surface.mjs（必要时拆 scripts/test-surface/ lib）+
  基线+空豁免清单+package.json 三 scripts+verify 链插入+ci.yml guard 扩展+
  AGENTS.md [test-refactor] 票类段+methodology §规约句+本设计链三档证据。
- DoD：存量全量抽取 stats 落盘（含 UNRESOLVABLE=0 实证——15 处依赖门 skipSite 与
  3 处 it.each 全部成功建模）；M1-M9 九支变异红证；verify 全链绿（门已接入）；
  locks 322→N 同步；[locked-change][test-refactor] 双尾注。

---
## 附 2 实现报告（含回炉轮 §8 全文）

# F-TESTREF-00 实现报告（三屋模式第一屋——实现者子代理）

> 工单：F-TESTREF-00 测试面指纹门（tickets/registry.ts open，主控收口翻状态）。
> 设计母本=docs/design/2026-09-11_f-testref00-design-final.md（终裁）；细节规格
> 主体=scripts/audits/f-testref00-design-kimi.md（被终裁修正处以终裁为准）。
> 实现日期 2026-09-11；node v24.20.0（PATH 实测，未用 Volta 绕行路径）。

## 0. 开工技能清点（会话开工纪律）

- test-driven-development：**用**——门自身行为以 M1-M9 九支变异红证验证（先红后还原；基线生成后 check 复跑绿）。
- verification-before-completion：**用**——verify 全链真退出码落盘（f-testref00-verify-raw.txt，VERIFY-EXIT=0）；locks 三步（generate/apply/check）实录。
- javascript-testing-patterns：**用**——vitest/Playwright 的 it.each/guardedDescribe/test.skip 条件形态语义建模依据。
- systematic-debugging：**用**——callee→expression 字段名错、each 分支静默漏过两处缺陷按「探针定位根因→修→复测」处置（TEMP 探针件，不入仓库）。
- typescript-advanced-types / subagent-driven-development / 前端与 CI 模板类技能：**不用**——纯 scripts 工具件+配置面，无类型设计面；本岗为被派发实现者非派发岗。

## 1. 实现摘要

抽取器（scripts/test-surface/extract.mjs）解析 tests/** 白名单文件 AST，产出
FileSurface（ticketIds+skipSites 文件级多重集+cases[key/describePath/title/
markers/line/assertions]）；it.each 三处经 const 单跳解析静态展开（字面量位=
真实值、非静态位=⟨nse:源文本⟩）；expect 断言=最外层链 getText 空白归一全记。
主件（scripts/check-test-surface.mjs）三子命令 check（默认）/baseline/stats；
判定=同 key 签名多重集计数 ⊆ + skipSites 双向计数 + only 恒红 + ticketIds ⊄ 红；
豁免通道 reason+rulingLink 强制。挂载：package.json 三 scripts+verify 链
（quality:check 之后）；ci.yml lock-change-guard 追加 [test-refactor] 逐提交
范围闸；AGENTS.md 工单工作流段末第 7 条+methodology.md §4 引言注记各一句。

## 2. 交付件清单（逐件行数机器实测 wc -l）

| 文件 | 行数 | 说明 |
| --- | --- | --- |
| scripts/check-test-surface.mjs | 344 | 主件：判定+豁免+CLI（≤500 ✓；骨架头注保留并扩展） |
| scripts/test-surface/extract.mjs | 404 | 抽取器 lib（≤500 ✓；W8 拆分预案落地） |
| scripts/test-surface.baseline.json | 23729 | 首版基线（无 BOM/LF/确定性再生成 diff 空已证） |
| scripts/test-surface.exemptions.json | 4 | 空豁免骨架 {version:1, entries:[]} |
| package.json | — | +test-surface:check/:baseline/:stats；verify 插入 quality:check 后 |
| .github/workflows/ci.yml | — | lock-change-guard 追加范围闸 step（仅该 job） |
| AGENTS.md | — | 弱模型领单第 7 条（工单工作流段末） |
| docs/methodology.md | — | §4 引言块注记一句（指向设计定稿） |
| scripts/audits/f-testref00-stats-raw.txt | 3 | stats+baseline 首版输出 |
| scripts/audits/f-testref00-mutation-raw.txt | 78 | M1-M9 九支矩阵 raw |
| scripts/audits/f-testref00-verify-raw.txt | 4066 | verify 全链输出+真退出码 |
| scripts/audits/f-testref00-baseline-audit-probe.txt | — | 基线抽样核对探针输出（展开标题/断言/skipSites 样例） |

## 3. stats 数字（机器实测，f-testref00-stats-raw.txt）

`{"fileCount":179,"caseCount":1623,"assertionCount":4979,"skipSiteCount":15,
"ticketIdCount":57,"eachExpandedRows":160,"unresolvableCount":0}`

- **UNRESOLVABLE=0** ✓（15 处依赖门 skipSite+3 处 it.each 全部成功建模——DoD 硬项）。
- eachExpandedRows=160 = TOKENS 104 + DURATION_COUNTS 49（7 duration×7 文件）+ FS_CSS 7；
  展开行断言复制数吻合（4979-4819=160，普通面先行统计对照）。
- DURATION_COUNTS 第 2 消费位建模样例：`（出现 ⟨nse:css⟩ 次）`/`⟨nse:wsCss⟩`
  ——W3 语义（源文本变=键变=红）落地。
- skipSites=15：14 处模块级 helper skipIfPending 体内 + 1 处 describe 体顶层
  （reader-scroll.spec.ts:283），文件级多重集全收。
- **数字口径差异申报**：简报/设计写「185 文件」，机器实测白名单=179
  （find tests -name '*.test.ts(x)/.spec.ts' | wc -l）；tests/ 全量 .ts/.tsx=187
  （含 tests/utils 6 件+e2e-env.ts 非白名单）+seed-paper.mjs。185 为设计时点
  快照或含非白名单口径，以实测 179 为准。
- check 基线复跑：exit 0（files/cases/assertions/skipSites 四计数 179/1623/4979/15 双侧一致）。

## 4. 九支变异矩阵（raw=f-testref00-mutation-raw.txt，逐支实测）

| # | 变异（目标文件） | 实测输出 | exit | 还原 |
| --- | --- | --- | --- | --- |
| M1 | 删用例「body 视觉底换新 --bg…」（theme.test.ts:175） | MISSING_CASE file:line | 1 | sha256 一致 |
| M2 | 改 expect 字面量 overflow: hidden→hidden2 | MISSING_ASSERT（断言文本精确） | 1 | sha256 一致 |
| M3 | 新增用例 | 绿+NEW delta 行 | 0 | sha256 一致 |
| M4 | 加 it.only | ONLY_FORBIDDEN | 1 | sha256 一致 |
| M5 | 删基线文件 | exit 2 硬阻断（提示显式 baseline 命令） | 2 | sha256 一致 |
| M6 | 新用例带 it.skip | SKIP_ADDED（非 NEW delta——B2 生效） | 1 | sha256 一致 |
| M7 | 既有用例体内加 test.skip(expr,msg) | SKIPSITE_ADDED（文本多重集计数+1） | 1 | sha256 一致 |
| M8 | 删一处既有 skipSite（reader-scroll:283） | SKIPSITE_REMOVED | 1 | sha256 一致 |
| M9 | describe.only 包既有用例 | ONLY_FORBIDDEN（W1 传播）+伴生 MISSING_CASE | 1 | sha256 一致 |

九支还原一律 cp 文件备份法（cp→变异→测→mv→sha256 前后比对），未用任何
git checkout/restore；还原后总绿 exit 0（raw 末段）。M9 的 MISSING_CASE 为
伴生输出（签名含传播 only 必失配），预期验证点 ONLY_FORBIDDEN 满足。

## 5. verify 与 locks 实录

- `npm run verify` 真退出码 **VERIFY-EXIT=0**（f-testref00-verify-raw.txt 尾行；
  链=quality:check → **test-surface:check**（第 24-28 行在档）→ tickets:check
  → locks:check → lint → typecheck → test → build）。
- locks：generate（manifest 323 条）→ apply（323 文件设只读）→ check 通过。
  322→323 = +scripts/test-surface/extract.mjs（walk scripts 递归 .mjs 自动收）；
  check-test-surface.mjs 骨架原已在册（本次 sha 更新）。
- 工作树终态：修改 6 件（ci.yml/AGENTS.md/methodology.md/manifest/package.json/
  check-test-surface.mjs）+新增（baseline/exemptions/test-surface/ 目录+本报告等
  证据件）；tests/** 与 src/** 零改动（git status+变异 sha256 双证）；无
  .mutbak/探针残留。

## 6. 自裁申报（一切超票面/超设计字面决定）

1. **skipSites 文件级建模**（设计定稿 §2「CaseEntry 增 skipSites」→实现为
   FileSurface 级多重集）。依据：存量 15 处中 14 处物理位于模块级 helper
   （skipIfPending）体内、1 处在 describe 体顶层——用例级归因需调用内联且按
   调用点数放大（reader-text 单文件 17 个调用点≠1 处源码），DoD 硬项
   「skipSites=15」无法达成。防削弱语义等价论证：新增依赖门调用=计数+1→
   SKIPSITE_ADDED 红；删调用=REMOVED 红；删整个用例由 MISSING_CASE 兜底。
   豁免条目相应扩展 skipSiteText 匹配键（M7/M8 红证验证）。
2. **漏扫哨兵 AST 形态判定**（设计 W6 正则 → AST）。依据：纯正则实测唯一命中
   tests/utils/guard.ts 的 `describe(label, fn)` 转发调用（双标识符参），与 DoD
   「UNRESOLVABLE=0」冲突。AST 判定=callee 纯标识符 it/test/describe 且（首参
   字符串字面量或任一参函数字面量）——真用例文件必含函数字面量参数（防漏
   等价），转发调用不命中（防误伤）。
3. **baseline/exemptions 两 JSON 未入 locks manifest**。依据：受锁集合硬编码于
   check-locks.mjs/get-protected-files.ps1（修改超本票允许写面；先例
   dup-constants.baseline.json 是显式硬编码登记的）。残留风险：篡改两 JSON 不触
   发 locks 红（但会触发指纹门 diff 可见性/门二机器面核对）。建议主控收口裁量
   是否扩 protectedFiles 登记（走 [locked-change]）。
4. **CI 白名单补 scripts/audits/**`（设计 §7 白名单只列 docs/audits/**——
   ai-dev-org 惯例路径）。本仓证据目录实态=scripts/audits/**，战役票证据件入库
   需放行；宽松向微调、非代码面，ci.yml 注释在档。
5. **each 元组内非字面量位=⟨nse⟩ 占位不红**。设计 §3-4 括号「元素为字面量/
   字面量元组」严格读会把 DURATION_COUNTS/FS_CSS（元组第 2 位 css 等标识符）
   判保守红，与简报「css/wsCss 为非静态位——标记替换后行计数仍入多重集」及
   DoD「3 处 it.each 全部成功建模」冲突——按简报+W3 终案口径实现；数组**顶层**
   非字面量元素仍保守红。
6. **体内字面量真值 skip 归并 skipSites 桶**（0 参 test.skip()/静态 truthy 条件）
   ——设计「按新增 skip 红处理（等价声明）」在文件级建模下的等价实现（新增即
   SKIPSITE_ADDED 红）；本仓存量 0 处，纯语义完备性处理。
7. **stats 子命令对 UNRESOLVABLE exit 1**（Kimi §7.1「不判定」指不做基线比对
   ——抽取面错误仍红，DoD 机检需要）。
8. **豁免 schema 匹配键三选一**（caseTitle/assertionText/skipSiteText 任一，
   file 恒必填）——Kimi §6 的 caseTitle 必填在 skipSite 豁免场景无语义；校验
   仍强制 reason+rulingLink（exit 3 面保留）。
9. **数字口径**：简报 185 文件 vs 实测 179（见 §3 差异申报）。
10. **CASE_TODO/CASE_FIXME 变量名**：vitest API（it.todo/it.fixme）建模命名，
    非占位标记（\bTODO\b 词边界不匹配 _TODO；check-quality 扫描域=src+tests
    不含 scripts；verify 全链绿实证）。

## 7. 疑虑（供门一/门二/主控裁量）

- 基线 23729 行较大——cases 按 key 含 describePath 冗余（设计字段如此，未裁）；
  若门二认为体积需优化，可在后续票把 describePath 从每 case 提到文件级前缀树（S 面重构，非本票面）。
- 同 key 重复用例（Q5）本仓存量未单独统计——算法按多重集计数处理（W4），无配对歧义；
  若后续出现同 key 用例，豁免宜附 assertionText 消歧（N2 已知限制头注在档）。
- `$name`/`${path}` 占位形态（Kimi §3.4 $ 子集）实现为保守红（本仓 0 处；v1
  宁红走豁免）；printf %o/%f 同保守红。
- verify 含 vitest 全量+build，本机全链 ~5 分钟；指纹门自身抽取 179 文件 <2s
  （秒级，无性能面担忧）。

## 8. 回炉轮 1（门一 R1 放行附条件——B1b/W5/W6/W7/W8/W10/W1+W3+W4/N10+N6）

门一报告=scripts/audits/f-testref00-gate1-r1.md（B1/W11/W1-W10/N1-N10）。逐项落实态：

### 8.1 必改项（全部 ADDRESSED）

| 门一条目 | 落实 | 证据 |
| --- | --- | --- |
| B1b+N7 基线健全性 | loadBaseline 增三重下限：files 非空+stats.fileCount===keys 数+stats.caseCount>=1，违者 corrupt（exit 2）；stats 字段用活（N7 死字段收口） | raw「[R1] b1b-empty-baseline」段：空基线→「基线损坏…exit 2」真退出码 2（首测 EXIT=0 系 tee 管道测量的失误，复测行更正在档） |
| W5 先阻断后写盘 | cmdBaseline 改序：UNRESOLVABLE 非空 die(1) 在 writeFileSync 之前（禁写脏基线） | 主件 cmdBaseline 顺序；本轮基线再生成走该路径（UNRESOLVABLE=0 写盘） |
| W8 双桶 | conditionalSkipSites（非字面量条件，双向红）+hardSkipSites（0 参/字面量真值：新增=SKIPSITE_ADDED 红、删除=ACTIVATED 绿 delta）；stats 新增 conditionalSkipSiteCount/hardSkipSiteCount，skipSiteCount=两者和（向后兼容）；基线结构随之再生成 | raw「[R1] m10-theme」（hard 新增→SKIPSITE_ADDED exit 1）+「[R1] m10-removed-half」（基线含 hard=1→还原文件→ACTIVATED delta 行+exit 0，双 sha 还原一致） |
| W6 import 别名 | importAliasCheck：vitest/@playwright/test 源的 it/test/describe 说明符真别名（imported∈三词且 local≠imported）或伪装本地名（local∈三词但 imported∉）→UNRESOLVABLE；**超裁决保守向**：namespace import 同红（v.it() 形态 calleeText 白名单外，堵漏抽通道；存量 0 处——grep 预检实证 tests 下 namespace import 仅 1 处且源为 src/shared 不触发）；default import 本地名∈三词同红。白名单+非白名单域均查 | stats 复跑 UNRESOLVABLE=0（存量零命中）；`_electron as electron` 别名（imported∉三词）不误伤 |
| W7 哨兵扩 | callee 识别面扩：纯标识符三词 或 PropertyAccess 形态（calleeText 匹配 /^(it|test|describe)\./）；命中后仍按参数形态判定（首参字符串字面量/任一参函数字面量）——guard.ts 的 describe(label,fn) 与 describe.skip(label,fn) 转发（双标识符参）不误伤、带回调真用例不漏；WHITELIST_RE 加 spec\.tsx（存量 0 个） | stats UNRESOLVABLE=0（guard.ts 不红实证） |
| W10 NEW 可见性 | NEW delta 行附断言计数：「NEW … (line N, M assertions)」（M=0 零断言新用例一眼可辨）；NEW_FILE 分支逐用例 NEW 行同款 | 主件 deltas.push 两处 |
| W1 merge-safe | `git show --name-only --format=` → `git diff-tree --no-commit-id --name-only -m -r`（merge 对双父并集=保守向），注释引门一 W1 | ci.yml 范围闸 step |
| W3 正则收紧 | scripts/ 段白名单合并为带结尾锚复合式（禁 check-test-surface-evil/ 前缀逃逸与 .mjs.bak 残留形态），本地验证：src/**+evil 前缀+.bak 三类应红路径实测红、合法路径全过 | 本地 echo|grep -Ev 实测（会话执行在档）；ci.yml 注释引 W3 |
| W4 BASE 兜底 | BASE 不可达→`git fetch origin main`+`git merge-base origin/main HEAD` 兜底；仍失败才跳过且 ::notice 升 ::warning | ci.yml 范围闸 step，注释引 W4 |
| N10 受锁声明 | extract.mjs 头注补「[locked-change] 声明面随主件——门一 N10 补齐」 | extract.mjs 头注 |

### 8.2 主控裁定接受项（注记落位）

- W2（尾注自愿制）：ci.yml 注释补论证一句（locks sha+[locked-change] guard 独立守护，范围闸=战役附加层）——已落。
- W9（豁免低摩擦）：豁免件入锁已由主控面完成（protectedFiles 登记，manifest 325 条含两 JSON）+门二人审通道——本票不改逻辑。
- W11（CASE_TODO 命名）：extract.mjs 定义行加注「vitest API 建模命名非占位标记（W11 裁定）」——已落。
- N4（签名不含 skipSites）：文件级建模必然推论，接受。
- N6（CONSERVATIVE_REDS 扩展）：**此处补申报**——it.concurrent/test.extend/describe.configure/test.describe.configure/it.skipIf/it.runIf/test.skipIf/test.runIf 超设计 §3.5 清单纳入保守红（v1 宁红走豁免向，存量 0 处）。

### 8.3 回炉轮新数字（机器实测）

- stats：`{"fileCount":179,"caseCount":1623,"assertionCount":4979,"skipSiteCount":15,
  "conditionalSkipSiteCount":15,"hardSkipSiteCount":0,"ticketIdCount":57,
  "eachExpandedRows":160,"unresolvableCount":0}`——UNRESOLVABLE=0 维持（W6/W7 扩面零误伤实证）。
- 基线再生成（双桶结构+stats 新字段）：23910 行；check 复跑 exit 0；确定性维持。
- 行数：主件 386 / extract.mjs 477（均 ≤500）。
- 变异复证：M6（SKIP_ADDED）/M7（conditional 增→SKIPSITE_ADDED）/M8（conditional 删→SKIPSITE_REMOVED）各 exit 1+sha 还原一致；M10 新增半（hard 增→SKIPSITE_ADDED exit 1）；M10 删除半（基线 hard=1→还原→ACTIVATED delta+exit 0）；B1b（空基线→exit 2）；还原后总绿 exit 0。
- verify 回炉轮全链真退出码 **VERIFY-EXIT=0**（verify-raw 追加段；test-surface:check 链中在档）。
- locks：generate 后 manifest 325 条（322 原面+extract.mjs+baseline.json+exemptions.json——后两者系主控面已扩 protectedFiles 登记后的自动收锁）；locks:check 过（325 一致）。未 apply（主控收口统一）。

### 8.4 回炉轮自裁申报（新增）

1. **namespace import 保守红**（超主控裁决字面）：vitest/@playwright/test 的 `import * as X` → UNRESOLVABLE（X.it() 形态 calleeText 不匹配白名单=漏抽通道）。存量 0 处（tests 下 namespace import 仅 src/shared 源 1 处不触发），零摩擦。
2. **新文件 skipSites 双桶新增红**（超裁决补面）：NEW_FILE 分支补 conditional/hard 双桶新增→SKIPSITE_ADDED（B1「新增=红」语义本应覆盖新文件场景；v1 首版此面漏判，门一未点名，本轮顺手闭合）。
3. **B1b 首测 EXIT=0 测量误差**：raw 中 b1b 段首测 EXIT=0 系 bash 管道 `$?` 取了 tee 退出码；复测行（「[R1 复测] …真退出码 EXIT=2」）已更正在档——证据诚实性主动申报。

---
## 附 3 终态 diff（1045 行；基线 test-surface.baseline.json 为机器生成数据件不呈全文——sha256 前 16 位 f10502bd4598f002/23910 行）

commit ff96cb1f021eaa222acd969cc0a1da748359262b
Author: user <user@local>
Date:   Sat Sep 12 02:09:06 2026 +0800

    fix(F-TESTREF-00): 测试面指纹门落地 [locked-change][test-refactor]——测试优化战役 P0 收口（三屋全链：门一 R1/R2+门二 PASS）
    
    - 交付件：check-test-surface.mjs 386 行（判定+豁免+CLI 三子命令）+test-surface/extract.mjs 477 行（AST 抽取器——W8 拆分，均 ≤500）+基线 23910 行（179 文件/1623 用例/4979 断言/15 skipSite/each 160 行/UNRESOLVABLE=0）+空豁免清单
    - 判定语义（设计定稿=docs/design/2026-09-11_f-testref00-design-final.md）：C_after ⊇ C_before 多重集（同 key 签名计数比对 O(n)）；conditionalSkipSites 双向红+hardSkipSites 增红删绿（ACTIVATED）；only 恒红含 describe 传播；新增放行+delta（NEW 行含断言计数）；容差 v1 不判方向一律红走豁免（exemptions.json reason+rulingLink 强制）
    - 三态 skip 建模：声明后缀=markers/0 参或字面量真值=hard 桶/非字面量条件=conditional 桶——存量 15 处依赖门惯用法全部成功建模（14 helper 体内+1 describe 顶层——文件级多重集[自裁①门一预裁接受]）；it.each const 单跳解析+⟨nse:源文本⟩ 非静态位摘要；expect=最外层调用空白归一全记；import 别名/namespace 保守红；漏扫哨兵 AST+后缀域+spec.tsx
    - 基线健全性三重下限（空/退化 files=exit 2——门一 B1b）+cmdBaseline 先阻断后写（W5）；基线/豁免入 protectedFiles 双侧登记（信任根受锁——门一 B1a）；locks 322→325（319→322 为前批立案——门二 N2 勘正）
    - 挂载：package.json 三 scripts+verify 链 quality 后；ci.yml lock-change-guard 追加 [test-refactor] 逐提交范围闸（diff-tree -m[W1]+结尾锚[W3]+merge-base 兜底[W4]+尾注自愿制论证[W2]）；AGENTS 第 7 条+methodology §4 注记
    - 门审全链：门一 R1 deepseek 兜底（双 Kimi 源 504×6 状态机换源——B1 空基线恒绿通道/W11/N10 放行附条件）→回炉轮 1 八项修复+两新自裁（namespace 红/新文件桶增红——R2 裁定接受）→门一 R2 kimi-main 第三退避 862s 收口放行（B0/W1→S1/N6）→门二统一档 PASS（B0/W1[raw 落款补]/N2[registry 勘正]——四清单+一全 PASS+verify 独立亲跑 exit=0）；主控过程自纠一次：门二前误提交→软重置补门二后重提交（教训入 v60）
    - 变异矩阵 M1-M9+M10 双半+B1b+M3/M5 主控补证复跑全过（cp 备份法 sha 还原一致；主控亲历 shell 四坑之二 node -e 中文 GBK 化——探针文件法修正实录入 raw）
    - registry：F-TESTREF-00 翻 done+F-TESTREF-S1 登记open（W12 哨兵 each/N11 本地别名/N15 type-only——零存量随战役搭车）；FINAL_VERIFY_EXIT=0 亲验两跑落盘（162 文件/1579 用例基线不变）；证据群 19 件入库

diff --git a/.github/workflows/ci.yml b/.github/workflows/ci.yml
index 17cfa9d899..e56ba5ceb6 100644
--- a/.github/workflows/ci.yml
+++ b/.github/workflows/ci.yml
@@ -112,3 +112,42 @@ jobs:
             fi
           fi
           echo "manifest 无变更或已带尾注"
+
+      # [F-TESTREF-00] 测试重构战役范围闸（设计定稿 §7-W7 终案：逐提交判定）。
+      # 带 [test-refactor] 尾注的提交 diff 路径必须 ⊆ 战役白名单（src/** 一律红）。
+      # 尾注自愿制=设计 W7 语义（W2 门一裁定接受）：测试面另有 locks sha 锁+
+      # [locked-change] guard 独立守护，本范围闸=战役附加层，无强制闭合非缺陷。
+      # package.json 放行论证=依赖变更已被 verify job 的 [dep-change] guard 独立
+      # 拦截，双闸正交。scripts/audits/** 为本仓证据目录实态（设计白名单
+      # docs/audits/** 之外补登——实现票自裁申报在档）。
+      # W3（门一回炉）：白名单正则带结尾锚（禁 scripts/check-test-surface-evil/
+      # 前缀逃逸）。W1（门一回炉）：git diff-tree -m -r 取 merge 双父并集（保守向）。
+      # W4（门一回炉）：BASE 不可达先 fetch origin main 兜底 merge-base，仍失败
+      # 才跳过且 notice 升 warning。
+      - name: 测试重构战役范围闸（[test-refactor]）
+        shell: bash
+        run: |
+          BASE="${{ github.event.pull_request.base.sha || github.event.before }}"
+          if [ -z "$BASE" ] || ! git cat-file -e "$BASE^{commit}" 2>/dev/null; then
+            echo "事件基线不可达，尝试 origin/main 兜底（门一 W4）"
+            git fetch origin main >/dev/null 2>&1 || true
+            BASE=$(git merge-base origin/main HEAD 2>/dev/null || true)
+          fi
+          if [ -z "$BASE" ] || ! git cat-file -e "$BASE^{commit}" 2>/dev/null; then
+            echo "::warning::基线不可用（新分支首推/强推重写且 origin/main 兜底失败），跳过范围闸（门一 W4）"
+            exit 0
+          fi
+          TR_RE='^tests/|^scripts/(check-test-surface(\.mjs)?$|test-surface(\.mjs)?$|test-surface/|test-surface\.(baseline|exemptions)\.json$)|^\.github/workflows/|^package(-lock)?\.json$|^docs/prompts/|^docs/design/|^tickets/registry\.ts$|^locks/manifest\.json$|^AGENTS\.md$|^docs/(methodology|invariants)\.md$|^docs/audits/|^scripts/audits/'
+          BAD=0
+          for C in $(git log --format=%H "$BASE..HEAD"); do
+            if git log -1 --format=%B "$C" | grep -q '\[test-refactor\]'; then
+              OFF=$(git diff-tree --no-commit-id --name-only -m -r "$C" | grep -Ev "$TR_RE" || true)
+              if [ -n "$OFF" ]; then
+                echo "::error::提交 ${C:0:8} 带 [test-refactor] 但 diff 超出战役白名单（src/** 等禁止；门一 W1/W3 修正版）："
+                echo "$OFF"
+                BAD=1
+              fi
+            fi
+          done
+          if [ "$BAD" -eq 0 ]; then echo "范围闸通过（无 [test-refactor] 提交或全部在白名单内）"; fi
+          exit $BAD
diff --git a/AGENTS.md b/AGENTS.md
index a27b257c49..08ab691289 100644
--- a/AGENTS.md
+++ b/AGENTS.md
@@ -126,6 +126,7 @@ development Model Selection+loop-engineering references/06）；**架构与
 4. `npm run verify` 绿 → 报告人类审查 `git diff` → 人类翻 registry 状态 → 提交。
 5. 卡住了就停，报告卡点；**不许删检查、不许放宽断言、不许引入新依赖**。
 6. 测试红了先怀疑自己的实现；确认是测试/契约问题 → 停下报告。
+7. **[test-refactor] 测试重构战役票**：动 tests/** 须双尾注 `[locked-change][test-refactor]`——CI 范围闸机检 diff 路径白名单（src/** 红）、verify 的 `test-surface:check` 机检契约面 C_after ⊇ C_before；有意收紧/删改先取主控裁决再落 `scripts/test-surface.exemptions.json` 豁免（reason+rulingLink）；战役毕基线再生成走 `npm run test-surface:baseline`+全量 diff 审计（设计定稿=docs/design/2026-09-11_f-testref00-design-final.md）。
 
 ### 闲时连续开发（无人值守场，2026-09-03 立制）
 
diff --git a/docs/methodology.md b/docs/methodology.md
index 2175d87e0e..a247cc092a 100644
--- a/docs/methodology.md
+++ b/docs/methodology.md
@@ -153,6 +153,9 @@ commit 长 message。
 > 改空即用，模板偏差=回炉主要来源，勿即兴。
 > 通用模板版=ai-dev-org references/02 §4/07（2026-09-10 doc-align 注记）；
 > 本节为 Synapse 实例（含 ⑤a~⑤i 项目条款）。
+> [test-refactor] 测试重构战役票规约（2026-09-11 F-TESTREF-00 起）：双尾注
+> `[locked-change][test-refactor]`+CI 范围闸+指纹门（C 面 ⊇ 机检），详见
+> docs/design/2026-09-11_f-testref00-design-final.md。
 
 ### 4.1 实现者简报模板（主控→实现者子代理）
 
diff --git a/package.json b/package.json
index faec9dd2b4..ecb71004c6 100644
--- a/package.json
+++ b/package.json
@@ -20,10 +20,13 @@
     "typecheck": "tsc --noEmit -p tsconfig.node.json && tsc --noEmit -p tsconfig.web.json",
     "lint": "eslint .",
     "lint:dup-constants": "node scripts/check-dup-constants.mjs",
+    "test-surface:check": "node scripts/check-test-surface.mjs check",
+    "test-surface:baseline": "node scripts/check-test-surface.mjs baseline",
+    "test-surface:stats": "node scripts/check-test-surface.mjs stats",
     "test": "node scripts/sqlite-abi.mjs use node && vitest run",
     "test:watch": "vitest",
     "test:e2e": "npm run build && playwright test",
-    "verify": "npm run quality:check && npm run tickets:check && npm run locks:check && npm run lint && npm run typecheck && npm run test && npm run build",
+    "verify": "npm run quality:check && npm run test-surface:check && npm run tickets:check && npm run locks:check && npm run lint && npm run typecheck && npm run test && npm run build",
     "quality:check": "node scripts/check-quality.mjs",
     "tickets:check": "node scripts/check-tickets.mjs",
     "locks:generate": "powershell -NoProfile -ExecutionPolicy Bypass -File scripts/lock-protected.ps1 -GenerateOnly",
diff --git a/scripts/check-locks.mjs b/scripts/check-locks.mjs
index e29313aa82..cd0b55ce87 100644
--- a/scripts/check-locks.mjs
+++ b/scripts/check-locks.mjs
@@ -41,6 +41,10 @@ function protectedFiles() {
     // [F-LINT-02] baseline 棘轮防绕过（终裁 §3）：scripts/*.json 不在 walk 自动面，
     // 单文件显式登记——baseline 变更必经 [locked-change] 人类审查位
     join(root, 'scripts', 'dup-constants.baseline.json'),
+    // [F-TESTREF-00] 指纹门信任根入锁（门一 R1 B1）：基线/豁免被清空或篡改
+    // 若不受锁=门对削弱静默放行（sha256 对账拦截）——与 ps1 侧 Get-ProtectedFiles 对齐
+    join(root, 'scripts', 'test-surface.baseline.json'),
+    join(root, 'scripts', 'test-surface.exemptions.json'),
     ...walk(join(root, 'scripts'), (p) => p.endsWith('.mjs') || p.endsWith('.ps1'))
   ].filter((p) => existsSync(p))
   return [...new Set(files)].sort()
diff --git a/scripts/check-test-surface.mjs b/scripts/check-test-surface.mjs
index 5f61b56550..1e3f8b3aa5 100644
--- a/scripts/check-test-surface.mjs
+++ b/scripts/check-test-surface.mjs
@@ -1,14 +1,386 @@
+#!/usr/bin/env node
 /**
- * [F-TESTREF-00] 测试面指纹门——立案骨架（设计链进行中，本件为票面载体）。
+ * [F-TESTREF-00] 测试面指纹门 check-test-surface.mjs（受锁文件）。
  *
  * 职责：抽取 tests/** 契约面（C 面=用例标题多重集+expect 断言规范化文本多重集
- * +guardedDescribe 工单号集+skip/only 标记）与基线比对，C_after ⊇ C_before
- * 多重集判定——「测试不可静默削弱」从纪律升级为机检。设计定稿=
- * docs/design/（F-TESTREF-00 设计链三跳档）；裁决参数=
- * docs/design/2026-09-11_glm-ruling-arch-complexity-and-test-campaign.md §4-2。
- *
- * 本骨架在票收口前不接入 verify 链与 CI——门未上线即不执法。
- * 实现须含三支变异红证（删用例→红/改断言字面量→红/加用例→绿+delta）。
- * 受锁件（诞生即 locks:generate+apply）。[test-refactor][locked-change]
+ * +guardedDescribe 工单号集+skip/only 标记+体内条件 skip 文本多重集）与基线比对，
+ * C_after ⊇ C_before 多重集判定——「测试不可静默削弱」从纪律升级为机检。设计定稿=
+ * docs/design/2026-09-11_f-testref00-design-final.md（裁决参数：W1 传播/W2 断言
+ * 单元/W4 签名计数/B1 skipSites 双向红/B2 SKIP_ADDED/W5 ACTIVATED/W6 哨兵）；
+ * 裁决链=docs/design/2026-09-11_glm-ruling-arch-complexity-and-test-campaign.md §4-2。
+ *
+ * 抽取器 lib=scripts/test-surface/extract.mjs（两处实现自裁见该件头注：
+ * skipSites 文件级多重集、哨兵 AST 形态判定）。
+ *
+ * exit code：0=通过（delta 绿）/ 1=契约违背或 UNRESOLVABLE / 2=基线缺失或损坏
+ * （硬阻断禁自愈——显式执行 `npm run test-surface:baseline` 并全量审计 diff）/
+ * 3=豁免清单 schema 非法。baseline 子命令仅显式调用（本脚本无任何红了重写分支）。
+ *
+ * 用例闸=指纹闸蕴含（caseCount 单调不减是 ⊇ 的推论，delta 汇总行显式打印计数）。
+ * [test-refactor][locked-change]
  */
-process.exit(0)
+import { existsSync, readFileSync, writeFileSync } from 'node:fs'
+import { join } from 'node:path'
+import { pathToFileURL } from 'node:url'
+import { extractAll, statsOf } from './test-surface/extract.mjs'
+
+const BASELINE_PATH = 'scripts/test-surface.baseline.json'
+const EXEMPTIONS_PATH = 'scripts/test-surface.exemptions.json'
+
+function die(code, msg) {
+  console.error(msg)
+  process.exit(code)
+}
+
+function loadBaseline(root) {
+  const p = join(root, BASELINE_PATH)
+  if (!existsSync(p)) return { missing: true }
+  try {
+    const parsed = JSON.parse(readFileSync(p, 'utf8').replace(/^\uFEFF/, ''))
+    if (parsed?.version !== 1 || parsed?.files === null || typeof parsed.files !== 'object' || Array.isArray(parsed.files)) {
+      return { corrupt: true }
+    }
+    // 基线健全性下限（门一 B1b+N7）：空/退化 files 使 C_after ⊇ ∅ 恒真——按
+    // corrupt（exit 2 硬阻断）处理；stats 字段同时用活（死字段 N7 收口）。
+    const fileCount = Object.keys(parsed.files).length
+    if (fileCount < 1 || !parsed.stats || typeof parsed.stats !== 'object' || parsed.stats.fileCount !== fileCount || !(parsed.stats.caseCount >= 1)) {
+      return { corrupt: true }
+    }
+    return { files: parsed.files, stats: parsed.stats }
+  } catch {
+    return { corrupt: true }
+  }
+}
+
+/** 豁免清单加载+schema 校验（Kimi §6：reason/rulingLink 非空必填；匹配键≥1） */
+function loadExemptions(root) {
+  const p = join(root, EXEMPTIONS_PATH)
+  const empty = { entries: [] }
+  if (!existsSync(p)) return empty
+  let parsed
+  try {
+    parsed = JSON.parse(readFileSync(p, 'utf8').replace(/^\uFEFF/, ''))
+  } catch (e) {
+    die(3, `[test-surface] 豁免清单损坏：${EXEMPTIONS_PATH} JSON 解析失败（${e.message}）—— schema 非法即红`)
+  }
+  if (parsed?.version !== 1 || !Array.isArray(parsed?.entries)) {
+    die(3, `[test-surface] 豁免清单 schema 非法：须为 {version:1, entries:[...]}（exit 3）`)
+  }
+  for (const e of parsed.entries) {
+    const hasMatcher = e.caseTitle !== undefined || e.assertionText !== undefined || e.skipSiteText !== undefined
+    if (typeof e.file !== 'string' || e.file === '' || !hasMatcher || typeof e.reason !== 'string' || e.reason === '' || typeof e.rulingLink !== 'string' || e.rulingLink === '') {
+      die(3, `[test-surface] 豁免条目 schema 非法（须含 file+匹配键 caseTitle/assertionText/skipSiteText 至少其一+非空 reason+rulingLink）：${JSON.stringify(e)}`)
+    }
+  }
+  return { entries: parsed.entries }
+}
+
+function caseSignature(c) {
+  return JSON.stringify({ a: [...c.assertions].sort(), m: [...c.markers].sort() })
+}
+
+function countMultiset(items) {
+  const m = new Map()
+  for (const it of items) m.set(it, (m.get(it) ?? 0) + 1)
+  return m
+}
+
+/** 豁免匹配（N2 从宽：file 精确+匹配键精确；同 title 重复用例=已知限制，条目宜附细键） */
+function exemptionHits(exemptions, kind, file, payload) {
+  const hits = []
+  for (const e of exemptions.entries) {
+    if (e.file !== file) continue
+    if (kind === 'case' && e.caseTitle === payload.title && (e.assertionText === undefined || payload.assertions.includes(e.assertionText))) hits.push(e)
+    if (kind === 'assert' && e.assertionText === payload.assertionText && (e.caseTitle === undefined || e.caseTitle === payload.title)) hits.push(e)
+    if (kind === 'skipsite' && e.skipSiteText === payload.text) hits.push(e)
+  }
+  return hits
+}
+
+function fmtRelLine(file, line) {
+  return line === undefined ? file : `${file}:${line}`
+}
+
+/** 主判定：返回 { failures:[], deltas:[], exemptHits:Set, statsLine } */
+function judge(baseFiles, cur) {
+  const failures = []
+  const deltas = []
+  const exemptHitKeys = new Set()
+  const paths = [...new Set([...Object.keys(baseFiles), ...cur.keys()])].sort()
+  let baseCaseTotal = 0
+  let curCaseTotal = 0
+  let baseAssertTotal = 0
+  let curAssertTotal = 0
+  let baseSkipTotal = 0
+  let curSkipTotal = 0
+
+  for (const path of paths) {
+    const b = baseFiles[path]
+    const c = cur.get(path)
+    if (b && !c) {
+      failures.push({ kind: 'FILE_MISSING', path, line: undefined, text: path })
+      baseCaseTotal += b.cases.length
+      baseSkipTotal += b.conditionalSkipSites.length + b.hardSkipSites.length
+      for (const cs of b.cases) baseAssertTotal += cs.assertions.length
+      continue
+    }
+    if (!b && c) {
+      deltas.push(`NEW_FILE ${path}（${c.cases.length} 用例）`)
+      curCaseTotal += c.cases.length
+      curSkipTotal += c.conditionalSkipSites.length + c.hardSkipSites.length
+      for (const cs of c.cases) curAssertTotal += cs.assertions.length
+      // 新文件体内 skip 双桶亦=「新增」→红（B1 语义覆盖新文件场景——回炉轮
+      // 补面，保守向申报；豁免通道同款）
+      for (const text of c.conditionalSkipSites) {
+        if (exemptionHits(loadExemptionsCache, 'skipsite', path, { text }).length === 0) {
+          failures.push({ kind: 'SKIPSITE_ADDED', path, line: undefined, text })
+        }
+      }
+      for (const text of c.hardSkipSites) {
+        if (exemptionHits(loadExemptionsCache, 'skipsite', path, { text }).length === 0) {
+          failures.push({ kind: 'SKIPSITE_ADDED', path, line: undefined, text })
+        }
+      }
+      for (const cs of c.cases) {
+        if (cs.markers.includes('skip') && exemptionHits(loadExemptionsCache, 'case', path, cs).length === 0) {
+          failures.push({ kind: 'SKIP_ADDED', path, line: cs.line, text: cs.title })
+        } else {
+          deltas.push(`NEW ${path} › ${cs.title} (line ${cs.line}, ${cs.assertions.length} assertions)`)
+        }
+      }
+      continue
+    }
+    // 两态比对
+    baseCaseTotal += b.cases.length
+    curCaseTotal += c.cases.length
+    baseSkipTotal += b.conditionalSkipSites.length + b.hardSkipSites.length
+    curSkipTotal += c.conditionalSkipSites.length + c.hardSkipSites.length
+    for (const cs of b.cases) baseAssertTotal += cs.assertions.length
+    for (const cs of c.cases) curAssertTotal += cs.assertions.length
+
+    // ticketIds：基线 ⊄ 当前 → 红
+    const curTickets = new Set(c.ticketIds)
+    for (const id of b.ticketIds) {
+      if (!curTickets.has(id)) failures.push({ kind: 'TICKETS_MISSING', path, line: undefined, text: id })
+    }
+
+    // only（含 W1 传播）恒红
+    for (const cs of c.cases) {
+      if (cs.markers.includes('only')) failures.push({ kind: 'ONLY_FORBIDDEN', path, line: cs.line, text: cs.title })
+    }
+
+    // conditionalSkipSites：文件级多重集双向红（设计 B1——非字面量条件形态）
+    const bCond = countMultiset(b.conditionalSkipSites)
+    const cCond = countMultiset(c.conditionalSkipSites)
+    for (const [text, n] of bCond) {
+      const curN = cCond.get(text) ?? 0
+      for (let i = 0; i < n - curN; i++) {
+        const hit = exemptionHits(loadExemptionsCache, 'skipsite', path, { text })
+        if (hit.length > 0) exemptHitKeys.add(`skipsite:${path}:${text}`)
+        else failures.push({ kind: 'SKIPSITE_REMOVED', path, line: undefined, text })
+      }
+    }
+    for (const [text, n] of cCond) {
+      const baseN = bCond.get(text) ?? 0
+      for (let i = 0; i < n - baseN; i++) {
+        const hit = exemptionHits(loadExemptionsCache, 'skipsite', path, { text })
+        if (hit.length > 0) exemptHitKeys.add(`skipsite:${path}:${text}`)
+        else failures.push({ kind: 'SKIPSITE_ADDED', path, line: undefined, text })
+      }
+    }
+
+    // hardSkipSites（门一 W8 终案）：新增=红（等价「新增 skip」）；删除=激活
+    // 绿+delta（与 markers 激活语义一致）；文本相同两桶间不互抵（桶隔离判定）。
+    const bHard = countMultiset(b.hardSkipSites)
+    const cHard = countMultiset(c.hardSkipSites)
+    for (const [text, n] of bHard) {
+      const curN = cHard.get(text) ?? 0
+      for (let i = 0; i < n - curN; i++) {
+        const hit = exemptionHits(loadExemptionsCache, 'skipsite', path, { text })
+        if (hit.length > 0) exemptHitKeys.add(`skipsite:${path}:${text}`)
+        else deltas.push(`ACTIVATED ${path} 「${text}」（hardSkipSite 删除）`)
+      }
+    }
+    for (const [text, n] of cHard) {
+      const baseN = bHard.get(text) ?? 0
+      for (let i = 0; i < n - baseN; i++) {
+        const hit = exemptionHits(loadExemptionsCache, 'skipsite', path, { text })
+        if (hit.length > 0) exemptHitKeys.add(`skipsite:${path}:${text}`)
+        else failures.push({ kind: 'SKIPSITE_ADDED', path, line: undefined, text })
+      }
+    }
+
+    // 用例按 key 分组 → 签名多重集计数 ⊆ 判定（W4）
+    const bGroups = new Map()
+    for (const cs of b.cases) {
+      if (!bGroups.has(cs.key)) bGroups.set(cs.key, [])
+      bGroups.get(cs.key).push(cs)
+    }
+    const cGroups = new Map()
+    for (const cs of c.cases) {
+      if (!cGroups.has(cs.key)) cGroups.set(cs.key, [])
+      cGroups.get(cs.key).push(cs)
+    }
+
+    for (const [key, bCases] of bGroups) {
+      const cCases = cGroups.get(key) ?? []
+      const curSigs = countMultiset(cCases.map(caseSignature))
+      for (const bcs of bCases) {
+        const sig = caseSignature(bcs)
+        if ((curSigs.get(sig) ?? 0) > 0) {
+          curSigs.set(sig, curSigs.get(sig) - 1)
+          continue
+        }
+        // W5：skip→激活（绿+delta）
+        if (bcs.markers.includes('skip')) {
+          const activatedSig = JSON.stringify({ a: [...bcs.assertions].sort(), m: bcs.markers.filter((m) => m !== 'skip').sort() })
+          if ((curSigs.get(activatedSig) ?? 0) > 0) {
+            curSigs.set(activatedSig, curSigs.get(activatedSig) - 1)
+            deltas.push(`ACTIVATED ${path} › ${bcs.title} (line ${bcs.line})`)
+            continue
+          }
+        }
+        // 基线签名无配对 → MISSING_CASE（先试豁免，再 MISSING_ASSERT 细化）
+        const hit = exemptionHits(loadExemptionsCache, 'case', path, bcs)
+        if (hit.length > 0) {
+          exemptHitKeys.add(`case:${path}:${bcs.title}`)
+          continue
+        }
+        // MISSING_ASSERT 细化：当前同 key 存在 markers 同、断言为其子集的签名
+        const sigObj = JSON.parse(sig)
+        let detailed = false
+        for (const ccs of cCases) {
+          if (JSON.stringify([...ccs.markers].sort()) !== JSON.stringify(sigObj.m)) continue
+          const curA = countMultiset(ccs.assertions)
+          const missing = []
+          for (const a of bcs.assertions) {
+            const n = curA.get(a) ?? 0
+            if (n > 0) curA.set(a, n - 1)
+            else missing.push(a)
+          }
+          if (missing.length > 0 && missing.length < bcs.assertions.length) {
+            for (const a of missing) {
+              const ahit = exemptionHits(loadExemptionsCache, 'assert', path, { assertionText: a, title: bcs.title })
+              if (ahit.length > 0) exemptHitKeys.add(`assert:${path}:${a}`)
+              else failures.push({ kind: 'MISSING_ASSERT', path, line: bcs.line, text: a })
+            }
+            detailed = true
+            break
+          }
+        }
+        if (!detailed) failures.push({ kind: 'MISSING_CASE', path, line: bcs.line, text: bcs.title })
+      }
+    }
+
+    // 当前超出基线的签名 → NEW（带 skip → SKIP_ADDED，B2 含新用例形态）
+    for (const [key, cCases] of cGroups) {
+      void key
+      const bCases = bGroups.get(key) ?? []
+      const bNeed = countMultiset(bCases.map(caseSignature))
+      // skip 签名的激活回填位：基线 skip 版可消费当前无 skip 同断言签名（W5 已在上
+      // 半场消费并打 ACTIVATED——此处补记可激活位，防其落入 NEW/双报）
+      const activatable = new Map()
+      for (const bcs of bCases) {
+        if (!bcs.markers.includes('skip')) continue
+        const s = JSON.stringify({ a: [...bcs.assertions].sort(), m: bcs.markers.filter((m) => m !== 'skip').sort() })
+        activatable.set(s, (activatable.get(s) ?? 0) + 1)
+      }
+      for (const cs of cCases) {
+        const sig = caseSignature(cs)
+        if ((bNeed.get(sig) ?? 0) > 0) {
+          bNeed.set(sig, bNeed.get(sig) - 1)
+          continue
+        }
+        if ((activatable.get(sig) ?? 0) > 0) {
+          activatable.set(sig, activatable.get(sig) - 1)
+          continue
+        }
+        if (cs.markers.includes('skip')) {
+          const hit = exemptionHits(loadExemptionsCache, 'case', path, cs)
+          if (hit.length > 0) exemptHitKeys.add(`case:${path}:${cs.title}`)
+          else failures.push({ kind: 'SKIP_ADDED', path, line: cs.line, text: cs.title })
+          continue
+        }
+        deltas.push(`NEW ${path} › ${cs.title} (line ${cs.line}, ${cs.assertions.length} assertions)`)
+      }
+    }
+  }
+
+  const statsLine = `files: ${Object.keys(baseFiles).length} base / ${cur.size} cur | cases: ${baseCaseTotal} base / ${curCaseTotal} cur` +
+    ` | assertions: ${baseAssertTotal} base / ${curAssertTotal} cur | skipSites: ${baseSkipTotal} base / ${curSkipTotal} cur`
+  return { failures, deltas, exemptHitKeys, statsLine }
+}
+
+let loadExemptionsCache = { entries: [] }
+
+function serializeBaseline(surfaces, extraStats) {
+  const files = {}
+  for (const [p, s] of [...surfaces.entries()].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))) {
+    files[p] = {
+      ticketIds: [...s.ticketIds].sort(),
+      conditionalSkipSites: s.conditionalSkipSites,
+      hardSkipSites: s.hardSkipSites,
+      cases: s.cases.map((c) => ({
+        key: c.key,
+        describePath: c.describePath,
+        title: c.title,
+        markers: c.markers,
+        line: c.line,
+        assertions: c.assertions
+      }))
+    }
+  }
+  return JSON.stringify({ version: 1, files, stats: extraStats }, null, 2) + '\n'
+}
+
+function cmdStats(root) {
+  const { surfaces, unresolvable } = extractAll(root)
+  const stats = statsOf(surfaces, unresolvable)
+  for (const u of unresolvable) console.error(`UNRESOLVABLE ${u.file}:${u.line} ${u.reason}`)
+  console.log(`[test-surface] stats ${JSON.stringify(stats)}`)
+  if (unresolvable.length > 0) die(1, `[test-surface] 抽取含 ${unresolvable.length} 处不可静态判定（exit 1）`)
+}
+
+function cmdBaseline(root) {
+  const { surfaces, unresolvable } = extractAll(root)
+  for (const u of unresolvable) console.error(`UNRESOLVABLE ${u.file}:${u.line} ${u.reason}`)
+  const stats = statsOf(surfaces, unresolvable)
+  // W5（门一回炉）：UNRESOLVABLE 非空先阻断后写盘——禁写脏基线（surfaces 缺
+  // 失该用例却落盘，后续 check 复用即静默脏基线）
+  if (unresolvable.length > 0) die(1, `[test-surface] 基线生成期含 ${unresolvable.length} 处不可静态判定（exit 1，基线未写入——先改写为静态形态或裁决豁免）`)
+  writeFileSync(join(root, BASELINE_PATH), serializeBaseline(surfaces, stats), 'utf8')
+  console.log(`[test-surface] baseline 已写入 ${BASELINE_PATH}`)
+  console.log(`[test-surface] stats ${JSON.stringify(stats)}`)
+}
+
+function cmdCheck(root) {
+  const bl = loadBaseline(root)
+  if (bl.missing || bl.corrupt) {
+    die(2, `[test-surface] 基线${bl.missing ? '缺失' : '损坏'}：${BASELINE_PATH}（exit 2 硬阻断禁自愈）——显式执行 \`npm run test-surface:baseline\` 再生成并对基线 diff 做全量审计`)
+  }
+  loadExemptionsCache = loadExemptions(root)
+  const { surfaces, unresolvable } = extractAll(root)
+  for (const u of unresolvable) console.error(`UNRESOLVABLE ${u.file}:${u.line} ${u.reason}`)
+  const { failures, deltas, exemptHitKeys, statsLine } = judge(bl.files, surfaces)
+  console.log(`[test-surface] ${statsLine}`)
+  for (const d of deltas) console.log(`[test-surface] ${d}`)
+  console.log(`[test-surface] exemptions entries: ${loadExemptionsCache.entries.length} hits: ${exemptHitKeys.size} stale: ${loadExemptionsCache.entries.length - exemptHitKeys.size}`)
+  if (unresolvable.length > 0) {
+    console.error(`[test-surface] FAIL 抽取含 ${unresolvable.length} 处不可静态判定`)
+    die(1, '[test-surface] 检查未通过：UNRESOLVABLE（hint: 动态形态改写为静态，或走 scripts/test-surface.exemptions.json 豁免通道）')
+  }
+  if (failures.length > 0) {
+    for (const f of failures) console.error(`[test-surface] FAIL ${f.kind} ${fmtRelLine(f.path, f.line)} 「${f.text}」`)
+    die(1, `[test-surface] 检查未通过：${failures.length} 处契约违背（hint: 若为有意收紧/删改，先取主控裁决，再落 scripts/test-surface.exemptions.json 豁免通道 reason+rulingLink）`)
+  }
+  console.log('[test-surface] 检查通过：C_after ⊇ C_before（指纹门绿）')
+}
+
+if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
+  const root = process.cwd()
+  const cmd = process.argv[2] ?? 'check'
+  if (cmd === 'stats') cmdStats(root)
+  else if (cmd === 'baseline') cmdBaseline(root)
+  else if (cmd === 'check') cmdCheck(root)
+  else die(1, `[test-surface] 未知子命令：${cmd}（可用：check（默认）/ baseline / stats）`)
+}
diff --git a/scripts/get-protected-files.ps1 b/scripts/get-protected-files.ps1
index a6d45c50ff..f6a23c43d1 100644
--- a/scripts/get-protected-files.ps1
+++ b/scripts/get-protected-files.ps1
@@ -16,7 +16,9 @@ function Get-ProtectedFiles {
   foreach ($cfg in @('docs/invariants.md', 'vitest.config.ts', 'eslint.config.js', '.github/workflows/ci.yml',
       'playwright.config.ts', 'electron.vite.config.ts',
       'tsconfig.json', 'tsconfig.node.json', 'tsconfig.web.json',
-      'scripts/dup-constants.baseline.json')) {
+      'scripts/dup-constants.baseline.json',
+      'scripts/test-surface.baseline.json',
+      'scripts/test-surface.exemptions.json')) {
     $p = Join-Path $root $cfg
     if (Test-Path $p) { $files += Get-Item $p }
   }
diff --git a/scripts/test-surface.exemptions.json b/scripts/test-surface.exemptions.json
new file mode 100644
index 0000000000..7f19696e7b
--- /dev/null
+++ b/scripts/test-surface.exemptions.json
@@ -0,0 +1,4 @@
+{
+  "version": 1,
+  "entries": []
+}
diff --git a/scripts/test-surface/extract.mjs b/scripts/test-surface/extract.mjs
new file mode 100644
index 0000000000..f6eeb12dad
--- /dev/null
+++ b/scripts/test-surface/extract.mjs
@@ -0,0 +1,477 @@
+#!/usr/bin/env node
+/**
+ * scripts/test-surface/extract.mjs —— [F-TESTREF-00] 测试面抽取器 lib（受锁文件；
+ * [locked-change] 声明面随主件——门一 N10 补齐，受锁变更尾注与主件同携带）。
+ *
+ * 职责：解析 tests/** 白名单用例文件（*.test.ts / *.test.tsx / *.spec.ts /
+ * *.spec.tsx——门一 W7 扩）的契约面（C 面）：用例（describe 路径+标题+markers+
+ * expect 断言规范化文本多重集）+ guardedDescribe 工单号集 + 体内条件 skip 规范化
+ * 文本多重集。设计母本=docs/design/2026-09-11_f-testref00-design-final.md
+ * （W6/W1/W2/W3/B1 裁决参数）。与设计字面的实现自裁（均有 DoD 硬项支撑，
+ * 详见主件头注与实现报告自裁申报段）：
+ *  ① skipSites 挂 FileSurface（文件级多重集）而非 CaseEntry——存量 15 处
+ *    依赖门惯用法中 14 处物理位于模块级 helper（skipIfPending）体内、1 处在
+ *    describe 体顶层，用例级归因需调用内联且会按调用点数放大（17≠15）；
+ *    文件级计数在「新增依赖门调用/删调用」场景与用例级等价（计数增减双向红），
+ *    删整个用例由 MISSING_CASE 兜底，无漏报。
+ *  ② 漏扫哨兵用 AST 用例形态判定而非纯文本正则——guard.ts 的
+ *    describe(label, fn)（双标识符参=转发调用）按设计正则会误伤，与 DoD
+ *    「stats 全量 UNRESOLVABLE=0」冲突；AST 判定（callee 纯标识符
+ *    it/test/describe 或带后缀属性访问形态，且首参字符串字面量或任一参为
+ *    函数字面量——门一 W7 扩）防漏性等价（真用例文件必含函数字面量参数），
+ *    误报面更小（转发调用不命中）。
+ * skip 双桶（门一 W8 终案）：conditionalSkipSites（非字面量条件形态，双向红）
+ * 与 hardSkipSites（0 参/字面量真值形态——新增红、删除=激活绿 delta）。
+ * import 别名检测（门一 W6）：vitest/@playwright/test 的 it/test/describe 说明符
+ * 别名或伪装本地名、namespace import → UNRESOLVABLE（用例 API 不可静态判定）。
+ * it.each（W3 终案）：const 单跳解析（全文件唯一 const+ArrayLiteral 声明，
+ * 标识符存在赋值/更新/多处声明即保守红）；字面量消费位=真实值，非静态位=
+ * ⟨nse:源文本空白归一⟩（css→wsCss=源文本变=键变=红）；行计数入多重集。
+ * expect 断言（W2 终案）：单元=最外层 expect 调用链 getText+空白归一，
+ * 全记不去重（同链去重除外——链内嵌 expect 爬到同一链顶自然合并）；
+ * 收集域=用例回调体子树（含体内嵌套声明函数——模块级 helper 不计）。
+ */
+import { readFileSync, readdirSync, statSync } from 'node:fs'
+import { join } from 'node:path'
+import ts from 'typescript'
+
+const WHITELIST_RE = /\.(test\.ts|test\.tsx|spec\.ts|spec\.tsx)$/
+const TS_LIKE_RE = /\.(ts|tsx)$/
+const TEST_API_SOURCE_RE = /^['"](vitest|@playwright\/test)['"]$/
+const THREE_API = new Set(['it', 'test', 'describe'])
+const DESCRIBE_PLAIN = new Set(['describe', 'test.describe'])
+const DESCRIBE_SKIP = new Set(['describe.skip', 'test.describe.skip', 'xdescribe'])
+const DESCRIBE_ONLY = new Set(['describe.only', 'test.describe.only'])
+const CASE_PLAIN = new Set(['it', 'test'])
+const CASE_SKIP = new Set(['it.skip', 'test.skip', 'xit', 'xtest'])
+const CASE_ONLY = new Set(['it.only', 'test.only'])
+// CASE_TODO/CASE_FIXME 为 vitest API（it.todo/it.fixme）建模命名，非占位标记
+// （门一 W11 主控裁定接受——check-quality 扫描域=src+tests 不含 scripts，verify 绿实证）
+const CASE_TODO = new Set(['it.todo', 'test.todo'])
+const CASE_FIXME = new Set(['it.fixme', 'test.fixme'])
+const CONSERVATIVE_REDS = new Set([
+  'it.skipIf', 'it.runIf', 'test.skipIf', 'test.runIf',
+  'it.concurrent', 'test.concurrent', 'test.extend',
+  'describe.configure', 'test.describe.configure'
+])
+
+export function walkFiles(dir, filter, acc = []) {
+  for (const name of readdirSync(dir)) {
+    const p = join(dir, name)
+    const st = statSync(p)
+    if (st.isDirectory()) walkFiles(p, filter, acc)
+    else if (filter(p)) acc.push(p)
+  }
+  return acc
+}
+
+function calleeText(node) {
+  if (ts.isIdentifier(node)) return node.text
+  if (ts.isPropertyAccessExpression(node)) {
+    const base = calleeText(node.expression)
+    return base === null ? null : `${base}.${node.name.text}`
+  }
+  return null
+}
+
+function staticTitleOf(expr) {
+  if (ts.isStringLiteral(expr) || ts.isNoSubstitutionTemplateLiteral(expr)) return expr.text
+  return null
+}
+
+function isFunctionExpr(e) {
+  return ts.isArrowFunction(e) || ts.isFunctionExpression(e)
+}
+
+/** 字面量静态值（number 保留源文本形态——printf %s 需原样字符串） */
+function literalValueOf(e) {
+  let n = e
+  while (ts.isParenthesizedExpression(n)) n = n.expression
+  if (ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n)) return { v: n.text, num: false }
+  if (ts.isNumericLiteral(n) && !/n$/i.test(n.text)) return { v: n.text, num: true }
+  if (n.kind === ts.SyntaxKind.TrueKeyword) return { v: true, num: false }
+  if (n.kind === ts.SyntaxKind.FalseKeyword) return { v: false, num: false }
+  if (n.kind === ts.SyntaxKind.NullKeyword) return { v: null, num: false }
+  return null
+}
+
+/** 字面量真值判定（B1 三态：字面量 truthy=等价声明 skip） */
+function isStaticTruthy(expr) {
+  const lit = literalValueOf(expr)
+  if (!lit) return null
+  if (lit.num) return Number(lit.v) !== 0
+  if (typeof lit.v === 'string') return lit.v !== ''
+  return Boolean(lit.v)
+}
+
+export function normalizeWs(text) {
+  return text.replace(/\s+/g, ' ').trim()
+}
+
+/** expect 链顶：沿 PropertyAccess/Call 链上爬（链内嵌 expect 合并到同一链顶） */
+function chainTop(node) {
+  let n = node
+  while (n.parent && (ts.isPropertyAccessExpression(n.parent) || ts.isCallExpression(n.parent))) n = n.parent
+  return n
+}
+
+function lineOf(node, sf) {
+  return sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1
+}
+
+function mergeMarkers(stackFrames, own) {
+  const all = new Set(own)
+  for (const f of stackFrames) for (const m of f.markers) all.add(m)
+  return [...all].sort()
+}
+
+/** printf 标题展开（Kimi §3.4 子集：%%/%s/%d/%i/%j/%#；$#；子集外保守红） */
+function printfExpand(template, cells, index) {
+  let out = ''
+  let ai = 0
+  const next = () => {
+    if (ai >= cells.length) return { over: true }
+    return { cell: cells[ai++] }
+  }
+  const fmt = (t, cell) => (cell.nse !== undefined ? `⟨nse:${cell.nse}⟩` : t === 'j' ? JSON.stringify(cell.lit.v) : String(cell.lit.v))
+  for (let i = 0; i < template.length; i++) {
+    const c = template[i]
+    if (c === '$') {
+      const d = template[i + 1]
+      if (d === '#') { out += String(index); i++; continue }
+      if (d !== undefined && /[A-Za-z_{]/.test(d)) return { bad: `$${d} 形态不在 v1 子集` }
+      out += c
+      continue
+    }
+    if (c !== '%') { out += c; continue }
+    const t = template[++i]
+    if (t === undefined) { out += '%'; continue }
+    if (t === '%') { out += '%'; continue }
+    if (t === '#') { out += String(index); continue }
+    if (t === 's' || t === 'd' || t === 'i' || t === 'j') {
+      const got = next()
+      if (got.over) return { bad: '消费位超出展开行元素数' }
+      out += fmt(t, got.cell)
+      continue
+    }
+    return { bad: `%${t} 不在 v1 printf 子集` }
+  }
+  return { title: out }
+}
+
+/**
+ * import 别名检测（门一 W6）：vitest/@playwright/test 源的 it/test/describe
+ * 说明符被别名（imported≠local）或伪装本地名（local∈三词但 imported∉）→
+ * UNRESOLVABLE；namespace import（v.it() 形态 calleeText 不匹配白名单）同红
+ * （超裁决保守向，回炉申报）。存量全部直名 import（预检 grep 实证）。
+ */
+function importAliasCheck(sf, relPath, unresolvable) {
+  for (const stmt of sf.statements) {
+    if (!ts.isImportDeclaration(stmt) || !ts.isStringLiteral(stmt.moduleSpecifier)) continue
+    if (!TEST_API_SOURCE_RE.test(stmt.moduleSpecifier.getText(sf))) continue
+    const clause = stmt.importClause
+    if (!clause) continue
+    const line = lineOf(stmt, sf)
+    if (clause.name) {
+      // default import：imported='default'——local∈三词即伪装形态
+      if (THREE_API.has(clause.name.text)) {
+        unresolvable.push({ file: relPath, line, reason: `用例 API 别名 import 不可静态判定（default import as ${clause.name.text}）` })
+      }
+    }
+    const bindings = clause.namedBindings
+    if (!bindings) continue
+    if (ts.isNamespaceImport(bindings)) {
+      unresolvable.push({ file: relPath, line, reason: `用例 API 别名 import 不可静态判定（namespace import * as ${bindings.name.text}——${bindings.name.text}.it() 形态白名单外）` })
+      continue
+    }
+    if (ts.isNamedImports(bindings)) {
+      for (const spec of bindings.elements) {
+        if (!ts.isIdentifier(spec.name)) continue
+        const imported = spec.propertyName && ts.isIdentifier(spec.propertyName) ? spec.propertyName.text : spec.name.text
+        const local = spec.name.text
+        if (THREE_API.has(imported) && local !== imported) {
+          unresolvable.push({ file: relPath, line, reason: `用例 API 别名 import 不可静态判定（${imported} as ${local}）` })
+        } else if (THREE_API.has(local) && !THREE_API.has(imported)) {
+          unresolvable.push({ file: relPath, line, reason: `用例 API 别名 import 不可静态判定（${imported} as ${local}——伪装本地名）` })
+        }
+      }
+    }
+  }
+}
+
+/**
+ * 单文件抽取（白名单域）。unresolvable 收集 {file,line,reason}（不中断——
+ * 全量明细一次输出）。
+ */
+function extractFile(absPath, relPath, unresolvable) {
+  const text = readFileSync(absPath, 'utf8')
+  const kind = relPath.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS
+  const sf = ts.createSourceFile(absPath, text, ts.ScriptTarget.Latest, true, kind)
+  const red = (node, reason) => unresolvable.push({ file: relPath, line: lineOf(node, sf), reason })
+  importAliasCheck(sf, relPath, unresolvable)
+
+  // 预扫描：const X = ArrayLiteral 声明表 + 标识符赋值/更新表（单跳解析防护）
+  const constArrays = new Map()
+  const mutatedIds = new Set()
+  function preScan(node) {
+    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer && ts.isArrayLiteralExpression(node.initializer)) {
+      const list = node.parent
+      if ((list.flags & ts.NodeFlags.Const) !== 0) {
+        if (!constArrays.has(node.name.text)) constArrays.set(node.name.text, [])
+        constArrays.get(node.name.text).push(node.initializer)
+      }
+    }
+    if (ts.isBinaryExpression(node) && ts.isIdentifier(node.left) && (node.operatorToken.kind === ts.SyntaxKind.EqualsToken || node.operatorToken.kind >= ts.SyntaxKind.FirstCompoundAssignment)) {
+      mutatedIds.add(node.left.text)
+    }
+    if ((ts.isPrefixUnaryExpression(node) || ts.isPostfixUnaryExpression(node)) && (node.operator === ts.SyntaxKind.PlusPlusToken || node.operator === ts.SyntaxKind.MinusMinusToken) && ts.isIdentifier(node.operand)) mutatedIds.add(node.operand.text)
+    ts.forEachChild(node, preScan)
+  }
+  preScan(sf)
+
+  const surface = { ticketIds: new Set(), conditionalSkipSites: [], hardSkipSites: [], cases: [] }
+  const stack = [{ title: null, markers: [] }]
+  let currentCase = null
+
+  function resolveEachRows(srcNode) {
+    if (ts.isArrayLiteralExpression(srcNode)) return { rows: srcNode.elements.map(resolveElement) }
+    if (ts.isIdentifier(srcNode)) {
+      const name = srcNode.text
+      if (mutatedIds.has(name)) return { bad: `each 数组标识符 ${name} 存在赋值/更新` }
+      const decls = constArrays.get(name)
+      if (!decls || decls.length !== 1) return { bad: `each 数组标识符 ${name} 无唯一 const+ArrayLiteral 声明` }
+      return { rows: decls[0].elements.map(resolveElement) }
+    }
+    return { bad: 'each 第 1 参非 ArrayLiteral 或可解析 const 标识符' }
+  }
+  function resolveElement(e) {
+    const lit = literalValueOf(e)
+    if (lit) return { lit }
+    if (ts.isArrayLiteralExpression(e)) {
+      return { tuple: e.elements.map((el) => {
+        const inner = literalValueOf(el)
+        return inner ? { lit: inner } : { nse: normalizeWs(el.getText(sf)) }
+      }) }
+    }
+    return null
+  }
+  function cellsOf(row) {
+    if (row.tuple !== undefined) return row.tuple
+    return [row]
+  }
+
+  function collectCaseBody(entry, callback) {
+    const prev = currentCase
+    currentCase = entry
+    entry._chainSet = new Set()
+    ts.forEachChild(callback, visit)
+    entry.assertions = [...entry._chainSet].map((n) => normalizeWs(n.getText(sf)))
+    delete entry._chainSet
+    currentCase = prev
+  }
+
+  function visit(node) {
+    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === 'expect' && currentCase !== null) {
+      currentCase._chainSet.add(chainTop(node))
+    }
+    if (ts.isCallExpression(node)) {
+      const ct = calleeText(node.expression)
+      if (ct === 'guardedDescribe') {
+        const idArg = node.arguments[0]
+        const titleArg = node.arguments[1]
+        const ticketId = idArg && ts.isStringLiteral(idArg) ? idArg.text : null
+        const title = titleArg ? staticTitleOf(titleArg) : null
+        if (ticketId === null || title === null) {
+          red(node, 'guardedDescribe 工单号/标题非字符串字面量')
+        } else {
+          surface.ticketIds.add(ticketId)
+          stack.push({ title, markers: stack[stack.length - 1].markers })
+          ts.forEachChild(node, visit)
+          stack.pop()
+          return
+        }
+      } else if (DESCRIBE_PLAIN.has(ct) || DESCRIBE_SKIP.has(ct) || DESCRIBE_ONLY.has(ct)) {
+        const own = DESCRIBE_SKIP.has(ct) ? ['skip'] : DESCRIBE_ONLY.has(ct) ? ['only'] : []
+        const titleArg = node.arguments[0]
+        const title = titleArg ? staticTitleOf(titleArg) : null
+        if (title === null) {
+          red(node, 'describe 标题非字符串字面量（动态标题不可静态判定）')
+        } else {
+          const parentMarkers = stack[stack.length - 1].markers
+          stack.push({ title, markers: [...new Set([...parentMarkers, ...own])] })
+          ts.forEachChild(node, visit)
+          stack.pop()
+          return
+        }
+      } else if (ts.isCallExpression(node.expression) && ct === null) {
+        // 潜在 each 形态：外层被调者本身是调用（it.each(ARR)(title, fn)）——
+        // calleeText 对 CallExpression 返回 null，须取内层调用的被调者文本
+        const inner = calleeText(node.expression.expression)
+        if (inner !== null && (inner.startsWith('it.each') || inner.startsWith('test.each') || inner.startsWith('describe.each'))) {
+          if (inner !== 'it.each' && inner !== 'test.each') {
+            red(node, `${inner} 形态不在 v1 支持子集（describe.each/带后缀 each）`)
+          } else {
+            const srcNode = node.expression.arguments[0]
+          const titleArg = node.arguments[0]
+          const callback = node.arguments.find((a) => isFunctionExpr(a)) ?? null
+          const resolved = srcNode ? resolveEachRows(srcNode) : { bad: 'each 缺少数组参数' }
+          const tpl = titleArg && (ts.isStringLiteral(titleArg) || ts.isNoSubstitutionTemplateLiteral(titleArg)) ? titleArg.text : null
+          if (resolved.bad) red(node, `it.each 解析失败：${resolved.bad}`)
+          else if (tpl === null) red(node, 'it.each 标题模板非静态字符串（插值模板不可静态判定）')
+          else {
+            const holder = { assertions: [] }
+            if (callback) collectCaseBody(holder, callback)
+            resolved.rows.forEach((row, idx) => {
+              if (row === null) return
+              const got = printfExpand(tpl, cellsOf(row), idx)
+              if (got.bad !== undefined) {
+                red(node, `it.each 标题展开失败（行 ${idx}）：${got.bad}`)
+                return
+              }
+              const describePath = stack.slice(1).map((f) => f.title)
+              surface.cases.push({
+                key: JSON.stringify([...describePath, got.title]),
+                describePath,
+                title: got.title,
+                markers: mergeMarkers(stack, []),
+                line: lineOf(titleArg, sf),
+                assertions: [...holder.assertions],
+                _eachRow: true
+              })
+            })
+            if (resolved.rows.some((r) => r === null)) red(node, 'it.each 数组含不可解析元素（顶层仅接受字面量/字面量元组）')
+            return
+          }
+          }
+        }
+      } else if (CASE_PLAIN.has(ct) || CASE_SKIP.has(ct) || CASE_ONLY.has(ct) || CASE_TODO.has(ct) || CASE_FIXME.has(ct)) {
+        const titleArg = node.arguments[0]
+        const hasFn = node.arguments.some((a) => isFunctionExpr(a))
+        const own = CASE_SKIP.has(ct) ? ['skip'] : CASE_ONLY.has(ct) ? ['only'] : CASE_TODO.has(ct) ? ['todo'] : CASE_FIXME.has(ct) ? ['fixme'] : []
+        const isDeclaration = titleArg !== undefined && staticTitleOf(titleArg) !== null && hasFn
+        if (!isDeclaration && (CASE_SKIP.has(ct) || CASE_FIXME.has(ct))) {
+          // W8 双桶三态（文件级建模，自裁①）：非声明形态=体内 skip。
+          // conditional 桶（非字面量条件）双向红；hard 桶（0 参/字面量真值）
+          // 新增红、删除=激活绿 delta（与 markers 激活语义一致）。
+          if (node.arguments.length === 0 || node.arguments[0] === undefined) {
+            surface.hardSkipSites.push(normalizeWs(node.getText(sf))) // test.skip() 0 参=恒 skip
+          } else {
+            const truthy = isStaticTruthy(node.arguments[0])
+            if (truthy === null) surface.conditionalSkipSites.push(normalizeWs(node.getText(sf)))
+            else if (truthy) surface.hardSkipSites.push(normalizeWs(node.getText(sf)))
+            // 字面量假值条件（false/0）=永不触发，不建模
+          }
+          ts.forEachChild(node, visit)
+          return
+        }
+        const title = titleArg !== undefined ? staticTitleOf(titleArg) : null
+        if (title === null) {
+          red(node, `用例标题非字符串字面量（${ct} 动态标题不可静态判定）`)
+        } else {
+          const describePath = stack.slice(1).map((f) => f.title)
+          const entry = {
+            key: JSON.stringify([...describePath, title]),
+            describePath,
+            title,
+            markers: mergeMarkers(stack, own),
+            line: lineOf(titleArg, sf),
+            assertions: []
+          }
+          surface.cases.push(entry)
+          const callback = node.arguments.find((a) => isFunctionExpr(a))
+          if (callback) collectCaseBody(entry, callback)
+          return
+        }
+      } else if (CONSERVATIVE_REDS.has(ct)) {
+        red(node, `${ct} 形态不在 v1 支持子集（保守红，走豁免或改写为静态形态）`)
+      }
+    }
+    ts.forEachChild(node, visit)
+  }
+  visit(sf)
+  surface.cases.forEach((c) => { c.markers = [...new Set(c.markers)].sort() })
+  return {
+    ticketIds: [...surface.ticketIds].sort(),
+    conditionalSkipSites: surface.conditionalSkipSites,
+    hardSkipSites: surface.hardSkipSites,
+    cases: surface.cases
+  }
+}
+
+/** 漏扫哨兵（设计 W6+自裁②+门一 W7 扩）：非白名单 .ts/.tsx 含用例调用形态 →
+ *  保守红。callee 识别面=纯标识符三词 或 带后缀属性访问（calleeText 匹配
+ *  /^(it|test|describe)\./）；命中后仍按参数形态判定（首参字符串字面量或
+ *  任一参函数字面量）——guard.ts 的 describe(label, fn)/describe.skip(label, fn)
+ *  转发调用（双标识符参）不误伤，真用例（带回调）不漏。 */
+function sentinelCheck(absPath, relPath, unresolvable) {
+  const text = readFileSync(absPath, 'utf8')
+  const kind = relPath.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS
+  const sf = ts.createSourceFile(absPath, text, ts.ScriptTarget.Latest, true, kind)
+  importAliasCheck(sf, relPath, unresolvable)
+  function visit(node) {
+    if (ts.isCallExpression(node)) {
+      const ct = calleeText(node.expression)
+      const isBareThree = ts.isIdentifier(node.expression) && THREE_API.has(node.expression.text)
+      const isDottedThree = ct !== null && /^(it|test|describe)\./.test(ct)
+      if (isBareThree || isDottedThree) {
+        const looksCase =
+          (node.arguments[0] !== undefined && (ts.isStringLiteral(node.arguments[0]) || ts.isNoSubstitutionTemplateLiteral(node.arguments[0]))) ||
+          node.arguments.some((a) => isFunctionExpr(a))
+        if (looksCase) {
+          unresolvable.push({ file: relPath, line: lineOf(node, sf), reason: `漏扫哨兵：非白名单文件含用例调用形态（${isDottedThree ? ct : 'it/test/describe'}——门一 W7 扩）` })
+          return
+        }
+      }
+    }
+    ts.forEachChild(node, visit)
+  }
+  visit(sf)
+}
+
+/** 全量抽取：tests/** → {surfaces: Map<posixRel, FileSurface>, unresolvable: []} */
+export function extractAll(root) {
+  const all = walkFiles(join(root, 'tests'), (p) => TS_LIKE_RE.test(p))
+  const surfaces = new Map()
+  const unresolvable = []
+  for (const abs of all) {
+    const rel = abs.replaceAll('\\', '/').slice(root.replaceAll('\\', '/').length + 1)
+    if (WHITELIST_RE.test(rel)) {
+      surfaces.set(rel, extractFile(abs, rel, unresolvable))
+    } else {
+      sentinelCheck(abs, rel, unresolvable)
+    }
+  }
+  return { surfaces, unresolvable }
+}
+
+/** stats 汇总（DoD 数字全部机器实测于此；门一 W8——skipSiteCount=双桶和，
+ *  向后兼容口径；conditionalSkipSiteCount/hardSkipSiteCount 新字段） */
+export function statsOf(surfaces, unresolvable) {
+  let caseCount = 0
+  let assertionCount = 0
+  let conditionalSkipSiteCount = 0
+  let hardSkipSiteCount = 0
+  let ticketIdCount = 0
+  let eachExpandedRows = 0
+  for (const s of surfaces.values()) {
+    caseCount += s.cases.length
+    conditionalSkipSiteCount += s.conditionalSkipSites.length
+    hardSkipSiteCount += s.hardSkipSites.length
+    ticketIdCount += s.ticketIds.length
+    for (const c of s.cases) {
+      assertionCount += c.assertions.length
+      if (c._eachRow) eachExpandedRows++
+    }
+  }
+  return {
+    fileCount: surfaces.size,
+    caseCount,
+    assertionCount,
+    skipSiteCount: conditionalSkipSiteCount + hardSkipSiteCount,
+    conditionalSkipSiteCount,
+    hardSkipSiteCount,
+    ticketIdCount,
+    eachExpandedRows,
+    unresolvableCount: unresolvable.length
+  }
+}
diff --git a/tickets/registry.ts b/tickets/registry.ts
index c186eabaf6..d5b9fe44a7 100644
--- a/tickets/registry.ts
+++ b/tickets/registry.ts
@@ -268,7 +268,8 @@ export const TICKETS: readonly Ticket[] = [
   { id: 'F-LINT-04-T2', file: 'eslint.config.js', area: 'infra', owner: 'strong', status: 'done', summary: '颜色关卡扩展战役 T2=①B-5 AST 扩展（v58 §2-1 候选——终裁 §2 表 T2 跳，设计链三跳已在 T1 档毕，本票纯实现跳零新设计）：synapse/no-inline-color rule（域=src/renderer/**/*.tsx 不变）扩两条 visitor 路径——(a) VariableDeclarator：init 递归 unwrap（TSAsExpression/TSSatisfiesExpression/Object.freeze CallExpression→arguments[0]，深度上限 4 防御）后两形态判定：ObjectExpression=逐属性判定（deepseek 硬伤①修正——弃「全 Literal 门」：混计算属性/引用值对象不豁免，逐 Property 判 value 为 string Literal 且 stripUrlFunctions 后命中 COLOR_RE 即报；key=Identifier 或 string Literal 均入判[kebab key 形态]；SpreadElement/嵌套对象/模板串/二元式=明示不检残留面与现行 style 面语义对称）+单值 Literal=命中即报（主控裁决扩展：终裁字面=ObjectExpression 色值表，单值常量同绕过通道对称闭合纳入——dry-run B=0 零负担）；(b) JSXAttribute 面扩：属性名域=fill|stroke|color 显式三词 ∪ /Color$ 后缀（camelCase 表 stopColor/floodColor/lightingColor=子集）∪ kebab 同族 stop-color|flood-color|lighting-color（JSX 可解析误用形态——R11 红证实证）→ value 为 string Literal 命中即报（[N2 回炉加码] 含 JSXExpressionContainer 包裹形态 fill={\x27#fff\x27} 同检）；域外属性名（data-x 等）不报。**前置 dry-run 毕（⑤i 口径）**：scripts/audits/f-lint04-t2-dryrun.mjs（eslint Linter API flat 模式+self-check 内证）——77 tsx（全 renderer）四面全 0+.ts 面补盘 0 → 域维持 tsx 不扩张。**收口 2026-09-10 三屋全链**：红证矩阵 R1-R14+NR1-NR5（R12 单对象双属性恰 2 error 逐属性全量证明/R13 container 包裹[改前探针 0 error=TDD 红]/R14 双层嵌套 unwrap）+preimpl 探针+变异三态（visitor 改名 R1 复绿/R8 独立仍红/还原复红）+存量 lint 全绿+dry-run 复跑 0；门一 Kimi kimi-main 两轮（R1 B0/W4/N7 放行附条件——W1 申报失实[门一独立抓到与主控自查吻合]/W2 COLOR_RE 状态性[主控亲证销项=i 标志无 g]/W3 深度 off-by-one/W4 raw 混杂[主控销项=拼包伪影原件纯净]→回炉轮 1 五项=W1 上提 create 级+W3 depth>=4+N2 主控加码+R12-R14 补证+报告更新→R2 定点复核指令 1-4 全 ADDRESSED+零新破坏+收口放行+两非阻断条件主控亲验销项[R12 原件双 error 行完整/345 行实测]）；门二统一档[环境无 model 参数欠账如实记]PASS 无条件（B0/W0/N2——四清单独立复算+机器面亲跑八项+TDD 链 13 件原件抽验；N-G2-1=dryrun.mjs sha 红因系主控回炉期亲改探针头注 kebab 误判修正——归属自证在案）；不做面：哨兵域窄维持入档（v58 §2-6/7）；.ts 面；嵌套对象表深度>1；命名色/十进制（终裁 §4 承袭）；Object[\x27freeze\x27] 计算属性/深度>4 截断=formally 注记残留面（门一 N3/N1③）；theme.test.ts 防漂移锁不加（T4 C-4c 上线后 R−D 锚反向护体——观察注记）' },
   { id: 'F-LINT-04-T4PRE', file: 'src/renderer/shared/theme.css', area: 'infra', owner: 'strong', status: 'done', summary: '颜色关卡扩展战役 T4 前置=--warning token 化（v58 §2-2 候选/Kimi 设计书 2.4 裁决=红不豁免——fallback 悬空系 token 体系静默绕过通道+语义残缺）：TabBar.tsx:139 `var(--warning, orange)` 全仓唯一引用+--warning 零定义（fallback orange=事实渲染色）；处置=theme.css :root 状态色族（--danger/--ok 侧）补 `--warning: #ffa500`（**零视觉差——CSS 规范 orange=#ffa500=rgb(255,165,0) 计算值恒等，非视觉决策**）+TabBar.tsx:139 移除 fallback 改 `var(--warning)`（死代码即删）；前置已核：#ffa500 全库唯一零同值冲突（C-4 ② 同值守卫不触发）;**收口 2026-09-10 主控自为（F-SNAP-01 先例——≤3 文件非受锁小批）+门一 GLM 同源降级（§4.5 可省面）PASS 0B/0W/4N+门二统一档 PASS 无条件（机器面六件亲跑：R−D−W 探针 ∅/var(--warning 恰 1 处/ffa500 恰定义 1 处/quality+lint+typecheck 真 exit=0/翻 done 推演过）**；验收=T4 门槛对账探针 f-t4pre-rdw.mjs（R=94/D=109/W=2 改前差集恰 --warning 悬空 exit=1→改后 R−D−W=∅ D 恰+1 exit=0——T4 var() 语义锚上线门槛达成）+⑤f 真机豁免论证（计算值恒等+全库唯一引用点非布局值）+verify 全链 exit=0；theme.test.ts 防漂移锁不加（T4 C-4c 上线后 R−D 锚反向护体——T2 票已注记）；门一 4N 注记=注释 grep 双命中[代码口径成立]/T4 前值漂移无锁窗口[低风险]/探针 VAR_DEF 不剥注释[T4 迁驻时加固]/manifest CRLF 既有形态' },
   { id: 'F-LINT-04-T4', file: 'scripts/check-quality.mjs', area: 'infra', owner: 'strong', status: 'done', summary: '颜色关卡扩展战役 T4=④var() 语义锚 C-4c（v58 §2-3 候选/终裁 §2 表 T4 行——设计链三跳已在 T1 档毕；**前置毕=T4PRE 收口同日：R−D−W=∅ 已实证（f-t4pre-rdw 探针 改前差集恰 --warning→token 化后 ∅）**）：check-quality 新段 6c C-4c（B-1 check-dup-constants 独立 pass 先例——跨文件聚合超 eslint 单文件隔离模型故载体=check-quality；312→372 行）；算法=扫 src 全域（**.css+.ts+.tsx，注释剥离后——CSS 只剥 /**/ 块注释不剥 //（CSS 无 // 语法防误伤 url(//host)）+ts/tsx 加剥行首 //；注释叙述不入 R，--gold-night 退役史先例**）matchAll /var\\(\\s*(--[\\w-]+)/g 取引用名集 R（Map<名,Set<相对路径>>红时逐名列引用文件）；D=theme.css 定义名集（**主控追认[门一 A-2]：D 提取=postcss walkDecls AST 化置换票面正则口径——AST 天然剥注释比票面「剥注释+正则」更严（注释内伪定义不进 D=探针 VAR_DEF 差异点加固强化形态）+@theme 块内定义天然入集+第 6 段 postcss 先例零新依赖**；token 定义单源纪律机器锚定——他 css 文件定义 token 被引用即红=防漂移非误报）；R−D−W 非空=红；DYNAMIC_TOKENS 白名单驻段首单源（[\'--ui-scale\',\'--scale-factor\']）+逐条注注入点 file:line（App.tsx:136 setProperty/TextLayer.tsx:151 容器 style 注入——加注后实际坐标自洽）+注入点代码侧注释回指常量名（终裁 §1.5 弃双向手维护改注释单向指——白名单注 file:line 主链+注入点回指辅链）；解析失败 varDefOk flag=violation 红+跳过逐名防刷屏（fail-open 红语义保留）;**收口 2026-09-10 三屋全链**：红证矩阵=preimpl 检测缺失红+R1/R2 代码面/CSS 面红+R3 注释剥离不红+R4 白名单放行+NR1 @theme 重绑自洽+NR2 注入形态不进 R+变异红证（剥离禁用→--ghost-note 翻红→还原复绿 cp 备份法）+回炉补证 D-1（他 css 定义+引用 --ghost-only 红=D 集单源执法实证[门一 W]）/D-2（css 块注释叙述不红=CSS 域唯一剥法正向实证[门一 W]）；存量绿 quality exit=0（R−D−W=∅ 零误报=T4PRE 收口基线）+lint exit=0+verify 断链后四段 exit=0（162/1579=基线）；门一 Kimi kimi-main 两轮（R1 B0/W2/N9 放行附条件→回炉三小项[D-1/D-2 红证+报告 §7.9 补报 postcss 错误截首行]→R2 收口放行+回炉零 diff 变化主控亲核三文件行数一致）；门二统一档[环境欠账]PASS 无条件（B0/W0/N1——四清单+机器面七件亲跑含独立复刻红证 tmp-g2.tsx 红→删件复绿+136/151 行号独立闭合）；探针 f-t4pre-rdw.mjs 留档独立诊断工具;不做面：动态拼名（终裁证伪全仓 0）；node_modules 官方 CSS 消费面（R 只少不多）；tests/ 域外；行尾 // 假阳面（存量 0+保守向——门一 D-4/实现者 §8.1 注记）;**F-LINT-04 战役（T1+T2+T4PRE+T4）全毕**' },
-  { id: 'F-TESTREF-00', file: 'scripts/check-test-surface.mjs', area: 'infra', owner: 'strong', status: 'open', summary: '测试优化战役 P0=测试面指纹门（GLM 终裁 2026-09-11 docs/design/2026-09-11_glm-ruling-arch-complexity-and-test-campaign.md §4-2——设计链三跳票）：新件 scripts/check-test-surface.mjs（零新依赖——import ts from typescript，check-dup-constants AST 先例）+基线 scripts/test-surface.baseline.json（诞生即锁；显式再生成子命令禁静默自愈）+豁免清单 scripts/test-surface.exemptions.json（{file,caseTitle,assertionText,reason,rulingLink}——人工裁决留痕）；C 面（不可缩）=用例标题有序多重集（describe 块路径+guardedDescribe 以 (静态title,ticketId) 二元组建模防运行时展开歧义）+每用例体内 expect 断言规范化源文本多重集（空白归一字面量保留——v1 不做容差方向判定，任何既有断言文本消失=红）+工单号集+skip/only 标记清单（新增 skip=红/only 恒红）；S 面（imports/工厂/mock/嵌套结构/注释）完全不判；判定=C_after ⊇ C_before 多重集（防两条压一条），新增放行+delta 报告，缺失=exit 1 带 file:line；覆盖域=tests/** 全部 185 文件双栈（vitest describe/it/it.each 展开比对[theme.test.ts 3 处]+playwright test/test.describe——@probe 标签属标题文本）；抽取器遇不可静态判定标题=保守红（宁误报走豁免不漏报开门）；挂载=verify 链 quality 之后+CI 同跑；[test-refactor] 范围闸（CI：战役提交 diff ⊆ tests/**∪战役机制件，src/**=红——lock-change-guard job 先例形态）；门自身证伪=三支变异红证（删用例→红/改 expect 字面量→红/加用例→绿+delta——cp 备份法还原禁 git checkout）；[locked-change][test-refactor] 双尾注' },
+  { id: 'F-TESTREF-00', file: 'scripts/check-test-surface.mjs', area: 'infra', owner: 'strong', status: 'done', summary: '测试优化战役 P0=测试面指纹门（**收口 2026-09-11 三屋全链+设计链三跳**）：设计链=Kimi 拟定（f-testref00-design-kimi.md，in3087/out8982）→deepseek 对抗审核（B2/W9/N4「不可终裁需回炉」——⑤i 实锤两处：体内条件 skip 15 处首日红/it.each 数组全标识符）→GLM 终裁 docs/design/2026-09-11_f-testref00-design-final.md（B1 skipSites 双向红/B2 新用例带 skip 全局红/W1 describe 标记传播/W2 断言单元=最外层 expect 调用弃区间去重/W3 非静态位源文本摘要/W4 签名多重集计数/W5 激活绿/W6 漏扫哨兵/W7 逐提交范围闸+package.json 双闸正交/W9 M1-M9）；实现=主件 check-test-surface.mjs 386 行+test-surface/extract.mjs 477 行（均 ≤500，W8 拆分落地）+基线 23910 行+空豁免清单；stats=179 文件/1623 用例/4979 断言/15 skipSite（14 helper 体内+1 describe 顶层——文件级多重集建模[自裁①门一预裁接受]/conditional=15/hard=0）/each 展开 160 行（TOKENS 104+DURATION 49+FS_CSS 7，非静态位 ⟨nse:源文本⟩ 键）/UNRESOLVABLE=0；门一 R1 deepseek 兜底（双 Kimi 源 504×6 退避——B1 空基线恒绿通道+W11/N10 放行附条件）→回炉轮 1 八项修复（B1b 基线健全性三重下限+W5 先阻断后写+W8 双桶[hard 删=ACTIVATED 绿]+W6 import 别名保守红+W7 哨兵扩+spec.tsx+W10 NEW 行断言计数+W1 diff-tree -m+W3 正则锚+W4 merge-base 兜底）+两项新自裁（namespace import 红/新文件桶新增红——R2 裁定接受）→门一 R2 kimi-main 第三退避 862s 收口放行（B0/W1[登记后续票 S1]/N6）；变异矩阵 M1-M9+M10 双半+B1b+M3/M5 主控补证复跑（W10 格式 raw 实证）——cp 备份法全 sha 还原一致；基线/豁免入 protectedFiles 双侧登记（check-locks.mjs+get-protected-files.ps1——门一 B1a：信任根受锁）；verify 全链 exit=0 亲验（test-surface:check 已入链 quality 后）；locks 322→325（319→322 为前批立案已提交——门二 N2 勘正）；[locked-change][test-refactor] 双尾注首用；残留面登记 F-TESTREF-S1（W12 哨兵 each 双层形态/N11 本地变量别名/N15 type-only import）' },
+  { id: 'F-TESTREF-S1', file: 'scripts/test-surface/extract.mjs', area: 'infra', owner: 'strong', status: 'open', summary: '指纹门抽取器语法子集补强（门一 R1/R2 登记项收敛——触发条件=零存量命中、随战役任意票搭车或单独小票）：①W12 哨兵 each 双层调用形态失明（非白名单文件 it.each([[1]])(\x27t %i\x27, fn) 外层 callee=CallExpression 双盲——R1 W7 修复的同族残余）②N11 本地变量别名通道（const myIt = it; myIt(\x27t\x27,fn) 静默漏抽——W6 import 面外的同族）③N15 importAliasCheck 未排除 type-only import（import type { it as myIt } 误红——红向误伤非漏报）；三项均 v1 已知残留（门一 R2 N 级注记在档），补强时机=战役期遇真实命中或 W3 票顺带' },
   { id: 'F-TESTREF-W1A', file: 'tests/utils/api-client-mock.ts', area: 'infra', owner: 'strong', status: 'open', summary: '测试优化战役 W1a=mock 工厂下沉（终裁 §4-4 序——前置 F-TESTREF-00 指纹门毕）：vi.mock(\'…api/client\') 39 文件各自声明+Toast/toast-store mock 32 文件→tests/utils 共享工厂单源（工厂形态按存量最高频模式收敛——设计在票内小判不改断言语义）；C 面零变化由指纹门对拍证明（合并前后基线 diff=∅）；R1 零 src 变更红线+R2/RR3/R4 照宪章 §0.3；净删行数记账入交接书；[test-refactor][locked-change] 双尾注' },
   { id: 'F-TESTREF-W1B', file: 'tests/utils/geometry.ts', area: 'infra', owner: 'strong', status: 'open', summary: '测试优化战役 W1b=几何桩+局部工厂下沉（前置 W1a 毕）：getClientRects/getBoundingClientRect 几何桩 22 文件 97 处（终裁勘误口径——宪章 93 处勘误）→tests/utils/geometry.ts 单源；常用局部工厂（makeTab×4/makeAnnotation×3/seed(nodes,edges)×3/makeDetail×2 同名多实例）下沉+94 文件命名规范；C 面零变化指纹门对拍；红线同 W1a；净删记账；[test-refactor][locked-change]' },
   { id: 'F-TESTREF-W1C', file: 'tests/e2e/e2e-env.ts', area: 'infra', owner: 'strong', status: 'open', summary: '测试优化战役 W1c=e2e 脚手架单源（前置 W1b 毕）：本地 launch 实现 5 副本+seedPaperRow 5 定义处（15 引用文件）+first-window 500ms→close 迁移配方（12-15 spec 复制）→e2e-env.ts 单源收敛；指纹门对拍（e2e spec 的 test()/test.describe() 标题不变）；红线同 W1a；净删记账；[test-refactor][locked-change]' },

---
## 附 4 变异矩阵 raw（含回炉段与主控补证段）

F-TESTREF-00 变异矩阵 raw（时间 2026-09-12 00:38:15；node v24.20.0）
==================== m1-theme (tests/unit/renderer/theme.test.ts) ====================
[mut] m1 已施加于 tests/unit/renderer/theme.test.ts
[test-surface] files: 179 base / 179 cur | cases: 1623 base / 1622 cur | assertions: 4979 base / 4976 cur | skipSites: 15 base / 15 cur
[test-surface] exemptions entries: 0 hits: 0 stale: 0
[test-surface] FAIL MISSING_CASE tests/unit/renderer/theme.test.ts:175 「body 视觉底换新 --bg 且保留 html/body/#root overflow 锁（Q1 不变量）」
[test-surface] 检查未通过：1 处契约违背（hint: 若为有意收紧/删改，先取主控裁决，再落 scripts/test-surface.exemptions.json 豁免通道 reason+rulingLink）
EXIT=1
RESTORE-OK (sha256 一致)
==================== m2-theme (tests/unit/renderer/theme.test.ts) ====================
[mut] m2 已施加于 tests/unit/renderer/theme.test.ts
[test-surface] files: 179 base / 179 cur | cases: 1623 base / 1623 cur | assertions: 4979 base / 4979 cur | skipSites: 15 base / 15 cur
[test-surface] NEW tests/unit/renderer/theme.test.ts › body 视觉底换新 --bg 且保留 html/body/#root overflow 锁（Q1 不变量） (line 175)
[test-surface] exemptions entries: 0 hits: 0 stale: 0
[test-surface] FAIL MISSING_ASSERT tests/unit/renderer/theme.test.ts:175 「expect(css).toContain('overflow: hidden')」
[test-surface] 检查未通过：1 处契约违背（hint: 若为有意收紧/删改，先取主控裁决，再落 scripts/test-surface.exemptions.json 豁免通道 reason+rulingLink）
EXIT=1
RESTORE-OK (sha256 一致)
==================== m3-theme (tests/unit/renderer/theme.test.ts) ====================
[mut] m3 已施加于 tests/unit/renderer/theme.test.ts
[test-surface] files: 179 base / 179 cur | cases: 1623 base / 1624 cur | assertions: 4979 base / 4980 cur | skipSites: 15 base / 15 cur
[test-surface] NEW tests/unit/renderer/theme.test.ts › F-TESTREF-00 M3 新增探针用例（变异矩阵） (line 182)
[test-surface] exemptions entries: 0 hits: 0 stale: 0
[test-surface] 检查通过：C_after ⊇ C_before（指纹门绿）
EXIT=0
RESTORE-OK (sha256 一致)
==================== m4-theme (tests/unit/renderer/theme.test.ts) ====================
[mut] m4 已施加于 tests/unit/renderer/theme.test.ts
[test-surface] files: 179 base / 179 cur | cases: 1623 base / 1624 cur | assertions: 4979 base / 4980 cur | skipSites: 15 base / 15 cur
[test-surface] NEW tests/unit/renderer/theme.test.ts › F-TESTREF-00 M4 only 探针（变异矩阵） (line 182)
[test-surface] exemptions entries: 0 hits: 0 stale: 0
[test-surface] FAIL ONLY_FORBIDDEN tests/unit/renderer/theme.test.ts:182 「F-TESTREF-00 M4 only 探针（变异矩阵）」
[test-surface] 检查未通过：1 处契约违背（hint: 若为有意收紧/删改，先取主控裁决，再落 scripts/test-surface.exemptions.json 豁免通道 reason+rulingLink）
EXIT=1
RESTORE-OK (sha256 一致)
==================== m6-theme (tests/unit/renderer/theme.test.ts) ====================
[mut] m6 已施加于 tests/unit/renderer/theme.test.ts
[test-surface] files: 179 base / 179 cur | cases: 1623 base / 1624 cur | assertions: 4979 base / 4980 cur | skipSites: 15 base / 15 cur
[test-surface] exemptions entries: 0 hits: 0 stale: 0
[test-surface] FAIL SKIP_ADDED tests/unit/renderer/theme.test.ts:182 「F-TESTREF-00 M6 skip 探针（变异矩阵）」
[test-surface] 检查未通过：1 处契约违背（hint: 若为有意收紧/删改，先取主控裁决，再落 scripts/test-surface.exemptions.json 豁免通道 reason+rulingLink）
EXIT=1
RESTORE-OK (sha256 一致)
==================== m7-theme (tests/unit/renderer/theme.test.ts) ====================
[mut] m7 已施加于 tests/unit/renderer/theme.test.ts
[test-surface] files: 179 base / 179 cur | cases: 1623 base / 1623 cur | assertions: 4979 base / 4979 cur | skipSites: 15 base / 16 cur
[test-surface] exemptions entries: 0 hits: 0 stale: 0
[test-surface] FAIL SKIPSITE_ADDED tests/unit/renderer/theme.test.ts 「test.skip(probeM7.length > 0, 'F-TESTREF-00 M7 探针延期（变异矩阵）')」
[test-surface] 检查未通过：1 处契约违背（hint: 若为有意收紧/删改，先取主控裁决，再落 scripts/test-surface.exemptions.json 豁免通道 reason+rulingLink）
EXIT=1
RESTORE-OK (sha256 一致)
==================== m8-scroll (tests/e2e/reader-scroll.spec.ts) ====================
[mut] m8 已施加于 tests/e2e/reader-scroll.spec.ts
[test-surface] files: 179 base / 179 cur | cases: 1623 base / 1623 cur | assertions: 4979 base / 4979 cur | skipSites: 15 base / 14 cur
[test-surface] exemptions entries: 0 hits: 0 stale: 0
[test-surface] FAIL SKIPSITE_REMOVED tests/e2e/reader-scroll.spec.ts 「test.skip(!isTicketDone('SR2-F-05'), '延期：工单 SR2-F-05 未完成')」
[test-surface] 检查未通过：1 处契约违背（hint: 若为有意收紧/删改，先取主控裁决，再落 scripts/test-surface.exemptions.json 豁免通道 reason+rulingLink）
EXIT=1
RESTORE-OK (sha256 一致)
==================== m9-scroll (tests/e2e/reader-scroll.spec.ts) ====================
[mut] m9 已施加于 tests/e2e/reader-scroll.spec.ts
[test-surface] files: 179 base / 179 cur | cases: 1623 base / 1623 cur | assertions: 4979 base / 4979 cur | skipSites: 15 base / 15 cur
[test-surface] NEW tests/e2e/reader-scroll.spec.ts › 缺陷 A：窄视口程序滚动（页码跳转+PageDown）只滚阅读器滚动容器——TabBar 恒在视口、外层滚动面零位移 (line 285)
[test-surface] exemptions entries: 0 hits: 0 stale: 0
[test-surface] FAIL ONLY_FORBIDDEN tests/e2e/reader-scroll.spec.ts:285 「缺陷 A：窄视口程序滚动（页码跳转+PageDown）只滚阅读器滚动容器——TabBar 恒在视口、外层滚动面零位移」
[test-surface] FAIL MISSING_CASE tests/e2e/reader-scroll.spec.ts:285 「缺陷 A：窄视口程序滚动（页码跳转+PageDown）只滚阅读器滚动容器——TabBar 恒在视口、外层滚动面零位移」
[test-surface] 检查未通过：2 处契约违背（hint: 若为有意收紧/删改，先取主控裁决，再落 scripts/test-surface.exemptions.json 豁免通道 reason+rulingLink）
EXIT=1
RESTORE-OK (sha256 一致)
==================== m5-baseline ====================
[test-surface] 基线缺失：scripts/test-surface.baseline.json（exit 2 硬阻断禁自愈）——显式执行 `npm run test-surface:baseline` 再生成并对基线 diff 做全量审计
EXIT=2
RESTORE-OK (sha256 一致)
==================== 还原后总绿 ====================
[test-surface] files: 179 base / 179 cur | cases: 1623 base / 1623 cur | assertions: 4979 base / 4979 cur | skipSites: 15 base / 15 cur
[test-surface] exemptions entries: 0 hits: 0 stale: 0
[test-surface] 检查通过：C_after ⊇ C_before（指纹门绿）
EXIT=0
==================== [R1] m6-theme (tests/unit/renderer/theme.test.ts) ====================
[mut] m6 已施加于 tests/unit/renderer/theme.test.ts
[test-surface] FAIL SKIP_ADDED tests/unit/renderer/theme.test.ts:182 「F-TESTREF-00 M6 skip 探针（变异矩阵）」
[test-surface] 检查未通过：1 处契约违背（hint: 若为有意收紧/删改，先取主控裁决，再落 scripts/test-surface.exemptions.json 豁免通道 reason+rulingLink）
EXIT=1
RESTORE-OK (sha256 一致)
==================== [R1] m7-theme (tests/unit/renderer/theme.test.ts) ====================
[mut] m7 已施加于 tests/unit/renderer/theme.test.ts
[test-surface] FAIL SKIPSITE_ADDED tests/unit/renderer/theme.test.ts 「test.skip(probeM7.length > 0, 'F-TESTREF-00 M7 探针延期（变异矩阵）')」
[test-surface] 检查未通过：1 处契约违背（hint: 若为有意收紧/删改，先取主控裁决，再落 scripts/test-surface.exemptions.json 豁免通道 reason+rulingLink）
EXIT=1
RESTORE-OK (sha256 一致)
==================== [R1] m8-scroll (tests/e2e/reader-scroll.spec.ts) ====================
[mut] m8 已施加于 tests/e2e/reader-scroll.spec.ts
[test-surface] FAIL SKIPSITE_REMOVED tests/e2e/reader-scroll.spec.ts 「test.skip(!isTicketDone('SR2-F-05'), '延期：工单 SR2-F-05 未完成')」
[test-surface] 检查未通过：1 处契约违背（hint: 若为有意收紧/删改，先取主控裁决，再落 scripts/test-surface.exemptions.json 豁免通道 reason+rulingLink）
EXIT=1
RESTORE-OK (sha256 一致)
==================== [R1] m10-theme (tests/unit/renderer/theme.test.ts) ====================
[mut] m10 已施加于 tests/unit/renderer/theme.test.ts
[test-surface] FAIL SKIPSITE_ADDED tests/unit/renderer/theme.test.ts 「test.skip()」
[test-surface] 检查未通过：1 处契约违背（hint: 若为有意收紧/删改，先取主控裁决，再落 scripts/test-surface.exemptions.json 豁免通道 reason+rulingLink）
EXIT=1
RESTORE-OK (sha256 一致)
==================== [R1] b1b-empty-baseline ====================
[test-surface] 基线损坏：scripts/test-surface.baseline.json（exit 2 硬阻断禁自愈）——显式执行 `npm run test-surface:baseline` 再生成并对基线 diff 做全量审计
EXIT=0
RESTORE-CHECK-EXIT=0
==================== [R1] m10-removed-half ====================
[mut] m10 已施加于 tests/unit/renderer/theme.test.ts
[test-surface] baseline 已写入 scripts/test-surface.baseline.json
[test-surface] stats {"fileCount":179,"caseCount":1623,"assertionCount":4979,"skipSiteCount":16,"conditionalSkipSiteCount":15,"hardSkipSiteCount":1,"ticketIdCount":57,"eachExpandedRows":160,"unresolvableCount":0}
基线 hardSkipSites 计数: 1
[test-surface] ACTIVATED tests/unit/renderer/theme.test.ts 「test.skip()」（hardSkipSite 删除）
[test-surface] 检查通过：C_after ⊇ C_before（指纹门绿）
EXIT=0
RESTORE-OK (文件+基线 sha256 一致)
FINAL-GREEN-EXIT=0
[R1 复测] B1b 空基线真退出码 EXIT=2（前段 raw 中 EXIT=0 系 tee 管道测 tee 退出码的测量误差，此行更正）
[R1 复测] RESTORE-CHECK-EXIT=0

===== [R2 后主控补证段]（N14 销项——回炉后代码 M3/M5 复跑；探针文件法=scripts/audits/f-m3-probe.mjs） =====
--- m3 复跑（零断言新用例；首两轮 node -e 中文 GBK 化插入未落盘=探针工具缺陷非门缺陷，宪法 shell 四坑之二亲历实录；第三轮探针文件法成） ---
APPLIED, inserted bytes: 96
[test-surface] files: 179 base / 179 cur | cases: 1623 base / 1624 cur | assertions: 4979 base / 4979 cur
[test-surface] NEW tests/unit/renderer/theme.test.ts › probe case (line 170, 0 assertions)
GATE_EXIT=0（+1 delta 放行+W10 断言计数格式实证）
--- restore ---
RESTORE_GATE_EXIT=0  sha256 51a41a4c0d3568bb3937 双侧一致
--- m5 复跑（删基线） ---
M5_EXIT=2  [test-surface] 基线缺失：scripts/test-surface.baseline.json（exit 2 硬阻断禁自愈）
RESTORE_EXIT=0  sha256 f10502bd4598f002dbd7 双侧一致
--- B1b 主控独立复证（空 files 退化基线） ---
B1B_EXIT=2  [test-surface] 基线损坏…exit 2 硬阻断禁自愈  RESTORE_EXIT=0
===== [主控补注 N12]（门一 R2 附登记项②——证据链完整性） =====
实现者 b1b 段首测 EXIT=0 复测 EXIT=2 差异成因：首测经 tee 管道重定向（$? 取 tee 退出码），
复测为直跑裸测；其余 m 段（M6/M7/M8/M10）全程直跑故无此伪影。主控独立复证 B1B_EXIT=2 与
复测行一致——功能结论三源闭合（diff 代码行为/实现者复测/主控复证）。——主控 GLM5.3 补注在案

---
## 附 5 stats raw

[test-surface] stats {"fileCount":179,"caseCount":1623,"assertionCount":4979,"skipSiteCount":15,"ticketIdCount":57,"eachExpandedRows":160,"unresolvableCount":0}
[test-surface] baseline 已写入 scripts/test-surface.baseline.json
[test-surface] stats {"fileCount":179,"caseCount":1623,"assertionCount":4979,"skipSiteCount":15,"ticketIdCount":57,"eachExpandedRows":160,"unresolvableCount":0}
==== [R1 回炉轮 1 stats 追加段 2026-09-12 01:36:39] ====
[test-surface] stats {"fileCount":179,"caseCount":1623,"assertionCount":4979,"skipSiteCount":15,"conditionalSkipSiteCount":15,"hardSkipSiteCount":0,"ticketIdCount":57,"eachExpandedRows":160,"unresolvableCount":0}
[test-surface] stats {"fileCount":179,"caseCount":1623,"assertionCount":4979,"skipSiteCount":15,"conditionalSkipSiteCount":15,"hardSkipSiteCount":0,"ticketIdCount":57,"eachExpandedRows":160,"unresolvableCount":0}
