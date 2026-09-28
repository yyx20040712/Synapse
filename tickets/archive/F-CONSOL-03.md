# F-CONSOL-03 票面归档（F-GOV-01）

- id: F-CONSOL-03
- file: playwright.config.ts
- area: infra
- owner: strong
- status: done

## summary 原文

测试资产清出——探针 spec 四件+scripts/audits 残留六件归档仓外（外部审视 S-3；真相源=design-final §3 D-GOV-5/6——审 W10 升级真阻断后收口方案）：行为层=①四件 z 探针 spec（affinity/repro/r2e/wg1 共 1089 行）移仓外 E:/zcode_md/synapse-archive/scripts-audits/F-CONSOL-03/probes/；②**F-TESTREF-W2（done）file 字段勘正**：原指 tests/e2e/z-r2e-probe.spec.ts（移出后 check-tickets 存在性必红——审 W10 实证）→改指 playwright.config.ts（同票实际主改面）+summary 尾追加单行勘正注记[归档去向+日期]（**registry 行级解析三约束保持：单行+字段序+禁 id: 单引号字面量**）；③仓内指针=tests/e2e/ 下 z-probes-ARCHIVED.md 三行（去向/日期/原文件名清单）；④scripts/audits 六件 ignored 残留（T3-P7B 裁决部 P3 点名）同票移仓外同单号目录；⑤playwright.config.ts+package.json **零改**（probe project 移出后空集无害+test:e2e:all 语义=app 全量[探针门退役注记入票面]+testIgnore 模式保留——D-GOV-6）；接口层=历史交接书/invariants/registry 对探针文件名既有引用不回改（审计指针性质+取代制纪律——git 即原文归档）；架构层=受锁面=[tests/e2e 四件删除+新指针件+registry 勘正行]——[locked-change] 单尾注；指纹门零影响（app project testIgnore 排除不计数——T3-P7B 裁决部闭账实证 51=55−4 站点）；生命周期=verify 全绿（**check-tickets 存在性恢复绿=验收锚**）+移出前后 tests/e2e 文件清单对照落仓外+git status 未跟踪面零；文化层=audits 留档口径 v2 向 tests 域扩展+「探针类调试资产诞生即标注临时性与归档去向」纪律入票；收口 2026-09-28 三屋全链（回炉 0——实现者六自裁全申报）：实现=ops-executor 14 步[移出+勘正+豁免+重跑+重锁，双红证（tickets 存在性 W10 复现+指纹门 FILE_MISSING×4）先红后绿]；门链=k1 PASS[B0W0N6 一手源码级：55 断言逐 expect 复数+3 skipSite 定位+D-12 三重互证]+d1 首轮 FAIL（检材不合规——其隔离墙禁 Read 与简报授权冲突，非实现缺陷）→主控全内联补正包重派→PWW[B0W1N6]→W1（probe 空态 e2e 未实证）由门二 V2 实证销项；门二=probe 矩阵 8/8[verify 独立重跑 EXIT=0+e2e:all probe 空集完全静默+仓外四探针 sha256 与 HEAD 旧 manifest 四对全同=移出零损坏+双变异红绿链（探针回引→NEW_FILE 红/registry 变异回探针路径→存在性红）+树态前后恒等]+裁决部 GO_WITH_CONDITIONS[P0=0/回炉 0/C1-C4 兑现]；**勘正（D-5/D-6）**：本票面「指纹门零影响」失实——check-test-surface 静态 walk tests/** 含 e2e spec，四探针原在基线内（各 1 case/断言 7·12·19·17=55）→删基线显式重跑（首装语义，脚本对 FILE_MISSING 无豁免通道）：新基线 **194 件/1994 例/6175 断言/skipSite12**（探针含 cond2+hard1 skipSite 随移出——主控预期链 skip15 系编制失误，实测为准）+exemptionsSnapshot 124→123（孤儿豁免 F-RDR-01 skipSite 单条移除）；locks manifest 260→257（−4 探针+1 指针件自动入锁）；终验=verify EXIT=0[vitest 177 件/1943 例不变]+e2e:all app 51 跑[1 例 P7-B 已知型 flake 第 1 现低于立案线，指纹落交接书]+model-names 零代号；diff 面=4D+4M+1A 共 9 路径单笔；证据=仓外 F-CONSOL-03/[impl+probe+四门审档+raw 40+件]

> 归档于 F-GOV-01（2026-09-28）；registry 主表已瘦身为结论句+本件指针
