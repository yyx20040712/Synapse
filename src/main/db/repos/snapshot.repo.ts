/**
 * [F-DBCAMP-01 DB-3 U2] snapshot.repo —— envelope 面专用仓储（设计书 §13.4/
 * §13.6/§13.7；简报主控裁决③-3）。
 *
 * ── 行为层 ──
 * - sync_key ensure：读→缺席才生成 randomBytes(32).hex→INSERT OR IGNORE（在场
 *   永不覆写——ensureIdentity 同语义，§13.6「与 owner/token 同载体、同 ensure
 *   语义」）。落点=bootstrap assemble 闭包 ensureIdentity 后一行（课题库身份/
 *   密钥同建，单路径全覆盖）。
 * - snapshot_seq：空键≡0→首导=1（§13.4 分配=持久计数+1）；commit 写回仅由
 *   service 在导出落盘成功后调（取消/失败零调用=计数不变——崩溃窗同 seq 重用
 *   由单写者+接收端 seq_conflict 拒收封堵，§13.4 W4 口径）。
 * - 对端密钥：实键=`peer_sync_key:<owner_id>`（前缀单源=shared/models/app-meta），
 *   updated_at=导入时刻（再导入覆写刷新）。
 * - 导出读面（§13.6 canonical 行序矩阵——主控预裁：collections/tags/paper_tags
 *   无 updated_at 列〔001 实照〕，行序仅服务 canonical 确定性不承载合并语义）：
 *   papers/notes/annotations/lineage_nodes/lineage_edges/lineage_graph_meta=
 *   ORDER BY updated_at, id（graph_meta 主键=key 列，别名对齐——次序键用 key）；
 *   collections/tags=ORDER BY id；paper_tags=ORDER BY paper_id, tag_id。
 *   显式列清单=各表迁移终态全列（列名从 001/004/005/006/007/010/011/012/013/
 *   014/016/017/019 迁移实读对齐——[回炉 R4] 枚举勘正补 005/006/007；死置列
 *   007 lineage_nodes.tags/006 lineage_edges.kind 主控裁决入导出面=「迁移终态
 *   全列」票面字面，U3 import 不写即落 DDL 默认；SELECT 禁 *）。
 * - deletion_events 读面=只读全量消费（ORDER BY seq，不剪枝——§13.1；写协议
 *   红线=U2 零触 deletion_log_guard，guard 消费归 U3）。
 * - 018 头注契约沿承：snapshot_seq/sync_key 读写不经 app-meta.repo 既有 get/set
 *   （本件即 envelope 面专用通道）。
 *
 * ── 文化层 ──
 * - 全语句 db.prepare 预编译+参数绑定；测试：tests/unit/db/repos/snapshot.repo.test.ts。
 */
import { randomBytes } from 'node:crypto'
import { APP_META_KEYS, PEER_SYNC_KEY_PREFIX } from '../../../shared/models/app-meta'
import type { SqliteDb } from '../connection'

/** 导出行对象=列名→值全列（repo 读面原样——canonical 序列化器单源在 codec） */
export type SnapshotRow = Record<string, unknown>

/** 导出面九表行集（键集=§13.7 九表——table_counts 恰九键的锁定语义） */
export interface SnapshotExportRows {
  papers: SnapshotRow[]
  collections: SnapshotRow[]
  tags: SnapshotRow[]
  paper_tags: SnapshotRow[]
  notes: SnapshotRow[]
  annotations: SnapshotRow[]
  lineage_nodes: SnapshotRow[]
  lineage_edges: SnapshotRow[]
  lineage_graph_meta: SnapshotRow[]
}

export interface SnapshotDeletionEvent {
  seq: number
  entity: string
  id: string
  deleted_at: string
}

export interface PeerKeyRow {
  ownerId: string
  importedAt: string
}

/** 九表读面规格：显式列清单（迁移终态）+行序矩阵（头注行为层） */
const TABLE_SPECS = [
  {
    table: 'papers',
    columns: [
      'id', 'file_ref', 'sha256', 'title', 'authors_json', 'year', 'venue', 'doi', 'arxiv_id',
      'abstract', 'source', 'enrich_status', 'added_at', 'updated_at', 'last_read_page',
      'cited_by_count', 'cited_by_fetched_at', 'cited_by_count_source', 'folder_id',
      'impact_factor', 'is_starred'
    ],
    orderBy: 'updated_at, id'
  },
  {
    table: 'collections',
    columns: ['id', 'name', 'position'],
    orderBy: 'id'
  },
  {
    table: 'tags',
    columns: ['id', 'name', 'color', 'folder_id'],
    orderBy: 'id'
  },
  {
    table: 'paper_tags',
    columns: ['paper_id', 'tag_id'],
    orderBy: 'paper_id, tag_id'
  },
  {
    table: 'notes',
    columns: ['id', 'paper_id', 'title', 'content_md', 'created_at', 'updated_at'],
    orderBy: 'updated_at, id'
  },
  {
    table: 'annotations',
    columns: [
      'id', 'paper_id', 'page', 'kind', 'color', 'quote_text', 'prefix_text', 'suffix_text',
      'start_offset', 'end_offset', 'rects_json', 'sort_key', 'comment', 'created_at', 'updated_at'
    ],
    orderBy: 'updated_at, id'
  },
  {
    table: 'lineage_nodes',
    columns: [
      'id', 'paper_id', 'title', 'core_idea', 'year', 'x', 'y', 'created_at', 'updated_at',
      'month', 'slot', 'folder_id', 'tags'
    ],
    orderBy: 'updated_at, id'
  },
  {
    table: 'lineage_edges',
    columns: [
      'id', 'from_node', 'to_node', 'label', 'created_at', 'updated_at', 'sub', 'via',
      'dashed', 'color', 'kind'
    ],
    orderBy: 'updated_at, id'
  },
  {
    table: 'lineage_graph_meta',
    columns: ['key', 'value', 'updated_at'],
    orderBy: 'updated_at, key'
  }
] as const

