# 交接书 v119 —— t180back 验收+T1 竞态翻案修复全链档（2026-10-04）

> 前承 v118。本档=同日续场：run 37133311174 验收（t180back 终证+C2
> 复证+P7-B flake 首现）→T1 挂账定性（v1「React 竞态」→**CI 证伪→探针
> 翻案=固定滚动量环境敏感假设**）→t1race 两轮回炉（RR1 注释/RR2 滚到底
> /RR3 勘误）→裁决部重裁 GO_WITH_CONDITIONS。

## §0 本场消耗与开工记录

用户指令=「基于 v118 继续开发」。技能清点：ai-dev-org/verification-
before-completion/systematic-debugging（T1 两轮探针诊断）/subagent-
driven-development+dispatching-parallel-agents（三屋派发与双审并行）
=用；frontend 族/dynamic-workflows=不用。配置承 v118（executor/probe=
随宿主；k1=Kimi $max；d1=deepseek $max；裁决部=绑定 $max）。

消耗：executor×1（1.01M）+门一双审两轮（首轮 k1 25k/d1 45k+RR2 复核
k1 36k/d1 64k）+probe×2（320k+133k）+裁决部×2（939k+214k）+主控亲执
（CI 首查分族+探针 v1 双窗口档/探针 v2 edit 态+PR 分支 CI 探针〔#1
开毕即关，main 零污染〕+翻案定性+三销项+RR1/RR2/RR3 亲改+M-C 变异红证
+P7-B 台账登记+提交 9573efcbec6+RR2/RR3 收口+账本 586→597〔本场 11 行〕）。
证据件仓外=2026-10-04_t1-drift-probe/（探针 v1/v2 spec+两 run 日志+
CI 探针日志）+20261004-t1race/（probe verify 日志）。

## §1 基线终态（对不上禁提交）

- **已推送=9573efcbec6（t1race 首轮）+RR2/RR3 收口提交**（spec+manifest
  +本笔 v119）；远端 main=RR2/RR3 提交。
- **verify 终态 EXIT=0=255 件/2607 例**（executor+probe×2 三跑同值）；
  locks 355；lineage spec 12/12。
- **CI 终证口径（裁决部 C1，对 RR2 重起算）**：run A（RR2/RR3 提交触发）
  +run B（下场自然触发）两场 T1 全绿方销项；任一红且指纹落固定滚动量族
  →回归定因禁叠补丁。

## §2 CI 首查（run 37133311174=2c605421728 触发，主控亲执）

- **C1/C2 双达成**：tag-input-paths+library-density:17 两 run 连续绿
  ——libfix2 flaky 排除销项（v118 §4 P0 清账）。
- **t180back 终证**：六道关卡 job 全程 11m23s（60m 预算）——无撞墙。
- **T1 三 run 同值 96.75**（v116→v118→本 run）：确定性确认。
- **P7-B 首现 flake**：reader-text.spec.ts:250 用例 :313 `getByText
  ('P7BA-MARK')` toBeVisible 10s 超时→retry 绿——首次非确定失败，已登
  记 flake-ledger **observing 1/2**（再 1 现立案）。
- **重大勘误（v118 叙述）**：CI=**windows-latest**（ci.yml:15），全仓无
  Xvfb/Linux e2e 面——「1024」真身=GitHub Windows runner 默认屏
  1024×768（实测 1024×720 内区）；v118「Xvfb 虚拟屏/Linux CJK 字体」
  叙述失准；libfix 修复有效性不受影响（CI 实跑转绿实证，P1-5 同场复核
  达成——tag-input-paths/library-density 本场沿绿）。

## §3 t1race 全链（两轮翻案档，提交 9573efcbec6+RR2/RR3）

- **v1 定性与证伪（完整教训链在档）**：首轮主控探针（browse 态直写库）
  得 y0=143.75/clientHeight=658，以「96.75=144−47.25、47.25=705.25−658
  收缩后 maxScroll」定性「React 异步 commit 清内联致滚动域收缩」；双审
  共中算术瑕疵（143.75−47.25=96.50）后 RR1 改 144 基线——**但整条闭合
  链系巧合拟合**（47.25/658 皆非实测输入——裁决部复算组亦被骗过，「闭合
  算术作用于未实测输入≠佐证」教训入档）。head 注入修复（本身正确且生效）
  在 CI run 37140073977 仍同值 96.75 红——P0「仍红→回归定因禁叠补丁」
  触发，v1 证伪。
- **翻案（PR 分支 CI 探针 run 37141870865，edit 态完整 UI 路径）**：
  CI 实测 dpr=1/窗口 1024×720→timeline 宽 476、clientHeight=610；
  **工具条换行高 298.75**（本地 70.4）+自然内容 946>610 溢出+连线链
  scrollIntoView 残留 **scrollTop=336**（=maxScroll 钳制）→首段布局
  y0=60.75+336=**396.75**；滚 300 后 96.75=**六次 CI 失败值精确复现**
  （探针完美复现失败态）；head 注入后 scrollHeight=2299/min-height 2000
  computed 在位（注入正常=证伪决定性支点）。**真根因=固定滚动量 300
  隐含「首段贴近容器顶+无滚动残留」假设，CI 窄窗三重破坏**。
