# F-L4 门一对抗深审材料包

> 你是门一对抗审查员(异基座 deepseek)。工单=档位切换(视口尺寸变化)→auto-fit 重触发,ResizeObserver 方案。对下述票面/报告/diff/证据做**对抗性**审查:找行为缺陷、测试盲区、票面-实现偏差、取证不充分。你的收益=找出真问题;无事生非同样扣分——每条发现给【严重度 B(行为)/W(弱点)/N(备注)+证据引用】。

## 主控裁决记录(实现者自裁的处置,审你是否有异议)

- 自裁①(探针场景重设计):票面场景 A「挂载中经 settings 通道换档」在真实 App 不可达——App.tsx:193-198 页面条件渲染互斥(原文见证据段)。替代三路:A-main(真实通道换档+重挂载→mount fit 断言)/A-resize(挂载中窗口 resize→RO 端到端)/diagnostic(CSS zoom 直写→cssZoomTriggersRO)。主控采纳,理由:组合覆盖场景 A 裁决意图(fallback 判据=cssZoomTriggersRO 直证,比原设计间接论证更直接),A-main 且锁住真实用户路径(换档后重挂载 mount fit,此前无锁)。
- 自裁③(M5 逃逸→夹具收紧):W1 800×600→1200×600 时 y 维恒紧约束使 fitViewport 对宽不敏感→量测恒等变异逃逸;收紧 700→500(x 维紧)后 M5 红+M1~M4 全量重验红。主控采纳(加强非放宽)。

## 审查清单(四问,逐条作答)

1. 行为:RO 方案是否有循环触发/竞态/门语义破坏?doFitRef 镜像(effect 期更新)是否有闭包过期/声明序风险?RO observe 规范初始回调(observe 时立即派发一次)对挂载路径的影响?
2. 测试:①~⑦ 断言是否锁死行为(恒真断言?)?变异 M1~M5 是否各锁一个独立面?M5 收紧夹具是否过度耦合实现(选型 700→500 的正当性)?jsdom 桩(ResizeObserver stub+clientWidth defineProperty)是否引入假阳性面?
3. 票面-实现偏差:diff 是否越票面(§2 接口零变/§3 架构约束)?头注声明与代码是否一致?
4. 取证:A-main/A-resize/diagnostic/B/C 组合是否充分支撑「换档 refit 已兑现」?若你认为当前 UI 页面互斥使换档场景不可达=备案动机落空,本票是否仍值得合入(判据:resize/侧板/未来保险价值)?

## 证据关键段原文

### App.tsx:188-200(页面互斥——自裁①事实)

```tsx
            <span className="app-nav-txt">本地学术文献管理</span>
          </div>
        </nav>
        <main className="min-w-0 flex-1 overflow-auto">
          <ErrorBoundary>
            {view === 'library' && <LibraryPage />}
            {view === 'reader' && <ReaderPage />}
            {view === 'settings' && (
              <SettingsPage workspaceSection={<WorkspaceSection dirty={quitDirty} />} />
            )}
            {view === 'lineage' && <LineagePage />}
          </ErrorBoundary>
        </main>
```

### f-l4-verify.json 关键段(diagnostic+results+B 场景)

```json
{
 "diagnostic": {
  "method": "挂载中直写 --ui-scale（非 settings 通道——真实 App 换档经设置页+重挂载，此路径 UI 不可达，仅供 fallback 裁决取证）",
  "cssFlipped": "1",
  "clientWidth": {
   "before": 985,
   "after": 1132
  },
  "clientWidthChanged": true,
  "roCallbackCount": {
   "before": 1,
   "after": 2
  },
  "cssZoomTriggersRO": true
 },
 "results": [
  {
   "id": "A/pre/node-count",
   "pass": true,
   "detail": "真库脉络图节点数=4（>0 前提锚）"
  },
  {
   "id": "A/client-width-changed",
   "pass": true,
   "detail": "small→medium clientWidth：1568→1381（F-L2 precheck 同实证口径）"
  },
  {
   "id": "A/transform-updated",
   "pass": true,
   "detail": "transform small({\"tx\":784.8013638229414,\"ty\":128.84530313475483,\"k\":1.5264157229610888})→medium({\"tx\":691.1885211761868,\"ty\":121.96723710599042,\"k\":1.3114761595622004}) 按新档量测 refit"
  },
  {
   "id": "A/all-in-viewport",
   "pass": true,
   "detail": "maxNodeRight=1593.90≤svgRight+1=1727.40，maxNodeBottom=918.30≤svgBottom+1=1104.60（F-L2 同判据）"
  },
  {
   "id": "A-resize/transform-updated",
   "pass": true,
   "detail": "resize(2053x1109→1813x949) transform 更新（RO 路径——deps 未变，无 RO 即不变→红）"
  },
  {
   "id": "A-resize/all-in-viewport",
   "pass": true,
   "detail": "maxNodeRight=1356.30/1489.80，maxNodeBottom=770.28/947.00"
  },
  {
   "id": "B/pre/wheel-changed",
   "pass": true,
   "detail": "wheel 后视口已变（{\"tx\":583.6150811435356,\"ty\":-13.218859381174525,\"k\":1.5239211694088497}≠fit 值——前提锚）"
  },
  {
   "id": "B/viewport-frozen",
   "pass": true,
   "detail": "resize 后视口保持 wheel 值（{\"tx\":583.6150811435356,\"ty\":-13.218859381174525,\"k\":1.5239211694088497}=={\"tx\":583.6150811435356,\"ty\":-13.218859381174525,\"k\":1.5239211694088497}——门语义不抢）"
  },
  {
   "id": "C/resize-callback-fired",
   "pass": true,
   "detail": "resize 后 RO 派发计数 3→4（浏览器真派发——sanity 前提锚）"
  },
  {
   "id": "C/disconnect-on-unmount",
   "pass": true,
   "detail": "unmount 后全部 2 个 wrapper 实例 disconnect 被调（成对清理）"
  },
  {
   "id": "C/no-callback-after-disconnect",
   "pass": true,
   "detail": "disconnect 后再 resize 派发计数不增（4→4——回调不再生效，无泄漏）"
  },
  {
   "id": "X/no-pageerror",
   "pass": true,
   "detail": "页面错误 0 条"
  }
 ],
 "B": [
  "A_small_mount",
  "A_medium_switched",
  "A_resize",
  "B_wheel_before",
  "B_resize_after"
 ]
}
```

### A 场景换档前后量测(A_small_mount→A_medium_switched)

```json
{
 "small": {
  "client": {
   "w": 1568,
   "h": 1056
  },
  "transform": "translate(784.8013638229414, 128.84530313475483) scale(1.5264157229610888)"
 },
 "medium_switched": {
  "gBCR": {
   "w": 1519.5999755859375,
   "h": 1055.2000732421875,
   "x": 206.8000030517578,
   "y": 48.400001525878906,
   "right": 1726.3999786376953,
   "bottom": 1103.6000747680664
  },
  "client": {
   "w": 1381,
   "h": 959
  },
  "transform": "translate(691.1885211761868, 121.96723710599042) scale(1.3114761595622004)",
  "nodeCount": 4,
  "maxNodeRight": 1593.8999938964844
 }
}
```

## 票面全文

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


## 实现报告全文

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


## diff 全文(实现+新测试+新探针)

