# 任务:P8 续推交接书(2026-08-28 会话收档版)

> 用法:新会话粘贴「按 docs/prompts/2026-08-28_next-session-handoff-v2.md 开工」。
> 前任=2026-08-28 主控会话(ENR-01/02 三屋实施收口+六雷清扫;提交链
> 6e5a3b2→17c6c78→d69c449 共 3 个)。

## 0. 开工前置(强制)

1. 第一动作=核对 push(`git log origin/main..HEAD`——前任已推净则跳)。
2. 分级阅读:AGENTS.md(工单工作流三屋节)→本文件→ADR-0017+methodology
   §4→findings 台账(发现 3 六雷收口注记+第七雷候选)。
3. 技能清点+配置自查(开工档范例=scripts/audits/2026-08-28_session-start.md)。
4. 开工自检:verify **90 文件 661 用例** exit 0;e2e **20/20**(需先 build);
   locks **138**;工单 106 **open 0**。
5. **环境铁律(本机实证)**:默认 node=v25.2.1(D:\nodejs,ABI 141)会造成
   split-pane.test 11 假红(Node25 原生 webstorage 污染 jsdom)——一切
   node/npm 命令必须带前缀
   `export PATH="/e/class/智慧水务/tools/node24:$PATH" && ...`
   (Node 24.9.0 便携版已装 E:\class\智慧水务\tools\node24;abi-cache 已有
   node-v137+v141+electron-v146 三份;子代理简报必须写明此前缀)。
   CI=Node 24 不变。

## 1. 本会话成果账

| 单元 | 提交 | 摘要 |
| --- | --- | --- |
| SR2-ENR-01 含金量抓取缓存 | 6e5a3b2 | 迁移 005 三可空列+providers 双源携带 citedByCount(零新增请求)+citedByPatch 六格状态机(0/NULL 判别 === null)+applyEnrichment 第三参独立 SET——update-meta 契约零触碰+paperDetailSchema 三 optional;INV-28 登记;主控裁决两件(migrate.test:10 单行——票面断言证伪先例 222962c/06ea570;papers.queries.ts 拆分追认 repo≤300);门二前置发现收口清短式(6 文件+005 SQL) |
| SR2-ENR-02 venueTier 映射与装配 | 17c6c78 | venue-tier.ts 真实现(三档+种子表 5 条+venueToTier 仅 trim)+corpus 装配两形(0 值禁 falsy)+manifest 成对省略(N-r2e)+INTERFACE 指标口径节+W6 sha 提示+ADR-0011 v1.2;106 工单 **open 0** |
| 排序雷清扫(六处,无工单单元) | d69c449 | lineage×2+papers.queries×3+notes LIKE+listAllIds【主控追加第六雷——序进 manifest 数组威胁 INV-17】+orderAiNotes 删末级决胜;rowid 插入序决胜统一口径;R1~R9 变异红证;第七雷候选两处入台账 |

- 成本账本(子代理口径):ENR-01 ≈12.99M tok/30.8min+ENR-02 ≈6.72M/34.4min
  +清扫 ≈8.53M/32min;本会话三单元合计 ≈28.24M tok/97.2min。
- 审计档:enr01-*/enr02-*/sweep-order-*(scripts/audits/,brief+impl.report
  +gate1.diff+双门 audit 各套)。

## 2. 待用户裁决/触发队列(本会话未做——按序)

1. **P7-F 连续滚动阅读工单化战役**:双 plan 门须用户在场——用户到场后先问
   时段再发起。素材=ROADMAP P7-F 节+findings 发现 1;F-aware 接口冻结面
   (locateAnchor 签名/annotation-order 文档序);预计 3~4 票,参照 LG 役
   60~75M;票面重量预拆实现段防 LG-03 型 30M 单元。
2. **M1 试点校准批**:语料目录已就位(E:\class\智慧水务\AI_taste——用户
   2026-08-28 移到位,含 corpus/fulltext/manifest.json/progress.json)。
   **激活纪律=用户手动触发**:主控跑 companion 拾取验证→zcode 侧三读
   (config.json 已建 D2-B 全 GLM)→回灌→渲染→synthesize 小库草稿。
3. **ENR 组用户验收清单**(W2 归责,门二口径):启动应用(迁移 005 自动
   应用——真库现 user_version=4/papers=4)→手动增强一篇(INV-08 出网仅
   手动)→导出→manifest 抽查 citedByCount/venueTier/citedByFetchedAt
   两字段+时间戳。
4. 其余视检项:findings §2 用户自填区五项卡(发现 4/5/6 脉络打磨/分类
   来源裁决/需求 A UI 风格=P7-D 立项输入)。

## 3. 已知遗留与教训(本会话沉淀)

- **票面「不依赖 X」类断言两度被证伪**(W4a 教训延续):ENR-01 migrate.test
  「零涟漪」断言(门审漏看 :10 字面量断言行)——工单化门审对「零涟漪」
  推导必须逐行核对被排除文件的全部断言形态,不能只看推导涉及的行。
- 实现者测试小改动漏报(W1 型):corpusSet({paperId}) 与空请求契约相悖的
  顺手改动——门一逐 hunk 核对受锁测试是必要防线(本次拦截+主控还原)。
- 同型雷第七批候选(findings 发现 3 追加):annotations page+sort_key 平局
  /collections position 撞号——低频,另立清扫单元待排。
- sqlite-abi.mjs:103 `electronVersion` 未定义掩盖真错误(受锁;触发面=仅
  缺绑定错误路径)——顺手单元候选,修=unlock→改→apply+[locked-change]。
- locks/manifest.json CRLF 警告=git LF 归一口径内(历会话已核);本会话
  git log 控制台偶发乱码显示=显示层问题(git 对象亲验 UTF-8 完好)。
- dev-launch.cmd 与 dist_new/ 未跟踪残留照旧(用户侧/历史)。

## 4. 关键指针

| 对象 | 位置 |
| --- | --- |
| 本会话开工档(技能清点+环境事件实录) | scripts/audits/2026-08-28_session-start.md |
| ENR 组三件套票面+双门档 | scripts/audits/enr-ticketing-*、enr01-*、enr02-* |
| 清扫单元全套 | scripts/audits/sweep-order-* |
| findings 台账(六雷收口+第七雷候选+§3 索引) | docs/reports/2026-08-27_visual-check-findings.md |
| INV-28(被引缓存刷新语义) | docs/invariants.md |
| Node24 便携版 | E:\class\智慧水务\tools\node24 |
| M1 语料目录 | E:\class\智慧水务\AI_taste |
| 真库 | %APPDATA%\Synapse Remake\synapse.db(user_version=4,迁移 005 待启动应用) |
