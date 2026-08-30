# F-L1-C 实现者报告——脉络边标签换行落地（变体 C）+防重叠放置+悬停滚动

> 三屋模式实现者子代理（ADR-0017）· 2026-08-30 · 票面：`scripts/audits/f-l1c-ticket.md`
> 状态：**完成交付门审**。全量 test **935=924+11** 精确全绿；verify EXIT=1 唯一红段
> =locks（受锁面变更——归主控收口 locks:generate+apply+[locked-change]，票面预裁）。

## 一、实现摘要

三合一按票面落地：

1. **标签渲染（变体 C）**：LineageEdges 边 label 从 SVG `<text>` 换装
   `foreignObject` 恒 130×37.05（`EDGE_LABEL_MAX_W/H` 单源）内 HTML div
   `lineage-edge-label`（9.5px 斜体 #6b7280+白晕 text-shadow 四向 2px；
   break-word 自然换行+max-height 37.05px+overflow hidden——真实溢出承载
   滚动语义）；title 全文 tooltip（U2a 同款）；空串不渲染（既有语义）；
   FO pointerEvents none / div auto。`data-edge-label` 钩子保持（受锁断言
   形态无关，零红实证）。
2. **防重叠放置器（用户保证①）**：新纯函数模块 `edge-label-layout.ts`——
   `estimateLabelWidth`（码点 >0x2E80 全宽 9.5/其余 4.75+padding 合计 4+
   钳 130+空串 0）与 `placeEdgeLabels`（输入序贪心：碰撞盒 est+gap4/
   37.05+gap4，节点盒外扩 6，偏移序 dy 0,±lh..±5lh（lh=12.35）×dx 三档，
   全占位回 anchor best effort）。Canvas useMemo 算 slots（锚=贝塞尔中点，
   与 Edges 回退公式同式——重复第 2 次保持 Rule of Three，两处头注互指）
   传 LineageEdges（缺省回退锚点向后兼容）；**fitViewport 扩第 5 参
   labelBoxes**（缺省 [] 零破）参与包围盒——被推出的标签不可消失在 fit
   视野外（保证①另一半）。
3. **悬停滚动（用户保证②）**：`.lineage-edge-label:hover { overflow-y:
   auto }`（CSS 类承载交互态，B1 教训）；wheel 阻断仅当
   `scrollHeight > clientHeight + 1`（主控预裁 4——未截断不吞 zoom）；
   pointerdown 不拦截（pan 起手面小损 130×37 在档）。

## 二、文件清单（git diff --stat 自查 ✓ 范围零蔓延）

| 文件 | 变更 | 行数 |
| --- | --- | --- |
| `src/renderer/features/lineage/edge-label-layout.ts` | 新增（放置器纯函数） | 93 |
| `src/renderer/features/lineage/LineageEdges.tsx` | 改（FO+div 换装+slots prop+wheel 委托） | 113 |
| `src/renderer/features/lineage/LineageCanvas.tsx` | 改（slots/labelBoxes useMemo+传参） | 232 |
| `src/renderer/features/lineage/lineage-viewport.ts` | 改（fitViewport 第 5 参+hook 接线） | 186 |
| `src/renderer/shared/theme.css` | 增（`.lineage-edge-label`+`:hover`，脉络域段尾） | 620 |
| `tests/unit/renderer/lineage-canvas.test.tsx` | **仅增不改**（+72/-0 实证；⑦⑧⑨⑩） | 529（计费<500，lint 绿） |
| `tests/unit/renderer/edge-label-layout.test.ts` | 新增（①-⑥+fit 数值锁） | 110 |

工作树残留非本工单（未触碰）：`docs/audits/audit0-findings.md`（前序改）、
`scripts/audits/f-l1c-forensics.mjs`/`f1-out/*`/`f-l1c-ticket.md`（主控前序产物）。

## 三、首红与变异红证（均 .raw.txt 落盘，退出码附文件尾）

