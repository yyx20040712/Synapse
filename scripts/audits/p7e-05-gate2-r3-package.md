# P7E-05 门二 R3 复审材料（delta）

## 0. R3 回炉内容（对终审 BLOCKING+WARN 的修复）
- BLOCKING（dispose 尾账未分片）：抽 chunkSeconds(sec) 分片单源纯函数（3600 整数片+尾片，sec=0→[0]）三消费点共用——invokeOne（R5/R6）+dispose 逐笔分片 onFlush（R7，reading-time.ts dispose 区）+setup onFlush（防御深度，上游已分片则单片透传）。新锚：4000s→dispose→onFlush 两次（3600+400）；M7 变异红证（删 dispose 分片→单笔 4000 红，还原 diff 空）。
- WARN（settle 吸收/结转绑死）：解耦——吸收仅 visible（防 hidden 虚计不变），结转（force/≥tick 入账）不依赖当前可见性；R2 的 NIT1 锚语义随裁决变更（hidden 中 stop 结转可见零头入 A 账 A=20/B=15）+新锚（可见 5s 零头→hidden→collectAndZero=20）。
- M2 载体失效申报：settle 解耦后「删 tick 门」变异不红（tick 无门直调 settle→吸收门兜底）——防线冗余实证，载体转移 M5（删 settle 吸收门→90≠30 红复验在档）。
- verify R3 全绿 146 文件/1255 用例 exit=0；locks 265 不变。

## 1. chunkSeconds+settle 终态实现
```typescript
  /** 段结算：**吸收**（liveMs += now-lastMark）仅 visible（R1 回炉——hidden
   *  段时长不得吸收，票面「挂后台标签页不算」全路径）；**结转**（liveMs 入
   *  ledger+清零，force 或 ≥tick 时）不依赖当前可见性（R3 回炉/门二 WARN
   *  解耦——hidden 前已计量的可见零头（<15s）随 force 结转入账不丢，票面
   *  「零头随 flush 按实结转/实转不丢」）；lastMark 无条件推进刻度。节流长
   *  间隔一段清（≥TICK 全入）。liveMs 生命周期终局=dispose/start 重置清零 */
  const settle = (force: boolean): void => {
    const now = deps.now()
    if (currentPid !== null && deps.isVisible()) {
      liveMs += Math.max(0, now - lastMark)
    }
    if (currentPid !== null && (force || liveMs >= READING_TICK_MS)) {
      ledger[currentPid] = (ledger[currentPid] ?? 0) + Math.floor(liveMs / 1000)
      liveMs = 0
    }
    lastMark = now
  }

  /** tick：门关（无 active/不可见）零累积直接返回（刻度不动——hidden 段隔离
   *  由 onVisibilityChange 承担，此处防御冗余） */
  const tick = (): void => {
    if (currentPid === null || !deps.isVisible()) return
    settle(false)
  }

  return {
...
 *  max(3600)——「单次 invoke 上界」契约；受锁面禁动，此处同值分片对齐） */
export const PROGRESS_SECONDS_CHUNK = 3_600

/** 时长分片纯函数（R3 回炉/门二 BLOCKING——分片单源，三消费点共用：
 *  invokeOne（R5/R6 复合 flush）、dispose 逐笔 onFlush（R7 卸载）、setup 侧
 *  onFlush 回调（防御深度——上游已分片则单片透传））：3600 整数片+尾片
 *  （sec=0→[0]=单笔零片=旧载荷省略语义由装配层处理） */
export function chunkSeconds(sec: number): number[] {
  const chunks: number[] = []
  let rest = sec
  while (rest >= PROGRESS_SECONDS_CHUNK) {
    chunks.push(PROGRESS_SECONDS_CHUNK)
    rest -= PROGRESS_SECONDS_CHUNK
  }
  if (rest > 0 || chunks.length === 0) chunks.push(rest)
  return chunks
}

/** 复合 flusher（装配面注册进 store.registerProgressFlusher——closeTab/close
 *  消费）：进度页+时长账一次 invoke（sec>0||page 在场才发；两账皆空零 invoke）。
 *  分片（R2 回炉/门一 BLOCKING）：时长账仅收尾口一次性回吐——连续阅读>1h 后
 *  关 tab 回吐值>3600 会被 zod 拒收且吞错=整段静默丢失（击穿 INV-57）；故
 *  sec>3600 拆 3600 整数片+尾片依次 invoke（页码同一 pending page 重复写=
```