- **修复（RR2+RR3 终态）**：①head `<style>` 注入（保留=防御性稳妥，
  与 React 渲染面隔离）；②`el.scrollTo(0,300)`→`el.scrollTop=
  el.scrollHeight`（滚到 maxScroll——成立域=clientHeight<
  (scrollHeight−y0)+80，CI 门槛≈1982px 视口高上界〔裁决部复算：min
  注入≈1713/CI 几何≈2012px，注释带宽保守侧〕，常规视口恒满足、极端
  高视口退化态由 scrolledTop>0 守卫响亮红）；③注释链终裁叙述（v1
  机制句以证伪过去时留档）。数学：yearY=396.75−1689=−1292.25≪80
  （裕量千 px 级）；本地绿/CI 红双态同模型闭合。
- **门链**：executor（双变异红证）→双审首轮 k1 B0W1N5+d1 B0W2N4 双
  PASS→RR1（算术表述+重锁）→**CI 证伪翻案**→RR2（滚到底+M-C 变异红证
  〔scrollTop=0→守卫红〕）→双席复核 k1 B0W2N4+d1 B0W2N5 双 PASS（W
  处置：k1-W1 惰性 sticky 盲态**销项**=.tl-year 实为 relative 非 sticky
  〔theme-lineage.css:33〕推演前提不成立/k1-W2+d1-W-1 注释残留→RR3
  已改/d1-W-2 成立域表述→RR3 已写准）→RR3（注释勘误）→probe 轻量
  3/3（spec 12/12+verify 255/2607+树态恰 2M+注释链 grep 确认）→
  **裁决部重裁 GO_WITH_CONDITIONS**（复算全闭合：336=946−610/y0=
  60.75+336/96.75=396.75−300/−1292.25=396.75−1689/d1-N-3 双绿窗口
  量化=CI 自然 946<1006.75 窗口外 60.75px 注入失效必响亮红/工具条
  298.75=41.5% 视口）。
- **C1/C2+挂账口径**：C1（P1）=连续 2 绿对 RR2 重起算（run A/B）；
  C2（P3 维护窗）=成立域注释收紧+k1 守卫加固（scrolledTop===
  maxScroll）+d1-N-3 窗口量化注三件套同批；挂账=窄窗工具条产品缺陷
  （见 §4）。

## §4 挂账与登记（带单清单）

- **C-race（P1，下场首查）**：run A（RR2/RR3 提交）T1 绿+run B（下场
  触发）T1 再绿=销项；任一红→回归定因禁叠补丁。
- **窄窗编辑工具条产品缺陷（新立，用户视检项）**：timeline 宽 476
  （1024 屏）下 .lg-toolbar 换行高 **298.75=41.5% 视口**（正常 70.4）
  ——真实产品布局缺陷面（与 libfix1 窄窗塌 0 同族「窄窗布局」族），
  探针几何数据为证（2026-10-04_t1-drift-probe/）。用户窄窗续视检时
  一并观感；修复走独立票（候选=工具条窄窗单行收缩/溢出收纳）。
- **P7-B flake（observing 1/2）**：再 1 现立案（台账已登记）。
- **C2 维护窗三件套（P3）**：见 §3 门链段。
- **承 v118 全项**：T1 本项两轮回炉终态在案；承 v117/v116 全项挂账
  （用户续视检〔窄窗缩窗观感+本档工具条项〕/S5 盲形清单/DB 战役呈裁）。
- **P1-5 已清**：libfix 有效性同场复核达成（本场 CI 沿绿）。

## §5 新会话开工序

> **收口后补（2026-10-04）**：run A=37144795869（9d729a38d6b）已出——
> **T1 首次 CI 转绿（RR2 生效，连续 2 绿 1/2）**，75 绿/1 红；唯一红=
> reader-scroll :266「缺陷 A：窄视口程序滚动」90s 整用例超时→retry 秒
> 绿=**新 flake 首现**（与 :176 族异位异指纹独立计数——台账已登记
> observing 1/2）；P7-B 未再现（直接绿）。run B=台账+v119 本增补提交
> 触发——下场首查 T1 再绿即 C-race 销项。

1. **CI run B 首查**：T1 再绿=C-race 销项（连续 2 绿达成）。顺带
   reader-scroll :266 指纹核对（再现=第 2 现立案）+P7-B 指纹核对。
2. 用户续视检→**窄窗工具条观感**（§4 新立项：1024 宽窗口下脉络页编辑
   态工具条占比）→功能终态冻结。
3. DB 战役设计稿呈裁（v113 §5 承）。
4. 视余量：C2 维护窗三件套（lineage spec 维护窗）。

## §6 操作条款存续

承 v118 §6 全项，**v119 §6 前版「e2e 内联注入竞态纪律」条降格**（
v1 竞态定性已证伪——head 注入保留但理由=防御性隔离非竞态免疫）+新增：
**闭合链算术纪律**（机制定性的数字闭合必须锚定实测输入——拟合值咬合
≠佐证；本案 47.25/658 双拟合值骗过主控+双审+裁决部首轮三道关）；**
CI 探针 PR 分支范式**（main 零污染采证：分支+PR 触发+跑毕即关删——
locks 新文件登记/typecheck 关卡两坑在档）；**修复销项双绿线对回炉
重起算**（修复体变更后连续 2 绿计数器重置）。账本 586→597（本场
11 行）。
