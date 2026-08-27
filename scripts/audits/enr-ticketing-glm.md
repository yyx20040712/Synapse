# 门二终审档：SR2-ENR-01/02 工单化票面（plan 门终审——审票面，无实现面）
日期：2026-08-27 · 审对象：scripts/audits/enr-ticketing-draft.md（v2 处置台账版）
审计人：门二终审孙代理（三屋模式 ADR-0017 · 独立于门一与主控） · 权限：只读 +
本档唯一可写 · 模型：GLM-5.3（builtin:bigmodel-coding-plan/GLM-5.3）——配置自查过

## 技能清点（宪法开工纪律）
- code-review-excellence：用——终审对抗方法论主体（每结论 file:line 证据）。
- verification-before-completion：用——「说了已改」逐条实证，拒绝礼貌性通过。
- systematic-debugging：不用——纯票面终审，无运行时缺陷定位面。
- test-driven-development / subagent-driven-development：不用——本单零实现零
  派发（审查端，非实现端）。
- 只读纪律执行：无 npm/无测试/无 git 写；唯一写=本档。

## 证据基线（全部实读）
票面 v2 全文；门一档案 enr-ticketing.audit.raw.txt 全文（r1+r2）；ADR-0011 全文；
P8 提案全文（§3.2/§4.3 重点）；locks/manifest.json 全量 132 条；check-tickets.mjs
全文；papers.repo.ts / paper.ts / enrich.service.ts 全文；corpus.assemble.ts 头部；
crossref.ts / openalex.ts schema 与解析面定点；corpus.export.service.ts now 注入先例
（:145/:182）；constants.ts:19 ALLOWED_REMOTE_HOSTS；ROADMAP P7-C(:210)/P7-G(:226)
标题行；registry.ts TicketArea(:19-34)；import.service.ts:123；corpus.assemble.test.ts
guardedDescribe(:89/:207)；enrich.service.test.ts detail 夹具(:38 起)。

================================================================================
## 六点清单式结论
================================================================================

**① 处置核对：PASS** —— r1 四阻断/七警/四注记 + r2 两新警共 17 项处置，
逐条在 v2 票面验证「说了已改」属实：
- B1（结构性消除）：v2 行 8/38-43——citedByCount 由瀑布同一响应携带，复验
  crossref.ts workSchema(:43) 解析 message 体、openalex.ts resultSchema(:35)+parse
  (:96) 均出自同一次 fetchJson，解析加字段即得，零新增请求=零独立 metrics 异常面；
  citedByPatch 纯函数瀑布后求值（无 IO）；「并入既有 try」表述已从票面消失；
  enrich.service.ts:87-122 现状单 try/catch（catch 唯一动作 work=null，:119-122）
  与票面新设计不再冲突——不存在「元数据成功+metrics 失败」态，failed=诚实。
- B2（通道闭合）：v2 行 77-80——paperDetailSchema(.strict()) 增三 .optional()、
  PaperRow 三列 ?: 可选；复验 paper.ts:33-45 与 papers.repo.ts:44-60、
  import.service.ts:123 字面量构造、enrich.service.test.ts detail 夹具零涟漪成立；
  DETAIL_SQL（papers.repo.ts:118-121）显式列清单须同步——票面「detailById 透出」
  （:121-122）已覆盖该义务。
- B3（清单重列）：多标摘除（corpus.assemble.ts/interface-template.ts/registry.ts
  标非锁=v2 行 190-191/125/199-204，与 manifest 实况一致）；漏列补齐（providers
  双测试 :123/:128、corpus.export.test.ts :188/:193、migrate.ts :123）；错报删除
  （migrate.test.ts 出清单，:89 声明零涟漪——与其 :11 动态 Math.max 断言相符）；
  文件名圆点更正（:189/:193-194 corpus.assemble.test.ts）。
- B4（模板义务）：v2 行 104-105/192——两单文化层均入「verify 真退出码行（echo
  exit=$? 落盘）+变异还原记录（cp 备份→变异→红→还原→diff 空输出入日志），缺=拒收」
  ——提案 §4.3「SR3-ENR 工单化时须落实进派发模板」义务落实，可执行措辞。
- W1：行 70-76——metrics 走 applyEnrichment 独立可选参数，PaperMetaPatch/
  PATCH_COLS/paperMetaPatchSchema 零触碰；复验 paper.ts:48-59 头注契约与
  papers.repo.ts:90-97/157-167 现状——update-meta 开洞消除，契约头注不动。
