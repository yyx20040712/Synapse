# 2026-08-28 验收修复役交接书（六项缺陷全清）

> 定位：上一会话（`2026-08-28_loop-handoff.md`）交付验收反馈六项取证定性，
> 本会话（修复役）按其 §3 执行顺序完成全部六单元三屋流程并收口。
> 新会话从 §1 基线核对开工；用户复测指引见 §5。

## 1. 开工基线（下一会话自检锚）

- HEAD=本交接书提交；`npm run verify` 应为 **95 文件 741 用例 / locks 144 /
  工单 116 open 0**；e2e（build 后 `npm run test:e2e`）= **24 passed + 0 skip**。
- 环境铁律不变：node24 前缀 `export PATH="/e/class/智慧水务/tools/node24:$PATH"`。

## 2. 六单元交付清单（全部三屋全流程：票面→实现者 TDD 四档→门一→门二→收口亲验）

| 单元 | 工单 | 提交 | 缺陷 | 交付要点 |
| --- | --- | --- | --- | --- |
| U1 | SR2-F-05 | ecc5583 | A 标签遮挡 | scroll-converge.ts 单容器收敛（最近滚动祖先差值法）+ReaderPage overflow-hidden+Toolbar shrink-0+INV-34；**真泄漏面=viewport scrollingElement（票面「滚 main」实证修正，门一双核准）**；e2e 窄视口 TabBar 恒可见回归锁 |
| U2 | SR2-F-06 | 1347843 | B 页间分隔+C 划选加重 | 页盒 panel 底+阴影；::selection 不透明（**关键实证：Chromium 不解析 ::selection 的 color-mix 行，fallback 行才是生效行**）；单测零触碰 e2e 承载 |
| U3a | SR2-ENR-03 | 59c35c9 | D 被引数 | 详情面板一行 Row（空→—/零值 0）；数据链 ENR-01/02 已通仅补 UI 透出 |
| U3b | SR2-LG-06 | 5abae8e | E2 面板不切笔记 | open-paper-anchor 一行接线 notifyAiNoteHighlight（AI-09 语义复用，持久 state 挂载后补切）；invocationCallOrder 锁「面板先行」 |
| U4 | SR2-LG-07 | 21ba963 | E1 脉络单列 | Frame 根占位参与兄弟 offset 下限（直接兄弟不论层必错开，紧凑性保留）；**M1 夹具四遍独立手推逐位吻合 {Brown=Reynolds=200, Cross=90, 水锤史=310}**；边 label 渲染（LineageEdges.tsx 拆件） |
| U5 | SR2-AI-11 | 82dfd25 | F AI 笔记格式 | groupNotes 按 AI_NOTE_QUESTIONS 转置+组头分色条+组内 ROLE_LABEL「一审/二审/裁决」分段；受锁 3→5 扩容（接缝归责） |

主控直做：M1 草稿 title 重写（桌面 lineage-draft-m1.json 两处文件名形态→
规范题名，JSON 已验，原文件 .bak 备份）；.gitignore 残留处置（2615ebb）。

## 3. 成本账本（子代理口径）

| 单元 | 实现者 | 门一 | 门二 | 小计 |
| --- | --- | --- | --- | --- |
| F-05 | 10.38M/25.4min | 1.30M/6.8min | 1.20M/7.4min | 12.88M/39.6min |
| F-06 | 2.85M/12.0min | 0.36M/7.1min | 0.49M/7.6min | 3.70M/26.7min |
| ENR-03 | 1.50M/7.8min | 联审 0.25M/3.6min | （联审合并） | 1.76M/11.4min |
| LG-06 | 1.77M/8.6min | 联审 0.34M/4.0min | （联审合并） | 2.11M/12.6min |
| LG-07 | 3.88M/18.3min | 0.64M/7.2min | 0.51M/3.8min | 5.03M/29.3min |
| AI-11 | 4.40M/17.6min | 0.48M/5.5min | 0.52M/5.4min | 5.40M/28.5min |
| **合计** | | | | **≈30.9M tok / 148min** |

联审=主控裁量：三行级小票两门职责合并（ENR-03 首创，LG-06 沿用）——
门一/门二职权不缩（产出两档），省一轮派发开销。

