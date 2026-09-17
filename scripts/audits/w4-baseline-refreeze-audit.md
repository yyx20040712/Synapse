# W4 基线重冻结审计（2026-09-17T21:14Z，F-TESTREF 战役收官）

- 旧基线（战役前 W2 态冻结）：179 文件 / 1623 用例 / 4979 断言 / 15 skipSites / each 展开行 160
- 新基线（本票重冻结）：183 文件 / 1757 用例 / 5334 断言 / 15 skipSites / each 展开行 254
- 净增：+4 文件 / +134 用例 / +355 断言 / skipSites 零变化 / unresolvable=0

## 文件级差异（逐项定性）

- **新增 4 文件**=F-TESTREF-W3 四新件（tests/contracts/{schemas,api-surface-closure,app-error-closure,constants}.test.ts——W3 纯增未重冻结基线，NEW delta 形态绿）。
- **删除 0 文件**。
- **共有 179 文件**：排除 `line` 字段后新旧**逐字节全同**（探针实测 checked=179/diffBeyondLine=0）——粗看 57 文件 JSON 有差异系迁移票（W1A mock 工厂/W1B 几何桩/工厂 import 调序）造成的**行号漂移**，契约面（用例标题/断言文本/markers/skipSites）零变化，与各批「指纹门 C 面零变化」申报互证。
- **断言 +355**：W3 四件 +354（4979→5333，W3 收口在档）+ W4 本票 constants.test.ts 调色板断言 2→3（+1，W3 门二 P2-3 字面量 pin 搭车）。
- **用例 +134**：W3 四件 89+21+18+6（W3 收口申报逐件吻合）；W4 零新增用例（调色板改写在原用例内）。
- **each 展开行 160→254**：W3 it.each 夹具表用例的展开行净增（schemas 67 schema 表+边界专项等），纯增方向。

## 结论

C 面单调性（INV-63）在战役全程成立：零删改（共有面逐字节同）、纯增面=W3 四件+W4 一断言。基线重冻结合规（显式 test-surface:baseline+本审计档），exemptions 清单零条目（战役全程无契约面删改豁免）。
