/**
 * [F-DBCAMP-01 DB-1 U3] app_meta 键域常量单源（纯常量件——零 zod：不进
 * schemas.ts 闭包面/不触 SCHEMA_NAMES；constants.ts 纯常量件先例）。
 *
 * 载体=迁移 018 app_meta 三列 KV 表（010 lineage_graph_meta 同形态——见
 * src/main/db/migrations/018_app_meta.sql）。消费面=DB-3 envelope（owner/
 * snapshot_seq/sync_key——[F-DBCAMP-01 DB-3 U2] 起经 snapshot 域五通道+
 * snapshot.repo/service 全链）+DB-2 设置页 token 展示（现行 api-surface
 * 通道 pin=80）。
 */

/**
 * app_meta 键域单源（主控裁决③.2；[F-DBCAMP-01 DB-3 U2] +syncKey+对端密钥
 * 前缀）。snapshot_seq 键=DB-3 envelope 面（DB-1 批登记零消费，U2 起启用）。
 * sync_key=库级同步主密钥（§13.6——ensure 语义同身份键：缺席才生成、在场
 * 永不覆写；恒 64-hex=randomBytes(32)）；对端密钥=前缀拼 owner_id 的实键
 * （值=64-hex 对端 sync_key——带外导入，§13.9-2 a 案）。
 */
export const APP_META_KEYS = {
  ownerId: 'owner_id',
  deviceToken: 'device_token',
  snapshotSeq: 'snapshot_seq',
  syncKey: 'sync_key'
} as const

/** 对端同步密钥实键前缀：实键=`peer_sync_key:<owner_id>`（值=64-hex） */
export const PEER_SYNC_KEY_PREFIX = 'peer_sync_key:'

/**
 * owner_id 形态=uuid v4 小写 hex（randomUUID() 产物）。生命周期（设计 §5.b）：
 * 生成=首运行落 app_meta；恢复己备份=随库走身份延续；导入他人快照=不接管；
 * 重装认领入口=DB-2 设置页。
 */
export const OWNER_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/

/**
 * 设备访问 token 形态=64-hex（randomBytes(32).toString('hex') 产物——
 * 32 字节预裁，A2 答复口径：uuid+设备 token+服务端设备清单，无账号密码）。
 */
export const DEVICE_TOKEN_PATTERN = /^[0-9a-f]{64}$/
