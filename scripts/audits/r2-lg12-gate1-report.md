# R2-LG12 门一对抗深审报告（三屋·门一子代理）

> 2026-08-29。立场=攻击者：找「说了没做/做了没说/测试假锁/票面违背」。
> 输入=diff 包+票面+实现者报告+4 变异日志+verify 日志+AGENTS/handoff-v3 §3/
> r2-lg11-close.md；辅证=工作区直读（3 件 staged 文件+service/Board/store/
> layout/NodeMenu/Edges/classify 全文）+git 只读实测+node 复演解析器+sha256
> 实算+wc -l。

## 0. 开工记录（宪法会话纪律）

- 模型：GLM-5.3（builtin:bigmodel-coding-plan/GLM-5.3），思考等级=高。
- 技能清点：**用** code-review-excellence（门一即对抗式审查）、
  verification-before-completion（逐声明核验「说了没做」）；**不用**
  systematic-debugging（非调试任务）/test-driven-development、
  javascript-testing-patterns（不写测试，只推演测试可红性——TDD 红绿证据
  由实现者日志承担）/其余工程技能（只读审查无构建/运行面）。

## 统计行

**B_0 / W_2 / N_6 —— 总评 PASS（B=0，无需回炉；W1/W2 归主控处置）**

---

## A. 母本符合度（票面 §1 守卫矩阵+§2 接口）——全格过

**§1 守卫矩阵逐格**（`src/main/services/lineage/lineage.service.ts:282-340`）：

| 格 | 实现 | 证据 |
| --- | --- | --- |
| ref 豁免多父 | 多父守卫包在 `if (kind==='tree')` 内（:320-330） | M1 变异红证（删除分支→豁免用例红） |
| 仍拒环（混合图） | `reachable(graph.edges,…)` 用全边含 ref（:331-338） | M2 红证：tree-only 图不可达→成环漏检被断言拦出 |
| 同端点对互斥 | dup 检查不分 kind（:306-315），kind 相异附「（参考边与树边同端点对互斥）」 | 互斥用例双向（tree 先/ref 先各拒 :853-861） |
| from 综述双条件 | `from.paperId===null \|\| !isSurveyTitle(from.title)` 拒（:298-302） | 双格测试（非综述/主题节点含关键词同拒 :819-828） |
| 自环/悬空沿用 | 守卫序最前、kind 无关（:285-294） | M4 红证（成环守卫兜底但专用自环 reason 断言仍红） |

**§2 接口**：出口 kind 必填 enum（`src/shared/models/lineage.ts:473,483`）+
upsert 可选（:501 `.extend({…, kind:…optional()})`）+isSurveyTitle 上移导出
（:450-461）+renderer re-export 零散改（`lineage-classify.ts:21`
`export { isSurveyTitle as isSurvey }`——isCore 同步引单源 :28）+006 单语句
ALTER（`006_lineage_ref_edges.sql:157`，注释 11 行）+draft 协议零改（draft
schema 无 diff 触碰；importDraft 重灌显式 `kind:'tree'` :243 属 service 面）。
**渲染**：优先级 ref>综述关联>推断>普通（`LineageEdges.tsx:47-59`——
`survey = e.kind==='ref' || surveyIds.has(from) || surveyIds.has(to)`，M3 翻转
红证 `'#8a94a6' ≠ 'var(--survey-edge)'`）。**菜单限定**：
`LineageNodeMenu.tsx:56` `node.paperId !== null && isSurvey(node.title)`。
**layout 净化**：`lineage-layout.ts` 净化段 `if (e.kind==='ref') continue`
（置于 surveyCol 分流之前——ref 先剔不计 dropped，与 surveyCol 分流双路径
continue 语义一致）。**INV-27 修订**：`docs/invariants.md` INV-27 行完整改写
（tree 原语义/ref 受控豁免/混合环/UNIQUE DDL 天然收口/service 按 kind 差异
中文互斥 reason/R2-LG12 引用），与票面 §1 表述逐句对应。