## 2. dispose 分片+setup onFlush 消费点
```typescript
      if (handle !== null) {
        deps.timers.clearInterval(handle)
        handle = null
      }
      for (const paperId of Object.keys(ledger)) {
        const sec = ledger[paperId] ?? 0
        delete ledger[paperId]
        // R3 回炉/门二 BLOCKING：尾账逐笔分片 onFlush（>1h 账单笔>3600 会被
        // zod 拒+setup 吞错=静默丢账——分片单源 chunkSeconds）
        if (sec > 0) {
          for (const chunk of chunkSeconds(sec)) deps.onFlush(paperId, chunk)
        }
      }
    }
  }
}

/** 进度账视图（结构类型——ScrollProgress 满足；互不 import 红线，票面§3） */
export interface ProgressAccountView {
  /** 取走该 tab 的待落页码（不落库——落库归复合 flusher 单通道） */
  takePending(paperId: string): number | undefined
...
/** 时长账本+复合 flusher 一次构建：onFlush 兜底=dispose 尾账单通道
 *  saveProgress（R7 卸载收尾；分片单源消费——上游 dispose 已逐笔分片则
 *  单笔≤3600 经 chunkSeconds 单片透传=防御深度）；每片恒>0=恒带
 *  secondsDelta 字段（0 省略语义由 invokeOne 装配层维持） */
export function useReaderReadingTime(
  sp: ProgressAccountView
): { rt: ReadingTime; flusher: ProgressFlusher } {
  const rt = useMemo(
    () =>
      createReaderReadingTime((paperId, seconds) => {
        for (const chunk of chunkSeconds(seconds)) {
          void api.reader
            .saveProgress({
              paperId,
              page: useReaderStore.getState().tabs[paperId]?.page ?? 0,
              secondsDelta: chunk
            })
            .then(() => undefined, () => undefined)
        }
      }),
    []
  )
  const flusher = useMemo(
    () =>
      createCompositeProgressFlusher(sp, rt, {
        saveProgress: (paperId, page, secondsDelta) =>
          api.reader
            .saveProgress({ paperId, page, ...(secondsDelta > 0 ? { secondsDelta } : {}) })
            .then(() => undefined),
        currentPageOf: (paperId) => useReaderStore.getState().tabs[paperId]?.page ?? 0
      }),
    [sp, rt]
```

## 3. 新锚测试+锚语义变更
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
219:  it('R7 分片（门二 BLOCKING）：账 4000s→dispose→onFlush 两次（3600+400）', () => {
220-    const h = makeHarness()
221-    h.rt.start('p-1')
222-    h.advance(4_000_000)
223-    h.rt.dispose()
224-    expect(h.flushed).toEqual([
225-      { paperId: 'p-1', seconds: 3_600 },
226-      { paperId: 'p-1', seconds: 400 }
227-    ])
228-  })
229-
230-  it('零头结转（门二 WARN 解耦）：可见 5s 零头→hidden→collectAndZero 返回含 5s', () => {
231-    const h = makeHarness()
232-    h.rt.start('p-1')
233-    h.advance(15_000)
234-    h.advance(5_000)
235-    h.setVisible(false)
236-    h.rt.onVisibilityChange()
237-    expect(h.rt.collectAndZero('p-1')).toBe(20)
238-    expect(h.ledger('p-1')).toBe(0)
239-  })
```

## 4. M7+M5 复验证据尾部
```
[2m Test Files [22m [1m[31m1 failed[39m[22m[90m (1)[39m
[2m      Tests [22m [1m[31m1 failed[39m[22m[2m | [22m[1m[32m16 passed[39m[22m[90m (17)[39m
[2m   Start at [22m 19:48:44
[2m   Duration [22m 738ms[2m (transform 43ms, setup 0ms, collect 94ms, tests 13ms, environment 0ms, prepare 308ms)[22m

exit=1
---
[2m Test Files [22m [1m[31m1 failed[39m[22m[90m (1)[39m
[2m      Tests [22m [1m[31m1 failed[39m[22m[2m | [22m[1m[32m16 passed[39m[22m[90m (17)[39m
[2m   Start at [22m 19:48:09
[2m   Duration [22m 760ms[2m (transform 48ms, setup 0ms, collect 93ms, tests 14ms, environment 0ms, prepare 251ms)[22m

exit=1
```

## 5. verify R3 尾部
```
[2m Test Files [22m [1m[32m146 passed[39m[22m[90m (146)[39m
[2m      Tests [22m [1m[32m1255 passed[39m[22m[90m (1255)[39m
exit=0
```
