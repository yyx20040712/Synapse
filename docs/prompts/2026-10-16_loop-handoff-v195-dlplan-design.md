# 交接书 v195 —— 下载模块设计段收口（技术验证+设计链+四轮裁决，2026-10-16）

> 前承 v194 §1（批 3b 开工序沿承——本场插入下载模块设计段，主线未动）。
> 本档=下载模块（A8 文献搜索与下载引擎）设计段单据+**下场开工序单源**。

## §0 本场总账（runId=20261015-dlplan；账本 6 行在档）

| 段 | 交付 | 终态 |
| --- | --- | --- |
| 规划盘点 | 下载模块=仅排期句+边界预警+UI 占位，无实质规划（registry open 10 票零相关实测）——用户随即下六点需求授权设计 | session-open+汇报在档 |
| 用户需求 | 两层六点+四点澄清+六点+末轮四项（累计四轮裁决逐字入账本 ruling 行）：独立不备份/反爬对策/分层源/文件夹耦合/download_attempt/五元组接口+AI 可调+推送/闭源尽量获取+浏览器跳转/补推时间戳模型/源集多尝试/推送目标=期刊+关键词/**内嵌浏览器路线/月分批浏览/B7 全按推荐/DOI 已在库标记/修宪批准/偏好导出/摘要展开/开工序终裁** | ruling×4 在档 |
| 技术验证 | **P1-P15 十九探针**：元数据五源（OpenAlex 全链最优/Crossref/arXiv/PubMed 通；S2 429 不可依赖）/OA 解析（Unpaywall 拒占位邮箱→真实邮箱通）/PDF 直取（arXiv/PLOS 200；MDPI 403；SD/Wiley Cloudflare 403=闭源自动直取结构性不可行）/WoS+X-MOL（SPA 壳无 API 禁爬→浏览器工作流）/反爬事实（robots/限速头/429 行为）/摘要源现实（OpenAlex 倒排索引常缺+Crossref 0/10→PubMed=顶刊摘要主源） | results/ 四 JSON 在档 |
| 设计链 | 三段通道：ops-drafter v0.1（37,199 tokens）→ops-auditor **FAIL B2/W16/N14**（123,729 tokens，复算表 13 项）→主控终裁 v1.0（B/W 全处置）→四轮用户裁决落 v1.1/v1.2→**v1.3 深调研细化**（用户指令「先行仔细调研各个环节」——十环节发现含两处证伪修正：shell-guard 实为模式守卫非 host 白名单/http-client 一律不跟随重定向） | design/ 四件在档 |
| 合规边界 | 终案：自动绕付费墙面（Sci-Hub/CDP 无头自动化/CARSI 脚本化会话）永久不做；闭源=内嵌浏览器 B8（WebContentsView+持久登录分区+用户手点+will-download 自动收编）；自动直取收窄 OA 基建 host（连坐风险归零） | v1.1-delta R-1 |

## §1 下场开工序（用户终裁序——单源）

1. **遗留项**：F-UIRES-04 批 3b（脉络集成——**C2 四项观察逐字进简报** per v194 §1-1；paperInfoStore 110/110 顶格零余量意识）→批 3c（详情面板重排）→批 3d（收起钮+SETSTYLE-01 搭车）+穿插窗四票（DRAGREMOUNT 方案A/REQFP/IMPORTGATE/B6 候补）→F-UIRES-04 翻 done。
2. **下载模块 B1-B8**（设计 v1.3 冻结；**B1 首批=负面清单两修订入宪 [locked-change]+地基件（限速器/host-health/download-store+fetchBinary+prefs 含导出）**；实施首动作=设计书正本入仓 docs/design/2026-10-16_f-download01-design-final.md+registry 立票；B6 含迁移 023=AI 动作 CHECK 扩四值——DB 战役后首迁移，标准受锁流程；B5 呈样顶刊预设包清单）。
3. **用户集中视检**（1A 裁决沿承——清单六面=仓外 20261015-uiinv/visual-inspection-checklist.md；视检含下载模块 UI 面）。

## §2 待用户面

1. PubMed 升级一句话（B7c 缓→B7 做——v1.3 R-8：顶刊摘要源现实驱动；未批则受限刊摘要展开降级「无摘要」态）。
2. B5 批呈样：领域顶刊推送预设包清单。

## §3 设计段关键定案（新会话实施取用——正本仓外四件）

四层源模型（元数据 OpenAlex 主+Crossref/arXiv/PubMed→OA 解析 oa_locations 主+Unpaywall 默认关→文件直取 OA 基建 host 专属→内嵌浏览器兜底）；D4 长尾 host 用户确认制（四栅栏）；反爬框架（per-host 限速表——arxiv.org 15s 遵 robots/OpenAlex 30s 超时单列）；**paper-ingest.core 共享落库核**（import.service :142-:204 物理切面+gate 归责+事务锚）；AI 面 13 动作全异步 jobId 化+迁移 023；推送=运行中时间戳补推（水位=min(pubDate,today)+chunk 自 today 反向 cap4+月分批收件箱）；已在库=DOI 归一标记（idx_papers_doi 现成）；摘要展开=源瀑布+topics+撤稿警示；shell-guard **零改动**（doi.org 跳转模式校验自然通过）；fetchBinary 手动逐跳（redirect:'error' 现状+5 跳上限）；B8=WebContentsView（BrowserView 已弃用）~700 行；模块总量 ~5320 行 8 批。

## §4 基线与治理

- HEAD=本笔 docs(prompts) v195（前=3cfd6964 批 3a 收口笔——**本场零 src 改动**，工作区净；docs/prompts 非受锁面）。
- registry 未动（288 票 open 10/done 278）——下载模块实施票（F-DL-01 总票+批次子票）B1 开工时立案。
- 成本：subagent 160,928 tokens（drafter 37,199+auditor 123,729）+主控 host-max；账本 6 行（技能清点 session-open/ruling×4/batch-delta/batch-close——runId=20261015-dlplan）。

## §5 证据档指针（仓外 /home/yyx/synapse-archive/download_attempt/——20 件，实测 `find . -type f | wc -l`）

README.md（区规）/facts/facts-pack.md（A1-A5 事实包+用户边界定稿）/probes/ 10 件（P1-P15 四探针+账本追加件六）/results/ 4 JSON（p1-p4 原始输出）/design/ 4 件（drafter-v0.1/final-ruling-v1.0/v1.1-delta 含 R-7/v1.3-refinement 含 R-8~R-11）。

> 本笔 push 后 CI 回执复查=下场会话首动作（F-CIFLK-01 纪律——docs 笔走全量 CI）。
