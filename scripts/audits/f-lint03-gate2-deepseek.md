[routing]: run=20260909233719-ojns source=deepseek model=deepseek-v4-flash switches=0 usage=in=12694,out=4810 latency=40167ms (by ds-call.mjs 链)

# 门二终审报告：F-LINT-03

## ① 处置核对

### 门一两轮条目逐条 vs 终态

| 条目 | 门一终轮处置 | 本审核对 | 结论 |
|---|---|---|---|
| B-1 | 闭合（降N） | ui-constants.ts 新件全文已在材料三内联，三常量值可独立核验。**但 sha/哈希锚定仍缺席**——"此即实际落盘件"仅是主控陈述，无 raw 可证。门一明确将此列为残留声明。 | **维持闭合，但machine面（见④）无法终结** |
| W-1 | 降级为条件N | 门二工单明确"raw 时序=本审后 apply→verify→提交"——**apply 后绿态 raw 在本审前不存在**，[locked-change] 尾注不存在。条件项的兑现路径是时序性的，本审无法在此刻核对实物。 | **条件成立，转收口执行** |
| W-2 | 维持知悉 | AnnotationEditor.tsx:15 `import { ANNOTATION_BTN_CLASS as btn }` 确认。 | 知悉残留 |
| W-3 | 闭合 | 材料二给出四文件完全同构上下文（SettingsPage:59/UiScaleSection:49/WorkspaceSection:52/WorkspaceSwitcher:56），全部为 `e instanceof ApiClientError ? e.message : OP_FAILED`。 | **闭合确认** |
| W-4 | 闭合 | 新件全文已在材料三内联，且门二工单要求"正常 add 入库"——但**此刻无法核验 git 状态**（本审禁 git）。 | 闭合，收口核 add 状态 |
| N-1（首轮） | 口径澄清 | 8组=跨域3组入新件+同域5组驻域件，与实现者报告 §2 对账一致（见②）。 | 确认 |
| N-2（首轮） | import深度核验 | 见④机器面。 | 确认 |
| N-1（终轮新增） | 8→0逻辑可通 | 见④机器面。 | 确认 |
| N-2（终轮新增） | import路径不确定 | 见④机器面。 | **有残余不确定** |
| N-3（终轮新增） | W-2维持 | 同上W-2。 | 知悉 |

### "说了没改"hunting

- **门一终轮条件2**（[locked-change] 尾注）：材料四 §5 明言"未 apply"且无提交尾注证据。**非失实**——实现者如实申报，门二收口后执行。
- **门一终轮条件3**（ui-constants.ts 正常 add+旧名 grep=0+chmod 痕迹）：材料五称旧名 grep=0（仅注释历史说明），但**add 状态与 chmod 痕迹在本审材料中无 raw 支撑**——非失实（实现者禁 git 操作已申报），但收口必须核。
- **实现者报告 §5 vs 实际 diff**：报告称"对 baseline 单文件手动清只读位后改写"——diff 显示 baseline entries 8→[] 与 _comment 更新，**与申报一致**。未 apply 状态与 locks:check 必红的中间态声明在档。
- **实现者报告 §2 文件清单17件 vs 材料三 diff 文件数**：17个tracked diff 与新件全文，**逐一核验一致**（16消费/单源件+baseline=17，新件untracked故不在diff——口径已由门一W-4澄清）。

### 放行附条件三项的落实路径

门一的时序方案（本审毕→locks:apply→verify→提交）逻辑自洽——门审先于棘轮更新符合锁设计。**但存在一个执行顺序缺口**：收口第1步是 `locks:apply`（含chmod +w baseline），而实现者报告 §5 已披露 unlock/lock 集合不对称缺陷——apply 阶段若依赖 unlock 的幂等先解锁段（报告称"等价unlock本应覆盖的动作"），则该缺陷可能再次导致 baseline 无法解除只读。**报告 §6-1 明确说"locks:apply 的先解锁段幂等，不破坏机制"——但这仅是对手动改写后状态的断言，未证明 apply 本身的解锁集合覆盖 baseline**。收口时若 apply 内部实现与 unlock-protected.ps1 同构（不含 baseline），则 apply 可能无法完成——**此点需收口执行者在 apply 失败时知晓：已申报缺陷，非本票实现问题，但需手动绕行方案预备**。

**核对结论**：无"说了没改"失实。实现者报告与材料三/四/五逐条对账无矛盾。条件三项中只有第1项（apply后绿态raw）是时序性不可提前核验，其余项均需收口执行确认。

---

## ② 母本符合度

### 票面 8 组 vs diff 实际收敛

