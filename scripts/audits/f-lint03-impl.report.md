# F-LINT-03 实现报告（B-1 baseline 棘轮 8 组真命中收敛）

- 实现者：F-LINT-03 实现者子代理（GLM5.3flash 统一档）
- 日期：2026-09-10
- 票面：tickets/registry.ts:255（F-LINT-03，open）
- 性质：纯重构票，行为零变——值与文案一字不动，仅「声明收敛+引用名统一」

## 1. 实现摘要

B-1 baseline 棘轮登记的 8 组跨文件同值双常量全部收敛：跨域三组（『操作失败』
双名 7 文件组 / STATUS_POLL_MS / ITEM_STYLE 类名串）统一驻新件
`src/renderer/shared/ui-constants.ts`（双名退役统一 OP_FAILED、ITEM_STYLE
中性名 MENU_ITEM_STYLE）；同域三组驻域件单源（TAG_OP_FAILED→tags.store.ts
export、COLUMN_GAP_*→pdf-item-geometry.ts export、btn→annotation-style.ts
export ANNOTATION_BTN_CLASS）。baseline entries 清空（8→0）=全量关卡生效。
`npm run lint:dup-constants` 验收：零待收敛+零新增红，exit=0。

## 2. 文件清单

### 新增（2）
- `src/renderer/shared/ui-constants.ts`——跨域 UI 字面量常量单一出处
  （OP_FAILED / STATUS_POLL_MS / MENU_ITEM_STYLE，头注含消费清单）
- 本报告

### 改动（17）
| 文件 | 改动 |
| --- | --- |
| `scripts/dup-constants.baseline.json` | entries 8→[]；_comment 按主控预裁 3 文本更新 |
| `src/renderer/features/library/usePaperDetailActions.ts` | 删本地 ACTION_FAILED+注释→import OP_FAILED；引用 1 处改名 |
| `src/renderer/features/reader/AiNotesStatus.tsx` | 删本地 ACTION_FAILED/STATUS_POLL_MS→import；引用 3 处改名；头注「本域私有」声明同步 |
| `src/renderer/features/settings/ZcodeLinkSection.tsx` | 同上双常量删→import；引用 1 处改名 |
| `src/renderer/features/settings/SettingsPage.tsx` | 删本地 OP_FAILED+注释→import |
| `src/renderer/features/settings/UiScaleSection.tsx` | 同上 |
| `src/renderer/features/workspaces/WorkspaceSection.tsx` | 删裸声明→import |
| `src/renderer/features/workspaces/WorkspaceSwitcher.tsx` | 同上 |
| `src/renderer/features/tags/TagEditor.tsx` | 删本地 TAG_OP_FAILED→并入既有 tags.store import |
| `src/renderer/features/tags/tags.store.ts` | TAG_OP_FAILED export 化+单源注释 |
| `src/renderer/features/reader/annotation-anchor.ts` | 删本地两 COLUMN_GAP_*→新 import 行 from pdf-item-geometry（该文件原无此 import 故新加非并入）；头注「零环」声明同步 |
| `src/renderer/features/reader/pdf-item-geometry.ts` | 两常量 export 化+单源注释 |
| `src/renderer/features/reader/AnnotationEditor.tsx` | 删本地 btn→import ANNOTATION_BTN_CLASS as btn |
| `src/renderer/features/reader/AnnotationMenu.tsx` | 同上 |
| `src/renderer/features/reader/annotation-style.ts` | 新增 export ANNOTATION_BTN_CLASS（域单源） |
| `src/renderer/features/lineage/LineageNodeMenu.tsx` | 删本地 ITEM_STYLE→import MENU_ITEM_STYLE；引用 10 处改名 |
| `src/renderer/features/tags/TagLifecycleMenu.tsx` | 同上（含模板串 `${MENU_ITEM_STYLE} disabled:opacity-50`） |

`git diff --stat`：17 files，+49/−139——零蔓延（F-CSS-03 两个遗留未跟踪件
非本票面未触碰）。

## 3. 红证+变异索引（scripts/audits/ 下 raw 件）

| raw | 关键行 | 结论 |
| --- | --- | --- |
| `f-lint03-before.raw.txt` | 「红层 8 组 baseline 待收敛」逐组列名+文件集；exit=0 | 收敛前态在档 |
| `f-lint03-after.raw.txt` | 「红层 0 组 baseline 待收敛 / warn 2 组」；扫描 216 文件/131 声明；exit=0 | 8→0+零新增红；『操作失败』warn 组（7 声明/7 文件）随收敛消失 |
| `f-lint03-mut1.raw.txt` | `Tests 1 failed | 15 passed (16)`：zcode-link-section.test.tsx:272 断言 expected `'操作失败'` actual `'操作失败X'`，exit=1 → RESTORED-CLEAN → `Tests 16 passed`，exit=0 | 文案保真锚咬合（改一字即红） |
| `f-lint03-mut2.raw.txt` | `[红] OP_FAILED = '操作失败' 跨 2 文件（LineageNodeMenu.tsx, ui-constants.ts）——baseline 外新增`，exit=1 → RESTORED-CLEAN → 检查通过，exit=0 | baseline 清空后全量关卡咬合（回归即红） |

mut1/mut2 均用 cp 备份法（变异→红→cp 还原→diff 确认空→复绿→备份删除，
零残留）。

## 4. 测试证据

