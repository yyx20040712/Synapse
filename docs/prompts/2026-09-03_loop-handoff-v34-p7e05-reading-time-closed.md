# 2026-09-03 LOOP 交接 v34——闲时段第七段：P7E-05 阅读时长三屋全闭环（三轮回炉+双门复审）

> 上段=v33（P7E-04 导出剪贴板+P7E-05 建单预备）。本段=同日续段：
> **P7E-05 阅读时长统计**（P7-E 余序第三项）三屋全闭环——首轮 BLOCKED
> （票面×受锁 golden 双死结）→主控 12 件配套→TDD 全流程→**三轮回炉**
> （R1 主控亲验 settle hidden 虚计/R2 门一 3600 分片/R3 门二 dispose 分片
> +settle 解耦）→门一复审 PASS+门二复审 PASS_WITH_WARNINGS。P7-E 余序
> 剩余：标签多选过滤 > 智能排序。

## 1. 本段终态

| 项 | 数值 |
| --- | --- |
| verify | exit=0 亲验（**146 文件 1255 用例**=142+4 文件/1231+24 用例实测；raw=p7e-05-verify-final——R3 后主控两跑+终态一跑共三验） |
| locks | **265**（259+6：4 unit+1 e2e spec+008 sql；migrate.ts 不在锁面=该仓常态，v33「三件」表述勘误） |
| e2e | **38/38 全绿**（37+1 新 reader-reading-time.spec；**四跑轨迹**：full1 tag-lifecycle 红①→key 修复 full2 38/38→R3 后 full3 红②→stale 守卫 full4 38/38+定向三连绿） |
| P7E-05 | 三屋全链：恢复（unlock 亲验）→首轮 BLOCKED（**票面×受锁 golden 双死结**：migrate.test:10 [1..7] 断言×version 8 追加互斥+PaperDetail 必填×10 件字面量）→主控 [locked-change] **12 件配套**（含续作中同型第 12 件 lineage-tags 7→8——全受锁面 grep 复核无第 13 件）→实现者 TDD（首红 5/1235→绿→M1~M4 变异红证）→R1（主控亲验 settle force 不检查 isVisible=hidden 段虚计 R3×R6 跨格）→门一 Kimi（主源 504→**backup 换源**）FAIL：1 BLOCKING（**3600 上界×收尾口回吐结构冲突**——>1h 关 tab 整段静默丢账击穿 INV-57）→R2 invokeOne 分片+M6→复审 PASS→门二 deepseek 64k FAIL：1 BLOCKING（**R7 dispose 尾账未分片=同型漏面**——门一 delta 复审只见 invokeOne，终审全量 diff 抓到 onFlush 路径）+1 WARN（settle 吸收/结转绑死=可见零头丢弃）→R3 chunkSeconds 单源三消费点+M7+settle 解耦（NIT1 锚语义随裁决变更）→门二复审 **PASS_WITH_WARNINGS**（落盘静默=既有尽力而为规约归 INV-57 注记） |
| Design 定案 | 搭车 saveProgress 单通道（secondsDelta int 0..3600 optional 旧载荷零兼容）+008 迁移（预留写 002 勘误实落 008）+reading-time.ts 独立模块（deps 注入 crib scroll-progress 禁真 timer）+复合 flusher（进度页+时长账单 invoke；takePending/pendingIds 消费口+结构类型互不 import）+repo 原子累加+ready×visible 双计时门+**chunkSeconds 3600 分片单源**（三消费点）+settle 吸收仅 visible/结转不依赖可见性；**INV-57 登记**（含注记面四件：R7 双 invoke 各原子非单事务面/分片级失败=部分静默丢失（重试 outbox=v2 候选）/ledger 无 24h 钳制口径/sec<0 不可达前置） |
| e2e 竞态根治 | tag-lifecycle 两现立案（同位点 :51 乙打标签 chip 未现）：一现→**TagEditor 挂接点 key={detail.id}**（关「组件 state 延续」子窗——对照实证=回退本票 Panel 加行即绿）；二现（R3 bundle 扰动再踩）→**Panel stale 守卫**（fetched.id!==paperId 置 null——关「数据延续」主窗，root=useAsync 重读期 detail 延续旧值+key=旧 id 不重挂→Enter 挂错文献的正确性缺陷；守卫后消费面一律拿不到 stale 数据+playwright fill 自等待自然串行化）；定向三连绿+全量 38/38 |
| 诚实申报在档 | ①主控 12 件受锁测试配套=[locked-change]（断言 [1..8]/7→8+10 字面量补字段——零断言语义弱化，门一「受锁改动全是字面投影」背书）；②**R3 超回炉上限 ≤2 超额披露**——R1=主控亲验/R2=门一/R3=门二，两道独立门审各贡献回炉轮非同案缠讼（人类复核可否决）；③M2 变异载体失效转移 M5 实录（settle 解耦后删 tick 门不红=防线冗余实证，吸收门 M5 复验红在档）；④NIT1/R2 锚「零头不入任何账」语义随门二裁决变更（丢弃=缺陷→hidden 中 stop 结转入 A 账）；⑤实现者自裁三项在档（formatReadingTime 下沉 renderer/shared+re-export 单源/reading-time-setup 拆件 window.api 隔离+组件 250 行双解/R4 离开段窗口） |