| 组 | 票面布局 | diff 实际 | 符合 |
|---|---|---|---|
| ACTION_FAILED×3 + OP_FAILED×4 → OP_FAILED 统一 | 跨域→shared 新件 | ✓（library/AiNotesStatus/ZcodeLinkSection/SettingsPage/UiScaleSection/WorkspaceSection/WorkspaceSwitcher 七文件全部改 import，本地声明删净） | **7 个消费点全收敛** |
| STATUS_POLL_MS | 跨域→shared 新件 | ✓（AiNotesStatus+ZcodeLinkSection 两文件 import） | 2 点全收敛 |
| ITEM_STYLE | 跨域→shared 新件 | ✓（LineageNodeMenu+TagLifecycleMenu 两文件 import MENU_ITEM_STYLE） | 2 点全收敛 |
| TAG_OP_FAILED | tags.store.ts | ✓（tags.store export + TagEditor import） | 2 点收敛 |
| COLUMN_GAP_H_FACTOR / COLUMN_GAP_PAGE_RATIO | pdf-item-geometry.ts | ✓（pdf-item-geometry export + annotation-anchor import 行） | 2 点收敛 |
| btn → ANNOTATION_BTN_CLASS | annotation-style.ts | ✓（annotation-style export + AnnotationEditor/AnnotationMenu import as btn） | 2 点收敛 |

**8组映射 vs 实际收敛：全部吻合，无一偏离**。

### 实现者报告 §2 与 diff 文件级对账

报告改动 17 文件逐一与材料三 diff 对账：
- baseline.json → 有 diff，entries 8→[]，_comment 更新 ✓
- 上述16个消费/单源件 → 各文件 diff 与报告描述一致（删本地声明+import+引用改名）✓

**报告 §2 与材料三零冲突**。报告称"含模板串 `${MENU_ITEM_STYLE} disabled:opacity-50`"与 TagLifecycleMenu.tsx diff 第62行一致 ✓。

### 值零变核验（核心：纯重构票）

从 diff 提取的**每一处值**与 baseline 指纹逐字对照：

| 常量 | baseline 值 | 新件/域件值 | diff 消费点引用 | 零变 |
|---|---|---|---|---|
| OP_FAILED | '操作失败' | '操作失败' | 各文件 showToast 第三参 'error' 未动 | ✓ |
| STATUS_POLL_MS | 5000 | 5000 | 无其他数字形态引用可漂移 | ✓ |
| MENU_ITEM_STYLE | 'block w-full rounded px-3 py-1.5 text-left text-xs hover:bg-black/5' | 同串 | TagLifecycleMenu 模板串 `${MENU_ITEM_STYLE} disabled:opacity-50` 与旧 `${ITEM_STYLE} disabled:opacity-50` 等价 | ✓ |
| TAG_OP_FAILED | '标签操作失败' | 同 | TagEditor 无其他引用 | ✓ |
| COLUMN_GAP_H_FACTOR | 1.5 | 1.5 | 注释描述"max(1.5×主导矩形高, 页宽 2%)"与公式一致 | ✓ |
| COLUMN_GAP_PAGE_RATIO | 0.02 | 0.02 | 同上注释"页宽 2%" | ✓ |
| ANNOTATION_BTN_CLASS | 'rounded border px-2 py-0.5 text-xs disabled:opacity-50' | 同串 | 组件内 btn 引用替换为别名 | ✓ |

**值零变成立。无一处值的字面变化**。

---

## ③ 宪法红线

### 1. 分层单向

- **组件→store**：TagEditor.tsx:23 `import { useTagsStore, TAG_OP_FAILED } from './tags.store'`——tags.store.ts 是否 import TagEditor？从 diff 上下文看 tags.store 仅有 export 化，无新增 import 反向。**但本审看不到 tags.store.ts 全文**，无法排除 tags.store 已存在的对 TagEditor 反向依赖（理论上若存在则 TagEditor 同时 import tags.store + tags.store import TagEditor 会形成环——不过此环若在收敛前就存在则非本票引入）。**不确定但非本票新增风险**。

- **annotation-anchor → pdf-item-geometry**：annotation-anchor.ts:51 新 import COLUMN_GAP_* from './pdf-item-geometry'。反向：pdf-item-geometry.ts 是否有对 annotation-anchor 的 import？报告自述"其对 PixelBox 为 type-only import 编译期擦除"——**pdf-item-geometry 对 annotation-anchor 的依赖是 type-only，编译期擦除后运行时值依赖单向**。但注意：annotation-anchor.ts 对 pdf-item-geometry 是**值依赖**（COLUMN_GAP_* 是运行时值），pdf-item-geometry 对 annotation-anchor 是 **type-only 依赖**。若 type-only import 被编译器擦除，运行时确无环。**此论断依赖头注陈述，本审无 raw 可证"编译器确实擦了"**——typecheck exit=0 只能证明类型层面可解析，不能证明运行时无环（但 JS 运行时若 type import 被正确擦除，则物理上不可能有环）。残余不确定，入 N。