```diff
diff --git a/scripts/audits/f-l4-impl.report.md b/scripts/audits/f-l4-impl.report.md
new file mode 100644
index 000000000..3d24ebda5
--- /dev/null
+++ b/scripts/audits/f-l4-impl.report.md
@@ -0,0 +1,116 @@
+# F-L4 实现报告(三屋模式第一屋·实现者)
+
+工单:scripts/audits/f-l4-ticket.md(档位切换/视口尺寸变化→auto-fit 重触发,ResizeObserver 方案)
+实现者会话:2026-08-31(本地 07:05~07:25,墙钟约 20 分钟+探针 1 分钟)
+
+## 0. 开工记录(会话纪律——技能清点)
+
+- `test-driven-development`:**用**——红→绿→变异红证全流程照技能纪律执行(含 M5 变异逃逸后的夹具收紧重验)
+- `verification-before-completion`:**用**——交付前亲验全量 vitest 退出码/typecheck/lint/diff 范围/grep 红线
+- `systematic-debugging`:**用**(局部)——M5 逃逸定位(y 维恒紧约束使宽度不敏感)按「先假设后求证」完成,未发散
+- `subagent-driven-development`:**不用**——本会话即实现屋子,无派发职责
+- 其余(frontend-design/e2e 等):**不用**——改动面为单文件既有 hook 逻辑+测试,无新 UI 设计面;e2e 面收口归主控(票面 §5.4)
+- 配置自查:Node 24 前缀 `export PATH="/d/nodejs24:$PATH"` 全程遵守(本机默认 25 必红)
+
+## 1. 实现摘要(票面 §1~§4 逐条对照)
+
+| 票面条目 | 处置 | 声明 |
+| --- | --- | --- |
+| §1 独立 RO effect:挂载 observe+卸载 disconnect | 已实现(lineage-viewport.ts RO effect) | 遵守 |
+| §1 RO 回调与 fit effect 共用早退链,顺序零变 | 已实现(doFit 单一定义点,两消费点共用) | 遵守 |
+| §1 量测口径 clientWidth 直取+[F-L2] gBCR 回退不变 | 早退链+量测行原样上移,零改写 | 遵守 |
+| §1 既有行为零变清单(fit/wheel/pan/resetFit/空图/钳制/INV-14) | 既有 effect/wheel/pan effect 体零改(除 fit effect 体改调 doFitRef.current()——§3 明示许可);全量 970 测试绿背书 | 遵守 |
+| §2 接口层零变(args/出参/rootToLocalScale/fitViewport/ZOOM 导出) | 零改 | 遵守 |
+| §2 LineageCanvas/LineageBoard/调用方零改 | **git diff 仅 lineage-viewport.ts 一个文件** | 遵守 |
+| §3 fit 抽私有 doFit,既有 fit effect deps 数组原样保留 | deps `[nodes, edges, layout, userInteracted, svgRef, labelBoxes]` 逐字未动;fit 逻辑上移 doFitRef | 遵守 |
+| §3 RO effect deps 仅 [svgRef],数据经 ref 镜像取最新 | 已实现;ref 镜像更新=cbRef 先例(LineageCanvas.tsx:123-125 effect 期更新,无 deps 数组每提交更新) | 遵守 |
+| §4 RO 注册随挂载(svg 常驻不依赖 nodes)/卸载 disconnect | 已实现 | 遵守 |
+| §4 S5 无自激励(实现+测试双锁) | 实现:callback 只调 doFitRef.current(),setViewport 只改 transform;测试:场景⑦ | 遵守 |
+| §4 `typeof ResizeObserver === 'undefined'` 守卫 | 已实现 | 遵守 |
+| §5.1 新测试 ①~⑦ always-active | tests/unit/renderer/lineage-viewport-refit.test.tsx(7 it,不经 guardedDescribe) | 遵守 |
+| §5.2 变异红证 M1~M5 | 全过(表见 §3;含一次逃逸→收紧→全量重验,如实记录) | 遵守 |
+| §5.3 真机探针+JSON 落 f-l4-out/ | scripts/audits/f-l4-verify.mjs→f-l4-out/f-l4-verify.json,12/12 PASS | 遵守(场景组合自裁见下) |
+| §5.4 收口面(verify/locks/registry/尾注) | **不在实现者权限**(禁 git/registry/locks)——留主控 | 遵守红线 |
+
+### 超票面决定申报(自裁)
+
+1. **探针场景组合重设计(重大,报主控知悉)**:票面场景 A/B 的「脉络挂载中经 settings 通道切档」在真实 App **不可达**——App.tsx:193-198 页面条件渲染互斥,设置页换档时脉络页必 unmount(票面 §0 候选 A 否决理由①的「子先父后」论证假设挂载中换档,该序列真实 UI 不存在)。替代取证三路:
+   - A-main(票面主断言字面最近似):设置页 UI 点「中 110%」(真实 settings 通道:save→settings.json→store→--ui-scale)→回脉络(重挂载 fit+RO observe 初始通知)→clientWidth 变+transform 更新+全节点入视口(F-L2 同判据);
+   - A-resize(RO 端到端裁决点):脉络挂载中窗口 resize——fit effect deps 未变,refit 只能来自 RO 回调(等价 M1 判别);
+   - diagnostic(票面 §0 fallback 待证点**直取证**,信息项不断言):挂载中直写 --ui-scale 观察 Chromium 是否派发 RO。
+   B 场景同理改为「wheel 置门→挂载中 resize→视口不变」。**RO 方案本体零改**;主断言(A-main+all-in-viewport)维持票面判据口径。
+2. **diagnostic 判定结果=fallback 不触发**:`cssZoomTriggersRO=true`(CSS zoom 直写 1.1→1:clientWidth 985→1132,RO 派发 1→2)——Chromium 对 CSS zoom 引起的布局盒变化**确实**派发 RO(规范应然在实现成立)。加上真实换档路径经重挂载不依赖该路径,双重理由 RO 方案安全。**未触发 fallback,无需候选 A 回炉。**
+3. **测试 ② 夹具收紧(变异红证驱动的加强,非放宽)**:首轮 M5(量测恒等变异)7/7 绿=逃逸——W1=800×600→W2=1200×600 时 y 维恒紧约束(440/344 两侧同小),fitViewport 输出对宽度不敏感。收紧为 W1=700×600→W2=500×600(x 维紧约束),并在测试头注写明选型理由。收紧后对正确实现 7/7 绿,全部 5 变异重验红。
+4. 探针 wrapper(观察 disconnect/派发计数)用**内嵌原生 RO 转发**——纯 JS 类浏览器不派发(派发计数会恒 0),必须内嵌 Native 实例包装。
+
+## 2. TDD 证据
+
+### 红证(实现未动前)
+
+`scripts/audits/f-l4-red.raw.txt`:**7 failed (7)**——拿不到 RO 注册/callback(①④断言 instances=1 红;②③⑤⑥⑦ lastRO() undefined 抛错红)。
+
+### 绿证
+
+- 定向 4 文件(refit+scale+canvas+board):**51/51**(`f-l4-green.raw.txt`)
+- 全量 `npm test`:**970 passed (970)/116 文件**(基线 963+新 7,`f-l4-fulltest.raw.txt`)
+- `npm run typecheck` 双工程绿(`f-l4-typecheck.raw.txt`);ESLint 改动文件+探针 0 问题(`f-l4-lint.raw.txt`)
+
+### 变异红证 M1~M5(cp 备份→变异→测→cp 还原→diff 空;对收紧版最终测试全量重验)
+
+| 变异 | 变异点 | 红 it | 还原 |
+| --- | --- | --- | --- |
+| M1 | RO effect 体摘除(仅留 undefined 守卫) | ①②③④⑤⑥⑦全红(票面要求①②⑤含) | diff 空 |
+| M2 | doFit 摘 userInteracted 门(`userInteracted \|\| nodes.length===0`→仅 nodes 检查) | ③恰红(6 过 1 红) | diff 空 |
+| M3 | 摘 nodes.length===0 早退 | ④恰红 | diff 空 |
+| M4 | cleanup 摘 ro.disconnect() | ⑤恰红 | diff 空 |
+| M5 | doFit 量测恒等 `const vw = 800` | ②恰红 | diff 空 |
+
+M5 过程记录:首轮(夹具 800→1200 同高)**逃逸(7/7 绿)**——定位:y 维紧约束使 fitViewport 对宽不敏感;收紧夹具(700×600→500×600,x 维紧)后 M5 红,且 M1~M4 全部重验红(红证对最终测试版本有效)。还原后实现 sha256 与备份一致(75835663…06bf)。
+
+## 3. 真机探针结果(scripts/audits/f-l4-out/f-l4-verify.json)
+
+**12/12 PASS,exit 0**(`f-l4-probe-run.raw.txt`)。关键数字:
+
+- A 换档 refit(主断言):small clientWidth **1568**→medium **1381**(F-L2 precheck 同口径);transform `k 1.5264→1.3115, tx 784.80→691.19`(按新档量测 refit);全节点入视口(maxNodeRight 1593.9≤1727.4,maxNodeBottom 918.3≤1104.6);真库节点数 4。
+- A-resize(RO 端到端):缩窗 2053×1109→1813×949,transform 更新(k 1.3115→1.0632)——deps 未变,refit 只能来自 RO;全入视口。
+- B 门语义:wheel 后 resize,视口逐位相等(tx/ty/k 全同)——不抢。
+- diagnostic:`cssZoomTriggersRO: true`(直写 --ui-scale:clientWidth 985→1132,派发计数 1→2)。
+- C 清理:wrapper 2 实例(重挂载链路产生,observe 目标均 lineage-canvas svg)全部 disconnect on unmount;disconnect 后再 resize 派发计数 4→4 不增;全程 pageerror 0。
+
+## 4. diff 自查(删减面+范围)
+
+`git diff --stat`(全文):
+
+```
+ src/renderer/features/lineage/lineage-viewport.ts | 71 ++++++++++++++++++-----
+ 1 file changed, 57 insertions(+), 14 deletions(-)
+```
+
+`git status --short`(全文,本工单产物加粗语义):
+
+```
+ M src/renderer/features/lineage/lineage-viewport.ts        ← 唯一修改的既有源文件
+?? tests/unit/renderer/lineage-viewport-refit.test.tsx      ← 新测试(票面 5.1)
+?? scripts/audits/f-l4-verify.mjs                           ← 新探针(票面 5.3)
+?? scripts/audits/f-l4-out/                                 ← JSON 产物
+?? scripts/audits/f-l4-{red,green,typecheck,lint,build,fulltest,probe-run}.raw.txt
+?? scripts/audits/f-l4-mut-m{1..5}.raw.txt                  ← 红证/绿证/变异证据
+?? scripts/audits/f-l4-ticket.md                            ← 主控票面(在档未跟踪)
+?? scripts/audits/f1-out/*.png                              ← 既有残留,非本工单产物(未触碰)
+```
+
+- LineageCanvas/LineageBoard/调用方**零改**(票面 §2,已核)。
+- grep TODO/FIXME/placeholder 于三个改动/新增文件:无命中(exit 1)。
+- 行数:lineage-viewport.ts 275 / 测试 285 / 探针 272(全 <500)。
+- 受锁文件零触碰(tests/** 既有、src/shared/**、既有 .mjs);未跑任何 git/locks/registry 命令;无新依赖。
+
+## 5. 成本
+
+- 工具调用:约 47 次(Bash 21/Read 9/Write 3/Edit 12/TodoWrite 5 等);精确 token 数不可得(会话计)。
+- 墙钟:本地 07:05~07:25(约 20 分钟)+ 真机探针 1 分钟(23:20 UTC)。
+- 前台占用:真机 Electron 取证短暂开窗约 60 秒(开跑前已声明,LOOP 惯例)。
+
+## 6. 卡点与报请主控事项
+
+1. **票面-现实接缝(见自裁①)**:挂载中换档不可达(页面互斥)——探针取证组合已替代且 12/12 PASS、fallback 直取证不成立;请主控确认该取证组合满足场景 A/B 裁决意图,或指示补证路径。
+2. 测试/契约无疑点;无其他卡点。
diff --git a/scripts/audits/f-l4-out/f-l4-verify.json b/scripts/audits/f-l4-out/f-l4-verify.json
new file mode 100644
index 000000000..27cb6cce1
--- /dev/null
+++ b/scripts/audits/f-l4-out/f-l4-verify.json
@@ -0,0 +1,187 @@
+{
+  "meta": {
+    "script": "f-l4-verify.mjs",
+    "date": "2026-08-30T23:20:24.721Z"
+  },
+  "scenes": {
+    "A_small_mount": {
+      "gBCR": {
+        "w": 1568,
+        "h": 1056,
+        "x": 188,
+        "y": 48,
+        "right": 1756,
+        "bottom": 1104
+      },
+      "client": {
+        "w": 1568,
+        "h": 1056
+      },
+      "zoomRow": "1",
+      "transform": "translate(784.8013638229414, 128.84530313475483) scale(1.5264157229610888)",
+      "nodeCount": 4,
+      "maxNodeRight": 1636.0000305175781,
+      "maxNodeBottom": 955.3172760009766
+    },
+    "A_medium_switched": {
+      "gBCR": {
+        "w": 1519.5999755859375,
+        "h": 1055.2000732421875,
+        "x": 206.8000030517578,
+        "y": 48.400001525878906,
+        "right": 1726.3999786376953,
+        "bottom": 1103.6000747680664
+      },
+      "client": {
+        "w": 1381,
+        "h": 959
+      },
+      "zoomRow": "1.1",
+      "transform": "translate(691.1885211761868, 121.96723710599042) scale(1.3114761595622004)",
+      "nodeCount": 4,
+      "maxNodeRight": 1593.8999938964844,
+      "maxNodeBottom": 918.3020782470703
+    },
+    "A_resize": {
+      "gBCR": {
+        "w": 1282,
+        "h": 897.6000366210938,
+        "x": 206.8000030517578,
+        "y": 48.400001525878906,
+        "right": 1488.8000030517578,
+        "bottom": 946.0000381469727
+      },
+      "client": {
+        "w": 1165,
+        "h": 816
+      },
+      "zoomRow": "1.1",
+      "transform": "translate(583.0581788676361, 114.02251912624114) scale(1.0632037226950355)",
+      "nodeCount": 4,
+      "maxNodeRight": 1356.3000183105469,
+      "maxNodeBottom": 770.2820434570312
+    },
+    "B_wheel_before": {
+      "gBCR": {
+        "w": 1282,
+        "h": 897.6000366210938,
+        "x": 206.8000030517578,
+        "y": 48.400001525878906,
+        "right": 1488.8000030517578,
+        "bottom": 946.0000381469727
+      },
+      "client": {
+        "w": 1165,
+        "h": 816
+      },
+      "zoomRow": "1.1",
+      "transform": "translate(583.6150811435356, -13.218859381174525) scale(1.5239211694088497)",
+      "nodeCount": 4,
+      "maxNodeRight": 1577.1028747558594,
+      "maxNodeBottom": 888.7790985107422
+    },
+    "B_resize_after": {
+      "gBCR": {
+        "w": 1083.5999755859375,
+        "h": 899.2000122070312,
+        "x": 206.8000030517578,
+        "y": 48.400001525878906,
+        "right": 1290.3999786376953,
+        "bottom": 947.6000137329102
+      },
+      "client": {
+        "w": 985,
+        "h": 817
+      },
+      "zoomRow": "1.1",
+      "transform": "translate(583.6150811435356, -13.218859381174525) scale(1.5239211694088497)",
+      "nodeCount": 4,
+      "maxNodeRight": 1577.1028747558594,
+      "maxNodeBottom": 888.7790985107422
+    }
+  },
+  "wrapper": {
+    "instanceCount": 2,
+    "callbackCount": 1,
+    "observeTargets": [
+      "lineage-canvas",
+      "lineage-canvas"
+    ]
+  },
+  "diagnostic": {
+    "method": "挂载中直写 --ui-scale（非 settings 通道——真实 App 换档经设置页+重挂载，此路径 UI 不可达，仅供 fallback 裁决取证）",
+    "cssFlipped": "1",
+    "clientWidth": {
+      "before": 985,
+      "after": 1132
+    },
+    "clientWidthChanged": true,
+    "roCallbackCount": {
+      "before": 1,
+      "after": 2
+    },
+    "cssZoomTriggersRO": true
+  },
+  "results": [
+    {
+      "id": "A/pre/node-count",
+      "pass": true,
+      "detail": "真库脉络图节点数=4（>0 前提锚）"
+    },
+    {
+      "id": "A/client-width-changed",
+      "pass": true,
+      "detail": "small→medium clientWidth：1568→1381（F-L2 precheck 同实证口径）"
+    },
+    {
+      "id": "A/transform-updated",
+      "pass": true,
+      "detail": "transform small({\"tx\":784.8013638229414,\"ty\":128.84530313475483,\"k\":1.5264157229610888})→medium({\"tx\":691.1885211761868,\"ty\":121.96723710599042,\"k\":1.3114761595622004}) 按新档量测 refit"
+    },
+    {
+      "id": "A/all-in-viewport",
+      "pass": true,
+      "detail": "maxNodeRight=1593.90≤svgRight+1=1727.40，maxNodeBottom=918.30≤svgBottom+1=1104.60（F-L2 同判据）"
+    },
+    {
+      "id": "A-resize/transform-updated",
+      "pass": true,
+      "detail": "resize(2053x1109→1813x949) transform 更新（RO 路径——deps 未变，无 RO 即不变→红）"
+    },
+    {
+      "id": "A-resize/all-in-viewport",
+      "pass": true,
+      "detail": "maxNodeRight=1356.30/1489.80，maxNodeBottom=770.28/947.00"
+    },
+    {
+      "id": "B/pre/wheel-changed",
+      "pass": true,
+      "detail": "wheel 后视口已变（{\"tx\":583.6150811435356,\"ty\":-13.218859381174525,\"k\":1.5239211694088497}≠fit 值——前提锚）"
+    },
+    {
+      "id": "B/viewport-frozen",
+      "pass": true,
+      "detail": "resize 后视口保持 wheel 值（{\"tx\":583.6150811435356,\"ty\":-13.218859381174525,\"k\":1.5239211694088497}=={\"tx\":583.6150811435356,\"ty\":-13.218859381174525,\"k\":1.5239211694088497}——门语义不抢）"
+    },
+    {
+      "id": "C/resize-callback-fired",
+      "pass": true,
+      "detail": "resize 后 RO 派发计数 3→4（浏览器真派发——sanity 前提锚）"
+    },
+    {
+      "id": "C/disconnect-on-unmount",
+      "pass": true,
+      "detail": "unmount 后全部 2 个 wrapper 实例 disconnect 被调（成对清理）"
+    },
+    {
+      "id": "C/no-callback-after-disconnect",
+      "pass": true,
+      "detail": "disconnect 后再 resize 派发计数不增（4→4——回调不再生效，无泄漏）"
+    },
+    {
+      "id": "X/no-pageerror",
+      "pass": true,
+      "detail": "页面错误 0 条"
+    }
+  ]
+}
\ No newline at end of file
diff --git a/scripts/audits/f-l4-ticket.md b/scripts/audits/f-l4-ticket.md
new file mode 100644
index 000000000..27477e4d3
--- /dev/null
+++ b/scripts/audits/f-l4-ticket.md
@@ -0,0 +1,157 @@
+# F-L4 小票:档位切换(视口尺寸变化)→auto-fit 重触发——ResizeObserver 方案
+
+> 备案源:audit0-findings.md F-L2「新发现备案①」——SET1 档位切换不自动
+> refit(fit effect deps 无 uiScale,换档后需手动点「适应视图」;修前修后
+> 同此行为非 F-L2 引入)。v14 执行序小票批首票(半小时级)。
+> 基线:verify 115 文件 963 用例全绿 / locks 193 / e2e 29/29(commit 8149a7516)。
+
+## 0. 触发态空间表(本票的「态空间」——触发源×门状态矩阵,交审计)
+
+视口 hook 既有状态机(idle/fitting/fitted+manual 抢占门 userInteracted)
+不变;本票新增触发源「视口尺寸变化」(二阶原因=uiScale 换档/窗口 resize;
+一阶原因=svg 布局盒尺寸变化)。
+
+| 门状态 \ 触发 | nodes/edges 变化 | **视口尺寸变化(本票新增)** | wheel / panbg 拖 | 「适应视图」按钮 |
+| --- | --- | --- | --- | --- |
+| !userInteracted | fit(既有) | **fit(按新尺寸——本票)** | 交互+置门 true | 置门 false(已 false=React bail 无感,既有) |
+| userInteracted | 不抢视口(既有) | **不抢视口(本票)** | 交互(既有) | 置 false→effect 重触发 fit(既有) |
+| 空图(nodes=0) | 不 fit(既有) | **不 fit(本票同门)** | — | 按钮不渲染(既有) |
+
+跨格序列(交审计重点——单格枚举盖不住):
+
+- S1 挂载 fit(small 档)→换档 medium→RO 触发→按新 clientWidth refit
+  (F-L2 precheck 实证换档后 clientWidth 变:1381→1519.6 @110%,即
+  「换档→svg 布局盒变」成立);
+- S2 挂载 fit→wheel(置门)→换档→RO 触发→**不抢视口**(用户接管优先,
+  与 nodes 变化不抢同门);
+- S3=S2 后点「适应视图」→置门 false→effect 重触发→按当前档 fit(既有
+  路径,回归确认);
+- S4 空图→换档→RO 触发→早退不 fit(k=1 初始态保持);
+- S5 换档引起滚动条出现/消失→布局盒二次变化→RO 再触发→refit 幂等收敛
+  (同量测同输入→同输出,无振荡:setViewport 只改 svg 内容 transform,不改
+  svg 自身布局盒(h-full w-full 由父决定)→**无 RO 自激励循环**——这条
+  是实现侧必须核对的不变量);
+- S6 unmount→RO disconnect(成对清理,INV-14 同型)。
+
+**主控定向修法(候选二选一的裁决记录)**:
+
+- 候选 A「uiScale 进 fit effect deps + 换档调 resetFit」——**否决**,三重
+  缺陷:①App.tsx:134-136 写 `--ui-scale` 的 effect 是**父组件 effect**,
+  React 提交序=子先父后——LineageCanvas 的 fit effect 跑时 CSS 变量尚是
+  旧值,clientWidth 读到旧档布局,fit 按旧口径算(不修甚至 bail);②v14
+  §5.2 实录:resetFit 在 userInteracted=false 时 setState(false)=React
+  bail 不重触发;③props 穿透 4 层(App→Board→Canvas→hook)或跨域 store
+  订阅,把 SET1 的 CSS 单源耦合进视口域;
+- 候选 B(**采纳**)「ResizeObserver 观察 svg 布局盒」——尺寸变化是
+  **一阶原因**(uiScale 换档/窗口 resize 都是它的二阶来源),RO 回调天然
+  发生在布局更新之后(读到新值,零时序陷阱),零 props 穿透,视口域内部
+  闭环。**行为扩面如实声明**:窗口 resize 在 !userInteracted 下也从
+  「不 refit」变「refit」——语义顺带完备化(auto-fit 本意),受锁面已核
+  (grep tests/unit/renderer/lineage-* 无 resize 断言,无合约冲突);
+  userInteracted=true 时两源都不抢视口,门语义零变。
+- **fallback 声明**:若真机取证发现 Chromium 对 CSS zoom 引起的布局盒
+  变化不触发 RO(规范应然但实现待证),回退候选 A+rAF 推迟一帧量测——
+  真机探针场景 ① 为裁决点,红了走 fallback 再回炉,不许静默改方案。
+
+## 1. 行为层
+
+- `useViewportController` 新增独立 RO effect:挂载即 `observe(svgRef.current)`,
+  回调=执行与既有 fit effect **同一套**量测+fit 逻辑(见 §3 抽取);卸载
+  `disconnect()` 成对清理。
+- RO 回调与既有 fit effect 共用早退链(顺序零变):`userInteracted===true`
+  →不抢;`nodes.length===0`→不 fit;`svgRef.current===null`→跳过;
+  量测 `vw<=0||vh<=0`(jsdom 桩面/clientWidth||rect.width 回退口径
+  [F-L2] 不变)→跳过;否则 `setViewport(fitViewport(nodes,layout,vw,vh,
+  labelBoxes))`。
+- **量测口径**:与既有 fit 同——clientWidth/clientHeight 直取([F-L2]
+  INV-43 svg 本地口径),`clientWidth||rect.width` jsdom 回退保留。
+- 既有行为零变清单:nodes/edges 变化 fit、wheel 锚点缩放、panbg pan、
+  「适应视图」唯一复位口、空图不 fit、钳制 [0.25,4]、INV-14 成对注册。
+
+## 2. 接口层
+
+- `useViewportController` args **零变**(不新增 uiScale 参数——SET1 耦合
+  不入视口域接口);`ViewportController` 出参零变。
+- `rootToLocalScale`/`fitViewport`/`ZOOM` 导出零变。
+- LineageCanvas/LineageBoard/调用方零改(RO 是 hook 内部实现面)。
+
+## 3. 架构层
+
+- fit 逻辑两消费点(既有 effect+RO 回调)——自文件内抽私有 `doFit`
+  (或等价 ref 化闭包),**deps 语义零变**:既有 fit effect 的 deps
+  `[nodes, edges, layout, userInteracted, svgRef, labelBoxes]` 原样
+  保留(effect 体改调 doFit),RO effect deps 仅 `[svgRef]`(挂载一次
+  常活——数据经 ref 镜像取最新,不随 nodes 重注册,消 observe/disconnect
+  抖动)。
+- ref 镜像更新时机=既有项目先例(cbRef,LineageCanvas.tsx:123-125 的
+  effect 期更新);RO 回调经 ref 取 doFit,无闭包过期。
+- 禁改 lineage-layout 纯函数(量测驻视口域——票面架构层既有红线)。
+
+## 4. 生命周期层
+
+- RO 注册随挂载(svg 常驻——空态同 W2 先例,空→非空转场无重绑需求,
+  RO 不依赖 nodes)。
+- 卸载 disconnect;「S5 无自激励循环」不变量:RO 回调内 setViewport 只
+  改 `<g data-viewport>` transform,svg 元素布局盒由父布局决定不变→
+  不再触发 RO(实现+测试双锁:见 5.1 ⑦)。
+- `typeof ResizeObserver === 'undefined'` 守卫(极端环境)→不注册不
+  报错,既有 fit 路径不受影响。
+
+## 5. 文化层(测试与取证)
+
+### 5.1 新测试 `tests/unit/renderer/lineage-viewport-refit.test.tsx`(always-active,不经 guardedDescribe)
+
+jsdom 无 ResizeObserver+无布局——stub 手法 crib lineage-viewport-scale.
+test.ts:23-40(`Object.defineProperty` per-instance clientWidth+原型
+spyOn gBCR)+`vi.stubGlobal('ResizeObserver', ...)`:桩类捕获
+constructor callback/observe 目标/disconnect 调用,测试手动派发 callback
+模拟「布局盒变化」。渲染面 crib lineage-canvas.test.tsx(真实组件挂载,
+非纯 hook 单测——RO 注册面在组件树上断言才有效力)。
+
+- ① 注册面:挂载非空图→桩 observe 收到 svg 元素(data-testid
+  lineage-canvas);
+- ② 尺寸变化 refit:挂载(clientWidth=W1)fit 后改桩量测为 W2→手动派发
+  callback→viewport transform 断言=fitViewport(nodes,layout,W2,H)(数值
+  断言直接 import fitViewport 计算期望值——不 crib 死数字);
+- ③ 门语义:wheel 置门(派发 wheel 事件改 viewport)→手动派发 RO
+  callback→视口保持 wheel 后值(数值断言);
+- ④ 空图:挂载空图→callback→viewport 仍初始 {tx:0,ty:0,k:1};
+- ⑤ 成对清理:unmount→桩 disconnect 被调;
+- ⑥ 量测守卫:clientWidth=0 桩面→callback→视口不变(不产生退化 fit);
+- ⑦ 无自激励:setViewport 后再次断言 observe 未收到新注册/disconnect
+  未被调(实现侧 RO 不因 transform 重注册)。
+
+### 5.2 变异红证(备份→变异→红→还原→diff 空;禁 git checkout)
+
+- M1 摘 RO effect 整体→①②⑤红;
+- M2 callback 链摘 userInteracted 门→③红;
+- M3 摘 nodes.length===0 早退→④红;
+- M4 摘 disconnect→⑤红;
+- M5 callback 内量测改恒等值(摘量测)→②红。
+
+### 5.3 真机取证 `scripts/audits/f-l4-verify.mjs`(crib f-l2-fix-verify.mjs 同环)
+
+**命名先查在档**(v14 教训:git ls-files 核对无撞名)。场景:
+
+- A 换档 refit(裁决点):真库副本挂载 small 档 fit→记录 viewport transform
+  →切 medium(经 settings 通道,非直接写 CSS)→等 RO 回调→断言 transform
+  更新且=fitViewport 按 medium 档 clientWidth 期望值(全节点入视口口径,
+  F-L2 fix-verify 同判据);**红了=fallback 触发,报主控裁决**;
+- B 门语义:wheel 置门→切 large→视口不变(数值断言);
+- C 清理:unmount 无 RO 泄漏(disconnect 后回调不再生效——若桩可测)。
+
+### 5.4 收口面
+
+- `npm run verify` 全绿(新测试入 counts:963→973 级)+locks:apply
+  (新测试文件+新探针脚本扫入,193→195);台账 F-L4 翻已闭环;受锁尾注
+  [locked-change](tests+scripts+manifest)。
+
+## 6. 证据与报告契约(实现者)
+
+- 实现报告 scripts/audits/f-l4-impl.report.md:自裁申报一切超票面决定;
+  diff 自查(范围=lineage-viewport.ts+新测试+新探针,LineageCanvas 若
+  零改则声明);成本(token/工具数/时长);变异红证记录(M1~M5 各一行
+  红→还原→diff 空);真机探针输出 JSON 落 f-l4-out/。
+- 禁 git/registry/locks;卡住停手报主控;测试先红后绿,恒真断言=假阳性。
+- jsdom 不可达断言(jsdom 无 RO 的真实浏览器路径)由真机探针 A/B 锁
+  ——分工写进测试头注。
diff --git a/scripts/audits/f-l4-verify.mjs b/scripts/audits/f-l4-verify.mjs
new file mode 100644
index 000000000..322bb80de
--- /dev/null
+++ b/scripts/audits/f-l4-verify.mjs
@@ -0,0 +1,272 @@
+/**
+ * F-L4 修复真机取证——视口尺寸变化（svg 布局盒）auto-fit 重触发（RO 方案，
+ * 票面 5.3）。crib f-l2-fix-verify.mjs 运行模式（Electron 真机/真实库副本/
+ * 断言落 JSON）。
+ *
+ * 票面-现实接缝声明（实现者自裁取证组合，报主控知悉）：票面场景 A/B 的
+ * 「挂载中经 settings 通道切档」在真实 App 不可达——App.tsx:193-198 页面
+ * 条件渲染互斥，设置页换档时脉络页必 unmount。故取证分三路：
+ * - A（换档 refit，票面主断言）：small 档挂载 fit→设置页点「中 110%」（真实
+ *   settings 通道：save→settings.json→store→--ui-scale）→回脉络（重挂载
+ *   fit+RO observe 初始通知）→断言 clientWidth 变+transform 更新+全节点
+ *   入视口（F-L2 fix-verify 同判据）；
+ * - A-resize（RO 端到端裁决点）：脉络挂载中窗口 resize——fit effect deps
+ *   未变，refit 只能来自 RO 回调（摘 RO 即红）；
+ * - diagnostic（票面 §0 fallback 待证点直取证，信息项不断言）：挂载中直写
+ *   --ui-scale（CSS zoom 引起布局盒变化）→wrapper 计数 Chromium 是否派发
+ *   RO——回答「Chromium 对 CSS zoom 的布局盒变化不触发 RO」裁决问题（真实
+ *   App 换档路径经重挂载，不依赖此路径，故降信息项）。
+ * - B 门语义：wheel 置门→挂载中窗口 resize→视口不变（数值断言，等于 wheel
+ *   后值——门语义与 resize 触发源正交）；
+ * - C 清理：wrapper（内嵌原生 RO 转发——纯 JS 类浏览器不派发）记录实例/
+ *   派发计数/disconnect→unmount 断言 disconnect 被调+其后 resize 派发计数
+ *   不增（回调不再生效）。
+ * 产物：scripts/audits/f-l4-out/f-l4-verify.json；PASS 打印+exit 码。
+ */
+import { _electron as electron } from '@playwright/test'
+import { cp, mkdir, rm, readFile, writeFile } from 'node:fs/promises'
+import { existsSync, writeFileSync } from 'node:fs'
+import { tmpdir } from 'node:os'
+import { join } from 'node:path'
+
+const ROOT = process.cwd()
+const OUT = join(ROOT, 'scripts', 'audits', 'f-l4-out')
+await mkdir(OUT, { recursive: true })
+const log = (...a) => console.log(`[f-l4 ${new Date().toISOString().slice(11, 19)}]`, ...a)
+
+/** transform 串解析（与单测/e2e 同式：translate(x, y) scale(k)） */
+function parseTransform(s) {
+  const m = String(s).match(/^translate\((-?[\d.e+-]+), (-?[\d.e+-]+)\) scale\(([\d.e+-]+)\)$/)
+  return m ? { tx: Number(m[1]), ty: Number(m[2]), k: Number(m[3]) } : null
+}
+
+/** 两视口是否可感不同（任一分量差>0.5——transform 串由 state 模板生成，同值同串） */
+function viewportChanged(a, b) {
+  return Math.abs(a.tx - b.tx) > 0.5 || Math.abs(a.ty - b.ty) > 0.5 || Math.abs(a.k - b.k) > 0.5
+}
+
+async function freshUserData() {
+  const src = join(process.env.APPDATA, 'Synapse')
+  const userData = join(tmpdir(), 'synapse-f-l4-verify')
+  await rm(userData, { recursive: true, force: true })
+  for (const p of ['workspaces', 'ai-sensor']) await cp(join(src, p), join(userData, p), { recursive: true })
+  for (const f of ['settings.json', 'workspace.json', 'window-state.json']) {
+    if (existsSync(join(src, f))) await cp(join(src, f), join(userData, f))
+  }
+  // 场景 A 起点：预写 small 档（挂载 small 档 fit；后续经设置页 UI 真实通道切 medium）
+  const settingsPath = join(userData, 'settings.json')
+  const base = existsSync(settingsPath) ? JSON.parse(await readFile(settingsPath, 'utf8')) : {}
+  base.uiScale = 'small'
+  await writeFile(settingsPath, JSON.stringify(base), 'utf8')
+  return userData
+}
+
+const userData = await freshUserData()
+const app = await electron.launch({ args: ['out/main/index.js'], env: { ...process.env, SYNAPSE_USER_DATA: userData } })
+const win = await app.firstWindow()
+await win.getByRole('button', { name: '脉络' }).waitFor({ timeout: 20_000 })
+await win.waitForTimeout(800)
+await win.getByRole('button', { name: '脉络' }).click()
+await win.waitForTimeout(1500)
+
+const pageErrors = []
+win.on('pageerror', (e) => pageErrors.push(String(e)))
+
+/** 视口态 dump（与 f-l2-fix-verify 同口径：gBCR/client/transform/节点极值） */
+const DUMP = `(() => {
+  const svgEl = document.querySelector('[data-viewport]')?.closest('svg')
+  if (!svgEl) return null
+  const r = svgEl.getBoundingClientRect()
+  const transform = document.querySelector('[data-viewport]')?.getAttribute('transform') || ''
+  const nodes = [...document.querySelectorAll('[data-node-id]')].map((e) => {
+    const b = e.getBoundingClientRect()
+    return { id: e.dataset.nodeId, right: b.right, bottom: b.bottom }
+  })
+  return {
+    gBCR: { w: r.width, h: r.height, x: r.x, y: r.y, right: r.right, bottom: r.bottom },
+    client: { w: svgEl.clientWidth, h: svgEl.clientHeight },
+    zoomRow: svgEl.closest('.app-content-row') ? getComputedStyle(svgEl.closest('.app-content-row')).zoom : null,
+    transform,
+    nodeCount: nodes.length,
+    maxNodeRight: Math.max(...nodes.map((n) => n.right)),
+    maxNodeBottom: Math.max(...nodes.map((n) => n.bottom))
+  }
+})()`
+
+const results = []
+const check = (id, pass, detail) => {
+  results.push({ id, pass, detail })
+  log(`${pass ? 'PASS' : 'FAIL'} ${id} — ${detail}`)
+}
+
+const winBounds = () => app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].getBounds())
+const resizeBy = (dw, dh) =>
+  app.evaluate(({ BrowserWindow }, d) => {
+    const w = BrowserWindow.getAllWindows()[0]
+    const b = w.getBounds()
+    w.setSize(b.width + d.dw, b.height + d.dh)
+  }, { dw, dh })
+
+const brief = (m) =>
+  JSON.stringify({
+    zoomRow: m.zoomRow,
+    clientW: m.client.w,
+    gBCRw: Math.round(m.gBCR.w * 10) / 10,
+    v: parseTransform(m.transform),
+    maxRight: Math.round(m.maxNodeRight * 10) / 10,
+    svgRight: Math.round(m.gBCR.right * 10) / 10
+  })
+
+// ── 场景 A（换档 refit，票面主断言）：真实 settings 通道（设置页 UI 点档）──
+const t1 = await win.evaluate(DUMP) // small 档挂载 fit
+log('A/small 挂载 fit：', brief(t1))
+await win.getByRole('button', { name: '设置' }).click()
+await win.waitForTimeout(600)
+await win.getByRole('button', { name: '中 110%' }).click()
+await win.waitForTimeout(900) // save 落地→store→--ui-scale（真实通道全程）
+await win.getByRole('button', { name: '脉络' }).click()
+await win.waitForTimeout(1200) // 重挂载：取数+fit effect+RO observe 初始通知
+const t2 = await win.evaluate(DUMP)
+log('A/medium 换档后：', brief(t2))
+
+check('A/pre/node-count', t2.nodeCount > 0, `真库脉络图节点数=${t2.nodeCount}（>0 前提锚）`)
+check('A/client-width-changed', Math.abs(t2.client.w - t1.client.w) > 1, `small→medium clientWidth：${t1.client.w}→${t2.client.w}（F-L2 precheck 同实证口径）`)
+const v1 = parseTransform(t1.transform)
+const v2 = parseTransform(t2.transform)
+check('A/transform-updated', v1 !== null && v2 !== null && viewportChanged(v2, v1), `transform small(${JSON.stringify(v1)})→medium(${JSON.stringify(v2)}) 按新档量测 refit`)
+check(
+  'A/all-in-viewport',
+  t2.maxNodeRight <= t2.gBCR.right + 1 && t2.maxNodeBottom <= t2.gBCR.bottom + 1,
+  `maxNodeRight=${t2.maxNodeRight.toFixed(2)}≤svgRight+1=${(t2.gBCR.right + 1).toFixed(2)}，maxNodeBottom=${t2.maxNodeBottom.toFixed(2)}≤svgBottom+1=${(t2.gBCR.bottom + 1).toFixed(2)}（F-L2 同判据）`
+)
+
+// ── A-resize（RO 端到端裁决点）：挂载中窗口 resize——fit effect deps 未变，refit 只能来自 RO ──
+const bounds0 = await winBounds()
+await resizeBy(-240, -160)
+await win.waitForTimeout(900)
+const t3 = await win.evaluate(DUMP)
+log('A-resize/缩窗后：', brief(t3))
+const v3 = parseTransform(t3.transform)
+check('A-resize/transform-updated', v3 !== null && viewportChanged(v3, v2), `resize(${bounds0.width}x${bounds0.height}→${bounds0.width - 240}x${bounds0.height - 160}) transform 更新（RO 路径——deps 未变，无 RO 即不变→红）`)
+check(
+  'A-resize/all-in-viewport',
+  t3.maxNodeRight <= t3.gBCR.right + 1 && t3.maxNodeBottom <= t3.gBCR.bottom + 1,
+  `maxNodeRight=${t3.maxNodeRight.toFixed(2)}/${(t3.gBCR.right + 1).toFixed(2)}，maxNodeBottom=${t3.maxNodeBottom.toFixed(2)}/${(t3.gBCR.bottom + 1).toFixed(2)}`
+)
+
+// ── B 门语义：wheel 置门→挂载中 resize→视口不变（数值断言）──
+const bx = t3.gBCR.x + t3.gBCR.w / 2
+const by = t3.gBCR.y + t3.gBCR.h / 2
+await win.mouse.move(bx, by)
+await win.mouse.wheel(0, -240) // 用户接管视口（userInteracted=true）
+await win.waitForTimeout(400)
+const wb = await win.evaluate(DUMP)
+const wv = parseTransform(wb.transform)
+check('B/pre/wheel-changed', wv !== null && viewportChanged(wv, v3), `wheel 后视口已变（${JSON.stringify(wv)}≠fit 值——前提锚）`)
+await resizeBy(-200, 0)
+await win.waitForTimeout(900)
+const wa = await win.evaluate(DUMP)
+const wv2 = parseTransform(wa.transform)
+check('B/viewport-frozen', wv2 !== null && !viewportChanged(wv2, wv), `resize 后视口保持 wheel 值（${JSON.stringify(wv2)}==${JSON.stringify(wv)}——门语义不抢）`)
+
+// ── RO wrapper（diagnostic+C 前置）：内嵌原生 RO 转发（纯 JS 类浏览器不派发）──
+await win.evaluate(() => {
+  const Native = window.ResizeObserver
+  const rec = { instances: [], callbackCount: 0 }
+  class WrappedRO {
+    constructor(cb) {
+      this.disconnected = false
+      this.targets = []
+      this.native = new Native((...args) => {
+        window.__roRec.callbackCount += 1
+        cb(...args)
+      })
+      rec.instances.push(this)
+    }
+    observe(t) {
+      this.targets.push(t)
+      this.native.observe(t)
+    }
+    disconnect() {
+      this.disconnected = true
+      this.native.disconnect()
+    }
+  }
+  window.__roRec = rec
+  window.ResizeObserver = WrappedRO
+})
+// 重挂载使新实例经 wrapper（patch 时挂载中的旧实例仍原生——不可观察，无妨）
+await win.getByRole('button', { name: '设置' }).click()
+await win.waitForTimeout(500)
+await win.getByRole('button', { name: '脉络' }).click()
+await win.waitForTimeout(1200)
+const ro0 = await win.evaluate(() => ({
+  instanceCount: window.__roRec.instances.length,
+  callbackCount: window.__roRec.callbackCount,
+  observeTargets: window.__roRec.instances.flatMap((i) => i.targets.map((t) => t.getAttribute('data-testid')))
+}))
+log('wrapper 就位：', JSON.stringify(ro0))
+
+// ── diagnostic（票面 §0 fallback 待证点直取证——信息项不断言）：挂载中直写
+//    --ui-scale（CSS zoom 引起布局盒变化）→Chromium 是否派发 RO ──
+const diagBefore = await win.evaluate(DUMP)
+const countBefore = await win.evaluate(() => window.__roRec.callbackCount)
+const cssOriginal = await win.evaluate(() => document.documentElement.style.getPropertyValue('--ui-scale') || '1')
+const cssFlipped = cssOriginal === '1' ? '1.1' : '1'
+await win.evaluate(`document.documentElement.style.setProperty('--ui-scale', '${cssFlipped}')`)
+await win.waitForTimeout(900)
+const diagAfter = await win.evaluate(DUMP)
+const countAfter = await win.evaluate(() => window.__roRec.callbackCount)
+await win.evaluate(`document.documentElement.style.setProperty('--ui-scale', '${cssOriginal}')`) // 恢复
+await win.waitForTimeout(600)
+const diagnostic = {
+  method: '挂载中直写 --ui-scale（非 settings 通道——真实 App 换档经设置页+重挂载，此路径 UI 不可达，仅供 fallback 裁决取证）',
+  cssFlipped,
+  clientWidth: { before: diagBefore.client.w, after: diagAfter.client.w },
+  clientWidthChanged: Math.abs(diagAfter.client.w - diagBefore.client.w) > 1,
+  roCallbackCount: { before: countBefore, after: countAfter },
+  cssZoomTriggersRO: Math.abs(diagAfter.client.w - diagBefore.client.w) > 1 && countAfter > countBefore
+}
+log('diagnostic（信息项）：', JSON.stringify(diagnostic))
+
+// ── C 清理（S6）：resize→派发计数增（sanity）→unmount→disconnect 被调→
+//    再 resize→计数不增（回调不再生效）──
+const c0 = await win.evaluate(() => window.__roRec.callbackCount)
+await resizeBy(0, -140)
+await win.waitForTimeout(900)
+const c1 = await win.evaluate(() => window.__roRec.callbackCount)
+check('C/resize-callback-fired', c1 > c0, `resize 后 RO 派发计数 ${c0}→${c1}（浏览器真派发——sanity 前提锚）`)
+await win.getByRole('button', { name: '设置' }).click()
+await win.waitForTimeout(700)
+const roUnmounted = await win.evaluate(() => ({
+  disconnected: window.__roRec.instances.every((i) => i.disconnected),
+  instanceCount: window.__roRec.instances.length
+}))
+check('C/disconnect-on-unmount', roUnmounted.disconnected, `unmount 后全部 ${roUnmounted.instanceCount} 个 wrapper 实例 disconnect 被调（成对清理）`)
+await resizeBy(0, 100)
+await win.waitForTimeout(900)
+const c2 = await win.evaluate(() => window.__roRec.callbackCount)
+check('C/no-callback-after-disconnect', c2 === c1, `disconnect 后再 resize 派发计数不增（${c1}→${c2}——回调不再生效，无泄漏）`)
+
+check('X/no-pageerror', pageErrors.length === 0, `页面错误 ${pageErrors.length} 条${pageErrors.length > 0 ? '：' + pageErrors.join('; ') : ''}`)
+
+writeFileSync(
+  join(OUT, 'f-l4-verify.json'),
+  JSON.stringify(
+    {
+      meta: { script: 'f-l4-verify.mjs', date: new Date().toISOString() },
+      scenes: { A_small_mount: t1, A_medium_switched: t2, A_resize: t3, B_wheel_before: wb, B_resize_after: wa },
+      wrapper: ro0,
+      diagnostic,
+      results
+    },
+    null,
+    2
+  )
+)
+await app.close()
+
+const fails = results.filter((r) => !r.pass)
+if (fails.length === 0) console.log(`F-L4 VERIFY: PASS（${results.length}/${results.length} 项断言全过）→ f-l4-out/f-l4-verify.json`)
+else console.log(`F-L4 VERIFY: FAIL（${fails.length}/${results.length} 项断言失败——场景 A 红=fallback 触发，报主控裁决）`)
+process.exit(fails.length === 0 ? 0 : 1)
diff --git a/src/renderer/features/lineage/lineage-viewport.ts b/src/renderer/features/lineage/lineage-viewport.ts
index 516d18a05..4bc91f436 100644
--- a/src/renderer/features/lineage/lineage-viewport.ts
+++ b/src/renderer/features/lineage/lineage-viewport.ts
@@ -32,8 +32,21 @@
  * 祖先 zoom）；wheel/pan=根框差值×rootToLocalScale 归一（比值=1/有效
  * zoom，嵌套自动复合）。祖先 zoom 下的根框量测不得直接入 transform 数学
  * （k 虚大→内容溢出视口——修前 large 档溢出 211.75px）。
