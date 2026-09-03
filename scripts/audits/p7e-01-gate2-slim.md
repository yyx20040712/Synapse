# P7E-01 门二终审材料包·瘦身版（聚焦：回炉落地复核+收口就绪度）

## 0. 背景
- 门一 Kimi=PASS_WITH_WARNINGS(0B/3W/3N)。主控处置：W3 菜单 Esc/N1 busy 禁关/W1 恒真断言口径→已回炉（本轮复核对象）；W2 豁免（票面补记）；N2 遗留池；N3 归收口。
- 全量初审材料（票面全文+全部新文件+门一 JSON）你无需重审——聚焦下述终态证据。基线：单测 132 文件 1142 绿（实现者实测）；e2e 34/34 绿（主控亲跑在档）；lint/typecheck/quality/tickets 绿。

## 1. 回炉三处终态代码
### TagLifecycleMenu.tsx（W3：Esc 关闭）全文：
```typescript
// b3: P7-E
/**
 * [P7E-01] TagLifecycleMenu —— 标签右键菜单（TagFilter 子组件，LineageNodeMenu
 * 同型）。行为：fixed 定位于右键锚点；菜单项=重命名/合并到…（tags.length===1
 * 无其他目标时禁用——S9）/删除。透明遮罩点击关闭 + Esc 关闭（keydown 挂
 * document，unmount 清理——门一 W3 回炉：菜单轻量面键盘关闭自持，不依赖
 * Dialog 域）。所有动作只上抛回调——对话框宿主与写路径在 TagFilter。
 */
import { useEffect } from 'react'
import type { TagWithCount } from './tags.store'

const ITEM_STYLE = 'block w-full rounded px-3 py-1.5 text-left text-xs hover:bg-black/5'

export function TagLifecycleMenu(props: {
  tag: TagWithCount
  /** tags.length>1 才可合并（无其他目标——S9 禁用态） */
  canMerge: boolean
  anchor: { x: number; y: number }
  onClose(): void
  onRename(tag: TagWithCount): void
  onMerge(tag: TagWithCount): void
  onDelete(tag: TagWithCount): void
}): JSX.Element {
  const { tag, anchor } = props

  // Esc 关闭（W3）：挂 document 捕获 Escape，unmount 成对移除
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') props.onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [props.onClose])
  return (
    <>
      {/* 透明遮罩：点击任意处关闭（菜单本体 stopPropagation） */}
      <div className="fixed inset-0 z-40" onClick={props.onClose} />
      <div
        data-testid="tag-menu"
        role="menu"
        aria-label={`标签菜单：${tag.name}`}
        className="fixed z-50 w-40 rounded border py-1 shadow-lg"
        style={{
          left: anchor.x,
          top: anchor.y,
          background: 'var(--panel)',
          borderColor: 'var(--border)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          role="menuitem"
          className={ITEM_STYLE}
          style={{ color: 'var(--text)' }}
          onClick={() => props.onRename(tag)}
        >
          重命名
        </button>
        <button
          type="button"
          role="menuitem"
          className={`${ITEM_STYLE} disabled:opacity-50`}
          style={{ color: 'var(--text)' }}
          disabled={!props.canMerge}
          onClick={() => props.onMerge(tag)}
        >
          合并到…
        </button>
        <button
          type="button"
          role="menuitem"
          className={ITEM_STYLE}
          style={{ color: 'var(--danger)' }}
          onClick={() => props.onDelete(tag)}
        >
          删除
        </button>
      </div>
    </>
  )
}
```
### TagLifecycle.tsx（N1：busy 禁关——requestClose 包装）关键段（guard 定义+三对话框 onClose 接线）：
```typescript
import type { Tag } from '@shared/models/tag'
import { useTagsStore, type TagWithCount } from './tags.store'

/**
 * busy 守卫（ref 同步检查防同批双击——S8；setBusy 只管按钮禁用态渲染）。
 * requestClose=关闭守卫（N1）：mutation 飞行中 no-op——取消/遮罩/✕/Esc 全
 * 关闭路径统一过此门（Dialog 的 onClose 收包装后的回调）。
 */
function useBusyGuard(): {
  busy: boolean
  begin(): boolean
  end(): void
  requestClose(onClose: () => void): void
} {
  const pending = useRef(false)
  const [busy, setBusy] = useState(false)
  return {
    busy,
    begin(): boolean {
      if (pending.current) return false
      pending.current = true
      setBusy(true)
      return true
    },
    end(): void {
      pending.current = false
      setBusy(false)
    },
    requestClose(onClose: () => void): void {
      if (!pending.current) onClose()
    }
  }
}

/** onMutated 载荷：消失的标签 id（rename=null——id 稳定；merge=源 id；delete=自身 id） */
export type MutatedPayload = (disappearedId: string | null) => void

}): JSX.Element {
  const [value, setValue] = useState(props.tag.name)
  const guard = useBusyGuard()
  const renameTag = useTagsStore((s) => s.renameTag)
  const trimmed = value.trim()
  // N1：busy 飞行中禁关——Dialog 的 Esc/遮罩/✕ 全关闭路径经此包装
  const requestClose = (): void => guard.requestClose(props.onClose)

  async function save(): Promise<void> {
    if (trimmed === '' || !guard.begin()) return
    const r = await renameTag(props.tag.id, trimmed)
    if (r.ok) {
      // rename：id 稳定→筛选不动（S5），disappearedId=null
      props.onMutated(null)
      props.onClose()
    } else {
      // S6：toast+保持开（输入保留），发起方 toast 契约
      showToast(r.error.message, 'error')
      guard.end()
    }
  }

  return (
    <Dialog open title={`重命名标签：${props.tag.name}`} onClose={requestClose}>
      <input
        aria-label="新标签名"
19: * requestClose=关闭守卫（N1）：mutation 飞行中 no-op——取消/遮罩/✕/Esc 全
26:  requestClose(onClose: () => void): void
42:    requestClose(onClose: () => void): void {
61:  const requestClose = (): void => guard.requestClose(props.onClose)
78:    <Dialog open title={`重命名标签：${props.tag.name}`} onClose={requestClose}>
84:        disabled={guard.busy}
95:          disabled={guard.busy}
96:          onClick={requestClose}
124:  const requestClose = (): void => guard.requestClose(props.onClose)
139:    <Dialog open title={`合并标签：${props.source.name}`} onClose={requestClose}>
150:            disabled={guard.busy}
162:          disabled={guard.busy}
163:          onClick={requestClose}
180:  const requestClose = (): void => guard.requestClose(props.onClose)
195:    <Dialog open title={`删除标签：${props.tag.name}`} onClose={requestClose}>
206:          disabled={guard.busy}
207:          onClick={requestClose}
215:          disabled={guard.busy}
```
### tags-lifecycle.repo.test.ts 注释口径（W1）：
15: * 残留死 id）是 **schema 前瞻守卫**：001_init.sql 的 tag_id 外键为 ON DELETE
16: * CASCADE，标签行删除即级联清挂接，当前 schema 下两断言恒真、变异杀伤率为
17: * 零——M1（删第二步 DELETE）的**实际红锚=本文件末尾的事务编排 mock 用例**
18: * （第二步语句被桩武装为抛错、变异后不再调用→toThrow 失败）。前瞻守卫保留：
19: * 若未来 CASCADE 改 RESTRICT/去级联，raw COUNT 即转正为首道防线。
59:    // schema 前瞻守卫（W1 如实口径）：paper_tags 不残留死源 id——当前 CASCADE
60:    // 下恒真、变异杀伤率为零（标签行删除即级联清挂接）；M1 实际红锚=本文件
61:    // 末尾的事务编排 mock 用例。若 CASCADE 改弱此处转正为首道防线
74:    // schema 前瞻守卫（W1 如实口径）：同上——CASCADE 下恒真，编排锚在 merge

