# F-SL 修票票面 —— SelectionLayer 幽灵标注（addAnnotation 按 paperId 寻址）

> 来源=AUDIT-C C-3 扫描报告 §1.2-c+§五-3（scripts/audits/audit-c-scan.md，对抗审核在档）。
> 四波场第二票（与 F-D4 无接缝——本票只动 reader 域 renderer 面）。
> 病根=SelectionLayer.save 的 await 窗口内切 tab，onSaved 接线按**当下 activeId**
> 追加——A 文献的标注进 B 的 tab.annotations（幽灵标注，内存态；DB 落 A 行正确）。

## 〇、病根证据

- SelectionLayer.tsx:211-212：`await unwrap(api.reader.saveAnnotation({ paperId, ... }))`
  （paperId=props=发起时身份，DB 写正确）→ `onSaved(saved)`；
- ReaderPage.tsx:70+188：`onSaved={addAnnotation}`（store action，无参数化身份）；
- reader.store.ts:390-392：addAnnotation 经 updateActiveTab（:220-226）按**当下
  activeId** 追加——await 窗（本地毫秒级）内切 tab→错 tab 追加。
- 同文件正确范式（照抄对象）=reader.undo：reader.store.ts:438（activeId 在 await 前
  捕获）+:456-459（await 后 `tabs[paperId]` 存在核对，tab 被关→不追写，注释在案）。
- AnnotationLayer 的 update/remove 不在本票：map/filter 按 id 匹配写错 tab 天然
  no-op（扫描报告 §1.2-c 在案：无害缺更新，毫秒窗）——**本票只修追加面**。

## 一、行为层

- `addAnnotation` 签名改：`addAnnotation(paperId: string, a: Annotation): void`。
- 实现照 undo 范式：`tabs[paperId]` 缺席（tab 已关）→**no-op**（DB 已落，重开 tab
  从 DB 读对齐——与 undo :458 关 tab 路径同语义）；存在→按 paperId 追加（不读
  activeId）。
- ReaderPage.tsx:188 接线改 `onSaved={(a) => addAnnotation(paperId, a)}`（paperId=
  渲染时 active tab 的 paperId——与 SelectionLayer props.paperId 同源同帧）。
- SelectionLayer props 契约**零改**（头注「props 形状不变=挂载位契约零改」保持；
  onSaved: (a: Annotation) => void 不动——身份捕获在接线层闭包）。
- 语义边界：activeId 切走后 onSaved 落 A tab 内存（B 不受污染，A 切回标注已在）；
  undo 栈/clearTabDirty 仍按 props.paperId（SelectionLayer.tsx:214/:216 既有，正确
  不动）。

## 二、接口层

- reader.store.ts：addAnnotation 新签名（接口声明 :154+实现 :390 同步改）。
- ReaderPage.tsx：选择器 :70 不变（action 引用恒定），接线 :188 改闭包传参。

## 三、架构层

- 只动 reader 域两文件+受锁测试；不触 SelectionLayer/AnnotationLayer/shared。
- 死代码纪律：旧单参形态不留（调用面全数迁移——ReaderPage 唯一生产调用点）。

## 四、生命周期层（测试锚——TDD 红→绿先行）

1. **reader.store.test.ts（受锁，[locked-change]）**：
   - :91/:114 既有调用改双参（语义不变）；
   - 新用例①「activeId=B 时 addAnnotation('p-A', ann) 写 A 的 tab，B 的
     annotations 不变」（开两 tab 后切 B 再写 A）；
   - 新用例②「paperId 的 tab 已关→no-op 不炸且其余 tab 不受影响」。
2. **reader-store-undo-race.test.ts（受锁，[locked-change]）**：:65/:70 改双参
   （注释「SelectionLayer→addAnnotation 路径」保留——路径含义=经 ReaderPage 接线）。
3. ReaderPage 接线面：grep tests/ 确认是否有断言 onSaved 接线的既有测试，有则同步
   （预期无——SelectionLayer 测试用 onSaved 桩，不感知 store 签名）。
4. e2e 零改（reader-text.spec 划选保存面=单 tab 语境，签名变更对 e2e 透明）。

## 五、文化层

- reader.store.ts 头注 :49 旧 setter 列表注释同步（addAnnotation 标注 per-paper 寻址）；
  实现 :390 处加一行边界注释（照 undo :458 口径）。
- docs/invariants.md：**INV-03 扩写**（写方向同族条款——「写方向守卫=await 前捕获
  身份+await 后按身份寻址，tab 缺席 no-op；undo（:438/:456）与 addAnnotation（本票）
  双先例」）。扩写格式照 INV-03 既有 per-tab 变体段。
- 禁新依赖；UTF-8；中文注释。

## 六、纪律与证据契约（三屋）

- TDD：先红（新用例①②）→实现→绿；断言级变异红证≥1（建议：addAnnotation 恢复
  按 activeId 寻址→用例①红）。
- `npm run test` 禁裸 npx vitest；首红全量套跑口径。
- 证据落盘 `.raw.txt`（scripts/audits/）：f-sl-red / f-sl-green / f-sl-mutation-*；
  verify 真退出码 `echo exit=$? >>`。
- 受锁测试改动走 locks:unlock→改→locks:apply（无新受锁路径则不 generate）。
- 基线：以 F-D4 收口后的用例数/locks 数为准（如 F-D4 先行）——如实报实测值。
- 禁 git add/commit/push；禁翻 tickets/registry；卡点=BLOCKED 停手。
- 报告全文落 scripts/audits/f-sl-impl.report.md；回复五行内。
- 必读序：AGENTS.md→本票面→audit-c-scan.md §1.2-c→reader.store.ts:437-468（undo
  范式）→ReaderPage.tsx:58-70+186-190（接线）→tests/unit/renderer/reader.store.test.ts
  :83-120 与 reader-store-undo-race.test.ts 全文。
