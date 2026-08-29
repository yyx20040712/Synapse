# R2-LG12 实现者报告——综述多参考边数据面（三屋·实现者子代理）

## 1. 摘要

- 模型：GLM-5.3（builtin:bigmodel-coding-plan/GLM-5.3），思考等级 high。
- 完成态：**实现+单测+e2e spec+变异红证+locks+verify 全绿**（verify exit=0，106 文件
  **883 用例**全过——票面预测 883±2 精确命中）。e2e T5 spec 已写好（25→26），
  真跑归主控收口（票面基线声明：本单只跑 unit 级 verify）。
- 交付主线：kind 列（006 迁移）→ repo 读写 → service ref 分支（豁免多父/拒混合环/
  同端点对互斥/from 综述双守）→ shared 出口 kind 必填+isSurveyTitle 上移单源 →
  ipc/schemas/store kind 透传 → 菜单项「添加参考连接」（survey 文献节点限定）→
  Board pending-link ref 模式 → layout 净化段剔 ref → LineageEdges 直读 e.kind
  （优先级 ref>综述关联>推断>普通）→ INV-27 修订登记。
- TDD 序：service describe 先行红（4/6 失败——另 2 用例为守卫锚+变异靶，M2/M4
  补证可红）→ 实现绿 → renderer 链（随实现同批测）→ 变异红证 4 档全红+还原 diff 空。
- 用时：约 70 分钟（单会话）。

## 2. 文件清单（行数——全部 ≤500 红线内，verify lint 绿为权威）

改（src）：
- `src/shared/models/lineage.ts`（140）[受锁]：kind 必填枚举+lineageEdgeKindSchema 导出+
  SURVEY_KEYWORDS/isSurveyTitle 上移导出+upsert kind 可选。
- `src/main/db/migrate.ts`：006 追加（import+MIGRATIONS 版本 6）。
- `src/main/db/repos/lineage.repo.ts`（235）：kind 列 INSERT/UPDATE+toEdge 归一
  （row.kind==='ref'?'ref':'tree'）+run 显式 `input.kind ?? 'tree'`。
- `src/main/services/lineage/lineage.service.ts`（350）：upsertEdge ref 分支
  （§1 全守卫矩阵）+importDraft 重灌显式 kind:'tree'+成环 reason 混合图语义更新。
- `src/main/ipc/lineage.ts`：upsertEdge 透传 kind。
- `src/shared/ipc/schemas.ts` [受锁]：lineageUpsertEdgeReqSchema 增可选 kind
  （枚举单源引 models）。
- `src/renderer/features/lineage/lineage-classify.ts`（34）：isSurveyTitle as isSurvey
  re-export（消费面零改）；isCore 改引单源。
- `src/renderer/features/lineage/lineage-layout.ts`：净化段 `if (e.kind === 'ref') continue`
  （不计 dropped 不 warn——有意分流）。
- `src/renderer/features/lineage/LineageEdges.tsx`（83）：survey 判定并集
  `e.kind==='ref' || surveyIds…`（ref 与综述关联同视觉——决3 单语义）。
- `src/renderer/features/lineage/LineageNodeMenu.tsx`（93）：「添加参考连接」菜单项
  （仅 `node.paperId !== null && isSurvey(node.title)` 呈现）+onAddRefLink prop。
- `src/renderer/features/lineage/LineageBoard.tsx`（233）：PendingLink mode 增 'ref'+
  MODE_HINT+handleNodeClick 分派 linkRefNodes。
- `src/renderer/features/lineage/lineage.store.ts`（286）：linkRefNodes 动作+
  applyAction kind 透传。
- `docs/invariants.md`：INV-27 修订（tree 原语义/ref 受控豁免条款+R2-LG12 引用）。

增：
- `src/main/db/migrations/006_lineage_ref_edges.sql`（11）[受锁新增]：
  `ALTER TABLE lineage_edges ADD COLUMN kind TEXT NOT NULL DEFAULT 'tree';` 单语句。

改（tests，全在 unlock 批内）：
- `tests/unit/services/lineage-import.test.ts`（424）：+describe「R2-LG12 参考边
  upsertEdge 写守卫」6 用例（见 §4）。
- `tests/unit/renderer/lineage-layout.test.ts`（459）：+1 it（ref 不进树占位——
  双覆盖综述作 from 使夹具对剔除分支删除敏感：恒等断言+单链对齐锚+零 warn）；
  edge 工厂加 kind 参数（默认 'tree'）。
- `tests/unit/renderer/lineage-canvas-visual.test.tsx`（250）：+1 it（ref 直读精确
  视觉 stroke/dash/width+优先级负锚 not #8a94a6）；工厂同上。
- `tests/unit/db/migrate.test.ts`：appliedVersions [1..5]→[1..5,6]（加迁移必然）。
- `tests/e2e/lineage.spec.ts`（594）：+T5（test.slow，独立 userData+firstHop+seed 三篇+
  综述幽灵行第四篇+draftJsonWithSurvey 独立 fixture→综述右键→菜单项→点甲（已有
  tree 父=豁免面）→ref path 断言（stroke=var(--survey-edge)/dasharray='2 3'/1.4）→
  reload 持久+节点计数 4+tree 边 2 原色）；helper 参数化
  writeFixture(content)/importDraftViaUi(…,expectSummary)（默认值=原行为，T1~T4 零改）；
  T5 另含负锚：非综述节点菜单不呈现「添加参考连接」。
- edge 工厂补 kind:'tree'（类型必填化波及，零断言改动）：
  lineage-board.test.tsx / lineage-store-write.test.ts / lineage-canvas.test.tsx /
  lineage-classify.test.ts（以上四件票面清单外，见 §6 自裁 4）。

