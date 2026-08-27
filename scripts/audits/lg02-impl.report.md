# SR2-LG-02 实现者报告 —— lineage 布局纯函数+只读画布+脉络第四视图

日期：2026-08-27 ｜ 实现者子代理（strong，三屋模式）｜ 工单状态：open（registry 翻状态归主控收口）

## 摘要

- 布局纯函数落地：lineage-layout.ts（STUB→真实实现，242 行 ≤500）——y=年份层带
  （升序+null 末位，层距 LAYER_GAP=140）；x=**Reingold-Tilford tidy tree 零依赖手写**
  （后序 place：子树逐深度轮廓合并 mergedL/mergedR+兄弟间距 SIBLING_GAP=40；前序
  assign：boxOrigin 累积绝对化；父居中于子块中点）——rescope §4 母本两趟扫描字面；
  **d3 零引用**（零新依赖红线，package.json 未动）。
- 森林语义：多根=nodes 输入序并排（TREE_GAP=80），孤立节点=单节点树；INV-27 破坏
  防御（悬空/自环/多父保首条/成环断边）剔除非崩溃不丢节点，一次汇总 console.warn。
- 覆盖优先（JSON Canvas）：x/y 非 null 用覆盖值；x 覆盖节点与父断链、其**子树提升为
  森林成员照常布局**；覆盖节点仍计入层带（归属按 year 不变）。
- 只读画布 LineageCanvas.tsx（183 行 ≤250）：SVG 渲染（层带线+年份标签/卡片=
  rect+标题+年份/父子贝塞尔/主题节点虚线框 data-kind=theme 区分）；pan=空白
  data-panbg 拖拽（节点上不触发——编辑面归 03）；zoom=滚轮鼠标锚点缩放钳制
  [0.25,4]；**INV-14**：wheel/pointerdown 挂 svg+pointermove/up 挂 window，卸载
  同 type 同函数引用成对移除（组件测试配对断言）。
- lineage.store.ts（57 行）：lineage/graph 单点取数 loading/ready/error 三态+数据
  缓存（卸载驻留）+stale-guard 请求序号（notes.store 同型）；**03/04 禁双取接缝
  双向锚定**（store 头注+LineagePage 头注）。
- LineagePage.tsx（59 行）+App.tsx 挂载：NAV 第四项「脉络」（票面字面位次=第四）
  +ViewId 扩 'lineage'+渲染分支；空图空态文案「暂无脉络图——导入草稿或添加节点」
  （无死按钮——导入/添加入口归 03）。

## 文件清单

实现面（非受锁）：
- src/renderer/features/lineage/lineage-layout.ts（STUB→实现 242 行；票面头注五层
  规约原文保留+实现注追加；LINEAGE_LAYOUT_STUB 导出已删）
- src/renderer/features/lineage/LineageCanvas.tsx（新增，183 行）
- src/renderer/features/lineage/LineagePage.tsx（新增，59 行）
- src/renderer/features/lineage/lineage.store.ts（新增，57 行）
- src/renderer/app/App.tsx（挂载三行族+头注「三入口」→「四入口」，+9-6-）

受锁面（unlock→批内改→generate→apply 全程留痕，125→127）：
- tests/unit/renderer/lineage-layout.test.ts（新增 [locked-change]，17 用例
  （初轮 15+回炉 2）always-active 不经 guardedDescribe——ADR-0017 裁决 3）
- tests/unit/renderer/lineage-canvas.test.tsx（新增 [locked-change]，14 用例
  （初轮 13+回炉 1）always-active）
- locks/manifest.json（127 条）

## 红证四档（TDD）

1. 红：两测试文件先行（28 用例全量断言），实现缺失→构造级红（layoutLineage is
   not a function+组件/store 模块 Failed to load url），npm exit=1
   （15 failed/542 passed，基线无回归），scripts/audits/lg02-red.log。
