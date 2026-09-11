[routing]: run=20260911160714-9b4i source=deepseek model=deepseek-v4-flash role=auditor-readonly@de7c6402 cfg=add15c606e1b switches=0 usage=in=8380,out=19015 latency=89076ms (by ds-call-v2 链)

# 对抗审核报告 · F-TESTREF-00（P0 设计链第二跳）

## 阻断项（B）

**[B1] 草案 A「新增 skipSite=放行+delta」是绕过通道**（补裁 A 锚点 / 设计 §3.5、§5.1-4）
AI 在既有用例体内加 `test.skip(true,'x')` 或恒真条件：该用例 markers 不变（配对照常绿），skipSite 为新增（放行走 delta）→ 整门绿，既有用例被静默禁用。且与已终裁「新增 skip=红」及本文 §5.1-4「基线无 skip、当前出现 skip→红」自相矛盾——markers 型 skip 红、体内条件型 skip 放行，形成同义两制的旁路。**修正**：新增 skipSite 一律红走豁免；或当条件 AST 为字面量真值即直接红（保留依赖门治理形态白名单）；删除 skipSite 维持红走豁免。另「无条件 `test.skip()`」与「1 参条件 `test.skip(cond)`」的归类未定义，须补。

**[B2] §5.1-4 只约束「配对成功的用例」，新增用例带 skip 漏网**（设计 §5.1-3/-4）
新 key 用例走 §5.1-3「新增=绿+delta」，其 markers 无基线可配对，故 §5.1-4 不触发——违反「新增 skip=红」。**修正**：置全局规则——当前任一 CaseEntry.markers 含 skip 而基线同 key 不存在（或新用例含 skip）→ 红。

## 应改项（W）

**[W1] §3.2 未规定 describe.skip/describe.only 向子用例 markers 的传播**（设计 §3.2、§5.1-5）
若以 `describe.only(...)` 包住用例，无传播则用例 only 不入 markers，§5.1-5「only 恒红」落空（Q2 现为 0，属潜在旁路）。**修正**：明确 describe 级 skip/only 向共享路径下全部 CaseEntry 传播。

**[W2] §3.3 断言单元与去重边界未定义，存在漏报**（设计 §3.3）
未指明取值单位是「ExpressionStatement 文本」还是「最外层 expect 调用文本」：取外层语句则 `tests.map(x=>expect(x).toBe(1))` 记为整串（改 `map`→`forEach` 即假红）；取外层 expect 则 `await`/`return` 差异不入文（跨行链需以最外层 expect 调用 getText+空白归一覆盖）。更严重：**「仅保留内层」会丢弃真外层断言**——`expect(fn).toThrow()` 内含断言时外层 toThrow 被删=漏报；去重应仅在「外层为非 expect 调用（如 `vi.waitFor`）」时生效。if/else 两分支无包含关系→各计一份，须显式声明（分支合并即红）。**修正**：以最外层 `expect` 调用为单位，去重限「外层非 expect」。

**[W3] 草案 B 的稳定标记键产生漏报与假绿**（补裁 B 锚点）
(a) 非静态占位位不入键→该位换值（css 标识符替换）仍绿=漏报；(b) 行内容换位（相邻行静态/非静态位互换）键多重集不变=假绿；(c) 键≠运行时标题，且 §3.2「只接受 ArrayLiteralExpression」未随 §3.4 同步修补，自相矛盾；(d) 单跳标识符解析未处理声明后 `push`/重赋值、同名遮蔽。**修正**：键须纳非静态位的稳定摘要（或解析失败即红）；§3.2/§3.4 同步；解析限定不可变 const。

**[W4] §5.1-3 同 key 二分正确性与复杂度假设被草案 B 推翻**（设计 §5.1-3、Q5）
草案 B 折叠后同 key 多重计数成常态（DURATION_COUNTS 14 行→3 键×计数），「同 key 极少、O(n²)」假设失效；贪心+回溯最坏指数，须给上界或改确定性最大匹配并实测。且匹配仅按 assertions，含 skip 的同 key 用例可配对歧义→markers 比较假红。**修正**：匹配键扩为 (assertions, markers) 联合。

**[W5] §5.1-4 markers 逐元素相等对「取消 skip」也红，过严**（设计 §5.1-4）
依赖门工单完成后清理 skip（实锤 15 处将随工单陆续红走豁免）产生持续摩擦。取消 skip 属覆盖增，**修正**：skip 取消改绿+delta（或仅要求 skip 新增红）。

**[W6] §2.1/§3.1 硬编码目录与扩展名，存在漏扫旁路**（设计 §2.1、§3.1）
仅扫 `tests/{unit,contracts,e2e}` 与 `.test.ts/.spec.ts`：新目录或 `.tsx` 用例即漏扫，削弱置入不受监控。**修正**：按 `tests/**` 扩展名白名单（含 tsx）扫描并断言目录无遗漏。

**[W7] §7.3 案 B 的 base 未定义 / package.json 全放行**（设计 §7.3、Q6）
`git diff --name-only <base>...HEAD` 未定义 base：merge commit 取法（merge-base vs HEAD^）决定误报/漏报，PR 混合提交会带入非战役路径。package.json 整体放行使战役可改依赖/脚本，已知风险未封。**修正**：明确 base=merge-base(origin/main,HEAD) 且仅对尾注提交生效；package.json 至少路径级复核或拆脚本段校验。

**[W8] §11 ≤500 行预算偏乐观 + 拆分预案落锁**（设计 §11）
叠加草案 A（skipSite）+草案 B（单跳解析+稳定标记+位置映射）后 320 行估计偏低；拆分预案须同样「诞生即锁」（Q7 已证 scripts/ 递归入锁，子目录可用，未必平铺）。**修正**：实现前以 stats 估算并预留拆分件入锁。

**[W9] §10 证伪矩阵不完整**（设计 §10）
M1-M5 未覆盖「新用例带 skip」「新 skipSite」「草案 A/B 行为」「describe 传播」。**修正**：补 M6-M9。

## 注记（N）

- **[N1]** §2.2 key 以「 › 」连接，标题含该串时键碰撞。
- **[N2]** §6 豁免以 caseTitle 匹配，同文件同 title 重复用例时豁免过宽。
- **[N3]** §5.2 的 NEW 行与 §5.1-4 的 skip 红可能同时报，输出语义需统一。
- **[N4]** Q5「同 key 极少」未实测，草案 B 后已不成立（并入 W4）。

## 总评与放行意见

主干（C/S 拆分、多重集 ⊇、显式基线禁自愈、verify+锁挂载）方向正确，但存在两处**契约级漏洞**：[B1] 草案 A 为体内条件 skip 开了放行通道，[B2] 新增用例带 skip 未被拦。二者直接使门「形同虚设」，必须先堵。草案 B 的稳定标记键引入非静态位漏报与行换位假绿，须先补非静态位摘要或改「解析失败即红」。其余为边界/可执行性缺口。

**结论：不可终裁，需回炉。** 修订 B1、B2 为「新 skipSite / 新用例带 skip 均红走豁免」，并补齐 W1/W2/W3 后复审。不确定项：DURATION_COUNTS 位置 0 的相异字面量数是否为 3（草案 B 据此断言 3 键，未实证）；Q5 同 key 重复规模未实测。