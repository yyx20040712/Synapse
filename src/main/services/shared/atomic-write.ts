/**
 * [F-DEDUP-01] 原子写单源（tmp+rename）——先写同目录临时文件，成功后 rename
 * 到最终路径（同卷 rename 原子；直写目标路径一旦中途崩溃会留下半截文件）。
 * 收敛前 4 处副本：file-store copyOrWrite（bytes+uniqueTmp+cleanOnFail）/
 * ai-sensor writeAtomic（ensureDir）/workspace.fs atomicWrite（裸调）/
 * ipc settings atomicWrite（裸调）。
 *
 * 形态：
 * - tmp 名：默认 `${path}.tmp`；uniqueTmp 时 `${path}.tmp-${randomUUID()}`（同
 *   目标并发双写互不抢占同一 tmp 路径）
 * - content：string 按 'utf8' 落盘；Uint8Array 直写字节
 * - opts.ensureDir：首写前 mkdir 父目录（recursive 幂等）——默认不开（调用方
 *   自建目录的旧语义保持）
 * - opts.cleanOnFail：失败时尽力删 tmp（rm force 吞 ENOENT）——默认不开；错误
 *   包装（域错误化/消息只含文件名）留在调用侧，本模块原样上抛 fs 错误
 *
 * 排除面（保持内联不动，票面裁决）：corpus.export manifest 终写（固定名
 * manifest.tmp.json=态空间表契约的残留清理语义）；ai-notes-import 的 rm+rename
 * （移动语义非内容写）。测试：tests/unit/services/shared/atomic-write.test.ts。
 */
import { randomUUID } from 'node:crypto'
import { mkdir, rename, rm, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'

export interface AtomicWriteOptions {
  /** 首写前 mkdir 父目录（recursive） */
  ensureDir?: boolean
  /** tmp 名附 randomUUID（同目标并发双写互不覆盖） */
  uniqueTmp?: boolean
  /** 失败时尽力清除 tmp 残留 */
  cleanOnFail?: boolean
}

export async function atomicWriteFile(
  path: string,
  content: string | Uint8Array,
  opts?: AtomicWriteOptions
): Promise<void> {
  const tmp = opts?.uniqueTmp ? `${path}.tmp-${randomUUID()}` : `${path}.tmp`
  try {
    if (opts?.ensureDir === true) {
      await mkdir(dirname(path), { recursive: true })
    }
    await writeFile(tmp, content, typeof content === 'string' ? 'utf8' : undefined)
    await rename(tmp, path)
  } catch (e) {
    if (opts?.cleanOnFail === true) {
      await rm(tmp, { force: true }).catch(() => undefined)
    }
    throw e
  }
}
