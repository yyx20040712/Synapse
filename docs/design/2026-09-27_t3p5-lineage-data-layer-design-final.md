# T3-P5 脉络数据层 设计定稿（design-final，2026-09-27 主控终裁版）

> 战役真相源=docs/design/2026-09-26_theme-trio-final-design.md §3/§6 票 5；本档=P5 数据层实现
> 规约真相源。设计链：Kimi 拟定（首跳稿）→ deepseek 对抗审核（B3/W7/N4）→ GLM 主控终裁
> 定稿（本档；drafter 二跳输出退化[节点 status 误解边 kind]作废记档——档 E:/zcode_md/
> synapse-archive/scripts-audits/p5-design/drafter-output-v2.md）。与 ai-sensor 域解耦边界=
> 2026-09-20_ai-sensor-refactor-survey-and-plan.md §9（立票前呈报在案）。
> 迁移号勘正：战役档「迁移 011」系笔误（未立项域假设占号），**P5 实际取 010**（现状至 009）。

## §0 范围

模型增量（month/sub/lineTypes/slot）+迁移 010+IPC/service 读写扩展+corpus 第六件套
lineage.json 导出+文献库 C5 双升级点消费。不含 P6-P8 渲染/交互、AI 域任何功能。
架构铁律：分层单向 ipc→services→repos→db；zod 单源 src/shared/models/lineage.ts；
SQL 全 db.prepare 预编译；禁新依赖；ADR-0018 一课题一库逐库迁移；不触发 ADR-0014
v2 DAG（仍树+旁挂边）；不动 ai_sensor 通道与 AI 分节组件。

## §1 模型增量（src/shared/models/lineage.ts，受锁，[locked-change]）

```ts
// 边基础型扩四值（deepseek 审核认可）：
export const lineageEdgeKindSchema = z.enum(['tree', 'inferred', 'ref', 'manual'])
// LineageNode 增两字段（全量 upsert 语义——month/slot 缺省=置 null/清空，同 tags/x/y 惯例）：
//   month: z.number().int().min(1).max(12).nullable()   // null=未定月框
//   slot:  z.number().int().min(0).nullable()            // 月内序承载（§4；null=防御面兜底，service 新写恒赋值）
// LineageEdge 增一字段：
//   sub: z.string().nullable()                           // 子线型 id；null=基础型默认样式
// LineTypeSub={id:string(图内唯一),name:string,color:string,dash:string(''=实线),w:number(.positive())}
// LineTypeGroup={base:lineageEdgeKindSchema,subs:LineTypeSub[]}
// lineageGraphResSchema 响应增 lineTypes: LineTypeGroup[]（paperMetrics 保持现状）
// draft 导入协议 v1.2：**仅新增** month: z.number().int().min(1).max(12).nullable().optional()
//   （缺省=null 未定月）——title/core_idea 必填、year 必填键 nullable、tags optional 全部现状
//   零动（deepseek B-1 回退：draft 其余字段 optional 化=越权契约放松，弃）
```

## §2 迁移 010（migrations/010_*.sql，受锁，逐库 ADR-0018）

```sql
ALTER TABLE lineage_nodes ADD COLUMN month INTEGER NULL CHECK (month IS NULL OR month BETWEEN 1 AND 12);
ALTER TABLE lineage_nodes ADD COLUMN slot INTEGER NULL;
ALTER TABLE lineage_edges ADD COLUMN sub TEXT NULL;
CREATE TABLE IF NOT EXISTS lineage_graph_meta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL            -- 应用层写 ISO 值（datetime('now')=UTC 实测，弃 DDL DEFAULT）
);
INSERT OR IGNORE INTO lineage_graph_meta (key, value) VALUES ('lineTypes', '[]');
-- 存量行回填 slot（窗口函数，SQLite 3.53 实测支持）：
UPDATE lineage_nodes SET slot = (
  SELECT rn FROM (SELECT id, ROW_NUMBER() OVER (
    PARTITION BY year, month ORDER BY created_at, id) AS rn FROM lineage_nodes) r
  WHERE r.id = lineage_nodes.id);
```

