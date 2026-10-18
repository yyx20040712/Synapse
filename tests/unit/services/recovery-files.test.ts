import { describe, expect, it, afterAll } from 'vitest'
import { mkdir, mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  cleanupOrphanDirs,
  deleteSlot,
  opaqueTokenFor,
  promoteTmp,
  readSlot,
  writeSlotAtomic
} from '../../../src/main/services/recovery/recovery.files'
import { RECOVERY_REGISTRY, type LineageRecoveryPayload } from '../../../src/shared/recovery/schemas'

/**
 * [F-VISFB-65 U2] 恢复副本原子文件层——真临时目录直测（workspace.test 同型）。
 * 覆盖（票面测试清单 files 层）：tmp 提升三态（槽缺/槽旧 tmp 新/坏 tmp）、
 * 0600、原子写失败留旧槽、opaque token（同内容同权）。always-active。
 */
const tmpDirs: string[] = []

async function mkDir(prefix: string): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), prefix))
  tmpDirs.push(dir)
  return dir
}

function payload(over: Partial<LineageRecoveryPayload> = {}): LineageRecoveryPayload {
  return {
    folderId: '__main__',
    graph: {
      nodes: [],
      edges: [],
      lineTypeNames: ['待命名', '待命名', '待命名', '待命名', '待命名', '待命名'],
      floatingNotes: []
    },
    queue: [{ kind: 'remove-edge', id: 'e1' }],
    draft: null,
    ...over
  }
}

const FILE = RECOVERY_REGISTRY['lineage-session']!.fileName
const TYPE = 'lineage-session' as const

function env(over: { token?: string; writtenAt?: string; session?: string; payload?: unknown; schemaVersion?: number }) {
  return {
    type: 'lineage-session',
    schemaVersion: over.schemaVersion ?? 1,
    token: over.token ?? 'tok-x',
    writtenAt: over.writtenAt ?? '2026-10-19T00:00:00.000Z',
    lastWriterSession: over.session ?? 'sess-x',
    payload: over.payload ?? payload()
  }
}

afterAll(async () => {
  for (const d of tmpDirs) await rm(d, { recursive: true, force: true })
})

