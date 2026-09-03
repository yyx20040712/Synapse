# B7 门审材料包（tags upsert 空判守卫——AUDIT-B W1 修票，主控压缩票 SR2-F-09 形态）

## 0. 背景
AUDIT-B 扫描 B7 探针实锤 upsert 纯空格名入库 name 空行（auditb-scan.md §B7+真库 IPC 转储 b7.json）；对抗审 PASS_WITH_WARNINGS 无异议。修=对齐同文件 rename 面既有先例（trim 空 INVALID_REQUEST）。基线 135 文件 1160 用例/locks 250/e2e 35。先红 2 failed（守卫缺席）→绿 3 passed→变异 M1 定点撤卫 2 failed 还原核毕。

## 1. 票面
```markdown
# B7 工单票面——tags upsert 纯空格名空判守卫（AUDIT-B W1 修票，主控压缩票）

> registry：`B7` / file `src/main/services/tags.service.ts` / area service / strong
> 排程真相源=v30 §2 第 1 项（AUDIT-B 开审）→扫描 B7-W1（auditb-scan.md §B7+
> 对抗审 PASS_WITH_WARNINGS 无异议）。
> 形态=主控压缩票直做（SR2-F-09 先例：单卫语句+测试面，担责披露——门审照走双门）。

## 出处与现象

- P7E-01 票面 §⑤ 已知边界预告+B7 探针实锤（auditb-b7.js 真库 IPC：
  `upsert('   ')` → ok 应答+DB name='' 行 1 条+list 浮出）。
- 根因：`tags.service.ts upsert` 仅 `req.name.trim()` 后直传 repo——trim 结果
  空串无守卫（同文件 rename 面已有同型守卫先例：INVALID_REQUEST
  「标签名不能为空」）。

## 修法（对齐 rename 先例）

```ts
async upsert(req) {
  const name = req.name.trim()
  if (name === '') {
    throw new TagsDomainError('INVALID_REQUEST', '标签名不能为空')
  }
  return tags.upsertByName(name)
}
```

- 消费面（TagEditor createAndAttach）既有 catch→toast 链零改。
- 边界申报：存量库已有的 name='' 行不迁移（用户可经 P7E-01 删除面手清——
  票面外）。
- 头注行为层同步一行（upsert：trim 空拒）。

## 测试规约（TDD）

- 新文件 `tests/unit/services/tags-upsert-guard.test.ts`（既有 service 测试受锁
  不动）：①纯空格名→INVALID_REQUEST「标签名不能为空」（repo 桩零调用）；
  ②正常名透传 upsertByName(trim 后)；③前后空白名 trim 后入库。
- 变异红证 M1：删卫语句（恒假短路）→用例①红（grep 命中证明+cp 备份还原
  diff 空）。

## 验收

- verify 全绿（基线 135 文件 1160+3 用例）+门一 Kimi+门二 deepseek 双 PASS
  （小 diff 包）+registry B7 翻 done+新测试入锁（250→251）+[locked-change] 尾注
  （tags.service.ts 非受锁——仅新测试入锁与 manifest）。

```

