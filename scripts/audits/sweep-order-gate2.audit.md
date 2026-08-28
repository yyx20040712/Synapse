# 排序雷清扫单元 门二终审档

- 单元：六处 ORDER BY 决胜键 rowid 确定化（事件驱动存量缺陷清扫，无工单号；
  缺陷③ 69188e8 同型；第六雷 listAllIds=主控 2026-08-28 追加裁决）
- 审计角色：门二终审子代理（ADR-0017 三屋）；只读审计，唯一可写=本档；
  禁 npm/test（主控收口 verify 在跑，运行面证据以实现者 verify log+静态推演为基）
- 日期：2026-08-28
- 结论速览：**PASS（四清单+一逐项全过）**；主控预裁五项（W1 还原/W2 入册/
  N1~N4 无动作/门一 PASS 维持）**全部核准**；门二新增注记 2 条（N-1 台账
  §3 待办索引行未随收口翻状态；N-2 成本账本口径差+verify log 时序澄清），
  均无回炉依据。

## 0 开工记录（会话开工纪律——技能清点）

- code-review-excellence=**用**（终审=对抗深审收口裁定，按其框架执行）
- verification-before-completion=原则采用、运行面收窄（铁律禁 npm/test；
  证据基=实物源文件+只读 git+manifest 哈希亲算+verify log 关键行+测试逻辑
  静态推演）
- systematic-debugging=不用（静态审计非调试）
- test-driven-development=不用（不写实现，只审 TDD 证据链）
- subagent-driven-development=不用（本人即终端门，无再派发面）
- 其余领域技能（前端/CI/部署/DB 调优等）=不用（本单元纯 SQL 字面量+测试审计）
- 配置自查：门二位独立于实现者与门一，未采信任何自述，逐条对实物核实；
  主控两处置改（W1/W2）以只读 git diff 终态核对（非采信处置声明）。

输入七件独立读取：母本先例 `git show 69188e8 --stat`、findings 台账发现 3
（含六雷收口注记+第七雷候选终态）、实现者报告、impl-verify.log（1961 行，
关键行亲核）、门一审计档、门一 diff 包（420 行）、工作树 git status/diff 终态。

## ① 处置核对（门一全 findings+主控裁决 vs 终态实物）

### W1（测试漏报改动还原）——**核准，还原真落**

- **:349 终态形态**：`createExportIpc(cancelled.deps as never).corpusSet({})`
  （tests/unit/services/corpus.assemble.test.ts:349 亲读）；终态
  `git diff -- <该文件>` 仅余三个 hunk（import 区 describe/orderAiNotes/
  AiNote 三导入+尾部新增 describe），门一 diff 包中
  `+corpusSet({ paperId: 'p-1' })` 行**已不在终态 diff 中**——sed 还原真落，
  无残留。
- **契约一致性**：`corpusSetReqSchema = z.object({}).strict()`
  （src/shared/ipc/schemas.ts:305，空请求 strict 契约）——还原后测试调用
  `corpusSet({})` 与契约同形；门一 W1 指出的「教读者 corpusSet 接受
  paperId」接缝漂移微缩版已消除。
- **还原后该用例仍绿的静态推演**（主控 verify 在跑，按票面以逻辑证）：
  handler `corpusSet: async () => {…}`（src/main/ipc/export_.ts:106 起，
  **签名零参**——请求对象在 ipc 层即被丢弃）；取消路径=buildCorpusSet()
  →entries 非空→`pickFolder()` 返回 null（stubDeps({ folder: null })）→
  抛 `ExportIpcError('CANCELLED', '已取消')`——**全程不读任何请求参数**，
  故 `corpusSet({})` 与 `corpusSet({ paperId: 'p-1' })` 行为恒等；断言
  `.rejects.toThrow('已取消')` 期望未动 → 还原零行为影响，用例仍绿。
- **locks 重 apply 生效**：manifest 中该文件 sha256=`94c5c7b3…4351`，
  磁盘 sha256sum 亲算**逐字节一致**（注意：≠门一 diff 包时代的
  `f835841e…`——哈希随还原后重 apply 更新，恰为「还原+重锁同步」的证据
  链）；manifest 计数亲验 138 条。
