# 交接书 v133 —— F-UIRES-03 B1 标签下拉七条交付（2026-10-05 晚场三）

> 前承 v132（T0 交付）。本档=B1 批三屋全链交付全录（用户指令「继续开
> 一小批」——按 v132 §5 开工序 B1 首办）。

## §0 本场消耗与开工记录

技能清点：ai-dev-org=用（三屋链）；test-driven-development=用（新单测
五族先红后绿）；verification-before-completion=用（verify 亲验真退出码
×2——含 EBUSY 瞬态判别）；systematic-debugging=不用（EBUSY=瞬态判别非
排障流程）。配置同 v132（executor/probe=宿主随岗；门一 k1+d1 $max
双审；裁决部 $max）。

## §1 基线终态（对不上禁提交）

- 基线=0da6faedee3（T0 批，CI success）。本批=B1 一笔（diff 面 24 文件
  口径：src tags 域 4 改 3 删 2 新+library-explorer.css+ui-constants.ts
  +tests 4 改 2 删 1 新+e2e 3+locks/manifest+exemptions+invariants.md
  +registry+本交接书）。verify 终验 EXIT=0（250 件/2578 例）+locks 352
  +test-surface 40/40 stale 0（assertionCount 8474/caseCount 2656——
  裁决部独立推演零和闭合=巧合性平衡非注水）。

## §2 B1 交付摘要

- **七条全落地**：①header=全选框三态+「全选」+删除 danger 钮（零勾选
  禁用），「已选 N」退役 ②footer 仅「清空已选」 ③列表 max-height:320px
  （CSS 源锚）④行常态=椭圆 chip（tagChipStyle：自身色 18% 底+color-mix
  同色深阶字；null=TAG_COLOR_NONE_DISPLAY）+mono 计数+「编辑」钮 ⑤行
  编辑态=input 预填全选+TAG_NAME_MAX+色点阵（8 预设+「默认」=null）+
  保存（dirty 启用）+Esc 还原+失焦不保存（relatedTarget 行内守）+IME/
  busy 守卫 ⑥TagDeleteConfirm 删除链=确认窗列名→顺序逐删→INV-53 先剔
  后播（部分失败已删照剔+窗保持开+清单自愈）⑦退役四件（TagRowMenu/
  TagRenameDialog[TagLifecycle 内组件]/TagColorDialog/TagColorPopover）
  +两整件单测（豁免 40 条=FILE 2+MISSING_CASE 29+MISSING_ASSERT 9，
  主控逐条登记）。
- **主控票面解读（歧义定死）**：勾选集=沿用筛选集（勾选即筛选），删除
  钮作用于勾选集。
- **门链**：executor 基批（11 自裁全追认）→门一 k1 B0/W3/N5+d1 B0/W4/N6
  双 PWC（双席共中 W1 skipBlur 跨会话残留；d1 独中 W2 全选钳制死局）→
  RR1 五小修（skipBlur 进编辑沿重置/钳制四路径扩判据/S8 补 Esc/同名
  预检核验=git show 实证旧件无客户端预检+max-height 锚；自裁=tag-
  dropdown.test 拆件）→复核双 PASS（B0W0）→probe 九项矩阵全绿（三变异
  红绿双向复现）→裁决部 GO_WITH_CONDITIONS 五条件全兑现。
- **INV 登记册同步**：INV-53 删除入口+顺序锚兑现（「待 F-TAGS-02 补」
  销项——merge 仍零 F-TAGS-02 域）；INV-86 **分立双源裁定**（tagColorStyle
  通用面 22/66 底本+tagChipStyle 下拉行 chip 面 18%/color-mix——形态
  分立合法，裁决部判与宪法「类型单一真相源/方案切换」相容：消费面零
  重叠+各面内单源）；INV-85 同类面改 TagDropdownRow 承接+清 LineageTag
  Dialog/LineageSideTags 退役件名（A1b 册务随手清）。

## §3 操作条款增补（承 v132 §3 全项外）

- **尾注口径（裁决部阻断级裁定——防 CI 范围闸红）**：**src+tests 同批
  的提交只带 [locked-change] 单尾注，禁带 [test-refactor]**——CI 范围闸
  对带 [test-refactor] 的 src/** 一律红（VFIX-01 埋雷同族教训在册）。
  设计稿 §6「动 tests 用例者带 [test-refactor]」表述仅适用纯 tests 面
  提交（T0 批先例零 src 双尾注合规）。
- 豁免登记纪律重申：豁免权在主控（executor 列建议清单报裁）；登记后
  必跑 check 确认 hits 全中 stale 0（本批首轮 39/40——正则字面量转义
  失真 1 条，按机器输出原文修正后 40/40）。

## §4 挂账与下场首办

- **下场首办=B4 杂项静态**（#→·/YEAR-MO/侧栏 resizer+收起——e2e 断言
  同步改写；B4 的 #/年月改写若触 e2e 同文件与 C 冲突，以 B4 先行冻结
  字面量、C2 障碍几何在 B4 后校准——设计稿 §1 审核N5）。
- B1 N 级备案（全提示级）：chip 文字色深阶比例无断言锚（自裁公式面）/
  ×N 死 id 不计瞬态/NOT_FOUND 死 id 低危挂账（未来恢复删除入口随
  INV-99 族重估）/Dialog focus trap=底座全域既有（独立票域）/暗主题
  「深阶」实为浅阶（color-mix 自适应——措辞语境性）。
- 行数勘误（裁决部 A 项）：TagDropdown 实测 237 行/TagDropdownRow 244
  （批次报 232/241 失实——计数类数字脚本实测纪律重申）。
- EBUSY 瞬态：F-TESTREF 自检 5 例 Windows 文件锁族——1 次失败复跑绿+
  probe 场零复发，指纹已录未立案（再犯即立案）。
- CI 首查：本批一笔 run。

## §5 新会话开工序

1. CI 首查一笔 run。
2. B4 派发（票面=设计稿 §2 B4 节；#→· 与 YEAR-MO 全消费面 grep 盘点
   随票附；侧栏 resizer+48px 窄条+localStorage 持久；e2e=clamp 两界+
   刷新恢复）。
3. B4 毕后 B2→B3→C3（C3 输入=v1.6 机制定位版+T0 双红实锚）→C1→C2。

## §6 本场成本（收口登记）

- executor（GLM5.3 宿主随岗）：基批 14,290,086+RR1 6,582,064。
- 门一 k1（kimi-third $max）：一审 645,297+复核 489,136。
- 门一 d1（deepseek $max）：一审 1,624,073+复核 1,089,944。
- probe（GLM5.3 宿主随岗）：1,166,530。
- 裁决部（$max）：3,310,807。
- 合计 25,887,130 subagent tokens（裁决部复算两轮一致）。账本 644→
  652（B1 七笔+commit 行）。