## 2. 新增两锚（回炉伴随测试，先红后绿在档）
```typescript
  it('S9 tags.length===1 时菜单「合并到…」禁用（无其他目标）', async () => {
    currentTags = [{ id: 't-1', name: '甲', paperCount: 0 }]
    await render(null, vi.fn(), vi.fn())
    await rightClick('甲（0）')
    const mergeBtn = buttonByText('合并到…')
    expect(mergeBtn, '菜单项在场').toBeDefined()
    expect(mergeBtn?.disabled, '单标签无合并目标——禁用').toBe(true)
  })

  it('W3：菜单开→按 Escape→菜单关闭（keydown 关闭契约，unmount 清理）', async () => {
    currentTags = [{ id: 't-1', name: '甲', paperCount: 0 }]
    await render(null, vi.fn(), vi.fn())
    await rightClick('甲（0）')
    expect(host?.querySelector('[data-testid="tag-menu"]'), '菜单在场').not.toBeNull()
    await act(async () => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    })
    expect(host?.querySelector('[data-testid="tag-menu"]'), 'Escape 后菜单关闭').toBeNull()
  })

  it('N1：delete 提交飞行中取消被阻断（按钮禁用+Esc/遮罩 onClose no-op），resolve 成功后才关', async () => {
    currentTags = [{ id: 't-1', name: '甲', paperCount: 2 }]
    await render(null, vi.fn(), vi.fn())
    let resolveDelete!: (v: unknown) => void
    stubApi.tags.delete.mockImplementation(
      () => new Promise((r) => { resolveDelete = r })
    )
    await rightClick('甲（2）')
    await click(buttonByText('删除'), '菜单·删除')
    await click(buttonByText('确认删除', dialog()!), '对话框·确认删除')
    // busy 飞行中：取消按钮禁用（与保存/确认 disabled 态对齐——N1）
    expect(buttonByText('取消', dialog()!)?.disabled, 'busy 期取消禁用').toBe(true)
    // Dialog 自身 Esc 关闭路径经包装 onClose → no-op：对话框不得关
    await act(async () => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    })
    expect(dialog(), 'busy 中 Esc 不得关闭（对话框已关、变更随后生效=语义错位）').not.toBeNull()
    // mutation 成功落定 → 关闭走成功路径
    await act(async () => {
      resolveDelete({ ok: true, data: { ok: true } })
      await new Promise((r) => setTimeout(r, 0))
    })
    expect(dialog(), 'resolve 成功后对话框关闭').toBeNull()
  })
})
```

