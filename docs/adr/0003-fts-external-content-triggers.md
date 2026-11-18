# ADR-0003：FTS5 触发器同步外部内容表（trigram）

日期：2026-08-21 · 状态：已接受

## 背景

papers/notes/annotations 三张业务表需要全文检索。仓储层由弱模型逐文件填充——在每个 repo 方法里手工同步 FTS 索引是易错点。

## 候选

- 普通 FTS 表：数据双份，存储与写入面大。
- contentless 模式：删除需手工发 'delete' 指令，易漏。
- external content 模式+触发器同步：索引由 schema 层触发器维护，仓储层零 FTS 责任。

## 裁决

三张 FTS5 表采用 `content=源表` 的 external content 模式，INSERT/UPDATE/DELETE 触发器自动同步索引。仓储层只写普通 CRUD，不可能漏同步 FTS——把易错点从每个 repo 方法移进一次性的 schema。

分词器用 trigram（非 unicode61）：支持中英文任意子串匹配。代价是查询串必须 ≥3 字符——repo 搜索策略据此定为「≥3 字走 FTS，短词 LIKE 兜底」（含 `%`/`_` 转义）。

## 后果

- UPDATE 触发器限定列（title/abstract/authors_json 等）：新增可搜列需迁移加触发器；迁移受锁，演进可控。
- rowid 稳定性约束：三张 FTS 表以 `content_rowid='rowid'` 绑定源表隐式 rowid。SQLite 文档明确 VACUUM 可能重排无显式 INTEGER PRIMARY KEY 表的 rowid，届时 FTS 与源表会错位。v1 裁决时的假设是「代码无 VACUUM/restore 调用」（当时无恢复路径）；现行恢复路径已落地=快照导入的 FTS 对账步（src/main/db/repos/import-snapshot.repo.ts 的 `rebuildFts`）：external content 专用命令 `'delete-all'` 清索引+显式列映射 INSERT SELECT 重灌，幂等。**禁用字面 `'rebuild'` 命令**：三张 FTS 表列名与源表列名错位（papers_fts.authors↔papers.authors_json、notes_fts.content↔notes.content_md、annotations_fts.quote↔annotations.quote_text），`'rebuild'` 按 FTS 列名回读 content 表会报「列不存在」错。该做法由 tests/unit/db/repos/import-snapshot.repo.test.ts 锁定。
- 行为锁定：tests/unit/db/migrate.test.ts 断言触发器行为（插入可搜、更新换词、删除同步）。