## 4. 遗留池（继承 loop-handoff §5 + 本役新增）

继承项全部未动（第七雷两处/sqlite-abi 顺手/脉络打磨/P7-D 立项/DEV-SETUP
Node 条目/onVisibleChange/manifest 抽查/VENUE_TIER_MAP 扩充——见 loop-handoff）。

本役新增：
1. **lint 级 scrollIntoView 防线**（F-05 门一附议）：ESLint 规则禁 renderer
   新增原生 scrollIntoView 调用（强制走 scroll-converge）——受锁 lint 配置小单。
2. **F-04 收官 test 既有 flaky**（AI-11 门一定位）：reader-scroll.spec:230-232
   selectText 一次性非重试动作撞 fit-width 后文本层重挂载窗口——改重试式
   或动作前置；票外既有面。
3. 格 4（共享层存在但根占位项胜出）无专属测试锚（LG-07 W1）。
4. 非单调长边 label 中点落中间层带可能压卡片（halo 缓解——LG-07 W2 观察项）。
5. PaperDetailPanel 244/250 行贴线预警（ENR-03 N3）。
6. anchor-locate.test:19/:24 vi.mock 冗余（F-05 W1 卫生级）。

## 5. 用户复测指引（本役最终验收）

1. **包1④⑤补测**（缺陷 A 解除阻断后）：跨标签进度恢复（滚到中部→切 tab→
   切回→停原页）；标注兼容（标注列表跳转/划选保存原位）。
2. **A 本体**：任何滚页/跳转/缩放/脉络跳转后 TabBar 恒可见；重启应用多标签
   复测。
3. **B/C**：PDF 页间分隔视觉可辨（页缘阴影）；划选不再加深。
4. **D**：详情面板「被引」行（增强后文献显示数值/未增强 —）。
5. **E1+M1**：脉络视图重新导入桌面 `lineage-draft-m1.json`（title 已重写）——
   应呈「转捩谱系」**分叉树**（Reynolds 居中分叉 Cross/水锤史，Brown 单链
   同轴）+边标注（实链/谱系推断/平行推断）可见。
6. **E2**：脉络侧板双击 AI 笔记条目→阅读器打开定位+左侧面板自动切「笔记」
   tab 并高亮。
7. **F**：AI 笔记呈现「第N问」分组（分色条）+组内「一审/二审/裁决」分段
   （脉络侧板同步）。

## 6. 本会话新教训（方法论候选条款）

1. **Git Bash 回显中文乱码≠存储损坏**：Windows 显示链按 GBK 解读 UTF-8 是
   常态假象（`file` 判 UTF-8 + 回显乱码可以同时成立——双重编码后仍是合法
   UTF-8 字节）。判定必须**字节级**（node 读字节 utf8 decode）。本会话曾据
   回显乱码误判提交损坏触发 soft-reset 重做（内容无损失，但耗时段）——
   已在后续简报向实现者注入此教训。
2. **票面预写断言锚允许实现者实证修正**：F-05 票面锚（main.scrollTop===0）
   被实现者 e2e 探针证伪（真泄漏面=viewport scrollingElement）——三屋流程
   的「实现者自证」环节真实捕获了主控取证的粒度误差，修正经门一独立复核
   收敛。票面写锚时应标注「实证锚，允许更强依据推翻」。
3. **票面基线数字须 grep 实数**：两处笔误（LG-07 it 12 实 17/AI-11 spec 4
   实 2）均被门一/实现者捕获——票面中的计数类数字（it 数/文件数/行数）
   写作时逐项 grep，不凭记忆。
4. **受锁面「必然红」扩容的合法性**：AI-11 受锁 3→5（相邻测试文件对
   ROLE_LABEL/分组轴的既有断言随生产行为改变必然红）——属宪法「接缝归责」
   驱动的合法扩容，非超范围蔓延；实现者必须逐文件申报+门一逐条核准必然性。

## 7. 后续开发（修复役之后，继承 loop-handoff §4）

- M1 试点收尾：用户策展定稿脉络成品（重导入验证即 E1 最佳验收样本）。
- P7-D UI 风格战役：本役视觉改动已保持最小克制（B 页盒阴影/C 选区色），
  设计面留给 P7-D。
- P8 池与 ENR 消费面按需入池。
