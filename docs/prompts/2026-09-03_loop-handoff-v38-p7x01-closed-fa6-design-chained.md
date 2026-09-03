# 2026-09-03 LOOP 交接 v38——P7X-01/P7X-03 收口+F-A6 设计全链闭合+门审链降级事故复盘

> 上段=v37（用户四项裁决落地）。本段=闲时场开工（态 A）+**门审链降级事故与用户纠正在场销项**
> ——P7X-01 三屋收口提交、P7X-03 对证结案、F-A6 设计书经 Kimi 拟定+deepseek
> 对抗审+GLM 终裁全链定稿（待用户过目）、P7D-01 候选案册落盘。

## 0. 本段事故与复盘（用户在场纠正——最高优先记录）

- **事故**：主控开场将 F-A6 设计起草/设计审/P7X-01 门一门二全部派给会话内
  角色代理（GLM 同源），以「环境 Agent 工具无 model 参数欠账披露」一句话带过。
- **用户纠正**（原话要点）：「为什么不按照工程纪律调用 kimi 规划以及一审，
  不调用 deepseek 二审？」——**纠正在实现提交前到达，零返工成本补救**。
- **违规定性**（methodology §4.5 白纸黑字）：①「环境降级披露」条款**只覆盖
  实现者/门二**子代理；②**门一=外部 API 派发器（ds-call.mjs 扩展链）不受
  此限且主源不得主动跳过**；③设计位=「Kimi 拟定→deepseek 审核→GLM5.3
  终裁，**禁 GLM5.3 跳审自裁设计**」。派发器就在 `scripts/audits/ds-call.mjs`
  （三源凭证 ~/.zcode/v2/config.json）+外链 `~/.zcode/workspace/gate-call.py`
  （--system-file 自定义档）——主控**连找都没找就宣布降级**，属开工纪律
  「配置自查」漏做，与 2026-08-23「裸手搭审计流水线」同型。
- **补救实录**：P7X-01 重走 Kimi K3 门一（PWW 4N）+deepseek 门二（PWW 1W
  =T10 盲区→回炉 R1 补 T10+M5 变异销项）后提交；F-A6 设计 GLM 稿降格为
  候选输入→Kimi 拟定裁决（有条件采纳：T1 降待证/markedContent 待核/快路径
  四道守卫强制条款——**第三条为候选稿实质设计缺口，Kimi 独立抓出**）→六处
  改写落入→deepseek 对抗审（PWW 5W4N：INV-37「保持 vs 弱化」矛盾升格用户
  拍板④/快路径 bands 数据链断链闭合/归一化入链/page.rotate 注入面前置/G2
  阈值=取证交付物）→主控终裁全消化。
- **教训固化**：会话开工配置自查必须**显式核外链派发器可达性**
  （`node scripts/audits/ds-call.mjs --list-sources` 零 API 探针），不得以
  会话内工具面推断「无外部通道」。

## 1. 本段终态

