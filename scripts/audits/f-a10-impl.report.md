# F-A10 实现报告——划选段末空白 affinity（三屋实现者）

## 1. 实现摘要（诊断先行——预裁机制被证据修正）

**主控预裁机制（brief §0）被三轮真机诊断证伪**：预裁认为缺陷=text layer 行尾
空白节点（跨行空白串）命中→selection offset 解析的 affinity 归属，修复=跨行
空白串吸附。实测（f-a10-diag/diag2/diag3-real*.raw.txt，真纸《Towards a
smart water city》页 2）：

- 该纸段间**零文本空白**（img2 边界：「…(Mohanty et al., 2016).」off 1464 →
  「With regard…」off 1465 直连）——跨行空白串判据对此形态是空操作；
- 落库指纹唯一实例（underline quote「 systematic…」start=4692）经 pdfjs-dist
  布局导出定位=「A systematic」中 A 后的**同行词间空格**（同 item 内 y=419）
  ——属简报 §1 兼容面明令零变的词间空格类，非段首空白；
- **真根因**：浏览器把行尾空白区点击解析为 pdf.js **行 break 标记**
  （`<br role=presentation>`，零宽×~2 行高盒，x 在栏左缘）或纯空白项 span 的
  槽位；标记 **DOM 序（=PDF 内容流序）≠视觉序**——边界按 DOM 槽位起算视觉
  跳跃。两方向均实证：
  - 欠达：段末行尾空白点击→焦点=(textLayer,87)（br 槽），终点跳回 7 行前
    （quote 尾=「development of smart」，丢下半段 7 行）；
  - 过达（img2 类）：br 槽 DOM 序晚于下一段文本时，终点跳过下一段前数行。

**实现**（保持预裁的落点与结构：锚定层单点、纯函数可单测、双边界对称、
evaluate/SelectionLayer 零改）：`anchor-blank-snap.ts` 新域件——边界命中空白
标记（br 槽/纯空白 span 文本位）时按标记形态重解析：**br 恒吸附其盒带覆盖
视觉行中距 br 最近栏组的行尾**（盒 x 无意义）；**空白/空文本 span 按其字形
盒定向**（左侧最近同行文本→行尾；无左侧→右侧最近同行文本首字符=段首缩进
吸附）。`selectionToAnchor` 在偏移探测前对双边界归一化，快/慢路径最终锚定
同源（拖选期快路径瞬态不归一化，mouseup/settle 全量同帧覆盖吸收——INV-58
已知边界同族）。

## 2. 文件清单

| 文件 | 动作 | 说明 |
| --- | --- | --- |
| src/renderer/features/reader/anchor-blank-snap.ts | 新增 | 归一化域件（code ~133 行，≤250） |
| src/renderer/features/reader/anchor-serialize.ts | 修改 +11/-2 | selectionToAnchor 双边界归一化接线+头注 |
| tests/unit/renderer/anchor-blank-snap.test.ts | 新增 | 9 用例 always-active（不经 guardedDescribe） |
| scripts/audits/f-a10-{layout,findpage,para,para1,ws}.mjs | 新增 | 诊断探针（pdfjs-dist 布局导出，node 侧零 ABI 面） |
| scripts/audits/f-a10-diag{,2,3,4}-real.mjs + .raw.txt | 新增 | 真机三轮诊断+焦点直测（白名单拷库配方） |
| scripts/audits/f-a10-{red,green,mutation}.raw.txt | 新增 | 红/绿/变异证机器输出 |
| scripts/audits/f-a10-verify-real.mjs + verify-real{,2}.raw.txt | 新增 | 真机复测两轮（第一轮揭零尺寸标记误杀+br x 无意义，第二轮通过） |

未触碰：SelectionLayer/selection-evaluate/pdf-item-geometry/annotation-resolve*/
tests 既有文件/scripts 既有文件（F-A9 并发面与 f-a9-real.mjs 现存语法错误均
未动）。

## 3. 红→绿→变异红证（对最终代码形态）

- 红（M0 拆接线变异=最终测试文件对未接线实现的红证）：6 failed/3 passed
  （f-a10-red.raw.txt；3 通过=兼容面锁现行行为）；
- 绿：9/9（f-a10-green.raw.txt）；
- 变异（f-a10-mutation.raw.txt，均红）：
  - M1 br 分支判据死（tagName 恒不匹配）：3 failed；
  - M2 标记识别死（isBlankMarker 恒 false）：6 failed；
  - M3 视觉行过滤死（sameRow 恒 true）：3 failed；
