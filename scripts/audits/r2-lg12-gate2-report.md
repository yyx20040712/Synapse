# R2-LG12 门二终审报告（三屋·门二子代理）

> 2026-08-29。独立于实现者与门一。只读（唯一可写=本件）；禁 npm test/verify、禁 git 写。
> 输入全读：AGENTS.md / methodology §4.1-4.4 / handoff-v3 §2-§3 / 票面 / 实现者报告 /
> 门一报告 / diff 包 / 4 变异日志 + verify.log + e2e 两日志 / 3 件 staged 文件直读补审。

## 0. 开工记录（宪法会话纪律）

- 模型：GLM-5.3（builtin:bigmodel-coding-plan/GLM-5.3），思考等级 high（终审档）。
- 技能清点：**用** code-review-excellence（终审=深审收口）、
  verification-before-completion（逐声明对实物亲验——本文全部结论基于直读/复演/实算）；
  **不用** systematic-debugging（无活动缺陷排查面）/test-driven-development、
  javascript-testing-patterns（不实现不写测试，仅审 TDD 证据链）/其余领域技能
  （k8s/CI/文档格式/前端设计等与只读终审无关）。

## 统计行

**B_0 / W_1（新增 W3，归主控）/ N_2（新增 N7/N8）—— 总评 PASS，附条件放行。**

---

## ① 处置核对（门一 8 findings + 主控处置 vs 终态实物）

**W1（check-tickets R2 系零解析）——门二独立复演实锤，主控处置成立。**
- `scripts/check-tickets.mjs:26` `objRe=/\{[^{}]*?\bid:\s*'(SR2?-[A-Z]+-\d+)'…/g`：
  `S` 必选、`?` 只作用 `2`。node 复演（门二亲跑）：registry 解析 **119 个**、
  R2 前缀解析 **0**、`R2-LG12 parsed: false`、末三工单=[SR2-AI-12, SR2-F-08,
  SR2-F-09]——与门一实测逐字一致。
- **翻 done 推演前提核实**：R2-LG12 行 status open→done 后，解析集合不含该行
  （复演 `flip-done simulation: parsed set unchanged = true`）→ 工单总数 119/
  open 计数/文件存在性检查/引用一致性检查四环节输入全部不变 → check-tickets
  输出逐字节零变化。主控「翻 done 后 check-tickets 输出零变化」推演**成立**。
- 「建单时主动设计选择、与 R2-LG9/10/11 同待遇」核实：registry 中 R2-LG11
  status=done（diff 在案）而解析集不含它、verify 照常绿——R2 前缀免检路径确为
  既有待遇非本单特设。不修受锁工具+收口单申报+遗留池记口径盲区的处置
  **维持**（K3 防线对 R2 系结构性缺位=遗留池真实条目，非本单可收口面）。

**W2（diff 包漏 3 件 staged）——门二直读补审完成，三件内容与票面一致。**
git status 实测：`M `（staged）恰为 LineageEdges.tsx/LineageNodeMenu.tsx/
lineage-classify.ts 三件。直读补审：
- `LineageEdges.tsx:47-50`：`survey = e.kind==='ref' || surveyIds.has(from) ||
  surveyIds.has(to)`，stroke=`var(--survey-edge)`/width 1.4/dasharray '2 3'
  ——优先级 ref>综述关联>推断>普通，票面 §1 渲染格兑现；
- `LineageNodeMenu.tsx:56`：`node.paperId !== null && isSurvey(node.title)`
  ——菜单项级限定，预裁 6 兑现；头注「service 双守」口径与 service:298-302 同源；
- `lineage-classify.ts:21`：`export { isSurveyTitle as isSurvey } from
  '@shared/models/lineage'`+isCore 改引单源（:19,28）——消费面零改兑现。
主控教训（diff 包生成统一 `git diff HEAD`）记收口单——**维持**。

**N 级抽 3 对实物**：
- N1（importDraft 整批替换清 ref 边）：service:225-248 重灌循环直读——
  upsertNode 全量+upsertEdge 显式 `kind:'tree'`，clearGraph 清面在先（C⑤ 门一
  已证+票面 §4 申报）；ref 边被后续导入静默清除=LG-01 覆盖式语义自然延伸，
  遗留池候选成立。✓
