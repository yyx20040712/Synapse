# P7E-02 实现者报告——拖拽导入（preload webUtils 桥）

状态：**DONE**（全量自检绿；超票面自裁申报 4 项见下，均非阻塞）

技能清点（开工）：test-driven-development 用（红→绿→变异红证全走）；
verification-before-completion 用（全量命令真退出码）；其余不用（纯实现票，
票面已供全部形态先例）。配置：实现者=GLM5.3（主控派发档，显式申报）。

## 改动文件清单

| 文件 | 改动 |
|---|---|
| `src/preload/drag-import.ts` | 新建——planDroppedImports 纯函数（''滤/.pdf 大小写滤/数量门 100）+MAX_DROP_FILES |
| `src/shared/ipc/schemas.ts` | +importPathsReqSchema（paths min(1).max(100) strict，schema 层第二道门） |
| `src/shared/ipc/api-surface.ts` | import_ 域 +fromPaths 通道；+PRELOAD_HIDDEN_METHODS（const 单源）；PreloadApi 经 HiddenOf/VisibleMethodKeys Exclude 消费（隐藏面从类型暴露面排除）；+PreloadDrag 类型 |
| `src/preload/index.ts` | buildApi 跳过隐藏面；+buildDrag（webUtils 解析→planDroppedImports→none/too-many 零 invoke 中文拒 / ok→invoke('import/from-paths',{paths})）；expose apiDrag |
| `src/main/ipc/import_.ts` | +fromPaths 一行委托 importFiles(req.paths)；:18 v2 预留注记兑现修订 |
| `src/renderer/features/library/ImportDropZone.tsx` | drop 接线（busyRef 短路 D5→apiDrag.importDropped）；runImport 泛化为 ImportCall（壳行为零变）；DROP_HINT→「松开以导入 PDF 文件」；+IMPORT_BUSY_HINT「导入进行中，请稍候」；:7/:37-38/架构层注记修订 |
| `src/renderer/env.d.ts` | +apiDrag: PreloadDrag 全局声明 |
| `tests/contracts/preload-surface.test.ts` | 受锁改向：三键断言；暴露面=减集断言；转发用例隐藏面跳过；+apiDrag 形状用例（事件桥两用例零触碰） |
| `tests/unit/preload/drag-import.test.ts` | 新建——planDroppedImports 7 用例+apiDrag 三分支 3 用例（electron mock 复用契约测试形态+webUtils 桩） |
| `tests/unit/ipc/import-paths.test.ts` | 新建——fromPaths 委托 2 用例（逐参/异常上抛） |
| `tests/unit/renderer/import-drag-ui.test.tsx` | 新建——D2/D3/D5/D6 四用例（jsdom window.apiDrag 桩+原生 drop 派发） |
| `tests/e2e/import-drag.spec.ts` | 新建——D2 装配级（真实 Electron preload+合成 File 解析 ''→toast 真实文本）+按钮回归 |

文案逐字对照票面：「仅支持拖入 PDF 文件」「一次最多拖入 100 个文件」
「导入进行中，请稍候」「松开以导入 PDF 文件」——全部原样落码。

## 先红证据（scripts/audits/p7e-02-red/）

- drag-import.test.ts.raw.txt——模块缺失解析失败（no tests；语法修正后以移走
  drag-import.ts 重采，保证红语义=实现缺失）
- import-paths.test.ts.raw.txt——2 failed（fromPaths 不存在）
- import-drag-ui.test.tsx.raw.txt——4 failed（旧文案行为/零调用）
- preload-surface.test.ts.raw.txt——4 failed | 2 passed（事件桥两用例绿）
- import-drag.spec.ts.raw.txt——旧 build 跑：toast 文本缺失超时红

## 绿证据（scripts/audits/p7e-02-green/）+用例数实测

- drag-import.test.ts：10 passed；import-paths.test.ts：2 passed；
  import-drag-ui.test.tsx：4 passed；preload-surface.test.ts：6 passed
  （合计 22，vitest 实测输出在档）
- import-drag.spec.ts.raw.txt——1 passed（483ms，真实 Electron）

## 变异红证（scripts/audits/p7e-02-mut-m{1..4}.raw.txt，cp 备份法+diff 还原空）

- M1 删 .pdf 过滤：REMOVED_LINES=1/grep 1→0；drag-import.test.ts 4 failed
  （none 滤除/大小写/混合/ok 载荷混入非 pdf——票面预期「非 pdf 混入→ok 载荷红」）
- M2 删 none 分支：grep 1→0；「none 分支零通道 invoke」用例红
- M3 busy 短路失效（if (busyRef.current)→if (false)，行 146）：D5 用例红
  （「导入进行中，请稍候」未 toast）
