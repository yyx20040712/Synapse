[routing]: run=20260909141025-crpk source=deepseek model=deepseek-v4-flash switches=0 usage=in=10134,out=32768 latency=288728ms (by ds-call.mjs 链)

[仅推理无正文,finish=length]
We need answer as adversarial code reviewer Gate 2. Need inspect C-1 disposition etc and final diff tests. Need find issues with code evidence, uncertain explicit. Output Chinese [B|W|N]+ one-line overall verdict? User asks output [B|W|N]+ one line summary (可否放行). Need perhaps structured findings, final verdict. Need review deeply.

Let's understand code. We need check current terminal diff. anchor-blank-snap.ts, invocation in anchor-serialize.ts selectionToAnchor. We need assess C-1 side semantics, C-2 clustering, C-3 childNodes, tests not vacuous, mutation etc.

Need identify bugs.

Let's analyze anchor-blank-snap thoroughly.

PROBLEM: pdf.js line breaks marker vs visual position. They normalize selection boundaries when boundary position within blank marker. Need inspect code for flaws.

markerAt(node, offset):
- If text node: parent element and blank => parent marker if parent textContent blank. But if text node is inside non-blank span with only whitespace? Text node can be whole whitespace span; if element textContent includes more non-whitespace in other nodes, parent not blank => null. So "文本位在纯空白 span 内" only parent all blank. For text node containing whitespace before ordinal text within same span. probably not.
- If Element node: range offset points child index. It checks immediate child at offset and offset-1, if element and blank marker. If raw text? Node.ELEMENT only. Good.
- But if selection boundary Text node inside whitespace span with parent blank, marker is element spanning including possibly multiple whitespace text nodes? fine.

isBlankMarker for <br>: textContent empty, yes. For empty span yes. For span containing pure whitespace yes.
Need caution: In typical browser selection when clicking line break? Range boundary could be after <br> in text layer. root might not contain? root is likely container element. ok.

boxOf: ignores dimensions but requires not all origin zero. If b.x=0,b.y=0,w=0,h=0 returns null. In jsdom no stub zero. In browser true zero origin may actual? OK.

snap:
- Determine marker. If not marker or marker not inside root -> original.
- boxOf marker, if null original.
- nearestRow(root, markerCy). This collects all spans from collectSpans(root). spans likely text spans. boxOf(span.node.parentElement). Since mkSpan gives rect on span and span.node is text? Need inspect annotation-anchor collectSpans semantics. Tests assume `span.node` is text node? Let's infer from code: collectSpans(root).spans returns NodeSpan with node? In rowEndOf tail uses `{ node: tail.span.node, offset: tail.span.node.data.length }` - node.data length so span.node must be Text node. In anchor-serialize probeTextLength probably uses span.node.data. In tests mkSpan creates span with text node; rectOf on span; collectSpans likely collects Text node spans with parentElement? Need confirm. But likely.

nearestRow: rows by center, row center. For each row distance to markerCy. It chooses nearest row by row centroid, not nearest span? It uses visualRows with merging. C-2 issue. We need understand clustering. visualRows sorted by center, merge if adjacent center diff <= max(2, min(height)/2). This can merge rows if centers within <= half height. Normal line pitch 14, height 10, half=5, so rows 14 apart not merge. Cross-height marker (br box center between two rows via top/bottom range) nearestRow visualRows of text only. It picks nearest row if centers diff 12 vs 14 etc. For br center exactly between row centers (difference equal) sorted arrays? In C-2 test rowA center=111, rowB center=125, marker center=118. visualRows computes centers, rows separate (14>5). best for rowA dist=7, rowB dist=7, tie. It processes visualRows row order sorted by center; input sorted ascending, rowA then rowB. `dist < bestDist` means first row kept (rowA), so tie takes earlier center (upper reading order). Good.

But note for markerAt: if el is blank marker, blank span with zero dimensions in test: `mkSpan('', { top:120,bottom:120,left=90,right=90 })`; set textContent '' creates? span.node? collectSpans ignores empty spans? Marker is parent element. For rowEndOf / nearestRow, row of blank marker? It still gets box for span.parentElement? The current e5 element has no text span? mkSpan creates no text? `s.textContent=''` no text child. collectSpans(root) likely returns spans with textContent non-empty? Need know annotation-anchor collectSpans may collect `Text` nodes, perhaps includes empty Text nodes? In mock it sets textContent to '' no text node. But snap receives marker = parent span containing no child. nearestRow collects text spans that have non-empty text. Empty marker has no span. But rowEndOf on row of s1/s2 unaffected. Good.

But if actual browser text layer blank span has text node "\n"? collectSpans maybe excludes empty? Hmm.

Need inspect anchor-serialize rest maybe not shown. SelectionToAnchor does:
```
const total=...
const root maybe?
...
const startBoundary=snap...
const leadLen=probeTextLength(root, startBoundary.node, startBoundary.offset,'start')
tail...
```
Need understand full function. It passes root to snap. If root is annotation root? selection from text layer? In tests root appended to body and selection range boundaries inside root. In actual root passed likely text layer's container.

Potential issue: `snapBlankBoundary` changes start/end then probeTextLength. probeTextLength likely if boundary node is outside collectSpans text order? But all spans from collectSpans. For startBoundary as rowEnd node offset to data.length. Fine. For advancePastBlanks returns spans[i].node, offset 0. Then leadLen = length prior. End = total - tailLen. Need understand probeTextLength: probably total text from root maybe concatenation of text nodes? If start/end normalized nodes are text nodes.

Potential issue: Selection from text layer root, text nodes are in spans and blanks markers. collectSpans likely includes text nodes of blank spans? Let's inspect annotation-anchor collectSpans. We don't have full file but tests output computed properly likely.

Need see invocation. `selectionToAnchor(root,...` in tests range node root offset 1. selectionToAnchor calls collectSpans? It does total? Need map.

Important: They apply snapBlankBoundary unconditionally after total === 0. Could produce selection changes for boundaries adjacent to blank marker spans even when user clicks word after whitespace? But markerAt only blank span containing boundary if boundary at element slot adjacent to blank. Element slot selection range start or end often set to text layer parent immediate children. Element offset adjacent marker can occur not only when clicking blank space but also when start/end selection boundaries are based on DOM Range of arbitrary selection. In browser dragging within text may produce text node boundaries, not element slot unless selection includes entire block? For mouse selection from before/after elements to range? Range boundaries commonly text nodes. But element offsets occur if user drags at element boundaries, e.g., after a line paragraph div? Maybe yes. It normalizes by geom.

Need examine C-1 baseline issue. C-1: start br slot constant aspirate line end? Actually previous bug: start boundary at br slot resolved to previous text row end because markerAt's side? Now start resolves next line. They implemented side.

Need evaluate side semantics. In snap, if marker BR: side end returns rowEnd (same line). Side start returns advancePastBlanks(root,rowEnd,rowEnd): after rowEnd span, go forward in collectSpans to first non-blank text, else fallback rowEnd. This handles click at line break: start=next line start. But collectSpans order is content stream DOM order; if rowEnd text's span is at earlier DOM position, next span could be same visual line's second span? Wait rowEnd is rightmost text in nearest row/bar group. `advancePastBlanks` starts at idx of rowEnd span in full collectSpans sequence, then traverses DOM/document order forward to next nonblank text. If there are more spans on same visual line to the right? rowEnd is rightmost, so none with greater right within same line. But in document order, the following visual line might not be immediately after rowEnd? In pdf.js text layer content order may be odd but content flow order. It can include other columns/lines after? Actually nearestRow/rowEnd selects visual row but document order could have later visual row text before? Wait DOM order = content stream order = not visual order. In image they had br marker DOM early or late; visual row is order of text spans in same line? Could document order intertwine columns? In typical PDF text layer, text items in content order; they are structured visually? pdf.js DOM order roughly content stream order, which may be not visual reading order. The issue says DOM 序≠视觉序 with jumps. But maybe not? Let's parse docs: F-A10 target: DOM sequential spans correspond reading order? Wait DOM textContent "AB first" "CD second" etc visual. The bug was br marker emitted at line boundary before/after line? DOM order = content flow; markers can be before/after row text. For ranges, clicking blank "resolved to pdf.js blank marker slot"; if marker DOM early/late, boundary text stream jumps. If DOM order is content stream order, rows adjacent. But visual row's text spans may be divided by markers. `advancePastBlanks` uses collectSpans order after rowEnd. If blank marker at line break is interleaved after rowEnd before next text, good. But if a BR marker has DOM order after following text (C-1b test), then for start side maybe rowEnd at rowA, but subsequent text after rowA? In C-1b root: s1 row1, s2 row2, br2 at end marker box covering rowA? Wait C-1b test uses br2 box top98 bottom118 center108 covers row1 center? `mkBr(top98,bottom118)` rowA center 105? Actually s1 top100,bottom110 center105, s2 top120,bottom130 center125. Bin center108 near row1. But DOM br2 after s2. For end boundary element slot root offset2 = before br2 (at end after s2? childNodes [s1,s2,br2], offset=2 before br2). markerAt offset=2 asMarker(kids[2])=br2. nearestRow marker center108 nearest row1. side=end returns rowEnd row1 = s1 end. So end=8, selection s1 offset4 to row1 end. fine. If side start with br2 offset2? A start at root offset2 (before br2) weird visual line end of row1? snap side start returns advancePastBlanks from rowEnd s1 finds idx0, next span s2 nonblank -> s2 offset0. start=4? Wait selection start maybe s1 offset? if start at br slot and end after s2? Then start normalized to CD start (4) maybe affects. Is that desired? A user starting click at row1 line end after row1? But br DOM after s2, visual previous? Hmm.

Need inspect selection layout. Clicking line end blank area may be represented as endpoint before br if the br is emitted after line's text? The blank marker at each line break (br) maybe DOM after previous row. Its box near line. markerAt for element slot offset before br captures br. Side start should map to start of next visual line? Wait if user starts dragging from end blank of row1 to right: start should be beginning of row2 (after row1 line break); rowEndOf row1. Actually rowEnd not span in row1, then advancing from row1 to next text row2. yes. If br DOM after row2 but marker box is row1? In C-1b marker's DOM after row2 but box overlaps row1 due weird marker positioning? Is that realistic: `br2` emitted "at end of full page" with box covering previous line? Hmm, diag img2 had br with DOM at later position and visually covers earlier segment. Marker with DOM after row2 but box top row1 could correspond to blank line between row1 and row2 emitted after row2 (reordering). If start at before br, side start should be? If click blank area belonging at line break after row1, but br DOM is after row2, its marker box center maybe row1? In code nearestRow based markerCy; returns row1, not row2. For side=end C-1b they expected row1 line end, because marker visual over row1. Maybe there is actual marker representing row boundary before line? They may have real geometry. OK.

Potential bug: markerAt using immediate previous or next child. A Range boundary at an element offset pointing before a BR means clicking at end of current text line if DOM child order [text..., br]. markerAt checks kid[offset] = BR. Good. At `(root, offset=1)` in tests where children [s1,br,s2,c2,s3], offset1 is before br -> marker=br. At root offset 3 in img2 test children [s1,s2,s3,br2], offset3 is before br -> marker. But such offset corresponds to end of document? They use selection end to root.offset=3, before br at end. If br is after s3 but visual marker at row1. Hmm markerAt sees br at offset3; yes.

Range can also have offset after br: `offset=2` when children [s1,br,s2]; asMarker(kids[offset-1]) = br. Good. But if offset=1 and child br #1, marker found too. So it checks both before/after. That means any element boundary adjacent to a blank element is considered, even if blank marker not directly visible? normal child boundaries before/after whitespace span. Fine.

Potential issue: If node is Element and offset equals childNodes.length (after last child), kids[offset] undefined, kids[offset-1] last. If last child is blank BR marker, it captures. Good.

Potential issue: `isBlankMarker(el)` for <br> has textContent "", yes; for arbitrary element with no text maybe role? It will consider any empty span or div marker. In an element slot adjacent to a normal empty span (e.g., layout spacer with zero size) it will normalize. But likely okay.

Need evaluate "C-2 center clustering jury." Implementation visualRows merges rows incorrectly maybe. The prior bug was sameRow tolerance 0.75× line height can include two rows. It introduces center clustering. But nearestRow chooses closest *row*, not closest span. If marker spans many rows due tall box, nearest row's center maybe not actual anchor line? In test C-2 br 2 rows high with center on midpoint. visualRows of text rows separate. It picks row center nearest. But code uses all row's items; for a visual row with multiple spans across columns, rows clustered in vertical by each span's font box. Suppose two columns line boxes slightly different heights/centers due differing font size, visualRows may split? Then nearest row chooses one of split. The marker likely single text row? Need not.

But find actual bug in visualRows: It sorts items by center, forms rows using `r[r.length - 1]` (previous item in same row), not compare new item's center to current row's center. It checks `Math.abs(center(it) - center(prev)) <= threshold = max(2, min(height(it), height(prev))/2)`. If lines have pitch = 14 and font height 10, threshold 5; so won't merge. If line pitch = 18 height 10 threshold 5. If line spacing compact such that centers separated less than half height, then visually lines might overlap? Maybe not. C-2. But C-2 "0.75×行高": if line height? If threshold too low maybe still two rows? Actually if text rows center distance e.g., 9 with font height 10 threshold5 no merge. No issue. If rows same line but columns with different baseline/font sizes center diff > threshold, split into separate rows, then nearest row might only one column; but marker arrow? Need maybe.
`nearestRow` distances `abs(avg row centers - markerCy)`; picks one. For each row, row's centers. Visual row average across multiple spans. Good.

Wait rowEndOf uses nearestRow? It computes rowEnd:
- groups sorted by left, gap threshold.
- distance to box: 0 if marker's horizontal box within group's left-right; else nearest edge. Then picks. For br box left=right=5, group left 10 right 70, distance min(5,65)=5. If another group left 150 right240 distance145. Picks group. tail = item with right max. returns text node data length. OK.
However `bestDist` tie? If marker horizontally between groups equal distance? It keeps first group because dist< not <=; groups sorted by left, picks leftmost. Could it pick wrong? Probably rare.
C-2 "等距并列取上行" uses nearestRow tie among rows. visualRows order ascending; tie first. Good.

Now major issue: side parameter "start=行尾定位后阅读序越过紧邻空白到下一行首，页尾回退行尾"; but in implementation, for BR start it doesn't use side-specific just rowEnd then advance. But `rowEndOf(row, box)` uses br marker box. What if BR blank marker at paragraph/line end and when start side, there is no text on the same visual row after marker? row is nearest text row. rowEndOf tail=last text in group, not necessarily row boundary across group. It finds rightmost span in group, then returns text node end. If group has multiple spans in same line, `best.reduce((m,r) => right > m.right)` only chooses one span text node at its end. But the "rowEnd" in full text coordinate might not include intervening spans? The boundary is after that tail span. If row consists multiple spans, and tail is last rightmost, offset data.length = after tail. OK. But `probeTextLength(root, node, offset)` uses document order. If making boundary after tail but the tail's text node is not last in DOM within that line? It is rightmost, likely maybe. offset length ok.
But consider multiple text spans within same text node? pdfjs spans usually one text node per item. Fine.