删：无。

## 3. 变异红证索引（cp 备份法——禁 git checkout；还原后 diff 全空+复跑绿）

- `scripts/audits/r2-lg12-mutation-1.log`：M1 ref 多父豁免分支删（守卫退化为 kind
  无关全入边）→ 红：「ref 豁免多父」用例（多父 reason 误拒 ref 加边）。
- `scripts/audits/r2-lg12-mutation-2.log`：M2 环检测图漏 ref（reachable 构图剔除 ref）→
  红：「ref 仍拒环（tree+ref 混合环夹具）」——夹具路径穿既有 ref 边，tree-only 图
  不可达=盲区实证被断言拦出。
- `scripts/audits/r2-lg12-mutation-3.log`：M3 渲染优先级翻转（LineageEdges 删
  e.kind==='ref' 直读）→ 红：ref 用例 '#8a94a6' ≠ 'var(--survey-edge)'。
- `scripts/audits/r2-lg12-mutation-4.log`：M4 自环守卫对 ref 过度豁免 → 红：「ref 自环
  拒」（防御纵深：变异态被成环守卫以另一 reason 兜住，专用自环 reason 断言仍红——
  证明该用例可红非恒真）。
- TDD 首红：实现前 4/6 service 用例红（fixture 修复后固定），日志在会话记录；
  M2/M4 补足另 2 用例的可红证明（六用例全数有失败证明）。

## 4. 测试证据（用例数构成）

- 基线 875（106 文件）→ **883（106 文件）**=875+service 6+layout 1+visual 1
  （migrate.test 为断言更新非新增；e2e playwright 不入 vitest 计数）。
- `npm run test` 全量：**106 文件 883 用例全过**（verify 内含，见 §5 日志）。
- `npm run typecheck`：tsc node+web 双项目零错。
- e2e：25→26（T5 spec 已写；真跑归主控收口——票面④基线声明）。
- quality grep：改动面 19 文件 TODO|FIXME|placeholder 零命中（exit=1）。
- 乱码验证：新增/改写文件 node 读取 UTF-8 无 U+FFFD（控制台 GBK 显示为解码假象）。

## 5. locks 实录

- 流程：`npm run locks:unlock`（164）→ 批内改（shared/ipc/schemas+models+006 新增+
  tests 八件）→ `npm run locks:generate`（收 006：**165 条**）→ `npm run verify`
  （含 locks:check 绿）→ `npm run locks:apply`（已锁定 165 只读，manifest 同步）。
- manifest diff：+006_lineage_ref_edges.sql 条目+本批受锁文件 hash 更新+generatedAt
  （CRLF→LF 由 .gitattributes 入库时归一——既有流程常态）。
- verify 真退出码：`scripts/audits/r2-lg12-verify.log` 末行 **exit=0**
  （quality+tickets+locks+lint+typecheck+test+build 全链）。

## 6. 自裁申报（超票面决定+删减面 diff 自查）

1. **service ref from 限定采双条件**：`paperId === null || !isSurveyTitle(title)` 拒。
   票面 §1 只写 isSurveyTitle；预裁 6 菜单条件含 paperId!==null 且明言「service
   双守」——采预裁口径：主题节点（paperId null）题名含综述关键词同拒（测试第二
   断言锚定该格）。
2. **多父守卫 tree 侧收窄**：existingParent 判定加 `e.kind==='tree'` 过滤（ref 入边
   不算 tree 父——否则 tree 边挂到已有 ref 入边节点被误拒，豁免语义不自洽的对偶面；
   现有三拒绝用例不受影响）。
3. **成环 reason 文案更新**：'（v1 为树）'→'（树边与参考边均不得成环）'（混合图语义；
   受锁断言均为子串'环'——board.test 的 reason 字面是 mock 透传非 service 输出）。
4. **受锁波及面（票面清单外、类型/契约必然）**：①六个测试 edge 工厂补 kind:'tree'
   （board/store-write/canvas/classify/layout/visual——LineageEdge 出口必填化的编译
   必然，零断言改动）；②migrate.test appliedVersions 增 6（加迁移 006 的必然先例
   同型）；③shared/ipc/schemas.ts 增可选 kind（票面 §3「kind 流向=DB→repo→service
   →ipc→renderer」的接口面必然，枚举引 models 单源非手写两份）。
5. **importDraft 重灌显式 kind:'tree'**：预裁 5 只点名 upsertEdge；同「写路径显式
   不赖 DB DEFAULT」精神扩展到导入重灌循环（draft 协议 schema 零改）。
6. **e2e helper 参数化**：writeFixture/importDraftViaUi 加可选参（默认=原文案，既有
   调用零改）；T5 增负锚（甲菜单不呈现参考连接项）——断言面增强非放宽。
7. **BLOCKED=0**：无卡点；无「不许删检查/放宽断言/新依赖」触碰（零新依赖）。
8. **删减面 diff 自查**：票面 §6 交付清单全兑现无删减；`git diff --stat` 24 文件
   =本单 23 件+locks/manifest.json；`tickets/registry.ts` 的 M 为**开工前主控
   既有脏态**（R2-LG11 翻 done+R2-LG12 开票在案——本会话首个 git status 已在档），
   本单零触碰（禁改遵守）。grep TODO/FIXME/placeholder 零命中。
9. **e2e 未真跑**：票面④明示本单只跑 unit 级 verify、e2e 归主控收口——T5 spec
   已就位待收口跑（25→26 预测在案）。
