# F-L2 修票:lineage 视口量测 zoom 污染——fit/wheel/pan 三消费点本地坐标系归一

> 来源:AUDIT0 台账 F-L2 [B](适应视图后节点出视口 212px)。根因已实证
> (b82cd770c 排查票):SET1 UI 缩放(`.app-content-row { zoom:
> var(--ui-scale) }`,theme.css:124——lineage svg 在该缩放子树内)下
> `getBoundingClientRect()` 返回 zoom 放大后**根框视觉 px**,而 SVG 用户
> 坐标系(视口 transform 数学)不随 zoom——根框量测被消费进本地数学=k 虚大
> →内容溢出视口右缘。
> **修票前置实测(2026-08-30 主控 f-l2-precheck.mjs,f-l2-out/
> f-l2-precheck.json,Electron 真机三档)**:
> - **Q1 clientWidth=本地口径**:small gBCRw=clientW=1568(zoom1 恒等);
>   medium clientW 1381×1.1=1519.1≈gBCRw 1519.6;large clientW 1158×1.25
>   =1447.5≈gBCRw 1447——**clientWidth/clientHeight 不含祖先 zoom**。
> - **Q2 缩放因子可读**:getComputedStyle(.app-content-row).zoom='1'/
>   '1.1'/'1.25'(html zoom 恒'1')。
> - **Q3 事件坐标=根框**:CDP 真鼠标 move 到 svg 视觉中心 x=959(large),
>   捕获 clientX=958——**不除 zoom**。
> - **bug 基线复现**:large 档 fit 后 maxNodeRight=1893.75 vs svgRight=1682
>   (溢出 211.75px≈台账 212px);medium k 亦虚大 10%(该库未溢出但数学同错)。
> LOOP 会话票——不在 tickets/registry,禁触碰。中票三屋(ADR-0017)。

## 0. 量测口径表(本票的「态空间」——坐标系×消费点矩阵,交审计)

视口状态机(idle→fitting→fitted+manual 抢占门)**零变**(头注在档);本票
改量测口径。两坐标系:**根框 px**(getBoundingClientRect/事件 clientX,
含祖先 zoom)vs **svg 本地 px**(SVG 用户坐标系/transform 数学,不含)。

| 消费点(lineage-viewport.ts) | 现状(污染) | 修复(本地口径) | 手段 |
| --- | --- | --- | --- |
| fit effect 量测(L115-117) | `rect.width/height`(根框,zoom 虚大→k 虚大→**F-L2 溢出**) | `el.clientWidth/clientHeight` | 直接换源(Q1) |
| wheel 锚点(L129-137) | `mx=clientX-rect.left`(根框)→锚点偏 zoom 倍 | `mx×rootToLocalScale(el)` | 比值归一(Q3) |
| pan 增量(L161-167) | `dx=clientX 差`(根框)→拖拽手感快 zoom 倍 | `dx×rootToLocalScale(el)` | 比值归一(Q3) |

**归一单源(新导出纯 helper)**:
`rootToLocalScale(el: Element): number = el.clientWidth /
el.getBoundingClientRect().width`(gBCR.width≤0 时返回 1——不可量测防御)。
- 原理:clientWidth(本地)/gBCR.width(根框)=1/有效 zoom——任意嵌套
  zoom 自动复合(逐祖乘积的解析等价),零 CSS 类耦合(不查
  .app-content-row),SET1 改挂载点/加档不破。
- 已知噪声:clientWidth 整数舍入(规范)→比值误差 ≈0.03%(1447.5 实测
  0.05%)——锚点/增量/fit 语义不可感,声明接受。
- fit 不经 helper(clientWidth 直接就是本地宽);wheel/pan 经 helper。

## 1. 行为层

1. `lineage-viewport.ts` fit effect:量测改 `el.clientWidth/clientHeight`;
   可量测守卫同步(clientWidth≤0 跳过——jsdom 语义保持:跳过 fit 不退化)。
2. wheel 锚点:`const s = rootToLocalScale(el)`;`mx=(e.clientX-rect.left)*s`
   `my=(e.clientY-rect.top)*s`(rect 仍取 gBCR——clientX/rect.left 同根框
   自洽,差值再归一)。
3. pan 增量:onMove 内 `const s = rootToLocalScale(el)`;`tx+=dx*s; ty+=dy*s`。
4. helper 导出+头注:两坐标系声明(根框 vs svg 本地)/SET1 接缝(theme.css
   .app-content-row zoom)互指/INV-43 指针;fitViewport 纯函数**零改**
   (vw/vh 语义声明=本地口径)。