`advancePastBlanks`: after finding rowEnd span idx in collectSpans, loops spans after to first nonblank. But if there are later spans within same visual row at same right? rowEnd is rightmost, no. It may skip blank spans etc. But if original rowEnd is not in collectSpans? It uses rowEnd from tail.span.node which is in. Good.
However it defines "紧邻纯空白" in reading order but it doesn't verify that skipped spans are visually after rowEnd line? It just moves to next nonblank in DOM. If DOM order of next visual line isn't document order, could jump wrong. But existing architecture likely assumes collectSpans "文档序拼接口径". They note DOM order ≠ visual order, but for text spans maybe document order corresponds reading order? Wait issue says pdf.js text layer DOM order = content stream order not visual? Actually in tests, document order alternates visual lines not in order maybe. They claim "DOM 序（=内容流序）≠视觉序". If text spans are not in visual order, advancePastBlanks using DOM order can be wrong: after rowEnd span (maybe row2), next nonblank in document order might be row3 or row1? In their test C-1c, DOM: s1 row1, br1, s2 row2, e3 blank row3, s3 row3. Document order is same visual reading. In test C-1a DOM row1, row2,row3. So maybe their DOM stream order for main text is reading order. But why issue says br slot could jump "丢下半段 / img2 带下一段" due br marker placed incorrectly relative to line's text; text spans themselves maybe visual reading. Hmm.

Need see if `snapBlankBoundary` returns rowEnd that may point to span not reachable by `probeTextLength` due root? It uses root contains. Not.

Now potential hidden issue in tests: Some assertions are wrong or vacuous due setting selection range fails (Range.setStart with text node inside empty span? etc). Need verify tests mutate using jsdom. `mkSpan(' ', ...)` creates text " ". selectionToAnchor with boundary at e3.firstChild offset0. Text node parent content " " non-blank? `isBlankMarker(parent)` uses textContent = " " -> blank, marker parent. Good. `collectSpans(root)` maybe doesn't include whitespace? In C-1c expected start=18 over full text. Need calculate full text? DOM text nodes: s1 'AB first' length8, s2 'CD second' length9, e3 ' ' length1, s3 'EF third' length8 => total 26? But `probeTextLength` maybe collectSpans includes spans of `<span>` text nodes: total 26. Let's compute boundary start root offset1 before br. rowEndOf for br row? br top118-138 center128; s1 row 100-110 center105, s2 120-130 center125, e3 blank center145? Hmm. nearestRow likely row2 s2 center125 (dist3) vs s3 center145 dist17, so rowEnd s2 end=17. advancePastBlanks from idx of s2 sees e3 text " " empty/trim 0, s3 trim>0 -> node s3 offset0. leadLen before s3? collectSpans includes s1,s2,e3? Does it include whitespace span? If e3 text " " considered span with data " ", collectSpans likely includes it, so leadLen s3 before=8+9+1=18. If collectSpans excludes whitespace, leadLen=17; test expected 18 based code's semantics excluding? They set e3 `mkSpan(' ')` parent text content blank, but collectSpans probably sees span wrapping text " ", whitespace? Is it included? Need know. Their preceding data "full text" comments says "全文='AB firstCD second EF third'——起点应越过 e3 的空白=18（非 17）", so full text includes e3 leading space. `probeTextLength` likely total length by textContent? It may count whitespace. But `collectSpans` maybe from annotation-anchor uses spans and Text nodes perhaps including? Not issue.

Let's inspect anchor-serialize header: `collectSpans`, `fullTextOf`, `probeTextLength`. Need code? We can infer from tests. `fullTextOf` likely collects `collectSpans(root).spans.map(node.data).join('')`. Does collectSpans return all text nodes, including pure whitespace? They likely collect "spans" = text nodes under `.textLayer`? In pdfjs textLayer contains spans with text plus br. A whitespace-only span in PDF maybe has span text. If `collectSpans` returns `span.textContent`? Need not.

But possible issue: `nearestRow` boxOf calls `span.node.parentElement` and rect. If `span.node` itself is an empty text node? no. if span has parent span with rect actual. Fine.

Need review "C-1 token count" not relevant. But if untested.

Need decide if gate B (block) with some issue? Need likely find real issues. Let's thoroughly examine selectionToAnchor code from diff: We don't know lines before 190. Could be missing context. Let's reconstruct from header and imports:

```
import type { AnnotationRect }...
import { snapBlankBoundary }...
import { collectSpans, fullTextOf, probeTextLength, ...? } from './annotation-anchor'
```

Maybe selectionToAnchor:
```
export function selectionToAnchor(root, selection): SelectionAnchor|null {
 if (!selection || selection.rangeCount===0) return null
 const range = selection.getRangeAt(0)
 const spans = collectSpans(root).spans? total?
 ...
 const total = fullTextOf(root).length? or ...
 if total===0 return null
 const startBoundary=...
 ...
}
```

Could inspect known code? Maybe not.

Potential fundamental flaw: If selection boundary falls on blank marker that lies *outside* `root`? They check marker root.contains. But `markerAt` returns marker if boundary in root, so inside. okay.

Potential issue: `snapBlankBoundary` normalizes **both** boundaries independently using root geometry. But if range spans multiple pages? root is likely one pdf "page" container? selection across pages maybe null? Header says "选区任一边界在 root 之外（跨页/页外）...返回 null." In real root = page text container? If selection across page maybe root is page? Wait anchor-serialize in reader likely root passed to `selectionToAnchor` is a container for current page maybe `.textLayer`. If selection spans multiple text layers (page breaks), root maybe one page. Range cannot set in two roots? selectionToAnchor returns null if boundary outside. So fine.

Potential issue: root.contains(marker) but marker may be ancestor of root? If boundary node root itself? markerAt(root, offset) checks child at offset. If child blank marker. root.contains(marker) true if marker within. Good.

Potential issue: If boundary is an element slot in a blank marker element's parent and there are *two adjacent blank elements?* Row may use nearest row. Not.

Need evaluate C-2 test "C-2 跨行居中 br 盒 ... 不同纳两行": `visualRows` merges if adjacent center diff <= max(2, min(h)/2). Rows width: sA center 111, sB center125 diff14 h10 threshold5 no merge. It picks rowA tie. fine. But br box height 20 and markerCy118 exactly row centers. Good.

Potential bug in C-2 implementation: `visualRows` rows list may reorder weird. Items sorted by center, but when adding new it compares to previous *item* in row not first item, resulting rows merging if all adjacent within threshold. If group has center drift? Not.

Potential issue with `nearestRow`: it computes distance to markerCy using row mean; since `visualRows` rows sorted by center, when comparing a row it uses mean of row. If rows have different number of spans, row mean okay. But if two visual rows are separated by whitespace less than half height due different line box sizes, visualRows might merge them into one row, then nearest row may contain multiple visual lines and rowEnd picks rightmost among them, potentially far away. Wait visualRows merge criterion between items: If item A row1 center 111 h10, item B row2 center 115 h10 diff4 <= max(2,5), they merge. If actual line boxes overlap due tall glyphs? Should maybe same row. If line pitch small such that centers less than half of height, rows overlap visually. Could happen for tightly spaced lines with line-height less than font size? Usually line-height can be 1.2, height 12, center diff 14 >6. So no.
But vertical center of span parent may include line box from font metrics, not glyph; line heights. Fine.

Potential "sameRow 容差 0.75×行高"—now visual rows no sameRow. C-1 "等距并列取上行" if dist equal. But nearestRow returns row not span. If same row contains two columns, nearest row as whole; rowEnd picks nearest column based marker x. Good.

Potential bug in blank span direction: They call nearestRow based solely on markerCy, center y. For blank span with width/height and x in between columns, rowEndOf returns best group based x. Good.
For blank text span marker, not BR: It doesn't differentiate side! It simply finds left or right. For `side='start'`, if marker is at line start indentation blank, left none then right -> next char. If marker is at line-end blank and side='start', left -> previous line end; then start may be before? Wait In PDF, whitespace-only span at line end or paragraph indentation with real geometry. They treat:
- "纯空白/空文本 span 标记（字形盒真实）→ 盒左侧最近同行文本行尾；无左侧同行文本→右侧最近同行文本首字符（段首缩进空白吸附）."
But for a whitespace span at *line end after text*, and boundary side='start' (selection begins at visual line end blank), this logic returns left row text end = previous text end, NOT next line start. That may reintroduce C-1 for blank span markers? Let's inspect F-A10: issue mentions "浏览器把行尾/段首空白点击解析为 pdf.js 空白标记 span 槽位" There are both line break `<br>` markers and pure whitespace item spans. The markerAt catches either blank span. For pure whitespace/empty span markers, code ignores side. For blank span at *row start* indentation, right selects first char (nonblank) but does not advance if right is another blank? It filters `box.left >= box.right -1`, meaning first box to right whose left is at/after marker.right. It may choose a blank marker adjacent (if multiple), causing start offset 0 into a blank span, adding leading whitespace. Also not skipping to nonblank. But in pdf text layer, "行首缩进空白" one blank span maybe followed by text span. OK.
For blank span at *line end*, with no column gap? The marker's box could have actual width for trailing spaces? PDF trailing spaces generally no glyph; pdf.js might add empty? If pure whitespace span with actual "字型盒" and width for spaces. If user line-break blank click range becomes text node inside whitespace span. If marker is blank span at line end after s1 before s2; the geometry may be within line gap. For end side, left row line end correct. For start side, should be next line start but code left=line end. Could break. Did tests cover only blank span line-start C-1? Tests for blank span: "起点落在段首缩进空白标记 span 的文本位" left none, right. No test for blank span with left text at line end and side=start. They didn't parameterize side for non-BR. Is that a gap or bug? Need decide.

Let's review desired "段末空白 affinity": In pdf.js, click at end of line can be represented either by BR marker or blank span. `snapBlankBoundary` says for BR: BR marker; for blank span text marker: "盒左侧最近同行文本行尾；无左侧同行文本→右侧最近同行文本首字符". That implies for blank span with left, it always maps to line end, no side. If clicking end blank and dragging forward, likely the Range start/end? Let's consider actual visual selection direction: Suppose user intends select from line2 start to line3? The DOM Range may start at click point *after* previous line? Could selection anchor be endpoint after line1 text, not at line2 start! Wait the original bug: Clicking at end of line produces DOM Range anchor before/after blank marker. For a line-end click at end of line1, Range anchor is **after line1's text** (DOM position maybe after line1 span? before br? after?); They map to "line end" not line2 start. But if drag extends to line2 text, selection content starts from line end. The selected text maybe includes `line2...` after an implicit whitespace. For quote offset coordinate, start should be at line2 "reading position after line break"? Actually they need not include line1? Let's understand.

If user clicks at right end of visual row1, just after last character, the intended text boundary in reading order is *between row1 and row2*, not after row1? In text representation, "linebreak" could be represented no char or maybe nbsp? If selecting forward to row2 text, quote maybe should exclude the blank and include row2. Boundary should be before row2's first char, not after row1 last char. Since rows in reading order contiguous without newline (joined fullText raw), row1 text and row2 text are contiguous: "AB firstCD second". The click at end row1 visual line, when in reading order coordinate, is after row1 text and before row2 text. So start mapping to row1 text end is one valid boundary (before row2 if row2 immediately after in fullText). In DOM, perhaps no char between. So BUG in earlier C-1? "br 槽位恒吸行尾→start>end→quote空" When user dragged backward, start boundary at br click was mapped to rowEnd (position after row1), but visual drag into row1 would have end earlier, causing start>end. The fix for start side moves coordinate to **next line start**. Wait But why? If user starts at line end and drags left, selection should include text from line2? Let's reason.

Visual row start at row1 line-end blank, then drags left within row1. In reading order, start point should be at boundary after row1 (coordinate 8) and end inside row1 at 4? That yields start>end because visual drag left corresponds to selecting backwards? Browsers normalize Range start≤end if dragging left from end to earlier: Selection anchor is at earlier drag point? Actually if user presses at row1 end (anchor) and drags to left within same line (focus earlier), selection Range container start=focus earlier, end=anchor later, so DOM start<end. The original code would have normalized Range before selectionToAnchor. Wait C-1 was "起点 br 槽位恒吸行尾→start>end→quote 空": How can start be br and > end? If selection Range from row2? Let's reconstruct.

