# 2026-08-28 复测三问题交接文档——取证定性+修法规划+新会话开工书

> 定位：验收修复役（六票，HEAD 基线 e513788+交接书）用户复测反馈：
> 测试 2（D 被引数）✅ 测试 5（E1+M1 分叉树+边标注）✅——**两单元终验通过**；
> 测试 1/3/4 各暴露一问题。本会话（复测分析）已完成三问题**代码级取证定性**
> （只读，零代码改动，取证代理 ≈1.16M tok/9.6min），本文档=修复规划书+
> 下一会话开工书。新会话从 §1 开工自检开始，按 §3 顺序执行。
> 纪律总纲：全部走三屋模式，每单元独立提交；本会话结论是假设的高置信
> 形态，票面化时实现者仍须自证。

## 1. 开工自检（新会话第一动作）

1. 技能清点（宪法硬规则）：systematic-debugging / TDD /
   verification-before-completion / subagent-driven-development 按单元加载；
   纯文档环节标「不用+理由」。配置自查随清点。
2. 环境铁律：node24 前缀
   `export PATH="/e/class/智慧水务/tools/node24:$PATH" && ...`（默认 v25 假红源）。
   **Git Bash 回显乱码教训**：回显中文乱码≠存储损坏（GBK 显示链假象），
   判定必须字节级（node utf8 decode）——见 fix-campaign-handoff §6.1。
3. 基线（开工自检锚）：HEAD=本文档提交；`npm run verify`=**95 文件 741 用例
   / locks 144 / 工单 116 open 0**；e2e=**24 passed+0 skip**。偏差先对账。
4. dev 应用：上会话已 `npm run dev` 启动（用户测试中）；重启无碍。

## 2. 复测三问题台账（已取证定性）

| 编号 | 现象（用户复测） | 定性 | 根因置信 | 工作量 |
| --- | --- | --- | --- | --- |
| P1 | 划选高亮完全不透明，看不到选了什么；标注重叠处颜色加深 | **F-06 修法推演根本缺陷**（遮字）+ 层间 multiply 叠乘既有机制 | 极高（机制+代码双实锤） | M~L |
| P2 | 「第一问」组头缺原始命题，读者对不上号 | 呈现面缺文本映射（原始文本仓内零存在，唯一源=蓝图文档） | 极高 | S~M |
| P3 | 脉络侧板双击笔记，无论点哪条都跳「最后打开的文章」，篇内定位正常 | 载荷链七跳静态无缺陷——嫌疑指向**数据面**（AI 笔记归属），须运行时取证 | 中（静态穷尽，假说待证） | 取证 S+防御修 S |

### 2A. P1 划选遮字+标注加深

- **遮字根因（极高）**：`text-layer.css:56-64`（SR2-F-06）把 ::selection 两行
  background 改不透明（`rgb(191 191 255)` + `color-mix(... 25%, white)`）。
  文字可见机制：文本层 span `color:transparent`（:33），PDF 字形由 canvas
  层渲染在文本层**之下**——官方 25% 半透明下黑字透出可见；不透明底把字形
  完全遮住。头注「压白底合成等效色」换算只对底=纯白成立，页底有黑字，
  等效不成立（F-06 门一漏审点——审了色值算术没审遮字机制）。
- **加深根因（高）**：**两个同构 multiply 容器层间叠乘**——
  `AnnotationLayer.tsx:198`（用户标注层）与 `AiAnnotationLayer.tsx:144`
  （AI 段高亮层）均 `zIndex:5 + mixBlendMode:'multiply'`。容器级 multiply=
  与 backdrop（含先绘兄弟层结果）相乘，两层重叠处乘两次=加深。既有机制
  （AI-09 起），非 F-06 引入；F-06 不透明 ::selection 又加第三条叠乘路径。
  设计者只论证了单容器内 rect 间不叠深（annotation-anchor.ts:346 注释）。
