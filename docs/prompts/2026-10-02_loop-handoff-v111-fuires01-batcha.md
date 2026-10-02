# 交接书 v111 —— F-UIRES-01 批 A 收口（2026-10-02）

> 前承 v110。本档=F-UIRES-01 批 A（库页资源管理器化·纯 UI 形态）三屋
> 全链收口（runId=20261002-f-uires01-a）。批 B（papers delete 通道）未启。

## §0 本场消耗与开工记录

用户开场指令=续 v110 开工序第 1 项（F-UIRES-01 批 A 实施）。技能清点：
ai-dev-org/TDD/subagent-driven-development/dispatching-parallel-agents/
verification-before-completion=用；systematic-debugging/frontend 族/
browser-use 族/dynamic-workflows/git 族=不用（纯实施批+既有 e2e 通道，
理由在档）。配置：executor×3 段/probe=随宿主（session:host-tier）；k2×2
轮=Kimi 链 $max；d1×2 轮/adjudicator=deepseek 异构 $max；视觉审=主控
4.5v 外呼通道（Read 图像 CDN 降级——probe 与主控同降级，申报在档）。

消耗：executor 三段（基批 54.5M+RR1 21.4M+RR2 5.1M）+门一四席（k2 首审
2.7M/复核 1.4M+d1 首审 3.8M/复核 1.9M）+probe 4.6M+adjudicator 13.0M
+主控亲执（e2e 三轮 62→67→68+verify 四跑+定位器修正一行+INV/设计稿/
registry 回写+视觉三幕）。账本 466→476（本批 10 行）。

## §1 基线终态（对不上禁提交）

- 提交三笔：cc193e78642（feat 批 A 主体 59 文件 4441+/2049-）+
  e9b35823f6c（docs 事故档十五节）+本档。**verify 终验 EXIT=0=241 件/
  2474 例**（基线 236/2423→+5 件[新 7−删 2]/+51 例）；**e2e 68/68**
  （64→68=library-explorer.spec ×4；主控三轮 62→67→68 轨迹在档）；
  **locks 334→340**（+8 新测试件+check-quality 同步）；**豁免 461→476**
  （+13 基批+2 RR1+#6/#12 reason 勘正）；registry F-UIRES-01 **维持 open**
  （批 A 注记入 summary——批 B 后整票翻）；check-tickets open=4 不变。
- 树态：18A+2R+4D+35M=59 路径全提交，零未跟踪零 stash。

## §2 交付与门链

- **交付面**（设计稿 v2.1 §8 批 A 全量）：FolderNav 224px 全高二级栏
  （三态/引导态隐藏面[App→LibraryPage guideHidden props 注入——禁跨
  feature import]/busy 禁用清单/右键三件含 P-8 跳脉络[open-lineage-bus
  新件=open-paper-bus 同型]/行内编辑三键范式+并发输入保留[F2 等价]/
  W1/W2 删除在途族三用例）+**退役五件**=FolderFilter/ImportTargetSelect/
  FolderRenameDialog/TagFilter/TagLifecycleMenu（TagRowMenu 两件版接替
  ——P-11 用户终裁；TagRenameDialog/TagColorDialog 保留；merge/delete
  UI 入口消失挂账 F-TAGS-02）+TagDropdown（全 props 承接+INV-53 死 id
  防御保留+TAG_FILTER_MAX+色映射通道同源）+导入条 42px（恒显「导入到：X」
  ——无筛选/未归档=主图 MAIN_GRAPH_ID 挂接=**语义变更随 v2.1 用户终裁**；
  hint 勘误文案 R4）+星标静态占位列（P-9/P-10，退出条件=F-STAR-01）+
  PaperRowMenu 两项版+移动子面原地展开（自裁#2 维持——▸ 形态差异登记）+
  行拖拽（MIME 双域判别/ghost 单影[原生 drag image 抑制]/空白释放=取消
  /目标消失护栏/收尾两分支）+S6 未归档空态。
- **门链**：executor 基批六单元（首红全量+四变异）→**门一双审双 FAIL
  （k2 B2/W7/N12+d1 B1/W4/N9——双席零重叠 B 级：k2 抓计数域查询态失真
  [mockup S1 直接反例]+空白 drop 误执行；d1 抓布局构图偏离四栏定义
  [FolderNav 被压低 88px]+skipBlur 泄漏——与主控 e2e 首跑 F1[改名 Enter
  永不提交]精确互证=静态推演×运行时证据同源闭环）→RR1 19 项→双席复核
  双 PASS_WITH_CONDITIONS（新 W 收敛=toast 条件反转[双席同中]/W1W2 三
  用例迁移灭失+豁免 reason 失实[k2 独中]/skipBlur 跨会话[d1 独中]——
  二次对抗仍出增量）→RR2 6 项→probe 矩阵 7/8（verify 独立复跑+变异三证
  签名一致+几何 9/9[Δtop=0/计数恒稳实态]+树态对账；唯一 FAIL=G④ flaky
  首现 1 次未达 2 次立案线）→**裁决部 GO_WITH_CONDITIONS**（闭合 23/
  部分闭合 1/登记 13/维持 5/驳回 0——说了没改抽查 9/10 唯一抓漏=头注
  公式句一行；复算八组全成立[裁决部勘正：本批简报「locks 333」系笔误
  实为 334 基线]）→C1-C4 全兑现。

