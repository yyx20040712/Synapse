# 交接书 v125 —— 对齐批单元二收口场：未归档域退役+导入落夹单跳+删夹域删级联（2026-10-04）

> 前承 v124（单元一收口+三呈裁落定）。本档=同日续场：CI 首查收口→
> 单元二实现批全门链（executor TDD→门一双审→RR1→k1 delta 复核→RR2
> 主控亲执→门二实证→主控亲验→提交推送）。

## §0 本场消耗与开工记录

用户指令=「基于 v124 指引继续开发」。技能：ai-dev-org=用（三屋全链+烤验
表）；subagent-driven-development=用（executor/门一 k1+d1/probe 五岗
子代理）；verification-before-completion=用（收口亲验真退出码）；
systematic-debugging=用（executor 内两轮排障+门二负锚归属定性）；
test-driven-development=用（executor 内部承载）。配置=主控单岗
（GLM5.3 宿主）；ops-executor/ops-probe 随宿主（未绑定形态，账本记
session:host-tier）；门一 k1/d1 绑定 $max（三轮：首审双岗+delta k1）。

## §1 基线终态（对不上禁提交）

- 仓库=4b18a01c61d（单元二）+32e4cea3ace（v124 docs）已推送；工作树清洁。
- **CI 待出**：4b18a01c61d 的 run（含 e2e 全量+范围闸+尾注检查）——下场开场首查。
- **CI 首查已收口（本场开场）**：5ae741c11c2 专属 run 37189028066 被
  v124 push concurrency 取消（非失败）；32e4cea3ace 的 run 37189091423
  =success 且树上含单元一全部代码——e2e/指纹门/范围闸/尾注全绿，
  **T1/T12 族 CI 首跑绿+P7-B/:266 指纹维持**，单元一代码面 CI 验证据此达成。
- 活库无变化（未归档存量 v122 已归档；本批纯应用层无迁移）。

## §2 单元二落地全链（commit 4b18a01c61d，58 文件 +1047/−683）

**交付面（D5+D3+D4）**：
- **D5 未归档域一揽子退役**：folderScope 删 unfiled 变体（两态 all/folder）
  +paperMoveReq.toFolderId 收紧 min(1)（null 移出路径全域消亡）
  +moveFolder 分支①删（removeNodeByPaperId 死码连带整删——repo 接口+
  实现+语句）+renderer 六消费面删（FolderNav 未归档行/独立计数、
  FolderNavRows 未归档行〔分隔线保留〕、PaperRowMenu「未归档（移出）」
  项、DndTarget 单态、PaperList 专属空态/emptyScope prop、useFolderDrop
  收窄）+useFolderNavEdit reloadUnfiledCount 依赖删+buildFilters unfiled
  分支删。
- **D3 导入落夹 main 侧单跳**：三通道（fromDialog/fromFolder/fromPaths）
  Req 扩 targetFolderId 必填（**主控补正-1**：设计稿漏 from-paths——拖拽
  共用 runImport 壳+后挂接链，链删后拖拽必须带落点）+importOne 落夹
  建节点（`collection?.id ?? targetFolderId`——原「根文件不建节点」废止）
  +renderer 后挂接链（ImportDropZone 逐个 moveFolder）删+**import.service
  双播出口**（executor 自裁：单跳吸收挂接语义后 e2e 实证侧栏计数滞旧
  ——folders.changed+lineage.changed，imported>0 恰一次/全重复零播）
  +preload apiDrag.importDropped 带参。
- **D4 删夹=域删级联**：folders.service delete 事务重写=先
  papers.listIdsByFolder 逐个 papers.remove（DDL 级联链）→folders.remove
  （主图禁删+S1 闸+NOT_FOUND 保留）+useFolderDelete 静默判据
  **全实时源**（RR1：graph+library.list limit:1 双预检 Promise.all——
  快照 TOCTOU 修复；onHasAssets 传实时 paperCount）+FolderDeleteDialog
  域删预告文案+FolderMenu「空图直删」→「空夹直删」连带（自裁 10）。

**门链实录**：
1. executor TDD：29 例先红+2605 单测+75 e2e 全绿+4 变异红证
   （D4 事务序/importOne 落夹/静默判据/moveFolder null 拒）+12 自裁申报。