- N3（24 文件统计口径）：git status tracked 改动=25 项=23 本单（20 unstaged
  +3 staged）+manifest+registry（主控开票）——实现者「24=23+manifest」的
  unstaged+staged 合并口径与实物闭合。✓
- N6（store sameTarget 不分 kind）：`lineage.store.ts:90-99` 直读——
  upsert-edge 合并条件=fromNode+toNode 相同（无 edge kind 维度）；与 service
  同端点对互斥协同：两 kind 边本就只有一条能成功，最后写胜出=最后意图胜出，
  无行为缺陷。✓

**主控零回炉处置**：与门一 B=0 一致，门二终审未发现 B 级项（见下），**维持**。

## ② 母本符合度（票面 vs 用户裁决 A 语境逐节裁决）

**决3 后半句三要件全兑现（直读实证）**：
1. 「综述排列最右侧」=U2a 右列（前役），本单 ref 边在 layout 净化段剔除
   （`lineage-layout.ts:212` ref 先剔、surveyCol 分流在后——综述关联 tree 边
   仍走右列分流），**综述节点位置=右列语义不变**——票面 §1 明文兑现 ✓；
2. 「很淡的灰色虚线」=var(--survey-edge) 1.4 虚线 2 3（Edges.tsx:47-59 直读，
   M3 变异红证锚定）——与 U2a「综述关联 tree 边」同视觉=决3 单语义 ✓；
3. 「连接涉及的重要的文章」=ref 边**多对多**：同综述多条 ref 出边合法
   （service 无出度限制+测试用例 1 两条 ref 落库实证）——绕开树单父的受控豁免，
   用户裁决 A「完整多参考边」语义完整落地 ✓。

