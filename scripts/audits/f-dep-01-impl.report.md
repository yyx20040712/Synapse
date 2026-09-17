# F-DEP-01 实现者报告（ops-executor）

## 1. 实现摘要

缺陷（F-LINT-04 门一 W-4 申报）：scripts/check-quality.mjs 直接
`import postcss from 'postcss'` 而 package.json 无显式声明——hoisting 传递依赖
（vite 5.4.21 链下 8.5.26），npm 扁平 node_modules 下今日可解析，pnpm/strict 或
上游去依赖即断（断时 fail-closed 红向）。

修法：devDependencies 显式化 `"postcss": "^8.5.26"`（jsdom 与 tailwindcss 之间
字母序插入，^ 随库内惯例）+ `npm install postcss@^8.5.26 --save-dev` 同步
lockfile。**此为显式化既有传递依赖非新增依赖**（裁决 4 语义；版本与 lockfile
现值 8.5.26 一致，^ 范围解析落同版）。零源码变更。

## 2. 文件清单

| 文件 | 增减 | 说明 |
| --- | --- | --- |
| package.json | +1 行 | devDependencies 增 postcss ^8.5.26（[dep-change] 面） |
| package-lock.json | +1 行 | 仅根 packages 声明条目——node_modules/postcss 传递条目 8.5.26 已在（vite 依赖沿用 dedupe） |

## 3. 机检三件（真退出码）

| 命令 | 退出码 | 关键输出 |
| --- | --- | --- |
| npm ci --dry-run | 0 | CI_DRYRUN_EXIT=0（lockfile 与 package.json 一致）；日志=scripts/audits/f-dep-01-npm-ci-dryrun.raw.txt |
| npm ls postcss | 0 | synapse@0.1.0 直挂 `├── postcss@8.5.26`；vite@5.4.21 链 deduped；日志=f-dep-01-npm-ls.raw.txt |
| npm run verify（全链） | 0 | check-quality 的 postcss import 面照常绿（quality 检查通过：无占位标记/无乱码/无跨域引用/无同值双常量新增）；全链绿证据=f-ain-01-verify.raw.txt（VERIFY_EXIT=0，同场双票共验） |

npm install 本体：NPM_INSTALL_EXIT=0（日志=f-dep-01-npm-install.raw.txt）。

干净环境验收口径（主控裁决）：本地不真跑 npm ci（ABI 重切+耗时）——以
`npm ci --dry-run` EXIT=0 + CI ci.yml:33-34 `npm ci` 面为背书，此口径呈报注明。

## 4. 自裁申报

1. 双通道落法：package.json 手改（字母序+^ 风格）后 `npm install
   postcss@^8.5.26 --save-dev` 同步 lockfile——简报允许「先手改再 install 或
   install 带版本」任一形态，终态=双件同步（各 +1 行最小 delta）。
2. postcss 呈报口径：显式化既有传递依赖（非新增），版本 ^8.5.26 与 lockfile
   现值一致——按简报要求写明。

## 5. 疑虑

- 无。npm audit 输出为存量告警（与本次 +1 声明无关，install 日志存档）。

## 6. 机读尾栏

MODEL-SELF: model-field:account:bigmodel-individual-coding-plan/GLM-5.3$max
LEDGER-CLAIM: role=ops-executor executor=model-field:account:bigmodel-individual-coding-plan/GLM-5.3$max units=1 outcome=done
