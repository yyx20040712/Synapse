# 交接书 v126 —— 对齐批单元四 A 收口场：INV 改写登记+D 批 DDL 挂账（2026-10-04）

> 前承 v125（单元二收口）。本档=同日续场：单元二 CI 首查收口→单元四 A
> 笔（小批：INV 改写+三新 INV 登记+治理台账）全门链（主控亲执→k1 单审
> →RR1 回炉→k1 delta 复核 PASS→主控亲验→提交推送）。

## §0 本场消耗与开工记录

用户指令=「上下文余量宜继续开工小票/中票，征询建议」。主控给盘点+推荐
（单元四 A+B 连开=A 批优先；A 批余项需用户明确指令未动；D 批/悬浮笔记
批不適合当前上下文）后按默认序（v125 §4）开工 A 笔。技能：ai-dev-org=用
（分级烤验小批单审路径）；verification-before-completion=用（亲验 verify）。
配置=主控单岗（GLM5.3 宿主）；k1 绑定 $max 两轮（单审+delta）。

## §1 基线终态（对不上禁提交）

- 仓库=06260db61c1（单元四 A docs）已推送；工作树清洁；locks 353 同步。
- **锁同步补丁（本场自查捕获）**：06260db61c1 提交时漏含 manifest（
  locks:apply 产生的两 docs sha 更新滞留工作树——push head 锁不同步会使
  该 run CI locks:check 红）；已即时追加补丁提交（含 manifest+本档）恢复
  head 一致——**下场 CI 首查时 06260db61c1 的 run 若红即此因**（补丁后
  head 的 run 绿为准），教训=收口提交清单必含 locks/manifest.json（受锁
  docs 改动批同样适用——此前误以为仅代码批涉锁）。
- **CI 待出**：06260db61c1 的 run（docs-only——低风险）——下场开场首查。
- **单元二 CI 首查已收口（本场开场）**：4b18a01c61d 专属 run 37197263483
  被 v125 push concurrency 取消（非失败）；87b55abc823 的 run 37197351142
  =success 且树上含单元二全部代码——六道关卡全绿（lint/单测 2605/指纹门
  /build/**e2e**/范围闸），单元二代码面 CI 验证达成。

## §2 单元四 A 落地（commit 06260db61c1，2 文件 +11/−6）

**交付面**：
- **invariants.md**：INV-88 改写（[F-ALIGN-01 注记]两路=挂接导入落夹建节点
  〔D3 单跳〕/moveFolder 自动建与随迁；主题节点子句+「未归档归主图」子句
  随对齐批退役；ensurePaperFolder 转角色；K1 五形态正向锚；声明列
  import/library 括注同步+lineage.service 承载弱化注记）+INV-92 两态化
  （unfiled 退役——c5 改写族）+INV-87 作用面收缩注记（代码面零改）
  +INV-91 威胁模型边界注记（导入新增节点不在威胁面——单元二 d1-W1 主控
  裁决）+INV-93 移出子句退役注记（声明/测试列面同步）+**三新 INV 登记**
  （INV-NEW-1 节点唯一来源两路〔部分——词表挂 B 笔〕/INV-NEW-2 文献必在
  文件夹〔部分——DDL 挂㉓〕/INV-NEW-3 域删容器〔已锚定〕）。
- **defense-lifecycle.md**：㉓ D 批 DDL 收紧挂账（W2 条件三 DDL：①lineage_nodes
  重建顺带 paper_id NOT NULL②papers.folder_id NOT NULL③SET NULL 动作改判
  ——附退出条件〔三 DDL 落地后本行退役+INV-NEW-2 升 DDL 锚定〕+评审触发器
  〔D 批 DB 战役启动〕）+头注行集 22→23。

**门链**：主控亲执（文档批）→k1 单审 **B1W2N4 FAIL**（B1=㉓ 行 6 格结构
错位——评审触发器误作独立列；W1=INV-93 列面滞后/W2=INV-92 测试列三态
残留）→RR1 五项回炉（主控亲执）→k1 delta 复核 **B0W0N2 PASS**→两 N
随手收（行文顺序+lineage.service 括注）→主控亲验 verify **EXIT 0**+quality
绿+locks 353。分级烤验=小批单审成立（纯文档 2 文件）。

## §3 挂账与登记

- **单元四 B 票面（下场首办）**：①负锚词表入 quality（词表=upsert-node/
  addPaperNode/addThemeNode/lineage-add-node/LineageAddNodeDialog——W6 口径；
  scripts/check-quality.mjs 扩段〔受锁〕）+治理登记（defense-lifecycle 词表
  行——W11 口径：退出条件=词表项全灭退役/触发器=A1b/A3 收窄联动）；
  ②exemptions 终审（stale 157 条清点——门二 A3 观察）；③**基线再生成**
  （npm run test-surface:baseline+全量 diff 审计——信任根操作，须整场
  连续完成禁断档）；④ADR-0014 修订（主题节点/手动建点退役——实体面）+
  architecture §6 实体表回写。
- **A 批余项**（A1b/A2/A3）：需用户明确指令（v124 口径）；票面已按
  patch-node 口径对齐。
- **B 批新立案（承 v124/v125）**：工具条几何遮挡（涉 A12 交互语义——B 批
  呈裁时定）。
- 单元四 B 毕=对齐批收官。

## §4 新会话开工序

1. CI 首查：06260db61c1 的 run（docs-only）+复核 v126 本档 run。
2. 单元四 B 启动（**连续场**：基线再生成+全量 diff 审计一气呵成——建议
   预留完整一场；词表入 quality 与 ADR 回写可先行落）。
3. 视指令穿插 A 批余项。

## §5 操作条款存续

承 v125 §5 全项。本场新增口径：**治理表登记行格式=主控亲验点**（k1-B1
格数错位先例——登记表 Markdown 行格数与列数一致性目前无 机检，落笔后
自数竖线；机检候选=check-quality 扩表行格数校验，挂 B 笔词表扩段时
顺带评估）；**建议征询场景的默认序执行**（用户征询+默认序已在交接书
开工序中=直接开工默认序不另问，A 批类需明确指令面除外）。账本（本地件）
621→623（本场两行：gate1 两轮/commit）。