| 证据 | 红点 | 结果 |
| --- | --- | --- |
| `f-l1c-first-red.raw.txt` | 模块缺失（套件级） | 110 文件绿+1 红，**924 既有用例零破**，EXIT=1 |
| `f-l1c-second-red.raw.txt` | ⑦⑧⑨⑩ 全红（实现未落） | 19 旧绿+4 红 |
| `f-l1c-m1-red.raw.txt` | 摘放置器→⑧红（lineage-canvas.test.tsx:430-440） | 1 failed/22 passed |
| `f-l1c-m2-red.raw.txt` | 去 stopPropagation→⑨红（:442-463） | 1 failed/22 passed |
| `f-l1c-m3-red.raw.txt` | 摘 :hover 段→⑩红（:465-475） | 1 failed/22 passed |
| `f-l1c-m4-red.raw.txt` | 去钳制→①红（edge-label-layout.test.ts:40-46） | 1 failed/6 passed |
| `f-l1c-m5-red.raw.txt` | 忽略 labelBoxes→fit 数值红（:96-110） | 1 failed/6 passed |

五变异均文件备份法（cp→变异→测→cp 还原→**diff 确认空**），未用 git checkout。

## 四、测试证据

- 全量：`f-l1c-final-test.raw.txt`——**111 文件/935 用例（924+11）全绿，EXIT=0**
- verify：`f-l1c-verify.raw.txt`——EXIT=1，**唯一红段=locks:check**（三处全预期：
  ①`tests/unit/renderer/edge-label-layout.test.ts` 新增未登记 ②`lineage-canvas.test.tsx`
  受锁变更 ③`scripts/audits/f-l1c-forensics.mjs` 主控前序产物未登记——均归主控
  收口 locks:generate+apply+[locked-change]）；quality+tickets 段已过
- verify 链 locks 后各段单独补证：lint EXIT=0 / typecheck EXIT=0 / build EXIT=0
  （build 输出 `out/renderer/` 产物正常）
- e2e 按票面归主控收口跑（e2e 断言面已核：仅锚 `svg path[data-edge-id]`，
  path 零改，label 换 div 无 e2e 冲突）
- grep 无 TODO/FIXME/placeholder；中文 UTF-8 全程工具输出可读

## 五、自裁申报（超票面决定，逐条）

1. **wheel 阻断机制：React onWheel→g 根原生 wheel 委托**。票面行为层字面
   「div `onWheel`: …e.stopPropagation()」不可达：React 18 合成 wheel 委托在
   root 容器（bubble），而 zoom listener 原生挂 svg（标签 div 的祖先，冒泡
   **先**于 root 到达）——合成 handler 执行时 zoom 已发生，stopPropagation
   无效。改为 LineageEdges 单 g 根挂**原生** wheel listener（bubble 链上先于
   svg，时序成立）+closest('.lineage-edge-label') 委托判定，行为语义与票面
   逐字一致（仅截断阻断/未截断放行/INV-14 成对清理 useEffect 同款）。M2
   变异红证+⑨双向锚（阻断/放行）锁行为。
2. **useViewportController 扩 args.labelBoxes（可选，缺省模块级常量
   EMPTY_LABEL_BOXES）**。票面接口层未列 hook 扩参，但 fitViewport 仅在
   hook effect 内调用，「Canvas 调用处传 slots 盒」的唯一落地路径。
   缺省用模块常量非内联 `?? []`：**实证**首版内联写法因 effect 依赖每渲染
   新引用引发 setViewport 无限循环（测试挂死+worker 内存暴涨 4GB——修复
   后绿；开发期发现并消除，未流入交付）。
3. **⑨ jsdom 截断态用 Object.defineProperty 定 scrollHeight**（jsdom 无布局
   恒 0）——票面生命周期层已预见 jsdom 不可交互，此为「wheel 阻断逻辑」
   断言的最低成本环境形态。
4. **受锁文件只读位处理**：未跑任何 locks 命令；对 lineage-canvas.test.tsx
   单文件 `chmod u+w`→改→`chmod u-w` 复位（只读位现场还原；内容 sha 变更
   留待主控收口）。