| 项 | 数值 |
| --- | --- |
| P7X-01 | **done 已提交**（4d92655fdb [locked-change]）：TAG_FILTER_MAX=20 自 paper.ts 导出单源（schema .max 与 TagFilter 守卫同消费——漂移结构性消除）；T8 拦截/T9 边界/T10 上界移除锚三 it+变异五证（M1 删守卫/M2 >=改>/M3 常量漂移→T8 红；M4 过严-1→恰 T9 红；M5 删 !active→恰 T10 红） |
| P7X-03 | **done 免实现**：B6 对证成立结案——机制链=window.confirm（tab-dirty.ts:110）→Chromium 原生 owned-modal（探针 enabled:false 直接观测）→MSDN About Dialog Boxes 逐字（owner 禁用至对话框销毁+不可激活）+Electron 文档/源注（native_window_views.cc SetEnabled→EnableWindow；issue #50068 purposely disabled）；报告 docs/reports/2026-09-03_p7x03-b6-modal-minimize-crosscheck.md |
| F-A6 设计书 | **定稿待用户过目**：docs/design/2026-09-03_f-a6-selection-root-fix.md——态空间 S0~S9+Q1~Q9/D1 机理（a1~a3+b 链+T1 待证+取证矩阵 T1~T7）/D2 机理（5Hz 粒度+双遍冗余+每 span 双 computeStyle，14 承重断言 Kimi 独立 ✓）/三案对比（推荐 B=自绘优化：rAF 快路径+settle 零变；A=第六轮通道震荡否决；C=接缝病灶否决）/落地蓝图（F-A6-a 取证→b 管线→c 调度→d 收口四票切分）/ADR-0019 R3 草案；**§0 用户拍板四点**（停顿出条语义/旋转页纳入/备案案 C/INV-37 拖选期弱化≈） |
| P7D-01 | 候选案册落盘：docs/design/2026-09-03_p7d01-token-candidates.md——四轴盘点（字号债最重 29 处/12 值/5 半值；动效 32 token/7 档；间距 97% tailwind；层级近零债）+三方向并列（甲最小增量零视觉差/乙语义刻度重构/丙 tailwind 对齐）**待用户三选一** |
| verify | 149 文件/**1273 用例**（+T10）exit=0 亲验（PIPESTATUS） |
| locks | 269 不变（registry/paper.ts/tag-filter-multi.test 三受锁件随两票重锁同步） |
| e2e | 39 不变（本段零 e2e 触碰——P7X-01 单测面全锚） |

## 2. 下段执行序

> **两个用户门在场**（F-A6 拍板四点+P7D-01 三选一）——用户不在场时按序推进：

1. **用户在场轮**：F-A6 设计过目（§0 四点拍板）→F-A6-a 取证票开工令；
   P7D-01 三方向裁决。
2. **P7X-02 时长 outbox**（闲时可动——service 层设计面非视觉）：设计面=
   与 saveProgress 单通道关系（禁双账本）+重启恢复语义；设计链走
   Kimi 拟定→deepseek 审（本段事故教训适用）或主控设计+双门审。
3. F-A6-a 取证票预备件：page.rotate 注入面三选一（测试 expose/e2e 直调
   pdfjs/devtools 断点）+diag 四段探针+tick 时长前测基线（设计 §2.2 已立
   条款）——用户拍板后即可派发。
4. 被动观察照旧：e2e reader-text:872 第 1 现指纹（F-A6 改动面与其同域，
   F-A6-c 落地时全量 e2e）。
5. 环境备忘照 v37/v36。

## 3. 本段方法论资产

- **外链派发器探针纪律**（事故固化，见 §0 教训）。
- **设计链双跳实操范式**：候选稿（GLM）→Kimi 拟定裁决（输出契约=总裁决+
  分节处置表+承重断言 ✓/? 清单+独立重建论证——**瘦身输出契约救活 504**：
  大包长生成超网关窗，砍输出量后半重试同源成功）→deepseek 对抗审（含对
  上游三前置的独立核验+「Kimi 未覆盖面」专项）→主控终裁逐条消化。
- **放行类边界用例的变异锚范式**（P7X-01 T9/T10）：结构性先绿的放行断言
  必须配过严方向变异（M4/M5）才满足「每个测试必须能失败一次」——Kimi
  NIT-1 认定为票面打包设计后果非实现者偷工，M4/M5 为正确补法。
- **B6 类对证的证据分层**：行为事实（探针）×文档语义（MSDN 逐字）×源注
  （Electron issue 维护者确认）三层闭合即可结案；精确内部路径无逐行源注
  须诚实申报为边界。

## 4. 成本账本

```
主控 GLM5.3×bigmodel-coding-plan：全程编排+亲验（M4/M5 变异+verify×2+
  diff 核+对证检索+案册+交接书）
子代理（GLM 统一档——环境无 model 参数欠账披露；预审两轮被正式链取代）：
  code-architect 设计起草 719k tok / general-purpose 设计预审 1337k /
  Explore 盘点 388k / 实现者 993k / 门一预审 276k / 门二预审 387k
外链（ds-call/gate-call，routing-log 在账）：
  Kimi k3 门一 P7X-01：in 3990 / out 4115 / 147.8s
  deepseek v4flash 门二 P7X-01：in 4189 / out 25695 / 206.1s
  Kimi 设计 r1（122KB 大包）：504 网关超时 fail ×1
  kimi-backup 设计 r2：504 fail ×1
  Kimi k3 设计 r3（瘦身输出契约）：in 35796 / out 8200 / 229.7s ✓
  deepseek v4flash 设计对抗审：in 19653 / out 21018 / 189.4s ✓
```

## 5. 环境事实滚动

- verify 基线滚动：**149 文件 1273 用例/locks 269/e2e 39**。
- 新增：ds-call.mjs/gate-call.py 外链通道探针命令入册（--list-sources 零
  API）；Kimi 大包 504→瘦身输出契约同源重试可行在档；P7X-01 T10/M5 变异
  范式；B6 结案（AUDIT-B 留场场清空）。
- 任务池：open 3（F-A6 设计毕待拍板/P7D-01 案册待裁/P7X-02 未动）。
- 沿用 v37/v36 各条。
