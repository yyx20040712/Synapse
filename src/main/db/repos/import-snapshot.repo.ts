/**
 * [F-DBCAMP-01 DB-3 U3] import-snapshot.repo —— 导入合并写面仓储（设计书
 * §13.1/§13.2⑤⑥/§13.4；简报主控裁决③-4）。snapshot.repo 读面的对偶件：写面
 * 全归本件（U3 红线——snapshot.repo 读面方法零改动）。
 *
 * ── 行为层 ──
 * - 列清单单源=snapshot.repo 导出的 TABLE_SPECS（export 复用——列集/行序双面
 *   同源禁两处漂移）；表名/列名插值仅经该 const（d1-N7 沿承口径——无外部输入
 *   拼接面）。
 * - 十表 upsert（[F-VISFB-61] 九表→十表：+floating_notes——迁移 024 域资产，
 *   FK 父=collections）：INSERT … ON CONFLICT(<§13.1 冲突目标>) DO UPDATE
 *   SET 全列=excluded.列（冲突替换式删除写形态禁用——隐式 DELETE 绕过
 *   DELETE 触发器=漏账路径，quality 第 11 段负锚）。
 * - [回炉 R1] 死置列前提证伪移除：lineage_edges.kind 写面恒 'manual'
 *   （lineage.repo:199-200+014 头注）、lineage_nodes.tags 有存量写面史
 *   （INV-48）——kind/tags 与全列同入 upsert 写面（「出库真值/入写真值」对偶
 *   对称；原简报③-4「死置列红线」预裁推翻=主控简报缺陷，勘正在档）。
 * - upsert 表序（FK 父先子后——设计未约序，主控钉死）：collections→
 *   floating_notes→tags→papers→lineage_nodes→paper_tags→notes→annotations→
 *   lineage_edges→lineage_graph_meta（[F-VISFB-61] floating_notes 紧随
 *   collections——唯一 FK 父）。FK enforcement 开态（r4 级联点火三源互证），
 *   乱序=外键违约。
 * - 直执删除：逐条按 (entity,id) DELETE（缺席=no-op 幂等；paper_tags 拆竖线
 *   拼接/graph_meta 按 key）；guard 置位中本地不落账（021 触发器 WHEN 守卫）。
 * - guard 两法只许 `UPDATE deletion_log_guard SET stop=?` 单行语句；禁
 *   INSERT/DELETE 行（k3-N3 红线——单行不变式由播种+开库断言承载，写面不得
 *   破坏）。
 * - 水位 recv_seq:<owner> 分键（空键≡0/跳号合法/拒收卷不推进——§13.4）；导入
 *   日志 import_log:<owner>:<seq>=payload_sha256（仅 applied 落——r3-N1）；
 *   拒收统计 import_reject_stats 全局单键 JSON。经 app_meta KV 语句面，零新
 *   迁移（user_version 恒 21）。
 * - FTS×3 rebuild：external content 对账步（§13.2⑥——触发器已自动维护，
 *   rebuild=防御性）。**实现形态偏离票面字面**（简报③-4 原文 'rebuild' 专用
 *   语法）：三 FTS 表列名与源表映射错位（papers_fts.authors↔papers.
 *   authors_json、notes_fts.content↔notes.content_md、annotations_fts.quote↔
 *   annotations.quote_text），'rebuild' 命令按 FTS 列名回读 content 表=炸列
 *   （探针实证 no such column: T.authors）——等效替代='delete-all' 清索引+
 *   显式列映射 INSERT SELECT 重灌（幂等，与 ai 触发器同映射单源）。
 *
 * ── 文化层 ──
 * - 全语句 db.prepare 预编译+参数绑定。测试：tests/unit/db/repos/import-snapshot.repo.test.ts。
 */
import {
  IMPORT_LOG_PREFIX,
  IMPORT_REJECT_STATS,
  PEER_SYNC_KEY_PREFIX,
  RECV_SEQ_PREFIX
} from '../../../shared/models/app-meta'
import type { SqliteDb } from '../connection'
import { TABLE_SPECS } from './snapshot.repo'

/** 导出面十表（TABLE_SPECS 单源派生；[F-VISFB-61] +floating_notes） */
export type ImportTable = (typeof TABLE_SPECS)[number]['table']

/** upsert 表序（FK 父先子后——头注行为层） */
export const IMPORT_TABLE_ORDER: readonly ImportTable[] = [
  'collections',
  'floating_notes',
  'tags',
  'papers',
  'lineage_nodes',
  'paper_tags',
  'notes',
  'annotations',
  'lineage_edges',
  'lineage_graph_meta'
]

