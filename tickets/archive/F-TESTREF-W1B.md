# F-TESTREF-W1B 票面归档（F-GOV-01）

- id: F-TESTREF-W1B
- file: tests/utils/geometry.ts
- area: infra
- owner: strong
- status: done

## summary 原文

测试优化战役 W1b=几何桩+局部工厂下沉（W1A 后收口 2026-09-18）：几何桩三族安装对（spyOn 查表/Range 直赋 disposer/defineProperty descriptor 还原）+盒构造 domRect/boxRect→tests/utils/geometry.ts 单源（149 行）；局部工厂 makeTab(patch 形)/makeAnnotation/makeDetail+makeDemoDetail/seedLineage→tests/utils/factories.ts 新件（118 行，manifest 329）；迁移 37 unit 文件（几何 17+工厂 21-交集 ai-annotation-layer；票面 22 文件/97 处为调研期 grep 口径——e2e 5 spec 命中系真实浏览器测量非桩不迁，工厂 ×4/×3/×3/×2 实测扩至 ×11/×3/×4/×3，票内勘误留痕）；fa12 Range 零盒桩 8 字段形保留文件内（4 字段展开形不可无损互换）；三重实证=指纹门 179/1623/4979/15 全同+变异红证（删断言→MISSING_ASSERT 红→cp 还原复绿）+verify exit 0（162 文件/1579 用例，Node 24.20.0）；净删 tests 域 +324/-639；门一 FAIL（审包缺未跟踪 factories.ts）→补件复审 PASS B0W0N4+门二 GO_WITH_CONDITIONS（P1=亲跑 raw 已落 w1b-test-surface-raw.txt/w1b-verify-full.log）；[test-refactor][locked-change]

> 归档于 F-GOV-01（2026-09-28）；registry 主表已瘦身为结论句+本件指针