- **修法（推荐 B 案+层去 multiply）**：
  - ①**B 案=SelectionLayer 自绘选区+压原生 selection**：`::selection`
    background 改 `transparent`；SelectionLayer 用现成几何
    （`SelectionLayer.tsx:121` selectionToAnchor 已产 anchor.rects）渲染
    选区色块——**带 alpha 背景色，禁 multiply**（否则与标注层叠乘同 ②）。
    单层单绘根除重叠 span 逐元素叠绘（F-06 原始缺陷 C 也一并根除）。
    A 案（回退半透明）会让原始缺陷回归，不推荐。
  - ②`AiAnnotationLayer.tsx:144` 去掉容器 `mixBlendMode:'multiply'`，AI 段
    保留 `opacity:0.45`（:164）——白底观感等效、黑字靠透明度透出；
    AnnotationLayer 单层 multiply 不动（单层无层间叠乘）。
- **受锁面**：`tests/e2e/reader-text.spec.ts:617-680`（F-06 视觉 test，
  :664-666 ::selection 无透明分量断言）**必然红**→[locked-change] 改守卫为
  「自绘层存在+原生 selection 背景透明」；`selection-layer.test.tsx` 无颜色
  断言（纯工具条行为）——B 案新增自绘行为 it（locks:generate→apply）；
  `ai-annotation-layer.test.tsx` 无 mixBlendMode 断言（已核对）——②unit 面
  不红。
- **验收判据**：划选时选区下文字可见；重叠 span 选区颜色均匀；AI 高亮与
  用户标注重叠处不加深。

### 2B. P2 组头缺原始命题

- **根因（极高）**：组头仅渲染 QUESTION_LABEL 短标签（`ai-note-style.ts:28-37`），
  两消费位=AiNoteGroupList+`LineageSideAiNotes.tsx:89`。**七问原始命题完整
  文本仓内零存在**：constants 无、corpus.assemble.ts:96 仅排序序、生成侧在
  外部 sidecar。唯一完整源=`docs/reports/2026-08-25_ai-sensor-blueprint.md:143-156`
  七问 schema 表（Q1「核心 idea 是什么」…Q7「验证强度」+divergence 分歧报告）。
- **修法**：`ai-note-style.ts` 新增 `QUESTION_TEXT: Record<AiNoteQuestion,string>`
  （文本誊自蓝图表；短文本如「核心 idea 是什么」——誊录时保持原文完整句），
  组头两处拼 `${QUESTION_LABEL[q]}：${QUESTION_TEXT[q]}`。纯 renderer 呈现面：
  零 IPC、零 shared 触碰（避开受锁模型）；ai-note-style=跨域呈现单源（头注
  :6-10），新映射自动同源到达脉络侧板，合 INV-11。
- **受锁面（必然红 5 处，AI-11「受锁必然红扩容」口径可援引）**：
  `ai-notes-section.test.tsx:413/:457/:480`（组头精确断言）+
  `lineage-side-panel.test.tsx:291`（h5 同型）+e2e `ai-notes-section.spec.ts:131`
  +`lineage.spec.ts:486`（heading name='第一问' 全字匹配）。LABEL 旧值不改、
  ai-note-style.test:20-22 不红；TEXT 映射加非空断言（受锁新增）。
- **验收判据**：面板与脉络侧板组头均为「第N问：原始命题」形态。

### 2C. P3 跳转错文章

- **静态取证（七跳全穷尽）**：载荷链 paperId 逐跳透传无丢失——
  LineageSideAiNotes:100 上抛完整 AiNote（模型有 paperId，
  shared/models/ai-note.ts:26）→LineageSidePanel:124-135 组装
  `{paperId: node.paperId,…}`→LineagePage:48-55→open-paper-bus:42-45→
  open-paper-anchor:33-34→anchor-locate:150/278（waitOpen/activateTab 均用
  target.paperId）→数据链 ai_notes.repo:113-115 严格按 node.paperId 过滤。
  **LG-06 排除引入嫌疑**（notify 只切面板不激活 tab）；载荷链 LG-04 起如此。
