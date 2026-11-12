// SERVER-ONLY. Puts a clinic's header (logo, clinic name and address, and the prescribing
// doctor's name and qualifications) on top of every page of a lab report PDF.
//
// Each original page is placed as it is, and the header goes into blank space at the top of the page when
// there is room (a "headerless" report), or in a new band added above it. The one thing changed on the
// page itself is the lab's "CODE/NAME & ADDRESS" block: the partner's name and address (and phone number)
// are covered and the clinic's own name and address are printed in their place (see lib/report-lab-block.ts).
// The old lines are removed from the page's content (and covered with white as a second safeguard). (A report that carries a
// digital signature will no longer verify once re-saved this way; a password-protected one
// cannot be read and is refused.)
import { PDFArray, PDFDocument, PDFName, StandardFonts, decodePDFRawStream, rgb, type PDFFont, type PDFPage, type PDFRawStream } from "pdf-lib";
import { HEADER_ZONE, measureTop, type TopLayout } from "./report-layout";
import { findLabBlocks, type LabBlock } from "./report-lab-block";

export type ReportHeader = {
  clinicName: string;
  clinicAddress?: string;
  // PNG bytes (see normalizeLogo in lib/clinics.ts).
  logoPng?: Buffer | null;
  doctorName?: string;
  doctorQualifications?: string;
};

// Height of the band added above each page, in PDF points (1/72 inch).
const BAND = 66;
// A page whose top is blank for at least this many points gets the header printed there (at most
// IN_PLACE_MAX points tall) instead of a band added above it.
const IN_PLACE_H = HEADER_ZONE - 6;
// Gap kept above the header when it is printed in the page's blank top strip.
const IN_PLACE_TOP = 4;
const GAP = 12;
const MIN_GAP = 110;
const MARGIN = 36;
const TEAL = rgb(0.059, 0.431, 0.431);
const BLACK = rgb(0, 0, 0);
const WHITE = rgb(1, 1, 1);
const INK = rgb(0.09, 0.19, 0.18);
const GREY = rgb(0.38, 0.43, 0.43);

export function looksLikePdf(file: Uint8Array): boolean {
  return file.length > 5 && String.fromCharCode(...file.slice(0, 5)) === "%PDF-";
}

// The standard PDF fonts only cover Latin-1; anything else would fail to encode.
function winAnsi(text: string): string {
  return text
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, "-")
    .replace(/[^ -~ -ÿ]/g, "?");
}

function fit(text: string, font: PDFFont, size: number, maxWidth: number): string {
  let t = winAnsi(text).trim();
  if (font.widthOfTextAtSize(t, size) <= maxWidth) return t;
  while (t.length > 1 && font.widthOfTextAtSize(`${t}...`, size) > maxWidth) t = t.slice(0, -1);
  return `${t.trimEnd()}...`;
}

// Breaks text into lines no wider than maxWidth, at spaces; a single word that is too long is cut.
function wrap(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const words = winAnsi(text).trim().split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (let word of words) {
    while (font.widthOfTextAtSize(word, size) > maxWidth && word.length > 1) {
      // Fill what is left of this line, then carry on with the rest of the word.
      let cut = word.length - 1;
      while (cut > 1 && font.widthOfTextAtSize(`${line ? `${line} ` : ""}${word.slice(0, cut)}`, size) > maxWidth) cut--;
      lines.push(`${line ? `${line} ` : ""}${word.slice(0, cut)}`);
      line = "";
      word = word.slice(cut);
    }
    const next = line ? `${line} ${word}` : word;
    if (line && font.widthOfTextAtSize(next, size) > maxWidth) {
      lines.push(line);
      line = word;
    } else line = next;
  }
  if (line) lines.push(line);
  return lines;
}

// Wraps text onto at most maxLines lines. If it still does not fit, the MIDDLE is cut out ("Start ... end") so
// the beginning and the end - the part people recognise an address by - both survive.
function wrapMiddleTrim(text: string, font: PDFFont, size: number, maxWidth: number, maxLines: number): string[] {
  const clean = winAnsi(text).replace(/\s+/g, " ").trim();
  let lines = wrap(clean, font, size, maxWidth);
  if (lines.length <= maxLines) return lines;
  for (let keep = clean.length - 4; keep > 8; keep -= 4) {
    const head = Math.ceil((keep - 3) / 2);
    const tail = Math.floor((keep - 3) / 2);
    lines = wrap(`${clean.slice(0, head).trimEnd()} ... ${clean.slice(clean.length - tail).trimStart()}`, font, size, maxWidth);
    if (lines.length <= maxLines) return lines;
  }
  return lines.slice(0, maxLines);
}