## 3. 主进程终态（门一已审过，此处供一致性抽查——repo 生命周期方法+service 校验序）
```typescript
       JOIN paper_tags pt ON pt.tag_id = t.id
      WHERE pt.paper_id = ?
      ORDER BY t.name ASC`
  )
  // ── P7E-01 生命周期语句 ──
  const renameTagStmt = db.prepare<[string, string]>('UPDATE tags SET name = ? WHERE id = ?')
  // 迁移参数序=(target, source)：SELECT 列位在前（目标），WHERE 在后（源）
  const migrateAttachments = db.prepare<[string, string]>(
    `INSERT OR IGNORE INTO paper_tags (paper_id, tag_id)
     SELECT paper_id, ? FROM paper_tags WHERE tag_id = ?`
  )
  const deleteAttachmentsByTag = db.prepare<[string]>('DELETE FROM paper_tags WHERE tag_id = ?')
  const deleteTagRow = db.prepare<[string]>('DELETE FROM tags WHERE id = ?')
  // 跨表多写用 db.transaction（头注架构层条款）：第二步失败则后续不落地
  const mergeTagsTxn = db.transaction((sourceId: string, targetId: string): void => {
    migrateAttachments.run(targetId, sourceId)
    deleteAttachmentsByTag.run(sourceId)
    deleteTagRow.run(sourceId)
  })
  const deleteTagTxn = db.transaction((tagId: string): void => {
    deleteAttachmentsByTag.run(tagId)
    deleteTagRow.run(tagId)
  })

  return {
    upsertByName(name: string): Tag {
      // 冲突时忽略插入，随后按名回读：新插入行与既有行统一走同一条 SELECT
      insertTag.run(crypto.randomUUID(), name)
      const row = tagByName.get(name)
      if (row === undefined) {
        // 不可达分支：DO NOTHING 后 name 必有对应行（新插入或同名既有）
        throw new Error(`tags.repo.upsertByName：按名回读失败（name=${name}）`)
      }
      return { id: row.id, name: row.name }
    },

    listWithCounts(): Array<Tag & { paperCount: number }> {
      // LEFT JOIN 保证孤儿标签以 paperCount=0 出现
      return tagsWithCounts.all().map((row) => ({
        id: row.id,
        name: row.name,
        paperCount: row.paper_count
      }))
    },

    attach(paperId: string, tagId: string): void {
      // OR IGNORE：重复挂接幂等（复合主键 paper_id+tag_id 冲突被吞掉）
      attachTag.run(paperId, tagId)
    },

    detach(paperId: string, tagId: string): void {
      detachTag.run(paperId, tagId)
    },

    namesByPaper(paperId: string): string[] {
      return tagNamesByPaper.all(paperId).map((row) => row.name)
    },

    findByName(name: string): Tag | undefined {
      return tagByName.get(name) ?? undefined
    },

    renameTag(id: string, name: string): boolean {
      return renameTagStmt.run(name, id).changes > 0
    },

    mergeTags(sourceId: string, targetId: string): void {
      mergeTagsTxn(sourceId, targetId)
    },

    deleteTag(id: string): void {
      deleteTagTxn(id)
    }
  }
}
    async rename(req) {
      const name = req.name.trim()
      if (name === '') {
        // zod min(1) 拦不住纯空格——service 防御（票面校验序第 1 步）
        throw new TagsDomainError('INVALID_REQUEST', '标签名不能为空')
      }
      if (!tags.listWithCounts().some((t) => t.id === req.tagId)) {
        throw new TagsDomainError('NOT_FOUND', '标签不存在')
      }
      const clash = tags.findByName(name)
      if (clash !== undefined && clash.id !== req.tagId) {
        // 不自动合并：同名占用必须显式走 merge 通道（数据语义变更）
        throw new TagsDomainError('CONFLICT', '标签名已被占用')
      }
      tags.renameTag(req.tagId, name)
      // 冲突已排除：同名行只能是自身——直接构造更新后 Tag（幂等路径亦成立）
      return { id: req.tagId, name }
    },

    async merge(req) {
      if (req.sourceId === req.targetId) {
        throw new TagsDomainError('INVALID_REQUEST', '不能合并到自身')
      }
      const ids = new Set(tags.listWithCounts().map((t) => t.id))
      if (!ids.has(req.sourceId)) {
        throw new TagsDomainError('NOT_FOUND', `合并源标签不存在：${req.sourceId}`)
      }
      if (!ids.has(req.targetId)) {
        throw new TagsDomainError('NOT_FOUND', `合并目标标签不存在：${req.targetId}`)
      }
      tags.mergeTags(req.sourceId, req.targetId)
      return { ok: true as const }
    },

    async delete(req) {
```

## 4. 受锁面变更（收口 [locked-change] 尾注对象）
```diff
diff --git a/src/shared/ipc/api-surface.ts b/src/shared/ipc/api-surface.ts
index 5727a67581..b66352c9cb 100644
--- a/src/shared/ipc/api-surface.ts
+++ b/src/shared/ipc/api-surface.ts
@@ -84,7 +84,11 @@ export const API_SURFACE = {
     list: { channel: 'tags/list', Req: S.voidReqSchema, Res: z.array(S.tagWithCountSchema) },
     upsert: { channel: 'tags/upsert', Req: S.tagNameReqSchema, Res: tagSchema },
     attach: { channel: 'tags/attach', Req: S.attachTagReqSchema, Res: S.trueAckSchema },
-    detach: { channel: 'tags/detach', Req: S.detachTagReqSchema, Res: S.trueAckSchema }
+    detach: { channel: 'tags/detach', Req: S.detachTagReqSchema, Res: S.trueAckSchema },
+    // P7E-01 标签生命周期三通道（register/preload 泛型全通道遍历零改）
+    rename: { channel: 'tags/rename', Req: S.renameTagReqSchema, Res: tagSchema },
+    merge: { channel: 'tags/merge', Req: S.mergeTagReqSchema, Res: S.trueAckSchema },
+    delete: { channel: 'tags/delete', Req: S.tagIdReqSchema, Res: S.trueAckSchema }
   },
   notes: {
     get: { channel: 'notes/get', Req: S.paperIdReqSchema, Res: S.noteGetResSchema },
diff --git a/src/shared/ipc/schemas.ts b/src/shared/ipc/schemas.ts
index 950de3e3ee..f0608e1913 100644
--- a/src/shared/ipc/schemas.ts
+++ b/src/shared/ipc/schemas.ts
@@ -347,6 +347,16 @@ export const attachTagReqSchema = z
   .object({ paperId: z.string().min(1), tagId: z.string().min(1) })
   .strict()
 export const detachTagReqSchema = attachTagReqSchema
+/** P7E-01 标签生命周期三请求（delete） */
+export const tagIdReqSchema = z.object({ tagId: z.string().min(1) }).strict()
+/** P7E-01 rename（name 与 upsert 同界：min(1) 拦不住纯空格，service 层再 trim 判空） */
+export const renameTagReqSchema = z
+  .object({ tagId: z.string().min(1), name: z.string().min(1).max(50) })
+  .strict()
+/** P7E-01 merge（source===target 的业务拒绝在 service——zod 表达不了跨字段） */
+export const mergeTagReqSchema = z
+  .object({ sourceId: z.string().min(1), targetId: z.string().min(1) })
+  .strict()
 
 // ── notes ───────────────────────────────────────────────────────
 export const noteGetResSchema = noteSchema.nullable()
```
- 新测试文件 5 件（4 unit+1 e2e spec）将 locks:generate+apply 入 manifest（241→246 预期）。

## 5. 实现者报告 §8 回炉轮（自报）
## 8. 回炉一轮（门一 Kimi PASS_WITH_WARNINGS——主控裁决三项，2026-09-03）

处置对照（W2 豁免补记/N2 遗留池/N3 主控收口——不动实现面）：

- **W3 Esc 关闭**（TagLifecycleMenu.tsx）：补 useEffect keydown 监听（Escape→
  props.onClose()，unmount 成对移除；deps=[props.onClose]）；头注「ESC 归
  Dialog 域」旧口径改「菜单轻量面键盘关闭自持」。
- **N1 busy 期取消未禁**（TagLifecycle.tsx 三对话框）：useBusyGuard 增
  requestClose（pending 时 no-op）；三对话框 Dialog onClose 全量收包装回调
  （Esc/遮罩/✕ 全关闭路径过同一门）+取消按钮 disabled={guard.busy}
  （disabled:opacity-50 态与保存/确认对齐）。行数复核：223 行（≤250）。
- **W1 恒真断言口径**（tags-lifecycle.repo.test.ts）：merge/delete 两处 raw
  COUNT 注释改如实口径「schema 前瞻守卫——当前 ON DELETE CASCADE 下恒真、
  变异杀伤率为零，M1 实际红锚=事务编排 mock 用例；CASCADE 改弱则转正为首道
  防线」；测试头注同步登记（含 Kimi 实锤出处）。
- **测试补锚**（tag-lifecycle-ui.test.tsx +2 it，always-active，先红后修）：
  ①W3：菜单开→dispatch keydown Escape→菜单关闭；②N1：delete 提交飞行中
  （pending promise 挂起）取消按钮 disabled+Escape（Dialog 自身关闭路径）不
  得关→resolve 成功后才关。先红证落盘：
  `scripts/audits/p7e-01-red/tag-lifecycle-ui-esc.raw.txt`（1 failed——菜单未关）、
  `scripts/audits/p7e-01-red/tag-lifecycle-ui-busycancel.raw.txt`（1 failed——
  取消未禁用）；修后绿证：`scripts/audits/p7e-01-green/rework-ui-repo.raw.txt`
  （13/13）。

回炉后全量：**npm test 132 文件 / 1142 用例全绿**（1140+2 新锚，
`full-unit-rework.raw.txt` 在档）+lint/typecheck/quality:check 全绿。
超票面自裁申报：无（三修+两锚均主控裁决票面内；测试头注补登属文档面同步）。