+ *
+ * [F-L4] fit 触发源扩面「视口尺寸变化」：ResizeObserver 观察 svg 布局盒
+ * （uiScale 换档/窗口 resize 均为其二阶来源，布局盒变化=一阶原因——RO
+ * 回调天然发生在布局更新之后，读到新值零时序陷阱，票面 §0 候选 B）。RO
+ * 回调与既有 fit effect 共用同一 doFit（早退链顺序零变：userInteracted
+ * 不抢/nodes=0 不 fit/svgRef null 跳过/量测 0 跳过）；门语义零变
+ * （userInteracted=true 时换档/resize 都不抢视口——与 nodes 变化同门）。
+ * S5 无自激励不变量：setViewport 只改 <g data-viewport> transform，svg
+ * 布局盒由父布局决定（h-full w-full）→不再触发 RO。RO effect deps
+ * [svgRef] 挂载一次常活（svg 常驻 W2——空→非空转场无重绑），数据经
+ * doFitRef 镜像取最新（cbRef 先例）；卸载 disconnect 成对清理（INV-14
+ * 同型）。typeof ResizeObserver === 'undefined' 极端环境守卫→不注册
+ * 不报错（既有 fit 路径不受影响）。
  */
-import { useEffect, useState } from 'react'
+import { useEffect, useRef, useState } from 'react'
 import type { RefObject } from 'react'
 import type { LineageEdge, LineageNode } from '@shared/models/lineage'
 import { BAND_LEFT, nodeHeight, nodeWidth } from './lineage-layout'
