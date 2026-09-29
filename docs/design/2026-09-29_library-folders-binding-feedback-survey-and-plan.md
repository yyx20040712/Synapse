# 库页×脉络图整改批——用户反馈勘察与设计草案（2026-09-29）

> **性质**：F-LINEAGE-02 承接场首轮用户走线意见到达（2026-09-29 用户截图红/绿/蓝
> 标注八项）。本档=设计文档先行纪律下的勘察落格+方案草案；**§1 四个决策点
> D1-D4 显式【待批】**（AskUserQuestion 界面未送达用户，按主控推荐案撰写，
> 用户可单点否决换向）。定稿后另出 design-final（按批型分级烤验）。
> **与 F-LINEAGE-02 的关系**：该票三件事（走线几何态空间文档/两文件拆分/d 值
> 推导）本批全部**不动**——本批意见是产品结构层（文件夹×图绑定），走线几何
> 等图内有真实连线后再启动，F-LINEAGE-02 维持 armed。

## §0 反馈八项落格（现状根因脚本/探查实录 → 方案 → 票面归属）

| # | 用户意图 | 现状根因（file:line） | 方案 | 归属 |
| --- | --- | --- | --- | --- |
| 1a | 课题图标右上角无点 | 色标点 `Rail.tsx:126`（6 色轮转 `rail-shared.ts:10-17`） | 删点；色标身份移入课题管理页卡片 | F-WS-02 |
| 1b | 点课题图标=展开独立页面 | 现仅弹 `WsRailPopover` 浮层（`Rail.tsx:165`） | 新增 workspaces 视图页（列表/新建/改名/切换），浮层退役删除（方案切换=删除旧方案） | F-WS-02 |
| 1c | 未选课题时下方按钮全禁用 | Rail **无任何 disabled 逻辑/样式**（全文 grep 零命中）；课题指针恒有兜底（`workspace.fs.ts`，id=default） | 「默认课题」引导态判定（细则见 D2）+ rail 禁用浅色态 | F-WS-02（D2 待批） |
| 2 | 下载↔文献库间距过大 | 两图标间塞 12px 空 div（`Rail.tsx:140` rail-gap；`theme-shell.css:246-249`），其余间距 3px | 删该 div，全栏等距 | F-LIBUI-01 |
| 3 | 文件夹（zotero 同款）×同名脉络图绑定 | `collections` 平铺雏形只有 attach（`collections.repo.ts:29-34`，无改名/删除/移出）；**脉络=每课题全局单图**（`004_lineage.sql` 无 graph 维度）；入图全手工（`LineageAddNodeDialog`） | 本档 §2 全套设计（schema 011+一致性矩阵+切换器） | F-FOLDER-01（D3 待批） |
| 4 | 期刊后显示影响因子 | 全库无 IF 字段；免费源（crossref/openalex）均不提供 JCR IF | 手动字段方案见 D1；`papers.impact_factor REAL NULL`（011 批内）+编辑元数据入口+题名·期刊列尾显示 | F-FOLDER-01（D1 待批） |
| 5 | 编号=发表时间老→新、导入时更新、去 # | 现状=入图用 `li.catalogNo`、否则列表位次（`PaperRow.tsx:50-51`），`#` 前缀 `PaperRow.tsx:69`；默认排序=导入序（`library.store.ts:47`） | **编号改派生值不落库**：`ROW_NUMBER() OVER (ORDER BY year ASC, month ASC NULLS LAST, added_at ASC)` 挂进 LIST_SQL（SQLite≥3.25 窗口函数，v13=3.53.4 ✓）；导入/改元数据自动重排（零存储零重算任务）；删 `#` 前缀；图内节点号与库号同源（catalogNo 退役，单一真相源）；无年份文献排尾部（「尽量」语义） | F-FOLDER-01 |
| 6a | 标签保存/显示疑似 bug | **实锤但非保存问题**：保存链路完好（回车→upsert→attach 落库），`TagEditor.onChanged` 只 `setReloadKey` 重拉详情（`PaperDetailPanel.tsx:99-101`），**不触发 `library.store.load()`** → 表格标签列滞旧，下次筛选/导入才刷 | onChanged 加 `library.store.load()`（先例=`FilterBar.tsx:90` onMutated）。zotero 式标签=现有 upsert-by-name+attach/detach+TagFilter 已具雏形，彩色标签等后议 | F-LIBUI-01 |
| 6b | 取消档次列 | 列渲染 `PaperList.tsx:99-106`/`PaperRow.tsx:54`；值源=5 条种子映射（`venue-tier.ts:68-80`）大多显示"—" | 删表格列。**注意**：`venueToTier` 另有两消费点（lineage 含金量 join `lineage.service.ts:41,491`+corpus manifest）——库保留，仅列消失 | F-LIBUI-01 |
| 7a | 导出语料集合去留+按钮组整理 | corpusSet=当前课题全库笔记+标注批量导 `corpus/<id>.md`（`LibraryPage.tsx:60-87`→`export_.ts:130-146`→`export.service.ts:152-189`）；**设置页已有含 corpus 的五件套「AI 语料导出」**（`CorpusExportSection.tsx`，另一通道 corpusSession）；按钮组=9 钮 flex 自动换行（`DrActions.tsx:39-105`，`library.css:310`） | D4 裁去留；按钮组改 **2 列 grid**（`grid-template-columns:repeat(2,1fr)`，primary 跨 2 列首行） | F-LIBUI-01（D4 待批） |
| 7b | 「关联脉络」「AI 评估」不显示 | 前者 `PaperDetailPanel.tsx:192-198`；后者纯「后置」占位（`:199-204`，禁假数据有意设计） | 两行删；「关联」节随 F-FOLDER-01 改造为「文件夹」行（显示归属+移动入口） | F-LIBUI-01 删行 / F-FOLDER-01 复用节位 |
| 8 | 底边沉入任务栏 | 窗口宽高已按 workArea 钳制但 **x/y 原样透传**（`bootstrap.ts:207-229`）；现成 `clampBounds`（`window-state.ts:25-33`）main 侧无人调用（仅单测消费） | bootstrap 接 clampBounds（x/y+宽高全维钳制 workArea） | F-LIBUI-01 |

