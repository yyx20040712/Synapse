# F-L4 实现报告(三屋模式第一屋·实现者)

工单:scripts/audits/f-l4-ticket.md(档位切换/视口尺寸变化→auto-fit 重触发,ResizeObserver 方案)
实现者会话:2026-08-31(本地 07:05~07:25,墙钟约 20 分钟+探针 1 分钟)

## 0. 开工记录(会话纪律——技能清点)

- `test-driven-development`:**用**——红→绿→变异红证全流程照技能纪律执行(含 M5 变异逃逸后的夹具收紧重验)
- `verification-before-completion`:**用**——交付前亲验全量 vitest 退出码/typecheck/lint/diff 范围/grep 红线
- `systematic-debugging`:**用**(局部)——M5 逃逸定位(y 维恒紧约束使宽度不敏感)按「先假设后求证」完成,未发散
- `subagent-driven-development`:**不用**——本会话即实现屋子,无派发职责
- 其余(frontend-design/e2e 等):**不用**——改动面为单文件既有 hook 逻辑+测试,无新 UI 设计面;e2e 面收口归主控(票面 §5.4)
- 配置自查:Node 24 前缀 `export PATH="/d/nodejs24:$PATH"` 全程遵守(本机默认 25 必红)

## 1. 实现摘要(票面 §1~§4 逐条对照)

| 票面条目 | 处置 | 声明 |
| --- | --- | --- |
| §1 独立 RO effect:挂载 observe+卸载 disconnect | 已实现(lineage-viewport.ts RO effect) | 遵守 |
| §1 RO 回调与 fit effect 共用早退链,顺序零变 | 已实现(doFit 单一定义点,两消费点共用) | 遵守 |
| §1 量测口径 clientWidth 直取+[F-L2] gBCR 回退不变 | 早退链+量测行原样上移,零改写 | 遵守 |
| §1 既有行为零变清单(fit/wheel/pan/resetFit/空图/钳制/INV-14) | 既有 effect/wheel/pan effect 体零改(除 fit effect 体改调 doFitRef.current()——§3 明示许可);全量 970 测试绿背书 | 遵守 |
| §2 接口层零变(args/出参/rootToLocalScale/fitViewport/ZOOM 导出) | 零改 | 遵守 |
| §2 LineageCanvas/LineageBoard/调用方零改 | **git diff 仅 lineage-viewport.ts 一个文件** | 遵守 |
| §3 fit 抽私有 doFit,既有 fit effect deps 数组原样保留 | deps `[nodes, edges, layout, userInteracted, svgRef, labelBoxes]` 逐字未动;fit 逻辑上移 doFitRef | 遵守 |
| §3 RO effect deps 仅 [svgRef],数据经 ref 镜像取最新 | 已实现;ref 镜像更新=cbRef 先例(LineageCanvas.tsx:123-125 effect 期更新,无 deps 数组每提交更新) | 遵守 |
| §4 RO 注册随挂载(svg 常驻不依赖 nodes)/卸载 disconnect | 已实现 | 遵守 |
| §4 S5 无自激励(实现+测试双锁) | 实现:callback 只调 doFitRef.current(),setViewport 只改 transform;测试:场景⑦ | 遵守 |
| §4 `typeof ResizeObserver === 'undefined'` 守卫 | 已实现 | 遵守 |
| §5.1 新测试 ①~⑦ always-active | tests/unit/renderer/lineage-viewport-refit.test.tsx(7 it,不经 guardedDescribe) | 遵守 |
| §5.2 变异红证 M1~M5 | 全过(表见 §3;含一次逃逸→收紧→全量重验,如实记录) | 遵守 |
| §5.3 真机探针+JSON 落 f-l4-out/ | scripts/audits/f-l4-verify.mjs→f-l4-out/f-l4-verify.json,12/12 PASS | 遵守(场景组合自裁见下) |
| §5.4 收口面(verify/locks/registry/尾注) | **不在实现者权限**(禁 git/registry/locks)——留主控 | 遵守红线 |

### 超票面决定申报(自裁)

