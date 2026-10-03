# 交接书 v118 —— libfix1 CI 验收分族+libfix2 次生红清偿全链档（2026-10-03）

> 前承 v117。本档=同日第五场：用户指令「跑CI」→run 37128738863 验收
> （**35 红族 32 例转绿达成**）→3 红分族（主控亲执）→libfix2 全链
> （叠压真缺陷修+表头语义分档）→裁决部 GO_WITH_CONDITIONS。

## §0 本场消耗与开工记录

用户指令=「跑CI」。技能清点：ai-dev-org/verification-before-completion/
systematic-debugging（CI 分族+叠压机制诊断）/subagent-driven-development
=TDD executor 面用；dispatching-parallel-agents=双审/复核并行用；
frontend 族/dynamic-workflows=不用。配置承 v117（executor/probe=随宿主；
k1=Kimi $max；d1=deepseek $max；裁决部=绑定 $max）。

消耗：executor×1（2.30M）+门一四席（k1×2/d1×2）+probe×1+裁决部×1
+主控亲执（CI 验收分族+叠压探针诊断+表头副作用定性+W3 销项+RR1 亲改
〔语义断言消死区〕+提交 33a64beb18d+账本 573→582〔9 行〕）。

## §1 基线终态（对不上禁提交）

- **本地待推送=33a64beb18d**（libfix2，4 文件 46+/6-）+本笔 v118 docs；
  远端 main=c41a4f24513（libfix1+v117 已推）。
- **verify 终态 EXIT=0=255 件/2607 例**（2606→2607：+1 theme 锚）；locks
  355；library-density spec 2/2；**上一 CI run 37128738863=73 绿/3 红
  （10.8m，e2e 从撞墙级回落）**。

## §2 libfix1 CI 验收分族（run 37128738863，主控亲执）

- **主体达成**：35 红族 32 例转绿（34 例 lib-r-title 根因全清+T1 仍红
  =预期内坐标漂移族另列）；范围闸 job=success（reword 处置实证）；
  lint/typecheck/quality/tickets/单测/指纹门/构建全绿；窄窗新用例绿。
- **3 红分族**：①T1（y=96.75≥80 与 v116 记录同值——确定性坐标漂移，
  B 案范围外慢机宽容面挂账）②library-density:17 表头「标签」hidden
  =**libfix1 副作用**（CI Xvfb 1024〔Playwright 自带 Xvfb 默认屏——
  「虚拟屏 1024」来源补齐〕下 `.lib-c-tags` 按设计收 0——牺牲 tags 保
  title 语义的正确行为，但既有用例五列形态断言需视口适配）③
  tag-input-paths「新增标签」click 被 `.lib-dr-actions` 拦截=**真产品
  缺陷**（`.lib-dr-body` flex:1+min-height:0 无 overflow，内容溢出渲染
  与尾部动作区叠压——CI Linux CJK 字体行高大触发；本地 1024×768 探针
  不复现 actions 距输入行 43px——证据件仓外 2026-10-03_libfix2-
  diagnosis/）。
- **次级揭示定性**：③上轮卡在文献行不可见（35 红族成员），主根因解除
  后用例推进到抽屉层才暴露——CI 深路径用例的「剥洋葱」形态在案。

## §3 libfix2 全链（runId=20261003-libfix2）

- **交付**：①`.lib-dr-body` 加 `overflow-y: auto`（+注释——溢出滚动
  于本区，actions 恒在尾部独立位置；矮窗/大字体缩放真实环境同益）；
  ②theme.test +1 锚（先红→绿+回填恰 1 红 cmp 空；**e2e 行为红证本地
  不可达如实申报**=CI Linux 字体形态，锁面红证替代+CI 终证）；③
  library-density:17 分档化 **RR1 终态=语义断言**（`.lib-c-tags`
  toHaveCount(1) 在场锚+实测列宽分支 >0 断 visible/=0 断 hidden+行级
  无条件 poll main≥100+标题 visible——塌 0 回归任何视口即红）；④
  tag-input-paths.spec 零改动（产品修视口无关）。
- **门链**：executor（自裁 4 项）→双审 k1 B0W2N4+d1 B0W4N2 双 PASS
  （W1=1274 阈值与表头语义线 1134 不一致留 (1134,1274) 假红死区〔d1
  悬升 B 唯一点〕/W2=toBeHidden 对列移除恒真盲区/d1-W3 窗口污染经核
  **不成立销项**=每用例独立 launch 新实例/d1-W4 终证口径降格）→RR1
  主控亲执（语义断言消死区+在场锚+行级无条件化）→复核 k1 B0W0N1+d1
  B0W0N2 双 PASS→probe 5/5 绿（蔓延 grep：tests/e2e 唯他 lib-dr 引用
  =meta-year-month:53 角标非滚动断言）→**裁决部 GO_WITH_CONDITIONS**
  （复算三组成立；C1/C2 P0=CI 转绿终证+下轮复证 flaky 排除）。
- **C3 销项说明**（裁决部 P2）：main≥100 断言与 120 保底的 20px 差=
  libfix1 票面故设裕量（滚动条/边框/亚像素渲染差——收紧 ≥120 会因
  119.99 亚像素假红），设计合理不收紧。

## §4 挂账与登记（带单清单）

- **C1/C2（P0，下场首查）**：libfix2 push 后 CI run——tag-input-paths+
  library-density:17 转绿终证（任一红即回炉）；**下下轮 run 复证排除
  flaky**（单绿不销项）。
- **T1 坐标漂移族**（v116 承+本 run 同值复证）：慢机宽容面票（另列
  ——CI 环境渲染差致 toBeLessThan 边缘，候选处置=阈值宽容化或环境
  探针分档）。
- **timeout-180 回调评估（v117 §5 承）**：本 run e2e=10.8m（3 红）——
  若 libfix2 后 CI 达「e2e 红≤2（仅 T1）」且时长稳定 → 满足回调条件
  （e2e 红≤5），**可立回调票 180→60/90**（下场 CI 结果后执行）。
- 承 v117 全项（C2 收缩次序行为锁/C3 上界开口/C4 豁免粒度/C5 bugform
  规约/用户续视检〔新增窄窗缩窗观感〕/S5 盲形清单/DB 战役呈裁）+承
  v116 全项挂账。

## §5 新会话开工序

1. **CI run 首查**（33a64beb18d+本笔触发）：tag-input-paths/library-
   density:17 转绿终证（C1）——预期 e2e 仅 T1 红（1 红）+T-P1b 沿绿。
2. **timeout-180 回调票**（§4 条件判据满足即立——CI workflow
   [locked-change]+单审走小批口径）。
3. T1 坐标漂移宽容面票评估。
4. 用户续视检→功能终态冻结→DB 战役设计稿呈裁（v113 §5 承）。

## §6 操作条款存续

承 v117 §6 全项（尾注三分纪律/派发前 grep 测试锁/bugform 变异口径）
+新增：**CI 深路径用例剥洋葱形态**（主根因修复后 CI 首 run 必查「推进
到更深处暴露的次生红」——非回归而是进展）；**环境差异缺陷的本地不可
复现口径**（探针证伪+机制链定性+锁面红证替代+CI 终证——libfix2③
范式）。门一常设双审=k1+d1。账本 573→582（9 行）。
