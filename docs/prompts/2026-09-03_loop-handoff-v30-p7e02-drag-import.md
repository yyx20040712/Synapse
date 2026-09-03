# 2026-09-03 LOOP 交接 v30——闲时段第二段续:P7-E 二票拖拽导入三屋全闭环,安全姿态变更面落地

> 上段=v29（P7-E 首票标签生命周期）。本段=v29 §2 第 1 项 **P7E-02 拖拽导入
> 三屋全链落地**——含**安全姿态变更面**：INV-07 修订（路径合法来源扩列）+
> INV-54 登记（拖拽路径单源）+security.md §3 同步修订。门一 Kimi
> PASS_WITH_WARNINGS（0B/2W/2N：W2 目录命名 *.pdf 击穿后缀滤→File.type 类型门
> 回炉+M5 变异；W1=门一包漏 tests/ diff 主控组装失误→门二补包核实为纯减集改向）
> +门二 deepseek PASS 零发现零回炉；单测 135 文件 1160 用例（基线 132/1142，
> +3 文件+18 用例）+locks **250**（246+4 新测试件）全绿。

## 1. 本段终态

| 项 | 数值 |
| --- | --- |
| verify | exit=0 亲验（135 文件 1160；**三跑**：首跑红=回炉注释 xxx.pdf 触发 quality 占位扫描+次跑红=registry 摘要裸单引号——两处主控压缩票直修；raw=p7e-02-verify-final3.raw.txt） |
| e2e | 35 用例 34 过+1 失败（唯一失败=z-r2e 探针环境 flake **单现**，复跑绿在档 p7e-02-r2e-rerun.raw.txt——未达 2 次立案线，读者域零交集本票，指纹：几何指纹矩阵首次 resolve 即红不重试族） |
| locks | **250**（246+4 新测试件；drag-import.ts src/preload 非锁面不入册） |
| P7E-02 | Design=**fromPaths 通道对 renderer 隐藏**（PRELOAD_HIDDEN_METHODS const+类型双消费单源；esbuild 解析缺陷经三内部别名规避——实现者自裁申报）+apiDrag.importDropped 单口（webUtils 解析+planDroppedImports 三滤：合成 File ''/类型门 type 空/后缀 .pdf+数量门 100 双层）——**路径串生命周期限 preload 堆内**；ImportDropZone drop 接线（busy 短路/runImport 泛化壳零变/F-D4 sessionId 链复用） |
| INV-07 | 修订（路径合法来源=①对话框 ②拖拽 File 经 preload 解析；INV-09 零变）——状态升部分锚定 |
| INV-54 | 登记（拖拽路径单源四条款：解析唯一口/通道隐藏/数量双层/类型门+保守拒残余申报） |
| 门一 | Kimi K3 in=25887/out=8627/166s：2W=契约测试 diff 缺席（主控包组装漏 tests/——门二补包处置）/目录命名 *.pdf 击穿（W2 回炉）；2N=节头过时+计数口径（回炉） |
| 门二 | deepseek in=7626/out=30253/223s：**PASS 零发现**（契约测试纯减集+跳过同源消费非硬编码+事件桥零触碰+M5 真锚） |
| 变异 | M1~M5 全命中红证（M5=W2 伴随：删类型门→目录击穿用例红）；还原 diff 全空 |
| 手动验收面 | 真实 OS 拖拽正向链（e2e 不可模拟 OS 手势——合成 File 被 ''滤除是设计行为本身，e2e 锚定 D2 负向链）——**用户在场时拖一个 PDF 即闭环** |

## 2. 下段执行序（闲时段第四段——v29 §2 顺延）

1. **AUDIT-B 开审**（蓝本=AUDIT-A/C 场形态：审计简报→只读子代理全枚举扫描→
   对抗审核→W 级修票三屋闭环）。并入项：功能对偶矩阵未验 6 对（zoom×F-06 其余
   定位细节/双击最大化×滚动记账/drag 区×键位滚动/UI1 流光×性能/切换器面板×zoom
   大档/关闭拦截×最小化）+**tags upsert 纯空格名 trim 后空串可入库**（P7E-01
   勘察已知边界+门一未及面）。
2. P7-E 其余预留点按价值穿插（页内高亮搜索>导出剪贴板>阅读时长统计>标签多选
   过滤>智能排序——出处锚 ROADMAP §P7-E/B1 §3）。
3. 不入闲时批照旧：P7-D 全项挂起（在场场次）/技术升级冻结/P8 池不动；F-G1
   叠色维持跳过；F-G11 观察线（触 2 立案——z-r2e 探针 flake 本段 1 现已记指纹，
   再现即立案）。
4. 连续开发制照 AGENTS 条目（停止条件仅三种；票收口后立即取次项）。

## 3. 本段方法论资产

- **门审材料包的 diff 范围必须覆盖受锁测试面**：P7E-02 门一包用
  `git diff -- src tickets` 漏了 tests/——受锁契约测试（本票安全面的核心锁定锚）
  缺席材料=门审只能信实现者自报（W1 回炉一轮的代价）。教训：受锁面在哪，
  diff 范围就列到哪；或一律 `git diff` 全量+新文件全文。
- **回炉指令的自检面必须与首单同级**：回炉轮只要求 test+lint+typecheck 漏了
  quality:check——回炉注释里的「xxx.pdf」触发占位标记扫描，verify 首跑红。
  教训：任何轮次改动后的自检=收口同口径全量（quality 在 test 之前就该跑）。
- **registry 摘要禁裸单引号**：TS 单引号字符串里写 `type===''`/`File ''` 直炸
  解析（lint Parsing error——verify 次跑红）。教训：registry 摘要为纯中文叙述，
  代码形态值转述禁字面引号。
- **中文字节的命令行截断陷阱**：`cut -c1-200` 按字节截断砍进 UTF-8 字符中间
  →门审包 UnicodeDecodeError。教训：中文行截断一律 python 字符级
  （`line[:300]`）。
- **安全姿态变更的实现面**：通道隐藏（const+类型双消费单源）+桥单口（路径串
  不出 preload 堆）+防御纵深（合成 File 天然拒+类型门+数量双层）的组合拳在
  Electron 架构可复用——比「renderer 可 invoke 任意串」的透明通道强一级，
  契约测试以减集断言锁定。

## 4. 成本账本（模型×供应商×套餐）

```
主控 GLM5.3×bigmodel-coding-plan：勘察/票面/Design 裁决/派发/亲验/收口/交接书全程
实现者子代理（继承主控档，§⑦ 显式申报）：初轮 6.56M tok/103 工具/23min
  +回炉轮 0.97M tok/9 工具/3.2min（W2 类型门+M5+N1N2）
门一 kimi-main（gate-call.py 链）：in=25887/out=8627/166s（首派 UnicodeDecodeError
  =cut 字节截断——修复重组后成功）
门二 deepseek（同链）：in=7626/out=30253/223s（瘦身包+32k 档纪律一次过）
e2e 全量 1.7m×1+探针复跑 1；verify 全量×3（两红一绿——两主控压缩票在档）
```

## 5. 环境事实滚动

- 沿用 v29 各条（volta 绝对路径/推理模型 token 预算/gate-call.py 外链三源）。
- 新增：z-r2e 探针 flake 指纹（几何指纹矩阵首次 resolve 即红族——本段 1 现，
  复跑绿，再现即立案）；Windows 锁面回环（locks:apply 后改受锁测试须再 unlock）。
- verify 基线滚动：**135 文件 1160 用例/locks 250/e2e 35 用例**。
