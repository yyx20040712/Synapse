// g4 编码归一探针 v2：g4-mutation2.log GBK 行归一后，v1 追加的尾注行自身经
// 'binary' 挤道损坏（中文字符只剩低字节）——本版丢弃损坏尾注行（ASCII 前缀识别），
// 其余行已全合法 UTF-8，以 utf-8 文本态重写并追加正确编码尾注
import { readFileSync, writeFileSync } from 'node:fs'

const p = 'scripts/audits/g4-mutation2.log'
const lines = readFileSync(p).toString('binary').split('\n')
const kept = lines.filter((l) => !l.startsWith('# encoding-fix'))
const utf8 = new TextDecoder('utf-8', { fatal: true })
const text = kept.map((l) => {
  utf8.decode(Buffer.from(l, 'binary'))
  return Buffer.from(l, 'binary').toString('utf-8')
}).join('\n')
writeFileSync(p, text + '\n# encoding-fix: :116-:117 powershell 输出 GBK→UTF-8 归一（内容未变；v1 尾注自身编码缺陷已重写）\n', 'utf-8')
console.log('normalized: lines kept=' + kept.length + '，尾注以 utf-8 重写')