## §3 主控亲执三件（申报）

①tag-lifecycle 定位器修正（Playwright filter({has}) 重根坑→行全文
正则锚——单 spec 复跑绿 raw 在档；教训档十五节②）；②registry 三张
done 票 file 指针 TagFilter.tsx→TagDropdown.tsx（executor 禁区代庖面）；
③diff 包生成两踩 add -N staged 删除坑（首轮自查拦+RR1 后重踩由 d1-N5
抓出——树内确删纯打包伪影已闭环；教训档十五节①）。

## §4 挂账与登记（单源=本档+裁决部 C3/C4）

- **G④ flaky 观察项**（lineage-topic-node.spec:149 存量幽灵边用例）：
  60s 超时形态首现 1 次（probe 全量跑，并行 locks:check 负载敏感可能）；
  复跑绿+主控三轮同位绿——**未达 2 次立案线，指纹记录在档；批 B 开工
  首动作=全量 e2e 复跑，若再现即立案**。
- **批 B 承接清单**（裁决部 C4）：S5a「删除文献」锚+菜单点亮；移动子面
  ▸ 形态（如用户视验要求）；stale 注释清扫六处（TagEditor.tsx:119/
  tags.store.ts:22,58/paper.ts:112/FilterBar.tsx:47/library-cards.
  test.tsx:27-35,407/app-shell.test.tsx:26——现仍指 TagFilter/FolderFilter）。
- **F-TAGS-02 承接登记**：merge/delete UI 入口恢复+INV-53 顺序契约判别
  力锚补（批 A 防御保留零入口——invariants.md 已降级注记）；tags.store
  mergeTags/deleteTag 动作零 UI 消费维持（域层完整性）。
- **观察项**（裁决部 P3+双席 N 汇总）：busy 菜单移动×拖拽禁启不对称
  （设计稿字面）/未归档候选态无「移入」徽标/TagDropdown Esc×Dialog 层
  盲区/unfiled 计数失败静默 0+引导态空耗查询/双查询落定瞬态/dragleave
  未派发无坐标兜底+relatedTarget null 真机可靠性/移动子面原地展开视觉
  差异——**前两项建议并入用户视验回执单**。
- 证据规范：六件历史 raw 无 exit 尾行（基批 3+RR1 3——红绿态由计数行
  自证，probe 覆盖；下次 executor 派发条款补「每 raw 尾行必附 exit=$?」）。
- 基批回执计数失准（RR1-18 认领：新增 22/删除 5/修改 29 实为 17A+1R/
  5D+1R/33M——计数纪律条款已载宪法，本批如实入档不再回改）。
- DB 窗口挂账维持后置（F-TAGS-02/F-STAR-01）；S5 盲形清单搭车条款承
  v110 §4 不变；视觉回归关注点承 v107 §5.3+本批「列表题名呈链接蓝」
  （存量主题行为非本批引入——真机视验时可顺带确认）。

## §5 新会话开工序

1. **F-UIRES-01 批 B**：papers delete 通道（repo+service[withTransaction
   统一级联+事务内重验——设计稿 §2.4 FK CASCADE 实证清单 001/003/004]
   +IPC+shared schema **[locked-change]**）+删除流两分支（静默判据/保护
   弹窗 S5b）+菜单删除项点亮+S5a 删除锚；**开工首动作=全量 e2e 复跑**
   （G④ 观察项）。前置回读：设计稿 v2.1 §2.4+§3.5+§3.9 S5b 锚。
2. 批 B 收口后 F-UIRES-01 整票翻 done（批 A 注记已在 summary）。
3. F-UIRES-02（输入交互全域统一——批 A 行内编辑三键范式为基准形态）。
4. DB 窗口挂账维持后置（F-TAGS-02 域化须回读 v2.1 §2.1 tagIds 过渡锚
   +本档 §4 F-TAGS-02 承接登记；F-STAR-01 starred 点亮[P-9/P-10 退出]）。
5. S5 盲形清单随 F-TESTREF 续域任意票搭车或单独小票。
6. 用户视验回执单候选：busy 不对称/未归档徽标两项+题名链接蓝确认。

## §6 操作条款存续

承 v110 §6（=v109 §6=v108 §6=v107 §6）全项。账本行 schema 单源=
ai-dev-org references/02 §9；tier 记法 model-field: 前缀（会话内随宿主=
session:host-tier）。事故档回流状态：**本批两条已回流**（十五节①②）。
