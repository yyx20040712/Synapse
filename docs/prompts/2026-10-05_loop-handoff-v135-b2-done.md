# 交接书 v135 —— F-UIRES-03 B2 详情面板+AI 评估与建议批交付（2026-10-05 晚场五）

> 前承 v134（B4 交付）。本档=B2 批三屋全链交付全录+两项呈报（均已裁决
> 2026-10-05——见 §4：AI 入口退役方案维持+卡钮并入 C3）+F-LOCATE-01 批准。

## §0 本场消耗与开工记录

技能清点：ai-dev-org=用（三屋链）；test-driven-development=用（executor
三轮 TDD 面+RR 先红后绿×2）；verification-before-completion=用（verify
亲验真退出码×2+e2e 四件亲跑面经 probe）；systematic-debugging=不用
（无排障——T4 几何断言不达属产品缺陷发现非排障流程）。配置：
executor/probe=宿主随岗（GLM5.3 未绑定形态——账本记 session:host-tier）；
门一 k1（kimi-third $max）+d1（deepseek $max）双审；裁决部 $max 绑定。

## §1 基线终态（对不上禁提交）

- 基线=7cafc2a4b77（v134 B4，CI success 亲验——本场首查 run 37290814300）。
  本批=B2 一笔（diff 46 文件 +806/−2918+新件 4：LineageSideFragments.tsx
  147 行/lineage-open-bus.test.tsx 81/seed-ai-note.mjs 33/seed-annotation.mjs
  37——RR2 后实测口径）。verify 终验 EXIT=0 亲验（249 件/2553 例）
  +locks 353（scripts/audits 条目归零）+test-surface 85/85 hits stale 0。

## §2 B2 交付摘要

- **四件全落地**：①详情面板三节新序（DOM 序=全文笔记→片段笔记→AI 评估
  与建议——「四删三立」：LineageSideManualNote 更名全文笔记/
  LineageSideAiNotes 更名 AI 评估与建议/postpone 占位章退役）+三节
  loading/error/空态文案字节级锁定（AI 节 loading/error=「AI 评估」短名/
  空态=「AI 评估与建议」全名——票面不对称保真）。②LineageSideFragments
  新件（api.reader.listAnnotations 全量不过滤——与阅读器片段节同域同名同序
  〔INV-101 显示口径注记入册：kind='note'+comment=三表分域指称非显示过滤〕
  +sortByDocumentOrder 单源+stale 守卫+COLOR_SWATCH 跨域受控例外
  〔check-quality 白名单+1 行〕）+片段双击跳阅读器（anchorPage=
  Annotation.page 0 基直传——单测钉形+变异 A 红证；Enter 键盘等价=
  !e.repeat 守卫+变异 C 红证——B2 后全应用唯一保留双击链）。
  ③阅读器 AI 链全退役（6 src 件删：AiNotesSection/AiNotesStatus/
  AiNoteGroupList/AiAnnotationLayer/ai-notes.store/ai-notes-phase
  +12 词 src 零命中：aiNoteId 族/notifyAiNoteHighlight/flashAiNote/
  resolveAiNotesLayered 等）+INV-105 登记（AI 显示单面——三层锚定=
  grep 负锚+测试负锚+变异 B 双向红证，裁决部判超登记册中位）。
  ④T4 e2e 改写（createMultiPagePdf(3) 多页判别+P2 行断言+页级停驻边界
  如实声明）。
- **门链**：executor 基批（自裁 11 条全追认）→门一 k1 B0/W6/N10+d1
  B0/W3/N8 双有条件放行→主控豁免 30 条+registry 三指针迁移（SR2-AI-08/
  09/11→LineageSideAiNotes，R2-LG9 同型）+AI 入口退役裁定→RR1 六项
  （两节文案锁定/T4 多页强化/Enter 等价/排序断言/INV-101 注记/指纹如实报
  ——**降断言自裁：T4 几何断言实测不达=产品缺陷发现**）→双席复核双 PWC
  （k1 5/6 兑现——W-RR1-1 判别力失实+W-RR1-2 候选票态；d1 C1C2 兑现
  ——W2 归因单边+W3 e.repeat）→**F-LOCATE-01 正式立案**+RR2 微修
  （e.repeat+T4 挂票号+如实口径）→probe 九项矩阵 7 绿 2 红（红=A1
  主控工具件未入 manifest——收口迁仓外 9 件+manifest 361→353+verify
  亲验 EXIT=0 闭环）→裁决部 GO_WITH_CONDITIONS 五条件全兑现（C1 账本
  补登/C2 终态落档仓外/C3 取证缺陷并票/C4 陈旧注释后续票/C5 行数实测
  147）。**零回炉终态**（三轮 executor=基批+RR1+RR2，回炉限额内 2）。