Maybe users often select from an anchor at outside? C-1 test: "起笔 row2 行尾空白（br 槽），向左回拖到 row2 内 offset 3". DOM Range created `start={node: root, offset:1}, end={node: s2, offset:3}`? Wait test sets anchorOf(root, from start, to end). But actual browser after backward drag would Range start=earlier text node? They set start=br slot, end=text earlier; start DOM before end text? child order [s1, br, s2,s3], root offset1 (before br) then end s2 offset3. DOM order root offset1 < s2 offset3, so range is normal? Wait br is before s2, so br slot is before s2 text. Therefore start at br maps after rowEnd? Hmm If br marker is before row2, boundary at before br = after s1? fullText order: s1 row1, br, s2 row2 => coordinate after s1? Actually boundary root offset1 is after s1 before br, rowEndOf row2? code rowEnd returns s2 end? Wait earlier no?? For C-1a root child [s1,br1,s2,s3], start root offset1 before br, markerAt sees br. nearestRow marker center128? Actually br top118 bottom138 center128, nearestRow row2 s2 center125, rowEnd row2= s2 data end17. So start snapped to row2 end (17), end s2 offset3 coordinate 11? Start>end => quotes empty if no flip. Real visual: start at row2 line end blank? But row2 line end blank should be before following row3, coordinate 17? Wait row2 text "CD second" spans offset8..17, so row end is before row3. The user drags left to within row2. Actual selection should start? If start at line end blank, click physically after "CD second" at row2; the text boundary in reading coordinate is before row3? It is 17 (end of row2 or start row3). They moved to row2 end 17, range start 17 to end 11 => reversed. To get quote "second", they flip [11,17). So start becomes row2 end? Wait expected C-1a quote "second" [11,17]. start=11,end=17 after swap. That corresponds selecting from row2 middle to row2 end. But if user physically dragged left from row2 line-end to middle row2, they'd expect row2 end segment "second" yes. In reading order Range start = earlier 11? Browser anchor? Since pressing at physical row-end blank then dragging left, anchor is physical end but fullText coordinate? Actually visual right-to-left drag from Row2 row end to earlier char creates selected text from middle to line end, content in reading order middle->end. So start 11/end17. Good. Without snapping to row end, DOM start before br had coordinate? Wait DOM root offset1 after s1 but before row2 text? As fullText "AB firstCD secondEF third", boundary before row2 text has coordinate after s1 =8, but why original maps to 17? Because markerAt mapped start to row2 end (nearestRow row2) =17. That is after row2, not before; br marker is line end marker emitted before row2 text but visually at row2 end? Hmm original issue described "起点 br 槽位恒吸行尾" -> start mapping to row2 end > end. Side start should treat it as row2 **next line start?** Wait rowEndOf row gives row2 end because row2 is nearest text row. But if this marker is at the beginning of row2 in DOM but represents click at row2 line end? Then boundary coordinate should be end of row2 =17? Actually yes if clicking at the end of line2. But it's located DOM *before line2 text*! So DOM position before br before line2; by fullText coordinate if no marker text, DOM coordinate after row1 (8), not end row2 (17). But snap uses visual marker -> rowEnd row2 (17). Side=start should map start to *after* rowEnd (next row3 start? 26? Wait row2 end coordinate 17). But user clicked at end of line2, then selecting leftwards to within line2 should start=17? The desired result [11,17] after flipping. So side start for BR should return `advancePastBlanks(rowEnd, rowEnd)`? Code for start returns next nonblank after rowEnd. rowEnd is DOM s2's text node; next nonblank after s2 = s3 'EF third' offset0=17. Wait s2 ends at full coordinate 17? Let's recalc: full text s1 "AB first" 8 bytes, s2 "CD second" 9 => s2 end=17, s3 starts=17. advance returns s3 start=17, same as rowEnd because rowEnd is last text in row? Actually rowEnd is s2 node, after s2 text in fulltext, which is also before s3, coordinate 17. Code returns offset 0 of s3 (17). So side start result = 17. End=s2 offset3 -> coord 11. Flip => [11,17]. So it does not overadvance. Wait returns span node s3 offset0, not row2 end; but coordinate same when no whitespace between! It returns next visual row start. But fullText has no char between row2 and row3? Actually root full text "AB firstCD secondEF third"; row3 starts at 17. Yes.
C-1c with blank e3: rowEnd s2 offset17; after s2 is e3 blank length1, s3 offset18. returns s3 offset18. Great.

So side start maps simply to *next line start coordinate*, which if rowEnd.data ends at 17 and next text starts 18, advance over blank to 18. If there is no text after rowEnd (page tail), no nonblank -> fallback rowEnd boundary. But code returns fallback rowEnd. Is rowEnd boundary after last line char or after line? If page tail line and clicking at row line end, moving forward should no text; fallback coordinate rowEnd. fine.

Now non-BR blank span side start left case similar? Suppose empty whitespace span after row2 before row3, marker line-end, blank marker box (glyph width) physically near row end. For side start, code left existing to row2 end and returns row2 text end, **not** row3 start. That differs: end side would also row2 end. If blank span has width after row text, full text coordinate row2 end before blank char? Wait if blank span's textContent is a space/whitespace char, collectSpans/fullText includes that blank char after row2. Visual line end space? Row2 end should include trailing space? Usually visual click after line text not include trailing whitespace. They want quote not start with whitespace maybe. If line has trailing spaces, fullText includes them, so return coordinate row2 end before space. For side start, desired next row start after skipping blanks (including the marker's whitespace text) = coordinate after blank. Their code left returns before blank, so may include blank in quote when end after blank? Let's instantiate:
DOM: row1 text s1, row2 text s2, blank span e with " ", row3 text s3. User clicks line-end whitespace (span e) before row3 and drags right? side=start should skip e's whitespace and start at s3, not s2 end. But code if marker=e blank span, left candidate row2 end (before e), returns s2 end. start coordinate after s2 = offset8? Actually if fullText includes e, s2 end=17, e char at 17, s3 starts18. start returns 17 not 18. But if marker text itself is included at 17, start=17 before blank? Wait left returns node s2 text node end, not in marker. That is before blank text. Full coordinate 17. This results quote starting with blank char if end after s3. However intended skip blanks says advance should skip whitespace markers. No side support for blank spans; code comments claim "纯空白/空文本 span 标记 → 盒左侧最近同行文本行尾; ... " It explicitly maps any blank span to previous line end even for start. In C-1a there was br marker, not blank span. Could this be a bug from F-A10 target "浏览器把行尾/段首空白点击解析为 pdf.js 空白标记 span 槽位". Need know actual observations. The header says "浏览器把行尾/段首空白点击解析为 pdf.js 行 break 标记（<br ...）或纯空白项 span（有真实字形盒）的槽位"; Both are possible manifestations. Behavior includes "行尾/段首空白". For BR, side. For blank span, if marker at line-end, side not considered; it would snap start to line end rather than advancing next line. But perhaps by "行尾" physical line end, clicking after text corresponds **after line break** -> blank span text occurs at start of next paragraph? Let's examine pdf.js text layer structure:
Pdf.js TextLayer breaks text into `<span>` for each text item; whitespace separating text items is included in span text if part of text content, and also renders markup? "空白项 span（有真实字形盒）" are separate text runs that consist only of whitespace, with rendered width. For line/paragraph breaks, there is a `<br>` marker. If a blank span appears at **line end** as a run of text spaces before `<br>`, its DOM position after preceding word and before next line's text, but its visual box is at end of line, maybe appears as blank run after content until line break. A click at line end over that blank span maps to coordinate inside blank text. The desired anchor maybe after previous visible text but before the trailing whitespace? Need to preserve trailing spaces? For selection quote, they don't include trailing/leading whitespace? The issue comment "quote 不含前导空白" for start. For end, if blank marker at line end and selection ends there, perhaps they include row text and not trailing space. For blank span at end, code maps left (line End before space). That avoids trailing spaces. For start, desired perhaps to include leading? If select from line-end blank onward, should not include blank char perhaps; mapping to line End before blank creates quote that *does* include blank char? Wait let's calculate with marker text " " at row2 line end physically but reading order: row2 text s2 coordinate 8..17, blank span text " " char at 17..18, row3 text starts18. Visual line-end blank is after row2, expected coordinate after row2 but before next text? It should be 18 (after trailing space) if fullText includes trailing space? But trailing space belongs to line2 and is part of paragraph whitespace? If user clicked on right blank area after text, should selection from there to row3 text not include the space? Hmm.

What is pdf text extraction? If the whitespace is a separate text item with a space at end of line, pdf.js text layer includes it. A DOM Range boundary inside that space text has offset 0..1; snap chooses previous span due left, offset at row2 text end (before space). This boundary coordinate before the blank char, so selecting forward to row3 includes the space. That seems "leading whitespace" in quote, contrary to claim quote no leading blank. But maybe because the selection starts *at* boundaries of rows and ranges normalized? In test word spaces selection "foo bar baz", selecting from offset3 (after foo) to offset11 includes ' bar baz' with leading space; they preserve inside nonblank span. For paragraph indentation blank, they choose right char to avoid leading. For row-end blank, maybe choose row2 end to include? No.
Original C-1 "quote 空静默丢标注" for start; side correction need "start=行尾定位后阅读序越过紧邻空白到**下一行首**"; That logic implemented only BR. Comment in BR branch says "start boundary=越过紧邻空白到下一行首"; blank span branch no side. But header says "纯空白/空文本 span 标记（字形盒真实）→ ... 无左侧→右侧... (段首缩进空白吸附)", not necessarily all start side. Could be design: Pure whitespace span with left text (line-end whitespace) should snap to left row end, because selecting starting at trailing spaces should not cross into next line? But side issue: If user starts there and drags left, same? Suppose click row-end whitespace and drag left: Range from start inside whitespace? Browser anchor at click inside whitespace (visual left? actually physical right end of row) then dragging left, Range start earlier text, end inside whitespace. But selectionToAnchor start is inside blank span, side start, expected quote row text? Need candidate? Let's create with full text "AB second" no next? If click trailing whitespace at end of line and drag left, physical text selected from space? Wait if blank after word, dragging left selects from right to left over blank and word, so selected text content includes trailing space (if present) then word? In reading order it's word + space? Browser Range from start at earlier word to end inside trailing space. Start boundary likely earlier word (not blank), end blank. So no start blank.
If click at row-end beyond trailing space (right of trailing space) and drag left, click might be in inter-line gap or BR marker, not whitespace glyph. For BR branch handles. So blank span only selected when starting inside whitespace *run at beginning of next paragraph*? Could be.

Need think of F-A10:
- Line break marker `<br role=presentation>` is inserted between lines when no text items (blank line).
- Whitespace-only spans can exist for spaces between words on same line, or for paragraph indentation at line start. "行尾/段首空白点击" click near line begins maybe actually in br marker, box at column left due line break point? Browser may assign to br marker rather than visual blank.
In Chinese/PDF, line break `<br>` is located where line breaks. Its box has x at left margin but spans 2 row heights. It is used at line wrap, not trailing spaces. Real PDF no newline char; `<br>` might be between text segments in DOM at the wrap point. If clicked right of row2 end, maybe browser chooses text node end? Hmm.

Let's focus on codeability.

Bug hunt other functions.

`advancePastBlanks`:
```
const idx = spans.findIndex((s) => s.node === rowEnd.node)
...
for i=idx+1; i<spans.length; ...
if (spans[i].node.data.trim().length > 0)
```
If the first nonblank span's text starts at offset 0 but the span's text is e.g. "\nHello"? trim length >0, data starts with newline whitespace but nonzero. It returns offset0, so quote starts with leading newline/space. They intended skip pure blank markers only and not arbitrary leading whitespace in nonblank spans. If a text span begins with multiple spaces before visible text (real indentation), it is considered nonblank and quote starts with whitespace. In C-1c e3 separate ws-only span is skipped. What about click line start represented as blank span e3 and no BR? blank span branch right returns offset0 of right nonblank, also includes any leading spaces inside that text span. They rely on pdf spans dividing whitespace only.
`trim` skips any whitespace-only text. Good.
Potential issue with `rowEndFallback`: if no next nonblank after rowEnd, returns fallback (same rowEnd). But if there are later whitespace-only spans at page end with no text, fallback rowEnd. okay.

MarkerAt for BR branch: It treats any `<br>` as blank marker, but if boundary at element slot adjacent to `<br>` but not actually at visual blank? E.g. a `<br>` used for formatting inside text with no role? Pdf.js text layer br role presentation. They don't check role or tag from `.textLayer`; any br in root is blank. If root contains structural br line break, normalization might unexpectedly snap read lines based on br box. Since br inside text layer only. okay.

boxOf checking all-origin zero: If a real blank marker has `getBoundingClientRect` x=0/y=0 but width zero? It can happen if marker at top-left origin. Then it's considered jsdom no-layout and no normalization. In real PDF, text layer root maybe positioned in viewport not at screen origin. But if marker exactly at viewport origin (x=0,y=0), it returns null even with nonzero width/height? Condition b.x===0 && b.y===0 && b.width===0 && b.height===0 requires all dimensions zero; if x=0,y=0 but width>0 height>0, no false. For zero-width marker at origin x=0,y=0,w=0,h=2? w0 h2 => no false? Condition width0 height0 yes? It requires width===0 && height===0. If h2, okay. Real zero span x=0,y=0,w=h=0 could be true. No layout env jsdom all origin.
Potential issue: `boxOf(span.node.parentElement)` for collectSpans text nodes: If text node directly under root, parentElement=root. jsdom root not stub; zero => null. In actual root getBoundingClientRect nonzero. Rect for parent root huge full page. Text spans, if each text node direct child, boxOf returns root box for every span. nearestRow all rows same huge? Tests set rect on span elements, text node parent is span. Actual pdf.js spans exist. If direct text under root and root rect covers entire page, all rows same root box, no vertical distinction. Does reader text layer create spans? likely yes collectSpans probably only called to collect specific span's text? Need know.
collectSpans may return more than text nodes, includes `.span`? Wait they named collectSpans. Could be from annotation-anchor and include `<span>` Elements as spans. Let's infer from implementation: In tests `collectSpans(root).spans` boxOf(span.node.parentElement): each span.node is Text and parentElement is mkSpan. In code actual they could have span node = Text. Need no issue.

Potential issue: `nearestRow` root may be a large text layer with thousands spans; if some spans have blank parentElement? spans likely all in span.
Potential issue in visualRows: It uses `r[r.length -1]` as previous item. If a row gets many items with varied centers, maybe. no.

Potential C-3: markerAt kid indexing:
- If node TEXT_NODE? C-3 says "元素槽位按 childNodes（Range 语义），防裸文本节点混入错位". If selection boundary at element offset 2 of root where childNodes=[s1, bare, s2, br], offset2 is before s2. markerAt checks child[2]=s2 (not marker) and child[1]=bare text not element, null. So normal. But Range set boundary at offset2 equals after bare before s2. Good.
Could there still be C-3 issue when offset uses children ignoring bare? They fixed by childNodes. OK.
But what if offset points after `s2` (offset3) with children [s1,bare,s2,br]; if click after s2 before br? markerAt child[3]=br -> marker. If offset is after br (offset4) child[3]=br previous -> marker. fine.

Potential `probeTextLength` for rowEnd node replacing original marker boundary. Suppose range end originally in root offset before br after s2. Snap end maps to s2 text node data end. `probeTextLength(root, s2Text, s2.data.length,'end')` returns offset prior? likely total before after? If original offset before br after s2 equals after s2 text's DOM end, coordinate = fullText before br (s2 end). snap doesn't change coordinate. Good.
For start original at br before s2, side=start maps to s3 start maybe advance. If root offset before br is after s2? Wait depending br DOM position. Test root [s1,br,s2,s3], br before s2, original boundary root offset1 before br coordinate after s1 (8). side=start maps to s2? Actually nearestRow row? C-1a side start with br center row2, rowEndOf = s2 end=17, advance to s3 offset0=17. It maps to 17. original coord 8; changed to 17. This maps click from blank that appears before row2 physically to end of row2/start row3. Good.

Potential issue with text content offsets in fullText and node.data.length are UTF-16 code units. If marker text contains unicode surrogate pairs, offset returned `.data.length` and snap tests. selection boundary offsets are UTF-16. okay.

Potential issue: Range offset inside element might count child nodes while text content includes text nodes. Good.

Potential issue: "行内栏聚类" threshold uses current `r` height, not average. If many fonts? no.