- **UTF-8**：该文件零替换符（字节级 grep）——主控 node 验过的声明抽验属实。

### W2（第七雷候选入台账）——**核准，两段存在且口径一致**

- findings 台账发现 3 节（docs/reports/2026-08-27_visual-check-findings.md
  :73-85）确有两段：「六雷清扫收口（2026-08-28，主控追加第六雷=listAllIds）」
  与「第七雷候选（清扫单元门一 W2 复核产出，低频另立单元待排）」。
- 口径逐点对门一产出：①~⑤全修+⑥listAllIds（rowid+INV-17 理由+
  export.service:159/corpus.export.service:316 消费链指引）✓；修法统一=
  插入序决胜 rowid、orderAiNotes=删末级决胜三键全平 return 0（sort 稳定性+
  上游 repo 确定序）✓；TDD 首红 7/7+1、变异红证 R1~R9 各恰中专属 it ✓；
  审计指引 scripts/audits/sweep-order-*（门一 0B/2W/4N PASS）✓；第七雷
  (a) annotations `ORDER BY page, sort_key`（buildSortKey 派生键无唯一
  约束）(b) collections `ORDER BY position`（导入撞号）+「触发面低、不进
  INV-17 字节面、仿先例另立清扫单元」——与门一 W2 findings (a)(b) 及 E 节
  复核结论**逐条同口径**，无失真转写。
- 台账终态 UTF-8 零替换符（亲验，含 W2 追加段）。

### N1~N4——**核准（注记无动作）**

- N1（ORDER_BY 模板拼接既有模式+建议注释加固）：无动作，维持合规判定——
  本终审独立复核：q.sort=LibrarySort 编译期封闭枚举、ORDER_BY 映射值=模块
  常量（papers.queries.ts:19-23 亲读），无用户输入面，宪法「禁拼接」针对
  输入参数面——判定正确。后续加固建议维持挂账。
- N2（manifest 工作树 CRLF=generate 脚本 PowerShell 特性）：git diff 仍现
  同款 CRLF→LF 警告，性质不变，哈希按 LF 基、locks:check 138 绿（verify log
  :34 亲核）——知悉即可。
- N3（dev-launch.cmd/dist_new/ 非本单元未跟踪残留）：git status 亲验仍在，
  收口提交 staging 显式列文件纪律提醒有效。
- N4（EXPLAIN 探针输出未留存）：票面已定「建议项可不做」——维持；year_desc
  首红有 7/7 行为实证背书，机制解释自洽，缺档不构成缺陷。

### 预裁五项总核——**全部维持/核准**

W1 还原 ✓、W2 入册 ✓、N1~N4 无动作 ✓、门一 PASS 维持 ✓（本档 §②~④
独立抽核未推翻任何门一结论）、单元不回炉 ✓。

## ② 母本符合度（六处修法 vs 母本先例+简报裁决，抽验四处+全表复核）

| # | 现场 | 简报/裁决要求 | 终态实物（亲读） | 判定 |
| --- | --- | --- | --- | --- |
| 1 | lineage.repo.ts listNodesStmt | `ORDER BY created_at, rowid` | :177 一致 | 过 |
| 2 | lineage.repo.ts listEdgesStmt | 同上 | :178 一致 | 过 |
| 3 | papers.queries.ts added_desc | `p.added_at DESC, p.rowid DESC` | :20 一致 | 过 |
| 4 | papers.queries.ts year_desc | 补第三键 `p.rowid DESC` | :21 一致 | 过 |
| 5 | papers.queries.ts title_asc | `p.title ASC, p.rowid ASC` | :22 一致 | 过 |
| 6 | notes.repo.ts selectByLike | `ORDER BY updated_at DESC, rowid DESC` | :92 一致 | 过 |
| 6b | papers.repo.ts listAllIds（主控追加第六雷） | `added_at DESC, rowid DESC` | :217 一致 | 过 |
| 6c | corpus.assemble.ts orderAiNotes 末级 | 删除而非换键 | :107-108=createdAt 独立成句+三键全平 `return 0`，id 三元式整支无残留 | 过 |

