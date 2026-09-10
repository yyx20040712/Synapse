# F-LINT-04（T1）门二终审档（二审实证岗，2026-09-10）

技能清点：verification-before-completion=用（本职）/code-review-excellence=用；systematic-debugging、TDD=不用（纯只读审查，无实现/调试面）；其余无关不用。

## 裁决：PASS（放行，无条件；三条备注非阻断）

## 清单 1 处置核对——过
- **W-2 代码修在场**：check-quality.mjs:252-266 `Map<归一值,Map<prop,声明[]>>`+`byProp.size>=2` 判定；red6 三段 raw 亲验（EXIT-BEFORE-FIX=1 假阳实锤→AFTER-FIX=0 消除→DIFFNAME-RERUN=1 异名仍红）——修复未弱化守卫面。
- **W-1/W-3 注释入档在场**：6b 段 274-277 行（逐字副本检测边界+SENTINEL_SCAN_FILES 扩展义务）/278-280 行（at-rule prelude 盲区明示不检）。
- **R2 两不确定项闭环**：color-re.mjs:32 META_RE 带 g（matchAll 必需）+头注「禁挪作 test」；probe 四向实证（哨兵行 0/内联 1/字符串 1/自身 source 0）+本岗亲跑存量绿=自咬必红而未红，双证。
- **B 类抽核**：B-1 双写面零残留（两消费文件 grep 裸字面量=0）；B-2 三处 catch 均红向 push 或存量跳过，无吞错；B-4/B-5 结构（227-245 行）在场。

## 清单 2 母本符合度——过
五支红证 raw 全在场且红形态抽验合票面：red1 ②同值红（t1=t2 #123456）/red2 ⑥多声明红/red3a 绿+red3b `color:#face` 红（⑦双验收）/red4 恰一条哨兵红/red5 ERR_MODULE_NOT_FOUND 崩溃形态（fail-closed）。存量零误报：stock-green「检查通过」+probe dry-run（非--声明命中 0/②同值组 0）。并存测试：coexist 双注入恰两条（W3+③）互不干扰。**备注 1**：red1/red3b/red4 raw 无显式 EXIT 行——退出码由「检查未通过」报文+check-quality:307-311 violations>0→exit(1) 唯一映射背书，自洽；后续红证惯例建议统一附 EXIT 行。

## 清单 3 宪法红线——过
- 受锁流程：locks:check 亲跑过（317 与 manifest 一致；316→317=color-re.mjs 诞生即锁）。
- 禁新依赖：package.json 零 postcss 提及、无 diff；树内 8.5.26=tailwind 传递——主控预裁「零新增」独立复核成立；hoisting 断时双消费件 fail-closed 红向（W-4 已档）。
- fail-closed：import 均顶层静态、无 try/catch 包裹。
- UTF-8：四改动面 U+FFFD=0，中文亲读可读。
- 范围：diff=4 文件（三改一新+manifest）无蔓延；registry F-LINT-04 仍 open（实现者未越权翻票，合规）。**备注 2**：color-re.mjs 现呈 intent-to-add 空 blob（门一链 add -N 占位，实现者 §11.4 已申报）——主控收口须显式 git add 实文件覆盖后再提交。

## 清单 4 机器面亲跑——过
- `node scripts/check-quality.mjs` → EXIT=0（存量绿；哨兵对两消费文件现行文本零命中同时得证）。
- `node scripts/check-locks.mjs` → EXIT=0，317。
- raw 双标记：VERIFY-EXIT=0（4117 行）+VERIFY-EXIT-R1=0（8151 行）。
- done 推演：registry:267 F-LINT-04 file='scripts/check-quality.mjs' 存在（亲跑成功即证）。
- 变异抽验（②逻辑存在性，读码推演——theme.css 受锁+本岗只读故不实测植入，主控红证 raw 在档背书实测面）：收集行 233 限值命中 COLOR_RE 的 token 声明（@theme var() 重绑出域）→归一去空白小写→分组 252-258→判定 260。异名同值两路径：norm 同键、byProp 2 键→红（red1/red6c 吻合）；同名同值：byProp 1 键→不红（red6b 吻合）。闭环。

## 成本自报（约数）
GLM5.3 主控档会话内子代理，约 9 万 token 入/1.5 万出，约 8 分钟；零文件改动面外成本（唯一写件=本档）。
