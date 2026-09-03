# P7E-05 门一 R2 复审材料（delta）

## 0. R2 回炉内容（对初审 BLOCKING+NIT1 的修复）
- BLOCKING（3600×收尾口回吐冲突）：invokeOne 分片——PROGRESS_SECONDS_CHUNK=3600 常量与 schemas max(3600) 同值对齐（受锁 schemas 零动），sec>3600 拆整数片+尾片依次 invoke（页码重复写幂等；物理上界 24 片）。新跨格锚：4000s→flush→两次 invoke（3600+400）+账清零。M6 变异红证：删分片→单 invoke 4000 红（scripts/audits/p7e-05-mutation-m6.raw.txt，还原 diff 空）。
- NIT1：settle 注释补实 start 重置丢弃路径+测试锚（hidden+stop 后 start 他篇→零头不入任何账；用例以整倍数两段表达同语义——harness 粒度申报）。
- NIT2/NIT3 不修只登记（R7 双 invoke/页码两来源回退窗→主控 INV-57 注记；280 行记录）。
- verify R2 全绿 146 文件/1253 用例 exit=0（scripts/audits/p7e-05-verify-r2.raw.txt）；locks 265 不变。

## 1. invokeOne 分片当前实现（reading-time.ts 摘录）
```typescript
/** 单次 invoke 时长上界（=schemas.ts saveProgressReqSchema secondsDelta
 *  max(3600)——「单次 invoke 上界」契约；受锁面禁动，此处同值分片对齐） */
export const PROGRESS_SECONDS_CHUNK = 3_600

/** 复合 flusher（装配面注册进 store.registerProgressFlusher——closeTab/close
 *  消费）：进度页+时长账一次 invoke（sec>0||page 在场才发；两账皆空零 invoke）。
 *  分片（R2 回炉/门一 BLOCKING）：时长账仅收尾口一次性回吐——连续阅读>1h 后
 *  关 tab 回吐值>3600 会被 zod 拒收且吞错=整段静默丢失（击穿 INV-57）；故
 *  sec>3600 拆 3600 整数片+尾片依次 invoke（页码同一 pending page 重复写=
 *  last_read_page set 幂等无害；物理上界 24 片/24h） */
export function createCompositeProgressFlusher(
  sp: ProgressAccountView,
  rt: ReadingTime,
  deps: CompositeFlusherDeps
): { flush(paperId: string): void; flushAll(): void } {
  const invokeOne = (paperId: string, page: number | undefined, sec: number): void => {
    if (page === undefined && sec <= 0) return
    const basePage = page ?? deps.currentPageOf(paperId)
    const chunks: number[] = []
    let rest = sec
    while (rest >= PROGRESS_SECONDS_CHUNK) {
      chunks.push(PROGRESS_SECONDS_CHUNK)
      rest -= PROGRESS_SECONDS_CHUNK
    }
    if (rest > 0 || chunks.length === 0) chunks.push(rest)
    for (const chunk of chunks) {
      try {
        // 尽力而为（进度/时长非关键数据，同步抛错/拒绝均吞——scroll-progress 同规约）
        void Promise.resolve(deps.saveProgress(paperId, basePage, chunk)).then(
          () => undefined,
          () => undefined
        )
      } catch {
        /* 吞错 */
      }
    }
  }
```

## 2. settle 注释口径（NIT1 补实区）
```typescript
  /** 段结算：liveMs 吸收 now-lastMark——吸收与入账同受 isVisible 门控
   *  （R1 回炉：force 路径 stop/collectAndZero/collectAllAndZero/dispose 在
   *  hidden 段被调时不得吸收 hidden 时长——票面「挂后台标签页不算」全路径
   *  生效，非仅 tick；lastMark 无条件推进刻度）；force=零头一并入账
   *  （flush/stop 用），否则只入整 tick（≥READING_TICK_MS 全入——节流长
   *  间隔一段清）。hidden 期 force 结算：零头留存 liveMs 不入账——恢复
   *  visible 后续算；终局丢弃两路径（NIT1 口径补实）=stop() 后 start(他篇)
   *  的 liveMs=0 重置（closeTab 场景无恢复机会）与 dispose 收尾——<15s 零头
   *  宁少勿多，票面§4 已知边界③口径 */
  const settle = (force: boolean): void => {
    const now = deps.now()
    if (currentPid !== null && deps.isVisible()) {
      liveMs += Math.max(0, now - lastMark)
      if (force || liveMs >= READING_TICK_MS) {
        ledger[currentPid] = (ledger[currentPid] ?? 0) + Math.floor(liveMs / 1000)
        liveMs = 0
      }
    }
    lastMark = now
  }

```

## 3. 新锚测试（reading-time.test.ts 相关用例）
```typescript
203-  })
204-
205:  it('R2 分片（门一 BLOCKING）：账 4000s→flush→两次 invoke（3600+400）+账清零', () => {
206-    const h = makeHarness()
207-    const pending: Record<string, number> = { 'p-1': 3 }
208-    const f = makeFlusher(pending, h.rt)
209-    h.rt.start('p-1')
210-    h.advance(4_000_000)
211-    f.flush('p-1')
212-    expect(f.saved).toEqual([
213-      { paperId: 'p-1', page: 3, secondsDelta: 3_600 },
214-      { paperId: 'p-1', page: 3, secondsDelta: 400 }
215-    ])
216-    expect(h.ledger('p-1')).toBe(0)
217-  })
218-
219:  it('NIT1：hidden+stop 后 start 他篇→旧可见零头不入任何账（start 重置丢弃）', () => {
220-    const h = makeHarness()
221-    h.rt.start('A')
222-    h.advance(15_000)
223-    h.advance(5_000)
224-    h.setVisible(false)
225-    h.rt.onVisibilityChange()
226-    h.rt.stop()
227-    h.setVisible(true)
228-    h.rt.start('B')
229-    h.advance(15_000)
230-    expect(h.ledger('A')).toBe(15)
231-    expect(h.ledger('B')).toBe(15)
232-  })
233-
234-  it('零头按实结转：不足 tick 的零头随 flush 结转（now 差值计，floor 秒）', () => {
235-    const h = makeHarness()
236-    const pending: Record<string, number> = {}
237-    const f = makeFlusher(pending, h.rt)
238-    h.rt.start('p-1')
239-    h.advance(READING_TICK_MS)
240-    h.advance(7_000)
241-    f.flush('p-1')
```

## 4. M6 变异证据尾部
```
[31m[2m⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/1]⎯[22m[39m

[2m Test Files [22m [1m[31m1 failed[39m[22m[90m (1)[39m
[2m      Tests [22m [1m[31m1 failed[39m[22m[2m | [22m[1m[32m14 passed[39m[22m[90m (15)[39m
[2m   Start at [22m 19:32:45
[2m   Duration [22m 769ms[2m (transform 46ms, setup 0ms, collect 91ms, tests 13ms, environment 0ms, prepare 270ms)[22m

exit=1
```

## 5. verify R2 尾部
```
[2m Test Files [22m [1m[32m146 passed[39m[22m[90m (146)[39m
[2m      Tests [22m [1m[32m1253 passed[39m[22m[90m (1253)[39m
exit=0
```
