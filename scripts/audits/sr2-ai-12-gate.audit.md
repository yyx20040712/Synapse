# SR2-AI-12 门一对抗深审 + 门二终审（联审一轮——ENR-03/LG-06 先例）

> 审计人：联审孙代理（门一+门二合并，主控裁量，宪法三屋职权不变）。
> 对象：`scripts/audits/sr2-ai-12-gate1.diff`（9 文件，含 manifest）+ 票面
> `sr2-ai-12-brief.md` v1 + `sr2-ai-12-impl.report.md` + 证据
> `sr2-ai-12-verify.log`（2062 行）+ 誊录源蓝图 :143-156。
> 方法：只读静态深审（逐字机器 diff 复算 / 源码逐行读 / check-tickets
> 规则正则实核 / git log 基线实锚 / git status 范围核对）；禁 npm/测试/
> git 写，全程序合规。
>
> **开工记录·技能清点**：code-review-excellence=用（审计本体）；
> verification-before-completion=用（每裁决项先证后断）；
> test-driven-development=不用·执行面（不写测试，仅按其理念评估 TDD
> 证据链强度）；systematic-debugging=不用（无待隔离缺陷）；
> git 工作流类=不用（禁 git 写，仅只读 log/status/diff）；浏览器/e2e
> 类=不用（静态审阅既有 log）。配置自查：单会话双门，GLM-5.3 常规档，
> 无独立档位可调。

## A. 誊录逐字性终验（最高优先）——过（独立机器复算逐字一致）

实现者 §5 的机器抽取 diff 证据**独立重演**：本审计用 awk -F'|' 抽蓝图
:147-153「问题」列七值、grep -oP 抽 `ai-note-style.ts` QUESTION_TEXT
七值，两侧进程替换 diff → **输出空，DIFF_EXIT=0**。含标点细节复核：

| # | 蓝图原文（问题列） | 实现值 | 判 |
|---|---|---|---|
| Q1 | 核心 idea 是什么 | 同 | ✓ |
| Q2 | 对同行的价值（改变了认知方式？开创范式大幅加快计算？解决工程问题？） | 同（全角括号/问号×3） | ✓ |
| Q3 | 工程债务：失败数据未记录处、潜在试试错点（ARA 叙事税的逆向重建）→ 勘误见下 | 同（全角冒号+顿号） | ✓ |
| Q4 | 学术谱系：为什么是这个单位、这个学生/作者？师承何方、祖传资源积累 | 同 | ✓ |
| Q5 | 全文哪个片段最符合自然科学品味（深刻≠复杂：可迁移/结构普遍/可交叉印证） | 同（≠ 字符逐字） | ✓ |
| Q6 | 未声明的局限与适用边界 | 同 | ✓ |
| Q7 | 验证强度 | 同 | ✓ |

（Q3 行勘误：上表左列「试试试错点」系本档誊写笔误，机器 diff 两侧均为
「潜在试错点」——以 DIFF_EXIT=0 的机器结果为准，不受本笔误影响。）

结论：七值逐字誊录成立（含全角标点/括注/空格），P3 纪律兑现
（誊前 Read 核对+誊后机器 diff 双证据）。**零 [B]**。

## B. 母本符合度+自裁复核+未申报面扫描——过

五层规约逐项：行为层「第N问：原始命题」两消费位落地 ✓；接口层
+1 导出映射+两消费位文案行、AiNoteQuestion 类型/枚举序零触碰
（`src/shared/models/ai-note.ts` git status 不在改动面——硬事实）✓；
架构层跨域白名单例外既有零新面 ✓；生命周期层零差异化/零设置面 ✓；
文化层 TDD 链（见 D/W1）✓。

自裁 5 项 vs diff 逐条：

- **a. QUESTION_TEXT 类型 `Record<Exclude<AiNoteQuestion,'divergence'>,string>`**
  ——独立裁：**认可，且比主控初审更强一档**。实核
  `src/shared/models/ai-note.ts:20-21`：`AI_NOTE_QUESTIONS` 八键含
  divergence——票面括注「它非 AiNoteQuestion 枚举值」确系笔误（与
  代码事实不符），票面同条「divergence 不入本映射」+`Record<AiNoteQuestion,…>`
  在类型级互斥。Exclude 形态是唯一使「不入」获编译器强制的形态：
  两消费位不写 divergence 分支即 `QUESTION_TEXT[question]` 类型错，
  typecheck EXIT=0 = 分支齐备的机器佐证。五处受锁断言 divergence
  期望值零改（'分歧报告'）——AI-11「divergence 独立组头」口径无回退。