## 2. 下段执行序（闲时段续）

1. **P7-E 余序续**：标签多选过滤（TagFilter.tsx:6）> 智能排序
   （library.service.ts:20）。工单化纪律照旧（出处+态空间表先行）；涉新
   迁移/新必填字段类票面**派发前主控预扫受锁 golden 涟漪**（本段方法论①）。
2. **IpcDeps.clipboard 还原项**（INV-56）：下次合法触碰
   tests/utils/ipc-deps.ts 的场次补 clipboard 必填+makeIpcDeps 桩工厂同步
   （受锁 [locked-change]）。
3. **seedPaperRow 换绑窗硬杀防护**（v32 §2 立项候选，未动）。
4. **时长重试/outbox=v2 候选**（INV-57 注记——落盘失败静默，需用户裁决
   是否立项）。
5. 在场场裁决队列照旧（B5/B6/P7-D 全项/F-G1/token 插队权）。
6. 环境备忘照 v33 各条。

## 3. 本段方法论资产

- **受锁 golden 涟漪预扫（派发前）**：新迁移/新必填字段类票面在派发前，
  主控 grep 全受锁面两类涟漪——版本 golden（toBe(7)/[1..7] 等）与模型
  字面量（`: PaperDetail = {`）——配套面一次裁决入库，省一轮 BLOCKED
  探针（本票 12 件配套实证：实现者探针发现 vs 主控三行 grep 的成本差）。
- **「单次上界」契约的路径覆盖审计**：schema 上界类约束（max 3600）须
  对**所有写路径**审计——门一只审 delta 材料抓到 invokeOne 面、门二终审
  全量 diff 抓到 dispose onFlush 漏面=异构终审价值实证；修复形态=分片
  单源纯函数多消费点共用（chunkSeconds 三消费点），禁各路径内联复制。
- **e2e 竞态两现即根治+分层定位**：同类竞态二现（key 修复后 R3 bundle
  扰动再踩）→停止增量补丁根治；定位分层=组件身份（key 重挂）vs 数据
  身份（stale 守卫）——两窗各自独立，关一不开一；守卫形态=消费面前置
  一行 shadow 变量（id 不匹配置 null），最小 diff+全消费面一致。
- **变异载体失效转移申报纪律**：重构使变异点（M2 tick 门）被新防线
  （settle 吸收门）冗余覆盖→原变异不红=如实申报+复验替代载体（M5）红证
  在档——恒真断言与失效变异都要申报，禁静默删变异。
- **回炉上限与独立门贡献轮的区分**：≤2 上限防同案缠讼；两道独立门审
  （门一/门二）各自的 BLOCKING 各自构成新回炉轮=超额执行+交接书披露
  （人类复核可否决），优于挂起半成品票（已知丢账缺陷+31 件工作树悬置）。

## 4. 成本账本（模型×供应商×套餐）

```
主控 GLM5.3×bigmodel-coding-plan：P7E-05 恢复/死结裁决 12 件配套/亲验
  两轮（R1 settle 发现+e2e 竞态两现立案+key/stale 守卫两修）/门审材料
  ×4 拼 装/三轮回炉指令/收口+交接书全程
实现者子代理（GLM5.3 统一档——环境无 model 参数欠账披露）：五轮
  29.87M tok/204 工具/~78min（0.91M/30/5.6min 首轮 BLOCKED 探针+
  15.46M/113/35.5min TDD 全流程+2.61M/13/4.3min R1+4.17M/20/5.7min
  R2+6.29M/28/7.1min R3）
门一 Kimi K3×外链（backup 源——主源 504 换源）：初审 in=27712/out=6643/
  173s+R2 复审 in=2233/out=2352/80s
门二 deepseek×外链 64k 档：终审 in=30472/out=23790/189s+R3 复审
  in=3281/out=27068/218s
主控亲验：verify 五跑（mc/mc2/final 三全链+核对 r1~r3 落盘）+e2e 全量
  四跑+tag-lifecycle 定向五跑（两现复跑+key 三连+stale 三连）+locks 六连
  （unlock×4+generate/apply×3）
```

## 5. 环境事实滚动

- verify 基线滚动：**146 文件 1255 用例/locks 265/e2e 38 用例**。
- 新增：受锁 golden 涟漪预扫纪律（§3①）；分片单源多消费点形态（§3②）；
  组件身份/数据身份双窗分层定位法（§3③）；变异载体失效转移申报（§3④）；
  INV-57（含注记面四件+重试/outbox v2 候选）；TagEditor key+Panel stale
  守卫（详情面板切文献竞态根治）；migrate.ts 不在锁面勘误（v33「三件」
  实为 schemas/models 两件+新 008）。
- 沿用 v33 各条（Kimi 504 换源/deepseek 64k 直起/setViewportSize 禁用/
  volta 布局/CRLF 归一等）。