Could terminal diff have not included mutations? User asks "四变异判别力" etc. We need verify tests arrays. There are 15 tests? Let's count: actual file has? We'll count tests:
1 row br end not down
2 img2
3 start blank indentation
4 word space zero
5 column gap blank
6 no layout
7 non blank
8 zero dimension
9 br double column
C-1a
C-1b
C-1c
C-2
C-2b
C-3
That is 15 (yes). Claims 15/15. Need maybe all assert could be vacuous? Let's check test mechanics:
- `anchorOf` creates range and selection from arbitrary nodes; but if range.setStart/End throws due invalid root? Tests probably pass. 
- `document.getSelection()` may be null in jsdom? They check `sel?.removeAllRanges()`, then `sel?.addRange`; selectionToAnchor(null) returns null? But tests expect not null. In vitest jsdom, selection exists? yes.
- They don't `beforeEach` clear? afterEach only. Fine.

Potential vacuity: snap module may not be actually imported? It is in anchor-serialize. tests always pass selectionToAnchor. Yes.

Could "w=0/h=0 but origin real" test set `rectOf(e5, {top:120,bottom:120,left:90,right:90})`; boxOf won't return null x/y? x=90,y=120,w=0,h=0 -> condition false because x not0 y not0. Good.

Now identify real flaw. We need decide final.

Let's examine claim "无布局量测环境（jsdom 含原点四零盒）原样". boxOf tests only root spans no rect. But if jsdom's getBoundingClientRect returns x0 y0 w0 h0 for **non-stubbed** br? For all no layout. `snapBlankBoundary`: markerAt returns br1 parent? Wait in no layout test:
```
s1 span text; br1; s2; s3 appended. anchor to root offset1
selectionToAnchor -> snap end marker br? markerAt(root,1) returns br1. boxOf br1 = el.getBoundingClientRect() jsdom all zeros => null, return original. a.end=8 quote "AB first". 
```
But if no layout for marker box only? In real if marker zero all at origin should no normalization. fine.

Potential test "普通文本 span 边界" child root s1,s2; root no rect. markerAt root offset2 no marker -> original. quote "AB firstCD second". OK.

Potential issue: `isBlankMarker` on `<span>` whose textContent contains nonblank due nested elements? For a BR no text. If marker is `<span> </span>` yes. But in pdf.js, "pure blank span" may contain `&nbsp;` text " " and later after text another node? no.

Potential issue: `spans = collectSpans(root).spans` called in `nearestRow`, then `advancePastBlanks` calls `collectSpans` again. That means if collectSpans has nondeterministic? no. O(n log n) twice but fine.

Potential issue with DOM references: `rowEndOf` returns tail from row which might be before marker and at or after? For BR branch, if a marker visually overlaps a row that appears after marker in DOM, rowEndOf may return a node whose text is after another text span that lies between marker and row in DOM? It uses visual. advancePastBlanks from rowEnd's idx after actual row text. Good. But in maps with rowEnd text not identifiable by DOM order, idx is fine because can scan.
Potential issue: If rowEnd of nearest row is not physically at row's line end due multiple spans: reduce by right max, but chooses rightmost box. If the row includes text from two lines because visualRows not merged? row includes only same vertical line. Good.
Potential issue: For a text row spanning multiple columns/groups, rowEndOf selects nearest group. If marker box is left, row within group; if no left? okay. But if marker horizontal coordinate is inside group not between columns, distance 0. If group contains multiple columns? Groups separated threshold. If marker x in blank area between columns outside all groups, rowEnd chooses nearest group edge. If left column right=100, right col left=150, marker x=125, distance both25; groups sorted, tie first -> left. In comment says blank span box between columns -> left column. Good. If BR x left edge, left group. If marker x in far left of a two-column page but belongs to right column? No.

Potential issue with columnGroups threshold and box height h: If text font box heights vary, threshold uses current r's height to compare with previous? Actually:
```
h = Math.max(2, r.box.bottom - r.box.top)
if g && r.left - prev.right <= Math.max(20, 2.5*h) merge
```
If current and prev have different h, uses current height. Could merge with huge current h. Not issue maybe.
Potential issue: It treats x gap threshold too large might merge adjacent columns separated by 20px. But annotation uses similar? hmm. In fake tests col gap 80. Fine.

Let's inspect required ticket item 5 "G2 不可修论证与事件层独立票建议的接缝处置" maybe there is residual known bug? We need identify from docs? Not enough. Could there be event layer independent issue causing "real3 单次手势竞态录指纹（1/4 次未达立案线，浏览器侧非本票面）" in Gate1 table. It mentions real3 one-time gesture race fingerprint; not ticket. Could be unrelated. We need perhaps challenge "事件层独立票建议" but no implementation. User asks final terminal review, maybe expected B due G2? But Gate2 is code review after repair; need inspect.

Let's parse source header and tests for possible "constant assertions not vacuous". Need see C-2 mutation "new fix face four mutations all red (1/1/8/1)" maybe variants would check algorithm. Could assess if mutations target test. Not in diff. Need maybe identify blind spot.

Let's reason about C-1 flip fallback: implemented after using normalized startBoundary/endBoundary. But code:
```
let start = leadLen
let end = total - tailLen
if (end < start) { [start,end]=[end,start] }
if (end <= start) return null
```
This flips if normalization causes start>end. But `probeTextLength` might itself return null if startBoundary/order weird. Fine.

But note **flipping can sabotage user selections that are intentionally reversed?** Any valid DOM Range has start≤end in DOM, but with DOM/visual order mismatch, start may sample later content. Flipping selects the *gap* between original boundaries rather than original outward content. E.g. user starts at row2 end blank (physical) and drags **forward** to row3 end; original DOM boundary at br before row2? Wait physical direction matters.

Need understand selection direction hidden in Range: Browser Range doesn't store visual drag direction except text selection includes selected content; user dragging right from row2 end to row3 should select row3 text. Original DOM Range after interaction should be from br boundary to row3 text, DOM order maybe? Our snap start=row2 end/nextline, end=row3 end. If start > end? row3 text is after row2 end, so no flip. quote maybe row3 content with leading? ok.
If user starts at row2 line blank and drags left, resulting DOM Range likely from middle row2 to line blank? Wait browser's Range from selection generally anchor is start of selection physically? If drag left, anchor (press point) right of selected text? But Range start/end are normalized by DOM order: When you drag from right to left, anchor is at initial press point (right) and focus at current drag left. Range's start is focus (left) and end is anchor (right) unless DOM order reversed? Since both in same text line, DOM order = left-to-right, so start earlier, end later. So start is current drag point, not br? Selection starts at (s2,3) left and ends at root br slot right? Wait root br slot may DOM before row2 text or after? In test, br before s2, so root br slot is DOM after s1 before row2, **left of row2** logically in text? The visual line row2 begins after s1 at coordinate 8, root br visually before row2? If br DOM before row2 but visual line-end? Ambiguous. Actually in DOM order row2 begins after s1; br slot before row2 is before row2 content; if Range start=root br and end=s2 offset3, DOM order root br appears before s2, so start coordinate 8, end coordinate 11, not reversed. But snap normalizes start to row2 end coordinate 17 (right of end11), causing start>end. So DOM Range did not correspond reversed. But after browser user drags left? It selected text? Wait if root br slot coordinate 8 is after row1 before row2; Range from 8 to11 would select "CD"? If snap not applied quote "CD "? The visual selected maybe? Hard.

Why did side=start choose to normalize DOM slot at br to row end? It considered br's visual box row2 near line end, but br DOM before row2. Click at line end maybe Range could set anchor at br slot before row2 due malformed DOM-to-visual. It's okay.

Potential flip issue with actual direction: User selects from br line-end anchor to later row3; mapping start to row3 text start, end=row3 start? If click anchor at row2 end blank and drag into row3:
- Original DOM range maybe from br boundary before row2 text to row3 text? But visual logical start row2 end to row3? Hard. Normalization of start br maps to next row **after row2**? Wait br marker visual row2 line end, side start returns advancePast rowEnd row2 -> row3 start. If br DOM before row2 text but visual row2 end. Then range from br to row3 drag after row3 before? end maybe row3 start? start=row3 start equals end? No quote null if select no content.
Actually if user starts at row2 end blank and just drags a little into row3, likely should select something. Maybe no issue.

Could actual bug with flip and `end<=start` after swap if normalized start==end? It returns null. Good if empty.

Potential issue: flip fallback may alter *boundary side* not just values. Quote starts at min, ends max. But verifyQuote lead/suffix? It may still okay. However if original start > end due start mapped to next paragraph and end mapped earlier, after flip quote could include row text. C-1 tests. Fine.

Let's see `snapBlankBoundary` order of side branch: For any blank marker with tagName BR, `advancePastBlanks` returns rowEnd fallback if no next text. But for start on a BR **not followed by any text in DOM** but later in visual row due marker DOM at end, if marker visual line end and next visual row text appears earlier in DOM? `advancePastBlanks` no nonblank -> fallback rowEnd of current row. What if there is next visual row whose text comes earlier in DOM (DOM≠visual), then start wrongly rowEnd? But unit tests C-1b have br2 DOM after s2 but marker visual row1 and side end only. If side start with such br, no next nonblank after br; rowEndFallback row1. It would not advance to s2 although s2 is visual row2 but DOM earlier than br. Could be if start clicking line-end marker that's DOM after entire page but visually preceding row2? However if selected from row1 line break to later text? Actually if marker visual row1 but DOM after s2, start should next row2 start=s2. But advance scans after br none. So bug in model? Let's map C-1b line: root [s1 row1, s2 row2, br2 marker visual row1 near text row1]. This represents marker's DOM order **after all text**, but visually at row1. If a user selection starts at row1 line-end blank marker (br2) and drags to row2 text, DOM Range? Since br after s2, start at br slot (after full document) is after s2 in DOM; end s2 text earlier. DOM Range normalized would start=s2, end=br; Start boundary not br, because browser Range always start≤end; Start is s2 offset? If user clicking at marker and drag left to row2? Hard. The boundary that's in marker is likely the **end** of Range because DOM order after all text. For selecting text after row1 line-end through row2 (right/down?), no marker at start maybe? Let's not overcomplicate.

But possible flaw side logic with DOM order is susceptible.

Potential detail: `selectionToAnchor` likely normalizes the **selection** Range's start and end but not selection direction. User can select backwards; textQuote self-healing later. However they flip only if normalized start>end. OK.

Need inspect header "verifyQuote... textQuote self-heal locate include 32 chars". Not in diff. Maybe after selectionToAnchor, coordinates used by annotation storage only quote? If quote non-empty.

Potential issue "quote 为空时返回 null"? In flip fallback, if normalized boundaries equal no selection. If root full text total includes text outside Range? Maybe.

Let's perhaps run imaginary mutation to find assertions weak. For C-2, they test `nearestRow` tie. But actual visualRows returned two rows. In C-2 test, BR's `top`/`bottom` are 108-128 h20, marker box center118. RowA center111 rowB center125; dist 7 vs7. `nearestRow` distance to rows: rowA center of one item = 111 diff7. rowB 125 diff7. tie first = rowA. Good. C-2b br center121 rowB diff4 vs rowA diff10 => rowB. Good. Tests robust.

Potential issue in visualRows: Sorting items ascending by center then using current row's last element. It does not compare root to first item; e.g. if items with centers 100,110,130, threshold5. 100 merge110, new item130 center diff20 > row's prev110? if row vector [100,110], prev item110; 130 diff20 no. if items centers100,104,110,115? threshold5, row [100,104,110,115] all adjacent diff5. ok.

Now consider empty row with marker at image (no text). nearestRow null -> original. Fine, selection on images? image annotation? Maybe if boundary at image blank? But test? Not.

Need find actual spec/code inconsistency: Header says "行尾/段首空白点击解析为 pdf.js 空白标记 span 槽位（DOM 序≠视觉序，实测两方向跳跃：丢下半段/img2 带下一段），按标记盒视觉行重解析到本行行尾/行首；非标记边界与无量测环境语义零变". They say "本行行尾/行首" in diff. For BR start says "行尾定位后阅读序越过紧邻空白到下一行首". For blank span with left, snap to line end *even if side=start*, contrary to "行首"/next line. But documented blank span branch: "盒左侧最近同行文本行尾...". Maybe because pure blank span at line start with left? If it has left text, it is not "line start" but "line break trailing whitespace" so snapping to line end. Start side not needed because paragraph start blank span won't have left. Blank span at reading-order row start has DOM text before visible row text but also might have left text from previous row/column? Geometry: if it's leftmost, no left in same row. So yes.
Thus no hidden issue.

Potential problem: `markerAt` checks if a text node's parent is a blank marker (all text content whitespace). But if boundary text node is **the empty text node inside an empty blank marker span**, parent is blank -> marker. If selection boundary is at offset0 of the text after a `<br>` maybe marker? okay.
However `markerAt` doesn't consider boundary positions inside text nodes that are **adjacent to marker** but not inside blank. For an element offset after text? Range boundaries do not use text if click at element start? fine.

Potential issue with "同源"—fast path no normalize and settle snap can cause jump during drag. But this is documented accepted "快路径（selection-evaluate.visual）不经本模块—拖选期瞬态带不归一化，mouseup/settle 全量同帧覆盖吸收（INV-58 已知边界同族）". Could be a real UX inconsistency where annotation text hint during drag differs final. But maybe ticket? Hmm.

Need review G2 in output? There is "G2 不可修论证与「事件层独立票」建议的接缝处置." We don't have event/G2 report. Maybe "G2" is a finding in previous review that cannot fix; should be independent ticket? Maybe code does not address. Need maybe note not enough evidence.

Let's find exact instruction: User lists 工单 with 5 checks:
1. 处置核对 side semantics, flip boundary; C-2.
2. 宪法红线+测试面: 15 assertions non-vacuous; four mutation discrimination.
3. Machine: full 1513 and locks.
4. Cost.
5. G2 unfixability and independent ticket suggestion.
Then "Output [B|W|N]+ one-line overall (可否放行)." We are adversarial Gate2. Need perhaps provide findings and one of B/W/N. Let's produce structured in Chinese.

Need determine final verdict after findings. Let's search more systematically.

Given code not include annotation-anchor internals; assume high risk: `advancePastBlanks` uses `span.node.data.trim()`, but if `span.node.data` undefined because `collectSpans` spans are Element? Need verify from annotation-anchor. RowEndOf also uses `tail.span.node.data.length` so if NodeSpan.node is not Text, data maybe Element text? Could be. Let's look at typical annotation-anchor collectSpans definition perhaps returns text nodes called spans, with `.node`. In test code, mkSpan sets span textContent and rect; there is text node. They pass `s1.firstChild` as range boundary. So collectSpans returns text nodes? In code:
```
for (const span of collectSpans(root).spans) {
  const b = boxOf(span.node.parentElement)
...
  items.push(span)
...
{ node: tail.span.node, offset: tail.span.node.data.length }
```
If span.node is Element `span`, `.data` undefined. Known likely Text. In annotation-anchor, `collectSpans` returns Text spans. Need not.

Potential issue with jsdom: `mkSpan('')` creates no child text. But `collectSpans` if includes empty Text? no.