实测锚（2026-09-27 better-sqlite3 13.0.3/SQLite 3.53 探针，档=仓外 p5-design/sqlite-probe.mjs）：
ADD COLUMN 带 inline CHECK 合法且**对所有后续写人生效（含存量行 UPDATE 越界拒——探针 B/D 双证）**，仅迁移时点不回溯校验（存量 NULL 本合法）；窗口函数分区可用。seed/文件头风格实现票首步对齐 004/006/007。弃选：lineTypes 拆关系表（图级样式配置行数小无独立查询，KV JSON 足够+导出/校验层 zod 兜底）；slot 回填外的任何数据回写。

## §3 IPC（api-surface lineage 域 6→7 通道，受锁）

| 通道 | 变更 |
| --- | --- |
| importDraft | v1.2 协议（month optional） |
| graph | 响应+lineTypes |
| upsertNode | +month/slot（全量语义：缺省=置 null/清空，deepseek B-2 统一） |
| removeNode/removeEdge | 不变 |
| upsertEdge | +sub（缺省 null） |
| **upsertLineTypes**（新增） | 图级整体替换：Req=LineTypeGroup[]，Res=校验后回显 |

弃选 upsert/remove 双通道（通道膨胀+删除守卫仍需全图校验）。ipc/schemas.ts 仅
import/re-export 派生（模型字段定义单源=models/lineage.ts——deepseek N-4）。

## §4 service 守卫与排序契约（services/lineage/lineage.service，INV-27 宿主）

**排序契约（唯一纯函数 `lineageOrder(nodes)`，读面/导出/C5 三处复用禁双实现——deepseek W-5）**：
`ORDER BY year IS NULL, year ASC, month IS NULL, month ASC, slot IS NULL, slot ASC, created_at ASC, id ASC`。
「月内序=数组序」的持久化承载=slot 序（主控终裁 D-P5-10：战役档「无显式字段」指无用户可
编辑序号语义，slot 为实现层承载——P8 月内槽位重排=slot 值重排，跨月移动=month+slot 同写
落目标组末 slot=max+1，原「落组末」矛盾解除）。service 新建节点 slot=目标年月组 max+1；
迁移回填后存量行有序；NULL 末+行序 tiebreak 为防御面兜底。

**INV-27 修订（deepseek 认可）**：kind 四值；inferred 同 tree 守卫（单父+拒环——旁挂豁免
=守卫逃逸口）；ref/manual 现状；sub 为样式层不参与结构守卫。P5 无 inferred 产生入口
（P7 编辑器+后置 AI 域为入口）——枚举+守卫先行+防退化测试（deepseek N-1）。

**sub 引用完整性（写面新增）**：upsertEdge sub≠null ⇒ 存在于 lineTypes 且 group.base==edge.kind
（跨基型拒绝）；upsertLineTypes 整体替换前校验 subs.id 全图唯一+被现存边引用的 sub 不得消失
（整批拒绝列冲突 id；弃级联落 null=静默丢样式）。meta.updated_at 随 upsertLineTypes 应用层刷新。

## §5 lineage.json 导出（export_ 域第六件套）

独立文件（与 manifest.json 平级；弃并入 manifest=职责单一+体积独立）。确定性规范：对象键序
=递归 alphabetical（唯一规则不做语义分块）；nodes=§4 排序契约序/edges=(created_at,id) 行序/
line_types=base 枚举序（tree,inferred,ref,manual）后 subs 按 id 升序；snake_case+2 空格缩进
+UTF-8 无 BOM+末尾换行；schema_version=1 起版（与 corpus manifest 版式对齐，实现票核对）。
字段：edges{created_at,edge_id,from,label,line_type{base,sub},to}；line_types{base,subs[{color,
dash,id,name,w}]}；nodes{catalog_no,core_idea,month,node_id,paper_id,slot? 不导,tags,title,
year}。**不含 x/y UI 态与 slot（slot=内部承载列，消费方不需要）**；paperMetrics 不入
（corpus 域 join 数据避双真相）；paper_id=null 纯主题节点照实导出 null。

