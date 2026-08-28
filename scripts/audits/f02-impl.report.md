# SR2-F-02 实现者报告（四层多页化收口与跳页兼容）

> 三屋模式实现者子代理产物。主控简报=scripts/audits/f02-impl-brief.md；
> 票面=anchor-locate.ts 头注 [SR2-F-02] 段+p7f-ticketing-draft.md SR2-F-02 节。
> 依赖地基=F-01（f20c2fd）。

## 开工记录（会话纪律）

技能清点：test-driven-development **用**（TDD 四档）/verification-before-completion **用**
（verify+e2e 双真退出码）/systematic-debugging **用**（首红归因单变量）；
javascript/e2e-testing-patterns **不用**（遵循仓库既有测试基建与 F-01 先例，通用模式无增量）；
subagent/dispatching 类 **不用**（实现者无派发权）；其余技能与本单无关联不用。
配置自查：实现者=GLM-5.3（主控派发指定）。环境铁律全程执行（node24 前缀）。

## 实现摘要

1. **SelectionLayer 动态锚定根**（注册链主改面，挂载位不动=F-01 结构零改）：
   - 纯函数 `closestPageRoot(node)`（向上最近 `[data-page-root]` 页盒）+
     `pageIndexOf(root)`（1 基盒号→0 基页码），均导出直测。
   - evaluate 重写：锚定根=选区 anchorNode/focusNode 各自向上最近页盒；
     **跨页/跨出页盒（两边界页盒不同）→不创建+toast「选区跨页，不支持创建标注」**
     （仅 mouseup 时刻；INV-02 禁静默）；两边界同为 null（页外选区）静默收起。
   - **保存页=pending.pageNo（选区所在页 0 基动态推导）**，rects.page 同——
     props.page 弃用（签名保持，头注声明）。
   - 工具条落点**以选区所在页盒为参照系**（水平夹取经选区页盒 rect——N-C），
     再换算到挂载盒渲染（页间偏移=布局常数）。
   - F-01 自裁 4 中间态解除：挂载盒≠选区页仍弹工具条（P1 组件锚+e2e 划选链）。
2. **anchor-locate verifyWhenReady 页限定**：`querySelector('.textLayer')` 全局
   第一→目标页盒 `[data-page-root="${anchorPage+1}"]`（PageColumn 1 基）内查询；
   **页盒缺席回退全局唯一 textLayer**（单页宿主/受锁 S1~S9 单页夹具兼容——
   见自裁 1）。头注 F-02 段与 F-aware 接缝段口径同步（滚动步=INV-29 双源信号）。
   locateAnchor 签名（:69-86 形状）零触碰。
3. **AiAnnotationLayer 缓存键（paperId+页 :91）**：核对=F-01 已随每页实例化分页，
   零改（票面「数据面」核对项）。
4. **e2e 批 2 守卫**：reader-text 划选链（F02_DEPS=[...ANNOTATION_DEPS,'SR2-F-02']）/
   ai-notes 渲染层用例（DEPS 并入）/lineage T4 逐测单列（T1~T3 不被绑架）。

## 文件清单（git diff --stat 实测，与票面清单一一对应）

| 文件 | 变更 | 说明 |
| --- | --- | --- |
| src/renderer/features/reader/SelectionLayer.tsx | 改 243→249 | 动态锚定根+跨页拒绝+坐标经页盒（quality 组件 ≤250 关卡内） |
| src/renderer/features/reader/anchor-locate.ts | 改 263→270 | :153/:161 页限定+头注两段口径同步（票面软目标 ≤260 超 10 行，申报） |
| tests/unit/renderer/selection-layer.test.tsx | 新入锁 | 9 用例（纯函数 2+状态机 P1~P7），always-active |
| tests/unit/renderer/anchor-locate.test.ts | 受锁扩 | S10/S11 新裸 describe（always-active），S1~S9 零触碰 |
| tests/e2e/reader-text.spec.ts / ai-notes-section.spec.ts / lineage.spec.ts | 受锁扩批 2 | DEPS 守卫挂载 |
| locks/manifest.json | 改 | locks:generate/apply 同步产物（141 条） |

清单外零改动（dev-launch.cmd/dist_new/为开工前既有未跟踪残留；scripts/audits/f02-*
为本单审计档）。

## TDD 红证

- **首红**（f02-red.log）：10 failed | 11 passed——S10（旧全局第一实现走完 3s 轮询
  超时降级 page，断言 exact 红，5007ms）/S11（旧实现邻页引文误命中 exact，断言
  page 红）/SelectionLayer 纯函数+P1~P6（P7 页外静默=既有行为恒绿，合规）。
- **绿**：两文件 21 passed→全量 92 文件 691 用例 passed。
- **断言级变异红证**（cp 备份法，还原 diff 空×4；压缩后 R2~R4 重做）：
  - R1 页限定退回全局查询→恰中 S10+S11（S1~S9 保持绿）
  - R2 跨页判定禁用（`false &&`）→恰中 P2
  - R3 保存页固定挂载页 0→恰中 P4
  - R4 删坐标页间偏移项→恰中 P1