## 2. diff（tags.service.ts+registry）
```diff
diff --git a/src/main/services/tags.service.ts b/src/main/services/tags.service.ts
index a4773d0428..051015f6a4 100644
--- a/src/main/services/tags.service.ts
+++ b/src/main/services/tags.service.ts
@@ -3,7 +3,7 @@
  *
  * ── 行为层 ──
  * - list：repos.tags.listWithCounts()
- * - upsert：repos.tags.upsertByName（去空格）
+ * - upsert：repos.tags.upsertByName（去空格；trim 空 INVALID_REQUEST——B7）
  * - attach/detach：转调 repo 后返回 { ok: true }
  * - 生命周期三操作（P7E-01，错误语义归 service、数据事实归 repo）：
  *   rename：trim 空→INVALID_REQUEST；tagId 不存在→NOT_FOUND；与其他标签
@@ -52,9 +52,14 @@ export function createTagsService(deps: { repos: Repos }): ApiHandlers['tags'] {
       return tags.listWithCounts()
     },
 
-    // 同名幂等由 repo 的 upsertByName 保证；service 只做输入清理（去首尾空格）
+    // 同名幂等由 repo 的 upsertByName 保证；service 只做输入清理（去首尾空格；
+    // trim 后空串拒绝——B7/AUDIT-B W1：纯空格名曾入库 name='' 行，对齐 rename 先例）
     async upsert(req) {
-      return tags.upsertByName(req.name.trim())
+      const name = req.name.trim()
+      if (name === '') {
+        throw new TagsDomainError('INVALID_REQUEST', '标签名不能为空')
+      }
+      return tags.upsertByName(name)
     },
 
     // INSERT OR IGNORE：重复挂接幂等，无需存在性分支
diff --git a/tickets/registry.ts b/tickets/registry.ts
index c947d1b99d..e86dcd2db3 100644
--- a/tickets/registry.ts
+++ b/tickets/registry.ts
@@ -232,6 +232,7 @@ export const TICKETS: readonly Ticket[] = [
   { id: 'F-R3', file: 'src/renderer/features/reader/CorpusExtractor.ts', area: 'reader', owner: 'strong', status: 'done', summary: 'AUDIT-C C-1 修票（二波场 2026-09-02）：轨二 c=P6 泄漏闭（settleLoadTask 纯函数——加载失败 destroy 恰一次+自身拒绝吞并+await settle 后重抛原错误；loadPdfDocument 接线保 task 句柄；头注状态机表证伪格改如实双路径）；轨一 e=上游查证（f-r3-upstream-check.md：v5.5.207 已修主逃逸点 onFailure 终接守卫/6.3.289 另有 destroy() 族硬化/master pdfManagerReady 悬尾仍在）→**终裁不升级**（任一档位不承诺零同族噪声+跨 major 回归面不换 devtools-only 收益；升级再评估触发条件=上游悬尾族全消）；轨二 b=destroy 序列化不采（无消噪声收益+切换串行延迟确定代价）；INV-49 登记（worker-per-task+销毁序+接受残余+代理计数监控锚）；门一 Kimi 3B/2W/0N PASS+门二 deepseek 2B/1W/2N PASS（W1 变异红证缺口主控补销=变异 A 同引用重抛/B 恰一次/C 顺序 settle+顺序测试 1 it；W2 upstream 档补包+降噪论证补强）；实现者 GLM5.3 统一档 1.94M tok+主控压缩票三变异；票面 f-r3-fix-brief.md+报告 f-r3-fix-impl.report.md+四门审档在档' },
   { id: 'P7E-01', file: 'src/main/db/repos/tags.repo.ts', area: 'db', owner: 'strong', status: 'done', summary: '标签生命周期（改名/合并/删除——P7-E 预留点清扫首票；b3: P7-E+B1 §3 预留 tags.service.ts:16+TagEditor.tsx:92；repo 四方法含跨表事务/service 校验序（NOT_FOUND/CONFLICT/自合并 INVALID_REQUEST）/三 IPC 通道 [locked-change]/renderer store 命令型动作+TagFilter 右键管理面（TagLifecycle+TagLifecycleMenu 拆件）；态空间 S1~S10+INV-53 登记；门一 Kimi 0B/3W/3N（W3 Esc/W1 恒真口径回炉+W2 S10 豁免补记）+门二 deepseek PASS 零回炉；单测 132 文件 1142（+29）/e2e 34（+1）；票面 scripts/audits/p7e-01-brief.md+三报告档在案）' },
   { id: 'P7E-02', file: 'src/main/ipc/import_.ts', area: 'ipc', owner: 'strong', status: 'done', summary: '拖拽导入（P7-E 预留点清扫二票；b3: P7-E+B1 §3 预留 ipc/import_.ts:18+ImportDropZone.tsx:7；Design=fromPaths 通道对 renderer 隐藏（PRELOAD_HIDDEN_METHODS const+类型双消费单源）+apiDrag.importDropped 桥（webUtils 解析+planDroppedImports 三滤：合成 File 解析空串/类型门（File.type 为空剔除——目录项恒空类型）/后缀 .pdf+数量门 100 双层）——路径串不出 preload 堆；INV-07 修订（路径来源扩列）+INV-54 登记；态空间 D1~D8；门一 Kimi 0B/2W/2N（W2 目录命名 *.pdf 击穿→类型门回炉+M5 变异/N1N2 注释回炉；W1=门一包漏 tests/ diff 主控门二补包核实=纯减集改向）+门二 deepseek PASS 零发现；单测 135 文件 1160（+18）/e2e 35 用例 34+1 探针 flake 单现复跑绿未立案；票面 scripts/audits/p7e-02-brief.md+报告+双门审档在案）' },
+  { id: 'B7', file: 'src/main/services/tags.service.ts', area: 'service', owner: 'strong', status: 'open', summary: 'tags upsert 纯空格名空判守卫（AUDIT-B W1 修票——B7 探针实锤 upsert 空格串入库 name 空行；修=对齐 rename 先例 trim 空 INVALID_REQUEST；主控压缩票 SR2-F-09 形态；票面 scripts/audits/b7-brief.md）' },
   { id: 'C-A3', file: 'src/renderer/features/notes/notes.store.ts', area: 'reader', owner: 'strong', status: 'done', summary: 'AUDIT-C C-3 扫描 §1.2-a 主候选修票（二波场 2026-09-02）：notes 防抖悬置写三件套=①discard API（discardPendingEdit/discardAllPendingEdits——清 timer+四元数据+条目，幂等）②in-flight 代际守卫（discardGen 派发快照+.then/.catch 回调首行全 no-op——防回调复活条目）③接线两点（tab-dirty confirmCloseDirty 守门内弃改收口=一切 tab 关闭路径必经；workspace.store switchTo 确认后 discardAll——check-quality 白名单受控例外）；main 归属校验已在职零改动（notes.service findById→NOT_FOUND——扫描报告「FK 偶然兜底」口径修正）；跨格序列①②③④逐一测试锚（含 e2e 复活面端到端「已保存」载入锚）；INV-50 登记+INV-35④ 兑现修订；门一 Kimi 0B/3W/8N 条件 PASS（W1 reject 版序列②主控压缩票补销+变异恰红/W3 App 聚合含 notes pending 代码面核验成立/W2 load×discard 裁定接受残余=重建条目为服务器基线复活不可能）+门二 deepseek 终审；实现者 GLM5.3 统一档 6.18M tok+主控压缩票 W1 补锚；票面 auditc-a3-brief.md+报告 auditc-a3-impl.report.md+两门审档在档' },
 ] as const
 

```