## §1 决策点 D1-D4【已批 2026-09-29——用户四项全批，批语随行】

- **D1 影响因子来源=手动填写（已批）**：批语「下载模块还没做，所以先按推荐来」
  ——编辑元数据加数字字段，期刊名后显示 `· IF x.x`；后续下载模块落地时
  IF 自动获取为增强候选（下载=A8 规划中占位）。理由：JCR IF 无免费权威
  API（crossref/openalex 均不提供），出网仅手动触发是安全红线。
- **D2 「未选课题」判定=默认课题引导态（已批）**：批语「默认课题显示为
  **待选择**，其余听你的」——id=default 且 paperCount=0 且名未改 → rail
  下方按钮全禁用（浅色）、课题名显示位显示「待选择」（不显示「默认课题」
  字样），课题图标进管理页引导新建；一旦默认课题内导入过文献/改过名即
  自动升格为真实课题并显示实名。
- **D3 文件夹归属语义=单归属移动语义（已批）**：一篇文献至多属一个文件夹；
  挂入=自动入同名图，移出/删除=图中节点+直接连线同删；未分组文献不进
  任何图。**「文献被删除」负面清单解除已随批知悉**（v1 不做删除文献 →
  本批实现：确认弹窗+受管文件 `files/` 同步清理，DDL 级联链现成）。
- **D4 导出语料集合=删库页按钮并整体退役（已批）**：IPC 通道 corpusSet
  一并退役（[locked-change]，api-surface 三方对账面同步收窄+豁免台账
  落 reason+裁决链）；设置页五件套 corpusSession 零触碰。

## §2 文件夹×脉络图绑定——数据层与一致性设计（F-FOLDER-01 设计基座）

### 2.1 现状事实基座（探查实录，写设计的事实前提）

- 课题=文件系统级隔离（一课题一目录一 synapse.db，ADR-0018），文献与课题
  无外键——**文件夹全部设计都在课题库内部，不跨课题**。
- `collections(id,name UNIQUE,position)` + `paper_collections(M2M)` 冻结于
  001；唯一生产入口=导入文件夹时一级子目录名自动挂接。
- 脉络 `lineage_nodes(paper_id 可空 FK CASCADE)` + `lineage_edges(端点
  FK CASCADE，UNIQUE(from,to))`，全局单图；节点位置=year/month/slot 全序
  （SVG 自由画布已退役）；「未加入脉络」=无节点行。
- 坑 a：`lineage_nodes.paper_id` 无 UNIQUE（UI 过滤+LIMIT 1 兜底）；
  坑 b：草稿导入=clearGraph 整图替换；坑 c：renderer 写=排队 autosave
  （CONFLICT 仅 toast）；坑 d：enrich 只补空字段且仅手动触发。