- M4 删 PRELOAD_HIDDEN 跳过：grep 1→0；减集断言红
  （['fromDialog','fromFolder',…(1)] ≠ ['fromDialog','fromFolder']——fromPaths 泄漏被拦）
- 四组还原 diff 全空（各自 raw 尾部「diff 空=还原成功」）

## 超票面自裁申报

1. **preload-surface.test.ts 改动=4 处而非字面 3 处**：既有「全量对账转发」
   用例必须同步跳过隐藏面（遍历全表会调 undefined 的 api.import_.fromPaths），
   属「api 暴露面=接线表」减集改向的必要连带，非扩面；事件桥两用例零触碰。
2. **api-surface.ts 加 HiddenOf/VisibleMethodKeys/MethodBridge 三内部别名**：
   mapped key 泛型别名调用+值位 Ep<D,M>['Req'] 索引访问的组合踩 esbuild 解析
   缺陷（最小复现在档：t1~t5 二分，t2 FAIL/t4 OK 定位组合触发），别名层规避、
   语义零变（仍是 PRELOAD_HIDDEN_METHODS 单源 Exclude 消费）。
3. **drag-import.test.ts 测试名裸 '' 引号语法修正**（esbuild 语法红≠断言红，
   TDD 纪律要求修到正确失败）；红证据以移走实现重采。
4. **契约测试 electron mock 未补 webUtils 键**：实测 vitest 对 mock 缺失 named
   export 宽容（undefined，不调用不炸），契约测试零补丁通过；若门审认为需补，
   是一行增量（未擅自加）。

另注（非超票面）：runImport 由 mode 参数泛化为 ImportCall 函数参数——票面
「runImport 壳全复用」的字面实现路径（busy 门/sessionRef/busyRef/
try-catch-finally 全保留原行为）。

## 全量数字（实测，非凭印象）

- npm test：**135 文件 / 1159 用例全绿**（基线 132/1142；新增 3 文件 +17 用例
  =10+2+4+1，与逐文件绿证据吻合）
- npm run typecheck：exit 0；npm run lint：exit 0；npm run build：exit 0
- npm run quality:check：exit 0（无占位标记/无乱码/无跨域引用）
- npm run tickets:check：exit 0
- e2e 新 spec 单跑：1 passed（npm run build 后 playwright，证据在档）
- 改动面 git status：7 M + 5 新文件（tests/unit/preload/ 新目录整体 untracked）；
  tickets/registry.ts 的 M 系主控预置状态（非本单改动，未触碰）
- 乱码面：quality:check 中文关卡通过；本报告与全部落盘 UTF-8

docs/invariants.md 未动（INV-07 修订+INV-54 登记归主控收口）；locks 未动
（新文件入锁归主控收口：预期 246→250）。

## §9 门一回炉（W2/N1/N2 + 变异 M5）——已完成

处置单：门一 Kimi PASS_WITH_WARNINGS（0B/2W/2N），W1 归主控门二补包不动本单。

- **W2 目录命名 *.pdf 击穿后缀滤（修）**：planDroppedImports 过滤序最前增
  类型门 `if (f.type === '') continue`（目录项 type 恒 ''——xxx.pdf 目录名不再
  进路径堆；.pdf 注册类型 type='application/pdf' 非空不受影响）。已知残余按
  口径写进模块头注生命周期层：无注册类型的真实 PDF 被保守拒（引导按钮导入，
  对话框路径无此限）。
- **N1 schemas.ts 节头（修）**：import_ 域节头改为「对话框/拖拽桥分别在
  main/preload 侧产生路径，renderer 代码不传路径」（INV-07 修订口径对齐）。
- **N2 头注计数（修）**：drag-import.ts 文化层与测试头注「六分支」→
  「八分支」（W2 修后实测 8 用例：ok/ok 边界/none/too-many/''滤/后缀大小写/
  混合/类型门）。
- **M5 变异红证（新增）**：删类型门行——命中证明 grep 1→0；目录击穿用例红
  （{ kind:'ok', …(1) } ≠ { kind:'ok', paths:['E:/论文.pdf'] }——目录项混入
  载荷被拦）；还原 diff 空。落盘 scripts/audits/p7e-02-mut-m5.raw.txt。
- TDD：新用例先红（drag-import.test.w2-red.raw.txt：1 failed | 10 passed）
  →修→绿（drag-import.test.ts.raw.txt 更新：11 passed）。

改动文件：src/preload/drag-import.ts（类型门+头注）、src/shared/ipc/schemas.ts
（节头注释）、tests/unit/preload/drag-import.test.ts（类型门用例+头注八分支）。

全量实测：npm test **135 文件 / 1160 用例全绿**（回炉 +1 用例）；lint exit 0；
typecheck exit 0。
