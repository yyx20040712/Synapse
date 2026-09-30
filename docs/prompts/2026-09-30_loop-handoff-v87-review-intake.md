# 交接书 v87 —— 复审发现收录+P1-1 立案（2026-09-30）

> 前承 v86。本档=晨间复审发现收录批（工作单元一：v87+registry 两件，小批）。
> 复审报告=真相源：`E:/zcode_md/synapse-archive/scripts-audits/2026-09-30-morning-review/report.md`
> （同目录两提交态快照+四份 diff，只读参考）。

## §0 开工纪律记录（技能清点+配置自查，2026-09-30 会话开篇）

- **ai-dev-org**：用——用户点名加载；组织规范+烤验分级（本批=小批→R5 修订一口径：
  门一单审 d1+主控亲验全机检矩阵）。
- **verification-before-completion**：用——收口 verify 亲跑真退出码（重定向取值禁管道）。
- **test-driven-development / subagent-driven-development**：不用（主控侧）——实现面
  TDD 由单元二三屋 executor 子代理承载，派发模板指针=docs/methodology.md §4，
  避免与组织规范双源。
- **systematic-debugging**：不用——P1-1 根因已经复审场定位在档（报告 P1-1 段），
  本批无新调试面。
- 其余工程技能与纯文档+registry 收录批无涉：不用。
- 配置自查：主控=GLM5.3 会话模型（宪法「GLM5.3 主控终裁」一致）；本批派发=
  ops-gate1-d1（deepseek 异构位，绑定子代理 $max 档）；单元二三屋派发按
  methodology §4.5 档位表（executor=随宿主[2026-09-19 裁决未绑定形态]／门一
  k1[源A 常设]+k2[备源]／d1 异构位／门二实证+裁决部）。
- 开场三态：A 态确认（干净树+HEAD=28e1796）；账本末四行=复审场补记在案。

## §1 基线终态（对不上禁提交）

**基线零变申报**：复审场为纯审查（零仓库写入、零提交面变化），本批=纯文档+registry
收录——段间基线仍=v86 §1 终值：**verify 199 件/2215 用例 EXIT=0、e2e 55/55、
locks 289、豁免 239、通道 61**；open 计数 3→**4**（本批立案 F-MIGR-01）。
registry/instructions 文档不在 locks manifest 面（289 件零命中亲验）——本批尾注
按实际触碰面判定，不带 [locked-change]。

## §2 复审发现收录（真相源=晨间复审报告；本段为登记索引面——细节行锚/修法以报告为准，修复见各票）

### P1-1 立案：F-MIGR-01（registry 行已立，open）

迁移 012 同名退让二重撞 UNIQUE——存量 v11 库同存「主图」与「主图 (主图)」两集合
（导入子目录名可构造）→012 退让 UPDATE 产出第二个「主图 (主图)」→撞
collections.name UNIQUE（001_init.sql:44）→012 事务整体回滚=**该库永远无法升级**
（fail-closed 无数据丢失，但应用无法启动，报英文 SQLite 原文）。测试缺口=
migrate-folders-graphs.test 只覆盖无冲突态。**应急处置**（开工指令要点①：用户本机
真库启动应用即触发 012——若启动报 SQLite UNIQUE 错即此因）：临时改名冲突集合后
重启。修复要求=退让改冲突探测式唯一名+补「双冲突形态」迁移用例；受锁面
migrations+tests 双尾注。

### P2 池面登记（九条，不单独立案，按搭车原则）

- **W1** 导入升格桥以过滤后 total 为信号（App.tsx:143-146 桥条件
  `wsGuide && libTotal > 0`×library.store load 带筛选调 list×papers.repo.ts:209
  COUNT 带 cond）——引导态+设筛选+导入不匹配文献→total 恒 0→rail 五钮持续锁死
  （清筛选/再触发任何 load 自愈）。建议=桥信号改无过滤计数或以导入完成事件触发重拉。
