# F-GEOM-01-G3 门一审包简报（主控→对抗深审）

> 档位：ops-gate1-k1 绑定子代理（kimi-main k3 $max）。工作区根
> E:\class\智慧水务\Synapse_remake。审档输出路径（你唯一可写件）：
> `scripts/audits/g3-gate1-report.md`。

## 铁律

只读审计（Read/Glob/Grep 仅限）；唯一可写=上述报告件；禁 npm/test/git 写操作/
禁触 tickets 面任何写。

## 输入四件

1. **diff 包**（主控预生成，6 文件 +21/-9）：`scripts/audits/g3-gate1-diff.patch`
   （relay.md 认领写入 3 行非本票面已剔除；未跟踪新件=本简报+实现者报告+verify
   日志三审计件，非被审代码）。
2. **票面**：`tickets/registry.ts` 294 行起 F-GEOM-01-G3 条目（只读）；母本设计书
   `docs/design/2026-09-18_f-geom01-unification-and-reader-subdomains.md`
   §2.5（160~170）/§2.6（172~184）/§2.3（136~143 坐标域段）/§5.4（362~370）。
3. **实现者报告**：`scripts/audits/g3-impl-report.md`（含六段简报指针
   `scripts/audits/g3-impl-brief.md`——实现任务书，一并读）。
4. **证据日志**：`scripts/audits/g3-verify-final.log`（3876 行，尾行
   G3_VERIFY_FINAL_EXIT=0；抽读关键段即可——票数/locks 数/test 数/指纹门）。

## 主控已预裁项（可攻击，推翻需更强依据）

1. **TDD 豁免口径**：纯登记面零行为变更（只动 INV 条文+头注注释）——红绿循环
   与变异红证无适用对象；验证=verify 全链+locks 链+diff 范围（batch 12 立案批/
   batch 8 纯调研票先例）。
2. **selection-paint.tsx 陈旧声明随票修正**（简报③-5）：49 行「bandsNearRects
   产物」系 F-A5 时代残留，与 INV-68 档3=S3b 专用登记互斥——接缝归责纪律随票
   勘正（第 10 行头注同族一并）。零行为变更。
3. **e2e 不跑**：零运行时值变（纯注释/文档），父级 e2e 验收义务归 G11（板面
   G11 票面含验收门全跑）。
4. **INV-68 状态列「已登记」**：非本册状态列三档词表（已锚定/部分/未锚定）
   成员——实现者疑虑 1 如实申报。主控倾向保留（防漂移性 INV 无独立锚定面，
   「已锚定」过度声明、「未锚定」误读），**请门一裁**：保留/改词/补句。

## 工单 A~E

- **A 母本符合度**：票面六要件（INV-68 落册/INV-58 边界注/三处头注域声明/
  跨族交互点登记/接续尾号 67/受锁单链）+设计书 §2.5 表三档绑定逐格 vs INV-68
  条文；§2.6 表 #2/#3/#4 终态收口句 vs 条文；§2.3 坐标域三处处置（登记不物理
  收敛）vs 三处头注+INV-58 边界注。
- **B 宪法红线**：零行为变更声明真实性（逐 hunk 核——纯注释/条文的声明是否
  成立，任何代码语义变更=B）；受锁链时序（unlock→改→apply、manifest 2 行与
  唯一受锁改动同步）；UTF-8（报告称逐件回读+verify 关卡绿——抽验 2 件）；文件
  ≤500 行。
- **C 登记质量（本票核心面）**：①INV-68 条文的行号/消费面引用 vs 源码实测
  （bandsFromItems:366/506、selection-evaluate:130/207/233/290/296、
  annotation-resolve:209/235/275/300、AnnotationLayer.tsx:98、calibrateBands:77
  ——实现者报告「验证证据」段自列清单，逐个抽核）；②三处头注域声明的**技术
  准确性**（localScale=UI 布局域的说法 vs 函数实际语义；itemViewportOf「只入
  项几何族数学」vs 实际消费面——grep 核）；③selection-paint 勘正句是否引入
  **新谎言面**（「与标注层渲染同基准」保留句是否仍准确——matchBand 同函数？）；
  ④INV-58 边界注「禁直接混入 DOM 量测域比较」的表述是否有既有事实支撑
  （r3a 事故定性）。
- **D 报告诚实性**：自裁 6 条逐条 vs diff 实物（特别是自裁 1 域界宿主落 INV-58
  的处置、自裁 5 的 :290 备案是否在条文中如实未扩）；numstat ±行数复核；
  「五文件 143/283/411/88/91 行」实测。
- **E 接缝与后续单**：本票登记与 G4~G11 目录化迁移的交互（INV-68 行号引用在
  目录化后会否成为断锚债——G11 收官义务是否覆盖）；selection-paint 头注勘正
  是否影响既有测试注释引用；遗漏消费面扫描（band 三函数+calibrate 全仓 grep
  ——实现者是否漏列消费点）。

## 输出契约

`scripts/audits/g3-gate1-report.md`：[B|W|N] 逐条+file:line 证据+统计（B/W/N
计数）+总评（PASS/PASS_WITH_WARNINGS/FAIL）。回复五行内。
