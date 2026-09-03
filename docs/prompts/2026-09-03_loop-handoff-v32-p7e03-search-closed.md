# 2026-09-03 LOOP 交接 v32——闲时段第六段:P7E-03 页内高亮搜索三屋全闭环+z-r2e 探针两现立案修票,双提交

> 上段=v31（AUDIT-B 收段任务池清空合法收段）。本段=v31 §2 任务池重蓄后
> 首两单元：①**P7E-03 页内高亮搜索**（P7-E 余序首项）三屋全闭环——
> 门一 FAIL→回炉×2→PASS 零发现+门二 PASS 零发现；②**z-r2e 探针 flake 两现
> 同族立案→受锁小票当日修毕**（e2e 基线归零噪音，36/36 全绿实证）。

## 1. 本段终态

| 项 | 数值 |
| --- | --- |
| verify | exit=0 亲验（**140 文件 1219 用例**；z-r2e 修票后再跑全链 exit=0 同口径；raw=p7e-03-verify-final/z-r2e-fix-verify） |
| locks | **256**（251+5 测试件：3 unit+wiring+e2e spec） |
| e2e | **36/36 全绿**（35+1 新 reader-search.spec；P7E-03 收口跑=35 过+z-r2e 1 红→立案→修票后全量 36/36 exit=0 两轮实证） |
| P7E-03 | 三屋全链：简报（B1 §3+ROADMAP+两处预留注记四链出处）→实现者三轮（初实现 18.15M+R1 11.0M+R2 2.77M tok）→门一 Kimi FAIL(1B/3W/5N)→R1 七修→PWW(0B/2W/3N)→R2 三改（IME 守卫/trim 比较/注释诚实化）→**PASS 零发现**→门二 deepseek **PASS 零发现**（首调 32k 截断 PARSE_ERROR→64k 重试通过） |
| Design 定案 | 索引全文档（逐页 getTextContent 文本域）+高亮仅渲染窗口（TextLayer DOM span 建 Range 取 clientRects——pdfjs 4.10 每文本项恰一 span 实证）+代际守卫+ReaderToolbar searchBox slot 兑现占位+ctrl+f 独立 keymap id reader-search（受锁 ReaderShortcuts 面零改）；态空间 S1~S12 逐格锚+**INV-55 登记**（bindDoc 会话身份/代际守卫/lastCentered 居中记账单源） |
| z-r2e 立案修票 | 两现同族（v30+P7E-03 收口；dy=4.4375=INV-51 在档双态 4.44px 同值级）触发立案线→立案档（根因=探针两程裸 boundingBox 竞速 resolve；**修法勘误在档**：初拟 stableGate 加 pass1 修不到点——该门是滚动门非几何门）→rectStableGate v2（同帧原子相对几何 rect−canvas 单 evaluate+400ms 前置窗+3 点收敛+fail loudly 带样本+无条件门论证）→双门 PASS；主控压缩票形态（B7 先例） |
| 环境事件 | ①e2e 超时硬杀砸中 seedPaperRow 双 ABI 换绑窗→绑定残留→已恢复（md5 亲验 electron-v146）——**隐患记档**：换绑窗无硬杀防护，受锁 spec 共享面，修复需 [locked-change] 另立票；②Kimi 双源 504（网关超时，疑服务端负载）→重试主源通过（换源事件流水在 gate 回执）；③deepseek 32k 输出上限截断=v29 教训复现，64k 档解 |

## 2. 下段执行序（闲时段第七段）

1. **P7-E 余序续**（ROADMAP §P7-E 建议内序）：导出剪贴板（B1 §3 预留
   export.service.ts:27+ipc 加通道）> 阅读时长统计（reader.service 生命周期层+
   新迁移加列）> 标签多选过滤（TagFilter.tsx:6）> 智能排序
   （library.service.ts:20）。工单化纪律照旧（出处+态空间表先行）。
2. **seedPaperRow 换绑窗硬杀防护**（本段环境事件隐患）：Playwright 超时硬杀
   worker 若落在 copyFile→spawn→finally 还原窗内则绑定残留毒化一切后续
   electron.launch——候选修法=还原幂等哨兵（进程启动时检测 ABI 不符自动还原
   electron 绑定）或 spec 侧 finally 兜底加固；受锁面（多 spec 共享配方），
   [locked-change] 另立票。
