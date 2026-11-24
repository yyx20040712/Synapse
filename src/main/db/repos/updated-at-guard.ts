/**
 * [B4 L1 / 设计稿 §7.5 普通写点守卫（B1 三轮处置）] 可恢复实体 upsert 语句
 * UPDATE 分支的 updated_at 标量表达式——单一公式单源。
 *
 * 不变量：可恢复实体（lineage_nodes/lineage_edges/floating_notes）每行
 * updated_at 在一切写点严格单调不减且新写值>旧值。恢复点守卫把恢复行推到
 * 未来毫秒后，普通写若裸取 now 会倒退——使「再删除」的 deleted_at 可与既有
 * tombstone 同值被 UNIQUE 吞，或使快照导入段三误判。
 *
 * 公式（选型 a——语句内闭合，不依赖调用方先读旧行）：
 *   max(excluded.updated_at, COALESCE(strftime('%Y-%m-%dT%H:%M:%fZ', <表>.updated_at, '+0.001 seconds'), excluded.updated_at))
 * INSERT 分支（新行）原样写调用方传入值（无旧值可比）。落位=三 repo upsert
 * 语句（lineage.repo×2/floating-notes.repo×1）+lineage-history.repo putExact 族
 * UPDATE 分支（同一表达式）。迁移 028 的删事件触发器为同公式的触发器形
 * （max(now, COALESCE(OLD.updated_at+1ms, now))——SQL 文件内同字面量）。
 *
 * NULL 安全（实现期实测补充——偏离设计稿字面公式处，申报在案）：SQLite 多参
 * max() 任一参数为 NULL 即返回 NULL；strftime 对非 ISO 的 updated_at（库外手改/
 * 对端快照原样写入的畸形值）返回 NULL。字面公式在触发器内=deleted_at 为 NULL，
 * 而 INSERT OR IGNORE 会**静默跳过**该违约行=tombstone 不落账（防线静默停摆，
 * deletion-log U1-9 锁面）；在 upsert 内=updated_at 写 NULL 撞 NOT NULL。故
 * 「旧行+1ms」项包 COALESCE：合法 ISO 值语义与设计稿逐字等价；畸形值退化为
 * 取调用方 now（=026 原行为），单调性对畸形行不可保证但不丢 tombstone。
 *
 * 边界（如实申报）：表名为源码固定常量（调用处字面量联合类型，非用户输入）。
 */
export type GuardedTable = 'lineage_nodes' | 'lineage_edges' | 'floating_notes'

export function monotonicUpdatedAt(table: GuardedTable): string {
  return `max(excluded.updated_at, COALESCE(strftime('%Y-%m-%dT%H:%M:%fZ', ${table}.updated_at, '+0.001 seconds'), excluded.updated_at))`
}
