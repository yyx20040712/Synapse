# 任务:P7-F 战役收官后交接书(2026-08-28 会话末版)

> 用法:新会话粘贴「按 docs/prompts/2026-08-28_next-session-handoff-v3.md 开工」。
> 前任=2026-08-28 全日主控会话(ENR 组+六雷清扫+M1 收档+P7-F 全役;提交链
> 406b1f6→2b5fd46 共 6 个已推净)。

## 0. 开工前置(强制)

1. 第一动作=核对 push(`git log origin/main..HEAD`——前任已推净则跳)。
2. 分级阅读:AGENTS.md(三屋节+**methodology §4.1 新条款:取证禁触
   tickets/,e2e 取证用 spec 备份法**)→本文件→docs/reports/
   2026-08-28_p7f-campaign.md(战役报告)。
3. 技能清点+配置自查(范例=scripts/audits/2026-08-28_session-start.md)。
4. 开工自检:verify **93 文件 723 用例** exit 0;e2e **22 过+0 skip**
   (需先 build);locks **142**;工单 110 **open 0**。
5. **环境铁律**:一切 node/npm 命令带前缀
   `export PATH="/e/class/智慧水务/tools/node24:$PATH" && ...`
   (默认 node=v25 假红——jsdom webstorage 污染,开工档有实录)。

## 1. 本会话成果账(全部已收口+推送)

| 单元 | 提交 | 摘要 |
| --- | --- | --- |
| SR2-ENR-01/02 含金量供给组 | 6e5a3b2/17c6c78 | 迁移 005+citedByPatch+venueTier 装配;INV-28 |
| 排序雷清扫六处 | d69c449 | rowid 决胜统一;第七雷候选入台账 |
| M1 试点批 | (非提交,收档) | 三读 4/4+回灌 88 行+synthesize;lineage 草稿=桌面 lineage-draft-m1.json;提案回填(ADR-0012 条件二/元数据勘误 2 篇) |
| P7-F 工单化 | 62d84bb | 四票五层+三门链+用户 plan 门(「保持连续滚动」) |
| SR2-F-01 页列几何 | f20c2fd | PageColumn 五段+PdfCanvas 拆分删除+INV-29/30 |
| SR2-F-02 四层收口 | 31b3a07 | 动态锚定根+页限定+跨页拒绝;W1 教训入模板 |
| SR2-F-03 滚动进度键位 | aba9da0 | 六态状态机+W3/N4 并入+INV-31/32 |
| SR2-F-04 缩放收官 | 2b5fd46 | geometry 拆分+缩放中心锚+收官七段 e2e+INV-33 |

- 战役报告:docs/reports/2026-08-28_p7f-campaign.md(成本全役 ≈63.52M
  tok/305min;门二预估 50~90M 落区间中部)。
- 本会话子代理总成本:ENR 组 ≈19.71M+清扫 ≈8.53M+P7-F 全役 ≈63.52M
  +M1/地图/杂项 ≈1.5M ≈ **93M tok**(三屋模式单会话承载上限再证)。

## 2. 待用户队列(战役后)

1. **P7-F 用户走查(战役最终验收)**:启动应用走查连续滚动阅读——滚动
   跟手度/缩放中心不跳/fit-width 贴合/长文献内存(任务管理器 canvas 回收)
   /PageDown·空格键位/进度恢复(关重开回记忆页)。
2. **ENR 真机验收**:启动应用(迁移 005 自动——真库 user_version=4 待
   启动)→手动增强一篇(INV-08 出网仅手动)→导出→manifest 抽查
   citedByCount/venueTier/citedByFetchedAt。
3. **M1 草稿接生**:桌面 lineage-draft-m1.json 经脉络视图导入(四节点
   Darcy→Reynolds→Cross/Kries 谱系树,推断边 label 标注供策展裁决)。
4. findings §2 视检自填区(发现 4/5/6 脉络打磨+发现 5 分类来源 v1 手动
   标记已裁+需求 A UI 风格 P7-D 立项输入)。

## 3. 遗留与候选(下会话池)

- 第七雷清扫两处(annotations page+sort_key/collections position——低频)。
- sqlite-abi.mjs:103 electronVersion 掩盖真错误(受锁顺手单元)。
- 脉络打磨小单元(发现 4+6+发现 5 手动标记)——P7-F 后可排。
- P7-D 立项(需求 A:崩铁+aquaresearch 风格锚两处)。
- DEV-SETUP 可补「新机 Node 版本铁律+tools/node24 便携版路径」条目。
- onVisibleChange prop 生产零消费(F-04 门一 N4:后续消费或删);
  canvas≤5 断言收紧 ≤4 候选(稳态实算 3)。
- anchor-locate/scroll-progress 头注「工单:open」状态行陈旧(门二 N 级
  记账——先例保留口径,registry=唯一状态源)。

## 4. 关键指针

| 对象 | 位置 |
| --- | --- |
| P7-F 战役报告 | docs/reports/2026-08-28_p7f-campaign.md |
| 全役审计档 | scripts/audits/p7f-ticketing-*、f01-*~f04-* |
| ENR/清扫审计档 | scripts/audits/enr01-*/enr02-*/sweep-order-* |
| 开工档(Node 环境实录) | scripts/audits/2026-08-28_session-start.md |
| INV-28~33(本会话新增六条) | docs/invariants.md |
| Node24 便携版 | E:\class\智慧水务\tools\node24 |
| M1 语料/草稿 | E:\class\智慧水务\AI_taste;桌面 lineage-draft-m1.json |
| 真库 | %APPDATA%\Synapse Remake\synapse.db(user_version=4) |
