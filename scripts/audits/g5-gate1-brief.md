# G5 门一审包（batch 17 · F-GEOM-01-G5 目录化 M2=time/）——自包含，禁外访

> 审计岗：ops-gate1-k2（zipoo 源，kimi k3 $max——用户指令 2026-09-18：k1 周额度
> 封顶，本批起门一审由 k2 承载）。审=对抗式深审，包外信息一律不得采信。

## 一、票面与零行为断言

- 票：F-GEOM-01-G5「目录化 M2=time/ 域迁移（设计书 §3.4；5/11）：4 文件迁
  reader/time/——reading-time/reading-time-setup/reading-time-outbox/
  reading-time-outbox-store；受锁面=reading-time 系测试 import 同链
  unlock→改→apply；域间单向=time→state 核验（§3.1）；翻 done 时 file 随迁
  改写；验收=verify 全链；[locked-change][test-refactor]」。
- **核心断言：零行为纯迁移**——全部改动=文件移动+import 路径改写（12 行）+
  一处注释勘正；运行时语义/用例数量/断言强度零变化。

## 二、迁移地图（主控派发前实勘+实现者执行后核对）

- 迁移 4 件（829 行）→ src/renderer/features/reader/time/：
  reading-time.ts(303)/reading-time-setup.ts(139)/reading-time-outbox.ts(300)/
  reading-time-outbox-store.ts(87)。
- 域内同层引用 4 处零改写（setup→reading-time/outbox/outbox-store 三处+
  outbox-store→outbox 一处，`./` 同层保持）。
- 深度修正 5 行：time/reading-time-setup.ts:13/:14（`../../`→`../../../`）、
  :15/:16（`./state/`→`../state/`，time→state 唯一域边）；time/reading-time.ts:61
  （re-export shared 深度+1）。
- 跨特性/组件消费 3 行：main.tsx:4、ReaderPage.tsx:55/:56。
- 注释勘正 1 行：shared/reading-time-format.ts:4 路径字样（零行为）。
- 受锁面 3 行 2 文件：tests/unit/renderer/reading-time.test.ts:9、
  reading-time-outbox.test.ts:10/:15（unlock→改→generate+apply 闭环，
  locks 总数 345 恒定，manifest 变更=时间戳+两 tests sha）。
- 全仓 grep 复核：其余 reading-time 命中=tests 注释/describe 字符串/e2e
  字符串（'e2e-reading-time-paper'），零 import，零改写；e2e 两 spec 未触碰。

## 三、diff 全文（git diff -M，rename 检测视角；manifest 时间戳段省略为
「generatedAt 更新+两 tests sha256 更新」，其余逐字）

（见下方附录 A）

## 四、验证与证据链

- 基线 verify EXIT=0（迁移前）：206 票/open 16/locks 345/test 170 文件
  1744 用例/指纹门 187/1789/5411。注：实现者申报简报基线「open 17」系起草
  时点滞后，实测 16（G4 翻 done 已生效）——如实记。
- 迁移后七关卡独立取证全绿：quality+tickets（已知红=registry 两行旧径，
  主控收口职责，见§六）+test-surface 指纹门零漂移+locks:check+lint+
  typecheck+test 170/1744+build。
- **构建产物哈希恒等旁证（G4 门一 N3 升格标配，本批兑现）**：
  index-D3egZtl2.js 1,392.72 kB + index-BfpEygSE.css 52.49 kB，跨三方同名
  同尺寸——①G4/batch16 在档 master 态；②本批基线 verify（迁移前）；
  ③本批迁移后 verify。vite 产物文件名=内容哈希，同名即零行为数学旁证。
- **变异红证两段（cp 备份法，还原 diff identical+复绿全在 raw）**：
  - M1 主证：main.tsx:4 回退旧径→typecheck TS2307 EXIT=2→还原 diff 空→
    复绿 EXIT=0。
  - M2 副证：tests reading-time.test.ts:9 回退旧径→vitest `Failed to load
    url` EXIT=1→还原→复绿 17/17 EXIT=0+复锁。
- §3.1 单向核验：state/ 域对 reading-time 零 import（grep exit=1 空证）；
  time→state 唯一边=setup:15/:16；本票零新增域边。

## 五、实现者自裁申报（4 条，供拷问）

1. 简报基线 open 17→实测 16（起草时点滞后，主控简报缺陷非实现缺陷）。
2. verify.log 末行 EXIT=0 系 shell 双 echo 消耗 `$?` 伪码——真实码 1 在
   raw.log（registry 红所致，预期内）；verify.log 已追加勘误注；后续落码
   改 `$ec=$?` 变量法。
