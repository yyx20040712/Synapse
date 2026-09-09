# 2026-09-10 LOOP 交接 v57——CSS-03 补审追平+LINT-03 收口（Kimi 分片配方立档）

> 上段=v56（F-CSS-03 收口）。本段=用户双指令：①补上 Kimi 审计（首轮
> 门一同源欠账）②继续开发。产出：Kimi 分片配方立档+补审 B-1 实锤修复
> （COLOR_RE 补 i）+F-LINT-03 立案到收口全链（真异构门链恢复）+AGENTS
> 四坑入册。基线推进：用例/文件数不变（1562/160）/locks 311；registry
> **0 open/165 done**。

## 0. 开场（三态恢复——下批次首读）

- 预期 **A 态**：HEAD=本交接提交+干净树→接 §2 首项。
- B/C 态处置照 AGENTS 既有规约。
- HEAD 链：…3eb778feff（v55）→682c646f1e（F-CSS-03）→5932dad7c4（AGENTS
  四坑）→e99c0de111（LINT-03 立案）→B-1 补丁提交→F-LINT-03 收口提交
  →本交接提交。

## 1. 本段终态（三件）

| 件 | 提交 | 要点 |
| --- | --- | --- |
| Kimi 补审+COLOR_RE 补 i | B-1 补丁提交 | 分片配方（微包探针→U0 四切→输出精简指令，8-19K/片全过窗）；四片 B1/W14/N13；B-1=CSS 函数名大小写不敏感而正则仅小写=绕过洞——双关卡补 i+大写红证两支；3 W 核证排除+1 修（theme.css 注释失真）+5 备案+5 知悉；Kimi 独有发现实证异构复审价值 |
| AGENTS 四坑入册 | 5932dad7c4 | shell 隔层传参四坑（$ 展开/GBK/printf/argv 换行丢弃）定型 |
| F-LINT-03 | 立案 e99c0de111+收口 | 8 组全收敛（跨域三组驻新件 ui-constants.ts+同域五组驻域件 export 单源）；值与文案一字不动+test 1562 零漂移；baseline entries 清空棘轮保留=B-1 终态；门一 Kimi 两轮（首轮 B1=新件 diff 缺席[主控 add -N 失误]→补证轮放行附条件）+门二 deepseek 放行待收口（必核六项全落实） |

## 2. 挂起项与后续票候选

