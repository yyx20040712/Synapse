# ADR-0032：两域保存/撤销核心（定稿≠落库·可逆历史·per-folder 会话）

日期：2026-11-22 设计定稿（五道审查门冻结）· 2026-11-24 B4 实现闭环 ·
2026-11-25 建档（B5 前文档债清理）

状态：已裁决——已落地（reader 域=B4-A，lineage 域=B4-B；语义单源=
`docs/design/2026-11-22_b4-save-undo-core-design.md`，INV 登记=
docs/invariants.md INV-187/188/189–193 与 INV-22/23/84/91/94/106/141/146/150/153/161/162/163/175/177/182 修订行）

## 背景

旧实现把一次成功 flush 当作历史基线重置，清空 undo/redo；SessionSnapshot
同时携带图态和 queue，使「恢复旧快照」误看似能撤销已落库写。dirty 同时
驱动未落库提示、灰点、关闭和退出。单活动图无法让迟到响应、后台 flush 与
recovery 单槽在 folder 切换后保持正确归属。

业务终版要求 idle-flush≠定稿、redo 死于定稿、undo 在应用运行期存活、
folder 分栈挂起、单 recovery 槽不扩。删除节点的原 id 恢复又与 INV-132
和 append-only deletion_events 存在实现层冲突，lineTypeNames 也不是当
时代码中的 per-folder 数据。

## 裁决

1. IO 与 unfinalized 分为两个状态轴（INV-187）。新编辑/undo/redo 置 U；
   idle-flush（1.5s）只清 IO；显式保存 drain 成功后清 redo 和 U，保留
   undo。
2. reader 使用操作层与文本值层两层历史，由 per-tab 串行命令链统一写、
   保存和代际失效；每层深度 10（INV-23）。
3. lineage 退役 SessionSnapshot，历史项只记录受影响实体的可逆
   before/after changes；普通 queue 只表示实际待写动作（INV-94/153/162）。
4. 每次 lineage undo/redo 先 flush，再经 `lineage/history-unit` 在 main
   的 repo 事务中执行一次反向 unit；失败全回滚且不弹栈。renderer for
   循环不构成事务。
5. 删除节点/边/悬浮笔记按业务要求恢复原 id 和完整用户字段。快照协议按
   三段闭环修订（导出恒携带活行与删事件全集、导入先活行 LWW 再按
   deleted_at 代际判定删事件，三类写点单调守卫为 SQL 标量），append-only
   保持、本地缺席行仍防复活（2026-11-22 用户终裁 D1=A；INV-132 修订）。
6. 每 folder 会话持 graph、queue、inflight、历史、U、focusSet（INV-188）；
   页面/folder 切换挂起，课题切换全量 flush 后全清。
7. RecoveryPayload.queue 只用于崩溃重放，历史与 U 不写入副本；单槽以
   recoveryOwner 串行转移，旧图未 flush 成功前新图不得覆槽（ADR-0027
   边界保持）。
8. lineTypeNames 全链迁移为 folder key（用户终裁 D2=A；迁移 027），
   corpus export 取主图键、删夹同事务清理 keyed meta；028 重建触发器
   守卫迁移。

用户后续裁决（2026-11-23/24，实现回炉期）：D-1 出口适用面=乙（四种
CONFLICT 拒因均给「丢弃这条过期历史」出口，系统失败不给）；D-3=idle 到
期提交悬浮笔记草稿正文但不关编辑器（keepOpen 窄口径）；R1=输入法合成期
不提交、compositionend 后重新计时（INV-189–193）；R2=恢复替换守卫只看
目标会话。

## 后果

- 正向：已落库修改可撤销；删除复合操作可原子恢复；灰点不再阻塞退出；
  A/B 图历史与聚焦可独立驻留；恢复副本不会因历史快照重复写 DB。
- 成本：新增 reader 串行协调器、lineage registry、一个 IPC/service/repo、
  事务与延迟响应测试、D2 数据迁移与 028 触发器重建迁移。
- 限制（详见设计稿 §14 限制段与 §17）：
  - 历史/focusSet 仍只活于应用运行期；单槽不能同时保护多个未落库
    folder，非 owner 以 chip 明示。
  - 过期历史项的出口只在 edit 模式可见（R4）；被拒栈顶项在用户丢弃前
    一直挡住其下更旧历史。〔B5 演进注记 2026-11-26：R4 已由 ADR-0033 翻案
    ——三模式稳定外壳可达；本行保留为历史决策记录。〕
  - 其他写触发的 saving 窗仍卸载笔记编辑器（R3 keepOpen 窄口径）；
    keepOpen 真机缺口=F-KEEPOPN-01（B5 前评估）。〔B5 演进注记 2026-11-26：
    F-KEEPOPN-01 已随 B5 修复翻 done——自身 idle 提交与 keepOpen 置位同一
    React 同步提交批＋真机 e2e B5-E13；R3 窄口径经用户裁决维持不变（B5-D05）。〕
  - 悬浮笔记与阅读器的合成期撤销粒度差异（R1：阅读器 compositionend
    即切历史项，悬浮笔记到下一次提交才成单元）。
  - 合成期收口提交编辑器实际文本（可能含未确认合成串）——显式收口的
    既有语义。
- 回滚：shared/main/renderer 必须同一逻辑回滚点；若 D2 数据迁移已对用
  户库执行，代码回滚必须同时恢复事前 DB 备份或提供前向兼容迁移，禁止
  只回滚 UI。
- 验证：设计稿 §12 全矩阵、真库原子失败、snapshot 防复活与三段闭环序
  列 1–8、CONFLICT 和解链四类迁移、A/B/A 延迟响应、folder-reconcile 失
  效矩阵（含 epoch 判别例）、六个 e2e 文件与 `npm run verify`（B4 收官
  实测 503 文件/5065 例，全量 e2e 190 例 189 过——唯一败=已知本机
  smoke:116 flake）。

## 与既有 ADR 的关系

- ADR-0026（quit 无条件握手）：全部保留；本 ADR 只改 renderer flush 全
  集与 stillDirty 的 IO 定义。
- ADR-0027（恢复副本统一管理）：单槽/takeOver/token/epoch/append-only
  保持；其「clean 四源含 undo 回基线」表述由本 ADR 取代（undo·redo 落
  库后队列空为 clean 化挂点，非快照回基线），0027 已加注记。
- ADR-0014（lineage 数据模型）：autosave-first 表述由本 ADR 取代为
  idle-flush+显式定稿；graph_meta 明确为 folder 级；0014 已加注记。