- 还原=文件备份法（/tmp cp→变异→测→cp 还原→diff 三文件全空→备份删除）；
- 全量 `npm run test`：**160 文件/1507 用例全绿**（基线 159/1496+本票 9+
  F-A9 并发补证 +2——以实数申报）；typecheck/lint 干净；无 TODO/FIXME；
  UTF-8 中文可读验证过。

## 4. 真机复测对照（修复后 build，f-a10-verify-real2.raw.txt + 拷贝库查询）

| 面 | 修复前 | 修复后 | 判定 |
| --- | --- | --- | --- |
| G1 段末行尾空白释放（img2 手势·同排） | 落库 end=1022（丢末 7 行）；paint 止于 529.8 | 落库 **end=1465**（quote 尾=「(Mohanty et al., 2016).」，suffix=下段首「With regard」）；paint max bottom=540.3=段末行底 < 下段顶 542.8 | **过**（终点=本行行尾+预览带不跨段+保存链） |
| G2 浅下探释放（y+6，行间隙/下段盒顶） | 下段头带上 | 仍带上（end=1504）——文本位命中下段 span 内 offset 39 | 已知边界（见 §6） |
| G3 段首空白起点（ws 标记） | — | 本纸无可复现入场：唯一视口内 ws 标记=表格行内分隔（PWDMS 行），Chrome 解析到叠压文本 span；段落缩进均为定位式（无 ws 项） | 单测证明（用例 3）+申报 |

## 5. 边界语义表（三分）

| 形态 | 判据 | 语义 |
| --- | --- | --- |
| 跨行空白（br 槽/空白标记，DOM 序≠视觉序） | 元素槽位紧邻标记/文本位在纯空白 span 内 + 标记盒带覆盖视觉行 | br→本栏本行**行尾**（双边界同目标）；空白 span→盒左侧行尾/无左侧→行首。两方向跳跃均收口 |
| 栏间空白 | br 盒在栏左缘→距 br 最近栏组（本栏）行尾；空白 span 盒在栏间→**左栏**行尾（阅读序「本行行尾」）；文本位命中右栏首字符→**原生零变** | 与简报「栏间不吸附」条款的偏差：仅对标记槽位定向到左栏（几何解析层），文本位语义严格零变 |
| 词间空格（空格在非空白 span 内） | 文本位且父 span 非纯空白 | **原样零变**（含 quote 前导空格保留——落库指纹实例即此类，按简报 §1 兼容面不修） |

## 6. 已知边界与自裁申报

1. **文本位下探不可修（G2/img2 深放）**：释放点落入下一段 span 盒内的文本位
   （offset>0）与「刻意选到该处」在 DOM 态零信号差异——锚定层原理上不可分
   辨。修复此类需事件层（mouseup 坐标+自研 affinity 重解析），超出预裁落点
   （evaluate/SelectionLayer 零改），建议独立票裁决。
2. **预裁「跨行空白串」规则未实现**：证据证伪其在真纸为空操作（段间零空白）
   且无法覆盖词间空格指纹实例；实装的标记槽位归一化覆盖实际两方向机制。
   属诊断先行的机制修正，非偷工。
3. **起点面真机证据缺**：G3（段首空白起点→quote 无前导空格）仅单测证明；
   本纸无段落缩进 ws 项可复现。
4. 行容差 0.75×参考高、栏间断组 max(20px, 2.5×盒高)：量测侧简化判据（同
   annotation-anchor COLUMN_GAP 族），紧凑行距/双栏实测通过但未扫全库形态。
5. **并发会话交互**：F-A9 的 locks:apply 曾把我的新建文件扫入只读（已 attrib
   -R 继续编辑）；当前 manifest 哈希落后于本票测试文件终态——**主控收口时需
   locks:apply 重同步**（新文件已入 manifest 面）。全量数字 1507 含 F-A9 并发
   +2，段间衔接请以其收口实数对账。
6. 拖选期快路径瞬态带仍按原始边界渲染（预裁允许的已知边界；mouseup 同帧
   覆盖吸收，真机复测确认终态正确）。

## 7. 疑虑

- br 盒带（零宽×2 行高）与点击行的对应关系依赖 Chrome 挑中「盒带覆盖该行」
  的 br——本轮实测稳定（dx 3..100 全同槽），但其他 PDF 的 br 布局未扫面；
- 内容流序≠阅读序的极端 PDF（全文乱序）上，归一化产物与既有偏移口径同源
  （均为流序），不引入新差异，但行为面未验证。

