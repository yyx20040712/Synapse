# P7E-02 工单票面——拖拽导入（preload webUtils 桥，五层规约）

> registry：`P7E-02` / file `src/main/ipc/import_.ts` / area ipc / owner strong / open
> 排程真相源=v29 §2 第 1 项（=v28 §2 第 2 项顺延）。
> 开工记录：本票段技能清点延续本段开场（subagent-driven-development/TDD/
> verification-before-completion 已加载；门审外链 gate-call.py 在位）。

## ⓪ 出处（无出处默认不工单化——四链在档）

1. B1 报告 §3：`ipc/import_.ts:18 + ImportDropZone.tsx:7（拖拽导入，webUtils.getPathForFile 经 preload）`。
2. ROADMAP §P7-E 内序第 2 位：「标签生命周期 > 拖拽导入 > …」。
3. ipc/import_.ts:18 预留注记：「不做：拖拽路径（renderer 的 webUtils.getPathForFile 在 preload 暴露——v2）」。
4. ImportDropZone.tsx:7+37-38：「拖拽：v1 仅高亮提示『请使用按钮』（webUtils.getPathForFile 需 preload 暴露，v2）」。

- **价值**：导入主路径 ergonomics——文献管理日常高频操作，拖拽比对话框少 3 次点击；
  拖拽是文献管理器用户的肌肉记忆交互。
- **依赖**：Electron 42 preload webUtils.getPathForFile（Electron 29+ 在册 API）；INV-52
  import 会话身份两合一（进度事件 sessionId 三滤——F-D4 既有面直接复用）；零新依赖。
- **风险**：①**安全姿态变更面——INV-07 修订**（「文件/目录路径只能出自 main 侧系统
  对话框，renderer 永远不传路径」既有不变量扩列拖拽源，见 ③架构层 Design 裁决）；
  ②preload 暴露面契约测试锁定（window 只暴露 api/apiEvents 两键断言）——受锁改向；
  ③e2e 无法模拟真实 OS 拖拽（合成 File 经 webUtils 解析得 ''=天然拒）——正向链以
  单测+preload 桥测试锚定，真实拖拽留手动验收面申报。
- **验收**：见 ⑥。

## ① 行为层（态空间表先行——store+异步+用户输入）

### 主控 Design 裁决：通道对 renderer 隐藏（否决透明通道案）

- **采**：fromPaths 通道入 API_SURFACE（main 侧 register 全量注册），但 preload
  **不暴露**于 window.api——经 `PRELOAD_HIDDEN_METHODS` 单源（api-surface.ts 内
  const+类型双消费）跳过；另暴露 `window.apiDrag.importDropped(files)`——preload
  内部解析（webUtils.getPathForFile）→过滤→`ipcRenderer.invoke('import/from-paths')`，
  **路径字符串生命周期限 preload 堆内，renderer 永远拿不到路径串**。
- **否决**（透明通道=fromPaths 直接上 window.api+renderer 持路径串回传）：被攻陷
  renderer 可 invoke 任意路径串（renderer→main 文件读取面）；隐藏案下合成 File 解析
  得 ''（Electron 语义）——**即使 renderer 被攻陷也无法注入任意路径，唯一取路径
  途径=真实 OS 拖拽手势**。INV-07 姿态强于透明案。
- **信任模型**：fromPaths 与 fromDialog 同级——main 信任注入边界（dialogs/preload）
  产生的路径，dialog 有 *.pdf 过滤，preload 侧等价过滤（.pdf 后缀）+数量上限。

### 纯函数 planDroppedImports（新文件 src/preload/drag-import.ts，可测性拆分）

```
planDroppedImports(files: File[], pathFor: (f: File) => string):
  | { kind: 'ok'; paths: string[] }        // 1~100 条：解析成功+.pdf（大小写不敏感）滤后
  | { kind: 'none' }                       // 全滤除（非 pdf/合成 File 解析=''）
  | { kind: 'too-many' }                   // 滤后 >100
```

- 过滤序：逐个 pathFor 解析 → '' 剔除（合成/不可解析）→ 后缀 .pdf 剔除 → 计数判定。
- 目录拖入=File 项无 .pdf 后缀→自然剔除（Electron dataTransfer.files 不递归目录——
  已知边界申报：文件夹拖入得提示语，递归导入走「导入文件夹」按钮）。

