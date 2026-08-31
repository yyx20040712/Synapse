# F-N1 实现者报告（三屋第一屋）——AI 笔记组内三段可折叠

- 工单：`scripts/audits/f-n1-ticket.md`（态空间表 §0+五层规约）
- 实现者开工纪律：技能清点（TDD 用/完成前验证 用/系统化调试 备而不用/其余不
  用理由见开工记录）；禁 git 提交/registry/locks 全程遵守（git 仅只读 status/diff 自查）
- 改动面：`src/renderer/features/reader/AiNoteGroupList.tsx`（唯一组件改动）
  + 新测试 `tests/unit/renderer/ai-note-collapse.test.tsx`。F-A5 面
  （selection-paint/annotation-*/AiAnnotationLayer/PagesOverlay/text-layer.css）
  零触碰；AiNotesSection 零触碰（只读核对）。

## 数字（wc）

- `src/renderer/features/reader/AiNoteGroupList.tsx`：163 行（票面预计 ~150 ✓；
  组件红线 ≤250 ✓）
- `tests/unit/renderer/ai-note-collapse.test.tsx`：133 行（新合约，always-active）
- diff：AiNoteGroupList +99/-40（git diff --stat，单文件）；无范围蔓延

## TDD 证据链

1. **基线**：定向 ai-notes-section(24)+ai-note-style(3)=27 绿 @HEAD；
   全仓基线=票面口径 1002（+本工单新 5=1007）。
2. **红**：新测试 ①~⑤ 对 HEAD（无折叠器）**5/5 红**（①④⑤ 直接红；
   ② 经 aria-expanded 缺失红、③ 经条目未隐藏红——票面"②③依赖①"实证）。
3. **绿**：实现后新测试 5/5 绿；typecheck 双 project 绿；lint（全仓）绿。
4. **变异红证**（cp 一次性备份→变异→红→cp 还原→diff 确认空，未用 git checkout）：

| 变异 | 操作 | 红证 | 还原 |
| --- | --- | --- | --- |
| M1 摘默认折叠 | 一审/二审默认 true | ①②③ 红（3/5 failed） | diff 空 ✓ |
| M2 摘 toggle | onClick 置 no-op | ② 红（③结构性依赖②为假绿——同票面"②③依赖①"预知型） | diff 空 ✓ |
| M3 摘条数 | 段头去 `(N)` | ④ 红 | diff 空 ✓ |

5. **终态复跑**：全量 `npm run test`=**1004 绿 / 3 红（1007）**；grep
   TODO/FIXME/placeholder 两文件 0 命中。

## ⚠ 卡点报告：受锁旧约互斥（需主控 [locked-change] 裁决，实现者未动测试）

3 红**全部**在受锁文件 `tests/unit/renderer/ai-notes-section.test.tsx`，均为
**旧契约「一审/二审条目默认在 DOM 可查/可点」**与新契约①「默认不在 DOM」的
直接互斥（宪法"接缝归责：两处声明互斥即停下报告，不得顺手改一侧"）：

1. `分节分组：question 组按 AI_NOTE_QUESTIONS 序呈现…`（L399）——断言 Q1 组
   items `['a1'(一审),'b1'(二审)]` 在 DOM → 得 `[]`。
2. `组内 role 标签：同 question 组内三 role 条目头呈现一审/二审/裁决`（L467）
   ——断言 `['a1','b1','c1']` 全在 DOM → 得 `['c1']`。
3. `条目单击→locateAnchor…`（L510）——对折叠中的一审条目 `null.click()` 抛错。

实现面无缺陷（新合约 5/5 绿+变异红证完整）；处置建议：三例改走
[locked-change]（先展开对应段头再断言/点击，或改断言裁决段条目），e2e
`tests/e2e/ai-notes-section.spec.ts` L134-135 `groupedItems.first()` 含
「一审」同受影响（未跑——超本工单验证面，收口前需全量 verify+e2e 复核）。

## 实现摘录（票面映射）

- `ROLE_DEFAULT_EXPANDED`：一审/二审 false、裁决 true（§0 态空间表）；
- `RoleSection` 子组件：段头 button（`data-role-section`+`aria-expanded`+▾/▸
  aria-hidden 文本图标+「一审(3)」条数）+条件渲染条目（条目 JSX 自原位逐字
  迁移，渲染逻辑零变）；无该段数据 return null 不渲染段头（⑤）；
- 折叠 state=组件内 useState per 段，不持久化；组 key 掺 `paperId`
  （`notes[0]?.paperId ?? ''`）→ 换文献重挂载回默认（§4）；
- 已知边缘（票面外观察，未扩面）：高亮滚动 effect 对折叠段条目 no-op
  （querySelector null→`el?.` 短路，不自动展开）。

