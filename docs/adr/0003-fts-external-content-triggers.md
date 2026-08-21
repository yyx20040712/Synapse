# AD-3：FTS5 external content + 触发器同步（仓储层零 FTS 责任）

日期：2026-08-21 · 状态：已接受

## 决策

三张 FTS5 表（papers/notes/annotations）采用 `content=源表` 的 external content 模式，INSERT/UPDATE/DELETE 触发器自动同步索引。

## 理由

- 仓储层（弱模型填充）只写普通 CRUD，**不可能漏同步 FTS**——把易错点从每个 repo 方法移进一次性的 schema。
- 相比 contentless 模式，无需手工发 'delete' 指令；相比普通 FTS 表，不双份数据。
- unicode61 分词器对中英文都可用（按字切中文，按词切英文）。

## 代价

- UPDATE 触发器限定列（title/abstract/authors_json 等），新增可搜列需迁移加触发器——迁移受锁，演进可控。
- 测试：tests/unit/db/migrate.test.ts 断言触发器行为（插入可搜、更新换词、删除同步）。
