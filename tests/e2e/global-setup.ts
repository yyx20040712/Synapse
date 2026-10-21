/**
 * [F-EVCTX-01] e2e globalSetup——test-results/run-* 分 run 产物修剪薄壳
 * （纯逻辑=tests/utils/e2e-output-prune.ts 独立 helper——vitest exclude
 * tests/e2e/** 封锁本目录模块被单测加载，故抽件；背景与保留 10 依据见该件
 * 头注）。纪律：清理故障禁阻塞 e2e——全程 try/catch+console.warn 不抛出。
 * 本件非 .test/.spec 后缀——vitest include 与 playwright testDir 双不拾。
 */
import { pruneRunDirs, PRUNE_KEEP } from '../utils/e2e-output-prune'

export default async function globalSetup(): Promise<void> {
  try {
    // playwright 运行 cwd=repo 根（npm run test:e2e 脚本链）——相对路径基准成立
    await pruneRunDirs('test-results', PRUNE_KEEP)
  } catch (err) {
    console.warn('[F-EVCTX-01] test-results run-* 修剪失败（不阻塞 e2e 运行）', err)
  }
}
