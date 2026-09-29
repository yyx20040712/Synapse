# F-FOLDER-01 design-final：文件夹×脉络图绑定（主控终裁版 2026-09-30）

> 三段通道全程：Kimi 拟定（kimi-main，in 2,068/out 5,493——`E:/zcode_md/synapse-archive/scripts-audits/F-FOLDER-01/drafter-output.md` 冻结件）→deepseek 对抗审核（**B4W8N6 返工**——`auditor-output.md`）→**本件=GLM5.3 主控终裁**：B 级全数裁决修正（含 012 SQL 修正稿全文）、W/N 逐条处置、Q2-Q4 终裁、拆批确认。**本件为实现真相源**；survey 档 §2（2026-09-29）为其基座，冲突处以本件为准。

## 0. B 级终裁（四条全裁——修正稿如下）

> **修订二（2026-09-30 主控勘误——executor 票 1 三探针+主控独立复现探针双证）**：
> B1 初裁「NOT NULL DEFAULT '__main__'+参照行先插入」前提**证伪**——SQLite
> `ADD COLUMN` 带 REFERENCES+非空 DEFAULT 是**静态约束与参照行无关**（空表过/
> 有行必拒：Cannot add a REFERENCES column with non-NULL default value——
> master-probe-b1.cjs 在档）。**改裁方案 A**：§1 (4) 列改**可空无默认**
> `folder_id TEXT REFERENCES collections(id) ON DELETE CASCADE` + 显式回填
> `UPDATE lineage_nodes SET folder_id='__main__'`（B1/Q2 语义保留：存量全归
> 主图）；NOT NULL 安全网让位，移至 **repo 写边界**（节点插入路径
> `folderId ?? '__main__'` 兜底）+INV-88 补注（列可空性由回填+写边界封闭——
> 测试锚=写边界默认生效+回填后零 NULL 行双断言）。弃案 B（无 REFERENCES 的
> NOT NULL DEFAULT）维持弃（破坏 DDL CASCADE PIN）；表重建法不可行维持
> （PRAGMA 事务内 no-op[executor 探针 F3]）。另追认 §1 (1)
> `INSERT..SELECT..ON CONFLICT` 补 `WHERE true`（SQLite 文档级消歧要件，
> 探针实证，语义零变）。

| # | 审核发现 | 终裁 |
|---|---|---|
| B1 | `ADD COLUMN NOT NULL` 无 DEFAULT 必失败 | **采「NOT NULL DEFAULT '__main__'」**：参照行先插入（序 (1)）则 DEFAULT 合法且存量行即得 '__main__'=全部节点归主图（恰为 Q2 裁决语义，回填 UPDATE 步骤②随之消解）。未来 INSERT 未显式给值→兜底主图（服务层恒显式，兜底=安全网） |
| B2 | `ON CONFLICT(name) DO UPDATE` 改写既有行致 '__main__' 不被插入 | **改「先退让后插入」**：`UPDATE collections SET name=name\|\|' (主图)' WHERE name='主图' AND id<>'__main__'` → `INSERT … ON CONFLICT(id) DO NOTHING`；迁移用例增断言 `id='__main__' 行在场且 name='主图'` |
| B3 | 过滤语境页内编号与票面「库级全序派生」冲突 | **裁=库级恒定**（票面原文权威）：窗口恒在库级结果集求值，folder 过滤在窗口之后仅过滤显示不改编号——「全部/未归档/某文件夹」三态下同一文献 pubNo 恒同 |
| B4 | 012 自带 BEGIN/COMMIT 与执行器事务嵌套 | **主控仓内直证成立**（migrate.ts:72-75 `db.transaction` 逐迁移包事务+user_version 同事务）→ **012 禁自带 BEGIN/COMMIT**；原子性由执行器保证。FK 开关本设计无需触碰（DEFAULT 参照行合法路径） |

## 1. 012_folders_graphs.sql 修正稿（全文——实现逐字基准）

