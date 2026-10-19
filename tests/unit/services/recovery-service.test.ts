import { describe, expect, it, afterAll } from 'vitest'
import { chmod, mkdtemp, readdir, rm, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createRecoveryService } from '../../../src/main/services/recovery/recovery.service'
import { RECOVERY_REGISTRY, type LineageRecoveryPayload } from '../../../src/shared/recovery/schemas'

/**
 * [F-VISFB-65 U3] 恢复副本服务层——真临时目录直测。覆盖（票面测试清单
 * service 层）：单槽覆写唯一、epoch stale 拒、外会话 pending 拒、takeOver
 * 双校验（token+epoch）、release token 不符=gone 不删不推进、先删后推进
 * （删除失败不推进 epoch）、invalid/foreign 保留、workspaceId 不符拒、
 * 孤儿目录清理。always-active。
 */
const tmpDirs: string[] = []

async function mkRoot(): Promise<{ root: string; svc: ReturnType<typeof createRecoveryService>; setCurrentWs: (id: string) => void }> {
  const root = await mkdtemp(join(tmpdir(), 'rec-svc-'))
  tmpDirs.push(root)
  let currentWs = 'ws-a'
  const svc = createRecoveryService({ recoveryRoot: root, currentWorkspaceId: () => currentWs })
  return { root, svc, setCurrentWs: (id: string) => (currentWs = id) } as never
}

function payload(tag: string): LineageRecoveryPayload {
  return {
    folderId: '__main__',
    graph: {
      nodes: [],
      edges: [],
      lineTypeNames: ['待命名', '待命名', '待命名', '待命名', '待命名', '待命名'],
      floatingNotes: []
    },
    queue: [{ kind: 'remove-edge', id: tag }],
    draft: null
  }
}

afterAll(async () => {
  for (const d of tmpDirs) {
    await chmod(d, 0o700).catch(() => undefined)
    await rm(d, { recursive: true, force: true })
  }
})

const TYPE = 'lineage-session' as const

