[routing]: run=20260909233217-frs4 source=kimi-main model=kimi-k3 switches=0 usage=in=8953,out=4308 latency=129592ms (by ds-call.mjs 链)

门一对抗深审报告（仅读本文件；不执行 npm/test/git/仓库）

[B-1] 新单源 `src/renderer/shared/ui-constants.ts` 全量缺席于“全部代码改动 diff”，OP_FAILED/STATUS_POLL_MS/MENU_ITEM_STYLE 的值、导出形态、头注均不可独立核验；而这正是『操作失败』7 处、轮询 2 处、菜单类名 2 处的命根。终态绿证只能旁证存在，不能证明值一字未动。  
证据：材料三无 `diff --git a/src/renderer/shared/ui-constants.ts`；材料四 §2 却列“新增 ui-constants.ts”，且 §2 称 `git diff --stat`=17 files。

[W-1] baseline 已改但受锁闭环未证：票面要求 baseline [locked-change]，本包只见 entries 清空，不见 apply 后绿态/提交尾注；实现者自报“未 apply、locks:check 此刻红”。主控预裁接受绕行，故不定 B，收口必须补证。  
证据：baseline diff entries 8→[]；材料四 §5「未 apply…当前态 locks:check 必红」。

[W-2] btn 组采用 `import { ANNOTATION_BTN_CLASS as btn }`，组件内仍用裸 `btn`；单源值收敛成立，但消费点名未统一到票面新名，后续肉眼/检索仍以局部别名 `btn` 为锚，弱于 ACTION_FAILED→OP_FAILED 的显式改名纪律。实现者已披露“预裁未要求组件内改名”，可接受但建议收口确认。  
证据：AnnotationEditor.tsx @@ -14,0 +15 / AnnotationMenu.tsx @@ -41,2 +41 @@：`ANNOTATION_BTN_CLASS as btn`。

[W-3] 『操作失败』语义一致性只被部分证明：library/reader/settings-zcode 三处 diff 明确是 `ApiClientError ? e.message : ...` 兜底；SettingsPage/UiScale/WorkspaceSection/WorkspaceSwitcher 因同名 OP_FAILED 无引用行 diff，U0 下看不到全部消费上下文，不能排除同文案不同语义被并入。不确定，需补 4 文件使用点上下文。  
证据：SettingsPage/UiScale/WorkspaceSection/WorkspaceSwitcher diff 仅见 `import { OP_FAILED }` 与删本地 `const OP_FAILED`，无 showToast 上下文行。

[W-4] 报告“全部代码改动 diff”与新增件口径冲突：材料三标“全部”，但新增 ui-constants.ts、报告本体不在 diff；若因 untracked 未入 `git diff --stat` 则可解释，但审查包内应内联新件，否则 B-1 永远不可独立复核。  
证据：材料四 §2「新增（2）ui-constants.ts/本报告」「改动（17）」；材料三仅 17 个 tracked diff。

[N-1] 8 组映射与票面布局一致：跨域三组进 shared；TAG_OP_FAILED 驻 tags.store；COLUMN_GAP_* 驻 pdf-item-geometry 且 annotation-anchor 改 import；ANNOTATION_BTN_CLASS 驻 annotation-style。未见多余业务文件改动。  
证据：diff 覆盖 baseline+16 消费/单源件；annotation-anchor @@ -48,0 +51 新 import，pdf-item-geometry @@ -312,4 改 export。

[N-2] 分层/环依赖未见新红线：组件→store 为 TagEditor 并入既有 `tags.store` import；annotation-anchor→pdf-item-geometry 为值依赖，反向 PixelBox 自述 type-only 擦除。该点依赖头注陈述，未全证但无反证。  
证据：TagEditor @@ -23,4 并入 `useTagsStore, TAG_OP_FAILED`；annotation-anchor 头注改「type-only import 编译期擦除」。

[N-3] 棘轮机制保留且清空=全量生效的逻辑自洽；mut2 叙述与“baseline 外新增即红”的判据一致，属有效咬合证据链（raw 未内联全量，按摘要采信为低风险）。  
证据：baseline `_comment` 改「entries 清空=全量关卡生效」；材料四 §3 mut2 「baseline 外新增，exit=1→RESTORED-CLEAN」。

统计：B=1，W=4，N=3。  
总评：建议「暂缓放行/小回炉补证」而非推翻实现。核心不是已证行为变异，而是中央新件 ui-constants.ts 缺席导致“值一字不动”无法在本包内闭环；补齐该件 diff/全文、4 个 OP_FAILED 同名文件消费上下文、locks apply 与 [locked-change] 尾注后，B-1/W-1/W-3 可降级。若主控能当庭出示 ui-constants.ts 内容与 apply 后全链绿证，本票可转放行；unlock/lock 不对称按预裁 4 另案，不卡本票。