**handoff-v3 §3 U2b 母本偏离核查**：handoff 预裁倾向原文「ref 边豁免单父/
无环校验」字面含「豁免环校验」，票面 §1+预裁 3 修正为「仍拒环（混合环真实
可达）」——票面对预裁倾向的合法攻击且依据更强（综述可自处树内），实现按
票面 ✓。视觉 handoff 示意值 #c8cdd6 → 票面定为 var(--survey-edge)（U2a 同
视觉单语义）✓ 票面口径为准。

## B. 宪法红线——零违例

- **分层**：kind 流向 DB→repo（`lineage.repo.ts:191-196,204` INSERT/SET 列+
  `toEdge` 归一 `row.kind==='ref'?'ref':'tree'` :181——DB 只可能 tree|ref，防御
  归一合理）→service（守卫+显式缺省）→ipc 透传（`ipc/lineage.ts:217-222`）→
  renderer 消费（store/Edges/Board）——单向无跨层 ✓。
- **迁移追加式**：006=ALTER ADD COLUMN，迁移器按 user_version 单次执行
  （migrate.test appliedVersions [1..5,6] 先例同型）；受锁先例同型（005 前）✓。
- **零新依赖**：diff 无 package.json/lockfile ✓。
- **文件 ≤500**：wc -l 实测 service 350/repo 235/Board 233/store 286/
  models 140/LineageEdges 83/NodeMenu 93/classify 34 全过；spec 594 与
  lineage-import.test 424 在 `tests/**` 的 ESLint max-lines 豁免区
  （`eslint.config.js:185-192` files:['tests/**/*.ts','**/*.test.ts']→off）
  ——受锁配置既定豁免，lint 绿为权威，非违例。
- **UTF-8**：直读中文全可读；verify quality 关卡过 ✓。
- **死代码**：新文件 006 被 `migrate.ts:127` import+注册 version 6 ✓。
- **受锁面完整性（攻击点）**：git status 12 件受锁改动（shared models+ipc
  schemas+006 新增+9 测试件）全部在工作区；manifest 165=164+006（实测
  `man.files.length=165`）；hash 抽 3 条实算 **MATCH**（006=
  282fc012e844…/models/lineage.ts=e463707ac458…/lineage-import.test=
  65f2c497e57b…）；manifest diff 11 条 hash 更新+1 新增与改动面一一对账 ✓；
  verify 内 locks:check「165 个受锁文件与 manifest 一致」绿 ✓。

## C. 代码与测试质量

**① service ref 分支逐行推演**（守卫序：自环→悬空 from/to→ref 限定→dup
互斥→多父(仅 tree)→环(全图)→落库）：顺序无漏洞——ref 限定先于 dup（非综述
发同端点对边先吃「综述限定」reason，限定优先合理）；更新场景三处排除自身
id（dup :308/多父 :322/环 :333）转换 kind 自洽；`from!` 非空断言安全（前置
nodeIds.has 已保证 :299）。

**② 六用例「实现背离必红」推演**（`tests/unit/services/lineage-import.test.ts:809-869`）：
1. 落库 kind：直接断言 `e1.kind==='ref'`+`graph().edges` 计数——repo 丢 kind
   即红 ✓；
2. from 双条件：reason 断言「参考边只能由综述节点发出」+`edges toEqual([])`
   ——限定分支删则边落库红 ✓；
3. 豁免多父：M1 实证红（变异态红点=多父 reason 误拒）✓；
4. 混合环：M2 实证红（红点=expected to throw——环漏检）✓；
5. 互斥双向：reason 含「互斥」——dup 分 kind（不互斥）则 ref 落库成功→
   toThrow 红 ✓；
6. ref 自环：M4 实证红——**红点=reason 文案**（「自环」期望 vs 成环 reason
   实际），证明专用断言非恒真（变异态被成环守卫兜住仍红）✓。

