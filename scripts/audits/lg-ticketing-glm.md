========================================================================
LG 工单化票面（SR2-LG-01~05）门二终审（GLM 终审位，独立于门一）
========================================================================
对象：五票终态 + registry LG 块/TicketArea + locks manifest 122
输入：diff=scripts/audits/lg-ticketing-diff.patch（终态）；门一 raw+回炉复核
全文；母本=ADR-0014+ROADMAP P7-H+蓝图 §4.3（E3/E4/E5/N3）+rescope-
verification §4；机器关卡=check-tickets.mjs+check-quality.mjs；先例=
corpus-export.spec.ts/tab-dirty.ts/App.tsx/anchor-locate.ts/api-surface
.test.ts/ai-notes.store.ts/open-paper-bus.ts/ai-note-style.ts
终审代理：P7-H 门二终审孙代理（GLM；只读，唯一可写=本文件）
日期：2026-08-27

技能清点（会话开工纪律）：code-review-excellence=用（终审本体）；
verification-before-completion=用（逐条对照实测锚点后落裁决）；
systematic-debugging/TDD/subagent-driven-development 等=不用（纯只读票面
终审，无实现/调试/派发面；禁 npm/test/git 改动性命令）。配置自查：GLM
终审位、单孙代理、无再派发，与派单一致。

------------------------------------------------------------------------
① 处置核对（门一 4W+9N vs 主控处置声明 vs 票面终态，逐条亲验实文）
------------------------------------------------------------------------
W1（INV-27 upsertEdge 守卫断链）——**ADDRESSED 确认**。
  01 三面闭合实测：行为层 :12-16「守卫宿主=本单 service 写面（门一 W1
  处置——导入校验与 upsertEdge 运行时守卫同在 lineage.service，LG-03 只
  接线 IPC 通道不另写守卫）」；交付面 :50-52「四写方法含 upsertEdge
  运行时守卫……service 方法本单全建全测」；测试清单 :79「service
  upsertEdge 运行时守卫三拒绝路径单测（W1 宿主用例）」。03 侧对合
  实测：Board.tsx :16-18「树守卫宿主=LG-01 service upsertEdge 运行时
  守卫——本单零守卫代码只接 toast 呈现」+:23-24「写面=LG-01 已交付
  service 四写方法（含守卫），本单接线 IPC 四通道」。语义自洽复核：
  upsertNode/removeNode/removeEdge 三法不引入多父/环/自环（删边只会
  更森林化），需守卫面恰=导入+upsertEdge 两处——INV-27「两写入口」
  与 service 面精确对合，无过度无不足。
W2（LG-05 自身守卫+恒真占位+「K3 同效」失实）——**ADDRESSED 确认**。
  spec 实文 :38-42：DEPS=LG-01~04 ∪ 'SR2-LG-05' 双条件 filter+test.skip
  ——依赖守卫（corpus-export:87-91 形态实测在）∪自身条件，偏离已在票面
  声明且必要（有占位待替换的票面需自身条件防依赖满足期占位假绿）；「K3
  同效」措辞已删，改「机器面不拦恒真占位，亲验是本单唯一防线」+「翻
  registry 前核对占位恒真 test 已删、spec 为真实用例」——主控亲验为收口
  强制项字面落地；占位 test 标题自带「主控收口亲验替换」标记。
W3（LG-05 缺受锁流程声明）——**ADDRESSED 确认**。
  文化层 :29-31「受锁流程（门一 W3）：本文件已入 locks manifest——实现
  替换占位必经 locks:unlock→批内改→locks:apply+[locked-change] 尾注
  提交（manifest 与提交同步）」。与 01~04 的受锁新增（generate+apply）
  句式正确分化（已锁修改 vs 受锁新增两形态并行）。
