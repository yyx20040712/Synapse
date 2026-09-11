/**
 * [F-TESTREF-00] 测试面指纹门——立案骨架（设计链进行中，本件为票面载体）。
 *
 * 职责：抽取 tests/** 契约面（C 面=用例标题多重集+expect 断言规范化文本多重集
 * +guardedDescribe 工单号集+skip/only 标记）与基线比对，C_after ⊇ C_before
 * 多重集判定——「测试不可静默削弱」从纪律升级为机检。设计定稿=
 * docs/design/（F-TESTREF-00 设计链三跳档）；裁决参数=
 * docs/design/2026-09-11_glm-ruling-arch-complexity-and-test-campaign.md §4-2。
 *
 * 本骨架在票收口前不接入 verify 链与 CI——门未上线即不执法。
 * 实现须含三支变异红证（删用例→红/改断言字面量→红/加用例→绿+delta）。
 * 受锁件（诞生即 locks:generate+apply）。[test-refactor][locked-change]
 */
process.exit(0)
