# AD-3：FTS5 external content + 触发器同步（仓储层零 FTS 责任）

日期：2026-08-21 · 状态：已接受

## 决策

三张 FTS5 表（papers/notes/annotations）采用 `content=源表` 的 external content 模式，INSERT/UPDATE/DELETE 触发器自动同步索引。

## 理由

- 仓储层（弱模型填充）只写普通 CRUD，**不可能漏同步 FTS**——把易错点从每个 repo 方法移进一次性的 schema。
- 相比 contentless 模式，无需手工发 'delete' 指令；相比普通 FTS 表，不双份数据。
- 分词器用 **trigram**（非 unicode61）：支持中英文任意子串匹配；代价是查询串必须
  ≥3 字符——repo 搜索策略据此定为「≥3 字走 FTS，短词 LIKE 兜底」（含 `%`/`_` 转义）。

## 代价

- UPDATE 触发器限定列（title/abstract/authors_json 等），新增可搜列需迁移加触发器——迁移受锁，演进可控。
- **rowid 稳定性约束**：三张 FTS 表以 `content_rowid='rowid'` 绑定源表隐式 rowid。
  SQLite 文档明确 VACUUM 可能重排无显式 INTEGER PRIMARY KEY 表的 rowid，届时
  FTS 与源表会错位。当前代码无 VACUUM/restore 调用；将来若做压缩或备份恢复，
  必须跟一条 `INSERT INTO <表名>_fts(<表名>_fts) VALUES('rebuild')` 重建索引。
- 测试：tests/unit/db/migrate.test.ts 断言触发器行为（插入可搜、更新换词、删除同步）。
