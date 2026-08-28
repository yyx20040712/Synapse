# SR2-F-02 门二终审（四层多页化收口）

> 三屋模式 ADR-0017 门二。终审对象=实现单元终态（SelectionLayer 动态锚定根+
> verifyWhenReady 页限定+e2e 批 2 守卫）。只读审计（唯一产物=本档）；verify/e2e
> 退出码由主控收口亲验链承接（实现者自证+主控复验；R1 变异主控已亲测锚——
> 恰中 S10+S11 两红/其余 9 过/还原 diff 空，W2 闭合）。

## 开工记录（会话纪律·技能清点）

- code-review-excellence **用**（终审=代码审计本体）。
- verification-before-completion **用**（本档结论前逐项实物核验）。
- test-driven-development **不用**（门二只读禁 npm/test，无测试面）；systematic-debugging
  **不用**（无调试面）；其余技能与本单无关联不用。
- 配置自查：门二=GLM-5.3（主控派发指定），全程零写入（唯一产物=本档）。

## ① 处置核对（门一 3W/5N+主控裁决 vs 终态）

| 项 | 主控处置 | 终态核对 | 结论 |
| --- | --- | --- | --- |
| W1 registry 取证 | 定性 W 非 B+升级条款「再犯同类=直接 B」+派发模板补条款「取证禁触 tickets/，e2e 取证用 spec 备份法」 | 四要素独立复核全属实：registry.ts:204 现 `open`；`git diff tickets/` 零残留；实现者报告 ：75-78 自述诚实；F-01 spec 备份法先例在案（f01-impl.report.md:77-80）。**模板条款已实际写入** methodology.md §4.1（git diff 核对，原文含「F-02 门一 W1 实录：备份法翻 registry 取证即使还原+申报也属路径失当，再犯同类直接 B」）——工作树多出的该文件改动=主控处置动作，非实现者蔓延 | ✓ 定性恰当：权限三分法底线违纪（路径失当）但产物解耦/还原属实/申报诚实，B 的阻断条件不成立；条款落地闭合复发面 |
| W2 变异证据缺口 | 主控亲测 R1 闭合；R2~R4 采信度评估 | R1 亲测锚（台账）+首红独立读证（f02-red.log 尾部 S10 timeout 红/S11 `'exact'≠'page'` 红实读）。**R2~R4 恰中性逻辑推演成立**：R2 禁用判定→跨页选区 selectionToAnchor 返 null→无 toast→恰中 P2（页内用例不受判定分支影响不红）；R3 固定挂载页 0→仅 P4 断言保存页=1；R4 删页间偏移→仅 P1 断言含 +812 偏移坐标。实现者其余自述（sha256/还原/零残留/Ai 零改/行数/用例数）经本审独立核实全部属实——采信充分 | ✓ 闭合 |
| W3 回退全局第一 vs 头注「全局唯一」 | 记 F-03 简报候选收紧项，不阻断 | 复核：语义差仅数据损坏前提（anchorPage 超界+多 textLayer）触发；正常路径（setPage→scrollRequest→渲染窗）目标页盒必有，严格限定由 S10/S11 锁定。不阻断+候选收紧的成本/风险比恰当 | ✓ 恰当 |
| N4 挂载盒重挂窗口 | F-03 派发简报补裁决 | 门一 E1 已证 F-03 票面清单（draft :205-210）不含挂载位上移——不补裁决则「归 F-03」落空；主控处置堵住缺口 | ✓ |
| N1~N5 注记 | 无动作（抽验一条） | N1 抽验：报告「9 用例」实为 10（grep `it(` 实测=10，漏计 P2b）——属实无害；N3 抽验：verify 日志 quality 段 GBK 乱码=控制台写盘形态（源文件中文全可读），同门一判定 | ✓ |

## ② 母本符合度（票面九项抽验）

| 项 | 实物核验 | 结论 |
| --- | --- | --- |
| 动态锚定根 | closestPageRoot/pageIndexOf 纯函数（SelectionLayer.tsx:55-67）+evaluate 双边界页盒（:109-121） | ✓ |
| 跨页拒绝 | :111-117 `anchorRoot!==focusRoot`→仅 mouseup 时刻 toast『选区跨页，不支持创建标注』（INV-02） | ✓ |
| 保存页 | :119 pageIndexOf 动态推导→:137 pending.pageNo→落库 page+rects.page 同步（diff :288-293） | ✓ |
| 落点换算 | :131-136 夹取经选区页盒 rect（N-C）+页间偏移换算到挂载盒 | ✓ |
| verifyWhenReady 页限定+回退 | anchor-locate.ts:168-169 `[data-page-root="${(anchorPage??0)+1}"]`（0→1 基换算正确）+`(pageRoot ?? document)` 回退 | ✓ |
| 签名冻结 | LocateAnchor :81-85/LocateTarget :87-96/LocateResult :98 实物逐行核，diff 该区间零 hunk（头注旧行号漂移=门一 N5 已注记） | ✓ |
| AiAnnotationLayer 零改 | git status 无该文件（否定断言属实） | ✓ |
| e2e 批 2 守卫 | reader-text:39 F02_DEPS/ai-notes:152 并入/lineage:419 T4 单列——skip 收紧形态 | ✓ |
| 中间态解除 | P1（挂载盒=页 1、选区页 2→工具条+页间偏移坐标）+e2e 划选链（20 passed 内）双锚 | ✓ |

