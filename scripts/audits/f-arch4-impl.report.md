# F-ARCH4 实现报告——anchor-serialize.ts 拆件（纯重构，行为零变）

> 实现者子代理（三屋 ADR-0017）。票面=scripts/audits/f-arch4-ticket.md。
> 状态：**实现完成，四关口+e2e 全绿，等门一/门二**。禁 git/locks/registry/tickets（遵票面）。

## 一、实现摘要

annotation-anchor.ts（476 行，全项目 top1）按 deepseek W4 原案拆分线拆出
锚定格式与校验域 → 新文件 `anchor-serialize.ts`（185 行），六件
（SelectionAnchor/CONTEXT_CHARS/selectionToAnchor/probeTextLength/
verifyQuote/matchAt）**逐行原样迁入**（138 行 diff 为空，含注释与块间空行）。
annotation-anchor.ts 回归锚定计算域（337 行），按票面预裁 3 扩面原语导出
（collectSpans/fullTextOf/offsetToPoint/rectsBetweenPoints/pixelBoxOf 五函数
+NodeSpan/DomPoint/PixelBox 三接口=serialize 合法消费面，类型单一真相源）。
依赖单向 anchor-serialize→annotation-anchor→annotation-merge，零环。
消费方四文件+受锁测试改向真源 import，不留转发层。INV-40 未触碰
（invariants.md 零触碰，mergeRects 单源仍在 annotation-merge）。

## 二、文件清单

新增：
- `src/renderer/features/reader/anchor-serialize.ts`（185 行；头注五段，
  含本票编号+WADM textQuote 契约迁移声明；无 import 语句原文）

修改（6 文件）：
- `src/renderer/features/reader/annotation-anchor.ts`（476→337 行：删六件、
  扩面 8 符号导出、头注五段重写——「全项目唯一操作 DOM 文本遍历的地方」
  声明保持+几何原语公共面补一句；头注不含六件符号名）
- `tests/unit/renderer/annotation-anchor.test.ts`（**受锁**，[locked-change]
  面主控已预 unlock：仅 import 块拆两行改向——selectionToAnchor/verifyQuote
  →anchor-serialize，findRangeAtOffset/mergeLineRects/rectsFromRange 留原
  路径；**用例体零改**，guardedDescribe 面不动）
- `src/renderer/features/reader/SelectionLayer.tsx`（import 换源
  selectionToAnchor+type SelectionAnchor）
- `src/renderer/features/reader/anchor-locate.ts`（import 换源 verifyQuote）
- `src/renderer/features/reader/AiAnnotationLayer.tsx`（import 拆两行：
  verifyQuote→serialize，findRangeAtOffset 留 anchor）
- `src/renderer/features/reader/AnnotationLayer.tsx`（同上拆行）

零触碰面：annotation-merge.ts / docs/invariants.md / shared / ipc / CSS /
tickets/registry.ts（遵禁令）；无新依赖。

## 三、TDD 证据链

| 阶段 | 证据文件 | 结果 |
| --- | --- | --- |
| 首红（全量口径） | `scripts/audits/f-arch4-impl-first-red.raw.txt` | EXIT=1：Failed to resolve import anchor-serialize（113 文件 1 fail=受锁测试整文件，929+19=948 基数吻合） |
| 绿（全量） | `scripts/audits/f-arch4-impl-green.raw.txt` | EXIT=0：**113 文件 948 用例全绿**（用例数与基线一致，纯改向零新增） |

## 四、变异红证

**M1 原案（摘 root.contains）**：`f-arch4-impl-mutation-m1.raw.txt` EXIT=0
**未红**——票面预设失效。诊断（`f-arch4-impl-m1-diagnosis.raw.txt`，jsdom
复现脚本）：受锁用例「选区跨出 root→null」的反向 range 经 jsdom
`Selection.addRange` 被规范化为 **collapsed**（start/end 两边界均落入 root
内），变异体在 `isCollapsed` 首道防线即返回 null——`root.contains` 检查在
jsdom 用例中**结构性不可达**（真浏览器按规范 swap 双边界才可达；此为既有
测试的 jsdom 局限，迁移前同样如此，非本票引入）。

**M1' 替代变异（自裁，见申报①）**：serialize 内 `start = leadLen` →
`leadLen + 1`。`f-arch4-impl-mutation-m1p.raw.txt` EXIT=1，2 用例红：
- 「selectionToAnchor：文本节点边界 → start/end/quote/prefix/suffix」
- 「selectionToAnchor：元素边界（offset 是子节点索引）同样成立」

红=selectionToAnchor 用例咬住 serialize 新源（M1 防假绿的意图达成）。

**M2（verifyQuote 重定位环摘除，原位不匹配即 return null）**：
`f-arch4-impl-mutation-m2.raw.txt` EXIT=1，8 用例红：
- 票面目标：「verifyQuote：前部插入文本后仍能重定位（textQuote 自愈）」
- 下游咬合：anchor-locate S1（exact 滚动+闪烁）/S8（并发序号守卫）；
  ai-annotation-layer×5（rects 渲染/重锚失败零 rects/点击高亮/exact 层
  aiNoteId+annotationId 两用例）

**M3 静态咬合**：`f-arch4-impl-m3-static.raw.txt`
- 六符号 grep annotation-anchor.ts **零残留**（头注亦不含，全程 grep 干净）；
- 符号集合等价：拆分前 anchor 26 符号 = 拆分后 anchor(20)+serialize(6)
  diff 为空（serialize 恰含六件：SelectionAnchor/CONTEXT_CHARS/
  selectionToAnchor/probeTextLength/verifyQuote/matchAt）。

