# F-SNAP-01 门二终审（2026-09-10）

**裁决：PASS（无条件）**

## 亲跑矩阵（volta node v24.20.0）

| 项 | 预期 | 实测 |
| --- | --- | --- |
| `npx vitest run tests/unit/renderer/anchor-blank-snap.test.ts` | 16/16 | 16 passed (16)，exit=0 |
| `grep -rn "BLANK_SNAP_GAP" src/ tests/` | 仅本件 4 处 | anchor-blank-snap.ts:73,74,169,248 共 4 处 |
| `grep -n "COLUMN_GAP" anchor-blank-snap.ts` | 仅 1 处注释 | :71 注释（指名 pdf-item-geometry 侧） |
| `npm run lint:dup-constants` | 红层 0 | 红层 0 组/warn 2 组不卡 CI/exit=0 |
| `git diff --stat` | 两文件 | anchor-blank-snap.ts(+8/-6)+tickets/registry.ts(+1) |
| typecheck（补票面验收） | 0 错 | exit=0 |

## 处置核对（门一 findings vs 实物）

A 改名 4 标识符×两使用点全替换，值 20/2.5 逐字未动 ✓；B 注释 "=1.5 pdf item 侧" 对照 pdf-item-geometry.ts export `COLUMN_GAP_H_FACTOR = 1.5` 属实 ✓；C 新名全库唯一、无外部 import，tests 16/16 零漂移 ✓；D 唯一性 ✓。W 措辞更正核对成立：check-dup-constants.mjs `scanDuplicateConstants` 红层键=`name+kind+value` 跨 ≥2 文件，与 export 无关（本件实为同名不同值 2.5 vs 1.5，双重不触发）——票面"不入 export 撞值面"措辞待主控翻 done 时更正（registry 现仍 open+旧措辞在 summary，主控已申明）。

## 红线终审

- **非受锁面成立**：anchor-blank-snap.ts 属 src/renderer 非受锁路径；tickets/registry.ts grep 锁件（manifest/protected）零命中，均无 locks:apply 义务。
- **零行为差成立**：diff 纯标识符替换+注释更新，无逻辑行增删；typecheck 与 16/16 零漂移双重佐证。
- **接缝归责**：annotation-anchor.ts:399 引 pdf-item-geometry 侧 import 不在 diff 内、不受影响；ui-constants.ts:18 注释指 pdf-item-geometry 侧，无需联动。

## 成本

GLM5.3 offpeak-idle-plan 档，6 轮工具，token 约 in 18k / out 3k，时长约 5 分钟。