W4（LG-04 双取预裁论证失实）——**ADDRESSED 确认**。
  票面 :26-31 更正为：主据=「quality 关卡 renderer features 跨域互引
  红线（ai-notes.store 属 reader 域，lineage 域 import 即违例；window.api
  是 renderer 合法取数路径非『双取』）」+辅证=按需惰性取数与 08 挂载期
  轮询生命周期不同。实测坐实：check-quality.mjs:46-88 跨域互引规则+
  COMPOSITION_ROOT_ALLOW 白名单恰五条（PaperDetailPanel/FilterBar/
  tab-dirty/ReaderNotesPanel/useExportCorpusEvents——lineage 不在列）；
  ai-notes.store.ts :26-27 实测「按 paperId 键控——per-tab 语义驻
  store」（notesByPaper: Record<string, AiNote[]>）——新论证不再依赖
  旧错误描述；ai-note-style.ts 实测驻 features/reader/（跨域消费需
  白名单条款，票面 :44-45 已声明同型）。review 复核锚已指向新依据。
N1~N8 采纳逐条实测在文：N1 registry LG 块注释「P7-F 几何（F-aware 接口
  已冻结……非阻塞）」✓；N2 03「INV-22 行随本单扩面」:33-34 ✓；N3 03
  「两文件=lineage.store.ts+App.tsx+tab-dirty.ts stale 行三方」:31-32，
  tab-dirty.ts:14 头注「（TABS-04 的 dirty 输入=任一 tab dirty）」实测
  在，stale 行更新义务有宿主 ✓；N4 01 受锁新增清单三件（004_lineage
  .sql/shared/models/lineage.ts/新测试——unlock→批内改→generate→
  apply+[locked-change]）:53-56 ✓；N5 03 改父部分失败语义 :35-38 ✓；
N6 02 读面 loading/ready/error 三态枚举 :51-52 ✓；N7 04「anchor-
  locate.ts locateSeq 同族思想」+「跨视图锚递达无先例——全新接缝面」
  :16-19（locateSeq 实测 :97 声明/:134/:151/:209 消费；bus detail 实测
  仅 { paperId }——open-paper-bus.ts :19-21）✓；N8 05 用例⑦ mock 路径
  注（electronApp.evaluate main 侧 patch，禁静默降级）:12-15+导入
  fixture 同注 :17-19 ✓。
N9 不采核对：DDL 摘要仍省 lineage_edges.created_at/updated_at，但「ADR
  -0014 §数据模型 DDL 字面」锚定全文 SQL 块（实现照抄），节点列摘要全
  列——**无实质遗漏**，不采处置正确。
两条遗留微瑕复核（回炉复核节记录项）：
  a. 01 工厂名——**已完全闭合（优于复核节快照）**：终态 :41-44=
  「export function createLineageService(deps)……importDraft+四写方法
  （含 upsertEdge 树守卫）+graph()」——工厂名已改 createLineageService
  且签名面已含四写方法，接口层滞后于行为层的缺口不存在。
  b. 04「anchor-locate.ts:122」——locateSeq 声明实测在 :97；:122 实测
  为 waitOpen 函数体首行（seq 守卫消费区间 :121-151 起点）。票面措辞
  「:122 locateSeq 同族思想」为区间近似引用非声明点精确引用——非失实，
  **可留**（实现期自然消化）。
「不采」项遗漏扫描：门一/复核全部发条（W×4+N×9+复核新扫 7 组矛盾+2
  微瑕）逐条对帐完毕，无未处置实质项。门二新发现一条 N 级观察（见下
  ③-5 A_DR），不属门一遗漏处置、不阻塞。

------------------------------------------------------------------------
② 母本符合度（五票 vs ADR-0014 三节+ROADMAP P7-H+蓝图 §4.3+rescope §4）
------------------------------------------------------------------------
1. **DDL 摘要 vs ADR-0014 SQL 块逐列对位——通过**。01 :6-9：lineage
   _nodes（id/paper_id 可空 CASCADE/title/core_idea/year/x/y NULL=自动
   布局/created_at/updated_at）+lineage_edges（id/from_node/to_node
   CASCADE/label/UNIQUE(from_node,to_node)）与 ADR-0014 §数据模型 SQL
   块（:41-60）逐列一致（edges 时间戳列省略=N9，锚全文无实质风险）；
   迁移号 004 可用（migrations/ 实测 001_init/002_indexes/003_ai_notes）。
