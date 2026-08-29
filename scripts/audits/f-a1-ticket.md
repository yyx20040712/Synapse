# F-A1 票面:标注矩形归并重构(渲染读时归并+划选保存归并)——五层规约

> 来源:AUDIT0 台账 F-A1 [B](用户复测 2026-08-30「多行划选碎裂不齐,上一行
> 与下一行选中示意的矩形重合并颜色变深,以及部分字符与前后字符之间矩形重合
> 颜色加深,以及一开始标注颜色正常(只给背景上颜色)但后面标注看不清(颜色
> 覆盖在文字表面的感觉)」)。同类缺陷二次触发(F-11 修对位后形态学缺陷仍在)
> ——重构红线生效,**禁再打百分数补丁**。
> 设计母本(态空间+不变量+算法骨架,票面引用不复述):
> `docs/design/2026-08-30_annotation-rect-redesign.md`。
> 取证基线:`scripts/audits/audit0-report.md` F-A1 + `audit0-out/audit0-p1b.json`
> (真实库副本,程序化跨 9-span 划选一条高亮→渲染 7 块=5 实块+2 零宽幽灵;
> 实块水平交叠 237px;下划线同位重复;y 差 0.5;负间隙 -1.5/-2/-5.5)。
> 中票三屋(ADR-0017)。LOOP 会话票——**不在 tickets/registry,禁触碰 registry**。

## 行为层

### 缺陷机制(为什么现有 mergeLineRects 挡不住)

现有链路:划选 Range→`getClientRects()`→`mergeLineRects`(像素域行级合并,
2026-08-23 Q3)→归一化→持久化→渲染逐块 absolute div(整层 multiply,z:5)。
multiply 层**任何两块相交即叠乘变深**。mergeLineRects 仍漏四类态(均有实锤):

- T3 零宽幽灵块(w:0 h:16.8)——它**不过滤零宽**;
- T2 同行多块水平交叠——聚类只与末簇比较+高度可比带 [0.5,2] 拒矮碎片,
  同行碎片被拆进不同簇(其头注在档自认「只与末簇比较」限制);
- T5 同位重复块(y 差恰 0.5=DEDUP_EPSILON 边界)——去重容差不够;
- T4 相邻行负间隙——它**不做行间钳制**。
且渲染读时对存量 rects **零处理**(INV-E 缺位)。

### mergeRects 算法(归一化域纯函数,确定性)

签名:`mergeRects(rects: AnnotationRect[]): AnnotationRect[]`

1. **滤零宽**(INV-C):`w <= W_MIN` 的块不入集合。`W_MIN = 1/612`(归一化
   域近似 1px@612pt 标准页宽;页宽 595~612pt 差异 ±3% 内忽略)。
2. **按 (中心y, x, y) 排序**:中心y = y + h/2;并列按 x 升序,再按 y 升序
   (全序,输入乱序不影响输出)。
3. **聚类成行**(INV-B 前置):遍历排序后块,与**全部既有行簇**比中心距,
   取最近且满足条件者入簇;条件:`|cNew − cRow| <= min(hNew, hRowMedian) / 2`
   (c=块中心 y;hRowMedian=行内成员 h 中位数,随入簇维护)。不满足任何
   既有簇→新簇。**比较扩到全部簇**=修 mergeLineRects 在档限制(同行碎片
   y 序插队失联=T2 机制根因之一);`min(h,…)/2` 容差=设计文档「容差=行高
   一半」的可比高度读法——高瘦矩形(旋转/竖排,h 超行高 2 倍+)自动免疫
   (ADR-0002 先例语义保持),紧行距相邻行(中心距≈行高)不误并。
4. **行内归并**(INV-B):`x = min(左缘)`,`w = max(右缘) − min(左缘)`
   (x 并集,交叠/重复自然并入);`h = 行内 h 中位数`;`中心y = 行内中心y
   中位数`,`y = 中心y − h/2`;`page = 行内成员 page 最小值`(防御——实际
   恒同页)。中位数取排序后下中位(偶数个取下侧,确定性)。
5. **行间钳制**(INV-D/INV-A):行按 y 升序;`row[i].y = max(row[i].y,
   row[i-1].y + row[i-1].h)`(下行顶不低于上行底;正间隙不动,负间隙
   推至恰好接触)。