## git status 全贴（diff 自查）

```
 M locks/manifest.json            <- 开工前既有（受锁解锁面，非本工单；首查已在）
 M src/renderer/features/reader/AiNoteGroupList.tsx   <- 本工单唯一 src 改动
?? scripts/audits/f-n1-mut-backup-AiNoteGroupList.tsx <- 变异备份（还原 diff 已证空）
?? scripts/audits/f-n1-ticket.md
?? tests/unit/renderer/ai-note-collapse.test.tsx      <- 新合约测试
（其余 f-a4/f-a5/f-l4/f-sw1/f1-out 审计产物为同场他工单，零触碰）
```

## 成本

- 子代理 token：约 6.5 万（输入累计）/ 约 1.1 万输出（估算口径）
- 墙钟：约 45 分钟；工具调用 18 次
- 验证命令：定向 vitest×6、全量 `npm run test`×2、typecheck×2、lint×2（全部真退出码）

---

# 追加段：受锁改向（主控裁决后 [locked-change] 执行）

- 裁决：主控 2026-08-31——「用户令一审二审默认折叠=新契约，受锁旧断言过时，
  按『语义随令非让过』先例授权改向」；红线不变（禁 git/registry/locks 遵守全程）。
- 改动面：`tests/unit/renderer/ai-notes-section.test.tsx`（3 例+头注行，536→562 行）
  + `tests/e2e/ai-notes-section.spec.ts`（2 处最小改+头注行，231→242 行）。

## 逐例改前/改后断言对照

### 单测 1「分节分组：question 组按 AI_NOTE_QUESTIONS 序呈现…」
- 改前：`q1Items=groups[0].querySelectorAll('[data-ai-note-id]')` 直接断言
  `toEqual(['a1','b1'])`（默认全可见）。
- 改后：先断言**默认折叠**（`a1/b1` 不在 DOM）+**段头在**
  （`button[data-role-section="first-read"/"second-read"]` 非 null）→`act` 点两段头
  →同序断言 `toEqual(['a1','b1'])`+一审/二审标签+色点（排序/标签/色点意图原样）。

### 单测 2「组内 role 标签：同 question 组内三 role 条目头呈现一审/二审/裁决」
- 改前：`items=groups[0].querySelectorAll(...)` 直接断言 `['a1','b1','c1']`。
- 改后：先断言 `a1/b1` 默认不在 DOM、`c1`（裁决 expanded）在 →点两段头→
  同序断言 `['a1','b1','c1']`+三 role 标签（role 可辨+role 序意图原样）。

### 单测 3「条目单击→locateAnchor（INV-20 消费方级）」
- 改前：mount 后直接 `querySelector('[data-ai-note-id="a1"]').click()`。
- 改后：先断言 `a1` 默认不在 DOM→点一审段头展开→再 `click()`→
  `locateAnchor` 参数断言逐字未动。

### e2e 测 1（SR2-AI-08 全链，L131 后）
- 改前：`groupedItems.first()).toContainText('一审')` 直接断言（默认全可见）。
- 改后：插入 3 行最小改——`button[data-role-section="first-read"]` 可见→
  `click()` 展开→原断言链逐字不动（展开后 Q1 一审在前、divergence 裁决在后，
  序与原断言一致）。

### e2e 测 2（SR2-AI-09 渲染层，toast 断言后）
- 改前：点击 AI 高亮块后直接断言面板 `[data-highlight="true"]` 条目可见——
  该条目属一审段，默认折叠后不在 DOM（**主控指令未列此例，实现者同场发现
  同向补改**）。
- 改后：导入 toast 断言后插入同款 3 行段头展开，后续断言链逐字不动。

两文件头注均加一行「F-N1 用户令改向（[locked-change]，2026-08-31）」标记。

## 改向后验证统计

- 定向：ai-note-collapse(5)+ai-notes-section(24)+ai-note-style(3)=**32/32 绿**。
- 全量 `npm run test`：**119 文件 / 1007 测试全绿**（主控预期命中）。
- `npm run typecheck`：双 project 绿（含改后测试文件——tsc 关卡兑现 AGENTS
  「playwright esbuild 不查类型」教训）。
- `npm run build`：绿（exit 0）。
- `npm run verify` 全链实测：quality ✓ / tickets ✓ / **locks:check ✗ 链在此止**：
  6 项未过=3 个他场未登记（f-a5-diag.mjs、f-sw1-probe.mjs、f-sw1-probe2.mjs）
  +本工单 2 处受锁改向与 1 个新测试待登记——manifest 重锁=收口单职权
  （实现者禁 locks 命令，未动）；**lint ✗=1 error 在 f-a5-diag.mjs（F-A5 面，
  非本工单）**，本工单 3 文件定向 eslint 全净。链上其余节（lint 外）已逐一
  亲验真退出码补全如上。

