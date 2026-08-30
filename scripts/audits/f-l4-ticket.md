# F-L4 小票:档位切换(视口尺寸变化)→auto-fit 重触发——ResizeObserver 方案

> 备案源:audit0-findings.md F-L2「新发现备案①」——SET1 档位切换不自动
> refit(fit effect deps 无 uiScale,换档后需手动点「适应视图」;修前修后
> 同此行为非 F-L2 引入)。v14 执行序小票批首票(半小时级)。
> 基线:verify 115 文件 963 用例全绿 / locks 193 / e2e 29/29(commit 8149a7516)。

## 0. 触发态空间表(本票的「态空间」——触发源×门状态矩阵,交审计)

视口 hook 既有状态机(idle/fitting/fitted+manual 抢占门 userInteracted)
不变;本票新增触发源「视口尺寸变化」(二阶原因=uiScale 换档/窗口 resize;
一阶原因=svg 布局盒尺寸变化)。

| 门状态 \ 触发 | nodes/edges 变化 | **视口尺寸变化(本票新增)** | wheel / panbg 拖 | 「适应视图」按钮 |
| --- | --- | --- | --- | --- |
| !userInteracted | fit(既有) | **fit(按新尺寸——本票)** | 交互+置门 true | 置门 false(已 false=React bail 无感,既有) |
| userInteracted | 不抢视口(既有) | **不抢视口(本票)** | 交互(既有) | 置 false→effect 重触发 fit(既有) |
| 空图(nodes=0) | 不 fit(既有) | **不 fit(本票同门)** | — | 按钮不渲染(既有) |

跨格序列(交审计重点——单格枚举盖不住):

- S1 挂载 fit(small 档)→换档 medium→RO 触发→按新 clientWidth refit
  (F-L2 precheck 实证换档后 clientWidth 变:1381→1519.6 @110%,即
  「换档→svg 布局盒变」成立);
- S2 挂载 fit→wheel(置门)→换档→RO 触发→**不抢视口**(用户接管优先,
  与 nodes 变化不抢同门);
- S3=S2 后点「适应视图」→置门 false→effect 重触发→按当前档 fit(既有
  路径,回归确认);
- S4 空图→换档→RO 触发→早退不 fit(k=1 初始态保持);
- S5 换档引起滚动条出现/消失→布局盒二次变化→RO 再触发→refit 幂等收敛
  (同量测同输入→同输出,无振荡:setViewport 只改 svg 内容 transform,不改
  svg 自身布局盒(h-full w-full 由父决定)→**无 RO 自激励循环**——这条
  是实现侧必须核对的不变量);
- S6 unmount→RO disconnect(成对清理,INV-14 同型)。

**主控定向修法(候选二选一的裁决记录)**:

- 候选 A「uiScale 进 fit effect deps + 换档调 resetFit」——**否决**,三重
  缺陷:①App.tsx:134-136 写 `--ui-scale` 的 effect 是**父组件 effect**,
  React 提交序=子先父后——LineageCanvas 的 fit effect 跑时 CSS 变量尚是
  旧值,clientWidth 读到旧档布局,fit 按旧口径算(不修甚至 bail);②v14
  §5.2 实录:resetFit 在 userInteracted=false 时 setState(false)=React
  bail 不重触发;③props 穿透 4 层(App→Board→Canvas→hook)或跨域 store
  订阅,把 SET1 的 CSS 单源耦合进视口域;
- 候选 B(**采纳**)「ResizeObserver 观察 svg 布局盒」——尺寸变化是
  **一阶原因**(uiScale 换档/窗口 resize 都是它的二阶来源),RO 回调天然
  发生在布局更新之后(读到新值,零时序陷阱),零 props 穿透,视口域内部
  闭环。**行为扩面如实声明**:窗口 resize 在 !userInteracted 下也从
  「不 refit」变「refit」——语义顺带完备化(auto-fit 本意),受锁面已核
  (grep tests/unit/renderer/lineage-* 无 resize 断言,无合约冲突);
  userInteracted=true 时两源都不抢视口,门语义零变。
- **fallback 声明**:若真机取证发现 Chromium 对 CSS zoom 引起的布局盒
  变化不触发 RO(规范应然但实现待证),回退候选 A+rAF 推迟一帧量测——
  真机探针场景 ① 为裁决点,红了走 fallback 再回炉,不许静默改方案。

## 1. 行为层

- `useViewportController` 新增独立 RO effect:挂载即 `observe(svgRef.current)`,
  回调=执行与既有 fit effect **同一套**量测+fit 逻辑(见 §3 抽取);卸载
  `disconnect()` 成对清理。
- RO 回调与既有 fit effect 共用早退链(顺序零变):`userInteracted===true`
  →不抢;`nodes.length===0`→不 fit;`svgRef.current===null`→跳过;
  量测 `vw<=0||vh<=0`(jsdom 桩面/clientWidth||rect.width 回退口径
  [F-L2] 不变)→跳过;否则 `setViewport(fitViewport(nodes,layout,vw,vh,
  labelBoxes))`。
- **量测口径**:与既有 fit 同——clientWidth/clientHeight 直取([F-L2]
  INV-43 svg 本地口径),`clientWidth||rect.width` jsdom 回退保留。
- 既有行为零变清单:nodes/edges 变化 fit、wheel 锚点缩放、panbg pan、
  「适应视图」唯一复位口、空图不 fit、钳制 [0.25,4]、INV-14 成对注册。

## 2. 接口层

