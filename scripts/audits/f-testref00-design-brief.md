# 设计任务：测试面指纹门 check-test-surface.mjs 设计书（F-TESTREF-00 / P0）

你是「拟定」岗（架构与技术路线设计链第一跳）。请为下述仓库的**测试面指纹门**机制拟
一份可实现的完整设计书。你无需访问仓库——本简报自包含全部必要事实；禁止臆造仓库
不存在的事实，缺信息处在设计书中显式标「待主控补证」。

## 1. 问题背景（死结）

仓库是单人使用的 Electron + TypeScript 桌面应用（学术文献管理+PDF 阅读标注）。现状：
- 应用源码 31,076 行；测试 37,012 行 / **185 个测试文件**（tests/** 全部 sha256 受锁——
  改一个字符即 CI 红；合法解锁流程存在但大规模重构 ≈185 条 sha 变更，人工审不动）。
- 测试债三类：脚手架重复（mock 工厂 39+32 文件各自声明、几何桩 22 文件 97 处、e2e
  launch 5 副本等）；覆盖倒挂（src/shared 契约面测试最薄）；不确定面（e2e flake 散文
  记账）。
- 治理威胁模型已迁移：旧的「防假装完成工单」威胁（guardedDescribe 开关门）已随
  工单池清零而消失；当前真威胁是**在「优化/合并」名义下静默削弱回归网**（删用例/
  放宽容差/断言搬进 helper 藏起来/两条压一条）——现有机制（文件 sha 锁+工单状态）
  对此零防护。
- 目标：新建 `scripts/check-test-surface.mjs` 指纹门，把「测试不可静默削弱」从纪律
  （人读 diff）升级为机检（CI 判指纹）；与文件 sha 锁正交叠加后，实现「可以动文件，
  动不了契约」——从而解锁一场大规模测试重构战役（脚手架合并/纯增覆盖），战役提交
  范围闸强制零 src/ 变更。

## 2. 已终裁的设计参数（不可更改，直接落入设计书）

1. **两面拆分**：C 面（契约面，不可缩）= 每测试文件的 {用例标题有序多重集（含
   describe 块路径）、每用例体内 expect 断言规范化源文本多重集、guardedDescribe 工单
   号集、skip/only 标记清单}；S 面（脚手架面）= imports/局部工厂/vi.mock/describe 嵌套
   结构/注释——**完全不判**。
2. **判定语义**：`C_after ⊇ C_before`（**多重集**判定，重复计数——防两条压一条）；
   新增放行且输出 delta 报告；任何既有元素缺失=exit 1，失败输出须含「缺失元素 +
   file:line」。
3. **容差**：v1 **不做方向判定**——断言指纹=规范化源文本（空白归一、字面量保留），
   任何既有断言文本消失=红（收紧亦红，走豁免通道）。
4. **豁免机制**：`scripts/test-surface.exemptions.json`（受锁）——条目
   {file, caseTitle, assertionText 或 caseKey, reason, rulingLink}；豁免=显式人工裁决
   留痕，无清单外放行。
5. **it.each**：按展开后用例集比对（本仓 3 处、全在 theme.test.ts，参数为字面量数组/
   模板标题）；设计书须给出展开算法与标题模板替换语义（`$var` 与 `${}` 两形态如何
   出现于本仓要给「待主控补证」位）。
6. **skip/only**：基线无 skip 标记而现版本出现该用例被 skip=红；`only` 一律红。
7. **基线**：`scripts/test-surface.baseline.json`，提供显式再生成子命令（禁止静默
   自愈——基线文件被删/损坏=红，须显式再生成+全量 diff 审计）。
8. **实现**：Node 24 ESM `.mjs`，**零新依赖**——AST 用 `import ts from 'typescript'`
   （树内已绑定，既有先例 scripts/check-dup-constants.mjs 同款加载）；文件 ≤500 行
   （ESLint max-lines 硬线），超限则拆 lib+主件两文件。
9. **挂载**：指纹门进本地 verify 链（quality 之后）；CI 侧同跑。另设计
   `[test-refactor]` 范围闸（CI）：战役提交 diff 路径 ⊆ tests/** ∪ 战役机制件
   （本脚本/基线/豁免清单/CI yml/package.json 脚本段），出现 src/** = 红。CI 现状=
   单 verify job（六道关卡串行）+ 独立 lock-change-guard job（git log 查 [locked-change]
   尾注模式——范围闸可参照该 job 的实现形态）。提交尾注机制：[locked-change]/[dep-change]
   由该 guard job 用 `git log --format=%B` 匹配。
10. **门自身证伪**（票面 DoD）：三支变异红证——①临时删一个用例→门红；②改一个
    expect 字面量→门红；③新增一个用例→门绿+delta 报告（还原用文件备份法，禁 git
    checkout）。设计书须另列「门自身被绕过」的反模式对策清单（见 §4）。

## 3. 仓库技术事实（设计输入）

- 测试框架双栈：vitest 2.1.9（tests/unit/** 166 文件 + tests/contracts/** 3 文件，
  jsdom 环境）+ Playwright _electron（tests/e2e/** 17 spec + e2e-env.ts 助手）。
  **两栈都在指纹门覆盖域内**（e2e spec 的 test()/test.describe()/test.skip() 语义同
  纳入 C 面；playwright title 内 `@probe` 标签属标题文本一部分——标题变即红）。
- vitest 域用例计数：`it(` 1463 处 + it.each 3 处；describe/test/it.each/it.skip/
  it.only/xit/xdescribe 等形态的**实际出现情况须由设计书列「语法形态清单」并标注
  哪些已证存在/哪些待主控 grep 补证**。
- guardedDefine 语义（tests/utils/guard.ts，受锁）：`guardedDescribe(ticketId, title,
  fn)` 运行时展开为 `describe(\`${title} [${ticketId}]\`)`（工单未完成则 describe.skip）
  ——静态抽取时**不得**用运行时展开标题，须以 (静态 title, ticketId) 二元组为键建模；
  工单号集单独入 C 面（工单号变更=红——它与既有 check-tickets 规则 5 的「工单号↔
  被测文件 import 绑定」校验互补）。
- 测试目录结构：tests/unit/{main,renderer,db,services,...}、tests/contracts/、
  tests/e2e/、tests/utils/（fixtures/guard/ipc-deps/pdf-factory 四件）。
- 受锁体系：locks/manifest.json（sha256，LF 行尾，Windows 环境）记 319 文件；scripts/
  下全部 .mjs/.ps1 自动入锁面（新脚本诞生即 locks:generate+apply）；基线 json 有先例
  （scripts/dup-constants.baseline.json 同样受锁）。仓库行尾纪律 LF（.gitattributes
  强制）；中文注释 UTF-8。
- verify 链（本地）：quality:check → tickets:check → locks:check → lint → typecheck →
  test → build（本地**不含** coverage 与 e2e——CI 才跑；战役 DoD 强制本地显式亲跑
  coverage+e2e，设计书不必解决此差，只需保证指纹门本身进 verify）。
- npm scripts 命名先例：quality:check / tickets:check / locks:check / lint / typecheck /
  test / test:e2e / verify / locks:apply / locks:unlock / locks:generate。
- 既有 AST 先例要点（check-dup-constants.mjs 243 行）：walk 目录过滤 .ts/.tsx、
  ts.createSourceFile 解析、节点判定函数族（ts.isStringLiteral 等）、baseline 棘轮
  （存量基线+新增即红+baseline 损坏硬阻断）。你的基线机制可参照但判定方向不同
  （它是「新增即红」棘轮，本门是「缺失即红」单调性）。
- Windows + Git Bash 环境；脚本不得依赖 POSIX-only API；路径含中文（仓库根
  E:\class\智慧水务\Synapse_remake）——路径处理用 node:path join/relative，禁字符串拼
  接正反斜杠假设。

## 4. 必须对策的反模式（设计书逐条给出堵法）

1. 断言搬进共享 helper 隐藏（expect 移出用例体）→ 抽取按**用例体内**（含嵌套函数？
  给出裁决——本仓 helper 内是否有 expect 须标注待补证）。
2. it.each 参数化导致标题消失/漂移 → 展开后比对。
3. 「合并重复断言」把两条压一条 → 多重集 ⊇。
4. 放宽容差让 flake 变绿 → v1 一律红+豁免清单。
5. 新增 skip/only 绕过 → C 面标记清单。
6. 改标题（同体断言换标题）→ 标题在 C 面，变即红。
7. 抽取器自身语法盲区（如 test.extend、describe.configure、动态标题拼接
   `it(\`case ${i}\`)`）→ 语法形态清单+遇到不可静态判定标题=**保守红**（宁误报走
   豁免，不漏报开门）。
8. 基线自愈（门红时自动重写基线）→ 禁；基线重生成仅显式子命令。
9. 豁免清单滥用（豁免条目无理由/永久化）→ 豁免条目必含 reason+rulingLink，豁免
   数量在门输出中显式报告（趋势可见）。

## 5. 设计书要求结构

按以下节产出（中文，Markdown）：
1. 目标与非目标（含「本门不管什么」——S 面重复、行数、风格等明示不管）
2. C 面/S 面精确文法级定义 + 语法形态覆盖清单（已证/待补证分列）
3. 抽取算法（AST 访问方案、规范化规则——空白/引号/模板串/多行断言如何归一、
   每文件输出结构）
4. 基线文件格式（JSON schema、排序稳定性——同输入必同输出、LF/UTF-8）
5. 判定与输出（⊇ 多重集算法、delta 报告格式、失败输出 file:line、exit code 约定）
6. 豁免清单机制（schema、匹配语义、输出报告）
7. CLI 与挂载（子命令：check/baseline 再生成/自检；npm script 命名；verify 链插入点；
   CI yml 修改方案——范围闸落 verify job 新 step 还是扩 lock-change-guard job，给两案
   对比后择一）
8. [test-refactor] 票类全流程（范围闸+指纹闸+用例闸的机检实现；与 [locked-change]
   尾注的关系——本战役提交同时触 tests 受锁面，双尾注）
9. 反模式对策逐条（§4 九条）
10. 门自身证伪方案（变异矩阵+还原纪律）
11. 工程约束合规表（零新依赖/≤500 行拆分预案/Windows/UTF-8/LF/受锁诞生即锁）
12. 开放问题清单（需主控补证/裁决项，逐条列出）

设计书自检要求：每条设计决定给出理由；宁可标「待补证」不可臆造仓库事实；总量
控制在 500 行内。