- **抽验四（票面指定）细节**：lineage 两语句同句式仅表名异（防复制错表）✓；
  papers.queries 三键 DESC/ASC 方向配对符合裁决 4（DESC 序后插在前=「最新
  优先」列语义、title_asc 先插在前）✓；listAllIds 单行字面替换+头注 :14-15
  补 INV-17 幂等声明 ✓；orderAiNotes 头注 :94-98「三键全平=0，稳定排序保持
  输入序=repo rowid 确定序；id 字典序决胜已删」与实现形态互证 ✓。
- **母本先例对齐**（69188e8=ai_notes 同型）：修法口径（rowid 插入序决胜+
  三门边界沿用+头注声明同步+always-active 裸 describe 回归锁+直插夹具 id
  反字典序于插入序）与先例逐项同型；先例修面 ai_notes.repo.ts:114/:123 本
  单元零触碰（FTS rank 序亦未动）✓。
- **注释/声明同步 8 处**（⑤同型漂移预防）：lineage :80-81/:104、papers.repo
  :14-15、papers.queries :17-18、notes :88、corpus.assemble :94-98——逐处
  在终态实物中确认 ✓。

## ③ 宪法红线终审

1. **SQL 全预编译**：六处改动均为 `db.prepare`/`stmt()` 内 ORDER BY 字面词
   替换，零新增拼接、零参数化变化（终态源码亲读）；既有
   `ORDER BY ${ORDER_BY[q.sort]}` 为封闭枚举模式（门一 N1，维持合规）✓。
2. **受锁流程**：unlock→改→generate→apply 即时同步，manifest 138 条（亲数
   `grep -c '"path"'`）；四个涉锁测试文件磁盘 sha256 与 manifest 亲算一致
   （corpus `94c5c7b3…`/lineage-order `b8708db5…`/papers `66a0a103…`/
   notes `6bcd7050…`）；W1 还原后 manifest 哈希已随重 apply 更新（跨提交
   锁同步纪律满足）✓。
3. **行数**：源 232/255/108/139/206、测试 66/78/313/401——全部 ≤500、
   repo ≤300（wc -l 亲测）✓。
4. **UTF-8/LF**：九涉改文件+findings 台账零 U+FFFD 替换符、零 CR 字节
   （字节级亲验）✓。
5. **TDD 链静态复核**（禁跑，以结构+数理证）：
   - 首红 7/7+1 的「对现状必红」推演：夹具 id 刻意反字典序于插入序
     （先插 'z-*' 后插 'a-*'）——旧 id 决胜=BINARY 字典序（a 在前）≠期望
     插入序（z 在前）→确定性红；notes 旧无决胜键=引擎扫描序 rowid ASC≠
     期望 rowid DESC→红；corpus 旧 id 三元式对全平对输出 a-first 序≠期望
     输入序→红；listAllIds 旧 `id DESC`→z-first 在前≠期望 a-second 在前
     →红。全部确定性非概率红 ✓。
   - 变异 R1~R9 映射：R1/R2（lineage 两语句各有专属 it）、R3~R5（三键各
     it）、R6（notes 专属 it）、R7（还原 id 三元式只中三键全平 it——主键
     序 it 输入无全平对）、R8（ROLE_ORDER 变异只中主键序 it——三键全平 it
     全同 role 则 roleDelta 恒 0）、R9（listAllIds 专属 it）——独立逻辑核验
     与门一 C 节一致，每轮单 token/单表达式、cp 备份法还原 diff 空（禁
     git checkout 铁律遵守，报告 §3 表+门一 D 节交叉印证）✓。
   - 新测试全部 always-active 裸 describe（不经 guardedDescribe——终态
     源码亲读确认）✓，符合 ADR-0017 K3 面。
6. **死代码/依赖**：零新依赖（diff 无 package.json/lockfile）；探针
   sweep-order-probe.mjs 已删（git status 无此残留）✓。
