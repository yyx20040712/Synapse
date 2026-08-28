# SR2-F-03 实现者报告（滚动进度回写恢复与键位迁移）

> 三屋模式实现者子代理产物。主控简报=scripts/audits/f03-impl-brief.md；
> 票面=scroll-progress.ts 头注五层+p7f-ticketing-draft.md SR2-F-03 节。
> 依赖地基=F-01/F-02（f20c2fd+31b3a07）。

## 开工记录（会话纪律）

技能清点：test-driven-development **用**（TDD 四档：红→绿→断言级变异红证→收口自检）/
verification-before-completion **用**（verify+e2e 双真退出码落盘）/systematic-debugging
**用**（e2e 首红归因：scrollTop=12 恢复链盒顶对齐含 p-3 内边距——单变量定位后放宽过严断言）；
subagent/dispatching 类 **不用**（实现者无派发权）；其余前端/云技能与本单（纯 renderer
状态机+装配工单）无关联不用。配置自查：实现者=GLM-5.3（主控派发指定）。
环境铁律全程执行（node24 前缀）；**取证零触 tickets/**（e2e 守卫取证=spec 备份法
skipIfPending([])，F-02 门一 W1 新纪律——见测试证据节）。

## 实现摘要（状态机逐格实现形态）

**scroll-progress.ts（注册文件，STUB→真实实现 339 行）**：三段结构——
①`createScrollProgress(deps)`（票面接口字面：getPaperId/getViewport/getPageBoxes/
scrollToPage/setPage/saveProgress/now/timers；时间全注入，per-tab `Map<paperId,State>`
+pendingProgress 账本语义保持 B3）；②`createReaderScrollProgress(scrollArea)`（装配
工厂：store/api 直连+scrollAreaRef 量测页盒内容坐标几何）；③`useScrollProgressWiring`
（装配效应集：flusher 注册成对/keydown 接管/换文献 loading/scrollRequest→程序滚动）。

| 态 | 实现形态 |
| --- | --- |
| idle | 无定时器无账（默认态） |
| scrolling | onScrollEvent 记账最近页+重 arm 2000ms（防抖窗内不回写） |
| pending | fire() 定时到的决定档：账本批量落库+activeId 失配校验+setPage 在本档执行（deps.setPage 侦探可观察，见单测「pending 档」用例） |
| writing | 落库承诺在途（Promise.all 收口）；**W2 新格：writing 中 onScrollEvent→直接回 scrolling，迟到完成经 writeSeq+态双重守卫不回落 idle** |
| restoring | 程序滚动跟踪：scroll 事件=程序自发（W-B，仅到达判定：中心页=目标→idle）；**用户接管=onUserTakeover（wheel/keydown/pointerdown 三类非 scroll 信号）→取消目标转 scrolling（INV-32）**；就位快径（已在目标页免程序滚直达 idle） |
| loading | beginLoading（换文献/首开）；onColumnReady→restoring+deps.scrollToPage（恢复链；就绪夹取 W-A=scrollToPage 消费面 setPage 'to'→PageColumn 段⑤ clamp） |

**键位迁移（ReaderShortcuts.ts 121 行）**：PAGE_KEYS 四键语义=容器滚动步（动作注入
ReaderPage scrollBy，步长=SCROLL_STEP_RATIO 0.9 单源导出）；**空格=下滚一屏新增**
（满屏步长 spaceScroll，editable 避让=既有 keymap 层）；preventDefault 保留（统一滚动
步长）；ctrl+wheel 零触碰。**reader.store 拆链（440→415 行净减）**：防抖定时器+
pendingProgress+flush 族（原 :143-207+closeOne/setPage 尾部）整体迁出；新增
progressFlusher 注册口（`registerProgressFlusher(f|null)`）——closeTab→flush(id)、
close()→flushAll()，依赖单向（store 不 import scroll-progress，装配面注册回调，避免环）。

**W3 并入裁决处置（anchor-locate.ts :168-179）**：verifyWhenReady 回退分支
`querySelector('.textLayer')` 全局第一→**querySelectorAll 断言唯一（===1 才用，>1
不取第一继续轮询→超时按 page 层降级 toast）**——防 anchorPage 超界/数据损坏时邻页
误 exact；头注补 W3 短式段。S12a（恰一个→exact 可用）/S12b（两个→page 降级）双锚。

**N4 并入裁决处置（ReaderPage.tsx 249 行，装配面自裁=挂载盒稳定化）**：
SelectionLayer 从「锚定页盒内条件渲染（anchorPage===no）」改为**挂内容级稳定包装盒**
（滚动容器内 `relative` div，包 PdfDocProvider+PageColumn，pageRoot=该盒）。滚动中
锚定页（首可见页）切换不再重挂组件→工具条不闪收；坐标数学不变（F-02 落点换算以
挂载盒 rect 为参照，盒换=常数换算恒等）；锚定根动态归 F-02 零触碰。变异红证 M8
（pageRoot 随锚定页重绑=旧坍缩机制复现）→e2e selection-toolbar 断言精确红。

## 文件清单（git diff --stat 实测，与票面清单+W3/N4 并入面对应）

| 文件 | 变更 | 说明 |
| --- | --- | --- |
| src/renderer/features/reader/scroll-progress.ts | 改（STUB 48→339） | 状态机+装配工厂+wiring hook；SCROLL_PROGRESS_STUB 已删（grep 零残留） |
| src/renderer/features/reader/reader.store.ts | 改 440→415 | 防抖链拆出+flusher 接线（净减 25 行） |
| src/renderer/features/reader/ReaderPage.tsx | 改 247→249 | 装配：三口接线/恢复链/滚动步注入/N4 稳定盒（≤250 达标） |
| src/renderer/features/reader/ReaderShortcuts.ts | 改 109→121 | 空格绑定+SCROLL_STEP_RATIO+头注口径迁移 |
| src/renderer/features/reader/anchor-locate.ts | 改 270→282 | W3 回退全局唯一+头注短式段（.ts 不受组件 250 关卡，eslint 500 内） |
| tests/unit/renderer/scroll-progress.test.tsx | **新入锁** | 22 用例（六态全格 11+跨格五序列 5+几何/容错 6），always-active |
| tests/unit/renderer/reader-shortcuts.test.tsx | 受锁扩 | makeActions+spaceScroll+裸 describe 3 用例（空格/避让/常量） |
| tests/unit/renderer/reader.store.test.ts | 受锁扩 | 两进度用例改写为拆链后契约+flusher 接线 3 用例（S1~S30 其余零触碰） |
| tests/unit/renderer/anchor-locate.test.ts | 受锁扩 | S12a/S12b 裸 describe（W3 回归），S1~S11 零触碰 |
| tests/e2e/reader-text.spec.ts | 受锁扩批 3 | F03_DEPS 守卫新用例（+92 行） |
| docs/invariants.md | 改 +2 行 | INV-31（进度回写=视口中心最近页）/INV-32（程序滚动用户接管）登记 |
| locks/manifest.json | 改 | locks:generate/apply 同步产物（141→142） |

清单外零改动（dev-launch.cmd/dist_new/=开工前既有未跟踪残留；scripts/audits/f03-*
为本单审计档；f03-impl-brief.md=主控简报）。

## TDD 红证+变异日志清单

- **首红**（f03-red.log）：**26 failed | 31 passed，EXIT=1**——scroll-progress 全组
  （createScrollProgress 未实现）/shortcuts（SCROLL_STEP_RATIO/spaceScroll 未实现）/
  store（registerProgressFlusher 未实现）/anchor-locate S12b（旧全局第一实现误 exact，
  'exact'≠'page' 红）。
- **绿**：四文件 69 passed（f03-green-test.log，EXIT=0）→全量 **93 文件 719 用例**
  passed（基线 92/691，+1 文件+28 用例）。
- **断言级变异红证**（f03-mutation.log，全部 cp 备份法还原 diff 空；M6 首 sed 语法
  错误未施加即跑绿——识别后清理日志重做，无假证）：
  - M1 回写 opts 'none'→'to'（INV-29/B1）→4 failed 红
  - M2 W2 新格失效（writing 中滚动早退）→2 failed 红
  - M3 失配丢弃移除（回写竞 tab 切换）→2 failed 红
  - M4 用户接管失效（restoring 不转 scrolling）→2 failed 红
  - M5 W3 回退退回全局第一（>=1 取首）→1 failed 红
  - M6 空格绑定删除→1 failed 红
  - M7 store flusher 接线删除→1 failed 红
  - M9 滚动步常量 0.9→1.0→1 failed 红
  - **M8 N4 挂载盒稳定化回退**（pageRoot 随锚定页重绑=旧坍缩机制复现；build 面）→
    e2e `selection-toolbar toBeVisible` 精确红，ReaderPage+spec 双还原 diff 空。
    首轮试做 key={anchorPage} 变异过烈（重挂整列，红在 P1 可见性非工具条断言）弃用
    重做忠实变异，过程留档日志附注。

## 测试证据（真退出码）

- **verify 全量**：f03-impl-verify.log，`npm run verify` **EXIT=0**——quality+
  tickets（110/open 2）+locks（142）+lint+typecheck+test（**93 文件 719 用例**）+
  build 全绿。
- **e2e 全量**：f03-impl-e2e.log，`npm run test:e2e` **EXIT=0**——**20 passed +
  2 skipped**（skip=F-04 reader-scroll.spec 骨架守卫+F-03 批 3 守卫，registry 保持
  open 预期形态）。
- **批 3 正向取证**（f03-e2e-newcase.log）：**spec 备份法**——cp 备份
  reader-text.spec→sed `skipIfPending(F03_DEPS)`→`skipIfPending([])`（唯一命中新
  用例）→playwright -g "F-03 批 3"→**1 passed EXIT=0**（2.9s）→cp 还原→diff 空。
  **全程零触 tickets/**（F-02 门一 W1 新纪律）。取证中断言修正一处：首跑红于
  `expect(top0).toBe(0)`——恢复链 scrollIntoView 盒顶对齐合法计入 p-3 内边距
  （scrollTop=12），行为正确断言过严，放宽 `toBeLessThan(50)` 后绿（简报①卡点
  级自裁，无行为改动）。

## locks 实录

- 改前 unlock（141）；scroll-progress.test.tsx 新入锁：`locks:generate`
  （141→**142**，f03-locks-generate.log）→`locks:apply`（f03-locks-apply.log，
  142 已锁定只读）；变异周期均在解锁态完成，收口前 apply；verify 的 locks:check
  关卡已过（manifest 与工作树一致）。

## 自裁申报（票面下放项+超票面决定）

1. **「pending」档实现为零宽度决定档**：定时到瞬间完成 失配校验+setPage 再入
   writing——票面两行（静置>2000ms→pending/定时到→writing）在同一定时器事件上
   交汇；可观察性经 deps.setPage 侦探（单测「pending 档」用例：setPage 调用时
   stateOf==='pending'）锁定，不引入人为第二定时器。
2. **失配丢弃=只丢 setPage，per-tab 账照落**：saveProgress 按 paperId 直落无
   active 依赖（写 A 页进 B tab 的损坏面仅在 setPage），「per-tab 记账」票面语
   义保持（S1/S5 双锚）。
3. **程序跳页（工具栏/目录/locate/恢复）经 beginProgramScroll 入账+arm**：拆链
   对齐——旧 store 一切 setPage 来源均入 pendingProgress；跳页后静置 2s 照落库
   （fire 的 setPage 门=scrolling/idle，restoring/loading 中只落账不回写页码）。
4. **flusher 注册口放 store（`registerProgressFlusher`）而非 store import
   scroll-progress**：依赖单向防环（scroll-progress→store/api；装配面注册回调）；
   store 测试可注入桩（受锁扩 3 用例）。
5. **装配工厂+wiring hook 下沉 scroll-progress.ts**（票面清单内文件）：ReaderPage
   组件 250 行关卡驱动（裸装配 269 行超限）；文件三段结构头注声明，hook 无 JSX。
6. **scroll-progress.test 用 .tsx 后缀**：tsc 关卡拦截实录——node 工程（含
   tests/**/*.ts）拉入 .ts→PageColumn.tsx 链报 TS6142（jsx 未设，仓库首个 .ts→
   .tsx import 链）；改后缀出 node 工程入 web 工程零配置改动（受锁 tsconfig 不动）。