## 3. 新测试全文
```typescript
import { describe, expect, it, vi } from 'vitest'
import { createTagsService } from '../../../src/main/services/tags.service'
import type { Repos } from '../../../src/main/db/repos'

/**
 * [B7] tags.service upsert 纯空格名空判守卫（AUDIT-B W1 修票，always-active）。
 *
 * 探针实锤（scripts/audits/auditb-b7.js 真库 IPC）：upsert('   ') → ok 应答+
 * DB name='' 行入库+list 浮出。守卫对齐同文件 rename 面先例（trim 空 →
 * INVALID_REQUEST「标签名不能为空」）。
 */

function stubRepos(): Repos {
  return {
    tags: {
      listWithCounts: vi.fn(() => []),
      upsertByName: vi.fn((name: string) => ({ id: 't-1', name })),
      attach: vi.fn(),
      detach: vi.fn(),
      namesByPaper: vi.fn(() => []),
      findByName: vi.fn((): undefined => undefined),
      renameTag: vi.fn(() => true),
      mergeTags: vi.fn(),
      deleteTag: vi.fn()
    }
  } as unknown as Repos
}

describe('B7 tags.service upsert —— 纯空格名空判守卫', () => {
  it('纯空格名 → INVALID_REQUEST「标签名不能为空」（repo 零调用）', async () => {
    const repos = stubRepos()
    const svc = createTagsService({ repos })
    await expect(svc.upsert({ name: '   ' })).rejects.toMatchObject({
      code: 'INVALID_REQUEST',
      message: '标签名不能为空'
    })
    expect(repos.tags.upsertByName).not.toHaveBeenCalled()
  })

  it('正常名透传 upsertByName（trim 后）', async () => {
    const repos = stubRepos()
    const svc = createTagsService({ repos })
    await expect(svc.upsert({ name: ' 必读 ' })).resolves.toEqual({ id: 't-1', name: '必读' })
    expect(repos.tags.upsertByName).toHaveBeenCalledWith('必读')
  })

  it('制表符混空白名同样拒绝（trim 覆盖 \t\n）', async () => {
    const repos = stubRepos()
    const svc = createTagsService({ repos })
    await expect(svc.upsert({ name: '\t\n ' })).rejects.toMatchObject({
      code: 'INVALID_REQUEST'
    })
    expect(repos.tags.upsertByName).not.toHaveBeenCalled()
  })
})

```

## 4. 先红/绿/变异证据（原始输出节选）
```

[31m[2m⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[2/2]⎯[22m[39m

[2m Test Files [22m [1m[31m1 failed[39m[22m[90m (1)[39m
[2m      Tests [22m [1m[31m2 failed[39m[22m[2m | [22m[1m[32m1 passed[39m[22m[90m (3)[39m
[2m   Start at [22m 10:28:18
[2m   Duration [22m 550ms[2m (transform 23ms, setup 0ms, collect 47ms, tests 7ms, environment 0ms, prepare 173ms)[22m


--- green ---
[2m Test Files [22m [1m[32m1 passed[39m[22m[90m (1)[39m
[2m      Tests [22m [1m[32m3 passed[39m[22m[90m (3)[39m

--- mutation M1（定点撤 upsert 卫语句,if(false) 计数 1）---
[31m⎯⎯⎯⎯⎯⎯⎯[1m[7m Failed Tests 2 [27m[22m⎯⎯⎯⎯⎯⎯⎯[39m
[2m Test Files [22m [1m[31m1 failed[39m[22m[90m (1)[39m
[2m      Tests [22m [1m[31m2 failed[39m[22m[2m | [22m[1m[32m1 passed[39m[22m[90m (3)[39m

```