- **b. :480 一带 it 必然红法**：diff :244 实核=在「divergence 组转置」
  it 内**新增** Q1 全形态断言（`toBe('第一问：核心 idea 是什么')`），
  divergence 断言原样保留——该 it 实现前因新断言必红，首红实录
  5 failed 含此 it ✓。合规。
- **c. src 注释日期锚**：`scripts/check-tickets.mjs` 规则正则实核——
  :72 `ticketRefRe=/SR2?-[A-Z]+-\d+/g` 匹配 src 内「SR2-AI-12」，
  :95-98 `byId.get()` 无此号（audits 简报工单不在 registry）→
  「引用了不存在的工单号」必红；tests/ 面（:77-90）仅
  `placeholderCallRe`（unimplementedObject/NotImplementedError 调用）
  受限，注释/it 名的工单号合法保留。AI-11 先例（src 用
  「2026-08-28 缺陷 F」日期锚）同款处置。**未改任何检查脚本**（diff
  无 scripts 面）✓。
- **d. e2e heading 断言形态**：getByRole name 默认规范化子串匹配。
  真锁判定：查询串「第一问：核心 idea 是什么」长于回退态（短标签
  「第一问」）可达名 → 任何回退形态不命中 → 必红（§3 e2e 首红 2
  failed 实证）。弱于 toBe 全等的后缀污染场景（「…什么（错）」仍
  命中）由单测 4 处全等锁定兜底——综合守卫强度**高于旧态**（旧断言
  name:'第一问' 亦子串匹配且更短）。非放宽 ✓。
- **e. 基线对账**：见 F 项——git log 实锚 F-07 收口（cc39975）基线
  743，票面 741 系 AI-11 时点旧数（主控票面笔误，先例 LG-07 W4
  同型），实现者以 dispatch/实测为准申报正确。

未申报面扫描：diff 6 代码文件+manifest 每处改动对上申报（三处 src
头注改动在 §2 文件清单逐条申报）；头注「+原始命题单源」补名、
AiNoteGroupList/LineageSideAiNotes 头注更新均属申报内。**零未申报面**。

## C. 受锁五处改写守卫强度——过（等强度以上，无放宽）

| # | 位置 | 旧断言 | 新断言 | 强度判定 |
|---|---|---|---|---|
| 1 | ai-notes-section「分节分组」 | `toEqual(['第一问','第二问','分歧报告'])` | 同型数组，Q1/Q2 换全形态 | toEqual 深比较=全等锁定；顺带锁 Q2 全文（超票面最低要求） |
| 2 | 同文件「空组剔除」 | `toEqual(['第一问','第三问'])` | Q1/Q3 全形态 | 同上，锁 Q3 全文 |
| 3 | 同文件「divergence 组转置」 | 仅 divergence 断言 | +`toBe('第一问：核心 idea 是什么')` | toBe 全等；divergence 期望零改（口径无回退） |
| 4 | lineage-side-panel「四区渲染」 | `toEqual(['第一问','分歧报告'])`（h5） | Q1 全形态 | h5 轴同型全等 |
| 5a | e2e ai-notes-section:131 | `heading name:'第一问'` | `name:'第一问：核心 idea 是什么'` | 子串匹配（Playwright 既有风格）；回退态必 not found（B-d 论证+首红实证） |
| 5b | e2e lineage:486 | 同上（aiSection 作用域） | 同型 | 同上 |

- e2e 两处「分歧报告」断言（:132/:487）未动——Q1 新文案不含「分歧
  报告」子串，无互扰（实现者 §9 疑虑 2 已申报，现无此面）。
- **新 it（ai-note-style TEXT 键集）**：diff :198-205 实核——顶层
  describe 内 `it()`，不经 guardedDescribe → **always-active**（K3
  要求兑现，票面文化层「新测试 always-active 不经 guardedDescribe」
  落地）；断言链 `seven toHaveLength(7)` → `Object.keys sort toEqual
  seven sort`（恰七键，多删/多加均红）→ 逐键非空——**能失败一次**：
  变异二（删 Q3）实证 `1 failed | 2 passed`（键集断言拦截）✓。

守卫缺口如实登记（→W3）：Q1（6 处）/Q2（1 处）/Q3（1 处）全文被
持续锁定，**Q4~Q7 仅非空**——四问文案漂移不触发红。

## D. 宪法红线——过（一档 TDD 证据形式弱于先例，记 W1）

- **分层**：全改动面 renderer 层（3 src+5 tests）；零 IPC、零 shared
  （git status 硬事实）；LineageSideAiNotes→reader/ai-note-style 跨域
  =既有 COMPOSITION_ROOT_ALLOW 白名单例外（本单零新增跨域面），
  verify 内 check-quality 绿=白名单在册佐证。
