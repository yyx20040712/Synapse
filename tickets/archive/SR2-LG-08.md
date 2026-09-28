# SR2-LG-08 票面归档（F-GOV-01）

- id: SR2-LG-08
- file: src/renderer/features/lineage/LineageSidePanel.tsx
- area: lineage
- owner: strong
- status: done

## summary 原文

脉络跳转挂载时序竞态修复（b3: P7-H；复测缺陷 P3 修复——取证三级跳：交接书数据面假说被只读 SQL 推翻（真库 Synapse Remake/synapse.db ai_notes 四 paper_id×22 均匀+nodes 四绑定各异；com.synapse.app 下为陈旧残留库），主控亲读七跳全对，根因=ReaderPage 挂载效应闩锁消费 :118-119 先于监听器注册 :121——locateAnchor→waitOpen 同步重发 requestOpenPaper 事件自丢失（唯一在场监听器=App setView no-op）→无角色调 store.openPaper→8s 超时停留原 tab=「总跳最后打开的文章」，滞留闩锁下次 remount 迟到打开=「篇内定位正常」自洽；tab 已开/页内路径无竞态=e2e 全绿原因；StrictMode 双挂载旧序意外自愈=dev/e2e 表现分裂佐证）；修法=addEventListener 提前 3 行换序（挂载期外无未注册窗口——联审独立推演+全部派发点攻击维持）+防御修 LineageSidePanel:134 n.paperId（条目自身归属）；新测试 reader-page-open-race.test 入锁（bus/store/anchor 链全真件，mock 面三件不在竞态链——首红 spy 0 次+变异复红同错同行号=真锁时序））[locked-change]——票面 scripts/audits/sr2-lg-08-brief.md；依赖 LG-04 总线载荷链+LG-06 面板信号

> 归档于 F-GOV-01（2026-09-28）；registry 主表已瘦身为结论句+本件指针
