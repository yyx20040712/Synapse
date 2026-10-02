import { test, expect, type Page } from '@playwright/test'
import { mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { bootstrapMigrations, launch, seedPaperRow } from './e2e-env'

/**
 * [F-FOLDER-02·F/S1] move-paper e2e —— 移动事务序（design §3.4+W2 终裁）：
 * ①移动 F1→F2：节点跟图+跨图直接连线清理（边清理面）；②移出→未归档：节点删
 * （边随 CASCADE 灭）+库页未归档态可见；③S1 队列闸互斥（INV-91——lineage
 * pending 期移动被拒，real setQuitDirty 通道注入 pending 信号=闸判定单源）。
 * setup 经真实 window.api 通道（moveFolder 自动建节点=「导入到文件夹」同族
 * 语义链）；断言锚真实渲染文本（脉络卡片/库行）。
 */

const PAPERS = [
  { id: 'e2e-mp-a', title: '移动甲文献', year: 2020 },
  { id: 'e2e-mp-b', title: '移动乙文献', year: 2021 },
  { id: 'e2e-mp-c', title: '移动丙文献', year: 2022 }
] as const

interface GraphFace {
  nodes: Array<{ id: string; paperId: string | null }>
  edges: Array<{ id: string }>
}

const graphOf = (win: Page, folderId?: string): Promise<GraphFace> =>
  win.evaluate(async (fid: string | undefined) => {
    const r = await window.api.lineage.graph(fid == null ? {} : { folderId: fid })
    return r.ok ? (r.data as GraphFace) : { nodes: [], edges: [] }
  }, folderId)

const nodeCard = (win: Page, title: string) =>
  win.locator('.tl-card[data-node-id]').filter({ hasText: title })

test('移动 F1→F2 边清理+移出→未归档节点删+S1 队列闸拒绝', async () => {
  const userData = await mkdtemp(join(tmpdir(), 'synapse-ff02-move-'))
  await bootstrapMigrations(userData)
  for (const p of PAPERS) {
    await seedPaperRow(userData, 'a.pdf', `sha-${p.id}`, p.title, p.id, { year: p.year })
  }
  const app = await launch(userData)
  const win = await app.firstWindow()
  await expect(win.getByRole('button', { name: '文献库' })).toBeVisible({ timeout: 20_000 })

  // setup：建两文件夹；A/B 归夹一（自动建节点）、C 归夹二；A→B 连线（夹一内）
  const mkFolder = async (name: string): Promise<string> => {
    const id = await win.evaluate(async (n) => {
      const r = await window.api.folders.create({ name: n })
      return r.ok ? r.data.id : ''
    }, name)
    expect(id).not.toBe('')
    return id
  }
  const f1 = await mkFolder('文件夹一')
  const f2 = await mkFolder('文件夹二')
  for (const pid of ['e2e-mp-a', 'e2e-mp-b']) {
    const ok = await win.evaluate(
      async (x: { pid: string; fid: string }) =>
        (await window.api.papers.moveFolder({ paperId: x.pid, toFolderId: x.fid })).ok,
      { pid, fid: f1 }
    )
    expect(ok).toBe(true)
  }
  expect(
    await win.evaluate(
      async (fid: string) =>
        (await window.api.papers.moveFolder({ paperId: 'e2e-mp-c', toFolderId: fid })).ok,
      f2
    )
  ).toBe(true)
  const g1 = await graphOf(win, f1)
  const aNode = g1.nodes.find((n) => n.paperId === 'e2e-mp-a')
  const bNode = g1.nodes.find((n) => n.paperId === 'e2e-mp-b')
  expect(aNode).toBeDefined()
  expect(bNode).toBeDefined()
  expect(
    await win.evaluate(
      async (x: { from: string; to: string }) =>
        (
          await window.api.lineage.upsertEdge({ from: x.from, to: x.to, label: '主线' })
        ).ok,
      { from: aNode!.id, to: bNode!.id }
    )
  ).toBe(true)

  // ①S1 队列闸（INV-91）：lineage pending 期移动被拒（real 通道注入 pending
  // 信号——App useLineageDirty→setQuitDirty 同源；闸=main 侧判定）
  await win.evaluate(() => window.api.system.setQuitDirty({ dirty: true, lineagePending: true }))
  const gated = await win.evaluate(
    async (fid: string) =>
      (await window.api.papers.moveFolder({ paperId: 'e2e-mp-b', toFolderId: fid })) as {
        ok: boolean
        error?: { code: string; message: string }
      },
    f2
  )
  expect(gated.ok).toBe(false)
  expect(gated.error?.code).toBe('CONFLICT')
  expect(gated.error?.message).toContain('脉络图编辑保存中，请先完成保存再操作文献归属')
  // 复位 pending（闸解除——后续移动放行）
  await win.evaluate(() => window.api.system.setQuitDirty({ dirty: true, lineagePending: false }))

  // ②移动 B：夹一→夹二（节点跟图+A→B 跨图直接连线清理）
  expect(
    await win.evaluate(
      async (fid: string) =>
        (await window.api.papers.moveFolder({ paperId: 'e2e-mp-b', toFolderId: fid })).ok,
      f2
    )
  ).toBe(true)
  expect((await graphOf(win, f1)).edges).toHaveLength(0) // 边清理（夹一零残留）
  expect((await graphOf(win, f2)).nodes.map((n) => n.paperId).sort()).toEqual([
    'e2e-mp-b',
    'e2e-mp-c'
  ])
  // 渲染面：夹一图=A 独卡；夹二图=B/C 双卡（真实文本）——[F-LGRAPH-01①]
  // 图切换经导航窗格下拉（并集切换器 select 退役）
  await win.getByRole('button', { name: '脉络', exact: true }).click()
  await win.getByTestId('lineage-nav-graph').click()
  await win.getByTestId('lineage-nav-graph-menu').getByRole('option', { name: '文件夹一' }).click()
  await expect(nodeCard(win, '移动甲文献')).toBeVisible({ timeout: 10_000 })
  await expect(nodeCard(win, '移动乙文献')).toHaveCount(0)
  await win.getByTestId('lineage-nav-graph').click()
  await win.getByTestId('lineage-nav-graph-menu').getByRole('option', { name: '文件夹二' }).click()
  await expect(nodeCard(win, '移动乙文献')).toBeVisible({ timeout: 10_000 })

  // ③移出→未归档：B 节点删（边随 CASCADE 灭）+库页未归档态行可见
  expect(
    await win.evaluate(
      async () =>
        (await window.api.papers.moveFolder({ paperId: 'e2e-mp-b', toFolderId: null })).ok
    )
  ).toBe(true)
  expect((await graphOf(win, f2)).nodes.map((n) => n.paperId)).toEqual(['e2e-mp-c'])
  await win.getByRole('button', { name: '文献库' }).click()
  await win.locator('.lib-fn-row').filter({ hasText: '未归档' }).click()
  await expect(win.getByText('移动乙文献')).toBeVisible({ timeout: 10_000 })

  // 收尾复位 dirty（S1 注入的 quit-dirty 信号会触发退出拦截——app.close 挂起）
  await win.evaluate(() => window.api.system.setQuitDirty({ dirty: false, lineagePending: false }))
  await app.close()
})