/** §13.1 身份矩阵：键列（冲突目标=键列集；paper_tags 复合/graph_meta=key 列） */
const KEY_COLUMNS: Record<ImportTable, readonly string[]> = {
  papers: ['id'],
  collections: ['id'],
  floating_notes: ['id'],
  tags: ['id'],
  paper_tags: ['paper_id', 'tag_id'],
  notes: ['id'],
  annotations: ['id'],
  lineage_nodes: ['id'],
  lineage_edges: ['id'],
  lineage_graph_meta: ['key']
}

/** 入站行身份序列化（§13.1：常规表=id；paper_tags=pid|tid；graph_meta=key 值） */
export function identityOf(table: ImportTable, row: Record<string, unknown>): string {
  return KEY_COLUMNS[table].map((k) => String(row[k])).join('|')
}

/** 拒收统计（W1「计数+最近指纹」——owner/seq=自称值，不可解析记 null 降级） */
export interface ImportRejectStats {
  count: number
  lastOwner: string | null
  lastSeq: number | null
  lastSha: string | null
  lastReason: string
  lastAt: string
}

export interface ImportSnapshotRepo {
  /** 单行 upsert（全列=excluded；死置列除外）；service 按 IMPORT_TABLE_ORDER 逐行调 */
  upsertRow(table: ImportTable, row: Record<string, unknown>): void
  /** 本地行全列读（键查——三分支比较用）；缺席=null */
  readRow(table: ImportTable, key: Record<string, unknown>): Record<string, unknown> | null
  /** 防复活查询：入站 (entity,id) 命中本库 deletion_events（INV-132 兑现面） */
  isDeleted(entity: ImportTable, id: string): boolean
  /** 直执删除（缺席=no-op 幂等）；id 按身份矩阵序列化；返回实际删除行数 */
  deleteDirect(entity: ImportTable, id: string): number
  /** guard 置 1（导入事务内——直执落账抑制）；只许 UPDATE 单行 */
  setGuardStop(stop: 0 | 1): void
  /** guard 复位 0（同事务尾——崩溃自回滚无悬挂态） */
  resetGuardStop(): void
  /** 接收水位（空键≡0——§13.4） */
  getRecvSeq(owner: string): number
  setRecvSeq(owner: string, seq: number): void
  /** 导入日志（applied 面——闸③ a/b 判据单键查询） */
  getImportLog(owner: string, seq: number): string | null
  setImportLog(owner: string, seq: number, sha: string): void
  getRejectStats(): ImportRejectStats | null
  setRejectStats(stats: ImportRejectStats): void
  /** 对端同步密钥读（peer_sync_key:<owner> 实键——U2 setPeerKey 对偶读面；
   *  缺席=null=不可验签〔service 映射 hmac_fail——票面外分支自裁申报〕） */
  readPeerKey(owner: string): string | null
  /** FTS×3 重建（external content 对账步） */
  rebuildFts(): void
}

