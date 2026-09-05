# 2026-09-05 LOOP 交接 v49——F-AUDIT-01 清场+F-SPLIT-01 拆件+F-CSS-01 拆 CSS 三票毕（闲时序全清）

> 上段=v48（Kimi 体检 v2+主控终裁+三单立案）。本段=v48 §2 闲时可连续项
> 1~3 全部收口（三票四提交）;项 4 用户在场依赖、项 5 观察期未足（09-04
> 起算仅 1 天）——**停止条件①池尽成立**,本交接书=收束点+下段开场件。
> 基线推进：**156 文件/1450 用例（1422+28）/locks 286/e2e 43**。

## 1. 本段终态

| 票 | 提交 | 终态要点 |
| --- | --- | --- |
| F-AUDIT-01 清场 | 32ffc6576f+b1b28e4d0e | 三桶毕：243 证据件入库（实测口径,终裁 246 差 3=动态变化申报）+16 个 *out* 目录被 .gitignore `scripts/audits/*out*/` 拦（尾斜杠目录形态,closeout 文件名免疫;历史已跟踪件不受影响）+12 backup 删（删前抽样核验=源文件 cp 副本+报告零引用）;顺带 tsconfig.node.json jsx=react-jsx（v46 观察项核销,受锁流程+typecheck EXIT=0）;清场毕 git status 未跟踪面=零 |
| F-SPLIT-01 拆件 | b1b6990f52 | 五件贴线态解除：PageColumn 249→164[View72+LazyWindow83+Scroll66]/AnnotationLayer→151[Popups147,F-A8 编排零触]/AiNotesSection→107[Status158+phase37]/LineageBoard→155[Menu106+Dialogs103]/ReaderPage→163[View157+shortcuts42];余量最小 86≥80;零视觉差=探针三轮 COMPARE PASS（baseline 双跑 DETERMINISM+回炉前后 after）;门一 Kimi PWW B0/W1/N6（W1 批次标记回炉闭合=宿主有标随标无标不补）;门二 PWW 亲跑矩阵命中（变异 1 红还原空;busy 守卫不红=存量盲区备案批二候选） |
| F-CSS-01 拆 CSS | 4c54cab9aa | 645→五件：theme.css 116 留守[token 47 正锚路径零扰动+keyframes]+shell 236[**守卫随域驻件末**——自裁+主控亲验追认:留守首件会被同特异性后载反压失效]/buttons 113/reader 60/lineage 140;main.tsx 五行 import 保序;守恒 631=631（门二独立复算）;theme.test.ts 受锁扩展[49 三元组+先红证]+check-quality CSS 关卡（.css>450）;**接缝扩权 4 测试再锚**（主控逐件亲核追认）;门二 PASS 无保留+**reduced-motion 14/14 实机验证**（探针盲区补验） |

基线衔接可解释性：1422→1450=F-CSS-01 theme.test.ts 28 新负锚三元组
（21→49,7 字面量×4 新件期望 0）;locks 286 不变（6 受锁件 sha 更新,无新
增锁面——CSS/renderer 非锁面）;e2e 43 不变（两拆件票均零新 spec,票面
纯迁移零行为差口径）。

## 2. 下段执行序（v48 §2 之续——用户依赖项与条件项）

1. **P7D-01 批二（在场轮——用户依赖开场,遇即挂起）**：字号 12 值→语义
   刻度 5~6 档+mockup 多模态评审+半值归并逐档用户裁;**票面预写 §6.2 条款**
   （探针验收口径从「零视觉差」切换「逐档定向 diff 复核」——改值预期红
   申报,防实现者误当缺陷回退）;INV「design token 单源」随批二登记;token
   命名与 --fs-* 扩展兼容已验证;**F-CSS-01 后新事实**：批二字号轴消费面
   在四皮肤件（门一 E3——10.5/13.5/9.5/11.5/13/12px 等散于 shell/reader/
   lineage）,负锚扩面按 F-CSS-01 四件同型;F-SPLIT 门二备案「弹层动作链
   用例」（AnnotationPopups busy 守卫存量盲区）批二触 reader 域时顺带补。
2. **F-A8 门 3 收口票（观察期条件：2026-09-04 起算跨场次真机使用后——
   本段无真机使用场次,条件未满足顺延）**：五项清单 v46 §2-1（回退层去留/
   box 偏差分布/S6 代理复核[W1 回炉补注]/N1N2 顺带/bottom 分解）。