1. **F-LINT-04 候选（关卡扩展战役）**：门审备案四件+本段新增——①B-5
   扩展面（模块级常量对象+SVG presentation attr——F-CSS-03 双源独立
   同报）②C-4 token 值重复定义守卫 ③COLOR_RE 双写机器哨兵（i 标志
   已修但双写一致性仍靠纪律）④消费点语义锚（误引近似 token 三层不红）
   ⑤注释历史色值十进规避规范 ⑥C-4 行级豁免单行多声明绕过（minified
   形态）⑦url(#face) 误报面（双源同报）。
2. **unlock/lock 脚本集合不对称立案候选**（LINT-03 实现者异常项）：
   lock-protected.ps1 收集面含 baseline json 而 unlock 漏——单文件 chmod
   绕行两次实录；修法=两脚本共用单一收集函数。
3. **事件层独立票候选**（F-A10 G2）：文本位下探 DOM 态零信号——
   mousedown 命中层方案。
4. **F-A9 观察项**：紧排边界带扩张+快路径每帧 gBCR 性能锚——真机复现
   再立票。
5. **F-UI-01 升级路径**：用户复测若仍观感偏上=光学中心层新票。
6. **settings.png 非确定面观察**（v56 指纹在案）：再现 2 次立案。
7. **SVG attr var() 引擎线观察**：Chromium≈117+ 才支持 presentation
   attr 内 var()——Electron 42=130+ 现状安全；**Electron 升级时此面
   必复核**（p4 W-2）。
8. **anchor-blank-snap.ts 撞名观察**：COLUMN_GAP_H_FACTOR=2.5 与
   pdf-item-geometry 的 1.5 同名不同值不同用途（F-A10 域件）——不入
   红层但易埋雷，重构票候选（改语义名 BLANK_SNAP_*）。

## 3. 本段成本账本（§4 口径——模型×供应商分列）

```
主控 GLM5.3（本窗全程）：补审分片设计/微包探针/B1 核证与修复+红证/LINT-03
  立案+派发+抽检+门一补证轮拼装/8 红处置零（本轮无测试面）/locks 拆分法
  二次实战（baseline 交叉面）/v57 滚动
Kimi 补审四片（kimi-main）：in 19.1K/out 17.8K/~10min（124+194+196+94s）
  ——p1 关卡/p2 测试/p3 CSS/p4 tsx；132K 原包重试 504×2 中断弃+50K 单片
  策略弃（分片定型）
F-LINT-03 实现者（GLM5.3flash）：5.0M tok/98 工具调用/9min（收敛 17 文件
  +baseline+红证变异四支+报告；BLOCKED 零——两起过程事故即时还原）
F-LINT-03 门一 Kimi 两轮：首轮 in 9.0K/out 4.3K/130s；补证轮 in 1.4K/
  out 2.9K/93s（真异构——本段门链恢复 Kimi 位）
F-LINT-03 门二 deepseek：in 12.7K/out 4.8K/40s（放行待收口）
```

## 4. 教训行（本段追加四条）

- **Kimi 网关窗分片配方（本段定型）**：131K 原包 504×6 耗尽+50K 单片
  同挂——**微包探针先证网关活着**（区分整体故障 vs 超窗）；窗口线=
  「输入体量×输出时长」双因素——**U0 diff 切片+材料裁剪+输出精简指令**
  （每片 8-19K+输出限 3-4K 字）四片全过。配方档案=f-css03-kimi-* 系列。
- **untracked 新文件必须 add -N 才进 diff**（LINT-03 门一 B1 实录）：
  `git diff` 对 untracked 零输出——新单源件整体缺席审包=值不可核验；
  v55 门一模板早有此纪律，主控自己踩（U0 重生成时遗忘）——生成审包
  diff 后必 `grep -c "^diff --git"` 对账文件数。
- **node 对 msys /tmp 路径解析岔裂**（E:\tmp ENOENT）：跨 bash/node 的
  临时文件放仓库内相对路径（scripts/audits/），不用 /tmp。
- **locks 拆分法二次实战确认**（baseline 交叉面）：B1 提交时 baseline
  是 F-LINT-03 未提交面——cp 备份→checkout 还原→apply（单票态）→提交
  →chmod +w（apply 重锁后恢复也要先清位）→cp 恢复。chmod +w 是
  unlock/lock 不对称缺陷下的标准绕行动作（两次实录）。

## 5. 环境事实滚动

- 基线：**160 文件/1562 用例/locks 311/e2e 44**；registry 0 open/165 done。
- Kimi kimi-main 网关窗：~20K 输入+4K 输出内稳定（本段四片+两轮门一
  全过）；50K+ 输入或大输出预期=504 风险区。
- B-1 关卡终态：baseline entries 空=全量生效——新增同值双常量即红
  （mut2 实证）；「待收敛」打印通道退役。
- COLOR_RE 现形态=`/#[0-9a-fA-F]{3,8}\b|rgba?\(|hsla?\(/i`（双文件逐字
  一致含标志位）。
- ui-constants.ts=跨域 UI 字面量单一出处（OP_FAILED/STATUS_POLL_MS/
  MENU_ITEM_STYLE）——新跨域常量驻此。
- deepseek v4 flash 本段表现：40K 包 40s 返回（无撞限）——大包兜底位
  稳定。

## 6. 门二必核六项落实索引（F-LINT-03 收口）

①locks:apply（chmod +w 先——f-lint03-locks-apply.raw.txt）②verify
全链 raw（f-lint03-closeout-verify.raw.txt 含 locks:check 311/test 1562/
build）③提交尾注 [locked-change]（本提交）④ui-constants.ts 正常 add
（git add 直加非 -N 残留）⑤旧名模块级 grep=0（收口复核在案——
ReaderSearchBox 局部 btn/anchor-blank-snap 同名不同值=观察备案非残留）
⑥closeout raw 落盘 audits ✓。
