# 2026-09-02 LOOP 交接 v25——四波场:AUDIT-C C-3 W 级修票两票全闭环(F-D4+F-SL,门双零 B/一回炉轻量/门二条件 PASS 即销),locks 时序摩擦三现根治

> 上场=v24(三波场 F-R2e)。本场=四波场主项 C-3 W 级 ≤2 两票
> (D4 两合一+SelectionLayer 幽灵标注,交接书 v24 §2.1 推荐组合)全闭环;
> settings.save 第三/W-G1 观察项/F-R2e 遗留缺口未触发开工(如实)。
> 改动面:15 票内文件 +488/-57(F-D4 413/42+F-SL 68/12+共享 invariants/manifest)
> +AGENTS 纪律行+台账四波场段+审计档 31 件。

## 1. 本场终态

| 项 | 数值 |
| --- | --- |
| verify | exit=0 亲验(**127 文件 1103**=基线 126/1093+F-D4 8+F-SL 2) |
| e2e | **32/32** exit=0 亲验(F-SL 改 ReaderPage 接线触渲染链——reader-text 划选保存链必跑) |
| locks | **238**(236+dropzone 组件测试新文件+两个 gen 脚本补登) |
| F-D4 | **全闭环**:gate 互斥(bootstrap 顶层计数器跨层有效+import enter/finally exit+workspace 三入口 CONFLICT 拒时零库副作用)+ImportProgressEvent sessionId(schema min(1) 先例对齐+全程同 id+ImportDropZone 三滤);INV-52;测试 +8;变异 M1/M2 红证 |
| F-SL | **全闭环**:addAnnotation(paperId,a) 照 undo 范式按发起身份寻址(tab 缺席 no-op)+ReaderPage 接线闭包捕获渲染帧 paperId+SelectionLayer props 契约零改;INV-03 扩写「写方向同族」;测试 +2;变异 M1 恰 2 红 |
| 门双 | F-D4 门一 Kimi **B0/W3/N2** 轻量回炉 1(纯报告面)三点全处置;F-SL 门一 Kimi **B0/W2/N3 放行零回炉**(两 W 主控源码销项:帧同步=SelectionLayer:85/:199 普通闭包无 latest-ref;孤儿栈=closeOne:242 clearStack);门二 deepseek 位合并终审**条件 PASS→条件销**(唯一条件=locks 残留,收口 generate+apply 至 238 即销) |
| 摩擦根治 | locks 时序摩擦**三现**(主控自产 gen 脚本两连落后于并行锁操作+门二拦截)→AGENTS「依赖与提交」新增纪律条「自产 scripts/*.mjs 工具件写完即时 locks:generate+apply」 |

## 2. 下场执行序(=五波场)

1. **settings.save 并发互斥**(C-3 第三票,W~N——AUDIT-C §1.1「无 save 间互斥,
   INV-39 全量写互相整体覆盖」;建议=saving 期间拒绝或合并;素材=audit-c-scan
   §1.1 表+§五-4)。
2. **W-G1 维持观察**(计数 1,同 v24 §2.2——smoke+reader-text 连跑形态再现时
   F-R2e 修法覆盖面重评估)。
3. **C-3 N 级知晓项**(低优先,门一登记在案):并发双 import 计数中间态(2→1→0)
   无测试锚;时序表第 3 格(exit 后放行)由既有桩用例隐式覆盖。
4. **F-R2e 遗留缺口判别**(条件触发,同 v24 §2.3——e2e 偶发红先跑 z-r2e-probe)。

停点判据沿用:单票回炉 ≤2;整场触 40% 即停(本场两票全链约 35-40%,如实)。

## 3. 本场方法论资产

- **轻量回炉的处置核验并入门二**:纯报告面回炉(代码零改动)不回门一定点复核,
  门二职责①「处置核对(防说了没改)」收——省一次 Kimi 调用;代码面回炉仍走门一
  定点 ADDRESSED/NOT ADDRESSED。
- **主控销项形态**:门一 W 级「存疑不可证伪」项(材料包缺源码)由主控补源码证据
  链销项(帧同步/孤儿栈两例),门二复核证据链——零回炉闭环;销项记录入台账。
- **locks 时序摩擦的根治形态**:受锁集合经 check-locks walk 自动覆盖 scripts 下
  全部 .mjs/.ps1(结构性事实)——摩擦不在 pattern 缺失而在**登记时序**;根治=
  纪律条(即时 generate+apply)+AGENTS 在档,不重构锁系统。
- **双票并行形态**:票面无接缝时,第一票门一(外部链零仓库接触)与第二票实现者
  并行——三屋串行链的总时长压缩点;实现者间禁并行(测试资源竞争+工作区冲突),
  F-SL 实现者工作区划界(F-D4 11 文件禁碰)在派发指令显式声明,实测零越界。

## 4. 成本账本(模型×供应商×套餐)

```
主控 GLM5.3×bigmodel-coding-plan:票面两份+diff 包+抽查+处置/销项+收口亲验
实现者子代理×3(general-purpose 承载,档位要求=GLM5.3flash 实现位,如实申报):
  F-D4 7.29M tok/97 调用/1116s;F-SL 1.96M/46/699s;F-D4 回炉1 1.46M/9/243s
门二子代理(deepseek v4 flash 位承载):1.16M tok/30 调用/471s(亲跑 verify 分段)
外部链 ds-call×2(门一 kimi-main,零 switches):
  F-D4 in=22968/out=8579/257s;F-SL in=12770/out=6352/198s
本场预算 ~35-40%(两票全链:实现×3+门一×2+回炉 1+门二 1)
```

## 5. 环境事实滚动

- **子代理会话 PATH 无 Volta shim**(主控会话同):跑 npm 前必须
  `export PATH="/c/Program Files/Volta:$PATH"`(node -v 验证 24.x)——check-quality
  版本守卫是兜底不是替代;本场 F-D4 实现者发现并在派发指令固化(F-SL 零撞红)。
- 控制台中文乱码(已知事实沿用):判读一律 exit 码+grep -a,内容判读用 Read/node。
- e2e 全量 1.6m/32 用例=正常水位(v24 同);verify 全链约 3-4m。
- 门一 Kimi 两次调用 257s/198s 零换源;brief 体积 80KB/42KB 在消化范围内
  (F-SL brief 含工作区声明+文件清单隔离 diff——双票并存时的门审材料组织形态)。