**③ layout 恒等断言有效性**（`lineage-layout.test.ts:745-764`）：夹具 S=
title「领域综述」+**双覆盖**（x:500,y:400）→ S **不进 surveyCol**（覆盖综述
不进右列，layout.ts surveyCol 构建 :207-210 排除双覆盖）。若剔除分支删除：
边序 [S→C(ref), A→C(tree)]——S 不在 surveyCol，ref 边按普通边处理抢占 C 父位
→tree A→C 变破坏边→dropped++→warn 调用+C 挂 S≠A——恒等断言（withRef vs
treeOnly positions/layers）+零 warn 断言+单链对齐锚三重红。**非恒真**，
实现者注释「剔除分支删除时该边会抢占 C 的 tree 父」推演准确（正面备注 N5）。

**④ visual 优先级负锚**（`lineage-canvas-visual.test.tsx:679-693`）：两端
非综述题名隔离 kind 直读（不与 surveyIds 混源）+label 含「推断」——
断言 var(--survey-edge)+not #8a94a6；M3 翻转实证红 ✓。

**⑤ R2-LG11 教训重演检查**：describe 内 fixture 边**全部经 svc.upsertEdge
建立**（:833/845-847/854/859 混合环三边、豁免用例 tree 父边、互斥两边均
svc 路径），无 repo 直插边绕守卫；repo 仅用于 upsertNode（节点面无边守卫）
与 clearGraph（清库原语 :858，重置夹具非守卫面）。**教训未重犯** ✓。

**⑥ e2e T5 spec 逐行**（`tests/e2e/lineage.spec.ts:586-632`）：独立 userData
（mkdtemp synapse-lg12-t5-）+firstHop+seedPaperRow 三篇（e2e-env 既有导出
:75）+综述幽灵行第四篇（sha256 派生 fileRef 同 :146 既有模式 ：592-594）→
writeFixture(draftJsonWithSurvey()) 参数化（默认=原文案，T1~T4 零改实证
diff :546-551/:561-571 仅加默认参）→摘要断言「4 个节点，2 条连线」→菜单
负锚（甲 right-click→menuitem count 0 :604-609）→win.mouse.click(10,10)
关菜单（遮罩 fixed inset-0 命中 onClose ✓）→综述右键→「添加参考连接」→
pending-link 提示条可见→点甲→ref path 三属性精确断言（stroke var(--survey-
edge)/dasharray '2 3'/width 1.4）+总 path=3→reloadToLineage（既有 helper
:192）→持久断言（节点 4/survey-edge 1/node-branch 2）。与 T1~T4 既有模式
一致 ✓。T5 未真跑归主控（票面 §5 口径+实现者自裁 9 申报一致）——本审仅
spec 逻辑。

## D. 报告诚实性

- **自裁 9 条逐条对 diff**：1 双条件（:300 ✓ 菜单 :56 同口径）/2 tree 侧收窄
  （:322 `e.kind==='tree'` 过滤——对偶面自洽+既有三拒绝用例旧图全 tree 时
  等价零红）/3 reason 更新（:336；受锁断言子串兼容实证——既有断言
  `toThrow('环')`（import.test:320）/`toThrow('已存在')`（:326）均为子串，
  后缀附加不破坏；board.test reason 字面=mock 透传非 service 输出 ✓）/4 受锁
  波及（11 hash 对账 ✓+六工厂 kind:'tree' 是 LineageEdge 必填化编译必然——
  typecheck 绿即证）/5 importDraft（:243 ✓）/6 e2e 参数化+负锚（✓ 断言面
  增强非放宽）/7 BLOCKED=0（✓）/8 删减面自查（§6 清单 13 件全兑现——见
  W2/N3 统计口径备注）/9 e2e 未真跑（✓ 票面口径）。
- **行数表抽验**（wc -l）：service 350✓ repo 235✓ Board 233✓ store 286✓
  spec 594✓ import.test 424✓ models 140✓ NodeMenu 93✓ classify 34✓——全对。