1. **探针场景组合重设计(重大,报主控知悉)**:票面场景 A/B 的「脉络挂载中经 settings 通道切档」在真实 App **不可达**——App.tsx:193-198 页面条件渲染互斥,设置页换档时脉络页必 unmount(票面 §0 候选 A 否决理由①的「子先父后」论证假设挂载中换档,该序列真实 UI 不存在)。替代取证三路:
   - A-main(票面主断言字面最近似):设置页 UI 点「中 110%」(真实 settings 通道:save→settings.json→store→--ui-scale)→回脉络(重挂载 fit+RO observe 初始通知)→clientWidth 变+transform 更新+全节点入视口(F-L2 同判据);
   - A-resize(RO 端到端裁决点):脉络挂载中窗口 resize——fit effect deps 未变,refit 只能来自 RO 回调(等价 M1 判别);
   - diagnostic(票面 §0 fallback 待证点**直取证**,信息项不断言):挂载中直写 --ui-scale 观察 Chromium 是否派发 RO。
   B 场景同理改为「wheel 置门→挂载中 resize→视口不变」。**RO 方案本体零改**;主断言(A-main+all-in-viewport)维持票面判据口径。
2. **diagnostic 判定结果=fallback 不触发**:`cssZoomTriggersRO=true`(CSS zoom 直写 1.1→1:clientWidth 985→1132,RO 派发 1→2)——Chromium 对 CSS zoom 引起的布局盒变化**确实**派发 RO(规范应然在实现成立)。加上真实换档路径经重挂载不依赖该路径,双重理由 RO 方案安全。**未触发 fallback,无需候选 A 回炉。**
3. **测试 ② 夹具收紧(变异红证驱动的加强,非放宽)**:首轮 M5(量测恒等变异)7/7 绿=逃逸——W1=800×600→W2=1200×600 时 y 维恒紧约束(440/344 两侧同小),fitViewport 输出对宽度不敏感。收紧为 W1=700×600→W2=500×600(x 维紧约束),并在测试头注写明选型理由。收紧后对正确实现 7/7 绿,全部 5 变异重验红。
4. 探针 wrapper(观察 disconnect/派发计数)用**内嵌原生 RO 转发**——纯 JS 类浏览器不派发(派发计数会恒 0),必须内嵌 Native 实例包装。

## 2. TDD 证据

### 红证(实现未动前)

`scripts/audits/f-l4-red.raw.txt`:**7 failed (7)**——拿不到 RO 注册/callback(①④断言 instances=1 红;②③⑤⑥⑦ lastRO() undefined 抛错红)。

### 绿证

- 定向 4 文件(refit+scale+canvas+board):**51/51**(`f-l4-green.raw.txt`)
- 全量 `npm test`:**970 passed (970)/116 文件**(基线 963+新 7,`f-l4-fulltest.raw.txt`)
- `npm run typecheck` 双工程绿(`f-l4-typecheck.raw.txt`);ESLint 改动文件+探针 0 问题(`f-l4-lint.raw.txt`)

### 变异红证 M1~M5(cp 备份→变异→测→cp 还原→diff 空;对收紧版最终测试全量重验)

| 变异 | 变异点 | 红 it | 还原 |
| --- | --- | --- | --- |
| M1 | RO effect 体摘除(仅留 undefined 守卫) | ①②③④⑤⑥⑦全红(票面要求①②⑤含) | diff 空 |
| M2 | doFit 摘 userInteracted 门(`userInteracted \|\| nodes.length===0`→仅 nodes 检查) | ③恰红(6 过 1 红) | diff 空 |
| M3 | 摘 nodes.length===0 早退 | ④恰红 | diff 空 |
| M4 | cleanup 摘 ro.disconnect() | ⑤恰红 | diff 空 |
| M5 | doFit 量测恒等 `const vw = 800` | ②恰红 | diff 空 |

M5 过程记录:首轮(夹具 800→1200 同高)**逃逸(7/7 绿)**——定位:y 维紧约束使 fitViewport 对宽不敏感;收紧夹具(700×600→500×600,x 维紧)后 M5 红,且 M1~M4 全部重验红(红证对最终测试版本有效)。还原后实现 sha256 与备份一致(75835663…06bf)。

## 3. 真机探针结果(scripts/audits/f-l4-out/f-l4-verify.json)

**12/12 PASS,exit 0**(`f-l4-probe-run.raw.txt`)。关键数字:

