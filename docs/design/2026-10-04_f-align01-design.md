# 对齐批「脉络全面向文献库对齐」设计稿（主控终裁版，2026-10-04）

> 三段通道产物：拟定者岗设计书草案 v0.1 → 审核者岗对抗审（B0/W11/N7，有条件
> 放行）→ 主控终裁（C1-C5 条件全处置+C2 四清单亲核销项）→ 用户三呈裁
> 落定（§5，2026-10-04 同日）。本文=实施依据稿（**final**）。
> 上游=用户四项方向裁决（方向轮 2026-10-04，详单 docs/prompts/
> 2026-10-04_visual-feedback-r1-analysis.md §7c）。

## §0 审核清偿记录（W/N 处置+C2 四清单亲核销项）

### 四清单销项（审核 C2，主控亲核 2026-10-04）

1. **调用方与建点链**：`service.upsertNode` 唯一调用方=`src/main/ipc/lineage.ts:20`
   （IPC 通道）；import.service:175 / library.service:141（updateMeta 排序键
   同步）/228/:236（moveFolder 建节点/随迁）全部 `deps.repos.lineage.upsertNode`
   **repo 直调**——两假设（W10-A1/A2）成立。推论：D1 拆通道后 service 层
   新建分支+主题分支均成无调用方死码，随单元一删除。
2. **null 入口全清单（D3 实现面事实）**：`fromDialog`/`fromFolder` 的 Req=
   voidReqSchema（api-surface.ts:47-48，**不携带目标文件夹**）；main 侧
   importOne 的 collection=null 两来源=①单文件对话框导入（恒 null）②文件夹
   导入的根目录散文件；**renderer 后挂接链**=ImportDropZone.tsx:152-155
   （imported 非空且 targetFolderId 非 null 时逐个 `api.papers.moveFolder`）
   +LibraryPage.tsx:102-107（targetFolderId=folder 态=该夹，否则恒
   MAIN_GRAPH_ID）。→ 现状两跳链（main 不建节点→renderer moveFolder 分支②
   补建），存在逐个挂接的中间失败窗口（部分挂接）。D3 定案据此改 main 侧
   单跳（见 §1 D3）。
3. **测试符号/装置引用**：主题节点（paperId:null）用例分布 10 文件
   （lineage-v2-service.test :87-123 主题更新/跨月年/禁搬图族、
   folders-move-paper.test :136/:142/:146 W2 移出族+:194 未归档建节点族、
   lineage-tags/lineage-edge-via/lineage-u8-linetype/lineage-v2-model/
   library-detail-lineage/lineage-assemble/renderer 两件）；e2e=
   lineage-topic-node.spec（①退役②③保留）+lineage.spec T11 断言面。
4. **A 批交叉接口**：①LineageBoardDialogs 三对话框共宿主（AddNode=本批删/
   EditIdea=A3 删/Tag=A1b 删）——各删各自挂点互不依赖，票面显式声明
   「只动 addOpen 面」；②LineageSideTags.tsx:11 注释引用 upsert-node 通道名
   ——本批改通道名时同步改写该注释行（注释级连带，非跨批蔓延）；③**写队列
   kind='upsert-node' 同时承载 tags（A1b 面）/coreIdea（A3 面）patch**——
   patch-node 白名单必须临时含 `tags`+`coreIdea` 两字段（注记「随 A1b/A3
   各单元退役删除」），否则先行即 typecheck 红；④A 批余项票面随之微调：
   A1b/A3 的「写队列面」处置改为「patch-node schema 删对应字段+store 对应
   enqueue 路径删」。

### W 条处置

- **W1（D4-b 论断过强）**：重述为——「级联=DDL 事实（012:54 节点随夹删→
  004:26-27 边随节点删）；不可逆=本应用无 undo 栈（ADR-0014 v1 明示）且
  删夹有确认弹窗（useFolderDelete）非全静默，但确认文案未预告边损失=
  用户不可预期损失」。D4 呈裁按此口径呈现。
- **W2（D2 乙押未登记假设）**：条件采纳——乙的放行前提=D 批台账显式登记
  「lineage_nodes 重建时顺带 paper_id NOT NULL（退出条件+评审触发器按
  治理纪律附 defense-lifecycle.md）」；本批收口时登记，登记不成改走甲
  （本批迁移，存量 0 行零障碍）。
