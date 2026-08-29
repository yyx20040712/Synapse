# R2-LG12 票面——综述多参考边数据面（U2b——用户裁决 A 完整方案）

> 工单：R2-LG12 / area: lineage / owner: strong / 模式：三屋（ADR-0017）
> 裁决母本：handoff-v3 §3 U2b 预裁倾向+**用户裁决 2026-08-29「A. 完整多参考边」**
> （AskUserQuestion 在案）。前役地基：R2-LG11（geom Map/综述右列/淡灰虚线
> 渲染+surveyIds 管道已就绪——E.② 接缝预留兑现）。
> 主控：2026-08-29 LOOP 会话。

## 1. 行为层（验收面）

**决3 后半句兑现**：「综述应该……用很淡的灰色虚线连接涉及的重要的文章」
=一条综述节点可向多篇文献发**参考边（ref）**——绕开树单父限制的**受控豁免**：

- **数据模型**：lineageEdge 增 `kind: 'tree' | 'ref'`（**出口 schema 必填**
  ——DB NOT NULL DEFAULT 'tree' 旧行迁移后总有值；**upsert 输入可选**缺省
  'tree'——service 显式填）；draft 协议**零改**（梳理草稿=树语义，ref 边
  仅应用内手工创建——v1 预裁，票面申报）。
- **写守卫（service 层=不变量宿主，UI 限制不算守卫）**——upsertEdge 分支：
  - `kind:'ref'` 时：**豁免多父守卫**（to 可已有 tree 父/多条 ref 入边
    合法）；**仍拒环**（环检测图=全部边含 ref——综述自己也可能在某树内，
    tree+ref 混合环真实可达）；自环/悬空/重复边（同向同 kind？**重复边
    收口扩义**：tree 与 ref 同 from→to 算两条不同边？**预裁：算重复拒**
    ——同端点对只允许一种 kind，语义清晰防重线）；**from 必须是综述节点**
    （isSurveyTitle 判定——见 §2 单源），非综述 from 的 ref 边拒（中文
    reason「参考边只能由综述节点发出」）。
  - `kind:'tree'`（缺省同）：现行为零变（INV-27 原样）。
- **读面**：listGraph 返回带 kind；**布局剔除 ref 边**（layoutLineage 净化
  段——ref 边不进树/右列计算，仅渲染消费；综述节点位置=右列语义不变）。
- **渲染**：`kind:'ref'` 边=淡灰虚线 2-3 `var(--survey-edge)` 1.4（与 U2a
  「综述关联 tree 边」同视觉——决3「很淡的灰色虚线」单语义；判定优先级
  ref>综述关联>推断>普通）。
- **UI 入口**：综述节点右键菜单增「**添加参考连接**」（仅 data-kind=survey
  节点显示——菜单项级限定+service 双守）；进入连线模式（复用 pending-link
  管道，kind 参数扩展）→点目标文献→upsertEdge(kind:'ref')→toast 成功/
  拒绝 reason（CONFLICT 丢弃不卡队列——既成语义）。
- **INV-27 修订登记**：表述改为「tree 边单父无环（原语义）；ref 边（仅
  from=综述）豁免单父、仍拒环、同端点对与 tree 互斥」——invariants.md
  修订（引用本票+用户裁决）。

## 2. 接口层

- `src/shared/models/lineage.ts` [受锁]：
  - lineageEdgeSchema/lineageEdgeUpsertSchema 增 kind（出口必填 enum/
    upsert 可选）；draft schema 零改。
  - **isSurveyTitle(title) 上移本文件导出**（SURVEY_KEYWORDS+纯函数——
    service/renderer 单一真相源；R2-LG11 出度修正教训=约束公式单源）。
  - renderer `lineage-classify.ts` 改 re-export isSurveyTitle（消费面
    classify.test/visual.test/Canvas/NodeCard **零改**）。
- `src/main/db/migrations/006_lineage_ref_edges.sql` [受锁新增]：
  `ALTER TABLE lineage_edges ADD COLUMN kind TEXT NOT NULL DEFAULT 'tree';`
  （追加式迁移器既有语义；旧行默认 tree=幂等零数据搬迁）。