5. **fit 数值用例（M5 面）放 edge-label-layout.test.ts**：票面受锁面=两新
   文件，未新建第三个（lineage-viewport.test.ts）——「放置器→fit 接线」
   行为锁语义归放置器测试文件，头注声明。
6. **estimateLabelWidth padding 口径=左右合计 4**（CSS `padding: 2px` 对应），
   头注声明。
7. **LineageEdges 输出结构 fragment→单 g 根包裹**（委托 listener 宿主）：
   边 path 层级 +1，`data-edge-id`/`data-edge-label` 钩子与 e2e 后代选择器
   零影响（e2e 断言面已核）。
8. **⑧⑨ 夹具用 y 覆盖（A y=0/B y=400）+反向 ref 边（B→A）构造同锚双标
   签**：普通层距 140 下节点盒外扩后标签候选区全占位（必回 anchor），
   无法验「错开」——y 覆盖拉大间隙为票面夹具设计自由面，无行为改。

## 六、疑虑与移交

- **INV-41 登记文案建议（主控收口）**：「脉络边 label 恒 foreignObject
  130×37.05（EDGE_LABEL_MAX_W/H 单源）+`.lineage-edge-label` 类（变体 C）；
  槽位恒经 placeEdgeLabels 防重叠放置（锚=贝塞尔中点，与 LineageEdges
  回退公式同式——两处头注互指单源）；槽位盒恒参与 auto-fit 包围盒
  （fitViewport 第 5 参 labelBoxes）」。强制方式：lineage-canvas.test.tsx
  ⑦⑧+edge-label-layout.test.ts fit 用例；锚定状态：Canvas slots/labelBoxes
  useMemo+渲染层。
- **真机取证移交（票面⑤b）**：jsdom 无法验真实滚动视觉/白晕截线效果——
  主控真机确认悬停滚动+变体 C 观感。
- **收口清单**：locks:generate+apply（含 f-l1c-forensics.mjs 归置裁决）→
  e2e 29 跑 → registry 翻状态（LOOP 票按台账规则）→ [locked-change] 提交。
- 成本账：单实现者会话，无独立 token 计量工具，主控账本补记；开发中一次
  测试环境挂死排查（上述无限循环，根因修复非绕过）约 15 分钟。

## 八、回炉 1（2026-08-30，真机取证驱动 R1[B]/R2[W]）

### R1[B] 放置器搜索包络扩容（真库 f-l1c-verify.json FAIL：标签互叠+压节点）

- **根因确认**：nodeHeight 100 档半高 50+外扩 6+标签半高 18.5+gap → 锚在
  节点中心需 |dy|≥~85 或 dx≥~163，原阶梯 dy ±5lh=61.75/dx 单档 ±83 双双
  不足 → 全档撞回 anchor（best-effort 回退成为常态路径）。
- **修法**（确定性保持）：dy 阶梯 ±5lh→**±10lh**（20 档，±123.5）；dx 阶梯
  加第三档 **±(w/2+16)×2**（满宽标签 ±166）。实现头注注明包络值与实测
  依据（f-l1c-verify.json 回炉实证）。
- **测试同步**（回炉指令票面）：②断言域 ±5lh→±10lh；**②b/③b 新场景**
  「锚在 100 高节点盒中心」（真库 FAIL 场景复刻）断言移出+碰撞盒分离
  （③b 不锁具体档位——dy=0 档 dx 第二档先分离，偏移序票面原序保持）；
  **⑤夹具重设计**＝环绕大盒 hw 250/hh 155（外扩 256×161 铺满新包络
  x±233/y±144）——原 hw 300/hh 150 夹具在扩容后仍全占（偏保守但非设计
  口径），按指令换铺满口径。**⑧行为断言随扩容同步**：同锚双标签首自由位
  从「+4lh 竖移」变「dy=0 档 dx 第二档 −166」（dxs 序负档先于正档）——
  原断言恰 4lh 必红，改锁 −166+同 y（M1 复跑仍红证放置器变异面有效）。

### R2[W] wheel 改主动滚动（防御性——Chromium foreignObject 滚轮路由未证实）

