# F-A10 实现者简报——划选段末 affinity（诊断+主控预裁）

## 0. 主控诊断（从此起步，勿重复）

**缺陷**（用户实据 f-a10-img2+票面）：鼠标在段末行尾空白处起选拖选，
选区把下一段整段/其左上角部分带上。用户心智模型=「文字从左往右成行，
行尾空白不应命中下一段首行」。数据指纹=当日标注 quote_text 前导空格
（选区起点落进段首空白区——annotation 落库的 quote 含前导空格）。

**机制**（SelectionLayer 事件层侦查+selection-evaluate 全读结论）：
浏览器原生 mousedown 的 caret 落点由 textLayer 文本节点 hit-test 决定。
pdf.js 的 text item 把**段首缩进/空白作为下一段首项的前导文本**——用户
点击的「行尾空白」在 DOM 里是下一段首 span 的文本开头（或独立空白
span）→Selection 锚点=(下一段首节点, offset 0 附近)→拖选→range 把
下一段带上。SelectionLayer 的 mousedown/mouseup 监听只做工具条逻辑，
不干预选区边界归属（L112-133）。

**修复层**：锚定链边界归一化——selectionToAnchor（anchor-serialize.ts）
之前或之内做「段末空白吸附」：

- 判据：选区边界（node,offset）**前紧邻字符全为空白**且该空白串**跨行**
  （空白串两端的行盒 y 不同——Range.getClientRects 量；或简化=空白串
  横跨两个不同行 span 元素）→边界回退到空白串前（=上一行末字符后）。
- 双边界对称（start/focus 与 end/anchor 都可能落在段首空白）。
- 票面验收锚=「行尾空白坐标命中→range 终点=本行行尾（不下探下一段）」。

## 1. 主控预裁

- 实现落点=anchor-serialize.ts 的 selectionToAnchor 输入归一化（纯函数
  域件优先——Range 归一化函数可单测）；SelectionLayer/evaluate 零改
  （锚定层单点修，两条消费链（快/慢路径）自动同源）。
- 归一化判据的 DOM 量测（行盒 y）用 Range.getClientRects（jsdom 可 mock）。
- 兼容面：非空白边界/同行内空白选区（词间空格划选）语义零变——只吸附
  **跨行空白**；中缝空白（双栏文档栏间空白）不吸附（栏间=水平分隔非
  行尾——判据按 y 行盒不同+空白串起点在本行盒右缘之外？实现者裁量并
  申报边界语义，给测试用例锁）。
- data 指纹修复面：吸附后 quote 不再含前导空格（存量已落库的不迁移）。

## 2. 验收（票面原文）

- 夹具：行尾空白坐标命中→range 终点=本行行尾（不下探下一段）。
- e2e 真实 PDF 行尾空白点选→预览带不跨段（e2e 受锁留主控，你申报）。
- img2 形态复测消（真机探针可复用 f-a9-real.mjs 配方——**跑 Electron
  探针前必 `node scripts/sqlite-abi.mjs use electron`**；用户新划选
  在库副本上做，白名单拷贝法见该脚本头部）。

## 3. 标准纪律

三屋全规约（TDD 红→绿→变异红证 .raw.txt 落盘；always-active 新测试；
npm run test -- <路径>；≤250 code 行；禁新依赖；UTF-8；BLOCKED 停手）。
报告 scripts/audits/f-a10-impl.report.md。禁碰：AnnotationEditor/
AnnotationPopups（F-A11 面）、pdf-item-geometry/annotation-resolve*/
annotation-style（F-A9 面）、tests/e2e/**、scripts/ 已存在文件。