```sql
-- 012_folders_graphs.sql（执行器 db.transaction 已包事务——本件禁自带 BEGIN/COMMIT[终裁 B4]）
-- (1) 主图文件夹：先退让同名，再插入（id 锚 '__main__'——终裁 B2）
UPDATE collections SET name = name || ' (主图)' WHERE name = '主图' AND id <> '__main__';
INSERT INTO collections(id, name, position)
  SELECT '__main__', '主图', COALESCE(MAX(position), -1) + 1 FROM collections
  ON CONFLICT(id) DO NOTHING;
-- (2) papers 双列：folder 归属（单归属）+D1 impact_factor
ALTER TABLE papers ADD COLUMN folder_id TEXT REFERENCES collections(id) ON DELETE SET NULL;
ALTER TABLE papers ADD COLUMN impact_factor REAL;
-- (3) 坑 a 根治：部分唯一索引（NULL 主题节点不占唯一域——SQLite 3.8+，本仓 3.53.4）
CREATE UNIQUE INDEX idx_lineage_paper ON lineage_nodes(paper_id) WHERE paper_id IS NOT NULL;
-- (4) 节点图归属【修订二=方案 A：可空无默认+显式回填——SQLite ADD COLUMN
--     REFERENCES+非空 DEFAULT 静态禁；FK CASCADE 保留；写边界兜底见 repo 层】
ALTER TABLE lineage_nodes ADD COLUMN folder_id TEXT
  REFERENCES collections(id) ON DELETE CASCADE;
UPDATE lineage_nodes SET folder_id='__main__';
--     （存量文献节点+主题节点全部归主图[Q2 终裁]——B1 语义保留）
-- (5) 文献回填（序敏感）：
--   ① 有脉络节点的文献归主图
UPDATE papers SET folder_id='__main__'
  WHERE id IN (SELECT paper_id FROM lineage_nodes WHERE paper_id IS NOT NULL);
--   ② 其余有 paper_collections 挂接的文献→position 最小（tie-break id——W1；启发式明示[Q3 终裁]）
UPDATE papers SET folder_id=(
    SELECT c.id FROM paper_collections pc JOIN collections c ON c.id=pc.collection_id
    WHERE pc.paper_id=papers.id ORDER BY c.position ASC, c.id ASC LIMIT 1)
  WHERE folder_id IS NULL
    AND EXISTS (SELECT 1 FROM paper_collections pc WHERE pc.paper_id=papers.id);
--   ③ 裸文献（无节点无挂接）保持 NULL=「未归档」（与「未加入脉络」正交）
-- (6) M2M 退役（回填后；单归属化——paper_collections 无被引用外键，视图/触发器残留实现批核[N3]）
DROP TABLE paper_collections;
```

边不加 folder_id（派生：边属图=端点所在图，服务层拒跨图边）；图名=文件夹名 1:1；`papers.added_at` 001:23 在场（N5 已核）。

## 2. W 级处置（八条）

| # | 处置 |
|---|---|
| W1 | 采：`ORDER BY c.position ASC, c.id ASC`（§1 已入修正稿）；回填启发式明示入 INV-93 注记 |
| W2 | 采：服务层补「移出→未归档」事务序：`papers.folder_id=NULL → 删该文献节点（边随节点 CASCADE 灭）→ 广播 folders.changed+lineage.changed`（节点删=政策性，INV-93 承载） |
| W3 | 定稿（R2 勘正）：目标图 slot=该图现行 max(slot)+1（同图内唯一，沿 normalizeMonthSlot 既有语义；跨图 slot 独立无全局唯一义务）；节点已存在且跨图移入→slot=目标组 max+1 归一（旧句「不重排 slot」废止——R2 回炉勘正，同组撞值防护）；同值移动（folderId===toFolderId）幂等早退零重排 |
| W4 | 采：lineage 图读通道（graph get）入参 +folderId 入改写面；通道计数随迁以实现批实际面为准（56→N，锚测试同步） |
| W5 | 采判别联合：`folderScope = { kind:'all' } \| { kind:'unfiled' } \| { kind:'folder', folderId }`（zod discriminated union——三态显式，禁裸 nullable 二义） |
| W6 | 预算修正：**+6 件/~50 用例**（5 spec+012 迁移 spec）；补四漏格：month=NULL 缺省归组/未归档→文件夹移入/非法 toFolderId 拒绝/删除弹窗计数正确性 |
| W7 | 采：INV-93 扩为双向政策文：「一文献至多一文件夹（DDL 单列）；移出=节点删（政策）；未归档文献可无节点（与未加入脉络正交）」；INV-88 保持单向投影语义 |
| W8 | 由 B2 修正案覆盖（先退让后插入+id 断言用例） |

