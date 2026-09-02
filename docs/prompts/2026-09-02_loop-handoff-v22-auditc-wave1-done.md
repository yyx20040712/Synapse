# 2026-09-02 LOOP 交接 v22——AUDIT-C 首波执行场：三票全闭环（C-1 实锤定性/C-2 弱锚销三项/C-3 无 B 级），下场=二波修票场

> 上场=v21（AUDIT-C 立案+文档群维护）。本场=首波三票 C-1/C-2/C-3 全闭环，
> 未触 40% 停点。**二波启动条件已满足**（C-1 实锤）——下场=AUDIT-C 二波
> 修票场（执行序见 §2）。
> 改动面：受锁六件（tests/e2e/reader-text.spec.ts+30 用例/f-l4-verify.mjs
> 轮询化/unlock-protected.ps1 补 invariants 条目/invariants.md INV-42 修正+
> INV-44 销项/locks 233/两新探针入锁）+台账+弱锚清单+排查报告群。

## 1. 本场终态

| 项 | 数值 |
| --- | --- |
| verify | exit=0 亲验（126 文件 1081——unit 面零变） |
| e2e | **30/30**（29+新 F-ARCH4-M1 用例）exit=0 亲验 |
| locks | **233**（+f-r3-probe.mjs+f-a3-n6-verify.mjs；229→231→233） |
| C-1 | **F-R3 排查闭环——实锤+定性噪声型**（pdfjs worker 泵无终接 catch；修复转二波）+副产 P6 泄漏实锤 |
| C-2 | 三子项全闭环：N6 真机直测/root.contains 决定性防线定性/轮询化 15 处——弱锚 W-3/W-6/W-9 销项+INV-44 备案③销项 |
| C-3 | 静态全枚举闭环：**无 ≥B 级新增候选**（deepseek B-1 终裁不成立——UUID 单源）；W 级清单五条=二波立项依据 |
| F-R2e | **第 2 现立案线触发**（同值 3.45px 指纹×2——从观察备案升立案） |

## 2. 下场执行序（=AUDIT-C 二波修票场）

**二波启动条件**：C-1 实锤 ✓（本场已满足）。

1. **F-R3 修票**（票面素材=scripts/audits/f-r3-investigation.md §5 v3 终排）：
   - **轨一先行**=上游查证（pdfjs 5.x worker 泵终接 catch 现状——修票第一步）；
     已修→升级（[dep-change]+ADR，升级后重验 P1 TextLayer 形状）；未修→
     裁决「接受噪声+主进程 level1 代理计数监控备案」（噪声用户不可感，
     6/6 健康在案——代理计数宿主=r7 实证 level1 getTextContent 终止警告流）。
   - **轨二随票**=c（CorpusExtractor 失败路径补 destroy——闭 P6+修状态机表
     证伪格，体量极小）+b（destroy 序列化——机理待注入实验证，可选）。
   - 死刑候选勿复活：a 共享 workerPort（4.10.38 Terminate→handler 销毁源码
     实锤）/d 指纹吞并（三路否定无接收点——降格产物=代理计数已并入轨一）。
   - INV 增补随修票落定（候选宿主=新 INV「pdfjs 文档生命周期销毁序」或
     INV-30 增补；强制方式=代理计数可见性锚——f-r3-investigation §5.3）。
2. **A3 悬置写修票**（素材=scripts/audits/audit-c-scan.md §1.2-a）：cancel
   API+in-flight 代际检查+main 归属校验三件套（deepseek W-5 修法补强在案）。
3. **F-R2e 排查票**（立案新入——同值 3.45px×2；首步=全量序列内定位+指纹
   矩阵，窗态假说已证伪勿重开）。
4. **C-3 候选 W 级**（audit-c-scan §5 五条：D4 import×switch 互斥/
   SelectionLayer 幽灵标注（照抄 undo paperId 捕获范式）/settings.save 并发/
   ImportProgress sessionId 并入 D4）——按 R1 纪律单波修票 ≤2。
5. W-G1 band 双态渲染定位（计数仍 1）。

停点判据沿用：单票回炉 ≤2；整场触 40% 即停。**时序面全图**落
docs/audits/audit-c-scan.md 已在档（W-7：普通文档不入锁）——后续新增 async
写路径工单对照自查（工单模板文化层条款候选）。