2. 绿：npm run test 82 文件 570 用例全过（基线 80/542 → +2 文件+28 用例），
   exit=0，scripts/audits/lg02-green.log。中途两实现缺陷被测试拦出后收敛：
   ①稀疏数组洞（mergedL[0] 永不赋值，Math.min(...mergedL) 得 NaN）——filter
   收窄修复；②x 覆盖根 continue 跳过子树布局（半覆盖用例 C.x=0 红）——roots
   推断重写（覆盖节点断链+子提升）；另修测试自身三处（describe 漏 import/
   工厂 paperId ?? 吞 null/bind(prototype) 固定 this 被 jsdom 拒）。
3. 断言级变异红证（cp 备份法，禁 git checkout；npm 真退出码；三轮还原 diff 均
   空输出 RESTORE-DIFF-EMPTY，scripts/audits/lg02-mutation.log；变异对象=非受锁的
   lineage-layout.ts/LineageCanvas.tsx）：
   - M1 轮廓兄弟间距禁用（prevR+SIBLING_GAP→prevR+0）→「兄弟不重叠」+「轮廓
     合并」两用例红（2 failed/568 passed，exit=1）；还原 diff 空。
   - M2 null 年份末位破坏（排序 return 1→return -1，null 首位）→「层带按 year
     升序、null 末位」用例红（1 failed/569，exit=1）；还原 diff 空。
   - M3 zoom 上界钳制破坏（ZOOM_MAX 4→999）→「zoom 钳制」用例红（1 failed/569，
     exit=1）；还原 diff 空。
4. verify 终局：scripts/audits/lg02-verify.log，exit=0（quality 无占位/无乱码/
   无跨域引用+tickets 一致+locks 127 一致+lint+typecheck+test 82/570+build）。
   中途一次 exit=1：lint 拦测试未用变量+typecheck noUncheckedIndexedAccess
   拦数组索引收窄（vitest 不查类型，tsc 关卡拦住——宪法「受锁测试改动后必须全量
   verify」同族实证）；unlock→修→apply 后全绿。

## 测试证据（31 用例=初轮 28+回炉 3）

- lineage-layout.test.ts（17，纯函数 node 环境）：单链 x 对齐+y 单调/兄弟中心距
  ≥NODE_W+SIBLING_GAP+父居中子块中点/跨子树孙层轮廓间距（防「仅看根行」退化
  实现）/树序稳定性（边输入序非 id 字典序）/**W1 回归叔侄同年不重叠（门一复现
  参数）+W1 延伸父子同年同层分离**/层带升序+null 末位+层距常量/同年同层
  y/空图空结果/森林三成员并排不重叠（树间隙常量）/覆盖优先（精确值+层带仍含
  覆盖节点+半覆盖组合+覆盖根子树自成根）/纯函数性质（两次调用 Map+layers 深相等）
  /INV-27 防御四型（多父保首条/成环断边全节点有位/自环悬空剔除+计数 warn/合法
  零 warn）。
- lineage-canvas.test.tsx（14，jsdom+createRoot/act/flush——ai-notes-section 先例）：
  节点真实文本（三标题+年份）/主题节点 data-kind 区分/空图空态文案+零按钮
  /**W2 回归空→非空转场 pan/zoom 可用**/覆盖
  节点 transform 精确值/zoom 放大+双向钳制 [0.25,4]（30/60 次 dispatch 滚轮）/
  pan 空白拖拽 translate(80,40)+节点上按下不 pan/INV-14 卸载后 add/removeEventListener
  同 type 同函数引用全配对（svg 原型+window 双 spy wrap——React 卸载后 setState 无
  渲染，行为级断言不可达，配对断言为机检级证据）/Page loading 文案+graph({}) 单次
  调用/ready 渲染真实文本经 store/ready 空图空态/error 条+重试恢复（两次调用）/
  store 数据缓存（卸载后 nodes/status 驻留——03/04 免二次取数锚点）。

## locks 实录