5. **明确不做**:html 级 zoom 专项支持(比值法天然覆盖任意嵌套);PDF 阅读
  器侧同型量测排查(另备案);wheel 锚点真机精确断言(数学由 helper 单测
  锁,真机 sanity 断言即可);zoom 档位间动画。

## 2. 接口层

- `export function rootToLocalScale(el: Element): number`(新,lineage-
  viewport.ts 内导出——单一消费域不拆文件)。
- useViewportController/fitViewport/Viewport 签名零变。

## 3. 架构层

- 分层零变;零新依赖;文件 186→约 210 行(<<500)。
- 裁决:helper 住 lineage-viewport.ts(消费域单一;拆文件=为不存在的
  第二消费方预设)。
- 裁决:比值法 vs 逐祖 getComputedStyle 乘积——比值法零 CSS 耦合+一次
  量测复合全部嵌套,选比值法;每事件两次量测读(gBCR+clientWidth)在
  干净布局下走缓存,pan/wheel 瞬态频率可受。

## 4. 生命周期层

- INV-43 登记(收口主控):「lineage 视口三消费点(fit 量测/wheel 锚/
  pan 增量)恒以 svg 本地坐标系计量——fit=clientWidth/Height 直取,
  wheel/pan=根框差值×rootToLocalScale(=clientWidth/gBCR.width)归一;
  SET1 UI 缩放(.app-content-row zoom)下根框量测不得直接入 transform
  数学」;声明处=lineage-viewport.ts 头注;锚定=新单测+真机三档探针。
- 100% 档回归语义:zoom=1 时 clientWidth 与 gBCR.width 仅整数舍入差
  (实测同值 1568)——小档行为零变(探针断言 k 与修前基线差 <0.1%)。

## 5. 文化层(测试与取证)

### 5.1 新测试 `tests/unit/renderer/lineage-viewport-scale.test.ts`(always-active)

jsdom 无布局——stub 手法:per-instance `Object.defineProperty(el,'clientWidth',
{get:()=>…})`+gBCR 走原型 stub(vi.spyOn(Element.prototype,
'getBoundingClientRect'))。用例:
- ① zoom 子树模拟:clientWidth=1158/gBCR.width=1447.5→rootToLocalScale
  ≈0.8(±0.001);
- ② zoom=1:1568/1568→1;
- ③ 不可量测:gBCR.width=0→1(防御位);
- ④ 嵌套复合语义:clientWidth/gBCR 比值本身即复合(0.64 档)→比值
  0.64(锁「不查 CSS 只看比值」的口径)。

### 5.2 变异红证(jsdom 可达性核毕——helper 纯 DOM stub 面)

- M1 helper 恒返 1→①④红;
- M2 比值倒置(gBCR/clientWidth)→①②④红;
- M3 fit 换回 gBCR 量测→单测不可达(effect jsdom 跳过)——**真机探针
  场景 large 档断言锁**(见 5.3;变异在真机的等价证明=修前基线溢出
  211.75px 在档,主控预裁:M3 型回归由探针 PASS 门拦截,不硬跑 jsdom 红)。
- 还原纪律:cp 备份→变异→测→cp 还原→diff 空;禁 git checkout。

### 5.3 真机取证 `scripts/audits/f-l2-fix-verify.mjs`(crib f-l2-precheck.mjs 同环)

三档(1/1.1/1.25)×每档:设 --ui-scale→点「适应视图」→dump svg gBCR/
clientWidth/transform/全部节点 rect→断言:
- **A 全节点入视口(修复主断言)**:每档 maxNodeRight≤svgRight+1 且
  maxNodeBottom≤svgBottom+1;
- **B 100% 恒等回归**:small 档 k/tx/ty 与修前基线(precheck JSON small
  tier transform)差 <0.1%;
- **C wheel sanity(large 档)**:svg 中心 wheel deltaY=-120→不抛错+k
  增且在 ZOOM 界内(精确锚点断言备案);
- **D pan sanity(large 档)**:panbg 拖 100px→tx 增量≈100×0.8±5(本地
  口径增量——修前会 ≈100)。
产物 f-l2-out/f-l2-fix-verify.json;PASS 打印+exit 码。

### 5.4 收口面

verify 全绿(114 文件 956 用例+新 4≈960);locks:generate+apply
(190→193:新测试+precheck.mjs 已在档+fix-verify.mjs);e2e 29 全跑;
INV-43+台账 F-L2 翻已闭环=主控。

## 6. 证据与报告契约(实现者)

首红全量口径落盘 f-l2-first-red.raw.txt;变异各 .raw.txt;verify 真退出码
落盘;探针 raw 落盘;报告 scripts/audits/f-l2-impl.report.md(摘要/清单/
红证/证据/自裁申报/疑虑);回复五行内。