- W2：行 48/51 表格显式含 0、行 54-55 判空铁律「=== null 禁 ??/falsy」、行 56-57
  跨格序列 0 值样本（NULL→0→5→异常保留→装配仍带 5）。
- W3：行 63-64/117——arxiv.ts 零改动口径唯一化，组装点 enrich.service.ts:99-100
  （实读确认 `work = { ...ax, venue: '', doi: null }`）补 citedByCount: null。
- W4：行 97（always-active 裸 describe）/185（ENR-02 新用例不挂 C-02 块；golden
  字面量改动在既有块内合法）——guardedDescribe('SR2-C-02') 宿主实证 :89/:207。
- W5：行 172-174/196——随单 ADR-0011 v1.2 补注行 + docs/adr/0011 标非锁（manifest
  实无 docs/**）。
- W6：行 150-153——sha 消费者提示原文落位 INTERFACE 口径节。
- W7：行 158-171——VenueTier='T1'|'T2'|'T3'/VENUE_TIER_MAP Readonly<Record>/
  venueToTier(venue): VenueTier|null（''→null、精确等值仅 trim）/citedByPatch 完整
  签名（与 applyEnrichment 参数形状一致）。
- N1-N4：行 111-115（骨架头注 "- " 前缀防御）/143-145（头指针保持 P7-C+裁决链入
  summary）/213-217（骨架先建时序+e2e 条件性全量 verify）/91-92（不做边界四件套）。
- W-r2a：行 125-127——papers.repo.test.ts 受锁扩真库 SET 断言入清单（SQL 面唯一
  锚定，enrich 测试全桩属实）。
- W-r2b：行 66-71——citedByPatch 签名含 now: () => string 注入，先例
  corpus.export.service.ts:145 `now?: () => string` 实证存在。

**② 母本符合度：PASS** —— 对照 ADR-0011：字段名 citedByCount/venueTier 与
§front-matter 原文一致；可选语义（有值装配/无值省略两形）符合演进规则「新增字段
必须可选」；schemaVersion 恒 1（预裁 5）符合「不升版本」；取数时间戳+citedByCount
缓存值口径、三偏倚归 AI 侧、INTERFACE.md 声明义务（行 94-95/150-158）与 ADR §D4
段原文逐点对应；「允许用户改」字面张力由 v1.2 修订注（受锁常量修订制=D3-A 用户
拍板，UI 面留 D3-B）合规闭环。对照提案 §3.2 D3-A 档边界：两单量级/无重试预算/无
venueTier 编辑 UI/ENR-03 不立项，边界守住。两处与提案字面偏离均合法有据：缓存
宿主 papers 加列——提案明示「plan 门须定」的裁点，v2 预裁 2 给出 003/004 追加
先例+001 不动的论证；area='service'——修正提案「area=enrich」笔误（TicketArea
枚举实无 enrich，registry.ts:19-34 实证，机检会红，修正方向正确）。

**③ 宪法红线终审：PASS** —— 状态机表（v2 行 46-57）含 0 值格（行 1/4 显式
「含 0」）、NULL 格、异常格（work=null）、命中-null 格，跨格序列（行 56-57）
覆盖 写入→刷新→异常保留→装配 全链，态空间完备（行 5 两断言态合并一格的轻瑕疵
见残留 N1，行为层 41-43 已声明无歧义）。受锁面标注 vs manifest（132 条实数）
抽查 10/10 全对：在锁——papers.repo.test.ts(:209)/corpus.export.test.ts(:417)/
corpus.assemble.test.ts(:413)/paper.ts(:117)/providers 双测试(:461/:465)/
enrich.service.test.ts(:421)；确不在锁（多标摘除属实）——corpus.assemble.ts/
interface-template.ts/tickets/registry.ts/src/main/db/migrate.ts/docs/**（manifest
src/main 面仅 migrations 001-004）。分层单向：cited-by.service=纯函数零 SQL
（刷新决策单源），SET 子句留 papers.repo（行 72-76 声明 db.prepare 参数绑定），
ipc→services→repos→db 不破。出网红线：零新增网络请求（同响应携带）+白名单零
新增（验收 grep ALLOWED_REMOTE_HOSTS，constants.ts:19 实存）+生命周期层「不做：
独立重试/单独触发/批量/后台定时」——手动触发红线全守。[locked-change] 义务清单
齐：受锁扩五件+新增入锁三件（005/cited-by.test.ts/venue-tier.ts）均标注
generate→apply 流程与尾注义务。

**④ 机器面核对：PASS** —— 对照 check-tickets.mjs 实际规则：id 正则
`SR2?-[A-Z]+-\d+`（:22/:72）命中 SR2-ENR-01/02；area 'service' ∈ TicketArea；
b3 指针 P7-G ∈ 已裁决集（ROADMAP.md:226 `### P7-G：` 全角冒号标题行），ENR-02
指向文件 corpus.assemble.ts 头指针 P7-C ∈ 集（:210）故规则 6 过（只查属于集，
不查对应——N2 口径正确）；两条 registry 草案五必填字段齐、无嵌套花括号（objRe
`\{[^{}]*\bid:` 约束过）、file 正斜杠、summary 无单引号（fieldOf 捕获不破）；
骨架先建时序（规则 1 文件存在性）与头注指针位置规则（:180-182 首个代码语句前）
票面均有防御注记。代码面引用三处实读全对：papers.repo.ts detailById=275-297
（票面引 284-292 落在返回构造段，显式列 DETAIL_SQL 须扩属实）；enrich.service.ts
:87-122 单 try/catch 瀑布+99-100 组装点逐字吻合；corpus.assemble.ts:18 预留位
原文（「可选含金量字段 citedByCount/venueTier 数据面未落地——v1 整键省略」）
即 ENR-02 兑现点，吻合。

**⑤ 成本账本：已记** —— 门一 r1 1.13M tok/8.0min + r2 复核 0.29M tok/2.3min
（主控汇出）；门二本档 ≈0.6M tok/≈7min（估计——按工具回执体量与回合数推算，
非实测）。战役累计口径由主控汇入交接书。

**⑥ 可派发性（终审标准）：PASS** —— 票面自足：五层规约齐、类型签名与表形状
已定、文件清单可照单 staging、受锁/非锁逐条标注、机检时序与防御注记在、状态机
+跨格序列交审计口径在、依赖序（ENR-01→02 串行）明示。实现者只读票面+先例池
（corpus.export.service now 注入/fillEmptyPatch 判空风格/003/004 迁移追加）即可
开工，无契约面需自裁。

================================================================================
## 残留 N 级收口建议（非阻断，主控落文件时一句话吸收；门二只读不改票面）
================================================================================
1. [N-r2a] 状态机表行 5（v2 行 52）「命中但 null / 未命中异常」两断言态（done vs
   failed）合并一格——建议拆两行防测试只取一态（行为层 41-43 已声明，程度轻）。
2. [N-r2b] VENUE_TIER_MAP 种子键 canonical 形式（大小写）未定死——建议一句
   「键=provider display_name 原形（精确等值、仅 trim），不做 toLowerCase 归一」。
3. [N-r2c] 「新 venue-tier 测试（新入锁）」无落点路径——建议补
   tests/unit/shared/venue-tier.test.ts 显式入清单（LG-04 精神）。
4. [N-r2d] zod 严格性边界建议入票注记：metrics 字段类型脏→整个 work parse 失败
   →failed 属诚实语义，禁用 .catch() 宽松化引入「部分信任」分支。
5. [N-r2e] 文件清单「migrations/005_cited_by.sql」建议写全
   src/main/db/migrations/005_cited_by.sql；manifest 条目建议补一句配对省略规则
   「无 citedByCount 则无 citedByFetchedAt」。
6. [轻] applyEnrichment 的 citedBy「独立可选参数」未明示是 e 内字段还是第三参
   ——repo 内部接口（非锁非 shared），实现者可自裁+申报，无契约面风险。

================================================================================
## 统计与总结论
================================================================================
- 处置核验：17/17 属实（B1-B4 + W1-W7 + N1-N4 + W-r2a/W-r2b）。
- 母本对照：ADR-0011 六点+提案 §3.2 D3-A 边界五点，全符（两处字面偏离均有据）。
- locks 抽查：10 项在锁/5 项非锁，10/10+5/5 与 manifest 一致，零多标零漏列。
- 机器面：id/area/b3 指针集/条目格式 4/4 过；代码面引用 3 主+6 辅定点全对。
- 新发现：0 B / 0 W / 6 N（5 条为 r2 已列转收口项，1 条轻注；无新增阻断或警级）。

**总结论：PASS——票面可原样落文件派发**（上列 6 条 N 级由主控落文件时顺手吸收，
吸收与否不改变 PASS 判定；实现者超票面自裁申报义务不变）。
================================================================================
