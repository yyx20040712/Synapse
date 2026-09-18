# F-GEOM-01-G9 门二终审简报（实证复核——持仓读权限，独立复算不采信转述）

> 你=ops-adjudicator（deepseek-flash $max）。门一已 PASS_WITH_WARNINGS B0/W1/N10
> （报告=scripts/audits/g9-gate1-report.md）。你的职责=实证终审：亲跑亲数亲读，
> 一切数字独立复算；对门一 W/N 处置与实现者自裁逐条裁决；产出 GO 判定。

## 审查对象

F-GEOM-01-G9：零行为纯迁移——14 件 git mv 迁 `src/renderer/features/reader/view/`
（PageColumn/PageBox/PagesOverlay/PdfPageCanvas/TextLayer/text-layer.css/
page-column-geometry/usePageColumnScroll/usePageLazyWindow/scroll-progress/
AnnotationLayer/AiAnnotationLayer/AnnotationPopups/ReaderPageView，2212 行）。
改写面：A 深度修正 44+B src 消费 7/3+C tests 30/16（vi.mock 5）+E eslint:90-91 两行
+D 跨特性 0+G 字符串面 0。工作树**未提交**（收口归主控）；registry 随迁 12 行+翻
done=主控收口面（未做——tickets:check 红=预期态）。

## 材料清单（scripts/audits/g9-*）

- g9-impl-brief.md/g9-impl-report.md（实现者六段简报+报告，报告含自裁 7 条）
- g9-gate1-brief.md/g9-gate1-diff.patch/g9-gate1-report.md（门一审包三件）
- g9-verify-baseline.log（基线锚）；g9-gate-{lint,typecheck,test,build,quality,
  tickets,locks}.log（七关卡）；g9-midprobe-typecheck.log（中探针）；
  g9-m1-mutation.log/g9-m2-mutation.log（变异红证）；g9-one-way.{mjs,log}
  （单向核验探针）；g9-recon.{mjs,log}（主控侦察）；g9-gitmv-status.log；
  g9-rewrite-{a,b,ce}.{mjs,log}（改写探针）；g9-locks-*.log

## 终审指令（A-H 逐项出结论，独立实证）

**A. 数字独立复算**（禁采信转述，全部亲跑亲数）：
1. 14 件现驻 reader/view/（ls+wc 亲验，2212 行对账）；git status R 对=14。
2. A=44 分项（state 18/anchors 14/panels 1/interact 1/上跨 4/根驻留 6）——对
   view/ 14 件亲 grep `from '\.\./` 逐行数。
3. B=7/3、C=30/16（vi.mock 5）、E=2——亲 grep tests/ 与 eslint.config.js。
4. 单向核验：view→各域出边计数+反向边（state/anchors/interact/panels/time 内
   `from '\.\./view/` 或 `features/reader/view` 引用）必须=0。
5. 指纹门/测试基线：test 170 Files/1744 Tests；指纹门 187/1789/5411/skip15
   （gate-test/gate-quality log 内亲读）。
6. locks manifest 364 一致（g9-locks-final.log+locks/manifest.json 亲数）。

**B. 证据件物理在档逐一核 EXIT 标记**：上列 g9-*.log 每件亲读尾行 EXIT 物理标记
（禁终端回述）；M1 链=TS2307 EXIT=2→还原 diff 空→复绿 0；M2 链=模块解析红 1→
还原→复锁→24 passed。变异 backup 副本残留=0（scripts/audits 无 *.bak/backup 件）。

**C. 残留五通道独立闭合**（你亲跑 Grep，五通道全 0）：
①旧径 import（`features/reader/PageColumn['"]`|PdfPageCanvas|TextLayer|PageBox|
PagesOverlay|page-column-geometry|usePageColumnScroll|usePageLazyWindow|
scroll-progress|AnnotationLayer|AiAnnotationLayer|AnnotationPopups|ReaderPageView
——注意 PageColumn 精确段匹配勿误伤 PageColumnView）；②点径/相对旧径（reader 根
文件 import './PageColumn' 形态——应为 0，根内互引 M6b 件除外即不属 14 件名）；
③别名/tsconfig paths；④动态 import()；⑤vi.mock。扫描域=src+tests+e2e+scripts
（scripts/audits 历史档命中=归档面零动作惯例，单独归类勿计红）。

**D. 门一处置裁决**：W1（探针 v1 留档缺口——主控拟处置=收口单注记+后续场探针
版本全量留档）+N1-N10 逐条裁处置是否充分。N8（PdfPageCanvas G1 注释陈旧）主控
拟归 G11 头注扫尾；N3（root↔view 中间态边）拟归 G10（M6b）复核——你裁。

**E. 实现者自裁 7 条复核**（对照 impl-report 自裁段+你独立证据）。

**F. 基线对账**：baseline log 指纹门/测试数 vs gate-test/quality log——零漂移；
TICKETS_EXIT=1 的红行内容=registry 旧径 12 条+4 镜像面（亲读 g9-gate-tickets.log
对账——预告与实际红面一致性）。

**G. 构建产物哈希**：out/renderer/assets/index-D3egZtl2.js（1,392.72kB）+
index-BfpEygSE.css（52.49kB）亲 ls 对尺寸；与基线 log 内产物名恒等。

**H. 收口预批**：主控收口序=①registry 12 行随迁+G9 翻 done（file 同步改
view/PdfPageCanvas.tsx）→②locks 复核→③verify 全链终跑（翻 done 后 open 12→11）
→④staging 显式列文件（14 rename 对+3 src+16 tests+eslint+registry+manifest+
relay+全部 g9-*.log/mjs/md 证据件，.log 需 add -f）→⑤[locked-change]
[test-refactor] 提交。你预批此序并指出遗漏。

## 产物要求

报告（主控逐字归档）：**FINDINGS: P0=<致命> P1=<收口前必须> P2=<记录处置>
N=<注记> VERDICT=<GO|GO_WITH_CONDITIONS|NO-GO>** 尾栏+A-H 逐项结论+逐条发现
（含行级证据）。P0/P1=阻断收口；P2=处置后可过；N=注记。