Let's inspect selectionToAnchor more. Need infer full code from diff maybe:
At line 190:
```
export function selectionToAnchor(
  root: HTMLElement,
  selection: Selection | null,
): SelectionAnchor | null {
  if (!selection?.rangeCount) return null
  const range = selection.getRangeAt(0)
  const spans = collectSpans(root).spans
  if (spans.length === 0) return null
  const total = fullTextOf(root).length? 
  if (total===0) ...
}
```
It might already transform selection boundaries to root coordinate. `probeTextLength` likely takes root and boundary node, offset and side. If `snapBlankBoundary` returns rowEnd starting at s2 text node offset9 and end node s2 offset? Good.

Let's think of "leading/trailing whitespace in offsets": total = fullTextOf(root).length presumably sums text from spans. But if snap start returns s3 offset0 in a span whose `data` is "EF third", leadLen computed by `probeTextLength` counts all text nodes before s3. If collectSpans ordering ignores pure blank text spans? It uses same collectSpans as advance and probe. Need no.

Potential hidden bug: `advancePastBlanks` calls collectSpans(root) but `rowEnd.node` may point to a text node that appears **multiple times**? Text nodes unique. It find index by object. ok.
`nearestRow` calls collectSpans(root).spans and calculates box for every span. But `collectSpans` may exclude empty/whitespace text nodes? Need know. If excludes br? It probably includes only text? If `collectSpans` skips whitespace-only nodes, then `advancePastBlanks` uses spans including nonblank only, so it will not walk over blank marker? But tests rely? Let's infer from C-1c expected 18 with e3 whitespace. `advancePastBlanks` iterates `spans`. It calls `spans[i].node.data.trim()`. If e3 pure whitespace text was excluded by collectSpans, then after rowEnd s2 it would next see s3 and return offset0 with leadLen 17 (if fullTextOf also excludes blank but fullText includes? Wait fullTextOf probably uses same collectSpans so if excludes whitespace, total 25? Then s3 start=17, not18. Test's expected "全文='AB firstCD second EF third'—18 includes e3 blank" indicates collectSpans includes the whitespace text node. So okay.

Potential issue with `collectSpans` return order: It might filter out blank markers but includes whitespace text spans? hmm.

Let's examine mock `mkSpan(' ', ...)`: e3 text node data ' '; `document.createTextNode` is child. The code in annotation-anchor maybe `collectSpans` collects nodes that are `Element` spans? Actually might collect each `<span>` element and use `getBoundingClientRect` as NodeSpan? If so advances uses `.node` maybe span, `.data`? Wait perhaps `NodeSpan` type has `node` and `text` etc. In code `span.node.parentElement`, if node is the `<span>` element, parentElement is root, and root's rect maybe not stubbed. But in tests mkSpan stubs `<span>` not root, so parent root no stub -> all boxes null, tests would fail. So node must be inline's text node for boxOf to return stubbed span rect. yes.

Potential issue with `rectOf(el, b)` override `el.getBoundingClientRect`; for `span.node.parentElement`, parent element's own method is overridden. Good.

Potential spec C-3: `markerAt` for nodeType TEXT_NODE doesn't check `root.contains` if text parent marker blank. It returns marker if parent blank; later root.contains(marker) true. If text node outside root? selectionToAnchor likely bounds? But markerAt can return marker inside? If boundary text node in root, yes.
Potential crash: If `node.nodeType === Node.TEXT_NODE` but `parentElement` is null (e.g., text node outside document, attribute?); `parentElement` can null for DocumentFragment text. Selection boundary text node always has parent if in doc? Could be detached but sel? root maybe. But snap could be called on detached? no. If parent null, isBlankMarker(null) handles null false, returns null. If text node parent is DocumentFragment no parentElement? Node.parentElement climbs through element ancestors; null if no element ancestor. root may be element? range inside root text under element, parent can text layer? no.
Potential code `span.node.parentElement` if span.node is a Text node directly under root Element => parentElement root. In actual if root itself is Text? root HTMLElement. Return element may have null? no.
Potential if `span.node.parentElement` is a `<br>`? Text cannot be child br. no.

Potential issue with `boxOf`: It returns null if el's `getBoundingClientRect()` throws? no.
Potential XSS? no.

Let's inspect "F-A10 diag real markers can have `<br>` not necessarily tagName 'BR'? In HTML DOM, uppercase? tagName 'BR' always. Good.

Now test count 15 "all red mutations" if there are mutations. We can't verify. But maybe there are unmutated blind spots:
- `end` boundary on blank span at line start? If end boundary at leading indentation blank marker before text, code left none -> right text first char (offset0). End = first char. This means selection ending at line start indentation blank doesn't include indentation? It maps end to first char; if user selection from previous text to indentation blank and then further? okay.
- End boundary at row-end blank span with left -> code maps to row text end. good.
- Start boundary at line-start blank span -> maps to row first char, no leading blank. good.
- Start boundary at interior whitespace between columns? maps left line end; side start? maybe not.
- Blank marker with **left candidate and side='end'**: end should be row line end. Good.
- Blank marker with left and side='start' problematic but likely not start marker.
Could write a test to expose side for blank span. But no evidence what expected? Let's construct according to user story: If start boundary is a pure blank marker span (not BR) with left text, what should side start do? If side semantics defined all boundaries, a start at line end should not map to row text end; it should advance. Yet code branch `if side === 'end'` only exists for BR. The side parameter for blank span branch ignored except not used. This is a likely C-1 residue: "起点 br 槽位" only br, but "blank markers (span)" C-1 may apply too. In earlier finding C-1 "起点 br 槽位恒吸行尾" specifically br. Disposition C-1: side params (start=行尾定位后越过空白到下一行首). It says "side 参数方向语义（start 越过空白到下一行首 vs 页尾回退）" with BR only. In header pure blank span branch maps start to **line end** not next line, but if marker is line-start with no left, next line start. So start side semantics still can result next line in that case. For line-end blank, no.
Let's see C-1 test uses br marker, not ws-only. So maybe path only affected by `<br>`? But the original mechanism includes both. Did mutation test "1" for C-1 likely remove binary side, causing img? We don't know.

Let's identify actual code issue from blank span branch's geometry: It chooses left/reight based on horizontal overlap with marker box; but for **side='start' and marker at line-start indentation**, if there is another blank span to its left? no.

Maybe a stronger real bug: `rowEndOf` if marker has pixel box inside a group but there are text spans **to the right across a column gap** considered same group because gap <= threshold; then tail may be far right column, not nearest column. But threshold robust.

Potential issue: `nearestRow` duplicates collectSpans result each time; no.

Potential issue with `snapBlankBoundary` calls `root.contains(marker)` but marker may be contained in document but selection root maybe a shadow DOM text layer? In shadow root, `root.contains(marker)` okay if same.
Potential issue: snap on boundary in an element whose child index includes comments? Range offsets don't include comments? In DOM Range element offset counts child nodes including comments. Comments can be childNodes; markerAt checks childNodes offset. Fine.

Potential "offset" after normal text span but before blank marker: If marker is a **non-element comment?** isBlankMarker requires EL. not.
Potential if a blank marker span has no `getBoundingClientRect` in old browser? they check function.

Now inspect output requirements: It asks for "B/W/N]+一行总评（可否放行）". Perhaps B means block, W with issues, N ok. Need include findings if any. If I only uncertain, maybe W but don't block. But need review as adversarial; maybe need find actual issue to block. Let's explore if there is policy requirement "宪法红线+测试面" etc. Could be "Gate 2" from meta: Need not just code review but also confirm tests. We need perhaps output B if any functional bug. Let's search test for "bare text child offset" C-3: They create bare text node after s1 before s2. Range end at `(root,2)` is after bare before s2. Since selectionToAnchor total uses all text, `end= s1 len + bare len = 4+3=7?` They assert `4 + bare.data.length` =4+3=7, quote "AAAA" + bare.data. Let's compute test expects `end=4+bare.length`, quote `'AAAA'+'裸文本'`? Wait `a!.end.toBe(4 + bare.data.length)` =7; range from s1 start0 to root offset2 includes full text before s2? root childNodes [s1,bare,s2,br], offset2 after bare. If no marker snapping, end boundary before s2. But fullTextof includes bare text; probe end at boundary after bare -> total - tailLen? tail before s2? let's compute fullText 'AAAA裸文本BBBB' length 4+3+4=11. probeTextLength end after bare maybe 7. yes.
selectionToAnchor's quote likely `fullText.slice(start, end)` = start0 end7 "AAAA裸文本". Good.
But if markerAt with children offset2 in old code would check children[1] = s2? Actually old C-3 used Element.children indexing? "markerAt 用 Element.children" would index children list excluding text nodes. root.children=[s1,s2,br]? offset2 maybe? old would check children[1]=s2 or children[2]=br and maybe get br. Now no. Test checks.
But possible actual old anchor-serialize uses childNodes but maybe markerAt Element offset after `s2` with bare? okay.

Let's examine definitions and potential "offset in Element after text node but childNode at offset is blank marker or previous blank; markerAt ignores if child is **an element followed/followed by blank text Node** (i.e., blank Text sibling)? isBlankMarker only Element. If blank marker is a text node in root not wrapped in span, markerAt won't detect. In test C-3, bare text is nonblank. In pdf.js blank text could be direct text child. But they handle TEXT_NODE boundary: if boundary inside direct blank text node parentElement root, root textContent maybe root contains all page text nonblank so isBlankMarker(root) false. Thus direct text blank boundaries not detected. Is pdf.js text layer blank items ever naked text nodes rather than `<span>`? Usually each text item is in span (class). They said "纯空白项 span". So markers are elements. Fine.

Potential issue with `boxOf` using `getBoundingClientRect` on parent of text node. In `mkSpan`, text node parent has `textContent` nonblank. collectSpans all. But for whitespace text `e3` parent is blank and *also collectSpans includes it*. In `nearestRow`, items include e3 text span with a box. So nearest row for a marker may include blank marker itself if marker is also a collect span. Example marker is blank span e3 in test C-1c, side? snap is invoked on **row3 start via br**, not blank. nearestRow for br's row2 chooses items [s2] only? visualRows includes s1/e3/s3 as spans. It sorts centers100? Let's calculate marker br center128, visual rows:
s1 center105, s2 center125, e3 center145, s3 center145. visualRows: centers 105,125,145 diff 20/20 threshold5, no merge. nearest row candidate centers row2=125 diff3, row3=145 diff17, row1=105 diff23. Good. It doesn't include blank marker because blank marker isn't in marker relation? For marker blank branch e3 itself is marker, but nearestRow doesn't exclude marker; e3 text node is included, and rowEnd? For e3 left/right picks s2. No issue unless marker's own span is nearest and left/right weird.
Important: For **BR branch**, BR is an Element not containing text, so not in collectSpans. Fine.

Now consider "行内栏聚类 by x gap". In row with blank marker, rowEndOf picks group based on marker x. If marker is blank span e3 at x10-16 and text s2 at x16-86, group sorted left: e3 box if included? row variable includes all row items from nearestRow. Wait code for blank branch:
```
const left = row.filter(r => r.box.right <= box.left+1).sort(...)
const right = row.filter(...)
```
`row` includes e3? Since e3 is nearest row? Let's trace C-1 test: input marker is e3 at (root? Actually start inside e3), snapBlankBoundary(e3 text): markerAt returns e3 Element. nearestRow markerCy125. If collectSpans includes e3 text span as item, visual row at center125 includes e3 white and s2 maybe? s2 top120 bottom130 center125, e3 same row center125. They are horizontally adjacent, no gap. visualRows row = [e3, s2(s?) maybe]. Then left = items with right <= e3.left+1 (e3 box left10 right16). s2.right86? >16 no. e3 itself right16 <=17? yes but e3 is text blank and its span.node? But `left` filter includes e3, sort by right, so left returns e3 itself! Then returns node e3.textNode, offset data.length=1, which is the blank marker's text end, not s2. That would not snap to line start. However e3 is `mkSpan(' ')`, and collectSpans includes it as span. But rowEnd? Let's check if e3 itself is inserted by markerAt and also as text item. This is a serious self-inclusion bug? In blank span branch, after marker found, row is computed including marker's own text span. `left.filter(box.right <= box.left+1)` includes marker itself because its right equals box.left + width? For e3 left10 right16, box.left=10, condition 16 <= 11 false? Wait use `<= box.left + 1`: `r.box.right <= box.left + 1` = 16 <= 11? false. Wait marker is e3 box {left:10,right:16}. It is not left candidate. Right filter `r.box.left >= box.right-1`: e3.left=10 >= 15 false. So e3 excluded. Good.
If marker zero width e5 left90 right90, condition left <=91 true so marker itself left; right condition left >=89 true also. Filtering and sorting might pick marker itself. Test zero dimension:
- Marker e5 is blank empty span with box left90 right90 top120. collectSpans? It has no text node, so not in collectSpans? Wait mkSpan('') no text node. So no marker in items. In actual blank span maybe empty element, no text; collectSpans no text. fine.
If marker is a whitespace text span with width zero? e.g. box left90 right90 but textContent ' ' actual maybe collectSpans includes? then it could self-select. But actual no.
In C-1c e3 used text blank span and marker via text boundary? Wait snap's marker e3? Let's trace test C-1c:
```
const e3 = mkSpan(' ', top row3); root includes.
const a = anchorOf(root, {node: root, offset:1}, {node: s3.firstChild!, offset:2})
```
For start at root offset1 before br -> snap BR, not e3. e3 inside scanned skip, not snap. So no.
Start blank indentation test:
```
start boundary e3.firstChild offset0
```
Marker = e3, row includes e3 item. For e3 left10 right16, left none? left candidates s3? There's no text left of 10; none. right sort includes s2 maybe? Wait row for marker e3 in test with DOM [s1 row1, s3 row3, e3 row2, s2 row2]. Let's compute e3 top120,left10,right16; s2 top120,left16,right86. e3 right16; right filter requires r.box.left >= e3.right -1 =15. s2.left16 qualifies, e3.left10 no. So returns s2 offset0. Good.
If e3 were zero-width with whitespace in same row and text to right at left16, e3.right=90; condition s2.left>=89? no, returns marker maybe. But zero-width whitespace with text content weird.

Could other self-inclusion cause left wrong? For marker box with width actual, self excluded due both left/right? If marker box width > 1, its right > left+1, left filter false; its left < right-1, right filter false. So self excluded. Nice. For empty text marker? no item. Good.

Potential issue: `left` sorting by right desc but includes markers from same row (e.g., other whitespace)? If some right <= marker.left+1, yes those are left of marker; okay.
Potential issue with marker width: blank span with actual spaces width; text at left ends exactly at marker.left. left includes r.right <= box.left+1. Good.

Now "BR branch": rowEndOf row doesn't exclude br because br no text. good.