| raw | 结果 |
| --- | --- |
| `f-lint03-test.raw.txt` | `Test Files 160 passed (160)` / `Tests 1562 passed (1562)`，exit=0——与基线 160/1562 **零漂移** |
| `f-lint03-typecheck.raw.txt` | exit=0 |
| `f-lint03-quality.raw.txt` | 「dup-constants：红层 0 组、新增 0 组、warn 2 组」+「quality 检查通过」，exit=0 |
| `f-lint03-lint.raw.txt`（指令外补充） | eslint exit=0（新文件+import 面自检） |

npm run test 用 `npm run test -- <file>` 跑定向（sqlite-abi 前置保留，非裸
vitest）；全量走 `npm run test` 原样。

## 5. locks 实录

- `npm run locks:unlock` 已跑（「已解锁 310 个文件」）——**但 baseline 仍
  只读**，见 §6-1 缺陷；对 `scripts/dup-constants.baseline.json` 单文件手动
  清只读位后改写（等价 unlock 本应覆盖的动作；locks:apply 的先解锁段幂等，
  不破坏机制）。
- baseline 改动=entries 清空+_comment 更新（预裁 3 逐字）。
- **未 apply**（主控收口统一）——当前态 `locks:check` 必红（manifest 仍为
  旧 sha），属已知中间态。
- 新文件 `src/renderer/shared/ui-constants.ts` 在 src/renderer 下，不在
  lock-protected.ps1 Get-ProtectedFiles 收集面（该面=tests/src/shared/
  src/main/db/migrations/*.test/8 配置+baseline/scripts mjs+ps1），无需
  locks 动作。

## 6. 自裁申报

### 预裁 1-5 逐条照办情况
1. ui-constants.ts 三常量（OP_FAILED/STATUS_POLL_MS/MENU_ITEM_STYLE）
   ——照办；头注一段+各常量 doc 注释（语义注释从消费处搬入）。
2. 同域单源三处——照办；btn 语义一致性核对通过（两组件均为标注弹层内
   动作小按钮族=同一视觉元件）；annotation-anchor 原无 pdf-item-geometry
   import 故按预裁附注「新加 import 行」（无既有语句可并入）。
3. baseline 清空——照办（entries:[]+_comment 预裁文本逐字）；未 apply。
4. 消费文件改动形态——照办（删声明+注释搬/删+import 按各文件既有风格
   插入+引用名替换；值与文案一字不动，test 1562 全绿佐证保真）。
5. 不做面——check-dup-constants.mjs 本体零改、门审备案四件零触碰、
   tickets/registry 零触碰、git 零操作。

### 超出「搬声明+改引用名」的改动逐条列（全为注释级，行为零变）
1. AnnotationEditor/AnnotationMenu 用 `import { ANNOTATION_BTN_CLASS as
   btn }` 别名——组件内 btn 引用（5/4 处）零改动、diff 最小；预裁仅要求
   「两组件 import」未要求组件内改名（与 ACTION_FAILED→OP_FAILED 的显式
   改名要求不同）。
2. AiNotesStatus.tsx 头注行为层「轮询常量仍为本域私有——Rule of Three
   第 2 次保持重复，第 3 处出现时抽 shared」声明失效→同步为「已抽
   shared/ui-constants 与 ZcodeLinkSection 同源」（接缝归责：头注与新
   事实互斥必须改）。
3. annotation-anchor.ts 头注架构层「依赖单向……零环」声明补 type-only
   import 说明（pdf-item-geometry→本件的 PixelBox 为 type import 编译期
   擦除，值依赖单向 annotation-anchor→pdf-item-geometry，运行时零环）。
4. pdf-item-geometry.ts 原「跨件私有常量，Rule of Three 第 2 次保持重复」
   注释→更新为单源声明；annotation-anchor 本地声明处留一行断段公式语义
   注释指向单源。
5. tags.store.ts/annotation-style.ts 单源处各加一句单源注释。
6. ZcodeLinkSection 原「轮询周期（组件域私有——Rule of Three 第 2 次
   保持重复…）」注释随声明删除（语义已由 ui-constants 头注承载）。

## 7. 疑虑（供主控/门审）

1. **unlock/lock 脚本集合不对称缺陷（建议后续票）**：
   `scripts/lock-protected.ps1:21` 的 Get-ProtectedFiles 显式含
   `'scripts/dup-constants.baseline.json'`，而 `scripts/unlock-protected.ps1`
   的同构收集面没有它（只收 scripts/*.mjs/*.ps1+tests/src/shared/migrations/
   *.test/8 配置）——`npm run locks:unlock` 永远解不开 baseline 只读位。
   本次单文件手动绕行；两脚本收集逻辑重复维护，建议收敛单源或同步。两脚本
   均为受锁件，本票未动它们。
2. 过程事故两起（均已零残留还原）：①mut1 首次变异用 PowerShell
   Set-Content 写出 GBK 乱码——cp 备份即时还原（diff 空）后改用 Edit 工具
   完成变异（Windows 中文写文件工具选择教训复现实证）；②LineageNodeMenu
   一次 Edit 误吞换行——cp 备份还原后重做。
3. 中间态声明：locks 未 apply（预裁 3），`locks:check` 此刻红=已知；
   主控收口 apply 后 verify 全链预期绿（quality/typecheck/lint/test 四面
   本票已单独全绿）。

## 8. 技能清点（开工纪律留档）

- test-driven-development：用（红证+变异红证四支全落 raw）
- verification-before-completion：用（终态绿证四件+exit 真值）
- systematic-debugging：用（unlock 不生效→脚本集合对比定位根因）
- subagent-driven-development：不用（本人即实现者，无再派发）
- browser/webapp 测试类：不用（纯常量搬运零视觉面）
- git 类：不用（实现者禁 git 操作）
