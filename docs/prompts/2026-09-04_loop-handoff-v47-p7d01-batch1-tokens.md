# 2026-09-04 LOOP 交接 v47——P7D-01 批一毕（token 三轴零视觉差）+P7X-02 全链毕（时长 outbox）

> 上段=v46（F-A8 门 2 毕+门 0 遗留修复）。本段两票全链：
> **P7D-01 批一**（主控探针+基线双跑→三屋实现+回炉+双门审）+**P7X-02**
> （设计链三跳+实现+回炉+双门审——设计/实现两单元分提交）。
> **F-A8 门 3 观察期自本场起算**（v46 §2-1——跨场次真机使用后另场裁决）。

## 1. 本段终态

| 项 | 数值/结论 |
| --- | --- |
| P7D-01 批一 | **毕**：三轴——动效 32 处→--dur-press/tint/fast/base/lazy/rise/flow 七 token/间距 inline 12 处→tailwind class/弹层 z 四值→--z-float/anchor-pop/pop-veil/pop 语义命名（12 class[v4 简写 z-(--z-*)]+2 raw）;零视觉差铁证=探针基线双跑 DETERMINISM PASS+迁移后 COMPARE PASS（11 token 计算值+8 图逐字节+sweeps 逐键+compiledRules 11 utility）;theme.test.ts 受锁扩展+变异 6 证;门一 deepseek 兜底（Kimi 双源 8×504）回炉一轮+门二 PASS 无条件;registry 注记（批一毕,批二在场轮待） |
| P7X-02 | **毕（done）**：设计链三跳（Kimi 拟定 B 案 renderer localStorage 持久 outbox→deepseek EWC 4CR+4CO→GLM5.3 终裁——队头阻塞+T7 取消/at-least-once 重复界 N×3600s 每条/R7 并入/存储面双 launch 实证 PASS）;实现=outbox 态机 298 行+store 87 行[每条目独立 key]+三收尾口改道+INV-57 注记两句;回炉一轮三 W（**渲染先行+后台回放**[白屏/WARN 丢失同根消除]+**排空闸门全派发阻断**[身份快照不依赖 seq 单调]+e2e DB 轮询）;门一 deepseek（101KB 超 Kimi 体量类预跳实录）+主控 C-1/C-2 源码亲证闭环+**新边界发现**（活卷防抖直发面交叠窗=暂态回退自愈,设计书 §10 第 8 条）;门二 PASS（真亲跑+C-1/C-2 复核成立）;e2e 新 spec reading-time-replay（注种崩溃残留→T5→真 IPC→真 sqlite）随 done 激活 **43/43 绿** |
| 基线 | verify **156 文件/1422 用例/locks 286/e2e 43** 全绿亲验（v46:155/1357/281/42;P7D-01 +38 用例+locks 282;P7X-02 +24 用例+locks 286[+outbox.test/replay.spec/impl 探针/ls 探针四件]+e2e +1） |

## 2. 下段执行序

1. **P7D-01 批二**（在场轮——用户依赖：字号 12 值→语义刻度 5~6 档+mockup 多模态
   评审+半值归并逐档用户裁;视觉票面条款全套;INV「design token 单源」随批二登记）。
   批一基座与探针配方就绪（字号轴改值前重采 baseline）。
2. **F-A8 门 3 收口票**（观察期已起算本场——清单 v46 §2-1 五项）。
3. 被动观察/候选票池：F-ARCH4-M1（多场零现）;tsconfig.node jsx 债;theme.css 645
   行 CSS 拆分候选;outbox per-paper 退避+全页写穿 outbox（活卷直发面根治）候选;
   send 挂起超时（已被渲染先行结构性缓解,残余=后台循环 idle 面）。

## 3. 本段成本账本（续 v46 §3）

```
主控 GLM5.3×bigmodel-coding-plan：开工纪律+底数脚本复核+P7D-01 探针编写/基线
  双跑/两疑虑亲处置+compiledRules 仪器强化+verify×5/probe×3/e2e×2 亲验+P7X-02
  设计链终裁+假设④实证探针+C-1/C-2 源码亲证+新边界发现+两票门链包+裁决（回炉
  3+3 项下发）+registry×3+交接书×2
实现者子代理（环境统一档欠账披露——GLM5.3flash 定档申报）：
  P7D-01 首发 5.38M tok/15.3min+回炉 2.41M/5.1min;
  P7X-02 首发 17.70M tok/38.3min+回炉 6.76M/6.9min
外链：Kimi K3 设计首跳 in 1540/out 5400/102s（10.6KB 小包入窗）;
  deepseek 门一[P7D-01 兜底] in 15064/out 14078/145s;
  deepseek 设计二审 in 5168/out 23644/224s;
  deepseek 门一[P7X-02 直发] in 32586/out 28849/253s;
  门二×2=Agent 子代理 GLM5.3flash 2.03M/9.1min+2.44M/9.0min（半异构欠账）
```

## 4. 教训行（本段追加——v46 §4 之续）

- **lint 面覆盖 scripts/audits/**（含 -out 数据子目录）：一次性验证脚本 require()
  触发 no-require-imports——主控写 .cjs/.mjs 工具件即进 lint 面,一次性脚本用后
  即删或写 import 形态。
- **探针断言「计算值」须按浏览器序列化形态**（<time> 归一 0.08s→"80ms"/去前导
  零）+**file:// 下 styleSheets cssRules 抛 SecurityError**——编译面断言改 Node
  侧直读 bundle CSS 文本;源码字面锁与计算值锁两面互补。
- **Kimi 网关 ~300s 切断长生成**：44.7KB 审查包+K3 长输出必 504（双配额同端点
  8×504 退避链 ~40min）;**10.6KB 设计包 102s 入窗**——体量类判定实证;大包门审
  当日实际=deepseek 直发（预跳实录+主动换源事件记档）;缓解候选=包瘦身压输出
  时长入窗。
- **门一「不确定-重大」类 findings 主控即刻源码亲证**（C-1/C-2 两项 5 分钟亲证
  闭环,顺带发现活卷直发面新边界）——外链零仓库接触的盲区由主控源码验证补位,
  不留到门二。

## 5. 环境事实滚动

- 基线终态：**156 文件/1422 用例/locks 286/e2e 43**。
- 任务池：P7D-01 open（批一毕,批二在场轮待）/P7X-02 **done**/F-A8 门 3（观察期
  起算=本场）。
- 探针资产：p7d01-visual-probe.mjs（批二复用时 baseline 先重采）+p7x02-ls-probe.
  mjs（localStorage 实证）+p7x02-impl-e2e-probe.mjs（重放链无守卫复制件——spec
  激活后主保留 spec,探针留档）。
- Electron file:// localStorage 实证在档（可写+跨重启持久）——B 案存储面依据。
- Kimi 外链体量类分界在档（§4 教训行）。
- 沿用 v46/v45 各条。