- **跨域组件（Settings/Workspace/Library）→ shared/ui-constants**：shared/ui-constants.ts 是纯常量文件，无对 features 的 import（从全文看只有 export 语句）——**无环风险**。

### 2. baseline 受锁 [locked-change] 叙事

- baseline 在 lock-protected 面内（lock-protected.ps1 显式含 baseline，报告 §6-1 自证），改动已发生但未 apply——**叙事是"已知中间态，待收口正式提交"**。
- 门一终轮条件2要求收口提交尾注 [locked-change]——**此刻不存在提交**，无法核验。
- 补充审查：baseline _comment 新文本说"8 组全收敛 entries 清空=全量关卡生效"——**语义清晰，与新状态一致**。

### 3. 行数 / UTF-8 / TDD 证据链

- **行数**：报告称 git diff --stat +49/−139——材料三 diff 的加减行数可粗核：baseline 删 78 行加 2 行（entries+comment 重写），各消费文件删多增少（每文件删1-3行声明+加1 import+若干引用改名），总量级吻合 +49/−139。**无蔓延**（新增文件 ui-constants.ts 约 40 行不计入 diff stat 的 untracked——但报告说的17 files tracked diff 中不含它，口径一致）。
- **UTF-8**：材料三 diff 中中文文案在 context 行中显示正常（如"'操作失败X'"、"'标签操作失败'"），无乱码痕迹。但报告 §7-2 自曝 mut1 首轮变异时 Set-Content 写出 GBK 乱码——**已被 cp 还原+Edit 工具重做，且 diff 中无乱码残留可证**。零残留声明与 diff 实证一致。
- **TDD 证据链**：材料四 §3 给出四支 raw——before（红层8组）/after（8→0）/mut1（文案锚咬合 exit=1→RESTORED-CLEAN）/mut2（baseline外新增即红 exit=1→RESTORED-CLEAN）。**本审无法打开 raw 实物**（材料只有摘要），但：
  - mut1 的失败断言"expected '操作失败' actual '操作失败X'"与"改一字即红"的变异逻辑自洽；
  - mut2 的"OP_FAILED = '操作失败' 跨 2 文件（LineageNodeMenu.tsx, ui-constants.ts）——baseline 外新增"与清空后全量关卡生效的判据自洽（baseline entries 为空，任何新命中=红）；
  - **但 mut2 的变异设计本身有瑕疵**：向 LineageNodeMenu.tsx 注入 OP_FAILED 常量制造跨文件重复——这测试的是"扫描器能将新增重复标红"，并非测试"某文件若漏收敛会被标红"。变异目标与真实风险面（漏改一个消费点）不完全对齐。**逻辑可通，测试盲区存在但低风险**——漏改消费点会直接导致 lint:dup-constants 扫描时该文件仍有本地声明且无对应单源 import（或旧名残留），同样红。不阻断。

---

## ④ 机器面核对

### 1562 零漂移数理

报告称 test 160文件/1562用例 与基线零漂移。核对材料五："test 160 文件/1562 用例与基线零漂移 exit=0"。**数理自洽**：纯重构（删声明+改 import+改名引用）若值未变，测试不应失败——但测试可能断言了 import 路径或常量名（若测试直接引用本地声明则删声明会挂）。报告 §3 mut1 显示 zcode-link-section.test.tsx:272 断言的是 toast 文案 '操作失败' 而非常量名——**文案锚直锁文本，与重构方式正交**。但其余 1561 个用例是否可能断言了常量名或 import 路径？**本审无 raw 可查**。不过：1562 全绿 + typecheck 全绿，若测试断言了已删的本地声明（如 `import { ACTION_FAILED } from ...`），typecheck 必然失败——typecheck exit=0 间接证明了无测试文件引用已删声明。**此逻辑链成立**。

### 8→0 与 baseline entries[]

- 材料四 after.raw 称"红层 0 组 baseline 待收敛 / warn 2 组"。8→0 的含义：baseline entries 从 8 组变为 []，扫描器将当前代码与 entries 比对——entries 为空则无"待收敛"项。**逻辑自洽**。
- warn 2 组：报告未展开 warn 内容，但材料五称"warn 2 组不卡 CI"。**warn 是什么？** 首轮材料未见 warn 基线数据。若 warn 组原本是 2 组（如 Rule of Three 第 2 次重复的提示），8 组收敛后 warn 仍 2 组——可能 warn 面与 baseline 红层无关。**但此处存疑**：若 warn 2 组包含与本次收敛相关的常量（如 ActionFailed 类的双文件重复），为何收敛后 warn 仍 2 组？——报告称"『操作失败』warn 组（7 声明/7 文件）随收敛消失"，说明 warn 的『操作失败』组确实消失了；那剩余的 warn 2 组是什么？**本审无法从材料推断**。可能是无关的已有 warn（如其他 Rule of Three 候补）。不影响放行但留记录。