- **locks 165=164+006** ✓（实测）。
- **registry 脏态声明**：git diff 显示 R2-LG11 行仅尾逗号变化+R2-LG12 新行
  ——**化学证据**：在 R2-LG11 后插入新数组元素必然给其加尾逗号，最小形态
  与「主控翻 done（HEAD 内已含）+开票加行」叙述吻合；无反证 ✓（实现者
  「首个 git status 在档」无法时序复验，但形态证据充分）。

## E. 接缝与后续单

- **① tree 边行为零变**：既有三拒绝用例（import.test :302-320）断言零改
  零红 ✓；board/store-write/canvas/classify 四测仅工厂补 kind:'tree'（各 1
  行，diff 实证）零断言改 ✓；upsertEdge 缺省路径 kind='tree'——旧图全 tree
  时 `e.kind==='tree'` 过滤恒真，与旧守卫逐字节等价 ✓。
- **② U3 前置**：U3（重命名迁移/顶栏/字体清零）面零触碰 ✓ 无冲突。
- **③ 遗留池新候选**：见 N1/N2/W1。

## 事件时间线逐帧推演（票面附加审项——pending-link ref 模式状态机）

```
右键综述节点 → setMenu({node,anchor})
  [菜单项呈现条件 :56 paperId≠null && isSurvey —— 非综述节点无入口]
点「添加参考连接」→ setPendingLink({source,mode:'ref'}) + setMenu(null)
  [提示条 MODE_HINT.ref + 取消按钮（data-testid=lineage-pending-link）]
点目标节点 → handleNodeClick :119 mode==='ref' 分派 linkRefNodes(source,nodeId)
  → setPendingLink(null)（先清态再等写完成——UI 态与写队列解耦）
linkRefNodes → enqueue(upsert-edge kind:'ref') → saveStatus='saving' → flush
  → api→schemas(kind optional 校验)→ipc 透传→service 守卫矩阵
  成功: edges 回填（saved 行 kind 必填）→ 队列清 → 'saved'
  CONFLICT: ApiClientError→writeFailToast(reason)+丢弃+继续（不卡队 :173-178）
退出模式: 点「取消」→ setPendingLink(null)
```

攻击点结论：**ref/tree 模式互斥**——pendingLink 单值状态天然互斥 ✓；
**取消路径**——无 Escape 键（菜单/提示条均不挂键盘，NodeMenu 头注明示
「ESC 关闭归 Dialog 域」）——ref 沿用 link/reparent 既有模式语义，非本单
回归（N2）；pendingLink 激活期右键他节点开菜单再选他项会覆盖 pendingLink
（既有 link/reparent 同型行为，N2）；**模式入口泄漏**——store 动作虽公开，
service 双守兜底（非综述 from 拒）✓ 无泄漏；sameTarget 合并不区分 kind
（store:96）——与 service 同端点对互斥协同自洽（两条同端点对边本就只有
一条能成功，最后写胜出=最后意图胜出，N6 备注）。

## 预裁 6 项意见（主控预裁 1-6 逐项）

1. **自裁 1 双条件：维持**（service :300 与菜单 :56 双守同口径；测试双格
   覆盖 :821-827——主题节点含关键词同拒有专用断言）。
2. **自裁 2 tree 侧收窄：维持**（对偶面豁免语义自洽的必然；既有三拒绝用例
   在全 tree 旧图上逐字节等价——变异红证 M1 同源证明分支有效）。
3. **自裁 3 reason 文案：维持**（受锁断言子串兼容三处实证：'环'/'已存在'/
   '自环'——import.test:304,311,320,326）。
4. **自裁 4 受锁波及：维持**（LineageEdge 出口必填化编译必然——typecheck
   双项目绿即证；11 hash 对账+165 manifest 实测）。
5. **自裁 5 importDraft 显式 tree：维持**（预裁 5「写路径显式不赖 DB
   DEFAULT」原则的同源扩展，draft 协议 schema 零改票面条款不破）。
6. **自裁 6 e2e 参数化+负锚：维持**（默认值=原文案 diff 实证 T1~T4 零改；
   负锚=断言面增强）。

