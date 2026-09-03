# 2026-09-03 LOOP 交接 v35——闲时段第七段续：P7E-06 标签多选过滤双 PWW 闭环

> 上段=v34（P7E-05 阅读时长三屋全闭环）。本段=同会话续票：
> **P7E-06 标签多选过滤**（P7-E 余序第四项）——实现者两轮 DONE（两项票外
> 申报处置）+门一 Kimi PWW 零 BLOCKING+门二 deepseek 64k PWW——**零回炉
> 双 PWW**（本会话首票免回炉）。P7-E 余序剩余：智能排序（末项）。

## 1. 本段终态

| 项 | 数值 |
| --- | --- |
| verify | exit=0 亲验（**148 文件 1265 用例**=146+2 文件/1255+10 用例实测；raw=p7e-06-verify-final——实现者两跑+主控两跑共四验） |
| locks | **268**（265+3：2 unit+1 e2e spec；P7E-05 段勘误沿用——migrate.ts 不在锁面为常态） |
| e2e | **39/39 全绿**（38+1 新 tag-filter-multi.spec 2 用例——主控亲验全量；tag-lifecycle 既有链配套后恢复=T4 回归锚） |
| P7E-06 | 三屋全链：票面（B1:47+ROADMAP:387+TagFilter.tsx:6 预留三链+受锁涟漪预扫三处前置在票）→实现者两轮（红 9→绿→M1~M4 变异全红证）→**两项票外申报**（tag-lifecycle.spec 红=票面「e2e 零配套」预扫误判——v1 换选 vs v2 叠加序列分歧，实现者停手申报+快照铁证；registry area 笔误=主控建单错误）→主控配套落地（spec 插取消点击恢复换选序列+area 'renderer'→'tags-ui'）→续跑收口（定向双绿+verify exit=0）→门一 Kimi（backup 源）**PWW 零 BLOCKING**（2W=waitForTimeout 先例同配方/预扫方法论缺口；3N——tagId 残留 grep 直证主控补档：零悬挂，文件级命中全为 tagIds 子串）→门二 deepseek 64k **PWW**（2W=同 waitForTimeout/max(20) UI 无感知 UX 断层→后续票候选；1N btn! 风格）——**零回炉** |
| Design 定案 | AND 交集（逐标签 EXISTS 参数绑定循环，禁 IN+GROUP BY HAVING）+**切换删旧**（libraryQuerySchema 删 tagId 加 tagIds: array min1 max20 optional——空数组 schema 拒收防歧义，空选集 UI 收敛 undefined）+chip toggle（单选=单元素特例）+INV-53 多选适配（消失 id **剔除非全清**+顺序锚不变——INV-53 行内注记登记）+申报边界（chip 计数静态/选中集不持久化） |
| 受锁配套四件 | [locked-change]：models/paper.ts 契约切换+papers.repo.test:170 单选锚→tagIds:['t-1'] 等价迁移+tag-lifecycle-ui harness 多选形态（null→[]=单元素剔除后空集等价载荷，S2/S3 invocationCallOrder 原样）+tag-lifecycle.spec 删除断插取消点击（恢复换选序列语义，断言面零改）——门一「四件均诚实申报且等价可论证」+门二「可论证的语义等价迁移」双背书 |
| 诚实申报在档 | ①主控建单 area 笔误（'renderer' 不在 TicketArea 枚举——实现者禁触 tickets/ 停手申报，主控一字修）；②票面「e2e 零配套预期」预扫误判（单选交互=多选特例**仅在单元素选中集成立**，连续点击两 chip 的换选序列非特例——门一 WARN2 定性预扫方法论缺口，INV-53 注记记教训）；③门一 raw 含非法 JSON 转义（\\\` 模板字符串噪声）——主控剥离解析在档，gate-call 解析器可加固为后续工具候选 |

## 2. 下段执行序（闲时段续）

1. **P7-E 余序末项：智能排序**（library.service.ts:20 预留——出处三链+受锁
   涟漪预扫先行；涉 LibrarySort 枚举扩展=sort 面受锁涟漪 grep）。
2. **max(20) UI 感知候选票**（门二 WARN：TagFilter toggle 上界友好提示——
   UX 断层非正确性，择机立项）。
3. **IpcDeps.clipboard 还原项**（INV-56）+seedPaperRow 换绑窗防护（v32 §2）
   照旧。
4. 在场场裁决队列照旧（B5/B6/P7-D 全项/F-G1/token 插队权）。
5. 环境备忘照 v34 各条。

## 3. 本段方法论资产

- **交互序列等价≠单元素特例等价（预扫第二维度）**：v1→v2 交互形态切换的
  「零配套」预扫不能只核断言面——须推演既有 spec 的**连续交互序列**在新
  语义下的重放（本票：连续点击两 chip=v1 换选 vs v2 叠加，单元素特例成立
  处序列特例不成立）；配套修法=插显式取消步骤恢复原序列语义（断言零改）。
- **主控建单行的枚举自查**：registry 建单时 area/file 字段对 TicketArea
  枚举与真实路径核对（typecheck 关卡会拦但烧实现者一轮申报——建单即核）。
- **外链门审产物三态处置**：①JSON 非法转义（模型在 evidence 里写模板
  字符串的 \\\`）=剥离后手工解析落档（解析器加固候选）；②空响应（1s/out=2）
  =瞬时故障直接重试；③PARSE_ERROR≠审计失败——先看 raw 是否完整再定。

## 4. 成本账本（模型×供应商×套餐）

```
主控 GLM5.3×bigmodel-coding-plan：票面+预扫+派发/配套两件（registry area
  +spec 取消点击）+亲验（verify×2+e2e 全量 39/39）+门审材料×2+收口+交接书
实现者子代理（GLM5.3 统一档）：两轮 6.76M tok/87 工具/~21min
  （5.17M/75/18.2min 实现+1.59M/12/3.0min 续跑收口）
门一 Kimi K3×外链（backup 源）：in=22588/out=4038/91s
门二 deepseek×外链 64k 档：首调空响应（1.2s/out=2 瞬时故障）重试
  in=23892/out=16186/141s
主控亲验：verify 四验（实现者×2+主控×2）+e2e 全量+定向、grep 直证、
  INV-53 注记、locks 五连
```

## 5. 环境事实滚动

- verify 基线滚动：**148 文件 1265 用例/locks 268/e2e 39 用例**。
- 新增：交互序列预扫维度（§3①）；registry 建单枚举自查（§3②）；外链
  产物三态处置（§3③）；INV-53 多选适配注记（剔除非全清+预扫教训）；
  max(20) UI 感知候选票（§2-2）。
- 沿用 v34 各条（受锁 golden 涟漪预扫/分片单源多消费点/竞态双窗分层/
  Kimi backup 源主用/deepseek 64k 直起等）。
