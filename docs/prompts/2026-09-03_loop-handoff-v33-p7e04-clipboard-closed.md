# 2026-09-03 LOOP 交接 v33——闲时段第六段续:P7E-04 导出剪贴板三屋全闭环

> 上段=v32（P7E-03+z-r2e 修票双提交）。本段=同会话续作第三单元：
> **P7E-04 导出剪贴板**（P7-E 余序第二项）三屋全闭环——门一 PWW→R1 三修
> →复核 PASS+门二 deepseek PASS 零发现。P7-E 余序剩余：阅读时长统计 >
> 标签多选过滤 > 智能排序。

## 1. 本段终态

| 项 | 数值 |
| --- | --- |
| verify | exit=0 亲验（**142 文件 1231 用例**=140+2 文件/1219+12 用例实测；raw=p7e-04-verify-final） |
| locks | **259**（256+3 新测试件：2 unit+1 e2e spec；两受锁件 chmod 编辑的锁态漂移经收口 reapply 收账） |
| e2e | **37/37 全绿**（36+1 新 export-clipboard.spec；z-r2e 修复后**第三连绿**——修复稳定性三连实证） |
| P7E-04 | 三屋全链：简报（B1 §3+ROADMAP+export.service.ts:27 预留注记三链出处）→实现者两轮（6.39M+1.86M tok）→门一 Kimi PWW(0B/1W/4N——四重点面拆件/守卫/竞态防线/文案逐字全过)→R1 三修（console.error 观测/ClipboardReq 死导出删/头注 C-06 票外叙述回退）→复核 **PASS**→门二 deepseek **PASS 零发现**（64k 档直起——v32 §3 纪律生效） |
| Design 定案 | 单通道 export/clipboard（format bibtex\|csv 枚举）+**main 侧构建 main 侧写**（DB 派生内容全程 main 侧，renderer 只发 ids+format；deps.clipboard 注入 electron.clipboard）+**构建器单源**（buildBibtex/buildCsv 直用——文件/剪贴板两路径同源）+先构建后写（失败零剪贴板副作用）+无对话框无 CANCELLED；态空间 E1~E8 逐格锚+**INV-56 登记** |
| 拆件 | PaperDetailPanel 248 行贴组件 250 红线→usePaperDetailActions hook 抽取（248→215+109 新文件）；**受锁 paper-detail-export.test.tsx 零改全绿=拆件保真判据**（门一对 diff 逐分支推演核实） |
| 诚实申报在档 | ①两受锁件（schemas/api-surface）系 chmod 后编辑——主控派发令误称预解锁（实况在锁态），实现者按授权面处置+未自 relock；②IpcDeps.clipboard 可选化——受锁 tests/utils/ipc-deps.ts makeIpcDeps 桩工厂必填即类型红（禁改面），可选+handler 响亮守卫（undefined 抛错）+bootstrap 恒装配 |

## 2. 下段执行序（闲时段第八段）

> **暂停注记（2026-09-03 用户暂停）**：P7E-05 建单预备已完成、实现未启动——
> 票面 scripts/audits/p7e-05-brief.md（五层规约完整：008 迁移 SQL/搭车
> saveProgress 单通道 Design/态空间 R1~R10/复合 flusher/测试矩阵/变异 M1~M4）
> +registry P7E-05 open 行已随本提交入库；实现者派发即被暂停，**零代码残留**
> （已核实）；受锁三件（migrate.ts/schemas.ts/models/paper.ts）预解锁已随
> 暂停收回（locks 259 只读恢复+manifest 一致）。恢复动作=unlock 三件→按票面
> 派发实现者（票面即完整任务书）。

1. **P7-E 余序续**：阅读时长统计（reader.service 生命周期层+**新迁移加列**——
   001 已冻结须新迁移文件；涉 DB 面=票面 DB 断言先读 DDL 教训 v29 §3）>
   标签多选过滤（TagFilter.tsx:6）> 智能排序（library.service.ts:20）。
   工单化纪律照旧（出处+态空间表先行）。
2. **IpcDeps.clipboard 还原项**（INV-56 已登记）：下次合法触碰
   tests/utils/ipc-deps.ts 的场次补 clipboard 必填+makeIpcDeps 桩工厂同步
   （受锁 [locked-change]）。
3. **seedPaperRow 换绑窗硬杀防护**（v32 §2 立项候选，未动）：进程启动 ABI
   不符自动还原哨兵或 spec 侧 finally 兜底加固。
4. 在场场裁决队列照旧（B5/B6/P7-D 全项/F-G1/token 插队权）。
5. 环境备忘照 v32 各条。

## 3. 本段方法论资产

- **受锁件预解锁的派发令核实纪律**：主控宣称「已预解锁」与实况（locks 在
  锁态）不符——实现者 chmod 处置+诚实申报兜住。判据：派发令写「已解锁」
  前必须亲验只读位已摘（ls -l 或试写）；否则改写为「按授权面 chmod 该 N 件」
  的准确表述。锁态漂移由收口 reapply 统一收账（check-locks 现红=预期中间态，
  勿慌）。
- **拆件保真判据=受锁测试零改通过**：hook 抽取类重构的验收锚不是新测试绿，
  而是**既有受锁测试不改一字仍全绿**（组件面断言不变）——门一据此对 diff
  逐分支推演核实。比「行为等价」的主观判断强一档。
- **可选注入的守卫完备形态**（受锁桩工厂禁改下的类型约束弱化处置）：
  可选属性+消费点首行 undefined 响亮抛错（配置错误不静默）+装配面恒装配+
  还原项登记（下次合法触碰受锁面时补必填）——三件套缺一即降级为静默风险。
- **死导出即时删**：z.infer 类型导出零消费即删（死代码红线无豁免）——
  「契约类型推导链可能隐式消费」不成立（api-surface 消费 schema 值非类型）。

## 4. 成本账本（模型×供应商×套餐）

```
主控 GLM5.3×bigmodel-coding-plan：P7E-04 票面/派发/裁决/收口+交接书全程
实现者子代理（GLM5.3 统一档——环境无 model 参数欠账披露）：两轮 8.25M tok/
  96 工具/25min（6.39M/84/21min+1.86M/12/3min）
门一 Kimi K3×外链派发器：初审 in=19656/out=6904/183s+R1 复核 in=12562/
  out=2307/80s（全程无 504）
门二 deepseek×外链：in=19781/out=27219/269s（64k 档直起——零截断）
主控亲验：新测试定向×2+verify 全链+locks 三连+全量 e2e 37/37
```

## 5. 环境事实滚动

- verify 基线滚动：**142 文件 1231 用例/locks 259/e2e 37 用例**。
- 新增：派发令预解锁宣称核实纪律（§3）；clipboard 可选注入还原项
  （INV-56）；chmod 受锁件处置形态（授权面内最小动作）。
- 沿用 v32 各条（deepseek 64k 档直起/Kimi 504 重试优先换源/冷启动方差
  120s 预算/setViewportSize 禁用等）。