### 2.2 schema 迁移草案（011_folders_graphs.sql，[locked-change] 面）

```
-- 011 裁决注记：文件夹=文献物理归属（单归属），脉络图=文件夹内容的投影
ALTER TABLE papers ADD COLUMN folder_id TEXT REFERENCES collections(id)
  ON DELETE SET NULL;                      -- 删文件夹→文献回未分组
CREATE UNIQUE INDEX idx_lineage_paper ON lineage_nodes(paper_id);
  -- 一文献一节点（坑 a 根治；paper_id 可空的主题节点不受影响）
ALTER TABLE lineage_nodes ADD COLUMN folder_id TEXT NOT NULL DEFAULT ''
  REFERENCES collections(id) ON DELETE CASCADE;
  -- 节点必属一图=一文件夹；删文件夹→节点+边级联消亡
-- 回填（迁移内事务）：
-- ① 建「主图」文件夹；② 有脉络节点的文献 folder_id=主图，其节点 folder_id=主图
-- ③ 其余有 paper_collections 挂接的文献 folder_id=其首个 collection
-- ④ DROP TABLE paper_collections（单归属化，旧 M2M 退役）
```

- **边不加 folder_id**（派生）：边所属图=端点节点所在图；服务层不变量拒跨图
  边（见 2.5）——零冗余零漂移面。
- 图名=文件夹名（1:1 绑定单一真相源，改名即图改名，无独立 graph 元数据）。
- `papers.impact_factor REAL NULL`（D1）同批入 011；shared zod schema 加
  optional 字段（ADR-0011 演进规则）。

### 2.3 操作×图一致性判定矩阵（本批的「态空间」主体）

文献态 ∈ {未分组 U, 文件夹 F_i}；节点态 ∈ {无, 属 F_i}；边=端点同图才有意义。

| 操作 | 库侧效果 | 图侧效果 | 边效果 | 备注 |
| --- | --- | --- | --- | --- |
| 新建文件夹 | collections+行 | 空图诞生 | — | 名唯一约束沿袭 |
| 文件夹改名 | name 更新 | 图名即时跟随 | — | 脉络页开着该图须联动刷新 |
| 删除文件夹 | papers.folder_id→NULL（回未分组） | 节点+边级联消亡 | 全灭 | **确认弹窗明示两项后果** |
| 导入→当前文件夹 F | 新行 folder_id=F | **自动 upsert 节点**（year/month 取元数据，缺省归「未定年月」组） | — | 「立刻自动出现在脉络图」兑现；坑 b 草稿通道不参与 |
| 导入→「全部」（未选文件夹） | 新行 folder_id=NULL | 无节点 | — | 「相关性不够强」的文献停留库面 |
| 移动文献 F1→F2 | folder_id 改写 | F1 节点删+F2 节点建（元数据重归一） | **F1 内直接连线同删**（用户明示） | 连线不迁移——边属图 |
| 移动文献 F→U（移出） | folder_id=NULL | 节点删 | 直接连线删 | |
| 删除文献 | 行删（全链 DDL CASCADE 现成：节点→边二跳/标注/笔记/AI 笔记） | 节点消亡 | 直接连线消亡 | +受管文件 files/ 清理；确认弹窗（D3 附带知悉） |
| 改文献元数据 year/month | 行更新 | 若在图：跨年月组迁移（normalizeMonthSlot 归一） | 保留（同图内） | 编号同步重排（派生自动） |
| 新建/删除边（图编辑） | — | — | 服务层校验两端点同图 | INV-L03 |
| 主题节点 | — | 属当前图（folder_id 必填） | 随图 | 不挂文献 |

### 2.4 跨格序列（2026-08-23 U2 教训：单格枚举盖不住序列）

- **S1 移动×编辑队列交错**：编辑脉络模式（autosave 队列 pending）中移动/
  删除该图文献 → 服务端节点已删，队列里旧 upsert 复活孤儿节点。裁决：文件夹
  突变操作前**队列闸**（沿 workspace-switch×import 的 gate 先例
  `workspace.service.ts:101-103`）：脏队列未 flush 则拒绝并提示先保存。
- **S2 导入中×文件夹切换**：导入 gate>0 期间禁切当前文件夹（同闸扩展）。
- **S3 改名×脉络页开图**：图选择器显示名/顶栏联动刷新（store 订阅 folder
  列表）。