- **F1** upsert-node 对已有节点文献无 service 预检→撞 idx_lineage_paper 折叠
  INTERNAL→renderer 按系统错误永久重试卡队列（仅 CONFLICT 丢弃）。建议=service
  加 nodeByPaperId 预检（已有）→存在且无 id→CONFLICT「该文献已有节点」中文拒。
- **T1** 通用 Dialog Esc 无 isComposing 守卫（Dialog.tsx:27-32；AnnotationEditor.tsx:82-91
  同型先例在档）——一行级修，随任意 renderer 票搭车。
- **W3** WORKSPACE_NAME_MAX 注释宣称 maxLength 同源未兑现（schemas.ts:425 vs
  WorkspacesPage 两输入框）——41 字名收英文 zod 报错。补 maxLength 或修注释。
- **T2** LineageSideTags「＋」/LineageTagDialog「添加」两处按钮路组词守卫缺
  （对照=各自 Enter 路有守卫）——组词中点按清空进行中文本。
- **T3** TagEditor 建议词按钮 attachExisting 无 composingRef 守卫（对照=同区
  「添加」按钮有守卫）——组词中点建议词清空进行中文本，边界一致性。
- **T4** 标签输入框无 maxLength（>50 字收英文 zod 报错）——预存面，本票未触碰。
- **W2** 管理页挂载不重拉计数陈旧——在档设计（reload 归票面），一致性落差备案
  （专职管理页使陈旧性升格为主数据面可见）。
- **W5** 课题重名无校验——开放疑问（id 唯一切换无歧义），F-FOLDER-02 顺带裁决。

### F-FOLDER-02 承接附面（registry 票面已追记，设计时纳入）

P2-F3 幽灵 folderId 读面静默空图（写路径有 CONFLICT 拒——读面措辞随 W4 裁决）/
P2-F4 FilterBar 文件夹下拉对 unfiled 态误显「全部分类」（票 1 无设置入口、票 2
重制 UI 顺带修）/P2-F5 主题节点跨图改图
slot 撞值复核（W3 终裁「图归属变更不重排 slot」但目标图组内可撞重复 slot——
图切换器落地时复核是否归一）/既有 **C2 幽灵边裁决**（v86 §1 裁决部条件 2 在档：
导入侧拒收 vs 导出侧过滤，含导出面 raw listGraph 携出覆盖+e2e 锚+export_.test
夹具 collectionNames 残留清理）。

### 未列池面说明（报告在档、按开工指令收录面执行）

W4（桥重拉失败无重试——k1-N2 在档自认）维持原状；W6（降解 meta rename 重写
createdAt→排序漂移——触发面极窄）与 F2（importDraft slot 计数键缺 folderId——
无功能破坏，仅「内存计数等价 D-I-1」注释不成立）报告备案不另入池。

## §3 用户知悉/裁决口

- **[2026-09-30 裁决在档]**：**P1-1 修复路径=案 a 改 012 本体**（三案呈报后用户亲选：
  单用户未分发论证成立——项目自述单人使用、GitHub 远端=个人备份、无第三方库副本
  已执行 012；已成功跑过 012 的库不受改写影响、未跑/卡炸库修复后首次升级即正确；
  落地=[locked-change]+locks 重生成。复审报告「012 已提交不可改」口径经本裁决
  突破——报告建议 013/执行器两案未采）。
- 承 v86 §3 全项（无人值守退役双裁决/draft 全库重置语义/验视面三批/教训候选
  v84 六+v85 三+v86 四）。

## §4 操作条款存续（承 v86 §4 全项）

node -e 中文绝对禁（探针/账本一律脚本文件直跑）/退出码重定向取真值禁管道/多行 Edit
换块 new_string 必含锚块全部保留行/回炉轮 untracked 重转录/quality 组件行数=wc+1 留
余量/TS 单引号串禁英文撇号/registry 转录入串引号面/受锁面先 unlock 改毕即时 apply/
自产脚本件即时 locks:generate+apply/每票独立提交+staging 显式列文件/计数类数字落笔
前脚本实测/复审「已验证安全面」节在档——已查面勿重查（省成本）。