// Whites out the lab's partner name / address / phone lines and prints the clinic's in their place, in the
// report's own capitals, at the same positions.
function applyLabBlock(sheet: PDFPage, block: LabBlock, header: ReportHeader, font: PDFFont) {
  sheet.drawRectangle({ x: block.cover.x, y: block.cover.y, width: block.cover.width, height: block.cover.height, color: WHITE, borderWidth: 0 });
  const size = block.fontSize;
  const name = fit(header.clinicName.toUpperCase(), font, size, block.maxWidth);
  sheet.drawText(name, { x: block.x, y: block.nameBaseline, size, font, color: BLACK });
  if (header.clinicAddress) {
    const lines = wrapMiddleTrim(header.clinicAddress.toUpperCase(), font, size, block.maxWidth, block.addressSlots);
    lines.forEach((line, i) => sheet.drawText(line, { x: block.x, y: block.nameBaseline - block.lineStep * (i + 1), size, font, color: BLACK }));
  }
}

// Removes the text blocks that start at the given positions from a page's content, so the lab's old partner
// name / address / phone are not just hidden but gone from the file (they cannot be selected, copied or
// searched). Each printed line of these reports is its own "BT ... ET" text block starting with an absolute
// position; a block is dropped only when that position matches a line found by findLabBlocks. Returns how many
// were removed; on anything unexpected the page is left as it was.
function removeTextAt(doc: PDFDocument, page: PDFPage, targets: { x: number; y: number }[]): number {
  try {
    const contents = page.node.Contents();
    const refs: unknown[] = contents instanceof PDFArray ? contents.asArray() : contents ? [contents] : [];
    let removed = 0;
    const kept: unknown[] = [];
    for (const ref of refs) {
      const stream = doc.context.lookup(ref as never) as PDFRawStream | undefined;
      if (!stream || !("contents" in stream)) {
        kept.push(ref);
        continue;
      }
      const text = Buffer.from(decodePDFRawStream(stream).decode()).toString("latin1");
      const next = text.replace(/\bBT\b[\s\S]*?\bET\b/g, (blockText) => {
        const td = blockText.match(/(-?[\d.]+)\s+(-?[\d.]+)\s+Td/);
        const tm = blockText.match(/(?:-?[\d.]+\s+){4}(-?[\d.]+)\s+(-?[\d.]+)\s+Tm/);
        const at = td ? [Number(td[1]), Number(td[2])] : tm ? [Number(tm[1]), Number(tm[2])] : null;
        if (!at || !/\bT[jJ]\b/.test(blockText)) return blockText;
        if (!targets.some((t) => Math.abs(t.x - at[0]) < 0.6 && Math.abs(t.y - at[1]) < 0.6)) return blockText;
        removed++;
        return "";
      });
      if (next === text) kept.push(ref);
      else kept.push(doc.context.register(doc.context.flateStream(Buffer.from(next, "latin1"))));
    }
    if (removed > 0) page.node.set(PDFName_Contents, doc.context.obj(kept as never));
    return removed;
  } catch (err) {
    console.error("Lab text could not be removed from the report page:", err);
    return 0;
  }
}

const PDFName_Contents = PDFName.of("Contents");

export class ReportError extends Error {}

export async function brandReport(original: Uint8Array, header: ReportHeader): Promise<Uint8Array> {
  if (!looksLikePdf(original)) throw new ReportError("That file is not a PDF.");

  let source: PDFDocument;
  try {
    source = await PDFDocument.load(original); // throws on an encrypted file
  } catch {
    throw new ReportError("That PDF could not be read (it may be password-protected or damaged).");
  }

  const out = await PDFDocument.create();
  const bold = await out.embedFont(StandardFonts.HelveticaBold);
  const regular = await out.embedFont(StandardFonts.Helvetica);
  const logo = header.logoPng ? await out.embedPng(header.logoPng).catch(() => null) : null;
  // How much blank space each page leaves at the top (a "headerless" lab report leaves room for a letterhead).
  const layouts: (TopLayout | undefined)[] = await measureTop(original);
  // The lab's name / address block on each page, to be replaced with the clinic's.
  const blocks = await findLabBlocks(original);

  const pages = source.getPages();
  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];
    const { width, height } = page.getSize();
    // The lab's partner name / address / phone lines are removed from the page itself, then the clinic's printed in their place.
    if (blocks[i]) removeTextAt(source, page, blocks[i]!.lines);
    const embedded = await out.embedPage(page);

    // Room at the top: print the header there and keep the page size (working around anything already in
    // that strip, such as an accreditation logo). Otherwise add a band above the page.
    const lay = layouts[i];
    const gaps = lay && lay.blank >= HEADER_ZONE ? freeSpans(lay.obstacles, width) : [];
    const inPlace = gaps.length > 0;
    const sheet = out.addPage([width, inPlace ? height : height + BAND]);
    sheet.drawPage(embedded, { x: 0, y: 0, width, height });
    if (blocks[i]) applyLabBlock(sheet, blocks[i]!, header, regular);

    if (inPlace) drawHeader(sheet, { top: height - IN_PLACE_TOP, regionH: IN_PLACE_H, spans: gaps, header, logo, bold, regular, compact: true });
    else drawHeader(sheet, { top: height + BAND, regionH: BAND, spans: [[MARGIN, width - MARGIN]], header, logo, bold, regular, compact: false });
  }

  return out.save();
}