7. **onColumnReady 就位快径+beginProgramScroll 就位快径**（已在目标页免程序滚
   直达 idle）：防恢复链对首页的多余 scrollRequest bump 与重开归位卡 restoring；
   单测两格锁定。
8. **keydown 接管挂 document（不过滤 ctrl）**：keymap 全局注册面+「三类信号」
   字面；wheel/pointerdown 经滚动容器 JSX 内联 prop（passive 观察）。
9. **anchor-locate.test 受锁扩（超简报④列举的 unlock 清单）**：W3 并入裁决改
   anchor-locate.ts，变异红证必须有宿主——S12 裸 describe 扩入（S1~S11 零触碰）。
10. **docs/invariants.md +INV-31/32**（超票面文件清单）：AGENTS 宪法「跨模块行为
    不登记=未完成」与票面清单冲突，按宪法优先执行（票面架构层本就要求登记两
    不变量；F-01 先例同型）。号段核验：现册最大 INV-30，新编 31/32 无撞号。
11. **删减面 diff 自查**：`git diff --stat` 11 文件+1 新测试全部对票面清单+W3/N4
    面；无清单外源码改动；F-01 的 handleColumnReady 直调 setPage 改经机器（恢复
    语义等价+机器跟踪），旧 jump 快捷键块删除（语义迁移至 scrollByRatio）。

## 疑虑（供门审）

1. **restoring 到达判定的窄边界**：程序滚动末事件的视口中心理论上可落目标页邻页
   （极短视口/极端 zoom），到达未判→restoring 滞留至用户接管（任一 wheel/key/
   pointer 即解）；物理上用户滚动必先发三类信号之一（W-B 设计前提），不构成死锁。
2. **程序跳页后异步 scroll 事件偶发记账**：scrollIntoView 同步改位+scroll 事件
   异步派发时序差下，快径 idle 后的 scroll 事件按用户滚动记账（同页无害重复回写，
   'none' 不回弹）；未观察到行为面影响（e2e 批 3 键位段+恢复段均锚定）。
3. **e2e 守卫时序**：registry 保持 open（主控单写）——批 3 用例常规跑呈 skip；
   正向实跑证据已以 spec 备份法落盘（上节）；主控翻 done 后 20+2→21+1 形态。
4. **saveProgress 拒绝面**：装配工厂 `.then(()=>undefined)` 返回承诺链，IPC 层
   Result 错误被吞为静默 resolve（进度=尽力而为规约沿用）；机器内另有同步抛错
   兜底（单测「落库拒绝」锚定）。