## 发现清单

### W1（归主控——关卡工具盲区，非实现者缺陷）check-tickets 对 R2 系工单零解析，「open 0」失真
`scripts/check-tickets.mjs:26` 工单 id 正则 `SR2?-[A-Z]+-\d+`——`?` 只作用于
`2`，**`S` 为必选字符**：`'R2-LG12'`（无 S 前缀）永不匹配。node 复演实锤：
当前 registry 解析 119 个工单、`R2-LG12 parsed: undefined`、`open []`；
R2-LG9/10/11/12 全系零解析（最后被解析工单=SR2-F-09）。verify 日志
「工单统计：共 119 个；open 0」的 open 计数对本单 open 状态**不可见**——
「tickets 检查通过」对 R2-LG12 的 open 占位检查/收口后一致性检查全部空转。
系受锁工具既有 bug（自 R2 系开票起），非本单引入、非实现者票面职责（禁改
registry/受锁脚本）。处置建议：主控收口前以 [locked-change] 修正正则
（`S?R2-` 或 `(?:S)?R2-`）并全量 verify；或至少登记遗留池+收口 open 计数
改用人工核对。**收口时「verify open 0」不可作为翻 done 的旁证**。

### W2（归主控——门一输入材料缺陷）diff 包漏 3 件 staged 文件，「22 文件全量」失真
git status 实测：`LineageEdges.tsx`/`LineageNodeMenu.tsx`/`lineage-classify.ts`
三件为 **staged（`M `）** 态，不在 `git diff`（unstaged）输出——主控 diff 包
恰用该口径生成，故缺这三件，而它们是票面 §6 交付清单件+渲染优先级/菜单
限定/re-export 三个核心验收面的载体。本审已工作区直读补全（三件内容与票面
一致，见 A 节）。处置建议：后续役 diff 包生成统一 `git diff HEAD`（含
staged）；实现者侧建议避免中途 git add（或主控派单模板声明暂存纪律）。

### N 备注六条
- **N1 遗留池候选**：importDraft=整批替换（clearGraph 清面重灌），用户手工
  建的 ref 边会被后续草稿导入**静默清除**——LG-01 既定语义的自然延伸，票面
  未提；UX 面可在导入确认文案提示「将替换包括参考连接在内的全部连线」。
- **N2**：pendingLink 无 Escape 取消+激活期右键可覆盖模式——link/reparent
  既有同型，ref 沿用非回归；遗留池可候选「连线模式 Escape 取消」。
- **N3**：实现者「git diff --stat 24 文件=23+manifest」数字正确（23 本单
  =20 unstaged+3 staged），但未注明统计含 staged 态——与 W2 同根，微小
  披露缺口，不构成诚实性问题。
- **N4**：票面 T5 措辞「data-viewport 节点计数」，spec 实现用
  `svg g[data-node-id]` 计数 4+tree 边原色计数 2——DOM 全量节点计数，断言
  面等价或更强，接受。
- **N5 正面**：layout 恒等断言夹具设计（双覆盖综述使其不进 surveyCol，对
  剔除分支删除敏感化）是「恒等断言防恒真」的范式样本。
- **N6**：store sameTarget 合并不区分 kind（:90-99）——与 service 同端点对
  互斥协同自洽（同端点对两 kind 边只有一条可能成功，最后写胜出=最后意图
  胜出），无行为缺陷，备注防后续误读。

## 总评

**PASS（B=0/W2/N6）**。守卫矩阵全格实现+六用例全部有失败证明（4 首红/变异
红证覆盖+2 变异补证）+母本（handoff §3 U2b+用户裁决 A+票面预裁）逐条符合+
宪法红线零违例+受锁面 165 对账实测吻合+tree 零变+接缝无冲突。W1（关卡
解析盲区）与 W2（diff 包口径）均归主控处置，不阻塞门二；建议主控在收口段
先行处置 W1（收口核验依赖 open 计数语义）。
