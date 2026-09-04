# P7X-02 时长落盘重试/outbox ·设计链首跳（Kimi K3 拟定——架构设计位,零仓库接触）

> 你是设计拟定者（第四次 Ruling 位:Kimi 拟定→deepseek 对抗审核→GLM5.3 主控终裁）。
> 只依据本包材料设计,仓库不可达;不确定处显式标注假设。

## 1. 问题（票面+INV-57 注记面原文）

阅读时长账本分片级失败=部分静默丢失（尽力而为吞错——INV-57 注记:「分片级失败=
部分静默丢失（尽力而为吞错=scroll-progress 同规约,重试/outbox=v2 候选——门二
WARN）」）。票面（registry P7X-02）:「时长落盘重试/outbox——重试或 outbox 兜底
使尾账落盘失败可恢复;设计面=与 saveProgress 单通道的关系（禁双账本）+重启恢复
语义」。

## 2. 现码（Electron+纯 TS,renderer→ipc→service→repo→sqlite）

**renderer 内存账本**（reading-time.ts,INV-57②唯一宿主）:per-tab ledger
Record<paperId,seconds>,tick 15s 累积;三个收尾口=closeTab/closeAll 走复合
flusher,卸载走 dispose→onFlush。分片单源 chunkSeconds(3600)（INV-57④）。

**复合 flusher 落库口（吞错点①）**:
```ts
const invokeOne = (paperId, page, sec) => {
  if (page === undefined && sec <= 0) return
  const basePage = page ?? deps.currentPageOf(paperId)
  for (const chunk of chunkSeconds(sec)) {
    try { void Promise.resolve(deps.saveProgress(paperId, basePage, chunk))
      .then(() => undefined, () => undefined) }  // ← rejection 吞
    catch { /* 同步抛错吞 */ }
  }
}
```
**卸载兜底口（吞错点②,reading-time-setup.ts）**:onFlush=(paperId,seconds)=>
对 chunkSeconds(seconds) 逐片 `void api.reader.saveProgress({...}).then(
()=>undefined,()=>undefined)`（同吞错）。

**主进程写路径**:ipc reader.ts→reader.service.ts saveProgress→papers.repo:
`UPDATE papers SET last_read_page=?, reading_seconds=reading_seconds+? WHERE id=?`
（预编译+参数绑定;INV-57①原子累加,禁 read-modify-write）。

**已知边界（INV-57 注记不修已申报项）**:R7 卸载双 invoke（时长 onFlush+进度
sp.dispose 各自落库,页码两来源理论回退窗——相邻缺陷面,设计须表态是否顺带收编）。

## 3. 硬约束

1. **禁双账本**:时长账本唯一宿主=reading-time.ts 内存 ledger;任何 outbox/队列
   不得构成第二计时真相源（只能是传输面缓冲）。
2. **单通道**:落库唯一口=api.reader.saveProgress（renderer→ipc→service→repo
   原链）,禁独立第二 IPC/直写 DB 通道。
3. INV-57①（原子累加 SQL）/②（宿主）/④（3600 分片上界）三锚不破;schemas.ts
   secondsDelta int 0..3600 为受锁面（改动=[locked-change] 高成本,设计尽量免动）。
4. 进度页码（last_read_page）与时长同载荷——票面 scope=时长,但 saveProgress
   单通道意味着任何 outbox 机制天然同时缓冲页码;设计须表态页码的顺带语义
   （页码幂等 last-write-wins vs 时长累加——两语义在重放下的差异必须显式处理:
   重放旧页码会回退 last_read_page）。
5. 单机单库（无跨设备合并面）;renderer 拆除期（window closing）in-flight
   invoke 可能随进程死——「重启恢复」须覆盖 crash/强杀/正常退出三形态。

## 4. 失败分类（设计须逐类表态覆盖/不覆盖）

| 类 | 形态 | 现状 |
| --- | --- | --- |
| F1 | IPC/DB 瞬时错（better-sqlite3 busy/磁盘瞬时） | 吞错即丢 |
| F2 | 持久性 DB 错（磁盘满/库损坏） | 吞错即丢 |
| F3 | renderer 拆除期 in-flight 丢失（正常退出窗口） | 丢 |
| F4 | renderer crash/强杀（内存 ledger 未 flush 段） | 丢（tick 15s 粒度内账+未收尾尾账） |
| F5 | 主进程 crash（invoke 排队中） | 丢 |

## 5. 交付（设计书,中文）

1. **方案对比表**（≥3 案,如:纯 renderer 重试/renderer 持久 outbox[localStorage
   或文件]/main 侧 outbox 表/收尾同步化[before-quit 阻塞 flush]——可自组）×维度
   （F1~F5 覆盖/复杂度/与约束 1~5 冲突面/重启恢复语义/测试面成本/风险）;
2. **推荐案+论证**（含为什么不选其余）;
3. **态空间**（outbox/重试状态机:pending→in-flight→done/failed→retry/dead-letter?
   ——态迁移表+断言列,按仓库状态机前置纪律）;
4. **接口草图**（TS 签名级:装配面/存储面/重放面;标注触碰文件清单与受锁面
   预估）;
5. **失败模式表**（每态×每失败类的行为+恢复路径）;
6. **页码重放语义**显式节（约束 4）;
7. **边界申报**（不覆盖面诚实列——如 F4 的 tick 粒度内损失是否可接受/需缩 tick
   或 checkpoint;R7 双 invoke 是否顺带收编）。

输出纯设计书 markdown（≤250 行）,不写实现码。