2. **树约束 service 层宿主表述——通过**。01 :10-12「树约束是 service 层
   不变量非 DDL 约束（ADR-0014『树约束=service 层不变量+单测』）」与
   ADR-0014 E3 :21-22 字面一致；存储=图 schema/v1 行为=树/v2 升级条件
   （真实多父编辑诉求）在 01/02/03 生命周期层三现对齐 ADR E3。
3. **INV-04/14/20/22 引用准确性——全部实测对册通过**。INV-04（保存失败
   不推进 savedAt）↔03「失败不推进 savedAt+INV-04 同型不新立号」=ADR
   「保存语义对齐标注/笔记（INV-04 同型）」字面；INV-14（输入接缝注册/
   注销成对——滚轮/指针监听在册文范围内）↔02 pan/zoom 成对注册/卸载清
   listener 用例；INV-20（三层防线单入口，册文明列「P7-H 脉络侧板随后续
   工单」）↔04 单入口+消费方级用例（页级/篇级降级）；INV-22（renderer
   聚合信号 useTabDirtyAggregate）↔03「INV-22 行随本单扩面」——聚合
   构成变化须扩登记，引用+扩面义务双正。附带：03 的 stale-guard 引
   INV-03 同族（请求序号守卫）亦与册文对位。
4. **INV-27 新立必要性——成立**。invariants.md 实测编号 26 封顶（INV-26
   =SR2-AI-06 随单登记），27=下一可用号；内容（树单父、导入与
   upsertEdge 两写入口同守、三拒绝路径）+声明处（SR2-LG-01）+强制方式
   （service 守卫三拒绝单测）符合登记册三要素惯例；树约束是跨模块行为
   （service 守卫+repo 写面+02 布局森林消费前提）无天然归属文件——
   达册载登记标准。旁证：rescope §6 预告三不变量（树约束/自动保存语义/
   退出聚合扩面）——后两者经 ADR-0014（更晚、有约束力）分别裁定为
   INV-04 同型不新立号与 INV-22 行扩面，仅树约束新立——**无漏登**。
5. **ROADMAP P7-H 验收行逐单对位——通过**。五段（模型+导入迁移 004 ADR
   DDL→布局纯函数+SVG 画布→交互编辑+自动保存+退出聚合扩面→侧板详情+
   双击跳转→e2e 全链浏览/编辑保存/跳转）↔01~05 一一对应；内容行全项
   归属：时间树画布（02）/两型节点（01 paper_id 可空+03 加节点两型）/
   策展边（01+03）/单击侧板（04）/双击跳转 INV-20（04）/拖拽加删改父+
   自动保存+聚合（03）。依赖行四项（P7-G 已清/P7-C N1/AI-09 exact 延展/
   P7-F 几何 F-aware 非阻塞）registry 注释已列全（N1 处置）。
6. **蓝图 §4.3 对位——通过**。E3（y 年份分层+x RT 零依赖+D3 禁引+不做
   md 中间形态）↔02 布局行为层字面；E4（新顶层视图/导航第四项）↔02
   ViewId+NAV 扩——App.tsx 实测三值 ViewId/三项 NAV/「infra，无工单」
   头注（src/renderer/app/App.tsx :1-18），挂载面声明属实；E5（人工策展
   合法/自动引文图维持不做/ADR-0012 维持）↔01 生命周期层「自动引文边
   （ADR-0012 维持不做——策展边语义 DDL 已辨析）」措辞一致；N3（侧板
   四区+复用 ai-notes/list+notes 读+双击 INV-20 单入口+落点 LG-04）↔04
   行为层逐项覆盖。
7. **rescope-verification §4 对位——通过**。RT 算法（线性两趟/后序轮廓+
   前序定 x/~百行零依赖手写）↔02 引为算法母本；JSON Canvas 覆盖模式↔
   01 DDL x/y+03 拖拽写覆盖；「人工策展核心 idea 变体」定性贯穿。一处
   纳观察（不阻塞）：rescope §4 调研文写「debounce 保存」，03 写「编辑
   动作即经写通道落库」——绑约束力文本是 ADR-0014「autosave-first+
   INV-04 同型」，notes autosave 本体即 debounce（saveSoon 先例族），
   票面锚先例族实现自然对齐，非矛盾；记录防实现期口径歧义。