## 3. N 级处置

N1 触发器不加（服务层护栏足额——零冗余）；N2 采：弹窗补 edgeCount（「{nodeCount} 个节点及 {edgeCount} 条连线不可恢复」）；N3 实现批核（grep 视图/触发器/索引对 paper_collections 引用零残留断言）；N4 实现批全仓扫描 catalogNo 引用清零断言；N5 已核在场；N6 INV-91 实分配=S1 队列闸互斥（见 §5）。

## 4. Q 终裁

- **Q2=归主图**（审核论证采纳：文献节点全归主图后主题节点他属必违 INV-90——唯一自洽解；且「主图」语义本就是存量单图的承载）。
- **Q3=position+id 启发式**（无插入序可用的既定事实；明示非业务「首个」语义）。
- **Q4=库级**（票面原文权威——同 B3）。

## 5. INV 终文（实编号——invariants.md 现尾=INV-87）

INV-88 节点存在⇒其文献 folder_id=节点 folder_id（图=文件夹内容投影）｜INV-89 lineage_nodes.paper_id 非空全局唯一（部分唯一索引）｜INV-90 边两端 folder_id 相同（服务层 ERR_CROSS_GRAPH_EDGE）｜INV-91 S1 队列闸互斥（folders/papers.move 写与 lineage autosave 队列 pending 单点互斥——沿 workspace gate 先例）｜INV-92 pubNo=库级全序派生不落库（year ASC,month ASC NULLS LAST,added_at ASC；过滤不改编号——B3）｜INV-93 一文献至多一文件夹；移出=节点删（政策）；未归档⇒可无节点（正交）。

ADR：ADR-0014 修订（collections 多对多→单归属+paper_collections 退役记录）+新 ADR（单归属×图绑定：决策/备选否决边冗余列/后果跨图移动=边删/与 ADR-0018 正交）——实现票 1 落。

## 6. 其余章节效力

拟定稿 §2（IPC+6 通道+改写面——按 W4/W5 修订）、§3（服务层——按 W2/W3 补全）、§4（renderer 面——按 N2 文案）、§5（测试锚映射——按 W6 修订预算与漏格）、§7（拆批）、§8（负面清单自查）**均采**，以本件修订为准。候选权衡：拆批 B（2 票）+pubNo B-1（SQL 窗口）确认。

## 7. 拆批终案（票 1「schema+service」→票 2「renderer+e2e」）

> 修订三（2026-09-30 回炉 R1 随批）：通道面实作 **+5（61 终态）**——§2.1
> 所列 lineage/upsert-node 经查既有在场（LG-03），非新增；§2.1 表六行中
> 五行为新通道。ADR-0021 已按 61 记载。

- **票 1**：012+shared zod 面+repos/services（含 S1 闸/跨图边校验/移动+移出事务序）+迁移测试+service 单测；受锁面=[migrations+src/shared+tests]；通道+6 与 DOMAIN_PINS 本票锚定。
- **票 2**：FilterBar 文件夹区+脉络页图切换器+删除弹窗+MetaEditDialog.onSaved 修+导入语境+e2e 全谱（矩阵十一行+S1-S5）；受锁面=[tests]。
- 执行序 1→2；票 2 开工前提=票 1 收口（通道在场）。
