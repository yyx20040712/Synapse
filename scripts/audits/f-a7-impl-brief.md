# F-A7 实现者简报——旋转页占位盒宽高交换缺失（PageColumn 页尺寸缓存旋转口径）

> 主控=GLM5.3；实现者=子代理（GLM5.3flash 定档，环境无 model 参数=统一档欠账披露）。
> 票：F-A7（registry open——F-A6-d 票外发现立案，d 票门二 W2 立案回执）。

## ① 身份与禁令

你是实现者子代理，领单 F-A7。**禁 git add/commit/push；禁翻 tickets/registry.ts
状态；禁碰控制面（docs/invariants.md / ADR / 交接书）**——这些归主控。卡点=
BLOCKED 停手报告，不自裁。你只改本简报「修改文件清单」列出的文件。

## ② 必读序（文件清单化，逐文件看）

1. `AGENTS.md` —— 宪法（硬规则/测试纪律/依赖与提交）。
2. 本简报 —— 完整任务书（含五层规约 §票面）。
3. `src/renderer/features/reader/PageColumn.tsx` —— **修改目标件**：段①就绪管线
   load 循环（:108-130，pageSizes 构造=缺陷位）；头注 :25「不做：…旋转页…」
   （接缝声明——见主控裁决③）。
4. `src/renderer/features/reader/PdfPageCanvas.tsx` :60-90,150-165 —— PdfPageGeometry
   通道先例（rotate=page.rotate / view=page.view 直取；canvas 渲染用
   getViewport({scale}) 默认吃 page.rotate）。
5. `src/renderer/features/reader/page-column-geometry.ts` —— PageBoxSize 定义+纯函数
   消费面（columnWidthFor/pageBoxHeight/layoutRows 只吃 width/height 数值，口径
   变化对其透明）。
6. `src/renderer/features/reader/PageBox.tsx` —— 页盒 DOM（外层 [data-page-box]
   尺寸=size×zoom vs 内层 canvas=viewport 口径——错配机制）。
7. `tests/unit/renderer/page-column.test.tsx` —— 单测宿主（makeDoc mock 形态
   :70-73 / 断言风格）。
8. `tests/e2e/reader-text.spec.ts` :860-955 —— F-A6-d 组合页小票先例（fixture
   用法/seedAndLaunch/断言风格；:925-929 参考系申报注释=F-A7 状态变化点）。
9. `tests/utils/pdf-factory.ts` :145-158 —— createRotatedCropPdf fixture
   （MediaBox [0 0 612 792] / CropBox [36 36 540 720] / Rotate 90 →
   view 口径 504×684，viewport 口径 684×504）。

## ③ 主控裁决（票面范围内澄清，实现者不再自裁）

1. **修法=rotate+view 直取+内联交换数学**：load 循环内取 `page.rotate`（`?? 0`
   防御——既有单测 mock 无 rotate 字段），归一化 `((rotate % 360) + 360) % 360`，
   归一值 `% 180 === 90` 时交换 view 宽高。**禁用 page.getViewport() 调用**——
   会让全部既有单测 mock 面扩大（mock 只返回 {view}），且项目先例（F-A6-b1
   PdfPageGeometry 通道 / b2 pdf-item-geometry 内联数学）已确立 rotate+view 直取
   模式。userUnit≠1 边界沿用 PdfPageGeometry 注释口径（真实库全档 userUnit=1，
   触发后另行扩展）。
2. **pageSizes 语义变化**：从「page.view 未旋转口径」→「viewport 旋转口径
   （scale=1）」。消费面（columnWidthFor 的 onReady basisWidth/锚定总高/
   pageBoxHeight）自动受益（与实际渲染盒一致）——这正是修法意图，非破坏。
3. **头注接缝归责**：PageColumn.tsx:25「不做：页内偏移进度/虚拟滚动/旋转页/
   跨页选区/持续 fit/手势 pinch」中的「旋转页」指**手动旋转阅读特性**（P7+
   功能面）；F-A7 属 /Rotate 元数据适配（渲染正确性）。头注该行措辞改为
   「手动旋转阅读」并在增补记录注一行 F-A7（日期+单号+一句话）。
4. **e2e 断言用尺寸一致/比值，禁绝对像素值**：打开文档默认 fit-width 缩放
   （F-A6-d 实测 canvas 宽 1116px=684×1.63），绝对值随容器宽漂移。断言
   [data-page-box] gBCR 与 canvas gBCR 宽高各自一致（±2px 容差，与 F-A6-d
   同口径）；可加方向断言（盒宽>盒高——横纸 684>504）。
5. **e2e 既有参考系注释更新**：reader-text.spec.ts :925-929「参考系申报」段
   落陈述「两者错配=票外既有布局缺陷…已申报主控另行立案」——F-A7 落地后
   状态变化：该段注释更新为「F-A7 已修复（页盒=viewport 旋转口径），页框与
   渲染盒一致；断言仍以 canvas 盒为判据域（渲染真盒）」。断言本身不改。