------------------------------------------------------------------------
③ 宪法红线终审（票面级）
------------------------------------------------------------------------
1. **状态机前置——达标**。03 票面 :39-43 显式状态机块：三态（saved/
   saving/error）×编辑动作，正常/失败/重试恢复三迁移+跨格序列「连续
   编辑中保存失败→后续编辑不丢（动作排队=最后写胜出，stale-guard
   INV-03 同族）」——覆盖 U2 型跨格序列要点，「态空间+跨格序列」双要求
   在票面。02 store+异步但无用户输入写面（pan/zoom=视口瞬态不入
   store），三要件不齐不适用且票面显式论证结论——正确。
2. **受锁流程句完备——达标**。01：新测试 generate+apply+[locked-change]
   （:82）+受锁新增三件清单 unlock→批内改→generate→apply（:53-56）+
   契约测试/schemas/api-surface [locked-change]（:45/:63）；02/03/04：
   各有「新增受锁测试随实现 locks:generate+apply+[locked-change] 尾注」；
   05：已锁修改 unlock→批内改→apply+[locked-change]（manifest 与提交
   同步）。新增受锁路径（migrations/004、shared/models/lineage.ts）
   均先 generate 再 apply——与 AGENTS 锁机制条款逐句对合。
3. **零依赖红线——达标**。02 双处「D3 禁引」+「禁引 d3/任何布局库
   （ESLint 无白名单新条目——零依赖红线）」；五票无任何新增运行时依赖
   声明；SVG=React 内建。
4. **AGENTS 负面清单——不触碰**。知识图谱边界=人工策展 vs 自动引文
   （E5 措辞与票面一致，见②-6）；md 富文本编辑器（03 core_idea=
   textarea+「md 只展示不渲染同族」）；云同步（03 不做）；多窗口/遥测/
   插件/i18n/翻译/PDF 下载管线——五票均无涉及。「v1 draft 仅文献节点」
   预裁与「人工策展」语义自洽（草稿=智能体文献继承输出；主题节点=应用
   内人工创建），不触自动引文边禁令。
5. **工单号交叉引用——全部实存**（亲验 registry/docs/代码）：AI-01/03/
   04/06~10、TABS-04、C-02/03/06、UNDO-01 在 registry；ADR-0012/0014/
   0015/0017 在 docs/adr；INV-02/03/04/07/14/20/22 在登记册（27=新立
   随单）；N1/N3、E3/E4/E5 在蓝图 §4.3。**一条 N 级新观察（门二）**：
   04 :25「A_DR 先例族 dblclick」——A_DR 标签在 docs/tickets/代码全库
   无实位（grep 实测）；其指向的真实先例=PaperRow.tsx:75 onDoubleClick
   （双击文献行打开）。非工单号（check-tickets 正则不涉）、语义内容
   真实，仅引用标签悬空——记录备查，实现期顺手改为「PaperRow 双击
   打开先例」即可，不设前置。

------------------------------------------------------------------------
④ 机器面核对（只读实测——禁跑 verify/test，以结构等价验证+基线对账）
------------------------------------------------------------------------
1. **vitest 面不变**：本 diff 零新增 *.test.ts(x)——单测文件实测 79 个
   （find tests+src 实测），与 P7-G 收口基线「79 文件 520 用例」
   （ROADMAP :324-325）持平；票面 stub 无测试体、05 是 playwright spec
   vitest 不跑——**票面 stub 不增 vitest 用例** 口径成立。verify 终态
   exit 0 由基线+零测试面变更结构等价推定（收口单仍须亲验真退出码）。
2. **locks=122 实测**：manifest entries 计数=122（121+lineage.spec.ts）；
   lineage.spec.ts sha256 实测 2adbca36…a666==manifest :137==工作区
   文件（sha256sum 三方一致）——回炉改票后锁同步无漂移；registry.ts
   不在锁集，其改动无需 locks 同步。