**搭车池不变**（v20 §2 第 4 条）：U3 F-L1-C 三条/SettingsPage 拆件/活文档
防线票余 node --version 断言/16 项复测回收邀请（用户触点场发）。

## 3. 本场方法论资产

- **排查票双门审的「条件销项」形态**：门二四放行条件票内全销（r5~r7 补跑
  +源码核验）——「条件 PASS」不悬置到下场，修票素材 §5 解除移交冻结。
- **候选死刑的证据等级**：应用层候选被「三路否定实验」（renderer/page
  console/主进程 error 级全零）与「源码实锤」（Terminate→handler=null）两
  类证据处决——比「不建议」措辞更强的档案形态，防二波复活死候选。
- **负向证据也是产出**：主进程 level1 代理流（getTextContent 终止警告）=
  噪声监控宿主的意外发现——三路否定实验顺带产出。
- **票面预判证伪的处置范式**（C-2①「菜单将出现」被 onClick 守卫实测推翻）：
  停手+如实报告+门审裁有效性（断言级归属）+册面口径修正——预判错不等于
  实现错，R5 纪律的正确出口。
- **探针产物版本化**：单文件覆盖丢失 r1~r3 栈（W-G2 同族教训再现）——
  f-r3-probe.mjs 已改 R3_TAG 并行留存，探针类产物默认带标签落盘。
- unlock-protected.ps1 漏 invariants.md 条目（锁得进解不开）——受锁集合
  三脚本一致性面（lock/check/unlock），改任一集合先 grep 三脚本。

## 4. 成本账本（模型×供应商×套餐）

```
主控 GLM5.3×bigmodel-coding-plan：探针 7 轮+两报告+全部收口（INV/台账/
  locks/verify/e2e/注释修正）+外部链简报 5 份
只读子代理 GLM5.3 统一档×2（Agent 工具无 model 参数「环境限制统一档」
  欠账照记——§4.5 条款）：M1 静态 4.11M tok/79 工具/1565s；C-3 扫描
  2.40M tok/52 工具/625s
实现者子代理 GLM5.3 统一档×1（C-2 三子项+变异矩阵+全量 e2e+verify）：
  10.5M tok/106 工具/~70min
外部链 ds-call×5：F-R3 门一 kimi-main 一次命中（in≈25k/out 9.1k/19.5min）；
  C-2 门一 kimi-main→kimi-backup 双失败 switches=2→deepseek 兜底（in≈20k/
  out 22k/173s——门一门二同源异质性损失如实入账）；deepseek 单源×3（C-3
  产出审 in=10459/out=16550/165s；F-R3 门二 in=10072/out=29238/269s；
  C-2 门二 in=14549/out=20365/178s）
本场预算估计 ~55%（三票全闭环+两换源重试+七轮探针——未触停点线，
  裁 C-3 条款未启用）
```

## 5. 环境事实滚动

- **PATH 前导漂移警示**：本会话 shell PATH 前导=/d/nodejs（node v25.2.1
  ABI 不符）而非 /d/nodejs24——**一切 node/npm/npx 调用须显式
  `export PATH=/d/nodejs24:$PATH`**（v21「恒定」口径已过时，逐会话核）。
- 探针变异后必须 rebuild 才生效（探针/e2e 均跑 out/ 构建产物——C-2 实现
  者首跑假绿实证）；`$?` 读管道尾命令退出码的坑（tee 后 VERIFY_EXIT 假 0）
  ——真退出码用独立 echo 或 PIPESTATUS。
- e2e 全量 30 用例 ~1.5min（新用例 7.1s）；f-r3 探针单轮 40s~2min（含
  真实库副本启动）；Kimi 链延迟波动 2~20min（两场一次命中一次双失败）。
- 真实库副本 9 卡片（default 课题）——连开/开关实验的采样面充足；
  ai-note-rect 缺席（N6 AI 层=absent 如实记录形态）。
- 本场编辑工具（Write/Edit）落盘为 LF（无 CRLF 污染——曾以 grep `$'\r'`
  误判全场 CRLF，实为该 shell 把 `$'\r'` 当字面 r 匹配；行尾字节判定一律
  node 字节计数，grep 不可信）。locks/manifest.json 本体=PowerShell 写出
  CRLF 属常态（哈希覆盖的是被锁文件字节，manifest 自身行尾无关对账）。