- **受锁时间序**：unlock（144）→同批改 5 受锁测试→apply（144）；
  manifest diff **恰 5 对 sha256 + generatedAt**（gate1.diff :12-50
  逐条实核：ai-notes-section.spec / lineage.spec / ai-note-style.test
  / ai-notes-section.test / lineage-side-panel.test——与票面 P2 五文件
  恰合，无第六处）；locks:check 144 绿在 verify 内（log :37-40）。
  无新增受锁路径（五文件均已在册）→ 无需 generate。即时 apply 达成
  （generatedAt 15:53 与工作区同步）。
- **行数**：ai-note-style.ts 61 / AiNoteGroupList.tsx 105 /
  LineageSideAiNotes.tsx 125——均 ≤500 且组件 ≤250（实测行数，
  lint max-lines 绿交叉佐证）。
- **UTF-8 / 占位符**：quality:check「无占位标记/无乱码/无跨域引用」
  绿（log :18-21）；本档抽读三 src 中文全部正常。
- **TDD 四档**：①首红 5 处（unit 5 failed+e2e 2 failed）——逻辑闭合
  但**原始输出未独立落盘**（verify.log 内 grep "failed" 零命中，仅
  impl.report §3 文字转录；先例 F-07/LG-07 均有独立 firstred log）→
  W1；②绿证全量 verify VERIFY_EXIT=0 落盘（§1）+专项绿；③变异红证
  ×2 **恰中零误伤**：变异一（删 h4 拼接）恰杀锁组头三 it（3 failed|
  21 passed），变异二（删 Q3 键）恰杀 TEXT it（1 failed|2 passed）；
  ④还原证据在 log §2：两处「还原 diff 输出:<空> DIFF_EXIT=0」明确
  落盘，cp 备份法全程未用 git checkout（宪法该条合规），还原时
  stat 与票面 diff 面吻合（无变异残留）。
- **安全禁令**：纯呈现面改动，八条否定式零触碰。

## E. 接缝（读代码回答）——过

- **divergence 组头渲染路径完整**：`AiNoteGroupList.tsx:58-60` 与
  `LineageSideAiNotes.tsx:90-92` 均三元分支——divergence 走
  `QUESTION_LABEL['divergence']`（ai-note-style.ts:36='分歧报告'），
  组头元素（h4/h5+QUESTION_COLOR 左缘条+data-question="divergence"）
  俱在；Exclude 类型使该分支编译器强制（漏写即 tsc 红）。**无断链**。
- **拼接格式一致性**：两消费位逐字符相同
  `` `${QUESTION_LABEL[q]}：${QUESTION_TEXT[q]}` ``（全角冒号+模板串），
  票面行为层「面板全量/侧板同文案同源」兑现。
- **第三消费位排查**：全仓 grep 实核——`AiAnnotationLayer.tsx:63,167`
  仅 import/消费 `QUESTION_COLOR`（AI-09 渲染层无组头标签面），
  QUESTION_LABEL/QUESTION_TEXT 消费面恰两处=票面 P1 预裁面。头注
  「AI-09 同源消费」声明指分色映射——无互斥声明、无接缝归责冲突。

## F. 机器面——过（744 精确闭环）

- **744=743+1 数理链 git log 实锚**：AI-11 收口 741（82dfd25）→
  F-07 收口 **743**（cc39975，commit message 明文「verify exit=0
  95 文件 743 用例」——F-07 +2 it）→ 本单 +1 it（ai-note-style.test
  2→3 tests，log :140 实证）→ **743+1=744**=verify.log :1991-1992
  「Test Files 95 passed (95)/Tests 744 passed (744)」逐环闭合。
  95 文件数不变（无新测试文件——受锁 5 文件均既有）。票面 §3 的 741
  =AI-11 时点旧数（→N1，主控票面责任）。
- **5 断言改写不增 it 数**：#1/#2/#4/#5a/#5b 均改写既有 it/test 内
  断言；#3 为既有 it 内**新增断言**（非新 it）；唯一新 it=TEXT 键集
  1 个。与 +1 口径自洽。
- **tickets:check**：「共 115 个；open 0」绿（log :27-31）；拦截机理
  本审计读 check-tickets.mjs 全文独立核验（B-c 节）——先例口径
  （AI-11 首跑红→日期锚）与代码规则吻合，无放宽检查行为。
- **locks:check**：144 文件对账绿；与 dispatch 基线 locks 144 一致。
- **git status 实况**：M×9（恰 3 src+5 tests+manifest=票面范围）；
  未跟踪 4=本票审计档 3 件+`sr2-lg-08-brief.md`（**主控并行票面
  在场——staging 误扫风险点**，入放行条件 3）；verify.log 被
  .gitignore 忽略（申报属实）。

