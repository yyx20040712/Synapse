/**
 * [SR2-AI-05] tools/ai-sensor queue —— diff/幂等/断点续跑三面（锁定合约）。
 * 纯函数面：diffQueue（manifest↔progress diff）/applyDone（篇终局翻转）/
 * freshProgress（空进度种子）——IO（读 manifest/写 progress.json 原子更新）
 * 与纯函数分离，主循环骨架不在单测面（工具侧无渲染/DB 面）。
 */
import { expect, it } from 'vitest'
import {
  applyDone,
  diffQueue,
  freshProgress,
  PROGRESS_SCHEMA_VERSION,
  type CorpusManifest,
  type ManifestPaper,
  type ProgressState
} from '../../../tools/ai-sensor/queue.mjs'
import { guardedDescribe } from '../../utils/guard'

function paper(paperId: string, title: string): ManifestPaper {
  return {
    paperId,
    file: `corpus/${paperId}.md`,
    title,
    contentSha: `sha-c-${paperId}`,
    fulltextSha: `sha-f-${paperId}`,
    figures: [`figures/${paperId}/page-1.png`],
    exportedAt: '2026-08-27T00:00:00.000Z'
  }
}

function manifestOf(...papers: ManifestPaper[]): CorpusManifest {
  return { schemaVersion: 1, exportedAt: '2026-08-27T00:00:00.000Z', papers }
}

function doneItem(paperId: string, outputs: string[]): { paperId: string; status: 'done'; outputs: string[] } {
  return { paperId, status: 'done', outputs }
}

guardedDescribe('SR2-AI-05', 'queue.mjs —— manifest↔progress diff 队列（纯函数核心）', () => {
  it('diff 面：空进度=全量入队（序=manifest papers 序；条目含 file/title/fulltext/figures 消费指针）', () => {
    const m = manifestOf(paper('p-1', '论文一'), paper('p-2', '论文二'), paper('p-3', '论文三'))
    const plan = diffQueue(m, freshProgress(m))
    expect(plan.pending.map((p) => p.paperId)).toEqual(['p-1', 'p-2', 'p-3'])
    expect(plan.pending[0]).toEqual({
      paperId: 'p-1',
      file: 'corpus/p-1.md',
      title: '论文一',
      fulltext: 'fulltext/p-1.txt',
      figures: ['figures/p-1/page-1.png']
    })
    expect(plan.doneCount).toBe(0)
    expect(plan.totalCount).toBe(3)
  })

  it('幂等面：全部 done 后再 diff=空队（已 done 篇不重跑）；applyDone 重复调用不重复入条目（outputs 覆盖）', () => {
    const m = manifestOf(paper('p-1', '论文一'), paper('p-2', '论文二'))
    let progress: ProgressState = freshProgress(m)
    progress = applyDone(progress, 'p-1', ['corpus-ai/p-1/first-read.md'])
    progress = applyDone(progress, 'p-2', ['corpus-ai/p-2/first-read.md'])
    const plan = diffQueue(m, progress)
    expect(plan.pending).toEqual([])
    expect(plan.doneCount).toBe(2)
    expect(plan.totalCount).toBe(2)
    // 幂等重跑：同篇再 applyDone=outputs 覆盖，不追加第二条目
    const again = applyDone(progress, 'p-2', ['corpus-ai/p-2/first-read-v2.md'])
    expect(again.items.filter((i) => i.paperId === 'p-2')).toHaveLength(1)
    expect(again.items.find((i) => i.paperId === 'p-2')?.outputs).toEqual([
      'corpus-ai/p-2/first-read-v2.md'
    ])
  })

  it('断点续跑面：部分 done=恰剩余篇入队（zcode 会话中断后 done 篇不重跑）', () => {
    const m = manifestOf(paper('p-1', '论文一'), paper('p-2', '论文二'), paper('p-3', '论文三'))
    let progress: ProgressState = freshProgress(m)
    progress = applyDone(progress, 'p-2', ['corpus-ai/p-2/out.md'])
    const plan = diffQueue(m, progress)
    expect(plan.pending.map((p) => p.paperId)).toEqual(['p-1', 'p-3'])
    expect(plan.doneCount).toBe(1)
  })

  it('重导后新篇：manifest 新增篇入队、done 保持；progress 中已不在 manifest 的条目=staleIds 报告（不参与队列）', () => {
    const old = manifestOf(paper('p-1', '论文一'))
    let progress: ProgressState = freshProgress(old)
    progress = applyDone(progress, 'p-1', ['corpus-ai/p-1/out.md'])
    // 重导：p-1 保留、p-2 新增、p-9 曾在旧 progress（库中已删）
    progress = {
      schemaVersion: PROGRESS_SCHEMA_VERSION,
      items: [...progress.items, doneItem('p-9', ['corpus-ai/p-9/out.md'])]
    }
    const m2 = manifestOf(paper('p-1', '论文一'), paper('p-2', '论文二'))
    const plan = diffQueue(m2, progress)
    expect(plan.pending.map((p) => p.paperId)).toEqual(['p-2'])
    expect(plan.doneCount).toBe(1)
    expect(plan.staleIds).toEqual(['p-9'])
  })

  it('纯函数契约：applyDone/freshProgress 不 mutate 入参（progress 写盘前可安全重算）', () => {
    const m = manifestOf(paper('p-1', '论文一'), paper('p-2', '论文二'))
    const fresh = freshProgress(m)
    const before = JSON.stringify(fresh)
    const next = applyDone(fresh, 'p-1', ['corpus-ai/p-1/out.md'])
    expect(JSON.stringify(fresh)).toBe(before)
    expect(next.schemaVersion).toBe(PROGRESS_SCHEMA_VERSION)
    expect(next.items).toHaveLength(2)
    const p1 = next.items.find((i) => i.paperId === 'p-1')
    expect(p1?.status).toBe('done')
    expect(fresh.items.find((i) => i.paperId === 'p-1')?.status).toBe('pending')
  })

  it('freshProgress：全篇 pending 种子+schemaVersion 版本位', () => {
    const m = manifestOf(paper('p-1', '论文一'))
    const fresh = freshProgress(m)
    expect(fresh.schemaVersion).toBe(PROGRESS_SCHEMA_VERSION)
    expect(fresh.items).toEqual([{ paperId: 'p-1', status: 'pending', outputs: [] }])
  })
})
