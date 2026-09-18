// g11 收口序①：registry 双票翻 done（G11 收官票+母票 F-GEOM-01）
// 单文件单目的；registry.ts 不在受锁集合（batch 12/G10 先例）
import { readFileSync, writeFileSync, renameSync } from 'node:fs';

const REG = new URL('../../tickets/registry.ts', import.meta.url);
const txt = String(readFileSync(REG, 'utf8'));

// G11 自身：open→done+done 落款（尾注前插入）
const G11_OLD = "骨架=票面载体（标题日期=立案日）；[locked-change]（invariants/baseline/豁免清单受锁）' },";
const G11_NEW = "骨架=票面载体（标题日期=立案日）；[locked-change]（invariants/baseline/豁免清单受锁）【done 2026-09-19 batch 23：五义务全落——头注扫尾（PdfPageCanvas 两处+oneway 谓词注）+记账报告真身（净删双口径净+4/交互点 5→4+1/对账债三项销）+INV 终册（11 处路径刷新+口径小节+相容三注记）+基线同值冻结 187/1789/5411+e2e 验收 45/45+43/43 双绿+锚定网 18 件/211 用例+指纹门零漂移；门一 FAIL B1（INV-47 第 11 处漏刷）→回炉 #1 四件兑现→门二 GWC P0=0/P1=3/P2=4/N=4 回炉 0；构建恒等链第八票 sha256 三件 64 位全同】' },";
let flipped = 0;
let next = txt;
if (next.includes("id: 'F-GEOM-01-G11', file: 'docs/reports/2026-09-18_f-geom01-campaign-closeout.md', area: 'infra', owner: 'strong', status: 'open'") && next.includes(G11_OLD)) {
  next = next.replace("id: 'F-GEOM-01-G11', file: 'docs/reports/2026-09-18_f-geom01-campaign-closeout.md', area: 'infra', owner: 'strong', status: 'open'",
    "id: 'F-GEOM-01-G11', file: 'docs/reports/2026-09-18_f-geom01-campaign-closeout.md', area: 'infra', owner: 'strong', status: 'done'");
  next = next.replace(G11_OLD, G11_NEW);
  flipped += 1;
}

// 母票 F-GEOM-01：open→done+done 落款
const M_OLD = "母票随 G11 翻 done**；[locked-change]' },";
const M_NEW = "母票随 G11 翻 done**；[locked-change]【done 2026-09-19 batch 23：G1~G11 十一票全毕随收官票翻 done——净删净+4（逐票对账 closeout §1）/跨族交互点 5→4+1 闭合/六子域目录化 69→70 文件零行为（构建恒等链 G2~G11 八票）/基线终态 187/1789/5411/e2e 45+43 双绿；收官报告=本票 file 载体】' },";
if (next.includes("id: 'F-GEOM-01', file: 'src/renderer/features/reader/anchors/pdf-item-geometry.ts', area: 'reader', owner: 'strong', status: 'open'") && next.includes(M_OLD)) {
  next = next.replace("id: 'F-GEOM-01', file: 'src/renderer/features/reader/anchors/pdf-item-geometry.ts', area: 'reader', owner: 'strong', status: 'open'",
    "id: 'F-GEOM-01', file: 'src/renderer/features/reader/anchors/pdf-item-geometry.ts', area: 'reader', owner: 'strong', status: 'done'");
  next = next.replace(M_OLD, M_NEW);
  flipped += 1;
}

const tmp = new URL('../../tickets/registry.ts.tmp', import.meta.url);
writeFileSync(tmp, next, 'utf8');
renameSync(tmp, REG);
const reread = String(readFileSync(REG, 'utf8'));
const flat = reread.replace(/\n/g, ' ');
const g11done = /id: 'F-GEOM-01-G11',[^{}]*status: 'done'/.test(flat);
const motherdone = /id: 'F-GEOM-01', file: 'src\/renderer\/features\/reader\/anchors\/pdf-item-geometry\.ts',[^{}]*status: 'done'/.test(flat);
const residue = (flat.match(/id: 'F-GEOM-01(?:-G11)?',[^{}]*status: 'open'/g) || []).length;
console.log(`FLIP_MOVED=${flipped} G11_DONE=${g11done} MOTHER_DONE=${motherdone} RESIDUE=${residue}`);
process.exit(flipped === 2 && g11done && motherdone && residue === 0 ? 0 : 1);