## §6 catalog_no（C5 升级点 a）

**终案=导出/读取时按 §4 全序确定性计算 1..N，不落库**（呈现序非业务标识；零迁移零写放大；
纯函数可快照测试；弃落库持久序号=重排批量 UPDATE 写放大；弃 papers 全局编号=语义无关）。
文献库列表序号列：入脉络=catalog_no+**视觉前缀区分**（具体形态收口轮细调备案）；未入脉络=
位置序 index+offset+1 兜底（弃置空=行定位退化）。编号随全序漂移=特性非缺陷（呈现序语义，
与时间线/导出一致——deepseek W-4 备案采纳）。抽屉 .lib-dr-id 短号同源。

## §7 C5 升级点 b（month 落位）

library.service detail join 摘「month 恒 null」注释读真值；抽屉文案「{N} 年 · {M} 月框 ·
{K} 条连线」（month null→「未定月框」；year null 保持现状）；文献库年月列 year+month 齐→
「YYYY-MM」（month 补零）；year/month 任一 null→「—」（现状保持）。消费计算与导出同一
lineageOrder 纯函数（禁双实现）。

## §8 INV（对齐现状空号——deepseek W-2：现状至 INV-74）

- **INV-75（新增）**：月内序=slot 序。graph.nodes 返回序=（year asc null 末,month asc null
  末,slot asc null 末,created_at,id tiebreak）由 lineage.service 读面唯一保证；消费方不得重排。
- **INV-76（新增）**：catalog_no 为呈现时确定性计算值（§4 全序），不落库不作业务主键；同图
  状态同序列。
- **INV-77（新增）**：lineage.json 确定性=递归 alphabetical 键序+§5 数组序+schema_version 1
  起版；序列化变更必须递增版本并更新快照测试。
- INV-27 修订文本随票回写。

## §9 受锁面与 TDD 测试面

受锁：models/lineage.ts+ipc/schemas.ts+ipc/api-surface.ts+migrations/010+export_ 域生成器+
lineage.service+lineage.repo+library.service+对应全部测试件（[locked-change][test-refactor]
双尾注+豁免台账+基线再生成——S2 机检对账首战）。TDD：month 边界（0/13 拒）/kind 四值/
LineTypeGroup/draft v1.2 兼容（旧草稿零破坏）；inferred 单父/拒环违例拒+ref/manual 回归；
sub 三守卫（不存在拒/基型不一致拒/删被引用拒列冲突 id）；迁移 010 存量 NULL+slot 回填+meta
seed；排序契约乱序插入+null 组末；导出快照字节级比对+catalog_no 同源一致性三处
（读面/导出/文献库）。

## §10 决策点终案表

| # | 终案 | 弃选（一句） |
| --- | --- | --- |
| D-P5-1 | slot 列承载月内序+读面排序+行序 tiebreak | 写侧 slot 之外的持久化载体（无表达力） |
| D-P5-2 | inferred 同 tree 守卫；sub 三守卫；lineTypes=KV meta 表 | inferred 旁挂（逃逸口）；级联置 null（静默丢）；workspace 配置（不随库） |
| D-P5-3 | 010=三 ALTER+meta 表+窗口回填，NULL/空=v1 语义 | 任何默认值回填（无谓写量） |
| D-P5-4 | 6→7 通道，lineTypes 单通道整体替换 | 双通道 CRUD（膨胀） |
| D-P5-5 | 第六件套独立 lineage.json | 并入 manifest（职责混合） |
| D-P5-6 | catalog_no 呈现时计算+前缀区分+位置序兜底 | 落库序号（写放大）；全局号（语义无关） |
| D-P5-7 | §7 落位（YYYY-MM/未定月框/—兜底） | 置空串（定位退化） |
| D-P5-8 | draft v1.2 仅 month optional | 其余字段 optional 化（越权放松，审核 B-1 回退） |
| D-P5-9 | INV-75/76/77+INV-27 修订+§9 测试面 | 仅口头约定（不可回归） |
| D-P5-10 | slot=实现层承载（「无显式字段」=无用户序号语义） | 字面禁列（P8 二迁） |