7. **范围蔓延**：diff --stat=10 文件 169+/21-，与单元面（5 源+4 测试+manifest
   +台账）严丝合缝；零 renderer/preload 文件（`git diff --stat --
   src/renderer src/preload` 空输出亲验）——e2e 面申明成立 ✓。

## ④ 机器面核对

- **661=652+9 数理**：新 it=lineage 2（nodes/edges）+papers 4（三排序键+
  listAllIds）+notes 1+corpus 2（三键全平/主键序）=9；90=89+1 文件（新建
  lineage.repo.order.test.ts）。verify log 亲核：`Test Files 90 passed (90)`
  （:1920）、`Tests 661 passed (661)`（:1921）、`VERIFY_EXIT=0`（:1961）、
  locks:check「138 个受锁文件与 manifest 一致」（:34）、quality「无占位
  标记/无乱码/无跨域引用」（:15）、tickets:check「注册表与代码一致」（:25）、
  build 三段 ✓（:1930-1961）。
- **locks 138**：manifest 计数+verify log+磁盘哈希三源一致（见③.2）✓。
- **无工单号引用推演**：本单元零 registry 触碰（git diff 无 tickets/
  registry.ts），check-tickets 面零变化；新测试+新增 hunk 零 SR2/SR-DB/SR-SVC
  工单号引用（门一 B.5 核+终态抽验，头注用「排序雷清扫回归锁」自描述）——
  无工单事件驱动单元的引用纪律满足 ✓。
- **e2e 面申明**：零 renderer 文件（③.7 空输出亲验）——主链全在 main 侧
  repo/service 层，渲染消费序未动面，e2e 零新风险申明成立；主控收口 verify
  终裁。

## ⑤ 成本账本行（ADR-0017）

| 屋 | token | 时长 | 来源 |
| --- | --- | --- | --- |
| 实现者（两轮：五雷 5.25M+第六雷追加 1.79M） | ≈7.04M | ≈22.2min | 主控台账（平台计量口径） |
| 门一（对抗深审） | ≈1.14M | ≈6.7min | 主控台账 |
| 门二（本档，自估：七件输入+终态实物四源核对） | ≈0.5M | ≈12min | 自估 |
| **单元合计** | **≈8.7M** | **≈41min** | — |

口径注记（→N-2）：实现者报告 §8 自报≈1.05M/46min 与主控台账 7.04M/22.2min
差异=计量口径（平台计量含会话/工具往返开销 vs 实现者粗估）——以主控台账为准
登记，无裁决影响。

## 门二 findings（新增注记，无 B/W）

- **N-1 台账 §3 待办索引未随收口翻状态**：findings :163-164「挂账联动」
  仍列「五雷清扫（发现 3 清单）」为待排项，而发现 3 节内六雷收口注记已记
  完成——索引行与节内状态时序错位（纯文档口径滞后，无行为影响）。建议
  主控收口提交时顺手一行翻掉（同 W2 处置笔，无需另单元）。
- **N-2 verify log 时序澄清+成本口径差**：(a) impl-verify.log 的 661/EXIT=0
  为 **W1 还原前**轮次落盘——还原为参数忽略面（handler 零参签名+断言未动，
  ①节静态推演零行为影响），终态数字以主控正在跑的收口 verify 为准；
  (b) 成本账本两套口径差异见 ⑤——登记以主控台账为准。

## 总评

**PASS。** 四清单+一逐项全过：①W1 还原真落（:349 形态+契约同形+哈希重锁
同步+零行为推演）与 W2 两段入册（口径与门一产出逐条一致）核准，N1~N4 无
动作核准，预裁五项全部维持；②六处修法对母本先例与简报裁决零偏差（抽验四
处+全表），声明同步 8 处齐；③宪法红线全绿（预编译字面改/locks 138 三源
一致/行数/UTF-8/LF/TDD 链静态复核成立/零依赖零残留）；④机器面数理闭合
（661=652+9、90=89+1、registry 零触碰、零 renderer）；⑤成本账本入册。
门二新增 2N 均为收口提交顺手项，**不构成回炉依据，单元可收口**——以主控
亲验收口 verify EXIT=0 为最终落地条件。