- A 换档 refit(主断言):small clientWidth **1568**→medium **1381**(F-L2 precheck 同口径);transform `k 1.5264→1.3115, tx 784.80→691.19`(按新档量测 refit);全节点入视口(maxNodeRight 1593.9≤1727.4,maxNodeBottom 918.3≤1104.6);真库节点数 4。
- A-resize(RO 端到端):缩窗 2053×1109→1813×949,transform 更新(k 1.3115→1.0632)——deps 未变,refit 只能来自 RO;全入视口。
- B 门语义:wheel 后 resize,视口逐位相等(tx/ty/k 全同)——不抢。
- diagnostic:`cssZoomTriggersRO: true`(直写 --ui-scale:clientWidth 985→1132,派发计数 1→2)。
- C 清理:wrapper 2 实例(重挂载链路产生,observe 目标均 lineage-canvas svg)全部 disconnect on unmount;disconnect 后再 resize 派发计数 4→4 不增;全程 pageerror 0。

## 4. diff 自查(删减面+范围)

`git diff --stat`(全文):

```
 src/renderer/features/lineage/lineage-viewport.ts | 71 ++++++++++++++++++-----
 1 file changed, 57 insertions(+), 14 deletions(-)
```

`git status --short`(全文,本工单产物加粗语义):

```
 M src/renderer/features/lineage/lineage-viewport.ts        ← 唯一修改的既有源文件
?? tests/unit/renderer/lineage-viewport-refit.test.tsx      ← 新测试(票面 5.1)
?? scripts/audits/f-l4-verify.mjs                           ← 新探针(票面 5.3)
?? scripts/audits/f-l4-out/                                 ← JSON 产物
?? scripts/audits/f-l4-{red,green,typecheck,lint,build,fulltest,probe-run}.raw.txt
?? scripts/audits/f-l4-mut-m{1..5}.raw.txt                  ← 红证/绿证/变异证据
?? scripts/audits/f-l4-ticket.md                            ← 主控票面(在档未跟踪)
?? scripts/audits/f1-out/*.png                              ← 既有残留,非本工单产物(未触碰)
```

