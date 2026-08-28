# SR2-F-05 程序滚动单容器收敛（缺陷 A：TabBar 被顶出视口）——票面 v1

> 来源：2026-08-28 用户真机验收反馈缺陷 A（图一：阅读器标签页被遮挡看不见），
> 取证定性见 `docs/prompts/2026-08-28_loop-handoff.md` §2A。**P7-F 回归·机制级·
> 阻断包1④⑤ 验收**。本票=验收修复役 U1（第一票）。
> 纪律：三屋模式（TDD 四档+断言级变异红证+双门）；实现者禁 git/registry；
> 取证禁触 tickets/。

## 0. 根因（验收分析会取证高置信——实现者开工先自证复现，推翻/证实均落报告）

1. `src/renderer/app/App.tsx:109` `<main className="min-w-0 flex-1 overflow-auto">`
   ——ReaderPage 之上存在的**可滚祖先**。
2. `src/renderer/features/reader/PageColumn.tsx:167`（段⑤程序滚动）与
   `src/renderer/features/reader/anchor-locate.ts:231`（flashElement）使用
   `Element.scrollIntoView()`——CSSOM 语义=滚**所有**可滚祖先。
3. 一旦 main 存在溢出/已滚状态（激活路径：窄窗口 ReaderToolbar `flex-wrap`
   折行增高 + `pageBoxHeight` floor 与 pdfjs 取整的 1px 级溢出），程序滚页
   （翻页键/页码跳转/进度恢复）或脉络跳转闪烁就把整个 ReaderPage 连同
   TabBar 顶出视口，**无自愈路径**（main 的 scrollTop 不归零）。
4. e2e 未拦原因：既有 spec 视口宽裕，main 从不溢出。
5. 自证复现载体=e2e（jsdom 无布局，scrollIntoView 无实现，单测层不可复现）：
   新 e2e 用例先红（窄视口+程序滚动后 tablist 不可见/main.scrollTop>0）。

## 1. 主控预裁项（实现者不再自裁这些点；双门可攻击，推翻需更强依据）

- **P1 修法三件+断言**（防御纵深）：
  - ①`ReaderPage.tsx` 根加 `overflow-hidden`——**两处返回分支都加**（:175
    空态分支与 :227 主分支的 `flex h-full flex-col`，返回形状一致性）。
  - ②新文件 `src/renderer/features/reader/scroll-converge.ts`：
    `scrollIntoNearestScroller(el, align)`——只滚 el 的**最近滚动祖先**
    （见接口层），替换两处 scrollIntoView（PageColumn 段⑤用 `'start'`；
    anchor-locate flashElement 用 `'center'`）。两消费方统一走本函数
    （同一不变量同一实现，Rule of Three 从 1 起即收敛）。
  - ③`ReaderToolbar.tsx:66` 根 className 加 `shrink-0`（与 TabBar
    `flex h-8 shrink-0` 同构——辅因加固；flex-wrap 保留，折行只影响
    阅读器内部高度不再外溢）。
- **P2 统一走「最近滚动祖先」而非 scrollContainerRef 直滚**：PageColumn
  段⑤不依赖 props.scrollContainerRef（受锁测试挂载时未传 ref——原实现靠
  scrollIntoView 无需容器；改 ref 直滚会迫使全部夹具改形状）。页盒→滚动
  容器之间的祖先（页列 root / selectionMount 盒）均无 overflow——最近滚动
  祖先=滚动容器，语义等价且两消费方同构。
- **P3 flash 语义**：flashAiNote 兜底命中 aside 面板条目时，最近滚动祖先=
  aside 自身滚动容器（若有）→滚 aside（保持 AI-09 列表滚动语义）；无滚动
  祖先→不滚（原 scrollIntoView 对无滚动容器元素也是无操作）。**更外层
  （main）永不被触碰**=本票不变量。
- **P4 INV-34 登记**：程序滚动单容器收敛（声明处=scroll-converge.ts；
  强制方式=单测+e2e main.scrollTop===0 断言；锚定状态=docs/invariants.md
  表尾续号 33→34，禁撞号）。表行四列按册内既有格式。