- **质量压缩轮回**：头注/实现体膨胀致 quality 红（305 行>250）→三段压缩
  （守卫合并/动作按钮 KIND_LABEL map 化/单行化）至 249 行→压缩后重跑单测绿+
  重做 R2~R4 变异红证（R1 面 anchor-locate 未动免重做）。
- **tsc 关卡拦截实录**：vitest（esbuild）全绿但 typecheck 红 4 处（SelectionAnchor
  收窄/测试 void 返回 boolean 箭头体/noUncheckedIndexedAccess）——修复后全绿
  （AGENTS「只跑 playwright 会漏」同型实证，本单为 vitest 面）。

## 测试证据（真退出码）

- **verify 全量**：f02-impl-verify.log，`npm run verify` **EXIT=0**——quality+
  tickets+locks+lint+typecheck+test（92 文件 691 用例）+build 全绿。
- **e2e 全量**：f02-impl-e2e.log，`npm run test:e2e` **EXIT=0**——**20 passed +
  1 skipped**（skip=SR2-F-04 reader-scroll.spec 骨架双条件守卫，预期形态）。
  取证法=备份法临时翻 registry F-02→done（F-01 批 1 先例）：cp 备份→改→跑→
  cp 还原→diff 空（两轮：压缩前首轮+最终代码轮，均 20 passed EXIT=0）；
  registry 工作树零残留（git diff tickets/ 空）。

## locks 实录

- 改前 unlock（140 个）；selection-layer.test.tsx 新入锁：`locks:generate`
  （140→**141**，f02-locks-generate.log）→`locks:apply`（f02-locks-apply.log，
  含中途两轮 unlock/apply——变异与类型修复周期）；收口态=141 已锁定，
  manifest 与工作树内容一致（verify 的 locks:check 关卡已过）。

## 自裁申报（票面下放项+超票面决定）

1. **verifyWhenReady 页盒缺席回退全局 textLayer**：主控裁决 6 未明说缺席策略；
   受锁 S1~S9 单页夹具（mountTextLayer 无页盒包装，禁改）在严格页限定下全红，
   回退使既有合约零改兼容。真实页列环境目标页盒必有（setPage→scrollRequest→
   渲染窗，轮询等待），严格限定由 S10/S11 锁定。
2. **跨页 toast 仅挂 mouseup 时刻**（防抖路径静默，P2b 锁定）：「禁静默」按
   用户完成拖选的时刻解释——拖选中途/程序化选选不刷屏。
3. **跨出页盒（一 null 一非 null）与真跨页共用同一文案/判定**（裁决 5 的
   「anchorNode 页盒≠focusNode 页盒」字面全覆盖，单常量）。
4. **工具条落点实现=「选区页盒夹取+换算到挂载盒」**：主控裁决 4「offset
   parent=页列容器」在本票文件清单（不含 ReaderPage/PageColumn，挂载位不能
   上移）下的数学等价实现——页列垂直排列页间偏移为布局常数，换算恒等；
   防层叠污染由「夹取经选区页盒 rect」承载。
5. **props.page 弃用**（签名保留）：票面「props 不变」+保存页动态推导的必然；
   useEffect 依赖缩至 [pageRoot, paperId]（pageRoot 引用变化已覆盖锚定页切换）。
6. **动作按钮 KIND_LABEL map 化+单行化**：quality 250 行关卡驱动的等价重构
   （行为/测试契约不变；压缩后变异红证重做闭合）。
7. **「滚动中选区保持」口径**=evaluate 每次动态重找锚定根（拖选中滚动/防抖
   重评时锚定根跟随选区）；已知限制见疑虑 1。

## 疑虑（供门审）

1. **挂载盒重挂窗口**：工具条弹出后用户滚动致首可见页（锚定页）变化→
   SelectionLayer 随 F-01 挂载条件重挂→组件状态重置→工具条收起（选区与已落库
   数据无损，重新划选即恢复）。跨挂载状态保持需挂载位上移至 ReaderPage 级
   （不在本票文件清单）——建议归 F-03 装配面或后续票处置。
2. **anchor-locate.ts 270 行**（票面软目标 ≤260）：页盒查询+头注口径同步的
   净增；机检 max-lines=500（skipComments）远未触，quality 关卡（组件 250）
   不适用于该 .ts。
3. **e2e 守卫时序**：registry 保持 open（主控单写）——主控收口翻 done 前，
   三批 2 用例在常规跑中呈 skip；正向实跑证据已以备份法落盘（上节）。

## 中间态解除验收（简报 ④）

F-01 自裁 4「锚定页外划选不弹工具条」已解除：任意可见页划选均正确——组件级
P1（挂载盒=页 1、选区页 2→工具条出现+坐标含页间偏移）+e2e 划选链（20 passed
内）双锚。