- **豁免 85 条**（基批 30=4 FILE+23 CASE+3 ASSERT+RR1 拆件迁移 3
  +前批余 52；85/85 hits stale 0）：B2 的断言字面量改写面与整件退役面
  双源；负锚拼接构造（['评估功能','后置'].join('')）使矩阵② tests 面对
  该两字面失效=已申报工艺边界（k1-RR1-N5 注记）。
- **ui-constants.ts diff（d1-④ 条件兑现——纯注释）**：OP_FAILED/
  STATUS_POLL_MS 两常量消费清单注记随 AiNotesStatus 退役删行（「AiNotesStatus
  」字样两处移除+[F-UIRES-03 B2] 注两句），零逻辑变更。
- **probe 矩阵**：verify EXIT=0（A1 处置后亲验；处置前 quality/
  test-surface/tickets 三段绿+四段补跑逐段 0）+e2e 四件（lineage 15/15
  含 T4+样板①②③/smoke 6/6/reader-text 18/18/reader-scroll 2/2）
  +变异 A/B/C 三红证（还原复绿 22/22×3）+grep 五面（「AI 笔记」src=0/
  12 词全 0/fragments testid/F-LOCATE-01 票锚）+三节序 verbose 绿。
  证据全档=仓外 E:/zcode_md/synapse-archive/scripts-audits/
  f-uirs03-b2-gate2-probe/（+f-uirs03-b2/ 终态 diff-stat+verify log）。

## §3 操作条款增补（承 v134 §3 全项外）

- **主控侧工具件纪律**（裁决部 G+A1 实锤）：主控自写 scripts 工具件
  （账本笔/探针/登记器）同样受「写完即时 locks:generate+apply」约束
  ——walk 拦截面不分作者。**后续一律直写仓外档案区**（
  E:/zcode_md/synapse-archive/scripts-audits/<批次>/）不经仓内中转——
  收口免迁运+manifest 恒净。本批 9 件已迁（f-uirs03-b2/）。
- **判别力表述纪律**（k1-W-RR1-1）：e2e 断言的判别力描述必须与断言
  语义一致（toBeVisible=CSS 可见非视口相交）——「跳转完全失效即红」
  类声称需断言可红性实证；不可红=如实声明边界+挂票（T4 形态先例）。
- **预期红豁免预判三现勘误**：RR1 拆件迁移（跨文件例签名不抵扣）也产
  MISSING_CASE 红——豁免登记面=删例/改例/迁例三族，非仅前两族。
- **中文探针零 shell argv**（三犯实录：本会话 node -e 中文 3 次静默失败
  ——账本追加失败/标题比对失效/GBK 化）：含中文字符串的 node 操作一律
  Write 文件跑，无一例外（含「只是追加一行 JSON」类小操作）。

## §4 挂账与下场首办

- **呈报①〔已裁决 2026-10-05：未否决=维持退役〕——AI 触发入口退役**：「AI 读文献」「导入
  AI 笔记」两钮随阅读器 AI 区整删（B2 票面内=裁决部 A 项认可；依据=R2
  §9.1「AI 笔记全部退役…不占位」+设计稿「整删不留占位」）。后果=UI
  全应用暂无 AI 评估生成/导入入口（已有库内数据正常显示于详情面板节）；
  main 侧 ai_sensor 服务/IPC 全留驻（INV-101 域不变）。恢复入口=用户
  裁决位（需要即另立票）。
- **呈报②〔已裁决 2026-10-05：「并入任意一票」——主控落位 C3〕——R2
  §1.5 卡双击退役+两钮**：「卡上双击跳转整体退役+卡上放『去文献库』
  『去阅读器』两钮」用户 R2 落定但未入 F-UIRES-03 七单元——用户裁决并入，
  主控落位 C3（**设计稿 v1.7 §2 C3 票面已增补**：handleCardDblClick/
  onNodeDblClick 卡双击链退役+insp-foot 注记随改+两钮〔去文献库=打开
  所在文件夹定位/去阅读器=开篇打开〕+主题节点态+e2e 面——C3 派发时
  随票携带）。