6. **单测 mock 扩展零破原则**：makeDoc 加可选 rotate 参（缺省 0），既有全部
   用例零改动零迁移；新用例走新参。若发现既有用例依赖未旋转口径的尺寸断言，
   停下报告（接缝归责，不顺手改）。

## ④ 纪律

- TDD：新单测**先红**（修 PageColumn 前跑新用例必红）→ 修 → 绿 → **变异红证**
  （交换条件翻转/删交换分支 → 新用例红 → 备份还原 → diff 空）。首红与每次
  变异的原始输出各自落盘 `.raw.txt` 后缀（`scripts/audits/f-a7-*.raw.txt`）；
  首红须全量套跑口径（npm run test 真退出码，禁裸 npx vitest，echo exit=$?
  落盘）。
- **多断言禁与行尾注释同置**（一行一断言或注释独占行）。
- 受锁文件（tests/unit/renderer/page-column.test.tsx、tests/e2e/reader-text.spec.ts）
  ：先 `npm run locks:unlock` → 改 → 即时 `npm run locks:apply`。无新受锁路径
  （两文件已在锁内，locks 数预期 277 不变）。
- e2e 跑法：`npm run build` 后 `npm run test:e2e`（新小票定向跑+全量 41+1=42
  零 skip 收口；若 F-ARCH4-M1（原 :872）偶红：同用例第 1 现记录指纹继续，第 2
  现停手报告——e2e 非确定失败立案线）。
- 禁新依赖；文件 ≤500 行；中文 UTF-8（写后验证可读）。
- 自产 .mjs 工具件（若有）诞生即 locks:generate+apply——本票预期无需。

## ⑤ 基线数字（自检参照）

- verify 基线：**154 文件 / 1325 用例 / locks 277**（v44 终态亲验）。
- 本票预期：单测 +3~4 用例（1328/1329）、e2e 42、locks 277 不变。
  落笔数字一律实测（机器输出），禁凭印象。
- 收口前 `npm run verify` 全绿真退出码落盘。

## ⑥ 报告契约

全文落 `scripts/audits/f-a7-impl.report.md`：实现摘要/文件清单/首红证据/
变异红证/测试证据（verify+e2e 退出码）/locks 实录/**自裁申报**（含删减面 diff
自查——与票面偏差逐条）/疑虑。**回复五行内**（摘要+证据档路径+BLOCKED 与否）。

---

## 票面五层规约（行为层规约含态空间）

**行为层**：
- 缺陷：/Rotate≠0 页 [data-page-box] 占位盒未随旋转交换宽高——PageColumn 段①
  pageSizes 用 page.view 未旋转口径（504×684），canvas 用 getViewport 旋转口径
  （684×504）→ 页框与渲染盒错配（canvas 横向溢出页盒/纵向底部空条）。
- 修复：pageSizes 构造按 viewport 旋转口径（rotate 归一化后 %180===90 交换宽高）。
- **态空间（不变——本票零状态机变更）**：PageColumn 布局态 loading→ready /
  error 终态不变；每页 empty→rendering→rendered→recycling→empty 不变；
  pageSizes 仅语义变化（width/height 数值口径），状态迁移表零变。
- 跨格序列零变：zoom 乘法缓存（getPage 不重取）/ 布局切换重报 onReady /
  IO 可见集 / 懒渲染窗口 / 缩放锚 totalHeight 全部照旧（消费 width/height 数值
  透明）。
- selection 几何链零涉及（F-A6-d 已证不受影响——块与 span 墨带贴合坐标证据在档）。

**接口层**：PageColumn props 零变；PageBoxSize 形状零变（width/height——
page-column-geometry.ts 接口注释补一行口径声明「viewport 旋转口径（F-A7）」）；
无新导出、无新文件。

**架构层**：分层不动；零新依赖；与 PdfPageGeometry 通道同源（rotate+view 直取
+内联数学——主控裁决①）。

**生命周期层**：/Rotate 元数据适配（渲染正确性），非手动旋转阅读特性（头注
澄清——主控裁决③）；真实库全档 rotate=0 未显现（低优先兑现，e2e 合成页守护）。

**文化层**：测试先红后绿+变异红证；e2e 断言渲染真值（gBCR 实测）非恒真；
计数数字实测落笔。

## 修改文件清单（超出即 BLOCKED 申报）

1. `src/renderer/features/reader/PageColumn.tsx` —— 核心修复（load 循环+头注两处）。
2. `src/renderer/features/reader/page-column-geometry.ts` —— PageBoxSize 注释
   口径声明（仅注释，逻辑零动）。
3. `tests/unit/renderer/page-column.test.tsx`（受锁）—— makeDoc 可选 rotate 参
   + 新 3~4 it（90 交换/180 不交换/270 交换/-90 归一化交换）。
4. `tests/e2e/reader-text.spec.ts`（受锁）—— F-A7 新小票（页盒与 canvas 盒
   宽高一致 ±2px+方向断言）+ :925-929 参考系注释更新（主控裁决⑤）。
