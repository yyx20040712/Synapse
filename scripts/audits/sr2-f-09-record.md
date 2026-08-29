# SR2-F-09 执行记录（压缩路径票——主控直做，2026-08-29）

> 用户令：仿 WPS——灰色选中、标注纯色；并核查「多行标注半透明矩形重合不
> 加深+标注行为正常」。压缩路径依据：methodology §2（单值变更+守卫同步不
> 走全三屋；变异红证+全量 verify+真机像素证不缺）。

## 1. 核查裁定（v5 真机+像素——`f1-out/f1-forensics5.json`+v5 截图）

- **标注未被改乱，已是纯色不加深形态**：~10 行选段落库=17 块行矩形
  （mergeLineRects 逐行合并）；纯色不透明（rgb(253,224,71)/opacity 1）；
  multiply 挂容器级（层内单次合成）。像素证：14 块行界带亮度 204~215=
  纯黄×白纸单次乘值（叠乘会掉到 ~197 以下——未出现）；行中带变暗全是
  黑字透出（荧光笔语义）；双色重叠区=单次乘+字透出（无橄榄叠乘）；
  保存→渲染即时。用户记忆中「早期修好」（2026-08-23 Q3 行级合并+容器
  multiply）至今完好——F-06/F-07/F-08 三轮只动选中通道，标注链零触碰。
- **标注纯色=零代码改动**（AnnotationLayer 色板 --annotation-* 纯色系
  #fde047 等+不透明+单次乘即 WPS 观感）。

## 2. 变更面（选中蓝→灰）

| 文件 | 动作 |
| --- | --- |
| `src/renderer/features/reader/text-layer.css` | ::selection/::-moz-selection `rgba(0 0 255 / 0.25)`→`rgba(0 0 0 / 0.30)`（白纸≈#B3B3B3）；头注 [SR2-F-09] 段+`// b3: P7-F` 指针行 |
| `tests/e2e/reader-text.spec.ts`（受锁） | F-06 小票测试名+C 节精确值断言改灰四分量正则；[locked-change] |
| `docs/invariants.md` / `docs/adr/0019-*.md` | INV-37 色值同步+ADR-0019 决策 1 修订（用户令偏离官方值的显式登记） |

## 3. 变异红证（`sr2-f-09-mutation.raw.txt`）

css 临时改回蓝（cp 备份法）→build→单跑 F-06 小票：**1 failed**，
红点=「C: ::selection 背景=半透明灰 rgba(0, 0, 0, 0.3)：rgba(0, 0, 255, 0.25)」
——守卫精确锁值。还原 diff 空（RESTORE-OK-DIFF-EMPTY 在档）。

## 4. 收口证据

verify 全量+e2e 全量+v5b 真机灰色像素证——见 registry summary 与
f1-campaign-close.md 增补段（提交信息内）。
