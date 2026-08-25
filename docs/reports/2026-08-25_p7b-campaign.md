# P7-B 收官战役报告（2026-08-25 晚场）

> 范围：TABS-04 退出拦截（6258e00）→ UNDO-01 撤销栈（3b94009）→ e2e 三序列
> 收官（本提交）。前役（TABS-01/02/03 工单化与实现）见 2026-08-24~25 交接书。
> 终态基线：**verify exit 0（60 文件 337 用例）+ e2e 11/11 + locks 95 + 工单 83
>（open 0）**；INV-15/22 装配级收口升已锚定，INV-23 新登记。

## 1. 交付清单

| 单元 | 提交 | 要点 |
| --- | --- | --- |
| SR2-TABS-04 退出拦截 | 6258e00 | system/set-quit-dirty 通道（受锁）+ main 缓存/判定/守卫流（对话框异常按取消防死锁、默认焦点=取消防误触回车）+ bootstrap 接线 + App 层聚合上报；deepseek 两轮 6→3 findings 全处置；INV-22 登记 |
| SR2-UNDO-01 撤销栈 | 3b94009 | 三逆操作（repo 不收显式 id 实证——re-create 新 id）+ per-tab 栈 + id remap + Set 互斥 + 身份移除；Toast 拆 toast-store（typecheck 强制）；INV-23 登记；审计链见 §3 披露 |
| P7-B 收官 e2e | 本提交 | 三序列 spec（换 tab 状态保持/关 tab 含 error 场景+收缩序/退出拦截 cancel+confirm）+ **markTabError 失败类补全**（发现与修复见 §2）+ seed-paper.mjs SEED_ID 参数化（受锁向后兼容） |

## 2. 收官站发现与处置

- **INV-15 失败类缺口（e2e 实证）**：error tab 语义原只覆盖 open IPC 失败类——
  **pdf 加载失败**（缺失文件：IPC 成功、app-file 协议层才炸）仅弹 toast，tab 永驻
  ready。补全：reader.store.markTabError + ReaderPage onError 接线（红证=e2e
  「打开失败」断言失败实录→修复→绿）。INV-15 声明随更（两类失败均 tab 级可见）。
- **退出拦截装配链的 e2e 驱动法**：原生模态框不能被 playwright 直接驱——
  `app.evaluate((electron) => electron.dialog.showMessageBox = mock)`（注入式，
  main 为 ESM 无 require）；关闭触发必须走 **main 侧 close()**——渲染侧
  window.close() 实测绕过 close 事件守卫（语义差异，本役实锤）。
- **e2e 四坑实录**（后续写 spec 直接复用）：①种子脚本 id 硬编码（单篇假设）
  →SEED_ID 参数化；②CJK 被 pdfjs 文本层逐字分项——正文断言用 ASCII 单 run
  标记词；③role=tab 域污染（目录/缩略图切换器同 role）——查询限定 tablist
  容器；④dirty 上报 IPC 必须 await 落地后再触发 close（竞态假阴）。

## 3. UNDO-01 审计链披露（升级用户复审项）

deepseek 实质七轮：r2 FAIL（2 BLOCKING：id remap 缺失+无互斥）→ r3 PW →
r4/r5b/r6 各 1 BLOCKING（**均为前轮修复自引入、逐轮收窄**：单槽互斥被并发篇
覆盖→下标移除被 FIFO 截断漂移→skipIdx 求值时点）→ 终修复=Set per-paper 互斥+
indexOf 身份移除+remap 身份跳过，**每个 BLOCKING 配新增回归用例**（终 15 用例）；
r6 闭合以变异红证证明（回退一字→恰该用例红→还原 diff 空）；r7×3 因 diff 累积
超大致 900s reasoning 截止（已知故障另一态，raw 归档 Temp）。**回炉 4 次超契约
上限（≤2）**——每轮均有机器证据、缺陷链根因是「修复引入新修复面」的收敛振荡，
但按终止条件精神如实升级：建议用户复审 undo01 审计存档（%TEMP%\synapse_workflow\
audits\）与 annotation-undo.ts 实现。

## 4. 防线战绩

- INV-15/22 升已锚定（装配级）；INV-23 新登记（撤销栈语义，15 用例单测级已锚）。
- 新增 e2e 1（11/11）、单测 16（321→337）；受锁面：api-surface/schemas/ipc-deps/
  两新测试文件/reader-shortcuts.test 契约演进/seed-paper/reader-text.spec/manifest
  （93→95）——全部 [locked-change] 即时 apply。
- 组件行数守恒三役：AnnotationLayer 250/ReaderPage 250/SelectionLayer 244。

## 5. 随手验清单（用户）

多开两篇切/关 tab（灰点：断网保存标注看 ●）→ ctrl+z 三类撤销（划选高亮后撤/
菜单删除后撤回/批注改错后撤回旧值；textarea 内 ctrl+z 是原生文本撤销）→
有未保存修改时点窗口 ✕（确认框默认焦点在「取消」）。

## 6. 下一步

P7-C 工单化（含 N1 双向定位增补——2026-08-25 蓝图 §4.3 裁决）→ SR2-AI-01~05 →
AI-06~10 → LG-01~05（ROADMAP P7-G 增容节/P7-H 新节已就绪）。push 决策留用户
（本地领先 origin 约 30 提交）。