- **最自洽假说（中置信，待运行时证）——数据面**：库里 AI 笔记实际归属与
  用户预期不符（如只导入过一篇的笔记→各节点侧板雷同或非预期篇）。
  全现象吻合：侧板条目实际属同一篇→双击任何条目跳同一篇（=复测时最后
  打开的）→verifyQuote 在该篇 exact 命中→flash 真·篇内高亮=「定位正常」。
  佐证：M1 草稿数据质量有先例（LG-07 记录 title 文件名形态）；但注意
  **桌面 M1 json 四节点 paper_id 已核对各异**（d2c1bee5/798d79fd/76dbffde/
  a3c25d20）——草稿绑定没错位，嫌疑收敛到「库内 ai_notes 表归属分布」。
- **运行时取证步骤（票面化前必做）**：
  ①脉络视图点不同节点对比侧板笔记列表是否雷同（雷同=归属实锤）；
  ②查库内分布（只读；dev 在跑有 Windows 文件锁——**勿动 build/Release
  绑定**，用 abi-cache node 绑定副本 require 或停 dev 后查）：
  `SELECT paper_id, COUNT(*) FROM ai_notes GROUP BY paper_id`；
  ③必要时空闲期 devtools 监听 OPEN_PAPER_EVENT 看 detail.paperId。
- **防御性修法（无论根因均值得，可与取证同票）**：LineageSidePanel.tsx:134
  `node.paperId`→`n.paperId`（条目自身归属——与阅读器侧同链先例
  AiNotesSection.tsx:195 对齐；当前行为等价、未来侧板聚合时防错位）。
  受锁：lineage-side-panel.test:237-240 夹具 node/note 同 paperId——改后
  不红，收口核对。
- **验收判据**：双击侧板条目跳到**该条目所属文献**（多节点多篇笔记各自
  跳对）+篇内定位+面板切笔记。

## 3. 执行顺序与单元划分

1. **U1=P1**（SR2-F-07：B 案自绘选区+AI 层去 multiply+受锁 reader-text.spec
   守卫改写——视觉域一票收两子问题，同域同受锁面）。
2. **U2=P2**（SR2-AI-12：QUESTION_TEXT 映射+两消费位+受锁必然红 5 处）。
3. **U3=P3**（SR2-LG-08：先运行时取证（§2C 步骤①②）定性归档→防御修
   n.paperId→若证实数据面，修数据（重导入笔记归属）非代码，主控直做）。
4. 每单元三屋全流程（票面→实现者 TDD 四档→门一→门二→收口亲验），票面
   模板照 sr2-f-05-brief 先例；受锁必然红扩容须逐文件申报+门一逐条核准。
5. 全部完成后用户复测三项→若过，验收修复役终验闭环（D/E1/M1 两项已 ✅）。

## 4. 成本账本（本会话·复测分析）

- 取证代理 1 个：≈1.16M tok/9.6min（三问题代码级定位，39 次工具调用）。
- 主控：dev 启动+界面截图 2 次+五组测试引导+本文档撰写。零代码改动。
- 修复役全役账本见 `docs/prompts/2026-08-28_fix-campaign-handoff.md` §3
  （≈30.9M tok/148min 六单元）。

## 5. 遗留池增补（并入 fix-campaign-handoff §4）

- P1 暴露**门一审法盲区教训**：F-06 门一审了「色值算术」没审「遮字机制」
  ——视觉类票面门一应强制「渲染层叠次推演」（canvas/文本层/选区/标注层
  的 z 序与合成方式）+用户口径的「看得见选了什么」验收判据前置。
- 其余继承项不变（fix-campaign-handoff §4 六新增+loop-handoff §5 继承）。
