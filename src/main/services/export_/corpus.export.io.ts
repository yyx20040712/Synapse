// b3: P7-G
/**
 * [F-EXPORT-01] corpus.export 盘面 IO——纯函数群（自 corpus.export.service 外提；
 * 拆件裁决=docs/design/2026-09-18_complexity-governance-ruling.md 裁决 6/§3 梯队四）。
 *
 * - 边界句：无状态/无事件/零 sendEvent——本件只碰盘（mkdir/rm/writeFile/
 *   rename/readFile）；事件协议（progress/extract-request 组包）留编排件
 *   （corpus.export.service）——事件不碰盘、盘面不发事件。
 * - INV-17 幂等范围句：corpus md front-matter 不含 exportedAt（时间戳只进
 *   manifest per-paper 条目）；contentSha/fulltextSha=文件字节 sha256
 *   （node:crypto）；**逐字节稳定的范围=产物文件**（corpus/fulltext/figures
 *   及其 sha）——manifest 自身含 exportedAt 不参与逐字节断言（golden 区分：
 *   内容 golden+manifest 结构断言）。
 * - R5/R8 终局单写锚定：manifest 终写=tmp+rename 原子替换（finalizeManifest）；
 *   会话开始删旧 manifest+清空重建三子目录（cleanRebuild——态空间迁移表 idle
 *   行，母本=export-session-state.ts）。
 */
import { createHash } from 'node:crypto'
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { INTERFACE_MD } from './interface-template'

/** manifest 临时文件名（终局单写 tmp+rename 原子替换——R5/R8）外提单源 */
export const MANIFEST_TMP = 'manifest.tmp.json'

/** manifest per-paper 条目（papers[] 只列成功篇）；ENR-02 缓存快照自声明
 *  （可选）：与 citedByCount 成对出现成对省略（无 count 则无时间戳——N-r2e）；
 *  contentSha 幂等以同缓存状态为前提 */
export interface ManifestPaper {
  paperId: string
  file: string
  title: string
  contentSha: string
  fulltextSha: string
  figures: string[]
  exportedAt: string
  citedByCount?: number
  citedByFetchedAt?: string
}

/** manifest 终局结构（schemaVersion/exportedAt/papers[]+可选 errors[]） */
export interface CorpusManifest {
  schemaVersion: 1
  exportedAt: string
  papers: ManifestPaper[]
  errors?: Array<{ paperId: string; reason: string }>
}

/** 会话开始清空重建（迁移表 idle 行）：三子目录+manifest 本体+tmp 残留；
 *  目录根用户其他文件不动。三子目录即导出产物域，用户的任意放置视为可清理。 */
export async function cleanRebuild(dir: string): Promise<void> {
  await rm(join(dir, 'manifest.json'), { force: true })
  await rm(join(dir, MANIFEST_TMP), { force: true })
  for (const sub of ['corpus', 'fulltext', 'figures']) {
    await rm(join(dir, sub), { recursive: true, force: true })
    await mkdir(join(dir, sub), { recursive: true })
  }
  await writeFile(join(dir, 'INTERFACE.md'), INTERFACE_MD, 'utf8')
}

/** corpus md 落盘（preparing 阶段——装配单源=corpus.assemble.ts，本件只写盘） */
export async function writeCorpusMd(dir: string, paperId: string, md: string): Promise<void> {
  await writeFile(join(dir, 'corpus', `${paperId}.md`), md, 'utf8')
}

/** fulltext 终写（页界 \f）+返回内容 sha256（INV-17 幂等口径） */
export async function writeFulltext(dir: string, paperId: string, text: string): Promise<string> {
  await writeFile(join(dir, 'fulltext', `${paperId}.txt`), text, 'utf8')
  return createHash('sha256').update(text, 'utf8').digest('hex')
}

/** 重读 corpus md 文件字节 sha（contentSha 幂等口径——与 writeFulltext 同 Hash 单源） */
export async function readCorpusSha(dir: string, paperId: string): Promise<string> {
  return createHash('sha256')
    .update(await readFile(join(dir, 'corpus', `${paperId}.md`), 'utf8'), 'utf8')
    .digest('hex')
}

/** figure 落盘（含 figDir mkdir）；返回 manifest 相对路径（figures/<id>/<name>）。
 *  name 由调用方构造消毒（renderer 载荷自由串不裸拼路径——消毒单源=
 *  services/shared/sanitize，F-DEDUP-01；本件不重复消毒纵深）。 */
export async function writeFigure(
  dir: string,
  paperId: string,
  name: string,
  buf: Buffer
): Promise<string> {
  const figDir = join(dir, 'figures', paperId)
  await mkdir(figDir, { recursive: true })
  await writeFile(join(figDir, name), buf)
  return `figures/${paperId}/${name}`
}

/** manifest 终局单写（R5/R8）：tmp 写入+rename 原子替换 */
export async function finalizeManifest(dir: string, manifest: CorpusManifest): Promise<void> {
  await writeFile(join(dir, MANIFEST_TMP), JSON.stringify(manifest, null, 2), 'utf8')
  await rename(join(dir, MANIFEST_TMP), join(dir, 'manifest.json'))
}

/** failSession 清理：manifest.tmp 残留删除（force+catch 语义随迁——清不掉不
 *  阻断 reject 路径；残留由下次会话 cleanRebuild 兜底清理） */
export async function removeManifestTmp(dir: string): Promise<void> {
  await rm(join(dir, MANIFEST_TMP), { force: true }).catch(() => undefined)
}
