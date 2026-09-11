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