- **S4 删除文件夹×当前正显示该图**：级联后脉络页回退到「选择文件夹」空态。
- **S5 迁移回填×存量数据**：已有图节点全部归「主图」，用户随后可自行改挂
  ——零数据丢失路径。

### 2.5 不变量登记清单（实现时入 docs/invariants.md）

- INV-L01 节点存在 ⇒ 该文献 folder_id=节点.folder_id（图=文件夹内容投影）。
- INV-L02 `lineage_nodes.paper_id` 全局唯一（DDL UNIQUE 根治坑 a）。
- INV-L03 边两端节点 folder_id 相同（服务层拒跨图边；DDL 不承担）。
- INV-L04 编号=库级发表年月全序派生值，不落库；排序键
  `(year ASC, month ASC NULLS LAST, added_at ASC)`，重排时机=任何库变更即
  自动（派生性质免调度）。
- INV-L05 默认课题引导态判定（D2 批后定稿三条件）。

### 2.6 已知坑对策索引

坑 a→UNIQUE 索引根治；坑 b→自动入图走 upsertNode 通道不走草稿替换；
坑 c→S1 队列闸；坑 d→IF 不上 enrich 自动填充链（D1=手动）。

## §3 库页/侧栏 UI 整改明细（F-LIBUI-01 面）

- Rail：删 rail-gap div（`Rail.tsx:140`）；删 rail-ws-dot（`Rail.tsx:126` +
  CSS 256-265）。
- 表格：删档次列（`PaperList.tsx:99-106`/`PaperRow.tsx:54,81-85` + 列宽
  `library.css:140-145`）；编号去 # 前缀换 pubNo；期刊后 `· IF x.x`（D1）。
- 标签刷新：`TagEditor.onChanged` 追加 `library.store.load()`。
- 详情面板：删「关联」脉络行+「AI 评估」行；「关联」节位留待 F-FOLDER-01
  改造为文件夹行。
- 按钮组：DrActions 两列 grid 化（9 钮含条件 DOI 钮，primary 跨两列首行）。
- 窗口：`bootstrap.ts` 接 `clampBounds`（x/y 全维钳制 workArea）。
- 文件夹 UX（F-FOLDER-01 面）：FilterBar 集合下拉升级为**文件夹 tab 行**
  （全部 | F1 | F2 | … | ＋新建；当前 tab 决定表格过滤+导入落点）；脉络页
  LineageToolbar 加**图切换下拉**（=文件夹列表），空态引导建文件夹。

## §4 拟立票拆分与执行序

1. **F-LIBUI-01（P0 小批先行）**：§0 中 2/6a/6b/7a 全项（按钮组网格+
   **corpusSet 整体退役**——D4 批后一逻辑单元整体出清，避免死通道跨票
   滞留）/7b/8 + 5 的 # 前缀删。根因全实锤零设计悬念；涉及 tests 契约面处
   按 [locked-change] 随票核。注：编号换 pubNo 依赖 LIST_SQL 改造，归
   F-FOLDER-01；本票仅删 #。
2. **F-WS-02（P1）**：课题管理页+引导态禁用+浮层退役（D2 批后定稿）。
3. **F-FOLDER-01（P2 大票，三屋全对抗）**：schema 011+folder CRUD IPC+
   一致性矩阵落地+编号派生改造+IF 字段+脉络切换器+删除文献。本档 §2 为
   设计基座，D1/D3 已批——design-final 三段通道先行后实现。
4. **F-LINEAGE-02 维持 armed 不动**（走线几何等真实连线后启动）。

## §5 ADR/负面清单/锁面触及

- ADR-0014（脉络数据模型）加修订记录：图维度=文件夹（1:1 投影）；
  ADR-0018 不动；D3 批后立新 ADR（文件夹单归属×图绑定裁决）。
- 负面清单解除：删除文献（v1 明确不做→用户 2026-09-29 意见隐含需要，
  D3 附带知悉确认）。
- 锁面：migrations/001（不改，只增 011）、src/shared/**（zod+api-surface
  加减通道）、tests/**（契约面随票核）——全部 [locked-change] 随票尾注。

## §6 探查消耗与档案

- 勘察双岗（explore×2，session:host-tier）：1,193,123 + 1,764,128
  subagent tokens，账本 287→289 行。
- 证据：用户标注截图（WeChat 临时路径，已由主控目验+双岗代码对勘）；
  本档所有 file:line 均出自双岗探查报告。