export function createImportSnapshotRepo(db: SqliteDb): ImportSnapshotRepo {
  const upsertStmts = new Map<ImportTable, ReturnType<SqliteDb['prepare']>>()
  const selectStmts = new Map<ImportTable, ReturnType<SqliteDb['prepare']>>()
  const deleteStmts = new Map<ImportTable, ReturnType<SqliteDb['prepare']>>()
  for (const spec of TABLE_SPECS) {
    const table = spec.table as ImportTable
    // 表名/列名插值仅 TABLE_SPECS const 单源（头注 d1-N7 沿承申报）；
    // [回炉 R1] 写列=全列（kind/tags 在内——对偶对称）
    const writeCols = spec.columns
    upsertStmts.set(
      table,
      db.prepare(
        `INSERT INTO ${table} (${writeCols.join(', ')}) VALUES (${writeCols.map((c) => `@${c}`).join(', ')})
         ON CONFLICT(${KEY_COLUMNS[table].join(', ')}) DO UPDATE SET ${writeCols
           .map((c) => `${c} = excluded.${c}`)
           .join(', ')}`
      )
    )
    const keyCols = KEY_COLUMNS[table]
    selectStmts.set(
      table,
      db.prepare(
        `SELECT ${spec.columns.join(', ')} FROM ${table} WHERE ${keyCols
          .map((c) => `${c} = @${c}`)
          .join(' AND ')}`
      )
    )
    deleteStmts.set(
      table,
      db.prepare(`DELETE FROM ${table} WHERE ${keyCols.map((c) => `${c} = @${c}`).join(' AND ')}`)
    )
  }
  const deletedStmt = db.prepare('SELECT 1 FROM deletion_events WHERE entity = ? AND id = ?')
  // guard 红线：只许 UPDATE 单行语句（禁 INSERT/DELETE 行——k3-N3）
  const guardStmt = db.prepare('UPDATE deletion_log_guard SET stop = ?')
  const getKeyStmt = db.prepare('SELECT value FROM app_meta WHERE key = ?')
  const upsertKeyStmt = db.prepare(
    `INSERT INTO app_meta (key, value, updated_at) VALUES (@key, @value, @now)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`
  )
  // FTS 重建（头注偏离申报：'delete-all'+显式列映射重灌——与 ai 触发器同映射；
  // 导入事务内一次性两步——即时 prepare 零语句缓存需求）
  const FTS_REBUILD_SQL: readonly (readonly [string, string])[] = [
    [
      `INSERT INTO papers_fts (papers_fts) VALUES ('delete-all')`,
      `INSERT INTO papers_fts (rowid, title, abstract, authors) SELECT rowid, title, abstract, authors_json FROM papers`
    ],
    [
      `INSERT INTO notes_fts (notes_fts) VALUES ('delete-all')`,
      `INSERT INTO notes_fts (rowid, title, content) SELECT rowid, title, content_md FROM notes`
    ],
    [
      `INSERT INTO annotations_fts (annotations_fts) VALUES ('delete-all')`,
      `INSERT INTO annotations_fts (rowid, quote, comment) SELECT rowid, quote_text, comment FROM annotations`
    ]
  ]

  function upsert(key: string, value: string): void {
    upsertKeyStmt.run({ key, value, now: new Date().toISOString() })
  }

  function keyArgs(table: ImportTable, id: string): Record<string, unknown> {
    const cols = KEY_COLUMNS[table]
    const parts = id.split('|')
    const args: Record<string, unknown> = {}
    cols.forEach((c, i) => {
      args[c] = parts[i]
    })
    return args
  }

  return {
    upsertRow(table, row): void {
      upsertStmts.get(table)!.run(row)
    },

    readRow(table, key): Record<string, unknown> | null {
      const args: Record<string, unknown> = {}
      for (const c of KEY_COLUMNS[table]) {
        args[c] = key[c]
      }
      const row = selectStmts.get(table)!.get(args) as Record<string, unknown> | undefined
      return row === undefined ? null : row
    },

    isDeleted(entity, id): boolean {
      return deletedStmt.get(entity, id) !== undefined
    },

    deleteDirect(entity, id): number {
      return deleteStmts.get(entity)!.run(keyArgs(entity, id)).changes
    },

    setGuardStop(stop): void {
      guardStmt.run(stop)
    },

    resetGuardStop(): void {
      guardStmt.run(0)
    },

    getRecvSeq(owner): number {
      const row = getKeyStmt.get(`${RECV_SEQ_PREFIX}${owner}`) as { value: string } | undefined
      if (row === undefined) return 0
      // [回炉 R6] 非数值存量值显性 throw（R-E 同型同口径——键域受控异常态显性化）
      const parsed = Number.parseInt(row.value, 10)
      if (Number.isNaN(parsed)) {
        throw new Error(`recv_seq 键值非十进制数字串：${row.value}（键域受控——异常态显性化）`)
      }
      return parsed
    },

    setRecvSeq(owner, seq): void {
      upsert(`${RECV_SEQ_PREFIX}${owner}`, String(seq))
    },

    getImportLog(owner, seq): string | null {
      const row = getKeyStmt.get(`${IMPORT_LOG_PREFIX}${owner}:${seq}`) as { value: string } | undefined
      return row === undefined ? null : row.value
    },

    setImportLog(owner, seq, sha): void {
      upsert(`${IMPORT_LOG_PREFIX}${owner}:${seq}`, sha)
    },

    getRejectStats(): ImportRejectStats | null {
      const row = getKeyStmt.get(IMPORT_REJECT_STATS) as { value: string } | undefined
      if (row === undefined) return null
      // [回炉 R6] 损坏 JSON→空统计返回（展示面不炸导入；该次写入覆盖自愈）
      try {
        return JSON.parse(row.value) as ImportRejectStats
      } catch {
        return { count: 0, lastOwner: null, lastSeq: null, lastSha: null, lastReason: '', lastAt: '' }
      }
    },

    setRejectStats(stats): void {
      upsert(IMPORT_REJECT_STATS, JSON.stringify(stats))
    },

    readPeerKey(owner): string | null {
      const row = getKeyStmt.get(`${PEER_SYNC_KEY_PREFIX}${owner}`) as { value: string } | undefined
      return row === undefined ? null : row.value
    },

    rebuildFts(): void {
      for (const [clearSql, fillSql] of FTS_REBUILD_SQL) {
        db.prepare(clearSql).run()
        db.prepare(fillSql).run()
      }
    }
  }
}
