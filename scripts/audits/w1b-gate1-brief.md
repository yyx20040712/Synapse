# F-TESTREF-W1B 门一审包（对抗式隔离审计——自包含简报）

## 0. 票面与红线

- 票：F-TESTREF-W1B 几何桩+局部工厂下沉（票面载体 tests/utils/geometry.ts 头注+registry summary）。
- 红线：R1 零 src 变更；C 面零变化（指纹门对拍）；[test-refactor][locked-change] 双尾注。
- 红线实证：git status 改动面 100% 在 tests/**+scripts/audits/**（src 零文件）——
  CI 范围闸白名单内。

## 1. 口径勘误（票内自裁申报）

1. 票面「22 文件/97 处」为调研期方法名 grep 口径。实测（ugrep+GNU 交叉）：
   - e2e 5 spec 的 36 行命中全部是 win.evaluate 内**真实浏览器测量调用**（非桩），
     不在收敛面、零改动；
   - 真桩收敛面=unit 17 文件（行计数 93=宪章口径；匹配计数 99≈终裁勘误 97+2
     漂移——W1A 批 40 文件迁移后的自然漂移）。
2. 工厂票面 ×4/×3/×3/×2 为调研期口径，当批实测：makeTab×11/makeAnnotation×3/
   makeDetail×4/seed×3（同名同形全收敛，共 21 文件）。
3. fa12 的 Range 零盒桩（8 字段全 0）**保留文件内**：selection 系 Range 桩为
   4 字段展开形，字段集语义不可无损互换（undefined↔0 分支风险），非重复面。
4. 「94 文件命名规范」落为 geometry.ts 头注规范句（新建工厂 make* 前缀+跨文件
   重复先入共享件），不对 94 文件全量重命名（纯 churn 无 C 面收益）。

## 2. 交付面

- tests/utils/geometry.ts（受锁）：三族安装对——
  spyOn 族 stubElementRects/stubViewportRect/stubElementRect（vi.restoreAllMocks
  还原=文件 afterEach 责任，存量语义）；Range 直赋族 stubRangeGBCR/
  stubRangeClientRects（disposer.restore()，orig===undefined 跳过——存量
  `if (orig !== undefined)` 逐字同）；defineProperty 族 defineRangeClientRects
  （descriptor 还原，原无实现=删属性——门一 N4 形态）+盒构造 domRect/boxRect/
  stubRectOf。
- tests/utils/factories.ts（新受锁件，manifest 329 已含）：makeTab(patch 形)/
  makeAnnotation(comment='')/makeDetail(patch)+makeDemoDetail()/seedLineage。
  **含 useLineageStore 值 import——node 域 db 测试禁用（头注边界声明）**。
- 36 个测试文件迁移（17 几何+21 工厂-2 双面重叠）。

## 3. C 面零变化三重实证

1. 指纹门：179/179 文件、1623/1623 用例、4979/4979 断言、15/15 skipSites 全同
   （与 W1A 收口基线一致）；
2. 变异红证：删 selection-paint 一处几何断言→MISSING_ASSERT 红（精确行号+断言
   文本回显）→cp 备份还原→指纹门复绿；
3. verify 全链 exit 0（quality+tickets+locks+lint+typecheck+test+build；
   162 文件/1579 用例全绿，Node 24.20.0）。

## 4. 票内回炉留痕（三次，未超回炉上限）

1. lineage 三文件 factories import 插在 api-client-mock 之前——vi.mock 注册晚于
   factories 顶层 useLineageStore 模块图加载→真 api/client 被拉入→spy 0 调用
   11 红。修复=import 行移序（W1A 顺序契约再实证）。
2. selection-mode 语义差异：原局部 makeTab 显式写 selectionMode: false 字段，
   共享基样缺席（undefined）→断言 toBe(false) 红。修复=调用点显式
   { selectionMode: false }（arrange 段改动，C 面安全）。
3. 迁移脚本正则竞态+bash node -e $ 展开坑：scroll-converge 3 行参数被清空
   （`stubElementRect(, 0, , 10, 10)`）——宪法在册「node -e 双引号内 $ 被 bash
   展开」第四次实证。修复=逐行 Edit+参数补齐。

## 5. 净删记账

git diff --stat（tests/ 域）：38 文件 +324/-639=**净删 315 行**（含 geometry.ts
+107/factories.ts +148 新增；全仓 40 文件 +370/-681 净删 311——含 manifest）。

## 6. 审计要求

- 对抗焦点①：三族还原语义是否与存量逐字等价（尤其 Range 直赋族 orig
  undefined 跳过、defineProperty descriptor 还原）；
- 对抗焦点②：makeTab patch 形收敛的语义漂移面（selectionMode/pageLayout/
  totalPages 20/annotations 四特例是否全数保持）；
- 对抗焦点③：factories.ts 的 useLineageStore 值 import 是否可能污染 node 域
  或其他未迁移文件；
- 对抗焦点④：口径勘误（e2e 非桩/工厂数量扩张/fa12 保留）是否构成票面偏离
  需回炉。
- diff 全文=scripts/audits/w1b-gate1-diff.patch（2228 行）；普查底稿=
  scripts/audits/w1b-geo-survey.md。