- **F-LOCATE-01（open，用户批准 2026-10-05）**：跨视图跳转页级停驻竞争（TabState.page 回写 0
  +scrollTop 恒 12——anchor-locate setPage 被 scroll-progress 恢复链/
  镜像回写竞争覆盖；归因=机制论证：旧链 AI flash 滚动补偿掩盖，B2 退役
  补偿路径后暴露，竞争链三件 B2 diff 零触碰）+e2e 取证基建缺陷并票
  （error-context 覆写致指纹不可采样——裁决部 C3 升格）。T4 页级判别
  断言随票回补；**修复前 T4 不得以「跳转链已测」名义引用**（注释承载
  非机检——后续批次人工复核，裁决部提醒）。
- **下场首办=B3 阅读器保存按钮**（设计稿 §2 B3：四态钮+pending 缓冲
  状态机补格+卸载面机制句+新增序列用例三族〔pending 维×切走切回/关
  面板/退出〕——受锁豁免登记 delta-W2a 构造性覆盖；StatusBar 全局
  「已保存」主控自裁保留不动）。
- C4 陈旧注释搭车：ai-sensor.service.ts:15「AI 读文献」钮引用+
  check-quality.mjs:91「AI 笔记分节」措辞——后续票清理（INV-105 负锚
  面=src，scripts 注释不违锚但留歧义）。
- N 级备案（全提示级）：toContain 子串边界（文案前后拼接字符不敏感）/
  Enter 无 preventDefault（无双发路径——button 无 onClick）/同页 offset
  排序维缺口（shared 单测面补）/testid 语义陈旧（lineage-side-ai-notes/
  manual-note 两 id 后续 test-refactor 评估）/Space 注入粒度（keydown
  级非 press 全链）/样板②指纹未采样（用例名在案+基批后 4 连绿——
  2 次立案线观察中）。
- CI 首查：本批一笔 run。

## §5 新会话开工序

1. CI 首查一笔 run（B2 提交）。
2. B3 派发（票面=设计稿 §2 B3 节+INV 候选 4；「notes.store 既有防线族
   七用例在基线」§0.4 事实随票附——B3 只补 saving×输入格+pending 族
   三序列）。
3. B3 毕后 C3（输入=设计稿 **v1.7**〔含卡双击退役+卡面两钮用户裁决增补
   项〕+T0 双红实锚+F-LOCATE-01 无关——拖拽域）→C1（迁移 015 挂靠）→C2。
   C3 派发前瞻（k1 单审 N4/N5/N7 销项）：①LineageTimelineCard 行数预核
   （增补两钮+退役双链后逼近组件 ≤250 行预算即先拆件）；②主题节点
   「去阅读器」零渲染/禁用态=实现者自裁申报项，C3 收口回写票面定稿；
   ③C3 实施触 tests/**（受锁）——locks 流程+[locked-change] 尾注+受锁
   e2e 改动后全量 verify（tsc 关卡）随批；④「去阅读器」=
   requestOpenPaper 单字段语义派发时核对现签名。
4. 呈报两项已裁决（§4——呈报①维持退役/呈报②并入 C3 v1.7/F-LOCATE-01
   批准），无待裁阻塞项。

## §6 本场成本（收口登记）

- executor（GLM5.3 宿主随岗）：基批 41,190,772+RR1 22,257,309
  +RR2 4,415,006。
- 门一 k1（kimi-third $max）：一审 28,838+复核 26,045。
- 门一 d1（deepseek $max）：一审 78,434+复核 44,600。
- probe（GLM5.3 宿主随岗）：1,252,773。
- 裁决部（kimi-third $max）：2,724,337。
- 合计 72,018,114 subagent tokens（裁决部独立复算前置链 69,293,777
  两轮一致+本席 2,724,337；主控复核对账一致）。账本 664→676（B2
  十二笔：impl/k1/d1/ruling/rework×2/复核×2/ruling/probe/裁决部/commit）。