3. M2 变异 unlock→还原→apply 额外一轮（受锁件写权限必需，G4 自裁⑥同型）。
4. M1 复绿=typecheck 单关卡（简报「typecheck/verify」二选一口径）。

## 六、收口计划（供门一预核时序，尚未执行）

registry 两行随迁（P7X-02 done 票 file+G5 自身 file 指向 reader/time/）+
G5 翻 done → verify 全链终跑 EXIT=0（封「已验证态≠提交态」缝，G4 P2-3
口径）→ 单提交（[locked-change][test-refactor] 双尾注，显式列文件+7 .log
add -f）→ health-scan → 账本补记 → 板回写（勾选 20→21+批次日志+READY）。

## 七、拷问清单（对抗建议入手点）

1. 逐 hunk 核零行为断言：除路径字符串外有无任何语义变化？
2. rename 相似度 95%（setup）的 4 行变化是否恰为申报的深度修正？99%
   （reading-time.ts）1 行是否恰为 re-export 深度？
3. 受锁面 3 行是否纯路径改写、零断言触碰？locks 345 恒定与 manifest 两
   sha 更新是否自洽？
4. §3.1 单向核验的反向边空证是否充分？
5. 变异红证的还原链（备份→变异→红→还原→diff identical→复绿）是否闭环？
6. 构建哈希恒等三方的时点口径是否成立（基线 build 在迁移前）？
7. 实现者自裁 4 条的处置是否妥当？
8. 有无清单外文件被触碰（含 e2e spec/配置面）？

## 附录 A：diff 全文

