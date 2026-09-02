# 2026-09-03 LOOP 交接 v28——七波场·闲时段第一段:N 级清扫合批五票全闭环,40% 停点干净收段

> 上段=v27(六波场 W-G1 攻坚收案+闲时双倍池排程)。本段=闲时任务版首段
> (v27 §2 第 1 项)——**N 级/遗留池集中清扫 8 项全数落地**(五票合批+
> F-G1 跳过照旧+F-G11 观察零新增),门一 Kimi 两轮放行,提交 bfb1b279e
> (14 文件 333+/72-)。**P7-E 两票+AUDIT-B 顺延下段首项**(预算触 40%
> 停点,分段滚动纪律)。

## 1. 本段终态

| 项 | 数值 |
| --- | --- |
| verify | exit=0 亲验(**128 文件 1113**=基线 1106+7;raw=night1-final-verify.raw.txt) |
| e2e | **33/33 全绿**(含本批触碰面 smoke:118 三键/smoke:160 界面缩放;night1-batch-e2e.raw.txt) |
| locks | **241**(240+import-gate.test.ts 即时 generate+apply,摩擦根治纪律三连) |
| 五票 | F-G3 boundsToPersist/F-G7 UiScaleSection 拆件/F-G8 drag 计数锁/F-G9 fullscreen 沿/C-3 四知晓项全转正 |
| 门一 | Kimi 两轮(in=8292+3490/out=6370+3624):一轮 W1=材料缺口(新文件不在 git diff);二轮补充包**全 ADDRESSED**,新发现 N-1/2/3 皆 N 级处置在档 |
| 变异 | 六组红证(fg3/fg9/fg8/c3-gate/c3-ws/c3-sv),全备份法还原 diff 空 |
| F-G11 | 计数维持 1(本段 e2e 全绿零新增——闲时更稳判读与 v27 预期一致) |

## 2. 下段执行序(闲时段第二段——自 v27 §2 第 2 项起滚动)

1. **P7-E 首票=标签生命周期**(三屋全链,涉 tags.store 迁移面**先出态空间表**
   再实现;锚=ROADMAP P7-E 内序领头)。工单化纪律=出处必须(代码预留点锚
   TagFilter.tsx:6/library.service.ts:20),逐项补价值/依赖/风险/验收。
2. **P7-E 二票=拖拽导入**(三屋;同上纪律)。
3. **AUDIT-B 开审**(蓝本=AUDIT-A/C 场形态:审计简报→只读子代理全枚举扫描→
   对抗审核→W 级修票三屋闭环;**功能对偶矩阵未验 6 对并入**:zoom×F-06 其余
   定位细节/双击最大化×滚动记账/drag 区×键位滚动/UI1 流光×性能/切换器面板×
   zoom 大档/关闭拦截×最小化)。
4. 不入闲时批照旧:P7-D 全项挂起(在场场次)/技术升级冻结/P8 池不动;
   F-G1 叠色维持跳过;F-G11 观察线(触 2 立案)。
   停点:整段触 40% 即停收口;单票回炉 ≤2。

## 3. 本段方法论资产

- **门审材料包必须显式含未跟踪新文件**:git diff 只覆盖已跟踪面,新诞生文件
  (import-gate.ts/UiScaleSection.tsx/import-gate.test.ts)缺席=票面核心主张
  (闭包语义/守卫逻辑)不可核,一轮 W1 回炉的代价。教训:合批审简报声明
  「全量 diff」前先 `git status --short` 核对新文件面,新文件全文随包。
- **变异必须先证命中**:node -e 字符串替换静默未命中(引号/换行细节)→变异
  实际没落上→16 全绿假象。改 sed 行号删除+grep 前后计数守卫重做。教训入册:
  变异后第一步=证明文件真变了(grep 计数/行差),再看测试红绿。
- **绕过 npm script 直跑 vitest 需手动切 sqlite ABI**:npm test 内置
  `sqlite-abi.mjs use node`;裸 `npx vitest run` 跑 sqlite 面测试必先手动
  `node scripts/sqlite-abi.mjs use node`(跑完切回 electron)——NODE_MODULE_VERSION
  146/137 报错即此因,非环境损坏。
- **组件层无单测的载荷纪律可用 e2e 传递链论证**(门一 N-3 处置形态):INV-39
  全量组装无组件级断言,但 smoke:160 rect×1.25 经 save 落地→store 替换→
  App 订阅→--ui-scale 链**传递性锚定**(漏带字段→zod default 回 small→rect
  不缩→红)——组件头注引证+台账在档,免补影子单测。

## 4. 成本账本(模型×供应商×套餐)

```
主控 GLM5.3×bigmodel-coding-plan 全程亲做(快票合批形态,蓝本=F-ARCH 修复批):
  五票实现+六组变异红证+台账四行改写+段增补+交接书
外部链 ds-call×2(门一 kimi-main 零 switches):一轮 in=8292/out=6370/231s;
  二轮补充包 in=3490/out=3624/117s
零实现者子代理(N 级快票面;P7-E 三屋票下段起派)
本段预算 ~40%(停点触发即收——P7-E/AUDIT-B 顺延)
```

## 5. 环境事实滚动

- 沿用 v27 各条(volta 绝对路径绕行/playwright CLI 字母序/前台占用敏感)。
- 新增:裸 npx vitest 的 sqlite ABI 坑(§3 第三条);geometric-repack「File
  exists」噪声本段一现(提交无碍,AGENTS 在档结论维持)。
- verify 基线滚动:**128 文件 1113/locks 241/e2e 33 用例**。
