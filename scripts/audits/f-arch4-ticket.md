# F-ARCH4 票面:annotation-anchor 476 行逼近红线——anchor-serialize.ts 拆件(纯重构)——五层规约

> 来源:AUDIT0 台账 F-ARCH4 [W](deepseek 架构审 W4 预警升格,报告=
> scripts/audits/arch-review-ds.md W4 节)。annotation-anchor.ts 476 行全项目
> top1,INV-40 归并器挂 A 宿主+锚定三元组序列化同文件——「任何锚定格式扩展
> (如 AI 锚定需要新 rect 语义)都会把它压过红线,或在红线边缘被迫塞入。
> 趁早拆,别在 500 红线边缘做」。本票=纯重构,**行为零变**。
> 中票三屋(ADR-0017)。LOOP 会话票——**不在 tickets/registry,禁触碰
> registry**。

## 行为层

### 拆分线(deepseek W4 原案:锚的格式与校验 vs 锚定计算)

新文件 `anchor-serialize.ts` 收**六件**(自 annotation-anchor **逐行原样
迁入**,只换宿主):

1. `SelectionAnchor` interface(划选锚定结果=持久化定位字段);
2. `CONTEXT_CHARS = 32`(prefix/suffix 截取窗口);
3. `selectionToAnchor`(用户划选→页内锚定三元组);
4. `probeTextLength`(probe-range 文本长度探测);
5. `verifyQuote`(前缀/引文/后缀校验+textQuote 自愈重定位);
6. `matchAt`(text[i..] 恰为 quote 且前恰 prefix 后恰 suffix)。

**anchor-serialize 定位=锚定格式与校验域**(未来锚定格式扩展的增长点);
annotation-anchor 回归**锚定计算域**(DOM 文本遍历/偏移互转/几何管线):
DOMRange/NodeSpan/DomPoint/PixelBox 类型+collectSpans/fullTextOf/
findRangeAtOffset/offsetToPoint/rectsFromRange/pixelBoxOf/
rectsBetweenPoints/mergeLineRects 族(常量 5+areaOf/dominantOf/
mergeSegment)/clientRectsBetween 全留。

### 消费方改向(真源 import,不留转发层)

- `SelectionLayer.tsx`:selectionToAnchor+type SelectionAnchor→
  自 './anchor-serialize';
- `anchor-locate.ts`/`AiAnnotationLayer.tsx`/`AnnotationLayer.tsx`:
  verifyQuote→自 './anchor-serialize'(findRangeAtOffset 仍自
  './annotation-anchor',import 拆行);
- `tests/unit/renderer/annotation-anchor.test.ts`(**受锁,[locked-change]**):
  import 块改向——selectionToAnchor/verifyQuote 自 anchor-serialize,
  findRangeAtOffset/mergeLineRects/rectsFromRange 留原路径;**用例体零改**
  (纯 import 机械改,guardedDescribe 面不动)。

### 行为等价面(禁破——每条有既有锚)

- 六件迁入逐行等价(含 selectionToAnchor 的 probe 双向探测/offsetToPoint
  几何链/CONTEXT_CHARS 截取;verifyQuote 的原位校验优先+重定位打分
  score=prefix 2+suffix 1+同级取最近);
- **禁顺带等价改写**:selectionToAnchor 不得改调 findRangeAtOffset 拿
  rects(边界点表示 (node,len) vs (next,0) 理论等价但微妙——纯重构纪律
  不引入推演负担);
- e2e reader-text 11 用例(含 F-A1 多行归并链)全绿=最终裁判;
- 既有单测全绿(annotation-anchor.test 改向后+annotation-merge.test+
  selection-layer/annotation-layer/ai-annotation-layer 族)。

## 接口层

- 新文件 `src/renderer/features/reader/anchor-serialize.ts`:
  `export interface SelectionAnchor`+`export function selectionToAnchor
  (root: HTMLElement, selection: Selection): SelectionAnchor | null`+
  `export function verifyQuote(root: HTMLElement, selector: { prefix:
  string; quote: string; suffix: string; start: number }): number | null`
  (matchAt/probeTextLength/CONTEXT_CHARS 保持模块私有);