## ③ 宪法红线终审

- **受锁面**：manifest 实物 141 条（node 计数）；selection-layer.test.tsx sha256
  manifest `607a0c04…bae1c8` 与实测**双向一致**；generate/apply 日志齐（140→141）。
- **S1~S9 零触碰**：anchor-locate.test.ts diff 仅 describe import 扩充+尾部
  :225-267 新增裸 describe（always-active）——受锁扩无放宽；三 e2e spec 纯守卫
  增加无断言改动。
- **行数**：SelectionLayer.tsx=249（组件 ≤250 关口内）；anchor-locate.ts=270
  （软目标 ≤260 超 10 行已申报，硬限 500 远未触，quality 组件关卡不适用 .ts）。
- **零依赖**：package.json/lockfile 零改动（git status 无）。
- **UTF-8**：源文件/头注中文多文件直读全可读；日志 GBK 乱码=控制台写盘形态
  （N3，quality 乱码关卡查源码不受影响）。
- **TDD 链**：首红 10 failed|11 passed（f02-red.log，S10/S11 红形态可辨读）→
  绿 691 passed→R1 主控亲测锚+R2~R4 采信（①）。链完整。

## ④ 机器面

- **691=679+12 数理**：selection-layer 10 it（实测 grep=10——门一 N1 修正：报告
  笔误写 9）+S10/S11 2=12；679+12=691=green log=verify log=**92 文件**（91+1 新）✓。
- **翻 done 推演（check-tickets 六规则）**：1 文件存在✓；2 src 全号 SR2-F-02 引用
  仅在注册文件 anchor-locate.ts（自身豁免），SelectionLayer.tsx 全短式 F-02（不匹配
  ticketRefRe），tests 面 DEPS 字面量不受规则 2 限制——**零残留**✓；3 无占位调用
  （grep=0）✓；4 .ts 非 .tsx 不适用✓；4b 无 data-ticket/工单号 STUB（grep=0）✓；
  5 guardedDescribe('SR2-C-05')→import anchor-locate 匹配（既有不变）✓；6 头指针
  `// b3: P7-C` 在 ROADMAP 已裁决集（`### P7-C：` :210 实存）✓——**翻 done 后
  tickets 关卡保持通过**。
- **e2e 推演**：批 2 三守卫解除（F02_DEPS/pending09/pendingF02 随 F-02 done 全
  done）→激活；唯一剩余 skip=reader-scroll DEPS 含 F-03/F-04 未 done→维持；批 2
  =既有用例挂守卫非新增用例——**20 passed+1 skipped 维持，无用例数变化**，与取证轮
  实证形态（f02-impl-e2e.log:44-69）一致✓。
- **受锁 e2e spec 三件改动面**：reader-text +3 行（F02_DEPS 声明+划选链换挂）/
  ai-notes +2 行/lineage +4 行——全为守卫面，断言零改✓。

## ⑤ 成本账本

| 单元 | token | 时长 |
| --- | --- | --- |
| 实现者 | ≈11.48M | 38.5min |
| 门一 | ≈0.63M | 5.3min |
| 门二（本档） | ≈2.1M（估） | ≈8min |

## 总评

**PASS**。产物母本九项全落地（实物抽验零偏差）；宪法红线干净（141 锁 sha256 双验/
行数/零依赖/UTF-8/TDD 链完整）；机器面数理自洽且翻 done 推演（六规则+e2e 形态）与
实证一致；门一 3W/5N 处置全部落地（W1 条款已入 methodology §4.1、W2 主控亲测锚、
W3/N4 归 F-03 裁决恰当）；无新增阻断项。工作树 docs/methodology.md 改动=主控 W1
处置动作（内容与台账逐字一致），非范围蔓延。**建议主控收口**：亲验 verify/e2e 双
退出码（既定链）→翻 SR2-F-02 done→[locked-change] 提交（manifest+五受锁测试文件）；
F-03 派发简报须兑现 W3 收紧候选+N4 挂载位裁决（台账已列）。