3. **在场场裁决队列**照旧：B5 切换器面板×zoom 大档观感反差（×1.248 在档）；
   B6 模态期最小化语义（Win32 owned-modal 推演待文档对证）；P7-D 全项/F-G1/
   token 插队权照 v28 §2 模式注记。
4. 环境备忘：e2e 测 resize 面勿用 setViewportSize（B2 取证副产物在档）；
   P7E-03 实现报告 §8.2 冷启动方差（build 后 e2e 首跑 51.9s～>120s 疑 Defender
   扫新产物——新 spec 预算 120s 先例）；连续开发制照 AGENTS 条目。

## 3. 本段方法论资产

- **修案先读实现再定**（立案档勘误实录）：立案时拟的修法（pass1 加 stableGate）
  在动手前读 stableGate 实现发现是**滚动门**非几何门——修不到点上。判据：
  一切「加个门/加个守卫」类修案，动手前必须读守卫本体实现核对语义；勘误
  本身在档（z-r2e-flake-case.md §三）不抹除——错误修案+勘误过程比干净档更
  有教学价值。
- **同帧原子量测纪律的普适化**：稳定门锚定的量必须=终局断言比较的量
  （z-r2e 门二 W1/N2 连根：门锚 rect 自身几何但断言比 rel1−rel2 相对量→
  参照系位移仍有竞速残口；改门内量测=rect−canvas 单 evaluate 同帧相对几何
  后闭合）。INV-51 的 stableRel「单 evaluate 同帧」纪律从标注链推广到一切
  相对几何断言。
- **推理外呼输出预算双档纪律**：deepseek 门二 out 恰 32767=32k 上限截断
  PARSE_ERROR（v29 教训复现）——门审包>2k 行时直接 64k 档起步；504 网关
  超时（Kimi 双源）属服务端负载瞬态，重试主源优先于换源（本段重试即过，
  未消耗备源额度）。
- **中文主路径的 IME 守卫**（门一 R2 抓获）：一切 renderer 键位处理首行
  `if (e.nativeEvent.isComposing) return`——拼音 Enter 确认候选/Esc 取消
  候选不得进业务语义；jsdom 不透传 isComposing init，测试走 defineProperty
  实例级桩（P7E-03 ui 测试先例）。
- **基线数字勘误纪律再证**：v31 交接书「135 文件」实测 136（先红证据全量
  口径）——交接书滚动时以当段实测为准并显式记勘误行，禁沿用上游数字。

## 4. 成本账本（模型×供应商×套餐）

```
主控 GLM5.3×bigmodel-coding-plan：P7E-03 票面/派发/三轮裁决/收口+z-r2e 立案
  修票（压缩票直做）+交接书全程
实现者子代理（GLM5.3 统一档——Agent 工具面无 model 参数「环境限制统一档」
  欠账披露，§4.5 条款）：三轮 32.0M tok/196 工具/101min
  （18.15M/134/84min+11.00M/50/14min+2.77M/12/3min）
门一 Kimi K3×外链派发器：P7E-03 链三审 in=35484/out=12127/257s+r1 复核
  in≈35k/out=8682/282s（kimi/kimi-backup 各一次 504 后主源重试通过）+r2 定点
  in=11989/out=2263/47s；z-r2e 修票两审 in=3035/out=5001/151s+in=1827/
  out=1900/46s
门二 deepseek×外链：P7E-03 in=44133/out=24363/216s（首调 32k 截断作废
  in=44133/out=32767/291s）；z-r2e 修票 in=3441/out=13755/121s
主控亲验：verify 全链×2+全量 test×2+locks 三连×3+全量 e2e×2
  （36/36 修票后两轮）+定向×4
```

## 5. 环境事实滚动

- verify 基线滚动：**140 文件 1219 用例/locks 256/e2e 36 用例**（v31 基线
  135/1163 的 135 系勘误——实测既有 136；本段 +4 文件 +56 用例）。
- 新增：seedPaperRow 换绑窗硬杀防护缺口（立案候选票）；P7E-03 冷启动方差
  （新 e2e spec 预算 120s 先例）；Kimi 504 瞬态重试优先于换源；deepseek
  门审包>2k 行直接 64k 档。
- 沿用 v31 各条（setViewportSize 假绿陷阱/探针 .js 后缀避锁面——本次未用：
  P7E-03 全走组件测试无探针；ds-call.mjs 原件在库等）。