@@ -138,22 +151,52 @@ export function useViewportController(args: {
   const [viewport, setViewport] = useState<Viewport>({ tx: 0, ty: 0, k: 1 })
   const [userInteracted, setUserInteracted] = useState(false)
 
-  // auto-fit effect：nodes/edges 引用变化（载入/导入替换/写回填）且用户
-  // 未交互时整图入视口；视口宽高 0=不可量测（jsdom）→跳过保持现视口。
-  // [F-L2] 量测=clientWidth/clientHeight 直取（svg 本地口径，INV-43——不
-  // 含祖先 zoom；gBCR 根框口径会 k 虚大→溢出视口）。clientWidth=0 且
-  // gBCR>0 = CSS 布局不可量测的退化态（jsdom 桩面）→回退 gBCR（不劣于
-  // 修前；真机恒有布局走直取主路径=修复生效）。
+  // [F-L4] doFit ref 镜像：fit 逻辑单一定义点（早退链+量测+fitViewport，
+  // 顺序零变），两消费点（既有 fit effect+RO 回调）经 ref 共用同一套；每
+  // 渲染提交后更新（crib LineageCanvas.tsx cbRef 先例——effect 期更新，
+  // RO 回调无闭包过期）。声明序=先于两消费 effect（同提交内 ref 先就位）。
+  const doFitRef = useRef<() => void>(() => undefined)
+  useEffect(() => {
+    doFitRef.current = () => {
+      // auto-fit 早退链（[F-L4] 前内联于 fit effect——抽取零变）：用户已
+      // 交互（pan/zoom 接管）不抢；空图不 fit；svg 未挂载/量测 0（jsdom
+      // 无布局）跳过保持现视口。[F-L2] 量测=clientWidth/clientHeight 直取
+      // （svg 本地口径，INV-43——不含祖先 zoom；gBCR 根框口径会 k 虚大→
+      // 溢出视口）。clientWidth=0 且 gBCR>0 = CSS 布局不可量测的退化态
+      // （jsdom 桩面）→回退 gBCR（不劣于修前；真机恒有布局走直取主路径）。
+      if (userInteracted || nodes.length === 0) return
+      const el = svgRef.current
+      if (el === null) return
+      const rect = el.getBoundingClientRect()
+      const vw = el.clientWidth || rect.width
+      const vh = el.clientHeight || rect.height
+      if (vw <= 0 || vh <= 0) return
+      setViewport(fitViewport(nodes, layout, vw, vh, labelBoxes))
+    }
+  })
+
+  // auto-fit effect：nodes/edges 引用变化（载入/导入替换/写回填）触发——
+  // 体改调 doFitRef（[F-L4] §3：deps 语义零变原样保留，fit 逻辑上移共用）。
+  useEffect(() => {
+    doFitRef.current()
+  }, [nodes, edges, layout, userInteracted, svgRef, labelBoxes])
+
+  // [F-L4] RO effect：视口尺寸变化（svg 布局盒——换档/窗口 resize 一阶
+  // 源）重触发 fit。deps [svgRef] 挂载一次常活（svg 常驻，不随 nodes 重
+  // 注册——消 observe/disconnect 抖动），回调经 doFitRef 取最新数据。
+  // 卸载 disconnect 成对清理（S6，INV-14 同型）；无 RO 环境守卫不注册。
   useEffect(() => {
-    if (userInteracted || nodes.length === 0) return
+    if (typeof ResizeObserver === 'undefined') return
     const el = svgRef.current
     if (el === null) return
-    const rect = el.getBoundingClientRect()
-    const vw = el.clientWidth || rect.width
-    const vh = el.clientHeight || rect.height
-    if (vw <= 0 || vh <= 0) return
-    setViewport(fitViewport(nodes, layout, vw, vh, labelBoxes))
-  }, [nodes, edges, layout, userInteracted, svgRef, labelBoxes])
+    const ro = new ResizeObserver(() => {
+      doFitRef.current()
+    })
+    ro.observe(el)
+    return () => {
+      ro.disconnect()
+    }
+  }, [svgRef])
 
   // zoom：非被动 wheel（preventDefault 阻页面滚动）；鼠标锚点缩放（缩放
   // 前后鼠标下的内容点不动）。函数式 set 取最新视口，无闭包过期。