还原安全：三次变异均 cp 备份法（备份=系统临时目录），还原后 diff 确认
空（输出在会话记录，RESTORE_OK diff empty ×3）；禁 git checkout 遵守。

## 五、annotations 等价面自查（六件逐行 diff）

`f-arch4-impl-sixpieces-diff.raw.txt`：拆分前 anchor 134-271 行（六件+块间
空行+注释，138 行）vs anchor-serialize.ts 48-185 行，**diff 为空**——逐行
原样，无等价改写（未改调 findRangeAtOffset，票面预裁 4 遵守）。

## 六、四关口 exit（各自真退出码落盘）

| 关口 | 文件 | exit |
| --- | --- | --- |
| lint | `f-arch4-impl-lint.raw.txt` | 0 |
| typecheck | `f-arch4-impl-typecheck.raw.txt` | 0 |
| test | `f-arch4-impl-test.raw.txt` | 0（113 文件 948 用例） |
| build | `f-arch4-impl-build.raw.txt` | 0 |

（npm run verify 未整体跑——locks 解锁窗口 locks:check 必红为主控预裁预期，
故按派单跑四关口。）

## 七、e2e（收口裁判）

`f-arch4-impl-e2e.raw.txt`：先 build（第六节）后 `npx playwright test`，
**29 用例全绿首跑通过（1.3m），E2E_EXIT=0**——P7-A 剪贴板 F-G10 flake 未
触发，无需复跑申报。

## 八、自裁申报（一切偏离票面的决定）

1. **M1 替代变异 M1'**：票面 M1 原案在 jsdom 下结构性不可达（诊断证据见
   第四节）。为达成 M1 防假绿意图（证 selectionToAnchor 用例咬 serialize
   新源），自裁等价目的变异 M1'（start 偏移漂移 +1）。原案全绿输出+诊断
   数据均落盘，未隐瞒。门审如不认可 M1'，可裁更优变异点。
2. **消费方头注「模块.符号」引用同步（超出票面字面的 import 改动）**：
   拆件造成三处头注引用失真（假边），按接缝归责最小修正——
   SelectionLayer 行为层「annotation-anchor.selectionToAnchor」→
   anchor-serialize.selectionToAnchor；anchor-locate 架构层消费清单
   「annotation-anchor.verifyQuote」→anchor-serialize.verifyQuote；
   AiAnnotationLayer 行为层（宿主文件名）+架构层（依赖清单拆
   verifyQuote/findRangeAtOffset 归属）。**纪律性声明未动**（「annotation-
   anchor 唯一 DOM 遍历点」句式仍成立——serialize 的遍历原语仍消费自
   anchor）。仅注释文字，零代码语义改动。
3. **测试 import 块拆为两条 import 语句**（票面只说改向；受锁面最小机械
   形态，用例体与 guardedDescribe 零改）。
4. AiAnnotationLayer/AnnotationLayer 拆行后行序：anchor-serialize 在
   annotation-anchor 之前（ASCII 字母序；eslint 无排序强制，从局部惯例）。

## 九、疑虑（交门审）

1. **「跨出 root」防线在单测层覆盖不完整**（M1 诊断副产物）：jsdom 下该
   用例实际由 isCollapsed 防线兜住，root.contains 检查只有真浏览器可达
   （e2e 无对应反向选区用例）。既有局限，非本票引入；若门审认为需补真
   浏览器用例，属新工单面。
2. anchor-locate 函数 docstring 存量「anchor-anchor 唯一 DOM 遍历点」笔误
   保持原样（超票面，不修）。
3. 行数：serialize 185（票面预估~177）/anchor 337（票面预估~304，头注比
   预估长）——双远离 500 红线，max-lines lint 过。

## 十、回炉 1（门一 deepseek 裁决 0B/1W/4N 后，主控下发 N1/N2/N3 头注微调）

裁决处置对照：W（M1 诊断可信度）+N4（用例名不副实=存量覆盖缺口）由主控
自处置登记台账（M1' 采信，红 2 用例实证咬合——实现者无动作）；N1/N2/N3
下发本屋回炉，纯注释改动零代码语义，逐条处置：

- **N1 已改**：annotation-anchor.ts 头注架构层「SelectionLayer/
  AnnotationLayer 只调用它」→「……只经 anchor-serialize 调用它」（主控
  裁决原文照用）。
- **N2 已补**：anchor-serialize.ts 头注架构层补边界句「文本枚举唯一发生
  在 annotation-anchor；本模块仅借 Range 做长度探测（probeTextLength 的
  Range.toString 非遍历）」（主控裁决原文，全角标点随头注风格）。
- **N3 已改**：AnnotationLayer.tsx 行 2「依赖 annotation-anchor」→「依赖
  annotation-anchor+anchor-serialize」；行 9 mergeLineRects 归属与行 28
  唯一遍历点纪律句未动（遵裁决）。

证据：`scripts/audits/f-arch4-rework1-test.raw.txt`——全量 test 948 passed
exit=0 + lint exit=0（node v24 PATH 前缀口径）。

回炉疑虑（申报，供门二/主控复核）：N1 措辞与 N3 存在轻微张力——
AnnotationLayer 实际仍直接 import annotation-anchor 的 findRangeAtOffset
（几何管线直调，非经 serialize）；N1 句的语义重点若读作「两层的全部消费
均经 serialize」则与 N3「依赖 annotation-anchor+anchor-serialize」互斥。
本屋按主控裁决原文执行未自裁改写；若需精确化（如「SelectionLayer 只经
anchor-serialize 调用它」拆述），请示下。