## G. 成本账本行

- 实现者子代理：**≈2.64M tok / 15.3min**（主控任务书口径）。
- 联审孙代理（本档，门一+门二一轮）：**≈0.07M tok / ≈15min**（读档
  5 批+源码全文 3 件+log 节选+只读 bash 6 次+两门一档落笔；低于
  ENR-03/LG-06 联审先例系单档合并产出+零 e2e 探查面）。

## 门一裁决

**过，零回炉项（0B/3W/5N）**。A~F 全过；誊录逐字机器复算一致；自裁
5 项全部授权内且申报如实（a 项为票面笔误的正确纠偏）；主控三项预裁
独立复核均成立（且 a 项增强认可）。W1~W3 记档不回炉（依据：证据链
逻辑闭合/范围实质无蔓延/票面恰只要求非空断言）。

## 门二终审（四清单）

**清单一·处置核对**：B=0 无回炉处置。W1（首红证据形式）维持——逻辑
可信度中高（47=42+5 数理自洽+变异一独立复现同三 it 同型红+期望值与
终态一致），形式弱于先例记档；W2（「恰 8 文件」口径）维持——**收口
单须勘误**：全仓 diff 实为 9 files（3 src+5 tests+manifest），9 文件
恰票面范围含 locks 面，无实质蔓延；W3（Q4~Q7 文案无持续锁定）维持
——建议后续小票补逐字断言（受锁 [locked-change]，不阻断本单）。

**清单二·母本符合度**：B 节五层+自裁逐项全过。

**清单三·宪法红线**：D 节全过；manifest 恰 5 hash+generatedAt；unlock
→apply 同批即时；行数/UTF-8/占位符/安全禁令零触碰；TDD 四档在（W1
形式项）。

**清单四·机器面**：F 节 744 精确闭环（git log 实锚 743 基线）；本门
禁跑测试（联审铁律），采信 verify.log 真退出码落盘+静态可数性交叉
验证——一致；受锁 e2e spec 改动后全量 verify 已含 tsc（EXIT=0 落盘
§1——宪法 UBS 条款「playwright 不查类型靠 tsc 拦」达成）+e2e 两用例
专项复跑 2 passed（§3），无需补跑。

### 收口放行条件（4 项）

1. **建单**：tickets/registry.ts 建 SR2-AI-12 条目，建议 file=
   `src/renderer/features/reader/ai-note-style.ts`（本单单源新增处；
   `// b3: P7-G` 指针行 :1 已在，规则 6 就绪——AiNoteGroupList.tsx:1
   同有，主控裁量）。
2. **[locked-change] 尾注**：提交含 manifest 5 hash 变更（+5 受锁测试
   文件本体）——尾注必带；manifest 已即时 apply，无跨提交延迟重锁。
3. **staging 显式列文件**（并行票面 `sr2-lg-08-brief.md` 在场，严禁
   `git add -A`）：9 M 文件逐列 + 本票审计档 4 件（brief/impl.report/
   gate1.diff/gate.audit）；**严禁扫入** sr2-lg-08-brief.md。
4. **提交信息勘误 W2 口径**：diff 范围表述用 9 文件（含 manifest），
   勿沿用实现报告「恰 8 文件」。

## 统计行

**门一+门二联审：0 B / 3 W / 5 N → PASS（放行收口，按 4 条件）**

- W1 首红证据未独立落盘（verify.log 无 5 failed 原文，仅报告转录；
  先例均有 firstred log）——逻辑闭合不回炉，形式弱记档。
- W2 「全仓 git diff --stat 恰 8 文件」与自身输出「9 files changed」
  矛盾（manifest 漏计）——实质无蔓延，收口勘误口径。
- W3 Q4~Q7 命题文案仅非空断言、无逐字持续锁定（蓝图 md 亦不受锁；
  Q1/Q2/Q3 已被全等断言锁）——后续小票补强建议。
- N1 票面基线 741 系 AI-11 旧数（F-07 后真基线 743）——主控票面
  笔误记档（LG-07 W4 先例同型），实现者对账正确。
- N2 票面「必然红 5 处」与所列 6 断言位计数口径不严格对应（实义=
  5 unit it 级必然红+e2e 2 处）——零行为影响。
- N3 manifest CRLF（PowerShell 重写）——locks:check 按 LF sha 对账绿，
  .gitattributes 归一（ENR-03 门二同款已裁定合规）。
- N4 e2e「分歧报告」子串匹配的未来收紧面——实现者已申报，现无此面。
- N5 报告「+15 行净」实为插入 15 删 1 净 14——行数口径微误（AI-11
  W3/LG-07 W3 先例同型频发项）。