- **P5 e2e 新 test 放 reader-scroll.spec.ts**（272 行→预计 ~330 行，余量
  足）：独立 test+自守卫 `test.skip(!isTicketDone('SR2-F-05'), ...)`（F-04
  同构；DEPS 数组不动——F-01~04 已 done）。收口翻 done 后推演 **23 过+0
  skip**。
- **P6 受锁测试改写口径**：三个单测文件对 scrollIntoView 的桩+断言，统一
  改为 `vi.mock('./scroll-converge')`（或 spy）断言 `scrollIntoNearestScroller`
  以 (目标元素, 对齐) 被调用；数学正确性由 scroll-converge 自测锚
  （新测试文件，always-active）。e2e 是行为终审。
- **P7 实现者可跑 `npm run locks:unlock` / `locks:apply`**（受锁测试改写
  必需流程），禁 git/registry/不动 tickets 一字不改。

## 2. 五层规约

**─ 行为层 ──**

- `scrollIntoNearestScroller(el, 'start')`：el 最近滚动祖先内
  `scrollTop += elRect.top − scrollerRect.top`（盒顶对齐视口顶=原
  scrollIntoView block:'start' 单容器语义；浏览器对 scrollTop 赋值自动
  夹取 [0, scrollHeight−clientHeight]）。
- `scrollIntoNearestScroller(el, 'center')`：
  `scrollTop += (elRect.top + elRect.height/2) − (scrollerRect.top + scroller.clientHeight/2)`
  （居中=原 block:'center' 单容器语义）。
- 「最近滚动祖先」判定：自 el.parentElement 向上首个
  `getComputedStyle(p).overflowY ∈ {auto, scroll}` 的祖先；到根无→不滚。
- 程序滚动链（PageColumn 段⑤）：scrollRequest 到达→（未就绪挂起）→
  就绪→clampPageToColumn→scrollIntoNearestScroller(页盒,'start')→
  **仅滚动容器 scrollTop 变化，main.scrollTop 不变**。
- flash 链（anchor-locate）：locateAnchor exact→flashAnnotation/flashAiNote
  →scrollIntoNearestScroller(el,'center')→el 最近滚动祖先滚动，更外层不动。
- 滚动链行为迁移表（机制修复前后——非新增状态机，宪法口径声明）：

| 态/场景 | 修复前 | 修复后 |
| --- | --- | --- |
| scrollRequest 到达（main 无溢出） | scrollIntoView 滚滚动容器（祖先无溢出=无副作用） | 差值法滚滚动容器（等价） |
| scrollRequest 到达（main 已溢出/已滚） | scrollIntoView 连滚 main→TabBar 顶出 | 仅滚滚动容器；main.scrollTop 保持原值 |
| flash exact（页内 rect） | scrollIntoView 居中+滚所有祖先 | 最近滚动祖先居中；main 不动 |
| flashAiNote 兜底（aside 条目） | scrollIntoView（滚 aside+可能滚 main） | aside 自身滚动容器；main 不动 |
| ReaderPage 根 | 无 overflow（高度链依赖 main 不滚） | overflow-hidden（切断向 main 泄漏的兜底纵深） |

- 跨格序列（宪法跨格要求）：main 已滚态→程序滚动→main.scrollTop 不被
  改写；程序滚动→用户接管（INV-32 三信号）→接管语义不变（差值法不经过
  接管链，与 INV-29/32 协同保持——setPage 'to' 信号链零改）。

**─ 接口层 ──**

- 新 `src/renderer/features/reader/scroll-converge.ts`：
  - `export type ScrollAlign = 'start' | 'center'`
  - `export function scrollIntoNearestScroller(el: HTMLElement, align: ScrollAlign): void`
  - （内部函数 `nearestScrollAncestor` 可导出供单测，实现者自裁并申报）
- PageColumn.tsx 段⑤：删 `scrollIntoView({block:'start'})` 行，换
  `scrollIntoNearestScroller(盒, 'start')`；**props 接口零改**。
- anchor-locate.ts flashElement：删 `el.scrollIntoView({block:'center'})`，
  换 `scrollIntoNearestScroller(el, 'center')`（el 需窄化为 HTMLElement——
  现 flashElement(el: Element)，目标实为 HTMLElement，收窄签名自裁申报）。
  **LocateAnchor/LocateTarget/locateAnchor 签名零触碰**（F-02 冻结面）。