### mut2 判据一致性

mut2 注入 OP_FAILED 至 LineageNodeMenu.tsx + ui-constants.ts，被标红——判据是"baseline entries 已空，任何扫描到的红层新命中即违规"。**与 _comment"新命中即红"一致**。✓

### typecheck 对 import 路径的实证性

- **N-2（终轮）import 深度问题**：材料二疑虑四文件是否全为两级深度。从材料三 diff 看：SettingsPage.tsx:26 `import { OP_FAILED } from '../../shared/ui-constants'`——SettingsPage 路径为 `src/renderer/features/settings/`，向上两级到 `src/renderer/`，再进 shared/——**两级结构正确**。UiScaleSection、WorkspaceSection、WorkspaceSwitcher 同路径同理（均在 features/<域>/ 一级子目录）。从 diff 上下文看，这些文件的既有 import（如 `from '../../shared/ui/Toast'`）也用同深度 `../../`——**同构性由既有代码佐证**。typecheck exit=0 进一步实证：若路径错误，TS 无法解析模块会报错。**N-2 闭合**。
- **ui-constants.ts 本身的 import 路径**：新件无 import，纯 export——路径解析无风险。✓

### 新材料中发现的机器面疑点

**N-A（新）：SettingsPage/UiScaleSection/WorkspaceSection/WorkspaceSwitcher 四文件的消费点核验**。材料三 diff 只显示删本地声明+加 import，**没有显示这四个文件中 OP_FAILED 的实际引用行 diff**——因为引用名未变（本地声明就叫 OP_FAILED），改名只影响声明/import 行。但 W-3（首轮）已被门一补证闭合：补证二给出四文件消费上下文完全同构（`e instanceof ApiClientError ? e.message : OP_FAILED`）。**本审无该补证的 raw 内联**（材料二仅录结论），但材料二结论 + 材料三 import 行位置 + typecheck 全绿——四个文件删了本地 OP_FAILED 声明后若存在**未改的引用**（如某处用了 `OP_FAILED.something` 或字符串拼接），typecheck 必然挂。**闭合**。

**N-B（新）：AnnotationEditor/AnnotationMenu 的 btn 裸引用与别名遮蔽**。`import { ANNOTATION_BTN_CLASS as btn }` 后组件内仍用 `btn`——若组件内某处误用 `btn.foo`（btn 是字符串不该有属性），typecheck 会报。typecheck exit=0 证明无此误用。W-2 知悉项，无新风险。

---

## ⑤ 总结论

| 维度 | 结论 |
|---|---|
| 处置核对 | **无失实**。门一两轮 B/W/N 逐条对账完成，条件项 3 项中 1 项（绿态 raw）为时序性待执行，其余项均可在收口核验。 |
| 母本符合度 | **8 组全部吻合**。值与文案逐字零变，消费点引用与本地声明退役一一对应。 |
| 宪法红线 | 分层单向无新增值环；baseline 受锁叙事成立（中间态在档）；行数/UTF-8/TDD 证据链自洽无断裂。 |
| 机器面 | 1562 零漂移逻辑链成立；8→0 与 entries[] 自洽；mut2 判据一致；import 深度由 diff 佐证+typecheck 实证。 |
| 残留知悉 | ① sha/哈希锚定缺席（门一已声明）；② mut2 变异设计未对"漏改消费点"直接测试；③ warn 2 组内容未展开；④ unlock/lock 不对称缺陷对收口 apply 的影响需预备手动绕行。 |

### 判决：**放行，待收口执行**

门一"放行附条件三项"的**代码面条件已全部满足**（本审可证范围内），剩余为**时序性收口动作**——本审无法在此刻核验 apply 后绿态 raw 与 [locked-change] 提交尾注，因它们在本审之后才产生。

**收口必核清单**（执行者须逐项在收口记录中留下 raw/命令证据）：
1. `locks:apply` 执行（若因 unlock/lock 不对称缺陷失败，手动 chmod +w 后重试，并在收口记录注明）；
2. `npm run verify` 全链绿 raw（含 locks:check 311 / lint / typecheck / test 1562 / build）；
3. 提交尾注含 [locked-change]；
4. `ui-constants.ts` 以正常 add 入库（非 intent-to-add 残留）；
5. 旧名 grep=0（ACTION_FAILED/ITEM_STYLE/裸 btn 本地声明——注释历史除外）；
6. `f-lint03-closeout-verify.raw.txt` 证据件落盘 audits 目录。

**缺失任一 → 回炉**。本终审报告入档 F-LINT-03 门二终审。