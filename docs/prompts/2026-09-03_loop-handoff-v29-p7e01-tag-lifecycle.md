# 2026-09-03 LOOP 交接 v29——闲时段第二段:P7-E 首票标签生命周期三屋全闭环

> 上段=v28（N 级清扫合批五票+停点改连续开发制）。本段=v28 §2 第 1 项
> **P7-E 首票=P7E-01 标签生命周期（改名/合并/删除）三屋全链落地**：门一
> Kimi PASS_WITH_WARNINGS（0B/3W/3N——W3 Esc/W1 恒真口径回炉落地+W2 S10
> 裁决豁免票面补记）+门二 deepseek PASS 零发现零回炉；单测 132 文件 1142
> 用例（基线 128/1113，+4 文件+29 用例）+e2e **34/34**（基线 33+1 新 spec）
> +locks **246**（241+5 新测试件）全绿。

## 1. 本段终态

| 项 | 数值 |
| --- | --- |
| verify | exit=0 亲验（132 文件 1142=基线 1113+29；raw=p7e-01-verify-final.raw.txt） |
| e2e | **34/34 全绿**（+tag-lifecycle.spec：改名→合并→删除全链真实文本+死筛选自愈；1.7m） |
| locks | **246**（241+4 unit+1 e2e 新件即时 generate+apply） |
| P7E-01 | repo 四方法（findByName/renameTag/mergeTags 三步事务/deleteTag 两步事务）+service 校验序（trim 空 INVALID_REQUEST/NOT_FOUND/CONFLICT 不自动合并/自合并拒）+三 IPC 通道 [locked-change]+store 命令型三动作（成功链式 refresh/NOT_FOUND 自愈/余零 refresh）+TagFilter 右键管理面（TagLifecycle 三对话框+TagLifecycleMenu 菜单拆件）+FilterBar onMutated 注入 |
| INV-53 | 登记（标签 id 消失即引用清空——library 筛选 query.tagId 首登记面；单测 invocationCallOrder+M4 变异+e2e 丙回归三锚） |
| 门一 | Kimi K3 in=33590/out=5090/75s（**gate-call.py 外链重建首战**——ds-call.mjs 本体丢失，按同架构重建于 ~/.zcode/workspace/，kimi/zipoo/deepseek 三源凭证在 config）：3W=恒真 COUNT 断言（CASCADE 兜底实锤——W1 注释改如实口径）/S10 无锚（W2 豁免：UI 双回调恰一次断言在场+library.store 既有 loadSeq 族承接，票面补记）/菜单缺 Esc（W3 回炉）；3N=busy 期取消未禁（N1 回炉）/client code 类型断言（N2 遗留池——既有契约缝隙）/收口悬项（N3 本段兑现） |
| 门二 | deepseek-v4-flash in=5680/out=17809/139s：**PASS 零发现**（三处回炉落地+新锚非恒真+受锁面最小增量；两轮前置失败=推理模型 token 全耗 reasoning——8k/16k 档 content 空报复盘 §3） |
| 变异 | M1~M4 全命中红证（M1 假设修正：paper_tags.tag_id ON DELETE CASCADE——孤儿挂接由 FK 级联兜底，票面「孤儿残留」断言恒真，真锚=事务编排 mock 用例；M2 撤 CONFLICT 预检/M3 撤链式 refresh/M4 撤 S2 筛选清空各红） |
| F-G11 | 计数维持（本段 e2e 全绿零新增；实现者期 1 次环境波动=单实例锁 teardown 滞后 firstWindow 超时，复跑即绿未达 2 次立案线，指纹在报告 §6） |

## 2. 下段执行序（闲时段第三段——v28 §2 顺延）

1. **P7-E 二票=拖拽导入**（三屋；出处=B1 §3 `ipc/import_.ts:18 + ImportDropZone.tsx:7（拖拽导入，webUtils.getPathForFile 经 preload）`——工单化纪律同 P7E-01：出处锚+态空间表先行+价值/依赖/风险/验收逐项；注意 F-D4 import 会话身份两合一（INV-52）为在档依赖面）。
2. **AUDIT-B 开审**（蓝本=AUDIT-A/C 场形态；功能对偶矩阵未验 6 对并入；**新增并入项**：tags upsert 纯空格名 trim 后空串可入库——P7E-01 勘察已知边界，门一未及、票面 §⑤ 标注归 AUDIT-B）。
3. 不入闲时批照旧：P7-D 全项挂起（在场场次）/技术升级冻结/P8 池不动；F-G1 叠色维持跳过；F-G11 观察线（触 2 立案）。
4. 连续开发制照 AGENTS 条目（停止条件仅三种；票收口后立即取次项）。

## 3. 本段方法论资产

- **推理型外部模型的 token 预算陷阱**：deepseek-v4-flash 审计包（39k in）在
  max_tokens 8k/16k 两档全耗 reasoning_content——content 空返、raw 0 字节，
  似「调用成功无输出」。处置=①gate-call.py 增 reasoning_content 捕获（诊断
  可见）②材料包瘦身（门二职责=复核回炉+就绪度，非重审全量——39k→6k in）
  ③32k 档+提示词催收敛（「每维度最多三处证据」）。三管齐下后 out=17809 出
  正常 PASS。教训：对外呼推理模型，max_tokens 必须≥16k 起+先小包试产。
- **外部门审链可重建性**：ds-call.mjs 工具本体不在库不随仓库走，但凭证与
  端点（kimi-main/kimi-backup/deepseek 三 provider）在 ~/.zcode/v2/config.json
  常驻——按「凭证在哪、链就在哪」重建 gate-call.py（~/.zcode/workspace/，
  仓库外不入库同 ds-call 先例）。烟测=deepseek 最小包 1.8s 往返。
- **票面假设必须对 schema 求证**：M1「孤儿挂接残留」变异锚设计时未查
  001_init.sql 的 FK CASCADE——级联兜底使断言恒真（测试网靠事务编排 mock
  锚兜住）。教训：涉及 DB 语义的票面断言，落笔前先读 DDL。
- **Agent 工具面无模型参数的档位申报形态**：本环境子代理继承主控档——
  显式写进派发指令 §⑦ 与成本账本（非静默默认），实现者 18.6M tok+回炉
  3.9M tok 如实入账。

## 4. 成本账本（模型×供应商×套餐）

```
主控 GLM5.3×bigmodel-coding-plan：勘察/票面/派发/亲验/收口/交接书全程
实现者子代理（继承主控档，§⑦ 显式申报）：初轮 18.6M tok/157 工具/41min
  +回炉轮 3.9M tok/20 工具/4.5min（W3/N1/W1+两新锚先红后绿）
门一 kimi-main（gate-call.py 链）：in=33590/out=5090/75s
门二 deepseek（同链）：两轮空返（8k/16k 推理耗尽）+终轮 in=5680/out=17809/139s
e2e 全量 1.7m×1；verify 全量亲验×1
```

## 5. 环境事实滚动

- 沿用 v27/v28 各条（volta 绝对路径绕行/裸 vitest sqlite ABI 坑/playwright
  前置 use electron）。
- 新增：推理模型外呼 token 预算纪律（§3 第一条）；gate-call.py 外链位置与
  三源凭证（§3 第二条）；e2e 首跳 firstWindow 超时=单实例锁 teardown 滞后
  环境噪声（1 现，复跑绿，未立案）。
- verify 基线滚动：**132 文件 1142 用例/locks 246/e2e 34 用例**。