// The stretches of the header strip that are free, from the left margin to the right margin. Empty when
// they are too narrow to hold a clinic name (the caller then adds a band instead).
function freeSpans(obstacles: [number, number][], width: number): [number, number][] {
  const sorted = [...obstacles].sort((a, b) => a[0] - b[0]);
  const spans: [number, number][] = [];
  let from = MARGIN;
  for (const [x0, x1] of sorted) {
    if (x0 - GAP > from) spans.push([from, x0 - GAP]);
    from = Math.max(from, x1 + GAP);
  }
  if (width - MARGIN > from) spans.push([from, width - MARGIN]);
  return spans.some(([a, b]) => b - a >= MIN_GAP) ? spans.filter(([a, b]) => b - a >= 60) : [];
}

type PdfImage = Awaited<ReturnType<PDFDocument["embedPng"]>>;

// Clinic (logo, name, address) in the widest free span; doctor (name, qualifications) right-aligned in the
// last free span, or in the right part of the same span when there is only one. The address and the doctor's
// qualifications wrap onto further lines instead of being cut off, and there is no rule underneath, so the
// logo can use the full height of the strip.
function drawHeader(
  sheet: PDFPage,
  o: { top: number; regionH: number; spans: [number, number][]; header: ReportHeader; logo: PdfImage | null; bold: PDFFont; regular: PDFFont; compact: boolean }
) {
  const { top, regionH, spans, header, logo, bold, regular, compact } = o;
  const nameSize = compact ? 12.5 : 14;
  const smallSize = compact ? 8 : 8.5;
  const docSize = compact ? 10.5 : 11;
  const gap = smallSize + 1.8;
  const maxLines = 3;

  const widest = spans.reduce((best, s) => (s[1] - s[0] > best[1] - best[0] ? s : best), spans[0]);
  const last = spans[spans.length - 1];
  const separate = last !== widest && last[1] - last[0] >= 70;
  // One span: clinic takes the left 58%, the doctor the right 38%.
  const clinicSpan: [number, number] = separate ? widest : [widest[0], widest[0] + (widest[1] - widest[0]) * 0.6];
  const doctorSpan: [number, number] = separate ? last : [widest[1] - (widest[1] - widest[0]) * 0.38, widest[1]];

  // A block of lines is centred vertically in the strip: `first` is the bigger first line, the rest are small.
  const place = (firstSize: number, rest: number) => {
    const height = firstSize + rest * gap;
    return top - (regionH - height) / 2 - firstSize * 0.82;
  };

  let textLeft = clinicSpan[0];
  if (logo) {
    const maxH = regionH - (compact ? 2 : 18);
    const scale = Math.min(maxH / logo.height, 170 / logo.width, ((clinicSpan[1] - clinicSpan[0]) * 0.42) / logo.width);
    const w = logo.width * scale;
    const h = logo.height * scale;
    sheet.drawImage(logo, { x: clinicSpan[0], y: top - regionH / 2 - h / 2, width: w, height: h });
    textLeft = clinicSpan[0] + w + 10;
  }
  const leftMax = Math.max(60, clinicSpan[1] - textLeft);
  const nameLine = fit(header.clinicName, bold, nameSize, leftMax);
  const addr = header.clinicAddress ? wrapMiddleTrim(header.clinicAddress, regular, smallSize, leftMax, maxLines) : [];
  let y = place(nameSize, addr.length);
  sheet.drawText(nameLine, { x: textLeft, y, size: nameSize, font: bold, color: TEAL });
  addr.forEach((line, i) => sheet.drawText(line, { x: textLeft, y: y - nameSize * 0.2 - gap * (i + 1), size: smallSize, font: regular, color: GREY }));

  if (header.doctorName) {
    const rightMax = doctorSpan[1] - doctorSpan[0];
    const name = fit(header.doctorName, bold, docSize, rightMax);
    const creds = header.doctorQualifications ? wrapMiddleTrim(header.doctorQualifications, regular, smallSize, rightMax, maxLines) : [];
    y = place(docSize, creds.length);
    sheet.drawText(name, { x: doctorSpan[1] - bold.widthOfTextAtSize(name, docSize), y, size: docSize, font: bold, color: INK });
    creds.forEach((line, i) => sheet.drawText(line, { x: doctorSpan[1] - regular.widthOfTextAtSize(line, smallSize), y: y - docSize * 0.2 - gap * (i + 1), size: smallSize, font: regular, color: GREY }));
  }
}