describe('F-VISFB-65 recovery.service —— 会话/槽归属/epoch 编排（INV-157/158/159）', () => {
  it('peek 空槽→empty+epoch 0；save 本人会话→saved 回 token；单槽覆写唯一（目录恒一文件）', async () => {
    const { root, svc } = await mkRoot()
    const peek0 = await svc.peek({ workspaceId: 'ws-a' })
    expect(peek0.slots[TYPE]).toEqual({ status: 'empty', epoch: 0 })
    const r1 = await svc.save({ workspaceId: 'ws-a', type: TYPE, epoch: 0, session: 'sess-1', payload: payload('a') })
    expect(r1.status).toBe('saved')
    if (r1.status !== 'saved') return
    const firstToken = r1.token
    // 同会话再写（lastWriterSession 匹配=ownToken 语义）→覆写
    const r2 = await svc.save({ workspaceId: 'ws-a', type: TYPE, epoch: 0, session: 'sess-1', payload: payload('b') })
    expect(r2.status).toBe('saved')
    if (r2.status === 'saved') expect(r2.token).not.toBe(firstToken)
    const files = await readdir(join(root, 'ws-a'))
    expect(files.filter((f) => f.endsWith('.json'))).toHaveLength(1) // 单槽恒一
    // peek available+摘要
    const peek1 = await svc.peek({ workspaceId: 'ws-a' })
    expect(peek1.slots[TYPE]!.status).toBe('available')
    expect(peek1.slots[TYPE]!.file?.actionCount).toBe(1)
  })

  it('epoch stale 拒：release 推进 epoch 后，旧 epoch save=stale 不复活', async () => {
    const { svc } = await mkRoot()
    await svc.save({ workspaceId: 'ws-a', type: TYPE, epoch: 0, session: 'sess-1', payload: payload('a') })
    const rel = await svc.release({ workspaceId: 'ws-a', type: TYPE, token: (await svc.peek({ workspaceId: 'ws-a' })).slots[TYPE]!.file!.token, reason: 'clean' })
    expect(rel.status).toBe('released')
    expect(rel.epoch).toBe(1)
    const stale = await svc.save({ workspaceId: 'ws-a', type: TYPE, epoch: 0, session: 'sess-1', payload: payload('late') })
    expect(stale).toEqual({ status: 'stale', epoch: 1 })
    expect((await svc.peek({ workspaceId: 'ws-a' })).slots[TYPE]!.status).toBe('empty') // 旧 save 未复活
  })

  it('外会话 pending 拒（返文件信息不覆写）；takeOver 双校验：token+epoch 全对→saved，token 错→pending', async () => {
    const { svc } = await mkRoot()
    await svc.save({ workspaceId: 'ws-a', type: TYPE, epoch: 0, session: 'sess-1', payload: payload('a') })
    const fileToken = (await svc.peek({ workspaceId: 'ws-a' })).slots[TYPE]!.file!.token
    // 他会话直写→pending 拒
    const p = await svc.save({ workspaceId: 'ws-a', type: TYPE, epoch: 0, session: 'sess-2', payload: payload('x') })
    expect(p.status).toBe('pending')
    if (p.status === 'pending') {
      expect(p.file.token).toBe(fileToken)
      expect(p.file.lastWriterSession).toBe('sess-1')
    }
    // takeOver token 错→pending
    const bad = await svc.save({ workspaceId: 'ws-a', type: TYPE, epoch: 0, session: 'sess-2', payload: payload('x'), takeOverToken: 'wrong' })
    expect(bad.status).toBe('pending')
    // takeOver token 对+epoch 对→saved（接管覆写）
    const ok = await svc.save({ workspaceId: 'ws-a', type: TYPE, epoch: 0, session: 'sess-2', payload: payload('y'), takeOverToken: fileToken })
    expect(ok.status).toBe('saved')
    if (ok.status === 'saved') {
      const peek = await svc.peek({ workspaceId: 'ws-a' })
      expect(peek.slots[TYPE]!.file?.lastWriterSession).toBe('sess-2')
    }
  })

  it('release token 不符=gone 不删不推进（W-01：旧 token release 不删新副本）', async () => {
    const { svc } = await mkRoot()
    const r1 = await svc.save({ workspaceId: 'ws-a', type: TYPE, epoch: 0, session: 'sess-1', payload: payload('a') })
    const oldToken = r1.status === 'saved' ? r1.token : ''
    await svc.save({ workspaceId: 'ws-a', type: TYPE, epoch: 0, session: 'sess-1', payload: payload('b') })
    // 旧 token release → gone，新副本不删
    const g = await svc.release({ workspaceId: 'ws-a', type: TYPE, token: oldToken, reason: 'discard' })
    expect(g).toEqual({ status: 'gone', epoch: 0 })
    const peek = await svc.peek({ workspaceId: 'ws-a' })
    expect(peek.slots[TYPE]!.status).toBe('available') // 新副本仍在
    // epoch 未推进：旧 epoch save 仍可写（证明 gone 分支不推进）
    const r2 = await svc.save({ workspaceId: 'ws-a', type: TYPE, epoch: 0, session: 'sess-1', payload: payload('c') })
    expect(r2.status).toBe('saved')
  })

  // [回炉 R6] 删除失败面=POSIX chmod 0500（Windows ACL 无对应语义——平台限定申报）
  it('先删后推进（W-03）POSIX 面：删除失败→error 响应且 epoch 不推进（Windows 跳过——平台限定申报）', async () => {
    if (process.platform === 'win32') return
    const { root, svc } = await mkRoot()
    await svc.save({ workspaceId: 'ws-a', type: TYPE, epoch: 0, session: 'sess-1', payload: payload('a') })
    const token = (await svc.peek({ workspaceId: 'ws-a' })).slots[TYPE]!.file!.token
    await chmod(join(root, 'ws-a'), 0o500) // 只读目录：rm 失败
    await expect(svc.release({ workspaceId: 'ws-a', type: TYPE, token, reason: 'clean' })).rejects.toThrow()
    await chmod(join(root, 'ws-a'), 0o700)
    // 删除失败：文件仍在+epoch 未推进（epoch 0 的 save 仍 saved——若先推进则此处 stale）
    expect((await svc.peek({ workspaceId: 'ws-a' })).slots[TYPE]!.status).toBe('available')
    const r = await svc.save({ workspaceId: 'ws-a', type: TYPE, epoch: 0, session: 'sess-1', payload: payload('b') })
    expect(r.status).toBe('saved')
  })

  it('先删后推进（W-03）跨平台面：槽读侧失败（目录占位）→error 响应且 epoch 不推进', async () => {
    const { root, svc } = await mkRoot()
    await svc.save({ workspaceId: 'ws-a', type: TYPE, epoch: 0, session: 'sess-1', payload: payload('a') })
    const token = (await svc.peek({ workspaceId: 'ws-a' })).slots[TYPE]!.file!.token
    const fileName = RECOVERY_REGISTRY[TYPE]!.fileName
    // 槽路径目录占位：readFile EISDIR → release 恒 error（rm 无 recursive 对目录双平台恒抛）
    await rm(join(root, 'ws-a', fileName))
    const { mkdir } = await import('node:fs/promises')
    await mkdir(join(root, 'ws-a', fileName))
    await expect(svc.release({ workspaceId: 'ws-a', type: TYPE, token, reason: 'clean' })).rejects.toThrow()
    // 占位清场后：epoch 未推进（epoch 0 的 save 仍 saved）
    await rm(join(root, 'ws-a', fileName), { recursive: true })
    const r = await svc.save({ workspaceId: 'ws-a', type: TYPE, epoch: 0, session: 'sess-1', payload: payload('b') })
    expect(r.status).toBe('saved')
  })

  it('invalid/foreign-version 槽保留：save 无 takeOver→pending；release(peek token)→released 删除', async () => {
    const { root, svc } = await mkRoot()
    const dir = join(root, 'ws-a')
    const fileName = RECOVERY_REGISTRY[TYPE]!.fileName
    // invalid：损坏体
    const { mkdir } = await import('node:fs/promises')
    await mkdir(dir, { recursive: true })
    await writeFile(join(dir, fileName), '{corrupt', 'utf-8')
    let peek = await svc.peek({ workspaceId: 'ws-a' })
    expect(peek.slots[TYPE]!.status).toBe('invalid')
    const invalidToken = peek.slots[TYPE]!.file!.token!
    let p = await svc.save({ workspaceId: 'ws-a', type: TYPE, epoch: 0, session: 'sess-1', payload: payload('a') })
    expect(p.status).toBe('pending')
    let rel = await svc.release({ workspaceId: 'ws-a', type: TYPE, token: invalidToken, reason: 'discard' })
    expect(rel.status).toBe('released')
    expect(existsSync(join(dir, fileName))).toBe(false)
    // foreign-version：高版本外覆层
    await writeFile(
      join(dir, fileName),
      JSON.stringify({ type: TYPE, schemaVersion: 99, token: 'tok-fv', writtenAt: '2026-10-19T00:00:00.000Z', lastWriterSession: 's', payload: {} }),
      'utf-8'
    )
    peek = await svc.peek({ workspaceId: 'ws-a' })
    expect(peek.slots[TYPE]!.status).toBe('foreign-version')
    p = await svc.save({ workspaceId: 'ws-a', type: TYPE, epoch: 1, session: 'sess-1', payload: payload('a') })
    expect(p.status).toBe('pending')
    rel = await svc.release({ workspaceId: 'ws-a', type: TYPE, token: 'tok-fv', reason: 'discard' })
    expect(rel.status).toBe('released')
  })

  it('invalid/foreign-version 槽不可 takeOver（回炉 W6/INV-160）：token 匹配也 pending——仅 release 可收', async () => {
    const { root, svc } = await mkRoot()
    const { mkdir, writeFile: wf } = await import('node:fs/promises')
    const dir = join(root, 'ws-a')
    const fileName = RECOVERY_REGISTRY[TYPE]!.fileName
    await mkdir(dir, { recursive: true })
    // invalid（外覆层真 token+坏体）
    await wf(join(dir, fileName), '{corrupt', 'utf-8')
    const peek1 = await svc.peek({ workspaceId: 'ws-a' })
    const invalidToken = peek1.slots[TYPE]!.file!.token
    const r1 = await svc.save({
      workspaceId: 'ws-a', type: TYPE, epoch: 0, session: 's1',
      payload: payload('a'), takeOverToken: invalidToken
    })
    expect(r1.status).toBe('pending') // token 匹配仍拒——不可覆写非自有可读槽
    // foreign-version（真 token）
    await wf(
      join(dir, fileName),
      JSON.stringify({ type: TYPE, schemaVersion: 99, token: 'tok-fv2', writtenAt: '2026-10-19T00:00:00.000Z', lastWriterSession: 's', payload: {} }),
      'utf-8'
    )
    const r2 = await svc.save({
      workspaceId: 'ws-a', type: TYPE, epoch: 0, session: 's1',
      payload: payload('b'), takeOverToken: 'tok-fv2'
    })
    expect(r2.status).toBe('pending')
    // release 仍可收（放弃唯一径不受限）
    const rel = await svc.release({ workspaceId: 'ws-a', type: TYPE, token: 'tok-fv2', reason: 'discard' })
    expect(rel.status).toBe('released')
  })

  it('workspaceId 不符拒（B-05）：请求携带非当前工作区→INVALID_REQUEST', async () => {
    const { svc } = await mkRoot()
    await expect(svc.peek({ workspaceId: 'ws-other' })).rejects.toMatchObject({ code: 'INVALID_REQUEST' })
    await expect(
      svc.save({ workspaceId: 'ws-other', type: TYPE, epoch: 0, session: 's', payload: payload('a') })
    ).rejects.toMatchObject({ code: 'INVALID_REQUEST' })
    await expect(
      svc.release({ workspaceId: 'ws-other', type: TYPE, token: 't', reason: 'clean' })
    ).rejects.toMatchObject({ code: 'INVALID_REQUEST' })
  })

  it('read：token 匹配→found 载荷；错 token/释放后→gone', async () => {
    const { svc } = await mkRoot()
    const r = await svc.save({ workspaceId: 'ws-a', type: TYPE, epoch: 0, session: 'sess-1', payload: payload('a') })
    const token = r.status === 'saved' ? r.token : ''
    const found = await svc.read({ workspaceId: 'ws-a', type: TYPE, token })
    expect(found.status).toBe('found')
    if (found.status === 'found') {
      const p = found.payload as LineageRecoveryPayload
      expect(p.queue[0]).toMatchObject({ kind: 'remove-edge', id: 'a' })
    }
    expect((await svc.read({ workspaceId: 'ws-a', type: TYPE, token: 'nope' })).status).toBe('gone')
    await svc.release({ workspaceId: 'ws-a', type: TYPE, token, reason: 'clean' })
    expect((await svc.read({ workspaceId: 'ws-a', type: TYPE, token })).status).toBe('gone')
  })

  it('孤儿目录清理（startupScan）：无对应工作区子目录删、在场保留+tmp 提升接入', async () => {
    const { root, svc } = await mkRoot()
    const { mkdir, writeFile: wf } = await import('node:fs/promises')
    await mkdir(join(root, 'ws-a'), { recursive: true })
    await mkdir(join(root, 'ws-ghost'), { recursive: true })
    // ws-a 残留 tmp（提升为槽）
    const fileName = RECOVERY_REGISTRY[TYPE]!.fileName
    await wf(
      join(root, 'ws-a', `${fileName}.tmp`),
      JSON.stringify({ type: TYPE, schemaVersion: 1, token: 'tok-tmp', writtenAt: '2026-10-19T03:00:00.000Z', lastWriterSession: 's', payload: payload('t') }),
      'utf-8'
    )
    await svc.startupScan({ workspaceIds: ['ws-a'] })
    expect(existsSync(join(root, 'ws-ghost'))).toBe(false)
    expect(existsSync(join(root, 'ws-a'))).toBe(true)
    const peek = await svc.peek({ workspaceId: 'ws-a' })
    expect(peek.slots[TYPE]!.status).toBe('available') // tmp 已提升
    if (peek.slots[TYPE]!.status === 'available') expect(peek.slots[TYPE]!.file!.token).toBe('tok-tmp')
  })

  it('per-(ws,type) 串行：并发两 save 按调用序落定、终态=后写', async () => {
    const { svc } = await mkRoot()
    const p1 = svc.save({ workspaceId: 'ws-a', type: TYPE, epoch: 0, session: 'sess-1', payload: payload('one') })
    const p2 = svc.save({ workspaceId: 'ws-a', type: TYPE, epoch: 0, session: 'sess-1', payload: payload('two') })
    const [r1, r2] = await Promise.all([p1, p2])
    expect(r1.status).toBe('saved')
    expect(r2.status).toBe('saved')
    const peek = await svc.peek({ workspaceId: 'ws-a' })
    const finalToken = peek.slots[TYPE]!.file!.token
    const read = await svc.read({ workspaceId: 'ws-a', type: TYPE, token: finalToken })
    if (read.status === 'found') {
      expect((read.payload as LineageRecoveryPayload).queue[0]).toMatchObject({ id: 'two' }) // 后写胜出
    }
  })
})