describe('F-VISFB-65 recovery.files —— 原子文件层（INV-157）', () => {
  it('writeSlotAtomic→readSlot 往返：available+载荷过检+摘要（actionCount/draftPresent）；槽文件 0600', async () => {
    const dir = await mkDir('rec-files-rt-')
    await writeSlotAtomic(dir, TYPE, {
      token: 'tok-1',
      writtenAt: '2026-10-19T01:00:00.000Z',
      lastWriterSession: 'sess-1',
      payload: payload({ queue: [{ kind: 'remove-node', id: 'n1' }], draft: { noteId: 'f1', text: '稿' } })
    })
    const slot = await readSlot(dir, TYPE)
    expect(slot.kind).toBe('available')
    if (slot.kind !== 'available') return
    expect(slot.token).toBe('tok-1')
    expect(slot.lastWriterSession).toBe('sess-1')
    expect(slot.summary).toEqual({ actionCount: 1, draftPresent: true })
    // tmp 不残留（rename 已消费）
    expect(existsSync(join(dir, `${FILE}.tmp`))).toBe(false)
  })

  // [回炉 R6] 0600=POSIX 承诺面（Windows ACL 无 0600 语义——平台限定申报：
  // 体内守卫静态形态〔skipIf 形态不在 test-surface v1 支持子集〕）
  it('槽文件权限 0600（POSIX 面——Windows 跳过）', async () => {
    if (process.platform === 'win32') return
    const dir = await mkDir('rec-files-mode-')
    await writeSlotAtomic(dir, TYPE, env({ token: 'tok-mode' }))
    const mode = (await stat(join(dir, FILE))).mode & 0o777
    expect(mode).toBe(0o600)
  })

  it('原子写失败留旧槽：tmp 落点被目录占位→write 抛错，旧槽内容原样', async () => {
    const dir = await mkDir('rec-files-fail-')
    await writeSlotAtomic(dir, TYPE, env({ token: 'tok-old' }))
    await mkdir(join(dir, `${FILE}.tmp`)) // tmp 路径不可写文件（目录占位）
    await expect(
      writeSlotAtomic(dir, TYPE, env({ token: 'tok-new' }))
    ).rejects.toThrow()
    const slot = await readSlot(dir, TYPE)
    expect(slot.kind).toBe('available')
    if (slot.kind === 'available') expect(slot.token).toBe('tok-old')
  })

  it('tmp 提升三态之①：槽缺+tmp 可解析→rename 提升为槽', async () => {
    const dir = await mkDir('rec-files-promo1-')
    await writeSlotAtomic(dir, TYPE, env({ token: 'tok-tmp', writtenAt: '2026-10-19T02:00:00.000Z' }))
    // 模拟崩溃后残留 tmp：把槽文件复制为 tmp 后删槽
    const raw = await readFile(join(dir, FILE), 'utf-8')
    await writeFile(join(dir, `${FILE}.tmp`), raw, 'utf-8')
    await rm(join(dir, FILE))
    await promoteTmp(dir, TYPE)
    const slot = await readSlot(dir, TYPE)
    expect(slot.kind).toBe('available')
    if (slot.kind === 'available') expect(slot.token).toBe('tok-tmp')
    expect(existsSync(join(dir, `${FILE}.tmp`))).toBe(false)
  })

  it('tmp 提升三态之②：槽在场——tmp 更新（writtenAt 更新）→提升替换；tmp 更旧→删 tmp 保槽', async () => {
    const dir = await mkDir('rec-files-promo2-')
    await writeSlotAtomic(dir, TYPE, env({ token: 'tok-slot-old', writtenAt: '2026-10-19T01:00:00.000Z' }))
    // 新 tmp → 替换
    await writeFile(
      join(dir, `${FILE}.tmp`),
      JSON.stringify(env({ token: 'tok-tmp-new', writtenAt: '2026-10-19T02:00:00.000Z' })),
      'utf-8'
    )
    await promoteTmp(dir, TYPE)
    let slot = await readSlot(dir, TYPE)
    expect(slot.kind).toBe('available')
    if (slot.kind === 'available') expect(slot.token).toBe('tok-tmp-new')
    expect(existsSync(join(dir, `${FILE}.tmp`))).toBe(false)
    // 旧 tmp → 删 tmp 保槽
    await writeFile(
      join(dir, `${FILE}.tmp`),
      JSON.stringify(env({ token: 'tok-tmp-older', writtenAt: '2026-10-19T00:30:00.000Z' })),
      'utf-8'
    )
    await promoteTmp(dir, TYPE)
    slot = await readSlot(dir, TYPE)
    expect(slot.kind).toBe('available')
    if (slot.kind === 'available') expect(slot.token).toBe('tok-tmp-new')
    expect(existsSync(join(dir, `${FILE}.tmp`))).toBe(false)
  })

  it('tmp 提升三态之③：坏 tmp（不可解析外覆层）→删 tmp；槽不可解析时 tmp 虽好不覆盖（保守）', async () => {
    const dir = await mkDir('rec-files-promo3-')
    await writeSlotAtomic(dir, TYPE, env({ token: 'tok-slot' }))
    await writeFile(join(dir, `${FILE}.tmp`), '{not-json', 'utf-8')
    await promoteTmp(dir, TYPE)
    expect(existsSync(join(dir, `${FILE}.tmp`))).toBe(false)
    let slot = await readSlot(dir, TYPE)
    if (slot.kind === 'available') expect(slot.token).toBe('tok-slot')
    // 槽损坏：不可比较 writtenAt——tmp 不提升（保留槽待用户 release），tmp 删除
    await rm(join(dir, FILE))
    await writeFile(join(dir, FILE), 'garbage', 'utf-8')
    await writeFile(
      join(dir, `${FILE}.tmp`),
      JSON.stringify(env({ token: 'tok-tmp', writtenAt: '2026-10-19T09:00:00.000Z' })),
      'utf-8'
    )
    await promoteTmp(dir, TYPE)
    slot = await readSlot(dir, TYPE)
    expect(slot.kind).toBe('invalid') // 坏槽保留（非自有文件不自动删）
    expect(existsSync(join(dir, `${FILE}.tmp`))).toBe(false)
  })

  it('opaque token：损坏外覆层→invalid+opaque（sha256+size+mtime 组合）；同内容同权、内容变则权变', async () => {
    const dir = await mkDir('rec-files-opaque-')
    await writeFile(join(dir, FILE), 'corrupted-body', 'utf-8')
    const slot = await readSlot(dir, TYPE)
    expect(slot.kind).toBe('invalid')
    const st = await stat(join(dir, FILE))
    expect(slot.token).toBe(opaqueTokenFor('corrupted-body', st.size, st.mtimeMs))
    // 同内容同权（重算一致）；size/mtime 任一维变则权变（组合键三联锁定——
    // 变异证：去任一维即红）
    expect(opaqueTokenFor('corrupted-body', st.size, st.mtimeMs)).toBe(slot.token)
    expect(opaqueTokenFor('corrupted-body-2', st.size, st.mtimeMs)).not.toBe(slot.token)
    expect(opaqueTokenFor('corrupted-body', st.size + 1, st.mtimeMs)).not.toBe(slot.token)
    expect(opaqueTokenFor('corrupted-body', st.size, st.mtimeMs + 1)).not.toBe(slot.token)
  })

  it('外覆层 schemaVersion 高于注册表→foreign-version（真 token 保留、不解析载荷）；载荷不合 schema→invalid（真 token）', async () => {
    const dir = await mkDir('rec-files-fv-')
    await writeFile(
      join(dir, FILE),
      JSON.stringify(env({ token: 'tok-fv', schemaVersion: 99 })),
      'utf-8'
    )
    let slot = await readSlot(dir, TYPE)
    expect(slot.kind).toBe('foreign-version')
    if (slot.kind === 'foreign-version') expect(slot.token).toBe('tok-fv')
    // 载荷损坏（外覆层可读）
    await writeFile(
      join(dir, FILE),
      JSON.stringify(env({ token: 'tok-badpayload', payload: { folderId: '' } })),
      'utf-8'
    )
    slot = await readSlot(dir, TYPE)
    expect(slot.kind).toBe('invalid')
    if (slot.kind === 'invalid') expect(slot.token).toBe('tok-badpayload')
  })

  it('tmp writtenAt 非法（非 ISO）→不提升删 tmp（N1：Date.parse 校验——字典序残缺串不误判新旧）', async () => {
    const dir = await mkDir('rec-files-badstamp-')
    await writeSlotAtomic(dir, TYPE, env({ token: 'tok-slot', writtenAt: '2026-10-19T01:00:00.000Z' }))
    // 非法 writtenAt 的 tmp（字典序可能大于合法槽——字典序比较会误提升）
    await writeFile(
      join(dir, `${FILE}.tmp`),
      JSON.stringify({ ...env({ token: 'tok-badstamp', writtenAt: 'zzz-not-a-date' }), type: 'lineage-session', schemaVersion: 1 }),
      'utf-8'
    )
    await promoteTmp(dir, TYPE)
    let slot = await readSlot(dir, TYPE)
    expect(slot.kind === 'available' && slot.token).toBe('tok-slot') // 槽未被覆盖
    expect(existsSync(join(dir, `${FILE}.tmp`))).toBe(false)
    // 槽侧 writtenAt 非法：不可比较——保守保槽删 tmp
    await rm(join(dir, FILE))
    await writeFile(join(dir, FILE), JSON.stringify(env({ token: 'tok-slot-bad', writtenAt: 'zzz' })), 'utf-8')
    await writeFile(
      join(dir, `${FILE}.tmp`),
      JSON.stringify(env({ token: 'tok-good', writtenAt: '2026-10-19T02:00:00.000Z' })),
      'utf-8'
    )
    await promoteTmp(dir, TYPE)
    slot = await readSlot(dir, TYPE)
    expect(slot.kind).toBe('invalid')
    expect(existsSync(join(dir, `${FILE}.tmp`))).toBe(false)
  })

  it('外覆层 type 与请求 type 不符→invalid（N2：文件名≠类型的错位文件不加载不覆写）', async () => {
    const dir = await mkDir('rec-files-type-')
    // 载荷合法而 type 错位（隔离 type 面——载荷面已由 schema 拦）
    await writeFile(
      join(dir, FILE),
      JSON.stringify({ type: 'reader-draft', schemaVersion: 1, token: 'tok-misplaced', writtenAt: '2026-10-19T01:00:00.000Z', lastWriterSession: 's', payload: payload() }),
      'utf-8'
    )
    const slot = await readSlot(dir, TYPE)
    expect(slot.kind).toBe('invalid')
    if (slot.kind === 'invalid') expect(slot.token).toBe('tok-misplaced')
  })

  it('deleteSlot：删文件；孤儿目录清理：无对应工作区的子目录删除、在场保留', async () => {
    const root = await mkDir('rec-files-orphan-')
    await mkdir(join(root, 'ws-live'))
    await mkdir(join(root, 'ws-dead'))
    await mkdir(join(root, 'ws-dead', 'nested'))
    await cleanupOrphanDirs(root, new Set(['ws-live']))
    expect(existsSync(join(root, 'ws-live'))).toBe(true)
    expect(existsSync(join(root, 'ws-dead'))).toBe(false)
    // deleteSlot 往返
    const dir = join(root, 'ws-live')
    await writeSlotAtomic(dir, TYPE, env({ token: 'tok-del' }))
    await deleteSlot(dir, TYPE)
    expect((await readSlot(dir, TYPE)).kind).toBe('empty')
  })
})
