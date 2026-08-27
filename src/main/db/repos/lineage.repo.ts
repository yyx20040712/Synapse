// b3: P7-H
/**
 * [SR2-LG-01] lineage.repo —— 脉络图数据基座（模型+草稿导入，工单：open / strong）
 *
 * ── 行为层 ──
 * - 迁移 004_lineage.sql（ADR-0014 §数据模型 DDL 字面）：lineage_nodes
 *   （id/paper_id 可空 CASCADE/title/core_idea/year/x/y 手工位置覆盖
 *   NULL=自动布局——JSON Canvas 模式/created_at/updated_at）+
 *   lineage_edges（id/from_node/to_node CASCADE/label/UNIQUE(from_node,to_node)）
 * - **存储=图 schema（v2 DAG 升级免迁移）；v1 行为=树**（单父+无环）——
 *   树约束是 service 层不变量非 DDL 约束（ADR-0014「树约束=service 层
 *   不变量+单测」），**INV-27 随本单登记**：**守卫宿主=本单 service 写面**
 *   （门一 W1 处置——导入校验与 upsertEdge 运行时守卫同在
 *   lineage.service，LG-03 只接线 IPC 通道不另写守卫）：两写入口同守
 *   （to 已有父拒/成环拒/自环拒——中文 DomainError reason）；布局消费
 *   假设（LG-02 森林）以本不变量为前提
 * - **草稿导入（lineage JSON，ADR-0015 文件协议同精神）**：经 main 侧
 *   系统对话框选取 JSON（INV-07——dialog 在 ipc 层，corpusSession C-02
 *   同型）→zod 校验（shared/models/lineage.ts 新建单源：draft 节点=
 *   paper_id/title/year/core_idea；边=from_paper_id/to_paper_id/label；
 *   **v1 draft 仅文献节点**——纯主题节点=应用内手工创建（LG-03），不进
 *   draft 协议）→幽灵 paperId 拦截（papers 表存在性——AI-07 导入器同型）
 * →树约束校验（多父/环/自环→errors 清单）→**全有或全无**：校验任一
 *   失败→库不动+行级 errors 返回；全过→替换式导入（清面重灌——草稿
 *   迭代=整批替换语义，manifest 清空重建 AI-03 同族；人工修订保护=
 *   renderer 确认对话框「导入将替换现有脉络图」）
 * - repo 方法族（AI-01 六方法同型）：upsertNode/removeNode（级联边
 *   DDL 承担）/upsertEdge/removeEdge/listGraph（nodes+edges 全图单读）
 * - service 写面（本单交付，守卫同上）：upsertNode/upsertEdge（树守卫
 *   运行时二道防线——导入校验外的增量编辑入口）/removeNode/
 *   removeEdge——**IPC 四写通道的 schemas 注册归 LG-03**（消费者
 *   未建窗口），service 方法本单全建全测
 * - Result 形状：importDraft → { nodeCount, edgeCount } | errors:
 *   { path: string; reason: string }[]（中文 reason 含字段路径）
 *
 * ── 接口层 ──
 * - export interface LineageRepo { upsertNode(input): LineageNode;
 *     removeNode(id): number; upsertEdge(input): LineageEdge;
 *     removeEdge(id): number; listGraph(): { nodes: LineageNode[];
 *     edges: LineageEdge[] } }
 * - export function createLineageService(deps)（repo+papers 存在性查询
 *   注入）：importDraft(raw: unknown) → ImportResult（校验纯函数
 *   validateDraft 单独导出可测——zod+幽灵+树三段）+四写方法（含
 *   upsertEdge 树守卫）+graph()
 * - IPC 面：**新立 lineage 域**（契约测试 10→11 域穷举 [locked-change]——
 *   契约扩展非放宽；ai_sensor 立域 AI-07 同型）：lineage/import（dialog
 *   驱动，Res=ImportResult）+lineage/graph（voidReq→全图）两通道；写
 *   四通道（upsert-node/remove-node/upsert-edge/remove-edge）**接口
 *   预留面在 LG-03 票面**（本单只立读+导入——消费者未建窗口）
 * - 交付面：migrations/004_lineage.sql+repos/lineage.repo.ts+services/
 *   lineage/lineage.service.ts（importDraft+graph+树校验+四写方法含
 *   upsertEdge 运行时守卫）+shared/models/lineage.ts（zod 单源）+
 *   ipc/lineage.ts+schemas/api-surface 受锁扩；**受锁新增清单（门一
 *   N4 处置）：migrations/004_lineage.sql（migrations/ 全目录受锁）+
 *   shared/models/lineage.ts（shared/ 全目录受锁）+新测试——三者均
 *   unlock→批内改→generate→apply+[locked-change] 尾注**
 *
 * ── 架构层 ──
 * - 分层：ipc → services → repos → db 单向（dialog 在 ipc 层；禁 service
 *   直写 SQL）；schemas 预编译+参数绑定（禁拼接——迁移 DDL 除 UNIQUE
 *   外无应用侧约束补写）
 * - 依赖：db（迁移执行器既有机制）、papers 只读存在性查询、shared/
 *   models/lineage（zod 单源受锁 [locked-change]）
 *
 * ── 生命周期层 ──
 * - 预留：v2 DAG 升级（存储免迁移——service 层放宽度=LG 组外新裁决）；
 *   merge 式导入（v2 候选——v1 替换式+确认对话框已闭环）
 * - 不做：lineage FTS（无检索诉求）；draft 含主题节点（v1 纯手工）；
 *   自动引文边（ADR-0012 维持不做——策展边语义 DDL 已辨析）
 *
 * ── 文化层 ──
 * - 错误：校验失败三段 errors 清单（zod 行级/幽灵篇级/树结构图级——
 *   path 前缀区分）；导入 IO 失败动作型上抛（消费方 toast INV-02）；
 *   禁静默吞错；库空=graph 空数组（合法态非错误）
 * - 测试：tests/unit/services/lineage-import.test.ts [受锁新增]——
 *   draft 合法全过替换重灌/幽灵 paperId 拦截/多父边拒绝/成环拒绝/
 *   自环拒绝/zod 非法字段行级 reason/空 draft=空图合法/重复边
 *   UNIQUE 收口中文 reason/树校验纯函数性质（同输入同输出）；
 *   **service upsertEdge 运行时守卫三拒绝路径单测（W1 宿主用例）**；
 *   repo 交互真库夹具（AI-01 测试同型）；**新测试 always-active**
 *   （不经 guardedDescribe——ADR-0017 裁决 3）
 * - 新增受锁测试随实现 locks:generate+apply+[locked-change] 尾注
 * - 完成后：删除 STUB → npm run verify 绿 → 人工审查 git diff → 翻 registry
 */

/** 工单骨架标记（实现单元替换为真实实现） */
export const LINEAGE_REPO_STUB = 'SR2-LG-01'
