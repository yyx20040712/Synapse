# F-TAGS-01 全案归档 —— 标签输入保存失效修批+标签颜色（2026-09-30 凌晨场收口）

> 状态=done（裁决 GO_WITH_CONDITIONS C1-C6 全落实后翻转）。证据仓外档案区=
> `E:/zcode_md/synapse-archive/scripts-audits/F-TAGS-01/`（简报/五审档/两回炉
> delta/28 支变异 raw/probe 15 件/账本脚本）。

## 交付面（8 单元 executor+主控回炉 R1/R2 各一轮）

- **修批①（用户亲测根因=仅回车）**：TagEditor 三显式提交路（Enter+isComposing
  守卫/blur 失焦/「添加」按钮）+组词失焦序 B compositionend 补提交（名取 DOM
  值）；attachExisting 成败均清空（检索前缀非载荷）；×/「添加」/建议按钮
  mousedown preventDefault（同手势竞逐解）；blur 组词拒绝分支复位 ref。同类面
  R6 排查 5 面加守卫（TagEditor/TagLifecycle rename/LineageTagDialog/
  LineageSideTags/ReaderToolbar 页码 Enter+blur）。
- **颜色②（用户诉求 zotero 式）**：迁移 011（tags.color TEXT 可空无默认，
  NULL=accent 存量兼容）+tagSchema 扩 color 必携可空+通道 tags/set-color（
  55→56）+service 正规化小写/NOT_FOUND/null passthrough+TagColorDialog（8
  swatch+原生 input[type=color]+恢复默认）+三面着色（TagFilter chip/TagEditor
  chip/PaperRow 徽标 prop 链）+tagColorStyle 单源（hex+22/1px solid hex+66）。
- INV-85（提交语义终态①-⑥）/INV-86（color null=accent 单源）入册；
  architecture §6 tags 行+演进列 011 回写。

## 验证终态（probe 7/7 独立复算在档）

verify **EXIT=0 / 194 件 / 2150 用例**（2094+42 executor+10 R1+4 R2 三重锚定）；
e2e **55/55**（含新 spec tag-input-paths：CJK 回车→复 launch 持久/blur/按钮/
着色 computed style 锚——非真 IME 如实声明）；真 DB 迁移 20/20（user_version=11
+color 可空+hex/NULL 共存）；locks 276→**282**；豁免 188→**201**（+13=迁移族
8+契约族 5，主控追认+裁决部复算）；指纹门 cur 212/2191/6719；变异 **28 支**
全红证还原净（M1-M19 executor+M20-M23 R1+M24-M28 R2）。

## 门链

executor TDD[首红全量 25 例]→门一 k1 **FAIL B1W5N4**（B1=attachExisting
不清空×新增 blur 路=残留前缀自动误建——主控直证成立）+d1 PWC B0W5N6→回炉
R1 主控亲执 16 项→双席复审 k1' PWC B0W3N3+d1' PWC B0W8N5（两席分歧 W2 主控
裁 d1' 成立）→回炉 R2 主控亲执 13 项+INV-85 重写→probe 7/7→裁决部
**GO_WITH_CONDITIONS**[P0=0——W 级 21 条全处置闭合/独立复算 12 组/翻 done
预演绿]，C1-C6 全落实。

## 残余（裁决部裁定放行+登记）

序 B 于 Chromium 真实存在性未实证（Playwright 无真 IME）——两序皆正确的
设计处置；页码面只守卫不补提交（有意不对称）；ReaderToolbar 漏发型 ref 悬空
（Enter/重挂载自愈，裁决部 N 级登记）；compositionend 双发/卸载竞态/空
preedit 推演无新缺陷无单测（addendum 记账）。P3 池面：指纹门基线再生成窗口
票/页码面守卫补强候选。

## 教训候选（裁决部判可回流 3+主控增补 2）

①豁免族分按 reason 脚本实测禁手拟（v83 同构计数教训同族再犯——主控简报
7+6 实为 8+5）；②审档尾栏计数↔正文条目对账（d1 首轮 W=5 正文 4）；③
untracked 新文件每轮回炉后必重转录（d1'-W8 审包盲区）；④raw 指针纪律——
引用终绿 raw 以落盘名为准（本轮两处 off-by-one）；⑤失败套件转译红与用例
红分列口径。
