# F-FOLDER-02 全案 —— 文件夹×脉络图绑定票 2/2「renderer+e2e」（2026-09-30）

> 票：tickets/registry.ts F-FOLDER-02（open→done）。前置=票 1（548dfda）收口。
> 设计真相源=docs/design/2026-09-30_ffolder01-design-final.md §4/§5（终裁版）
> +拟定稿（E:/zcode_md/synapse-archive/scripts-audits/F-FOLDER-01/drafter-output.md）。
> C2 幽灵边=主控终裁（2026-09-30）：导入侧跳过+计数告知为主（多图草稿正常形态，
> 拒收整批破坏可用性）+导出面过滤兜底+e2e 锚。主控细化：导入默认=folder 态
> 筛选时该文件夹/无筛选=仅入文献库；S4 回退目标=主图 '__main__'（恒在场不可删）。
> 证据档案=E:/zcode_md/synapse-archive/scripts-audits/2026-09-30_f-folder02/。

## 一、交付面（31 M+16 新件，+588/-132）

| 面 | 件 | 要点 |
| --- | --- | --- |
| A 文件夹区 | FolderFilter.tsx(230 新)/FolderMenu.tsx(55 新)/FolderDialogs.tsx(175 新)/FilterBar.tsx(143→123) | 三态 chip+右键菜单+新建内联 isComposing+重名 toast；旧下拉退役删除；F4 顺带修 unfiled 显示 |
| B 图切换器 | LineageGraphSwitcher.tsx(108 新)/lineage.store.ts(535)/LineagePage.tsx(137) | 全部图并集首项+S3 联动+S4 双路径回退+S2 禁切；store +folderId 态 |
| C 删除弹窗 | FolderDialogs 内 | 三计数（nodeCount/edgeCount=graph 派生+paperCount=list 载荷）文案逐字=N2 |
| D MetaEdit | MetaEditDialog.tsx(168)/PaperDetailPanel.tsx(229) | onSaved 链 loadLibrary+月份 1-12/IF 字段+期刊后 IF 灰字 |
| E 导入语境 | ImportTargetSelect.tsx(55 新)/ImportDropZone.tsx(248)/LibraryPage.tsx(108) | 「导入到」选择器+renderer 侧逐篇 moveFolder+import-busy.store(S2 源) |
| F e2e | 五 spec 9 用例 | folders-crud(1)/import-to-folder(3)/move-paper(1 含 S1)/meta-year-month(1)/lineage-topic-node(3 含 S4+G④)；真实文本断言 |
| G C2 落地 | lineage.service.ts/lineage.assemble.ts/export_.test.ts | importDraft 跨图边跳过+计数+导出过滤+夹具清理 |
| T1 搭车 | Dialog.tsx(98)+dialog-esc-compose.test(3) | Esc isComposing 早退 |

## 二、门链实录

1. **executor**（7634 万 tokens/389 调用）：分四批 TDD（首红 6/7/收集失败×2 形态）；
   变异 M1-M5 红证（备份法还原 diff 空）；自裁 12 条（五项主控追认=全部图并集首项
   [保既有缺省零变]/S4 主图回退/renderer moveFolder 挂接/S2 e2e 裁剪至单测[跨页
   busy 窗口结构性竞态——80/200 份 PDF 实证]/月份入口补面[契约票 1 已含 month]）；
   新订阅面 folders.changed 波及 8 既有受锁测试件补桩（保 it title 零改）。
2. **门一 k1**（main/契约域分域审）：PWC B0W2N8——W1 豁免计数/W2 edgeCount 无证
   （R2 双闭）；N8 含 N1 year 必填（R2 闭）/N3 悬挂边备查/N5 导出静默=终裁明许。
3. **门一 d1**（renderer/e2e 域分域审）：PWC B0W2N11——W1 行数口径（R2 闭）/
   W2 豁免同 k1（R2 闭）；**N1=审包摘要化结构性限制**（大票 diff 未全内联——
   本席自declared PASS 仅文字层；probe 代码级补偿组合经裁决部终裁认可[待裁点 1]，
   **C5 流程前置=下一同类大票附 per-file hunk 摘要**）；N2 S3/S5 锚（probe 闭）/
   N3 全部图首项（主控追认）。