describe('F-RECOV-01 D_max=8 per-key 链深上界（仅拦 save；release/read 豁免——W7/N8）', () => {
  it('同键同步 9 连 save：前 8 入链全 saved；第 9 撞 cap=queue-overflow（拒时不占深、携当前 epoch）；落定后深度归零可再写', async () => {
    const { svc } = await mkRoot()
    const req = (tag: string) => ({ workspaceId: 'ws-a', type: TYPE, epoch: 0, session: 'sess-1', payload: payload(tag) })
    const inflight: Promise<Awaited<ReturnType<typeof svc.save>>>[] = []
    for (let i = 0; i < 8; i += 1) {
      inflight.push(svc.save(req(`q${i}`))) // 同步批：未落定即入链（深度=8）
    }
    const ninth = await svc.save(req('q9')) // cap 检查在入链前同步发生
    expect(ninth.status).toBe('queue-overflow')
    if (ninth.status === 'queue-overflow') {
      expect(ninth.epoch).toBe(0) // typed 判别成员携当前 epoch
    }
    const settled = await Promise.all(inflight)
    for (const r of settled) expect(r.status).toBe('saved')
    const again = await svc.save(req('q10')) // 深度已归零
    expect(again.status).toBe('saved')
  })

  it('异键不受 cap 影响：ws-a 满深时 ws-b 正常入链', async () => {
    const { svc, setCurrentWs } = await mkRoot()
    const inflight: Promise<Awaited<ReturnType<typeof svc.save>>>[] = []
    for (let i = 0; i < 8; i += 1) {
      inflight.push(svc.save({ workspaceId: 'ws-a', type: TYPE, epoch: 0, session: 'sess-1', payload: payload(`a${i}`) }))
    }
    setCurrentWs('ws-b')
    const rb = await svc.save({ workspaceId: 'ws-b', type: TYPE, epoch: 0, session: 'sess-1', payload: payload('b0') })
    expect(rb.status).toBe('saved') // per-key 隔离
    await Promise.all(inflight)
  })

  it('release/read 豁免：链深满仍可入链执行（clean 收口/读取不可拒）', async () => {
    const { svc } = await mkRoot()
    const inflight: Promise<Awaited<ReturnType<typeof svc.save>>>[] = []
    for (let i = 0; i < 8; i += 1) {
      inflight.push(svc.save({ workspaceId: 'ws-a', type: TYPE, epoch: 0, session: 'sess-1', payload: payload(`e${i}`) }))
    }
    const rel = svc.release({ workspaceId: 'ws-a', type: TYPE, token: 'nope', reason: 'clean' }) // 深度=8 时同步调用
    const rd = svc.read({ workspaceId: 'ws-a', type: TYPE, token: 'nope' })
    await expect(rel).resolves.toMatchObject({ status: 'gone' })
    await expect(rd).resolves.toMatchObject({ status: 'gone' })
    const settled = await Promise.all(inflight)
    for (const r of settled) expect(r.status).toBe('saved')
  })

  it('W12 链序：saveA→saveB→release(A 旧 token) 全序执行——槽终值=B、release=gone 不删不推进（采纳序不压更新写）', async () => {
    const { svc } = await mkRoot()
    const r1 = await svc.save({ workspaceId: 'ws-a', type: TYPE, epoch: 0, session: 'sess-1', payload: payload('A') })
    const tokenA = r1.status === 'saved' ? r1.token : ''
    const p2 = svc.save({ workspaceId: 'ws-a', type: TYPE, epoch: 0, session: 'sess-1', payload: payload('B') })
    const pRel = svc.release({ workspaceId: 'ws-a', type: TYPE, token: tokenA, reason: 'discard' })
    const [r2, rel] = await Promise.all([p2, pRel])
    expect(r2.status).toBe('saved')
    expect(rel.status).toBe('gone') // A token 已被 B 覆写→不符→不删
    if (rel.status === 'gone') expect(rel.epoch).toBe(0) // 不推进
    const peek = await svc.peek({ workspaceId: 'ws-a' })
    expect(peek.slots[TYPE]!.status).toBe('available') // B 留驻
    const read = await svc.read({ workspaceId: 'ws-a', type: TYPE, token: peek.slots[TYPE]!.file!.token })
    if (read.status === 'found') {
      expect((read.payload as LineageRecoveryPayload).queue[0]).toMatchObject({ id: 'B' }) // 槽终值=B
    }
  })
})