```diff
diff --git a/src/renderer/features/reader/ReaderPage.tsx b/src/renderer/features/reader/ReaderPage.tsx
index ffd2f0f556..0922782b85 100644
--- a/src/renderer/features/reader/ReaderPage.tsx
+++ b/src/renderer/features/reader/ReaderPage.tsx
@@ -52,8 +52,8 @@ import { useReaderSearch } from './useReaderSearch'
 import { useReaderStore } from './state/reader.store'
 import { readActiveTab, useActiveTab } from './state/useActiveTab'
 import { createReaderScrollProgress, useScrollProgressWiring } from './scroll-progress'
-import { useReaderReadingTime } from './reading-time-setup'
-import { useReadingTimeWiring } from './reading-time'
+import { useReaderReadingTime } from './time/reading-time-setup'
+import { useReadingTimeWiring } from './time/reading-time'
 import { useReaderShortcutHandlers } from './reader-shortcut-handlers'
 import { ReaderPageView } from './ReaderPageView'
 import { showToast } from '../../shared/ui/Toast'
diff --git a/src/renderer/features/reader/reading-time-outbox-store.ts b/src/renderer/features/reader/time/reading-time-outbox-store.ts
similarity index 100%
rename from src/renderer/features/reader/reading-time-outbox-store.ts
rename to src/renderer/features/reader/time/reading-time-outbox-store.ts
diff --git a/src/renderer/features/reader/reading-time-outbox.ts b/src/renderer/features/reader/time/reading-time-outbox.ts
similarity index 100%
rename from src/renderer/features/reader/reading-time-outbox.ts
rename to src/renderer/features/reader/time/reading-time-outbox.ts
diff --git a/src/renderer/features/reader/reading-time-setup.ts b/src/renderer/features/reader/time/reading-time-setup.ts
similarity index 95%
rename from src/renderer/features/reader/reading-time-setup.ts
rename to src/renderer/features/reader/time/reading-time-setup.ts
index 3a208e4e8d..fb25c37ba4 100644
--- a/src/renderer/features/reader/reading-time-setup.ts
+++ b/src/renderer/features/reader/time/reading-time-setup.ts
@@ -10,10 +10,10 @@
  * 依赖/WARN=toast 单源）在此装配，启动闸门 replayOnStart 由 main.tsx await。
  */
 import { useMemo } from 'react'
-import { api } from '../../api/client'
-import { showToast } from '../../shared/ui/toast-store'
-import { useReaderStore } from './state/reader.store'
-import type { ProgressFlusher } from './state/reader.store'
+import { api } from '../../../api/client'
+import { showToast } from '../../../shared/ui/toast-store'
+import { useReaderStore } from '../state/reader.store'
+import type { ProgressFlusher } from '../state/reader.store'
 import {
   chunkSeconds,
   createCompositeProgressFlusher,
diff --git a/src/renderer/features/reader/reading-time.ts b/src/renderer/features/reader/time/reading-time.ts
similarity index 99%
rename from src/renderer/features/reader/reading-time.ts
rename to src/renderer/features/reader/time/reading-time.ts
index 7e11cd243c..9ca2ff5f3a 100644
--- a/src/renderer/features/reader/reading-time.ts
+++ b/src/renderer/features/reader/time/reading-time.ts
@@ -58,7 +58,7 @@ import { useEffect } from 'react'
 // formatReadingTime 定义驻 renderer/shared（quality 跨 feature 关卡指定的下沉
 // 位——PaperDetailPanel 直 import shared；此处 re-export 单源转发=受锁测试
 // import 面零改，定义唯一）
-export { formatReadingTime } from '../../shared/reading-time-format'
+export { formatReadingTime } from '../../../shared/reading-time-format'
 
 /** tick 间隔：15s（票面①——READING_TICK_MS 常量单源） */
 export const READING_TICK_MS = 15_000
diff --git a/src/renderer/main.tsx b/src/renderer/main.tsx
index aa6d6bc20b..b8369a4922 100644
--- a/src/renderer/main.tsx
+++ b/src/renderer/main.tsx
@@ -1,7 +1,7 @@
 import React from 'react'
 import { createRoot } from 'react-dom/client'
 import { App } from './app/App'
-import { getReaderOutbox } from './features/reader/reading-time-setup'
+import { getReaderOutbox } from './features/reader/time/reading-time-setup'
 import './shared/theme.css'
 // [F-CSS-01] theme.css 分域拆件——import 序=原相对序（源顺序=层叠语义）：
 // token 留守件先行（@import tailwindcss+:root 必先于一切消费方），四皮肤件
diff --git a/src/renderer/shared/reading-time-format.ts b/src/renderer/shared/reading-time-format.ts
index 2fcefb5775..63332b732b 100644
--- a/src/renderer/shared/reading-time-format.ts
+++ b/src/renderer/shared/reading-time-format.ts
@@ -1,7 +1,7 @@
 /**
  * 阅读时长显示纯函数（P7E-05）——定义单源驻 renderer/shared（check-quality
  * 跨 feature 关卡指定的共享下沉位：library/PaperDetailPanel 与
- * reader/reading-time 双 feature 消费；reader/reading-time.ts re-export
+ * reader/reading-time 双 feature 消费；reader/time/reading-time.ts re-export
  * 转发=受锁测试 import 面零改）。
  */
 /** <60min「N 分钟」（按分钟取整=floor，宁少勿多）；≥60min「N 小时 M 分」 */
diff --git a/tests/unit/renderer/reading-time-outbox.test.ts b/tests/unit/renderer/reading-time-outbox.test.ts
index a0e1a2fb8e..0cc6377b38 100644
--- a/tests/unit/renderer/reading-time-outbox.test.ts
+++ b/tests/unit/renderer/reading-time-outbox.test.ts
@@ -7,12 +7,12 @@ import {
   OUTBOX_MAX_ATTEMPTS,
   type OutboxEntry,
   type OutboxStore
-} from '../../../src/renderer/features/reader/reading-time-outbox'
+} from '../../../src/renderer/features/reader/time/reading-time-outbox'
 import {
   createLocalStorageOutboxStore,
   OUTBOX_ENTRY_KEY_PREFIX,
   OUTBOX_META_KEY
-} from '../../../src/renderer/features/reader/reading-time-outbox-store'
+} from '../../../src/renderer/features/reader/time/reading-time-outbox-store'
 
 /**
  * P7X-02：reading-time-outbox 持久落盘队列锁定测试（终裁版设计书 §3 态空间
diff --git a/tests/unit/renderer/reading-time.test.ts b/tests/unit/renderer/reading-time.test.ts
index 77e45a69d9..2508fad647 100644
--- a/tests/unit/renderer/reading-time.test.ts
+++ b/tests/unit/renderer/reading-time.test.ts
@@ -6,7 +6,7 @@ import {
   READING_TICK_MS,
   type ReadingTime,
   type ReadingTimeDeps
-} from '../../../src/renderer/features/reader/reading-time'
+} from '../../../src/renderer/features/reader/time/reading-time'
 
 /**
  * P7E-05：reading-time 时长账本+复合 flusher 锁定测试。
```

（manifest.json 变更仅 3 行：generatedAt 时间戳+reading-time.test.ts/
reading-time-outbox.test.ts 两 sha256 更新——受锁重锁的正常形态。）