## 环境事故与执行边界记录

- **ABI 争用**：12:06 前后两连 EBUSY——并发会话切 `build/Release` 至
  electron-v146 侧并持句柄，`sqlite-abi use node` 拷贝失败；进程面释放后退避
  重试通过（md5 比对归因存档：部署侧=b059…=electron-v146）。
- **e2e 未执行**：主控验证面=`npm run test`+`npm run verify`（已全做）；
  `test:e2e` 需拉起真 Electron 窗口（前台焦点保护红线），留收口单/门二执行，
  本工单以 tsc 关卡+断言锚逐字不动控制 e2e 风险面。
- 终态 git 面：`M AiNoteGroupList.tsx / M tests/e2e/ai-notes-section.spec.ts /
  M tests/unit/renderer/ai-notes-section.test.tsx / ?? tests/unit/renderer/
  ai-note-collapse.test.tsx`（+报告/票面/变异备份），diff --stat=
  141 insertions / 43 deletions；grep TODO/FIXME/placeholder 三文件 0 命中。

## 成本（追加段）

- 追加 token：约 4 万输入 / 0.9 万输出（估算）；墙钟约 25 分钟；工具调用 14 次
- 验证命令：定向×3、全量 test、verify 全链、typecheck、lint×2、build（全部真退出码）

---

# 追加段 2：门一 B1 必修回炉（高亮自动展开）

- 裁决：门一 deepseek 合并审 F-N1 有条件放行+B1 必修——「点 AI 高亮块=最强
  『需要核对』信号，折叠段必须自动展开，不接受手动展开」。
- 处置：`highlightAiNoteId` 命中条目在折叠段→effect 先 setState 展开该段
  →`overrides` 入 effect deps 复跑→滚动定位（`scrollIntoView`）+既有
  `data-highlight` 高亮闪烁。**边界申报（裁决原文）**：面板未打开时不自动
  开面板（开面板归 OutlineAside/宿主既有信号链，本组件只在已挂载面板内生效）。
- 结构变化：折叠态上提 AiNoteGroupList 受控（`overrides:
  Partial<Record<"${question}:${role}", boolean>>`，缺省回落
  ROLE_DEFAULT_EXPANDED——默认态单源不裂）；RoleSection 改受控 props
  （expanded/onToggle）；`scrolledForRef` 信号去重=「一次信号一滚」——
  保「notes 更新不重滚」原不变量+用户随后手动收起不与之拉锯（去重后
  effect 短路，不回弹）。组件 163→**197 行**（≤250 ✓）。

## B1 测试证据

- 新增 ⑥（ai-note-collapse.test.tsx，159 行）：折叠态挂载→信号
  `highlightAiNoteId="a1"` 重渲→断言 ①段自动展开（aria-expanded 真）
  ②**滚的是目标条目**（scrollIntoView 挂桩记录 this 的 data-ai-note-id
  =['a1']——jsdom 无 scrollIntoView，直挂原型桩+finally 还原，无跨测污染）
  ③data-highlight="true"。对实现前 HEAD 红 → 实现后绿。
- 变异 M4（摘自动展开：setOverrides 调用置 void）：⑥红（条目不在 DOM+
  无滚动）→cp 还原 diff 空（新备份 f-n1-b1-backup-AiNoteGroupList.tsx，
  未用 git checkout）→回绿。M1~M3 复验不受 B1 结构变化影响（①~⑤ 绿）。
- lint 修一次自伤：⑥初版用 vi.spyOn（jsdom 无该属性直接抛错）改直挂桩后
  残留未用 `vi` 导入——eslint 拦截（no-unused-vars）→移除→净。

## B1 后验证统计

- 定向：ai-note-collapse(6)+ai-notes-section(24)+ai-note-style(3)=33/33 绿；
  （vi 导入移除后复跑 30/30 两文件面）
- 全量 `npm run test`：**1018/1018 全绿**（1007→1018：本工单 +1=⑥；
  余 +10=同场他工单并发新增测试，全绿无归因问题）
- `npm run typecheck` 双 project 绿；本工单 2 文件定向 eslint 净
  （全仓 lint 仍有 f-a5-diag.mjs 他场 1 error，与本工单无关——见追加段 1）
- grep TODO/FIXME/placeholder：两文件 0 命中

## 成本（追加段 2）

- 追加 token：约 3.5 万输入 / 0.8 万输出（估算）；墙钟约 20 分钟；工具调用 12 次


