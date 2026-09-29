# F-CONSOL-05 票面归档（F-GOV-01 机制）

- id: F-CONSOL-05
- file: tests/unit/renderer/theme-boot.test.ts
- area: infra
- owner: strong
- status: done

## summary 原文（立案五层规约）

测试面补强批两项备案兑现（2026-09-29 挂账清理场立案——用户指令「继续开工完善上述挂账」）：行为层=①T3-U1 备案「module/defer 负锚缺（P2 一行补强候选）」——theme-boot.test 接缝一用例（index.html 外链静态锁）追加精确标签锚+同步执行负锚（禁 defer/async/nomodule 属性与 type=module 含大小写与无引号形态——回炉强化版）；②P7B 备案「saveLineTypes 失败路径无专测」——lineage-store-write.test 追加系统型（DB_ERROR→error 态+lastWriteError+队列保留+lineTypes 不回填+toast+retry 恢复）与 CONFLICT 拒绝型（丢弃+toast reason+回落 saved+一次即弃+预置保持）两用例。零 src 改动。接口层=两测试件+豁免台账（case 级条目——接缝一断言集 3→5 旧签名退役）+locks manifest。架构层=[locked-change][test-refactor] 双尾注。生命周期层=变异 M-D1（defer 注入→负锚红）/M-D2（writeFailToast 静默→toast 断言红）/M-D3（error 态摘除→状态断言红）三层红证+还原 diff 0。文化层=零新依赖；出处=T3-U1 §25 备案面+P7B 备案面（v71 §3）。

## 收口记录（2026-09-29 场，主控亲执+k1/d1 双审+probe+裁决部）

**实现**=主控亲执（S3 回炉 R1 先例——纯测试新增+负锚断言零 src 逻辑变更；对抗位 k1+d1+probe+裁决部全保留）。过程事故如实申报：首版新用例误嵌既有 CONFLICT 用例体内（嵌套 it 运行时错→既有用例红）——结构修正（移出至用例闭合后）→27/27 绿。弱断言防御：两用例均预置 loaded 值区分「失败不回填」与初始 [] 恒真（裁决部 R5 复算确认纯超集非削弱——原 3 断言逐字保留）。首版豁免 reason 断言计数 3→6 失实（d1-W5 抓）→勘正 3→5。

**门一**=k1 PASS（B0/W2/N4）+d1 PASS（B0/W5/N3）异构双席。双席同中 W1=负锚正则旁路面（大小写无 i/无引号 type/nomodule 缺席/词边界）。

**回炉 R1（主控亲执）**：①正则强化 `/\b(defer|async|nomodule)\b|\btype\s*=\s*["']?module["']?/i`+注释补 tripwire 定性；②CONFLICT 用例补宽（预置 loaded+toEqual(loaded) 保持断言+toHaveBeenCalledTimes(1) 一次即弃）；③M-D3 补状态层红证（catch error 态赋值摘除→系统型专测红——非 toast 层）；④豁免 reason 计数勘正。处置：k1-W2 队列续跑面维持候选（单条目断言；多条目续跑=P2-1 候选票）；d1-W2 src 绑定/属性结构化解析维持候选（tripwire 定性在档）；d1-N3 CONFLICT saved 语义（队列排空≠数据保全——既有语义零 src 不扩票）。

**门二**=probe 9/9 绿（verify EXIT=0 189 件/2066 用例=2064+2；27/27=theme-boot 8+store-write 19；树态恰 4 M 零 src；负锚强化版逐字符在位；台账 131 末条；指纹门 check EXIT=0——base 205/cur 206+NEW 两用例 delta+接缝一 NEW 行 5 断言+hits:2；locks 275）。异常 a=主控简报基线数字陈旧（2056→实 2064 票 C 后）非缺陷；c=基线快照滞后机制固有（S4/票 C 已提交面在 delta——check 绿）。裁决部 **GO_WITH_CONDITIONS（P0=0·回炉 0）**——R1-R10 独立复算全自洽（2066=2064+2/27=8+19/131=130+1/hits:2=FILE1+case1/base 205/cur 206——+1 归 S4 加固件 NEW_FILE 非改名）；C-J1-C-J4 全兑现（本档+registry 行+账本 11 条补记+仓外批次日志）。

**遗留备案**（裁决部）：P2-1=CONFLICT 多条目续跑专测（k1-W2+d1-N3 合并候选）；P3-1=负锚属性结构化解析升级（src 绑定+tag 边界）；P3-2=错误文案锚双轨化（code+message 分离——英文 DB 串脆性）；P3-3=TB:84 注释勘正（\b 连字符边界表述——data-type=module 假阳性方向，待下次触碰顺手）。

**终态基线**：verify EXIT=0（189 件/2066 用例）；指纹门 check EXIT=0（base 205/2110/6501/12 维持，cur 206 文件面）；豁免台账 131（+case 级 1）；locks 275；e2e 免跑（零 src 改动——U1 C3 先例）。

**证据仓外档**=`E:/zcode_md/synapse-archive/F-CONSOL-05/`（批次日志+双席审档+probe 矩阵+变异三证记录）。
