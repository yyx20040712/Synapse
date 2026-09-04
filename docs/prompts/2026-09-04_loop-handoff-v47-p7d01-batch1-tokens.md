# 2026-09-04 LOOP 交接 v47——P7D-01 批一毕（design token 三轴机械迁移零视觉差）

> 上段=v46（F-A8 门 2 毕+门 0 遗留修复）。本段：**P7D-01 批一**全链
> （主控探针+基线双跑确定性验证→三屋实现+回炉一轮+双门审→[locked-change] 提交）。
> **F-A8 门 3 观察期自本场起算**（v46 §2-1——跨场次真机使用后另场裁决）。

## 1. 本段终态

| 项 | 数值/结论 |
| --- | --- |
| P7D-01 批一 | **毕**：三轴——动效 32 处→--dur-press/tint/fast/base/lazy/rise/flow 七 token（3 CSS 文件,animation 时长零改）/间距 inline 12 处→tailwind class（lineage 六文件,B1 形态,px 映射 4→-1/3→-0.75/6→-1.5/8→-2）/弹层 z 四值→--z-float/anchor-pop/pop-veil/pop 语义命名（12 class[v4 变量简写 z-(--z-*)]+theme.css 2 raw）;page-layer-z.ts 头注接缝同步;21 文件 225+/68- 零蔓延 |
| 零视觉差铁证 | 探针 p7d01-visual-probe.mjs（主控工具,入锁）：基线双跑 **DETERMINISM PASS**（8 态截图逐字节相同）+迁移后 **[COMPARE] PASS ×3 轮**（11 token 计算值精确匹配[Chromium 序列化形态 80ms/.12s]+8 图 sha256 逐字节相同+全 DOM 计算样式 transition/zIndex 逐键相同+**compiledRules 11 utility 编译面绝对断言**[门一 §6(2) 处置——未渲染弹层件闭环]） |
| 测试面 | theme.test.ts 受锁扩展（unlock→apply×2 轮）：TOKENS+11+负锚 21 三元组+层级形态锁+z-[N] arbitrary 全禁+间距形态锁[三引号字符类]+ms 声明段锁;首红 31F 落盘+**变异红证 6 次**（3 首发+3 回炉,cp 备份法 RESTORED-CLEAN） |
| 门审 | 门一=deepseek v4flash 兜底（**Kimi 双源 8×HTTP 504 耗尽**→switches=2,model-routing-log 在档——网关 ~300s 切断长生成,44.7KB 包必超窗）;不否决,C 三盲区（负锚异形态绕过/探针两确认项）→回炉一轮 W1/W2/W3 闭合+主控仪器面强化（compiledRules）;门二=**PASS 无条件**（Agent 子代理 GLM5.3flash 政策次选档,真亲跑矩阵：verify 四数字命中+探针 PASS+mutA/mutB 独立变异抽查双红+还原零残留;与实现者同家族半异构欠账如实记,跨门异构由门一 deepseek 承担） |
| 基线 | verify **155 文件/1398 用例/locks 282/e2e 42** 全绿亲验（verify4+门二复跑;v46:1357/281→+41 用例[38 首发+3 回炉];locks +1=探针入锁） |

## 2. 下段执行序

1. **P7D-01 批二**（在场轮——用户依赖：字号 12 值→语义刻度 5~6 档设计+mockup
   多模态评审+5 个 .5 半值归并逐档用户裁;视觉票面条款全套适用;INV「design token
   单源」随批二登记——批一票面在档决策）。批一基座就位（--dur-*/--z-* 命名体系与
   --fs-* 扩展兼容;探针可复用——字号轴改值前重采 baseline 即可）。
2. **P7X-02 时长 outbox**（设计链外链双跳——service 层非视觉）。
3. **F-A8 门 3 收口票**（观察期已起算——清单 v46 §2-1 五项）。
4. 被动观察：F-ARCH4-M1（多场零现）;tsconfig.node jsx 债;theme.css 645 行存量超
   500（迁移前 631 已超,ESLint 无 CSS 面——门二记档观察项,CSS 拆分候选另票）。

## 3. 本段成本账本（续 v46 §3）

```
主控 GLM5.3×bigmodel-coding-plan：开工纪律+底数脚本复核+探针编写/基线双跑/
  两疑虑亲处置（确定性脚本删除+仪器期望计算值形态）+compiledRules 仪器强化+
  亲验 verify×2/probe×3/e2e+门链包+裁决（回炉 3 项下发+§6 两确认项裁定）+
  registry 订正+v47
实现者子代理（环境统一档欠账披露——GLM5.3flash 定档申报）：
  首发 5.38M tok/15.3min+回炉一轮 2.41M tok/5.1min
外链：deepseek v4flash 门一兜底 in 15064/out 14078/145s PWW（switches=2）;
  门二=Agent 子代理 GLM5.3flash 2.03M tok/9.1min（半异构欠账）
```

## 4. 教训行（本段追加——v46 §4 之续）

- **lint 面覆盖 scripts/audits/**（含 -out 数据子目录）：主控一次性验证脚本
  determinism-check.cjs 的 require() 触发 no-require-imports——实现者 verify
  中断但红点不在实现面（诚实上报+单独落盘各关卡 exit 码=正确处置）。
  **主控写 .cjs/.mjs 工具件即进 lint 面——一次性脚本用后即删或写成 import 形态**。
- **探针断言「计算值」须按浏览器序列化形态**（Chromium 对 <time> 归一：
  0.08s→"80ms"/去前导零 ".12s"）——源码字面锁（theme.test.ts TOKENS）与计算值
  锁（探针）两面互补,期望值形态不能混用。同族：**Electron file:// 下
  document.styleSheets 的 cssRules 抛 SecurityError 全跳过**——编译面断言改
  Node 侧直读 bundle CSS 文本（首版 11 项全 miss 实录）。
- **Kimi 网关 ~300s 切断长生成**：44.7KB 审查包+K3 长输出必 504（双配额同端点
  同命,8×504 退避链耗尽 ~40min）——大包门一审当前实际=deepseek 兜底;
  异构性缺口（实现者 GLM 系+门一 deepseek）由门二跨门异构部分补偿。
  缓解候选（下段可裁）：包瘦身（diff 裁剪/evidence 摘录化）压输出时长入窗。

## 5. 环境事实滚动

- 基线终态：**155 文件/1398 用例/locks 282/e2e 42**。
- 任务池：P7D-01 open（批一毕,批二在场轮待——registry 注记含批一终态全档）/
  P7X-02/F-A8 门 3（观察期起算=本场）。
- 探针资产：scripts/audits/p7d01-visual-probe.mjs（受锁）+p7d01-out/{baseline,
  baseline-run1,after}/+compare-report.json（数据不入 git）——批二复用时注意
  baseline 需在字号轴改值前重采。
- Kimi 外链现状：大包 504 形态在档（§4）——小包（<~20KB）仍可用;ds-call 链
  状态机实战验证（attempt/switch/exhaust 流水账完整）。
- 沿用 v46/v45 各条。