- **修法**：截断标签命中时 handler 主动
  `scrollTop = max(0, min(scrollTop+deltaY, scrollHeight-clientHeight))` +
  `e.preventDefault()`（禁默认行为语义强于纯阻断）+**保留 stopPropagation**
  （preventDefault 不禁 listener——svg 上原生 zoom listener 在祖先链冒泡
  先行，唯有 stopPropagation 阻断之；两者并用=zoom/页面滚全禁+主动滚动）。
  未截断路径零改。
- **⑨测试加强**：defineProperty 双桩（scrollHeight 999/clientHeight 30），
  断言 wheel 后 scrollTop 恰=deltaY（240→340 累计）+transform 不变（阻断）
  +未截断标签 zoom 正常且 scrollTop 不动（反向锚）。

### 变异红证（文件备份法，还原 diff 全空）

| 证据 | 变异 | 红点 | 结果 |
| --- | --- | --- | --- |
| `f-l1c-rework1-m1-red.raw.txt` | 摘放置器（复跑——R1 变异面） | ⑧ | 1 failed/22 passed |
| `f-l1c-rework1-m2-red.raw.txt` | 去 stopPropagation（复跑——R2 变异面） | ⑨ | 1 failed/22 passed |
| `f-l1c-rework1-r2-red.raw.txt` | **新增**：摘主动滚动 scrollTop | ⑨（scrollTop 断言） | 1 failed/22 passed |

### 测试与验证（回炉 1 后）

- 全量：`f-l1c-rework1-final-test.raw.txt`——**111 文件/937 用例
  （924+13：原 11+②b/③b）全绿，EXIT=0**
- typecheck EXIT=0；**lint：我的六文件面 EXIT=0 零错；全库 lint 红 5 处
  全部来自主控探针 `scripts/audits/f-l1c-scroll-probe.mjs`（未使用变量，
  非本工单产物，未触碰——主控自处或随收口清置）**
- verify：`f-l1c-rework1-verify.raw.txt`——EXIT=1，quality/tickets 过，
  locks 段断（同首交付预期红，归主控收口）
- 受锁文件只读位已复位（chmod u-w）

### 回炉 1 自裁申报

1. **⑧断言随 R1 行为变更同步**（回炉指令未点名⑧，但 dx 第二档使同锚双
   标签首自由位从竖移变横移——原「恰 4lh」断言与扩容互斥，属「测试同步」
   延伸面；M1 复跑红证断言仍锁放置器行为）。
2. **R2 保留 stopPropagation**（回执「preventDefault 替代纯
   stopPropagation」字面执行会重开 zoom 漏洞——preventDefault 不禁
   listener；以行为语义「无任何默认行为+zoom 全禁」为准两者并用，⑨
   transform 断言锁）。
3. ③b 不锁具体档位（dy/dx 谁先分离依赖偏移序实现细节，锁「移出+分离」
   行为本质）。

## 九、主控真机复跑与证据勘误(2026-08-30,回炉 1 验收)

- **f-l1c-forensics.mjs 复跑(rework 版源码+净产物):PASS**——①防重叠
  5 标签/4 节点图(注入正反双 edge+穿越边制造碰撞源)labelOverlaps=0/
  nodeOverlaps=0;②悬停滚动:截断标签(53>37)wheel 后 scrollTop=16
  (恰为隐藏量)且 viewport transform 不变。
- **证据勘误(如实入档)**:回炉 1 下发证据中「2 处标签压节点(area
  3640.2/121.6)」系主控取证器 overlap() 坐标系 bug(按中心锚计算而
  rect 为左上角语义=假阳性;布局坐标槽位探针 hits=[] 与手算 oy=-22.8
  双重佐证)。「1 对标签互叠」为真缺陷(hit 探针实证视觉堆叠),R1 包络
  扩容正当——label-label 场景 ±5lh 确实不够;③b(锚在 100 高节点中心)
  新用例仍有效防回归。取证器已修正(左上角语义)入档。
- 诊断实验记录:包络撑至 ±40 档/dx×4 时重叠依旧=判别「slots 未达」的
  证据链一环(后定位为测量 bug,实验产物已还原,diff 空)。
