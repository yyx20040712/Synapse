# 交接书 v110 —— F-TESTREF-S5 收口+F-UIRES-01 设计稿定案（2026-10-02）

> 前承 v109。本档=双交付：①F-TESTREF-S5 抽取器邻接残余三形态补判定面
> 三屋全链收口（runId=20261002-f-testref-s5）②F-UIRES-01 库页资源管理器化
> 设计稿由主控拟定并经用户终裁定案（runId=20261002-f-uires01-design）。

## §0 本场消耗与开工记录

用户开场指令=续 v109 开工序+审核用 k2 代 k1（与 2026-10-02 修订二常设一致）
+裁决项呈裁。技能清点：ai-dev-org/TDD/verification-before-completion/
subagent-driven-development/dispatching-parallel-agents=用；systematic-debugging/
frontend 族/browser-use/dynamic-workflows/git 族=不用（纯 scripts+设计稿批，
理由在档）。配置：executor×3 段/probe=随宿主（session:host-tier）；k2×2 轮
=Kimi 链 $max；d1×4 轮/adjudicator=deepseek 异构 $max；设计岗=glm-look
外呼（glm 通道 401 降级 ds 单段三审——偏离申报在档）。

用户裁决三件：**DB 窗口维持后置**（F-TAGS-02/F-STAR-01 挂账不动——推荐案）
＋**设计稿由我方拟定**＋**P-1..P-11 全按拟推定案**（四问亲裁=P-1 库页内
二级栏/P-6 仅右键菜单/P-8 脉络捷径加入/P-11 改名+颜色；七默认成立）。

消耗：executor 三段（基批 3.7M+RR1 1.3M+RR2 1.6M）+门一六席（k2 首审
118k+复核 34k+d1 设计审 68k+60k+S5 审 66k+复核 56k）+probe 0.9M+
adjudicator 4.9M+主控亲执（证据批三粒杀灭+设计稿全套+事实核验组）。
账本 454→466（本批 12 行+收口行随提交补）。

## §1 基线终态（对不上禁提交）

- **F-TESTREF-S5 面**：工作树本票恰 3 文件（extract.mjs 93+/12-——executor
  91+主控注释 2、新测试件 check-test-surface-s5.test.ts 6 用例、manifest）
  +registry.ts（立案+翻 done 同文件同票）；主控同会话设计批 4 文件（docs/
  design 三件+事故档+6）。**verify 亲跑=EXIT=0，236 件/2423 例**（基线
  235/2417→+1/+6=基批 4+S5-④+S5-⑤；probe 独立复跑同值）；UNRESOLVABLE
  零行；**locks 333→334**（新测试件）；豁免 461 持平；check-tickets
  open 5→4（S5 翻 done）；extract.mjs 有效行 456/500（余量 44）。
- e2e 免跑（零 src——F-CONSOL-11 U1 C3 先例）。

## §2 F-TESTREF-S5 交付与门链

- **三形态修点**：①`const each = it.each` 初值别名（localAliasCheck 扩展+
  flatRootIdentifier——裸支零变）②`it['each']('t',fn)`（elementAccessCheck
  新共享检查两域挂点，computed 与否同红）③`it.concurrent.each` 链式双层
  （EACH_CHAIN_RE 两域同源单常量——白名单 each 分支+哨兵 isEachDouble 共用，
  旧前缀枚举删除）。
- **门链**：executor 基批 TDD（首红全量 4 failed 恰本票+M①②③a③b 四支
  恰红还原净）→门一双审 **k2 PWC B0/W1/N7（W-1=混合链 `it['concurrent'].each`
  两域前存逃逸）+d1 独立 PWC B0/W1/N6（W1=修饰链 `it.skip.each` 白名单
  枚举漏判域间不对称）——双席各自独立抓到相邻同族缺口，双源异构对抗有效性
  再证**→RR1（谓词放宽 calleeText null+flatRoot watched 严格超集+S5-④+
  M④；executor 两处主控预判出入如实纠偏）→RR2（EACH_CHAIN_RE 两域同源
  根修+S5-⑤ 真 exit0 首红+M⑤+N3 负向锚+N4 哨兵挂点锚）→双席定点复核
  双 PASS→主控亲执证据批（**三粒杀灭各恰红**：删监视集约束→S5-②红/摘
  哨兵挂点→S5-①红/正则收窄 `^it\.`→S5-⑤红——含主控先行增补 test.only.each
  根集锚；还原三证 cmp 空+备份即删）→**probe 矩阵 8/8**（verify 独立复跑+
  变异复现还原净 sha 链互证+证据 46 件对账+词边界业务零命中+有效行双口径
  456）→**裁决部 GO_WITH_CONDITIONS**（闭合 11/登记 3/保留 1/驳回 0——
  说了没改抽查 4+加抽全中；复算六组全成立）→P1 兑现（registry 翻 done+
  亲跑 verify EXIT=0+终态 diff 归档）+P2 随本档兑现。

## §3 F-UIRES-01 设计稿定案（用户终裁）