4. **R1/R2 主控亲执**：R1=shared 契约行（skippedCrossGraphEdges 必填——service
   恒返回严于 optional）+toast 接线+F5 归一修（normalizeMonthSlot 组键三面
   [folderId,year,month]：跨组归一/同组主权/新建透写——**W3 终裁原文**「节点
   已存在且跨图移入→slot=目标组 max+1 归一（旧句『不重排 slot』废止——R2 回炉
   勘正，同组撞值防护）」=docs/design/2026-09-30_ffolder01-design-final.md §2；
   原实现透写/保留两分支均不比较 folderId+write-guards:52 注释引废止旧句——
   executor 查证呈报主控裁量修）+M6 变异（sameGroup 移除 folderId 比较→恰 1 红）
   +lint occ/契约夹具缺键/F5 u2 断言三红勘正（u1 移完后同组保留 6=正确行为，
   原断言误解规约——缺省路改第二节点构造）。三轮 verify 1→1→0。R2=三 W 实测
   对账（豁免 **246=239+7** 精确——executor 终值 245=笔误增量申报正确；
   edgeCount :380 与 skipped :370 分支互斥代码级在证；行数 230 新件最大/248 改件
   合规）。
5. **probe 7/7**（87 万 tokens）：独立 verify EXIT=0（204/2257）；变异抽查（C2
   判定 !==→===→4 failed 含 C2 专属两用例+cmp 字节级还原）；六文件定向 169 绿；
   退役残留=唯一命中退役记载注释+JSX 零残留亲读；S3=folders-crud:44-58 真文本/
   S4=Switcher:59-69/S5=migrate 15/15；豁免 246/locks 299 精确；零写入证明。
6. **裁决部 GO_WITH_CONDITIONS C1-C5**：C1 flake 实质立案（filed）/C2 计数复录
   （通道恰 61 双证：grep 61+契约 pin toBe(61)）/C3 收口四件/C4 归档补录五项/
   C5 大票 diff 摘要制。待裁点五项全成立（摘要化+probe 补偿组合认可[附 C4 登记
   义务]；R1/R2 亲执+事后双审覆盖合宪[尺度边界：增量若触跨契约语义/新 IPC 则判
   回炉]；自裁五项追认得当；flake 不阻塞本票；收口条件确认）。

## 三、收口验证

- verify 亲跑三轮（1→1→0 终态 **EXIT=0：204 件/2257 用例**）；e2e 三轮（终态
  **EXIT=0：64/64**=55 既有+9 新）。
- locks **289→299**（+10=5 新单测+4 新 e2e spec+豁免 json）；豁免 **239→246**
  （+7=6 断言随契约加严[toEqual 增键非削弱]+1 Board 单断言签名变体；rulingLink
  =design-final 沿票 1 先例）；通道 **61 不变**（零新 IPC——grep 计数+契约 pin
  双证）；manifest 与提交同体（[locked-change]）。
- 用例分解：2257=2219（v86 基线）+37（executor 单测新增——五新单测文件
  folder-filter 11/lineage-graph-switcher 6/dialog-esc-compose 3/import-to-folder
  N/meta-edit-dialog N+既有文件扩展）+1（R1 F5 用例）。
- **C4 归档补录五项**：①d1-N1 残留=渲染域约千行增量无逐行独立审（覆盖边界
  已知——e2e 真文本锚+probe 代码级补偿承接）；②M6 变异=主控自证（独立位未复做
  ——测试敏感度+probe 全量+e2e 行为锚三重间接覆盖）；③W3 原文指针=design-final
  §2（本档二.4 全文引）；④2257 分解=本节；⑤moveFolder 逐篇挂接**部分失败语义**
  =第 k 篇失败时前 k-1 篇已挂（renderer 无回滚——单用户导入量级+失败 toast 呈报，
  重导入幂等[upsertNode]——备案，如需事务化另票）。

## 四、flake 立案（C1）

reader-scroll「列宽基准-标注原位抽验-离屏回收-进度恢复」负载型 **4 现**
（executor 场 2+主控 R1 场 2，指纹同型=:176 annotation-rect testid 全量负载下
timeout；隔离恒绿 2.8s；第三轮全量 64/64 绿）——台账 filed（cases 9→10）+
修复票 F-FLAKE-02 排期（v89 §2）。本票零 reader 域触碰=非本票引入。

## 五、负面申报（未做面）

移动文献 UI 入口（PaperDetailPanel 文件夹行——票面 A-F 未含；移动链经
window.api 真通道 e2e 驱动）；G① toast 已随 R1 契约行落地（executor 呈报的
缺口闭）；registry/src/shared/CI/lint 配置/新依赖=executor 零触碰（shared
契约行=R1 主控亲补）；主进程面=仅 G 两文件+write-guards（F5）。

## 六、教训候选（待批）

- 大票审包摘要化 vs 门一协议墙的结构性矛盾——C5 前置（下一同类大票附 per-file
  hunk 摘要）入 v89 待办。
- executor 计数申报终值笔误（245→246）——计数类数字落笔前脚本实测纪律的又一
  实证（R2 对账拦截）。
- 回炉改动引入三轮红（lint 未用变量/契约夹具缺键/断言设计错）——回炉面亲验
  verify 的必要性实证（executor 绿≠回炉后绿）。