diff --git a/tests/unit/renderer/lineage-viewport-refit.test.tsx b/tests/unit/renderer/lineage-viewport-refit.test.tsx
new file mode 100644
index 000000000..193a4dad8
--- /dev/null
+++ b/tests/unit/renderer/lineage-viewport-refit.test.tsx
@@ -0,0 +1,285 @@
+// @vitest-environment jsdom
+/**
+ * [F-L4] lineage-viewport-refit —— 视口尺寸变化（svg 布局盒）auto-fit 重触发
+ * 锁定合约（always-active，不经 guardedDescribe——ADR-0017 裁决 3；票面 5.1
+ * 场景①~⑦）。
+ *
+ * jsdom 无 ResizeObserver+无布局——stub 手法 crib lineage-viewport-scale.
+ * test.ts:23-40（per-instance Object.defineProperty clientWidth+原型
+ * spyOn gBCR）+ vi.stubGlobal('ResizeObserver', 桩类)：桩捕获 constructor
+ * callback / observe 目标 / disconnect 调用，测试手动派发 callback 模拟
+ * 「布局盒变化」。渲染面 crib lineage-canvas.test.tsx（真实组件挂载——
+ * RO 注册面在组件树上断言才有效力）。数值断言 import fitViewport 计算
+ * 期望值，不 crib 死数字。
+ * 分工：jsdom 不可达断言（RO 真实浏览器派发/CSS zoom 引起的布局盒变化/
+ * 真库换档链）由真机探针 f-l4-verify.mjs 场景 A/B 锁（票面 §6）。
+ */
+import { act } from 'react'
+import { createRoot, type Root } from 'react-dom/client'
+import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
+import type { LineageEdge, LineageNode } from '../../../src/shared/models/lineage'
+import { fitViewport } from '../../../src/renderer/features/lineage/lineage-viewport'
+import { layoutLineage } from '../../../src/renderer/features/lineage/lineage-layout'
+import { LineageCanvas } from '../../../src/renderer/features/lineage/LineageCanvas'
+
+/** RO 桩类：捕获 callback / observe 目标 / disconnect 调用（测试手动派发） */
+class ROStub {
+  static instances: ROStub[] = []
+  callback: ResizeObserverCallback
+  observeTargets: Element[] = []
+  disconnected = false
+  constructor(callback: ResizeObserverCallback) {
+    this.callback = callback
+    ROStub.instances.push(this)
+  }
+  observe(target: Element): void {
+    this.observeTargets.push(target)
+  }
+  disconnect(): void {
+    this.disconnected = true
+  }
+}
+
+const lastRO = (): ROStub => {
+  const ro = ROStub.instances[ROStub.instances.length - 1]
+  if (ro === undefined) throw new Error('无 RO 实例（未注册——实现缺失或已 disconnect 清场）')
+  return ro
+}
+
+/** 手动派发 RO callback（entries 空——实现只消费回调时机不读 entries） */
+function fireRO(ro: ROStub): void {
+  act(() => {
+    ro.callback([], ro as unknown as ResizeObserver)
+  })
+}
+
+/** 可变量测桩：原型 gBCR（挂载前就位——挂载 fit 走 clientWidth||rect.width
+ *  回退路径 [F-L2] jsdom 口径；canvas.test stubViewportRect 可变版） */
+function stubGBCR(width: number, height: number) {
+  let w = width
+  let h = height
+  const spy = vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (this: Element) {
+    return { x: 0, y: 0, top: 0, left: 0, right: w, bottom: h, width: w, height: h, toJSON: () => ({}) } as DOMRect
+  })
+  return {
+    spy,
+    set: (nw: number, nh: number): void => {
+      w = nw
+      h = nh
+    }
+  }
+}
+
+/** per-instance 可变 clientWidth/clientHeight（直取主路径——真机 clientWidth
+ *  优先于 gBCR 回退；scale.test.ts:23-40 同族手法） */
+function stubClientSize(el: Element, width: number, height: number) {
+  let w = width
+  let h = height
+  Object.defineProperty(el, 'clientWidth', { get: () => w, configurable: true })
+  Object.defineProperty(el, 'clientHeight', { get: () => h, configurable: true })
+  return {
+    set: (nw: number, nh: number): void => {
+      w = nw
+      h = nh
+    }
+  }
+}
+
+function node(
+  id: string,
+  patch: Partial<Pick<LineageNode, 'year' | 'x' | 'y' | 'paperId' | 'title'>> = {}
+): LineageNode {
+  return {
+    id,
+    paperId: patch.paperId !== undefined ? patch.paperId : `paper-${id}`,
+    title: patch.title ?? `节点${id}`,
+    coreIdea: '',
+    year: patch.year ?? null,
+    x: patch.x ?? null,
+    y: patch.y ?? null,
+    createdAt: 't',
+    updatedAt: 't'
+  }
+}
+
+function edge(from: string, to: string): LineageEdge {
+  return { id: `e-${from}-${to}`, fromNode: from, toNode: to, label: '', kind: 'tree', createdAt: 't', updatedAt: 't' }
+}
+
+/** 三节点链：A(2020)→B(2021)→C(2022)，B 主题节点（canvas.test 同款夹具） */
+function chain(): { nodes: LineageNode[]; edges: LineageEdge[] } {
+  return {
+    nodes: [
+      node('A', { year: 2020, title: '扩散模型起点' }),
+      node('B', { year: 2021, paperId: null, title: '主题分组' }),
+      node('C', { year: 2022, title: '最新进展' })
+    ],
+    edges: [edge('A', 'B'), edge('B', 'C')]
+  }
+}
+
+let root: Root | null = null
+let host: HTMLDivElement | null = null
+
+function mount(node: JSX.Element): void {
+  host = document.createElement('div')
+  document.body.appendChild(host)
+  root = createRoot(host)
+  act(() => {
+    root?.render(node)
+  })
+}
+
+const viewportTransform = (): string =>
+  host?.querySelector('[data-viewport]')?.getAttribute('transform') ?? ''
+
+/** 解析 data-viewport transform 串（translate(x, y) scale(k)——与 e2e 同式解析） */
+function parseViewport(s: string): { tx: number; ty: number; k: number } | null {
+  const m = s.match(/^translate\((-?[\d.]+), (-?[\d.]+)\) scale\(([\d.]+)\)$/)
+  return m ? { tx: Number(m[1]), ty: Number(m[2]), k: Number(m[3]) } : null
+}
+
+beforeEach(() => {
+  vi.stubGlobal('ResizeObserver', ROStub)
+  ROStub.instances.length = 0
+})
+
+afterEach(() => {
+  act(() => {
+    root?.unmount()
+  })
+  root = null
+  host?.remove()
+  host = null
+  vi.unstubAllGlobals()
+  vi.restoreAllMocks()
+})
+
+describe('F-L4 视口尺寸变化 refit（ResizeObserver 方案——票面 5.1 ①~⑦）', () => {
+  it('① 注册面：挂载非空图→桩 observe 收到 svg 元素（data-testid lineage-canvas）', () => {
+    const m = stubGBCR(800, 600)
+    try {
+      const g = chain()
+      mount(<LineageCanvas nodes={g.nodes} edges={g.edges} />)
+      expect(ROStub.instances.length).toBe(1)
+      const svg = host?.querySelector('[data-testid="lineage-canvas"]')
+      expect(lastRO().observeTargets).toEqual([svg])
+    } finally {
+      m.spy.mockRestore()
+    }
+  })
+
+  it('② 尺寸变化 refit：挂载（W1 gBCR 回退口径）fit 后改 clientWidth=W2→派发 callback→transform=fitViewport(nodes, layout, W2, H)', () => {
+    // W1=700×600/W2=500×600 选型（x 维紧约束）：fitViewport k=min(x 比, y 比)，
+    // W2 变化必须实际改变输出——若 y 维恒紧（如 800×600→1200×600 同 y）宽
+    // 变化不改变 fit 值，「量测恒等」型变异（M5）不可判别（首轮变异红证实证）。
+    // x 紧（700:460/380=1.21 < 440/344=1.28；500:260/380=0.68 < 1.28）下 W2
+    // 直取主路径可判。
+    const m = stubGBCR(700, 600)
+    try {
+      const g = chain()
+      const layout = layoutLineage(g.nodes, g.edges)
+      mount(<LineageCanvas nodes={g.nodes} edges={g.edges} />)
+      const fitted = parseViewport(viewportTransform())
+      expect(fitted).not.toBeNull()
+      expect(fitted!.k).not.toBe(1) // 挂载 fit 已生效前提锚（W1 口径 k≈1.21）
+      const svg = host?.querySelector('[data-testid="lineage-canvas"]') as Element
+      stubClientSize(svg, 500, 600) // 直取主路径：clientWidth 优先于 gBCR 回退
+      fireRO(lastRO())
+      const expected = fitViewport(g.nodes, layout, 500, 600)
+      const v = parseViewport(viewportTransform())
+      expect(v!.k).toBeCloseTo(expected.k, 6)
+      expect(v!.tx).toBeCloseTo(expected.tx, 6)
+      expect(v!.ty).toBeCloseTo(expected.ty, 6)
+    } finally {
+      m.spy.mockRestore()
+    }
+  })
+
+  it('③ 门语义（userInteracted 不抢视口）：wheel 置门→派发 RO callback→视口保持 wheel 后值（数值断言）', () => {
+    const m = stubGBCR(800, 600)
+    try {
+      const g = chain()
+      mount(<LineageCanvas nodes={g.nodes} edges={g.edges} />)
+      const fitted = parseViewport(viewportTransform())
+      const svg = host?.querySelector('[data-testid="lineage-canvas"]') as SVGSVGElement
+      act(() => {
+        svg.dispatchEvent(new WheelEvent('wheel', { deltaY: -240, clientX: 300, clientY: 200, cancelable: true }))
+      })
+      const wheeled = parseViewport(viewportTransform())
+      expect(wheeled!.k).not.toBe(fitted!.k) // wheel 确实改了视口（前提锚）
+      stubClientSize(svg, 500, 600) // 布局盒变化（量测也变——与② 同口径）
+      fireRO(lastRO())
+      const v = parseViewport(viewportTransform())
+      expect(v!.tx).toBeCloseTo(wheeled!.tx, 6)
+      expect(v!.ty).toBeCloseTo(wheeled!.ty, 6)
+      expect(v!.k).toBeCloseTo(wheeled!.k, 6)
+    } finally {
+      m.spy.mockRestore()
+    }
+  })
+
+  it('④ 空图（nodes=0）：派发 callback→不 fit（量测未发生——早退在量测前，锁链序）且视口停初始', () => {
+    const m = stubGBCR(800, 600)
+    try {
+      mount(<LineageCanvas nodes={[]} edges={[]} />)
+      expect(ROStub.instances.length).toBe(1) // svg 常驻（W2 先例）——空图同注册
+      const before = m.spy.mock.calls.length
+      fireRO(lastRO())
+      expect(m.spy.mock.calls.length).toBe(before) // fit 早退先于 gBCR 读取（nodes.length===0 在量测前）
+      expect(host?.querySelector('[data-viewport]')).toBeNull() // 空态 g 未渲染——视口停 {0,0,1}
+    } finally {
+      m.spy.mockRestore()
+    }
+  })
+
+  it('⑤ 成对清理（INV-14 同型）：unmount→桩 disconnect 被调', () => {
+    const m = stubGBCR(800, 600)
+    try {
+      const g = chain()
+      mount(<LineageCanvas nodes={g.nodes} edges={g.edges} />)
+      const ro = lastRO()
+      expect(ro.disconnected).toBe(false)
+      act(() => {
+        root?.unmount()
+      })
+      root = null
+      expect(ro.disconnected).toBe(true)
+    } finally {
+      m.spy.mockRestore()
+    }
+  })
+
+  it('⑥ 量测守卫：clientWidth=0 桩面（jsdom 布局不可量测）→callback→视口不变（不产生退化 fit）', () => {
+    const m = stubGBCR(0, 0)
+    try {
+      const g = chain()
+      mount(<LineageCanvas nodes={g.nodes} edges={g.edges} />)
+      expect(viewportTransform()).toBe('translate(0, 0) scale(1)') // 挂载 fit 早退（量测 0）
+      fireRO(lastRO())
+      expect(viewportTransform()).toBe('translate(0, 0) scale(1)') // RO 回调同守卫
+    } finally {
+      m.spy.mockRestore()
+    }
+  })
+
+  it('⑦ 无自激励（S5）：callback 内 setViewport 重渲染→无新 RO 注册/disconnect/重复 observe，且同量测重复 callback 幂等收敛', () => {
+    const m = stubGBCR(800, 600)
+    try {
+      const g = chain()
+      mount(<LineageCanvas nodes={g.nodes} edges={g.edges} />)
+      const ro = lastRO()
+      const instancesBefore = ROStub.instances.length
+      const observesBefore = ro.observeTargets.length
+      fireRO(lastRO())
+      const settled = viewportTransform()
+      fireRO(lastRO()) // 同量测重复 callback：同输入同输出（无振荡）
+      expect(viewportTransform()).toBe(settled)
+      expect(ROStub.instances.length).toBe(instancesBefore) // setViewport 只改 <g> transform——不触发 RO 重注册（S5 不变量）
+      expect(ro.disconnected).toBe(false)
+      expect(ro.observeTargets.length).toBe(observesBefore)
+    } finally {
+      m.spy.mockRestore()
+    }
+  })
+})

```

## 输出纪律(必读)

- 先给统计行:「B:N 条/W:N 条/N:N 条+总评一句」;再逐条展开;最后给放行判定(放行/回炉+回炉点清单)。
- 每条发现必须引用具体文件/行/断言 id——不得只给路径(异基座无法读盘,一切结论只能来自本材料包内文)。
- 不确定的写「存疑+需要什么证据」,不要编造。控制在 200 行内。