**票面对 handoff 预裁倾向的合法修正维持**：handoff §3 U2b 预裁倾向原文含
「ref 边豁免单父/**无环校验**」，票面 §1 修正为「仍拒环（混合环真实可达）」
——修正依据成立（综述自己可处树内，tree+ref 混合环真实可达），M2 变异红证
（tree-only 图不可达→漏检被断言拦出）=修正必要性的机器实证。视觉示意值
#c8cdd6→var(--survey-edge) 同理，票面口径为准（U2a 单语义）。

**INV-27 修订表述 vs 实现/DDL 三方一致**（`docs/invariants.md:10` 逐句对）：
- 「tree 边=原语义（ref 入边不算 tree 父）」↔ service:320-330 多父守卫包
  `if(kind==='tree')`+`e.kind==='tree'` 过滤 ✓；
- 「ref 仍拒环（环检测图=tree+ref 全部边）」↔ service:333
  `reachable(graph.edges,…)` 全图 ✓；
- 「同端点对互斥——UNIQUE(from,to) DDL 天然收口，service 按 kind 差异给
  中文互斥 reason」↔ `004_lineage.sql:30` `UNIQUE(from_node, to_node)` 在案
  +service:306-315 dup 检查不分 kind+互斥 reason 后缀 ✓；
- 「自环/悬空 kind 无关同拒」↔ 守卫序最前（:285-294）✓；
- 「ref 边在布局净化段剔除仅渲染消费」↔ layout:212 ✓。

**预裁 8 项逐项**：1 draft 零改（diff 无 draft schema 触碰+importDraft
kind:'tree' 显式填）✓；2 同端点对互斥拒 ✓；3 拒混合环 ✓；4 isSurveyTitle
上移 shared/models+re-export ✓；5 service 显式填缺省（:282+repo:204 双层显式，
不赖 DB DEFAULT）✓；6 菜单项 survey 限定（:56）✓；7 T5 独立 userData
（spec:588 mkdtemp synapse-lg12-t5-）✓；8 用例数 883 精确命中（见④）✓。

**母本符合度裁决：零偏离。**

## ③ 宪法红线终审

- **分层单向**：kind 流向 DB（006 列）→repo（INSERT/SET 列+toEdge 归一）→
  service（守卫+显式缺省）→ipc 透传（零守卫）→renderer（store/Edges/Board）
  全链直读，无跨层；isSurveyTitle 驻 shared/models 双侧 import 合法（票面 §3）✓。
- **受锁流程时序**：unlock(164)→批内改（shared models+schemas+006 新增+9 测试件）
  →generate(165)→verify（含 locks:check「165 个受锁文件与 manifest 一致」绿，
  verify.log:34 在案）→apply——manifest **165 条实测**；**门二独立抽 4 条 hash
  实算全 MATCH**（006=282fc012e844…/models/lineage.ts=e463707ac458…/
  lineage-import.test=65f2c497e57b…/lineage.spec=88976e5ad8a1…，sha256 亲算）✓。
  registry.ts 不在受锁清单（manifest 零命中）——翻 done 无 locks 面 ✓。
- **安全禁令零触**：改动面 8 件 grep nodeIntegration/webSecurity/sandbox: false/
  contextIsolation/eval/new Function/openExternal——唯一命中=`schemas.ts:386`
  既有 openExternalReqSchema（shell-guard 校验面的既有 schema 定义，非本单 diff
  触碰行）；SQL 全 prepare 参数绑定照旧（repo diff 实读）；零新依赖（diff 无
  package.json/lockfile）✓。
- **行数**：wc -l 亲测 service 350/repo 235/Board 233/store 286/models 140/
  Edges 83/NodeMenu 93/classify 34/006=11——全 ≤500；import.test 424 与 spec
  594 在 `eslint.config.js:185-192` tests/** max-lines off 豁免区（受锁配置
  既定，lint 绿为权威）✓。
- **UTF-8**：4 件抽验（006/models/invariants/import.test）node 读取零 U+FFFD；
  verify quality 关卡绿 ✓。
- **TDD 证据链四档**：
  1. 首红 4/6：实现者申报红态+M2/M4 变异恰补另 2 用例可红证——**六用例全数有
     失败证明的论证链闭合**；但首红原始输出未落盘成日志文件（申报「在会话
     记录」）→ **N7 挂账**（缓解充分，不升 W：可红性结论不依赖首红快照）；
  2. 绿 883：verify.log:2574-2575「Test Files 106 passed (106)/Tests 883
     passed (883)」+exit=0（:2615）实证 ✓；
  3. 4 变异全红：M1（多父 reason 误拒）/M2（expected to throw——漏检）/M3
     （'#8a94a6'≠'var(--survey-edge)'）/M4（reason 文案「自环」vs「成环」——
     专用断言非恒真）四日志逐份实读，红点与票面 §5 三靶+M4 一一对应 ✓；
  4. 还原安全：四日志均标注 restore-diff-empty+复跑绿（M1「上方 diff 无输出=
     字节级还原」）——cp 备份法合规（未用 git checkout）✓。

## ④ 机器面核对

- **883=875+8 精确**：构成=service 6（describe 六用例，diff 逐 it 计数）+
  layout 1+visual 1；migrate.test 为断言更新非新增（[1..5]→[1..5,6]）；
  e2e playwright 不入 vitest 计数——数理闭合，票面预测 883±2 精确命中 ✓。
- **locks 165=164+006**：manifest files.length=165 亲测；006 条目在档（hash
  MATCH）✓。
- **翻 done 推演（registry open→done 后 verify 零红）**：①check-tickets——
  R2-LG12 不在解析集（①复演），open→done 对其输入零变化→输出「119 个；
  open 0」逐字节不变；②locks——registry 非受锁文件，manifest 不动；③quality/
  lint/typecheck/test/build——与 registry.ts 无消费关系（check-tickets 读
  源码文本，非模块 import）。**推演成立：翻 done 后 verify 各环节零红。**
  附带核实：改动面文件内工单号引用全为 R2-LG12 形态（无 S 前缀），
  ticketRefRe 同样零匹配——无占位残留误报面。
- **e2e 26/26 终态申明核验**：e2e1.log=24 passed+2 failed（exit=1）+**T5 首跑
  即过（:53 ok 2.3s）**；corpus-export 单跑复验有证（r2-lg12-e2e-corpus-
  retry.log：1 passed 2.1s exit=0）；**reader-text P7-A 剪贴板复验无落盘日志**
  （r2-lg12-* 系仅 e2e1.log 的失败记录在案）→ **W3**。物证终态=25/26 有盘证
  +1/26 转述（缓解：两 flake 与本单改动面零关联——corpus/reader-text 文件
  零触碰；reader-text 同型 flake 在 LG11 收口有单跑复验过证先例
  `r2-lg11-e2e-clip-retry.log` 1 passed exit=0；失败形态=系统剪贴板读回空串，
  与 LG11 时代失败形态一致=环境 flake 特征）。

## ⑤ 成本账本行

| 单元 | token | 调用 | 时长 |
| --- | --- | --- | --- |
| 实现者 | 10,045,711 | 122 | 18.4 分 |
| 门一 | 1,300,658 | 33 | 9.7 分 |
| 门二（自报） | ≈1.0M（估读——ZCode 无逐会话 token 回执，终数由主控从派发回执汇出） | ≈21 | ≈15 分 |

（对比参照：LG11 实现者 15.8M——本单 10.0M 数据面窄于 LG11 全板重制，量级合理。）

## 新增发现（门二独立）

### W3（归主控——收口材料证据缺口）e2e「双过」申明中 reader-text 复验无落盘日志
主控处置声明「24 passed+2 flake 单跑复验双过=26/26 终态」：corpus-export 复验
有日志（corpus-retry.log 1 passed exit=0），**reader-text P7-A 的单跑复验在
r2-lg12-* 系无任何落盘**——申明的后一半是转述无证（methodology §4.1 ④
LG9 W1 教训同型：仅报告文字转述=证据缺口）。缓解三重（T5 首跑即过有证/两
flake 与本单零关联/LG11 同型先例过证）→ 不阻塞实现面验收与放行，但**收口单
必须二选一**：补跑 reader-text 单跑复验落盘；或口径修正为「25/26 落盘证+
reader-text 引 r2-lg11-e2e-clip-retry.log 先例」。**不可原样照写「双过」。**

### N7 TDD 首红 4/6 原始输出未落盘成日志文件
实现者如实申报「日志在会话记录」——methodology §4.1 ④（LG9 W1 增补）字面
要求首红各自落盘。缓解：M1-M4 四变异日志在盘+M2/M4 恰补首红未覆盖两用例的
可红证，六用例「能失败一次」结论链闭合；票面 §5 派单文字未点名首红落盘
（仅点名 verify 落盘与变异红证）——派单模板与 methodology ④ 的同步缺口。
处置：教训回流（§4.1 ④ 首红落盘须进派单模板显式文字），本单不回炉。

### N8 单断言+行尾注释同置（纪律灰区备注）
`lineage-layout.test.ts:762` `expect(warn).not.toHaveBeenCalled() // ref 分流
不计 dropped（有意分流非破坏）`——methodology ④ 字面禁令=「**多断言**禁与
行尾注释同置」，单断言不在字面内；但换行丢失吞断言风险与 WS1 W4 形态同型
（上一行 :761 也是断言）。非违例（lint 无此规则+字面外），备注防后续误读+
遗留池候选「测试断言注释规范收紧为注释独占行」。

## 终评

**PASS（B=0/W3+N7+N8 挂账）——建议收口放行**，附三个条件性动作（均归主控
收口单，零回炉）：
1. **W3**：收口单 e2e 口径二选一（补跑 reader-text 落盘 / 改口径引 LG11
   先例）——禁止照写「双过」无证半边；
2. **W1 遗留池**：check-tickets R2 前缀零解析（K3 防线对 R2 系结构性缺位）
   按主控处置登记遗留池+收口单申报（「verify open 0」不作翻 done 旁证——
   本单翻 done 核验已由门二翻 done 推演独立兜底）；
3. **N7 教训回流**：首红落盘条款进派单模板显式文字；W2 教训（diff 包统一
   `git diff HEAD`）同册。

放行依据：母本（用户裁决 A/决3/handoff §3 U2b+票面预裁 8 项）零偏离兑现；
宪法红线（分层/受锁时序+hash 亲算/安全禁令/行数/UTF-8）零违例；TDD 证据链
四档闭合（六用例全数有失败证明）；机器面数理（883=875+8/165=164+006/翻 done
零红推演）全实锤；门一 8 findings 处置全部对实物核实；T5 首跑即过。实现者
自裁 9 条经门一逐条对 diff+门二抽验（双条件/tree 侧收窄/reason 子串兼容/受锁
波及 11 hash/importDraft 显式/e2e 参数化负锚/BLOCKED=0/统计口径/e2e 归收口）
无一失实。