3. 被动观察/备案池（不变）：F-ARCH4-M1（多场零现——本段两票 e2e 零新
   观察数据）;outbox 期二（真实使用数据后裁）;INV-11 lint 机器化候选;
   F-R3 stream 泵竞态。

> 停止条件注：本段已按①池尽收束;下段首动作=P7D-01 批二若用户在场即
> 开场,否则观察期/备案池条件未动=维持挂起待用户。

## 3. 本段成本账本（续 v48 §3——token 按子代理回执,模型×供应商分列）

```
F-SPLIT-01：实现者 GLM5.3flash（zcode 子代理,体验套餐口径）两轮
  8.28M+0.97M tok/31.5min+1.7min;门一 Kimi K3（kimi-main,ds-call 链）
  in 31.4k/out 10.6k/260s switches=0;门二 GLM5.3 次选档（deepseek 平台
  未配置,同源欠账如实记）2.25M tok/9.0min
F-CSS-01：实现者 GLM5.3flash 两轮（BLOCKED 停手+续命）1.58M+5.03M tok/
  13.7min+15.9min;门一 Kimi K3 in 0（usage 记录口径异常,如实记）/out
  8.8k/497s switches=0;门二 GLM5.3 次选档（同源欠账）2.25M tok/8.1min
主控 GLM5.3（本段全程）：三票简报/派发/处置/亲验（探针 7 轮+verify 5
  轮+受锁流程×2+registry×3+追认亲核）+交接书 v49
Kimi 额度消耗提示：两场门一 in 合计 ~31.4k（第二场 in=0 异常待观察——
  若再现考虑 ds-call usage 解析核验）
```

## 4. 教训行（本段追加——v48 §4 之续）

- **受锁文件只读属性=实现者写面的硬边界**（F-CSS-01 BLOCKED 实录）：
  locks:apply 后受锁件带 R 属性,子代理 Edit/append 全拦——简报预判条款
  （「只读拦你即 BLOCKED 停手」）正确兜住,实现者未绕行;**标准流=实现者
  报 BLOCKED→主控 locks:unlock→SendMessage 续命→毕后主控 apply**。简报
  写「编辑前无需解锁即可写」是错误前提,已按实测修正。
- **子代理「在线授权」叙事不作数**（F-CSS-01 续命轮实录:实现者称
  AskUserQuestion 获「授权再锚」——无人值守场该调用路由不明）:超票面
  扩权一律以**主控逐件亲核 diff 追认**为准,过程叙事（谁授权了什么）不可
  作为放行依据;门一 D2 同判。
- **git add pathspec 错误=整体 fatal 零文件入暂存**（本段两次实录:
  .tsx/.ts 笔误+probe 文件名凭印象）:批量 add 前先 ls 实际文件名,或
  add 后必 `git status --porcelain | grep -cv "^A \|^M "` 核 staged 数。
- **行内多行 node -e 在本环境被截首行静默 no-op**（实现者先红证首试+
  门二自裁申报两踩）:变异红证脚本一律 temp .cjs 文件法+自校验计数,
  禁行内多行 node -e。
- **探针输出 GBK 控制台乱码≠文件乱码**（F-CSS-01 probe after 终端显示
  乱,文件 UTF-8 正常）:以 exit 码+关键 ASCII 串判定,mojibake 关卡扫
  源码不扫日志。

## 5. 环境事实滚动

- 基线：**156 文件/1450 用例/locks 286/e2e 43**（1422+28 递增在案）;
  registry 2 open（P7D-01/F-A8——F-AUDIT/F-SPLIT/F-CSS 三单本段毕）
  /152 done。
- audits 口径新常态首验证：三票证据件 17+19 项随收口提交入库（桶①）,
  探针 p7d01-out/ 被 .gitignore 桶②拦——口径运转正常。
- b3 批次标记惯例=非强制（26/64 reader 域带标）:拆出件跟随宿主形态
  （有标随标/无标不补——F-SPLIT W1 裁决口径）。
- 探针 p7d01-visual-probe.mjs 为三票共用件已三票六跑;baseline 每票重采
  纪律运转中（v48 §5）;**reduced-motion 面=探针盲区**（注入双保险掩盖
  守卫位置缺陷）,涉动画迁移的票须门二实机 emulateMedia 验证（F-CSS-01
  门二 14/14 先例配方在档 f-css01-gate2-reduced-motion.raw.txt）。
- 沿用 v48/v47/v46 各条。
