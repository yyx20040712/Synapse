#!/usr/bin/env node
/**
 * sqlite-abi.mjs —— better-sqlite3 原生绑定按运行时切换（受锁文件）。
 *
 * 背景：better-sqlite3 非 N-API，Node（ABI 137）与 Electron（ABI 146）各需一份绑定。
 * 方案：abi-cache 缓存两份预编译 .node；`use node|electron` 切换 build/Release 里的当前绑定。
 *
 * 用法：
 *   node scripts/sqlite-abi.mjs setup             抓两份到 abi-cache 并切到 node（postinstall 调）
 *   node scripts/sqlite-abi.mjs use node          切到 Node 绑定（vitest 前）
 *   node scripts/sqlite-abi.mjs use electron      切到 Electron 绑定（dev/build/e2e 前）
 *
 * 下载源：GitHub Releases 优先，失败回退 npmmirror 镜像（本网络 GitHub 直连不稳）。
 */
import { createWriteStream } from 'node:fs'
import { copyFile, mkdir, readFile, rm } from 'node:fs/promises'
import { existsSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'
import { pipeline } from 'node:stream/promises'
import { Readable } from 'node:stream'

const pkgDir = join(process.cwd(), 'node_modules', 'better-sqlite3')
const cacheDir = join(pkgDir, 'abi-cache')
const releaseDir = join(pkgDir, 'build', 'Release')
const bindingName = 'better_sqlite3.node'

// Electron 大版本 → ABI（新增 Electron 版本时补表；ELECTRON_ABI 环境变量可覆盖）
// 数据源：electron/node-abi 的 abi_registry（npm 包 node-abi，4.33.0 核对）
const ELECTRON_ABI_MAP = {
  32: 128, 33: 130, 34: 132, 35: 133, 36: 135, 37: 136, 38: 139, 39: 140,
  40: 143, 41: 145, 42: 146, 43: 148, 44: 149
}

async function main() {
  const [cmd, arg] = process.argv.slice(2)
  const version = JSON.parse(await readFile(join(pkgDir, 'package.json'), 'utf-8')).version
  const nodeAbi = process.versions.modules
  const electronVersion = JSON.parse(await readFile(join(process.cwd(), 'node_modules', 'electron', 'package.json'), 'utf-8')).version
  const electronAbi = process.env.ELECTRON_ABI ?? ELECTRON_ABI_MAP[parseInt(electronVersion.split('.')[0] ?? '0', 10)]
  if (!electronAbi) throw new Error(`未知 Electron ABI：${electronVersion}，请设置 ELECTRON_ABI 环境变量`)

  if (cmd === 'setup') {
    await fetchBinding('node', nodeAbi, version)
    await fetchBinding('electron', electronAbi, version)
    await useBinding('node')
    console.log(`sqlite-abi setup 完成（node-v${nodeAbi} + electron-v${electronAbi}），当前绑定：node`)
    return
  }
  if (cmd === 'use') {
    if (arg !== 'node' && arg !== 'electron') throw new Error('用法：use node|electron')
    await useBinding(arg)
    console.log(`sqlite-abi 当前绑定：${arg}`)
    return
  }
  throw new Error('用法：sqlite-abi.mjs setup | use node|electron')
}

async function fetchBinding(runtime, abi, version) {
  const dest = join(cacheDir, `${runtime}-v${abi}`, bindingName)
  if (existsSync(dest)) return
  const base = `better-sqlite3-v${version}-${runtime}-v${abi}-win32-x64.tar.gz`
  const hosts = [
    `https://github.com/WiseLibs/better-sqlite3/releases/download/v${version}/${base}`,
    `https://registry.npmmirror.com/-/binary/better-sqlite3/v${version}/${base}`
  ]
  const tmpTar = join(cacheDir, base)
  await mkdir(cacheDir, { recursive: true })
  let ok = false
  for (const url of hosts) {
    try {
      const res = await fetch(url, { redirect: 'follow' })
      if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`)
      await pipeline(Readable.fromWeb(res.body), createWriteStream(tmpTar))
      ok = true
      break
    } catch (e) {
      console.warn(`下载失败（换下一个源）：${url} → ${String(e)}`)
    }
  }
  if (!ok) throw new Error(`预编译下载全部失败：${base}`)
  // Windows 10+/ubuntu 均自带 tar；tar.gz 内路径为 build/Release/better_sqlite3.node
  const extractDir = join(cacheDir, `extract-${runtime}-v${abi}`)
  await rm(extractDir, { recursive: true, force: true })
  await mkdir(extractDir, { recursive: true })
  const tar = spawnSync('tar', ['-xzf', tmpTar, '-C', extractDir], { stdio: 'inherit' })
  if (tar.status !== 0) throw new Error('tar 解压失败')
  const extracted = join(extractDir, 'build', 'Release', bindingName)
  if (!existsSync(extracted)) throw new Error(`解压产物缺失：${extracted}`)
  await mkdir(join(cacheDir, `${runtime}-v${abi}`), { recursive: true })
  await copyFile(extracted, dest)
  await rm(extractDir, { recursive: true, force: true })
  await rm(tmpTar, { force: true })
}

async function useBinding(runtime) {
  // 找该 runtime 的缓存绑定（版本升级后 ABI 目录变化，取 ABI 数值最大的一个——
  // 字典序会把 node-v93 排在 node-v115 之后，选错旧绑定）
  const prefix = `${runtime}-v`
  const latest = readdirSync(cacheDir)
    .filter((d) => d.startsWith(prefix))
    .sort((a, b) => (parseInt(a.slice(prefix.length), 10) || 0) - (parseInt(b.slice(prefix.length), 10) || 0))
    .at(-1)
  if (!latest) throw new Error(`abi-cache 缺 ${runtime} 绑定——先运行 setup`)
  await mkdir(releaseDir, { recursive: true })
  await copyFile(join(cacheDir, latest, bindingName), join(releaseDir, bindingName))
  // 校验仅在 node 绑定下可行（electron 绑定只能在 Electron 进程内加载）
  if (runtime === 'node') await verify(releaseDir)
}

async function verify(dir) {
  const probe = spawnSync(process.execPath, ['-e', `require(${JSON.stringify(join(dir, bindingName))})`], { encoding: 'utf-8' })
  if (probe.status !== 0) {
    throw new Error(`绑定校验失败（可能是 ABI 不匹配）：${probe.stderr?.slice(0, 400)}`)
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e)
  process.exit(1)
})