export interface SnapshotRepo {
  /** 库级同步主密钥 ensure（缺席才生成——在场永不覆写；装配期跑） */
  ensureSyncKey(): string
  /** 读密钥（getSyncKey 通道用；缺席=装配序缺陷显性 throw，非 null 静默态） */
  readSyncKey(): string
  /** 持久计数+1（空键≡0→首导=1）；不写库 */
  nextSnapshotSeq(): number
  /** 写回计数（仅导出落盘成功后由 service 调） */
  commitSnapshotSeq(seq: number): void
  /** 对端密钥导入（upsert——再导入覆写+刷新导入时刻） */
  setPeerKey(ownerId: string, hex: string): void
  listPeerKeys(): PeerKeyRow[]
  removePeerKey(ownerId: string): boolean
  /** 九表全行读面（canonical 行序矩阵+显式列清单——envelope payload 源） */
  readExportTables(): SnapshotExportRows
  /** deletion_events 全量读（ORDER BY seq——只读消费，§13.1） */
  readDeletionEvents(): SnapshotDeletionEvent[]
  /** PRAGMA user_version（envelope schema_version 字段源——链尾=21） */
  readSchemaVersion(): number
}

export function createSnapshotRepo(db: SqliteDb): SnapshotRepo {
  const getKeyStmt = db.prepare('SELECT value FROM app_meta WHERE key = ?')
  const ensureKeyStmt = db.prepare(
    'INSERT OR IGNORE INTO app_meta (key, value, updated_at) VALUES (@key, @value, @now)'
  )
  const upsertKeyStmt = db.prepare(
    `INSERT INTO app_meta (key, value, updated_at) VALUES (@key, @value, @now)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`
  )
  const deleteKeyStmt = db.prepare('DELETE FROM app_meta WHERE key = ?')
  // [回炉 R7] LIKE 转义：前缀 'peer_sync_key:' 含 '_'（LIKE 单字符通配符）——
  // ESCAPE 声明+下划线显式转义（择一申报=ESCAPE 方案；键域现无撞形键，语义按字面收口）
  const listPeerStmt = db.prepare(
    `SELECT key, updated_at FROM app_meta WHERE key LIKE ? ESCAPE '\\' ORDER BY updated_at, key`
  )
  const PEER_LIKE = `${PEER_SYNC_KEY_PREFIX}%`.replaceAll('_', '\\_')
  // 行序矩阵列名白名单由本件 TABLE_SPECS 单源固化（无外部输入拼接面）
  const tableStmts = TABLE_SPECS.map((spec) => ({
    table: spec.table,
    stmt: db.prepare(`SELECT ${spec.columns.join(', ')} FROM ${spec.table} ORDER BY ${spec.orderBy}`)
  }))
  const deletionStmt = db.prepare(
    'SELECT seq, entity, id, deleted_at FROM deletion_events ORDER BY seq'
  )

  function get(key: string): string | null {
    const row = getKeyStmt.get(key) as { value: string } | undefined
    return row === undefined ? null : row.value
  }

  function upsert(key: string, value: string): void {
    upsertKeyStmt.run({ key, value, now: new Date().toISOString() })
  }

  return {
    ensureSyncKey(): string {
      if (get(APP_META_KEYS.syncKey) === null) {
        ensureKeyStmt.run({
          key: APP_META_KEYS.syncKey,
          value: randomBytes(32).toString('hex'),
          now: new Date().toISOString()
        })
      }
      return get(APP_META_KEYS.syncKey) as string
    },

    readSyncKey(): string {
      const v = get(APP_META_KEYS.syncKey)
      if (v === null) {
        throw new Error('sync_key 缺席：装配序缺陷（ensureSyncKey 未在装配期执行）')
      }
      return v
    },

    nextSnapshotSeq(): number {
      const v = get(APP_META_KEYS.snapshotSeq)
      return (v === null ? 0 : Number.parseInt(v, 10)) + 1
    },

    commitSnapshotSeq(seq: number): void {
      upsert(APP_META_KEYS.snapshotSeq, String(seq))
    },

    setPeerKey(ownerId: string, hex: string): void {
      upsert(`${PEER_SYNC_KEY_PREFIX}${ownerId}`, hex)
    },

    listPeerKeys(): PeerKeyRow[] {
      const rows = listPeerStmt.all(PEER_LIKE) as Array<{
        key: string
        updated_at: string
      }>
      return rows.map((r) => ({
        ownerId: r.key.slice(PEER_SYNC_KEY_PREFIX.length),
        importedAt: r.updated_at
      }))
    },

    removePeerKey(ownerId: string): boolean {
      return deleteKeyStmt.run(`${PEER_SYNC_KEY_PREFIX}${ownerId}`).changes > 0
    },

    readExportTables(): SnapshotExportRows {
      const out: Record<string, SnapshotRow[]> = {}
      for (const { table, stmt } of tableStmts) {
        out[table] = stmt.all() as SnapshotRow[]
      }
      return out as unknown as SnapshotExportRows
    },

    readDeletionEvents(): SnapshotDeletionEvent[] {
      return deletionStmt.all() as SnapshotDeletionEvent[]
    },

    readSchemaVersion(): number {
      return db.pragma('user_version', { simple: true }) as number
    }
  }
}
