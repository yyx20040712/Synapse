// g10 收口序①：registry 8 行翻 done+file 随迁（7 旧票 file→view/ + G10 自身翻 done）
// 单文件单目的；registry.ts 不在受锁集合（batch 12 实勘先例）
import { readFileSync, writeFileSync, renameSync } from 'node:fs';

const REG = new URL('../../tickets/registry.ts', import.meta.url);
const txt = String(readFileSync(REG, 'utf8'));

// 7 旧票 file 随迁（旧根径→view/ 新径；status 零触碰）
const moves = [
  ["file: 'src/renderer/features/reader/ReaderPage.tsx', area: 'reader', owner: 'weak', status: 'done', summary: '阅读器页面组装（多 tab）'",
   "file: 'src/renderer/features/reader/view/ReaderPage.tsx', area: 'reader', owner: 'weak', status: 'done', summary: '阅读器页面组装（多 tab）'"],
  ["file: 'src/renderer/features/reader/ReaderToolbar.tsx', area: 'reader', owner: 'weak', status: 'done', summary: '阅读器工具栏'",
   "file: 'src/renderer/features/reader/view/ReaderToolbar.tsx', area: 'reader', owner: 'weak', status: 'done', summary: '阅读器工具栏'"],
  ["file: 'src/renderer/features/reader/ReaderShortcuts.ts',",
   "file: 'src/renderer/features/reader/view/ReaderShortcuts.ts',"],
  ["file: 'src/renderer/features/reader/AnnotationMenu.tsx',",
   "file: 'src/renderer/features/reader/view/AnnotationMenu.tsx',"],
  ["file: 'src/renderer/features/reader/TabBar.tsx',",
   "file: 'src/renderer/features/reader/view/TabBar.tsx',"],
];
let moved = 0;
let next = txt;
for (const [oldS, newS] of moves) {
  if (next.includes(oldS)) { next = next.replace(oldS, newS); moved += 1; }
}
// P7E-03 :237（ReaderToolbar 第二处——首轮 replace 只换首处，此处补第二处）
if (next.includes("file: 'src/renderer/features/reader/ReaderToolbar.tsx'")) {
  next = next.replace("file: 'src/renderer/features/reader/ReaderToolbar.tsx'",
    "file: 'src/renderer/features/reader/view/ReaderToolbar.tsx'");
  moved += 1;
}
// F-A11 :258 AnnotationEditor
if (next.includes("file: 'src/renderer/features/reader/AnnotationEditor.tsx'")) {
  next = next.replace("file: 'src/renderer/features/reader/AnnotationEditor.tsx'",
    "file: 'src/renderer/features/reader/view/AnnotationEditor.tsx'");
  moved += 1;
}
// G10 自身：file 随迁+open→done
if (next.includes("file: 'src/renderer/features/reader/ReaderPage.tsx', area: 'reader', owner: 'strong', status: 'open', summary: '目录化 M6b=view 工具/搜索/标注 UI 簇迁移")) {
  next = next.replace("file: 'src/renderer/features/reader/ReaderPage.tsx', area: 'reader', owner: 'strong', status: 'open', summary: '目录化 M6b=view 工具/搜索/标注 UI 簇迁移",
    "file: 'src/renderer/features/reader/view/ReaderPage.tsx', area: 'reader', owner: 'strong', status: 'done', summary: '目录化 M6b=view 工具/搜索/标注 UI 簇迁移");
  moved += 1;
}

const tmp = new URL('../../tickets/registry.ts.tmp', import.meta.url);
writeFileSync(tmp, next, 'utf8');
renameSync(tmp, REG);
const reread = String(readFileSync(REG, 'utf8'));
const residue = reread.match(/file: 'src\/renderer\/features\/reader\/(ReaderPage|ReaderToolbar|TabBar|reader-shortcut-handlers|ReaderShortcuts|AnnotationEditor|AnnotationMenu|useReaderSearch|ReaderSearchBox|reader-search|reader-search\.store|SearchHighlightLayer|PageColumnView)\.[jt]sx?'/g) || [];
const g10done = /id: 'F-GEOM-01-G10',[^}]*status: 'done'/.test(reread.replace(/\n/g, ' '));
console.log(`FLIP_MOVED=${moved} RESIDUE=${residue.length} G10_DONE=${g10done}`);
process.exit(moved === 8 && residue.length === 0 && g10done ? 0 : 1);
