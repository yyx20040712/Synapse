# 2026-09-03 LOOP 交接 v31——闲时段完整段:P7-E 两票+AUDIT-B 开审三役全闭环,任务池清空合法收段

> 上段=v30（P7E-02 拖拽导入）。本段收口=**AUDIT-B 开审四段全走**（简报→取证
> 扫描 6N+1W→对抗审→B7-W1 修票压缩票闭环）。至此 **v28 §2 排程全项毕**
> （①P7E-01 ②P7E-02 ③AUDIT-B 开审 ④挂起项照旧零动作）——停止条件①
> （任务池清空）合法触发，收段。
>
> 更正注记：v29/v30 所称「ds-call.mjs 工具本体丢失」**不成立**——原件一直在
> `scripts/audits/ds-call.mjs`（未跟踪态，本段勘误发现；此前搜索 maxdepth 限制
> 漏检）。重建的 gate-call.py（~/.zcode/workspace/，三源+reasoning 捕获）与
> 原件并存，功能超集，继续用重建件（原件无 reasoning 捕获与瘦身包纪律）。

## 1. 本段（AUDIT-B 役）终态

| 项 | 数值 |
| --- | --- |
| verify | exit=0 亲验（**135 文件 1163 用例**=1160+3；raw=b7-verify-final2.raw.txt） |
| locks | **251**（250+tags-upsert-guard.test.ts） |
| AUDIT-B | 四段全走：简报（auditb-brief.md 六对+1 边界配方）→取证扫描（子代理 11.96M tok/121 工具/60min；探针 auditb-{b7,b15,b23,b4,b6}.js+转储 5 JSON+5 PNG）→对抗审（deepseek PWW 0B/2W/1N——三处机制归因越证措辞降级 v2 修订，ds-审标记 5 处）→B7-W1 修票 |
| 对偶结论 | **6N+1W**：B1 工具条 zoom 自洽（顶锚 42.0/dx=0/125% 档残余 3.8px 记档）/B2 最大化零进度漂移/B3 drag 区不吞键位/B4 流光零 longtask（观测口径）/B5 面板零溢出（×1.248 反差量化留场场）/B6 dirty×最小化零丢失（owned-modal 归因降级为推演）/**B7 tags 空格名 W→已修** |
| B7 | 主控压缩票（SR2-F-09 先例）：upsert trim 空 INVALID_REQUEST（对齐 rename 先例）+3 用例（先红 2/绿 3/变异 M1 定点撤卫 2 红还原核毕）；门一 Kimi PWW（W=程序序翻态惯例/N1 票面同步/N2 locks 收口兑现）+门二 deepseek PASS 零发现 |
| 探针纪律 | 探针 .js 后缀避 .mjs 自动锁面（合规——walk 只覆盖 .mjs/.ps1）；better-sqlite3 双 ABI 备份还原+sha256 对账在档 |

## 2. 下段执行序（闲时段第五段——任务池重蓄）

1. **P7-E 余序**（ROADMAP §P7-E 建议内序，出处锚 B1 §3）：页内高亮搜索
   （ReaderToolbar.tsx:7,163 占位禁用态已放）> 导出剪贴板（export.service.ts:27，
   ipc 加通道）> 阅读时长统计（reader.service 生命周期层+新迁移加列）> 标签多选
   过滤（TagFilter.tsx:6）> 智能排序（library.service.ts:20）。工单化纪律照旧
   （出处+态空间表先行）。
2. **在场场裁决队列**（AUDIT-B 留场场项）：B5 切换器面板×zoom 大档观感反差
   （量化 ×1.248 在档）；B6 模态期最小化语义（Win32 owned-modal 推演待文档
   对证）；P7-D 全项/F-G1/token 插队权照 v28 §2 模式注记。
3. 环境备忘：e2e 测 resize 面勿用 setViewportSize（锁死内容区假绿——B2 取证
   副产物，扫描报告 §二在档）；z-r2e 探针 flake 指纹 1 现在档（再现即立案）。
4. 连续开发制照 AGENTS 条目。

## 3. 本段方法论资产

- **审计四段在闲时场的完整走法**：简报固化配方与判级线（防扫描跑偏）→只读
  取证子代理（禁改 src/tests——探针+临时 userData 隔离）→外发对抗审（审报告
  文本：证据纪律/推理链/判级/完整性/诚实度五维）→W 级修票。AUDIT-C 先例的
  动态取证版全通。
- **机制归因的措辞纪律**（对抗审 W1/W2 教训）：零 longtask≠纯合成器、最小化
  无效≠Win32 语义——观察事实与机理解释必须分层落笔，归因句要么带文档锚要么
  标「推演待对证」。审计报告的可信度=读者能区分「量到了什么」与「为什么」。
- **同型守卫的双行陷阱**：变异定点（upsert 卫语句）时同文件 rename 先例存在
  同字面行——grep 计数 2 必须先定位函数域再变异（find('async upsert') 起点
  定位法），否则变异错靶假红。
- **锁序纪律**：新测试文件诞生即 locks:generate+apply **先于** verify（本段
  B7 首跑 verify 红=顺序颠倒实录——verify 的 locks:check 关卡拦未登记新件）。

## 4. 成本账本（模型×供应商×套餐）

```
主控 GLM5.3×bigmodel-coding-plan：AUDIT-B 简报/派发/对抗审处置/B7 压缩票/收口全程
取证子代理（继承主控档显式申报）：11.96M tok/121 工具/60min（七项全毕+转储在档）
对抗审 deepseek（gate-call.py）：in=8060/out=23137/190s（首派系统提示词错配
  一杀一重派——材料内嵌审纲兜住）
B7 双门：kimi in=4274/out=1674/49s（PWW 程序序 W）；deepseek in=4529/out=12760/126s（PASS）
verify 全量×2（一红一绿——锁序教训在册）
```

## 5. 环境事实滚动

- 沿用 v30 各条；**勘误**：ds-call.mjs 原件在库（scripts/audits/，未跟踪）——
  「外链丢失」判断作废，重建件为功能超集继续服役。
- 新增：setViewportSize 假绿陷阱（e2e resize 面勿用）；探针 .js 后缀避锁面
  形态；z-r2e 探针 flake 指纹（几何首 resolve 即红族）。
- verify 基线滚动：**135 文件 1163 用例/locks 251/e2e 35 用例**。