- `lineage.repo.ts`：upsertEdge/listGraph 带 kind 列（SQL 参数绑定照旧）。
- `lineage.service.ts`：upsertEdge §1 分支（graph 取 from 节点 title 判
  isSurveyTitle；环检测 reachable 图含 ref 边）。
- renderer：`LineageNodeMenu`（survey 节点菜单项）、`LineageBoard`
  （pending-link kind 扩展）、`LineageEdges`（ref 判定优先级）、
  `lineage-layout.ts`（净化段剔 ref）。

## 3. 架构层

- 分层不破：kind 流向=DB→repo→service→ipc→renderer（shared 单源）；
  isSurveyTitle 驻 shared/models（main/renderer 双侧 import 合法）。
- 零新依赖；文件行数红线照旧（service 现 327+分支约 +45 ≤500）。
- 迁移受锁+shared 受锁+service 测试受锁=[locked-change] 批次。

## 4. 生命周期层

- 不做：draft 协议 ref 面（v2 若梳理智能体产物需要再议）、ref 边 label
  编辑（v1 空串）、D2 字段化综述判定（遗留池既有）。
- 兼容：既有 tree 边行为/视觉零变；旧库迁移幂等（DEFAULT 兜底）。

## 5. 文化层（测试面+纪律）

- **service 单测**（lineage-import.test [受锁] 加 describe 或新文件——
  实现者定，申报）：ref from 综述 ✓落库 kind/ref from 非综述拒（中文
  reason）/ref to 已有 tree 父 ✓（豁免面）/ref 成环拒（tree+ref 混合环
  夹具）/同端点对 tree+ref 重复拒/ref 自环拒。
- **layout 单测**（layout.test [受锁] 加 it）：ref 边不进树占位（树形状
  与无 ref 输入恒等）。
- **渲染单测**（visual.test [受锁] 加 it）：ref 边 stroke/dash 精确值+
  优先级（ref+label 含「推断」→survey-edge 色非推断色）。
- **e2e**（lineage.spec [受锁] 加 T5，test.slow）：导入（fixture 含综述）
  →综述右键「添加参考连接」→点目标→ref 边渲染（path 断言 stroke var
  (--survey-edge)）→reload 持久+树形不变（data-viewport 节点计数）。
- TDD 首 红→绿→变异红证 ≥3（ref 豁免分支删除/环检测图漏 ref/优先级翻转）；
  cp 备份法；npm run test 禁裸 vitest；verify 真退出码落盘
  `r2-lg12-*.log`；locks 164→（+006 迁移+新测试文件+lineage.spec/
  import/layout/visual/models 改动）→apply 后申报实数。
- 基线锚：HEAD=dc974cf；verify=106 文件 875 用例/locks 164/open 0；
  e2e 25 passed。

## 6. 交付文件清单（预期）

改：shared/models/lineage.ts、lineage.service.ts、lineage.repo.ts、
lineage-import.test、lineage-layout.ts、lineage-layout.test、
LineageEdges.tsx、lineage-canvas-visual.test、LineageNodeMenu.tsx、
LineageBoard.tsx、tests/e2e/lineage.spec.ts、renderer/lineage-classify.ts
（re-export）、docs/invariants.md（INV-27 修订）。
增：migrations/006_lineage_ref_edges.sql（+若干 service 测试文件——
实现者定）。删：无。

## 7. 主控预裁（③段）

1. draft 零改（§1 申报）；2. 同端点对 tree+ref 互斥=重复边拒；3. ref 边
仍拒环（混合图）；4. isSurveyTitle 上移 shared/models+renderer re-export；
5. service 显式填缺省 'tree'（不赖 DB DEFAULT——写路径显式）；6. 菜单项
仅 survey 节点显示（data-kind 判定）；7. e2e T5 独立 userData（既有 T*
模式）；8. 用例数预测=875+service 6+layout 1+visual 1=883±2（e2e 25→26）。