- **产物三件**：docs/design/2026-10-02_f-uires01-mockup.md（**v2.1=实施
  蓝图真相源**——逐句转译表 9 行/状态机五表/统一级联契约 FK 实证清单/
  退役承接清单/e2e 锚清单/呈裁点 P-1..P-11）+mockups/2026-10-02_f-uires01-
  library.html+png（七幕=S1 全景/S2 左栏操作/S3 标签下拉/S4 拖拽导入/
  S5a 文献右键/S5b 删除保护弹窗/S6 未归档空态）。
- **门链**：d1 首审 FAIL B2/W7/N7（B-1 删除级联两分支不对称→FK CASCADE
  实证统一契约闭；B-2 tagIds 跨域失效→「面板结构零改」+域化承接显式登记）
  →v2 全处置→d1 复审 PWC B0/W3/N5→三条 W+三 N 主控亲修入 v2.1（§7b）
  →**用户终裁 P-1..P-11 全拟推成立**。视觉审=glm-look 三轮 B=0（glm 通道
  401 降级 ds 单段——三段流降级申报）。
- **关键设计定案**：左栏=库页内 224px 二级栏（三态导航行 folderScope 零变
  契约）；标签筛选=FilterBar 行尾下拉（一行一勾选**即时生效**=现行语义零变
  +滚动+域内 20 上限过渡期全局集滚动承载）；导入目标恒=当前文件夹
  （ImportTargetSelect 退役）；删除=仅右键菜单+静默判据两分支（无节点∨
  无边→直删；有连线→保护弹窗；级联=FK CASCADE 契约+事务内重验权威）；
  移动=拖拽+右键双通道（含未归档=移出 setFolderId null）；重命名=行内
  单源（FolderRenameDialog 随批退役）；星标=行首禁用占位列（P-9/P-10
  退出条件=F-STAR-01 点亮）。
- **批次划分**：批 A 纯 UI 零 DB（前置=既有 e2e 依赖盘点清单）→批 B
  papers delete 通道（无 DB 迁移；src/shared=[locked-change]）→DB 窗口批
  后置（F-TAGS-02 迁移+域化生效[须回读 v2.1 §2.1 tagIds 过渡锚]+
  F-STAR-01 starred 点亮）。

## §4 挂账与登记（单源=本档）

- **S5 遗留盲形清单**（F-TESTREF 续域候选，registry 票面同载）：赋值式
  别名通道（`e = it.each` 非声明初值）/包壳形 `(it as any)['each']`（旧亦
  不红=无回归，登记面）/`it?.each`、`it!.each`、`globalThis.it.each`、
  `xit.each` 文本正则不覆面/无尾锚理论过捕获（`it.eachfoo` 族）/③无字面
  S5③ 指针（锚=形态名+shape）。
- **G1 计数更正**（裁决部）：probe 报告词边界原始命中「20 行（14+6）」
  更正为 **16 行=10（S5 测试件）+6（extract.mjs 注释）**——物证 raw 实值
  +裁决部独立复算；业务零命中结论不变。
- **G3 格式注记**（P3 低优）：账本个别追加行行首逗号（双行合档写法）非
  严格 JSONL——人读无碍，下游 JSONL 解析接入时规范。
- **H1 已闭**：终态 `git diff --stat` 原文归档 final-diff-stat.txt
  （extract.mjs 93+/12-——executor 申报 91+系主控注释 2 行差）。
- **probe 异常六条**全环境层在档（node -e 隔层截断/EPERM 预期防线/GBK
  噪声/主控简报 4↔5 件笔误被实测纠/git commit-graph 已知噪声）。
- **教训回流已兑现**：事故档第十四节「审包四件发送前自查清单」（票面/
  diff 正文/回执/证据——v109 §4 候选销项；本批审包全按此执行零驳回）。
- **DB 窗口维持后置**（用户本场裁决）；F-TAGS-02 域化批须回读设计稿
  v2.1 §2.1（tagIds 域切换处置承接锚）。
- 承 v109 §4 保留项（k2-N4/d1-N4/N9/N6/k2-N5）与 v108 §4 观察项不变。

## §5 新会话开工序

1. **F-UIRES-01 批 A 实施**（设计稿 v2.1 定案就绪——FolderNav+FolderFilter/
   ImportTargetSelect/FolderRenameDialog 退役+FilterBar 收敛+TagDropdown
   过渡全局集+星标占位列+菜单两项版；**前置=既有 e2e 依赖盘点清单**
   [FolderFilter/TagFilter/ImportTargetSelect 选择器面+ImportDropZone
   消费者]）。
2. 批 B（papers delete 通道+删除流两分支+菜单点亮）。
3. F-UIRES-02（输入交互全域统一——与批 A 后段 FolderNav 行内编辑协同）。
4. DB 窗口挂账维持后置（F-TAGS-02+F-STAR-01；AI 管线+下载模块未启动）。
5. S5 盲形清单随 F-TESTREF 续域任意票搭车或单独小票。
6. 视觉回归关注点承 v107 §5.3 不变。

## §6 操作条款存续

承 v109 §6（=v108 §6=v107 §6）全项。账本行 schema 单源=ai-dev-org
references/02 §9；tier 记法 model-field: 前缀（会话内随宿主=
session:host-tier）。