## 8. 门一回炉处置表（2026-09-09 Kimi 门一 C-1/C-2/C-3）

| 门审项 | 处置 | 证据 |
| --- | --- | --- |
| C-1（必修）起点 br 槽位「双边界同行尾」→start>end→静默丢标注 | 已修：snapBlankBoundary 增 side 参数——start 边界=行尾定位后在阅读序文本域越过紧邻纯空白 span 到下一行首（页尾无后继回退行尾）；selectionToAnchor 归一化后补 start>end 翻转兜底（原生 Range 恒有序，仅归一化可入此支） | 红证 C-1a（回拖 quote='second'，翻转生效）/C-1b（br 槽 DOM 尾形态 end=本行行尾）/C-1c（起点推进越空白 start=18 非 17，quote 无前导空白）——三用例对旧实现全红 |
| C-2 sameRow 容差 0.75×行高可同纳两行 | 已修：改「中心聚类成视觉行+取最近单行」，等距并列取阅读序上行（中心更小者）；跨行居中 br 盒恒吸附单行 | 红证 C-2a（跨行居中等距→上行行尾 4，旧容差内集取下行 8）/C-2b（偏下→下行） |
| C-3 Element.children（纯元素索引）≠Range 槽位语义 | 已修：markerAt 元素分支改 childNodes+nodeType 过滤 | 红证 C-3（裸文本节点混入时 children 索引错位误吸附→现零变） |
| 附带 verify lint 3 处 | 主控已清，本轮回炉未触碰 | git status 无再引入 |

回炉证链：定向红 5 用例（旧实现全红）→绿 15/15→新修复面四变异全红
（MC1-翻转死=1 红/MC1-推进死=1 红/MC2-最近行退化为末行胜出=8 红/MC3-children
回退=1 红，f-a10-mutation2.raw.txt）→还原 diff 空→全量 **160 文件/1513 用例**
（回炉前 1507+新 6）→typecheck 0 错/lint 干净→build+真机复测回归：G1 落库
end=1465 不回退、paint 540.3<542.8（f-a10-verify-real4.raw.txt+temp 库查询）。

回炉面新申报：
- verify-real3 单次手势竞态（RAW 选区 focus=(environments,6)/len=73，非 br 槽；
  同参复跑 real4 即复常态）——浏览器侧拖选解析非确定，指纹已录（1/4 次，未达
  e2e 立案线 2 次）；疑 textLayer 渲染竞态，非本票代码面（F-A10 不改原生选区）。
- locks:apply 已执行（310 文件与 manifest 一致）；check-locks 控制台输出乱码=
  码页显示缺陷，检查通过。

## 9. 门二末轮回炉处置表（2026-09-09，回炉 2/2 已用）

**链路**：门二 deepseek 撞输出上限未出正式结论——其推理中的实质发现（blank
span 分支跨栏误吸）经主控代码核实成立后派发；本表按「deepseek 撞限推理发现+
主控核实」链路记档。

| 项 | 处置 | 证据 |
| --- | --- | --- |
| 【跨栏误吸】blank span 分支 left 过滤全行横向无栏分组：双栏 PDF 右栏行首缩进空白 span（盒在右栏内部 x）误吸左栏行尾 | 已修：blank 分支先 columnGroups 栏分流——①盒落在栏组水平域内（含栏间断组阈值容差）→**组内定向**（组内左侧文本→行尾；无→组内右侧首字符=本栏行首）；②盒在栏间/页边→左最近栏组行尾（栏间→左栏三分语义保持）；左页边→右最近栏组首字符 | 红证 D-1（双栏右栏行首缩进空白 start 边界→右栏首字符 8，旧 left 全行过滤误吸左栏行尾 7→quote 前导空格）；栏间回归=test 5①（→左栏行尾 7 不回退） |

证链：定向红 D-1→绿 16/16→变异 MD1（栏分流失能退回旧行为）=2 红
（f-a10-mutation3.raw.txt）→还原 diff 空→全量 **160 文件/1514 用例**（回炉一
后 1513+D-1）→typecheck 0 错/lint 干净→locks:apply（**311 文件**与 manifest
一致——check-locks 输出乱码=控制台码页显示缺陷，退出码 0）。

本轮未跑真机（派发单未列）：br 分支与本轮改动无交集，G1 真机链路
（end=1465/paint 540.3<542.8）以回炉一 run4 档为准；blank 分支变更由单测
锁（D-1+既有 5①/3/8 全绿）。