- **W3（D8 甲否决理由失真）**：改述——甲（按层切）真实代价=门链遍数×2+
  死代码窗口期，非「typecheck 必红」（增量序下可全绿）；仍维持丙为终案
  （同通道改动不拆两单元）。
- **W4（双侧绿未举证+装置错位）**：C2-3 清单已出（上）；票面把「测试符号
  装置引用」列为单元派发前置——凡以 addPaperNode/addThemeNode/upsert 通道
  为装置的保留用例（如 folders-move-paper :142 用 service 建节点装置），
  改用 repo 直插装置（同 :221 先例「绕 service 直插」）。spec②③保留面
  与单元三 D6 适配的时点切清：②③ 在单元一 A 中仅做装置级适配（若涉），
  D6 断言适配归单元三 A。
- **W5（强制件无单元归属）**：§3 表补齐——K1 正向锚定用例随单元二 B 落
  （两路建节点+删除级联，[locked-change]）；INV-NEW-1 词表入 quality 随
  单元四 B 落；INV-NEW-2 探针断言随单元二 B 落（探针件驻仓外档案区，CI
  不跑——锚定=主控收口亲验+票面验收步骤）；INV-88 强制方式改述「正向
  锚定测试（归属单元二 B）」。
- **W6（词表口径不闭合）**：词表精确化=`upsert-node`（IPC 通道名+写队列
  kind 字面量）/`addPaperNode`/`addThemeNode`/`lineage-add-node`（testid）/
  `LineageAddNodeDialog`——**不含 `upsertNode` 符号本身**（repo 层合法符号，
  import/move/updateMeta 直调在役）。扫描面=src/**（含注释；注释残留=
  需改写的 stale 注释，同 LineageSideTags:11 先例处置）。误报豁免=不设
  （词表已排除合法符号）；「schema 无新建形态」机检载体=zod schema 类型
  测试（id 必填+字段白名单断言，随单元一 B 测试落）。
- **W7（INV-92 三要素不全）**：§2 表补齐。
- **W9（空主图≠空库反例）**：D6 分层判据改为**库级文献总数**——空库
  （全库 papers 计数=0）=行动引导（导入 CTA）；当前图空且非空库=状态
  说明（「该文件夹暂无文献——文献入库后自动出现在脉络」）。反例（子夹
  有货主图空）归后者 ✓。
- **W10**：四清单-1 销项（假设两两成立，见上）。
- **W11（治理面生命周期）**：INV-NEW-1 词表（quality 关卡扩）+INV-NEW-2
  探针=新增治理面——单元四 B 时按 F-GOV-01 登记 defense-lifecycle.md
  （退出条件：DDL NOT NULL 落地后探针退役/词表随词表项全灭退役；评审
  触发器=D 批 DB 战役启动）。

### N 条吸收

N1（D1 保名收紧变体）列入 D1 对照（终裁仍取拆分——通道名即语义+负锚词表
依赖通道名消亡）；N2（D4 删夹弹窗选目标夹=第三候选）列入 D4 呈裁；N3
（D2 候选轴补「永久可空」「本批即做」）已入 W2 处置口径；N4（D4-a 文案
「先移至其他文件夹」+主图可达性=FolderNav 主图行在役 ✓）；N5（D5 用户
可见删除项注裁决依据=§7c 裁决 2）；N6（交付登记面：tickets registry 翻
状态+ADR/架构回写（§6 实体表+ADR-0014 修订）+locks unlock/apply 时点+
码 commit 亦标 [locked-change]（涉 api-surface/tests/迁移面）随单元票面
落）；N7（单元二三四门链标注）§3 表补齐。

## §1 数据契约与行为终态（D1-D9 终裁）

1. **D1 手动新建路退役=通道拆分（c）**：`lineage/upsert-node` 通道删除，
   新立 `lineage/patch-node`——Req schema=`{ id 必填, x?, y?, month?, slot?,
   title?, tags?, coreIdea? }`（tags/coreIdea=A 批余项遗留面，注记随
   A1b/A3 退役；其余=编辑 patch 语义），Res 沿用 lineageNodeSchema。
   service 层：新建分支+主题分支删除（四清单-1 推论），保留 update 形态
   （id 在场 patch——幽灵 id 拒保留）。**〔执行修正 2026-10-04 派发前核〕
   `LineageNodeUpsert` 类型不退役**——它是 repo 写面输入类型（repo.upsertNode
   签名 lineage.repo.ts:99/write-guards normalizeMonthSlot 入参/import+move
   建节点 repo 直调在役）；退役面=IPC 契约别名 `lineageUpsertNodeReqSchema`
   （schemas.ts:335，随通道删）+该类型头注用途收窄改写（IPC 契约→repo
   写面输入，内部建节点路径专用）。
   负锚词表=W6 口径。回退路线 a+b 仅在拆分体量实证不可控时由主控重裁。
2. **D2 主题节点退役=应用层本批全退+DDL 归 D 批（乙+W2 条件）**：应用层
   面=service 主题分支/renderer 全部 paperId null 短路（含 A1a tagNames
   挂账短路+store 类型面）/`graph()` paperIds 直收集（过滤退化删除）/
   LineageNodeUpsert 退役。DDL：paper_id NOT NULL 归 D 批重建时顺带——
   **本批收口时在 D 批挂账台账登记（附退出条件+触发器，W11 口径）**；
   登记不成改走甲（本批迁移 016，存量 0 行零障碍）。窗口期防线=INV-NEW-1
   契约机检（新建形态结构性不可表达）+活库探针断言 paper_id IS NULL 零行。
3. **D3 导入落夹=【用户裁决落定 2026-10-04】当前文件夹/主图（=原推荐 b，
   main 侧单跳）**：实现=fromDialog/fromFolder Req 扩 targetFolderId
   （renderer 恒传：folder 态=该夹，否则 MAIN_GRAPH_ID——LibraryPage:102
   既有值直通）+importOne 事务内 collection=null 时落 targetFolderId（缺省
   主图）并建节点（四清单-2 两跳链收口为单跳：消除逐个 moveFolder 中间
   失败窗口+未归档中间态）。「全部」视图（folderScope undefined）保留
   只读聚合。不变量=null 永不到达 importOne 的落夹赋值（INV-NEW-2 主锚）。
   **连带**：renderer 后挂接链（ImportDropZone:152-155）随单跳化删除
   （moveFolder 挂接语义由 main 侧吸收）；子目录结构导入语义不变（一级
   子目录名→该夹+建节点，现有行为）。
4. **D4 删夹处置=【用户裁决落定 2026-10-04】删夹=删除域内全部数据（级联
   语义——超出原 a/b/c 三候选，用户业务语义：「删除文件夹就相当于删除了
   所有数据，包括标签、文献、脉络、笔记等等」）**：文件夹=数据域容器。
   - **实现（单元二 B）**：folders.service.delete 改写=事务内「先删夹内
     全部文献（papers.remove×N——DDL 级联链：paper_tags/annotations/
     notes/ai_notes/lineage_nodes→edges 二跳+FTS 触发器自清）→再
     folders.remove」。主图禁删守卫保留（folders.service:95-97 既有
     CONFLICT 拒——删主图=删全库，恒禁）。
   - **renderer 连带**：useFolderDelete 静默判据重写——原判据
     （nodeCount=0∧edgeCount=0 静默，paperCount 不参与——2026-09-30
     裁决「文献仅移未归档可寻回」前提随未归档域消亡而失效）改为
     **paperCount=0∧nodeCount=0∧edgeCount=0 静默直删；任一非零=弹窗**；
     FolderDeleteDialog 文案重写（预告「将永久删除夹内 N 篇文献及其脉络
     图、笔记、标注」）；计数面扩 paperCount。
   - **边界如实申报**：①tags 定义行（库级实体）保留——paper_tags 关联随
     文献级联删，空标签不自动清理（可复用；如需清理另立票）；②PDF 分桶
     物理文件不随删——与既有单文献删除语义同族（papers.remove 本不清
     fileStore，孤儿文件=既有行为面；清理另立票不混本批）。
   - DDL（papers.folder_id NOT NULL+SET NULL 动作改判）归 D 批合并处置
     （同 D2 理由——应用层事务语义本批先行，DDL 层 SET NULL 动作在应用
     层路径外不再可达）。
5. **D5 未归档域一揽子退役（乙）**：moveFolder 分支①（toFolderId=null
   移出）删——null 恒 CONFLICT 拒；`paperMoveReq.toFolderId` 收紧
   `z.string().min(1)`；folderScope 删 `{kind:'unfiled'}`；DndTarget
   unfiled 删；PaperRowMenu「未归档（移出）」删；FolderNav 未归档行
   +计数查询删+INV-87 引导态简化（作用面=仅隐藏未归档行——四清单外
   票面开工前复核）；`ensurePaperFolder` 保留转角色（D3 落夹实现+防御
   兜底，INV-88 注明）。用户可见删除项依据=§7c 裁决 2（文件资源管理器
   模型）。
6. **D6 空图/空库引导=【用户裁决落定 2026-10-04】不做空库引导**：「新建
   文件夹和导入 PDF 按钮都在，研究者能看到」——不新增引导组件/CTA。既有
   「该文件夹无脉络图」提示（LineagePage:143-149，folderId≠主图且空）
   **维持现状**；其头注中「主图空图不提示——bootstrap 添加节点路径」
   stale 注释随单元一 B（添加节点退役）连带改写。原 W9 空主图判据议题
   随引导取消消亡。
7. **D7 测试面收紧**：承草案 D7+W4 处置——保留用例装置改造（service 建
   节点装置→repo 直插装置）；topic-node①删②③装置适配（单元一 A）+D6
   断言适配（单元三 A）；INV-92 三态→两态；W2 移出族删；「未归档→入图
   即归档」族改写为 D3 落夹正向；主题用例族删；seed-lineage.mjs:91 删；
   exemptions 独立清单（reason+rulingLink 指本稿终裁版）。
8. **D8 单元切分=四单元+测试先行序（丙）**：见 §3。
9. **D9 INV 改写与登记**：见 §2。

**K1 核查项固化**：入库形态×建链矩阵=①对话框/根散文件导入（D3 落夹后
恒落目标夹+建节点）②子目录导入（建节点到子目录夹）③移动迁入无节点
（分支②建）④移动迁已有节点（分支③随迁+跨图边清理）⑤文献删除（DDL
CASCADE 节点→边）。每形态正向用例断言：节点存在+INV-88 投影恒等（节点
folder_id=文献 folder_id）+删除后节点/边零残留。随单元二 B 落
（[locked-change]）。

**悬浮笔记接口边界**（仅此段）：数据模型候选=`floating_notes`（id/folder_id/
坐标/正文/时间戳——坐标域画布内容坐标 vs 屏幕坐标的裁决留该批设计稿，
INV-96 前车之鉴）。本批唯一义务=不制造阻塞：paperId 非空化收紧不与悬浮
笔记冲突（独立实体独立建模，不复用 lineage_nodes.paper_id 可空位）。

## §2 不变量登记（三要素齐备）

| INV | 声明处 | 强制方式 | 锚定状态 |
|---|---|---|---|
| INV-88（改写：两路=挂接导入落夹建节点/moveFolder 自动建与随迁；未归档分支删（语义由 D3 吸收）；主题节点子句全删；ensurePaperFolder 角色注明） | docs/invariants.md+import.service/library.service/lineage.service 头注 | 正向锚定测试（K1 五形态，归属单元二 B） | 节点存在⇒文献 folder_id=节点 folder_id |
| INV-92（改写：「全部/某文件夹」两态恒同） | docs/invariants.md+library-lineage-c5.test 头注 | 两态恒同锚定测试（改写族，单元二 A） | 同文献 pubNo 两态同值 |
| INV-NEW-1 节点唯一来源=入库/移动两路，无手动创建路径 | docs/invariants.md+api-surface.ts patch-node 注册处注释 | 契约机检（patch-node schema id 必填+白名单类型测试，单元一 B）+负锚词表入 quality 段（W6 口径，单元四 B+治理登记） | 词表 src 面零命中+schema 无新建形态可表达 |
| INV-NEW-2 所有文献必在文件夹（papers.folder_id 非空） | docs/invariants.md+import.service/library.service 头注 | 应用层闸（null 不达 importOne 落夹+moveFolder 拒 null——单元二 B）+探针断言（主控收口亲验） | 探针 null-folder=0；D 批 DDL NOT NULL 后升级 DDL 锚定 |
| INV-NEW-3 文件夹=数据域容器：删夹=域内数据全删（文献/脉络/笔记/标注/标签关联随级联）；主图禁删 | docs/invariants.md+folders.service 头注 | 正向锚定测试（删夹后 papers/lineage_nodes/notes/annotations 域内零残留+主图删拒——单元二 B） | 删除事务语义（先文献后夹行） |

## §3 单元切分与实施序（全串行——锁纪律）

| 单元 | 内容（决策点） | 提交序列 | 门链 |
|---|---|---|---|
| 一 | D1+D2：通道拆分+主题节点+新建路退役 | A=[locked-change][test-refactor] 删 topic-node①/主题用例族/seed 兼容行+保留用例装置改造+exemptions；B=[locked-change] patch-node 通道+service 两分支删+renderer 三入口/对话框/store 两方法删+graph() 收紧+LineageSideTags:11 注释连带+LineagePage「bootstrap 添加节点」stale 注释改写+schema 类型测试 | 门一双审 k1+d1+门二实证终审 |
| 二 | D5+D3+D4 应用层：未归档域+导入落夹+删夹级联删除 | A=[双尾注] W2 族删/INV-92 两态改写+exemptions；B=[locked-change] 契约收紧+moveFolder 分支①删+五消费面删+Req 扩 targetFolderId+importOne 单跳+挂接链删+删夹级联删除（folders.service 事务重写+useFolderDelete 静默判据/FolderDeleteDialog 文案与计数面）+K1 五形态正向用例+INV-NEW-2/3 锚定用例与探针步骤 | 同上 |
| 四 | D9+D7 收尾：INV 登记+test-surface 收口 | A=[locked-change] invariants.md 改写+三新 INV 登记+defense-lifecycle 治理登记+D 批台账挂账登记（W2 条件）；B=[locked-change] 负锚词表入 quality+exemptions 终审+基线再生成+全量 diff 审计+ADR/架构回写（ADR-0014 修订+§6 实体表） | 同上 |

（**单元三取消**——D6 用户裁决落定为不做空库引导：原单元三内容消亡，
spec②③ 空态断言维持现状无需适配，LineagePage stale 注释归单元一 B。
每单元独立 commit+即时 locks:apply+tickets registry 翻状态；呈裁已全部
落定（§5）——单元二开工前置已满足；单元一开工前置=A 批余项票面按
§0-四清单-4 微调对齐——A1b/A3 的写队列面改 patch-node 口径，已随本场
A 批设计稿连带修订落档。）

## §4 风险清单

1. 通道拆分漏改：派发指令附 grep 盘点清单（wq kind/preload/api-surface/
   store/测试），门一核对零命中。
2. patch-node 白名单临时含 tags/coreIdea 的中间态：注记清晰+A1b/A3 票面
   对齐（§0-四清单-4），防「两批都以为对方删」。
3. collection=null 残留入口：四清单-2 已全列（两来源）；单元二 B 后探针
   断言兜底。
4. DDL 窗口期（D2/D4 推迟）：INV-NEW-1 契约机检+INV-NEW-2 探针；D 批
   台账登记（W2 条件）为放行前提。
5. 装置改造回归：保留用例 repo 直插装置化后语义漂移——门二逐 commit
   实证（非仅单元末态）。
6. 行号漂移：票面按符号/语义定位。
7. moveFolder 分支③跨图边清理：保留既有用例跑通（单元二验收项）。

## §5 裁决记录（用户位，2026-10-04 全部落定——本稿 final 化）

1. **D3 导入落夹**：「当前在看哪个文件夹就落哪个，如果是在主文献库就放
   主图」——=推荐案 b（main 侧单跳；folder 态=该夹，「全部」=主图）。
2. **D4 删夹处置**：「删除文件夹就相当于删除了所有数据，包括标签、文献、
   脉络、笔记等等，这才是业务语义」——=级联删除域数据（超出原 a/b/c
   三候选的第四语义；主图禁删保留；边界申报见 §1.4——tags 定义行保留/
   PDF 物理文件不随删）。
3. **D6 空库引导**：「可以不引导，因为新建文件夹和导入 PDF 按钮都在，
   研究者能看到」——=不做引导；既有「该文件夹无脉络图」提示维持现状。

（主控终裁位已全部落定于 §1；待核实项开工前票面复核——迁移序号 016
占用/INV-87 作用面。上游四裁决详单=反馈台账 §7c。）
