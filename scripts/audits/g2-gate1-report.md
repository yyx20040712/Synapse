# F-GEOM-01-G2 门一报告（ops-gate1-k1 逐字归档——岗无写通道，主控代录）

> 归档时间：2026-09-18（门一回执原文，零改写）。审包=g2-gate1-brief.md+
> g2-gate1-diff.patch。agentId=agent_fe1ef9cc-b6b4-4ab6-86a4-54b3ffb75b44。

## B（Blocker）——无

零 Blocker。越表断言核查：selection-layer hunk（:348-466）与 selection-paint hunk
（:471-561）纯插入夹具/桩调用，无一行 `it(`/`expect(` 被改；item-chain 仅 :331 标题
+:340 断言翻转 2 行（对账表 B 行 4 授权）；annotation-anchor.test 删 1 例+import 收窄
（表 D 授权）。全在表 A/B/C/D 内。

## 主控预置点独立裁定

- **自裁③（textLayer 盒桩 +2 行，:361-365）**：裁定**合理延伸，非越权扩面**。①处置面
  =夹具层、断言零改成立；②物理必要性包内可证：pixelBoxOf 注释自述「无布局环境各分量
  为 0，尺寸兜底为 1 防除零」（:170-171），缺桩则基盒 1×1→项盒越界→健康门误拦，与
  申报机制吻合；③对账表 §A 措辞为「桩法 crib…」=例示非穷举，+2 行属「补桩页 2」处置
  的物理前提。
- **B1（守卫位+收窄）**：通过。else 臂 :269 setPaint 照渲→:270 `if (!visualOnly)
  setPending(null)`→:271 无条件 return——visualOnly=true（快路径回退）零 pending 触碰，
  与旧 fall-through 语义等价；else 臂无条件 return 使尾段 :283 `item.rects` 处 item 被
  TS 收窄为非空，且 :271 与 :283 之间无 item 重赋值路径，收窄严密。
- **B2（回退①×INV-58 一致性）**：通过。新标题宣称三钉，断言面三钉全在：rect 非空
  +top≈(200/792)*100（:337-338 视觉连续）、toolbar toBeNull（:340 无保存入口）、warnSpy
  含「页项数据缺失」（:341 warn 不静默），与 INV-58 新条款（:10「paint 照渲＋pending=
  null＋诊断单源」）逐条对应。
- **保存门保真**：paint 照渲（:269 与旧行逐字同）/setPending(null)（:270）/warn 零新增
  （全 diff 无 console.warn 新增位）——与设计书 §2.4 口径一致；尾段 :283 三元删除后
  pending.anchor.rects 恒项族，接缝闭合。
- **豁免两条**：schema 四字段齐（file/caseTitle/reason/rulingLink，:84-95）；caseTitle
  逐字核对——条 1（:86）与旧标题（:330 删除行）逐字一致，条 2（:92）与删除用例（:305）
  逐字一致。
- **probeTextLength/rectsFromRange 完备性**：包内零残留引用（annotation-anchor 头注两处
  :129/:137 同步清除；selection-evaluate import :220 单源切换）；VERIFY_EXIT=0+M2 变异
  （删 export→TS2459 红）证明 typecheck 能拦悬空 import，完备性有实证链。

## W（Warning）——1 条

- **W1 Rule of Three 第 4 份触发**：mkItem/mkText/seedRegistry 同型助手现达 4 份——
  item-chain :63-76 原件（crib 出处）+ selection-evaluate.test 既有（简报 §六）+ 本票
  新增 layer :378-390 与 paint :488-500（两份逐字相同）。宪法「重复 3 次以上抽函数」
  阈值已过。然本票内抽取将再触受锁面+对账，且对账表明示 crib 复制路径——不阻塞本票，
  须主控裁决后续处置（战役级抽取票或登记豁免）。

## N（Note）——7 条

- N1 自裁①（npx 未切 ABI→184 例假红→同口径重跑全绿）：申报合规、终证据口径正确，
  记录级。
- N2 自裁②（TS2459 vs 预判 TS2305）：同语义 import 悬空，无影响。
- N3 自裁③衍伸：建议对账表 §A crib 补记 textLayer 盒桩两行，保持合法性单源自洽
  （轻量，不阻塞）。
- N4 豁免 rulingLink：附录 §E 散文「§2.4/§5 同上」与 JSON 实值 #2.4/#3.5（:88/:94）
  措辞漂移；JSON 与各自 reason 引用自洽。
- N5 设计书节号（§2.4/§2.2 序列⑤/§2.6 交互点 5/§3.5 清单①）包外不可裁决——**不确定**，
  主控预裁覆盖。
- N6 盲区记录：保存门对回退②/③的工具条 null 未逐因钉断言（表 B 行 5「零改=无 pending
  断言」）；共享 else 臂+①有 M1 变异红证，结构风险低。
- N7 manifest 6 sha 实值包内不可复算——**不确定**，由 VERIFY_EXIT=0 locks 链覆盖；
  .log 入库 git add -f 提醒转主控。

## 总评

票面三项（保存门/probeOffsetLen 收敛/rectsFromRange 删除）+受锁义务（对账表/豁免 2 条
≤10/INV-58 修订/锁链即时同步 manifest +7/-7）全数兑现且互证自洽；头注重写五处经逐处
核对陈述准确。交付面 10 文件与 numstat 对账吻合。

VERDICT: PASS_WITH_WARNINGS

MODEL-SELF: model-field:b2466f8b-9d89-4428-a38e-c2aca1c41d0e/k3$max
FINDINGS: B=0 W=1 N=7 VERDICT=PASS_WITH_WARNINGS

---

## 主控处置（W1/N3/N4——2026-09-18，门二简报随附）

- **W1（RoT 第 4 份）主控裁决=后置随迁抽取**：本票中途抽取将作废刚过审的对账表边界
  （再触 4 受锁测试+豁免面）；目录化 G6~G10 迁移票本就要改写这些测试文件的 import——
  助手抽取（tests/utils 页项桩单源）随首个触 selection 系测试的迁移票同场做，RoT 债
  在板面批次日志登记（不新增独立票——G 系票面已含「受锁面随步同链」义务，抽取属
  该义务自然延伸）。若 G 系全部不触（不可能——M4 interact/ 即触 selection 系），
  则 G11 收官票兜底。
- **N3**：已处置——对账表 §A 夹具必要件补记段落（textLayer 盒桩 ×2 行物理前提+门一
  裁定引用）。
- **N4**：已处置——对账表 §E 两处 rulingLink 措辞对齐 JSON 实值（#2.4/#3.5）。
- N1/N2/N6：记录级，批次日志留痕；N5/N7：主控预裁+收口 verify 终跑覆盖（见门二简报）。