### preload 桥 apiDrag（src/preload/index.ts 增 buildDrag，锁定面）

```
window.apiDrag.importDropped(files: File[]): Promise<Result<ImportResult>>
  none     → { ok:false, INVALID_REQUEST「仅支持拖入 PDF 文件」 }（零 invoke）
  too-many → { ok:false, INVALID_REQUEST「一次最多拖入 100 个文件」 }（零 invoke）
  ok       → ipcRenderer.invoke('import/from-paths', { paths })
```

### IPC/契约（受锁面）

- schemas.ts：`importPathsReqSchema = { paths: z.array(z.string().min(1)).min(1).max(100) }.strict()`
  （schema 层第二道数量门）。
- api-surface.ts：import_ 域增 `fromPaths: { channel: 'import/from-paths', Req: S.importPathsReqSchema, Res: S.importResultSchema }`
  +`PRELOAD_HIDDEN_METHODS = { import_: ['fromPaths'] } as const`（const+PreloadApi
  类型 Exclude 双消费单源）+`PreloadDrag` 类型（File 类型可用——两 tsconfig 均 DOM lib）。
- ipc/import_.ts：`fromPaths: (req) => deps.services.import_.importFiles(req.paths)`
  （一行委托；importFiles 既有逐文件 failed[] 尽力而为语义+F-D4 gate+进度事件不变）。
- renderer env.d.ts：`apiDrag: PreloadDrag` 全局声明。

### 态空间跨格序列表（D1~D8——验收=逐格测试锚）

| # | 序列 | 期望 |
|---|---|---|
| D1 | idle→dragOver→dragLeave | 高亮亮/灭（既有样式类） |
| D2 | drop 空手/全滤除（合成 File/非 pdf/目录） | toast「仅支持拖入 PDF 文件」回 idle，**零通道 invoke** |
| D3 | drop 有效 1~100 | apiDrag.importDropped→busy（按钮禁用+进度行）→进度事件（F-D4 sessionId 三滤既有链）→reportImportResult→idle |
| D4 | drop 混合（pdf+非 pdf） | 仅 pdf 导入（planDroppedImports 滤除面），结果计数只含 pdf |
| D5 | busy 期 drop | info toast「导入进行中，请稍候」零 invoke |
| D6 | drop 滤后 >100 | preload 拒 INVALID_REQUEST（零通道 invoke），busy 立即复位 |
| D7 | importDropped IPC 失败 | error toast 回 idle（finally busy 复位——runImport 既有壳复用） |
| D8 | 终局后迟到进度事件 | busyRef 门既有（F-D4）挡，不改在途相 |

### ImportDropZone 接线（renderer）

- onDrop：busy→D5 短路；否则 files=[...e.dataTransfer.files]→await
  window.apiDrag.importDropped(files)→Result 三分支（失败 toast/成功
  reportImportResult 既有函数复用）——**路径串零接触 renderer**。
- 拖拽态文案：「松开以导入 PDF 文件」（替换 DROP_HINT 提示位——同布局纯文案，
  非视觉决策）；:7 与 :37-38 v2 预留注记兑现修订；ipc/import_.ts:18 同步修订。
- busy/sessionRef/busyRef/进度订阅链全复用 F-D4 既有（apiDrag 走同一
  import/from-paths→importFiles→importProgress 事件流，sessionId 链天然一致）。

## ② 接口层

见上（一 schema+一通道+PRELOAD_HIDDEN_METHODS+PreloadDrag+apiDrag 桥；register/
services 零改——importFiles 既有签名直用）。

## ③ 架构层

- **INV-07 修订登记**（docs/invariants.md，本票收口时主控统一改）：路径合法来源
  扩列为 ①main 侧系统对话框（dialogs.ts）②拖拽 File 经 preload webUtils 解析
  （apiDrag 单口，路径串不出 preload，fromPaths 通道 renderer 不可达）——
  renderer 代码仍禁构造/硬编码路径字面量（INV-09 ESLint 面零变）。
- **INV-54 新登记**：拖拽路径单源不变量——File→path 解析唯一口=webUtils 经
  apiDrag.importDropped；fromPaths 通道隐藏单源=PRELOAD_HIDDEN_METHODS（const+
  类型双消费）；数量上限 100 双层（preload planDroppedImports+schema max）；
  合成 File 解析=''天然拒（被攻陷 renderer 无法注入任意路径）。