- `useViewportController` args **零变**(不新增 uiScale 参数——SET1 耦合
  不入视口域接口);`ViewportController` 出参零变。
- `rootToLocalScale`/`fitViewport`/`ZOOM` 导出零变。
- LineageCanvas/LineageBoard/调用方零改(RO 是 hook 内部实现面)。

## 3. 架构层

- fit 逻辑两消费点(既有 effect+RO 回调)——自文件内抽私有 `doFit`
  (或等价 ref 化闭包),**deps 语义零变**:既有 fit effect 的 deps
  `[nodes, edges, layout, userInteracted, svgRef, labelBoxes]` 原样
  保留(effect 体改调 doFit),RO effect deps 仅 `[svgRef]`(挂载一次
  常活——数据经 ref 镜像取最新,不随 nodes 重注册,消 observe/disconnect
  抖动)。
- ref 镜像更新时机=既有项目先例(cbRef,LineageCanvas.tsx:123-125 的
  effect 期更新);RO 回调经 ref 取 doFit,无闭包过期。
- 禁改 lineage-layout 纯函数(量测驻视口域——票面架构层既有红线)。

## 4. 生命周期层

- RO 注册随挂载(svg 常驻——空态同 W2 先例,空→非空转场无重绑需求,
  RO 不依赖 nodes)。
- 卸载 disconnect;「S5 无自激励循环」不变量:RO 回调内 setViewport 只
  改 `<g data-viewport>` transform,svg 元素布局盒由父布局决定不变→
  不再触发 RO(实现+测试双锁:见 5.1 ⑦)。
- `typeof ResizeObserver === 'undefined'` 守卫(极端环境)→不注册不
  报错,既有 fit 路径不受影响。

## 5. 文化层(测试与取证)

### 5.1 新测试 `tests/unit/renderer/lineage-viewport-refit.test.tsx`(always-active,不经 guardedDescribe)

jsdom 无 ResizeObserver+无布局——stub 手法 crib lineage-viewport-scale.
test.ts:23-40(`Object.defineProperty` per-instance clientWidth+原型
spyOn gBCR)+`vi.stubGlobal('ResizeObserver', ...)`:桩类捕获
constructor callback/observe 目标/disconnect 调用,测试手动派发 callback
模拟「布局盒变化」。渲染面 crib lineage-canvas.test.tsx(真实组件挂载,
非纯 hook 单测——RO 注册面在组件树上断言才有效力)。

- ① 注册面:挂载非空图→桩 observe 收到 svg 元素(data-testid
  lineage-canvas);
- ② 尺寸变化 refit:挂载(clientWidth=W1)fit 后改桩量测为 W2→手动派发
  callback→viewport transform 断言=fitViewport(nodes,layout,W2,H)(数值
  断言直接 import fitViewport 计算期望值——不 crib 死数字);
- ③ 门语义:wheel 置门(派发 wheel 事件改 viewport)→手动派发 RO
  callback→视口保持 wheel 后值(数值断言);
- ④ 空图:挂载空图→callback→viewport 仍初始 {tx:0,ty:0,k:1};
- ⑤ 成对清理:unmount→桩 disconnect 被调;
- ⑥ 量测守卫:clientWidth=0 桩面→callback→视口不变(不产生退化 fit);
- ⑦ 无自激励:setViewport 后再次断言 observe 未收到新注册/disconnect
  未被调(实现侧 RO 不因 transform 重注册)。

### 5.2 变异红证(备份→变异→红→还原→diff 空;禁 git checkout)

- M1 摘 RO effect 整体→①②⑤红;
- M2 callback 链摘 userInteracted 门→③红;
- M3 摘 nodes.length===0 早退→④红;
- M4 摘 disconnect→⑤红;
- M5 callback 内量测改恒等值(摘量测)→②红。

### 5.3 真机取证 `scripts/audits/f-l4-verify.mjs`(crib f-l2-fix-verify.mjs 同环)

**命名先查在档**(v14 教训:git ls-files 核对无撞名)。场景:

- A 换档 refit(裁决点):真库副本挂载 small 档 fit→记录 viewport transform
  →切 medium(经 settings 通道,非直接写 CSS)→等 RO 回调→断言 transform
  更新且=fitViewport 按 medium 档 clientWidth 期望值(全节点入视口口径,
  F-L2 fix-verify 同判据);**红了=fallback 触发,报主控裁决**;
- B 门语义:wheel 置门→切 large→视口不变(数值断言);
- C 清理:unmount 无 RO 泄漏(disconnect 后回调不再生效——若桩可测)。

### 5.4 收口面

- `npm run verify` 全绿(新测试入 counts:963→973 级)+locks:apply
  (新测试文件+新探针脚本扫入,193→195);台账 F-L4 翻已闭环;受锁尾注
  [locked-change](tests+scripts+manifest)。

## 6. 证据与报告契约(实现者)

- 实现报告 scripts/audits/f-l4-impl.report.md:自裁申报一切超票面决定;
  diff 自查(范围=lineage-viewport.ts+新测试+新探针,LineageCanvas 若
  零改则声明);成本(token/工具数/时长);变异红证记录(M1~M5 各一行
  红→还原→diff 空);真机探针输出 JSON 落 f-l4-out/。
- 禁 git/registry/locks;卡住停手报主控;测试先红后绿,恒真断言=假阳性。
- jsdom 不可达断言(jsdom 无 RO 的真实浏览器路径)由真机探针 A/B 锁
  ——分工写进测试头注。