3. **check-tickets 推演**：open 实测恰 5（全 strong，weak 0——统计行
   「共 104；open 5（weak 可领 0，strong 5）」）；规则 1 五文件存在；
   规则 2 src 侧 SR2 引用仅自身 open 号+LG-04 注释引 SR2-LG-01（open
   合法）、tests 侧无占位调用；规则 4 Board.tsx:81/SidePanel.tsx:83
   data-ticket 两占位齐（open+tsx+JSX.Element）；规则 4b/3 open 期不
   适用+翻 done 有「删除 STUB/data-ticket」条款+机器拦截闭合；规则 5
   无 guardedDescribe（always-active=ADR-0017 裁决 3 原文）；规则 6
   五文件头首行均「// b3: P7-H」且 P7-H 在 ROADMAP 已裁决集（:328）。
4. **check-quality 推演**：五新文件 grep TODO|FIXME|XXX|HACK|placeholder
   零命中（实测 exit 1）；中文 UTF-8 通读无乱码；行数 87/67/82/84/47
   全 <500、组件 <250；骨架零 import 无跨域/分层风险——04 的跨域取数
   与 ai-note-style 消费路线票面已声明白名单同型条款（实现期按
   COMPOSITION_ROOT_ALLOW 机制扩）。
5. **e2e 实测口径**：既有 spec test( 计数=reader-text 8+corpus-export
   1+smoke 4+zcode-link 1+ai-notes-section 2=**16**；lineage.spec.ts
   +1（open 期 skip）——「16+1 skipped」口径精确。
6. **b3 指针五文件齐全**（逐文件首行实测）；**data-ticket（03/04）**
   齐全；**data 面 004 迁移号可用**（001~003 实测在）。
7. **范围自查**：git status 实测=manifest+registry 两改+五新票+审计
   产物，与 diff 一致无蔓延；注意 `dist_new/` 为既有未跟踪残留——主控
   staging 须显式列文件（AGENTS 2026-08-26 误扫实录同源提醒）。

------------------------------------------------------------------------
⑤ 成本账本（门二终审孙代理自身，自估）
------------------------------------------------------------------------
单孙代理单轮终审：输入约 9 万 token（派单+门一 raw 全文+五票+diff+
母本五件+关卡两脚本+先例七文件）、输出约 1.1 万 token、无再派发、
纯只读零构建零测试运行；耗时约 25 分钟（等价串行）。

------------------------------------------------------------------------
终审结论
------------------------------------------------------------------------
**PASS**（可提交主控收口：显式列文件 staging→[locked-change] 尾注
提交（manifest/registry/spec 同批）→locks 已同步无需再动）。

依据：①W1~W4 处置全部落票面实文（非口头）、N1~N8 采纳到位、N9 不采
无实质遗漏；②五票与 ADR-0014 三节/ROADMAP 验收行/蓝图 E3·E4·E5·N3/
rescope §4 对位密度合格，INV 引用四条实测对册、INV-27 新立必要且编号
正确（26 封顶实测）；③宪法四线（状态机前置/受锁流程/零依赖/负面清单）
票面级全过；④机器面六项实测全绿（122 锁/16+1/79 基线/open 5/b3 五件/
data-ticket 两占位）。

六点文本返工清单：**空（无阻塞项）**。记录级三项（不设前置，实现期
自然消化）：R1=04 :25「A_DR」悬空标签→改「PaperRow 双击打开先例」
（PaperRow.tsx:75 实位）；R2=04「anchor-locate.ts:122」可精化为 :97
（声明点；:122 为 waitOpen 守卫区间近似，非失实）；R3=03 自动保存措辞
「编辑动作即经写通道落库」与 rescope §4「debounce」间防口径歧义——
实现锚 notes.store saveSoon 先例族即可（ADR-0014 autosave-first 为绑
定文本，非矛盾）。
========================================================================
（门二终审完——供主控收口消费）
========================================================================