Potential issue with `visualRows`/nearestRow: If marker blank span has text item and row contains no nonblank text, row left/right none returns original marker. That means if clicking blank span that is only text on its visual line (e.g., whitespace line), no snap. fine.
Potential issue: blank span branch returns `right` text first char if no left but doesn't verify right line is same **reading**? If marker at line start and only one item in row? no.

Let's think of `rowEndOf` for row with blank span items too: A visual row might contain pure blank text item(s) followed by nonblank; but row is nearest to a BR marker, could rowEndOf pick `tail` blank text item as rightmost item and return it (its text length). Example row consists [blank span '      ', text 'AB']? For nearestRow if br at next line? rowEndOf's tail by right pixel; blank span could extend to right edge? Usually blank span glyph width maybe spaces not beyond text? If blank text items are rows of spaces, rowEnd could be whitespace string; return its full text, causing ranges include whitespace. In PDF, whitespace spans probably have width proportional to spaces; Could be at end-of-line run of spaces? Rare.

Potential issue: `rowEndOf` returns "行尾文本末" but if group's rightmost item's data ends at offset data.length; in fullText, there may be additional whitespace text *after* it but same row? not if rightmost. Good.

Potential issue "start=越过紧邻空白到下一行首"—advancePastBlanks returns first `nonblank` span's offset0, not necessarily "visual next row first char" if first nonblank span in DOM is in same row but a separate span after e.g., nested? rowEnd is endpoint at row group; there should no same row text to its right. But if in DOM there is text with x coordinate to the left but reading order later? no.

Could inspect diff state maybe package includes `selection-evaluate` fast path. They mention if quote during drag transient not snap; "同帧覆盖吸收", maybe a known issue. It might be considered known boundary accepted. Not a block.

Let's look at doc comment inconsistencies:
```
 * - [C-1] 归一化翻转兜底：起点推进可能越过回拖终点（start>end）——互换防有效
 *   划选静默丢；原生 Range 恒 start≤end，仅归一化形态可入此支
```
They claim "原生 Range 恒 start≤end" in DOM document order. True. But note a selection boundary normalized to "element slot after marker" using offset can also produce leadLen and tailLen with **tailLen negative?** probeTextLength likely returns length to start from boundary; If side='end', tailLen = total - extent after end. If startBoundary and endBoundary order in DOM maybe reversed even after normalize; flip handles.

Potential bug: If after flipping, `end` might equal total or 0? fine.
Potential bug: `leadLen`/`tailLen` are computed using probeTextLength on boundaries **after independently normalized**, but probeTextLength may not know side and can return null if boundary node text is not a collected span due root? All rowEnd/advance text are spans from collectSpans; marker original text inside blank span also collectSpan. If marker original is `<br>` element, replaced. If no normalize, original may be element slot not text; probeTextLength handles element offset likely. It returns null if invalid.
If original range boundary in blank text span and blank span branch returns original if no good because no text? But if blank span is not in collectSpans? Wait original element with no text? If boundary is element slot and blank marker empty span, markerAt returns marker. nearestRow row exists; blank branch left/right choose text; no issue.

Potential bug: For blank span branch, if marker is blank text span and there is **both** left and right candidates in the row (line with twocolumns and marker between columns), `left` always chosen, regardless side. For an end boundary between columns, left row end maybe desired; for start boundary between columns, perhaps should choose right column start? Example user clicks in blank between columns and starts drag to right; reading order? In PDF DOM order may be whole left column then whole right? "栏间空白: 空白 span 盒在栏间→吸附左栏行尾；文本位命中右栏首字符→原生语义". They intentionally always choose left. Because reading order (book) likely left column ends, then right column begins. For start side, boundary between columns in reading order? If after left column before right column, should maybe left row end, not right. If start selection at inter-column blank and dragging right, selected text should include right column content? Wait start at left row end before right col would make selecting right content start at correct boundary. If user clicks in gap between columns, there is no glyph, blank range often treated as left column end? Fine. Side start not necessarily always next row; if blank area between columns corresponds a reading-order boundary after left column text, start can remain left row end. So blank branch ignoring side is not fatal. The C-1 "start next line" only for line-break markers at end-of-line, not column gaps.
But line-end blank span can correspond reading-order boundary after row text before next row if no extra text; left row end is correct start because that's after row text and if no character between, fullText coordinate is next row start. If there is an intervening whitespace text attached to line (same as marker), read order coordinate after row text before whitespace might be before marker char, so not next line. In text extraction line breaks do not include actual newline; whitespace span at line end is actual character. If user starts after it, not represented? Eh.

Could see if code's advanced for start from BR is actually **not** side-specific for all marks; It always advances to next nonblank across document, not necessarily next visual line if rowEnd is followed by blank (line indentation). Good.

Potential bug: There are two different "blank marker" types:
- `<br role=presentation>` inserted at line break with no text node? Its DOM position is at point in content order corresponding line break.
- Whitspace span with empty or space text, actual item. For start boundary at a BR *line end*, `advancePastBlanks` walks through later spans until nonblank. But if later spans include current same row? Since rowEnd = row line end; after row end, next nonblank is next content. If next content includes the **same row's next group** (e.g., across a page side?) rowEnd chosen by nearest column group, so not.

Let's examine mutation coverage possible: C-1 flip maybe tests only when normalized start>end from exact br side. They didn't test when flip doesn't happen but start<end with start normalized. There is C-1c. ok.
C-3 test "槽位不邻标记→零变" but doesn't test `childNodes` **adjacent marker** with bare before it? e.g., [bare, br] offset? Maybe not. Mutation likely.

Now maybe there is a compile issue: They import `collectSpans, type NodeSpan` from './annotation-anchor'. Is `type` named export? Need actual annotation-anchor maybe exports namespace? If it exports `NodeSpan`? Existing imports may use `type NodeSpan`? The new module adds dependency on internal function from annotation-anchor. Is circular? Header says "anchor-serialize→本模块→annotation-anchor", but `anchor-serialize` already imports from annotation-anchor; no cycle. However there might be architecture rule anchor-blank-snap imports from annotation-anchor which is lower-level; no cycles. Need check `collectSpans` is exported from annotation-anchor. They use anchor-serialize earlier import `collectSpans, fullTextOf` perhaps, but anchor-blank-snap imports `collectSpans` from annotation-anchor. Not in diff? Known present because anchor-serialize imported same. If not exported, compile error but tests pass. ok.

Potential bug in visualRows "最近单行制" can pick a row with markerCy at boundary between two rows but if one row is blank no text, skip. okay.
Potential issue "等距并列取阅读序上行": visualRows sorted by center and best row tie uses first row by center. But if rows have multiple spans and centers equal? not.
Potential issue in C-2 test: BR box has left5 right5, height from108 to128, center118. RowA center111 and rowB center125. The actual nearest text span to marker center is RowB? Center difference: rowA 7, rowB7; first row rowA. Good. If sorted by center desc, would choose rowB; but code ascending. Good.
In actual physical coordinate, if a BR marker with y from108 to128 covers both rows; center118 lies **between** rowA (106-116) and rowB (120-130), not inside either. There is a gap 4 px. Visually a click at gap should maybe choose row above? Could be but uncertain; they choose rowA only because Reading tie. No robust evidence. The red mutation "4" maybe tests visualRows merge threshold; if merge rows erroneously, rowA+rowB row center118 and rowEnd tail=rowB end; test catches. Good.
Wait if visualRows were buggy merge, rows A/B centers diff14 > max(2,min(h)/2)=5 so no merge; so how did old C-2 bug "0.85× lineHeight two rows" occur? Maybe old sameRow had tolerance larger; new tests not detecting if merge threshold accidentally to 7? Mutation changes merge from >2 to >0.75 could merge? threshold max(2, half height) maybe. Mutations likely targeted.

Now "test assertions non-vacuous": Look at tests with `expect(a).not.toBeNull()`. If snap causes anchor null, not null.
Maybe `expect(a!.quote).not.toContain('EF')` and `not.toContain('R2')` but if quote null no; not.
No issue.

Potential issue in `anchorOf` when document.getSelection() null:
```
const sel = document.getSelection()
...
sel?.removeAllRanges()
sel?.addRange(range)
return selectionToAnchor(root, sel as Selection)
```
If sel null, passes null? `null as Selection` => null; `selectionToAnchor` likely returns null. Tests fail if null. In jsdom, window.getSelection should not null. Fine.

Potential issue `expect(a!.start).toBe(5)` in start blank test: Need calculate expected from total before row2 = s1 'AB'2 + e3? start should after e3? Selection from e3 offset0 to s2 offset9 (CD second len9); original start inside e3 before its space. e3 data length1. fullText order if DOM root [s1,s3,e3,s2] = 'ABEF CD second' no spaces between AB and EF => s2 begins after "ABEF " five, yes start=5. It returns s2 offset0. quote CD second. If no snap original quote from pos? start inside marker offset0: boundary before e3? fullText before e3 includes AB+EF=4, not5; Wait e3 is at position index4? Let's compute root text order s1='AB'(0-1), s3='EF'(2-3), e3=' '(index4), s2 starts index5. Selection start e3 text offset0 = before space = index4, end offset9 = index14. If no snap, quote would be " CD second" (leading space). Snapped start to s2 offset0 = index5. expected. Good.
They don't assert start > no? okay.

Potential issue in C-1c expected start=18 includes e3 blank, but if DOM order full text 'AB firstCD second EF third', actual blank index17. start at s3 offset0 =18, selection from s3 offset0 to s3 offset2 "EF"? Wait s3 "EF third": positions 18-19 E,F? CFK: row1 'AB first' length8 indexes0-7. s2 'CD second' length9 indexes8-16. e3 space index17. s3 'EF third' length8 indexes18-25. If end offset2 inside s3 => index20 (after 'EF') start18, quote "EF". yes. If advance bug didn't skip e3, start17 before space -> quote " EF". They assert not contains? only quote 'EF'; catches. Good.