- ReaderPage.tsx：仅根 className 两处加 `overflow-hidden`，其余零改。
- ReaderToolbar.tsx：仅根 className 加 `shrink-0`，其余零改。

**─ 架构层 ──**

- reader 域模块（scroll-converge.ts 不 import 组件/store；纯 DOM 工具，
  与 geometry 纯函数同层级的「DOM 几何件」）。分层单向零触碰；零新依赖。
- INV-29（scrollRequest 单口）/INV-31/32（回写与接管）/33（缩放锚）
  全部零触碰——段⑥缩放锚本就是单容器 scrollTop 程序修正，与本修法同构。
- INV-34 新登记（P4）。头注：PageColumn.tsx/anchor-locate.ts/ReaderPage.tsx
  头注按 F 系列惯例增补本单链（工单号+一行变更说明）。

**─ 生命周期层 ──**

- 不做：main.overflow-auto 本身移除（其他视图 library/lineage 依赖其滚动
  ——只切断阅读器泄漏面，不动 App 骨架）；FragmentNotesList/AiNoteGroupList/
  PaperList 的 `block:'nearest'` 列表内滚动（面板内部滚动非传播源，零触碰）；
  aside 面板滚动条改造。

**─ 文化层 ──**

- 单测：新 `tests/unit/renderer/scroll-converge.test.ts`（always-active；
  jsdom+桩 getBoundingClientRect/scrollHeight/clientHeight：最近祖先选取/
  start 数学/center 数学/顶底夹取/无滚动祖先不动/嵌套两滚动容器取最近）。
- 受锁改写（[locked-change]，P6 口径）：
  - `tests/unit/renderer/page-column.test.tsx`（:286/:304 两 it 断言+桩）；
  - `tests/unit/renderer/anchor-locate.test.ts`（:63-78 桩+6 处断言）；
  - `tests/unit/renderer/ai-annotation-layer.test.tsx`（:207-221 桩+2 处断言）；
  - `tests/e2e/reader-scroll.spec.ts`（新增 test，P5 口径）。
- e2e 新 test 骨架：打开 6 页文献→`win.setViewportSize({width:480,height:500})`
  （窄视口触发 Toolbar 折行/main 潜在溢出）→工具栏页码跳转第 4 页
  （input aria-label「跳转到页」fill+Enter，走 INV-29 程序滚动链）→断言
  `getByRole('tablist', {name:'打开的文献'})` visible **且**
  `main.scrollTop===0`（win.evaluate 读）→PageDown 键滚一屏→再断言两项。
  首红载体=本 test（修复前 tablist 不可见/main.scrollTop>0 至少一项红）。
- TDD 顺序：e2e 新 test 先红（build 后跑，守卫用备份法临时激活——
  **spec 备份法**：cp 备份 spec→临时注释自守卫行→跑红→恢复，禁触
  registry）→单测首红（scroll-converge.test）→实现→全绿→变异红证
  （≥3 变异：start/center 数学、最近祖先选取、overflow-hidden 移除——
  cp 备份法还原，禁 git checkout）→受锁 e2e spec 改动后**全量 verify**
  （tsc 关卡不可跳）。

## 3. 机检兼容自查

- quality grep 禁 `TODO|FIXME|placeholder`；renderer 中文注释 UTF-8；
  新文件 ≤500 行（scroll-converge.ts 预计 <80 行）；e2e spec 272→~330 行。
- locks:unlock→改受锁 4 文件→locks:apply（manifest 142→同步）；新测试文件
  scroll-converge.test.ts 入锁（locks:generate+apply 或按收口主控处理——
  实现者 apply 后申报即可）。
- 基线（自检参照）：verify 93 文件 723 用例 / locks 142 / 工单 110 open 0 /
  e2e 22 passed + 0 skip。完成后推演：单测 93 文件+1=94 文件 723+用例数增量
  （scroll-converge.test it 数自报）；e2e 23 passed + 0 skip（守卫态=22+1）。

## 4. 报告契约

全文落 `scripts/audits/sr2-f-05-impl.report.md`：实现摘要/文件清单/首红
证据（e2e 红+单测红）/变异红证全日志（含目标 it 名）/verify 真退出码
（echo exit=$? 落盘）/locks 实录/自裁申报（一切超票面决定，含 P2~P7 偏差）
/疑虑。回复五行内。
