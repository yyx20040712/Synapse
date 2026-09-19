// b25 门一 W1/W2/W3 销项探针 v2（v1 正则失产空集=假绿已弃用——W1 改接口面提取）
import { readFileSync } from 'node:fs';

const base = 'src/main/services/ai_sensor/';
const files = {
  aiSensor: 'ai-sensor.service.ts',
  aiNotes: 'ai-notes-import.service.ts',
  zcode: 'zcode-link.service.ts'
};

// 接口方法名提取：接口块内「  name(...):」形态（类型面=返回对象成员名的投影，
// TS structural typing 保证实现对象必含全部接口成员）
function interfaceMethods(text) {
  const lines = text.split('\n');
  const out = [];
  let inIface = false;
  let depth = 0;
  for (const line of lines) {
    const decl = line.match(/^export interface \w+/);
    if (decl) { inIface = true; depth = 1; continue; }
    if (inIface) {
      depth += (line.match(/\{/g) || []).length - (line.match(/\}/g) || []).length;
      const m = line.match(/^\s{2}(?:\/\*\*[^]*?\*\/\s*)?(?:async\s+)?(\w+)\s*\(/);
      if (m) out.push(m[1]);
      if (depth <= 0) inIface = false;
    }
  }
  return out;
}

const members = {};
for (const [k, f] of Object.entries(files)) {
  members[k] = interfaceMethods(readFileSync(base + f, 'utf8'));
}
console.log('== W1 v2：三服务接口方法名（类型面） ==');
for (const [k, v] of Object.entries(members)) console.log(`${k}: ${v.join(',')}`);

const pairs = [['aiSensor', 'aiNotes'], ['aiSensor', 'zcode'], ['aiNotes', 'zcode']];
let clear = true;
for (const [x, y] of pairs) {
  const inter = members[x].filter((m) => members[y].includes(m));
  console.log(`${x}∩${y}: ${JSON.stringify(inter)}`);
  if (inter.length > 0) clear = false;
}
console.log(`W1_CLEAR=${clear}（两两无交集=旧 spread 无撞名遮蔽语义，等价性成立）`);

// W2：readStatus 函数体（ai-sensor.service.ts 283-304 行）this 命中
const sensorLines = readFileSync(base + files.aiSensor, 'utf8').split('\n');
const body = sensorLines.slice(282, 304).join('\n');
const thisHits = (body.match(/\bthis\b/g) || []).length;
console.log(`\n== W2：readStatus 体（:283-304）this 命中=${thisHits} ==`);
console.log(`W2_CLEAR=${thisHits === 0}（零 this=方法引用直传 this 绑定无关紧要，等价性成立）`);

// W3：三工厂构造期副作用——process/setTimeout/setInterval 代码面命中（排除注释行）
console.log('\n== W3：三件 process/timer 代码面命中 ==');
let w3 = true;
for (const [k, f] of Object.entries(files)) {
  const hits = readFileSync(base + f, 'utf8')
    .split('\n')
    .map((l, i) => ({ l: l.trim(), n: i + 1 }))
    .filter(({ l }) => /process\.|setTimeout|setInterval/.test(l))
    .filter(({ l }) => !l.startsWith('*') && !l.startsWith('//') && !l.startsWith('/*'));
  console.log(`${k}: ${hits.length === 0 ? '零命中' : hits.map((h) => `:${h.n} ${h.l}`).join(' | ')}`);
  if (hits.length > 0) w3 = false;
}
console.log(`W3_CLEAR=${w3}（三工厂=纯闭包定义零构造期副作用，构造序前移无行为影响）`);