2. 门一双审：k1=B0W2N8 PASS_WITH_WARNINGS / d1=B0W4N7 PASS_WITH_WARNINGS
   （**均无 Blocker**——不同于单元一 k1 首审 FAIL）。
3. RR1 四修：W-A（k1-W1/d1-W3 双岗一致=静默判据 paperCount 快照
   TOCTOU——D4 域删语义下 false-silent=文献永久灭失无预告；修=全实时
   源+两新锚先红后绿）/W-D（d1-W4=事务回滚无测试——真库 spy 注入
   用例）/k1-N2（FTS 正对照——防 CJK 分词不命中恒绿）/k1-N3（e2e
   拒 null 后零副作用锚）。
4. k1 delta 复核=B0W1N2 PASS（W1=e2e 标题失实一行+N1=moveSub 正对照
   ——RR2 主控亲执销项）。
5. RR2 主控亲执：e2e 标题同步+moveSub 文件夹项正锚+**CSS 死代码
   .lib-empty-unfiled 删**（门二负锚实证 A2——executor 改 PaperList 时
   漏删 CSS 类，全仓零引用确认后删 3 处）。
6. 门二 probe 独立重跑：verify **EXIT 0**（2605 单测+指纹门 files 278/
   cases 2680/assertions 8491+locks 353 一致）+e2e **75 passed (3.5m)
   25 spec 零 flaky**+exemptions 实证（本批 +10 条如实消费——门一
   k1-W2/d1-N7 悬置项终裁销项）+负锚采证（4 命中→RR2 处置）。
7. 主控亲验：verify **EXIT=0**（真退出码——直跑重定向取码）+e2e 抽跑
   library-explorer.spec 6 passed（含 S6 空态新用例）+负锚收口
   （unfiled src 零命中/未归档仅 012 迁移历史注释 1 处豁免）+locks 353
   同步（删 1 增 1 相抵+CSS sha 更新）。

**记档不修（主控裁决）**：
- d1-W1 导入写路脱离 S1 闸（INV-91）：威胁模型=移动/删除既有文献复活
  孤儿节点；导入新增文献+新节点不在威胁面（旧集合分支先例本就不过闸）
  ——**口径注记归单元四 D9 INV 改写**。
- d1-W2 全部计数=Σ paperCount 不含 NULL 历史行：设计申报窗口期
  （D 批 DDL 收紧），活库已无 NULL 行，接受。
- k1-N1 importFolder 全重复零播但新建空夹行/门一 N 级余项（目标夹灭失
  FK 英文错误等）：低概率边界记档。

## §3 挂账与登记

- **单元四票面就绪**（设计稿 §3：D9 INV 登记〔INV-88/92 改写+三新 INV
  +INV-87 作用面收缩+INV-91 口径注记——本批新增〕+defense-lifecycle
  治理登记+D 批台账挂账〔W2 条件〕；B=负锚词表入 quality+exemptions
  终审+基线再生成+ADR/架构回写）。
- **B 批新立案（承 v124）**：工具条几何遮挡（k1-W1 产品面浮层——RR2
  探针证据在案）。
- A 批余项（A1b/A2/A3）票面已按 patch-node 口径对齐——穿插视用户指令。
- 悬浮笔记批（floating_notes 数据模型候选）在对齐批后。

## §4 新会话开工序

1. CI 首查：4b18a01c61d 的 run（e2e 全量+范围闸——单元二改写面
   CI 首跑+指纹门维持）。
2. 单元四启动（executor TDD→门一双审→门二）或视指令穿插 A 批余项。

## §5 操作条款存续

承 v124 §6 全项（实证终裁优先/回炉 delta 收口/管道退出码直跑取码）。
本场新增口径：**负锚 grep 面=src/ 全文件类型含 CSS/SQL**（executor
申报「零命中」失实——其 grep 面未含 CSS；门二全类型重扫实证 4 命中）
——负锚验收以门二/主控全类型 grep 为准；**迁移文件历史注释豁免**
（migrations/*.sql 反映撰写时态设计，不追改——012:66 先例）；**已审面
微修（一行级文案/锚点）主控亲执+delta 复核呈报即可，不重开 executor 轮**
（RR2 先例）。账本 617→621（本场四行：impl/gate1/gate2-probe/commit）。