新测试两件落 tests/** 受锁 glob：unlock（127 解锁）→批内改（lint/typecheck 修复）
→generate（127 条，+2 新受锁路径）→apply（127 只读）→locks:check 一致 exit=0。
manifest 变更随本单提交，提交信息须带 [locked-change] 尾注。

## 自裁申报

1. **LayoutResult 形状**（主控裁决 1 建议采纳+票面「形状实现定」）：{ positions:
   Map<id,{x,y}>（**卡片中心语义**——组件按中心减半宽高绘制，覆盖节点 transform
   可直读）, layers: Array<{year:number|null, y:number}> }——票面 layerYears
   疑问句以「year|null 序列化+带 y」收口。
2. **几何常量面**：NODE_W=180/NODE_H=64/LAYER_GAP=140/SIBLING_GAP=40/TREE_GAP=80
   导出（测试+组件消费）；ZOOM_MIN/MAX=0.25/4 驻 Canvas（视口面归组件）。
3. **x 覆盖断链子树提升**（票面「不参与布局」的精确化）：覆盖节点若直接跳过，
   其子树永远得不到布局——提升其子为顶层森林成员照常 place/assign；断链不丢节点。
4. **RT 轮廓按树深度而非年份层**：同树深度隔离≠同年层隔离——子年份不晚于父的
   退化数据下同年异深节点可能视觉重叠（正常学术谱系子晚于父不触发）；票面仅声明
   覆盖节点不做碰撞避让，年份错乱面 v1 不处理（疑虑段备案）。
5. **防御剔除语义**：多父保首条边（边输入序）；成环=「to 在 from 祖先链」的末条
   边剔除（先建的链保留）；全部剔除计数一次汇总 console.warn（票面「剔除计数
   console.warn 供调试，不 toast 不静默吞」字面）。
6. **NAV 位次**：主控裁决 5「NAV 第四项」按字面放第四位（settings 之后）；未按
   UX 惯例发明「工作面在设置前」位次——若门审另裁，一行移位无行为面。
7. **组件测试文件名 lineage-canvas.test.tsx 涵盖 Page 三态用例**：票面测试清单名
   义「LineageCanvas 组件测试」，Page 宿主是本单组件交付面（三态呈现惯例
   LibraryPage 同型），并入同文件；e2e 归 LG-05 不在本单。
8. **中途修正实录**（红→绿间全部收敛，无绕过断言）：实现两缺陷（上述②①）+
   测试三缺陷（import 漏 describe/工厂 ?? 吞显式 null/spy bind 固定 this）+
   lint 未用变量+typecheck 索引收窄（non-null 断言，循环边界已保证索引存在，
   运行时语义不变）。
9. **删减面 diff 自查**：git diff --stat=3 文件 192+/6-（manifest/App.tsx/
   lineage-layout.ts），未跟踪新增 5 路径（Canvas/Page/store/两测试）——全部在
   票面交付面+locks 面；dist_new/ 为 2026-08-23 前历史残留（本会话未触碰，LG-01
   报告同声明）；无范围蔓延。
10. **工单号引用纪律**：新文件头注一律「LG-02」短式（check-tickets 规则 2）；
    SR2-LG-02 全号仅票面文件 lineage-layout.ts 头注原文保留（票面文件自身合法）；
    新代码/测试注释零其他 open 工单全号。

## 疑虑

- **父居中与覆盖父的连线斜跨**：x 覆盖父不进 place，其子树自成独立森林成员自居
  中——父子连线可能斜跨非相邻区域（覆盖优先语义的直接后果，票面已声明覆盖可
  重叠；如需「覆盖父参与子树宽度」为 v2 调整项）。
- **层带横线硬编码范围**（x1=-200, x2=99999 布局原点系）：个人库规模（数百节点）
  足够；极大平移或超大森林右端层带线可能不够长——纯装饰元素不影响节点/边正确性，
  参数化归票面生命周期层预留。
- **zoom 锚点公式的 jsdom 验证边界**：jsdom getBoundingClientRect 恒 0，测试只能
  断言 scale 值与钳制，鼠标锚点（缩放前后内容点不动）公式正确性靠实现审读+真
  实浏览器 e2e（LG-05 面补）。
- **store 每次挂载即 load**：切回视图重新拉图（刷新语义，03 编辑后保存可见）；
  「数据缓存」按票面指 store 驻留（03/04 消费面免二次取数），非跨挂载跳过取数
  ——若门一主张「ready 后挂载不重拉」，为 load 条件一行改动。
- ~~同年异深视觉重叠~~（回炉 1 轮 W1 已修——轮廓帧改年份层索引，见下节；原文
  备案保留供追溯：初轮 RT 轮廓按树深度隔离，叔侄同年异深 x 重叠，门一实证严格
  单调年份下仍触发约 70px）。

## 回炉 1 轮处置记录（主控裁决 W1/W2+顺修 N1/N2，2026-08-27）

- **W1（同年异深 x 重叠）**：
  - 复现参数（引用 lg02-gate1.md W1 条目原文）：P(2020)→A(2021)→{A1(2022),
    A2(2023)}，P(2020)→B(2023)——年份严格单调，A2.x=310、B.x=420、同年同层带
    （y=420）、卡片 x 重叠约 70px；机理=轮廓按树深度索引只保证同深度分离，而
    y=年份层带打破「深度=行」不变量，叔侄同年（异深同年带）无约束。
  - 修复面：lineage-layout.ts place() 轮廓帧 Frame 从「深度索引数组 left/right[]
    」改为「**年份层序索引 Map<layer,{lo,hi}> spans**」——兄弟约束=max over 所有
    共享年份层（前树该层右缘+间隙），不共享层子树可交错保紧凑；父占位并入自身
    年份层，与子孙同层（非单调数据如父子同年）重叠时右推防护；森林游标宽度=
    帧全层总宽（树间分离跨层成立）。初轮全部 15 用例年份与深度一致故结果不变
    （层索引=深度索引的严格泛化），既有断言零改动全绿。
  - 新用例：lineage-layout.test.ts「W1 回归：叔侄同年不重叠（门一复现参数——
    年份严格单调仍触发；轮廓按年份层索引非树深度）」（断言 |B.x-A2.x|≥
    NODE_W+SIBLING_GAP）+「W1 延伸：父子同年（非单调数据）同层分离（父占位
    同层防护右推）」。
- **W2（空态早退+effect 空依赖→转场 pan/zoom 永久失灵）**：
  - 修复面：LineageCanvas.tsx 删除 `nodes.length===0` 早退 div 分支——svg 常驻
    挂载（空态文案改 svg 内 text 层叠加，viewport g 条件渲染），listener 一次
    绑定常活，空→非空转场无需重绑（effect 依赖 [] 保持——挂载结构不再短路）。
  - 新用例：lineage-canvas.test.tsx「W2 回归：空→非空转场后 pan/zoom 可用
    （listener 不因空态首挂载失绑）」（空挂载→rerender 填充→pan translate(40,10)
    +zoom scale>1）。
- **回炉红证**：修前红 lg02-rework-red.log（EXIT:1，3 failed/570 passed——恰为
  三新回归用例红，基线零回归）；修后绿 lg02-green.log（EXIT:0，573/573）；
  verify 追加 lg02-verify.log（=== 回炉 1 轮 verify EXIT:0 ===——82 文件 573
  用例+locks 127+build 全绿）。受锁测试改动经 unlock→改→apply（manifest 127
  条 sha 同步，[locked-change] 尾注随提交）。
- **N1**：本报告初版单文件用例数笔误 16/12 更正为初轮实际 15/13（15+13=28 总数
  恰符故未影响总数核对）；回炉后终态 17/14（总 31）。
- **N2**：lg02-red.log/lg02-mutation.log 尾补显式退出码行（EXIT:1 三轮/红档）；
  lg02-green.log/lg02-verify.log/lg02-rework-red.log 原生含退出码行。