- annotation-anchor **原语导出扩面**(serialize 的合法消费面,头注声明):
  `export function collectSpans/fullTextOf/offsetToPoint/rectsBetweenPoints/
  pixelBoxOf`+`export interface NodeSpan/DomPoint/PixelBox`(类型单一
  真相源,禁 serialize 侧手写等价类型);
- **禁两份并存**:annotation-anchor 内六件(SelectionAnchor/
  CONTEXT_CHARS/selectionToAnchor/probeTextLength/verifyQuote/matchAt)
  代码级零残留(实现者 grep 自查+主控收口复核);
- 头注纪律:两文件头注按五段惯例重写(anchor 头注「全项目唯一操作 DOM
  文本遍历的地方」架构声明保持——几何原语公共面声明补一句;serialize
  头注写明本票编号+WADM textQuote 契约迁移)。**头注禁写完整 import
  语句原文**(arch-scan 假边坑在档);
- 零新依赖;零 shared/ipc 触碰;零 CSS 触碰;annotation-merge.ts 零触碰。

## 架构层

- 依赖单向:anchor-serialize→annotation-anchor→annotation-merge
  (零环;serialize 是叶子);
- INV-40 表述**不动**(挂 A 宿主=rectsBetweenPoints 留在 anchor,
  mergeRects 单源在 annotation-merge——主控核验已确认,误改=invariants
  无谓翻锁);
- 行数:anchor 476→约 304/serialize 约 177(实现后自查,双远离 500 红线);
- 死代码即删:anchor 迁走后不再被引用的 import 全清。

## 生命周期层

- 零运行时差异(纯函数跨模块移动,模块加载图多一叶);
- 性能面不动(单页千级文本节点 <10ms 约束照旧)。

## 文化层(测试=改向先行红→绿→变异红证咬合证明)

- **TDD 形态(纯重构票)**:受锁测试 import 改向**先行**→红
  (anchor-serialize 模块不存在,全量口径落盘)→实现六件迁移→绿。
- **变异红证**(防「测试仍咬旧路径残留」的假绿;各落盘 .raw.txt,
  文件备份法 cp 还原,禁 git checkout;锚点带足够上下文防打偏):
  M1 serialize 的 selectionToAnchor 摘 root.contains 边界检查→
  「选区跨出 root→null」用例红;
  M2 serialize 的 verifyQuote 重定位环摘除(原位不匹配即返回 null)→
  「前部插入文本后仍能重定位」用例红;
  M3 静态咬合(非变异):grep 证 anchor 内六件零残留+两文件符号
  总面=拆分前 anchor 面(集合等价)。
- 全量 vitest 绿(npm run test 禁裸 npx vitest);
- **e2e 全量**(收口裁判,须先 build):29 用例全绿,落盘 .raw.txt
  (P7-A 剪贴板 F-G10 在案 flake 先例:首跑红可复跑一次并申报);
- 受锁面:仅 annotation-anchor.test.ts import 改向(收口 locks 归主控,
  实现者禁跑 locks 命令;改受锁文件前知会主控已预 unlock——本票实现
  期间主控保持解锁态)。

## 基线数字(自检参照)

verify=113 文件 948 用例全绿 / locks 187 / e2e 29。**本机 node 默认 v25
必红——一切 node/npm 命令前缀 `export PATH="/d/nodejs24:$PATH"`**。

## 主控已预裁项(门一可攻击,推翻需更强依据)

1. 拆分线=W4 原案(serialize=锚格式与校验六件;几何管线含 mergeLineRects
   族留 anchor——行盒物理与 INV-40 前置属锚定计算,不是序列化);
2. 消费方+受锁测试**改向真源,不留 re-export 转发层**:annotation-anchor
   是平级模块非桶文件,平级转发 3 符号=异味(F-ARCH5 的 index re-export
   是桶职责,不可比);受锁测试机械改 import=[locked-change] 合法面;
3. 原语导出扩面五函数+三类型=serialize 合法消费面,头注声明(宪法类型
   单一真相源——禁 serialize 侧复写等价类型);
4. 迁移逐行原样,禁顺带等价改写(selectionToAnchor 改调 findRangeAtOffset
   的 (node,len)/(next,0) 边界等价推演不净,不做);
5. INV-40 表述不动(挂 A 宿主留 anchor,主控已核)。
