# F-CONSOL-02 票面归档（F-GOV-01 机制）

- id: F-CONSOL-02
- file: src/shared/ipc/schemas.ts
- area: ipc
- owner: strong
- status: done

## summary 原文（立案五层规约）

P5 遗留单源化收敛三件套（T3-P5 门审备案升票，2026-09-27 用户裁决「归入下一工单」立案；F-DEDUP-01 先例同族）：①旧通道 schemas 手写→models 派生（门二 d1-P2-3：design-final §3「ipc/schemas.ts 仅 import/re-export 派生禁二次定义」——新通道 upsertLineTypes 已严格派生，但旧两通道 lineageUpsertNodeReqSchema/lineageUpsertEdgeReqSchema 手写历史遗留，month/slot/sub 字段规则与 models 侧逐字双写=漂移面——收敛为派生[omit/extend 链或直接 re-export]）；②恒四组拒绝文案单源（门一 k1-N2：refine message 与 write-guards reason 逐字重复——文案常量上提 models 导出双侧消费，INV-11 轻触）；③INV 册 markdown 渲染形态（门一 k1-N-r3：INV-72~77 六行脱离表头渲染不成表——修法=表尾行上移至表内或 prose 节前后移，纯文档零行为面）；行为层=全零行为变化（重定向等价）；架构层=[locked-change]（不带 test-refactor 尾注——src/docs 混合面范围闸必红，v66 §4 教训）；生命周期层=既有测试全绿即等价证明+typecheck 前置；文化层=零新依赖/票小面轻勿扩。

## 收口记录（2026-09-29 场，三屋全链+回炉 1）

**实现**=ops-executor（session:host-tier，212.5 万 tokens/51 调用）：四文件+manifest——①node req=`lineageNodeUpsertSchema.extend({paperId/x/y 宽面可选}).strict()`、edge req=`lineageEdgeUpsertSchema.omit({fromNode,toNode}).extend({from/to/label 可选}).strict()`（差异字段集恰=票面声明，注释保历史注记+补派生源行；摘未用 import lineageEdgeKindSchema）；②models 导出 `LINE_TYPE_GROUPS_REQUIRED_REASON` 常量，refine+write-guards 双消费（文本逐字不动）；③invariants.md prose 两节后移+INV-72..83 归位。基线三件 123 用例绿→改后同绿；services 面 35 件 312 用例绿；typecheck 双 project 零错。变异 2 支（M1 paperId optional 摘除→1 红；M2 label optional 摘除→1 红）还原 diff 净（备份=带盘符绝对路径，/tmp 漂移教训 v72 §0 落实）。超票面申报 3 项全披露（死 import/EOF 换行归一/变异期二次 unlock-apply）。

**门一**=k1 PASS（B0/W0/N5）+d1 PWW（B0/W1/N3）双席独立零阻断。d1-W1=等价证明方向盲区（测试矩阵+变异均只锚收紧方向，放宽向无锚——diff 无漂移+probe 直读复核消解，备案）；k1-N1/N2=变异抽样/负向夹具粒度（备案）；d1-N3=edge 派生 shape 键序变化→多字段同错 issue 次序可观察（接受/拒绝集不变，备案）；k1-N3/N4/N5=转述依赖项（probe 直读消解）。d1-N1=审包摘录省略号伪影（实 diff import 块含 LineTypeGroup）。

**回炉 R1（主控亲执）**：表体空行清除三处——实现遗漏一处（INV-71/72 间：prose 后移后遗留分隔空行，GFM 断表）+既有同类扩面两处（INV-42/45、INV-58/59 间——立案前已把主表切三段的旧缺陷，同族顺带清除）。机械核对：git diff 加/删块除 INV-11 行外逐行字节等价。

**门二**=probe 10/10 PASS（verify 187 件/2048 用例 EXIT=0 与 v72 基线同数零漂移；e2e 54 用例绿 2.2m；指纹门 cur cases 2102/assertions 6453/skip 12 零变化；文案 grep 全仓恰 1 命中[全字面量口径——registry 摘要引文另计，裁决部 F5]；invariants 表区 13..91 无空行/77 行 INV/INV-11 逐列等价+尾追注；等价性直读逐字段成立；locks:check 273 全对+三 sha256 MATCH；树态恰 5 M 零未跟踪零 test 改动；豁免台账零变化；变异红证独立复现 1F/89P+还原净）+裁决部 **GO_WITH_CONDITIONS（P0=0，零回炉）**——C1 备案登记（等价锚方向性四项合并入 v73 §3，触发条件=下次触碰 shared schema 派生面/lineage IPC 校验面的票须带放宽方向锚）/C2 收口提交形态/C3 档案账本闭合，全兑现。裁决部独立发现 F2-F6（registry 不在 manifest 的尾注口径校准/证据 scope 注记/空行行号单一化/grep 口径注明/③12 行超立案 6 行注记）全采纳。

**数字复算自洽**（裁决部亲算）：2102=2048+54；77=83−6（编号洞 36/38/41/43/44/57）；manifest 273 条实测；豁免 129−6=123 stale。

**基线**=verify 187 件/2048 用例 EXIT=0（收口树主控亲验 master-verify-close.log）；e2e 54 零增；指纹门零变化（零测试面改动——test 文件 diff=0）；locks 273 不变（3 sha256 换血：schemas/models/invariants）；豁免 129 零增；open 面 3→2（余 F-TESTREF-S1/S3）。

**证据仓外档**=`E:/zcode_md/synapse-archive/scripts-audits/F-CONSOL-02/`（probe progress/verify/e2e/mutation log+主控收口 verify log+HEAD 对照件+探针脚本两件——mutation backup 已按纪律删除）。