- 分层不变：renderer→window.apiDrag→preload→ipc→services（preload 属桥层，
  apiDrag 与 api 同级暴露——非 renderer 直连 ipc）。
- contract 测试改向（受锁 [locked-change]）：window 三键（api/apiDrag/apiEvents）；
  api 暴露面=API_SURFACE 减 PRELOAD_HIDDEN_METHODS；apiDrag 形状断言。

## ④ 生命周期层

- ImportDropZone.tsx:7+37-38 / ipc/import_.ts:18 两处 v2 预留注记兑现修订。
- 已知边界（票面外不修只记）：文件夹拖入不递归（提示语引导走按钮）；真实 OS
  拖拽正向链留**手动验收面**（e2e 不可模拟 OS 手势——合成 File 被 ''滤除是设计
  行为本身，e2e 锚定的恰是 D2 负向链）。

## ⑤ 文化层（测试规约——TDD 红→绿→变异红证）

新测试全 always-active：

| 文件 | 覆盖 |
|---|---|
| tests/unit/preload/drag-import.test.ts | planDroppedImports 六分支（ok/none/too-many/''滤/后缀大小写/混合）+apiDrag.importDropped 三分支（none/too-many 零 invoke+错误形状；ok→invoke 载荷）——electron mock 复用契约测试既有形态 |
| tests/unit/ipc/import-paths.test.ts | fromPaths 委托 importFiles（services 桩逐参）——既有 import_.test.ts 受锁不动，新文件承载 |
| tests/unit/renderer/import-drag-ui.test.tsx | D2/D3/D5/D6（drop 事件 dispatch+apiDrag 桩：零调用分支/toast 文案/busy 短路/结果汇报 onImported）——jsdom window.apiDrag 桩 |
| tests/contracts/preload-surface.test.ts（受锁改向） | 三键断言+减集断言+apiDrag 形状（**最小增量改写**：既有用例改期望集，新增 apiDrag 用例——不动既有事件桥两用例） |
| tests/e2e/import-drag.spec.ts（新 spec） | 合成 File drop→toast「仅支持拖入 PDF 文件」真实文本（D2 装配级：真实 Electron preload apiDrag 在场+合成解析=''滤除+零崩溃）；按钮回归（在库页可见） |

- **变异红证 ≥4 组**（先证命中再断红，cp 备份法还原）：
  M1=planDroppedImports 删 ''.pdf'' 过滤（非 pdf 混入→ok 载荷红）；
  M2=apiDrag 删 none 分支直接 invoke（D2 零 invoke 断言红）；
  M3=ImportDropZone drop 处理删 busy 短路（D5 红零 invoke 断言）；
  M4=preload buildApi 删 PRELOAD_HIDDEN 跳过（契约测试减集断言红——fromPaths
  泄漏上 window.api）。
- 先红纪律：每测试文件先红（缺失模块/桥天然红）落盘 scripts/audits/p7e-02-red/。
- 受锁面（主控预解锁）：schemas.ts/api-surface.ts/preload/index.ts/
  preload-surface.test.ts 四件最小增量；新测试+新源文件收口 locks:generate+apply
  （246→预期 250：drag-import.ts+3 unit+1 e2e spec；ipc/import_.ts 与
  ImportDropZone.tsx 非锁面）。

## ⑥ 验收

- `npm run verify` 全绿（基线 132 文件 1142 用例滚动，新增数实测申报）。
- e2e 全量（34+1 新 spec）全绿；真实 OS 拖拽手动验收面在交接书申报（用户在场时
  一次拖入即可闭环）。
- 门一 Kimi 外链+门二 deepseek 异构终审（材料含新文件全文——v28 §3 纪律）。
- grep 无 TODO/FIXME/placeholder；中文 UTF-8 验证。
- INV-07 修订+INV-54 登记+两处预留注记修订+registry P7E-02 翻 done。
- 提交 [locked-change] 尾注（四受锁件+新文件入锁）。

## ⑦ 派发与成本申报

- 三屋：实现者=子代理（继承主控档 GLM5.3 显式申报）；门一=Kimi K3（gate-call.py）；
  门二=deepseek（同链，材料瘦身+32k 档纪律——v29 §3 教训）。
- 实现者禁 git/registry/locks；禁新增依赖；超票面决定停下申报。
- 主控亲验 verify 真退出码+变异红证抽查+diff 范围核对。