Now maybe issue with "column group left/right if br at x left edge; rowEnd group chosen by distance to only text group." If marker physically at x=5, row text group left=10. If row includes R2 column x150, left group distance min(abs(5-10)=5, abs(5-70)=? from edge right=70? Code distance = box.left>=gLeft && <=gRight ?0: min(abs(gLeft-box.left), abs(gRight-box.left)).
For group left:
gLeft=10, gRight=70, box.left=5, dist=min(5,65)=5.
Could if gRight-box.left =65 no. For group right: dist=min(145? abs150-5=145, abs240-5=235) huge. pick left.

Potential issue if the br itself appears in another visual row's group (same row etc) due markerCy ambiguity, nearest row chooses row. They might choose wrong when marker's vertical center lies between two lines but marker box height crosses both. C-2 tie rowA by arbitrarily. In real BR box height ~2 lines and x at left; markerCy may be near one line. ok.

Let's look at annotation-anchor `collectSpans` maybe returns **TextNode spans sorted by DOM order**, not visual. `nearestRow` visualRows item uses parentElement getBoundingClientRect rather than span's own Text rect. In actual pdf.js, each text span's parentElement could be a container with multiple spans? If parentElement is the text layer div containing all spans, all item boxes same, then no. Need actual structure: pdf.js TextLayer creates each text item as `<span style="...">text</span>` within textLayer. Text node parentElement = span. So good. If a text node is wrapped in `.textContent`? okay.

Potential issue in `boxOf`: In actual browser, `<span>` display inline; getBoundingClientRect of span might have width but height = line box, top may be around baseline top. parentElement? yes.
If text layer uses `transform: scale`, getBoundingClientRect returns viewport coords, okay.

Potential issue: real pdf.js text layer may use multiple page text layers with CSS transforms and every span has `transform-origin`; rects viewport. okay.

Now let's consider "C-2 sameRow 容差 0.75×行高可同纳两行" - `nearestRow` determines rows from **all text spans**, but if a blank marker `<br>` has bounding rect with top/bottom spanning two lines, nearest row selection should maybe use the marker baseline issue and select **contained line center**. It uses `markerCy`, not checking marker actually overlaps row? Suppose marker center near rowB but br's vertical range doesn't overlap rowB? Could pick a row whose box not overlapped? In C-2b br top111,bottom131, rowB top120,bottom130; overlaps. In C-2 marker top108 bottom128 rowA 106-116 and rowB120-130, both. Good. If center near rowA but no overlap? Rare. `nearestRow` doesn't require vertical overlap; markerCy between lines but nearest row maybe wrong. But if click at blank *between* lines maybe there is no text row; selecting upward/downward guesses. Could be not.

Potential issue: In code, `nearestRow` computes markerCy = midpoint of blank marker box. For `<br>` br "零宽×~2 行高盒", markerCy should be at boundary between rows? Actually a br is a newline marker at **start of line?** It spans full height from below previous line to below current? If its center is between row1 and row2, tie handling. Fine.

Potential issue with row visual clusters: They use `Math.max(2, Math.min(height)/2)`. If a line has huge height due blank marker e.g., an image? no text spans only text, height font.
Maybe line pitch could be exactly same as text height, touching adjacent; threshold half height would merge rows if center distance equal height (e.g., line-height=1.0 font-size10 => centers 10 apart threshold5 no). if line-height 0.8 => centers8 >5 no. if line-height 0.4=>centers4<threshold5 merge visually overlapping. Weird.

Potential machine cases "full 1513 (all pass exit=0)+locks310" not available; can trust? We should perhaps not mention.

Now, what about cost/token? Too huge but not code matter. Maybe output W/N.

Let's think of "gate C-1 flip boundary": In `selectionToAnchor`, if normalized start>end, they flip `[start,end]`. But after flipping they **do not recompute quote with affinity?** They use same start/end. Could alter selection direction. The original root `total` maybe includes all; selection anchor quote uses textQuote prefix/suffix around? Need not.
But if normalization produces start=-? Probe functions may return negative? likely not.

Potential issue: `selectionToAnchor` earlier perhaps does:
```
const range = selection.getRangeAt(0)
const rootRect/text? 
if (!root.contains(range.startContainer) || !root.contains(range.endContainer)) return null
...
const leadLen = probeTextLength(root, startBoundary.node, startBoundary.offset,'start')
const tailLen = probeTextLength(root, endBoundary.node, endBoundary.offset,'end')
if (leadLen===null||tailLen===null) return null
```
If snap normalizes boundary to rowEnd node and rowEnd offset length but **the original range no longer includes that node**? Range's boundary can be outside selection? Example end boundary after marker after text s2; snap end to s2 end, same coordinate. If not included? root contains. fine.

Potential issue in `markerAt`: For an element boundary `node` and offset, it considers both `childNodes[offset]` and `childNodes[offset-1]`. But a boundary adjacent to a normal text node whose **sibling** is blank marker? yes. It doesn't check that the boundary is in *the direction of the empty space relative to the marker*. Suppose boundary at element offset after a blank marker (offset=2 with children [s1,br,s2]) and there is marker at offset-1; markerAt returns br. If user selects text from s2 backwards after line-break marker, boundary after br could be line start, and snapping to nearest row line end (BR branch) could shift. But any boundary adjacent to br should maybe normalize? The end boundary after br in DOM is between br and s2. Since br's DOM position before row2 but visual line-end? User clicking at start of row2 text? If offset after br means after line break marker, full coordinate maybe before marker? Wait if br before s2, root offset2 after br before s2 = coordinate after s2? But visual row start? It can be both.
`markerAt` checking offset-1 blindly might over-trigger on boundaries just after a br marker that are actually **the line start** (start of same visual line) rather than blank click. If the user selects starting at the beginning of row2, Range start could be after br (root offset2? DOM [s1, br, s2], after br before s2), representing start of row2 before "CD second". But because br marker has visual box of row2 line end? Wait markerAt would snap this start using BR branch: nearestRow row2 rowEnd=17, side start advance to s3 start=17? That would move start from before row2 (8?) to row2 end/row3 start, potentially changing selection.
Need understand actual DOM and PDF line breaks. In pdf.js text layer, `<br>` element is positioned at a line break. In a Range, boundaries around a br element:
- If user wants to select a br (not typical since presentation), Range can start after a br when selecting beginning of next line.
- Browser click at start of next line likely anchor in first text node of line2, not element boundary before br. So no.
But API selection may produce element boundaries. They deliberately used childNodes semantics markerAt adjacent either before/after to handle clicking at line end maybe.

Could C-1 old bug arose because Browser parsing blank click "textLayer slot before/after br"? markerAt both sides catches. Maybe.

Potential code style "asMarker(kids[offset]) ?? asMarker(kids[offset-1])" if offset = childNodes.length, kids[offset-1] previous. If offset = the index of text before br? Let's map when endpoint in DOM is after s2 text before br but **inside text node s2 end**, not element, markerAt no. Browser click after text char often boundary inside text node offset length, not element before br. It won't snap. But if clicking blank after text, maybe browser endpoint in text node at end of previous span, not after span/br. Hmm earlier tests use element slots not actual clicks. They set Range programmatically from diagnostic maybe actual snapshots use element slot? F-A10 docs says range assigned to element slot.

Potential "text node with parent blank" path: a selection boundary exactly inside a whitespace span text node. This is common if click blank text. If click at right after a space, Range offset maybe after space (inside text), parent marker blank => snap. Good.
MarkerAt doesn't use `side` to decide if boundary is inside blank text by offset; Any offset even 0 in whitespace span maps whole span; if text span contains multiple spaces and text? Consider blank span text "   " (three spaces). If click after first space, markerAt returns parent marker and snap to left/right. row left/right coordinates ignore which space; okay.
If text span "  indented" (not blank due indented word) not blank; boundary inside before word no snap. But PDF text extraction often indentation represented as leading spaces in same span as word. That means start at paragraph indent would select leading spaces in quote. Maybe known? Header says "prefix/suffix WADM no leading whitespace"? Wait quote of nonblank span should preserve all spaces (word-space test). If indent spaces in same span, preserving leading spaces may be desired? Not F-A10 perhaps.

Potential issue: `isBlankMarker` treats any element with textContent trimmed empty as blank, **including inline node breaks only**. For a `<span>` with a nested `<br>` but no text, `isBlankMarker` returns true; then could snap. okay.

Let's inspect "start side with BR and rowEndFallback": If no next nonblank span, returns rowEnd. But if rowEnd is on the **last nonblank line of the page before other columns/text later** but current row at bottom? There may be no next nonblank because page text layer only current page. If BR marker at bottom after row content (line break at end), start clicking at that br and selecting left? Should fallback rowEnd. yes.
But what if marker `<br>` at an interior line break and there are following spans but first nonblank is **at the marker itself's row line end?** No, rowEnd is row's line end, following span after marker likely next line. fine.

Potential "start = rowEndFallback" in end of page side is wrong if user starting at last line's end and dragging left? start should maybe rowEnd, if no next line, rowEnd not after? In quote selection from middle to rowEnd, okay. In visual coordinate, rowEnd is text after last char; if no next line, coordinate rowEnd. correct.

Potential issue with end side at br and end boundary in start? no.

Potential issue "nearestRow returns best row among visualRows but visualRows groups can be empty if no boxes due no-layout"; no.
Potential if all `boxOf` return null and marker box not null; nearestRow returns null because no items; snap original. In no-layout environment, marker box also null returns before nearestRow. In actual environment, if text spans no stubs but jsdom all null but marker stubs? tests don't because boxOf marker null. ok.

Let's inspect C-2 behavior with text in same row multiple columns: visualRows row includes items with same center; sort. If markerCy exactly row center. rowEnd group best. For br x-left, distance left col maybe group left has gLeft10,gRight70, marker box left5 right5 => dist5; right col dist145; best left. Good.

Now "行内栏聚类 threshold": It uses x gap threshold. If group has one text item and no gap. If two items on same visual line in same column but separated by spaces and with a particularly large x gap? columnGroups may split into separate groups and rowEnd picks nearest group, which may be the left/subgroup not actual entire column line end. For blank BR, marker x at left margin; group split due large word gap >20/2.5h. Then tail only left subgroup unless group includes all text to line end. Example line text has so much spacing between words that gap > threshold; columnGroups splits, so rowEnd row of nearest left segment not true line end. But threshold min 20 or 2.5 height. If word gap > 20 and text height 10 threshold25; gap 30 splits. Large justified text can have spaces >20? Unlikely maybe in 2 columns wide, space around centered title? Could happen. Then br at line end should snap to whichever nearest group? marker x at left maybe picks left subset not right end. This could cause "drop half segment". Did they choose threshold too small? annotation-anchor COLUMN_GAP similar likely. But row grouping should not split on every large word gap, only true columns. A line of text with an empty span for a large space could gap >25 (e.g., after 4 spaces in portrait PDF maybe 15-30?). At large font (h=50), threshold 125, so depends. At normal font h20 threshold50. Maybe okay.
Potential issue: `nearestRow` nearest by vertical center, but if a row has a huge font box, row center. ok.

Potential "sameRow容差 center cluster" issue: `visualRows` computes row merge using each item's center and half min height. If row has a weird blank marker span with giant bounding box due `<br>`? collectSpans only text spans not br. If a text span has a giant line box due CSS, it may merge with adjacent actual rows and rowEnd picks wrong. But over.

Let's think about source file anchor-serialize header comment additions "DOM 序≠视觉序，实测两方向跳跃：丢下半段/img2 带下一段", but they choose to draw from collectSpans document order for fullText. If DOM/visual order differs only around line break markers, normalize markers to nearby row text. If text spans themselves can be out of visual order due content stream, `advancePastBlanks` may not skip to visually next line. But likely pdf.js TextLayer order is content reading order; markers interleaved. Diag "丢下半段": marker placed before a line but visual at end. If marker before row2, it means at DOM coordinate after row1 before row2, not necessarily row2 visual. But clicking at row2 line end map marker row2. The DOM before row2 is *before* row2 text, but marker coordinate in fullText should represent end row2, not before row2. How could a single untexted DOM element located before row2 text represent end row2? Because PDF content stream line break text operations are before the line's text, but visually line break is at end of previous? Hmm.

Maybe the actual text layer also has **visual order markers arranged around spaces** not just line breaks. Hard.

Potential missing in `markerAt`: It doesn't test for **node being the `<br>` element itself**? Range boundary `node` could be br Element and offset0 (inside/around br); Node.ELEMENT branch with kids none: markerAt returns null because kids empty. But Range boundaries are never inside void element? Range can set start before/after an Element node, startContainer is parent not br. If user selection contains br, range boundary could be element br? Range.setStart(br,0) possible per DOM? For an Element node, offset must be 0; boundary inside br (before children none) => start container = br, offset0. But Range boundary can point to an element node itself? `range.setStart(br,0)` sets boundary inside br before no children, at same coordinate as before br. Selection from br weird. markerAt nodeType ELEMENT and offset0, kids[0] undefined and kids[-1] undefined => null. Then no snap. Does selection API produce boundary container br? Probably not; browser selection around br container parent offset, not br. Not concern.

Potential `Node.ELEMENT_NODE` could be an empty blank marker element, if boundary inside it (e.g., selecting br as object). no.

Potential issue with root.contains(marker) if root itself marker? root cannot blank marker? maybe. no.

Potential issue with `parentElement` for text node in an `<svg>`? no.

Now "元审查" maybe not code issue.

Let's consider "C-3 Element children vs childNodes": The code in markerAt when nodeType is TEXT returns parent blank if blank. For an Element offset, if the boundary is before a **text node that begins with whitespace**? `asMarker` only Element. If element slot adjacent to bare blank text node (direct child under root), no marker. But Range element slots adjacent to bare text can happen when selecting across a text layer. If blank marker direct text not wrapped, C-3 test maybe should catch? But actual blank spans. Not.

Potential issue "text node parent blank if parent is a `<br>` impossible." ok.

Potential off-by-one in `advancePastBlanks`: It scans from idx+1 to end. If `rowEnd` is not at the **end of the current visual row's text group in document order** because rightmost span appears later in document than another line's text? It finds rightmost but maybe rowEnd's DOM index not followed immediately by next line. If there are spans from previous rows after in DOM, advance returns them. DOM/text order issue. They rely on later spans after rowEnd coordinate representing later reading. Since collectSpans order is fullText order, advancing full coordinate to after rowEnd. If a text span from earlier reading is after rowEnd in DOM but physically? That is exactly not reading. No.
Potential issue if line has multiple spans, rowEnd rightmost is last span in that line but maybe in DOM order a blank marker or indentation of next line before rowEnd's span? Wait DOM order can differ; e.g. row3 blank span before row2? In test C-1? It can. Suppose row's rightmost text span appears in DOM before next line text but after other line text. advance from its index reaches next line after. Good.

Potential issue with collectSpans and fullText order: selectionToAnchor's original range DOM boundaries vs normalized rowEnd nodes may be **after the endBoundary node** causing `tailLen` inconsistent. Example `end` boundary at root offset before a BR that is after row? snap maps to rowEnd node; but if rowEnd node is **after** original boundary in DOM (e.g., br DOM before row2, rowEnd row2 end), tailLen computed to before row2; `total-triLen`=row2 end. okay.
Then `start` br original before row2 side=start snap maybe to row3 start. fine.

Potential "real interaction mouseup/settle fast path no normalize maybe selection evaluated visual before and after; if snap changes stored anchor but textQuote quote in visual eval maybe not." Not our ticket.

Let's see output in source says "real3 单次手势竞态录指纹（1/4 次未达立案线，浏览器侧非本票面）": A real bug unresolved? It says not reaches case threshold. If Gate2 reviewer sees known but undertested. Could block? They claim external. No code.

Potential issue in unit tests: They test with `document.body.append(root)`, range boundaries in a div appended to DOM. But jsdom selection API's `getSelection()` may not include nodes in body? It does. If no `document.createRange`? okay.

Potential hidden failure in other environments: jsdom if `range.setStart(from.node, from.offset)` with offset for element 3 childNodes? ok. `mkSpan('')` has no text child but no boundary inside e5? In zero-dim test range start s1, end root offset1 (after s1, before e5). root element offset1 valid. root childNodes [s1,e5,s2,s3] length4. good.
C-2 tests range end root offset1 before br. valid.

Could #15 C-3:
```
const br = mkBr(top108,bottom128,left5)
const sB = mkSpan('BBBB',top120,bottom130)
root.append(sA, br, sB)
anchor from sA offset0 to root offset1
```
Note range end root offset1 before br. Root children [sA, br, sB]. Br is marker, offsets. snap end root offset1 marker=br, row nearest? nearestRow includes sA rowA center111? sB rowB center125. br center118 tie rowA. rowEnd rowA "AAAA". If old row merging maybe two rows? Wait br height top108-bottom128 rowA center111 rowB center125 tie. End expected 4. Good.
But wait actual visual line rowA top106 bottom116? sA top106? Test C-2 uses sA top106 bottom116 center111, sB top120 bottom130 center125. br top108 bottom128 center118. sA height10, sB height10. threshold5. okay.
Test C-2b br generated top111 bottom131 center121; nearest rowB. End=8. good.

Potential issue "C-1b flip fallback cross-line": Test root [s1 top100 s2 top120 br2 top98 bottom118]. Wait br2 is after s2 but top98-bottom118 center108 overlaps s1 and maybe gap. markerCy108. nearestRow row? s1 center105 diff3; s2 center125 diff17 => row1. end=8. Range start=(s1,4), end=(root,2). Root children [s1,s2,br2], end offset2 before br2. markerAt end root offset2: kids[2]=br2. End normalization row1 end=8. start s1 offset4 unaffected. leadLen 4, tailLen? end=8. quote 'irst'. Good. But is this realistic? An end at `(root,2)` before a br after s2 while start inside s1; selection up to before br after s2 in document order spans all full text "AB firstCD second" (not "irst"). Yet snap returns quote "irst". The br2's box top98 near row1 though DOM after s2. Wait if user dragged selection ending at blank marker that visually overlaps row1 (line break after row1?) but DOM br after s2, visual selection should maybe be row1 "irst"; good.

Now, possible issue with test C-1b and actual headers: br2 should represent line break after row1 but DOM order after row2 due imaging bug. nearestRow based on marker box row1. End side maps row1. OK.

Potential "img2" case C-2? Original img2 "跳过下一段前数行": marker DOM order after s3, visual box top98-bottom118 covers previous row1. Test img2 s1 top100, s2 top120, s3 top140, br2 top98-bottom118 (center108 near row1) after s3. End root offset3 before br; nearest row row1 end8. quote AB first. Good.

Need inspect actual bug "img2 带下一段" from table: If no normalize? original `probeTextLength(root, root, offset3)` for offset after full text before br? tailLen? original end=... maybe total? In test no normalize would result full text? They state previous code? If markerAt old Element.children? perhaps old normalized end to after br? Hmm.

Potential issue in `markerAt`: For offset=3 children [s1,s2,s3,br2], it checks kids[3]=br and kids[2]=s3, returns br. Good.
If offset=4 (after br) also returns previous br. Good.

Now, possible issue: image/unknown marker `<div>` blank used as line break not BR; no branch. But pdf.js uses `<br role=presentation>`. fine.

Let's parse "br 槽位·start 边界 → 同上定位行尾后在阅读序文本域推进：越过紧邻纯空白标记 span 到首个非空白字符（=下一视觉行首；页尾无后继时回退行尾）". Implementation:
```
const rowEnd = rowEndOf(row, box)
if (rowEnd === null) return original maybe?
if side=end return rowEnd
return advancePastBlanks(root,rowEnd,rowEnd)
```
If rowEnd null, original. But if row != null (some text spans), rowEnd could null? rowEndOf returns null if group none? row contains nonempty items and box, groups always at least1; tail nonnull; not null.
Now `advancePastBlanks` if rowEnd is not in `spans` due same node? It comes from row tail span from collectSpans. ok.
The "紧邻纯空白标记 span" skipped includes the **BR element?** No BR not a text span with data; if after rowEnd in DOM before next text has a BR without text (native sibling), it won't appear. But if DOM position of a BR line break marker after rowEnd is not a text span, no fullText char; skipping not needed. If br DOM before rowEnd, it is in DOM earlier, not after. Actually if rowEnd is rightmost span in row, a line-break `<br>` could lie after rowEnd but before next line text; then text fullText no br char. no issue.
If an empty span text node produced by BR? no.

Potential issue: Blank starts at first nonblank span's **offset 0**. If nonblank span's `.data` contains leading non-empty text preceded by a zero-width? okay.

Potential issue in visualRows: It doesn't store row index, but row arrays sorted with items. If same row includes x positions increasing; later row maybe. Fine.

Let's explore "B/W/N" in Chinese. We can deliver "W" (带条件放行) if no blocker but note uncertain. But "Gate2 final review" maybe wants one of B/W/N; likely B = block, W = warn, N = no issues. We need maybe include findings even if no blockers. Could final "N（可放行）" if no actual bugs. But user specifically says "只报告有代码证据支撑的问题。不确定的明确说不确定." So if uncertain, can state.

Need decide if code has any blocker. Let's try to find a solid issue with line references from actual diff. We need not write line numbers if no file line count? Use relevant.

Possible solid issue: `advancePastBlanks` and `nearestRow` each call `collectSpans(root)` independently, but `collectSpans` may be expensive and nondeterministic? no.

Another possible solid issue: if `snapBlankBoundary` called with `node` as Element and `offset` but `node` is not root, and children include nested `<span>` but pdf blank marker may be descendant not direct child? Wait markerAt (Element branch):
```
const kids = node.childNodes
return asMarker(kids[offset]) ?? asMarker(kids[offset-1])
```
If boundary is an element slot inside an element whose immediate previous child is a text node, and that text node is inside a blank marker? Not.
If PDF text layer root's childNodes are line containers, each line contains spans; blank `<br>` markers are not necessarily direct child at same level. The selection boundary whose container is root offset (line container?) as in tests. In actual DOM, Range boundary from click at line end may be root offset before a blank child. okay.

Potential: If marker is not a direct child of the boundary element but one of its descendants after a line group, markerAt won't find. But PDF textLayer probably flattens.

Potential issue: `root.contains(marker)` if marker is outside root; but markerAt from node in text outside root could return marker outside, then snap original returns original boundary? It returns original because code `if (marker===null || !root.contains(marker)) return {node,offset}`. Wait if marker outside root, snap returns original, not null. selectionToAnchor previously would return null if boundary outside root before calling snap. Suppose original boundary outside root but selection not? But it checks in selectionToAnchor before? If snapBlankBoundary called before probeTextLength on boundaries outside? Need context. If selectionToAnchor validates range boundaries inside root before snap, ok. If not, original outside could later probe null? Need inspect diff: It imports snapBlankBoundary and calls after total check, before probe; no visible range containment? Header says "选区任一边界在 root 之外（跨页/页外）...返回 null" likely earlier code does check outside root. Not in diff? Could be.

Potential issue: Header comment says "非标记边界与无量测环境语义零变（详...）"; But no-layout test only un-stubbed elements with `getBoundingClientRect` zero all origins. If jsdom returns all zeros for **all** unstubbed br, yes. They don't test when marker boxOf nonnull but text spans no layout: nearestRow null and snap original. same. no.

Potential issue: if `collectSpans(root)` throws on root with text nodes? no.

Let's consider preservation of regular element-slot selection: Test "非标记空白槽位" C-3; If root offset after `bare` before s2, markerAt finds child at offset s2 (Element) not marker; child before bare Text not marker => no normalization. This ensures element slot adjacent to nonblank Element no snap. But if a user selects an entire text span by clicking boundary before/after a span, Range boundaries maybe Element slots; if there's an empty text node before span but not marker, no. Good.

Potential bug with "markerAt TEXT_NODE parent blank" only if parent is a blank marker, but if a Text node is a direct child of a blank marker nested in a text layer, `parentElement` for a text node inside `<span>` is span. `isBlankMarker(span)` true. But if marker is an inline span with `role=presentation` and `textContent=' '`; good.
What about pure whitespace text node inside a `<span>` that also contains a **nested empty element**? textContent trimmed maybe " " blank; if marker true. no.

Potential "br marker not a span; marker.textContent ' '? BR no."

Let's think through text offsets with `range.setEnd(root,2)` after bare: If no marker but element slot boundary, range includes text nodes before root offset. `probeTextLength(root, root, 2,'end')`: maybe computes length by summing text until offset? Good.

Maybe hidden issue: If `snapBlankBoundary` changes a boundary from an Element to a Text **after** an earlier Text within the same parent, but probeTextLength with start/end may be affected by the blank marker's text. For blank span branch, returning left rowEnd avoids including marker text. But what about DOM fullText total: if fullText includes blank marker text, then total may be > visible; selecting text range from row start to row end via snap excludes blank. Fine.

Potential row clustering "center" with many text spans: visualRows sorts **not stable**? JS sort stable. no.

Potential issue in comments: "等距并列取阅读序上行" but code with sort by center and tie only if dist exactly; if centers floating, row centers can be e.g. rowA dist7.2 rowB dist7.3? choose. fine.
Potential if markerCy exactly equal neither? no.
Potential if row has multiple spans and row center average; a row with several spans can have avg between, others. no.

Potential issue C-3 test "裸文本节点混入" uses bare Chinese text; Range from s1 to offset root2 includes bare exactly. `selectionToAnchor` result quote "AAAA裸文本" (without following B). But in an actual reader DOM, bare text node could be something like empty? not.
Could exposing nonblank bare text break collectSpans/fullText? It is in DOM, no. In actual pdf layer, there may be text child directly in root? All spans not necessarily. `markerAt` offset uses childNodes not children, so offset 2 before s2 doesn't accidentally catch br after s2 at children index2. Good.

Maybe check if test uses `document.body.replaceChildren()` but root still appended? after each removes. no.

Now final response format. Need perhaps:
- Overall: N/W/B.
- If no blockers: "N（可放行）——未发现需阻塞的代码证据；已知边界以明确注释归入非本票面；但第5项 G2 独立票未在 diff 中体现，放行条件为跟踪票存在" Could be W. But need no code evidence. Hmm.

Let's not prematurely decide. Let's look for subtle "long tokens/cost huge" maybe not.

"四变异全红（1/1/8/1）" says they ran 4 mutations around new fix all red. No evidence in diff? Could be from report. Tests 15 and mutations. Fine.

Potential issue "side parameter offset and rowEnd" in single clause:
For BR marker start, `advancePastBlanks(root,rowEnd,rowEnd)` if no next nonblank fallback rowEnd. But if page tail has blank marker whose DOM is **after** the last text span, and clicking at line end **beyond** horizontal edge after text, rowEnd boundary is after the last char. If there are no following spans, rowEnd returned. good.
For BR marker start when there is a following blank text **inside same span**? not.

Potential issue in blank branch "无左侧同行文本→右侧最近同行文本首字符（段首缩进空白吸附）" If the blank span marker is at **first line of a paragraph but with a left-aligned previous column**? For a single column page, okay. But a multi-column PDF, paragraph indent at start of right column has left column text on same visual row! Then markerAt start in right-column indent blank: `left` will find left column row text; returns left column's line end, not right-column first char. The marker likely physical box lies in right column; left column row same vertical. This would cause a start selection on paragraph indentation of the right column to snap to end of **left column**, possibly selecting wrong. Did tests C.2 catch br, not blank. Column test only "blank span between columns" end -> left. But for a blank marker that begins a line in right column (not between columns), marker x is after left column's x range. Because same visual row has left column's text; left candidate exists (left col text). Code chooses left, though if side='start', should choose right line start? Wait if marker is blank span at paragraph indentation in right column, in DOM/text order it might be at **right column's first line**, reading order after left column's lines. The marker geometry has boxes to its left same row (left column text). The desired reading boundary before right column text is after left column paragraph? Let's parse multi-column layout: Usually all left column content appears before right column in text flow (if left-to-right columns), so at the visual row where right column paragraph starts, text earlier (left column's same row) already exists but belongs to later/earlier? In reading order, text within a page flows left column top-to-bottom, then right column top-to-bottom (or sometimes two columns sequential). Therefore right column's paragraph indent occurs **after** left column's entire column content, not immediately after left column row same visual y. DOM text order likely full text order columns? Wait PDF text layer does not necessarily order in reading columns? It follows content stream often painting order not logical. But quote/full text can be weird. They have columnGroups to avoid cross-column in same visual row. `rowEndOf` chooses closest group horizontally. For br at left x, good. For paragraph indent in right column with left text on same row, snapping to nearest column group might still choose left group because marker x in right col (left distance maybe to left col right edge? If marker between? If marker at x155 and left col right=100, right group starts=160 maybe marker just left of right text; left distance min(abs(10? group left/right?)).
Let's compute row includes left group and text right. If marker box at x155..160, left group right100: distance = abs(100-155)=55. right group left=160, box left155: distance=5 -> rowEndOf chooses right group. Good. If marker box is blank span indent at x150-160 and right text left160? Actually paragraph indent spaces 4 chars; marker blank span itself is in right group x150-220. `left` branch sees left candidate=same right group? filter r.box.right <= box.left+1: any right-group text whose left > marker? no because row includes marker's own text at x? Marker blank span box left150 right158; right text starts160, not left; left columns right100 <=151 => left candidate. Code would choose **left column row end** because blank branch uses any left text in row, not rowEndOf closest group. This might be a real bug. Wait for blank span marker (not BR), they don't group columns! They filter `row` globally. In multi-column layout, a blank span at paragraph indent of right column has a left candidate in the left column and no right candidate (unless there is a span after?). Thus it will snap to left column's line end, not right column text start. In a single-column PDF same issue with text from a previous column not same visual row. In tests, "空文本 span 盒在栏间→吸附左栏行尾" is intended only markers physically between columns. But if blank marker in right column at its line start, there is text in same row from **left column**, so their branch treats as "left adjacent" and chooses left col end. It doesn't know a start boundary should attach to next column because reading order? Side ignored. This seems plausible and serious.

Need assess if paragraph indentation blank span can be in same visual row as left column text. For true multi-column layout, left column row y=120 text spans, right column row y=120 may also have text if columns visually aligned? The right column content starts at top; if its paragraph line has a leading blank item at x=150-160 and text at x160; left column same y x10-100. Then markerAt start inside blank item #? It would snap to left col line end in a row with nearestRow visual row both columns. But the user click at right column indent should start at right col first char, not left. C-3? There is no use of `columnGroups` in blank branch. This could be an actual not covered issue. The header says "空白 span 盒在栏间→吸附左栏行尾；文本位命中右栏首字符→原生语义" but no case "空白 span 盒在右栏行首（左邻左栏文本）". It claims "段首缩进空白吸附→右侧最近同行文本首字符" but with left column, left exists, branch wrong. However if right column's visual x is so far right, left candidate left column; there is also right candidate right column. It chooses `left` first. They might consider reading order: If when starting selection at paragraph indent, the selection anchor should actually be at end of left column? Wait in reading order, if the right column paragraph starts after finishing left column? Let's plain text representation for side-by-side columns maybe collectSpans order? If PDF text extraction order/paint order left column whole then right whole, the DOM sequence likely full left column first then right column. At visual row y=120, text left column earlier in DOM and same row. A start at right column line (in DOM after left column entire, so **after** all left column text) should be before right column text. The reading coordinate before right col first char is after left col entire, not after left col same row. But boundary in right col indent blank should map to first char of right column, not left row. `left` row text is at same y but **earlier in DOM and much distance in fullText**; rowEndOf prevents same row horizontal cross when there is a BR? Here code chooses left row text and ignores right. This would make quote from right col to something contain left column, catastrophic.
But perhaps in PDFs with multiple columns, the text layer does **not** place columns side-by-side at same y? It does, positions. Their columnGroups is for this. `nearestRow` doesn't group columns; okay.

For **blank branch side='start'**, should maybe choose the *next visual/reading* right column if side=start; but if side='end', choose left. They don't use side. For blank **end** marker indentation? Hard.

Test 5 in file:
```
it('栏间空白：span 标记盒在栏间槽位 → 吸附左栏行尾；文本位命中右栏首字符 → 零变', () => {
 c1 left, c2 right, e4 empty marker between x125
 anchor end root offset2 (end before e4? children c1,c2,e4; offset2 element slot before e4; markerAt sees e4). row same line has c1,c2. blank branch left candidates c1 (right<=126? c1 right100 <=126 yes), c2? right240 no => returns c1 line end. Good.
```
This test covers marker in **middle between columns**, not marker as first item in right column.
If e4 at x150? row has left c1 and right c2 at x150. marker itself e4 maybe blank span no text, not in collect. left c1 candidate; right c2 not if c2 left=150, box right? Filter right: r.box.left >= marker.right-1. If marker has width0 at x150 equal c2 left, right candidate exists; since left chosen first, it still returns c1. But if e4 at start c2, marker's right < c2 left? if moving mouse just before c2 text, left candidate c1, right candidate c2's text starts after gap. They choose c1, even for side start. In test "文本位命中右栏首字符→零变" avoids because no blank marker in text, boundary text node c2 offset0. No normalization.
This likely is serious: multi-column right column starting indentation blank marker will be snapped to left column line end, causing wrong quote. Need evidence from code? yes:
```
const left = row.filter(...).sort(...)[0]
if(left) return left
const right=row.filter(...)[0]
```
row includes same visual row spans across all columns; no column restriction. So any leading indentation blank span on a non-leftmost column is treated as left-column line-end. Is that a real PDF text layer shape? pdf.js creates whitespace spans inside a text item; if it's at right column start with no visible characters, its span likely x > left col right, dimensions width. It is a marker. The bug says F-A10 only 4/1513? page? Could still be. Does C.2 uses column grouping for br to avoid cross-column but blank span branch not. There are mutation tests? Not with blank span in multi-col. The test list "栏间空白: empty span between columns" is not same; marker not at column start but between.

Let's read header for blank span: "纯空白/空文本 span 标记（字形盒真实）→ 盒左侧最近同行文本行尾；无左侧同行文本→右侧最近同行文本首字符（段首缩进空白吸附）。" They deliberately don't say side. This is wrong relative to "本行行首" for right-column paragraph indentation? Suppose no left text same row, right first char correct. In a single column, paragraph indent at x10 isn't first col? left