6. **输出按 (y, x) 稳定排序**。

INV-A 构造性证明(测试兜底):行内恰一块(自明);行间钳制后
`top_{i+1} >= bottom_i` → 垂直分离 → 任意两块相交面积恒 0。

**恒等性要求**(既有受锁面不破的根基):单块输入原样返回(deep equal);
已满足 INV-A~D 的输入(如 mergeLineRects 单行产物、或 mergeRects 自身
输出)→ 幂等,值不变(单成员行:x/y/w/h/page 均取自身)。

### 两个消费点(单源双挂)

- **挂 A(保存+重锚同点)**:`annotation-anchor.ts` 的 `rectsBetweenPoints`
  在归一化后应用 `mergeRects`(返回 `mergeRects(pixels.map(…))`)。
  覆盖:划选保存(selectionToAnchor)+重开重锚(findRangeAtOffset)+
  rectsFromRange 手工路径。zeroRect() 兜底块(w:0)随之被滤——该路径
  返回空数组,调用方既有 `rects.length > 0` 判空语义兜住;zeroRect 若成
  死代码即删(自裁申报)。
- **挂 B(渲染读时,INV-E)**:`AnnotationLayer.tsx` 渲染处
  `(resolved[a.id] ?? a.rects).map(…)` → `mergeRects(resolved[a.id] ??
  a.rects).map(…)`。resolved 产物已过挂 A(幂等无害),存量 a.rects
  (含缺陷态脏数据)读时归并——**库数据零迁移,存量渐净**。
- AiAnnotationLayer 零改:其 rects 全部产自 findRangeAtOffset(挂 A 自动
  同口径),且无存量 rects 回退面(头注在案)。

### 既有行为不变面(禁破)

- e2e reader-text「单行划选恰 1 矩形」+保存/重开对位 ≤2px 断言:单行输入
  归并器恒等→不红;
- selectionToAnchor 的 quote/prefix/suffix/start/end 语义零改(几何外字段);
- rectStyle(F-11 收边 10%/12%)渲染侧零改;
- 跨页拒绝/toast/工具条/undo/Escape 链零改。

## 接口层

- 新文件 `src/renderer/features/reader/annotation-merge.ts`:
  `export function mergeRects(rects: AnnotationRect[]): AnnotationRect[]`
  (纯函数,零 DOM/React 依赖;头注写明 INV-A~E 与本票编号)。**不放
  annotation-anchor.ts**(该文件 475 行近 500 红线,只加 import+一调用)。
- `annotation-anchor.ts`:import mergeRects;rectsBetweenPoints 尾部改挂 A;
  头注「行级合并」段补一句读时归并口径。
- `AnnotationLayer.tsx`:import mergeRects;渲染处改挂 B(头注补 INV-E 句)。
- 零新依赖;零 shared/ipc 触碰;零 CSS 触碰。

## 架构层

- 分层单向不动(纯 renderer 特性内);mergeRects 是 annotation-anchor 旁的
  新纯函数模块(设计文档 §3「单源」);
- annotation-anchor 仍是唯一 DOM 遍历点(annotation-merge 零 DOM);
- 文件行数:三文件均远低于 500/250 红线,实现后自查。

## 生命周期层

- 性能:单页标注数×块数个位数级,纯函数 O(n log n)(排序+单层聚类,
  n≤~30 实测),渲染帧内无感;MutationObserver+rAF 管线不动;
- jsdom 无布局(单 rect 路径)→ 恒等性是单测主锚,真实多块管线由 e2e 锁;
- INV-40 登记(docs/invariants.md,主控收口时同步——实现者在报告「疑虑」
  段确认登记文案即可,不自行改 invariants.md)。

## 文化层(测试=TDD 红→绿→变异红证;新测试 always-active 不经 guardedDescribe)

