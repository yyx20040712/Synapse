# 交接书 v89 —— F-FOLDER-02 收口（2026-09-30）

> 前承 v88。本档=F-FOLDER-02（文件夹×脉络图绑定票 2/2 renderer+e2e）三屋全链
> 收口主记——本会话（复审收录批开工场）第三单元。全案=tickets/archive/
> F-FOLDER-02.md；证据=E:/zcode_md/synapse-archive/scripts-audits/2026-09-30_f-folder02/。

## §0 本场消耗（账本 348→354 行，累计 26 席）

F-FOLDER-02：executor 7634 万+门一 k1 3.2 万+d1 5.4 万+R1/R2 主控亲执+probe
87 万+裁决部 5.8 万。**门链实录**：①大票审包摘要化 vs 门一协议墙结构性矛盾
（d1 自declared 文字层 PASS）——probe 代码级补偿组合（独立 verify+变异抽查+
S 锚查证+退役亲读）经裁决部终裁认可；②R1 回炉三轮 verify 1→1→0（lint 未用
变量/契约夹具缺键/F5 断言设计错三红逐一归因——回炉面亲验必要性实证）；
③R2 三 W 实测对账（豁免 246=239+7——executor 终值 245 笔误；edgeCount 分支
互斥代码证；行数口径）；④F5 跨图改图 slot 归一修=executor 查证呈报+主控裁量
（W3 终裁对齐+M6 恰一红）；⑤reader-scroll 负载型 flake 4 现 filed 立案
（两场独立实证同指纹）。

## §1 基线终态（对不上禁提交）

| 项 | 终值 |
| --- | --- |
| verify | **204 件 / 2257 用例** EXIT=0（2219+37+1 分解在 archive §三——三轮亲跑终态） |
| e2e | **64/64**（55 既有+9 新） |
| locks | **299**（289+10：5 新单测+4 e2e spec+豁免 json） |
| 豁免 | **246**（239+7——executor 申报终值 245 系笔误，R2 实测闭合） |
| 通道 | **61**（不变——零新 IPC，grep+契约 pin 双证） |
| open | **2**（F-TESTREF-S1+F-LINEAGE-02 armed——F-FOLDER-02 翻 done） |
| 提交 | F-FOLDER-02 一笔[locked-change][test-refactor]+本档+archive 全案+flake 台账 |

**裁决链**：C2 幽灵边=主控终裁（导入侧跳过+计数+导出兜底）；F5=executor 呈报+
主控裁量修（W3 终裁对齐）；裁决部 GO_WITH_CONDITIONS **C1-C5 全落实**（C1
flake filed/C2 计数复录/C3 收口四件/C4 归档补录五项/C5 流程前置）。

## §2 待办面（进度记录——由用户指令驱动）

1. **F-FLAKE-02 修复票排期**（C1 立案）：reader-scroll「列宽基准」负载型 4 现
   ——排查单用例超时窗 vs 套件负载、CI 与本地并行度差、annotation-rect 渲染
   等待策略。台账 filed（cases 10）。
2. **C5 流程前置**（裁决部）：下一同类大票附 per-file hunk 摘要（或全量 diff
   摘要）支持门一逐行审——防摘要化审位缺口复发。
3. P2 池面（v87 §2 九条余项）：W1 桥信号/F1 upsert-node service 预检/W3
   maxLength 兑现/T4 标签 maxLength/W2 管理页重拉——随后续票搭车。
4. 池面：指纹门基线再生成窗口票；reader-scroll「收官全链」observing（另一 case
   首现在档）；findById 列单随 DETAIL 面扩列；F-LINEAGE-02 队尾挂账（图内真实
   连线素材已具备——票 2 图切换器落地）。
5. 移动文献 UI 入口（PaperDetailPanel 文件夹行）+moveFolder 逐篇挂接部分失败
   事务化候选——用户验视后定。

## §3 用户知悉/裁决口

- **[2026-09-30 裁决在档]**：P1-1=案 a（v87 §3）；C2 幽灵边=主控终裁导入侧
  跳过+计数（多图草稿正常形态——拒收整批破坏可用性）；F5 跨图改图 slot 归一
  =W3 终裁对齐（executor 呈报+主控裁量）。**验视面=F-FOLDER-02 六面**
  （文件夹区三态 chip/图切换器/删除弹窗/MetaEdit 月份+IF/导入「导入到」/
  多图草稿导入跳过计数 toast）——重开软件即验。
- 承 v88 §3 全项；W5 课题重名=主控裁决维持现状（id 唯一无歧义，单用户场景
  重名自担；如需校验另立小票）——复审开放疑问销项。
- 教训候选（待批）：v84 六+v85 三+v86 四+v88 二+本档三条（大票审包摘要化
  矛盾/计数笔误 R2 拦截/回炉三轮红亲验必要性）。

## §4 操作条款存续

承 v88 §4 全项（node -e 中文禁/退出码重定向/多行 Edit 锚块/回炉 untracked
重转录/行数 wc+1/TS 撇号/registry 引号面/受锁 unlock-apply 即时/自产脚本件
即时锁/每票独立提交/staging 显式列文件/计数实测/已查面勿重查）。