- LineageCanvas/LineageBoard/调用方**零改**(票面 §2,已核)。
- grep TODO/FIXME/placeholder 于三个改动/新增文件:无命中(exit 1)。
- 行数:lineage-viewport.ts 275 / 测试 285 / 探针 272(全 <500)。
- 受锁文件零触碰(tests/** 既有、src/shared/**、既有 .mjs);未跑任何 git/locks/registry 命令;无新依赖。

## 5. 成本

- 工具调用:约 47 次(Bash 21/Read 9/Write 3/Edit 12/TodoWrite 5 等);精确 token 数不可得(会话计)。
- 墙钟:本地 07:05~07:25(约 20 分钟)+ 真机探针 1 分钟(23:20 UTC)。
- 前台占用:真机 Electron 取证短暂开窗约 60 秒(开跑前已声明,LOOP 惯例)。

## 6. 卡点与报请主控事项

1. **票面-现实接缝(见自裁①)**:挂载中换档不可达(页面互斥)——探针取证组合已替代且 12/12 PASS、fallback 直取证不成立;请主控确认该取证组合满足场景 A/B 裁决意图,或指示补证路径。
2. 测试/契约无疑点;无其他卡点。

---

# 回炉 1(门一裁决 B:0/W:4/N:2——四条 W 级合并回炉,原工作区未提交状态继续)

## R1.1 四项处置对照

| 裁决 | 处置 | 落点 |
| --- | --- | --- |
| **W1 竞态窗口消除** | doFitRef 赋值 effect 由 `useEffect` 改 **`useLayoutEffect`**(import 同步加);头注补竞态窗口声明(passive 在 paint 后异步跑存在「渲染提交→赋值前」窗口,RO 回调可读到上一渲染闭包——如 wheel 刚置 userInteracted=true 而 RO 仍用 false 旧闭包抢视口;layout effect 在 DOM commit 后同步执行,先于浏览器渲染步骤的 RO 回调帧) | lineage-viewport.ts doFitRef 段+头注 |
| **W3 初始回调幂等单测** | 新测试 **⑧**:挂载非空图(fit effect 已跑,前提锚 transform≠初始)→手动派发一次桩 callback(模拟 RO 规范 observe 后初始通知)→断言 transform 三分量==fitViewport(nodes,layout,700,600) toBeCloseTo 6 位(幂等,数值断言 import 计算);头注注明此测同时是 W1 竞态消除的可测面(fireRO 前 doFitRef 已就位) | lineage-viewport-refit.test.tsx ⑧ |
| **W4 ⑦非平凡化** | ⑦ 改造:挂载 700×600→`stubClientSize(svg, 699, 600)`(差 1px,x 维紧约束下 fit 输出实际变化)→fireRO→**前提锚 transform 串变化**(setViewport 新值+重渲染真发生,非 React bail)→再 698 二次新值→断言 ROStub.instances/observeTargets 不变+未 disconnect——真锁 S5「setViewport 新值重渲染不引发 RO 重注册」 | lineage-viewport-refit.test.tsx ⑦ 重写 |
| **W2 探针精确断言** | A-main 新增断言 **`A/transform-equals-fitviewport`**:node 侧**直载源码** fitViewport(Node 24 type-stripping+`registerHooks` 解析钩子:相对导入补 .ts、@shared/ 映射 src/shared/——依赖链止于 react/zod;非 crib 重实现);输入从页面 DOM 重建(nodes=g transform+div[title] 全文属性;labels=FO 中心+estimateLabelWidth 源码复算,hh=18.5 与 Canvas 同源)→按 medium 档 clientWidth×clientHeight 预计算期望→断言 v2 三分量与期望差<0.5;原 `A/transform-updated` 变化锚保留;JSON 增 `expectedViewportMedium` | f-l4-verify.mjs |

## R1.2 重验记录(全部完成后全量)

- **定向 4 文件**(refit+scale+canvas+board):**52/52 绿**(51+⑧,`f-l4-green-r1.raw.txt`);typecheck 双工程绿;ESLint 三改动文件 0 问题。
- **全量 `npm test`**:**971 passed (971)/116 文件**(`f-l4-fulltest-r1.raw.txt`)。
- **变异 M1~M5 对最终版全量重验**(cp 备份→变异→测→cp 还原→diff 空,`f-l4-mut-r1-m*.raw.txt`):
  - M1(摘 RO effect)→8/8 全红(①②⑤⑦⑧含);
  - M2(摘 userInteracted 门)→③恰红;
  - M3(摘空图早退)→④恰红;
  - M4(摘 disconnect)→⑤恰红;
  - M5(量测恒等 800)→**②⑦⑧红**(票面指定②;⑦⑧在非平凡化后同样依赖量测真值,额外红=检出力增强);
  - 还原后 8/8 绿,实现文件与备份 diff 空(还原后备份已删)。
- **真机探针重跑**(W2 断言入 results,`f-l4-probe-run-r1.raw.txt`):**13/13 PASS,exit 0**。关键摘录:
  - `PASS A/transform-equals-fitviewport — v2(691.19,121.97,1.3115)≈fitViewport 按 medium 1381×959 期望(691.19,121.97,1.3115)(nodes=4/labels=3 重建)`——**逐位精确对齐**(含 3 个边标签盒);
  - A-resize/B/C/X 与首轮一致全 PASS;diagnostic `cssZoomTriggersRO:true` 复证。

## R1.3 回炉 diff 范围自查

`git status --short`(f1-out/*.png 既有残留过滤后全文;**本会话未执行任何 git 写命令**——A/intent-to-add 标记为主控门一流程操作):

```
 A scripts/audits/f-l4-impl.report.md
 A scripts/audits/f-l4-out/f-l4-verify.json
 A scripts/audits/f-l4-ticket.md
 A scripts/audits/f-l4-verify.mjs
 M src/renderer/features/lineage/lineage-viewport.ts
 A tests/unit/renderer/lineage-viewport-refit.test.tsx
?? scripts/audits/f-l4-{red,green,green-r1,lint,typecheck,build,build-r1,fulltest,fulltest-r1,probe-run,probe-run-r1}.raw.txt
?? scripts/audits/f-l4-mut-m{1..5}.raw.txt ?? scripts/audits/f-l4-mut-r1-m{1..5}.raw.txt
?? scripts/audits/f-l4-gate1-brief.md ?? scripts/audits/f-l4-gate1-ds.raw.txt  ← 门一产物(非实现者会话产物)
?? scripts/audits/f1-out/*.png                                     ← 既有残留,未触碰
```

范围=裁决要求「原 4 文件+JSON」内(实现/测试/探针/报告+JSON;票面与门一文件为主控产物;raw.txt 为证据惯例文件)。LineageCanvas/LineageBoard/调用方仍零改;无新依赖;受锁文件零触碰;禁 git/locks/registry 红线全程遵守。

## R1.4 回炉成本

工具调用约 30 次(读 5/编辑 10/bash 12/todo 3);墙钟约 25 分钟(07:26~07:37,含真机探针 1 分钟——前台短暂开窗已声明)。