- 新 `tests/unit/renderer/annotation-merge.test.ts`(受锁,[locked-change]):
  ①T3 零宽滤除(w:0 与 w:0.0005 消失,正常块保留);
  ②T2 同行两块水平交叠→1 块 x 并集;
  ③T5 同位重复(y 差 0.5/同 x 同宽)→并入 1 块;
  ④T4 相邻行负间隙(-2px 级)→钳制后 bottom_i ≤ top_{i+1}+1e-9,任意两块
    相交面积 0;
  ⑤INV-A 混合族:6 块乱序(含幽灵+交叠+重复)→ 输出两两相交面积全 0 且
    全部 w>W_MIN;
  ⑥单块恒等(deep equal)+空数组透传;
  ⑦幂等:mergeRects∘mergeRects == mergeRects(混合族上);
  ⑧高瘦矩形(h=行高 6 倍)不并入行簇(独立输出);紧行距相邻行(中心距
    ≈行高)不误并(两块);
  ⑨排序确定性:乱序输入→(y,x) 序;
  ⑩混排字号同行(矮块 h=8 vs 行 h=12)并簇且 h 取中位数。
- 新 `tests/unit/renderer/annotation-layer.test.tsx`(受锁,[locked-change];
  组件挂载面,锁**挂 B/INV-E**):传 pageRoot=null(跳过重锚 effect)+
  annotations 含存量缺陷态 rects(T2 交叠+T3 零宽+T4 负间隙手工夹具)→
  断言渲染 annotation-rect 计数=归并后期望(零宽 0+每行 1 块+行数块)+
  任两元素 top/height 计算值垂直分离。annotationMenu/editor 交互面**不测**
  (本票只锁归并消费;React act 环境对齐 selection-layer.test.tsx 既有形态)。
- 扩 `tests/e2e/reader-text.spec.ts`(受锁,[locked-change]):多行划选用例
  ——程序化跨 ≥3 行选区→高亮→断言:零宽块 0(全宽 ≥1px)+行块两两垂直
  不相交(相邻块 bottom ≤ top+0.5px 容差);若合成 PDF fixture 单行-only
  则先扩 fixture 工厂多行文本(受锁,先取证行数再断言块数=行数,禁拍脑袋)。
- 变异红证方向(各落盘 .raw.txt,文件备份法还原,禁 git checkout):
  M1 摘挂 B(AnnotationLayer 去 mergeRects)→annotation-layer.test 红;
  M2 摘挂 A(rectsBetweenPoints 去 mergeRects)→e2e 多行用例红(红点须
  落盘全量套跑口径或申报定向理由);
  M3 W_MIN 改 0→①红;M4 钳制摘除→④红;M5 聚类容差改常数(去 min(h)/2
  高瘦免疫)→⑧红。
- **受锁面清单**:tests/e2e/reader-text.spec.ts + 两个新测试文件(收口
  locks:generate+apply 由主控做;实现者禁跑 locks 命令,只管测试本身)。

## 基线数字(自检参照)

verify=108 文件 911 用例全绿 / locks 175 / e2e 28。**本机 node 默认 v25 必
11 红(webstorage 污染,在档环境怪癖)——一切 node/npm 命令前缀
`export PATH="/d/nodejs24:$PATH"`**。

## 主控已预裁项(门一可攻击,推翻需更强依据)

1. 归一化域单遍归并器(非像素域改造 mergeLineRects):mergeLineRects 及其
   受锁单测(高瘦/断段/紧行距判别)原样保留;W_MIN 归一化近似(612pt 基准)
   是页宽差异 ±3% 内的工程取舍;
2. 行内 x 并集**不保留栏间断段**(INV-B「每行至多一块」直接推论):跨栏划选
   行内连续着色——设计文档 §3 明文,多栏桥接风险由「用户确有跨栏划选才有
   此态」消化;mergeLineRects 的像素域断段在保存路径仍先行(栏间断开的块
   入库,读时归并并回)——两层口径并存,INV-B 为最终裁决;
3. 聚类容差 `min(hNew, hRowMedian)/2`(设计文档「行高一半」的可比高度读法)
   +比较全部簇(修在档失联限制);
4. 行 y/h 取中位数(设计文档明文),非主导矩形;
5. selection-layer.test **不扩**(偏离设计文档 §6):jsdom 无布局,组件面
   造不出多块输入,扩断言=恒真风险;保存路径 INV-A 由 e2e 多行用例锁;
6. zeroRect 兜底块被滤为空数组返回(调用方判空语义既有)。
